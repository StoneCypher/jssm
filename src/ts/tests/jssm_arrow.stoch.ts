
import * as fc from 'fast-check';

import { arrow_direction, arrow_left_kind, arrow_right_kind } from '../jssm_arrow';
import { JssmError }                                          from '../jssm_error';





// Property-based coverage for the arrow-classification layer
// (`jssm_arrow.ts`).
//
// Arrows are built *compositionally* here, from the FSL arrow grammar's
// construction rules, and the expected direction / kinds fall out of the
// construction — so these tests would catch a typo in the big switch
// tables without ever copying those tables into the test.
//
// Construction rules (ASCII):
//   - kind characters: '-' legal, '=' main, '~' forced
//   - right-only arrow: `{c}>`            (direction right, left kind none)
//   - left-only arrow:  `<{c}`            (direction left, right kind none)
//   - two-sided, same kind: `<{c}>`       (the middle character is shared)
//   - two-sided, mixed kind: `<{lc}{rc}>`
//
// Unicode forms are aliases for whole ASCII arrows (one glyph per side, or
// one glyph for the shared-kind double arrows), and must classify
// identically to their ASCII spellings.



const RUNS = 200;



/** Kind characters paired with the kind names they encode in the grammar. */
const KINDS = [
  { ch: '-', kind: 'legal'  },
  { ch: '=', kind: 'main'   },
  { ch: '~', kind: 'forced' }
] as const;

/** Unicode glyph for each one-sided ASCII arrow. */
const UNICODE_RIGHT = { '-': '→', '=': '⇒', '~': '↛' } as const;
const UNICODE_LEFT  = { '-': '←', '=': '⇐', '~': '↚' } as const;

/** Unicode glyph for each same-kind two-sided ASCII arrow. */
const UNICODE_BOTH  = { '-': '↔', '=': '⇔', '~': '↮' } as const;

const kind_arb = fc.constantFrom(...KINDS);



/**
 *  Builds every textual spelling of a two-sided arrow with the given left
 *  and right kind characters.  Same-kind arrows have exactly two spellings
 *  (collapsed ASCII like `<->`, single glyph like `↔`); mixed-kind arrows
 *  have four (each side independently ASCII or unicode).
 *
 *  @param lc  Left kind character: `-`, `=`, or `~`.
 *  @param rc  Right kind character: `-`, `=`, or `~`.
 *  @returns   All equivalent spellings of the arrow.
 *
 *  @example
 *    spellings_of('-', '=')  // ['<-=>', '←⇒', '←=>', '<-⇒']
 *    spellings_of('-', '-')  // ['<->', '↔']
 */
function spellings_of(lc: string, rc: string): string[] {

  if (lc === rc) {
    return [ `<${lc}>`, UNICODE_BOTH[lc] ];
  }

  const lefts  = [ `<${lc}`, UNICODE_LEFT[lc]  ],
        rights = [ `${rc}>`, UNICODE_RIGHT[rc] ];

  return lefts.flatMap( l => rights.map( r => `${l}${r}` ) );

}



/** The complete arrow vocabulary, used to filter the fuzz rejection test. */
const ALL_ARROWS = new Set<string>(
  KINDS.flatMap( l =>
    KINDS.flatMap( r => spellings_of(l.ch, r.ch) )
  ).concat(
    KINDS.flatMap( k => [ `${k.ch}>`, UNICODE_RIGHT[k.ch], `<${k.ch}`, UNICODE_LEFT[k.ch] ] )
  )
);





describe('one-sided arrows', () => {

  test('right-only arrows: direction right, left kind none, right kind per construction', () => {

    fc.assert(
      fc.property(
        kind_arb,
        fc.boolean(),
        ({ ch, kind }, use_unicode) => {

          const arrow = use_unicode ? UNICODE_RIGHT[ch] : `${ch}>`;

          expect(arrow_direction(arrow)).toBe('right');
          expect(arrow_left_kind(arrow)).toBe('none');
          expect(arrow_right_kind(arrow)).toBe(kind);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('left-only arrows: direction left, right kind none, left kind per construction', () => {

    fc.assert(
      fc.property(
        kind_arb,
        fc.boolean(),
        ({ ch, kind }, use_unicode) => {

          const arrow = use_unicode ? UNICODE_LEFT[ch] : `<${ch}`;

          expect(arrow_direction(arrow)).toBe('left');
          expect(arrow_right_kind(arrow)).toBe('none');
          expect(arrow_left_kind(arrow)).toBe(kind);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('two-sided arrows', () => {

  test('every spelling classifies as direction both, with each side keeping its constructed kind', () => {

    fc.assert(
      fc.property(
        kind_arb,
        kind_arb,
        (left, right) => {

          for (const arrow of spellings_of(left.ch, right.ch)) {
            expect(arrow_direction(arrow)).toBe('both');
            expect(arrow_left_kind(arrow)).toBe(left.kind);
            expect(arrow_right_kind(arrow)).toBe(right.kind);
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('all spellings of the same arrow agree with each other on all three classifiers', () => {

    fc.assert(
      fc.property(
        kind_arb,
        kind_arb,
        (left, right) => {

          const all      = spellings_of(left.ch, right.ch),
                [ first, ...rest ] = all;

          for (const other of rest) {
            expect(arrow_direction(other)).toBe(arrow_direction(first));
            expect(arrow_left_kind(other)).toBe(arrow_left_kind(first));
            expect(arrow_right_kind(other)).toBe(arrow_right_kind(first));
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('classifier consistency laws', () => {

  test('direction is recoverable from the two side kinds, for the whole vocabulary', () => {

    for (const arrow of ALL_ARROWS) {

      const l = arrow_left_kind(arrow),
            r = arrow_right_kind(arrow),
            d = arrow_direction(arrow);

      if      (l === 'none') { expect(d).toBe('right'); }
      else if (r === 'none') { expect(d).toBe('left');  }
      else                   { expect(d).toBe('both');  }

      // an arrow pointing nowhere is not constructible
      expect(l === 'none' && r === 'none').toBe(false);

    }

  });

});





describe('unknown arrows reject', () => {

  test('random non-arrow strings throw JssmError from all three classifiers', () => {

    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ maxLength: 6 }),
          fc.fullUnicodeString({ maxLength: 4 }),
          fc.constantFrom('-->', '>>', '<<', '<>', '=', '-', '~', '', ' -> ', '<~~>')
        ).filter( s => !ALL_ARROWS.has(s) ),
        (junk) => {
          expect(() => arrow_direction(junk)).toThrow(JssmError);
          expect(() => arrow_left_kind(junk)).toThrow(JssmError);
          expect(() => arrow_right_kind(junk)).toThrow(JssmError);
        }
      ),
      { numRuns: RUNS }
    );

  });

});
