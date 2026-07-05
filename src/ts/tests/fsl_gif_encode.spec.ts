import { describe, it, expect } from 'vitest';
import { encode_gif }           from '../fsl_gif.js';
import { decode_gif }           from './helpers/gif_decode.js';

const solid = (w: number, h: number, r: number, g: number, b: number): Uint8Array => {
  const buf = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; ++i) { buf.set([r, g, b, 255], i * 4); }
  return buf;
};

describe('encode_gif', () => {

  it('emits GIF89a magic and a trailer', () => {
    const gif = encode_gif([{ rgba: solid(2, 2, 255, 0, 0), width: 2, height: 2 }]);
    expect(String.fromCharCode(...gif.slice(0, 6))).toBe('GIF89a');
    expect(gif[gif.length - 1]).toBe(0x3B);
  });

  it('round-trips two frames pixel-exactly for small palettes', () => {
    const gif = decode_gif(encode_gif([
      { rgba: solid(3, 2, 255, 0, 0), width: 3, height: 2 },
      { rgba: solid(3, 2, 0, 0, 255), width: 3, height: 2 },
    ], { delay_cs: 25 }));
    expect(gif.width).toBe(3);
    expect(gif.height).toBe(2);
    expect(gif.frames.length).toBe(2);
    expect(gif.frames[0]!.delay_cs).toBe(25);
    expect([...gif.frames[0]!.rgb.slice(0, 3)]).toEqual([255, 0, 0]);
    expect([...gif.frames[1]!.rgb.slice(0, 3)]).toEqual([0, 0, 255]);
  });

  it('loops forever by default (Netscape loop 0)', () => {
    const gif = decode_gif(encode_gif([{ rgba: solid(1, 1, 0, 0, 0), width: 1, height: 1 }]));
    expect(gif.loop).toBe(0);
  });

  it('round-trips stochastic multi-color frames within palette tolerance', () => {
    let seed = 0xBEEF;
    const rand = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed; };
    for (let trial = 0; trial < 5; ++trial) {
      const w = 2 + (rand() % 12), h = 2 + (rand() % 12);
      const frame_count = 1 + (rand() % 4);
      const frames = Array.from({ length: frame_count }, () => {
        const rgba = new Uint8Array(w * h * 4);
        for (let i = 0; i < w * h; ++i) {
          rgba.set([rand() % 8 * 32, rand() % 8 * 32, rand() % 8 * 32, 255], i * 4);
        }
        return { rgba, width: w, height: h };
      });
      const decoded = decode_gif(encode_gif(frames));
      expect(decoded.frames.length, `trial ${trial}`).toBe(frame_count);
      // seeded colors stay within one ≤256 union palette for this seed, so
      // frame 0 decodes exactly (asserted below)
      const f0 = frames[0]!.rgba;
      decoded.frames[0]!.rgb.forEach((v, i) => {
        const rgba_i = Math.floor(i / 3) * 4 + (i % 3);
        expect(Math.abs(v - f0[rgba_i]!), `trial ${trial} byte ${i}`).toBeLessThanOrEqual(0);
      });
    }
  });

  it('throws on zero frames', () => {
    expect(() => encode_gif([])).toThrow();
  });

  it('throws on mismatched frame dimensions', () => {
    expect(() => encode_gif([
      { rgba: solid(2, 2, 0, 0, 0), width: 2, height: 2 },
      { rgba: solid(3, 2, 0, 0, 0), width: 3, height: 2 },
    ])).toThrow();
  });

  it('throws on an rgba buffer that does not match its stated dimensions', () => {
    expect(() => encode_gif([{ rgba: new Uint8Array(4), width: 2, height: 2 }])).toThrow();
  });

  it('throws on a zero-width frame instead of emitting a bogus code', () => {
    // 4·0·h === 0 slips past the rgba-length check and reaches lzw_encode with
    // empty indices, where `indices[0]!` coerces undefined and silently emits
    // code 0. The boundary guard turns that into a clear JssmError.
    expect(() => encode_gif([{ rgba: new Uint8Array(0), width: 0, height: 2 }])).toThrow(/non-zero/);
  });

  it('throws on a zero-height frame', () => {
    expect(() => encode_gif([{ rgba: new Uint8Array(0), width: 2, height: 0 }])).toThrow(/non-zero/);
  });

  it('still encodes a 1x1 frame', () => {
    const gif = encode_gif([{ rgba: solid(1, 1, 10, 20, 30), width: 1, height: 1 }]);
    expect(String.fromCharCode(...gif.slice(0, 6))).toBe('GIF89a');
    expect(decode_gif(gif).frames.length).toBe(1);
  });

  it('covers palette matching where later entries improve on earlier ones', () => {
    // Build a frame with multiple distinct colors to ensure a multi-entry palette
    const buf = new Uint8Array(12 * 4);
    buf.set([255, 0, 0, 255], 0 * 4);     // red
    buf.set([0, 255, 0, 255], 1 * 4);     // green
    buf.set([0, 0, 255, 255], 2 * 4);     // blue
    buf.set([255, 128, 0, 255], 3 * 4);   // orange
    buf.set([255, 0, 255, 255], 4 * 4);   // magenta
    buf.set([0, 255, 255, 255], 5 * 4);   // cyan
    buf.set([128, 128, 128, 255], 6 * 4); // gray
    buf.set([255, 255, 0, 255], 7 * 4);   // yellow
    buf.set([255, 0, 0, 255], 8 * 4);     // red again
    buf.set([0, 255, 0, 255], 9 * 4);     // green again
    buf.set([0, 0, 255, 255], 10 * 4);    // blue again
    buf.set([64, 64, 64, 255], 11 * 4);   // dark gray
    const frame0 = { rgba: buf, width: 3, height: 4 };

    // Second frame with colors that may not be first in palette order
    const buf2 = new Uint8Array(12 * 4);
    buf2.set([0, 0, 255, 255], 0 * 4);    // blue (not first color)
    buf2.set([0, 255, 0, 255], 1 * 4);    // green
    buf2.set([255, 0, 0, 255], 2 * 4);    // red
    buf2.set([128, 128, 128, 255], 3 * 4);
    buf2.set([255, 255, 0, 255], 4 * 4);
    buf2.set([64, 64, 64, 255], 5 * 4);
    buf2.set([0, 255, 255, 255], 6 * 4);
    buf2.set([255, 0, 255, 255], 7 * 4);
    buf2.set([255, 128, 0, 255], 8 * 4);
    buf2.set([255, 255, 255, 255], 9 * 4); // new color for extra matching
    buf2.set([0, 0, 0, 255], 10 * 4);      // black
    buf2.set([200, 200, 200, 255], 11 * 4); // light gray
    const frame1 = { rgba: buf2, width: 3, height: 4 };

    const gif = encode_gif([frame0, frame1]);
    const decoded = decode_gif(gif);
    expect(decoded.frames.length).toBe(2);
    // all colors fit one ≤256 union palette, so every frame decodes exactly
    decoded.frames[0]!.rgb.forEach((v, i) => {
      const rgba_i = Math.floor(i / 3) * 4 + (i % 3);
      expect(v).toBe(buf[rgba_i]!);
    });
    decoded.frames[1]!.rgb.forEach((v, i) => {
      const rgba_i = Math.floor(i / 3) * 4 + (i % 3);
      expect(v).toBe(buf2[rgba_i]!);
    });
  });

  it('is deterministic and grows its output buffer past the initial 1KB', () => {
    // Index-derived colors (odd multipliers → full low-bit period) give a
    // high-entropy, many-color frame whose encoded size runs well past the 1KB
    // starting buffer, so the growable-output branch runs. Encoding the same
    // frames twice must be byte-identical (the per-encode nearest-color cache
    // and palette carry no cross-call state).
    const spread = (w: number, h: number, phase: number): Uint8Array => {
      const b = new Uint8Array(w * h * 4);
      for (let i = 0; i < w * h; ++i) {
        b.set([(i * 97 + phase) & 0xff, (i * 57 + phase) & 0xff, (i * 29 + phase) & 0xff, 255], i * 4);
      }
      return b;
    };
    const frames = [
      { rgba: spread(48, 48, 0),  width: 48, height: 48 },
      { rgba: spread(48, 48, 11), width: 48, height: 48 },
    ];
    const a = encode_gif(frames, { delay_cs: 10 });
    const b = encode_gif(frames, { delay_cs: 10 });
    expect([...a]).toEqual([...b]);
    expect(a.length).toBeGreaterThan(1024);
    expect(decode_gif(a).frames.length).toBe(2);
  });

  it('encodes exactly width*height pixels in every frame image block', () => {
    const decoded = decode_gif(encode_gif([
      { rgba: solid(3, 2, 255, 0, 0), width: 3, height: 2 },
      { rgba: solid(3, 2, 0, 0, 255), width: 3, height: 2 },
      { rgba: solid(3, 2, 0, 255, 0), width: 3, height: 2 },
    ]));
    expect(decoded.frames.length).toBe(3);
    for (const frame of decoded.frames) {
      expect(frame.rgb.length).toBe(3 * 2 * 3);   // w*h pixels, 3 bytes each
    }
  });

});
