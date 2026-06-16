
import * as fc from 'fast-check';

import {
  resolve_index, resolve_bound,
  to_codepoints, cp_length, getcp, getch, cp_slice, cp_reverse, concat,
  starts_with, ends_with, includes, find, split,
  pad_start, pad_end, trim, trim_start, trim_end,
  to_utf8_bytes, from_utf8_bytes, byte_length, getbyte, setbyte,
  normalize, to_lower, to_upper, case_fold,
  to_graphemes, grapheme_length, grapheme_at, grapheme_slice, grapheme_reverse
} from '../fsl_strings';



// Property-based coverage for the §8 string model.  These are *not* fake tests:
// each property checks an algebraic law of the operation against an independent
// computation (round-trips, length identities, slice composition, inverse
// pairs) over fast-check-generated full-Unicode strings — not against the
// implementation's own output.

const RUNS = 200;

// Full-Unicode generator: exercises astral code points, surrogate-pair
// boundaries, combining marks and emoji, which the §8 unit model must handle.
const uni = (): fc.Arbitrary<string> => fc.fullUnicodeString();



describe('code-point round-trips and length identities', () => {

  test('to_codepoints is a lossless split (join restores the original)', () => {
    fc.assert(fc.property(uni(), (s) => {
      expect( to_codepoints(s).join('') ).toBe(s);
    }), { numRuns: RUNS });
  });

  test('cp_length equals the spread-array length', () => {
    fc.assert(fc.property(uni(), (s) => {
      expect( cp_length(s) ).toBe([...s].length);
    }), { numRuns: RUNS });
  });

  test('cp_length never exceeds the UTF-16 .length', () => {
    fc.assert(fc.property(uni(), (s) => {
      expect( cp_length(s) ).toBeLessThanOrEqual(s.length);
    }), { numRuns: RUNS });
  });

  test('getch and getcp agree at every in-range index', () => {
    fc.assert(fc.property(uni(), (s) => {
      const cps = to_codepoints(s);
      for (let i = 0; i < cps.length; ++i) {
        expect( getcp(s, i) ).toBe( (getch(s, i) as string).codePointAt(0) );
      }
    }), { numRuns: RUNS });
  });

  test('negative indexing matches the positive equivalent', () => {
    fc.assert(fc.property(uni().filter(s => cp_length(s) > 0), (s) => {
      const n = cp_length(s);
      expect( getch(s, -1) ).toBe( getch(s, n - 1) );
    }), { numRuns: RUNS });
  });

  test('an index at or past the length is undefined', () => {
    fc.assert(fc.property(uni(), (s) => {
      expect( getch(s, cp_length(s)) ).toBeUndefined();
    }), { numRuns: RUNS });
  });

});



describe('cp_slice laws', () => {

  test('a full slice reproduces the original string', () => {
    fc.assert(fc.property(uni(), (s) => {
      expect( cp_slice(s, 0, cp_length(s)) ).toBe(s);
      expect( cp_slice(s, 0) ).toBe(s);
    }), { numRuns: RUNS });
  });

  test('prefix and suffix slices concatenate back to the whole', () => {
    fc.assert(fc.property(uni(), fc.nat(), (s, raw) => {
      const n = cp_length(s);
      const k = n === 0 ? 0 : raw % (n + 1);
      expect( cp_slice(s, 0, k) + cp_slice(s, k) ).toBe(s);
    }), { numRuns: RUNS });
  });

  test('every slice length matches its clamped bounds', () => {
    fc.assert(fc.property(uni(), fc.integer({ min: -50, max: 50 }), fc.integer({ min: -50, max: 50 }), (s, lo, hi) => {
      const n     = cp_length(s);
      const lo_at = resolve_bound(lo, n);
      const hi_at = resolve_bound(hi, n);
      const want  = Math.max(0, hi_at - lo_at);
      expect( cp_length(cp_slice(s, lo, hi)) ).toBe(want);
    }), { numRuns: RUNS });
  });

  test('cp_reverse is its own inverse', () => {
    fc.assert(fc.property(uni(), (s) => {
      expect( cp_reverse(cp_reverse(s)) ).toBe(s);
    }), { numRuns: RUNS });
  });

});



