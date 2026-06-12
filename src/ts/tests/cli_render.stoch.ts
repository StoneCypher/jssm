
import * as fc from 'fast-check';

import { render }     from '../cli/subcommands/render/render';
import { renderSet }  from '../cli/subcommands/render/renderSet';
import { svgTarget }  from '../cli/subcommands/render/targets/svg';
import { dotTarget }  from '../cli/subcommands/render/targets/dot';
import { htmlTarget } from '../cli/subcommands/render/targets/html';
import { pngTarget }  from '../cli/subcommands/render/targets/png';
import { jpegTarget } from '../cli/subcommands/render/targets/jpeg';

import { RenderError, RasterizationUnsupportedError } from '../cli/types';

import { chain_plan_arb } from './stoch_helpers';





// Property-based coverage for the `fsl render` subcommand pipeline:
// text targets (svg / dot / html), the raster path through resvg-wasm,
// the render() dispatcher, and renderSet()'s per-item error isolation.
//
// Raster renders are wasm layout+encode passes, so their run counts stay
// small.  The PNG width property reads the IHDR chunk directly — the
// pixel width lives big-endian at bytes 16-19 of any valid PNG.



const GOOD_FSL = 'ra -> rb;  rb -> rc;';
const BAD_FSL  = 'this is !! not (( fsl';



/** Big-endian u32 read of a PNG's IHDR width field. */
const png_width = (buf: Uint8Array): number =>
  (buf[16] << 24) | (buf[17] << 16) | (buf[18] << 8) | buf[19];





describe('text targets over random machines', () => {

  test('dotTarget emits a digraph naming every constructed state', async () => {

    await fc.assert(
      fc.asyncProperty(
        chain_plan_arb,
        async ({ names, fsl }) => {

          const dot = await dotTarget(fsl);

          expect(dot).toContain('digraph');
          for (const name of names) {
            expect(dot).toContain(`"${name}"`);
          }

        }
      ),
      { numRuns: 20 }
    );

  });

  test('svgTarget emits svg markup naming every constructed state', async () => {

    await fc.assert(
      fc.asyncProperty(
        chain_plan_arb,
        async ({ names, fsl }) => {

          const svg = await svgTarget(fsl);

          expect(svg).toContain('<svg');
          for (const name of names) {
            expect(svg).toContain(name);
          }

        }
      ),
      { numRuns: 10 }
    );

  });

  test('htmlTarget wraps the svg in a document and HTML-escapes the title', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.stringOf(fc.constantFrom(...'abcdefghij'.split('')), { minLength: 1, maxLength: 10 }),
        async (title_word) => {

          const title = `<${title_word} & "co">`;
          const html  = await htmlTarget(GOOD_FSL, { title });

          expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
          expect(html).toContain(`<title>&lt;${title_word} &amp; &quot;co&quot;&gt;</title>`);
          expect(html).toContain('<svg');

          // raw unescaped title must not appear in the head
          expect(html).not.toContain(`<title>${title}</title>`);

        }
      ),
      { numRuns: 15 }
    );

  });

  test('text targets reject malformed FSL with RenderError', async () => {

    await expect(dotTarget(BAD_FSL)).rejects.toThrow(RenderError);
    await expect(svgTarget(BAD_FSL)).rejects.toThrow(RenderError);
    await expect(htmlTarget(BAD_FSL)).rejects.toThrow(RenderError);

  });

});





describe('raster targets through resvg-wasm', () => {

  test('pngTarget produces a real PNG whose IHDR width matches the requested fit width', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 64, max: 1024 }),
        async (width) => {

          const buf = await pngTarget(GOOD_FSL, { width });

          // PNG signature: 89 50 4E 47 0D 0A 1A 0A
          expect([...buf.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
          expect(png_width(buf)).toBe(width);

        }
      ),
      { numRuns: 6 }
    );

  });

  test('scale-only renders still produce a signed PNG with positive dimensions', async () => {

    const buf = await pngTarget(GOOD_FSL, { scale: 100 });

    expect([...buf.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png_width(buf)).toBeGreaterThan(0);

  });

  test('jpegTarget in a canvas-free runtime raises RasterizationUnsupportedError', async () => {

    // node has no OffscreenCanvas, and the resvg path only encodes PNG in v1
    await expect(jpegTarget(GOOD_FSL, {})).rejects.toThrow(RasterizationUnsupportedError);

  });

});





describe('render() dispatch', () => {

  test('every text target routes to kind text; png routes to kind raster', async () => {

    for (const target of ['svg', 'dot', 'html'] as const) {
      const r = await render(GOOD_FSL, { target });
      expect(r.target).toBe(target);
      expect(r.kind).toBe('text');
      expect((r as { content: string }).content.length).toBeGreaterThan(0);
    }

    const raster = await render(GOOD_FSL, { target: 'png' });
    expect(raster.kind).toBe('raster');
    expect((raster as { buffer: Uint8Array }).buffer[0]).toBe(0x89);

  });

  test('unknown targets throw RenderError naming the target', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.stringOf(fc.constantFrom(...'abcdefghij'.split('')), { minLength: 2, maxLength: 8 })
          .filter( t => !['svg', 'dot', 'html', 'png', 'jpeg'].includes(t) ),
        async (target) => {
          await expect(render(GOOD_FSL, { target: target as never }))
            .rejects.toThrow(`unknown target: ${target}`);
        }
      ),
      { numRuns: 20 }
    );

  });

});





describe('renderSet error isolation', () => {

  test('per-item ok flags match the constructed good/bad mix, in input order', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 6 }),
        async (goods) => {

          const inputs  = goods.map( good => (good ? GOOD_FSL : BAD_FSL) );
          const results = await renderSet(inputs, { target: 'dot' });

          expect(results.length).toBe(goods.length);

          results.forEach( (item, i) => {

            expect(item.index).toBe(i);
            expect(item.ok).toBe(goods[i]);

            if (item.ok) {
              expect(item.result.kind).toBe('text');
            } else {
              expect(item.error).toBeInstanceOf(Error);
            }

          });

        }
      ),
      { numRuns: 25 }
    );

  });

});
