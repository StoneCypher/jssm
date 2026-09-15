
/**
 *  FSL string model (megaspec §8) — pure, host-agnostic string operations
 *  over three addressing units: **byte** (UTF-8), **code point** (the default
 *  unit for length / index / slice), and **extended grapheme cluster** (the
 *  opt-in unit, the FSL `+` suffix in source).
 *
 *  Everything here is a free, side-effect-free function on JS strings and byte
 *  arrays — no parser, no runtime, no machine coupling — so the same code
 *  defines the semantics whether it runs in the compiler, a host runtime, or
 *  the conformance suite.  The grapheme segmenter is implemented in-module
 *  against a bundled Unicode property classifier rather than the host
 *  `Intl.Segmenter`, so results are deterministic and locked to the shipped
 *  Unicode version (§8: "deterministic via bundled tables") instead of
 *  varying by host ICU build.
 *
 *  Index conventions follow §8: indices and slice bounds count in the chosen
 *  unit, and **negative indices count from the back** (Python-style): `-1` is
 *  the last element, and a slice `[lo : hi]` is half-open `[lo, hi)`.
 */


// ---------------------------------------------------------------------------
//  Shared index normalisation
// ---------------------------------------------------------------------------

/**
 *  Resolve a possibly-negative single index against a sequence length to a
 *  non-negative position, or `undefined` when it falls outside `0 .. len-1`.
 *  Negative values count from the back (`-1` ⇒ `len - 1`), per §8.
 *  @param index  The requested position; may be negative.
 *  @param len    The length of the sequence being indexed, in the same unit.
 *  @returns      The resolved in-range position, or `undefined` if out of range.
 *  @example
 *    resolve_index(0, 5)    // → 0
 *    resolve_index(-1, 5)   // → 4
 *    resolve_index(5, 5)    // → undefined  (out of range)
 *    resolve_index(-6, 5)   // → undefined  (out of range)
 */
function resolve_index(index: number, len: number): number | undefined {

  const at = index < 0 ? len + index : index;
  return (at < 0 || at >= len) ? undefined : at;

}


/**
 *  Resolve a possibly-negative slice bound against a sequence length, clamped
 *  into `0 .. len`.  Unlike {@link resolve_index} a slice bound is allowed to
 *  land on `len` (the position just past the end), and out-of-range bounds
 *  clamp rather than fail — matching `s[lo : hi]` slicing in §8.
 *  @param bound  The requested slice bound; may be negative.
 *  @param len    The length of the sequence being sliced, in the same unit.
 *  @returns      The clamped bound in `0 .. len`.
 *  @example
 *    resolve_bound(2, 5)     // → 2
 *    resolve_bound(-1, 5)    // → 4
 *    resolve_bound(-99, 5)   // → 0   (clamped low)
 *    resolve_bound(99, 5)    // → 5   (clamped high)
 */
function resolve_bound(bound: number, len: number): number {

  const at = bound < 0 ? len + bound : bound;
  if (at < 0)   { return 0;   }
  if (at > len) { return len; }
  return at;

}


// ---------------------------------------------------------------------------
//  Code-point unit (the default unit for length / index / slice / iteration)
// ---------------------------------------------------------------------------

/**
 *  Split a string into its array of Unicode code points (the default §8
 *  addressing unit).  Astral characters (those beyond the BMP, encoded as a
 *  UTF-16 surrogate pair) become a single element; lone/unpaired surrogates
 *  are preserved verbatim as one element each.
 *  @param s  The source string.
 *  @returns  One string per code point, in order.
 *  @example
 *    to_codepoints('abc')   // → ['a', 'b', 'c']
 *    to_codepoints('a😀b')  // → ['a', '😀', 'b']   (the emoji is one element)
 */
function to_codepoints(s: string): Array<string> {

  return [...s];

}


/**
 *  Code-point length of a string — the §8 default for `length`.  Counts whole
 *  code points, so an astral character counts as 1 (not the 2 that `.length`
 *  reports for its surrogate pair).
 *  @param s  The source string.
 *  @returns  The number of code points.
 *  @example
 *    cp_length('abc')   // → 3
 *    cp_length('😀')    // → 1   (JS `'😀'.length` is 2)
 */
function cp_length(s: string): number {

  return to_codepoints(s).length;

}


/**
 *  Read the code point at `index` as its integer scalar value — the §8
 *  `getcp` operation.  Supports negative-from-the-back indexing; an
 *  out-of-range index yields `undefined`.
 *  @param s      The source string.
 *  @param index  Code-point position; negative counts from the back.
 *  @returns      The code point's integer value, or `undefined` if out of range.
 *  @example
 *    getcp('abc', 0)    // → 97   (U+0061)
 *    getcp('a😀', -1)   // → 128512  (U+1F600)
 *    getcp('abc', 9)    // → undefined
 */
