// Merged viz rollup config — replaces rollup.config.viz.{es5,es6,iife}.js.
// The es and iife builds shared an identical plugin stack and become one
// build with two outputs. The cjs build is kept separate: it resolves with
// `browser: false` (node-targeted) where es/iife use `browser: true`, and
// that is an input-level plugin difference that cannot be shared.

import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';
import dts         from 'rollup-plugin-dts';

const vizPlugins = (browser) => [
  nodeResolve({
    mainFields     : ['module', 'main'],
    browser,
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

  // jssm_viz cjs — node-targeted resolution (browser: false)
  {
    input: 'dist/es6/jssm_viz.js',
    output: { file: 'dist/jssm_viz.es5.cjs.js', format: 'cjs', name: 'jssm_viz' },
    external: ['@viz-js/viz'],
    plugins: vizPlugins(false),
  },

  // jssm_viz es + iife — browser resolution, one parse of the input
  {
    input: 'dist/es6/jssm_viz.js',
    output: [
      { file: 'dist/jssm_viz.es6.js',      format: 'es',   name: 'jssm_viz' },
      { file: 'dist/jssm_viz.es5.iife.js', format: 'iife', name: 'jssm_viz', inlineDynamicImports: false },
    ],
    external: ['@viz-js/viz'],
    plugins: vizPlugins(true),
  },

  // jssm_viz type declarations — both outputs from one dts build
  {
    input: 'dist/es6/jssm_viz.d.ts',
    output: [
      { file: './jssm_viz.es5.d.cts', format: 'es' },
      { file: './jssm_viz.es6.d.ts',  format: 'es' },
    ],
    plugins: [dts()],
  },

];
