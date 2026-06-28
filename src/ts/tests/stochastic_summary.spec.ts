import { describe, it, expect } from 'vitest';
import { sm } from '../jssm.js';

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
    const m = sm`a 'go' -> b;`;   // start at a; but test the terminal b via a single-state walk
    const onlyB = sm`a 'go' -> b;`;
    onlyB.transition('b');         // move live machine to terminal b
    const [r] = [...onlyB.stochastic_runs({ runs: 1, max_steps: 10, seed: 1 })];
    expect(r.terminated).toBe(true);
    expect(r.length).toBe(0);
    expect(r.states).toEqual(['b']);
  });

});
