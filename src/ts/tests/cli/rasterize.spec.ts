import { readFileSync } from 'fs';
import { resolve } from 'path';
import { rasterize } from '../../cli/subcommands/render/rasterize';
import { svgTarget } from '../../cli/subcommands/render/targets/svg';
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

});
