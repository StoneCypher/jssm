 

import * as fc   from 'fast-check';
import * as jssm from '../jssm';

// Dragon-tier (§4 colours).  The stochastic file `colors.stoch.ts` covers valid
// named + hex colours and the Rgba8-before-Rgb6 precedence.  This file pushes on
// the rejection boundary and case handling the stoch tier does not reach, per the
// dragons-egg §4 suggestions:
//
//   1. Invalid hex lengths (1,2,5,7,9,10 digits) are rejected — only 3/4/6/8 parse.
//   2. Whitespace anywhere inside a hex literal is rejected (a hex run is atomic).
//   3. Non-hex digits at any position are rejected.
//   4. Mixed-case hex bodies are case-PRESERVED per digit (3-digit doubles each
//      digit keeping case; 6/8-digit keep the body verbatim), alpha appended
//      lowercase when omitted.
//   5. Rgba8 round-trips identically across the full alpha range, including the
//      transparency boundaries 00 and ff.
//
// Every behaviour was confirmed against the parser before assertion.  (Note: the
// named palette is the 148-entry CSS3/SVG set; CSS4 names such as `rebeccapurple`
// are absent — a documented gap in dragons-egg §4, not a test failure.)

const RUNS = 100;

const HEX_LOWER = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'] as const;
const HEX_UPPER = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'] as const;
const HEX_ALL   = [...HEX_LOWER, 'A','B','C','D','E','F'] as const;
const NON_HEX   = 'ghijklmnopqrstuvwxyzGHIJKLMNOPQRSTUVWXYZ'.split('');
const WS        = [' ', '\t', '\r', '\n'] as const;

/** Parse `state F : { color : <literal> ; };` and return the canonicalised colour. */
function parse_state_color(literal: string): string {
  const tree = jssm.parse(`state F : { color : ${literal} ; };`) as Array<{ value: Array<{ value: string }> }>;
  return tree[0].value[0].value;
}

/** fast-check arbitrary for a `#`-prefixed hex literal of `digits` chars over `alphabet`. */
function hex_arb(digits: number, alphabet: readonly string[]) {
  return fc.array(fc.constantFrom(...alphabet), { minLength: digits, maxLength: digits }).map((a) => '#' + a.join(''));
}



describe('dragon §4: invalid hex lengths are rejected', () => {

  test('only 3/4/6/8 hex digits parse; 1,2,5,7,9,10 throw', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(1, 2, 5, 7, 9, 10),
        fc.array(fc.constantFrom(...HEX_LOWER), { minLength: 10, maxLength: 10 }),
        (len, digits) => {
          const lit = '#' + digits.slice(0, len).join('');
          expect(() => parse_state_color(lit)).toThrow();
        }
      ),
      { numRuns: RUNS }
    );
  });

});



describe('dragon §4: whitespace inside a hex literal is rejected', () => {

  test('a whitespace char inserted anywhere within the digit run throws', () => {
    fc.assert(
      fc.property(
        hex_arb(6, HEX_LOWER),
        fc.nat(),
        fc.constantFrom(...WS),
        (lit, pos, ws) => {
          const inner = lit.slice(1);                       // rrggbb
          const p     = pos % inner.length;                 // 0..len-1 → strictly inside, never trailing
          const broken = '#' + inner.slice(0, p) + ws + inner.slice(p);
          expect(() => parse_state_color(broken)).toThrow();
        }
      ),
      { numRuns: RUNS }
    );
  });

});



describe('dragon §4: non-hex digits are rejected', () => {

  test('a single non-hex character at any position throws', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(3, 4, 6, 8),
        fc.array(fc.constantFrom(...HEX_LOWER), { minLength: 8, maxLength: 8 }),
        fc.nat(),
        fc.constantFrom(...NON_HEX),
        (len, digits, pos, bad) => {
          const arr = digits.slice(0, len);
          arr[pos % len] = bad;
          expect(() => parse_state_color('#' + arr.join(''))).toThrow();
        }
      ),
      { numRuns: RUNS }
    );
  });

});



describe('dragon §4: mixed-case hex is case-preserved per digit', () => {

  test('3-digit mixed case doubles each digit (case kept) + lowercase ff alpha', () => {
    fc.assert(
      fc.property(hex_arb(3, HEX_ALL), (lit) => {
        const expected = '#' + lit.slice(1).split('').map((d) => d + d).join('') + 'ff';
        expect(parse_state_color(lit)).toBe(expected);
      }),
      { numRuns: RUNS }
    );
  });

  test('4-digit mixed case doubles each digit including alpha', () => {
    fc.assert(
      fc.property(hex_arb(4, HEX_ALL), (lit) => {
        const expected = '#' + lit.slice(1).split('').map((d) => d + d).join('');
        expect(parse_state_color(lit)).toBe(expected);
      }),
      { numRuns: RUNS }
    );
  });

  test('6-digit mixed case keeps the body verbatim + lowercase ff alpha', () => {
    fc.assert(
      fc.property(hex_arb(6, HEX_ALL), (lit) => {
        expect(parse_state_color(lit)).toBe(lit + 'ff');
      }),
      { numRuns: RUNS }
    );
  });

  test('8-digit mixed case round-trips identically', () => {
    fc.assert(
      fc.property(hex_arb(8, HEX_ALL), (lit) => {
        expect(parse_state_color(lit)).toBe(lit);
      }),
      { numRuns: RUNS }
    );
  });

});



describe('dragon §4: Rgba8 alpha round-trips across the full range incl. boundaries', () => {

  test('any 6-digit body + any alpha (00 / ff / mid / random) round-trips identically', () => {
    fc.assert(
      fc.property(
        hex_arb(6, HEX_LOWER),
        fc.oneof(
          fc.constant('00'),
          fc.constant('ff'),
          fc.array(fc.constantFrom(...HEX_LOWER), { minLength: 2, maxLength: 2 }).map((a) => a.join(''))
        ),
        (body, alpha) => {
          const lit = body + alpha;                          // #rrggbb + aa
          const parsed = parse_state_color(lit);
          expect(parsed).toBe(lit);
          expect(parsed.slice(-2)).toBe(alpha);              // alpha preserved, not forced to ff
        }
      ),
      { numRuns: RUNS }
    );
  });

});
