
import * as fc from 'fast-check';

import { promises as fs } from 'fs';
import { join } from 'path';

import { rasterize } from '../cli/subcommands/render/rasterize';
import { invokeBySpawn, dispatch } from '../cli/dispatcher';





// Property-based coverage for the rasterizer's OffscreenCanvas path
// (driven by injected fake Canvas/Image globals — node has neither, so
// the fakes fully own the branch) and the dispatcher's spawn and
// --verbose paths, driven by real spawned node fixtures.



const TINY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>';



type BlobCall = { type?: string, quality?: number, width: number, height: number };



/**
 *  Installs fake `OffscreenCanvas` / `Image` globals that record the
 *  canvas dimensions and convertToBlob options of every render, returning
 *  fixed bytes.  Returns the call log and an uninstaller.
 *
 *  @param nat_w  The fake image's natural width.
 *  @param nat_h  The fake image's natural height.
 *  @returns      The recorded calls and a restore function.
 */
function install_fake_canvas(nat_w: number, nat_h: number) {

  const calls: BlobCall[] = [];

  class FakeImage {
    width  = nat_w;
    height = nat_h;
    src    = '';
    async decode(): Promise<void> { /* image is "ready" instantly */ }
  }

  class FakeOffscreenCanvas {

    constructor(private w: number, private h: number) {}

    getContext(): unknown {
      return { drawImage: () => { /* nothing to draw onto */ } };
    }

    async convertToBlob(opts: { type?: string, quality?: number }): Promise<{ arrayBuffer(): Promise<ArrayBuffer> }> {
      calls.push({ ...opts, width: this.w, height: this.h });
      return { arrayBuffer: async () => new Uint8Array([7, 7, 7]).buffer };
    }

  }

  const g = globalThis as Record<string, unknown>;
  const had_canvas = 'OffscreenCanvas' in g;
  const had_image  = 'Image' in g;
  const old_canvas = g.OffscreenCanvas;
  const old_image  = g.Image;

  g.OffscreenCanvas = FakeOffscreenCanvas;
  g.Image           = FakeImage;

  return {
    calls,
    restore: () => {
      if (had_canvas) { g.OffscreenCanvas = old_canvas; } else { delete g.OffscreenCanvas; }
      if (had_image)  { g.Image           = old_image;  } else { delete g.Image; }
    }
  };

}





describe('rasterize via the OffscreenCanvas path', () => {

  test('width fit pins canvas width and scales height by the natural aspect', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 500 }),   // natural width
        fc.integer({ min: 10, max: 500 }),   // natural height
        fc.integer({ min: 16, max: 2048 }),  // requested width
        async (nat_w, nat_h, width) => {

          const fake = install_fake_canvas(nat_w, nat_h);

          try {

            const bytes = await rasterize(TINY_SVG, 'png', { width });

            expect([...bytes]).toEqual([7, 7, 7]);
            expect(fake.calls.length).toBe(1);
            expect(fake.calls[0].width).toBe(width);
            expect(fake.calls[0].height).toBe(Math.round(width * nat_h / nat_w));
            expect(fake.calls[0].type).toBe('image/png');
            expect(fake.calls[0].quality).toBe(undefined);   // png ignores quality

          } finally {
            fake.restore();
          }

        }
      ),
      { numRuns: 40 }
    );

  });

  test('height fit pins canvas height; scale-only renders at zoom times natural size', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 500 }),
        fc.integer({ min: 10, max: 500 }),
        fc.integer({ min: 16, max: 2048 }),
        fc.integer({ min: 50, max: 400 }),
        async (nat_w, nat_h, height, scale) => {

          const fake = install_fake_canvas(nat_w, nat_h);

          try {

            await rasterize(TINY_SVG, 'png', { height });
            expect(fake.calls[0].height).toBe(height);
            expect(fake.calls[0].width).toBe(Math.round(height * nat_w / nat_h));

            // scale 100 means 3x natural size by design
            await rasterize(TINY_SVG, 'png', { scale });
            const zoom = (scale / 100) * 3;
            expect(fake.calls[1].width).toBe(Math.round(nat_w * zoom));
            expect(fake.calls[1].height).toBe(Math.round(nat_h * zoom));

          } finally {
            fake.restore();
          }

        }
      ),
      { numRuns: 40 }
    );

  });

  test('jpeg encodes through the canvas with its quality mapped onto 0-1', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        async (quality) => {

          const fake = install_fake_canvas(100, 50);

          try {

            const bytes = await rasterize(TINY_SVG, 'jpeg', { quality });

            expect([...bytes]).toEqual([7, 7, 7]);
            expect(fake.calls[0].type).toBe('image/jpeg');
            expect(fake.calls[0].quality).toBeCloseTo(quality / 100, 10);

          } finally {
            fake.restore();
          }

        }
      ),
      { numRuns: 30 }
    );

  });

  test('OffscreenCanvas present without an Image constructor raises the unsupported error', async () => {

    const g = globalThis as Record<string, unknown>;
    g.OffscreenCanvas = class { };

    try {
      await expect(rasterize(TINY_SVG, 'png', {})).rejects.toThrow(/Image constructor/);
    } finally {
      delete g.OffscreenCanvas;
    }

  });

});





describe('dispatcher spawn path', () => {

  let scratch: string;

  beforeAll(async () => {
    await fs.mkdir('build', { recursive: true });
    scratch = await fs.mkdtemp(join('build', 'stoch-spawn-'));
    scratch = join(process.cwd(), scratch);
  });

  afterAll(async () => {
    await fs.rm(scratch, { recursive: true, force: true });
  });

  test('a spawned node script propagates its exit code verbatim', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 200 }),
        async (code) => {

          const file = join(scratch, `exit-${code}.cjs`);
          await fs.writeFile(file, `process.exit(${code});`);

          expect(await invokeBySpawn(file, [])).toBe(code);

        }
      ),
      { numRuns: 8 }
    );

  });

  test('spawned scripts receive their argv', async () => {

    const file = join(scratch, 'argc.cjs');
    await fs.writeFile(file, 'process.exit(process.argv.length - 2);');

    expect(await invokeBySpawn(file, ['one', 'two', 'three'])).toBe(3);
    expect(await invokeBySpawn(file, [])).toBe(0);

  });

  test('--verbose dispatch reports the resolved plugin path on stderr before running it', async () => {

    const dir  = await fs.mkdtemp(join(scratch, 'vpath-'));
    const file = join(dir, 'fsl-stochverbose.cjs');
    await fs.writeFile(file, 'module.exports = async () => 0;');

    const path_before = process.env.PATH;
    process.env.PATH = dir;

    const original = process.stderr.write.bind(process.stderr);
    let   text     = '';
    (process.stderr as { write: unknown }).write = (chunk: unknown): boolean => {
      text += String(chunk);
      return true;
    };

    try {
      expect(await dispatch(['--verbose', 'stochverbose'])).toBe(0);
      expect(text).toContain('resolved');
      expect(text).toContain('fsl-stochverbose.cjs');
    } finally {
      (process.stderr as { write: unknown }).write = original;
      process.env.PATH = path_before;
    }

  });

});
