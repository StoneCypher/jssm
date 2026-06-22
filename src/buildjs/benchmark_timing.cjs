'use strict';

/**
 *  Pure timing reductions for the jssm scaling benchmark's parse-vs-construct
 *  split and warmup pass.  Kept here (no hrtime, no jssm) so they are
 *  deterministic in unit tests; the measurement glue that feeds them lives in
 *  benchmark_scaling.cjs.
 *
 *  @see src/buildjs/benchmark_scaling.cjs (the consumer)
 */

/**
 *  Median of a list of numbers.  Empty list returns 0 (no NaN), so a missing
 *  measurement degrades cleanly.
 *
 *  @param nums Numbers.
 *  @returns The median, or 0 when empty.
 *
 *  @example median([3, 1, 2]) // => 2
 */
function median(nums) {
  if (nums.length === 0) { return 0; }
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 *  Split a full construct time into its parse and build halves.  Build time is
 *  clamped at 0 so measurement jitter can never report a negative.
 *
 *  @param parseMs Time to parse the FSL source.
 *  @param constructMs Time to parse AND build the machine.
 *  @returns `{ parseMs, constructMs, buildMs }`.
 *
 *  @example splitBuild(2, 5) // => { parseMs: 2, constructMs: 5, buildMs: 3 }
 */
function splitBuild(parseMs, constructMs) {
  return { parseMs, constructMs, buildMs: Math.max(0, constructMs - parseMs) };
}

/**
 *  Cold/warm summary of a series of per-batch times: the first batch is the
 *  cold (just-constructed / unwarmed JIT) cost, and the warm baseline is the
 *  median of the remaining batches.  A high `warmupRatio` flags a megamorphic or
 *  JIT cliff.  A single sample has no warm baseline, so the ratio is 1.
 *
 *  @param perBatchMs Per-batch times in call order (`[cold, ...warm]`).
 *  @returns `{ coldMs, warmMs, warmupRatio }`.
 *
 *  @example summarizeWarmup([10, 2, 3, 1]) // => { coldMs: 10, warmMs: 2, warmupRatio: 5 }
 */
function summarizeWarmup(perBatchMs) {
  const coldMs = perBatchMs[0] || 0;
  const rest   = perBatchMs.slice(1);
  const warmMs = rest.length ? median(rest) : coldMs;
  return { coldMs, warmMs, warmupRatio: warmMs ? coldMs / warmMs : 1 };
}

module.exports = { median, splitBuild, summarizeWarmup };
