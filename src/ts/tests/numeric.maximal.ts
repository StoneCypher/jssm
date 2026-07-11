 

import * as fc   from 'fast-check';
import * as jssm from '../jssm';

// Dragon-tier (§3 numeric).  The stochastic file `numeric.stoch.ts` covers the
// valid numeric vocabulary and first-position octal/binary rejection.  This file
// pushes on the rejection boundary and large-value edges, per the dragons-egg §3
// suggestions — every behaviour confirmed against the parser first:
//
//   1. Out-of-range octal/binary digits at ANY position reject (stoch only
//      checked the first position).
//   2. Degenerate radix prefixes (`0x`/`0o`/`0b` with no digits, double prefix)
//      reject.
//   3. Large hex parses exactly, with no 32-bit truncation (JS float carries it).
//   4. Bare negative literals reject in both property-default and probability
//      positions (only the named negative constants like `-∞` are numeric).
//   5. Word constants are case-sensitive: non-canonical casings reject.
//   6. Large time-unit values convert arithmetically without an overflow throw.
//
// (SemVer prerelease/build-metadata rejection is a further §3 dragon item, held
// back here pending the correct fsl_version harness — see dragons-egg §3.)

const RUNS = 100;

const WEEK_MS = 604_800_000;

function parse_prop_default(literal: string): unknown {
  const tree = jssm.parse(`property p default ${literal} ;`) as Array<{ default_value?: unknown }>;
  return tree[0].default_value;
}
function parse_after(expr: string): unknown {
  const tree = jssm.parse(`a after ${expr} -> b;`) as Array<{ se: { r_after?: unknown } }>;
  return tree[0].se.r_after;
}



describe('dragon §3: out-of-range octal / binary digits reject at any position', () => {

  test('a digit >=8 anywhere in an octal literal throws', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 7 }), { minLength: 1, maxLength: 6 }),
        fc.nat(),
        fc.constantFrom(8, 9),
        (digits, pos, bad) => {
          const arr = [...digits];
          arr[pos % arr.length] = bad;                       // inject an out-of-range octal digit
          expect(() => parse_prop_default('0o' + arr.join(''))).toThrow();
        }
      ),
      { numRuns: RUNS }
    );
  });

  test('a digit >=2 anywhere in a binary literal throws', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 1, maxLength: 8 }),
        fc.nat(),
        fc.integer({ min: 2, max: 9 }),
        (digits, pos, bad) => {
          const arr = [...digits];
          arr[pos % arr.length] = bad;
          expect(() => parse_prop_default('0b' + arr.join(''))).toThrow();
        }
      ),
      { numRuns: RUNS }
    );
  });

});



describe('dragon §3: degenerate radix prefixes reject', () => {

  test('a radix prefix with no digits, or a doubled prefix, throws', () => {
    for (const lit of ['0x', '0o', '0b', '0X', '0O', '0B', '0X0xFF', '0o08', '0b02']) {
      expect(() => parse_prop_default(lit)).toThrow();
    }
  });

});



describe('dragon §3: large hex parses exactly (no 32-bit truncation)', () => {

  test('1..13 hex digits parse to parseInt(hex, 16)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...'0123456789abcdef'.split('')), { minLength: 1, maxLength: 13 }),
        (arr) => {
          const hex = arr.join('');
          expect(parse_prop_default('0x' + hex)).toBe(Number.parseInt(hex, 16));
        }
      ),
      { numRuns: RUNS }
    );
  });

});



describe('dragon §3: bare negative literals reject', () => {

  test('property default `-N` throws', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (n) => {
        expect(() => parse_prop_default(`-${n}`)).toThrow();
      }),
      { numRuns: RUNS }
    );
  });

  test('probability `-N%` throws', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (n) => {
        expect(() => jssm.parse(`a -${n}% -> b;`)).toThrow();
      }),
      { numRuns: RUNS }
    );
  });

});



describe('dragon §3: word constants are case-sensitive', () => {

  // Canonical spellings that parse, paired with non-canonical casings that must
  // reject.  (Euler's `E`/`e` are deliberately excluded — both are valid.)
  const reject_pairs: Array<[string, string[]]> = [
    ['Pi',       ['pi', 'PI']],
    ['Infinity', ['infinity']],
    ['Inf',      ['inf']],
    ['NaN',      ['nan']],
  ];

  test('canonical parses; probed non-canonical casings throw', () => {
    for (const [canonical, variants] of reject_pairs) {
      expect(() => parse_prop_default(canonical)).not.toThrow();
      for (const v of variants) {
        expect(() => parse_prop_default(v)).toThrow();
      }
    }
  });

  test('a random non-canonical casing of "Infinity" throws', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 8, maxLength: 8 }),   // per-char upper flag for i-n-f-i-n-i-t-y
        (flags) => {
          const base = 'infinity';
          const cased = base.split('').map((c, i) => (flags[i] === true ? c.toUpperCase() : c)).join('');
          fc.pre(cased !== 'Infinity');                            // skip the one valid spelling
          expect(() => parse_prop_default(cased)).toThrow();
        }
      ),
      { numRuns: RUNS }
    );
  });

});



describe('dragon §3: large time values convert without overflow', () => {

  test('`after N weeks` equals N * 604800000 for large N (no throw, no overflow guard)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000_000 }), (n) => {
        expect(parse_after(`${n} weeks`)).toBe(n * WEEK_MS);
      }),
      { numRuns: RUNS }
    );
  });

});
