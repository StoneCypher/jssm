// Unit tests for src/buildjs/benchmark_gc.cjs — the pure GC-entry summarizer.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const gc = require('../benchmark_gc.cjs');

describe('summarizeGc', () => {
  test('totals collection count and pause milliseconds', () => {
    expect(gc.summarizeGc([{ duration: 1.5 }, { duration: 2.5 }])).toEqual({ count: 2, pauseMs: 4 });
  });
  test('empty entry list is zero', () => {
    expect(gc.summarizeGc([])).toEqual({ count: 0, pauseMs: 0 });
  });
});
