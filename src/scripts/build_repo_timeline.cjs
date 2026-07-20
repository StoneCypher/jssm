/**
 *  build_repo_timeline — emit the curated ecosystem-repo timeline dataset that
 *  seeds the fsl#1965 alluvial / Sankey addendum (repos flowing in and out of
 *  the monorepo over time).
 *
 *  The CURATED layer — which repos belong, their maintainer-assigned category,
 *  the maintainer's asides, and the supersession graph ("obsoleted by") — is
 *  embedded here as the source of truth. Category labels are kept VERBATIM and
 *  separate from any derived colour, so they drive palette management downstream
 *  (the same principle the size archaeology follows: raw truth in the data,
 *  interpretation in the renderer). Live repo metadata (visibility, archived,
 *  description) is fetched from GitHub via `gh` at run time and joined in.
 *
 *  Usage:
 *    node src/scripts/build_repo_timeline.cjs --out <dir> [--owner <login>]
 *
 *    --out <dir>     Directory the dataset file (repos.json) is written to (required).
 *    --owner <login> GitHub account to read metadata from (default StoneCypher).
 *
 *  @see collect_package_sizes.cjs — the size archaeology this sits beside on perf_results.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const DEFAULT_OWNER = 'StoneCypher';

// Curated categorisation, verbatim labels, in the maintainer's listed order.
// An entry is "name" or "name || aside".
const CATEGORIES = [
  ['replaced by newer work', [
    'sublime-fsl', 'sublime-jssm', 'jssm_mini_demo',
  ]],
  ['proof of concept, needs to be updated', [
    'alpha-highlightjs-fsl', 'fsl-pegjs',
  ]],
  ['wanted but hasn’t taken off', [
    'typedoc-plugin-fsl',
    'require_jssm || should be require_fsl',
    'jssm-viz-action || should be fsl-viz-action and maybe should be an application instead, haven’t thought it through',
    'fsl_gen_docpage', 'fslbook', 'fsllang.com', 'jssm-tutorial-scratch',
  ]],
  ['wanted but never took off, obsoleted by new work', [
    'fsl-code', 'fsl-lezer', 'fsl-lezer-demo', 'fslc', 'fsled', 'fsli', 'fslp', 'fsllint',
  ]],
  ['wanted, replacement is in jssm as newer work, needs to take over the old repo', [
    'fsl-spec',
  ]],
  ['current', [
    'jssm', 'jssm-mcp', 'vscode-fsl', 'fsl-mcp', 'codemirror-lang-fsl', 'fsl-textmate',
  ]],
  ['remaindered because interned into main', [
    'jssm-viz', 'jssm-viz-cli', 'jssm-viz-demo',
  ]],
  ['wanted, never took off, new work waiting on org transfer', [
    'fsl',
  ]],
];

// Supersession graph: repo -> [successor repo, optional aspect]. These are the
// alluvial's flow edges; note how many resolve to jssm (the consolidation inflow).
const OBSOLETION = {
  'fsl-code':       ['vscode-fsl'],
  'fsl-lezer':      ['codemirror-lang-fsl'],
  'fsl-lezer-demo': ['codemirror-lang-fsl'],
  'fslc':           ['jssm', 'cli work'],
  'fsli':           ['jssm', 'cli work'],
  'fslp':           ['jssm', 'cli work'],
  'fsllint':        ['jssm', 'cli work'],
  'fsled':          ['jssm', 'cli work'],
  'sublime-fsl':    ['fsl-textmate'],
  'sublime-jssm':   ['fsl-textmate'],
  'jssm_mini_demo': ['jssm', 'lit tags'],
};


/**
 *  Parse CLI flags.
 *
 *  @param argv - `process.argv.slice(2)`.
 *  @returns `{ outDir, owner }`.
 *  @throws {Error} On an unknown flag or a missing `--out`.
 */
