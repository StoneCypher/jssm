/**
 *  Minimal GIF-variant LZW decoder for round-trip testing.  Written from the
 *  GIF89a specification, intentionally independent of the encoder under test
 *  so encode→decode equality is real verification.
 *
 *  @param data - Raw LZW bytes as produced by the encoder (no GIF sub-blocking).
 *  @param min_code_size - The palette bit width the stream was encoded with (2..8).
 *
 *  @example
 *  lzw_decode(lzw_encode(new Uint8Array([0, 1, 0]), 2), 2);  // Uint8Array [0, 1, 0]
 */
export function lzw_decode(data: Uint8Array, min_code_size: number): Uint8Array {

  const clear = 1 << min_code_size;
  const eoi   = clear + 1;

  let code_size = min_code_size + 1;
  let dict: number[][] = [];
  const reset_dict = (): void => {
    dict = [];
    for (let i = 0; i < clear; ++i) { dict[i] = [i]; }
    dict[clear] = []; dict[eoi] = [];
    code_size = min_code_size + 1;
  };
  reset_dict();

  const out: number[] = [];
  let bit_pos = 0;
  const read_code = (): number => {
    let value = 0;
    for (let b = 0; b < code_size; ++b) {
      const byte = data[bit_pos >> 3]!;
      value |= ((byte >> (bit_pos & 7)) & 1) << b;
      bit_pos += 1;
    }
    return value;
  };

  let prev: number[] | null = null;
  for (;;) {
    const code = read_code();
    if (code === eoi) { break; }
    if (code === clear) { reset_dict(); prev = null; continue; }

    let entry: number[];
    if (code < dict.length && dict[code] !== undefined) {
      entry = dict[code]!;
    } else {
      entry = [...prev!, prev![0]!];       // the KwKwK case
    }
    out.push(...entry);

    if (prev !== null) {
      dict.push([...prev, entry[0]!]);
      if (dict.length === (1 << code_size) && code_size < 12) { code_size += 1; }
    }
    prev = entry;
  }

  return new Uint8Array(out);

}

/** A decoded GIF: dimensions, loop count, and per-frame RGB pixels + delay. */
export interface DecodedGif {
  width  : number;
  height : number;
  loop   : number | null;
  frames : Array<{ delay_cs: number; rgb: Uint8Array }>;
}

/**
 *  Minimal GIF89a reader for round-trip testing: global color table, Netscape
 *  loop extension, GCE delays, one image block per frame.  Written from the
 *  spec, independent of the encoder under test.
 *
 *  @example
 *  const gif = decode_gif(encode_gif([{ rgba: new Uint8Array([255,0,0,255]), width: 1, height: 1 }]));
 *  gif.frames.length;  // 1
 */
export function decode_gif(bytes: Uint8Array): DecodedGif {

  const ascii = (from: number, len: number): string =>
    String.fromCharCode(...bytes.slice(from, from + len));
  if (ascii(0, 6) !== 'GIF89a') { throw new Error(`bad header: ${ascii(0, 6)}`); }

  const u16 = (at: number): number => bytes[at]! | (bytes[at + 1]! << 8);
  const width  = u16(6);
  const height = u16(8);
  const packed = bytes[10]!;
  const gct_size = 2 << (packed & 0x07);
  let pos = 13;
  const gct = bytes.slice(pos, pos + gct_size * 3);
  pos += gct_size * 3;

  let loop: number | null = null;
  let delay_cs = 0;
  const frames: Array<{ delay_cs: number; rgb: Uint8Array }> = [];

  while (pos < bytes.length) {
    const block = bytes[pos]!;

    if (block === 0x3B) { break; }                       // trailer

    if (block === 0x21) {                                // extension
      const label = bytes[pos + 1]!;
      pos += 2;
      if (label === 0xFF && ascii(pos + 1, 11) === 'NETSCAPE2.0') {
        loop = u16(pos + 14);
      }
      if (label === 0xF9) { delay_cs = u16(pos + 2); }   // GCE: skip packed byte
      while (bytes[pos]! !== 0) { pos += bytes[pos]! + 1; }   // skip sub-blocks
      pos += 1;
      continue;
    }

    if (block === 0x2C) {                                // image descriptor
      const fw = u16(pos + 5);                           // frame width
      const fh = u16(pos + 7);                           // frame height
      const local_packed = bytes[pos + 9]!;
      if ((local_packed & 0x80) !== 0) { throw new Error('local color tables unsupported'); }
      pos += 10;
      const min_code_size = bytes[pos]!;
      pos += 1;
      const data: number[] = [];
      while (bytes[pos]! !== 0) {
        const len = bytes[pos]!;
        data.push(...bytes.slice(pos + 1, pos + 1 + len));
        pos += len + 1;
      }
      pos += 1;
      const indices = lzw_decode(new Uint8Array(data), min_code_size);
      if (indices.length !== fw * fh) {
        throw new Error(`frame ${frames.length}: expected ${fw * fh} pixels, got ${indices.length}`);
      }
      const rgb = new Uint8Array(indices.length * 3);
      indices.forEach((idx, i) => {
        rgb[i * 3]     = gct[idx * 3]!;
        rgb[i * 3 + 1] = gct[idx * 3 + 1]!;
        rgb[i * 3 + 2] = gct[idx * 3 + 2]!;
      });
      frames.push({ delay_cs, rgb });
      continue;
    }

    throw new Error(`unknown block 0x${block.toString(16)} at ${pos}`);
  }

  return { width, height, loop, frames };

}
