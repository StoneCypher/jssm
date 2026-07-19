
import {
  resolve_index, resolve_bound,
  to_codepoints, cp_length, getcp, getch, cp_slice, cp_reverse, concat,
  starts_with, ends_with, includes, find, split,
  pad_start, pad_end, build_padding, trim, trim_start, trim_end,
  to_utf8_bytes, from_utf8_bytes, byte_length, getbyte, setbyte,
  normalize, to_lower, to_upper, case_fold,
  gcb_class, should_break, to_graphemes, grapheme_length, grapheme_at,
  grapheme_slice, grapheme_reverse,
  GcbClass
} from '../fsl_strings';



// A few shared fixtures.  `E_ACUTE_NFD` is 'e' + combining acute (two code
// points, one grapheme); `FLAG_US` is two regional indicators (one grapheme);
// `FAMILY` is a man+ZWJ+woman emoji ZWJ sequence (one grapheme).
const E_ACUTE_NFD = 'é';
const FLAG_US     = '\u{1F1FA}\u{1F1F8}';
const FAMILY      = '\u{1F468}‍\u{1F469}';



describe('resolve_index', () => {

  test('positive in-range index passes through', () => {
    expect( resolve_index(0, 5) ).toBe(0);
    expect( resolve_index(4, 5) ).toBe(4);
  });

  test('negative index counts from the back', () => {
    expect( resolve_index(-1, 5) ).toBe(4);
    expect( resolve_index(-5, 5) ).toBe(0);
  });

  test('out-of-range high returns undefined', () => {
    expect( resolve_index(5, 5) ).toBeUndefined();
  });

  test('out-of-range low (over-negative) returns undefined', () => {
    expect( resolve_index(-6, 5) ).toBeUndefined();
  });

});



describe('resolve_bound', () => {

  test('positive in-range bound passes through', () => {
    expect( resolve_bound(2, 5) ).toBe(2);
    expect( resolve_bound(5, 5) ).toBe(5);   // len is a legal bound
  });

  test('negative bound counts from the back', () => {
    expect( resolve_bound(-1, 5) ).toBe(4);
  });

  test('under-range bound clamps to 0', () => {
    expect( resolve_bound(-99, 5) ).toBe(0);
  });

  test('over-range bound clamps to len', () => {
    expect( resolve_bound(99, 5) ).toBe(5);
  });

});



describe('code-point unit', () => {

  test('to_codepoints splits astral chars as single elements', () => {
    expect( to_codepoints('abc') ).toEqual(['a', 'b', 'c']);
    expect( to_codepoints('a\u{1F600}b') ).toEqual(['a', '\u{1F600}', 'b']);
    expect( to_codepoints('') ).toEqual([]);
  });

  test('cp_length counts code points not UTF-16 units', () => {
    expect( cp_length('abc') ).toBe(3);
    expect( cp_length('\u{1F600}') ).toBe(1);
    expect( '\u{1F600}'.length ).toBe(2);   // contrast with JS .length
  });

  test('getcp returns scalar value or undefined', () => {
    expect( getcp('abc', 0) ).toBe(0x61);
    expect( getcp('a\u{1F600}', -1) ).toBe(0x1_F6_00);
    expect( getcp('abc', 9) ).toBeUndefined();
  });

  test('getch returns a one-code-point string or undefined', () => {
    expect( getch('abc', 1) ).toBe('b');
    expect( getch('a\u{1F600}', -1) ).toBe('\u{1F600}');
    expect( getch('abc', -9) ).toBeUndefined();
  });

  test('cp_slice with both bounds', () => {
    expect( cp_slice('hello', 1, 4) ).toBe('ell');
  });

  test('cp_slice with negative end bound', () => {
    expect( cp_slice('hello', 1, -1) ).toBe('ell');
  });

  test('cp_slice with omitted end slices to the end', () => {
    expect( cp_slice('a\u{1F600}b', 1) ).toBe('\u{1F600}b');
  });

  test('cp_slice returns empty when hi <= lo', () => {
    expect( cp_slice('hello', 3, 1) ).toBe('');
    expect( cp_slice('hello', 2, 2) ).toBe('');
  });

  test('cp_reverse keeps astral chars intact', () => {
    expect( cp_reverse('abc') ).toBe('cba');
    expect( cp_reverse('a\u{1F600}b') ).toBe('b\u{1F600}a');
  });

  test('concat joins, including the zero-argument case', () => {
    expect( concat('foo', 'bar') ).toBe('foobar');
    expect( concat('a', 'b', 'c') ).toBe('abc');
    expect( concat() ).toBe('');
  });

});



