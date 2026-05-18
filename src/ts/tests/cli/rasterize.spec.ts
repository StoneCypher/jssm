import { readFileSync } from 'fs';
import { resolve } from 'path';
import { rasterize, collectFontBuffers, discoverOsFontBuffers } from '../../cli/subcommands/render/rasterize';
import { svgTarget } from '../../cli/subcommands/render/targets/svg';
import { fallbackFontBytes } from '../../cli/subcommands/render/fallback-font';
// Statically imported (rather than dynamic) so module identity matches the
// rasterize module above — vi.resetModules() in the WASM-init describe
// below would otherwise produce a different class instance on dynamic
// re-import, breaking instanceof checks.
import { RasterizationUnsupportedError, RenderError } from '../../cli/types';

const trafficLight = readFileSync(
  resolve(__dirname, 'fixtures/machines/traffic-light.fsl'),
  'utf8',
);

describe('rasterize', () => {

  describe('Node path (resvg-wasm)', () => {

    it('produces a PNG with the correct magic bytes', async () => {
      const svg = await svgTarget(trafficLight);
      const buf = await rasterize(svg, 'png', { width: 800 });
      expect(buf.length).toBeGreaterThan(0);
      expect(Array.from(buf.subarray(0, 8))).toEqual([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    });

    it('PNG IHDR reports the requested width', async () => {
      const svg = await svgTarget(trafficLight);
      const buf = await rasterize(svg, 'png', { width: 800 });
      const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
      const width = view.getUint32(16, false);
      expect(width).toBe(800);
    });

    it('JPEG via WASM path throws RasterizationUnsupportedError', async () => {
      const svg = await svgTarget(trafficLight);
      await expect(rasterize(svg, 'jpeg', { width: 800 })).rejects.toBeInstanceOf(RasterizationUnsupportedError);
    });

    it('omits width fitTo when opts.width is not provided', async () => {
      // Exercises the `opts.width ? {...} : {}` branch in rasterizeViaResvgWasm
      // (line 123) — the existing PNG tests all pass a width.
      const svg = await svgTarget(trafficLight);
      const buf = await rasterize(svg, 'png');
      expect(buf.length).toBeGreaterThan(0);
      expect(Array.from(buf.subarray(0, 8))).toEqual([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    });

  });

  describe('WASM init failure paths (mocked)', () => {

    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.doUnmock('@resvg/resvg-wasm');
    });

    it('throws RasterizationUnsupportedError when @resvg/resvg-wasm cannot be loaded', async () => {
      // Simulate the package not being installed by making the dynamic
      // import throw at factory time. The first catch in rasterize.ts
      // converts that to RasterizationUnsupportedError with install advice.
      // We import the error class dynamically too — vi.resetModules() above
      // means the freshly-loaded rasterize throws a freshly-loaded class,
      // which is distinct from the top-level statically-imported one.
      vi.doMock('@resvg/resvg-wasm', () => { throw new Error('synthetic load failure'); });
      const { rasterize: mockedRasterize } = await import('../../cli/subcommands/render/rasterize');
      const { RasterizationUnsupportedError: MockedErrorClass } = await import('../../cli/types');
      await expect(mockedRasterize('<svg/>', 'png', { width: 100 }))
        .rejects.toBeInstanceOf(MockedErrorClass);
    });

    it('swallows initWasm failure so downstream Resvg use proceeds (init-once contract)', async () => {
      // Mock resvg-wasm to have an initWasm that throws but a Resvg
      // constructor that also throws — distinguishing "downstream error
      // surfaced" (= init catch was taken) from "init error propagated"
      // (= init catch missed).
      vi.doMock('@resvg/resvg-wasm', () => ({
        initWasm: async () => { throw new Error('synthetic init failure'); },
        Resvg: class FakeResvg {
          constructor() { throw new Error('downstream-marker'); }
        },
      }));
      const { rasterize: mockedRasterize } = await import('../../cli/subcommands/render/rasterize');
      await expect(mockedRasterize('<svg/>', 'png', { width: 100 }))
        .rejects.toThrow(/downstream-marker/);
    });

    it('frees the Resvg and RenderedImage wasm objects after rendering', async () => {
      // resvg-wasm's Resvg / RenderedImage are wasm-bindgen objects. Left to
      // the GC finalizer, their cleanup races the shared wasm instance and
      // intermittently throws "recursive use of an object detected". rasterize
      // must free them deterministically — this test asserts both .free()s run.
      const renderedFree = vi.fn();
      const resvgFree    = vi.fn();
      vi.doMock('@resvg/resvg-wasm', () => ({
        // rasterize.ts reads `mod.initWasm`; vitest's strict mock throws on
        // access to an undeclared export, so declare it. Left undefined so
        // the init-once block is skipped.
        initWasm: undefined,
        Resvg: class FakeResvg {
          free = resvgFree;
          render() {
            return {
              asPng: () => new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
              free: renderedFree,
            };
          }
        },
      }));
      const { rasterize: mockedRasterize } = await import('../../cli/subcommands/render/rasterize');
      const buf = await mockedRasterize('<svg/>', 'png', { width: 100 });
      expect(Array.from(buf.subarray(0, 4))).toEqual([0x89, 0x50, 0x4E, 0x47]);
      expect(renderedFree).toHaveBeenCalledTimes(1);
      expect(resvgFree).toHaveBeenCalledTimes(1);
    });

  });

  describe('Browser path (OffscreenCanvas, mocked)', () => {

    const realOffscreen = (globalThis as any).OffscreenCanvas;
    const realImage = (globalThis as any).Image;

    afterEach(() => {
      (globalThis as any).OffscreenCanvas = realOffscreen;
      (globalThis as any).Image = realImage;
    });

    const installOffscreenCanvas = (): void => {
      (globalThis as any).OffscreenCanvas = class FakeOffscreen {
        width: number;
        height: number;
        constructor(w: number, h: number) { this.width = w; this.height = h; }
        getContext() { return { drawImage: () => {} }; }
        async convertToBlob(opts: { type: string }) {
          const bytes = opts.type === 'image/jpeg'
            ? new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0])
            : new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
          return { arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
        }
      };
    };

    it('uses the OffscreenCanvas path when available', async () => {
      let canvasConstructed = false;
      let convertCalled = false;

      (globalThis as any).Image = class FakeImage {
        src = '';
        onload: (() => void) | null = null;
        decode() { return Promise.resolve(); }
        get width() { return 100; }
        get height() { return 60; }
      };

      (globalThis as any).OffscreenCanvas = class FakeOffscreen {
        width: number;
        height: number;
        constructor(w: number, h: number) { this.width = w; this.height = h; canvasConstructed = true; }
        getContext() { return { drawImage: () => {} }; }
        async convertToBlob(opts: { type: string }) {
          convertCalled = true;
          const bytes = opts.type === 'image/jpeg'
            ? new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0])
            : new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
          return { arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
        }
      };

      const svg = await svgTarget(trafficLight);
      const buf = await rasterize(svg, 'png', { width: 200 });

      expect(canvasConstructed).toBe(true);
      expect(convertCalled).toBe(true);
      expect(Array.from(buf.subarray(0, 8))).toEqual([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    });

    it('throws RasterizationUnsupportedError when OffscreenCanvas is present but Image is not', async () => {
      installOffscreenCanvas();
      // Image intentionally not provided
      (globalThis as any).Image = undefined;
      const svg = await svgTarget(trafficLight);
      await expect(rasterize(svg, 'png', { width: 100 }))
        .rejects.toBeInstanceOf(RasterizationUnsupportedError);
    });

    it('falls back to onload event when Image lacks decode()', async () => {
      installOffscreenCanvas();
      (globalThis as any).Image = class FakeImage {
        src = '';
        width = 100;
        height = 60;
        // No decode method on purpose
        set onload(fn: () => void) { setImmediate(fn); }
      };
      const svg = await svgTarget(trafficLight);
      const buf = await rasterize(svg, 'png', { width: 200 });
      expect(Array.from(buf.subarray(0, 8))).toEqual([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    });

    it('rejects when Image lacks decode() and fires onerror', async () => {
      installOffscreenCanvas();
      (globalThis as any).Image = class FakeImage {
        src = '';
        width = 100;
        height = 60;
        _onerror: (() => void) | null = null;
        set onerror(fn: () => void) { this._onerror = fn; }
        set onload(_: () => void) {
          // Trigger onerror once both handlers have been wired up by rasterize.
          setImmediate(() => { if (this._onerror) this._onerror(); });
        }
      };
      const svg = await svgTarget(trafficLight);
      await expect(rasterize(svg, 'png', { width: 200 }))
        .rejects.toThrow(/image load failed/);
    });

    it('derives width from intrinsic image width when opts.width is not provided', async () => {
      installOffscreenCanvas();
      (globalThis as any).Image = class FakeImage {
        src = '';
        width = 240;
        height = 160;
        decode() { return Promise.resolve(); }
      };
      const svg = await svgTarget(trafficLight);
      // No opts.width: falls back to intrinsic image width 240.
      const buf = await rasterize(svg, 'png');
      expect(Array.from(buf.subarray(0, 8))).toEqual([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    });

    it('falls back to default 800x600 when Image lacks intrinsic dimensions', async () => {
      installOffscreenCanvas();
      (globalThis as any).Image = class FakeImage {
        src = '';
        // No width/height properties — covers the `?? 800` and `?? 600` fallbacks.
        decode() { return Promise.resolve(); }
      };
      const svg = await svgTarget(trafficLight);
      const buf = await rasterize(svg, 'png');
      expect(Array.from(buf.subarray(0, 8))).toEqual([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    });

    it('throws RenderError when canvas.getContext returns null', async () => {
      // Cover the `if (!ctx) throw new RenderError(...)` defensive line.
      (globalThis as any).Image = class FakeImage {
        src = '';
        width = 100;
        height = 60;
        decode() { return Promise.resolve(); }
      };
      (globalThis as any).OffscreenCanvas = class FakeOffscreen {
        width: number;
        height: number;
        constructor(w: number, h: number) { this.width = w; this.height = h; }
        getContext() { return null; }
        async convertToBlob() {
          throw new Error('should not reach convertToBlob');
        }
      };
      const svg = await svgTarget(trafficLight);
      await expect(rasterize(svg, 'png', { width: 200 }))
        .rejects.toBeInstanceOf(RenderError);
    });

    it('JPEG via canvas uses default quality 85 when opts.quality is omitted', async () => {
      // Cover the `opts.quality ?? 85` default branch. Existing JPEG tests
      // pass an explicit quality.
      let capturedQuality: number | undefined;
      (globalThis as any).Image = class FakeImage {
        src = '';
        width = 100;
        height = 60;
        decode() { return Promise.resolve(); }
      };
      (globalThis as any).OffscreenCanvas = class FakeOffscreen {
        width: number;
        height: number;
        constructor(w: number, h: number) { this.width = w; this.height = h; }
        getContext() { return { drawImage: () => {} }; }
        async convertToBlob(opts: { type: string; quality?: number }) {
          capturedQuality = opts.quality;
          const bytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0]);
          return { arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
        }
      };
      const svg = await svgTarget(trafficLight);
      const buf = await rasterize(svg, 'jpeg', { width: 200 }); // no quality
      expect(Array.from(buf.subarray(0, 2))).toEqual([0xFF, 0xD8]);
      expect(capturedQuality).toBe(0.85); // 85 default / 100
    });

    it('falls back to Buffer-based base64 when btoa is undefined', async () => {
      installOffscreenCanvas();
      (globalThis as any).Image = class FakeImage {
        src = '';
        width = 100;
        height = 60;
        decode() { return Promise.resolve(); }
      };
      // vi.stubGlobal does NOT remove an existing global (vitest implementation
      // detail) — directly delete to force the typeof check to take the Buffer
      // fallback path.
      const realBtoa = (globalThis as any).btoa;
      (globalThis as any).btoa = undefined;
      try {
        const svg = await svgTarget(trafficLight);
        const buf = await rasterize(svg, 'png', { width: 200 });
        expect(Array.from(buf.subarray(0, 8))).toEqual([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      } finally {
        (globalThis as any).btoa = realBtoa;
      }
    });

  });

  describe('font discovery for the resvg-wasm path', () => {

    it('discovers fonts installed on the host OS', () => {
      const fonts = discoverOsFontBuffers();
      expect(fonts.length).toBeGreaterThan(0);
      expect(fonts[0]).toBeInstanceOf(Uint8Array);
    });

    it('returns nothing when the searched directories hold no fonts', () => {
      const missing = resolve(__dirname, 'fixtures/no-such-font-directory');
      expect(discoverOsFontBuffers([missing])).toEqual([]);
    });

    it('finds font files recursively and ignores non-font files', () => {
      // fixtures/fonts holds two .ttf files (one nested in a subdirectory)
      // alongside one .txt file, which discovery must skip.
      const fontsDir = resolve(__dirname, 'fixtures/fonts');
      expect(discoverOsFontBuffers([fontsDir]).length).toBe(2);
    });

    it('collectFontBuffers returns a non-empty, cached set', () => {
      const first = collectFontBuffers();
      expect(first.length).toBeGreaterThan(0);
      expect(collectFontBuffers()).toBe(first);
    });

    it('builds font directories for every supported platform', () => {
      const original = process.platform;
      try {
        for (const platform of ['darwin', 'linux', 'win32']) {
          Object.defineProperty(process, 'platform', { value: platform, configurable: true });
          // The platform-specific directories need not exist on this host;
          // this only exercises every branch of the directory builder.
          expect(Array.isArray(discoverOsFontBuffers())).toBe(true);
        }
      } finally {
        Object.defineProperty(process, 'platform', { value: original, configurable: true });
      }
    });

    it('rasterized text actually renders — output is not a blank image', async () => {
      const textSvg  = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="90">'
                     + '<text x="14" y="58" font-family="Arial" font-size="44">Rendered</text></svg>';
      const emptySvg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="90"></svg>';
      const withText = await rasterize(textSvg, 'png', { width: 320 });
      const blank    = await rasterize(emptySvg, 'png', { width: 320 });
      // With no font supplied the <text> rasterizes to nothing and the two
      // PNGs are near-identical; a real glyph run adds substantial image data.
      expect(withText.length).toBeGreaterThan(blank.length + 200);
    });

  });

  describe('font supply wiring (mocked resvg)', () => {

    beforeEach(() => { vi.resetModules(); });
    afterEach(() => { vi.doUnmock('@resvg/resvg-wasm'); });

    it('hands the discovered font buffers to the Resvg constructor', async () => {
      let received: any;
      vi.doMock('@resvg/resvg-wasm', () => ({
        initWasm: undefined,
        Resvg: class FakeResvg {
          constructor(_svg: string, options: any) { received = options; }
          render() {
            return {
              asPng: () => new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
              free: () => {},
            };
          }
          free() {}
        },
      }));
      const { rasterize: mockedRasterize } = await import('../../cli/subcommands/render/rasterize');
      await mockedRasterize('<svg/>', 'png', { width: 100 });
      expect(Array.isArray(received.font.fontBuffers)).toBe(true);
      expect(received.font.fontBuffers.length).toBeGreaterThan(0);
    });

  });

  describe('font fallback (mocked fs)', () => {

    beforeEach(() => { vi.resetModules(); });
    afterEach(() => { vi.doUnmock('fs'); });

    it('falls back to the embedded font when the host has no readable fonts', async () => {
      // readdir always yields a font name; readFile always fails — so OS
      // discovery collects nothing and the bundled fallback must take over.
      vi.doMock('fs', () => ({
        readdirSync: () => [{ name: 'ghost.ttf', isDirectory: () => false }],
        readFileSync: () => { throw new Error('unreadable'); },
      }));
      const { collectFontBuffers: mockedCollect } = await import('../../cli/subcommands/render/rasterize');
      const buffers = mockedCollect();
      expect(buffers.length).toBe(1);
      expect(buffers[0].length).toBe(fallbackFontBytes().length);
    });

    it('stops reading fonts once the discovery budget is exhausted', async () => {
      const halfMB = new Uint8Array(0.5 * 1024 * 1024);
      vi.doMock('fs', () => ({
        readdirSync: () => [
          { name: 'a.ttf', isDirectory: () => false },
          { name: 'b.ttf', isDirectory: () => false },
          { name: 'c.ttf', isDirectory: () => false },
          { name: 'd.ttf', isDirectory: () => false },
        ],
        readFileSync: () => halfMB,
      }));
      const { discoverOsFontBuffers: mockedDiscover } = await import('../../cli/subcommands/render/rasterize');
      // The 1.5 MB budget is exhausted after the third 0.5 MB font is read.
      expect(mockedDiscover(['/fake-font-dir']).length).toBe(3);
    });

    it('skips font files larger than the per-file size cap', async () => {
      const twoMB = new Uint8Array(2 * 1024 * 1024);
      vi.doMock('fs', () => ({
        readdirSync: () => [{ name: 'huge.ttf', isDirectory: () => false }],
        readFileSync: () => twoMB,
      }));
      const { discoverOsFontBuffers: mockedDiscover } = await import('../../cli/subcommands/render/rasterize');
      // 2 MB exceeds the 1.5 MB per-file cap, so the font is skipped entirely.
      expect(mockedDiscover(['/fake-font-dir'])).toEqual([]);
    });

  });

  describe('embedded fallback font', () => {

    it('decodes to a valid TrueType font', () => {
      const bytes = fallbackFontBytes();
      expect(bytes.length).toBeGreaterThan(1000);
      // sfnt version for a TrueType-outline font is 0x00010000.
      expect(Array.from(bytes.subarray(0, 4))).toEqual([0x00, 0x01, 0x00, 0x00]);
    });

    it('returns an independent copy on each call', () => {
      expect(fallbackFontBytes()).not.toBe(fallbackFontBytes());
    });

  });

});
