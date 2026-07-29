// Externalized jssm-viz package bundles — same input graph as
// rollup.config.viz.js and the rollup.config.wc.*.js configs, but emitted
// into packages/jssm-viz/dist with jssm CORE left external.  Where the
// embedded bundles inline core (or externalize it to the old `jssm/viz` /
// `jssm` subpaths), these rewrite the cross-package module ids to the
// package names of the v6 workspace split (`jssm`, `jssm-viz`), so the
// emitted files resolve against the consumer's installed copies at runtime.
//
// Purely additive: the legacy embedded bundles keep building unchanged from
// their own configs.

import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';
import path        from 'path';

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

const wcPlugins = [
  nodeResolve({
    mainFields     : ['module', 'main'],
    browser        : true,
    extensions     : ['.js', '.json'],
    preferBuiltins : false,
  }),
  commonjs(),
  replace({
    preventAssignment      : true,
    'process.env.NODE_ENV' : JSON.stringify('production'),
  }),
];

/**
 * Absolute paths of the dist/es6 modules whose needed symbols are re-exported
 * from jssm core's public surface, so their relative imports rewrite to the
 * bare external id `jssm`: the core entry itself, `version.js`
 * (`version`/`build_time`), `jssm_error.js` (`JssmError`), `jssm_compiler.js`
 * (`membership_distance`), `jssm_util.js` (`name_bind_prop_and_state`), and
 * `jssm_arrow.js` (`arrow_left_kind`/`arrow_right_kind`).  Anchored to
 * importer-resolved absolute paths (not basenames) so a future same-named
 * module elsewhere in the graph cannot misfire.
 */
const CORE_SURFACE_MODULES = new Set([
  'jssm.js', 'version.js', 'jssm_error.js', 'jssm_compiler.js', 'jssm_util.js', 'jssm_arrow.js',
].map(m => path.resolve('dist/es6', m)));

/**
 * Rollup plugin that rewrites relative imports of core-surface modules to the
 * external package id `jssm`, mirroring how the wc configs map `'../jssm.js'`
 * to a bare specifier.  Modules NOT in the set (`jssm_viz_colors.js`, which
 * is viz-internal) fall through and bundle.
 *
 * @returns {import('rollup').Plugin}
 */
function externalize_core_as_jssm() {
  return {
    name: 'externalize-core-as-jssm',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) { return null; }
      const resolved = path.resolve(path.dirname(importer), source);
      if (CORE_SURFACE_MODULES.has(resolved)) { return { id: 'jssm', external: true }; }
      return null;
    },
  };
}

/**
 * Rewrites the WC sources' `'../jssm_viz.js'` relative import to the external
 * package id `jssm-viz` (the split package's ROOT export — the embedded
 * equivalent used the `jssm/viz` subpath), so the wc bundles resolve the viz
 * surface from the consumer's installed jssm-viz at load time.
 *
 * @returns {import('rollup').Plugin}
 */
function externalize_jssm_viz_as_package() {
  return {
    name: 'externalize-jssm-viz-as-package',
    resolveId(source) {
      if (source === '../jssm_viz.js' || source.endsWith('/jssm_viz.js')) {
        return { id: 'jssm-viz', external: true };
      }
      return null;
    },
  };
}

/**
 * Rewrites the WC sources' jssm-core relative imports (`'../jssm.js'`, the
 * language service index that core re-exports) to the external package id
 * `jssm`, mirroring the embedded wc configs' subpath externalizers.
 *
 * NOTE deliberately absent: a `cm6/fsl_language.js` rewrite.  jssm-viz has no
 * `cm6` subpath export, so the editor bundle inlines the FSL CodeMirror
 * grammar (the `@codemirror/*` / `@lezer/*` peers stay external either way).
 *
 * @returns {import('rollup').Plugin}
 */
function externalize_core_wc_imports() {
  return {
    name: 'externalize-core-wc-imports',
    resolveId(source) {
      if (source.endsWith('/language_service/index.js'))        { return { id: 'jssm', external: true }; }
      if (source === '../jssm.js' || source.endsWith('/jssm.js')) { return { id: 'jssm', external: true }; }
      return null;
    },
  };
}

/**
 * Rewrites a define build's import of its sibling class build to the emitted
 * dist filename, kept external so registration stays a thin runtime wrapper —
 * same pattern as the embedded wc configs' per-element externalizers.
 *
 * @param {string} source_id - the class-build id as the define source imports it
 * @param {string} dist_id   - the emitted dist-side filename to import instead
 * @returns {import('rollup').Plugin}
 */
function externalize_class_build(source_id, dist_id) {
  return {
    name: 'externalize-class-build',
    resolveId(source) {
      if (source === source_id) { return { id: dist_id, external: true }; }
      return null;
    },
  };
}

const litExternal        = ['lit', 'lit/decorators.js'];
const litExternalWithDir = [...litExternal, 'lit/directives/unsafe-html.js'];
const editorExternal     = [
  ...litExternal,
  '@codemirror/view',
  '@codemirror/state',
  '@codemirror/language',
  '@codemirror/commands',
  '@codemirror/autocomplete',
  '@codemirror/lint',
  '@lezer/highlight',
];

