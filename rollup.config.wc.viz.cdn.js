import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';

const config = [{

  input: 'dist/es6/wc/jssm_viz_wc.define.js',

  output: {
    file    : 'dist/cdn/viz.js',
    format  : 'es',
    name    : 'jssm_viz_wc_cdn',
    inlineDynamicImports: true,
  },

  // Lit and its directives are bundled in for the CDN build. @viz-js/viz
  // stays external — its WASM payload is multi-MB; bundling it would balloon
  // the CDN file beyond reason. CDN consumers load @viz-js/viz via an import
  // map alongside the script tag (same pattern as dist/jssm_viz.iife.cjs).
  //
  // NOTE: We DO NOT externalize jssm core here — unlike the bundler-friendly
  // build (rollup.config.wc.viz.es6.js), the CDN target is self-contained
  // so consumers don't need to set up import maps for jssm-internal subpaths.
  external : [
    '@viz-js/viz',
  ],

  plugins : [
    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : ['.js', '.json'],
      preferBuiltins : false
    }),
    commonjs(),
    replace({
      preventAssignment      : true,
      'process.env.NODE_ENV' : JSON.stringify('production')
    })
  ]
}];

export default config;
