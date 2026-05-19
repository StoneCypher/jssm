import type { RenderOptions, RenderResult } from '../../types';
import { RenderError } from '../../types';
import { svgTarget }  from './targets/svg';
import { dotTarget }  from './targets/dot';
import { htmlTarget } from './targets/html';
import { pngTarget }  from './targets/png';
import { jpegTarget } from './targets/jpeg';

/**
 * Render a single FSL source string to the requested output format.
 *
 * Returns a discriminated union: `kind: 'text'` for SVG / DOT / HTML, and
 * `kind: 'raster'` for PNG / JPEG. Use `kind` to narrow before accessing
 * `content` or `buffer`.
 *
 * @param fsl - FSL source text
 * @param opts.target - Output format ('svg' | 'dot' | 'png' | 'jpeg' | 'html')
 * @param opts.width - Fit raster output to this pixel width (raster only)
 * @param opts.height - Fit raster output to this pixel height (raster only)
 * @param opts.scale - Raster zoom percentage; 100 = 3x natural size (raster only)
 * @param opts.quality - JPEG quality 1-100 (silently ignored for non-jpeg)
 * @returns RenderResult, discriminated by `kind`
 * @throws RenderError on parse, render, or target-dispatch failures
 * @throws RasterizationUnsupportedError on raster targets where no backend exists
 *
 * @example
 *   const r = await render(fslText, { target: 'svg' });
 *   if (r.kind === 'text') console.log(r.content);
 */
export async function render(fsl: string, opts: RenderOptions): Promise<RenderResult> {
  switch (opts.target) {
    case 'svg':
      return { target: 'svg', kind: 'text', content: await svgTarget(fsl) };
    case 'dot':
      return { target: 'dot', kind: 'text', content: await dotTarget(fsl) };
    case 'html':
      return { target: 'html', kind: 'text', content: await htmlTarget(fsl) };
    case 'png':
      return { target: 'png', kind: 'raster', buffer: await pngTarget(fsl, { width: opts.width, height: opts.height, scale: opts.scale }) };
    case 'jpeg':
      return { target: 'jpeg', kind: 'raster', buffer: await jpegTarget(fsl, { width: opts.width, height: opts.height, scale: opts.scale, quality: opts.quality }) };
    default:
      throw new RenderError(`unknown target: ${String(opts.target)}`);
  }
}
