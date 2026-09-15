
import { describe, test, expect } from 'vitest';

import {
  sm, from as sm_from, JssmError,
  state, go,
  start_state_weights, sample_start_state, probable_exits_for,
  probabilistic_transition, probabilistic_walk, probabilistic_histo_walk,
  stochastic_runs, stochastic_summary, rng_seed, set_rng_seed,
  STOCHASTIC_DEFAULT_RUNS, STOCHASTIC_DEFAULT_MAX_STEPS
} from '../jssm';





// Direct tests of the stochastic family as bare functions.  Every expected
// value is readable from the FSL text the test builds the machine from, or
// from the declared defaults; seeded draws are compared across two machines
// built from the same text, never against the machine's own output.

const WEIGHTED = 'start_states: [a 90% b 10%]; a -> b -> a;';
const CYCLE    = 'a -> b; a -> c; b -> a; c -> a;';
const LINE     = `a 'go' -> b 'go' -> c;`;



describe('bare functions — stochastic family', () => {



  describe('start_state_weights', () => {

    test('reports the normalized shares of a weighted start_states list', () => {
      const w = start_state_weights(sm_from(WEIGHTED));
      expect(w.size).toBe(2);
      expect(w.get('a')).toBeCloseTo(0.9, 10);
      expect(w.get('b')).toBeCloseTo(0.1, 10);
    });

    test('is empty on an unweighted machine', () => {
      expect(start_state_weights(sm`start_states: [x y]; x -> y;`).size).toBe(0);
    });

    test('returns a copy; mutating it does not change the machine', () => {
      const m = sm_from(WEIGHTED);
      start_state_weights(m).set('a', 0);
      expect(start_state_weights(m).get('a')).toBeCloseTo(0.9, 10);
    });

    test('agrees with the class method', () => {
      const m = sm_from(WEIGHTED);
      expect(start_state_weights(m)).toStrictEqual(m.start_state_weights());
    });

  });



  describe('sample_start_state', () => {

    test('on an unweighted machine returns the first declared start state without moving the machine', () => {
      const m = sm`start_states: [x y]; x -> y -> x;`;
      go(m, 'y');
      expect(sample_start_state(m)).toBe('x');
      expect(state(m)).toBe('y');
    });

    test('with a fixed seed, 1000 draws on [a 90% b 10%] favour a and never leave the declared list', () => {
      const m = sm_from(WEIGHTED);
      set_rng_seed(m, 12_345);
      let a = 0, b = 0;
      for (let i = 0; i < 1000; ++i) {
        const s = sample_start_state(m);
        expect(['a', 'b']).toContain(s);
        if (s === 'a') { a += 1; } else { b += 1; }
      }
      expect(a).toBeGreaterThan(b);
      expect(a + b).toBe(1000);
    });

    test('two machines with the same seed draw the same sequence', () => {
      const m1 = sm_from(WEIGHTED), m2 = sm_from(WEIGHTED);
      set_rng_seed(m1, 7);
      set_rng_seed(m2, 7);
      const d1 = Array.from({ length: 50 }, () => sample_start_state(m1));
      const d2 = Array.from({ length: 50 }, () => sample_start_state(m2));
      expect(d1).toStrictEqual(d2);
    });

  });



  describe('probable_exits_for', () => {

    test('lists every legal exit when none declares a probability, excluding forced-only edges', () => {
      const m = sm`a -> b; a -> c; a ~> d;`;
      expect(probable_exits_for(m, 'a').map(e => e.to)).toStrictEqual(['b', 'c']);
    });

    test('keeps only the probability-bearing exits when any exit declares one', () => {
      const m = sm`a 50% -> b; a -> c;`;
      expect(probable_exits_for(m, 'a').map(e => e.to)).toStrictEqual(['b']);
    });

    test('is empty at a terminal state', () => {
      expect(probable_exits_for(sm`a -> b;`, 'b')).toStrictEqual([]);
    });

    test('throws a JssmError for an unknown state', () => {
      expect(() => probable_exits_for(sm`a -> b;`, 'zed')).toThrow(JssmError);
    });

  });



  describe('probabilistic_transition', () => {

    test('takes the only exit and reports true', () => {
      const m = sm`a -> b;`;
      expect(probabilistic_transition(m)).toBe(true);
      expect(state(m)).toBe('b');
    });

    test('throws a JssmError when every candidate exit is 0%', () => {
      const m = sm`a 0% -> b; a 0% -> c;`;
      expect(() => probabilistic_transition(m)).toThrow(JssmError);
      expect(state(m)).toBe('a');
    });

    test('with the same seed, two machines take the same exits', () => {
      const m1 = sm_from(CYCLE), m2 = sm_from(CYCLE);
      set_rng_seed(m1, 99);
      set_rng_seed(m2, 99);
      for (let i = 0; i < 30; ++i) {
        expect(probabilistic_transition(m1)).toBe(true);
        expect(probabilistic_transition(m2)).toBe(true);
        expect(state(m1)).toBe(state(m2));
      }
    });

  });



  describe('probabilistic_walk', () => {

    test('with the same seed, a 20-step walk is reproducible across two machines', () => {
      const m1 = sm_from(CYCLE), m2 = sm_from(CYCLE);
      set_rng_seed(m1, 2024);
      set_rng_seed(m2, 2024);
      const w1 = probabilistic_walk(m1, 20);
      const w2 = probabilistic_walk(m2, 20);
      expect(w1).toStrictEqual(w2);
      expect(w1.length).toBe(21);
      expect(w1[0]).toBe('a');
      expect(w1[20]).toBe(state(m1));
    });

    test('on a single-exit cycle the walk is the alternation the text declares', () => {
      const m = sm`a -> b -> a;`;
      expect(probabilistic_walk(m, 4)).toStrictEqual(['a', 'b', 'a', 'b', 'a']);
    });

  });



  describe('probabilistic_histo_walk', () => {

    test('counts visits along the walk, including the final state', () => {
      const m = sm`a -> b -> a;`;
      const h = probabilistic_histo_walk(m, 4);
      expect(h.get('a')).toBe(3);
      expect(h.get('b')).toBe(2);
      expect(h.size).toBe(2);
    });

  });



  describe('stochastic_runs', () => {

    test('yields the requested number of runs', () => {
      const m = sm_from(LINE);
      expect([...stochastic_runs(m, { runs: 3, seed: 1 })].length).toBe(3);
    });

    test('each run on a straight line reaches the terminal in two steps', () => {
      const m    = sm_from(LINE);
      const runs = stochastic_runs(m, { runs: 4, seed: 1 });
      for (const run of runs) {
        expect(run.states).toStrictEqual(['a', 'b', 'c']);
        expect(run.edges).toStrictEqual(['a→b', 'b→c']);
        expect(run.length).toBe(2);
        expect(run.terminated).toBe(true);
      }
    });

    test('steady_state mode yields exactly one walk of max_steps steps', () => {
      const m = sm`a -> b -> a;`;
      const runs = [...stochastic_runs(m, { mode: 'steady_state', max_steps: 5, runs: 9 })];
      expect(runs.length).toBe(1);
      expect(runs[0].length).toBe(5);
      expect(runs[0].terminated).toBe(false);
    });

    test('a seed reseeds the machine and is not restored afterwards', () => {
      const m = sm_from(LINE);
      set_rng_seed(m, 5);
      const drained = [...stochastic_runs(m, { runs: 1, seed: 1 })];
      expect(drained.length).toBe(1);
      expect(rng_seed(m)).toBe(1);
    });

    test('is lazy: the seed is applied on the first next(), not at the call', () => {
      const m = sm_from(LINE);
      set_rng_seed(m, 5);
      const gen = stochastic_runs(m, { runs: 1, seed: 1 });
      expect(rng_seed(m)).toBe(5);
      gen.next();
      expect(rng_seed(m)).toBe(1);
    });

    test('does not move the machine', () => {
      const m = sm_from(LINE);
      const drained = [...stochastic_runs(m, { runs: 3, seed: 1 })];
      expect(drained.length).toBe(3);
      expect(state(m)).toBe('a');
    });

    test('the class generator agrees with the function generator', () => {
      const m1 = sm_from(CYCLE), m2 = sm_from(CYCLE);
      const r1 = [...m1.stochastic_runs({ runs: 5, seed: 3, max_steps: 6 })];
      const r2 = [...stochastic_runs(m2, { runs: 5, seed: 3, max_steps: 6 })];
      expect(r2).toStrictEqual(r1);
    });

  });



  describe('stochastic_summary', () => {

    test('respects runs', () => {
      const s = stochastic_summary(sm_from(LINE), { runs: 7, seed: 1 });
      expect(s.runs).toBe(7);
      expect(s.terminal_reached).toBe(7);
      expect(s.capped).toBe(0);
      expect(s.path_lengths).toStrictEqual([2, 2, 2, 2, 2, 2, 2]);
      expect(s.seed).toBe(1);
      expect(s.mode).toBe('montecarlo');
    });

    test('counts state visits and edge traversals across the runs', () => {
      const s = stochastic_summary(sm_from(LINE), { runs: 3, seed: 1 });
      expect(s.state_visits.get('a')).toBe(3);
      expect(s.state_visits.get('b')).toBe(3);
      expect(s.state_visits.get('c')).toBe(3);
      expect(s.state_visit_fraction.get('a')).toBeCloseTo(1 / 3, 10);
      expect(s.edge_traversals.get('a→b')).toBe(3);
      expect(s.edge_traversals.get('b→c')).toBe(3);
    });

    test('falls back to STOCHASTIC_DEFAULT_RUNS when neither runs nor an editor declaration is given', () => {
      expect(stochastic_summary(sm_from(LINE), { seed: 1 }).runs).toBe(STOCHASTIC_DEFAULT_RUNS);
    });

    test('honours the editor stochastic_run_count declaration', () => {
      expect(stochastic_summary(sm`editor: { stochastic_run_count: 5; }; a -> b;`, { seed: 1 }).runs).toBe(5);
    });

    test('steady_state mode omits the per-run fields', () => {
      const s = stochastic_summary(sm`a -> b -> a;`, { mode: 'steady_state', max_steps: 4, seed: 1 });
      expect(s.runs).toBe(1);
      expect(s.path_lengths).toBeUndefined();
      expect(s.terminal_reached).toBeUndefined();
      expect(s.capped).toBeUndefined();
    });

    test('is non-destructive: state and seed are restored', () => {
      const m = sm_from(LINE);
      set_rng_seed(m, 77);
      stochastic_summary(m, { runs: 3, seed: 1 });
      expect(state(m)).toBe('a');
      expect(rng_seed(m)).toBe(77);
    });

    test('restores the seed even when a run throws', () => {
      const m = sm`a 0% -> b; a 0% -> c;`;
      set_rng_seed(m, 77);
      expect(() => stochastic_summary(m, { runs: 1, seed: 1 })).toThrow(JssmError);
      expect(rng_seed(m)).toBe(77);
    });

  });



  describe('rng_seed / set_rng_seed', () => {

    test('round-trips a numeric seed', () => {
      const m = sm`a -> b;`;
      set_rng_seed(m, 42);
      expect(rng_seed(m)).toBe(42);
      expect(m.rng_seed).toBe(42);
    });

    test('a seed given at construction is readable', () => {
      expect(rng_seed(sm_from('a -> b;', { rng_seed: 5 }))).toBe(5);
    });

    test('undefined reseeds from the clock to a number', () => {
      const m = sm`a -> b;`;
      set_rng_seed(m, undefined);
      expect(typeof rng_seed(m)).toBe('number');
    });

    test('the class setter and set_rng_seed produce the same walk', () => {
      const m1 = sm_from(CYCLE), m2 = sm_from(CYCLE);
      m1.rng_seed = 31_337;
      set_rng_seed(m2, 31_337);
      expect(probabilistic_walk(m1, 25)).toStrictEqual(probabilistic_walk(m2, 25));
    });

  });



  describe('constants', () => {

    test('the declared defaults are 1000 runs and 1000 steps', () => {
      expect(STOCHASTIC_DEFAULT_RUNS).toBe(1000);
      expect(STOCHASTIC_DEFAULT_MAX_STEPS).toBe(1000);
    });

  });

});
