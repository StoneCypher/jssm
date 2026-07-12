/**
 * Declaration-surface parity gate — verifies that each paired root type
 * declaration (the `.d.cts` served to `require`-condition consumers and the
 * `.d.ts` served to `import`-condition consumers) exports the identical name
 * set, so the two module-format type surfaces cannot silently diverge
 * (fsl#1940).  attw passes when each surface is merely self-consistent; only
 * this cross-surface name-set diff catches one fork of a pair dropping an
 * export the other keeps.
 *
 * Checked pairs (all root-level, all published):
 *   jssm.es5.d.cts     <-> jssm.es6.d.ts      (rollup.config.core.js dts build)
 *   jssm_viz.es5.d.cts <-> jssm_viz.es6.d.ts  (rollup.config.viz.js dts build)
 *   jssm.cli.d.cts     <-> jssm.cli.d.ts      (rollup.config.cli.js dts build)
 *
 * (`jssm.fence.d.ts` has no CJS twin, so it has nothing to be compared to.)
 *
 * Intentional asymmetries, should one ever exist, go in `ALLOWLIST` below,
 * keyed by pair label; it is empty by default and any entry should cite the
 * issue that justified it.
 *
 * Exit codes: 0 when every pair matches (after allowlisting); 1 when any
 * asymmetric names remain or a declaration file is missing/unreadable.
 *
 * @example
 * // gate the committed root declarations (the normal build/CI invocation)
 * //   $ node src/buildjs/decl_parity.cjs
 * //   decl_parity: jssm.es5.d.cts <-> jssm.es6.d.ts ok (65 names)
 * //   ...
 *
 * @example
 * // check an arbitrary ad-hoc pair (diagnosis / demonstrating a failure)
 * //   $ node src/buildjs/decl_parity.cjs stale.d.cts jssm.es6.d.ts
 * //   decl_parity FAIL stale.d.cts <-> jssm.es6.d.ts
 * //     only in stale.d.cts     : (none)
 * //     only in jssm.es6.d.ts   : FenceDescriptor, parse_fence_info
 *
 * @see src/buildjs/build_manifest.cjs   for the artifact byte-equivalence gate
 * @see .github/workflows/nodejs.yml     "declaration parity gate" step (after attw)
 */

const { readFileSync } = require('fs'),
      { join }         = require('path');



/** Repo root, relative to this file at src/buildjs/. */
const ROOT = join(__dirname, '..', '..');

/**
 * The paired declaration twins to gate: [label, cjs-flavored file,
 * esm-flavored file], paths relative to repo root.  Every generator that
 * grows a new .d.cts/.d.ts pair should add it here.
 */
const PAIRS = [
  ['jssm',     'jssm.es5.d.cts',     'jssm.es6.d.ts'    ],
  ['jssm_viz', 'jssm_viz.es5.d.cts', 'jssm_viz.es6.d.ts'],
  ['jssm_cli', 'jssm.cli.d.cts',     'jssm.cli.d.ts'    ],
];

/**
 * Intentional per-pair asymmetries, empty by default.  Keyed by pair label
 * (`'jssm'`, `'jssm_viz'`, `'jssm_cli'`); each value is an array of export
 * names ignored in BOTH directions for that pair.  Any entry added here
 * should carry a comment citing the issue that ruled the asymmetry
 * intentional.
 *
 * @example
 * // const ALLOWLIST = { jssm: ['esm_only_helper'] };  // fsl#XXXX: ESM-only by design
 */
const ALLOWLIST = {};



/**
 * Extracts the set of exported names from `.d.ts`/`.d.cts` source text, so
 * two declaration surfaces can be compared by name.  Understands the forms
 * rollup-plugin-dts emits — `export { a, b as c }`, `export type { ... }`,
 * `export declare <kind> <name>`, `export default`, `export =` — after
 * stripping block comments (doc-comment @examples would otherwise
 * false-positive).  A re-export star (`export * from`) is recorded as the
 * name `'*'` so an asymmetric star still trips the gate rather than passing
 * silently unresolved.
 *
 * @param {string} source - Full text of a declaration file
 * @returns {Set<string>} - Every exported name (renames counted by their public name)
 *
 * @example
 * extractExportNames('export { a, b as c };\nexport type { D };');
 * // => Set { 'a', 'c', 'D' }
 */
