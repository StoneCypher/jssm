
import * as fc   from 'fast-check';
import * as jssm from '../jssm';




// Property-based coverage for `state_style_condense` /
// `apply_state_style_key` (`src/ts/jssm.ts` roughly lines 257-368), part of
// the fsl#651 literal-100% stochastic coverage drive.
//
// `state_style_condense` is the machine-construction step that folds the
// parser's flat `{ key, value }[]` style lists into a single camelCase
// `JssmStateConfig`.  Its contract:
//
//   - each of the nine recognized kebab-case keys maps to exactly one
//     camelCase field, in any order, any subset;
//   - redefining any key within one list throws;
//   - an unrecognized key throws;
//   - a non-object list element throws;
//   - a non-array, non-undefined argument throws;
//   - `undefined` yields the empty config.
//
// The function is exported from the jssm surface, so these exercise it
// directly with generated inputs.



const RUNS = 80;



/**
 *  The full recognized style-key vocabulary and the camelCase config field
 *  each key lands on.  This is the documented public contract of
 *  `state_style_condense` (kebab-case FSL keys in, camelCase config out).
 */
const KEY_FIELD: ReadonlyArray<readonly [string, string]> = [
  ['shape',            'shape'          ],
  ['color',            'color'          ],
  ['text-color',       'textColor'      ],
  ['corners',          'corners'        ],
  ['line-style',       'lineStyle'      ],
  ['background-color', 'backgroundColor'],
  ['state-label',      'stateLabel'     ],
  ['border-color',     'borderColor'    ],
  ['url',              'url'            ],
] as const;

const ALL_KEYS: ReadonlySet<string> = new Set(KEY_FIELD.map( ([k, _f]) => k ));



/** Arbitrary for a short printable value string (always defined, non-empty). */
const value_arb = fc.array(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789#.'.split('')),
  { minLength: 1, maxLength: 12 }
).map(arr => arr.join(''));





describe('state_style_condense — key remapping', () => {

  test('any subset of keys, in any order, maps each kebab key to its camelCase field and nothing else', () => {

    fc.assert(
      fc.property(
        fc.shuffledSubarray([...KEY_FIELD], { minLength: 1 }),
        fc.array(value_arb, { minLength: 9, maxLength: 9 }),
        (subset, values) => {

          const list = subset.map( ([key, _field], i) => ({ key, value: values[i] }) );

          const condensed = jssm.state_style_condense(list as any) as Record<string, unknown>;

          for (const [i, [_key, field]] of subset.entries()) {
            expect(condensed[field]).toBe(values[i]);
          }

          // no stray fields: exactly one field per supplied key
          expect(Object.keys(condensed).length).toBe(subset.length);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('undefined input condenses to the empty config', () => {
    const condensed = jssm.state_style_condense(undefined as any);
    expect(Object.keys(condensed).length).toBe(0);
  });

});





describe('state_style_condense — redefinition rejection, per key', () => {

  // Deterministic outer loop over the vocabulary guarantees every key's
  // redefine guard is exercised; the values are random each run.

  for (const [key, _field] of KEY_FIELD) {

    test(`repeating '${key}' in one style list throws "cannot redefine"`, () => {

      fc.assert(
        fc.property(value_arb, value_arb, (v1, v2) => {
          expect(
            () => jssm.state_style_condense([ { key, value: v1 }, { key, value: v2 } ] as any)
          ).toThrow(/cannot redefine/);
        }),
        { numRuns: 10 }
      );

    });

  }

});





describe('state_style_condense — malformed input rejection', () => {

  test('an unrecognized style key throws "unknown state style key"', () => {

    fc.assert(
      fc.property(
        value_arb.filter( k => !ALL_KEYS.has(k) ),
        value_arb,
        (bad_key, value) => {
          expect(
            () => jssm.state_style_condense([ { key: bad_key, value } ] as any)
          ).toThrow(/unknown state style key/);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('a non-object list element throws "invalid state item"', () => {

    fc.assert(
      fc.property(
        fc.oneof(fc.integer(), fc.string(), fc.boolean()),
        (junk) => {
          expect(
            () => jssm.state_style_condense([ junk ] as any)
          ).toThrow(/invalid state item/);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('a non-array, non-undefined argument throws "non-array"', () => {

    fc.assert(
      fc.property(
        fc.oneof(fc.integer(), fc.string(), fc.boolean(), fc.constant(null), fc.object()),
        (junk) => {
          expect(
            () => jssm.state_style_condense(junk as any)
          ).toThrow(/non-array/);
        }
      ),
      { numRuns: RUNS }
    );

  });

});
