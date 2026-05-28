import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';

const config = [{

  input: 'dist/es6/wc/jssm_instance_wc.define.js',

  output: {
    file    : 'dist/cdn/instance.js',
    format  : 'es',
    name    : 'jssm_instance_wc_cdn',
    inlineDynamicImports: true,
  },

  // CDN build inlines Lit and jssm core so consumers can drop the file in
  // with a single <script type="module"> import — no import map required.
  // This mirrors `rollup.config.wc.viz.cdn.js`, except viz's CDN keeps the
  // @viz-js/viz WASM external (multi-MB); jssm-instance has no comparable
  // bulky transitive dep.
  external : [],

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
