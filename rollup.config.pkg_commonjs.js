// jssm-commonjs compatibility package — the CommonJS build, sequestered out of the
// main package for v6 (`esm-only-main-package`).
//
// SELF-CONTAINED ON PURPOSE.  The obvious-looking alternative — a thin package
// that just re-exports `jssm` — cannot work: once the main package is ESM
// only, `require('jssm')` is exactly the thing a CJS consumer cannot do on the
// Node versions that still need CJS.  A compat package that depended on core
// would fail precisely for the audience it exists to serve, so this bundles
// the whole graph from the same input the core build parses.
//
// The consequence is deliberate duplication of code between `jssm` and
// `jssm-commonjs`.  That is the cost of the split: a consumer downloads one format
// or the other, never both, which is the point.

import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';
import dts         from 'rollup-plugin-dts';

export default [

  {
    input  : 'dist/es6/jssm.js',
    output : { file: 'packages/jssm-commonjs/dist/jssm.cjs', format: 'cjs', name: 'jssm', exports: 'named' },
    plugins: [
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
    ],
  },

  //  Types travel WITH the package that ships the format they describe --
  //  never a separate @types/ package.  A `.d.cts` here rather than in core,
  //  because it is the CJS surface it documents.
  {
    input  : 'dist/es6/jssm.d.ts',
    output : { file: 'packages/jssm-commonjs/dist/jssm.d.cts', format: 'cjs' },
    plugins: [dts()],
  },

];
