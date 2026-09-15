/*******
 *
 *  What the 6.0 bare-functions split does and does not buy a bundler
 *  (bare-functions design, "Entry points and packaging"; controller ruling
 *  2026-09-13).
 *
 *  A module that imports only functions from the default `jssm` entry and is
 *  handed a machine from elsewhere sheds the `Machine` class entirely: the
 *  functions read the machine's fields and never reference the prototype.
 *
 *  A bundle that constructs a machine — `sm`, `fsl`, `from`, `create` — still
 *  carries the compat class, and through its one-line delegates every family,
 *  because in 6.0 the value those factories return IS a `Machine` instance
 *  (decision 3).  The full size win lands when a later major drops the
 *  prototype from the default value.  So no size comparison between a
 *  factory-importing bundle and a `jssm/compat` bundle is asserted here; that
 *  claim is false by construction in 6.0.
 *
 *  Both facts are produced here with rollup's JS API over the compiled
 *  `dist/es6/` modules, using the same plugin stack `rollup.config.core.js`
 *  uses, unminified, with tree-shaking on.
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

/** The class declaration as the es2017 emit spells it; its presence is the whole question. */
const CLASS_MARKER = 'class Machine';

/** A field only the transition core touches; its presence proves the functions were bundled. */
const TRANSITION_CORE_MARKER = '_committing_transition';



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



describe.skipIf(!compat_dist_present)('bare functions and the compat class in a consumer bundle (full dist only)', () => {

  test('a functions-only import (no factory) sheds the Machine class but keeps the transition core', async () => {

    const functions_only = await bundle_consumer(
      '\0consumer-functions-only.js',
      `export { state, transition } from '${as_import_path(functions_entry)}';`
    );

    expect(functions_only).not.toContain(CLASS_MARKER);
    expect(functions_only).toContain(TRANSITION_CORE_MARKER);

  }, 120_000);

  describe('in 6.0 a factory import carries the compat class (decision 3: the value is a Machine instance)', () => {

    test('importing { sm, state } from jssm bundles the Machine class', async () => {

      const with_factory = await bundle_consumer(
        '\0consumer-factory.js',
        `export { sm, state } from '${as_import_path(functions_entry)}';`
      );

      expect(with_factory).toContain(CLASS_MARKER);

    }, 120_000);

    test('importing { Machine } from jssm/compat bundles the Machine class', async () => {

      const with_compat = await bundle_consumer(
        '\0consumer-compat.js',
        `export { Machine } from '${as_import_path(compat_entry)}';`
      );

      expect(with_compat).toContain(CLASS_MARKER);

    }, 120_000);

  });

});
