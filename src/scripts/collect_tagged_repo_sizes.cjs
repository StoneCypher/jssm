/**
 *  collect_tagged_repo_sizes — size archaeology for the parts of the ecosystem
 *  that ship from git tags rather than from npm.
 *
 *  Some of this project's work reaches users through channels npm knows nothing
 *  about: Sublime's Package Control installs from a tagged GitHub repo, a
 *  GitHub Action is consumed straight from its tag, and an editor grammar is
 *  read out of a checkout. Before this script those repos had no measured size
 *  at all, so the ecosystem chart could only draw them as zero-mass lifespan
 *  rails — a Sublime package with hundreds of installs looked exactly like an
 *  abandoned experiment.
 *
 *  The output is deliberately byte-identical in shape to what
 *  `collect_package_sizes.cjs` writes for npm, and lands in the same directory,
 *  because the chart's `buildPayload` does not care where an archive came from.
 *  An archive written here becomes a stacked stream on exactly the same terms
 *  as a published package.
 *
 *  **What counts as a version.** A git tag. Package Control and the Actions
 *  runner both resolve a release to a tag, so a tag is the closest thing these
 *  channels have to a published version, and its commit date is the closest
 *  thing to a publish date.
 *
 *  **What counts as size.** Every blob in the tree at that tag. These channels
 *  ship the repository itself — Package Control builds a `.sublime-package` zip
 *  from the checkout — so README, LICENSE and screenshots are all genuinely
 *  delivered to the user and are counted. That is the same rule npm gets: the
 *  tarball is whatever the tarball is.
 *
 *  Sizes come from GitHub's tree API rather than by downloading anything: a
 *  recursive tree lists every blob with its byte size, so one call per tag
 *  replaces a tarball fetch and an unpack.
 *
 *  Usage:
 *    node src/scripts/collect_tagged_repo_sizes.cjs --out <dir> [flags]
 *
 *    --out <dir>     Directory the per-package JSON files live in (required).
 *    --repos a,b,c   Comma-separated repo keys (default: every entry in SOURCES).
 *    --force         Re-read and overwrite tags already recorded.
 *    --dry-run       Fetch and report, but write nothing.
 *
 *  @see src/scripts/collect_package_sizes.cjs   the npm-side collector whose archive shape this matches
 *  @see src/scripts/make_size_chart.cjs         the renderer that reads these files
 */

'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const { loadArchive, saveArchive, makeRecord } = require('./collect_package_sizes.cjs');


/**
 *  The repos whose releases are measured here, keyed by the name the archive
 *  and the chart will use. That key must match the repo's entry in
 *  `build_repo_timeline.cjs`'s CATEGORIES, or the chart will draw the repo as a
 *  rail AND as a stream — the same thing twice.
 *
 *  Only repos that genuinely ship from a tag belong here. A repo with tags that
 *  nobody installs from is not a distribution channel, and counting it would
 *  invent mass that never reached a user.
 */
const SOURCES = {
  'sublime-fsl':  { owner: 'StoneCypher', repo: 'sublime-fsl',  channel: 'sublime-package-control' },
  'sublime-jssm': { owner: 'StoneCypher', repo: 'sublime-jssm', channel: 'sublime-package-control' },
};


/**
 *  Shell out to `gh api`, returning parsed JSON.
 *
 *  Deliberately no `--jq`: that flag prints a bare scalar for a string result
 *  (`2020-02-07T07:49:09Z`, unquoted), which is not valid JSON and blows up the
 *  parse. Selecting fields in JS instead keeps every call parseable.
 *
 *  windowsHide stops a console window flashing over John's work on each call.
 */
const gh = (path) => JSON.parse(
  execFileSync('gh', ['api', path],
               { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 })
);


/**
 *  Parse CLI flags into an options object. Unknown flags throw, so a typo
 *  cannot silently disable `--force` or misroute `--out`.
 *
 *  @param argv - `process.argv.slice(2)`.
 *  @returns `{ outDir, repos, force, dryRun }`.
 *  @throws {Error} On an unknown flag, a missing value, or a missing `--out`.
 *
 *  @example
 *  parseArgs(['--out', 'data']).repos;   // => ['sublime-fsl', 'sublime-jssm']
 */