function getcp(s: string, index: number): number | undefined {

  const cps = to_codepoints(s);
  const at  = resolve_index(index, cps.length);
  if (at === undefined) { return undefined; }
  return (cps[at]).codePointAt(0);

}


/**
 *  Read the code point at `index` as a one-code-point string — the §8 `getch`
 *  operation.  Supports negative-from-the-back indexing; an out-of-range index
 *  yields `undefined`.
 *  @param s      The source string.
 *  @param index  Code-point position; negative counts from the back.
 *  @returns      The single-code-point string, or `undefined` if out of range.
 *  @example
 *    getch('abc', 1)    // → 'b'
 *    getch('a😀', -1)   // → '😀'
 *    getch('abc', -9)   // → undefined
 */
function getch(s: string, index: number): string | undefined {

  const cps = to_codepoints(s);
  const at  = resolve_index(index, cps.length);
  if (at === undefined) { return undefined; }
  return cps[at];

}


/**
 *  Code-point substring / slice — the §8 `substring`/slice operation, indexing
 *  in code points with half-open `[lo, hi)` bounds and negative-from-the-back
 *  support.  Omitting `hi` slices to the end; bounds clamp into range.
 *  @param s   The source string.
 *  @param lo  Start bound (inclusive); negative counts from the back.
 *  @param hi  End bound (exclusive); negative counts from the back; defaults to the end.
 *  @returns   The sliced substring.
 *  @example
 *    cp_slice('hello', 1, 4)   // → 'ell'
 *    cp_slice('hello', 1, -1)  // → 'ell'   (drop first and last)
 *    cp_slice('a😀b', 1)       // → '😀b'   (hi omitted ⇒ to end)
 */
function cp_slice(s: string, lo: number, hi?: number): string {

  const cps     = to_codepoints(s);
  const lo_at   = resolve_bound(lo, cps.length);
  const hi_at   = resolve_bound(hi === undefined ? cps.length : hi, cps.length);
  if (hi_at <= lo_at) { return ''; }
  return cps.slice(lo_at, hi_at).join('');

}


/**
 *  Reverse a string by code point — the §8 `reverse` operation at the default
 *  unit.  Astral characters stay intact (their surrogate pair is not split),
 *  unlike a naive `.split('').reverse()`.
 *  @param s  The source string.
 *  @returns  The code-point-reversed string.
 *  @example
 *    cp_reverse('abc')   // → 'cba'
 *    cp_reverse('a😀b')  // → 'b😀a'   (emoji survives intact)
 */
function cp_reverse(s: string): string {

  return to_codepoints(s).reverse().join('');

}


/**
 *  Concatenate strings — the §8 `concat` operation (the `++` operator).
 *  @param parts  The strings to join, in order.
 *  @returns      The concatenation.
 *  @example
 *    concat('foo', 'bar')        // → 'foobar'
 *    concat('a', 'b', 'c')       // → 'abc'
 *    concat()                    // → ''
 */
function concat(...parts: Array<string>): string {

  return parts.join('');

}


// ---------------------------------------------------------------------------
//  Search predicates and literal split (§8 portable ops)
// ---------------------------------------------------------------------------

/**
 *  Test whether `s` begins with `prefix` — the §8 `startsWith` operation.
 *  @param s       The source string.
 *  @param prefix  The candidate prefix.
 *  @returns       `true` iff `s` begins with `prefix`.
 *  @example
 *    starts_with('hello', 'he')   // → true
 *    starts_with('hello', 'lo')   // → false
 */
function starts_with(s: string, prefix: string): boolean {

  return s.startsWith(prefix);

}


/**
 *  Test whether `s` ends with `suffix` — the §8 `endsWith` operation.
 *  @param s       The source string.
 *  @param suffix  The candidate suffix.
 *  @returns       `true` iff `s` ends with `suffix`.
 *  @example
 *    ends_with('hello', 'lo')   // → true
 *    ends_with('hello', 'he')   // → false
 */
function ends_with(s: string, suffix: string): boolean {

  return s.endsWith(suffix);

}


/**
 *  Test whether `needle` occurs anywhere in `s` — the §8 `includes` operation.
 *  @param s       The source string.
 *  @param needle  The substring to look for.
 *  @returns       `true` iff `needle` occurs in `s`.
 *  @example
 *    includes('hello', 'ell')   // → true
 *    includes('hello', 'xyz')   // → false
 *    includes('hello', '')      // → true   (empty needle always matches)
 */
function includes(s: string, needle: string): boolean {

  return s.includes(needle);

}


