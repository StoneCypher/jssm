// jssm-verify package — the safety-property checker (megaspec §17, fsl #1360),
// promoted out of the main repo's unshipped modules into a package of its own.
//
// `jssm` is a TYPE-ONLY dependency here.  fsl_verify imports `Machine` solely
// to annotate parameters; there is no `new Machine`, no `instanceof`, and no
// value ever crosses the boundary at runtime.  The compiled bundle therefore
// contains no jssm code, and the manifest declares jssm as an OPTIONAL PEER
// rather than a dependency -- an installer who already has jssm gets type
// alignment, and the machine-decoupled half of the API (check_graph_safety and
// friends, which verify plain adjacency graphs) works with no jssm at all.
//
// Marking it external rather than bundling is what preserves that: bundling
// would drag the whole core into a package whose entire appeal is being small
// and dependency-free.

import nodeResolve from '@rollup/plugin-node-resolve';
import dts         from 'rollup-plugin-dts';
import path        from 'path';

/** Absolute path of the core entry, the one module this package must not swallow. */
const CORE_ENTRY = path.resolve('dist/es6', 'jssm.js');

/**
 * Rewrites the relative import of core to the bare `jssm` specifier and marks
 * it external, mirroring how the other pkg_* configs cross package
 * boundaries. Type-only in practice, so nothing survives into the bundle.
 *
 * @returns {import('rollup').Plugin}
 */
function externalize_core() {
  return {
    name: 'externalize-core',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) { return null; }
      const resolved = path.resolve(path.dirname(importer), source);
      if (resolved === CORE_ENTRY) { return { id: 'jssm', external: true }; }
      return null;
    },
  };
}

export default [

  {
    input   : 'dist/es6/fsl_verify.js',
    output  : { file: 'packages/jssm-verify/dist/verify.js', format: 'es' },
    plugins : [ externalize_core(), nodeResolve({ extensions: ['.js', '.json'] }) ],
  },

  {
    input    : 'dist/es6/fsl_verify.d.ts',
    output   : { file: 'packages/jssm-verify/dist/verify.d.ts', format: 'es' },
    external : (id) => id === 'jssm' || id.endsWith('/jssm'),
    plugins  : [ externalize_core(), dts() ],
  },

];
