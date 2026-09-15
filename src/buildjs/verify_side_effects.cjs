/**
 * Side-effect declaration gate — fails the build if any workspace package's
 * `sideEffects` field disagrees with the files it actually publishes. Runs the
 * same `npm pack --dry-run --json` manifest the bloat gate uses, classifies
 * every shipped path against {@link SIDE_EFFECT_RULES}, and checks the package's
 * declaration against what it found.
 *
 * `sideEffects` is a bundler PERMISSION, not a description: `false` asserts that
 * importing any file in the package does nothing but define exports, so a
 * bundler may delete files nobody imports from. That is exactly wrong for a file
 * whose entire purpose is the import — `dist/wc/viz.define.js` exports nothing
 * and calls `customElements.define('fsl-viz', ...)`. Under a blanket `false` a
 * bundler is entitled to drop it, and the element then silently never registers:
 * a failure that presents as "the component just doesn't work" with nothing in
 * the build log.
 *
 * This exists because `jssm-viz` shipped exactly that gap during the v6
 * functional split — the root package carried a whitelist, the extracted member
 * package did not inherit it, and nothing noticed. The invariant is mechanical,
 * so it should be checked rather than remembered (fsl#1971).
 *
 *   node src/buildjs/verify_side_effects.cjs
 *       Checks every discovered package; prints a per-package verdict plus any
 *       advisory notes, and exits 1 on any violation.
 *
 * The `npm pack` shell-out is reused from the bloat gate through the same
 * injectable seam, so the pure logic (glob matching and the verdict) is
 * unit-testable without npm.
 *
 * @see src/buildjs/verify_no_published_bloat.cjs   sibling gate this mirrors in shape, and whose pack seam it reuses
 * @see src/buildjs/tests/verify_side_effects.spec.ts   unit coverage for the pure functions
 */

'use strict';

const { readFileSync } = require('fs'),
      path             = require('path'),
      { discoverPackageDirs, packPaths } = require('./verify_no_published_bloat.cjs');

/**
 * Shipped paths whose mere import does something observable, each with the
 * reason. A package shipping any of these may not claim `sideEffects: false`;
 * it must name them in a whitelist (or decline to declare anything at all,
 * which is the safe-but-undeclared state this gate asks it to leave).
 */