const extractExportNames = (source) => {

  const names = new Set(),
        bare  = source.replace(/\/\*[\s\S]*?\*\//g, '');

  // export { a, b as c };  /  export type { X };
  for (const m of bare.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const piece of m[1].split(',')) {
      const trimmed = piece.trim();
      if (trimmed === '') { continue; }
      const halves = trimmed.split(/\s+as\s+/);
      names.add( (halves.length === 2 ? halves[1] : halves[0]).trim() );
    }
  }

  // export [declare] [abstract] function|class|const|... name
  for (const m of bare.matchAll(/^export\s+(?:declare\s+)?(?:abstract\s+)?(?:function|class|const|let|var|type|interface|enum|namespace)\s+([A-Za-z0-9_$]+)/gm)) {
    names.add(m[1]);
  }

  if ( /export\s+default[\s({]/.test(bare) ) { names.add('default');  }
  if ( /export\s*=/.test(bare)             ) { names.add('export=');  }
  if ( /export\s*\*\s*from/.test(bare)     ) { names.add('*');        }

  return names;

};



/**
 * Diffs two export name-sets after removing allowlisted names, so a pair's
 * intentional asymmetries do not fail the gate.  Pure; the fs never enters.
 *
 * @param {Set<string>} cjs_names - Names exported by the .d.cts side
 * @param {Set<string>} esm_names - Names exported by the .d.ts side
 * @param {string[]} allow - Names permitted to differ, in either direction
 * @returns {{only_cjs: string[], only_esm: string[]}} - Sorted asymmetric names per side; both empty means parity
 *
 * @example
 * diffNameSets(new Set(['a']), new Set(['a', 'b']), []);
 * // => { only_cjs: [], only_esm: ['b'] }
 */
const diffNameSets = (cjs_names, esm_names, allow) => {

  const allowed = new Set(allow);

  return {
    only_cjs : [... cjs_names].filter(n => !esm_names.has(n) && !allowed.has(n)).sort(),
    only_esm : [... esm_names].filter(n => !cjs_names.has(n) && !allowed.has(n)).sort(),
  };

};



/**
 * Reads one declaration pair from disk and reports its parity, printing a
 * one-line ok or a multi-line FAIL with the asymmetric names.
 *
 * @param {string} label - Pair label, also the ALLOWLIST key
 * @param {string} cjs_path - Absolute path of the .d.cts side
 * @param {string} esm_path - Absolute path of the .d.ts side
 * @param {string[]} allow - Allowlisted names for this pair
 * @returns {boolean} - true when the pair passes
 */
const checkPair = (label, cjs_path, esm_path, allow) => {

  let cjs_src, esm_src;

  try { cjs_src = readFileSync(cjs_path, 'utf8'); }
  catch { console.log(`decl_parity FAIL ${label}: cannot read ${cjs_path}`); return false; }

  try { esm_src = readFileSync(esm_path, 'utf8'); }
  catch { console.log(`decl_parity FAIL ${label}: cannot read ${esm_path}`); return false; }

  const cjs_names = extractExportNames(cjs_src),
        esm_names = extractExportNames(esm_src),

        { only_cjs, only_esm } = diffNameSets(cjs_names, esm_names, allow);

  if ( (only_cjs.length === 0) && (only_esm.length === 0) ) {
    console.log(`decl_parity: ${cjs_path} <-> ${esm_path} ok (${cjs_names.size} names)`);
    return true;
  }

  console.log(`decl_parity FAIL ${cjs_path} <-> ${esm_path}`);
  console.log(`  only in ${cjs_path} : ${only_cjs.length ? only_cjs.join(', ') : '(none)'}`);
  console.log(`  only in ${esm_path} : ${only_esm.length ? only_esm.join(', ') : '(none)'}`);

  return false;

};



const main = () => {

  const args = process.argv.slice(2);

  // ad-hoc mode: two explicit paths make one unlabelled pair (no allowlist)
  if (args.length === 2) {
    process.exit( checkPair('adhoc', args[0], args[1], []) ? 0 : 1 );
  }

  if (args.length !== 0) {
    console.log('usage: node src/buildjs/decl_parity.cjs [cjs_decl_file esm_decl_file]');
    process.exit(1);
  }

  const all_ok = PAIRS
    .map( ([label, cjs, esm]) => checkPair(label, join(ROOT, cjs), join(ROOT, esm), ALLOWLIST[label] ?? []) )
    .every(ok => ok);

  process.exit(all_ok ? 0 : 1);

};



if (require.main === module) { main(); }

module.exports = { extractExportNames, diffNameSets, checkPair, PAIRS, ALLOWLIST };
