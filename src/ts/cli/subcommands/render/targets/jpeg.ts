import { svgTarget } from './svg.js';
import { rasterize } from '../rasterize.js';

/**
 * Render FSL source to JPEG bytes.
 *
 * JPEG output requires an OffscreenCanvas-capable runtime (browser, Deno,
 * Bun, mobile WebViews). The resvg-wasm fallback used in Node does not
 * produce JPEG in v1; use PNG in those environments.
 *
 * @param fsl - FSL source text
 * @param opts.width - Fit to this pixel width
 * @param opts.height - Fit to this pixel height (ignored if `width` set)
 * @param opts.scale - Zoom percentage; 100 = 3x natural size (default 100)
 * @param opts.quality - JPEG quality 1-100 (default 85)
 * @returns Uint8Array of JPEG bytes
 * @throws RenderError if rendering fails at any layer
 * @throws RasterizationUnsupportedError on runtimes without OffscreenCanvas
 *
 * @example
 *   const jpeg = await jpegTarget(fslString, { scale: 200, quality: 90 });
 */
export async function jpegTarget(
  fsl: string,
  opts: { width?: number; height?: number; scale?: number; quality?: number } = {},
): Promise<Uint8Array> {
  const svg = await svgTarget(fsl);
  return rasterize(svg, 'jpeg', { width: opts.width, height: opts.height, scale: opts.scale, quality: opts.quality });
}
