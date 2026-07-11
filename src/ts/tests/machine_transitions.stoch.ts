
import * as fc from 'fast-check';

import * as jssm from '../jssm';

import { chain_plan_arb, ring_plan_arb } from './stoch_helpers';

/** Code-unit string comparator, reproducing Array#sort's default ordering explicitly. */
const code_unit_compare = (a: string, b: string): number => (a < b ? -1 : (a > b ? 1 : 0));





// Property-based coverage for transition mechanics: go / transition /
// action / do / force_transition, the valid_* predicates, and the
// probabilistic walk family.
//
// Probabilistic tests inject a seed through `from(fsl, { rng_seed })`, so
// every walk is reproducible from the fast-check failure seed, and the
// distribution tolerances sit several standard deviations out.



const RUNS = 60;





describe('legal transitions over chain plans', () => {

  test('walking the full backbone with go() succeeds step by step and ends terminal', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, fsl }) => {

          const machine = jssm.from(fsl);

          for (let i = 1; i < names.length; ++i) {
            expect(machine.go(names[i])).toBe(true);
            expect(machine.state()).toBe(names[i]);
          }

          expect(machine.is_terminal()).toBe(true);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('valid_transition from the start agrees with declared adjacency, and illegal moves are no-ops', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, edges, fsl }) => {

          const machine  = jssm.from(fsl);
          const adjacent = new Set(
            edges.filter( ([f, _t]) => f === names[0] ).map( ([_f, t]) => t )
          );

          for (const target of names) {

            expect(machine.valid_transition(target)).toBe(adjacent.has(target));

            if (!adjacent.has(target)) {
              expect(machine.transition(target)).toBe(false);
              expect(machine.state()).toBe(names[0]);   // failed moves change nothing
            }

          }

          // a state that does not exist is likewise a false, not a throw
          expect(machine.go(`${names[0]}_`)).toBe(false);
          expect(machine.state()).toBe(names[0]);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('forced transitions', () => {

  const name = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
    { minLength: 2, maxLength: 6 }
  );

  const three_names = fc.tuple(name, name, name)
    .map( ([a, b, c]) => [`${a}x`, `${b}y`, `${c}z`] );   // distinct via suffix

  test('a ~> target accepts only force_transition; a -> target accepts either', () => {

    fc.assert(
      fc.property(
        three_names,
        ([a, b, c]) => {

          const machine = jssm.from(`${a} ~> ${b};  ${a} -> ${c};`);

          // the forced-only edge
          expect(machine.valid_transition(b)).toBe(false);
          expect(machine.valid_force_transition(b)).toBe(true);
          expect(machine.transition(b)).toBe(false);
          expect(machine.state()).toBe(a);
          expect(machine.force_transition(b)).toBe(true);
          expect(machine.state()).toBe(b);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('force_transition also accepts ordinary legal edges', () => {

    fc.assert(
      fc.property(
        three_names,
        ([a, b, c]) => {

          const machine = jssm.from(`${a} ~> ${b};  ${a} -> ${c};`);

          expect(machine.valid_force_transition(c)).toBe(true);
          expect(machine.force_transition(c)).toBe(true);
          expect(machine.state()).toBe(c);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('actions over an action-labelled ring', () => {

  /**
   *  Builds a ring machine whose every edge carries a distinct action name:
   *  `s0 'act0' -> s1 'act1' -> ... -> s(k-1) 'act(k-1)' -> s0`, expressed
   *  as separate statements.  Returns the names and parallel action list.
   *  @param k  Ring size (number of states).
   *  @returns  State names, action names (`actions[i]` exits `names[i]`),
   *            and the FSL source.
   *  @example
   *    action_ring(2)
   *    // { names: ['st0','st1'], actions: ['act0','act1'],
   *    //   fsl: "st0 'act0' -> st1;  st1 'act1' -> st0;" }
   */
  function action_ring(k: number): { names: string[], actions: string[], fsl: string } {

    const names   = Array.from({length: k}, (_, index) => index).map( i => `st${i}` ),
          actions = Array.from({length: k}, (_, index) => index).map( i => `act${i}` );

    const fsl = names
      .map( (n, i) => `${n} '${actions[i]}' -> ${names[(i + 1) % k]};` )
      .join('  ');

    return { names, actions, fsl };

  }

  const ring_size = fc.integer({ min: 2, max: 8 });

  test('each action is valid exactly at its own state, and fires the right move', () => {

    fc.assert(
      fc.property(
        ring_size,
        fc.integer({ min: 0, max: 30 }),
        (k, steps) => {

          const { names, actions, fsl } = action_ring(k);
          const machine                 = jssm.from(fsl);

          for (let step = 0; step < steps; ++step) {

            const here = step % k;

            expect(machine.state()).toBe(names[here]);

            // exactly one action is available here
            expect(machine.actions()).toEqual([actions[here]]);
            for (const [i, act] of actions.entries()) {
              expect(machine.valid_action(act)).toBe(i === here);
            }

            // the wrong action is refused without moving
            const wrong = actions[(here + 1) % k];
            expect(machine.action(wrong)).toBe(false);
            expect(machine.state()).toBe(names[here]);

            // the right action advances the ring
            expect(machine.action(actions[here])).toBe(true);
            expect(machine.state()).toBe(names[(here + 1) % k]);

          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('do() is a synonym for action()', () => {

    fc.assert(
      fc.property(
        ring_size,
        (k) => {

          const { names, actions, fsl } = action_ring(k);
          const machine                 = jssm.from(fsl);

          expect(machine.do(actions[1] ?? actions[0])).toBe(false);   // wrong action refused
          expect(machine.do(actions[0])).toBe(true);
          expect(machine.state()).toBe(names[1 % k]);

        }
      ),
      { numRuns: 30 }
    );

  });

  test('action bookkeeping: list_states_having_action, list_exit_actions, current_action_edge_for', () => {

    fc.assert(
      fc.property(
        ring_size,
        (k) => {

          const { names, actions, fsl } = action_ring(k);
          const machine                 = jssm.from(fsl);

          for (const [i, act] of actions.entries()) {
            expect(machine.list_states_having_action(act)).toEqual([names[i]]);
          }

          expect(machine.list_exit_actions(names[0])).toEqual([actions[0]]);

          const edge = machine.current_action_edge_for(actions[0]);
          expect(edge.from).toBe(names[0]);
          expect(edge.to).toBe(names[1 % k]);
          expect(edge.action).toBe(actions[0]);

          // an action that exists elsewhere has no edge *here*
          if (k > 1) {
            expect(machine.current_action_for(actions[1])).toBe(undefined);
            expect(() => machine.current_action_edge_for(actions[1])).toThrow();
          }

        }
      ),
      { numRuns: 30 }
    );

  });

});





describe('probabilistic walks over ring plans', () => {

  test('probabilistic_walk returns n+1 states, every hop a declared edge, start to current', () => {

    fc.assert(
      fc.property(
        ring_plan_arb,
        fc.integer(),
        fc.integer({ min: 1, max: 60 }),
        ({ names, edges, fsl }, rng_seed, n) => {

          const machine  = jssm.from(fsl, { rng_seed });
          const declared = new Set( edges.map( ([f, t]) => `${f}|${t}` ) );

          const walk = machine.probabilistic_walk(n);

          expect(walk.length).toBe(n + 1);
          expect(walk[0]).toBe(names[0]);
          expect(walk.at(-1)).toBe(machine.state());

          for (let i = 0; i + 1 < walk.length; ++i) {
            expect(declared.has(`${walk[i]}|${walk[i + 1]}`)).toBe(true);
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('the same rng_seed reproduces the same walk on a fresh machine', () => {

    fc.assert(
      fc.property(
        ring_plan_arb,
        fc.integer(),
        fc.integer({ min: 1, max: 60 }),
        ({ fsl }, rng_seed, n) => {

          const first  = jssm.from(fsl, { rng_seed }).probabilistic_walk(n);
          const second = jssm.from(fsl, { rng_seed }).probabilistic_walk(n);

          expect(second).toEqual(first);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('probabilistic_histo_walk counts sum to n+1 and cover only real states', () => {

    fc.assert(
      fc.property(
        ring_plan_arb,
        fc.integer(),
        fc.integer({ min: 1, max: 60 }),
        ({ names, fsl }, rng_seed, n) => {

          const machine = jssm.from(fsl, { rng_seed });
          const histo   = machine.probabilistic_histo_walk(n);

          const total = [...histo.values()].reduce( (acc, v) => acc + v, 0 );
          expect(total).toBe(n + 1);

          for (const key of histo.keys()) {
            expect(names).toContain(key);
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('probabilistic_transition takes exactly one declared hop', () => {

    fc.assert(
      fc.property(
        ring_plan_arb,
        fc.integer(),
        ({ names, edges, fsl }, rng_seed) => {

          const machine = jssm.from(fsl, { rng_seed });

          expect(machine.probabilistic_transition()).toBe(true);

          const landed = machine.state();
          expect(edges.some( ([f, t]) => f === names[0] && t === landed )).toBe(true);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('probability-weighted branching', () => {

  test('probable_exits_for lists both branches of a weighted fork', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99 }),
        (p) => {

          const machine = jssm.from(`aa ${p}% -> bb;  aa ${100 - p}% -> cc;  bb -> aa;  cc -> aa;`);
          const exits   = machine.probable_exits_for('aa');

          expect(exits.length).toBe(2);
          expect(exits.map( e => e.to ).sort(code_unit_compare)).toEqual(['bb', 'cc']);
          expect(machine.probabilistic_transition()).toBe(true);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('long-run branch visits track the declared weights', () => {

    // From `aa`, branch to `bb` with p% else `cc`, both returning to `aa`.
    // A 2n-step walk makes ~n independent branch choices; with n = 1500
    // the observed proportion's standard deviation is at most
    // sqrt(0.25/1500) ≈ 0.013, so the ±0.08 tolerance is over 6σ.

    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: 20, max: 80 }),
        (rng_seed, p) => {

          const machine = jssm.from(
            `aa ${p}% -> bb;  aa ${100 - p}% -> cc;  bb -> aa;  cc -> aa;`,
            { rng_seed }
          );

          const histo    = machine.probabilistic_histo_walk(3000);
          const visits_b = histo.get('bb') ?? 0,
                visits_c = histo.get('cc') ?? 0;

          const observed = visits_b / (visits_b + visits_c),
                expected = p / 100;

          expect(Math.abs(observed - expected)).toBeLessThan(0.08);

        }
      ),
      { numRuns: 15 }
    );

  });

});
