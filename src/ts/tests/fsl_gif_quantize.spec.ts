import { describe, it, expect } from 'vitest';
import { quantize } from '../fsl_gif.js';

/** Build an RGBA buffer from [r,g,b,a] pixel tuples. */
const px = (...pixels: Array<[number, number, number, number]>): Uint8Array =>
  new Uint8Array(pixels.flat());

describe('quantize', () => {

  it('maps a small distinct color set directly, preserving exact colors', () => {
    const q = quantize(px([255,0,0,255], [0,255,0,255], [255,0,0,255]));
    expect(q.palette_count).toBe(2);
    const red_idx = q.indices[0]!;
    expect(q.indices[2]).toBe(red_idx);
    expect(q.indices[1]).not.toBe(red_idx);
    expect([...q.palette.slice(red_idx * 3, red_idx * 3 + 3)]).toEqual([255, 0, 0]);
  });

  it('composites alpha over white', () => {
    const q = quantize(px([0, 0, 0, 0]));                 // fully transparent black
    expect([...q.palette.slice(0, 3)]).toEqual([255, 255, 255]);
  });

  it('reduces >max_colors inputs to at most max_colors, mapping to nearby colors', () => {
    // 128 distinct colors (32 r-steps × 4 g-steps, fixed b) — forces median-cut
    const pixels: Array<[number, number, number, number]> = [];
    for (let r = 0; r < 256; r += 8) {
      for (let g = 0; g < 256; g += 64) {
        pixels.push([r, g, 128, 255]);
      }
    }
    const q = quantize(px(...pixels), 8);
    expect(q.palette_count).toBeLessThanOrEqual(8);
    expect(q.indices.length).toBe(pixels.length);
    // every index points inside the palette
    for (const i of q.indices) { expect(i).toBeLessThan(q.palette_count); }
  });

  it('handles lopsided weights that shrink a box to a single color', () => {
    // one massively dominant color plus a scatter of rare distinct colors:
    // count-weighted median splits produce singleton boxes before the
    // box budget is exhausted, exercising the singleton-skip branch.
    const pixels: Array<[number, number, number, number]> = [];
    for (let i = 0; i < 500; ++i) { pixels.push([10, 20, 30, 255]); }   // dominant
    for (let r = 0; r < 8; ++r)   { pixels.push([r * 32, 255 - r * 32, r * 16, 255]); }
    const q = quantize(px(...pixels), 4);
    expect(q.palette_count).toBeLessThanOrEqual(4);
    expect(q.indices.length).toBe(pixels.length);
    for (const i of q.indices) { expect(i).toBeLessThan(q.palette_count); }
  });

  it('throws on a non-multiple-of-4 buffer', () => {
    expect(() => quantize(new Uint8Array(5))).toThrow();
  });

});
