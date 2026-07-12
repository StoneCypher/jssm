
import * as fc from 'fast-check';

import { weighted_rand_select, default_lexicographic } from '../jssm_util';





// Stochastic closure of the last two `jssm_util.ts` branch arms (coverage
// drive fsl#651/#652):
//
//  - `weighted_rand_select`'s default-RNG arm (`rng ? rng() : Math.random()`),
//    reached only when no generator is supplied — every other suite passes a
//    seeded rng;
//  - `default_lexicographic`'s full three-way comparison (below / above /
//    equal), which `histograph`'s unique-key sorts never exercise completely.



const RUNS = 100;





describe('weighted_rand_select — default Math.random arm', () => {

  test('with no rng supplied, the selection is always drawn from the options', () => {

    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 8 }),
        (weights) => {

          const options = weights.map( (probability, id) => ({ probability, id }) );

          const picked = weighted_rand_select(options);

          expect( options ).toContain(picked);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('with no rng supplied and a single option, that option is always selected', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (probability) => {

          const only = { probability, id: 'only' };

          expect( weighted_rand_select([only]) ).toBe(only);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('default_lexicographic — full three-way ordering', () => {

  test('agrees with Array#sort default ordering, and every pair is ranked -1/1/0 by string order', () => {

    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer()),
        fc.oneof(fc.string(), fc.integer()),
        (a, b) => {

          // an element always compares equal to itself
          expect( default_lexicographic(a, a) ).toBe(0);
          expect( default_lexicographic(b, b) ).toBe(0);

          const forward  = default_lexicographic(a, b),
                backward = default_lexicographic(b, a);

          // antisymmetry (===, not Object.is: negating a zero yields -0)
          expect( backward === -forward ).toBe(true);

          // the comparator reproduces the platform's comparator-free sort
          const with_comparator    = [a, b].sort(default_lexicographic);
          // eslint-disable-next-line unicorn/require-array-sort-compare -- the platform's comparator-free string sort IS the reference behavior under test; supplying a comparator would make this tautological
          const without_comparator = [a, b].sort();

          expect( with_comparator ).toStrictEqual(without_comparator);

          // an explicitly ordered distinct pair ranks strictly
          if (String(a) !== String(b)) {
            const [lo, hi] = (String(a) < String(b)) ? [a, b] : [b, a];
            expect( default_lexicographic(lo, hi) ).toBe(-1);
            expect( default_lexicographic(hi, lo) ).toBe(1);
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});
