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

// Lit + the CodeMirror / Lezer peer set stay external (the consumer installs
// them once and shares them with their own editor extensions).
const sharedExternal = [
  'lit',
  'lit/decorators.js',
  '@codemirror/view',
  '@codemirror/state',
  '@codemirror/language',
  '@codemirror/commands',
  '@codemirror/autocomplete',
  '@codemirror/lint',
  '@lezer/highlight',
];

/**
 * Resolves the editor's jssm-core relative imports to consumer-facing bare
 * subpaths: the language service (`'../../language_service/index.js'`, which
 * jssm core re-exports) and any `'/jssm.js'` → `'jssm'`, and the FSL CodeMirror
 * language (`'../cm6/fsl_language.js'`) → `'jssm/cm6'`. The editor's own
 * adapters + theme are inlined; only jssm core and the CM6 grammar are shared.
 *
 * @returns {import('rollup').Plugin}
 */
function externalize_jssm_subpaths() {
  return {
    name: 'externalize-jssm-subpaths',
    resolveId(source) {
      if (source.endsWith('/language_service/index.js')) { return { id: 'jssm',     external: true }; }
      if (source === '../jssm.js' || source.endsWith('/jssm.js')) { return { id: 'jssm', external: true }; }
      if (source.endsWith('/cm6/fsl_language.js')) { return { id: 'jssm/cm6', external: true }; }
      return null;
    },
  };
}

/**
 * Rewrites the define build's `'./fsl_editor_wc.js'` import to the dist class
 * filename `'./editor.js'`, keeping the registration bundle a thin wrapper.
 *
 * @returns {import('rollup').Plugin}
 */
function externalize_class_build_as_editor_js() {
  return {
    name: 'externalize-class-build-as-editor-js',
    resolveId(source) {
      if (source === './fsl_editor_wc.js') { return { id: './editor.js', external: true }; }
      return null;
    },
  };
}

const config = [{

  input: 'dist/es6/wc/fsl_editor_wc.js',

  output: {
    file   : 'dist/wc/editor.js',
    format : 'es',
    name   : 'fsl_editor_wc',
  },

  external : sharedExternal,
  plugins  : [externalize_jssm_subpaths(), ...sharedPlugins],

}, {

  input: 'dist/es6/wc/fsl_editor_wc.define.js',

  output: {
    file   : 'dist/wc/editor.define.js',
    format : 'es',
    name   : 'fsl_editor_wc_define',
  },

  external : sharedExternal,
  plugins  : [externalize_class_build_as_editor_js(), externalize_jssm_subpaths(), ...sharedPlugins],

}];

export default config;
