// Unit tests for src/scripts/perf_regression_alarm.cjs — pure per-case ops
// delta comparison that flags regressions beyond a threshold.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const alarm = require('../perf_regression_alarm.cjs');

describe('findRegressions', () => {
  test('flags per-case ops drops beyond the threshold, worst first', () => {
    const previous = [{ name: 'a', ops: 100 }, { name: 'b', ops: 100 }, { name: 'c', ops: 100 }];
    const current  = [{ name: 'a', ops: 50 },  { name: 'b', ops: 99 },  { name: 'c', ops: 70 }];
    const out = alarm.findRegressions(current, previous, 0.08);
    expect(out.map((r: { name: string }) => r.name)).toEqual(['a', 'c']);   // b within threshold
    expect(out[0].deltaPct).toBeCloseTo(-50, 6);                            // worst first
  });

  test('ignores new cases (no previous) and non-positive ops', () => {
    const out = alarm.findRegressions([{ name: 'x', ops: 10 }, { name: 'y', ops: 0 }], [{ name: 'y', ops: 100 }], 0.08);
    expect(out).toEqual([]);
  });

  test('an improvement is not a regression', () => {
    const out = alarm.findRegressions([{ name: 'a', ops: 200 }], [{ name: 'a', ops: 100 }], 0.08);
    expect(out).toEqual([]);
  });
});
