// Unit tests for src/buildjs/benchmark_timing.cjs — pure timing reductions used
// by the parse-vs-construct split and the warmup pass.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const t = require('../benchmark_timing.cjs');

describe('median', () => {
  test('odd-length returns the middle, even-length averages the two middles', () => {
    expect(t.median([3, 1, 2])).toBe(2);
    expect(t.median([4, 1, 3, 2])).toBe(2.5);
  });
  test('empty list is NaN-free zero', () => {
    expect(t.median([])).toBe(0);
  });
});

describe('splitBuild', () => {
  test('build = construct - parse', () => {
    expect(t.splitBuild(2, 5)).toEqual({ parseMs: 2, constructMs: 5, buildMs: 3 });
  });
  test('never reports negative build time (clamped at 0)', () => {
    expect(t.splitBuild(6, 5).buildMs).toBe(0);
  });
});

describe('summarizeWarmup', () => {
  test('cold is the first batch, warm is the median of the rest', () => {
    const out = t.summarizeWarmup([10, 2, 3, 1]);   // cold 10, warm median(2,3,1)=2
    expect(out.coldMs).toBe(10);
    expect(out.warmMs).toBe(2);
    expect(out.warmupRatio).toBe(5);                // 10 / 2
  });
  test('single sample has no warm baseline -> ratio 1', () => {
    expect(t.summarizeWarmup([7])).toEqual({ coldMs: 7, warmMs: 7, warmupRatio: 1 });
  });
});
