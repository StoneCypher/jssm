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

/**
 * Rollup plugin that resolves the WC source's `'../jssm_viz.js'` relative
 * import to an external bare-specifier id `'jssm/viz'`, so the emitted
 * bundle imports the consumer-resolvable subpath that `package.json#exports`
 * maps. Without this, Rollup either (a) inlines all of jssm core into the
 * WC bundle or (b) emits a relative path that doesn't resolve at consumer
 * load time from `node_modules/jssm/dist/wc/viz.js`.
 *
 * @returns {import('rollup').Plugin}
 */
function externalize_jssm_viz_as_subpath() {
  return {
    name: 'externalize-jssm-viz-as-subpath',
    resolveId(source) {
      if (source === '../jssm_viz.js' || source.endsWith('/jssm_viz.js')) {
        return { id: 'jssm/viz', external: true };
      }
      return null;
    },
  };
}

/**
 * Rollup plugin that rewrites the define build's `'./fsl_viz_wc.js'`
 * import (the TypeScript-emitted sibling source filename) to the dist-side
 * filename `'./viz.js'`, since the class build is emitted as
 * `dist/wc/viz.js`, not `dist/wc/fsl_viz_wc.js`.
 *
 * @returns {import('rollup').Plugin}
 */
function externalize_class_build_as_viz_js() {
  return {
    name: 'externalize-class-build-as-viz-js',
    resolveId(source) {
      if (source === './fsl_viz_wc.js') {
        return { id: './viz.js', external: true };
      }
      return null;
    },
  };
}

const config = [{

  input: 'dist/es6/wc/fsl_viz_wc.js',

  output: {
    file   : 'dist/wc/viz.js',
    format : 'es',
    name   : 'fsl_viz_wc',
  },

  external : sharedExternal,
  plugins  : [externalize_jssm_viz_as_subpath(), ...sharedPlugins],

}, {

  input: 'dist/es6/wc/fsl_viz_wc.define.js',

  output: {
    file   : 'dist/wc/viz.define.js',
    format : 'es',
    name   : 'fsl_viz_wc_define',
  },

  // The define build externalizes the class build so it imports at runtime
  // rather than inlining — keeps the define module a thin "registration only"
  // wrapper that tree-shaking can keep small.
  external : sharedExternal,
  plugins  : [externalize_class_build_as_viz_js(), ...sharedPlugins],

}];

export default config;
