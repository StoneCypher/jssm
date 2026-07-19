import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { rasterize, rasterizeRgba } from '../../cli/subcommands/render/rasterize';
import { svgTarget } from '../../cli/subcommands/render/targets/svg';
import { bundledFontBytes } from '../../cli/subcommands/render/bundled-font';
// The fence-owned source modules the two cli paths above re-export from —
// imported under aliases to pin re-export reference identity below.
import { rasterize as sourceRasterize, rasterizeRgba as sourceRasterizeRgba } from '../../fsl_rasterize';
import { bundledFontBytes as sourceBundledFontBytes } from '../../fsl_rasterize_font';
// Statically imported (rather than dynamic) so module identity matches the
// rasterize module above — vi.resetModules() in the WASM-init describe
// below would otherwise produce a different class instance on dynamic
// re-import, breaking instanceof checks.
import { RasterizationUnsupportedError, RenderError } from '../../cli/types';

const trafficLight = readFileSync(
  resolve(__dirname, 'fixtures/machines/traffic-light.fsl'),
  'utf8',
);

const PNG_MAGIC = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

// Read width/height out of a PNG's IHDR chunk (bytes 16..23).
const pngSize = (buf: Uint8Array): { width: number; height: number } => {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
};

describe('rasterize', () => {

  it('the cli shim paths re-export the SAME functions as their fence-owned sources (reference identity)', () => {
    // rasterize.ts and bundled-font.ts under cli/subcommands/render/ are
    // re-export shims over fsl_rasterize.ts / fsl_rasterize_font.ts. If a
    // shim ever declared its own copy, the two import paths would return
    // different function objects (and bundledFontBytes would grow a second
    // decode cache) — pin reference identity through both paths.
    expect(rasterize).toBe(sourceRasterize);
    expect(rasterizeRgba).toBe(sourceRasterizeRgba);
    expect(bundledFontBytes).toBe(sourceBundledFontBytes);
  });

  describe('Node path (resvg-wasm)', () => {

    it('produces a PNG with the correct magic bytes', async () => {
      const svg = await svgTarget(trafficLight);
      const buf = await rasterize(svg, 'png');
      expect(buf.length).toBeGreaterThan(0);
      expect([...buf.subarray(0, 8)]).toEqual(PNG_MAGIC);
    });

    it('--width fits the PNG to the requested pixel width', async () => {
      const svg = await svgTarget(trafficLight);
      const buf = await rasterize(svg, 'png', { width: 800 });
      expect(pngSize(buf).width).toBe(800);
    });

    it('--height fits the PNG to the requested pixel height', async () => {
      const svg = await svgTarget(trafficLight);
      const buf = await rasterize(svg, 'png', { height: 500 });
      expect(pngSize(buf).height).toBe(500);
    });

    it('defaults to scale 100% and renders larger than a smaller scale', async () => {
      const svg = await svgTarget(trafficLight);
      const deflt = await rasterize(svg, 'png');              // scale undefined -> 100%
      const small = await rasterize(svg, 'png', { scale: 50 }); // half of the default
      const big   = await rasterize(svg, 'png', { scale: 200 }); // double the default
      expect(pngSize(deflt).width).toBeGreaterThan(pngSize(small).width);
      expect(pngSize(big).width).toBeGreaterThan(pngSize(deflt).width);
      // The unspecified default equals an explicit scale of 100.
      expect(pngSize(deflt).width).toBe(pngSize(await rasterize(svg, 'png', { scale: 100 })).width);
    });

    it('JPEG via WASM path throws RasterizationUnsupportedError', async () => {
      const svg = await svgTarget(trafficLight);
      await expect(rasterize(svg, 'jpeg', { width: 800 })).rejects.toBeInstanceOf(RasterizationUnsupportedError);
    });

    it('rasterized text actually renders — output is not a blank image', async () => {
      const textSvg  = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="90">'
                     + '<text x="14" y="58" font-family="Times New Roman" font-size="44">Rendered</text></svg>';
      const emptySvg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="90"></svg>';
      const withText = await rasterize(textSvg, 'png', { width: 320 });
      const blank    = await rasterize(emptySvg, 'png', { width: 320 });
      // The bundled Open Sans renders the <text> even though it requests a
      // family that is not the bundled one; a real glyph run adds image data.
      expect(withText.length).toBeGreaterThan(blank.length + 200);
    });

    it('rasterizeRgba returns RGBA pixels with matching dimensions for a tiny SVG', async () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><rect width="4" height="3" fill="#ff0000"/></svg>';
      const { rgba, width, height } = await rasterizeRgba(svg, { width: 4 });
      expect(width).toBe(4);
      expect(height).toBe(3);
      expect(rgba.length).toBe(4 * width * height);
      expect(rgba[0]).toBeGreaterThan(200);   // red channel
      expect(rgba[1]).toBeLessThan(60);       // green channel
    });

    it('rasterizeRgba returns STRAIGHT (non-premultiplied) alpha for a semi-transparent fill', async () => {
      // A 50%-opacity red rect over nothing (a transparent canvas). Under
      // straight alpha the color channel stores the paint's own color
      // regardless of coverage: red ~= 255, alpha ~= 128. Under premultiplied
      // alpha the color channel would be scaled by coverage: red ~= 128 —
      // resvg's native output, un-premultiplied by rgbaViaResvgWasm to meet
      // the rasterizeRgba contract. This closes the question ledgered from
      // Task 5's review for the gif pipeline's compositing assumptions
      // (encode_gif composites straight RGBA over white).
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2">'
                + '<rect width="2" height="2" fill="#ff0000" fill-opacity="0.5"/></svg>';
      const { rgba } = await rasterizeRgba(svg, { width: 2 });
      const [r, g, b, a] = [rgba[0]!, rgba[1]!, rgba[2]!, rgba[3]!];
      expect(a).toBeGreaterThan(118);
      expect(a).toBeLessThan(138);
      expect(r).toBeGreaterThan(245);
      expect(g).toBeLessThan(10);
      expect(b).toBeLessThan(10);
    });

    it('rasterizeRgba leaves fully-opaque pixels byte-identical (un-premultiply is a no-op at a=255)', async () => {
      // A fully-opaque fill has nothing to un-premultiply — straight and
      // premultiplied alpha coincide at a=255. Pins the `a !== 255` fast
      // path: an opaque red rect must read exactly r=255,a=255, not merely
      // "close to".
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2">'
                + '<rect width="2" height="2" fill="#ff0000"/></svg>';
      const { rgba } = await rasterizeRgba(svg, { width: 2 });
      const [r, g, b, a] = [rgba[0]!, rgba[1]!, rgba[2]!, rgba[3]!];
      expect(r).toBe(255);
      expect(g).toBe(0);
      expect(b).toBe(0);
      expect(a).toBe(255);
    });

    it('rasterizeRgba leaves fully-transparent background pixels at a=0 (un-premultiply is a no-op at a=0)', async () => {
      // A rect that doesn't cover the whole canvas leaves untouched corners
      // fully transparent. Pins the `a !== 0` fast path — dividing by a=0
      // would be undefined, so the loop must skip these pixels outright
      // rather than produce NaN or a divide-by-zero artifact.
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4">'
                + '<rect x="1" y="1" width="1" height="1" fill="#ff0000"/></svg>';
      const { rgba, width } = await rasterizeRgba(svg, { width: 4 });
      const corner = 0; // pixel (0,0), outside the 1x1 rect
      const [r, g, b, a] = [rgba[corner]!, rgba[corner + 1]!, rgba[corner + 2]!, rgba[corner + 3]!];
      expect(a).toBe(0);
      expect(r).toBe(0);
      expect(g).toBe(0);
      expect(b).toBe(0);
      expect(width).toBe(4);
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
              asPng: () => new Uint8Array(PNG_MAGIC),
              free: renderedFree,
            };
          }
        },
      }));
      const { rasterize: mockedRasterize } = await import('../../cli/subcommands/render/rasterize');
      const buf = await mockedRasterize('<svg/>', 'png', { width: 100 });
      expect([...buf.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4E, 0x47]);
      expect(renderedFree).toHaveBeenCalledTimes(1);
      expect(resvgFree).toHaveBeenCalledTimes(1);
    });

    it('renders with the bundled Open Sans and a fitTo directive', async () => {
      // Capture the options handed to the Resvg constructor.
      let received: any;
      vi.doMock('@resvg/resvg-wasm', () => ({
        initWasm: undefined,
        Resvg: class FakeResvg {
          constructor(_svg: string, options: any) { received = options; }
          render() {
            return { asPng: () => new Uint8Array(PNG_MAGIC), free: () => {} };
          }
          free() {}
        },
      }));
      const { rasterize: mockedRasterize } = await import('../../cli/subcommands/render/rasterize');
      const { bundledFontBytes: mockedFont } = await import('../../cli/subcommands/render/bundled-font');
      await mockedRasterize('<svg/>', 'png');
      expect(received.font.defaultFontFamily).toBe('Open Sans');
      expect(received.font.fontBuffers).toEqual([mockedFont()]);
      expect(received.fitTo).toEqual({ mode: 'zoom', value: 3 });
    });

  });

  describe('Browser path (OffscreenCanvas, mocked)', () => {

    // eslint-disable-next-line unicorn/no-unnecessary-global-this -- OffscreenCanvas does not exist in Node; a bare identifier read throws ReferenceError
    const realOffscreen = (globalThis as any).OffscreenCanvas;
    // eslint-disable-next-line unicorn/no-unnecessary-global-this -- Image does not exist in Node; a bare identifier read throws ReferenceError
    const realImage = (globalThis as any).Image;

    // Records the dimensions the most recent OffscreenCanvas was built with.
    let canvasDims: { width: number; height: number } | undefined;

    afterEach(() => {
      (globalThis as any).OffscreenCanvas = realOffscreen;
      (globalThis as any).Image = realImage;
      canvasDims = undefined;
    });

    const installOffscreenCanvas = (): void => {
      (globalThis as any).OffscreenCanvas = class FakeOffscreen {
        width: number;
        height: number;
        constructor(w: number, h: number) {
          this.width = w; this.height = h;
          canvasDims = { width: w, height: h };
        }
        getContext() {
          return {
            drawImage: () => {},
            // Consumed only by rasterizeRgba's Canvas path; harmless for the
            // PNG/JPEG tests above, which never call getImageData.
            getImageData: (_x: number, _y: number, w: number, h: number) => ({
              data: new Uint8ClampedArray(4 * w * h).fill(128),
            }),
          };
        }
        async convertToBlob(opts: { type: string }) {
          const bytes = opts.type === 'image/jpeg'
            ? new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0])
            : new Uint8Array(PNG_MAGIC);
          return { arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
        }
      };
    };

    // A decode()-capable image of fixed intrinsic size.
    const installImage = (width?: number, height?: number): void => {
      (globalThis as any).Image = class FakeImage {
        src = '';
        width = width;
        height = height;
        decode() { return Promise.resolve(); }
      };
    };

    it('uses the OffscreenCanvas path when available', async () => {
      installOffscreenCanvas();
      installImage(100, 60);
      const svg = await svgTarget(trafficLight);
      const buf = await rasterize(svg, 'png', { width: 200 });
      expect(canvasDims).toBeDefined();
      expect([...buf.subarray(0, 8)]).toEqual(PNG_MAGIC);
    });

    it('--width sizes the canvas to the requested width, height by aspect ratio', async () => {
      installOffscreenCanvas();
      installImage(100, 60);
      await rasterize(await svgTarget(trafficLight), 'png', { width: 250 });
      expect(canvasDims).toEqual({ width: 250, height: 150 });
    });

    it('--height sizes the canvas to the requested height, width by aspect ratio', async () => {
      installOffscreenCanvas();
      installImage(100, 60);
      await rasterize(await svgTarget(trafficLight), 'png', { height: 120 });
      expect(canvasDims).toEqual({ width: 200, height: 120 });
    });

    it('default scale renders the canvas at 3x the intrinsic size', async () => {
      installOffscreenCanvas();
      installImage(100, 60);
      await rasterize(await svgTarget(trafficLight), 'png');
      expect(canvasDims).toEqual({ width: 300, height: 180 });
    });

    it('--scale applies a proportional zoom to the canvas', async () => {
      installOffscreenCanvas();
      installImage(100, 60);
      await rasterize(await svgTarget(trafficLight), 'png', { scale: 200 });
      expect(canvasDims).toEqual({ width: 600, height: 360 });
    });

    it('throws RasterizationUnsupportedError when OffscreenCanvas is present but Image is not', async () => {
      installOffscreenCanvas();
      (globalThis as any).Image = undefined;
      const svg = await svgTarget(trafficLight);
      await expect(rasterize(svg, 'png', { width: 100 }))
        .rejects.toBeInstanceOf(RasterizationUnsupportedError);
    });

    it('falls back to the load event when Image lacks decode()', async () => {
      installOffscreenCanvas();
      (globalThis as any).Image = class FakeImage {
        src = '';
        width = 100;
        height = 60;
        // No decode method on purpose
        addEventListener(type: string, fn: () => void) {
          if (type === 'load') { setImmediate(fn); }
        }
      };
      const svg = await svgTarget(trafficLight);
      const buf = await rasterize(svg, 'png', { width: 200 });
      expect([...buf.subarray(0, 8)]).toEqual(PNG_MAGIC);
    });

    it('rejects when Image lacks decode() and fires the error event', async () => {
      installOffscreenCanvas();
      (globalThis as any).Image = class FakeImage {
        src = '';
        width = 100;
        height = 60;
        addEventListener(type: string, fn: () => void) {
          // Fire the error handler once it is wired up by rasterize.
          if (type === 'error') { setImmediate(fn); }
        }
      };
      const svg = await svgTarget(trafficLight);
      await expect(rasterize(svg, 'png', { width: 200 }))
        .rejects.toThrow(/image load failed/);
    });

    it('falls back to 800x600 intrinsic size when the Image lacks dimensions', async () => {
      installOffscreenCanvas();
      installImage(undefined, undefined);
      await rasterize(await svgTarget(trafficLight), 'png');
      // 800x600 defaults, zoomed 3x by the default scale.
      expect(canvasDims).toEqual({ width: 2400, height: 1800 });
    });

    it('throws RenderError when canvas.getContext returns null', async () => {
      // Cover the `if (!ctx) throw new RenderError(...)` defensive line.
      installImage(100, 60);
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
      // Cover the `opts.quality ?? 85` default branch.
      let capturedQuality: number | undefined;
      installImage(100, 60);
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
      expect([...buf.subarray(0, 2)]).toEqual([0xFF, 0xD8]);
      expect(capturedQuality).toBe(0.85); // 85 default / 100
    });

    it('falls back to Buffer-based base64 when btoa is undefined', async () => {
      installOffscreenCanvas();
      installImage(100, 60);
      // vi.stubGlobal does NOT remove an existing global (vitest implementation
      // detail) — directly delete to force the typeof check to take the Buffer
      // fallback path.
      const realBtoa = btoa;
      (globalThis as any).btoa = undefined;
      try {
        const svg = await svgTarget(trafficLight);
        const buf = await rasterize(svg, 'png', { width: 200 });
        expect([...buf.subarray(0, 8)]).toEqual(PNG_MAGIC);
      } finally {
        (globalThis as any).btoa = realBtoa;
      }
    });

    describe('rasterizeRgba', () => {

      it('uses the OffscreenCanvas path, returning getImageData pixels sized to the canvas', async () => {
        installOffscreenCanvas();
        installImage(100, 60);
        const svg = await svgTarget(trafficLight);
        const { rgba, width, height } = await rasterizeRgba(svg, { width: 200 });
        expect(canvasDims).toEqual({ width: 200, height: 120 });
        expect(width).toBe(200);
        expect(height).toBe(120);
        expect(rgba.length).toBe(4 * width * height);
        expect(rgba[0]).toBe(128);
      });

      it('--height sizes the canvas to the requested height, width by aspect ratio', async () => {
        installOffscreenCanvas();
        installImage(100, 60);
        const { width, height } = await rasterizeRgba(await svgTarget(trafficLight), { height: 120 });
        expect(canvasDims).toEqual({ width: 200, height: 120 });
        expect(width).toBe(200);
        expect(height).toBe(120);
      });

      it('default scale renders the canvas at 3x the intrinsic size', async () => {
        installOffscreenCanvas();
        installImage(100, 60);
        const { width, height } = await rasterizeRgba(await svgTarget(trafficLight));
        expect(canvasDims).toEqual({ width: 300, height: 180 });
        expect(width).toBe(300);
        expect(height).toBe(180);
      });

      it('throws RasterizationUnsupportedError when OffscreenCanvas is present but Image is not', async () => {
        installOffscreenCanvas();
        (globalThis as any).Image = undefined;
        const svg = await svgTarget(trafficLight);
        await expect(rasterizeRgba(svg, { width: 100 }))
          .rejects.toBeInstanceOf(RasterizationUnsupportedError);
      });

      it('falls back to the load event when Image lacks decode()', async () => {
        installOffscreenCanvas();
        (globalThis as any).Image = class FakeImage {
          src = '';
          width = 100;
          height = 60;
          // No decode method on purpose
          addEventListener(type: string, fn: () => void) {
            if (type === 'load') { setImmediate(fn); }
          }
        };
        const svg = await svgTarget(trafficLight);
        const { rgba } = await rasterizeRgba(svg, { width: 200 });
        expect(rgba.length).toBeGreaterThan(0);
      });

      it('rejects when Image lacks decode() and fires the error event', async () => {
        installOffscreenCanvas();
        (globalThis as any).Image = class FakeImage {
          src = '';
          width = 100;
          height = 60;
          addEventListener(type: string, fn: () => void) {
            // Fire the error handler once it is wired up by rasterizeRgba.
            if (type === 'error') { setImmediate(fn); }
          }
        };
        const svg = await svgTarget(trafficLight);
        await expect(rasterizeRgba(svg, { width: 200 }))
          .rejects.toThrow(/image load failed/);
      });

      it('falls back to 800x600 intrinsic size when the Image lacks dimensions', async () => {
        installOffscreenCanvas();
        installImage(undefined, undefined);
        const { width, height } = await rasterizeRgba(await svgTarget(trafficLight));
        // 800x600 defaults, zoomed 3x by the default scale.
        expect(canvasDims).toEqual({ width: 2400, height: 1800 });
        expect(width).toBe(2400);
        expect(height).toBe(1800);
      });

      it('throws RenderError when canvas.getContext returns null', async () => {
        installImage(100, 60);
        (globalThis as any).OffscreenCanvas = class FakeOffscreen {
          width: number;
          height: number;
          constructor(w: number, h: number) { this.width = w; this.height = h; }
          getContext() { return null; }
        };
        const svg = await svgTarget(trafficLight);
        await expect(rasterizeRgba(svg, { width: 200 }))
          .rejects.toBeInstanceOf(RenderError);
      });

      it('falls back to Buffer-based base64 when btoa is undefined', async () => {
        installOffscreenCanvas();
        installImage(100, 60);
        const realBtoa = btoa;
        (globalThis as any).btoa = undefined;
        try {
          const svg = await svgTarget(trafficLight);
          const { rgba } = await rasterizeRgba(svg, { width: 200 });
          expect(rgba.length).toBeGreaterThan(0);
        } finally {
          (globalThis as any).btoa = realBtoa;
        }
      });

    });

  });

  describe('bundled render font', () => {

    it('decodes to a valid TrueType font', () => {
      const bytes = bundledFontBytes();
      expect(bytes.length).toBeGreaterThan(1000);
      // sfnt version for a TrueType-outline font is 0x00010000.
      expect([...bytes.subarray(0, 4)]).toEqual([0x00, 0x01, 0x00, 0x00]);
    });

    it('decodes once and returns the same cached buffer', () => {
      expect(bundledFontBytes()).toBe(bundledFontBytes());
    });

  });

});