function parseArgs(argv) {
  const opts = { outDir: null, repos: Object.keys(SOURCES), force: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if      (a === '--out')     { opts.outDir = argv[++i]; }
    else if (a === '--repos')   { opts.repos  = argv[++i].split(',').map(s => s.trim()).filter(Boolean); }
    else if (a === '--force')   { opts.force  = true; }
    else if (a === '--dry-run') { opts.dryRun = true; }
    else { throw new Error(`unknown flag: ${a}`); }
  }
  if (!opts.outDir) { throw new Error('--out <dir> is required'); }
  for (const r of opts.repos) {
    if (!SOURCES[r]) { throw new Error(`not a known tagged-repo source: ${r}`); }
  }
  return opts;
}


/**
 *  Sum a recursive tree listing into a `{ path: bytes }` map, keeping blobs only.
 *
 *  Trees and submodule entries carry no `size` and are not delivered as files,
 *  so including them would inflate the total with things a user never receives.
 *
 *  @param tree - The `tree` array from GitHub's recursive tree response.
 *  @returns Files keyed by repo-relative path.
 *
 *  @example
 *  filesOfTree([{ type: 'blob', path: 'a.txt', size: 3 }, { type: 'tree', path: 'd' }]);
 *  // => { 'a.txt': 3 }
 */
function filesOfTree(tree) {
  const out = {};
  for (const e of tree) {
    if (e.type !== 'blob' || typeof e.size !== 'number') { continue; }
    out[e.path] = e.size;
  }
  return out;
}


/**
 *  Bring one repo's archive up to date, adding a record per tag not already
 *  recorded. Append-only like the npm collector: a tag's contents are immutable
 *  once written, so recorded tags are never re-read unless `--force`.
 *
 *  @param key - The SOURCES key, also the archive filename and chart label.
 *  @param opts - Parsed CLI options.
 *  @returns `{ added, tags }` — records newly written, and how many tags exist.
 *
 *  @example
 *  await collectRepo('sublime-fsl', { outDir: 'data', force: false, dryRun: true });
 *  // => { added: 5, tags: 5 }
 */
function collectRepo(key, opts) {
  const src = SOURCES[key];
  const tags = gh(`repos/${src.owner}/${src.repo}/tags?per_page=100`);
  if (tags.length === 0) {
    console.log(`${key}: no tags — nothing to measure, skipping`);
    return { added: 0, tags: 0 };
  }

  const archive = loadArchive(opts.outDir, key);
  let added = 0;

  //  oldest first, so an interrupted run leaves a chronologically sane archive
  for (const t of tags.slice().reverse()) {
    if (!opts.force && archive.versions[t.name]) { continue; }

    const sha  = t.commit.sha;
    const when = gh(`repos/${src.owner}/${src.repo}/commits/${sha}`).commit.committer.date;
    const tree = gh(`repos/${src.owner}/${src.repo}/git/trees/${sha}?recursive=1`);
    const files = filesOfTree(tree.tree || []);

    archive.versions[t.name] = makeRecord(when, null, files);
    added++;

    const total = Object.values(files).reduce((a, b) => a + b, 0);
    console.log(`${key}@${t.name}: ${Object.keys(files).length} files, ${(total / 1048576).toFixed(2)} MB`);
  }

  if (!opts.dryRun && added > 0) { saveArchive(opts.outDir, key, archive); }
  console.log(`${key}: +${added} tag(s) of ${tags.length}${opts.dryRun ? ' (dry-run, not written)' : ''}`);
  return { added, tags: tags.length };
}


/** Entry point: update every requested tagged-repo archive under `--out`. */
function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.dryRun) { fs.mkdirSync(opts.outDir, { recursive: true }); }

  let total = 0;
  for (const key of opts.repos) { total += collectRepo(key, opts).added; }
  console.log(`done: +${total} tag(s) across ${opts.repos.length} repo(s)`);
}


if (require.main === module) {
  try { main(); }
  catch (e) { console.error(`collect_tagged_repo_sizes failed: ${e.message}`); process.exit(1); }
}

module.exports = { parseArgs, filesOfTree, collectRepo, SOURCES };
