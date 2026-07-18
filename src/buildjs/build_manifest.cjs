/**
 * Artifact manifest hasher — the byte-equivalence gate for the build orchestrator.
 *
 * Walks jssm's build outputs and produces a `{ artifacts: {path: sha256}, docs }`
 * manifest. Two builds of the same source at the same git HEAD must produce the
 * same manifest; the orchestrator (which only re-sequences the existing build
 * scripts into parallel stages) must not perturb a single artifact byte.
 *
 * **Why normalization is required:** `makever.cjs` bakes `build_time = Date.now()`
 * into `version.ts`, and that epoch is inlined into every bundle that imports it.
 * Two builds at different clock-times therefore differ in those bundles by the
 * epoch alone. So before hashing, the exact `build_time` value (read from
 * `version.ts`) is replaced everywhere with a placeholder, and date-stamped human
 * text (CHANGELOG/README) has its ISO-date lines stripped. What remains is a true
 * test that nothing but timing changed. `docs/` (typedoc) carries timestamped
 * footers throughout its HTML, so it is compared by file count, not content.
 *
 * **Excluded entirely** — generated docs whose content varies independent of the
 * build pipeline, so byte-parity is meaningless for them:
 *   - `README.md` + `dist/deno/README.md`: (`make_deno` seeds the deno copy
 *     early so the publish-manifest trace can see it; `make_readme` refreshes
 *     it at the end.) `make_readme` bakes in
 *     `new Date().toLocaleString()` AND the **stochastic** suite's coverage % —
 *     stochastic tests hit random code paths, so the % varies run-to-run.
 *   - `CHANGELOG.md` + `CHANGELOG.long.md`: `better_git_changelog` embeds the
 *     **global git tag list** and merge/release counts, which change whenever
 *     *any* release lands on the repo — external state, not this build.
 * What remains is the deterministic, shipped surface: every `dist/**` bundle,
 * the root `*.d.ts`/`*.d.cts`, and `custom-elements.json` — the artifacts the
 * orchestrator must reproduce byte-for-byte.
 *
 * @example
 *   // Capture a reference manifest (T0):
 *   node src/buildjs/build_manifest.cjs --out=reference.manifest.json
 *
 * @example
 *   // Gate an orchestrated build against the reference (T6); exits 1 on mismatch:
 *   node src/buildjs/build_manifest.cjs --compare=reference.manifest.json
 *
 * @see notes/superpowers/plans/2026-06-23-build-orchestrator.md
 */

'use strict';

const { createHash } = require('crypto');
const { readFileSync, existsSync, readdirSync, statSync, writeFileSync } = require('fs');
const { join, relative, sep } = require('path');

/** Repo root, relative to this file at src/buildjs/. */
const ROOT = join(__dirname, '..', '..');

/** Root-level type-declaration artifacts (published, deterministic). */
const ROOT_DECLS = [
  'jssm.es5.d.cts', 'jssm.es6.d.ts',
  'jssm_viz.es5.d.cts', 'jssm_viz.es6.d.ts',
  'jssm.cli.d.cts', 'jssm.cli.d.ts',
  'jssm.fence.d.ts',
];

/** Other deterministic root artifacts. */
const ROOT_OTHER = ['custom-elements.json'];

/**
 * Artifacts excluded from parity — generated docs whose content varies
 * independent of the build (README: wall-clock + stochastic coverage;
 * CHANGELOG: global git tag list). Matched against the repo-relative path.
 */
const EXCLUDED = /(?:^|\/)README\.md$|^CHANGELOG(\.long)?\.md$/;

/**
 * Extract the `build_time` epoch digits from version source/compiled text.
 *
 * Handles both the TypeScript source form (`build_time : number = 1782…`) and
 * the compiled form (`build_time = 1782…`) by skipping anything between
 * `build_time` and the `=`.
 *
 * @param {string} text - contents of version.ts or version.js
 * @returns {string|null} the epoch as a digit string, or null if absent
 *
 * @example
 *   parseBuildTime('const build_time : number = 1782222479159;') // => '1782222479159'
 *   parseBuildTime('const build_time = 42;')                      // => '42'
 */
function parseBuildTime(text) {
  const m = text.match(/build_time[^=]*=\s*(\d+)/);
  return m ? m[1] : null;
}

/**
 * Read the `build_time` epoch the current build baked into `version.ts`.
 *
 * @param {string} cwd - repo root to read from
 * @returns {string|null} the epoch as a digit string, or null if not found
 */
function readBuildTime(cwd) {
  const vp = join(cwd, 'src', 'ts', 'version.ts');
  if (!existsSync(vp)) return null;
  return parseBuildTime(readFileSync(vp, 'utf8'));
}

/**
 * Replace every occurrence of the per-build epoch with a stable placeholder.
 *
 * Done by literal string split/join (not regex) so it neutralizes the epoch
 * wherever a bundler inlined it, without matching unrelated digit runs.
 *
 * @param {string} text - artifact content
 * @param {string|null} buildTime - the epoch to neutralize, or null for a no-op
 * @returns {string} content with the epoch replaced
 *
 * @example
 *   neutralizeBuildTime('t=1782222479159', '1782222479159') // => 't=<BUILD_TIME>'
 */