function parseArgs(argv) {
  const opts = { outDir: null, owner: DEFAULT_OWNER };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if      (a === '--out')   { opts.outDir = argv[++i]; }
    else if (a === '--owner') { opts.owner  = argv[++i]; }
    else { throw new Error(`unknown flag: ${a}`); }
  }
  if (!opts.outDir) { throw new Error('--out <dir> is required'); }
  return opts;
}


/**
 *  Fetch every repo's metadata for an owner via `gh`, as a Map keyed by name.
 *
 *  @param owner - GitHub account login.
 *  @returns Map(name -> { visibility, archived, fork, description }).
 *  @throws {Error} If `gh` is unavailable or the call fails.
 */
function fetchRepoMeta(owner) {
  const out = execFileSync('gh', [
    'repo', 'list', owner, '--limit', '2000',
    '--json', 'name,description,isPrivate,isArchived,isFork',
  ], { encoding: 'utf8', windowsHide: true });
  const meta = new Map();
  for (const r of JSON.parse(out)) {
    meta.set(r.name, {
      visibility:  r.isPrivate ? 'private' : 'public',
      archived:    !!r.isArchived,
      fork:        !!r.isFork,
      description: r.description || null,
    });
  }
  return meta;
}


/**
 *  Assemble the dataset object from the curated tables joined with live metadata.
 *
 *  @param meta - Map from {@link fetchRepoMeta}.
 *  @returns The dataset `{ note, categoryOrder, repos }`.
 *  @throws {Error} On a repo listed under two categories or a dangling supersession target.
 */
function buildDataset(meta) {
  const repos = [], seen = new Set(), categoryOrder = [];
  for (const [category, entries] of CATEGORIES) {
    categoryOrder.push(category);
    for (const entry of entries) {
      const [name, note] = entry.split(' || ');
      if (seen.has(name)) { throw new Error(`duplicate repo across categories: ${name}`); }
      seen.add(name);
      const m = meta.get(name);
      if (!m) { console.warn(`WARN: ${name} not found under this owner (typo, renamed, or transferred?)`); }
      const ob = OBSOLETION[name];
      repos.push({
        name,
        category,
        note: note || null,
        obsoletedBy: ob ? ob[0] : null,
        obsoletedByWhat: ob && ob[1] ? ob[1] : null,
        visibility:  m ? m.visibility : null,
        archived:    m ? m.archived : null,
        description: m ? m.description : null,
      });
    }
  }
  const names = new Set(repos.map(r => r.name));
  for (const r of repos) {
    if (r.obsoletedBy && !names.has(r.obsoletedBy)) { throw new Error(`obsoletedBy target not in dataset: ${r.name} -> ${r.obsoletedBy}`); }
  }
  return {
    note: 'Curated ecosystem-repo timeline seed for the fsl#1965 alluvial/Sankey addendum. `category` is verbatim from the maintainer and kept separate from any derived colour so it drives palette management downstream. `note` preserves maintainer asides; `obsoletedBy` is the supersession edge (several resolve to jssm — the monorepo consolidation inflow). Membership-over-time is layered on later. Regenerated by src/scripts/build_repo_timeline.cjs.',
    categoryOrder,
    repos,
  };
}


/** Entry point. */
function main() {
  const opts = parseArgs(process.argv.slice(2));
  const dataset = buildDataset(fetchRepoMeta(opts.owner));
  fs.mkdirSync(opts.outDir, { recursive: true });
  fs.writeFileSync(path.join(opts.outDir, 'repos.json'), JSON.stringify(dataset, null, 2) + '\n');
  console.log(`${dataset.repos.length} repos across ${dataset.categoryOrder.length} categories -> ${path.join(opts.outDir, 'repos.json')}`);
}

if (require.main === module) {
  try { main(); }
  catch (e) { console.error(`build_repo_timeline failed: ${e.message}`); process.exit(1); }
}

module.exports = { parseArgs, buildDataset, CATEGORIES, OBSOLETION };
