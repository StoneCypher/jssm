'use strict';

/**
 *  Pure shape/FSL/walk helpers for the scaling benchmark harness
 *  ({@link ../benchmark_scaling.cjs}).  Extracted into their own module so they are
 *  unit-testable: `benchmark_scaling.cjs` runs the benny suite at require-time and
 *  cannot be imported from a test, whereas these functions are side-effect-free.
 *
 *  @see ../benchmark_scaling.cjs
 *  @see ./benchmark_scaling_plan.cjs
 */

/**
 *  Build the FSL for a ring of `n` states: `s0 -> s1 -> … -> s(n-1) -> s0`.
 *
 *  @param n State count (>= 2).
 *  @returns FSL source string.
 *
 *  @example buildChainFSL(3).split('\n').includes('s2 -> s0;') // => true
 */
function buildChainFSL(n) {
  const lines = ['allows_override: true;'];
  for (let i = 0; i < n - 1; ++i) lines.push(`s${i} -> s${i + 1};`);
  lines.push(`s${n - 1} -> s0;`);
  return lines.join('\n');
}

/**
 *  Build the FSL for a fully dense graph of `n` states: every distinct ordered
 *  pair `s_i -> s_j` (`i != j`), no self-loops.
 *
 *  @param n State count (>= 2).
 *  @returns FSL source string.
 *
 *  @example buildDenseFSL(3).includes('s0 -> s0;') // => false
 */
function buildDenseFSL(n) {
  const lines = ['allows_override: true;'];
  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      if (i !== j) lines.push(`s${i} -> s${j};`);
    }
  }
  return lines.join('\n');
}

/**
 *  Build the FSL for a hub-and-spoke graph: `s0` is the hub, and every other
 *  state has an edge both to and from `s0`.
 *
 *  @param n State count (>= 2).
 *  @returns FSL source string.
 *
 *  @example buildHubFSL(3).split('\n').includes('s0 -> s2;') // => true
 */
function buildHubFSL(n) {
  const lines = ['allows_override: true;'];
  for (let i = 1; i < n; ++i) {
    lines.push(`s${i} -> s0;`);
    lines.push(`s0 -> s${i};`);
  }
  return lines.join('\n');
}

module.exports = {
  buildChainFSL,
  buildDenseFSL,
  buildHubFSL
};