/**
 *  Find the **code-point** index of the first occurrence of `needle` in `s` —
 *  the §8 `find` operation.  Returns `undefined` when `needle` is absent.  The
 *  returned position counts in code points (not UTF-16 units), so it composes
 *  with the other code-point operations even across astral characters.
 *  @param s       The source string.
 *  @param needle  The substring to look for.
 *  @returns       The code-point index of the first match, or `undefined`.
 *  @example
 *    find('hello', 'l')     // → 2
 *    find('a😀b😀', 'b')    // → 2   (the emoji counts as one code point)
 *    find('hello', 'z')     // → undefined
 */
function find(s: string, needle: string): number | undefined {

  const utf16_at = s.indexOf(needle);
  if (utf16_at === -1) { return undefined; }
  // Convert the UTF-16 offset to a code-point offset by counting code points
  // in the prefix that precedes the match.
  return to_codepoints(s.slice(0, utf16_at)).length;

}


/**
 *  Split `s` on a **literal** separator — the §8 `split` operation (literal,
 *  not regex).  An empty separator splits into individual code points (astral
 *  characters stay whole), rather than into UTF-16 units.
 *  @param s    The source string.
 *  @param sep  The literal separator.
 *  @returns    The pieces between separators, in order.
 *  @example
 *    split('a,b,c', ',')   // → ['a', 'b', 'c']
 *    split('abc', '')      // → ['a', 'b', 'c']   (per-code-point)
 *    split('a😀b', '')     // → ['a', '😀', 'b']
 *    split('abc', 'x')     // → ['abc']
 */
function split(s: string, sep: string): Array<string> {

  if (sep === '') { return to_codepoints(s); }
  return s.split(sep);

}


// ---------------------------------------------------------------------------
//  Padding and trimming (§8 `pad*` and `trim*`)
// ---------------------------------------------------------------------------

/**
 *  Pad `s` on the left to a target **code-point** length — the §8 `padStart`
 *  operation.  When `s` is already at least `target` code points long it is
 *  returned unchanged.  The pad is repeated and then truncated to fit exactly,
 *  counting in code points so astral pad characters are never split.
 *  @param s       The source string.
 *  @param target  The desired total length in code points.
 *  @param pad     The pad unit (defaults to a single space); empty pad is a no-op.
 *  @returns       The left-padded string of length `max(target, cp_length(s))`.
 *  @example
 *    pad_start('7', 3)         // → '  7'
 *    pad_start('7', 3, '0')    // → '007'
 *    pad_start('foo', 2)       // → 'foo'   (already long enough)
 *    pad_start('x', 4, 'ab')   // → 'abax'
 */
function pad_start(s: string, target: number, pad: string = ' '): string {

  const have = cp_length(s);
  if (have >= target || pad === '') { return s; }
  const fill = build_padding(target - have, pad);
  return fill + s;

}


/**
 *  Pad `s` on the right to a target **code-point** length — the §8 `padEnd`
 *  operation.  Mirrors {@link pad_start} on the trailing side.
 *  @param s       The source string.
 *  @param target  The desired total length in code points.
 *  @param pad     The pad unit (defaults to a single space); empty pad is a no-op.
 *  @returns       The right-padded string of length `max(target, cp_length(s))`.
 *  @example
 *    pad_end('7', 3)        // → '7  '
 *    pad_end('7', 3, '0')   // → '700'
 *    pad_end('foo', 2)      // → 'foo'   (already long enough)
 */
function pad_end(s: string, target: number, pad: string = ' '): string {

  const have = cp_length(s);
  if (have >= target || pad === '') { return s; }
  const fill = build_padding(target - have, pad);
  return s + fill;

}


/**
 *  Build a padding string of exactly `count` code points by repeating `pad`
 *  and truncating.  A helper shared by {@link pad_start} and {@link pad_end};
 *  callers guarantee `count > 0` and a non-empty `pad`.
 *  @param count  The number of code points of padding required (> 0).
 *  @param pad    The non-empty pad unit to repeat.
 *  @returns      A string of exactly `count` code points.
 *  @example
 *    build_padding(5, 'ab')   // → 'ababa'
 *    build_padding(2, '0')    // → '00'
 */
function build_padding(count: number, pad: string): string {

  const unit  = to_codepoints(pad);
  const out: Array<string> = [];
  for (let i = 0; i < count; ++i) {
    out.push(unit[i % unit.length]);
  }
  return out.join('');

}


/**
 *  Strip leading and trailing whitespace — the §8 `trim` operation.  Uses the
 *  Unicode whitespace set (`String.prototype.trim`'s definition), stable across
 *  hosts for the BMP whitespace it covers.
 *  @param s  The source string.
 *  @returns  `s` with leading and trailing whitespace removed.
 *  @example
 *    trim('  hi  ')   // → 'hi'
 *    trim('hi')       // → 'hi'
 */
function trim(s: string): string {

  return s.trim();

}