describe('search predicates and split', () => {

  test('starts_with', () => {
    expect( starts_with('hello', 'he') ).toBe(true);
    expect( starts_with('hello', 'lo') ).toBe(false);
  });

  test('ends_with', () => {
    expect( ends_with('hello', 'lo') ).toBe(true);
    expect( ends_with('hello', 'he') ).toBe(false);
  });

  test('includes', () => {
    expect( includes('hello', 'ell') ).toBe(true);
    expect( includes('hello', 'xyz') ).toBe(false);
    expect( includes('hello', '') ).toBe(true);
  });

  test('find returns code-point index or undefined', () => {
    expect( find('hello', 'l') ).toBe(2);
    expect( find('hello', 'z') ).toBeUndefined();
  });

  test('find counts in code points across astral chars', () => {
    expect( find('a\u{1F600}b\u{1F600}', 'b') ).toBe(2);
  });

  test('split on a literal separator', () => {
    expect( split('a,b,c', ',') ).toEqual(['a', 'b', 'c']);
    expect( split('abc', 'x') ).toEqual(['abc']);
  });

  test('split on empty separator yields code points', () => {
    expect( split('abc', '') ).toEqual(['a', 'b', 'c']);
    expect( split('a\u{1F600}b', '') ).toEqual(['a', '\u{1F600}', 'b']);
  });

});



describe('pad and trim', () => {

  test('pad_start with default and custom pad', () => {
    expect( pad_start('7', 3) ).toBe('  7');
    expect( pad_start('7', 3, '0') ).toBe('007');
  });

  test('pad_start is a no-op when already long enough', () => {
    expect( pad_start('foo', 2) ).toBe('foo');
  });

  test('pad_start with empty pad is a no-op', () => {
    expect( pad_start('7', 5, '') ).toBe('7');
  });

  test('pad_start truncates a multi-char pad to fit', () => {
    expect( pad_start('x', 4, 'ab') ).toBe('abax');
  });

  test('pad_end with default and custom pad', () => {
    expect( pad_end('7', 3) ).toBe('7  ');
    expect( pad_end('7', 3, '0') ).toBe('700');
  });

  test('pad_end is a no-op when already long enough', () => {
    expect( pad_end('foo', 2) ).toBe('foo');
  });

  test('pad_end with empty pad is a no-op', () => {
    expect( pad_end('7', 5, '') ).toBe('7');
  });

  test('build_padding repeats and truncates by code point', () => {
    expect( build_padding(5, 'ab') ).toBe('ababa');
    expect( build_padding(2, '0') ).toBe('00');
  });

  test('trim variants', () => {
    expect( trim('  hi  ') ).toBe('hi');
    expect( trim_start('  hi  ') ).toBe('hi  ');
    expect( trim_end('  hi  ') ).toBe('  hi');
  });

});



