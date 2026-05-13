import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';

const sharedPlugins = [
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
];

const sharedExternal = [
  'lit',
  'lit/decorators.js',
  'lit/directives/unsafe-html.js',
  '@viz-js/viz',
];

const config = [{

  input: 'dist/es6/wc/jssm_viz_wc.js',

  output: {
    file   : 'dist/wc/viz.js',
    format : 'es',
    name   : 'jssm_viz_wc',
  },

  external : sharedExternal,
  plugins  : sharedPlugins,

}, {

  input: 'dist/es6/wc/jssm_viz_wc.define.js',

  output: {
    file   : 'dist/wc/viz.define.js',
    format : 'es',
    name   : 'jssm_viz_wc_define',
  },

  // The define build externalizes the class build so it imports at runtime
  // rather than inlining — keeps the define module a thin "registration only"
  // wrapper that tree-shaking can keep small.
  external : [...sharedExternal, './jssm_viz_wc.js'],
  plugins  : sharedPlugins,

}];

export default config;
