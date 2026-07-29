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
  'sublime-fsl':  { owner: 'StoneCypher', repo: 'sublime-fsl',  channel: 'sublime-package-control', versions: 'tags' },
  'sublime-jssm': { owner: 'StoneCypher', repo: 'sublime-jssm', channel: 'sublime-package-control', versions: 'tags' },

  //  A website has no tags worth speaking of -- fsl.tools carries exactly one
  //  across eight years -- but GitHub records every Pages build, and a Pages
  //  build is the honest analogue of a publish: the moment the thing visitors
  //  reach actually changed. `subdir` is the Pages source path, so the measure
  //  is the served site rather than the repo that builds it.
  'fsl.tools':    { owner: 'StoneCypher', repo: 'fsl.tools',    channel: 'website', versions: 'pages', subdir: 'docs' },
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
function filesOfTree(tree, subdir) {
  const out = {};
  const prefix = subdir ? subdir.replace(/\/*$/, '') + '/' : null;
  for (const e of tree) {
    if (e.type !== 'blob' || typeof e.size !== 'number') { continue; }
    if (prefix) {
      if (!e.path.startsWith(prefix)) { continue; }      // not served; not delivered
      out[e.path.slice(prefix.length)] = e.size;         // paths read as site paths, not repo paths
      continue;
    }
    out[e.path] = e.size;
  }
  return out;
}


/**
 *  The release points for a repo whose channel is git tags.
 *
 *  @param src - A SOURCES entry.
 *  @returns `[{ version, sha }]`, oldest first.
 */
function tagReleases(src) {
  const tags = gh(`repos/${src.owner}/${src.repo}/tags?per_page=100`);
  return tags.slice().reverse().map(t => ({ version: t.name, sha: t.commit.sha }));
}


/**
 *  The release points for a site published by GitHub Pages: one per successful
 *  build, deduplicated by commit.
 *
 *  Errored builds are dropped because they never served anything — counting a
 *  failed deploy as a version would claim visitors saw bytes that were never
 *  delivered. Repeat builds of one commit collapse to the earliest, since a
 *  rebuild of identical content is not a new version of the site.
 *
 *  Versions are keyed `YYYY-MM-DD.<sha7>`: a website has no version numbers, so
 *  the key has to be readable in a tooltip, unique, and chronologically sane.
 *
 *  @param src - A SOURCES entry.
 *  @returns `[{ version, sha, when }]`, oldest first.
 *
 *  @example
 *  pagesReleases({ owner: 'StoneCypher', repo: 'fsl.tools' })[0];
 *  // => { version: '2018-11-18.bf19b47', sha: 'bf19b47c…', when: '2018-11-18T…' }
 */
function pagesReleases(src) {
  const builds = gh(`repos/${src.owner}/${src.repo}/pages/builds?per_page=100`);
  const seen = new Set(), out = [];
  for (const b of builds.slice().reverse()) {          // oldest first
    if (b.status !== 'built' || !b.commit) { continue; }
    if (seen.has(b.commit)) { continue; }
    seen.add(b.commit);
    out.push({ version: `${b.created_at.slice(0, 10)}.${b.commit.slice(0, 7)}`, sha: b.commit, when: b.created_at });
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
  const releases = src.versions === 'pages' ? pagesReleases(src) : tagReleases(src);
  const unit = src.versions === 'pages' ? 'deploy' : 'tag';

  if (releases.length === 0) {
    console.log(`${key}: no ${unit}s — nothing to measure, skipping`);
    return { added: 0, releases: 0 };
  }

  const archive = loadArchive(opts.outDir, key);
  let added = 0;

  //  oldest first, so an interrupted run leaves a chronologically sane archive
  for (const rel of releases) {
    if (!opts.force && archive.versions[rel.version]) { continue; }

    //  a Pages build already carries its own timestamp; a tag has to be dated
    //  from the commit it points at
    const when = rel.when
      || gh(`repos/${src.owner}/${src.repo}/commits/${rel.sha}`).commit.committer.date;
    const tree = gh(`repos/${src.owner}/${src.repo}/git/trees/${rel.sha}?recursive=1`);
    const files = filesOfTree(tree.tree || [], src.subdir);

    if (Object.keys(files).length === 0) {
      //  a build whose source path did not exist at that commit delivered
      //  nothing measurable; recording a zero would draw a false trough
      console.log(`${key}@${rel.version}: no files under ${src.subdir || '/'} — skipping`);
      continue;
    }

    archive.versions[rel.version] = makeRecord(when, null, files);
    added++;

    const total = Object.values(files).reduce((a, b) => a + b, 0);
    console.log(`${key}@${rel.version}: ${Object.keys(files).length} files, ${(total / 1048576).toFixed(2)} MB`);
  }

  if (!opts.dryRun && added > 0) { saveArchive(opts.outDir, key, archive); }
  console.log(`${key}: +${added} ${unit}(s) of ${releases.length}${opts.dryRun ? ' (dry-run, not written)' : ''}`);
  return { added, releases: releases.length };
}


/** Entry point: update every requested tagged-repo archive under `--out`. */
function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.dryRun) { fs.mkdirSync(opts.outDir, { recursive: true }); }

  let total = 0;
  for (const key of opts.repos) { total += collectRepo(key, opts).added; }
  console.log(`done: +${total} release(s) across ${opts.repos.length} repo(s)`);
}


if (require.main === module) {
  try { main(); }
  catch (e) { console.error(`collect_tagged_repo_sizes failed: ${e.message}`); process.exit(1); }
}

module.exports = { parseArgs, filesOfTree, tagReleases, pagesReleases, collectRepo, SOURCES };
