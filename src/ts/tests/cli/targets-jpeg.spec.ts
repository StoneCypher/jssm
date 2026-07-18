/**
 * @vitest-environment jsdom
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { jpegTarget } from '../../cli/subcommands/render/targets/jpeg';

const trafficLight = readFileSync(
  resolve(__dirname, 'fixtures/machines/traffic-light.fsl'),
  'utf8',
);

describe('jpegTarget', () => {

  const realTextDecoder = TextDecoder;

  beforeAll(() => {
    // Provide TextDecoder for jsdom if not present
    if ((globalThis as any).TextDecoder === undefined) {
      const { TextDecoder: NodeTextDecoder } = require('node:util');
      (globalThis as any).TextDecoder = NodeTextDecoder;
    }

    // Mock OffscreenCanvas to force JPEG path (not WASM path)
    (globalThis as any).OffscreenCanvas = class FakeOffscreen {
      width: number; height: number;
      constructor(w: number, h: number) { this.width = w; this.height = h; }
      getContext() {
        return {
          drawImage: () => {},
          fillRect: () => {},
          clearRect: () => {},
          getImageData: () => ({ data: new Uint8ClampedArray() }),
          putImageData: () => {},
          createImageData: () => ({ data: new Uint8ClampedArray() }),
          setTransform: () => {},
          drawFocusIfNeeded: () => {},
          scrollPathIntoView: () => {},
          resetTransform: () => {},
        };
      }
      async convertToBlob(opts: { type: string }) {
        const bytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0]);
        return { arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
      }
    };

    // Provide Image constructor with decode method
    (globalThis as any).Image = class FakeImage {
      src = '';
      width = 800;
      height = 600;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      decode = async () => {
        // Synchronously resolve (mock only)
        return;
      };
    };
  });

  afterAll(() => {
    delete (globalThis as any).OffscreenCanvas;
    delete (globalThis as any).Image;
    (globalThis as any).TextDecoder = realTextDecoder;
  });

  it('produces JPEG bytes with the SOI marker', async () => {
    const buf = await jpegTarget(trafficLight, { width: 400, quality: 80 });
    expect([...buf.subarray(0, 2)]).toEqual([0xFF, 0xD8]);
  });

  it('throws RenderError for invalid FSL', async () => {
    const { RenderError } = await import('../../cli/types');
    await expect(jpegTarget('not valid', { width: 400 })).rejects.toBeInstanceOf(RenderError);
  });

});