export default [

  // jssm_viz cjs — node-targeted resolution (browser: false), core external
  {
    input: 'dist/es6/jssm_viz.js',
    output: { file: 'packages/jssm-viz/dist/jssm_viz.cjs', format: 'cjs', name: 'jssm_viz' },
    external: ['@viz-js/viz', 'jssm'],
    plugins: [externalize_core_as_jssm(), ...vizPlugins(false)],
  },

  // jssm_viz esm — browser resolution, core external
  {
    input: 'dist/es6/jssm_viz.js',
    output: { file: 'packages/jssm-viz/dist/jssm_viz.mjs', format: 'es', name: 'jssm_viz' },
    external: ['@viz-js/viz', 'jssm'],
    plugins: [externalize_core_as_jssm(), ...vizPlugins(true)],
  },

  // wc: <fsl-viz> class + define
  {
    input: 'dist/es6/wc/fsl_viz_wc.js',
    output: { file: 'packages/jssm-viz/dist/wc/viz.js', format: 'es', name: 'fsl_viz_wc' },
    external: [...litExternalWithDir, '@viz-js/viz'],
    plugins: [externalize_jssm_viz_as_package(), ...wcPlugins],
  },
  {
    input: 'dist/es6/wc/fsl_viz_wc.define.js',
    output: { file: 'packages/jssm-viz/dist/wc/viz.define.js', format: 'es', name: 'fsl_viz_wc_define' },
    external: [...litExternalWithDir, '@viz-js/viz'],
    plugins: [externalize_class_build('./fsl_viz_wc.js', './viz.js'), ...wcPlugins],
  },

  // wc: <fsl-instance> class + define
  {
    input: 'dist/es6/wc/fsl_instance_wc.js',
    output: { file: 'packages/jssm-viz/dist/wc/instance.js', format: 'es', name: 'fsl_instance_wc' },
    external: litExternal,
    plugins: [externalize_core_wc_imports(), ...wcPlugins],
  },
  {
    input: 'dist/es6/wc/fsl_instance_wc.define.js',
    output: { file: 'packages/jssm-viz/dist/wc/instance.define.js', format: 'es', name: 'fsl_instance_wc_define' },
    external: litExternal,
    plugins: [externalize_class_build('./fsl_instance_wc.js', './instance.js'), ...wcPlugins],
  },

  // wc: <fsl-editor> class + define (CodeMirror peers external, grammar inlined)
  {
    input: 'dist/es6/wc/fsl_editor_wc.js',
    output: { file: 'packages/jssm-viz/dist/wc/editor.js', format: 'es', name: 'fsl_editor_wc' },
    external: editorExternal,
    plugins: [externalize_core_wc_imports(), ...wcPlugins],
  },
  {
    input: 'dist/es6/wc/fsl_editor_wc.define.js',
    output: { file: 'packages/jssm-viz/dist/wc/editor.define.js', format: 'es', name: 'fsl_editor_wc_define' },
    external: editorExternal,
    plugins: [externalize_class_build('./fsl_editor_wc.js', './editor.js'), externalize_core_wc_imports(), ...wcPlugins],
  },

  // wc: widgets class + define
  {
    input: 'dist/es6/wc/widgets.js',
    output: { file: 'packages/jssm-viz/dist/wc/widgets.js', format: 'es', name: 'fsl_widgets' },
    external: litExternal,
    plugins: [externalize_core_wc_imports(), externalize_jssm_viz_as_package(), ...wcPlugins],
  },
  {
    input: 'dist/es6/wc/widgets.define.js',
    output: { file: 'packages/jssm-viz/dist/wc/widgets.define.js', format: 'es', name: 'fsl_widgets_define' },
    external: litExternal,
    plugins: [externalize_class_build('./widgets.js', './widgets.js'), externalize_core_wc_imports(), externalize_jssm_viz_as_package(), ...wcPlugins],
  },

  // wc: <fsl-docs> class + define (imports no jssm core — lit only)
  {
    input: 'dist/es6/wc/fsl_docs_wc.js',
    output: { file: 'packages/jssm-viz/dist/wc/docs.js', format: 'es', name: 'fsl_docs_wc' },
    external: litExternalWithDir,
    plugins: wcPlugins,
  },
  {
    input: 'dist/es6/wc/fsl_docs_wc.define.js',
    output: { file: 'packages/jssm-viz/dist/wc/docs.define.js', format: 'es', name: 'fsl_docs_wc_define' },
    external: litExternalWithDir,
    plugins: [externalize_class_build('./fsl_docs_wc.js', './docs.js'), ...wcPlugins],
  },

  // cdn: self-contained single-file builds (jssm core inlined BY DESIGN so a
  // lone <script type="module"> works without import maps — mirrors the
  // embedded cdn configs; only the multi-MB @viz-js/viz WASM stays external
  // on the viz side)
  {
    input: 'dist/es6/wc/fsl_viz_wc.define.js',
    output: { file: 'packages/jssm-viz/dist/cdn/viz.js', format: 'es', name: 'fsl_viz_wc_cdn', inlineDynamicImports: true },
    external: ['@viz-js/viz'],
    plugins: wcPlugins,
  },
  {
    input: 'dist/es6/wc/fsl_instance_wc.define.js',
    output: { file: 'packages/jssm-viz/dist/cdn/instance.js', format: 'es', name: 'fsl_instance_wc_cdn', inlineDynamicImports: true },
    external: [],
    plugins: wcPlugins,
  },

];
