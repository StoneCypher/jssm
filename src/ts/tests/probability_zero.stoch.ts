
import * as fc from 'fast-check';

import * as jssm from '../jssm';



// fsl#1248 — verify correct support for probability 0 in random state
// transitions.
//
// Semantics, from the grammar + runtime (there is no `probability: false`
// construct anywhere — `JssmTransition.probability` is `number`, and the
// grammar rule `ArrowProbability = NonNegNumber "%"` admits `0%`):
//
//   - `a 0% -> b;` parses; the compiler's `!= null` guard preserves the 0,
//     so the edge carries `probability: 0`.
//   - `probable_exits_for` treats a 0% edge as probability-bearing
//     (`!== undefined`), so it stays in the candidate list at weight 0.
//   - `weighted_rand_select` draws `rnd` in `[0, prob_sum)` and selects the
//     first element whose running weight sum strictly exceeds `rnd`; a
//     zero-weight element can never trigger that strict comparison while any
//     sibling weight is positive, so a 0% edge is never randomly selected.
//   - transition legality never consults probability, so the 0% edge remains
//     fully available to a manual `transition()` call.
//
// Degenerate corner, ruled 2026-07-12: when EVERY candidate weight is zero
// (`a 0% -> b; a 0% -> c;`, or a lone `a 0% -> b; a -> c;` where the #1325
// filter drops the undecorated peer), the machine's random-selection paths
// throw a descriptive JssmError instead of falling through to
// `weighted_rand_select`'s degenerate last-element pick.  Both cases are
// pinned below; manual `transition()` through 0% edges stays legal.



const RUNS = 40;



/**
 *  Builds a star-machine plan around hub `a`: one 0% arm and several
 *  positive-weight arms, with the zero arm spliced at an arbitrary
 *  declaration position (the selection loop is order-sensitive, so position
 *  is part of the property).  Every arm loops back to the hub so walks can
 *  continue indefinitely.
 */
const zero_arm_plan_arb = fc.tuple(
  fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 5 }),
  fc.nat(5),
  fc.integer()
).map( ([weights, zero_pos_raw, seed]) => {

  const positive_arms = weights.map( (w, i) => ({ target: `t${i}`, weight: w }) );
  const zero_pos      = zero_pos_raw % (positive_arms.length + 1);

  const arms = [
    ...positive_arms.slice(0, zero_pos),
    { target: 'zz', weight: 0 },
    ...positive_arms.slice(zero_pos)
  ];

  const fsl = [
    ...arms.map( ({ target, weight }) => `a ${weight}% -> ${target};` ),
    ...arms.map( ({ target }) => `${target} -> a;` )
  ].join(' ');

  return { arms, fsl, seed };

});





