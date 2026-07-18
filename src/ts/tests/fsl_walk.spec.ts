import { describe, it, expect } from 'vitest';
import { sm }        from '../jssm.js';
import { plan_walk } from '../fsl_walk.js';

describe('plan_walk', () => {

  it('follows main-path edges from the start state, stopping at the first revisit', () => {
    const machine = sm`Red => Green => Yellow => Red; Red -> FlashingRed;`;
    expect(plan_walk(machine)).toEqual(['Red', 'Green', 'Yellow']);
  });

  it('stops when the main path dead-ends', () => {
    const machine = sm`A => B => C; C -> A;`;
    expect(plan_walk(machine)).toEqual(['A', 'B', 'C']);
  });

  it('tours every edge in declaration order when no main path exists', () => {
    const machine = sm`A -> B; C -> D;`;
    expect(plan_walk(machine)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('collapses consecutive duplicates in a connected tour', () => {
    const machine = sm`A -> B; B -> C;`;
    expect(plan_walk(machine)).toEqual(['A', 'B', 'C']);
  });

});
