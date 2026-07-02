import { JssmError } from './jssm_error.js';

/** Composite one RGBA pixel over white and pack as 0xRRGGBB. @internal */
function packed_over_white(rgba: Uint8Array, pixel: number): number {
  const a = rgba[pixel * 4 + 3]! / 255;
  const r = Math.round(rgba[pixel * 4]!     * a + 255 * (1 - a));
  const g = Math.round(rgba[pixel * 4 + 1]! * a + 255 * (1 - a));
  const b = Math.round(rgba[pixel * 4 + 2]! * a + 255 * (1 - a));
  return (r << 16) | (g << 8) | b;
}

/** Result of {@link quantize}: an RGB palette plus one palette index per input pixel. */
export interface Quantized {
  /** RGB triples, `3 · palette_count` bytes. */
  palette       : Uint8Array;
  /** Number of colors actually used (≤ the requested maximum). */
  palette_count : number;
  /** One palette index per input pixel. */
  indices       : Uint8Array;
}

/**
 *  Reduce an RGBA8888 buffer to an indexed-color image with at most
 *  `max_colors` colors, for GIF encoding.  Alpha is composited over white
 *  (GIF v1 output carries no transparency).  When the input already has
 *  `max_colors` or fewer distinct colors they are preserved exactly;
 *  otherwise a median-cut partition supplies the palette and each pixel maps
 *  to its box's weighted-average color.
 *
 *  @param rgba - Straight RGBA bytes; length must be a multiple of 4.
 *  @param max_colors - Palette ceiling, 2..256.
 *
 *  @throws {JssmError} when `rgba.length` is not a multiple of 4.
 *
 *  @example
 *  const q = quantize(new Uint8Array([255,0,0,255, 0,255,0,255]));
 *  q.palette_count;  // 2
 */
export function quantize(rgba: Uint8Array, max_colors: number = 256): Quantized {

  if (rgba.length % 4 !== 0) {
    throw new JssmError(undefined, 'quantize: rgba length must be a multiple of 4');
  }

  const pixel_count = rgba.length / 4;

  // composite over white, build histogram of packed rgb keys
  const packed = new Uint32Array(pixel_count);
  const histogram = new Map<number, number>();
  for (let i = 0; i < pixel_count; ++i) {
    const key = packed_over_white(rgba, i);
    packed[i] = key;
    histogram.set(key, (histogram.get(key) ?? 0) + 1);
  }

  const distinct = [...histogram.keys()];

  if (distinct.length <= max_colors) {
    const index_of = new Map<number, number>();
    const palette  = new Uint8Array(distinct.length * 3);
    distinct.forEach((key, i) => {
      index_of.set(key, i);
      palette[i * 3]     = (key >> 16) & 0xff;
      palette[i * 3 + 1] = (key >> 8)  & 0xff;
      palette[i * 3 + 2] = key         & 0xff;
    });
    const indices = new Uint8Array(pixel_count);
    for (let i = 0; i < pixel_count; ++i) { indices[i] = index_of.get(packed[i]!)!; }
    return { palette, palette_count: distinct.length, indices };
  }

  return median_cut(packed, histogram, max_colors);

}

/** One median-cut box: the distinct packed colors it holds. @internal */
type CutBox = number[];

/** Channel extractors for packed 0xRRGGBB keys. @internal */
const CHANNELS: ReadonlyArray<(key: number) => number> = [
  key => (key >> 16) & 0xff,
  key => (key >> 8)  & 0xff,
  key =>  key        & 0xff,
];

/**
 *  Median-cut quantization over a pre-built histogram.  Splits the box with
 *  the widest channel range at its count-weighted median until `max_colors`
 *  boxes exist, then averages each box into a palette entry.
 *
 *  @internal
 */
