export interface RasterOptions {
    width?: number;
    height?: number;
    scale?: number;
    quality?: number;
}
type RasterTarget = 'png' | 'jpeg';
/**
 * Rasterize an SVG string to PNG or JPEG bytes.
 *
 * Feature-detects `OffscreenCanvas` at call time: if present, uses the
 * native Canvas path (browsers, Deno, Bun, mobile WebViews, etc.); otherwise
 * loads `@resvg/resvg-wasm` and renders via that.
 * @param svg - SVG source string
 * @param target - 'png' or 'jpeg'
 * @param opts.width - Fit output to this pixel width
 * @param opts.height - Fit output to this pixel height (ignored if `width` set)
 * @param opts.scale - Zoom percentage; 100 renders at 3x the SVG's natural
 *   size (ignored if `width` or `height` is set; default 100)
 * @param opts.quality - JPEG quality 1-100 (default 85; ignored for PNG)
 * @returns Uint8Array of rasterized bytes
 * @throws RasterizationUnsupportedError if neither backend is available
 * @throws RenderError on backend failures
 * @example
 *   const png = await rasterize(svgString, 'png', { scale: 100 });
 *   await writeFile('out.png', png);
 */
export declare function rasterize(svg: string, target: RasterTarget, opts?: RasterOptions): Promise<Uint8Array>;
/** Raw RGBA pixels plus their dimensions, from {@link rasterizeRgba}. */
export interface RgbaRaster {
    rgba: Uint8Array;
    width: number;
    height: number;
}
/**
 * Rasterize an SVG string to raw RGBA8888 pixels, for further encoding (e.g.
 * animated GIF frames) rather than an encoded image container.
 *
 * Same backend selection and sizing semantics as {@link rasterize}:
 * feature-detects `OffscreenCanvas` at call time, falling back to
 * `@resvg/resvg-wasm` when it is absent.
 * @param svg - SVG source string
 * @param opts.width - Fit output to this pixel width
 * @param opts.height - Fit output to this pixel height (ignored if `width` set)
 * @param opts.scale - Zoom percentage; 100 renders at 3x the SVG's natural
 *   size (ignored if `width` or `height` is set; default 100)
 * @returns raw pixels; `rgba.length === 4 * width * height`, row-major,
 *   top-to-bottom, four bytes per pixel in R, G, B, A order
 * @throws RasterizationUnsupportedError if neither backend is available
 * @throws RenderError on backend failures
 * @example
 *   const { rgba, width, height } = await rasterizeRgba(svgString, { scale: 100 });
 */
export declare function rasterizeRgba(svg: string, opts?: RasterOptions): Promise<RgbaRaster>;
export {};
