'use strict';

/**
 *  Per-case regression detector for the graviton perf trail.  Compares a run's
 *  ops/sec against the previous release's, case by case, and flags any that
 *  dropped beyond a threshold — the numeric guard that catches a regression at
 *  merge time instead of weeks later in a manual archaeology dig (the very thing
 *  the 5.142–5.143 hunt needed).  Pure logic here; a consumer pairs it with the
 *  `perf_results` trail to post the flags.
 *
 *  @see src/scripts/make_perf_chart.cjs (reads the same per-run JSON)
 */

/**
 *  Cases whose ops/sec fell by at least `threshold` (fraction) versus the
 *  previous run, sorted worst-drop first.  New cases (no previous entry) and
 *  non-positive ops on either side are skipped; an improvement is never flagged.
 *
 *  @param current Current run results (`{ name, ops }[]`).
 *  @param previous Previous run results (`{ name, ops }[]`).
 *  @param threshold Minimum fractional drop to flag (default 0.08 = 8%).
 *  @returns `{ name, prevOps, ops, deltaPct }[]`, worst (most negative) first.
 *
 *  @example findRegressions([{name:'t',ops:80}], [{name:'t',ops:100}], 0.08)
 *  // => [{ name:'t', prevOps:100, ops:80, deltaPct:-20 }]
 */
function findRegressions(current, previous, threshold = 0.08) {
  const prev = new Map(previous.map((r) => [r.name, r.ops]));
  const out  = [];
  for (const r of current) {
    const p = prev.get(r.name);
    if (p > 0 && r.ops > 0) {
      const delta = r.ops / p - 1;   // negative = slower
      if (delta <= -threshold) {
        out.push({ name: r.name, prevOps: p, ops: r.ops, deltaPct: delta * 100 });
      }
    }
  }
  return out.sort((a, b) => a.deltaPct - b.deltaPct);
}

module.exports = { findRegressions };