function median_cut(
  packed    : Uint32Array,
  histogram : Map<number, number>,
  max_colors: number,
): Quantized {

  const boxes: CutBox[] = [[...histogram.keys()]];

  while (boxes.length < max_colors) {
    // pick the box with the widest single-channel range
    let best_box = -1, best_range = -1, best_channel = 0;
    boxes.forEach((box, bi) => {
      if (box.length < 2) { return; }
      CHANNELS.forEach((ch, ci) => {
        let lo = 256, hi = -1;
        for (const key of box) { const v = ch(key); if (v < lo) { lo = v; } if (v > hi) { hi = v; } }
        if (hi - lo > best_range) { best_range = hi - lo; best_box = bi; best_channel = ci; }
      });
    });

    const box = boxes[best_box]!;
    const ch  = CHANNELS[best_channel]!;
    box.sort((a, b) => ch(a) - ch(b));

    const total = box.reduce((sum, key) => sum + histogram.get(key)!, 0);
    let acc = 0, split = 1;
    for (let i = 0; i < box.length - 1; ++i) {
      acc += histogram.get(box[i]!)!;
      if (acc * 2 >= total) { split = i + 1; break; }
    }
    boxes.splice(best_box, 1, box.slice(0, split), box.slice(split));
  }

  const palette  = new Uint8Array(boxes.length * 3);
  const index_of = new Map<number, number>();
  boxes.forEach((box, bi) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (const key of box) {
      const count = histogram.get(key)!;
      r += ((key >> 16) & 0xff) * count;
      g += ((key >> 8)  & 0xff) * count;
      b += ( key        & 0xff) * count;
      n += count;
      index_of.set(key, bi);
    }
    palette[bi * 3]     = Math.round(r / n);
    palette[bi * 3 + 1] = Math.round(g / n);
    palette[bi * 3 + 2] = Math.round(b / n);
  });

  const indices = new Uint8Array(packed.length);
  for (let i = 0; i < packed.length; ++i) { indices[i] = index_of.get(packed[i]!)!; }

  return { palette, palette_count: boxes.length, indices };

}

/**
 *  GIF-variant LZW compression: emits a leading clear code, grows code width
 *  from `min_code_size + 1` up to the format's 12-bit ceiling, resets the
 *  dictionary when full, terminates with EOI, and packs codes LSB-first.
 *  Returns raw compressed bytes; the caller wraps them in GIF data sub-blocks.
 *
 *  @param indices - Palette indices, each `< 2^min_code_size`.
 *  @param min_code_size - Bits needed for the palette (2..8 for GIF).
 *
 *  @example
 *  lzw_encode(new Uint8Array([0, 0, 1]), 2);  // Uint8Array of packed codes
 */
export function lzw_encode(indices: Uint8Array, min_code_size: number): Uint8Array {

  const clear = 1 << min_code_size;
  const eoi   = clear + 1;

  let next_code = eoi + 1;
  let code_size = min_code_size + 1;
  // dictionary key: (prefix_code << 8) | next_byte — prefix < 4096, byte < 256
  let dict = new Map<number, number>();

  const bytes: number[] = [];
  let bit_acc = 0, bit_count = 0;
  const emit = (code: number): void => {
    bit_acc |= code << bit_count;
    bit_count += code_size;
    while (bit_count >= 8) {
      bytes.push(bit_acc & 0xff);
      bit_acc >>= 8;
      bit_count -= 8;
    }
  };

  emit(clear);

  let prefix = indices[0]!;
  for (let i = 1; i < indices.length; ++i) {
    const k   = indices[i]!;
    const key = (prefix << 8) | k;
    const hit = dict.get(key);
    if (hit !== undefined) {
      prefix = hit;
      continue;
    }
    emit(prefix);
    if (next_code < 4096) {
      dict.set(key, next_code);
      next_code += 1;
      // the 12-bit ceiling is enforced by the `next_code < 4096` gate above:
      // when the equality holds, 1 << code_size ≤ 4095, so code_size ≤ 11 here
      if (next_code - 1 === (1 << code_size)) { code_size += 1; }
    } else {
      emit(clear);
      dict = new Map<number, number>();
      next_code = eoi + 1;
      code_size = min_code_size + 1;
    }
    prefix = k;
  }

  emit(prefix);
  emit(eoi);
  if (bit_count > 0) { bytes.push(bit_acc & 0xff); }

  return new Uint8Array(bytes);

}

/** One animation frame for {@link encode_gif}: straight RGBA8888 pixels. */
export interface GifFrame { rgba: Uint8Array; width: number; height: number; }

/** Options for {@link encode_gif}. */
export interface GifOptions {
  /** Per-frame delay in centiseconds (GIF's native unit).  Default 70 (~0.7s). */
  delay_cs? : number;
  /** Netscape loop count; 0 = loop forever (the default). */
  loop?     : number;
}

/**
 *  Encode RGBA frames as a looping animated GIF89a.  A single global color
 *  table is quantized over the UNION of all frames' pixels (≤256 colors,
 *  median-cut when over); each frame then maps nearest-neighbor into that
 *  palette, so every frame is pixel-exact while the union stays within 256
 *  distinct colors.  Frames must share dimensions.  No transparency,
 *  full-frame disposal — simple and correct first.
 *
 *  @param frames - At least one frame; all with identical width/height and
 *  `rgba.length === 4 · width · height`.
 *
 *  @throws {JssmError} on zero frames, mismatched dimensions, or an rgba
 *  buffer whose length contradicts its stated dimensions.
 *
 *  @example
 *  const red = { rgba: new Uint8Array([255,0,0,255]), width: 1, height: 1 };
 *  const gif = encode_gif([red], { delay_cs: 50 });
 *  gif.slice(0, 6);  // "GIF89a" bytes
 */
