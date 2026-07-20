/**
 *  collect_package_sizes — build and incrementally update the per-package
 *  "size archaeology": for every published version of each tracked npm package,
 *  the uncompressed byte size of every file that version shipped.
 *
 *  This is the raw data behind the stacked-area package-size charts (fsl#1965).
 *  It stores only ground truth — package, version, publish time, and per-file
 *  bytes. Family grouping, colour, and which-packages-count-as-"the install"
 *  are all presentation decisions derived downstream by the chart renderer, so
 *  none of them live here: the same eras get reorganised repeatedly (jssm-viz
 *  was its own package, then embedded, then split back out in v6), and baking
 *  interpretation into the archive would mean rewriting history each time.
 *
 *  One JSON file per package, keyed by version (so publishing a new version is
 *  one localised, human-reviewable diff), each version carrying its ISO publish
 *  time (the charts stack on a TIME axis, because independently-versioned
 *  packages have no shared version axis). Sizes are authoritative once written:
 *  a version already present is never re-fetched unless `--force`, because old
 *  tarballs can vanish and re-listing is slow.
 *
 *  Per-file sizes are not in npm's packument (it exposes only the per-version
 *  `dist.unpackedSize`/`fileCount` totals), so each new version's tarball is
 *  fetched from the registry and listed. Dependency-free: the registry JSON
 *  packument, Node's built-in gunzip, and a minimal tar reader.
 *
 *  Usage:
 *    node src/scripts/collect_package_sizes.cjs --out <dir> [flags]
 *
 *    --out <dir>          Directory the per-package JSON files live in (required).
 *    --packages a,b,c     Comma-separated package names (default: the jssm family).
 *    --limit <n>          Fetch at most n new versions per package (testing/backfill throttle).
 *    --concurrency <n>    Tarballs fetched in parallel per package (default 12).
 *    --force              Re-fetch and overwrite versions already recorded.
 *    --registry <url>     Registry base (default https://registry.npmjs.org).
 *    --dry-run            Fetch and report, but write nothing.
 *
 *  A package that 404s (never published — e.g. jssm-fence before v6) is skipped
 *  cleanly, so the tracked list may name packages that do not yet exist.
 *
 *  @see make_perf_chart.cjs — the renderer that reads these files.
 */

'use strict';

const fs   = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

/** The npm packages whose size history the charts decompose. Unpublished ones are skipped. */
const DEFAULT_PACKAGES = ['jssm', 'jssm-viz', 'jssm-fence', 'jssm-cli'];

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

const SCHEMA_VERSION = 1;

/** Tar block size; every header and every data run is padded up to a multiple of this. */
const TAR_BLOCK = 512;

/** Default number of tarballs fetched in parallel per package. */
const DEFAULT_CONCURRENCY = 12;

/** Re-save the archive every this-many newly-recorded versions, so an interrupted backfill loses little. */
const FLUSH_EVERY = 25;


/**
 *  Parse CLI flags into an options object. Unknown flags throw so a typo can't
 *  silently disable `--force` or misroute `--out`.
 *
 *  @param argv - Raw `process.argv.slice(2)`.
 *  @returns Parsed options.
 *  @throws {Error} On an unknown flag or a missing required value.
 *
 *  @example
 *    parseArgs(['--out', 'data', '--limit', '5']);
 *    // { outDir: 'data', packages: [...DEFAULT_PACKAGES], limit: 5, force: false, ... }
 */
function parseArgs(argv) {
  const opts = {
    outDir:      null,
    packages:    DEFAULT_PACKAGES.slice(),
    limit:       Infinity,
    concurrency: DEFAULT_CONCURRENCY,
    force:       false,
    registry:    DEFAULT_REGISTRY,
    dryRun:      false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if      (a === '--out')         { opts.outDir      = argv[++i]; }
    else if (a === '--packages')    { opts.packages    = argv[++i].split(',').map(s => s.trim()).filter(Boolean); }
    else if (a === '--limit')       { opts.limit       = Number(argv[++i]); }
    else if (a === '--concurrency') { opts.concurrency = Number(argv[++i]); }
    else if (a === '--force')       { opts.force       = true; }
    else if (a === '--registry')    { opts.registry    = argv[++i]; }
    else if (a === '--dry-run')     { opts.dryRun      = true; }
    else { throw new Error(`unknown flag: ${a}`); }
  }
  if (!opts.outDir)                       { throw new Error('--out <dir> is required'); }
  if (!Number.isFinite(opts.limit) && opts.limit !== Infinity) { throw new Error('--limit must be a number'); }
  if (!Number.isInteger(opts.concurrency) || opts.concurrency < 1) { throw new Error('--concurrency must be a positive integer'); }
  return opts;
}


