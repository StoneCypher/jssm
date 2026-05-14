import { svgTarget } from './svg';
import { rasterize } from '../rasterize';

/**
 * Render FSL source to PNG bytes.
 *
 * Internally: renders to SVG via `svgTarget`, then rasterizes via the
 * feature-detected `rasterize` function.
 *
 * @param fsl - FSL source text
 * @param opts.width - Pixel width (default: derived from SVG)
 * @returns Uint8Array of PNG bytes
 * @throws RenderError if rendering fails at any layer
 * @throws RasterizationUnsupportedError if no raster backend is available
 *
 * @example
 *   const png = await pngTarget(fslString, { width: 800 });
 *   await writeFile('out.png', png);
 */
export async function pngTarget(
  fsl: string,
  opts: { width?: number } = {},
): Promise<Uint8Array> {
  const svg = await svgTarget(fsl);
  return rasterize(svg, 'png', { width: opts.width });
}
