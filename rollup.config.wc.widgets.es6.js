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
];

/**
 * Resolves the WC source's jssm-core relative imports to the consumer-facing
 * bare subpaths that `package.json#exports` maps: `'../jssm.js'` → `'jssm'`
 * and `'../jssm_viz.js'` → `'jssm/viz'` (fsl-export's `machine_to_dot`). Keeps
 * jssm core + viz out of the widgets bundle so they resolve to the consumer's
 * installed copy at load time.
 *
 * @returns {import('rollup').Plugin}
 */
function externalize_jssm_subpaths() {
  return {
    name: 'externalize-jssm-subpaths',
    resolveId(source) {
      if (source === '../jssm.js'     || source.endsWith('/jssm.js'))     { return { id: 'jssm',     external: true }; }
      if (source === '../jssm_viz.js' || source.endsWith('/jssm_viz.js')) { return { id: 'jssm/viz', external: true }; }
      return null;
    },
  };
}

/**
 * Rewrites the define build's `'./widgets.js'` import to stay external so the
 * registration bundle imports the class bundle (`dist/wc/widgets.js`) at
 * runtime instead of re-inlining all eight widget classes.
 *
 * @returns {import('rollup').Plugin}
 */
function externalize_class_build_as_widgets_js() {
  return {
    name: 'externalize-class-build-as-widgets-js',
    resolveId(source) {
      if (source === './widgets.js') { return { id: './widgets.js', external: true }; }
      return null;
    },
  };
}

const config = [{

  input: 'dist/es6/wc/widgets.js',

  output: {
    file   : 'dist/wc/widgets.js',
    format : 'es',
    name   : 'fsl_widgets',
  },

  external : sharedExternal,
  plugins  : [externalize_jssm_subpaths(), ...sharedPlugins],

}, {

  input: 'dist/es6/wc/widgets.define.js',

  output: {
    file   : 'dist/wc/widgets.define.js',
    format : 'es',
    name   : 'fsl_widgets_define',
  },

  external : sharedExternal,
  plugins  : [externalize_class_build_as_widgets_js(), externalize_jssm_subpaths(), ...sharedPlugins],

}];

export default config;