/**
 *  Strip leading whitespace only — the §8 `trimStart` operation.
 *  @param s  The source string.
 *  @returns  `s` with leading whitespace removed.
 *  @example
 *    trim_start('  hi  ')   // → 'hi  '
 */
function trim_start(s: string): string {

  return s.trimStart();

}


/**
 *  Strip trailing whitespace only — the §8 `trimEnd` operation.
 *  @param s  The source string.
 *  @returns  `s` with trailing whitespace removed.
 *  @example
 *    trim_end('  hi  ')   // → '  hi'
 */
function trim_end(s: string): string {

  return s.trimEnd();

}


// ---------------------------------------------------------------------------
//  Byte unit (UTF-8) — §8 `getbyte` / `setbyte`
// ---------------------------------------------------------------------------

/**
 *  Encode a string to its UTF-8 byte sequence — the byte-view of §8.  Each
 *  element is a `uint8` (0..255).
 *  @param s  The source string.
 *  @returns  The UTF-8 bytes, in order.
 *  @example
 *    to_utf8_bytes('A')    // → [65]
 *    to_utf8_bytes('é')    // → [195, 169]      (U+00E9, two UTF-8 bytes)
 *    to_utf8_bytes('😀')   // → [240, 159, 152, 128]
 */
function to_utf8_bytes(s: string): Array<number> {

  return [...new TextEncoder().encode(s)];

}


/**
 *  Decode a UTF-8 byte sequence back to a string — the inverse of
 *  {@link to_utf8_bytes}.  Invalid byte sequences decode to the Unicode
 *  replacement character (`U+FFFD`), matching `TextDecoder`'s lossy behaviour.
 *  @param bytes  UTF-8 bytes (each `0..255`).
 *  @returns      The decoded string.
 *  @example
 *    from_utf8_bytes([65])                    // → 'A'
 *    from_utf8_bytes([195, 169])              // → 'é'
 *    from_utf8_bytes([240, 159, 152, 128])    // → '😀'
 */
function from_utf8_bytes(bytes: ReadonlyArray<number>): string {

  return new TextDecoder().decode(Uint8Array.from(bytes));

}


/**
 *  UTF-8 byte length of a string — the byte-unit `length`.
 *  @param s  The source string.
 *  @returns  The number of UTF-8 bytes.
 *  @example
 *    byte_length('A')    // → 1
 *    byte_length('é')    // → 2
 *    byte_length('😀')   // → 4
 */
function byte_length(s: string): number {

  return to_utf8_bytes(s).length;

}


/**
 *  Read the UTF-8 byte at `index` — the §8 `getbyte` operation.  Supports
 *  negative-from-the-back indexing; an out-of-range index yields `undefined`.
 *  @param s      The source string.
 *  @param index  Byte position; negative counts from the back.
 *  @returns      The `uint8` byte value, or `undefined` if out of range.
 *  @example
 *    getbyte('é', 0)    // → 195
 *    getbyte('é', -1)   // → 169
 *    getbyte('A', 5)    // → undefined
 */
function getbyte(s: string, index: number): number | undefined {

  const bytes = to_utf8_bytes(s);
  const at    = resolve_index(index, bytes.length);
  if (at === undefined) { return undefined; }
  return bytes[at];

}


/**
 *  Return a copy of `s`'s UTF-8 bytes with the byte at `index` replaced by
 *  `value` — the §8 `setbyte` operation.  Operates on the byte view: it mutates
 *  no input, returns the modified byte array, and does **not** re-decode (a
 *  single-byte edit can produce an invalid UTF-8 sequence, which is the
 *  caller's concern — bytes are the unit here).  Out-of-range `index` or a
 *  `value` outside `0..255` returns `undefined`.
 *  @param s      The source string (its UTF-8 bytes are the working buffer).
 *  @param index  Byte position to overwrite; negative counts from the back.
 *  @param value  The replacement `uint8` (`0..255`).
 *  @returns      The edited byte array, or `undefined` on a bad index or value.
 *  @example
 *    setbyte('A', 0, 66)        // → [66]              (the bytes for 'B')
 *    setbyte('AB', -1, 67)      // → [65, 67]          ('AC')
 *    setbyte('A', 0, 999)       // → undefined         (value out of 0..255)
 *    setbyte('A', 9, 66)        // → undefined         (index out of range)
 */
function setbyte(s: string, index: number, value: number): Array<number> | undefined {

  if (!Number.isSafeInteger(value) || value < 0 || value > 255) { return undefined; }
  const bytes = to_utf8_bytes(s);
  const at    = resolve_index(index, bytes.length);
  if (at === undefined) { return undefined; }
  bytes[at] = value;
  return bytes;

}


// ---------------------------------------------------------------------------
//  Normalisation and case-folding (§8: allowed on `finite`, locked to the
//  shipped Unicode version)
// ---------------------------------------------------------------------------

