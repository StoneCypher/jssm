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
];

/**
 * Rollup plugin that rewrites the define build's `'./fsl_docs_wc.js'` import
 * to the dist-side filename `'./docs.js'`, since the class build is emitted as
 * `dist/wc/docs.js`. Keeps the define module a thin "registration only" wrapper.
 *
 * @returns {import('rollup').Plugin}
 */
function externalize_class_build_as_docs_js() {
  return {
    name: 'externalize-class-build-as-docs-js',
    resolveId(source) {
      if (source === './fsl_docs_wc.js') {
        return { id: './docs.js', external: true };
      }
      return null;
    },
  };
}

// fsl-docs imports no jssm core — only lit + its local content/renderer/tokens,
// which are inlined. So unlike the instance/editor bundles there is no
// jssm-core subpath to externalize; the curriculum content lives in docs.js,
// isolated to consumers who import `<fsl-docs>` (not the shared widgets bundle).
const config = [{

  input: 'dist/es6/wc/fsl_docs_wc.js',

  output: {
    file   : 'dist/wc/docs.js',
    format : 'es',
    name   : 'fsl_docs_wc',
  },

  external : sharedExternal,
  plugins  : sharedPlugins,

}, {

  input: 'dist/es6/wc/fsl_docs_wc.define.js',

  output: {
    file   : 'dist/wc/docs.define.js',
    format : 'es',
    name   : 'fsl_docs_wc_define',
  },

  external : sharedExternal,
  plugins  : [externalize_class_build_as_docs_js(), ...sharedPlugins],

}];

export default config;
