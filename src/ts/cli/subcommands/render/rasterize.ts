import { RasterizationUnsupportedError, RenderError } from '../../types.js';
import { bundledFontBytes } from './bundled-font.js';

// `OffscreenCanvas` lives in the DOM lib, which the CLI's tsconfig doesn't
// pull in (CLI tooling targets Node primarily). At runtime we feature-detect
// it; for the TypeScript compile we declare a permissive ambient symbol.
declare const OffscreenCanvas: any;

export interface RasterOptions {
  width?: number;
  height?: number;
  scale?: number;
  quality?: number;
}

type RasterTarget = 'png' | 'jpeg';

const mimeOf = (target: RasterTarget): string =>
  target === 'jpeg' ? 'image/jpeg' : 'image/png';

// A `--scale` of 100 (percent) renders at this multiple of the SVG's natural
// size. jssm's SVGs use ~6px edge labels — unreadably small at 1:1 — so the
// default render is enlarged.
const DEFAULT_SCALE_ZOOM = 3;

/**
 * Resolve `opts.scale` (a percentage, where 100 is the default) to a zoom
 * multiple of the SVG's natural size. Applied when neither `width` nor
 * `height` is given.
 *
 * @param opts - raster options; only `scale` is consulted
 * @returns the zoom multiple (e.g. scale 100 -> 3, scale 200 -> 6)
 *
 * @example
 *   zoomFor({ scale: 200 })  // 6
 *   zoomFor({})              // 3
 */
function zoomFor(opts: RasterOptions): number {
  return ((opts.scale ?? 100) / 100) * DEFAULT_SCALE_ZOOM;
}

/**
 * Build the resvg `fitTo` directive from the sizing options. `width` and
 * `height` fit the render to an exact pixel extent; otherwise `scale`
 * (default 100%) applies a uniform zoom. `width` wins over `height`, which
 * wins over `scale` — the CLI keeps them mutually exclusive regardless.
 *
 * @param opts - raster sizing options
 * @returns a resvg `fitTo` object
 *
 * @example
 *   resvgFitTo({ width: 800 })  // { mode: 'width', value: 800 }
 *   resvgFitTo({})              // { mode: 'zoom', value: 3 }
 */
function resvgFitTo(opts: RasterOptions): { mode: string; value: number } {
  if (opts.width  !== undefined) return { mode: 'width',  value: opts.width  };
  if (opts.height !== undefined) return { mode: 'height', value: opts.height };
  return { mode: 'zoom', value: zoomFor(opts) };
}

/**
 * Rasterize an SVG string to PNG or JPEG bytes.
 *
 * Feature-detects `OffscreenCanvas` at call time: if present, uses the
 * native Canvas path (browsers, Deno, Bun, mobile WebViews, etc.); otherwise
 * loads `@resvg/resvg-wasm` and renders via that.
 *
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
 *
 * @example
 *   const png = await rasterize(svgString, 'png', { scale: 100 });
 *   await writeFile('out.png', png);
 */
export async function rasterize(
  svg: string,
  target: RasterTarget,
  opts: RasterOptions = {},
): Promise<Uint8Array> {
  if (typeof OffscreenCanvas !== 'undefined') {
    return rasterizeViaCanvas(svg, target, opts);
  }
  return rasterizeViaResvgWasm(svg, target, opts);
}

async function rasterizeViaCanvas(
  svg: string,
  target: RasterTarget,
  opts: RasterOptions,
): Promise<Uint8Array> {
  const encoded = (typeof btoa !== 'undefined')
    ? btoa(unescape(encodeURIComponent(svg)))
    : Buffer.from(svg, 'utf8').toString('base64');
  const url = `data:image/svg+xml;base64,${encoded}`;

  const ImageCtor: typeof Image = (globalThis as any).Image;
  if (typeof ImageCtor === 'undefined') {
    throw new RasterizationUnsupportedError('OffscreenCanvas present but Image constructor is not');
  }

  const img = new ImageCtor();
  img.src = url;
  if (typeof (img as any).decode === 'function') {
    await (img as any).decode();
  } else {
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('image load failed')); });
  }

  const natW = (img as any).width  ?? 800;
  const natH = (img as any).height ?? 600;
  let width: number;
  let height: number;
  if (opts.width !== undefined) {
    width  = opts.width;
    height = Math.round(width * natH / natW);
  } else if (opts.height !== undefined) {
    height = opts.height;
    width  = Math.round(height * natW / natH);
  } else {
    const zoom = zoomFor(opts);
    width  = Math.round(natW * zoom);
    height = Math.round(natH * zoom);
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d') as any;
  if (!ctx) throw new RenderError('failed to acquire 2d canvas context');
  ctx.drawImage(img as any, 0, 0, width, height);

  const blob = await canvas.convertToBlob({
    type: mimeOf(target),
    quality: target === 'jpeg' ? ((opts.quality ?? 85) / 100) : undefined,
  } as any);
  const ab = await blob.arrayBuffer();
  return new Uint8Array(ab);
}

// Module-level init-once flag for the resvg-wasm runtime. We can't store
// this on the imported namespace itself: ES module namespace objects are
// sealed by spec and reject property mutation. Jest's CJS-style import
// proxy hid this; vitest's real ESM imports surface it as TypeError.
let wasmInited = false;

async function rasterizeViaResvgWasm(
  svg: string,
  target: RasterTarget,
  opts: RasterOptions,
): Promise<Uint8Array> {
  let mod: any;
  try {
    mod = await import('@resvg/resvg-wasm');
  } catch (e) {
    throw new RasterizationUnsupportedError(
      `PNG/JPEG in this runtime requires @resvg/resvg-wasm; install with: npm install @resvg/resvg-wasm`
    );
  }

  if (typeof mod.initWasm === 'function' && !wasmInited) {
    try {
      const { readFileSync } = await import('fs');
      const { resolve } = await import('path');
      const { createRequire } = await import('module');
      const req = createRequire(import.meta.url);
      const wasmPath = resolve(req.resolve('@resvg/resvg-wasm'), '../index_bg.wasm');
      const wasmBuffer = readFileSync(wasmPath);
      await mod.initWasm(wasmBuffer);
      wasmInited = true;
    } catch (e) {
      wasmInited = true;
    }
  }

  const Resvg = mod.Resvg;
  // resvg-wasm has no fonts of its own — without `font.fontBuffers` every
  // `<text>` rasterizes blank. The bundled Open Sans is supplied as the only
  // font and the default family, so every label renders in it whatever family
  // the SVG requests. `loadSystemFonts` is a no-op in the wasm sandbox.
  const resvg = new Resvg(svg, {
    font: {
      fontBuffers: [bundledFontBytes()],
      defaultFontFamily: 'Open Sans',
      loadSystemFonts: false,
    },
    fitTo: resvgFitTo(opts),
  });
  let rendered: any;
  try {
    rendered = resvg.render();
    const pngData = rendered.asPng();

    if (target === 'png') return new Uint8Array(pngData);

    throw new RasterizationUnsupportedError(
      'JPEG output in a non-Canvas runtime is not supported in v1; use --target=png instead'
    );
  } finally {
    // Free the wasm-backed objects deterministically. Left to the GC
    // finalizer, their cleanup races the shared wasm instance and
    // intermittently throws "recursive use of an object detected" from an
    // unrelated later render.
    rendered?.free();
    resvg.free();
  }
}
