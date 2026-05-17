import { svgTarget } from './svg';
import { rasterize } from '../rasterize';

/**
 * Render FSL source to JPEG bytes.
 *
 * JPEG output requires an OffscreenCanvas-capable runtime (browser, Deno,
 * Bun, mobile WebViews). The resvg-wasm fallback used in Node does not
 * produce JPEG in v1; use PNG in those environments.
 *
 * @param fsl - FSL source text
 * @param opts.width - Pixel width (default: derived from SVG)
 * @param opts.quality - JPEG quality 1-100 (default 85)
 * @returns Uint8Array of JPEG bytes
 * @throws RenderError if rendering fails at any layer
 * @throws RasterizationUnsupportedError on runtimes without OffscreenCanvas
 *
 * @example
 *   const jpeg = await jpegTarget(fslString, { width: 800, quality: 90 });
 */
export async function jpegTarget(
  fsl: string,
  opts: { width?: number; quality?: number } = {},
): Promise<Uint8Array> {
  const svg = await svgTarget(fsl);
  return rasterize(svg, 'jpeg', { width: opts.width, quality: opts.quality });
}
