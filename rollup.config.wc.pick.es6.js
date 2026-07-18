import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';

const sharedPlugins = [
  nodeResolve({
    mainFields     : ['module', 'main'],
    browser        : true,
    extensions     : ['.js', '.json'],
    preferBuiltins : false
  }),
  commonjs()
];

const sharedExternal = [
  'lit',
  'lit/decorators.js',
  '@xenova/transformers'
];

function externalize_class_build_as_pick_js() {
  return {
    name: 'externalize-class-build-as-pick-js',
    resolveId(source) {
      if (source === './fsl_pick_wc.js') {
        return { id: './pick.js', external: true };
      }
      return null;
    },
  };
}

const config = [{
  input: 'dist/es6/wc/fsl_pick_wc.js',
  output: {
    file   : 'dist/wc/pick.js',
    format : 'es',
    name   : 'fsl_pick_wc',
  },
  external : sharedExternal,
  plugins  : sharedPlugins,
}, {
  input: 'dist/es6/wc/fsl_pick_wc.define.js',
  output: {
    file   : 'dist/wc/pick.define.js',
    format : 'es',
    name   : 'fsl_pick_wc_define',
  },
  external : sharedExternal,
  plugins  : [externalize_class_build_as_pick_js(), ...sharedPlugins],
}];

export default config;
