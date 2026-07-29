import nodeResolve from '@rollup/plugin-node-resolve';
import path        from 'path';

/**
 * Externalized jssm-fence package bundle — same input graph as
 * rollup.config.fence.es6.js (static fence rendering + GIF), emitted into
 * packages/jssm-fence/dist with the upstream packages left external and the
 * cross-package relative ids rewritten to their v6 workspace package names:
 * `dist/es6/jssm.js` → `jssm`, `dist/es6/jssm_viz.js` → `jssm-viz`.
 *
 * As in the embedded fence build, the `@codemirror/*` / `@lezer/*` packages
 * (and the inlined FSL CodeMirror grammar) are BUNDLED, not externalized:
 * fence consumers are static builds and CLIs with no editor present, so
 * there is no duplicate `@codemirror/state` instanceof hazard — and
 * requiring them to install editor packages for a highlighter would be
 * hostile.  Only the optional raster backend stays external (dynamic
 * import; PNG/JPEG/GIF users `npm install @resvg/resvg-wasm`).
 */
const external = (id) => id === '@resvg/resvg-wasm';

/**
 * Absolute paths of the dist/es6 modules whose needed symbols are on jssm
 * core's public surface: the core entry (`sm`/`parse_fence_info`/
 * `fsl_fence_lang`), `jssm_error.js` (`JssmError`, needed by the GIF
 * encoder), and the language service's semantic spans (`fslSemanticSpans`).
 * Anchored to importer-resolved absolute paths (not basenames) so a future
 * same-named module elsewhere in the graph cannot misfire.
 */
const CORE_SURFACE_MODULES = new Set([
  'jssm.js', 'jssm_error.js', 'language_service/semantic_spans.js',
].map(m => path.resolve('dist/es6', m)));

/** Absolute path of the viz entry, rewritten to the `jssm-viz` package id. */
const VIZ_ENTRY = path.resolve('dist/es6', 'jssm_viz.js');

/**
 * Rollup plugin that rewrites the fence graph's cross-package relative
 * imports to the external package ids of the v6 workspace split, mirroring
 * how the wc configs map `'../jssm.js'` to a bare specifier.  Everything
 * else — the fence-owned modules and the inlined grammar — falls through
 * and bundles.
 *
 * @returns {import('rollup').Plugin}
 */
function externalize_upstream_packages() {
  return {
    name: 'externalize-upstream-packages',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) { return null; }
      const resolved = path.resolve(path.dirname(importer), source);
      if (resolved === VIZ_ENTRY)              { return { id: 'jssm-viz', external: true }; }
      if (CORE_SURFACE_MODULES.has(resolved))  { return { id: 'jssm',     external: true }; }
      return null;
    },
  };
}

export default [{
  input  : 'dist/es6/fence.js',
  output : {
    file          : 'packages/jssm-fence/dist/fence.js',
    format        : 'es',
    name          : 'fsl_fence',
    inlineDynamicImports : true,
  },
  external,
  plugins : [ externalize_upstream_packages(), nodeResolve({ extensions: ['.js', '.json'] }) ],
}];