/**
 *  The four Unicode normalisation forms of §8's `normalize`.
 */
type NormalizationForm = 'NFC' | 'NFD' | 'NFKC' | 'NFKD';


/**
 *  Normalise a string to one of the four Unicode normalisation forms — the §8
 *  `normalize` operation.  Locked to the host's bundled Unicode tables; on
 *  `finite` machines this is deterministic against the shipped Unicode version.
 *  @param s     The source string.
 *  @param form  The target form (defaults to `NFC`).
 *  @returns     The normalised string.
 *  @example
 *    // 'é' as e + combining-acute (NFD) normalises to the single code point é (NFC):
 *    cp_length(normalize('é', 'NFC'))   // → 1
 *    cp_length(normalize('é', 'NFD'))   // → 2
 */
function normalize(s: string, form: NormalizationForm = 'NFC'): string {

  return s.normalize(form);

}


/**
 *  Lowercase a string — the lower side of §8's case-fold.  Locale-independent
 *  (the §8 `normalize`/case-fold tier is the non-locale one; locale-tailored
 *  casing stays rich/implementation-defined).
 *  @param s  The source string.
 *  @returns  The lowercased string.
 *  @example
 *    to_lower('HeLLo')   // → 'hello'
 *    to_lower('İ')       // → 'i̇'   (locale-independent, not Turkish-tailored)
 */
function to_lower(s: string): string {

  return s.toLowerCase();

}


/**
 *  Uppercase a string — the upper side of §8's case-fold.  Locale-independent,
 *  per the §8 split between portable casing and locale-tailored casing.
 *  @param s  The source string.
 *  @returns  The uppercased string.
 *  @example
 *    to_upper('HeLLo')   // → 'HELLO'
 *    to_upper('ß')       // → 'SS'   (the sharp-s expands)
 */
function to_upper(s: string): string {

  return s.toUpperCase();

}


/**
 *  Case-fold a string for caseless comparison — §8's case-fold.  Implemented as
 *  uppercase-then-lowercase, which collapses the common case distinctions
 *  (including `ß`/`SS`) more aggressively than a single `toLowerCase`, giving a
 *  stable key for case-insensitive equality.
 *  @param s  The source string.
 *  @returns  The folded string suitable as a caseless comparison key.
 *  @example
 *    case_fold('HELLO') === case_fold('hello')   // → true
 *    case_fold('ß')     === case_fold('SS')      // → true
 */
function case_fold(s: string): string {

  return s.toUpperCase().toLowerCase();

}


// ---------------------------------------------------------------------------
//  Extended grapheme clusters (§8 `+` unit) — self-contained UAX #29 segmenter
// ---------------------------------------------------------------------------

/**
 *  Grapheme_Cluster_Break property classes used by the UAX #29 break rules.
 *  `Other` is the implicit catch-all (`GB999`); `Extended_Pictographic` is the
 *  emoji class that GB11 keys on.  Modelled as a frozen constant object (rather
 *  than a TS `enum`) so it carries no transpiled reverse-mapping table — the
 *  values are plain integers and the object exists verbatim at runtime.
 *  @example
 *    GcbClass.Other   // → 0
 *    GcbClass.ZWJ     // → 5
 */
const GcbClass = {
  Other              :  0,
  CR                 :  1,
  LF                 :  2,
  Control            :  3,
  Extend             :  4,
  ZWJ                :  5,
  Regional_Indicator :  6,
  Prepend            :  7,
  SpacingMark        :  8,
  L                  :  9,
  V                  : 10,
  T                  : 11,
  LV                 : 12,
  LVT                : 13,
  Extended_Pictographic : 14
} as const;


/**
 *  A Grapheme_Cluster_Break class value — the integer behind any
 *  {@link GcbClass} member.
 */
type GcbClass = (typeof GcbClass)[keyof typeof GcbClass];


/**
 *  A half-open code-point range `[lo, hi]` (inclusive both ends) tagged with a
 *  Grapheme_Cluster_Break class.  The bundled classifier is a sorted array of
 *  these; everything not covered is {@link GcbClass.Other}.
 */
type GcbRange = readonly [lo: number, hi: number, cls: GcbClass];


/**
 *  Bundled Grapheme_Cluster_Break ranges (a compact subset of the Unicode
 *  character database sufficient for the rule-relevant classes: line
 *  terminators, combining/extend marks, ZWJ, regional indicators, Hangul
 *  jamo, and emoji pictographics).  Sorted ascending and non-overlapping so a
 *  binary search resolves a code point's class.  "Bundled tables" per §8 —
 *  the segmenter never consults the host locale.
 */