const SIDE_EFFECT_RULES = Object.freeze([
  { id: 'wc-define', re: /(^|\/)[^/]+\.define\.js$/, why: 'registers a custom element on import (customElements.define)' },
  { id: 'cdn',       re: /(^|\/)cdn\//,              why: 'CDN bundle — self-registers and attaches globals when loaded' },
  { id: 'iife',      re: /\.iife\.js$/,              why: 'IIFE bundle — attaches a browser global when loaded' },
]);

/**
 * Converts one `sideEffects` glob to an anchored regular expression. npm and
 * webpack accept a small glob dialect here: `*` spans one path segment, `**`
 * spans any number, `**` followed by a separator also matches zero directories,
 * and a leading `./` is decoration.
 *
 * @param glob - A single `sideEffects` entry, e.g. `'./dist/wc/*.define.js'`
 * @returns A regexp anchored to a whole package-relative path
 *
 * @example
 * globToRegExp('./dist/wc/*.define.js').test('dist/wc/viz.define.js');   // => true
 *
 * @example
 * globToRegExp('./dist/wc/*.define.js').test('dist/wc/deep/x.define.js');   // => false ('*' stops at '/')
 *
 * @example
 * globToRegExp('./dist/cdn/**').test('dist/cdn/nested/viz.js');   // => true
 */
const globToRegExp = (glob) => {

  const clean = glob.replace(/^\.\//, '');

  let out = '';

  for (let i = 0; i < clean.length; i += 1) {

    const c = clean[i];

    if (c === '*') {
      if (clean[i + 1] === '*') {
        if (clean[i + 2] === '/') { out += '(?:.*/)?'; i += 2; }   // '**/' — any depth, including none
        else                      { out += '.*';       i += 1; }   // '**'  — any depth
      } else {
        out += '[^/]*';                                            // '*'   — within one segment
      }
    }

    else if ('.+?^${}()|[]\\/'.includes(c)) { out += `\\${c}`; }
    else                                    { out += c; }

  }

  return new RegExp(`^${out}$`);

};

/**
 * Tests one shipped path against one `sideEffects` glob. A pattern containing
 * no separator is matched against the basename anywhere in the tree, which is
 * how bundlers read a bare `"*.define.js"`.
 *
 * @param glob - A single `sideEffects` entry
 * @param file_path - A package-relative published path, e.g. `'dist/wc/viz.define.js'`
 * @returns Whether the pattern covers that file
 *
 * @example
 * globMatches('./dist/cdn/**', 'dist/cdn/viz.js');   // => true
 *
 * @example
 * globMatches('*.define.js', 'dist/wc/viz.define.js');   // => true (bare pattern, basename match)
 */
const globMatches = (glob, file_path) => {

  const re = globToRegExp(glob);

  if (re.test(file_path)) { return true; }

  const bare = !glob.replace(/^\.\//, '').includes('/');

  return bare ? re.test(file_path.split('/').pop()) : false;

};

/**
 * Finds every published path whose import has a side effect.
 *
 * @param paths - The paths that would ship
 * @param rules - Classifier to apply (defaults to {@link SIDE_EFFECT_RULES})
 * @returns One `{ path, id, why }` per effectful file; empty when the package is pure
 *
 * @example
 * findEffectful(['dist/jssm.mjs', 'dist/wc/viz.define.js']).map(e => e.id);   // => ['wc-define']
 *
 * @example
 * findEffectful(['dist/jssm.mjs', 'README.md']);   // => []
 */
const findEffectful = (paths, rules = SIDE_EFFECT_RULES) => {

  const out = [];

  for (const p of paths) {
    const rule = rules.find(r => r.re.test(p));
    if (rule) { out.push({ path: p, id: rule.id, why: rule.why }); }
  }

  return out;

};

/**
 * Names the four states a `sideEffects` field can be in. `unset` and `whitelist`
 * are the two that carry information the gate acts on; `pessimistic` (`true`)
 * forbids nothing, and `pure` (`false`) is the claim that must be earned.
 *
 * @param declaration - The manifest's `sideEffects` value, or `undefined`
 * @returns `'unset' | 'pure' | 'pessimistic' | 'whitelist'`
 *
 * @example
 * classifyDeclaration(undefined);                  // => 'unset'
 * classifyDeclaration(false);                      // => 'pure'
 * classifyDeclaration(['./dist/x.iife.js']);       // => 'whitelist'
 */
const classifyDeclaration = (declaration) => {
  if (declaration === undefined || declaration === null) { return 'unset'; }
  if (declaration === false)                             { return 'pure'; }
  if (Array.isArray(declaration))                        { return 'whitelist'; }
  return 'pessimistic';
};

/**
 * The verdict for one package. Pure — the heart of the gate, and the only part
 * that needs unit coverage.
 *
 * Fatal when the declaration licenses deleting a file that must not be deleted
 * (`sideEffects: false`, or a whitelist that misses one), and when a package
 * ships effectful files while declaring nothing at all — the `jssm-viz` failure
 * mode, where safety was accidental rather than stated. Advisory when a pure
 * package has simply not said so, or when a whitelist pattern has gone stale.
 *
 * @param declaration - The manifest's `sideEffects` value, or `undefined`
 * @param paths - The paths that would ship
 * @returns `{ ok, problems, notes }` — `problems` fail the gate, `notes` only inform
 *
 * @example
 * judgePackage(false, ['dist/jssm.mjs']);
 * // => { ok: true, problems: [], notes: [] }
 *
 * @example
 * judgePackage(false, ['dist/wc/viz.define.js']).problems[0].code;
 * // => 'false-with-effects'
 *
 * @example
 * judgePackage(['./dist/cdn/**'], ['dist/wc/viz.define.js']).problems[0].code;
 * // => 'unlisted-effect'
 */
const judgePackage = (declaration, paths) => {

  const kind      = classifyDeclaration(declaration),
        effectful = findEffectful(paths),
        problems  = [],
        notes     = [];

  if (effectful.length > 0) {

    if (kind === 'pure') {
      for (const e of effectful) {
        problems.push({ code: 'false-with-effects', path: e.path,
                        why: `declares "sideEffects": false but ships a file that ${e.why} — a bundler may delete it` });
      }
    }

    else if (kind === 'unset') {
      for (const e of effectful) {
        problems.push({ code: 'undeclared-effects', path: e.path,
                        why: `ships a file that ${e.why} but declares no "sideEffects" whitelist naming it` });
      }
    }

    else if (kind === 'whitelist') {
      for (const e of effectful) {
        if (!declaration.some(g => globMatches(g, e.path))) {
          problems.push({ code: 'unlisted-effect', path: e.path,
                          why: `${e.why}, but no "sideEffects" pattern matches it` });
        }
      }
    }

  }

  else if (kind === 'unset') {
    notes.push({ code: 'undeclared-pure', why: 'ships no effectful file and could declare "sideEffects": false, letting bundlers drop what consumers do not import' });
  }

  if (kind === 'whitelist') {
    for (const g of declaration) {
      if (!paths.some(p => globMatches(g, p))) {
        notes.push({ code: 'stale-pattern', why: `"sideEffects" pattern ${g} matches nothing this package ships` });
      }
    }
  }

  return { ok: problems.length === 0, problems, notes };

};

/**
 * Runs the gate over every discovered package. Pure orchestration around the
 * injected `pack` seam, so a test can drive the whole verdict without npm.
 *
 * @param dirs - Package directories (from `discoverPackageDirs`)
 * @param pack - `(dir) => string[]` returning that package's shipped paths
 * @returns `{ ok, lines, violations }` — `lines` is human output, `violations`
 *   is the flat `{ pkg, code, path, why }[]` (empty when every package agrees
 *   with what it ships)
 */
const runGate = (dirs, pack) => {

  const lines = [], violations = [];

  for (const dir of dirs) {

    const manifest = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')),
          name     = manifest.name,
          { ok, problems, notes } = judgePackage(manifest.sideEffects, pack(dir));

    if (ok) { lines.push(`ok: ${name} — "sideEffects" agrees with what it ships (${classifyDeclaration(manifest.sideEffects)})`); }
    else {
      lines.push(`FAIL: ${name} — ${problems.length} "sideEffects" violation(s):`);
      for (const p of problems) { lines.push(`  ${p.path}  [${p.code}] ${p.why}`); violations.push({ pkg: name, ...p }); }
    }

    for (const n of notes) { lines.push(`  note: ${name} ${n.why}`); }

  }

  return { ok: violations.length === 0, lines, violations };

};

/** Entry point. */
const main = () => {
  const { ok, lines } = runGate(discoverPackageDirs(), packPaths);
  for (const l of lines) { console.log(l); }
  if (!ok) { console.error('\nside-effect gate failed: give the package a "sideEffects" whitelist naming the files above, or stop publishing them.'); process.exit(1); }
};

if (require.main === module) {
  try { main(); }
  catch (e) { console.error(`verify_side_effects failed: ${e.message}`); process.exit(1); }
}

module.exports = { SIDE_EFFECT_RULES, globToRegExp, globMatches, findEffectful, classifyDeclaration, judgePackage, runGate };
