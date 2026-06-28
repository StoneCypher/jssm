'use strict';

/**
 *  Pure planning for the jssm scaling benchmark suite: given which optional
 *  operations the *built* library under test supports, decide which topology
 *  shapes and which benchmark case-kinds to include.
 *
 *  Extracted from `benchmark_scaling.cjs` so the feature-gating logic is unit-
 *  testable without loading benny or the built `dist/`.  It exists so an *older*
 *  library — e.g. one benchmarked via `graviton_perf.cjs --harness-from <ref>`,
 *  which overlays today's harness onto a checkout that predates some operations —
 *  degrades to a partial-but-valid suite instead of crashing on a missing method.
 */

/**
 *  The shapes every build supports: pure chain/dense/hub topologies need only
 *  `sm()` and `transition()`, which are foundational (the harness drives them with
 *  closed-walk laps, so no `override()` reset is required).
 */
const BASE_SHAPES = Object.freeze([
  'chain-10', 'chain-50', 'chain-200', 'chain-1000',
  'dense-10', 'dense-50', 'dense-200',
  'hub-50', 'hub-200'
]);

/**
 *  Choose the shape names to benchmark for a given feature set.  The optional
 *  shapes are appended only when the library supports the operation they exercise:
 *  `hooked-*` needs `set_hook`, `messy-*` needs `list_exits`.
 *
 *  @param has `{ set_hook, list_exits, ... }` booleans — each
 *         true iff the built library exposes that method.
 *  @returns The ordered list of shape names to build; the base shapes always come
 *           first, in the same order, so trend tables stay aligned across runs.
 *
 *  @example
 *  plannedShapeNames({ set_hook: true, list_exits: true })
 *  // => [...BASE_SHAPES, 'hooked-200', 'messy-1000', 'messy-5000']
 *  @example
 *  plannedShapeNames({ set_hook: false, list_exits: false }).includes('hooked-200')
 *  // => false
 */
function plannedShapeNames(has) {
  const names = [...BASE_SHAPES];
  if (has.set_hook)   { names.push('hooked-200'); }
  if (has.list_exits) { names.push('messy-1000', 'messy-5000'); }
  return names;
}

/**
 *  Choose the benchmark case-kinds (operation columns) to register for a given
 *  feature set.  `transition()` and `construct()` are always measured; the
 *  action-dispatch and read-only helper columns are included only when the
 *  library exposes them.  Order is stable so trend tables line up across runs.
 *
 *  @param has Feature booleans for the optional operations.
 *  @returns The ordered list of operation tokens to register, each matching a key
 *           in `benchmark_scaling.cjs`'s case-factory map.
 *
 *  @example
 *  plannedCaseKinds({ action: true, edges_between: true, has_state: true })
 *  // => ['transition()', 'action()', 'edges_between()', 'has_state()', 'construct()']
 *  @example
 *  plannedCaseKinds({ edges_between: false, has_state: false })
 *  // => ['transition()', 'construct()']
 */
function plannedCaseKinds(has) {
  const kinds = ['transition()'];
  if (has.action)                 { kinds.push('action()'); }
  if (has.edges_between)          { kinds.push('edges_between()'); }
  if (has.has_state)              { kinds.push('has_state()'); }
  if (has.list_exit_actions)      { kinds.push('list_exit_actions()'); }
  if (has.probable_action_exits)  { kinds.push('probable_action_exits()'); }
  kinds.push('construct()');
  return kinds;
}

module.exports = { BASE_SHAPES, plannedShapeNames, plannedCaseKinds };
