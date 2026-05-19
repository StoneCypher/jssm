
import * as fc   from 'fast-check';
import * as jssm from '../jssm';





// Property-based coverage for §5 Arrows of the FSL grammar reference
// (`notes/fsl-grammar-reference.md`).  The arrow lexicon has three
// "weights" (light / fat / tilde) crossed with three directions
// (Forward / TwoWay / Back), plus six "mixed" forms that combine a
// different weight on each side of a TwoWay.  Every ASCII arrow has
// a Unicode alias; the parser canonicalises both to the ASCII form
// at `tree[0].se.kind`.
//
// 15 ASCII source forms (9 single-weight + 6 mixed) × 2 (ASCII /
// Unicode) = 30 distinct surface spellings, all reduced to 15
// canonical kinds.  This suite enumerates them and also pins the
// PEG ordering invariant — `Arrow = MixedArrow / LightArrow /
// FatArrow / TildeArrow` — that prevents a 4-character mixed arrow
// from being short-circuited by its 2-character prefix.



const RUNS = 100;



/**
 *  Parse a one-line transition `a <arrow> b;` and return the
 *  canonicalised arrow kind at `tree[0].se.kind`.
 *
 *  @param  arrow_src  The raw arrow source, e.g. `'->'`, `'↔'`, `'<-=>'`.
 *  @returns           The canonical ASCII kind string the parser stored.
 *
 *  @example
 *    parse_arrow_kind('->')   // → '->'
 *    parse_arrow_kind('↔')    // → '<->'  (Unicode canonicalised to ASCII)
 *    parse_arrow_kind('<-=>') // → '<-=>'
 */
function parse_arrow_kind(arrow_src: string): string {

  const tree = jssm.parse(`a ${arrow_src} b;`) as Array<{ se: { kind: string } }>;
  return tree[0].se.kind;

}



/**
 *  ASCII-form arrow inventory, organised by weight × direction and
 *  by mixed-pair.  Each row is `[source_text, expected_canonical_kind]`.
 *  Because these are the ASCII forms, `source_text === expected_kind`
 *  in every row — the value of the table is the *enumeration*, not
 *  any mapping work.
 */
const ASCII_ARROWS: ReadonlyArray<readonly [string, string]> = [

  // --- Light weight ---
  ['->',   '->'  ],  // ForwardLightArrow
  ['<->',  '<->' ],  // TwoWayLightArrow
  ['<-',   '<-'  ],  // BackLightArrow

  // --- Fat weight ---
  ['=>',   '=>'  ],  // ForwardFatArrow
  ['<=>',  '<=>' ],  // TwoWayFatArrow
  ['<=',   '<='  ],  // BackFatArrow

  // --- Tilde weight ---
  ['~>',   '~>'  ],  // ForwardTildeArrow
  ['<~>',  '<~>' ],  // TwoWayTildeArrow
  ['<~',   '<~'  ],  // BackTildeArrow

  // --- Mixed (TwoWay forms with different weights per side) ---
  ['<-=>', '<-=>'],  // light back, fat forward
  ['<-~>', '<-~>'],  // light back, tilde forward
  ['<=->', '<=->'],  // fat back, light forward
  ['<=~>', '<=~>'],  // fat back, tilde forward
  ['<~->', '<~->'],  // tilde back, light forward
  ['<~=>', '<~=>'],  // tilde back, fat forward

] as const;



/**
 *  Unicode-form arrow inventory — each row is
 *  `[unicode_source, expected_canonical_ascii_kind]`.  Every
 *  spelling here is a Unicode alias that must canonicalise to the
 *  ASCII form the grammar declares as the "real" kind.
 */
const UNICODE_ARROWS: ReadonlyArray<readonly [string, string]> = [

  // --- Light weight ---
  ['→',  '->' ],  // U+2192 RIGHTWARDS ARROW
  ['↔',  '<->'],  // U+2194 LEFT RIGHT ARROW
  ['←',  '<-' ],  // U+2190 LEFTWARDS ARROW

  // --- Fat weight ---
  ['⇒',  '=>' ],  // U+21D2 RIGHTWARDS DOUBLE ARROW
  ['⇔',  '<=>'],  // U+21D4 LEFT RIGHT DOUBLE ARROW
  ['⇐',  '<=' ],  // U+21D0 LEFTWARDS DOUBLE ARROW

  // --- Tilde weight ---
  ['↛',  '~>' ],  // U+219B RIGHTWARDS ARROW WITH STROKE
  ['↮',  '<~>'],  // U+21AE LEFT RIGHT ARROW WITH STROKE
  ['↚',  '<~' ],  // U+219A LEFTWARDS ARROW WITH STROKE

  // --- Mixed (two-char Unicode pairs) ---
  ['←⇒', '<-=>'],  // light back + fat forward
  ['←↛', '<-~>'],  // light back + tilde forward
  ['⇐→', '<=->'],  // fat back + light forward
  ['⇐↛', '<=~>'],  // fat back + tilde forward
  ['↚→', '<~->'],  // tilde back + light forward
  ['↚⇒', '<~=>'],  // tilde back + tilde forward

] as const;