const GCB_RANGES: ReadonlyArray<GcbRange> = [
  [0x00_00, 0x00_09, GcbClass.Control],
  [0x00_0A, 0x00_0A, GcbClass.LF],
  [0x00_0B, 0x00_0C, GcbClass.Control],
  [0x00_0D, 0x00_0D, GcbClass.CR],
  [0x00_0E, 0x00_1F, GcbClass.Control],
  [0x00_7F, 0x00_9F, GcbClass.Control],
  [0x00_AD, 0x00_AD, GcbClass.Control],
  [0x03_00, 0x03_6F, GcbClass.Extend],      // combining diacritical marks
  [0x04_83, 0x04_89, GcbClass.Extend],
  [0x05_91, 0x05_BD, GcbClass.Extend],
  [0x06_10, 0x06_1A, GcbClass.Extend],
  [0x06_4B, 0x06_5F, GcbClass.Extend],
  [0x06_70, 0x06_70, GcbClass.Extend],
  [0x06_D6, 0x06_DC, GcbClass.Extend],
  [0x09_00, 0x09_02, GcbClass.Extend],      // Devanagari combining
  [0x09_3A, 0x09_3A, GcbClass.Extend],
  [0x09_3E, 0x09_40, GcbClass.SpacingMark], // Devanagari spacing marks (sample)
  [0x09_41, 0x09_48, GcbClass.Extend],
  [0x11_00, 0x11_5F, GcbClass.L],           // Hangul leading jamo
  [0x11_60, 0x11_A7, GcbClass.V],           // Hangul vowel jamo
  [0x11_A8, 0x11_FF, GcbClass.T],           // Hangul trailing jamo
  [0x20_0B, 0x20_0B, GcbClass.Control],     // zero-width space
  [0x20_0D, 0x20_0D, GcbClass.ZWJ],         // zero-width joiner
  [0x20_60, 0x20_64, GcbClass.Control],
  [0x26_1D, 0x26_1D, GcbClass.Extended_Pictographic],
  [0x26_00, 0x26_FF, GcbClass.Extended_Pictographic],
  [0x27_00, 0x27_BF, GcbClass.Extended_Pictographic],
  [0xAC_00, 0xD7_A3, GcbClass.LVT],         // Hangul syllable block (refined below)
  [0xFE_00, 0xFE_0F, GcbClass.Extend],      // variation selectors
  [0xFE_FF, 0xFE_FF, GcbClass.Control],
  [0x1_F0_00, 0x1_FA_FF, GcbClass.Extended_Pictographic], // emoji planes
  [0x1_F1_E6, 0x1_F1_FF, GcbClass.Regional_Indicator],    // regional indicators
  [0xE_01_00, 0xE_01_EF, GcbClass.Extend]     // variation selectors supplement
];


/**
 *  Classify a single code point into its Grapheme_Cluster_Break class via a
 *  binary search over {@link GCB_RANGES}, with two computed refinements applied
 *  on top of the coarse table: Hangul LV vs LVT syllables (the block was tabled
 *  as `LVT` for compactness), and regional indicators (which overlap the emoji
 *  plane range).  Anything uncovered is {@link GcbClass.Other}.
 *  @param cp  The code point to classify.
 *  @returns   Its Grapheme_Cluster_Break class.
 *  @example
 *    gcb_class(0x0061)    // → GcbClass.Other   ('a')
 *    gcb_class(0x0301)    // → GcbClass.Extend  (combining acute)
 *    gcb_class(0x1F1E6)   // → GcbClass.Regional_Indicator
 */
function gcb_class(cp: number): GcbClass {

  // Regional indicators sit inside the broad emoji-plane range, so resolve
  // them first.
  if (cp >= 0x1_F1_E6 && cp <= 0x1_F1_FF) { return GcbClass.Regional_Indicator; }

  // Hangul syllables: LV when the trailing-consonant index is 0, else LVT.
  if (cp >= 0xAC_00 && cp <= 0xD7_A3) {
    return ((cp - 0xAC_00) % 28 === 0) ? GcbClass.LV : GcbClass.LVT;
  }

  let lo = 0;
  let hi = GCB_RANGES.length - 1;
  while (lo <= hi) {
    const mid   = (lo + hi) >> 1;
    const range = GCB_RANGES[mid];
    if (cp < range[0])      { hi = mid - 1; }
    else if (cp > range[1]) { lo = mid + 1; }
    else                    { return range[2]; }
  }
  return GcbClass.Other;

}


/**
 *  GCB classes that force a break on either side (GB4 / GB5): Control, CR, LF.
 *  Hoisted to module level so {@link should_break}, which runs once per
 *  code-point boundary, allocates nothing per call.
 *  @see should_break
 */
const GCB_BREAK_AROUND: ReadonlySet<GcbClass> = new Set([GcbClass.Control, GcbClass.CR, GcbClass.LF]);


