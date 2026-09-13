// Merged core rollup config — replaces rollup.config.{es5,es6,iife}.js.
// The three formats shared one input (dist/es6/jssm.js) and identical
// plugins, so they are one build emitting all three; the two declaration
// bundles likewise become one dts build with two outputs.
//
// Since 6.0 the package has a second entry, `jssm/compat` (dist/es6/compat.js):
// the 5.x `Machine` class API over the same module graph.  It is bundled here
// as an es-only twin of the core bundle (cjs / iife consumers get compat
// through the jssm-commonjs and jssm-iife packages) with its own dts build.

import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';
import dts         from 'rollup-plugin-dts';

/** The one plugin stack every core bundle shares. */
const core_plugins = () => [
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

export default [

  // jssm — cjs / es / iife from one parse of dist/es6/jssm.js
  {
    input: 'dist/es6/jssm.js',
    output: [
      { file: 'dist/jssm.es5.cjs.js',  format: 'cjs',  name: 'jssm' },
      { file: 'dist/jssm.es6.js',      format: 'es',   name: 'jssm' },
      { file: 'dist/jssm.es5.iife.js', format: 'iife', name: 'jssm' },
    ],
    plugins: core_plugins(),
  },

  // jssm type declarations — both module formats from one dts build
  {
    input: 'dist/es6/jssm.d.ts',
    output: [
      { file: './jssm.es5.d.cts', format: 'cjs' },
      { file: './jssm.es6.d.ts',  format: 'es' },
    ],
    plugins: [dts()],
  },

  // jssm/compat — the class entry, es only (cjs/iife consumers get compat
  // through their own packages)
  {
    input: 'dist/es6/compat.js',
    output: [ { file: 'dist/jssm.compat.es6.js', format: 'es', name: 'jssm' } ],
    plugins: core_plugins(),
  },

  // jssm/compat type declarations
  {
    input: 'dist/es6/compat.d.ts',
    output: [ { file: './jssm.compat.d.ts', format: 'es' } ],
    plugins: [dts()],
  },

];
