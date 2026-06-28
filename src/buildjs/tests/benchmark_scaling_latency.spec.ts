// Unit tests for src/buildjs/benchmark_scaling_latency.cjs — injects per-op
// latency spread (min/median/max ms) from benny's details into scaling.json.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const lat = require('../benchmark_scaling_latency.cjs');

describe('injectLatency', () => {
  test('writes min/median/max latency in ms from benny details, matched by name', () => {
    const data = { results: [
      { name: 'chain-10 transition()', ops: 5 },
      { name: 'unmatched-row',         ops: 1 },
    ]};
    const summary = { results: [
      { name: 'chain-10 transition()', details: { min: 0.001, median: 0.002, max: 0.010 } },
    ]};

    lat.injectLatency(data, summary);

    expect(data.results[0].latencyMsMin).toBeCloseTo(1, 9);     // 0.001 s/op -> 1 ms
    expect(data.results[0].latencyMsMedian).toBeCloseTo(2, 9);
    expect(data.results[0].latencyMsMax).toBeCloseTo(10, 9);    // worst sample = tail
    expect(data.results[1].latencyMsMin).toBeUndefined();       // no matching summary entry
  });

  test('leaves rows untouched when the summary entry lacks details', () => {
    const data = { results: [{ name: 'x', ops: 1 }] };
    lat.injectLatency(data, { results: [{ name: 'x' }] });
    expect(data.results[0]).toEqual({ name: 'x', ops: 1 });
  });
});
