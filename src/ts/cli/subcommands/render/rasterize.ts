import { readdirSync, readFileSync } from 'fs';
import type { Dirent } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { RasterizationUnsupportedError, RenderError } from '../../types';
import { fallbackFontBytes } from './fallback-font';

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

// --- Font supply for the resvg-wasm path -----------------------------------
//
// `@resvg/resvg-wasm` ships no fonts and cannot reach OS-installed fonts from
// inside its wasm sandbox: handed no font, it renders every `<text>` element
// blank. We discover the host OS's fonts and, only when none are found, fall
// back to an embedded font so rasterized text is never silently dropped.

const FONT_FILE = /\.(ttf|ttc|otf)$/i;

// resvg re-parses every supplied font on each render, so discovery is kept
// deliberately small: enough fonts that text resolves (resvg falls back
// across whatever subset is loaded), few enough that the parse stays cheap.
const FONT_DISCOVERY_BUDGET = 1.5 * 1024 * 1024;  // total font bytes to load
const MAX_FONT_FILE_BYTES   = 1.5 * 1024 * 1024;  // skip oversized single fonts

let cachedFontBuffers: Uint8Array[] | null = null;

/** Standard font directories for the current operating system. */
function osFontDirs(): string[] {
  const home = homedir();
  if (process.platform === 'win32') {
    return [
      'C:\\Windows\\Fonts',
      join(home, 'AppData', 'Local', 'Microsoft', 'Windows', 'Fonts'),
    ];
  }
  if (process.platform === 'darwin') {
    return [
      '/System/Library/Fonts',
      '/Library/Fonts',
      join(home, 'Library', 'Fonts'),
    ];
  }
  return [
    '/usr/share/fonts',
    '/usr/local/share/fonts',
    join(home, '.fonts'),
    join(home, '.local', 'share', 'fonts'),
  ];
}

/** Recursively collect font-file paths under `dir`; a missing dir yields none. */
function fontFilesIn(dir: string): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...fontFilesIn(full));
    } else if (FONT_FILE.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

/**
 * Discover fonts installed on the host OS and read their raw bytes.
 *
 * Walks the standard OS font directories, reading font files in discovery
 * order until {@link FONT_DISCOVERY_BUDGET} bytes have been collected.
 * Best-effort: missing directories and unreadable files are skipped silently.
 *
 * @param dirs - directories to search; defaults to the running OS's standard
 *   font locations
 * @returns one buffer per font file read; empty when the host has no
 *   accessible fonts (e.g. a stripped container image)
 *
 * @example
 *   const fonts = discoverOsFontBuffers();
 *   const usable = fonts.length > 0 ? fonts : [fallbackFontBytes()];
 */
export function discoverOsFontBuffers(dirs: string[] = osFontDirs()): Uint8Array[] {
  const buffers: Uint8Array[] = [];
  let remaining = FONT_DISCOVERY_BUDGET;
  for (const dir of dirs) {
    for (const file of fontFilesIn(dir)) {
      if (remaining <= 0) return buffers;
      let bytes: Buffer;
      try {
        bytes = readFileSync(file);
      } catch {
        // Font file vanished or became unreadable between listing and read.
        continue;
      }
      if (bytes.length > MAX_FONT_FILE_BYTES) continue;
      buffers.push(new Uint8Array(bytes));
      remaining -= bytes.length;
    }
  }
  return buffers;
}

/**
 * The font buffers to hand resvg for the wasm rasterization path.
 *
 * Prefers fonts discovered on the host OS; when none are available it returns
 * the embedded fallback font so text never rasterizes blank. Computed once
 * and cached for the lifetime of the process.
 *
 * @returns a non-empty array of font byte buffers
 *
 * @example
 *   new Resvg(svg, { font: { fontBuffers: collectFontBuffers() } });
 */
export function collectFontBuffers(): Uint8Array[] {
  if (cachedFontBuffers !== null) return cachedFontBuffers;
  const discovered = discoverOsFontBuffers();
  cachedFontBuffers = discovered.length > 0 ? discovered : [fallbackFontBytes()];
  return cachedFontBuffers;
}

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
  // `<text>` rasterizes blank. `loadSystemFonts` is left off because it is a
  // no-op inside the wasm sandbox; `collectFontBuffers` supplies them instead.
  const resvgOptions: any = {
    font: { fontBuffers: collectFontBuffers(), loadSystemFonts: false },
  };
  if (opts.width) resvgOptions.fitTo = { mode: 'width', value: opts.width };
  const resvg = new Resvg(svg, resvgOptions);
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