describe('byte unit (UTF-8)', () => {

  test('to_utf8_bytes encodes ASCII, two-byte and four-byte forms', () => {
    expect( to_utf8_bytes('A') ).toEqual([65]);
    expect( to_utf8_bytes('é') ).toEqual([195, 169]);
    expect( to_utf8_bytes('\u{1F600}') ).toEqual([240, 159, 152, 128]);
  });

  test('from_utf8_bytes round-trips', () => {
    expect( from_utf8_bytes([65]) ).toBe('A');
    expect( from_utf8_bytes([195, 169]) ).toBe('é');
    expect( from_utf8_bytes([240, 159, 152, 128]) ).toBe('\u{1F600}');
  });

  test('byte_length', () => {
    expect( byte_length('A') ).toBe(1);
    expect( byte_length('é') ).toBe(2);
    expect( byte_length('\u{1F600}') ).toBe(4);
  });

  test('getbyte returns the byte or undefined', () => {
    expect( getbyte('é', 0) ).toBe(195);
    expect( getbyte('é', -1) ).toBe(169);
    expect( getbyte('A', 5) ).toBeUndefined();
  });

  test('setbyte replaces a byte and returns a new array', () => {
    expect( setbyte('A', 0, 66) ).toEqual([66]);
    expect( setbyte('AB', -1, 67) ).toEqual([65, 67]);
  });

  test('setbyte does not mutate the input string', () => {
    const s = 'A';
    setbyte(s, 0, 66);
    expect( s ).toBe('A');
  });

  test('setbyte rejects a non-integer value', () => {
    expect( setbyte('A', 0, 1.5) ).toBeUndefined();
  });

  test('setbyte rejects a value below 0', () => {
    expect( setbyte('A', 0, -1) ).toBeUndefined();
  });

  test('setbyte rejects a value above 255', () => {
    expect( setbyte('A', 0, 999) ).toBeUndefined();
  });

  test('setbyte rejects an out-of-range index', () => {
    expect( setbyte('A', 9, 66) ).toBeUndefined();
  });

});



describe('normalize and case-fold', () => {

  test('normalize composes and decomposes', () => {
    expect( cp_length(normalize(E_ACUTE_NFD, 'NFC')) ).toBe(1);
    expect( cp_length(normalize(E_ACUTE_NFD, 'NFD')) ).toBe(2);
  });

  test('normalize defaults to NFC', () => {
    expect( cp_length(normalize(E_ACUTE_NFD)) ).toBe(1);
  });

  test('to_lower and to_upper', () => {
    expect( to_lower('HeLLo') ).toBe('hello');
    expect( to_upper('HeLLo') ).toBe('HELLO');
    expect( to_upper('ß') ).toBe('SS');   // sharp-s expands
  });

  test('case_fold collapses case distinctions for caseless equality', () => {
    expect( case_fold('HELLO') ).toBe( case_fold('hello') );
    expect( case_fold('ß') ).toBe( case_fold('SS') );
  });

});



describe('gcb_class', () => {

  test('ordinary letters are Other (binary-search miss)', () => {
    expect( gcb_class(0x61) ).toBe(GcbClass.Other);
  });

  test('combining mark is Extend (binary-search hit)', () => {
    expect( gcb_class(0x03_01) ).toBe(GcbClass.Extend);
  });

  test('regional indicator resolves ahead of the emoji-plane range', () => {
    expect( gcb_class(0x1_F1_E6) ).toBe(GcbClass.Regional_Indicator);
  });

  test('Hangul LV vs LVT split is computed', () => {
    expect( gcb_class(0xAC_00) ).toBe(GcbClass.LV);    // 가  (no trailing consonant)
    expect( gcb_class(0xAC_01) ).toBe(GcbClass.LVT);   // 각  (has a trailing consonant)
  });

  test('line terminators classify correctly', () => {
    expect( gcb_class(0x0D) ).toBe(GcbClass.CR);
    expect( gcb_class(0x0A) ).toBe(GcbClass.LF);
    expect( gcb_class(0x09) ).toBe(GcbClass.Control);
  });

  test('a code point below every range is Other (search runs off the low end)', () => {
    // Nothing classifies code point 0? — 0x0000 is Control; pick a gap value
    // above the last range to exercise the high-side miss too.
    expect( gcb_class(0x10_FF_FF) ).toBe(GcbClass.Other);
  });

  test('ZWJ and pictographic classify', () => {
    expect( gcb_class(0x20_0D) ).toBe(GcbClass.ZWJ);
    expect( gcb_class(0x1_F6_00) ).toBe(GcbClass.Extended_Pictographic);
  });

  test('Hangul jamo L / V / T classify', () => {
    expect( gcb_class(0x11_00) ).toBe(GcbClass.L);
    expect( gcb_class(0x11_60) ).toBe(GcbClass.V);
    expect( gcb_class(0x11_A8) ).toBe(GcbClass.T);
  });

});