export function encode_gif(frames: GifFrame[], opts: GifOptions = {}): Uint8Array {

  if (frames.length === 0) {
    throw new JssmError(undefined, 'encode_gif: at least one frame is required');
  }
  const { width, height } = frames[0]!;
  for (const f of frames) {
    if (f.width !== width || f.height !== height) {
      throw new JssmError(undefined, `encode_gif: frame dimensions differ (${f.width}x${f.height} vs ${width}x${height})`);
    }
    if (f.rgba.length !== 4 * f.width * f.height) {
      throw new JssmError(undefined, 'encode_gif: rgba length does not match stated dimensions');
    }
  }

  const delay_cs = opts.delay_cs ?? 70;
  const loop     = opts.loop     ?? 0;

  // global palette from all frames combined; when few distinct colors exist, preserve all exactly
  const combined = new Uint8Array(frames.reduce((sum, f) => sum + f.rgba.length, 0));
  let pos = 0;
  for (const f of frames) { combined.set(f.rgba, pos); pos += f.rgba.length; }
  const quantized = quantize(combined, 256);
  const gct_bits = Math.max(1, Math.ceil(Math.log2(Math.max(2, quantized.palette_count))));
  const gct_size = 1 << gct_bits;
  const min_code_size = Math.max(2, gct_bits);

  /** Map a frame's pixels to nearest entries of the union-quantized global palette. @internal */
  const map_to_palette = (rgba: Uint8Array): Uint8Array => {
    const n = rgba.length / 4;
    const out = new Uint8Array(n);
    const cache = new Map<number, number>();
    for (let i = 0; i < n; ++i) {
      const key = packed_over_white(rgba, i);
      const hit = cache.get(key);
      if (hit !== undefined) { out[i] = hit; continue; }
      const r = (key >> 16) & 0xff;
      const g = (key >> 8)  & 0xff;
      const b = key         & 0xff;
      let best = 0, best_d = Infinity;
      for (let p = 0; p < quantized.palette_count; ++p) {
        const dr = r - quantized.palette[p * 3]!;
        const dg = g - quantized.palette[p * 3 + 1]!;
        const db = b - quantized.palette[p * 3 + 2]!;
        const d  = dr * dr + dg * dg + db * db;
        if (d < best_d) { best_d = d; best = p; }
      }
      cache.set(key, best);
      out[i] = best;
    }
    return out;
  };

  const bytes: number[] = [];
  const push_u16 = (v: number): void => { bytes.push(v & 0xff, (v >> 8) & 0xff); };

  // header + logical screen descriptor
  bytes.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);            // "GIF89a"
  push_u16(width); push_u16(height);
  bytes.push(0x80 | 0x70 | (gct_bits - 1));                   // GCT present, color res 8-bit, size
  bytes.push(0, 0);                                           // background index, aspect

  // global color table, padded to 2^gct_bits entries
  for (let p = 0; p < gct_size; ++p) {
    if (p < quantized.palette_count) {
      bytes.push(quantized.palette[p * 3]!, quantized.palette[p * 3 + 1]!, quantized.palette[p * 3 + 2]!);
    } else {
      bytes.push(0, 0, 0);
    }
  }

  // Netscape looping extension
  bytes.push(0x21, 0xFF, 0x0B);
  bytes.push(...'NETSCAPE2.0'.split('').map(c => c.charCodeAt(0)));
  bytes.push(0x03, 0x01); push_u16(loop); bytes.push(0x00);

  for (let fi = 0; fi < frames.length; ++fi) {
    // graphics control extension: disposal 1 (leave in place), no transparency
    bytes.push(0x21, 0xF9, 0x04, 0x04); push_u16(delay_cs); bytes.push(0x00, 0x00);

    // image descriptor: full frame, no local color table
    bytes.push(0x2C); push_u16(0); push_u16(0); push_u16(width); push_u16(height); bytes.push(0x00);

    const indices = map_to_palette(frames[fi]!.rgba);
    const packed  = lzw_encode(indices, min_code_size);

    bytes.push(min_code_size);
    for (let at = 0; at < packed.length; at += 255) {
      const chunk = packed.slice(at, at + 255);
      bytes.push(chunk.length, ...chunk);
    }
    bytes.push(0x00);                                         // block terminator
  }

  bytes.push(0x3B);                                           // trailer
  return new Uint8Array(bytes);

}
