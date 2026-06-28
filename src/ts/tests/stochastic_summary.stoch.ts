import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { sm } from '../jssm.js';
import { chain_plan_arb, ring_plan_arb } from './stoch_helpers.js';



describe('stochastic_summary properties', () => {

  /**
   * For a montecarlo walk, the fraction of time spent in each state must
   * sum to exactly 1.0 (accounting for floating-point rounding).  Chain
   * machines always terminate so every run contributes a path.
   */
  it('state_visit_fraction always sums to ~1 (montecarlo, chains)', () => {
    fc.assert(fc.property(chain_plan_arb, fc.integer({ min: 1, max: 50 }), ({ fsl }, seed) => {
      const s     = sm`${fsl}`.stochastic_summary({ runs: 20, max_steps: 100, seed });
      const total = [...s.state_visit_fraction.values()].reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 8);
    }));
  });

  /**
   * Every montecarlo run ends in exactly one of two ways: it reached a
   * terminal state, or it hit the step cap.  So terminal_reached + capped
   * must equal runs for any machine topology.
   */
  it('terminal_reached + capped === runs (montecarlo)', () => {
    fc.assert(fc.property(ring_plan_arb, fc.integer({ min: 1, max: 50 }), ({ fsl }, seed) => {
      const s = sm`${fsl}`.stochastic_summary({ runs: 25, max_steps: 30, seed });
      expect((s.terminal_reached ?? 0) + (s.capped ?? 0)).toBe(s.runs);
    }));
  });

  /**
   * Every key in state_visits must name a real state in the machine, and the
   * start state must always appear — a walk always visits at least one step.
   */
  it('every visited state is a real state name; the start state always appears', () => {
    fc.assert(fc.property(chain_plan_arb, fc.integer({ min: 1, max: 50 }), ({ fsl, names }) => {
      const machine = sm`${fsl}`;
      const start   = machine.state();
      const s       = machine.stochastic_summary({ runs: 10, max_steps: 50, seed: 1 });
      expect(s.state_visits.has(start)).toBe(true);
      for (const visited of s.state_visits.keys()) { expect(names).toContain(visited); }
    }));
  });

});
