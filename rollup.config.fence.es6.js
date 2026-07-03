import nodeResolve from '@rollup/plugin-node-resolve';
import dts         from 'rollup-plugin-dts';

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
}, {

  // jssm/fence type declarations — flattened to one root file, same pattern
  // as jssm.es6.d.ts/jssm_viz.es6.d.ts/jssm.cli.d.ts: `fence.d.ts` re-exports
  // from sibling `dist/es6/*.d.ts` files that are NOT themselves packed (only
  // `dist/es6/cm6/fsl_language.d.ts` is, and that one is self-contained —
  // it imports only externalized `@codemirror`/`@lezer` peer packages).  The
  // fence closure reaches `fsl_walk.d.ts`, which imports the `Machine` type
  // from `./jssm.js`, so it needs the same whole-program dts bundle the core
  // build already produces; rollup-plugin-dts inlines that closure here too.
  input  : 'dist/es6/fence.d.ts',
  output : { file: 'jssm.fence.d.ts', format: 'es' },
  plugins : [ dts() ],
}];
