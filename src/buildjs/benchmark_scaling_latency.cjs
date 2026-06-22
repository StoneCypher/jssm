'use strict';

/**
 *  Latency-spread injection for the jssm scaling benchmark.  benny reports per
 *  case a `details` block with min/median/max seconds-per-op across its samples;
 *  the MAX is the slowest sample — the GC-pause / megamorphic tail that the mean
 *  ops/sec hides.  This adds that spread (in ms) to scaling.json additively.
 *
 *  @see src/buildjs/benchmark_scaling.cjs (the consumer)
 */

/**
 *  Inject `latencyMsMin` / `latencyMsMedian` / `latencyMsMax` onto each
 *  scaling.json result from the benny summary's matching `details` (seconds/op,
 *  scaled to ms).  Rows with no matching summary entry, or whose entry lacks
 *  `details`, are left untouched.
 *
 *  @param data Parsed scaling.json (`{ results: [...] }`); mutated in place.
 *  @param summary The benny `Summary` from the `complete` handler.
 *  @returns void.
 *
 *  @example injectLatency(data, summary)
 */
function injectLatency(data, summary) {
  const byName = new Map(summary.results.map((r) => [r.name, r]));
  for (const r of data.results) {
    const src = byName.get(r.name);
    if (src && src.details) {
      r.latencyMsMin    = src.details.min * 1000;
      r.latencyMsMedian = src.details.median * 1000;
      r.latencyMsMax    = src.details.max * 1000;
    }
  }
}

module.exports = { injectLatency };
