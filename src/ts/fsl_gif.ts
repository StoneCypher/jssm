import { JssmError } from './jssm_error.js';

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
    const a = rgba[i * 4 + 3]! / 255;
    const r = Math.round(rgba[i * 4]!     * a + 255 * (1 - a));
    const g = Math.round(rgba[i * 4 + 1]! * a + 255 * (1 - a));
    const b = Math.round(rgba[i * 4 + 2]! * a + 255 * (1 - a));
    const key = (r << 16) | (g << 8) | b;
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
      if (next_code - 1 === (1 << code_size) && code_size < 12) { code_size += 1; }
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