/**
 *  Read one octal-encoded numeric tar header field (NUL/space padded).
 *
 *  @param buf - The 512-byte header block.
 *  @param off - Field start offset.
 *  @param len - Field length.
 *  @returns The decoded integer (0 for an all-blank field).
 */
function octalField(buf, off, len) {
  const raw = buf.toString('ascii', off, off + len).replace(/\0/g, '').trim();
  if (raw === '') { return 0; }
  return parseInt(raw, 8) || 0;
}


/**
 *  List the regular files in an (already gunzipped) tar buffer as `path -> bytes`,
 *  where `bytes` is the uncompressed on-disk size. The leading `package/` prefix
 *  every npm tarball carries is stripped, so paths read as `dist/jssm.es5.cjs`.
 *
 *  Directories, symlinks, and pax/gnu extension entries contribute no size row;
 *  their data (pax headers) is skipped over so parsing stays aligned. npm paths
 *  fit the ustar name/prefix fields, so long-name extension records are not
 *  interpreted beyond being skipped.
 *
 *  @param buf - Decompressed tar bytes.
 *  @returns Map of stripped path to uncompressed byte size.
 *
 *  @example
 *    parseTar(zlib.gunzipSync(tgz));
 *    // { 'package.json': 2416, 'dist/jssm.es5.cjs': 511246, ... }
 */
function parseTar(buf) {
  const files = {};
  let off = 0;
  while (off + TAR_BLOCK <= buf.length) {
    const header = buf.subarray(off, off + TAR_BLOCK);
    // A run of zero bytes in the name marks end-of-archive.
    let name = header.toString('utf8', 0, 100).replace(/\0.*$/, '');
    if (name === '') { break; }

    const size     = octalField(header, 124, 12);
    const typeflag = String.fromCharCode(header[156]);
    const prefix   = header.toString('utf8', 345, 500).replace(/\0.*$/, '');
    if (prefix !== '') { name = `${prefix}/${name}`; }

    // typeflag '0' or NUL = regular file; everything else (dir '5', symlink,
    // pax 'x'/'g', gnu 'L'/'K') is not a shipped file we size.
    if (typeflag === '0' || typeflag === '\0' || header[156] === 0) {
      const stripped = name.replace(/^package\//, '');
      files[stripped] = size;
    }

    // Advance past this entry's data, padded to the next block boundary.
    off += TAR_BLOCK + Math.ceil(size / TAR_BLOCK) * TAR_BLOCK;
  }
  return files;
}


/**
 *  GET a URL and return the response body as a Buffer, following redirects
 *  (the registry serves tarballs from a CDN via redirect).
 *
 *  @param url - Absolute http(s) URL.
 *  @returns The full response body.
 *  @throws {Error} On a non-2xx status (with the status in the message).
 */
async function fetchBuffer(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) { throw new Error(`GET ${url} -> ${res.status}`); }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}


/**
 *  Fetch a package's registry packument, or null if the package has never been
 *  published (a clean 404 — e.g. a v6 package that does not exist yet).
 *
 *  @param registry - Registry base URL.
 *  @param pkg - Package name.
 *  @returns The parsed packument, or null on 404.
 *  @throws {Error} On any non-404 failure (a network flake must not read as "no versions").
 */