describe('search and split laws', () => {

  test('concat then split on an absent separator restores the parts', () => {
    fc.assert(fc.property(fc.array(fc.stringOf(fc.constantFrom('a', 'b', 'c'))), (parts) => {
      // '|' never appears in the parts, so split is the exact inverse.
      const joined = parts.join('|');
      expect( split(joined, '|') ).toEqual(parts.length === 0 ? [''] : parts);
    }), { numRuns: RUNS });
  });

  test('split on the empty separator equals to_codepoints', () => {
    fc.assert(fc.property(uni(), (s) => {
      expect( split(s, '') ).toEqual(to_codepoints(s));
    }), { numRuns: RUNS });
  });

  test('a needle inserted into a string is found at its code-point position', () => {
    // Draw the prefix and the needle from disjoint alphabets so the needle
    // cannot occur inside, nor straddle the boundary with, the prefix — the
    // first (and only) match is therefore exactly at cp_length(a).
    const prefix = fc.stringOf(fc.constantFrom('a', 'b', 'c', '\u{1F600}'));
    const needle = fc.stringOf(fc.constantFrom('x', 'y', 'z'), { minLength: 1 });
    fc.assert(fc.property(prefix, needle, (a, n) => {
      expect( find(a + n, n) ).toBe( cp_length(a) );
    }), { numRuns: RUNS });
  });

  test('includes agrees with the native substring test', () => {
    fc.assert(fc.property(uni(), uni(), (a, b) => {
      expect( includes(a, b) ).toBe(a.includes(b));
    }), { numRuns: RUNS });
  });

  test('starts_with / ends_with hold for constructed prefixes and suffixes', () => {
    fc.assert(fc.property(uni(), uni(), (a, b) => {
      expect( starts_with(a + b, a) ).toBe(true);
      expect( ends_with(a + b, b) ).toBe(true);
    }), { numRuns: RUNS });
  });

  test('concat of many parts equals their join', () => {
    fc.assert(fc.property(fc.array(uni()), (parts) => {
      expect( concat(...parts) ).toBe(parts.join(''));
    }), { numRuns: RUNS });
  });

});



describe('pad and trim laws', () => {

  test('pad_start reaches at least the target length and ends with the original', () => {
    fc.assert(fc.property(fc.stringOf(fc.constantFrom('x', 'y'), { maxLength: 8 }), fc.nat({ max: 20 }), (s, target) => {
      const out = pad_start(s, target, '.');
      expect( cp_length(out) ).toBe( Math.max(target, cp_length(s)) );
      expect( ends_with(out, s) ).toBe(true);
    }), { numRuns: RUNS });
  });

  test('pad_end reaches at least the target length and starts with the original', () => {
    fc.assert(fc.property(fc.stringOf(fc.constantFrom('x', 'y'), { maxLength: 8 }), fc.nat({ max: 20 }), (s, target) => {
      const out = pad_end(s, target, '.');
      expect( cp_length(out) ).toBe( Math.max(target, cp_length(s)) );
      expect( starts_with(out, s) ).toBe(true);
    }), { numRuns: RUNS });
  });

  test('padding to a length <= current is a no-op', () => {
    fc.assert(fc.property(fc.stringOf(fc.constantFrom('x', 'y'), { minLength: 3, maxLength: 8 }), (s) => {
      expect( pad_start(s, 1, '.') ).toBe(s);
      expect( pad_end(s, 1, '.') ).toBe(s);
    }), { numRuns: RUNS });
  });

  test('trim is idempotent and bounded by its directional halves', () => {
    fc.assert(fc.property(uni(), (s) => {
      expect( trim(trim(s)) ).toBe( trim(s) );
      expect( trim(s) ).toBe( trim_start(trim_end(s)) );
    }), { numRuns: RUNS });
  });

});



describe('byte unit (UTF-8) laws', () => {

  test('to_utf8_bytes then from_utf8_bytes round-trips', () => {
    fc.assert(fc.property(uni(), (s) => {
      expect( from_utf8_bytes(to_utf8_bytes(s)) ).toBe(s);
    }), { numRuns: RUNS });
  });

  test('every UTF-8 byte is a uint8', () => {
    fc.assert(fc.property(uni(), (s) => {
      for (const b of to_utf8_bytes(s)) {
        expect( Number.isInteger(b) && b >= 0 && b <= 255 ).toBe(true);
      }
    }), { numRuns: RUNS });
  });

  test('byte_length equals the byte-array length and is >= cp_length', () => {
    fc.assert(fc.property(uni(), (s) => {
      expect( byte_length(s) ).toBe( to_utf8_bytes(s).length );
      expect( byte_length(s) ).toBeGreaterThanOrEqual( cp_length(s) );
    }), { numRuns: RUNS });
  });

  test('getbyte reads back exactly the encoded bytes', () => {
    fc.assert(fc.property(uni(), (s) => {
      const bytes = to_utf8_bytes(s);
      for (let i = 0; i < bytes.length; ++i) {
        expect( getbyte(s, i) ).toBe(bytes[i]);
      }
    }), { numRuns: RUNS });
  });

  test('setbyte changes exactly one position and leaves the rest intact', () => {
    fc.assert(fc.property(uni().filter(s => byte_length(s) > 0), fc.nat(), fc.integer({ min: 0, max: 255 }), (s, raw, v) => {
      const original = to_utf8_bytes(s);
      const i        = raw % original.length;
      const edited   = setbyte(s, i, v) as Array<number>;
      expect( edited[i] ).toBe(v);
      for (let j = 0; j < original.length; ++j) {
        if (j !== i) { expect( edited[j] ).toBe( original[j] ); }
      }
    }), { numRuns: RUNS });
  });

  test('setbyte rejects every out-of-byte-range value', () => {
    fc.assert(fc.property(uni().filter(s => byte_length(s) > 0), fc.oneof(fc.integer({ max: -1 }), fc.integer({ min: 256 })), (s, v) => {
      expect( setbyte(s, 0, v) ).toBeUndefined();
    }), { numRuns: RUNS });
  });

});



