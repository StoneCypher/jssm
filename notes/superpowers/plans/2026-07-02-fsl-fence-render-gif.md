# FSL Fence Render Helpers + GIF89a Encoder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Host-agnostic static rendering for FSL markdown fences — HTML parts stacks with editor-parity highlighting, plus a looping animated GIF that walks the machine — shipped as the new `jssm/fence` subpath, wired into the CLI (`--target gif`) and the cookbook build.

**Architecture:** Five small pure-ish modules in `src/ts/`: a hand-rolled GIF89a encoder (`fsl_gif.ts`: quantizer → LZW → assembler), a walk planner (`fsl_walk.ts`), SVG state-patching helpers (`fsl_svg_patch.ts`), a two-layer static highlighter reusing `fslLanguage` + `fslSemanticSpans` (`fsl_fence_highlight.ts`), and the descriptor interpreter (`fsl_fence_render.ts`). A `fence.ts` barrel becomes the `jssm/fence` dist entry via rollup. The GIF pipeline renders Graphviz ONCE and patches node fills per frame — no per-frame layout, no jitter.

**Tech Stack:** TypeScript (existing repo config), vitest spec suite (100% coverage gate over `src/ts/**`), `@lezer/highlight` + `@codemirror/language` (in-tree devDeps, bundled into the fence entry), `@resvg/resvg-wasm` (existing optional dynamic import), rollup for the dist entry.

**Spec of record:** `notes/superpowers/specs/2026-07-02-fsl-fence-render-gif-design.md`. Parent: `notes/superpowers/specs/2026-06-23-fsl-markdown-fence-convention-design.md` (in the jssm repo history; §4.4 stacking, §4.8 conflicts, §4.9 errors).

## Global Constraints

- **Zero new runtime `dependencies`** — everything new is devDependency-bundled or hand-rolled (the `@resvg/resvg-wasm` precedent). Do not add to `package.json` `dependencies`.
- **Highlight parity is a hard requirement:** static `code` output derives from the SAME two sources the editor uses — `fslLanguage` (src/ts/cm6/fsl_language.ts) tokens + `fslSemanticSpans` (src/ts/language_service/semantic_spans.ts) overlay. No third tokenizer may be written.
- **No golden-file/snapshot tests** — substring and structural assertions only.
- **No characterization tests** — if you find a bug in existing code, fix it and assert correct behavior.
- **100% spec-suite coverage** over `src/ts/**` (run `npx vitest run --config vitest.spec.config.ts` for the gated run; use `--coverage.enabled=false` while iterating on a single file — a single-file coverage run ALWAYS fails the global gate, that is expected).
- **Do not write unreachable defensive guards** — they read as uncovered branches and fail the gate. If a condition is impossible through every public path, omit the guard.
- **Every export:** DocBlock with one-line summary + at least one realistic `@example`; parameters/returns described where non-obvious; `@throws` where failure is a real path.
- **Conventional Commits;** commit after every task.
- **GIF defaults (spec §3.1/§3.3):** `delay_cs` 70, `loop` 0 (forever), `max_frames` 64, `scale` 100 (= 3× natural, the CLI raster convention).
- **Never** use compound shell commands (no `&&`, `||`, `;`, pipes); run npm from the Bash tool; the worktree is `C:\Users\john\projects\worktrees\stonecypher_jssm_feat_26-07-02_fsl-fence-render-gif` (branch `feat_26-07-02_fsl-fence-render-gif`); `npm install` has already been run here only if `node_modules` exists — if missing, run it first.
- Machine construction in tests uses the `sm` template tag: `import { sm } from '../jssm.js';`.

---

### Task 1: Color quantizer (`quantize`) — first slice of `fsl_gif.ts`

**Files:**
- Create: `src/ts/fsl_gif.ts`
- Test: `src/ts/tests/fsl_gif_quantize.spec.ts`

**Interfaces:**
- Produces: `quantize(rgba: Uint8Array, max_colors?: number): Quantized` where `Quantized = { palette: Uint8Array; palette_count: number; indices: Uint8Array }`. `palette` is RGB triples (`3 · palette_count` bytes), `indices` one byte per pixel. Alpha is composited over white (GIF v1 has no transparency, spec §9). Task 3 consumes this.

- [ ] **Step 1: Write the failing tests**

`src/ts/tests/fsl_gif_quantize.spec.ts`:

```typescript
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
    // 512 distinct grays via r-channel spread across g variations
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

  it('throws on a non-multiple-of-4 buffer', () => {
    expect(() => quantize(new Uint8Array(5))).toThrow();
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ts/tests/fsl_gif_quantize.spec.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve `../fsl_gif.js`.

- [ ] **Step 3: Implement**

`src/ts/fsl_gif.ts` (new file — Tasks 2 and 3 extend it):

```typescript
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
    if (best_box === -1) { break; }   // every box is a single color

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
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ts/tests/fsl_gif_quantize.spec.ts --coverage.enabled=false`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ts/fsl_gif.ts src/ts/tests/fsl_gif_quantize.spec.ts
git commit -m "feat(gif): median-cut color quantizer"
```

---

### Task 2: GIF-variant LZW encoder — second slice of `fsl_gif.ts`

**Files:**
- Modify: `src/ts/fsl_gif.ts` (append)
- Test: `src/ts/tests/fsl_gif_lzw.spec.ts`

**Interfaces:**
- Produces: `lzw_encode(indices: Uint8Array, min_code_size: number): Uint8Array` — GIF-variant LZW (leading clear code, EOI terminator, 12-bit ceiling with dictionary reset, LSB-first bit packing). Returns RAW compressed bytes (no 255-byte sub-blocking — Task 3 does that). Also produces the test-helper decoder `lzw_decode` (in the TEST helper file, not src) that Tasks 2 and 3 use for round-trips.

- [ ] **Step 1: Write the test-helper decoder and the failing tests**

