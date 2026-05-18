// Merged core rollup config — replaces rollup.config.{es5,es6,iife}.js.
// The three formats shared one input (dist/es6/jssm.js) and identical
// plugins, so they are one build emitting all three; the two declaration
// bundles likewise become one dts build with two outputs.

import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';
import dts         from 'rollup-plugin-dts';

export default [

  // jssm — cjs / es / iife from one parse of dist/es6/jssm.js
  {
    input: 'dist/es6/jssm.js',
    output: [
      { file: 'dist/jssm.es5.cjs.js',  format: 'cjs',  name: 'jssm' },
      { file: 'dist/jssm.es6.js',      format: 'es',   name: 'jssm' },
      { file: 'dist/jssm.es5.iife.js', format: 'iife', name: 'jssm' },
    ],
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

  // jssm type declarations — both module formats from one dts build
  {
    input: 'dist/es6/jssm.d.ts',
    output: [
      { file: './jssm.es5.d.cts', format: 'cjs' },
      { file: './jssm.es6.d.ts',  format: 'es' },
    ],
    plugins: [dts()],
  },

];
