// Unit tests for src/buildjs/benchmark_scaling_exponents.cjs — pure log-log
// fitting of the size sweep into a per-op/family cost exponent. Exact-value /
// toBeCloseTo assertions per house rules (no golden files).

// eslint-disable-next-line @typescript-eslint/no-var-requires
const exp = require('../benchmark_scaling_exponents.cjs');

describe('parseShape', () => {
  test('splits family and size', () => {
    expect(exp.parseShape('dense-200')).toEqual({ family: 'dense', n: 200 });
    expect(exp.parseShape('messy-5000')).toEqual({ family: 'messy', n: 5000 });
  });
  test('returns null on an unparseable name', () => {
    expect(exp.parseShape('weird')).toBeNull();
  });
});

describe('logLogFit', () => {
  test('recovers the exponent of a clean power law y = x^2 (slope 2, r2 1)', () => {
    const pts = [10, 50, 200, 1000].map((x) => ({ x, y: x * x }));
    const { slope, r2 } = exp.logLogFit(pts);
    expect(slope).toBeCloseTo(2, 6);
    expect(r2).toBeCloseTo(1, 6);
  });
  test('recovers a flat (constant) relationship as slope 0', () => {
    const pts = [10, 50, 200].map((x) => ({ x, y: 42 }));
    const { slope } = exp.logLogFit(pts);
    expect(slope).toBeCloseTo(0, 6);
  });
});

describe('computeExponents', () => {
  test('emits exponent (=-slope) and r2 per op and family', () => {
    const results = [
      { name: 'chain-10 edges_between()',   ops: 1000 },
      { name: 'chain-100 edges_between()',  ops: 100 },     // ops ∝ 1/N -> cost exponent 1
      { name: 'chain-1000 edges_between()', ops: 10 },
      { name: 'dense-10 edges_between()',   ops: 50 },      // single dense point -> skipped
    ];
    const out = exp.computeExponents(results);
    expect(out['edges_between()'].chain.exponent).toBeCloseTo(1, 6);
    expect(out['edges_between()'].chain.r2).toBeCloseTo(1, 6);
    expect(out['edges_between()'].chain.points).toBe(3);
    expect(out['edges_between()'].dense).toBeUndefined();   // <2 points
  });

  test('skips non-positive ops and unparseable shapes without throwing', () => {
    const results = [
      { name: 'chain-10 transition()',  ops: 0 },
      { name: 'weird transition()',     ops: 5 },
      { name: 'chain-50 transition()',  ops: 5 },
    ];
    const out = exp.computeExponents(results);
    expect(out['transition()']).toBeUndefined();   // only one usable point
  });
});