/**
 *  GCB classes that may follow Hangul `L` without a break (GB6): L, V, LV, LVT.
 *  Hoisted to module level so {@link should_break} allocates nothing per call.
 *  @see should_break
 */
const GCB_AFTER_L: ReadonlySet<GcbClass> = new Set([GcbClass.L, GcbClass.V, GcbClass.LV, GcbClass.LVT]);


/**
 *  Decide whether a UAX #29 grapheme-cluster boundary exists **between** two
 *  adjacent code points, given the break state carried along the string.  Pure
 *  in its arguments: it reads the left/right classes plus two pieces of carried
 *  context (the count of unbroken regional indicators to the left, and whether
 *  an unbroken `Extended_Pictographic Extend* ZWJ` run precedes the boundary)
 *  and returns whether to break.  Implements GB3–GB13 (GB1/GB2 are the
 *  string ends, handled by the caller).
 *  @param left          GCB class of the code point before the boundary.
 *  @param right         GCB class of the code point after the boundary.
 *  @param ri_run        Number of consecutive unbroken Regional_Indicators ending at `left`.
 *  @param emoji_zwj     True iff `left` is a ZWJ closing an unbroken pictographic run (for GB11).
 *  @returns             `true` to break between the two code points.
 *  @example
 *    // GB9: never break before an Extend (combining mark)
 *    should_break(GcbClass.Other, GcbClass.Extend, 0, false)   // → false
 *    // GB999: break between two ordinary letters
 *    should_break(GcbClass.Other, GcbClass.Other, 0, false)    // → true
 */
function should_break(left: GcbClass, right: GcbClass, ri_run: number, emoji_zwj: boolean): boolean {

  // GB3: CR × LF — never break inside a CRLF pair.
  if (left === GcbClass.CR && right === GcbClass.LF) { return false; }

  // GB4 / GB5: always break around Control / CR / LF (except the GB3 pair).
  if (GCB_BREAK_AROUND.has(left))  { return true; }
  if (GCB_BREAK_AROUND.has(right)) { return true; }

  // GB6 / GB7 / GB8: Hangul jamo sequences.
  if (left === GcbClass.L && GCB_AFTER_L.has(right)) { return false; }
  if ((left === GcbClass.LV || left === GcbClass.V) &&
      (right === GcbClass.V || right === GcbClass.T)) { return false; }
  if ((left === GcbClass.LVT || left === GcbClass.T) && right === GcbClass.T) { return false; }

  // GB9 / GB9a / GB9b: do not break before Extend / ZWJ / SpacingMark, nor after Prepend.
  if (right === GcbClass.Extend || right === GcbClass.ZWJ) { return false; }
  if (right === GcbClass.SpacingMark)                      { return false; }
  if (left === GcbClass.Prepend)                           { return false; }

  // GB11: within an emoji ZWJ sequence (pictographic Extend* ZWJ × pictographic).
  if (emoji_zwj && right === GcbClass.Extended_Pictographic) { return false; }

  // GB12 / GB13: do not break between an odd-positioned pair of regional indicators.
  if (left === GcbClass.Regional_Indicator && right === GcbClass.Regional_Indicator && (ri_run % 2 === 1)) {
    return false;
  }

  // GB999: otherwise break.
  return true;

}


/**
 *  Segment a string into its extended grapheme clusters — the §8 `+` unit.
 *  Self-contained UAX #29 segmenter driven by {@link gcb_class} and
 *  {@link should_break}, carrying the regional-indicator parity and the
 *  emoji-ZWJ-run state the rules need; deterministic against the bundled
 *  tables (no host `Intl.Segmenter`).
 *  @param s  The source string.
 *  @returns  One string per extended grapheme cluster, in order.
 *  @example
 *    to_graphemes('abc')          // → ['a', 'b', 'c']
 *    to_graphemes('é')      // → ['é']            (e + combining acute = one cluster)
 *    to_graphemes('🇺🇸')          // → ['🇺🇸']          (flag = one cluster)
 *    to_graphemes('👨‍👩')   // → ['👨‍👩']         (ZWJ sequence = one cluster)
 */
function to_graphemes(s: string): Array<string> {

  const cps = to_codepoints(s);
  if (cps.length === 0) { return []; }

  const clusters: Array<string> = [];
  let   current = cps[0];
  let   left    = gcb_class((current).codePointAt(0));

  // Carried context for GB11 (emoji ZWJ) and GB12/13 (regional-indicator parity).
  let   ri_run     = (left === GcbClass.Regional_Indicator) ? 1 : 0;
  let   pict_open  = (left === GcbClass.Extended_Pictographic);  // unbroken pictographic Extend* run
  let   emoji_zwj  = false;

  for (let i = 1; i < cps.length; ++i) {
    const ch    = cps[i];
    const right = gcb_class(ch.codePointAt(0));

    if (should_break(left, right, ri_run, emoji_zwj)) {
      clusters.push(current);
      current = ch;
    } else {
      current += ch;
    }

    // Advance carried state.
    if (right === GcbClass.Regional_Indicator) {
      ri_run = (left === GcbClass.Regional_Indicator) ? ri_run + 1 : 1;
    } else {
      ri_run = 0;
    }

    if (right === GcbClass.Extended_Pictographic)      { pict_open = true;  emoji_zwj = false; }
    else if (right === GcbClass.Extend && pict_open)   { /* stay open */     emoji_zwj = false; }
    else if (right === GcbClass.ZWJ && pict_open)      { emoji_zwj = true;                      }
    else                                               { pict_open = false; emoji_zwj = false;  }

    left = right;
  }

  clusters.push(current);
  return clusters;

}