function neutralizeBuildTime(text, buildTime) {
  return buildTime ? text.split(buildTime).join('<BUILD_TIME>') : text;
}

/**
 * Drop volatile timestamp lines from human text — a generator's "generated on"
 * / "generated at" stamp. Strips both ISO dates (`2026-06-23`) and clock times
 * (`11:53:39`, as in `make_readme`'s `new Date().toLocaleString()` stamp). Bundle
 * artifacts encode time as a colon-free epoch, so the clock-time rule only ever
 * matches such stamps and never hides a real artifact diff.
 *
 * @param {string} text - file content
 * @returns {string} content with timestamp-bearing lines removed
 *
 * @example
 *   stripDateLines('a\n2026-06-23 x\nb')               // => 'a\nb'
 *   stripDateLines('keep\nGenerated at 6/23/2026, 11:53:39 AM') // => 'keep'
 */
function stripDateLines(text) {
  return text.split('\n').filter(l => !/\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}:\d{2}/.test(l)).join('\n');
}

/** sha256 hex of a buffer. */
function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Recursively collect file paths under `dir` (sorted for stable ordering).
 *
 * @param {string} dir - directory to walk
 * @param {string[]} [acc] - accumulator
 * @returns {string[]} absolute file paths
 */
function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

/**
 * Build the artifact manifest for a repo tree.
 *
 * @param {{ cwd?: string }} [opts] - repo root (defaults to the repo this tool lives in)
 * @returns {{ artifacts: Record<string,string>, docs: { count: number } }}
 *   `artifacts` maps each deterministic build output to its (normalized) sha256;
 *   `docs.count` is the typedoc file count (content not hashed — timestamped).
 */
function buildManifest(opts = {}) {
  const cwd = opts.cwd ?? ROOT;
  const buildTime = readBuildTime(cwd);
  const rel = p => relative(cwd, p).split(sep).join('/');
  const artifacts = {};

  const addFile = (abs, { text = false } = {}) => {
    if (!existsSync(abs)) return;
    let s = readFileSync(abs, 'utf8');
    s = neutralizeBuildTime(s, buildTime);
    if (text) s = stripDateLines(s);
    artifacts[rel(abs)] = sha256(Buffer.from(s, 'utf8'));
  };

  for (const f of walk(join(cwd, 'dist'))) {
    if (EXCLUDED.test(rel(f))) continue;
    addFile(f, { text: /\.md$/.test(f) || /version\.js$/.test(f) });
  }
  for (const f of [...ROOT_DECLS, ...ROOT_OTHER]) addFile(join(cwd, f));

  const docs = walk(join(cwd, 'docs')).map(rel).sort();
  return { artifacts, docs: { count: docs.length } };
}

/**
 * Diff a reference manifest against a current one.
 *
 * @param {{artifacts: Record<string,string>, docs:{count:number}}} ref
 * @param {{artifacts: Record<string,string>, docs:{count:number}}} cur
 * @returns {Array<{path: string, kind: 'changed'|'missing'|'added'|'doc-count', reason?: string}>}
 *   one entry per discrepancy; empty when the builds are equivalent
 */
function diffManifests(ref, cur) {
  const out = [];
  const curKeys = new Set(Object.keys(cur.artifacts));
  for (const k of Object.keys(ref.artifacts)) {
    if (!curKeys.has(k)) out.push({ path: k, kind: 'missing' });
    else if (ref.artifacts[k] !== cur.artifacts[k]) out.push({ path: k, kind: 'changed' });
  }
  for (const k of curKeys) {
    if (!(k in ref.artifacts)) out.push({ path: k, kind: 'added' });
  }
  if (ref.docs.count !== cur.docs.count) {
    out.push({ path: 'docs/', kind: 'doc-count', reason: `${ref.docs.count} -> ${cur.docs.count}` });
  }
  return out;
}

module.exports = {
  buildManifest,
  diffManifests,
  neutralizeBuildTime,
  stripDateLines,
  parseBuildTime,
  readBuildTime,
};

// CLI: --out=<file> writes a manifest; --compare=<file> gates against one; else stdout.
if (require.main === module) {
  const args = process.argv.slice(2);
  const out = (args.find(a => a.startsWith('--out=')) || '').split('=')[1];
  const cmp = (args.find(a => a.startsWith('--compare=')) || '').split('=')[1];
  const cur = buildManifest();

  if (cmp) {
    const ref = JSON.parse(readFileSync(cmp, 'utf8'));
    const diffs = diffManifests(ref, cur);
    if (diffs.length) {
      console.error(`Manifest MISMATCH (${diffs.length} discrepanc${diffs.length === 1 ? 'y' : 'ies'}):`);
      for (const d of diffs) console.error(`  ${d.kind}: ${d.path}${d.reason ? ` (${d.reason})` : ''}`);
      process.exit(1);
    }
    console.log(`Manifest match: ${Object.keys(cur.artifacts).length} artifacts byte-identical (build_time/dates neutralized).`);
  } else if (out) {
    writeFileSync(out, JSON.stringify(cur, null, 2));
    console.log(`Wrote manifest: ${Object.keys(cur.artifacts).length} artifacts, ${cur.docs.count} doc files -> ${out}`);
  } else {
    console.log(JSON.stringify(cur, null, 2));
  }
}
