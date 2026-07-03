import type { RenderOptions, RenderResult } from '../../types.js';
import { RenderError, RasterizationUnsupportedError } from '../../types.js';
import { svgTarget }  from './targets/svg.js';
import { dotTarget }  from './targets/dot.js';
import { htmlTarget } from './targets/html.js';
import { pngTarget }  from './targets/png.js';
import { jpegTarget } from './targets/jpeg.js';
import { render_fence_gif } from '../../../fsl_fence_render.js';

/**
 * Classify a failure from the gif render pipeline for the `render()`
 * dispatcher's `gif` case. A {@link RasterizationUnsupportedError}
 * propagates unwrapped — callers need the install-`@resvg/resvg-wasm` hint,
 * matching the `@throws` contract `pngTarget`/`jpegTarget` already honor.
 * Everything else becomes a {@link RenderError} carrying the original
 * message, same as before this helper existed.
 *
 * @param e - The error caught from `render_fence_gif`.
 * @throws {RasterizationUnsupportedError} when `e` already is one.
 * @throws {RenderError} wrapping any other error's message.
 *
 * @example
 * try { throw new RasterizationUnsupportedError('no backend'); }
 * catch (e) { wrap_gif_error(e); }   // rethrows the same RasterizationUnsupportedError
 *
 * @example
 * try { throw new Error('boom'); }
 * catch (e) { wrap_gif_error(e); }   // throws RenderError('GIF render failed: boom')
 */
export function wrap_gif_error(e: unknown): never {
  if (e instanceof RasterizationUnsupportedError) { throw e; }
  throw new RenderError(`GIF render failed: ${(e as Error).message}`);
}

/**
 * Render a single FSL source string to the requested output format.
 *
 * Returns a discriminated union: `kind: 'text'` for SVG / DOT / HTML, and
 * `kind: 'raster'` for PNG / JPEG / GIF. Use `kind` to narrow before
 * accessing `content` or `buffer`.
 *
 * @param fsl - FSL source text
 * @param opts.target - Output format ('svg' | 'dot' | 'png' | 'jpeg' | 'html' | 'gif')
 * @param opts.width - Fit raster output to this pixel width (raster only)
 * @param opts.height - Fit raster output to this pixel height (raster only)
 * @param opts.scale - Raster zoom percentage; 100 = 3x natural size (raster only)
 * @param opts.quality - JPEG quality 1-100 (silently ignored for non-jpeg)
 * @param opts.delay - Per-frame delay in centiseconds (gif only; silently ignored otherwise)
 * @param opts.maxFrames - Walk-length ceiling on the gif's frame count (gif only; silently ignored otherwise)
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
    case 'gif':
      try {
        return {
          target: 'gif',
          kind: 'raster',
          buffer: await render_fence_gif(fsl, {
            scale      : opts.scale,
            delay_cs   : opts.delay,
            max_frames : opts.maxFrames,
          }),
        };
      } catch (e) {
        wrap_gif_error(e);
      }
    default:
      throw new RenderError(`unknown target: ${String(opts.target)}`);
  }
}
