import { svgTarget } from './svg.js';
import { rasterize } from '../rasterize.js';

/**
 * Render FSL source to PNG bytes.
 *
 * Internally: renders to SVG via `svgTarget`, then rasterizes via the
 * feature-detected `rasterize` function.
 * @param fsl - FSL source text
 * @param opts.width - Fit to this pixel width
 * @param opts.height - Fit to this pixel height (ignored if `width` set)
 * @param opts.scale - Zoom percentage; 100 = 3x natural size (default 100)
 * @returns Uint8Array of PNG bytes
 * @throws RenderError if rendering fails at any layer
 * @throws RasterizationUnsupportedError if no raster backend is available
 * @example
 *   const png = await pngTarget(fslString, { scale: 100 });
 *   await writeFile('out.png', png);
 */
export async function pngTarget(
  fsl: string,
  opts: { width?: number; height?: number; scale?: number } = {},
): Promise<Uint8Array> {
  const svg = await svgTarget(fsl);
  return rasterize(svg, 'png', { width: opts.width, height: opts.height, scale: opts.scale });
}