describe('probability 0 parses and is preserved on the edge (fsl#1248)', () => {

  test('a 0% arrow carries probability 0, distinct from an undeclared probability', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (p) => {

          const m = jssm.sm`a 0% -> b; a ${p}% -> c; a -> d;`;

          expect(m.lookup_transition_for('a', 'b').probability).toBe(0);
          expect(m.lookup_transition_for('a', 'c').probability).toBe(p);
          expect(m.lookup_transition_for('a', 'd').probability).toBe(undefined);

          // the 0% edge is probability-bearing, so it survives the #1325
          // filter and sits in the candidate pool at weight zero
          const exits   = m.probable_exits_for('a');
          const targets = exits.map( e => e.to );

          expect(targets).toContain('b');
          expect(targets).toContain('c');
          expect(targets).not.toContain('d');   // undeclared peer filtered per #1325

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('a 0% edge is never randomly selected while any sibling weight is positive (fsl#1248)', () => {

  test('probabilistic_transition never lands on the zero arm, at any declaration position', () => {

    fc.assert(
      fc.property(
        zero_arm_plan_arb,
        ({ fsl, seed }) => {

          const m = jssm.from(fsl, { rng_seed: seed });

          for (let step = 0; step < 40; step++) {
            expect(m.state()).toBe('a');
            expect(m.probabilistic_transition()).toBe(true);
            expect(m.state()).not.toBe('zz');
            m.force_transition('a');
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('weighted_rand_select itself never returns a zero-weight option when total weight is positive', () => {

    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 20 }), { minLength: 2, maxLength: 8 }),
        fc.nat(7),
        fc.integer(),
        (raw_weights, boost_pos, seed) => {

          // guarantee at least one strictly positive weight
          const weights = [...raw_weights];
          weights[boost_pos % weights.length] += 1;

          const options = weights.map( (probability, i) => ({ i, probability }) );
          const rng     = jssm.gen_splitmix32(seed);

          for (let draw = 0; draw < 100; draw++) {
            const picked = jssm.weighted_rand_select(options, undefined, rng);
            expect(picked.probability).toBeGreaterThan(0);
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('constructor-form transitions with probability 0 behave identically', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer(),
        (p, seed) => {

          const m = new jssm.Machine({
            start_states : ['a'],
            rng_seed     : seed,
            transitions  : [
              { from: 'a', to: 'b', probability: 0, kind: 'legal', forced_only: false, main_path: false },
              { from: 'a', to: 'c', probability: p, kind: 'legal', forced_only: false, main_path: false },
              { from: 'b', to: 'a',                 kind: 'legal', forced_only: false, main_path: false },
              { from: 'c', to: 'a',                 kind: 'legal', forced_only: false, main_path: false }
            ]
          });

          for (let step = 0; step < 25; step++) {
            m.probabilistic_transition();
            expect(m.state()).toBe('c');
            m.force_transition('a');
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('a 0% edge stays available to manual transition (fsl#1248)', () => {

  test('transition() through the zero arm succeeds even though random selection never takes it', () => {

    fc.assert(
      fc.property(
        zero_arm_plan_arb,
        ({ fsl }) => {

          const m = jssm.from(fsl);

          // legality is independent of probability
          expect(m.valid_transition('zz')).toBe(true);

          expect(m.transition('zz')).toBe(true);
          expect(m.state()).toBe('zz');

          // and back out again — the zero arm is an ordinary edge otherwise
          expect(m.transition('a')).toBe(true);
          expect(m.state()).toBe('a');

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('manual transition through a 0% edge stays legal even when the whole pool is zero', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (k) => {

          const arms = Array.from({ length: k }, (_, i) => `t${i}` );
          const fsl  = [
            ...arms.map( t => `a 0% -> ${t};` ),
            ...arms.map( t => `${t} -> a;` )
          ].join(' ');

          const m = jssm.from(fsl);

          for (const t of arms) { expect(m.valid_transition(t)).toBe(true); }

          expect(m.transition(arms[0])).toBe(true);
          expect(m.state()).toBe(arms[0]);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('a forced-only 0% edge is excluded from random selection but honors force_transition', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (p) => {

          const m = jssm.sm`a 0% ~> b; a ${p}% -> c; b -> a; c -> a;`;

          // forced-only edges never enter the probabilistic pool, 0% or not
          expect(m.probable_exits_for('a').map( e => e.to )).toEqual(['c']);

          // and remain unreachable by ordinary transition, reachable by force
          expect(m.transition('b')).toBe(false);
          expect(m.force_transition('b')).toBe(true);
          expect(m.state()).toBe('b');

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('an all-zero candidate pool throws JssmError (fsl#1248, ruled 2026-07-12)', () => {

  test('when every declared arm is 0%, probabilistic_transition throws and does not move', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer(),
        (k, seed) => {

          const arms = Array.from({ length: k }, (_, i) => `t${i}` );
          const fsl  = [
            ...arms.map( t => `a 0% -> ${t};` ),
            ...arms.map( t => `${t} -> a;` )
          ].join(' ');

          const m = jssm.from(fsl, { rng_seed: seed });

          expect(() => m.probabilistic_transition())
            .toThrow(/every candidate edge has probability 0%/);

          // the throw names the state and precedes any transition attempt
          expect(() => m.probabilistic_transition()).toThrow(/"a"/);
          expect(m.state()).toBe('a');

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('a lone 0% arm that shadowed unweighted siblings via the #1325 filter also throws', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),
        (k) => {

          // one declared 0% arm plus k UNDECLARED arms: the probability
          // filter drops the undeclared peers, leaving an all-zero pool
          const plain = Array.from({ length: k }, (_, i) => `u${i}` );
          const fsl   = [
            'a 0% -> zz;',
            ...plain.map( t => `a -> ${t};` ),
            'zz -> a;',
            ...plain.map( t => `${t} -> a;` )
          ].join(' ');

          const m = jssm.from(fsl);

          expect(() => m.probabilistic_transition())
            .toThrow(/every candidate edge has probability 0%/);
          expect(m.state()).toBe('a');

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('the non-destructive stochastic walk path throws on the same pool', () => {

    fc.assert(
      fc.property(
        fc.integer(),
        (seed) => {

          const m = jssm.from('a 0% -> b; b -> a;', { rng_seed: seed });

          expect(() => [...m.stochastic_runs({ runs: 1, seed })])
            .toThrow(/every candidate edge has probability 0%/);

        }
      ),
      { numRuns: 20 }
    );

  });

});
