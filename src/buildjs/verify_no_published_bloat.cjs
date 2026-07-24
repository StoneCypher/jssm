/**
 * Published-bloat gate — fails the build if any workspace package would ship a
 * file that has no business in an installed npm tarball. Runs `npm pack
 * --dry-run --json` (the authoritative "what actually ships" list) for the root
 * `jssm` package and every `packages/*` workspace member, and rejects the run
 * if any shipped path matches a {@link BLOAT_RULES} pattern.
 *
 * This exists because the two worst size spikes in jssm's history were exactly
 * this class of accident: a single release that leaked non-minified bundles
 * (`5.32.10` shipped `*.nonmin.js` at ~3.7 MB each; `5.112.3` shipped
 * `jssm_viz.*.nonmin.cjs` at ~4 MB each), and the early `jssm-viz` line that
 * shipped 10 MB source maps and rollup build caches. Each was a one-version
 * mistake nobody caught until later. A denylist on the pack manifest catches
 * the whole class before publish, deterministically and offline.
 *
 *   node src/buildjs/verify_no_published_bloat.cjs
 *       Checks every discovered package; prints a per-package OK line, or the
 *       offending paths grouped by package, and exits 1 on any violation.
 *
 * The `npm pack` shell-out goes through an injectable `exec` seam, so the pure
 * logic (manifest parsing and denylist matching) is unit-testable without npm.
 *
 * @see src/buildjs/verify_version_bump.cjs   sibling release gate this mirrors in shape
 * @see src/buildjs/tests/verify_no_published_bloat.spec.ts   unit coverage for the pure functions
 */

'use strict';

const { execFileSync } = require('child_process'),
      { readFileSync, existsSync, readdirSync } = require('fs'),
      path = require('path');

/** On Windows `npm` is a `.cmd` shim Node won't spawn without a shell (CVE-2024-27980 hardening); CI is ubuntu, so this path is exercised only by local runs. */
const NPM_BIN = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const NPM_NEEDS_SHELL = process.platform === 'win32';

/**
 * Paths that must never appear in a published tarball, each with the reason it
 * is forbidden. `re` is tested against every shipped path; the first matching
 * rule flags the file.
 */
const BLOAT_RULES = Object.freeze([
  { id: 'nonmin',     re: /\.nonmin\./,             why: 'non-minified bundle (ship the minified build instead)' },
  { id: 'sourcemap',  re: /\.map$/,                 why: 'source map (large; not needed by installers)' },
  { id: 'rpt2-cache', re: /(^|\/)\.rpt2_cache\//,   why: 'rollup-plugin-typescript2 build cache leaked into the package' },
  { id: 'nodemodules',re: /(^|\/)node_modules\//,   why: 'dependency tree leaked into the package' },
]);

/**
 * Parses `npm pack --dry-run --json` output into a flat list of the paths that
 * would ship. npm emits a one-element array whose `files` is `{path,size}[]`.
 *
 * @param json_text - Raw stdout from `npm pack --dry-run --json`
 * @returns Every shipped path, in npm's order
 * @throws {Error} If the text is not the expected `[{files:[...]}]` shape
 *
 * @example
 * parsePackFiles('[{"files":[{"path":"dist/jssm.mjs"},{"path":"README.md"}]}]');
 * // => ['dist/jssm.mjs', 'README.md']
 */
const parsePackFiles = (json_text) => {
  const parsed = JSON.parse(json_text);
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!entry || !Array.isArray(entry.files)) {
    throw new Error('unexpected `npm pack --json` shape: no files[] array');
  }
  return entry.files.map(f => f.path);
};

/**
 * Matches a package's shipped paths against {@link BLOAT_RULES}. Pure — the
 * heart of the gate, and the only part that needs unit coverage.
 *
 * @param paths - The paths that would ship (from {@link parsePackFiles})
 * @param rules - Denylist to apply (defaults to {@link BLOAT_RULES})
 * @returns One `{ path, id, why }` per offending file; empty when clean
 *
 * @example
 * findBloat(['dist/jssm.mjs', 'dist/jssm.nonmin.js'], BLOAT_RULES);
 * // => [{ path: 'dist/jssm.nonmin.js', id: 'nonmin', why: 'non-minified bundle (ship the minified build instead)' }]
 *
 * @example
 * findBloat(['dist/jssm.mjs', 'README.md'], BLOAT_RULES);
 * // => []
 */
const findBloat = (paths, rules = BLOAT_RULES) => {
  const out = [];
  for (const p of paths) {
    const rule = rules.find(r => r.re.test(p));
    if (rule) out.push({ path: p, id: rule.id, why: rule.why });
  }
  return out;
};

/**
 * Discovers the package directories to check: the repo root always, plus every
 * `packages/<name>` that carries its own `package.json` (the workspace members
 * once they exist on disk). Returns directories, not names, since `npm pack`
 * runs per directory.
 *
 * @param root - Repo root to scan (defaults to two levels up from this file)
 * @returns Absolute package directories, root first
 */
const discoverPackageDirs = (root = path.join(__dirname, '..', '..')) => {
  const dirs = [root];
  const pkgsDir = path.join(root, 'packages');
  if (existsSync(pkgsDir)) {
    for (const name of readdirSync(pkgsDir)) {
      const dir = path.join(pkgsDir, name);
      if (existsSync(path.join(dir, 'package.json'))) dirs.push(dir);
    }
  }
  return dirs;
};

/**
 * The real `npm pack --dry-run --json` shell-out for one directory, isolated so
 * the pure logic above can be tested with a fake in its place.
 *
 * @param dir - Package directory to pack
 * @returns The shipped paths for that package
 * @throws {Error} If npm fails (a broken manifest must fail the gate, not pass it)
 */
const packPaths = (dir) =>
  parsePackFiles(execFileSync(NPM_BIN, ['pack', '--dry-run', '--json'], {
    cwd: dir, encoding: 'utf8', shell: NPM_NEEDS_SHELL, windowsHide: true, maxBuffer: 64 * 1024 * 1024,
  }));

/**
 * Runs the gate over every discovered package. Pure orchestration around the
 * injected `pack` seam, so a test can drive the whole verdict without npm.
 *
 * @param dirs - Package directories (from {@link discoverPackageDirs})
 * @param pack - `(dir) => string[]` returning that package's shipped paths
 * @returns `{ ok, lines, violations }` — `lines` is human output, `violations`
 *   is the flat `{ pkg, path, id, why }[]` (empty when everything is clean)
 */
const runGate = (dirs, pack) => {
  const lines = [], violations = [];
  for (const dir of dirs) {
    const name = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).name;
    const bad = findBloat(pack(dir));
    if (bad.length === 0) {
      lines.push(`ok: ${name} ships no forbidden files`);
    } else {
      lines.push(`FAIL: ${name} ships ${bad.length} forbidden file(s):`);
      for (const b of bad) { lines.push(`  ${b.path}  [${b.id}] ${b.why}`); violations.push({ pkg: name, ...b }); }
    }
  }
  return { ok: violations.length === 0, lines, violations };
};

/** Entry point. */
const main = () => {
  const { ok, lines } = runGate(discoverPackageDirs(), packPaths);
  for (const l of lines) console.log(l);
  if (!ok) { console.error('\npublished-bloat gate failed: remove the files above from the package (check the `files` field / .npmignore / build outputs).'); process.exit(1); }
};

if (require.main === module) {
  try { main(); }
  catch (e) { console.error(`verify_no_published_bloat failed: ${e.message}`); process.exit(1); }
}

module.exports = { BLOAT_RULES, parsePackFiles, findBloat, discoverPackageDirs, runGate };