async function fetchPackument(registry, pkg) {
  const url = `${registry}/${encodeURIComponent(pkg)}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (res.status === 404) { return null; }
  if (!res.ok) { throw new Error(`GET ${url} -> ${res.status}`); }
  return res.json();
}


/** The on-disk archive file for one package. */
function archiveFile(outDir, pkg) {
  return path.join(outDir, `${pkg}.json`);
}


/**
 *  Load a package's existing archive, or a fresh empty one if none exists yet.
 *
 *  @param outDir - Directory the archives live in.
 *  @param pkg - Package name.
 *  @returns The archive object (always with a `versions` map).
 */
function loadArchive(outDir, pkg) {
  const file = archiveFile(outDir, pkg);
  if (fs.existsSync(file)) {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed.versions) { parsed.versions = {}; }
    return parsed;
  }
  return {
    schema:  SCHEMA_VERSION,
    package: pkg,
    unit:    'bytes',
    note:    'Per-version sizes of every file each published tarball shipped. Append-only; authoritative once written. Family/colour/install-policy are derived downstream, never stored here. See src/scripts/collect_package_sizes.cjs.',
    versions: {},
  };
}


/**
 *  Serialise an archive with its versions ordered chronologically by publish
 *  time, so a new publish appends at the end and the git diff stays localised.
 *
 *  @param outDir - Directory the archives live in.
 *  @param pkg - Package name.
 *  @param archive - The archive object to write.
 */
function saveArchive(outDir, pkg, archive) {
  const ordered = Object.keys(archive.versions).sort((a, b) => {
    const ta = Date.parse(archive.versions[a].published || '') || 0;
    const tb = Date.parse(archive.versions[b].published || '') || 0;
    if (ta !== tb) { return ta - tb; }
    return a < b ? -1 : a > b ? 0 : 0;   // stable tiebreak by version string
  });
  const versions = {};
  for (const v of ordered) { versions[v] = archive.versions[v]; }
  const out = { ...archive, versions };
  fs.writeFileSync(archiveFile(outDir, pkg), JSON.stringify(out, null, 2) + '\n');
}


/**
 *  Run `worker` over `items` with at most `concurrency` in flight at once — a
 *  sliding window, so a slow fetch never idles the other slots. Each item's
 *  result is delivered to `onResult(item, value)` as it completes (not at the
 *  end), so a caller can checkpoint progress mid-run. A worker that throws is
 *  reported via `onError(item, err)` and does not sink its siblings.
 *
 *  @param items - Work items.
 *  @param concurrency - Maximum simultaneous workers.
 *  @param worker - async (item) => value.
 *  @param onResult - Called with (item, value) as each worker resolves.
 *  @param onError - Called with (item, err) when a worker rejects.
 *  @returns Resolves when every item has settled.
 */
async function runPool(items, concurrency, worker, onResult, onError) {
  let next = 0;
  async function drain() {
    while (next < items.length) {
      const item = items[next++];
      try   { onResult(item, await worker(item)); }
      catch (err) { onError(item, err); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, drain));
}


/**
 *  Bring one package's archive up to date. Fetches its packument, then for every
 *  published version not already recorded (unless `--force`) fetches the tarball
 *  and lists its files — `--concurrency` tarballs at a time — recording
 *  `{ published, files }`. Writes every {@link FLUSH_EVERY} new versions and once
 *  at the end, so an interrupted backfill resumes forward with little re-work.
 *
 *  @param pkg - Package name.
 *  @param opts - Parsed CLI options.
 *  @returns The number of versions newly recorded.
 */
async function collectPackage(pkg, opts) {
  const packument = await fetchPackument(opts.registry, pkg);
  if (packument === null) {
    console.log(`${pkg}: not published yet — skipping`);
    return 0;
  }

  const archive = loadArchive(opts.outDir, pkg);
  const times   = packument.time || {};

  // Oldest-first, so --limit backfills chronologically; then keep only the
  // versions we still need (with a real tarball), capped at --limit.
  const wanted = Object.keys(packument.versions || {})
    .sort((a, b) => (Date.parse(times[a] || '') || 0) - (Date.parse(times[b] || '') || 0))
    .filter(v => opts.force || !archive.versions[v])
    .filter(v => packument.versions[v] && packument.versions[v].dist && packument.versions[v].dist.tarball)
    .slice(0, opts.limit === Infinity ? undefined : opts.limit);

  let added = 0;
  const record = (version, files) => {
    archive.versions[version] = { published: times[version] || null, files };
    added++;
    const total = Object.values(files).reduce((s, n) => s + n, 0);
    console.log(`${pkg}@${version}: ${Object.keys(files).length} files, ${(total / 1048576).toFixed(2)} MB`);
    if (!opts.dryRun && added % FLUSH_EVERY === 0) { saveArchive(opts.outDir, pkg, archive); }
  };

  await runPool(
    wanted,
    opts.concurrency,
    async (version) => parseTar(zlib.gunzipSync(await fetchBuffer(packument.versions[version].dist.tarball))),
    (version, files) => record(version, files),
    (version, err)   => console.warn(`${pkg}@${version}: fetch failed (${err.message}) — will retry next run`),
  );

  if (!opts.dryRun && added > 0) { saveArchive(opts.outDir, pkg, archive); }
  console.log(`${pkg}: +${added} version(s)${opts.dryRun ? ' (dry-run, not written)' : ''}`);
  return added;
}


/**
 *  Entry point: update every tracked package's archive under `--out`.
 *
 *  @returns Resolves when all packages are processed.
 */
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.dryRun) { fs.mkdirSync(opts.outDir, { recursive: true }); }

  let total = 0;
  for (const pkg of opts.packages) {
    total += await collectPackage(pkg, opts);
  }
  console.log(`done: +${total} version(s) across ${opts.packages.length} package(s)`);
}


if (require.main === module) {
  main().catch(e => { console.error(`collect_package_sizes failed: ${e.message}`); process.exit(1); });
}

module.exports = { parseArgs, octalField, parseTar, archiveFile, loadArchive, saveArchive, runPool, collectPackage };