describe('should_break (UAX #29 rules in isolation)', () => {

  test('GB3: no break inside CRLF', () => {
    expect( should_break(GcbClass.CR, GcbClass.LF, 0, false) ).toBe(false);
  });

  test('GB4: break after Control / CR / LF', () => {
    expect( should_break(GcbClass.Control, GcbClass.Other, 0, false) ).toBe(true);
    expect( should_break(GcbClass.LF, GcbClass.Other, 0, false) ).toBe(true);
  });

  test('GB5: break before Control / CR / LF', () => {
    expect( should_break(GcbClass.Other, GcbClass.Control, 0, false) ).toBe(true);
    expect( should_break(GcbClass.Other, GcbClass.CR, 0, false) ).toBe(true);
  });

  test('GB6: L joins each of L / V / LV / LVT', () => {
    expect( should_break(GcbClass.L, GcbClass.L,   0, false) ).toBe(false);
    expect( should_break(GcbClass.L, GcbClass.V,   0, false) ).toBe(false);
    expect( should_break(GcbClass.L, GcbClass.LV,  0, false) ).toBe(false);
    expect( should_break(GcbClass.L, GcbClass.LVT, 0, false) ).toBe(false);
  });

  test('GB7: V/LV join V or T', () => {
    expect( should_break(GcbClass.LV, GcbClass.V, 0, false) ).toBe(false);
    expect( should_break(GcbClass.V,  GcbClass.T, 0, false) ).toBe(false);
  });

  test('GB8: T/LVT join T', () => {
    expect( should_break(GcbClass.LVT, GcbClass.T, 0, false) ).toBe(false);
    expect( should_break(GcbClass.T,   GcbClass.T, 0, false) ).toBe(false);
  });

  test('GB9: no break before Extend or ZWJ', () => {
    expect( should_break(GcbClass.Other, GcbClass.Extend, 0, false) ).toBe(false);
    expect( should_break(GcbClass.Other, GcbClass.ZWJ, 0, false) ).toBe(false);
  });

  test('GB9a: no break before SpacingMark', () => {
    expect( should_break(GcbClass.Other, GcbClass.SpacingMark, 0, false) ).toBe(false);
  });

  test('GB9b: no break after Prepend', () => {
    expect( should_break(GcbClass.Prepend, GcbClass.Other, 0, false) ).toBe(false);
  });

  test('GB11: no break in an emoji ZWJ sequence when carried open', () => {
    expect( should_break(GcbClass.ZWJ, GcbClass.Extended_Pictographic, 0, true) ).toBe(false);
    // ...but a ZWJ that did not close a pictographic run does break here:
    expect( should_break(GcbClass.ZWJ, GcbClass.Extended_Pictographic, 0, false) ).toBe(true);
  });

  test('GB12/13: regional-indicator pairing by parity', () => {
    expect( should_break(GcbClass.Regional_Indicator, GcbClass.Regional_Indicator, 1, false) ).toBe(false);
    expect( should_break(GcbClass.Regional_Indicator, GcbClass.Regional_Indicator, 2, false) ).toBe(true);
  });

  test('GB999: otherwise break', () => {
    expect( should_break(GcbClass.Other, GcbClass.Other, 0, false) ).toBe(true);
  });

});



