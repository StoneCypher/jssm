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
declare function resolve_index(index: number, len: number): number | undefined;
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
declare function resolve_bound(bound: number, len: number): number;
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
declare function to_codepoints(s: string): Array<string>;
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
declare function cp_length(s: string): number;
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
declare function getcp(s: string, index: number): number | undefined;
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
declare function getch(s: string, index: number): string | undefined;
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
declare function cp_slice(s: string, lo: number, hi?: number): string;
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
declare function cp_reverse(s: string): string;
/**
 *  Concatenate strings — the §8 `concat` operation (the `++` operator).
 *  @param parts  The strings to join, in order.
 *  @returns      The concatenation.
 *  @example
 *    concat('foo', 'bar')        // → 'foobar'
 *    concat('a', 'b', 'c')       // → 'abc'
 *    concat()                    // → ''
 */
declare function concat(...parts: Array<string>): string;
/**
 *  Test whether `s` begins with `prefix` — the §8 `startsWith` operation.
 *  @param s       The source string.
 *  @param prefix  The candidate prefix.
 *  @returns       `true` iff `s` begins with `prefix`.
 *  @example
 *    starts_with('hello', 'he')   // → true
 *    starts_with('hello', 'lo')   // → false
 */
declare function starts_with(s: string, prefix: string): boolean;
/**
 *  Test whether `s` ends with `suffix` — the §8 `endsWith` operation.
 *  @param s       The source string.
 *  @param suffix  The candidate suffix.
 *  @returns       `true` iff `s` ends with `suffix`.
 *  @example
 *    ends_with('hello', 'lo')   // → true
 *    ends_with('hello', 'he')   // → false
 */
declare function ends_with(s: string, suffix: string): boolean;
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
declare function includes(s: string, needle: string): boolean;
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
declare function find(s: string, needle: string): number | undefined;
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
declare function split(s: string, sep: string): Array<string>;
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
declare function pad_start(s: string, target: number, pad?: string): string;
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
declare function pad_end(s: string, target: number, pad?: string): string;
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
declare function build_padding(count: number, pad: string): string;
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
declare function trim(s: string): string;
/**
 *  Strip leading whitespace only — the §8 `trimStart` operation.
 *  @param s  The source string.
 *  @returns  `s` with leading whitespace removed.
 *  @example
 *    trim_start('  hi  ')   // → 'hi  '
 */
declare function trim_start(s: string): string;
/**
 *  Strip trailing whitespace only — the §8 `trimEnd` operation.
 *  @param s  The source string.
 *  @returns  `s` with trailing whitespace removed.
 *  @example
 *    trim_end('  hi  ')   // → '  hi'
 */
declare function trim_end(s: string): string;
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
declare function to_utf8_bytes(s: string): Array<number>;
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
declare function from_utf8_bytes(bytes: ReadonlyArray<number>): string;
/**
 *  UTF-8 byte length of a string — the byte-unit `length`.
 *  @param s  The source string.
 *  @returns  The number of UTF-8 bytes.
 *  @example
 *    byte_length('A')    // → 1
 *    byte_length('é')    // → 2
 *    byte_length('😀')   // → 4
 */
declare function byte_length(s: string): number;
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
declare function getbyte(s: string, index: number): number | undefined;
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
declare function setbyte(s: string, index: number, value: number): Array<number> | undefined;
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
declare function normalize(s: string, form?: NormalizationForm): string;
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
declare function to_lower(s: string): string;
/**
 *  Uppercase a string — the upper side of §8's case-fold.  Locale-independent,
 *  per the §8 split between portable casing and locale-tailored casing.
 *  @param s  The source string.
 *  @returns  The uppercased string.
 *  @example
 *    to_upper('HeLLo')   // → 'HELLO'
 *    to_upper('ß')       // → 'SS'   (the sharp-s expands)
 */
declare function to_upper(s: string): string;
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
declare function case_fold(s: string): string;
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
declare const GcbClass: {
    readonly Other: 0;
    readonly CR: 1;
    readonly LF: 2;
    readonly Control: 3;
    readonly Extend: 4;
    readonly ZWJ: 5;
    readonly Regional_Indicator: 6;
    readonly Prepend: 7;
    readonly SpacingMark: 8;
    readonly L: 9;
    readonly V: 10;
    readonly T: 11;
    readonly LV: 12;
    readonly LVT: 13;
    readonly Extended_Pictographic: 14;
};
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
declare function gcb_class(cp: number): GcbClass;
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
declare function should_break(left: GcbClass, right: GcbClass, ri_run: number, emoji_zwj: boolean): boolean;
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
declare function to_graphemes(s: string): Array<string>;
/**
 *  Grapheme-cluster length of a string — `length` at the §8 `+` unit.
 *  @param s  The source string.
 *  @returns  The number of extended grapheme clusters.
 *  @example
 *    grapheme_length('abc')       // → 3
 *    grapheme_length('é')   // → 1
 *    grapheme_length('🇺🇸')       // → 1
 */
declare function grapheme_length(s: string): number;
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
declare function grapheme_at(s: string, index: number): string | undefined;
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
declare function grapheme_slice(s: string, lo: number, hi?: number): string;
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
declare function grapheme_reverse(s: string): string;
export { resolve_index, resolve_bound, to_codepoints, cp_length, getcp, getch, cp_slice, cp_reverse, concat, starts_with, ends_with, includes, find, split, pad_start, pad_end, build_padding, trim, trim_start, trim_end, to_utf8_bytes, from_utf8_bytes, byte_length, getbyte, setbyte, normalize, to_lower, to_upper, case_fold, gcb_class, should_break, to_graphemes, grapheme_length, grapheme_at, grapheme_slice, grapheme_reverse };
export type { NormalizationForm, GcbRange };
export { GcbClass };
