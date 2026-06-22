'use strict';

const { PerformanceObserver } = require('perf_hooks');

/**
 *  GC-pressure measurement for the jssm scaling benchmark.  A PerformanceObserver
 *  collects every garbage-collection event during the run; the total pause time
 *  and count are the observable cost of the allocation pressure the per-op alloc
 *  metric measures — rising GC pause explains tail latency.
 *
 *  @see src/buildjs/benchmark_scaling.cjs (the consumer)
 */

/**
 *  Total GC count and pause milliseconds from a list of collected `gc`
 *  performance entries.
 *
 *  @param entries Array of `{ duration }` (ms) GC entries.
 *  @returns `{ count, pauseMs }`.
 *
 *  @example summarizeGc([{ duration: 2 }, { duration: 3 }]) // => { count: 2, pauseMs: 5 }
 */
function summarizeGc(entries) {
  return {
    count   : entries.length,
    pauseMs : entries.reduce((a, e) => a + e.duration, 0),
  };
}

/**
 *  Start observing GC events for the rest of the process.  `stop()` disconnects
 *  the observer and returns {@link summarizeGc} of everything seen.  Integration
 *  glue (perf_hooks); the math is in {@link summarizeGc}.
 *
 *  @returns `{ stop: () => { count, pauseMs } }`.
 *
 *  @example const t = createGcTracker(); /* ...work... *\/ const gc = t.stop();
 */
function createGcTracker() {
  const entries = [];
  const obs = new PerformanceObserver((list) => {
    for (const e of list.getEntries()) { entries.push({ duration: e.duration }); }
  });
  obs.observe({ entryTypes: ['gc'] });
  return {
    stop() { obs.disconnect(); return summarizeGc(entries); },
  };
}

module.exports = { summarizeGc, createGcTracker };
