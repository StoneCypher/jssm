/**
 * Re-export shim: the SVG rasterizer moved to `src/ts/fsl_rasterize.ts` so
 * that jssm-fence (which needs it) does not depend on jssm-cli. This file
 * keeps the CLI's own import path working unchanged.
 * @see fsl_rasterize.ts
 */
export * from '../../../fsl_rasterize.js';
