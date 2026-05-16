import { RasterizationUnsupportedError, RenderError } from '../../types';

// `OffscreenCanvas` lives in the DOM lib, which the CLI's tsconfig doesn't
// pull in (CLI tooling targets Node primarily). At runtime we feature-detect
// it; for the TypeScript compile we declare a permissive ambient symbol.
declare const OffscreenCanvas: any;

export interface RasterOptions {
  width?: number;
  quality?: number;
}

type RasterTarget = 'png' | 'jpeg';

const mimeOf = (target: RasterTarget): string =>
  target === 'jpeg' ? 'image/jpeg' : 'image/png';

/**
 * Rasterize an SVG string to PNG or JPEG bytes.
 *
 * Feature-detects `OffscreenCanvas` at call time: if present, uses the
 * native Canvas path (browsers, Deno, Bun, mobile WebViews, etc.); otherwise
 * loads `@resvg/resvg-wasm` and renders via that.
 *
 * @param svg - SVG source string
 * @param target - 'png' or 'jpeg'
 * @param opts.width - Pixel width; height is derived from the SVG's aspect ratio
 * @param opts.quality - JPEG quality 1-100 (default 85; ignored for PNG)
 * @returns Uint8Array of rasterized bytes
 * @throws RasterizationUnsupportedError if neither backend is available
 * @throws RenderError on backend failures
 *
 * @example
 *   const png = await rasterize(svgString, 'png', { width: 800 });
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

  const width  = opts.width ?? (img as any).width  ?? 800;
  const height = Math.round(width * ((img as any).height ?? 600) / ((img as any).width ?? 800));

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
  const resvg = new Resvg(svg, opts.width ? { fitTo: { mode: 'width', value: opts.width } } : {});
  const pngData = resvg.render().asPng();

  if (target === 'png') return new Uint8Array(pngData);

  throw new RasterizationUnsupportedError(
    'JPEG output in a non-Canvas runtime is not supported in v1; use --target=png instead'
  );
}