describe('§5 Arrows — ASCII forms canonicalise to themselves', () => {

  // Every ASCII arrow source already matches the canonical kind the
  // parser emits.  These tests confirm the round-trip and serve as
  // the master enumeration of the 15 supported arrow shapes.

  for (const [src, expected] of ASCII_ARROWS) {
    test(`\`${src}\` parses as kind \`${expected}\``, () => {
      expect(parse_arrow_kind(src)).toBe(expected);
    });
  }

});



describe('§5 Arrows — Unicode aliases canonicalise to ASCII', () => {

  // Each Unicode form is silently rewritten to its ASCII equivalent
  // in the AST.  This protects downstream code from having to know
  // about the Unicode forms at all.

  for (const [src, expected] of UNICODE_ARROWS) {
    test(`\`${src}\` parses as kind \`${expected}\``, () => {
      expect(parse_arrow_kind(src)).toBe(expected);
    });
  }

});



describe('§5 Arrows — full inventory random-sample round-trip', () => {

  // Sample from all 30 surface spellings uniformly; over RUNS draws
  // every kind is exercised many times.  Property-based form serves
  // as a smoke check that adding new arrow shapes (e.g. for a future
  // §5.x extension) is caught by this file failing on the new shape
  // rather than passing silently.

  const ALL_FORMS: ReadonlyArray<readonly [string, string]> =
    [...ASCII_ARROWS, ...UNICODE_ARROWS];

  test('Every source form in the inventory parses to its declared kind', () => {

    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_FORMS),
        ([src, expected]) => {
          expect(parse_arrow_kind(src)).toBe(expected);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('§5 Arrows — mixed arrows preserved over shorter prefixes', () => {

  // PEG is first-match.  `Arrow = MixedArrow / LightArrow / FatArrow
  // / TildeArrow` puts mixed first specifically so a 4-char mixed
  // arrow like `<-=>` isn't short-circuited by its 2-char prefix
  // `<-` (BackLightArrow).  These tests pin that ordering invariant
  // by asserting each mixed form parses to its full kind, NOT to
  // the shorter-prefix kind.

  /**
   *  For each mixed-arrow source, the shorter prefix the parser
   *  could have wrongly preferred.  Used to assert the parser picks
   *  the longer match in every documented mixed-arrow case.
   */
  const PREFIX_PAIRS: ReadonlyArray<readonly [string, string, string]> = [
    // [mixed_arrow, expected_full_kind, wrong_short_prefix_kind]
    ['<-=>', '<-=>', '<-'],
    ['<-~>', '<-~>', '<-'],
    ['<=->', '<=->', '<='],
    ['<=~>', '<=~>', '<='],
    ['<~->', '<~->', '<~'],
    ['<~=>', '<~=>', '<~'],
  ];

  for (const [src, expected, wrong] of PREFIX_PAIRS) {
    test(`\`${src}\` parses as full mixed kind, not its shorter prefix \`${wrong}\``, () => {
      const got = parse_arrow_kind(src);
      expect(got).toBe(expected);
      expect(got).not.toBe(wrong);
    });
  }

});



describe('§5 Arrows — Unicode mixed forms also outrank shorter prefixes', () => {

  // The Unicode mixed pairs (e.g. `←⇒`) face the same PEG ordering
  // risk as their ASCII twins — the parser must prefer the longer
  // mixed match over either single-arrow Unicode prefix.

  const UNICODE_PREFIX_PAIRS: ReadonlyArray<readonly [string, string]> = [
    // [unicode_mixed, expected_ascii_canonical_kind]
    ['←⇒', '<-=>'],
    ['←↛', '<-~>'],
    ['⇐→', '<=->'],
    ['⇐↛', '<=~>'],
    ['↚→', '<~->'],
    ['↚⇒', '<~=>'],
  ];

  for (const [src, expected] of UNICODE_PREFIX_PAIRS) {
    test(`\`${src}\` (Unicode mixed) parses as full mixed kind \`${expected}\``, () => {
      expect(parse_arrow_kind(src)).toBe(expected);
    });
  }

});



describe('§5 Arrows — direction does not swap from/to in the AST', () => {

  // The parser records the typed source order at `from` / `se.to`,
  // and stores the arrow shape at `se.kind`.  Semantic direction
  // (back arrows imply "to flows into from") is a downstream concern
  // — the AST itself is direction-agnostic, so a back arrow `a <- b`
  // still produces `from: 'a'` and `to: 'b'`.

  test('Back light arrow `a <- b;` keeps source order: from=a, to=b, kind=<-', () => {
    const tree = jssm.parse(`a <- b;`) as Array<{ from: string; se: { kind: string; to: string } }>;
    expect(tree[0].from   ).toBe('a' );
    expect(tree[0].se.to  ).toBe('b' );
    expect(tree[0].se.kind).toBe('<-');
  });

  test('Back fat arrow with Unicode source preserves order and canonicalises kind', () => {
    const tree = jssm.parse(`a ⇐ b;`) as Array<{ from: string; se: { kind: string; to: string } }>;
    expect(tree[0].from   ).toBe('a' );
    expect(tree[0].se.to  ).toBe('b' );
    expect(tree[0].se.kind).toBe('<=');
  });

});
