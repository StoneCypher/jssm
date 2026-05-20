
import * as fc   from 'fast-check';
import * as jssm from '../jssm';





// Property-based coverage for §6 ArrowTarget of the FSL grammar
// reference (`notes/fsl-grammar-reference.md`).  An arrow's
// destination is one of four shapes:
//
//   - Stripe    — `+|N` / `-|N`, where N is a positive integer.
//                 AST: `{ key: 'stripe', value: ±N }`
//   - Cycle     — `+N` / `-N` / `+0` (NOT `-0`, NOT bare `0`).
//                 AST: `{ key: 'cycle', value: ±N }`
//   - LabelList — `[a b c]` for fan-out/fan-in.
//                 AST: `string[]`
//   - Label     — single state name.
//                 AST: `string`
//
// The grammar tries them in the order above so `+1` is parsed as a
// Cycle, not as the start of a label.  This file pins both the AST
// shape per variant and the PEG ordering invariant.



const RUNS = 100;



/**
 *  Parse `a -> <target>;` and return the destination at
 *  `tree[0].se.to`.  Covers all four ArrowTarget shapes through a
 *  single vehicle.
 *
 *  @param  target_src  Source for the destination (Stripe, Cycle, LabelList, or Label).
 *  @returns            The canonical `to` value.
 *
 *  @example
 *    parse_target('+|3')     // → { key:'stripe', value:3 }
 *    parse_target('+1')      // → { key:'cycle',  value:1 }
 *    parse_target('[a b c]') // → ['a', 'b', 'c']
 *    parse_target('foo')     // → 'foo'
 */
function parse_target(target_src: string): unknown {

  const tree = jssm.parse(`a -> ${target_src};`) as Array<{ se: { to: unknown } }>;
  return tree[0].se.to;

}





describe('§6 ArrowTarget — Stripe `+|N` and `-|N`', () => {

  // Stripe shape: `+|N` produces a positive stripe coordinate;
  // `-|N` produces a negative one.  N must be a positive integer
  // (leading `0` would be parsed as part of Cycle/Label, so Stripe
  // matches `NonZeroDigit DecimalDigit*`).

  test('`+|3` parses to {key:stripe, value:3}', () => {
    expect(parse_target('+|3')).toEqual({ key: 'stripe', value: 3 });
  });

  test('`-|2` parses to {key:stripe, value:-2}', () => {
    expect(parse_target('-|2')).toEqual({ key: 'stripe', value: -2 });
  });

  test('Random positive integer stripe round-trips', () => {

    fc.assert(
      fc.property(fc.integer(1, 9999), (n) => {
        expect(parse_target(`+|${n}`)).toEqual({ key: 'stripe', value:  n });
        expect(parse_target(`-|${n}`)).toEqual({ key: 'stripe', value: -n });
      }),
      { numRuns: RUNS }
    );

  });

});



describe('§6 ArrowTarget — Cycle `+N` / `-N` / `+0`', () => {

  // Cycle accepts signed positive integer plus the special `+0`.
  // `-0` and bare `0` are documented as invalid (a §14 quirk).
  // The `+0` carve-out keeps the grammar consistent (zero is
  // unsigned so it has to opt in to the `+` form).

  test('`+1` parses to {key:cycle, value:1}', () => {
    expect(parse_target('+1')).toEqual({ key: 'cycle', value: 1 });
  });

  test('`-1` parses to {key:cycle, value:-1}', () => {
    expect(parse_target('-1')).toEqual({ key: 'cycle', value: -1 });
  });

  test('`+0` parses to {key:cycle, value:0} (the special unsigned-zero form)', () => {
    expect(parse_target('+0')).toEqual({ key: 'cycle', value: 0 });
  });

  test('`-0` is rejected (documented quirk: no negative zero)', () => {
    expect(() => parse_target('-0')).toThrow();
  });

  test('Random non-zero signed integer cycle round-trips', () => {

    fc.assert(
      fc.property(fc.integer(1, 9999), (n) => {
        expect(parse_target(`+${n}`)).toEqual({ key: 'cycle', value:  n });
        expect(parse_target(`-${n}`)).toEqual({ key: 'cycle', value: -n });
      }),
      { numRuns: RUNS }
    );

  });

});



describe('§6 ArrowTarget — LabelList', () => {

  // `[a b c]` form for fan-out/fan-in.  Returns a plain string[],
  // not the LabelList-with-wrapper shape used by NamedList or
  // ArrangeDeclaration.

  test('`[b c d]` parses to a string[] of labels in order', () => {
    expect(parse_target('[b c d]')).toEqual(['b', 'c', 'd']);
  });

  test('`[only]` single-element list still parses to an array', () => {
    expect(parse_target('[only]')).toEqual(['only']);
  });

  test('Random label list round-trips order and arity', () => {

    fc.assert(
      fc.property(
        fc.array(
          fc.array(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
            { minLength: 1, maxLength: 6 }
          ).map(arr => arr.join('')),
          { minLength: 1, maxLength: 6 }
        ),
        (labels) => {
          expect(parse_target(`[${labels.join(' ')}]`)).toEqual(labels);
        }
      ),
      { numRuns: RUNS }
    );

  });

});



describe('§6 ArrowTarget — bare Label', () => {

  // The simplest case: a single Label resolves to a plain string
  // at the `to` position.

  test('Single atom label parses to its canonical string', () => {

    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
          { minLength: 1, maxLength: 8 }
        ).map(arr => arr.join('')),
        (label) => {
          expect(parse_target(label)).toBe(label);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('Quoted-string label parses to its canonical body', () => {

    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
          { minLength: 1, maxLength: 8 }
        ).map(arr => arr.join('')),
        (body) => {
          expect(parse_target(`"${body}"`)).toBe(body);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('§6 ArrowTarget — precedence: Stripe / Cycle / LabelList tried before Label', () => {

  // PEG is first-match.  `ArrowTarget = Stripe / Cycle / LabelList /
  // Label` ensures the special-form shapes take precedence over the
  // generic Label.  Two precedence concerns:
  //
  //   - `+1` must be Cycle, not a Label starting with `+` (which
  //     would be a parse error anyway because `+` isn't in
  //     AtomFirstLetter, but the test still pins the intended path).
  //   - `+|3` must be Stripe, not Cycle on `+`; the longer form
  //     wins because Stripe is tried before Cycle.
  //
  // Both pin the documented "tries them in that order" invariant.

  test('`+|5` parses as Stripe, not Cycle (longer-prefix wins)', () => {
    expect(parse_target('+|5')).toEqual({ key: 'stripe', value: 5 });
  });

  test('`-|5` parses as Stripe, not Cycle', () => {
    expect(parse_target('-|5')).toEqual({ key: 'stripe', value: -5 });
  });

  test('`+5` parses as Cycle (no stripe pipe = no Stripe)', () => {
    expect(parse_target('+5')).toEqual({ key: 'cycle', value: 5 });
  });

  test('A label that happens to be a digit (atom-first-letter-allowed) parses as Label, not Cycle', () => {
    // `5` is a legal AtomFirstLetter and so is a valid Label, but
    // Cycle requires `+` or `-` prefix.  Without a sign, the parser
    // falls through to Label.
    expect(parse_target('5')).toBe('5');
  });

});
