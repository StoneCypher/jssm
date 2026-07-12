/** Result of {@link quantize}: an RGB palette plus one palette index per input pixel. */
export interface Quantized {
    /** RGB triples, `3 · palette_count` bytes. */
    palette: Uint8Array;
    /** Number of colors actually used (≤ the requested maximum). */
    palette_count: number;
    /** One palette index per input pixel. */
    indices: Uint8Array;
}
/**
 *  Reduce an RGBA8888 buffer to an indexed-color image with at most
 *  `max_colors` colors, for GIF encoding.  Alpha is composited over white
 *  (GIF v1 output carries no transparency).  When the input already has
 *  `max_colors` or fewer distinct colors they are preserved exactly;
 *  otherwise a median-cut partition supplies the palette and each pixel maps
 *  to its box's weighted-average color.
 *  @param rgba - Straight RGBA bytes; length must be a multiple of 4.
 *  @param max_colors - Palette ceiling, 2..256.
 *  @throws {JssmError} when `rgba.length` is not a multiple of 4.
 *  @throws {JssmError} when `max_colors` is outside 2..256 — above 256 the
 *  palette index no longer fits the `Uint8Array` indices this module packs
 *  into GIF codes (silent index corruption instead of a clear failure);
 *  below 2 there is no palette to quantize into.
 *  @example
 *  const q = quantize(new Uint8Array([255,0,0,255, 0,255,0,255]));
 *  q.palette_count;  // 2
 */
export declare function quantize(rgba: Uint8Array, max_colors?: number): Quantized;
/**
 *  GIF-variant LZW compression: emits a leading clear code, grows code width
 *  from `min_code_size + 1` up to the format's 12-bit ceiling, resets the
 *  dictionary when full, terminates with EOI, and packs codes LSB-first.
 *  Returns raw compressed bytes; the caller wraps them in GIF data sub-blocks.
 *  @param indices - Palette indices, each `< 2^min_code_size`.
 *  @param min_code_size - Bits needed for the palette (2..8 for GIF).
 *  @example
 *  lzw_encode(new Uint8Array([0, 0, 1]), 2);  // Uint8Array of packed codes
 */
export declare function lzw_encode(indices: Uint8Array, min_code_size: number): Uint8Array;
/** One animation frame for {@link encode_gif}: straight RGBA8888 pixels. */
export interface GifFrame {
    rgba: Uint8Array;
    width: number;
    height: number;
}
/** Options for {@link encode_gif}. */
export interface GifOptions {
    /** Per-frame delay in centiseconds (GIF's native unit).  Default 70 (~0.7s). */
    delay_cs?: number;
    /** Netscape loop count; 0 = loop forever (the default). */
    loop?: number;
}
/**
 *  Encode RGBA frames as a looping animated GIF89a.  A single global color
 *  table is quantized over the UNION of all frames' pixels (≤256 colors,
 *  median-cut when over); each frame then maps nearest-neighbor into that
 *  palette, so every frame is pixel-exact while the union stays within 256
 *  distinct colors.  Frames must share dimensions.  No transparency,
 *  full-frame disposal — simple and correct first.
 *  @param frames - At least one frame; all with identical width/height and
 *  `rgba.length === 4 · width · height`.
 *  @throws {JssmError} on zero frames, a zero-width or zero-height frame,
 *  mismatched dimensions, or an rgba buffer whose length contradicts its
 *  stated dimensions.
 *  @example
 *  const red = { rgba: new Uint8Array([255,0,0,255]), width: 1, height: 1 };
 *  const gif = encode_gif([red], { delay_cs: 50 });
 *  gif.slice(0, 6);  // "GIF89a" bytes
 */
export declare function encode_gif(frames: GifFrame[], opts?: GifOptions): Uint8Array;
