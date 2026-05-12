import { readFileSync } from 'fs';
import { resolve } from 'path';
import { rasterize } from '../../cli/subcommands/render/rasterize';
import { svgTarget } from '../../cli/subcommands/render/targets/svg';

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
      const { RasterizationUnsupportedError } = await import('../../cli/types');
      const svg = await svgTarget(trafficLight);
      await expect(rasterize(svg, 'jpeg', { width: 800 })).rejects.toBeInstanceOf(RasterizationUnsupportedError);
    });

  });

  describe('Browser path (OffscreenCanvas, mocked)', () => {

    const realOffscreen = (globalThis as any).OffscreenCanvas;
    const realImage = (globalThis as any).Image;

    afterEach(() => {
      (globalThis as any).OffscreenCanvas = realOffscreen;
      (globalThis as any).Image = realImage;
    });

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

  });

});
