import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const plan = require('../benchmark_scaling_plan.cjs');

// These exercise the pure feature-gating logic the scaling harness uses to decide
// which shapes and case-kinds to run against a given build — so an older library
// (benchmarked via graviton_perf --harness-from) degrades to a partial suite
// instead of crashing on a missing method.

const ALL = { set_hook: true, list_exits: true, edges_between: true, has_state: true };
const NONE = { set_hook: false, list_exits: false, edges_between: false, has_state: false };

describe('plannedShapeNames — feature-gated shape selection', () => {

  test('a full-API build includes every shape (the historical 12)', () => {
    const names = plan.plannedShapeNames(ALL);
    expect(names).toContain('hooked-200');
    expect(names).toContain('messy-1000');
    expect(names).toContain('messy-5000');
    expect(names.length).toBe(12);
  });

  test('drops hooked-* when set_hook is absent', () => {
    const names = plan.plannedShapeNames({ ...ALL, set_hook: false });
    expect(names).not.toContain('hooked-200');
    expect(names).toContain('messy-1000');
  });

  test('drops messy-* when list_exits is absent', () => {
    const names = plan.plannedShapeNames({ ...ALL, list_exits: false });
    expect(names).not.toContain('messy-1000');
    expect(names).not.toContain('messy-5000');
    expect(names).toContain('hooked-200');
  });

  test('always keeps the core chain/dense/hub shapes, in order', () => {
    expect(plan.plannedShapeNames(NONE)).toEqual([
      'chain-10', 'chain-50', 'chain-200', 'chain-1000',
      'dense-10', 'dense-50', 'dense-200',
      'hub-50', 'hub-200'
    ]);
  });

  test('the base shapes are always a stable leading prefix', () => {
    const full = plan.plannedShapeNames(ALL);
    expect(full.slice(0, plan.BASE_SHAPES.length)).toEqual([...plan.BASE_SHAPES]);
  });

});

describe('plannedCaseKinds — feature-gated case selection', () => {

  test('a full-API build runs all four case kinds in column order', () => {
    expect(plan.plannedCaseKinds(ALL))
      .toEqual(['transition()', 'edges_between()', 'has_state()', 'construct()']);
  });

  test('drops edges_between() when the op is absent', () => {
    expect(plan.plannedCaseKinds({ ...ALL, edges_between: false }))
      .toEqual(['transition()', 'has_state()', 'construct()']);
  });

  test('drops has_state() when the op is absent', () => {
    expect(plan.plannedCaseKinds({ ...ALL, has_state: false }))
      .toEqual(['transition()', 'edges_between()', 'construct()']);
  });

  test('transition() and construct() are always present, even with no optional ops', () => {
    expect(plan.plannedCaseKinds(NONE)).toEqual(['transition()', 'construct()']);
  });

});
