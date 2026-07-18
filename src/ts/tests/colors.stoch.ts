
import * as fc   from 'fast-check';
import * as jssm from '../jssm';





// Property-based coverage for §4 Colours of the FSL grammar reference.
// Three pieces:
//
//   - SvgColorLabel (~140 named colours) — both lowercase and CamelCase
//     spellings.  Each produces an 8-digit `#rrggbbaa` literal.  PEG's
//     first-match-wins requires longer prefixes ahead of shorter ones
//     (`aquamarine` before `aqua`, etc.) — ten documented prefix-pairs.
//   - Hex colours: Rgb3 (`#rgb`), Rgb6 (`#rrggbb`), Rgba4 (`#rgba`),
//     Rgba8 (`#rrggbbaa`).  Three-digit forms double each digit; alpha
//     defaults to `ff` when absent (appended lowercase).
//   - Top-level `Color` ordering: Rgba8 tried before Rgb6 so 8-digit
//     hex isn't truncated.
//
// Colours are tested via a state declaration `state F : { color : <C>; };`
// because that's a simple grammar surface that accepts the full Color
// vocabulary and exposes the canonicalised value in a predictable AST
// position.



const RUNS = 100;

const HEX_LOWER = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'] as const;
const HEX_UPPER = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'] as const;
const HEX_ALL   = [...HEX_LOWER, 'A','B','C','D','E','F'] as const;



/**
 *  Parse a state declaration of the form `state F : { color : <literal> ; };`
 *  and return the canonicalised colour value at `tree[0].value[0].value`.
 *  @param  literal  FSL colour source: a named colour, a `#rgb`-form, etc.
 *  @returns         The canonicalised colour string (typically `#rrggbbaa`).
 *  @example
 *    parse_state_color('red')        // → '#ff0000ff'
 *    parse_state_color('#fff')       // → '#ffffffff'
 *    parse_state_color('#abcd')      // → '#aabbccdd'
 *    parse_state_color('AliceBlue')  // → '#f0f8ffff'
 */
function parse_state_color(literal: string): string {

  const tree = jssm.parse(`state F : { color : ${literal} ; };`) as Array<{ value: Array<{ value: string }> }>;
  return tree[0].value[0].value;

}



/**
 *  Random hex literal generator.  Returns `#xxxx...` with the given
 *  digit count drawn from the supplied alphabet (lowercase / uppercase /
 *  mixed).  fast-check arbitraries delegate to this so each generated
 *  hex form is a separate test point.
 *  @param  digits    Number of hex digits after the `#`.
 *  @param  alphabet  Choice of digit casing (use HEX_LOWER, HEX_UPPER, HEX_ALL).
 *  @returns          fast-check Arbitrary that yields strings like `#abc`.
 */
function hex_literal_arb(digits: number, alphabet: readonly string[]) {

  return fc.array(fc.constantFrom(...alphabet), { minLength: digits, maxLength: digits })
    .map(arr => '#' + arr.join(''));

}





describe('SvgColorLabel — well-known canonical values', () => {

  // Externally-verified canonical hex values, drawn from the CSS Color
  // Module Level 3 / SVG 1.1 named-colour palette.  These spot-checks
  // protect against the grammar drifting from the published standard
  // independently of the project's own colour table.

  const canonical: Record<string, string> = {
    red:       '#ff0000ff',
    green:     '#008000ff',
    blue:      '#0000ffff',
    white:     '#ffffffff',
    black:     '#000000ff',
    gray:      '#808080ff',
    navy:      '#000080ff',
    teal:      '#008080ff',
    aliceblue: '#f0f8ffff',
    aqua:      '#00ffffff',
    fuchsia:   '#ff00ffff',
    silver:    '#c0c0c0ff',
    gold:      '#ffd700ff',
    orange:    '#ffa500ff',
    purple:    '#800080ff',
  };

  for (const [name, expected] of Object.entries(canonical)) {
    test(`${name} parses to ${expected}`, () => {
      expect(parse_state_color(name)).toBe(expected);
    });
  }

});





describe('SvgColorLabel — prefix-protection ordering', () => {

  // PEG's first-match-wins rule requires that names sharing a prefix
  // are ordered longer-first in the grammar's alternatives list.
  // `notes/fsl-grammar-reference.md` §4 enumerates the ten documented
  // prefix-pairs.  Each is verified here by asserting the longer name
  // parses to its canonical value rather than the shorter prefix's
  // canonical value.

  const prefix_pairs: Array<[string, string, string]> = [
    // [shorter, longer, expected_longer_hex]
    ['aqua',     'aquamarine',     '#7fffd4ff'],
    ['blue',     'blueviolet',     '#8a2be2ff'],
    ['gold',     'goldenrod',      '#daa520ff'],
    ['green',    'greenyellow',    '#adff2fff'],
    ['lavender', 'lavenderblush',  '#fff0f5ff'],
    ['lime',     'limegreen',      '#32cd32ff'],
    ['olive',    'olivedrab',      '#6b8e23ff'],
    ['orange',   'orangered',      '#ff4500ff'],
    ['white',    'whitesmoke',     '#f5f5f5ff'],
    ['yellow',   'yellowgreen',    '#9acd32ff'],
  ];

  for (const [shorter, longer, expected_longer] of prefix_pairs) {
    test(`${longer} parses correctly (not as ${shorter} + leftover)`, () => {
      expect(parse_state_color(longer)).toBe(expected_longer);
      expect(parse_state_color(longer)).not.toBe(parse_state_color(shorter));
    });
  }

});





