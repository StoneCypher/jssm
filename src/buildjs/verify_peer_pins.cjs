/**
 * Peer-pin gate — fails the build if any workspace package pins a SIBLING
 * workspace package to an exact version in `peerDependencies`. Sibling peers
 * must be ranges; third-party peers (`lit`, `@codemirror/*`, ...) are none of
 * this gate's business and are ignored.
 *
 * Lockstep versioning and peer dependencies answer different questions.
 * Lockstep says "these artifacts were cut together"; a peer dependency says
 * "here is what the host must supply for me to work". Pinning a peer to the
 * lockstep version conflates the two, and the conflation defeats the split that
 * created these packages: `jssm-verify` pinned to `jssm` at `6.0.0-alpha.12`
 * is unusable beside `jssm@6.0.0-alpha.13`, or `6.0.0`, or any later patch —
 * which puts the two back in lockstep, the exact coupling extracting them was
 * meant to end.
 *
 * This is a gate rather than a fix in `makever.cjs` on purpose. Both
 * `makever.cjs` and `publish_workspaces.cjs` deliberately scope their rewrites
 * to `dependencies` so they can never reach a same-named key elsewhere in the
 * manifest. That is correct, and teaching either one to stamp
 * `peerDependencies` would only automate the upkeep of a value that should not
 * exist. Asserting the invariant is the cheaper and more honest move.
 *
 *   node src/buildjs/verify_peer_pins.cjs
 *       Checks every discovered package; prints a per-package verdict and
 *       exits 1 on any exact sibling peer pin.
 *
 * Deliberately carries NO dependency — not even `semver`. It runs in the same
 * dependency-light CI job as the other release gates, where devDependencies
 * are not installed; relying on the `npm install semver --no-save` that a
 * neighbouring step happens to perform would couple this gate to that step's
 * ordering.
 *
 * @see src/buildjs/verify_side_effects.cjs   sibling gate this mirrors in shape
 * @see src/buildjs/tests/verify_peer_pins.spec.ts   unit coverage for the pure functions
 */

'use strict';

const { readFileSync } = require('fs'),
      path             = require('path'),
      { discoverPackageDirs } = require('./verify_no_published_bloat.cjs');

/**
 * An exact version: `major.minor.patch`, optionally with a prerelease and/or
 * build tag, and nothing else. Every npm range form is excluded by
 * construction — an operator (`^ ~ > < =`), a wildcard (`* x`), a union
 * (`||`), or a hyphen range all leave characters this pattern will not match.
 */
const EXACT_VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * Whether a dependency spec names one exact version rather than a range.
 *
 * @param spec - The pinned value from a manifest, e.g. `'^6.0.0-alpha.12'`
 * @returns `true` only for a bare concrete version
 *
 * @example
 * isExactVersion('6.0.0-alpha.12');    // => true
 * isExactVersion('^6.0.0-alpha.12');   // => false
 * isExactVersion('file:../..');        // => false
 */
const isExactVersion = (spec) => typeof spec === 'string' && EXACT_VERSION_RE.test(spec);

/**
 * The verdict for one manifest. Pure — the heart of the gate.
 *
 * @param manifest - A parsed `package.json`
 * @param sibling_names - Every workspace package name, including the root's
 * @returns One `{ dep, spec, why }` per offending peer pin; empty when clean
 *
 * @example
 * judgeManifest({ peerDependencies: { jssm: '6.0.0-alpha.12' } }, ['jssm'])[0].dep;
 * // => 'jssm'
 *
 * @example
 * judgeManifest({ peerDependencies: { jssm: '^6.0.0-alpha.12' } }, ['jssm']);
 * // => []
 *
 * @example
 * judgeManifest({ peerDependencies: { lit: '3.1.0' } }, ['jssm']);
 * // => []   (third-party peers are out of scope, exact or not)
 */
const judgeManifest = (manifest, sibling_names) => {

  const peers = manifest.peerDependencies || {},
        out   = [];

  for (const [dep, spec] of Object.entries(peers)) {
    if (!sibling_names.includes(dep)) { continue; }
    if (!isExactVersion(spec))        { continue; }
    out.push({ dep, spec,
               why: `pins sibling ${dep} to exactly ${spec}, so the two are usable only in that one pairing — use a range (e.g. ^${spec})` });
  }

  return out;

};

/**
 * Reads one package directory's manifest.
 *
 * @param dir - Package directory
 * @returns The parsed manifest
 */
const readManifest = (dir) => JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));

/**
 * Runs the gate over every discovered package. Pure orchestration around the
 * injected `read` seam, so a test can drive the whole verdict off fixtures.
 *
 * @param dirs - Package directories (from `discoverPackageDirs`)
 * @param read - `(dir) => manifest` returning that directory's parsed manifest
 * @returns `{ ok, lines, violations }` — `lines` is human output, `violations`
 *   is the flat `{ pkg, dep, spec, why }[]` (empty when every sibling peer is a range)
 */
const runGate = (dirs, read) => {

  const manifests = dirs.map(read),
        names     = manifests.map(m => m.name),
        lines     = [],
        violations = [];

  for (const manifest of manifests) {

    const bad = judgeManifest(manifest, names);

    if (bad.length === 0) { lines.push(`ok: ${manifest.name} pins no sibling peer to an exact version`); }
    else {
      lines.push(`FAIL: ${manifest.name} — ${bad.length} exact sibling peer pin(s):`);
      for (const b of bad) { lines.push(`  ${b.dep}@${b.spec}  ${b.why}`); violations.push({ pkg: manifest.name, ...b }); }
    }

  }

  return { ok: violations.length === 0, lines, violations };

};

/** Entry point. */
const main = () => {
  const { ok, lines } = runGate(discoverPackageDirs(), readManifest);
  for (const l of lines) { console.log(l); }
  if (!ok) { console.error('\npeer-pin gate failed: a sibling peer dependency must be a range, not the lockstep version.'); process.exit(1); }
};

if (require.main === module) {
  try { main(); }
  catch (e) { console.error(`verify_peer_pins failed: ${e.message}`); process.exit(1); }
}

module.exports = { EXACT_VERSION_RE, isExactVersion, judgeManifest, readManifest, runGate };