/**
 *  Grapheme-cluster length of a string — `length` at the §8 `+` unit.
 *  @param s  The source string.
 *  @returns  The number of extended grapheme clusters.
 *  @example
 *    grapheme_length('abc')       // → 3
 *    grapheme_length('é')   // → 1
 *    grapheme_length('🇺🇸')       // → 1
 */
function grapheme_length(s: string): number {

  return to_graphemes(s).length;

}


/**
 *  Read the grapheme cluster at `index` — index at the §8 `+` unit (`s[3+]`).
 *  Supports negative-from-the-back indexing; out of range yields `undefined`.
 *  @param s      The source string.
 *  @param index  Grapheme position; negative counts from the back.
 *  @returns      The grapheme-cluster string, or `undefined` if out of range.
 *  @example
 *    grapheme_at('a🇺🇸b', 1)    // → '🇺🇸'
 *    grapheme_at('abc', -1)     // → 'c'
 *    grapheme_at('abc', 9)      // → undefined
 */
function grapheme_at(s: string, index: number): string | undefined {

  const gs = to_graphemes(s);
  const at = resolve_index(index, gs.length);
  if (at === undefined) { return undefined; }
  return gs[at];

}


/**
 *  Grapheme-cluster slice — slice at the §8 `+` unit (`s[0 : 5+]`), with
 *  half-open `[lo, hi)` bounds and negative-from-the-back support.  Omitting
 *  `hi` slices to the end; bounds clamp into range.
 *  @param s   The source string.
 *  @param lo  Start bound (inclusive); negative counts from the back.
 *  @param hi  End bound (exclusive); negative counts from the back; defaults to the end.
 *  @returns   The sliced substring (clusters re-joined).
 *  @example
 *    grapheme_slice('a🇺🇸b', 0, 2)   // → 'a🇺🇸'
 *    grapheme_slice('abc', 1)        // → 'bc'
 *    grapheme_slice('abc', 1, -1)    // → 'b'
 */
function grapheme_slice(s: string, lo: number, hi?: number): string {

  const gs    = to_graphemes(s);
  const lo_at = resolve_bound(lo, gs.length);
  const hi_at = resolve_bound(hi === undefined ? gs.length : hi, gs.length);
  if (hi_at <= lo_at) { return ''; }
  return gs.slice(lo_at, hi_at).join('');

}


/**
 *  Reverse a string by grapheme cluster — `reverse` at the §8 `+` unit.  Unlike
 *  {@link cp_reverse}, this keeps multi-code-point clusters (combining
 *  sequences, flags, emoji ZWJ sequences) intact and in internal order.
 *  @param s  The source string.
 *  @returns  The grapheme-reversed string.
 *  @example
 *    grapheme_reverse('abc')           // → 'cba'
 *    grapheme_reverse('a🇺🇸b')         // → 'b🇺🇸a'   (flag stays whole)
 *    grapheme_reverse('éx')      // → 'xé'       (the combining é survives)
 */
function grapheme_reverse(s: string): string {

  return to_graphemes(s).reverse().join('');

}


// ---------------------------------------------------------------------------
//  Exports
// ---------------------------------------------------------------------------

export {

  // index helpers
  resolve_index,
  resolve_bound,

  // code-point unit
  to_codepoints,
  cp_length,
  getcp,
  getch,
  cp_slice,
  cp_reverse,
  concat,

  // search / split
  starts_with,
  ends_with,
  includes,
  find,
  split,

  // pad / trim
  pad_start,
  pad_end,
  build_padding,
  trim,
  trim_start,
  trim_end,

  // byte unit
  to_utf8_bytes,
  from_utf8_bytes,
  byte_length,
  getbyte,
  setbyte,

  // normalise / case
  normalize,
  to_lower,
  to_upper,
  case_fold,

  // grapheme unit
  gcb_class,
  should_break,
  to_graphemes,
  grapheme_length,
  grapheme_at,
  grapheme_slice,
  grapheme_reverse

};

export type { NormalizationForm, GcbRange };
export { GcbClass };