describe('grapheme unit', () => {

  test('to_graphemes on an empty string', () => {
    expect( to_graphemes('') ).toEqual([]);
  });

  test('to_graphemes on plain ASCII', () => {
    expect( to_graphemes('abc') ).toEqual(['a', 'b', 'c']);
  });

  test('to_graphemes keeps a combining sequence as one cluster', () => {
    expect( to_graphemes(E_ACUTE_NFD) ).toEqual([E_ACUTE_NFD]);
  });

  test('to_graphemes keeps a regional-indicator flag as one cluster', () => {
    expect( to_graphemes(FLAG_US) ).toEqual([FLAG_US]);
  });

  test('to_graphemes splits two adjacent flags into two clusters', () => {
    const two = FLAG_US + FLAG_US;
    expect( to_graphemes(two) ).toEqual([FLAG_US, FLAG_US]);
  });

  test('to_graphemes keeps an emoji ZWJ sequence as one cluster', () => {
    expect( to_graphemes(FAMILY) ).toEqual([FAMILY]);
  });

  test('to_graphemes handles CRLF as one cluster', () => {
    expect( to_graphemes('\r\n') ).toEqual(['\r\n']);
  });

  test('to_graphemes breaks a pictographic followed by an ordinary letter', () => {
    expect( to_graphemes('\u{1F600}a') ).toEqual(['\u{1F600}', 'a']);
  });

  test('to_graphemes keeps a pictographic + variation-selector together', () => {
    // U+261D (pointing-up) + U+FE0F (variation selector, an Extend) is one
    // cluster — exercises the "pictographic run stays open across Extend" path.
    expect( to_graphemes('\u{261D}\u{FE0F}') ).toEqual(['\u{261D}\u{FE0F}']);
  });

  test('to_graphemes: a non-emoji ZWJ joins to its left but breaks on its right', () => {
    // GB9 keeps 'a' + ZWJ together (no break before ZWJ), but because that ZWJ
    // did not close a pictographic run, GB11 does not apply and GB999 breaks
    // before 'b'.  Covers the non-emoji ZWJ carried-state path.
    expect( to_graphemes('a\u{200D}b') ).toEqual(['a\u{200D}', 'b']);
  });

  test('to_graphemes keeps a Hangul LVT+T syllable run together', () => {
    expect( to_graphemes('각') ).toEqual(['각']);
  });

  test('grapheme_length', () => {
    expect( grapheme_length('abc') ).toBe(3);
    expect( grapheme_length(E_ACUTE_NFD) ).toBe(1);
    expect( grapheme_length(FLAG_US) ).toBe(1);
  });

  test('grapheme_at with positive, negative and out-of-range indices', () => {
    expect( grapheme_at('a' + FLAG_US + 'b', 1) ).toBe(FLAG_US);
    expect( grapheme_at('abc', -1) ).toBe('c');
    expect( grapheme_at('abc', 9) ).toBeUndefined();
  });

  test('grapheme_slice with bounds, omitted end, and negative end', () => {
    expect( grapheme_slice('a' + FLAG_US + 'b', 0, 2) ).toBe('a' + FLAG_US);
    expect( grapheme_slice('abc', 1) ).toBe('bc');
    expect( grapheme_slice('abc', 1, -1) ).toBe('b');
  });

  test('grapheme_slice returns empty when hi <= lo', () => {
    expect( grapheme_slice('abc', 2, 1) ).toBe('');
  });

  test('grapheme_reverse keeps clusters whole', () => {
    expect( grapheme_reverse('abc') ).toBe('cba');
    expect( grapheme_reverse('a' + FLAG_US + 'b') ).toBe('b' + FLAG_US + 'a');
    expect( grapheme_reverse(E_ACUTE_NFD + 'x') ).toBe('x' + E_ACUTE_NFD);
  });

});
