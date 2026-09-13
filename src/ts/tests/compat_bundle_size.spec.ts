/*******
 *
 *  The tree-shaking claim of the 6.0 bare-functions split (bare-functions
 *  design, "Entry points and packaging"): a consumer bundle that imports only
 *  `{ sm, transition, state }` from the default `jssm` entry must come out
 *  smaller than one that imports `{ Machine }` from `jssm/compat`, because
 *  the class drags every delegate — and so every family — into the graph,
 *  while the functions bring only what they call.
 *
 *  Both bundles are produced here with rollup's JS API over the compiled
 *  `dist/es6/` modules, using the same plugin stack `rollup.config.core.js`
 *  uses, unminified, with tree-shaking on.  The assertion is only "smaller",
 *  never a byte count, so there is no golden number to rot.
 *
 *  `dist/es6/compat.js` exists only after a full build; the ci-lite legs
 *  clean `dist/` and rebuild only the wc/cm6/cli bundles, so this suite
 *  self-skips without it, exactly as `published_files.spec.ts` does.
 *
 */

import { describe, test, expect } from 'vitest';

import { existsSync } from 'node:fs';
import { resolve }    from 'node:path';

import { rollup }  from 'rollup';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';

import type { Plugin } from 'rollup';



const root = resolve(__dirname, '../../..');

const functions_entry = resolve(root, 'dist/es6/jssm.js');
const compat_entry    = resolve(root, 'dist/es6/compat.js');

const compat_dist_present = existsSync(compat_entry);



/**
 *  A one-module virtual entry, so the "consumer" code under test never has to
 *  exist on disk.  Rollup resolves the sentinel id to `source` and every other
 *  import falls through to the real resolvers.
 */
function virtual_entry(id: string, source: string): Plugin {
  return {
    name      : 'virtual-entry',
    resolveId : (source_id: string) => (source_id === id ? id : null),
    load      : (module_id: string) => (module_id === id ? source : null),
  };
}



/** The plugin stack `rollup.config.core.js` uses for the core bundles. */
function core_plugins(): Plugin[] {
  return [
    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : ['.js', '.json', '.ts', '.tsx'],
      preferBuiltins : false,
    }),
    commonjs(),
    replace({
      preventAssignment      : true,
      'process.env.NODE_ENV' : JSON.stringify('production'),
    }),
  ];
}



/** Bundles a one-line consumer module and returns the unminified ES output. */
async function bundle_consumer(entry_id: string, source: string): Promise<string> {

  const bundle = await rollup({
    input     : entry_id,
    plugins   : [ virtual_entry(entry_id, source), ...core_plugins() ],
    treeshake : true,
    onwarn    : () => { /* circular-import notices from the family graph are expected */ },
  });

  try {
    const { output } = await bundle.generate({ format: 'es' });
    return output[0].code;
  } finally {
    await bundle.close();
  }

}



/** Forward slashes so the virtual module's import specifier is valid on every platform. */
const as_import_path = (p: string): string => p.replace(/\\/g, '/');



describe.skipIf(!compat_dist_present)('jssm/compat bundle size (full dist only)', () => {

  test('importing { sm, transition, state } from jssm bundles smaller than importing { Machine } from jssm/compat', async () => {

    const functions_code = await bundle_consumer(
      '\0consumer-functions.js',
      `export { sm, transition, state } from '${as_import_path(functions_entry)}';`
    );

    const compat_code = await bundle_consumer(
      '\0consumer-compat.js',
      `export { Machine } from '${as_import_path(compat_entry)}';`
    );

    // both bundles are real: each carries the factory it was asked for
    expect(functions_code).toContain('function sm(');
    expect(compat_code).toContain('class Machine');

    expect(functions_code.length).toBeLessThan(compat_code.length);

  }, 120_000);

});
