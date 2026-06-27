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
  const lines = [];
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
  const lines = [];
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
  // Declare an s0-origin edge first so s0 is the machine's initial state, matching
  // chain/dense — closedWalk starts every shape's lap from s0.
  const lines = [];
  for (let i = 1; i < n; ++i) {
    lines.push(`s0 -> s${i};`);
    lines.push(`s${i} -> s0;`);
  }
  return lines.join('\n');
}

/**
 *  Build a closed walk — a sequence of transition targets that is legal from each
 *  state in turn and returns to the start state — so the benchmark can replay it
 *  across benny iterations with no `machine.override()` reset.  The walk repeats a
 *  base lap a whole number of times so it always closes; the lap is chosen to use
 *  only edges that exist in the given topology.
 *
 *  - chain/dense: one lap is `s1, s2, …, s(n-1), s0` (length `n`).  Legal in a ring
 *    (consecutive edges plus the wrap) and in a dense graph (every edge exists).
 *  - hub: one lap is `s1, s0, s2, s0, …, s(n-1), s0` (length `2(n-1)`) — only
 *    hub↔spoke edges exist, so every step goes through `s0`.
 *
 *  @param kind `'chain' | 'dense' | 'hub'`.
 *  @param n State count.
 *  @param minSteps Minimum total steps; rounded up to a whole number of laps.
 *  @returns `{ targets, stepCount }` — `targets[k]` is the state to transition to at
 *           step `k`; `stepCount === targets.length`.
 *  @throws Error on an unknown `kind`.
 *
 *  @example closedWalk('chain', 10, 100).stepCount // => 100
 *  @example closedWalk('chain', 200, 100).stepCount // => 200 (one full lap)
 */
function closedWalk(kind, n, minSteps) {
  let cycle;
  if (kind === 'chain' || kind === 'dense') {
    cycle = [];
    for (let i = 1; i < n; ++i) cycle.push(`s${i}`);
    cycle.push('s0');
  } else if (kind === 'hub') {
    cycle = [];
    for (let i = 1; i < n; ++i) { cycle.push(`s${i}`); cycle.push('s0'); }
  } else {
    throw new Error(`closedWalk: unknown kind "${kind}"`);
  }
  const laps    = Math.max(1, Math.ceil(minSteps / cycle.length));
  const targets = [];
  for (let l = 0; l < laps; ++l) targets.push(...cycle);
  return { targets, stepCount: targets.length };
}

module.exports = {
  buildChainFSL,
  buildDenseFSL,
  buildHubFSL,
  closedWalk
};
