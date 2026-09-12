import { describe, it, expect } from 'vitest';
import * as jssm from '../jssm';

const weighted = () => jssm.sm`start_states: [idle 90% booting 10%]; idle -> busy -> idle; booting -> idle;`;

describe('weighted start states', () => {

  it('start_state_weights normalizes to a sum of 1', () => {
    const w = weighted().start_state_weights();
    expect(w.get('idle')).toBeCloseTo(0.9, 10);
    expect(w.get('booting')).toBeCloseTo(0.1, 10);
    expect([...w.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it('an unweighted machine has an empty weight map', () => {
    expect(jssm.sm`start_states: [idle booting]; idle -> booting;`.start_state_weights().size).toBe(0);
    expect(jssm.sm`a -> b;`.start_state_weights().size).toBe(0);
  });

  it('the constructed machine still starts at the first listed state', () => {
    expect(weighted().state()).toBe('idle');
    expect(jssm.sm`start_states: [booting 10% idle 90%]; idle -> booting;`.state()).toBe('booting');
  });

  it('is_start_state is unchanged', () => {
    const m = weighted();
    expect(m.is_start_state('idle')).toBe(true);
    expect(m.is_start_state('booting')).toBe(true);
    expect(m.is_start_state('busy')).toBe(false);
  });

  it('sample_start_state draws from the weights, seeded', () => {
    const m = weighted();
    m.rng_seed = 11;
    const counts = new Map<string, number>();
    for (let i = 0; i < 2000; ++i) { const s = m.sample_start_state(); counts.set(s, (counts.get(s) ?? 0) + 1); }
    expect(Math.abs((counts.get('idle') ?? 0) / 2000 - 0.9)).toBeLessThan(0.04);
  });

  it('sample_start_state on an unweighted machine returns the first start state', () => {
    expect(jssm.sm`start_states: [x y]; x -> y;`.sample_start_state()).toBe('x');
  });

  it('stochastic_runs starts each run from a sampled start state when weights are declared', () => {
    const m = weighted();
    const runs = [...m.stochastic_runs({ runs: 2000, seed: 5, max_steps: 0 })];
    const booting = runs.filter(r => r.states[0] === 'booting').length;
    expect(Math.abs(booting / 2000 - 0.1)).toBeLessThan(0.04);
  });

  it('stochastic_runs on an unweighted machine still starts from the current state', () => {
    const m = jssm.sm`start_states: [x y]; x -> y -> x;`;
    m.go('y');
    const runs = [...m.stochastic_runs({ runs: 20, seed: 5, max_steps: 0 })];
    expect(runs.every(r => r.states[0] === 'y')).toBe(true);
  });

  it('a weighted start_states naming an unknown state is rejected like an unweighted one', () => {
    expect(() => jssm.sm`start_states: [idle 50% ghost 50%]; idle -> busy;`).toThrow();
  });

});
