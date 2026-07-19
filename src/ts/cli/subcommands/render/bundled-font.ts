/**
 * Re-export shim: the bundled render font moved to
 * `src/ts/fsl_rasterize_font.ts` alongside the rasterizer that consumes it,
 * so that jssm-fence does not depend on jssm-cli. This file keeps the CLI's
 * own import path working unchanged.
 * @see fsl_rasterize_font.ts
 */
export * from '../../../fsl_rasterize_font.js';
