import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render } from '../../cli/subcommands/render/render';

const trafficLight = readFileSync(
  resolve(__dirname, 'fixtures/machines/traffic-light.fsl'),
  'utf8',
);

describe('render', () => {

  it('dispatches target=svg to text result', async () => {
    const r = await render(trafficLight, { target: 'svg' });
    expect(r.kind).toBe('text');
    expect(r.target).toBe('svg');
    if (r.kind === 'text') {
      expect(r.content).toContain('<svg');
    }
  });

  it('dispatches target=dot to text result', async () => {
    const r = await render(trafficLight, { target: 'dot' });
    expect(r.kind).toBe('text');
    if (r.kind === 'text') {
      expect(r.content).toMatch(/^\s*digraph/);
    }
  });

  it('dispatches target=html to text result', async () => {
    const r = await render(trafficLight, { target: 'html' });
    expect(r.kind).toBe('text');
    if (r.kind === 'text') {
      expect(r.content).toMatch(/^<!DOCTYPE html>/);
    }
  });

  it('dispatches target=png to raster result', async () => {
    const r = await render(trafficLight, { target: 'png', width: 400 });
    expect(r.kind).toBe('raster');
    expect(r.target).toBe('png');
    if (r.kind === 'raster') {
      expect(Array.from(r.buffer.subarray(0, 8))).toEqual([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    }
  });

  it('dispatches target=jpeg to raster result (via OffscreenCanvas mock)', async () => {
    // Stub OffscreenCanvas + Image so jpegTarget's canvas path succeeds.
    // Without this, the WASM fallback runs and rejects with
    // RasterizationUnsupportedError — exercising the throw branch but not
    // the successful `return { ... }` on the line itself.
    const realOffscreen = (globalThis as any).OffscreenCanvas;
    const realImage     = (globalThis as any).Image;
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
      async convertToBlob() {
        const bytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0]);
        return { arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
      }
    };
    try {
      const r = await render(trafficLight, { target: 'jpeg', width: 400, quality: 90 });
      expect(r.kind).toBe('raster');
      expect(r.target).toBe('jpeg');
      if (r.kind === 'raster') {
        expect(Array.from(r.buffer.subarray(0, 2))).toEqual([0xFF, 0xD8]);
      }
    } finally {
      (globalThis as any).OffscreenCanvas = realOffscreen;
      (globalThis as any).Image           = realImage;
    }
  });

  it('dispatches target=gif to raster result (GIF89a magic bytes)', async () => {
    const r = await render('A => B => A;', { target: 'gif', scale: 25 });
    expect(r.kind).toBe('raster');
    expect(r.target).toBe('gif');
    if (r.kind === 'raster') {
      expect(String.fromCharCode(...r.buffer.subarray(0, 6))).toBe('GIF89a');
    }
  }, 60_000);

  it('throws RenderError for invalid FSL', async () => {
    const { RenderError } = await import('../../cli/types');
    await expect(render('not valid fsl !!', { target: 'svg' })).rejects.toBeInstanceOf(RenderError);
  });

  it('throws for unknown target', async () => {
    // @ts-expect-error testing runtime guard
    await expect(render(trafficLight, { target: 'webp' })).rejects.toThrow(/unknown target/i);
  });

});
