
import * as fc   from 'fast-check';
import * as jssm from '../jssm';





// Property-based coverage for §6 ArrowAfter + TimeType of the FSL
// grammar reference (`notes/fsl-grammar-reference.md`).  Shape:
//
//   'after' WS NonNegNumber WS? TimeType?
//
// TimeType has six unit families (ms / s / min / hour / day / week)
// each with 3–5 aliases, all converted to milliseconds.  If the
// unit is omitted, the value is treated as seconds (× 1000) — this
// is the documented quirk that bare-number-defaults-to-seconds.
//
// All `r_after` / `l_after` values in the AST are integers in
// milliseconds; the unit's only semantic role is the multiplier.
// This file enumerates the unit vocabulary, exercises bare-number
// defaulting, and pins the per-family multiplier table.



const RUNS = 100;



/**
 *  Parse `a after N<unit> -> b;` and return the canonical r_after
 *  value (always milliseconds).
 *
 *  @param  value      Numeric quantity (no sign — NonNegNumber).
 *  @param  unit_src   Optional unit alias string.  Empty/omit for bare-number.
 *  @returns           Milliseconds the parser computed.
 *
 *  @example
 *    parse_after(5, 's')   // → 5000
 *    parse_after(5)         // → 5000 (bare = seconds)
 *    parse_after(1, 'week') // → 604800000
 */
function parse_after(value: number, unit_src: string = ''): number {

  const after_src = `after ${value}${unit_src ? ' ' + unit_src : ''}`;
  const tree      = jssm.parse(`a ${after_src} -> b;`) as Array<{ se: { r_after?: number } }>;
  return tree[0].se.r_after!;

}



/**
 *  Per-family multiplier table — alias → unit family multiplier in
 *  milliseconds.  Aliases are listed in grammar source order
 *  (longer-first) so a PEG ordering bug would be visible if the
 *  parser canonicalised in a different order.
 */
const UNIT_MULTIPLIERS: ReadonlyArray<readonly [string, number, string]> = [

  // [alias_src, multiplier_in_ms, family]
  ['milliseconds',   1,                       'ms'  ],
  ['millisecond',    1,                       'ms'  ],
  ['msecs',          1,                       'ms'  ],
  ['msec',           1,                       'ms'  ],
  ['ms',             1,                       'ms'  ],

  ['seconds',        1000,                    's'   ],
  ['second',         1000,                    's'   ],
  ['secs',           1000,                    's'   ],
  ['sec',            1000,                    's'   ],
  ['s',              1000,                    's'   ],

  ['minutes',        60_000,                  'min' ],
  ['minute',         60_000,                  'min' ],
  ['mins',           60_000,                  'min' ],
  ['min',            60_000,                  'min' ],
  ['m',              60_000,                  'min' ],

  ['hours',          3_600_000,               'hour'],
  ['hour',           3_600_000,               'hour'],
  ['hrs',            3_600_000,               'hour'],
  ['hr',             3_600_000,               'hour'],
  ['h',              3_600_000,               'hour'],

  ['days',           86_400_000,              'day' ],
  ['day',            86_400_000,              'day' ],
  ['d',              86_400_000,              'day' ],

  ['weeks',          604_800_000,             'week'],
  ['week',           604_800_000,             'week'],
  ['wks',            604_800_000,             'week'],
  ['wk',             604_800_000,             'week'],
  ['w',              604_800_000,             'week'],

] as const;





describe('§6 ArrowAfter — bare-number defaults to seconds', () => {

  // The bare-number quirk: `after 5 -> b` means "after 5 seconds",
  // not "after 5 milliseconds".  Documented in §14 footguns.

  test('`after 5` (no unit) yields 5000 (× 1000 default)', () => {
    expect(parse_after(5)).toBe(5000);
  });

  test('`after 0` yields 0 (zero is a valid duration after the parser fix)', () => {
    // This used to be silently dropped by the truthy `&& d.v`
    // guard; the parser+compiler fix in commit 0f5e97f preserves
    // 0 as a real value.  Cross-references the §2 lexical fix.
    expect(parse_after(0)).toBe(0);
  });

  test('Random non-negative number defaults to seconds', () => {

    fc.assert(
      fc.property(fc.integer(1, 9999), (n) => {
        expect(parse_after(n)).toBe(n * 1000);
      }),
      { numRuns: RUNS }
    );

  });

});



describe('§6 ArrowAfter — full TimeType vocabulary', () => {

  // Every alias of every unit family multiplies the bare value by
  // the family's documented multiplier.  Sampling all 28 aliases
  // against a fixed value of 1 makes failures easy to read.

  for (const [alias, multiplier] of UNIT_MULTIPLIERS) {
    test(`\`after 1 ${alias}\` yields ${multiplier} (family multiplier)`, () => {
      expect(parse_after(1, alias)).toBe(multiplier);
    });
  }

});



describe('§6 ArrowAfter — random value × random unit', () => {

  // Combined property: pick a random value and a random alias from
  // the table; the parser must compute value × multiplier exactly.

  test('Random value × random unit yields value × multiplier', () => {

    fc.assert(
      fc.property(
        fc.integer(0, 1000),
        fc.constantFrom(...UNIT_MULTIPLIERS),
        (value, [alias, multiplier]) => {
          expect(parse_after(value, alias)).toBe(value * multiplier);
        }
      ),
      { numRuns: RUNS }
    );

  });

});



describe('§6 ArrowAfter — fractional values', () => {

  // NonNegNumber accepts decimals (`.25`, `1.5`).  TimeType
  // multiplies them as floats, so non-integer ms is possible.

  test('`after 0.5 s` yields 500ms (fractional seconds)', () => {
    expect(parse_after(0.5, 's')).toBe(500);
  });

  test('`after 1.5 minutes` yields 90000ms', () => {
    expect(parse_after(1.5, 'minutes')).toBe(90_000);
  });

  test('Random fractional seconds round-trip with ×1000 multiplier', () => {

    fc.assert(
      fc.property(
        fc.integer(0, 9999).map(n => n / 100),
        (value) => {
          expect(parse_after(value, 's')).toBeCloseTo(value * 1000, 5);
        }
      ),
      { numRuns: RUNS }
    );

  });

});
