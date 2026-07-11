import { describe, it, expect } from 'vitest';
import { lzw_encode }           from '../fsl_gif.js';
import { lzw_decode }           from './helpers/gif_decode.js';

describe('lzw_encode', () => {

  it('round-trips a simple repeating sequence', () => {
    const indices = new Uint8Array([0, 1, 0, 1, 0, 1, 2, 2, 2, 2]);
    expect([...lzw_decode(lzw_encode(indices, 2), 2)]).toEqual([...indices]);
  });

  it('round-trips a single pixel', () => {
    const indices = new Uint8Array([3]);
    expect([...lzw_decode(lzw_encode(indices, 2), 2)]).toEqual([3]);
  });

  it('round-trips data that forces code-size growth past 9 bits', () => {
    // long non-repeating-ish sequence over a 256-entry alphabet
    const indices = new Uint8Array(20_000);
    for (let i = 0; i < indices.length; ++i) { indices[i] = (i * 7919) % 256; }
    expect([...lzw_decode(lzw_encode(indices, 8), 8)]).toEqual([...indices]);
  });

  it('round-trips data long enough to force a dictionary reset (4096 ceiling)', () => {
    const indices = new Uint8Array(200_000);
    for (let i = 0; i < indices.length; ++i) { indices[i] = (i ^ (i >> 3)) % 256; }
    expect([...lzw_decode(lzw_encode(indices, 8), 8)]).toEqual([...indices]);
  });

  it('round-trips randomly, stochastically (seeded)', () => {
    let seed = 0xC0_FF_EE;
    const rand = (): number => { seed = (seed * 1_103_515_245 + 12_345) & 0x7F_FF_FF_FF; return seed; };
    for (let trial = 0; trial < 20; ++trial) {
      const n = 1 + (rand() % 5000);
      const alphabet_bits = 2 + (rand() % 7);          // 2..8
      const indices = new Uint8Array(n);
      for (let i = 0; i < n; ++i) { indices[i] = rand() % (1 << alphabet_bits); }
      const decoded = lzw_decode(lzw_encode(indices, alphabet_bits), alphabet_bits);
      expect([...decoded], `trial ${trial} bits ${alphabet_bits} n ${n}`).toEqual([...indices]);
    }
  });

});