describe('SvgColorLabel — case-insensitivity and shape', () => {

  test('Every named colour parses without throwing (148 names × 2 casings)', () => {

     for (const camel_name of jssm.named_colors) {
       expect(() => parse_state_color(camel_name)).not.toThrow();
       expect(() => parse_state_color(camel_name.toLowerCase())).not.toThrow();
     }

  });

  test('Every parsed named colour matches the documented `#rrggbbaa` shape', () => {

     for (const camel_name of jssm.named_colors) {
       expect(parse_state_color(camel_name)).toMatch(/^#[0-9a-f]{8}$/i);
     }

  });

  test('Lowercase and CamelCase spellings produce identical values for every name', () => {

     for (const camel_name of jssm.named_colors) {
       const camel_value = parse_state_color(camel_name);
       const lower_value = parse_state_color(camel_name.toLowerCase());
       expect(lower_value).toBe(camel_value);
     }

  });

  test('Alpha is `ff` for every named colour except the lone `transparent` entry', () => {

     for (const camel_name of jssm.named_colors) {
       const expected = camel_name.toLowerCase() === 'transparent' ? '00' : 'ff';
       expect(parse_state_color(camel_name).slice(-2)).toBe(expected);
     }

  });

  test('`transparent` parses to fully-transparent `#00000000`', () => {

     expect(parse_state_color('transparent')).toBe('#00000000');
     expect(parse_state_color('Transparent')).toBe('#00000000');

  });

});





describe('Hex colour parsing — Rgb3 (`#rgb`)', () => {

  test('Each digit doubles, alpha defaults to lowercase `ff`', () => {

     fc.assert(
       fc.property(
         hex_literal_arb(3, HEX_LOWER),
         (literal) => {
           const parsed = parse_state_color(literal);
           // Expected: each digit doubled, then `ff` lowercase alpha.
           const expected = '#' + literal.slice(1).split('').map(d => d + d).join('') + 'ff';
           expect(parsed).toBe(expected);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Uppercase digits are preserved in the doubled output (alpha stays lowercase)', () => {

     // `#FFF` → `#FFFFFFff` per documented behaviour: user-typed case
     // preserved in the doubled section; appended `ff` alpha is
     // lowercase regardless.

     fc.assert(
       fc.property(
         hex_literal_arb(3, HEX_UPPER),
         (literal) => {
           const parsed   = parse_state_color(literal);
           const expected = '#' + literal.slice(1).split('').map(d => d + d).join('') + 'ff';
           expect(parsed).toBe(expected);
         }
       ),
       { numRuns: RUNS }
     );

  });

});





describe('Hex colour parsing — Rgb6 (`#rrggbb`)', () => {

  test('Six-digit hex round-trips with `ff` alpha appended (lowercase)', () => {

     fc.assert(
       fc.property(
         hex_literal_arb(6, HEX_LOWER),
         (literal) => {
           expect(parse_state_color(literal)).toBe(literal + 'ff');
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Uppercase-digit hex preserves case in the body, lowercase `ff` alpha appended', () => {

     fc.assert(
       fc.property(
         hex_literal_arb(6, HEX_UPPER),
         (literal) => {
           expect(parse_state_color(literal)).toBe(literal + 'ff');
         }
       ),
       { numRuns: RUNS }
     );

  });

});





describe('Hex colour parsing — Rgba4 (`#rgba`)', () => {

  test('Each of 4 digits doubles (including the alpha)', () => {

     fc.assert(
       fc.property(
         hex_literal_arb(4, HEX_LOWER),
         (literal) => {
           const expected = '#' + literal.slice(1).split('').map(d => d + d).join('');
           expect(parse_state_color(literal)).toBe(expected);
         }
       ),
       { numRuns: RUNS }
     );

  });

});





describe('Hex colour parsing — Rgba8 (`#rrggbbaa`)', () => {

  test('Eight-digit hex round-trips identically', () => {

     fc.assert(
       fc.property(
         hex_literal_arb(8, HEX_LOWER),
         (literal) => {
           expect(parse_state_color(literal)).toBe(literal);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Alpha is preserved (not truncated to ff) — Rgba8 tried before Rgb6 in Color rule', () => {

     // The Color rule's alternative order is `SvgColor / Rgba8 / Rgb6 / Rgba4 / Rgb3`.
     // If Rgb6 were tried first, an 8-digit hex like `#aabbcc12` would
     // match Rgb6's `#aabbcc` and leave `12` as a parse remainder.  The
     // documented behaviour is that Rgba8 wins, preserving the alpha.

     fc.assert(
       fc.property(
         hex_literal_arb(6, HEX_LOWER),  // body
         hex_literal_arb(2, HEX_LOWER),  // alpha digits, with leading '#' which we strip
         (body, alpha_with_hash) => {
           const alpha   = alpha_with_hash.slice(1);  // drop leading '#'
           const literal = body + alpha;
           const parsed  = parse_state_color(literal);
           // Alpha section should be the user's alpha, not 'ff'.
           expect(parsed).toBe(literal);
           expect(parsed.slice(-2)).toBe(alpha);
         }
       ),
       { numRuns: RUNS }
     );

  });

});
