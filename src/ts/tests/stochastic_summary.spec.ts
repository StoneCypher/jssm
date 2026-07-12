import { describe, it, expect } from 'vitest';
import { sm, STOCHASTIC_DEFAULT_RUNS } from '../jssm.js';

describe('stochastic_runs generator', () => {

  it('walks a linear chain to its terminal every run', () => {
    const m = sm`a 'go' -> b 'go' -> c;`;
    const runs = [...m.stochastic_runs({ runs: 5, max_steps: 50, seed: 1 })];
    expect(runs.length).toBe(5);
    for (const r of runs) {
      expect(r.states).toEqual(['a', 'b', 'c']);
      expect(r.edges).toEqual(['a→b', 'b→c']);
      expect(r.length).toBe(2);
      expect(r.terminated).toBe(true);
    }
  });

  it('step-caps a cyclic machine (never terminates)', () => {
    const m = sm`a 'go' -> b 'go' -> a;`;
    const [r] = [...m.stochastic_runs({ runs: 1, max_steps: 4, seed: 1 })];
    expect(r.terminated).toBe(false);
    expect(r.length).toBe(4);
    expect(r.states.length).toBe(5);   // start + 4 steps
  });

  it('treats a no-exit state as an immediately-terminal run', () => {
    const onlyB = sm`a 'go' -> b;`;
    onlyB.transition('b');         // move live machine to terminal b
    const [r] = [...onlyB.stochastic_runs({ runs: 1, max_steps: 10, seed: 1 })];
    expect(r.terminated).toBe(true);
    expect(r.length).toBe(0);
    expect(r.states).toEqual(['b']);
  });

  it('recognizes a terminal start even when the step cap is zero', () => {
    const m = sm`a 'go' -> b;`;
    m.transition('b');

    const [r] = [...m.stochastic_runs({ runs: 1, max_steps: 0, seed: 1 })];

    expect(r).toEqual({ states: ['b'], edges: [], length: 0, terminated: true });
  });

  it('keeps a nonterminal zero-step run capped', () => {
    const m = sm`a 'go' -> b;`;

    const [r] = [...m.stochastic_runs({ runs: 1, max_steps: 0, seed: 1 })];

    expect(r).toEqual({ states: ['a'], edges: [], length: 0, terminated: false });
  });

  it('recognizes a terminal reached on the final permitted step', () => {
    const m = sm`a 'go' -> b;`;

    const [r] = [...m.stochastic_runs({ runs: 1, max_steps: 1, seed: 1 })];

    expect(r).toEqual({
      states: ['a', 'b'],
      edges: ['a→b'],
      length: 1,
      terminated: true,
    });
  });

});

describe('stochastic_summary', () => {

  it('montecarlo: aggregates a linear chain deterministically', () => {
    const m = sm`a 'go' -> b 'go' -> c;`;
    const s = m.stochastic_summary({ runs: 100, max_steps: 50, seed: 7 });
    expect(s.mode).toBe('montecarlo');
    expect(s.runs).toBe(100);
    expect(s.terminal_reached).toBe(100);
    expect(s.capped).toBe(0);
    expect(s.state_visits.get('a')).toBe(100);
    expect(s.state_visits.get('c')).toBe(100);
    expect(s.edge_traversals.get('a→b')).toBe(100);
    expect(s.path_lengths!.every(l => l === 2)).toBe(true);
    // fractions sum to 1
    const total = [...s.state_visit_fraction.values()].reduce((x, y) => x + y, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('montecarlo: counts capped runs on a cyclic machine', () => {
    const m = sm`a 'go' -> b 'go' -> a;`;
    const s = m.stochastic_summary({ runs: 10, max_steps: 5, seed: 1 });
    expect(s.terminal_reached).toBe(0);
    expect(s.capped).toBe(10);
    expect(s.terminal_reached! + s.capped!).toBe(s.runs);
  });

  it('montecarlo: records zero-length terminal starts as reached', () => {
    const m = sm`a 'go' -> b;`;
    m.transition('b');

    const s = m.stochastic_summary({ runs: 3, max_steps: 0, seed: 1 });

    expect(s.terminal_reached).toBe(3);
    expect(s.capped).toBe(0);
    expect(s.path_lengths).toEqual([0, 0, 0]);
  });

  it('steady_state: omits montecarlo-only fields and uses one walk', () => {
    const m = sm`a 'go' -> b 'go' -> a;`;
    const s = m.stochastic_summary({ mode: 'steady_state', max_steps: 100, seed: 1 });
    expect(s.mode).toBe('steady_state');
    expect(s.runs).toBe(1);
    expect(s.path_lengths).toBeUndefined();
    expect(s.terminal_reached).toBeUndefined();
    expect(s.capped).toBeUndefined();
  });

  it('is reproducible: same seed + FSL => identical summary', () => {
    const fsl = `a 'x' -> b; a 'y' -> c; b 'go' -> a; c 'go' -> a;`;
    const s1 = sm`${fsl}`.stochastic_summary({ runs: 50, max_steps: 20, seed: 99 });
    const s2 = sm`${fsl}`.stochastic_summary({ runs: 50, max_steps: 20, seed: 99 });
    expect([...s1.state_visits]).toEqual([...s2.state_visits]);
    expect([...s1.edge_traversals]).toEqual([...s2.edge_traversals]);
    expect(s1.path_lengths).toEqual(s2.path_lengths);
  });

  it('is non-destructive: leaves state and rng_seed untouched', () => {
    const m = sm`a 'go' -> b 'go' -> a;`;
    const seed_before  = m.rng_seed;
    const state_before = m.state();
    m.stochastic_summary({ runs: 10, max_steps: 5, seed: 12_345 });
    expect(m.rng_seed).toBe(seed_before);
    expect(m.state()).toBe(state_before);
  });

});

describe('stochastic_summary option defaults', () => {

  it('uses editor_config().stochastic_run_count when runs is omitted (and default max_steps)', () => {
    const m = sm`editor: { stochastic_run_count: 3; }; a 'go' -> b;`;
    const s = m.stochastic_summary({ seed: 1 });
    expect(s.runs).toBe(3);
  });

  it('falls back to STOCHASTIC_DEFAULT_RUNS when nothing is declared', () => {
    const m = sm`a 'go' -> b;`;
    const s = m.stochastic_summary({ seed: 1 });
    expect(s.runs).toBe(STOCHASTIC_DEFAULT_RUNS);
  });

  it('runs without an explicit seed (time-based)', () => {
    const m = sm`a 'go' -> b;`;
    const s = m.stochastic_summary({ runs: 5 });
    expect(s.runs).toBe(5);
    const total = [...s.state_visit_fraction.values()].reduce((x, y) => x + y, 0);
    expect(total).toBeCloseTo(1, 10);
  });

});

describe('stochastic_runs seeding', () => {

  it('honors opts.seed for reproducible runs', () => {
    const fsl = `a 'x' -> b; a 'y' -> c; b 'go' -> a; c 'go' -> a;`;
    const r1 = [...sm`${fsl}`.stochastic_runs({ runs: 4, max_steps: 10, seed: 7 })].map(r => r.edges.join(','));
    const r2 = [...sm`${fsl}`.stochastic_runs({ runs: 4, max_steps: 10, seed: 7 })].map(r => r.edges.join(','));
    expect(r1).toEqual(r2);
  });

  it('leaves the machine reseeded (documented side effect; not restored)', () => {
    const m = sm`a 'go' -> b 'go' -> a;`;
    const _consumed = [...m.stochastic_runs({ runs: 2, max_steps: 5, seed: 7 })];
    expect(m.rng_seed).toBe(7);
  });

});
