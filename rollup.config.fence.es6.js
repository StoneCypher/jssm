import nodeResolve from '@rollup/plugin-node-resolve';

/**
 * ESM build for the `jssm/fence` subpath (static fence rendering + GIF).
 *
 * UNLIKE rollup.config.cm6.es6.js, the `@codemirror/*` and `@lezer/*`
 * packages are BUNDLED here, not externalized: fence consumers are static
 * builds and CLIs with no editor present, so there is no duplicate
 * `@codemirror/state` instanceof hazard — and requiring them to install
 * editor packages for a highlighter would be hostile.  Only the optional
 * raster backend stays external (dynamic import, same posture as the CLI:
 * PNG/JPEG/GIF users `npm install @resvg/resvg-wasm`).
 */
const external = (id) => id === '@resvg/resvg-wasm';

export default [{
  input  : 'dist/es6/fence.js',
  output : {
    file          : 'dist/fence/fence.js',
    format        : 'es',
    name          : 'fsl_fence',
    inlineDynamicImports : true,
  },
  external,
  plugins : [ nodeResolve({ extensions: ['.js', '.json'] }) ],
}];