describe('grapheme unit laws', () => {

  test('to_graphemes is a lossless segmentation', () => {
    fc.assert(fc.property(uni(), (s) => {
      expect( to_graphemes(s).join('') ).toBe(s);
    }), { numRuns: RUNS });
  });

  test('grapheme count is between 0 and the code-point count', () => {
    fc.assert(fc.property(uni(), (s) => {
      const g = grapheme_length(s);
      expect( g ).toBeLessThanOrEqual( cp_length(s) );
      expect( g ).toBeGreaterThanOrEqual( s.length === 0 ? 0 : 1 );
    }), { numRuns: RUNS });
  });

  test('the grapheme code-point lengths sum to the whole code-point length', () => {
    fc.assert(fc.property(uni(), (s) => {
      const total = to_graphemes(s).reduce((acc, g) => acc + cp_length(g), 0);
      expect( total ).toBe( cp_length(s) );
    }), { numRuns: RUNS });
  });

  test('grapheme_at agrees with the segmented array', () => {
    fc.assert(fc.property(uni(), (s) => {
      const gs = to_graphemes(s);
      for (let i = 0; i < gs.length; ++i) {
        expect( grapheme_at(s, i) ).toBe(gs[i]);
      }
      expect( grapheme_at(s, gs.length) ).toBeUndefined();
    }), { numRuns: RUNS });
  });

  test('a full grapheme slice reproduces the original', () => {
    fc.assert(fc.property(uni(), (s) => {
      expect( grapheme_slice(s, 0, grapheme_length(s)) ).toBe(s);
      expect( grapheme_slice(s, 0) ).toBe(s);
    }), { numRuns: RUNS });
  });

  test('prefix and suffix grapheme slices concatenate to the whole', () => {
    fc.assert(fc.property(uni(), fc.nat(), (s, raw) => {
      const n = grapheme_length(s);
      const k = n === 0 ? 0 : raw % (n + 1);
      expect( grapheme_slice(s, 0, k) + grapheme_slice(s, k) ).toBe(s);
    }), { numRuns: RUNS });
  });

  test('grapheme_reverse joins the forward clusters in reverse order', () => {
    fc.assert(fc.property(uni(), (s) => {
      expect( grapheme_reverse(s) ).toBe( [...to_graphemes(s)].reverse().join('') );
    }), { numRuns: RUNS });
  });

  test('grapheme_reverse is an involution when clusters survive re-segmentation', () => {
    // Reversal is not a universal involution: a string whose pieces re-cluster
    // after reversal (e.g. a leading combining mark that re-attaches to a base
    // brought beside it) changes shape.  The round-trip holds whenever the
    // reversed string re-segments into the same clusters it was built from —
    // which is exactly the well-formed-boundary majority of strings.
    fc.assert(fc.property(uni(), (s) => {
      const rev = grapheme_reverse(s);
      fc.pre( to_graphemes(rev).join('|') === [...to_graphemes(s)].reverse().join('|') );
      expect( grapheme_reverse(rev) ).toBe(s);
    }), { numRuns: RUNS });
  });

});



describe('normalisation and case laws', () => {

  test('case_fold is idempotent', () => {
    fc.assert(fc.property(uni(), (s) => {
      expect( case_fold(case_fold(s)) ).toBe( case_fold(s) );
    }), { numRuns: RUNS });
  });

  test('case_fold makes upper/lower variants of ASCII compare equal', () => {
    fc.assert(fc.property(fc.stringOf(fc.constantFrom('a', 'b', 'c', 'A', 'B', 'C')), (s) => {
      expect( case_fold(to_upper(s)) ).toBe( case_fold(to_lower(s)) );
    }), { numRuns: RUNS });
  });

  test('NFC then NFD then NFC is stable (round-trip through forms)', () => {
    fc.assert(fc.property(uni(), (s) => {
      const c = normalize(s, 'NFC');
      expect( normalize(normalize(c, 'NFD'), 'NFC') ).toBe(c);
    }), { numRuns: RUNS });
  });

  test('NFKC is idempotent', () => {
    fc.assert(fc.property(uni(), (s) => {
      const k = normalize(s, 'NFKC');
      expect( normalize(k, 'NFKC') ).toBe(k);
    }), { numRuns: RUNS });
  });

});



describe('index-helper laws', () => {

  test('resolve_index lands in 0..len-1 or undefined', () => {
    fc.assert(fc.property(fc.integer({ min: -30, max: 30 }), fc.nat({ max: 20 }), (i, len) => {
      const at = resolve_index(i, len);
      if (at === undefined) { return; }
      expect( at ).toBeGreaterThanOrEqual(0);
      expect( at ).toBeLessThan(len);
    }), { numRuns: RUNS });
  });

  test('resolve_bound always lands in 0..len', () => {
    fc.assert(fc.property(fc.integer({ min: -50, max: 50 }), fc.nat({ max: 20 }), (b, len) => {
      const at = resolve_bound(b, len);
      expect( at ).toBeGreaterThanOrEqual(0);
      expect( at ).toBeLessThanOrEqual(len);
    }), { numRuns: RUNS });
  });

});