`src/ts/tests/helpers/gif_decode.ts` (test helper — deliberately NOT under the coverage gate's src paths; written from the GIF89a spec, independent of the encoder, so round-trips are real verification):

```typescript
/**
 *  Minimal GIF-variant LZW decoder for round-trip testing.  Written from the
 *  GIF89a specification, intentionally independent of the encoder under test.
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
```

`src/ts/tests/fsl_gif_lzw.spec.ts`:

```typescript
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
    let seed = 0xC0FFEE;
    const rand = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed; };
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ts/tests/fsl_gif_lzw.spec.ts --coverage.enabled=false`
Expected: FAIL — `lzw_encode` is not exported.

- [ ] **Step 3: Implement (append to `src/ts/fsl_gif.ts`)**

```typescript
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
```

**Correctness note for the implementer:** the width-growth rule (`next_code - 1 === (1 << code_size)` grows AFTER assigning the code that first exceeds the current width) and the decoder's mirror rule (`dict.length === (1 << code_size)`) must round-trip. The stochastic test exists precisely to catch an off-by-one here; if it fails intermittently, the bug is in this pair of comparisons — do not loosen the test.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ts/tests/fsl_gif_lzw.spec.ts --coverage.enabled=false`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ts/fsl_gif.ts src/ts/tests/fsl_gif_lzw.spec.ts src/ts/tests/helpers/gif_decode.ts
git commit -m "feat(gif): GIF-variant LZW encoder + independent test decoder"
```

---

### Task 3: GIF assembly (`encode_gif`) — final slice of `fsl_gif.ts`

**Files:**
- Modify: `src/ts/fsl_gif.ts` (append)
- Modify: `src/ts/tests/helpers/gif_decode.ts` (append a whole-file decoder)
- Test: `src/ts/tests/fsl_gif_encode.spec.ts`

**Interfaces:**
- Consumes: `quantize` (Task 1), `lzw_encode` (Task 2).
- Produces: `encode_gif(frames: GifFrame[], opts?: GifOptions): Uint8Array` with `GifFrame = { rgba: Uint8Array; width: number; height: number }`, `GifOptions = { delay_cs?: number; loop?: number }` (defaults 70 / 0-forever). Global palette from frame 0. Throws `JssmError` on zero frames, dimension mismatch, or rgba-length mismatch. Task 9 consumes this.

- [ ] **Step 1: Append the whole-file decoder to `src/ts/tests/helpers/gif_decode.ts`**

```typescript
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
```

- [ ] **Step 2: Write the failing tests**

`src/ts/tests/fsl_gif_encode.spec.ts`:

```typescript
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
      // frame 0's colors seeded the global palette, so frame 0 is exact
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

});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/ts/tests/fsl_gif_encode.spec.ts --coverage.enabled=false`
Expected: FAIL — `encode_gif` is not exported.

- [ ] **Step 4: Implement (append to `src/ts/fsl_gif.ts`)**

```typescript
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
 *  table is quantized from the FIRST frame (≤256 colors, median-cut when
 *  over); later frames map through the same palette nearest-first-frame.
 *  Frames must share dimensions.  No transparency, full-frame disposal —
 *  simple and correct first.
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

  // global palette from frame 0; every frame maps through it
  const first = quantize(frames[0]!.rgba, 256);
  const gct_bits = Math.max(1, Math.ceil(Math.log2(Math.max(2, first.palette_count))));
  const gct_size = 1 << gct_bits;
  const min_code_size = Math.max(2, gct_bits);

  /** Map any frame's pixels to nearest entries of the frame-0 palette. @internal */
  const map_to_palette = (rgba: Uint8Array): Uint8Array => {
    const n = rgba.length / 4;
    const out = new Uint8Array(n);
    const cache = new Map<number, number>();
    for (let i = 0; i < n; ++i) {
      const a = rgba[i * 4 + 3]! / 255;
      const r = Math.round(rgba[i * 4]!     * a + 255 * (1 - a));
      const g = Math.round(rgba[i * 4 + 1]! * a + 255 * (1 - a));
      const b = Math.round(rgba[i * 4 + 2]! * a + 255 * (1 - a));
      const key = (r << 16) | (g << 8) | b;
      const hit = cache.get(key);
      if (hit !== undefined) { out[i] = hit; continue; }
      let best = 0, best_d = Infinity;
      for (let p = 0; p < first.palette_count; ++p) {
        const dr = r - first.palette[p * 3]!;
        const dg = g - first.palette[p * 3 + 1]!;
        const db = b - first.palette[p * 3 + 2]!;
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
    if (p < first.palette_count) {
      bytes.push(first.palette[p * 3]!, first.palette[p * 3 + 1]!, first.palette[p * 3 + 2]!);
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

    const indices = fi === 0 ? first.indices : map_to_palette(frames[fi]!.rgba);
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
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/ts/tests/fsl_gif_encode.spec.ts --coverage.enabled=false`
Expected: PASS (7 tests). Also re-run Tasks 1–2 specs together:
`npx vitest run src/ts/tests/fsl_gif_quantize.spec.ts src/ts/tests/fsl_gif_lzw.spec.ts src/ts/tests/fsl_gif_encode.spec.ts --coverage.enabled=false`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ts/fsl_gif.ts src/ts/tests/fsl_gif_encode.spec.ts src/ts/tests/helpers/gif_decode.ts
git commit -m "feat(gif): GIF89a assembly — global palette, Netscape loop, sub-block packing"
```

---

### Task 4: Walk planner (`fsl_walk.ts`)

**Files:**
- Create: `src/ts/fsl_walk.ts`
- Test: `src/ts/tests/fsl_walk.spec.ts`

**Interfaces:**
- Consumes: `Machine.list_edges()` (returns `JssmTransition[]` with `.from`, `.to`, `.main_path`), `Machine.state()` (initial state after construction).
- Produces: `plan_walk(machine: Machine<unknown>): string[]` — Task 9 consumes this.

- [ ] **Step 1: Check whether an edgeless machine is constructible**

Run: `node -e "const {sm} = require('./dist/jssm.es5.cjs'); try { const m = sm\`state a;\`; console.log('edgeless OK, states:', m.states()); } catch (e) { console.log('edgeless impossible:', e.message.slice(0, 80)); }"`

If `dist/` is missing in this worktree, run `npm run make` first (from the Bash tool). Record the answer: if edgeless machines are IMPOSSIBLE, the empty-walk guard below is unreachable dead code — OMIT it (the 100% branch gate forbids unreachable guards) and delete its test. If edgeless machines are possible, KEEP guard and test.

- [ ] **Step 2: Write the failing tests**

`src/ts/tests/fsl_walk.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { sm }        from '../jssm.js';
import { plan_walk } from '../fsl_walk.js';

describe('plan_walk', () => {

  it('follows main-path edges from the start state, stopping at the first revisit', () => {
    const machine = sm`Red => Green => Yellow => Red; Red -> FlashingRed;`;
    expect(plan_walk(machine)).toEqual(['Red', 'Green', 'Yellow']);
  });

  it('stops when the main path dead-ends', () => {
    const machine = sm`A => B => C; C -> A;`;
    expect(plan_walk(machine)).toEqual(['A', 'B', 'C']);
  });

  it('tours every edge in declaration order when no main path exists', () => {
    const machine = sm`A -> B; C -> D;`;
    expect(plan_walk(machine)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('collapses consecutive duplicates in a connected tour', () => {
    const machine = sm`A -> B; B -> C;`;
    expect(plan_walk(machine)).toEqual(['A', 'B', 'C']);
  });

  // Keep ONLY if Step 1 showed edgeless machines are constructible:
  it('yields the single start state for an edgeless machine', () => {
    const machine = sm`state a;`;
    expect(plan_walk(machine)).toEqual(['a']);
  });

});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/ts/tests/fsl_walk.spec.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve `../fsl_walk.js`.

- [ ] **Step 4: Implement**

`src/ts/fsl_walk.ts`:

```typescript
import type { Machine } from './jssm.js';

/**
 *  Plan the frame sequence for an animated machine walk, as state names.
 *
 *  With main-path edges (FSL `=>`, `main_path === true`): start at the
 *  machine's start state and follow main-path edges in declaration order,
 *  stopping at the first revisited state (the animation loops, so the cycle
 *  closes visually).  Without any: tour every edge in declaration order,
 *  emitting each edge's endpoints and collapsing consecutive duplicates.
 *
 *  This is presentation, not simulation — a tour's consecutive entries need
 *  not be legal transitions, and no machine state is mutated.
 *
 *  @example
 *  plan_walk(sm`Red => Green => Yellow => Red;`);  // ['Red', 'Green', 'Yellow']
 *
 *  @see encode_gif
 */
export function plan_walk(machine: Machine<unknown>): string[] {

  const edges = machine.list_edges();
  const main  = edges.filter(e => e.main_path);

  if (main.length > 0) {
    const seen = new Set<string>();
    const out: string[] = [];
    let current = machine.state();
    while (!seen.has(current)) {
      seen.add(current);
      out.push(current);
      const next = main.find(e => e.from === current);
      if (next === undefined) { break; }
      current = next.to;
    }
    return out;
  }

  const out: string[] = [];
  for (const e of edges) {
    if (out[out.length - 1] !== e.from) { out.push(e.from); }
    out.push(e.to);
  }

  // Keep ONLY if Step 1 showed edgeless machines are constructible:
  if (out.length === 0) { return [machine.state()]; }

  return out;

}
```

Type note: if `machine.state()` / `e.from` are typed `StateType` rather than `string` and tsc complains, the machine in this repo instantiates `StateType = string` — coerce at the boundary with `String(...)` rather than `as` casts.

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/ts/tests/fsl_walk.spec.ts --coverage.enabled=false`
Expected: PASS (4 or 5 tests per the Step 1 decision).

- [ ] **Step 6: Commit**

```bash
git add src/ts/fsl_walk.ts src/ts/tests/fsl_walk.spec.ts
git commit -m "feat(fence): walk planner — main-path follow or declaration-order edge tour"
```

---

### Task 5: RGBA rasterization (`rasterizeRgba` in the CLI's rasterize module)

**Files:**
- Modify: `src/ts/cli/subcommands/render/rasterize.ts`
- Test: extend the EXISTING rasterize spec (find it: `Grep pattern:"rasterize" path:src/ts glob:*.spec.ts` — extend that file following its established mocking patterns for the Canvas path; the resvg path tests run for real)

**Interfaces:**
- Consumes: the module's existing `resvgFitTo`, wasm-init plumbing, and `bundledFontBytes`.
- Produces: `rasterizeRgba(svg: string, opts?: RasterOptions): Promise<{ rgba: Uint8Array; width: number; height: number }>` — raw RGBA pixels instead of encoded PNG/JPEG. Task 9 consumes this.

- [ ] **Step 1: Write the failing test (append to the existing rasterize spec, matching its style)**

```typescript
import { rasterizeRgba } from '../cli/subcommands/render/rasterize.js';   // adjust relative path to the spec's location

describe('rasterizeRgba', () => {

  it('returns RGBA pixels with matching dimensions for a tiny SVG (resvg path)', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><rect width="4" height="3" fill="#ff0000"/></svg>';
    const { rgba, width, height } = await rasterizeRgba(svg, { width: 4 });
    expect(width).toBe(4);
    expect(height).toBe(3);
    expect(rgba.length).toBe(4 * width * height);
    expect(rgba[0]).toBeGreaterThan(200);   // red channel
    expect(rgba[1]).toBeLessThan(60);       // green channel
  });

});
```

Also mirror the existing spec's OffscreenCanvas-mocked test for the Canvas branch (copy the mock arrangement the file already uses for `rasterize`, asserting `getImageData` results flow through) — the coverage gate requires the Canvas branch exercised; the existing tests show exactly how this file mocks it.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run <that spec file> --coverage.enabled=false`
Expected: FAIL — `rasterizeRgba` is not exported.

- [ ] **Step 3: Implement (append to `rasterize.ts`)**

```typescript
/** Raw RGBA pixels plus their dimensions, from {@link rasterizeRgba}. */
export interface RgbaRaster { rgba: Uint8Array; width: number; height: number; }

/**
 *  Rasterize an SVG string to raw RGBA8888 pixels (for further encoding, e.g.
 *  animated GIF frames).  Same backend selection and sizing semantics as
 *  {@link rasterize}: OffscreenCanvas when present, else @resvg/resvg-wasm.
 *
 *  @param svg - SVG source string
 *  @param opts - same sizing options as {@link rasterize}
 *  @returns raw pixels; `rgba.length === 4 · width · height`
 *  @throws RasterizationUnsupportedError if neither backend is available
 *
 *  @example
 *  const { rgba, width, height } = await rasterizeRgba(svgString, { scale: 100 });
 */
export async function rasterizeRgba(svg: string, opts: RasterOptions = {}): Promise<RgbaRaster> {
  if (typeof OffscreenCanvas !== 'undefined') {
    return rgbaViaCanvas(svg, opts);
  }
  return rgbaViaResvgWasm(svg, opts);
}

async function rgbaViaCanvas(svg: string, opts: RasterOptions): Promise<RgbaRaster> {
  // identical image-load and sizing steps as rasterizeViaCanvas
  const encoded = (typeof btoa !== 'undefined')
    ? btoa(unescape(encodeURIComponent(svg)))
    : Buffer.from(svg, 'utf8').toString('base64');
  const url = `data:image/svg+xml;base64,${encoded}`;

  const ImageCtor: typeof Image = (globalThis as any).Image;
  if (typeof ImageCtor === 'undefined') {
    throw new RasterizationUnsupportedError('OffscreenCanvas present but Image constructor is not');
  }
  const img = new ImageCtor();
  img.src = url;
  if (typeof (img as any).decode === 'function') {
    await (img as any).decode();
  } else {
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('image load failed')); });
  }

  const natW = (img as any).width  ?? 800;
  const natH = (img as any).height ?? 600;
  let width: number, height: number;
  if (opts.width !== undefined)       { width = opts.width;  height = Math.round(width * natH / natW); }
  else if (opts.height !== undefined) { height = opts.height; width = Math.round(height * natW / natH); }
  else { const zoom = zoomFor(opts); width = Math.round(natW * zoom); height = Math.round(natH * zoom); }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d') as any;
  if (!ctx) throw new RenderError('failed to acquire 2d canvas context');
  ctx.drawImage(img as any, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height);
  return { rgba: new Uint8Array(data.data.buffer.slice(0)), width, height };
}

async function rgbaViaResvgWasm(svg: string, opts: RasterOptions): Promise<RgbaRaster> {
  // reuse the module's existing import/init; extract shared init into a helper
  // `resvgModule()` if duplication with rasterizeViaResvgWasm exceeds the
  // import/init block — do NOT duplicate the font/fitTo/free logic, refactor
  // rasterizeViaResvgWasm to share it.
  const mod = await resvgModule();          // shared helper (see note above)
  const Resvg = mod.Resvg;
  const resvg = new Resvg(svg, {
    font: { fontBuffers: [bundledFontBytes()], defaultFontFamily: 'Open Sans', loadSystemFonts: false },
    fitTo: resvgFitTo(opts),
  });
  let rendered: any;
  try {
    rendered = resvg.render();
    return {
      rgba   : new Uint8Array(rendered.pixels),
      width  : rendered.width,
      height : rendered.height,
    };
  } finally {
    rendered?.free();
    resvg.free();
  }
}
```

The shared `resvgModule()` helper: extract the existing `import('@resvg/resvg-wasm')` + `initWasm` block from `rasterizeViaResvgWasm` verbatim into one private async function both callers use. Keep the existing error message text byte-identical (a test may assert it).

- [ ] **Step 4: Run to verify pass, then the whole rasterize spec**

Run: `npx vitest run <that spec file> --coverage.enabled=false`
Expected: PASS, including all pre-existing tests (the refactor must not break them).

- [ ] **Step 5: Commit**

```bash
git add src/ts/cli/subcommands/render/rasterize.ts <the spec file>
git commit -m "feat(render): rasterizeRgba — raw RGBA output sharing the rasterize backends"
```

---

### Task 6: SVG state patching (`fsl_svg_patch.ts`)

**Files:**
- Create: `src/ts/fsl_svg_patch.ts`
- Test: `src/ts/tests/fsl_svg_patch.spec.ts`

**Interfaces:**
- Consumes: real SVG output from `fsl_to_svg_string` (`src/ts/jssm_viz.ts`) in tests.
- Produces: `extract_state_fills(svg: string): Map<string, string>` and `patch_state_fill(svg: string, state: string, fill: string): string`. Tasks 7 (colors for code spans) and 9 (frame highlighting) consume these.

Graphviz SVG shape (stable across the viz pipeline): each node is `<g id="…" class="node">` containing `<title>StateName</title>` (XML-escaped) followed by one or more shape elements (`ellipse`/`polygon`/`path`) carrying `fill="…"`, then `<text>` labels.

- [ ] **Step 1: Write the failing tests (against REAL renders — no fixture SVGs)**

`src/ts/tests/fsl_svg_patch.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { fsl_to_svg_string } from '../jssm_viz.js';
import { extract_state_fills, patch_state_fill } from '../fsl_svg_patch.js';

describe('extract_state_fills / patch_state_fill', () => {

  it('finds every state of a real render, each with a fill', async () => {
    const svg = await fsl_to_svg_string('A -> B; B -> C;');
    const fills = extract_state_fills(svg);
    expect([...fills.keys()].sort()).toEqual(['A', 'B', 'C']);
    for (const fill of fills.values()) { expect(fill).toMatch(/^(#|none|rgb|url)/); }
  });

  it('patches exactly one state, visible on re-extract, leaving others alone', async () => {
    const svg     = await fsl_to_svg_string('A -> B;');
    const before  = extract_state_fills(svg);
    const patched = patch_state_fill(svg, 'B', '#ff9930');
    const after   = extract_state_fills(patched);
    expect(after.get('B')).toBe('#ff9930');
    expect(after.get('A')).toBe(before.get('A'));
  });

  it('handles state names needing XML escaping', async () => {
    const svg = await fsl_to_svg_string('"a<b" -> C;');
    const fills = extract_state_fills(svg);
    expect(fills.has('a<b')).toBe(true);
    const patched = patch_state_fill(svg, 'a<b', '#123456');
    expect(extract_state_fills(patched).get('a<b')).toBe('#123456');
  });

  it('returns the svg unchanged when the state does not exist', async () => {
    const svg = await fsl_to_svg_string('A -> B;');
    expect(patch_state_fill(svg, 'Nope', '#fff')).toBe(svg);
  });

});
```

(If the `"a<b"` machine fails to construct — quoted names with `<` may be rejected by the parser — substitute a name with `&` such as `"a&b"`; if that also fails to parse, drop that test and note it in the commit body.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ts/tests/fsl_svg_patch.spec.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve `../fsl_svg_patch.js`.

- [ ] **Step 3: Implement**

`src/ts/fsl_svg_patch.ts`:

```typescript
/** Unescape the XML entities graphviz emits inside <title> text. @internal */
function xml_unescape(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

/** Match one graphviz node group; capture [1] the escaped title, [2] the group body. @internal */
const NODE_GROUP_RE = /<g[^>]*\bclass="node"[^>]*>([\s\S]*?)<\/g>/g;
const TITLE_RE      = /<title>([\s\S]*?)<\/title>/;
const SHAPE_FILL_RE = /(<(?:ellipse|polygon|path)\b[^>]*\bfill=")([^"]*)(")/;

/**
 *  Read each state's current fill color out of a graphviz-rendered machine
 *  SVG, keyed by state name.  States whose shape carries no `fill` attribute
 *  are omitted.
 *
 *  @param svg - SVG markup from the jssm viz pipeline (`fsl_to_svg_string`).
 *
 *  @example
 *  extract_state_fills(await fsl_to_svg_string('A -> B;'));  // Map { 'A' => '#…', 'B' => '#…' }
 *
 *  @see patch_state_fill
 */
export function extract_state_fills(svg: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const group of svg.matchAll(NODE_GROUP_RE)) {
    const body  = group[1]!;
    const title = body.match(TITLE_RE);
    const shape = body.match(SHAPE_FILL_RE);
    if (title !== null && shape !== null) {
      out.set(xml_unescape(title[1]!), shape[2]!);
    }
  }
  return out;
}

/**
 *  Return a copy of the SVG with the named state's first shape fill replaced.
 *  The unmatched-state case returns the input unchanged (walk truncation and
 *  render races surface as a missing highlight, never a throw).
 *
 *  @param svg - SVG markup from the jssm viz pipeline.
 *  @param state - State name as written in FSL (unescaped).
 *  @param fill - Any SVG paint value, e.g. `'#ff9930'`.
 *
 *  @example
 *  patch_state_fill(svg, 'Red', '#ff9930');  // Red's node now renders orange
 *
 *  @see extract_state_fills
 */
export function patch_state_fill(svg: string, state: string, fill: string): string {
  let done = false;
  const out = svg.replace(NODE_GROUP_RE, (whole, body: string) => {
    if (done) { return whole; }
    const title = body.match(TITLE_RE);
    if (title === null || xml_unescape(title[1]!) !== state) { return whole; }
    const patched_body = body.replace(SHAPE_FILL_RE, `$1${fill}$3`);
    if (patched_body === body) { return whole; }
    done = true;
    return whole.replace(body, patched_body);
  });
  return out;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ts/tests/fsl_svg_patch.spec.ts --coverage.enabled=false`
Expected: PASS. If `extract_state_fills` returns an empty map, the real SVG's node markup differs from the regexes — dump one render (`node -e` printing `fsl_to_svg_string` output) and adjust `NODE_GROUP_RE`/`SHAPE_FILL_RE` to what graphviz actually emits, keeping the tests as the arbiter. Do not weaken the tests.

- [ ] **Step 5: Commit**

```bash
git add src/ts/fsl_svg_patch.ts src/ts/tests/fsl_svg_patch.spec.ts
git commit -m "feat(fence): SVG state-fill extraction and patching over real viz output"
```

---

### Task 7: Two-layer static highlighter (`fsl_fence_highlight.ts`)

**Files:**
- Create: `src/ts/fsl_fence_highlight.ts`
- Test: `src/ts/tests/fsl_fence_highlight.spec.ts`

**Interfaces:**
- Consumes: `fslLanguage` (`src/ts/cm6/fsl_language.ts`), `fslSemanticSpans` + `SemanticSpan {from,to,kind:'color'|'state'|'enum',value?}` (`src/ts/language_service/semantic_spans.ts`, `types.ts`), `highlightCode`/`classHighlighter` from `@lezer/highlight`.
- Produces:
  - `HighlightRun { text: string; classes: string; state?: string }`
  - `highlight_fsl_runs(source: string): HighlightRun[]` — the pure core; the cookbook adapter (Task 12) consumes it.
  - `highlight_fsl_html(source: string, opts?: { state_colors?: ReadonlyMap<string,string>; inline_colors?: boolean }): string` — Task 8 consumes it. Class scheme: token classes are `classHighlighter` names with `tok-` re-prefixed to `fsl-tok-`; semantic classes are `fsl-sem-state` / `fsl-sem-color` / `fsl-sem-enum`. `inline_colors` defaults true; when true and a state run has a color in `state_colors`, the span gets `style="color:#…"`.

- [ ] **Step 1: Write the failing tests**

`src/ts/tests/fsl_fence_highlight.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { highlight_fsl_runs, highlight_fsl_html } from '../fsl_fence_highlight.js';

describe('highlight_fsl_runs', () => {

  it('concatenated run text reproduces the source exactly', () => {
    const src = 'Red => Green;\nGreen -> Red;';
    const runs = highlight_fsl_runs(src);
    expect(runs.map(r => r.text).join('')).toBe(src);
  });

  it('marks state names with the semantic state class and carries the name', () => {
    const runs = highlight_fsl_runs('Red -> Green;');
    const red = runs.find(r => r.state === 'Red');
    expect(red).toBeDefined();
    expect(red!.classes).toContain('fsl-sem-state');
  });

  it('gives keywords a token class', () => {
    const runs = highlight_fsl_runs('machine_name: "demo";\na -> b;');
    expect(runs.some(r => r.classes.includes('fsl-tok-'))).toBe(true);
  });

});

describe('highlight_fsl_html', () => {

  it('escapes HTML and wraps classed runs in spans', () => {
    const html = highlight_fsl_html('a "<b>" -> c;');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('fsl-sem-state');
  });

  it('applies inline state colors when provided', () => {
    const html = highlight_fsl_html('Red -> Green;', {
      state_colors: new Map([['Red', '#aa0000']]),
    });
    expect(html).toContain('style="color:#aa0000"');
    expect(html).toContain('data-state="Red"');
  });

  it('omits inline styles when inline_colors is false', () => {
    const html = highlight_fsl_html('Red -> Green;', {
      state_colors: new Map([['Red', '#aa0000']]),
      inline_colors: false,
    });
    expect(html).not.toContain('style=');
    expect(html).toContain('data-state="Red"');
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ts/tests/fsl_fence_highlight.spec.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve `../fsl_fence_highlight.js`.

- [ ] **Step 3: Implement**

`src/ts/fsl_fence_highlight.ts`:

```typescript
import { highlightCode, classHighlighter } from '@lezer/highlight';
import { fslLanguage }      from './cm6/fsl_language.js';
import { fslSemanticSpans } from './language_service/semantic_spans.js';

/** One classified slice of highlighted FSL source. */
export interface HighlightRun {
  text    : string;
  /** Space-separated classes: `fsl-tok-*` token layer, `fsl-sem-*` semantic layer. */
  classes : string;
  /** The state name, present exactly on semantic state-name runs. */
  state?  : string;
}

/**
 *  Tokenize FSL source through the SAME two layers the editor uses — the
 *  `fslLanguage` stream grammar for token classes and `fslSemanticSpans` for
 *  parser-derived roles — merged into flat runs whose concatenated text
 *  reproduces the source byte-for-byte.  Semantic classes overlay token
 *  classes (both are kept).
 *
 *  This is the parity guarantee: there is no third tokenizer, so static
 *  output can never disagree with the editor.
 *
 *  @example
 *  highlight_fsl_runs('Red -> Green;').find(r => r.state === 'Red');
 *  // { text: 'Red', classes: 'fsl-tok-… fsl-sem-state', state: 'Red' }
 */
export function highlight_fsl_runs(source: string): HighlightRun[] {

  // layer 1: token classes from the CM6 stream grammar (editor parity)
  interface TokenRun { from: number; to: number; classes: string; }
  const token_runs: TokenRun[] = [];
  let offset = 0;
  const tree = fslLanguage.parser.parse(source);
  highlightCode(
    source, tree, classHighlighter,
    (text, classes) => {
      token_runs.push({ from: offset, to: offset + text.length,
                        classes: classes.replace(/\btok-/g, 'fsl-tok-') });
      offset += text.length;
    },
    () => {
      token_runs.push({ from: offset, to: offset + 1, classes: '' });
      offset += 1;
    },
  );

  // layer 2: semantic overlay from the real parser
  const sem = fslSemanticSpans(source);

  // cut at every boundary from both layers
  const cuts = new Set<number>([0, source.length]);
  for (const r of token_runs) { cuts.add(r.from); cuts.add(r.to); }
  for (const s of sem)        { cuts.add(s.from); cuts.add(s.to); }
  const points = [...cuts].sort((a, b) => a - b);

  const out: HighlightRun[] = [];
  for (let i = 0; i < points.length - 1; ++i) {
    const from = points[i]!, to = points[i + 1]!;
    if (from >= to) { continue; }
    const token = token_runs.find(r => r.from <= from && to <= r.to);
    const span  = sem.find(s => s.from <= from && to <= s.to);
    const classes = [
      token?.classes ?? '',
      span !== undefined ? `fsl-sem-${span.kind}` : '',
    ].filter(Boolean).join(' ');
    const run: HighlightRun = { text: source.slice(from, to), classes };
    if (span?.kind === 'state' && span.value !== undefined) { run.state = span.value; }
    out.push(run);
  }

  return out;

}

/** Escape text for HTML body and attribute contexts. @internal */
function escape_html(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 *  Render FSL source as highlighted HTML (`<pre class="fsl-code">` inner
 *  content) using {@link highlight_fsl_runs}.  Semantic state-name spans get
 *  `data-state`; when `inline_colors` (default true) and the state appears in
 *  `state_colors`, an inline `style="color:…"` ties the code block's state
 *  names to the diagram's node colors with zero host CSS.
 *
 *  @example
 *  highlight_fsl_html('Red -> Green;', { state_colors: new Map([['Red', '#a00']]) });
 *  // '…<span class="… fsl-sem-state" data-state="Red" style="color:#a00">Red</span>…'
 */
export function highlight_fsl_html(
  source : string,
  opts   : { state_colors?: ReadonlyMap<string, string>; inline_colors?: boolean } = {},
): string {

  const inline = opts.inline_colors ?? true;

  return highlight_fsl_runs(source).map(run => {
    if (run.classes === '') { return escape_html(run.text); }
    const attrs: string[] = [`class="${run.classes}"`];
    if (run.state !== undefined) {
      attrs.push(`data-state="${escape_html(run.state)}"`);
      const color = opts.state_colors?.get(run.state);
      if (inline && color !== undefined) { attrs.push(`style="color:${escape_html(color)}"`); }
    }
    return `<span ${attrs.join(' ')}>${escape_html(run.text)}</span>`;
  }).join('');

}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ts/tests/fsl_fence_highlight.spec.ts --coverage.enabled=false`
Expected: PASS (6 tests). If `fslLanguage.parser` has no `.parse` in this version of `@codemirror/language`, use `fslLanguage.parser.parse(source)` via the `Language.parser` property — check `node_modules/@codemirror/language/dist/index.d.ts` for the exact member; the parity constraint (no third tokenizer) is non-negotiable, the access path is not.

- [ ] **Step 5: Commit**

```bash
git add src/ts/fsl_fence_highlight.ts src/ts/tests/fsl_fence_highlight.spec.ts
git commit -m "feat(fence): two-layer static highlighter — editor-parity tokens + semantic overlay"
```

---

### Task 8: Descriptor interpreter — `render_fence_html` + `transform_markdown` (`fsl_fence_render.ts`)

**Files:**
- Create: `src/ts/fsl_fence_render.ts`
- Test: `src/ts/tests/fsl_fence_render.spec.ts`

**Interfaces:**
- Consumes: `parse_fence_info`/`fsl_fence_lang` (core barrel), `sm` (core), `fsl_to_svg_string`/`fsl_to_dot` (`./jssm_viz.js`), `rasterize` (`./cli/subcommands/render/rasterize.js`), `extract_state_fills` (Task 6), `highlight_fsl_html` (Task 7).
- Produces:
  - `FenceRenderOptions { inline_colors?: boolean }`
  - `render_fence_html(source: string, info: string, opts?: FenceRenderOptions): Promise<string>`
  - `transform_markdown(markdown: string, opts?: FenceRenderOptions): Promise<string>`
  - Task 9 appends `render_fence_gif` to this file; Task 11's CLI wiring and Task 12's cookbook consume the module.

Behavior (spec §3.3): parts render in order, first = top, inside `<div class="fsl-fence" style="width:…;height:…">`. `image`+`svg` → inline SVG; `image`+`png`/`jpeg` → `<img src="data:image/…;base64,…">`; `image`+`gif` → placeholder comment in THIS task (`<!-- fsl-fence: gif rendering lands with render_fence_gif -->`) replaced by real wiring in Task 9's step 5. `code` → `<pre class="fsl-code"><code>` + `highlight_fsl_html` with `state_colors` from `extract_state_fills` of the rendered SVG (render the SVG once, reuse for both image and colors). `dot` → `<pre class="fsl-dot"><code>` escaped `fsl_to_dot` output. `title` → `<div class="fsl-title">` machine name (from FSL `machine_name` when set, else `FSL machine`). `footer` → `<div class="fsl-footer"></div>`. `editor`/`actions`/`info-panel`/`toolbar` → nothing + note. Descriptor `notes` and render notes → `<!-- fsl-fence: … -->` comments inside the wrapper. Invalid FSL → `<div class="fsl-error-box"><strong>FSL error</strong><pre>…msg…</pre><pre class="fsl-fence-source">…escaped source…</pre></div>` (never throws).

- [ ] **Step 1: Write the failing tests**

`src/ts/tests/fsl_fence_render.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { render_fence_html, transform_markdown } from '../fsl_fence_render.js';

describe('render_fence_html', () => {

  it('default fence renders image over code, in that order', async () => {
    const html = await render_fence_html('Red -> Green;', 'fsl');
    expect(html).toContain('class="fsl-fence"');
    expect(html).toContain('<svg');
    expect(html).toContain('fsl-code');
    expect(html.indexOf('<svg')).toBeLessThan(html.indexOf('fsl-code'));
  });

  it('code state names carry the diagram colors inline', async () => {
    const html = await render_fence_html('Red -> Green;', 'fsl code');
    expect(html).toContain('data-state="Red"');
    expect(html).toMatch(/data-state="Red"[^>]*style="color:/);
  });

  it('dot renders escaped DOT source, not an image', async () => {
    const html = await render_fence_html('a -> b;', 'fsl dot');
    expect(html).toContain('fsl-dot');
    expect(html).toContain('digraph');
    expect(html).not.toContain('<svg');
  });

  it('honors width and height on the wrapper', async () => {
    const html = await render_fence_html('a -> b;', 'fsl width=300 height=50%');
    expect(html).toContain('width:300px');
    expect(html).toContain('height:50%');
  });

  it('interactive parts emit nothing but a note comment', async () => {
    const html = await render_fence_html('a -> b;', 'fsl actions');
    expect(html).toContain('<!-- fsl-fence:');
    expect(html).not.toContain('fsl-actions');
  });

  it('invalid FSL yields the error box with the source still visible', async () => {
    const html = await render_fence_html('this is not -> valid ->;', 'fsl');
    expect(html).toContain('fsl-error-box');
    expect(html).toContain('FSL error');
    expect(html).toContain('fsl-fence-source');
  });

  it('raster formats produce a data-URI img', async () => {
    const html = await render_fence_html('a -> b;', 'fsl png');
    expect(html).toContain('<img');
    expect(html).toContain('data:image/png;base64,');
  });

});

describe('transform_markdown', () => {

  it('replaces fsl fences and leaves everything else byte-identical', async () => {
    const md = '# Title\n\n```fsl\na -> b;\n```\n\n```js\nconst x = 1;\n```\n\ntail\n';
    const out = await transform_markdown(md);
    expect(out).toContain('# Title');
    expect(out).toContain('class="fsl-fence"');
    expect(out).toContain('```js\nconst x = 1;\n```');
    expect(out).toContain('tail');
    expect(out).not.toContain('```fsl');
  });

  it('isolates a broken fence to its own error box', async () => {
    const md = '```fsl\nbroken ->;\n```\n\n```fsl\na -> b;\n```\n';
    const out = await transform_markdown(md);
    expect(out).toContain('fsl-error-box');
    expect(out).toContain('<svg');
  });

  it('supports longer backtick fences', async () => {
    const md = '````fsl\na -> b;\n````\n';
    expect(await transform_markdown(md)).toContain('class="fsl-fence"');
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ts/tests/fsl_fence_render.spec.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve `../fsl_fence_render.js`.

- [ ] **Step 3: Implement**

`src/ts/fsl_fence_render.ts`:

```typescript
import { sm, parse_fence_info, fsl_fence_lang } from './jssm.js';
import type { FenceDescriptor, FenceDimension } from './jssm.js';
import { fsl_to_svg_string, fsl_to_dot }        from './jssm_viz.js';
import { rasterize }            from './cli/subcommands/render/rasterize.js';
import { extract_state_fills }  from './fsl_svg_patch.js';
import { highlight_fsl_html }   from './fsl_fence_highlight.js';

/** Options shared by the static fence renderers. */
export interface FenceRenderOptions {
  /** Inline state colors in code spans (default true).  @see highlight_fsl_html */
  inline_colors? : boolean;
}

/** Serialize a parsed dimension to CSS, '' when unset. @internal */
function dim_css(d: FenceDimension | null): string {
  return d === null ? '' : `${d.value}${d.unit === 'percent' ? '%' : 'px'}`;
}

/** Escape text for HTML body and attribute contexts. @internal */
function escape_html(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** The spec §4.9 error box: message plus still-readable source. @internal */
function error_box(source: string, message: string): string {
  return `<div class="fsl-error-box"><strong>FSL error</strong>`
       + `<pre>${escape_html(message)}</pre>`
       + `<pre class="fsl-fence-source"><code>${escape_html(source)}</code></pre></div>`;
}

/** Note comment, invisible but inspectable. @internal */
const note_comment = (note: string): string => `<!-- fsl-fence: ${escape_html(note)} -->`;

/** Parts that exist only interactively; static hosts note-and-skip them. @internal */
const INTERACTIVE_PARTS: ReadonlySet<string> = new Set(['editor', 'actions', 'info-panel', 'toolbar']);

/**
 *  Render one FSL markdown fence to static HTML per the fence convention:
 *  parts stack top-down in the order written, sized by width/height, with
 *  editor-parity code highlighting whose state names carry the diagram's own
 *  node colors.  Invalid FSL renders a visible error box — this function
 *  never throws for bad machine source.
 *
 *  @param source - The FSL machine source (fence body).
 *  @param info - The fence info string (e.g. `'fsl image code width=300'`).
 *
 *  @example
 *  await render_fence_html('Red => Green => Red;', 'fsl');
 *  // '<div class="fsl-fence" …><svg…/svg><pre class="fsl-code">…</pre></div>'
 */
export async function render_fence_html(
  source : string,
  info   : string,
  opts   : FenceRenderOptions = {},
): Promise<string> {

  const desc = parse_fence_info(info);

  try {
    sm`${source}`;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return wrap(desc, [error_box(source, message)]);
  }

  const svg   = await fsl_to_svg_string(source);
  const fills = extract_state_fills(svg);
  const chunks: string[] = desc.notes.map(note_comment);

  for (const part of desc.parts) {
    if (INTERACTIVE_PARTS.has(part)) {
      chunks.push(note_comment(`${part} is interactive; omitted in static rendering`));
      continue;
    }
    if (part === 'image') { chunks.push(await image_html(source, svg, desc)); continue; }
    if (part === 'code') {
      chunks.push(`<pre class="fsl-code"><code>${
        highlight_fsl_html(source, { state_colors: fills, inline_colors: opts.inline_colors })
      }</code></pre>`);
      continue;
    }
    if (part === 'dot') {
      chunks.push(`<pre class="fsl-dot"><code>${escape_html(fsl_to_dot(source))}</code></pre>`);
      continue;
    }
    if (part === 'title') {
      const machine = sm`${source}`;
      const name = machine.machine_name() ?? 'FSL machine';
      chunks.push(`<div class="fsl-title">${escape_html(name)}</div>`);
      continue;
    }
    // footer
    chunks.push('<div class="fsl-footer"></div>');
  }

  return wrap(desc, chunks);

}

/** The sized wrapper div. @internal */
function wrap(desc: FenceDescriptor, chunks: string[]): string {
  const styles = [
    dim_css(desc.width)  !== '' ? `width:${dim_css(desc.width)}`   : '',
    dim_css(desc.height) !== '' ? `height:${dim_css(desc.height)}` : '',
  ].filter(Boolean).join(';');
  const style_attr = styles === '' ? '' : ` style="${styles}"`;
  return `<div class="fsl-fence"${style_attr}>${chunks.join('')}</div>`;
}

/** Render the image part in the descriptor's format. @internal */
async function image_html(source: string, svg: string, desc: FenceDescriptor): Promise<string> {
  if (desc.format === 'svg') { return svg; }
  if (desc.format === 'gif') {
    // replaced by real wiring when render_fence_gif lands (same module)
    return note_comment('gif rendering lands with render_fence_gif');
  }
  const bytes = await rasterize(svg, desc.format, {});
  const b64 = (typeof Buffer !== 'undefined')
    ? Buffer.from(bytes).toString('base64')
    : btoa(String.fromCharCode(...bytes));
  return `<img class="fsl-image" src="data:image/${desc.format};base64,${b64}" alt="FSL state machine"/>`;
}

/**
 *  Replace every fsl/jssm fenced code block in a Markdown string with its
 *  rendered static HTML; all other content passes through byte-identical.
 *  Each fence is isolated — a broken machine becomes its own error box and
 *  the rest of the document still renders.  Backtick fences of length ≥3
 *  are recognized; tilde fences are out of scope (v1, spec §9).
 *
 *  @example
 *  await transform_markdown('# Doc\n\n```fsl\na -> b;\n```\n');
 *  // '# Doc\n\n<div class="fsl-fence">…</div>\n'
 */
export async function transform_markdown(
  markdown : string,
  opts     : FenceRenderOptions = {},
): Promise<string> {

  const lines = markdown.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const open = lines[i]!.match(/^(`{3,})(.*)$/);
    if (open === null) { out.push(lines[i]!); i += 1; continue; }

    const ticks = open[1]!;
    const info  = open[2]!.trim();
    const body: string[] = [];
    let j = i + 1;
    while (j < lines.length && !lines[j]!.startsWith(ticks)) { body.push(lines[j]!); j += 1; }

    if (fsl_fence_lang(info) === null) {
      // not ours: pass the whole block through untouched (including close fence if any)
      out.push(...lines.slice(i, Math.min(j + 1, lines.length)));
    } else {
      out.push(await render_fence_html(body.join('\n'), info, opts));
    }
    i = j + 1;
  }

  return out.join('\n');

}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ts/tests/fsl_fence_render.spec.ts --coverage.enabled=false`
Expected: PASS (10 tests). `machine.machine_name()` — if the accessor is named differently, check the Machine class in `src/ts/jssm.ts` (`Grep pattern:"machine_name" path:src/ts/jssm.ts`) and use the real accessor; if none exists, use the literal `'FSL machine'` and drop the lookup.

- [ ] **Step 5: Commit**

```bash
git add src/ts/fsl_fence_render.ts src/ts/tests/fsl_fence_render.spec.ts
git commit -m "feat(fence): render_fence_html + transform_markdown — static parts stacks with parity highlighting"
```

---

### Task 9: The animated walk — `render_fence_gif`

**Files:**
- Modify: `src/ts/fsl_fence_render.ts` (append + replace the gif placeholder)
- Test: `src/ts/tests/fsl_fence_gif.spec.ts`

**Interfaces:**
- Consumes: `plan_walk` (Task 4), `patch_state_fill` (Task 6), `rasterizeRgba` (Task 5), `encode_gif` (Task 3), `fsl_to_svg_string`.
- Produces: `GifRenderOptions { delay_cs?: number; loop?: number; max_frames?: number; scale?: number; highlight_fill?: string }` and `render_fence_gif(source: string, opts?: GifRenderOptions): Promise<Uint8Array>`. Task 11's CLI consumes this.

- [ ] **Step 1: Write the failing tests**

`src/ts/tests/fsl_fence_gif.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { render_fence_gif, render_fence_html } from '../fsl_fence_render.js';
import { decode_gif } from './helpers/gif_decode.js';

describe('render_fence_gif', () => {

  it('renders one frame per walk state, looping forever', async () => {
    const gif = decode_gif(await render_fence_gif('Red => Green => Yellow => Red;', { scale: 25 }));
    expect(gif.frames.length).toBe(3);
    expect(gif.loop).toBe(0);
    expect(gif.width).toBeGreaterThan(0);
  }, 60_000);

  it('frames differ from one another (the highlight moved)', async () => {
    const gif = decode_gif(await render_fence_gif('A => B => A;', { scale: 25 }));
    expect(gif.frames.length).toBe(2);
    expect([...gif.frames[0]!.rgb]).not.toEqual([...gif.frames[1]!.rgb]);
  }, 60_000);

  it('truncates at max_frames', async () => {
    const gif = decode_gif(await render_fence_gif('A -> B; C -> D; E -> F;', { max_frames: 2, scale: 25 }));
    expect(gif.frames.length).toBe(2);
  }, 60_000);

  it('throws JssmError on invalid FSL', async () => {
    await expect(render_fence_gif('broken ->;')).rejects.toThrow();
  });

});

describe('render_fence_html with gif format', () => {

  it('embeds a gif data URI', async () => {
    const html = await render_fence_html('A => B => A;', 'fsl gif');
    expect(html).toContain('data:image/gif;base64,');
  }, 60_000);

});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ts/tests/fsl_fence_gif.spec.ts --coverage.enabled=false`
Expected: FAIL — `render_fence_gif` is not exported.

- [ ] **Step 3: Implement (append to `src/ts/fsl_fence_render.ts`; add imports)**

Add to the imports:

```typescript
import { plan_walk }        from './fsl_walk.js';
import { patch_state_fill } from './fsl_svg_patch.js';
import { rasterizeRgba }    from './cli/subcommands/render/rasterize.js';
import { encode_gif }       from './fsl_gif.js';
import type { GifFrame }    from './fsl_gif.js';
```

Append:

```typescript
/** Options for {@link render_fence_gif}. */
export interface GifRenderOptions {
  /** Per-frame delay, centiseconds.  Default 70 (~0.7s). */
  delay_cs?       : number;
  /** Netscape loop count; 0 = forever (default). */
  loop?           : number;
  /** Walk-length ceiling; longer walks truncate.  Default 64. */
  max_frames?     : number;
  /** Raster zoom percentage; 100 = 3× natural (the CLI raster convention). Default 100. */
  scale?          : number;
  /** Fill painted on the walked state each frame.  Default '#ff9930'. */
  highlight_fill? : string;
}

/**
 *  Render an FSL machine as a looping animated GIF that walks its states:
 *  main-path (`=>`) states in order when a main path exists, else an
 *  every-edge tour.  Graphviz lays the machine out ONCE; each frame patches
 *  one state's fill in the SVG string and rasterizes — identical geometry
 *  across frames, no layout jitter.
 *
 *  @throws {JssmError} on invalid FSL (programmatic callers want exceptions;
 *  the HTML renderers catch and box instead).
 *
 *  @example
 *  const gif = await render_fence_gif('Red => Green => Yellow => Red;');
 *  // Uint8Array starting "GIF89a", three frames, looping forever
 *
 *  @see plan_walk
 *  @see encode_gif
 */
export async function render_fence_gif(
  source : string,
  opts   : GifRenderOptions = {},
): Promise<Uint8Array> {

  const machine    = sm`${source}`;                    // throws JssmError on bad source
  const max_frames = opts.max_frames ?? 64;
  const walk       = plan_walk(machine).slice(0, max_frames);

  const base_svg  = await fsl_to_svg_string(source);
  const highlight = opts.highlight_fill ?? '#ff9930';
  const scale     = opts.scale ?? 100;

  const frames: GifFrame[] = [];
  for (const state of walk) {
    const patched = patch_state_fill(base_svg, state, highlight);
    const raster  = await rasterizeRgba(patched, { scale });
    frames.push({ rgba: raster.rgba, width: raster.width, height: raster.height });
  }

  return encode_gif(frames, { delay_cs: opts.delay_cs ?? 70, loop: opts.loop ?? 0 });

}
```

Then replace the placeholder branch inside `image_html`:

```typescript
  if (desc.format === 'gif') {
    const bytes = await render_fence_gif(source, {});
    const b64 = (typeof Buffer !== 'undefined')
      ? Buffer.from(bytes).toString('base64')
      : btoa(String.fromCharCode(...bytes));
    return `<img class="fsl-image" src="data:image/gif;base64,${b64}" alt="FSL state machine walk"/>`;
  }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ts/tests/fsl_fence_gif.spec.ts src/ts/tests/fsl_fence_render.spec.ts --coverage.enabled=false`
Expected: PASS (gif tests are slow — resvg per frame; the 60s timeouts are deliberate).

- [ ] **Step 5: Commit**

```bash
git add src/ts/fsl_fence_render.ts src/ts/tests/fsl_fence_gif.spec.ts
git commit -m "feat(fence): render_fence_gif — one-layout walk animation via SVG patch + resvg + gif89a"
```

---

### Task 10: The `jssm/fence` subpath — barrel, rollup entry, build feature, docs

**Files:**
- Create: `src/ts/fence.ts`
- Create: `rollup.config.fence.es6.js`
- Modify: `package.json` (scripts + exports)
- Modify: `src/buildjs/build_config_features.cjs` (feature entry)
- Modify: `src/md/README_base.md` (public-API documentation; the README is generated from this)
- Test: reachability spec `src/ts/tests/fence_barrel.spec.ts`

**Interfaces:**
- Consumes: every module from Tasks 1–9.
- Produces: `import { render_fence_html, render_fence_gif, transform_markdown, encode_gif, plan_walk, highlight_fsl_runs, highlight_fsl_html, extract_state_fills, patch_state_fill } from 'jssm/fence'`.

- [ ] **Step 1: Write the failing reachability test**

`src/ts/tests/fence_barrel.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import * as fence from '../fence.js';

describe('jssm/fence barrel', () => {

  it('exports the full static-rendering surface', () => {
    for (const name of [
      'render_fence_html', 'render_fence_gif', 'transform_markdown',
      'encode_gif', 'quantize', 'lzw_encode', 'plan_walk',
      'highlight_fsl_runs', 'highlight_fsl_html',
      'extract_state_fills', 'patch_state_fill',
    ]) {
      expect(typeof (fence as Record<string, unknown>)[name], name).toBe('function');
    }
  });

});
```

- [ ] **Step 2: Run to verify failure, then create the barrel**

Run: `npx vitest run src/ts/tests/fence_barrel.spec.ts --coverage.enabled=false` → FAIL (no `../fence.js`).

`src/ts/fence.ts`:

```typescript
/**
 *  Bundle entry for the `jssm/fence` subpath: host-agnostic static rendering
 *  of FSL markdown fences — HTML parts stacks with editor-parity
 *  highlighting, animated walk GIFs, and a whole-document Markdown
 *  transformer — plus the reusable primitives behind them (GIF89a encoder,
 *  walk planner, SVG patching).
 *
 *  @see render_fence_html
 *  @see transform_markdown
 */
export { render_fence_html, render_fence_gif, transform_markdown } from './fsl_fence_render.js';
export type { FenceRenderOptions, GifRenderOptions }               from './fsl_fence_render.js';
export { encode_gif, quantize, lzw_encode }                        from './fsl_gif.js';
export type { GifFrame, GifOptions, Quantized }                    from './fsl_gif.js';
export { plan_walk }                                               from './fsl_walk.js';
export { highlight_fsl_runs, highlight_fsl_html }                  from './fsl_fence_highlight.js';
export type { HighlightRun }                                       from './fsl_fence_highlight.js';
export { extract_state_fills, patch_state_fill }                   from './fsl_svg_patch.js';
```

Re-run the spec → PASS.

- [ ] **Step 3: Rollup config + npm script + build feature + exports**

`rollup.config.fence.es6.js`:

```javascript
import nodeResolve from '@rollup/plugin-node-resolve';

/**
 * ESM build for the `jssm/fence` subpath (static fence rendering + GIF).
 *
 * UNLIKE rollup.config.cm6.es6.js, the `@codemirror/*` and `@lezer/*`
 * packages are BUNDLED here, not externalized: fence consumers are static
 * builds and CLIs with no editor present, so there is no duplicate
 * `@codemirror/state` instanceof hazard — and requiring them to install
 * editor packages for a highlighter would be hostile.  Only the optional
 * raster backend stays external (dynamic import, same posture as the CLI:
 * PNG/JPEG/GIF users `npm install @resvg/resvg-wasm`).
 */
const external = (id) => id === '@resvg/resvg-wasm';

export default [{
  input  : 'dist/es6/fence.js',
  output : {
    file          : 'dist/fence/fence.js',
    format        : 'es',
    name          : 'fsl_fence',
    inlineDynamicImports : true,
  },
  external,
  plugins : [ nodeResolve({ extensions: ['.js', '.json'] }) ],
}];
```

`package.json` scripts (next to `make_cm6`):

```json
"make_fence": "rollup -c rollup.config.fence.es6.js",
```

`src/buildjs/build_config_features.cjs` (next to the `make_cm6` entry, same shape):

```javascript
make_fence:           { script: 'make_fence',           stages: [4], optional: true, defaultEnabled: true },
```

`package.json` exports (after the `"./cm6"` entry):

```json
"./fence": {
  "types": "./dist/es6/fence.d.ts",
  "import": "./dist/fence/fence.js",
  "default": "./dist/fence/fence.js"
},
```

- [ ] **Step 4: Build and verify the entry**

Run: `npm run make` (Bash tool; regenerates dist/es6 then stage-4 features including the new entry)
Then: `node -e "import('./dist/fence/fence.js').then(m => console.log(Object.keys(m).sort().join(' ')))"`
Expected: the export names from Step 1's list appear. If rollup fails on `import.meta` or dynamic-import warnings from the resvg path, keep `@resvg/resvg-wasm` external (it is) and add `inlineDynamicImports: true` (already present) — those two settings resolve the known warning pair.

- [ ] **Step 5: Document in the README source**

In `src/md/README_base.md`, add a short section (place it adjacent to the existing viz/CLI API sections; match surrounding heading depth) titled `## Static fence rendering (\`jssm/fence\`)` with: one sentence of purpose, a 6-line usage example calling `transform_markdown`, one line on `render_fence_gif` and the gif defaults (70cs, loop forever, 64-frame cap), and a note that PNG/JPEG/GIF need `npm install @resvg/resvg-wasm`. Do not regenerate the README by hand — the full build does it (and `/sc-commit` runs the full build at PR time).

- [ ] **Step 6: Commit**

```bash
git add src/ts/fence.ts src/ts/tests/fence_barrel.spec.ts rollup.config.fence.es6.js package.json src/buildjs/build_config_features.cjs src/md/README_base.md
git commit -m "feat(fence): jssm/fence subpath — barrel, rollup entry, build feature, README"
```

---

### Task 11: CLI `--target gif`

**Files:**
- Modify: `src/ts/cli/subcommands/render/render.ts` (add the `gif` case to `render()` and `RenderOptions`)
- Modify: `src/ts/cli/subcommands/render/plugin.ts` (flag registration — mirror how `--scale`/`--quality` are declared there)
- Test: extend the existing render subcommand spec (locate via `Grep pattern:"render" path:src/ts glob:*render*.spec.ts`)

**Interfaces:**
- Consumes: `render_fence_gif` (Task 9).
- Produces: `fsl render <file> --target gif [--delay <cs>] [--max-frames <n>]` writing GIF bytes; `render()`'s union gains `'gif'`.

- [ ] **Step 1: Write the failing test (in the existing render spec, matching its harness style)**

```typescript
it('renders an animated gif for --target gif', async () => {
  const result = await render('A => B => A;', { target: 'gif', scale: 25 });
  expect(result.target).toBe('gif');
  expect(result.kind).toBe('raster');
  const bytes = result.buffer;
  expect(String.fromCharCode(...bytes.slice(0, 6))).toBe('GIF89a');
}, 60_000);
```

(Match the existing spec's exact `render()` result-shape assertions — read two neighboring png tests first and mirror them; if the result type uses different field names than `target`/`kind`/`buffer`, follow the real ones.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run <that spec> --coverage.enabled=false`
Expected: FAIL — `'gif'` not accepted / no case.

- [ ] **Step 3: Implement**

In `render.ts`, extend the options interface with `delay?: number; maxFrames?: number;`, extend the target union with `'gif'`, and add the case beside the png/jpeg ones (import `render_fence_gif` from `'../../../fsl_fence_render.js'`):

```typescript
    case 'gif':
      return {
        target: 'gif',
        kind: 'raster',
        buffer: await render_fence_gif(fsl, {
          scale      : opts.scale,
          delay_cs   : opts.delay,
          max_frames : opts.maxFrames,
        }),
      };
```

In `plugin.ts`, register `gif` as a legal `--target` value and add `--delay <centiseconds>` and `--max-frames <n>` flags, declared and parsed exactly the way `--scale` is (read its declaration and copy the pattern; both are plain positive integers).

- [ ] **Step 4: Run to verify pass, then the full render spec**

Run: `npx vitest run <that spec> --coverage.enabled=false`
Expected: PASS including all pre-existing render tests.

- [ ] **Step 5: Commit**

```bash
git add src/ts/cli/subcommands/render/render.ts src/ts/cli/subcommands/render/plugin.ts <the spec file>
git commit -m "feat(cli): fsl render --target gif with --delay and --max-frames"
```

---

### Task 12: Cookbook dogfood — parity highlighting in the site build

**Files:**
- Modify: `src/fsl.tools/site/scripts/build.cjs`

**Interfaces:**
- Consumes: `highlight_fsl_runs` from the built `dist/fence/fence.js` (Task 10 must be complete and `npm run make` run).
- Produces: cookbook FSL blocks highlighted by the parity pipeline; the hand-rolled fsl flavour in `build.cjs` deleted.

Background: `build.cjs` currently routes `fsl` blocks through its own token heuristic (`highlightJsLike` with `flavour === 'fsl'`, where "identifiers are state names" — see the `case 'fsl'` at ~line 148 and the fsl conditionals at ~lines 213/243). That third tokenizer is exactly what the parity requirement forbids — replace it.

- [ ] **Step 1: Make the entry async-capable and import the parity highlighter**

`build.cjs` is CommonJS; `dist/fence/fence.js` is ESM. At the top of the script's main execution path, load it via dynamic import (wrap the script's top-level run in an async IIFE if it is currently synchronous — keep every existing step in order):

```javascript
const { pathToFileURL } = require('url');
const fence_url = pathToFileURL(require('path').resolve(__dirname, '../../../../dist/fence/fence.js')).href;
// inside the async main:
const { highlight_fsl_runs } = await import(fence_url);
```

(Verify the relative path: `build.cjs` lives at `src/fsl.tools/site/scripts/`, dist at repo root — count the hops and test with `node src/fsl.tools/site/scripts/build.cjs` rather than trusting this comment.)

- [ ] **Step 2: Replace the fsl flavour with an adapter over `highlight_fsl_runs`**

Where `highlight(code, kind)` currently returns tokens for the fsl flavour, map parity runs onto the cookbook's existing token kinds instead (read the kind→color table at ~build.cjs:110-130 first; the mapping below names kinds by ROLE — use the table's actual letters):

```javascript
function highlightFsl(code) {
  return highlight_fsl_runs(code).map(run => ({
    kind: run.classes.includes('fsl-sem-state')   ? KIND_STATE
        : run.classes.includes('fsl-tok-keyword') ? KIND_KEYWORD
        : run.classes.includes('fsl-tok-string')  ? KIND_STRING
        : run.classes.includes('fsl-tok-comment') ? KIND_COMMENT
        : run.classes.includes('fsl-tok-number')  ? KIND_NUMBER
        : KIND_PLAIN,
    text: run.text,
  }));
}
```

Then delete the now-dead fsl branches from `highlightJsLike` (the `flavour === 'fsl'` conditionals and the `case 'fsl'` routing to it), routing `case 'fsl'` to `highlightFsl`.

- [ ] **Step 3: Verify by building the cookbook and inspecting output**

Run: `npm run make` (if dist is stale) then `npm run make_cookbook` (Bash tool).
Then grep a generated cookbook page for a state-name span in the state color (`Grep pattern:"5fbeb1" path:docs/fsl.tools/cookbook output_mode:files_with_matches` or whatever class/color the adapter produces): state names must still be visibly distinct, and the build must exit 0 with the same recipe count as before (`[build] loaded 20 recipes` line).

- [ ] **Step 4: Commit**

```bash
git add src/fsl.tools/site/scripts/build.cjs
git commit -m "feat(cookbook): FSL blocks highlighted by the jssm/fence parity pipeline; hand-rolled fsl flavour removed"
```

---

### Task 13: Full gates + wrap-up

**Files:** none new.

- [ ] **Step 1: Full spec suite with coverage**

Run: `npx vitest run --config vitest.spec.config.ts`
Expected: all tests pass, **100%** statements/branches/functions/lines. Uncovered branches in the new modules are almost always (a) an unreachable defensive guard — delete it, or (b) a real untested path — test it. Do not add `/* istanbul ignore */`.

- [ ] **Step 2: Typecheck + diagnostics**

Run: `npx tsc --noEmit -p .` (or the repo's `vet` script: `npm run vet`)
Expected: clean. Then check IDE diagnostics (`mcp__ide__getDiagnostics`) on every new/modified file.

- [ ] **Step 3: Full make**

Run: `npm run make` (Bash tool)
Expected: exit 0; `dist/fence/fence.js` present and importable.

- [ ] **Step 4: Commit any straggler fixes**

```bash
git add -A
git commit -m "test(fence): close coverage gaps from the full gate run"
```

(Only if the gates forced changes; otherwise skip.)

**NOT in this plan (deliberate):** version bump + full `npm run build` + PR — that is `/sc-commit` on this branch, run from the main session at PR time per standing policy. The final whole-branch review happens before that, per subagent-driven-development.
