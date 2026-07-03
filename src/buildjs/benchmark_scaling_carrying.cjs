'use strict';

/**
 *  Carrying-cost measurement for the jssm scaling benchmark — spec item #5
 *  ("carrying cost, generalized") from the 2026-06-22 instrumentation spec:
 *  what a plain machine pays, in retained bytes, for features it DECLARES but
 *  never uses.  The general benny suite already pins the per-op carrying of
 *  after/named hooks; this module adds the footprint side for groups and
 *  properties, the two declaration families the 5.142–5.143 investigation
 *  named.  All measurement goes through benchmark_scaling_memory's injectable
 *  `{ gc, heapUsed }` seam and degrades to an empty row set without
 *  `--expose-gc`, exactly like the other memory metrics.
 *
 *  @see ./benchmark_scaling_memory.cjs (the measurement primitives)
 *  @see ./benchmark_scaling.cjs (the consumer)
 */

const memory = require('./benchmark_scaling_memory.cjs');

/**
 *  FSL sources for one carrying comparison at chain length `n`: a plain
 *  chain, and variants that add ONLY an unused declaration on top of the
 *  identical chain — a group naming the first two states but never used as a
 *  transition source or target, and a defaulted property nothing reads.
 *
 *  @param n Chain length (number of states; `n >= 2`).
 *  @returns `{ plain, groups, property }` FSL source strings.
 *  @throws Error when `n < 2` (a one-state chain cannot carry an edge).
 *
 *  @example carryingSources(3).plain  // => 's0 -> s1;\ns1 -> s2;'
 */
function carryingSources(n) {
  if (!Number.isInteger(n) || n < 2) { throw new Error(`carryingSources: n must be an integer >= 2; got ${n}`); }
  const lines = [];
  for (let i = 0; i < n - 1; ++i) { lines.push(`s${i} -> s${i + 1};`); }
  const plain = lines.join('\n');
  return {
    plain,
    groups   : `&Unused: [s0 s1];\n${plain}`,
    property : `property pcarry default "x";\n${plain}`
  };
}

/**
 *  Measure the carrying footprint deltas at the given chain sizes: for each
 *  size, retained bytes of each variant minus retained bytes of the plain
 *  chain.  A positive delta is the price of merely declaring the feature.
 *
 *  @param smFn The `sm` template function of the library under test (passed
 *    in, not required here, so `--harness-from` overlays measure the old
 *    library with today's instrument).
 *  @param sizes Chain lengths to measure, e.g. `[10, 200]`.
 *  @param seam Injectable `{ gc, heapUsed }`; defaults to the real one.
 *  @returns Array of rows `{ name, deltaBytes, variantBytes, plainBytes }`,
 *    empty when the GC is not exposed (graceful, like the sibling metrics).
 *
 *  @example
 *  collectCarrying(sm, [10])[0]
 *  // => { name: 'carrying groups n=10', deltaBytes: 1234, ... }
 */
function collectCarrying(smFn, sizes, seam = memory.defaultSeam()) {
  if (typeof seam.gc !== 'function') { return []; }

  const rows = [];
  for (const n of sizes) {
    const src = carryingSources(n);
    const plainBytes = memory.measureRetainedBytes(() => smFn([src.plain]), seam);
    for (const variant of ['groups', 'property']) {
      const variantBytes = memory.measureRetainedBytes(() => smFn([src[variant]]), seam);
      rows.push({
        name       : `carrying ${variant} n=${n}`,
        deltaBytes : variantBytes - plainBytes,
        variantBytes,
        plainBytes
      });
    }
  }
  return rows;
}

/**
 *  Append carrying rows to a parsed `scaling.json` in place.  Additive and
 *  total, like `injectMemoryFields`: existing rows are never touched, and an
 *  empty row set (no GC) changes nothing.  Novel row names are ignored by the
 *  chart builder's known families, so the trail stays clean until the chart
 *  opts in.
 *
 *  @param data Parsed scaling.json (`{ results: [...] }`); mutated in place.
 *  @param rows Rows from {@link collectCarrying}.
 *  @returns void.
 *
 *  @example injectCarryingRows(data, collectCarrying(sm, [10]))
 */
function injectCarryingRows(data, rows) {
  for (const r of rows) { data.results.push(r); }
}

module.exports = { carryingSources, collectCarrying, injectCarryingRows };
