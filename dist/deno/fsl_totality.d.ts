/*******
 *
 *  §13 totality & termination analysis for FSL v6.
 *
 *  This module is a **self-contained** structural analysis: it operates on a
 *  plain directed-graph value (nodes + directed edges) that it defines itself,
 *  with **no coupling to the live `Machine` class**.  A future task wires the
 *  live machine graph (or the data-dependency / capture graph) into these
 *  pure functions; until then they are exercised directly against the
 *  {@link TotalityGraph} structure.
 *
 *  Two structural §13 conditions are checkable here:
 *
 *  1.  **Recursion-free by construction / acyclic data.**  §13's checkable
 *      tier is recursion-free precisely because the relevant graphs are
 *      acyclic — "no recursion through a stored lambda" and "no cycle-through
 *      slot-assignment" are both DAG properties.  {@link find_cycle} and
 *      {@link is_acyclic} decide that, returning the offending cycle as a
 *      witness when one exists.
 *
 *  2.  **Microstep bound.**  RTC settling is capped (default **100,000 per
 *      reaction**) to catch non-stabilizing eventless cycles.  Modelling each
 *      eventless microstep as a directed edge, a reaction settles iff its
 *      cascade reaches a fixpoint (a node with no eventless successor) within
 *      the bound.  {@link microstep_cascade} simulates that cascade *per
 *      reaction*, reporting whether it settled, diverged (hit the cap), or
 *      revisited a node (a true eventless loop).
 *
 *  Deferred: §13's **"terminating ≠ total"** distinction — throwing ops
 *  (div0, OOB, overflow, failed narrow) that make a function *partial* — is a
 *  runtime/operation-semantics property, not a graph property, so it is out of
 *  scope for this structural module and belongs with the expression evaluator.
 *
 *  @module fsl_totality
 *
 */
/*******
 *
 *  A single directed edge in a {@link TotalityGraph}: a `from`→`to` pair of
 *  node ids.  Self-loops (`from === to`) are permitted and detected as the
 *  shortest possible cycle.
 *
 *  @typeParam N - The node-id type (usually `string`).
 *
 */
declare type TotalityEdge<N> = {
    from: N;
    to: N;
};
/*******
 *
 *  A plain directed graph for §13 analysis: a list of node ids and a list of
 *  directed {@link TotalityEdge}s between them.  Deliberately minimal and
 *  decoupled from `Machine` — the analysis interprets `nodes`/`edges`
 *  generically, whether they come from a machine's state graph, its
 *  data-dependency graph, or its eventless-microstep cascade.
 *
 *  Invariants the analysis assumes (validated by {@link validate_graph}):
 *  node ids are unique, and every edge endpoint names a declared node.
 *
 *  @typeParam N - The node-id type (usually `string`).
 *
 */
declare type TotalityGraph<N> = {
    nodes: N[];
    edges: TotalityEdge<N>[];
};
/*******
 *
 *  The result of a cycle search.  When `acyclic` is `true` the graph is a DAG
 *  and `cycle` is `undefined`.  When `acyclic` is `false`, `cycle` is a
 *  witness: the ordered list of node ids forming the discovered cycle, where
 *  the first and last element are the same node (so a self-loop on `x` is
 *  `['x', 'x']`).
 *
 *  @typeParam N - The node-id type.
 *
 */
declare type CycleResult<N> = {
    acyclic: true;
    cycle?: undefined;
} | {
    acyclic: false;
    cycle: N[];
};
/*******
 *
 *  Why a microstep cascade stopped, per {@link microstep_cascade}.
 *
 *  - `'settled'`   — reached a fixpoint (a node with no eventless successor)
 *                    within the bound: the reaction stabilizes.  Terminating.
 *  - `'cycle'`     — revisited a node before settling: a genuine
 *                    non-stabilizing eventless loop.  Non-terminating.
 *  - `'unbounded'` — ran `bound` steps without settling *and* without an
 *                    exact revisit (only reachable when the bound is smaller
 *                    than the acyclic cascade length): the cap fired
 *                    defensively.  Treated as non-terminating for safety.
 *
 */
declare type CascadeOutcome = 'settled' | 'cycle' | 'unbounded';
/*******
 *
 *  The result of simulating one reaction's eventless-microstep cascade.
 *
 *  @typeParam N - The node-id type.
 *
 */
declare type CascadeResult<N> = {
    /** Why the cascade stopped — see {@link CascadeOutcome}. */
    outcome: CascadeOutcome;
    /** `true` iff the reaction stabilized (`outcome === 'settled'`). */
    terminates: boolean;
    /** The node ids visited, in order, including the start node. */
    path: N[];
    /** Number of microsteps taken (edges followed) before stopping. */
    steps: number;
};
/*******
 *
 *  The default per-reaction microstep cap from §13: RTC settling is bounded
 *  at 100,000 eventless microsteps per reaction to catch non-stabilizing
 *  cycles.  Configurable / disable-able by passing an explicit `bound` to
 *  {@link microstep_cascade}.
 *
 */
declare const DEFAULT_MICROSTEP_BOUND: number;
/*******
 *
 *  Validates a {@link TotalityGraph} for the structural invariants the
 *  analysis relies on: node ids must be unique, and every edge endpoint must
 *  name a declared node.  Pure; throws rather than returning a flag, since a
 *  malformed graph is a programming error, not an analysis outcome.
 *
 *  ```typescript
 *  validate_graph({ nodes: ['a', 'b'], edges: [{ from: 'a', to: 'b' }] });
 *  // (returns void — no throw)
 *  ```
 *
 *  @param graph - The graph to validate.
 *
 *  @returns Nothing; returns normally when the graph is well-formed.
 *
 *  @throws {Error} If a node id is duplicated, or an edge names an
 *                  undeclared node.
 *
 *  @see TotalityGraph
 *
 */
declare function validate_graph<N>(graph: TotalityGraph<N>): void;
/*******
 *
 *  Searches a directed graph for a cycle, returning a witness when one is
 *  found.  This is the structural decision for §13's *recursion-free by
 *  construction* / *acyclic data* guarantee: the checkable tier is acyclic,
 *  so a cycle here is exactly a "cycle-through-slot-assignment" or a
 *  "recursion through a stored lambda" violation.
 *
 *  Uses an iterative depth-first search with a three-colour marking
 *  (unvisited / on-stack / done) so it terminates on any finite graph and
 *  reconstructs the offending cycle from the DFS stack.  The witness lists the
 *  cycle's nodes in order with the entry node repeated at the end, so a
 *  self-loop on `x` reads `['x', 'x']`.
 *
 *  ```typescript
 *  find_cycle({ nodes: ['a', 'b', 'c'],
 *               edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }] });
 *  // { acyclic: true }
 *
 *  find_cycle({ nodes: ['a', 'b'],
 *               edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }] });
 *  // { acyclic: false, cycle: ['a', 'b', 'a'] }
 *
 *  find_cycle({ nodes: ['x'], edges: [{ from: 'x', to: 'x' }] });
 *  // { acyclic: false, cycle: ['x', 'x'] }
 *  ```
 *
 *  @param graph - The directed graph to search.
 *
 *  @returns A {@link CycleResult}: `{ acyclic: true }`, or
 *           `{ acyclic: false, cycle }` with the witness.
 *
 *  @throws {Error} If the graph is malformed (via {@link validate_graph}).
 *
 *  @see is_acyclic
 *
 */
declare function find_cycle<N>(graph: TotalityGraph<N>): CycleResult<N>;
/*******
 *
 *  Convenience predicate over {@link find_cycle}: `true` iff the graph is a
 *  DAG (the §13 *acyclic data* condition holds).
 *
 *  ```typescript
 *  is_acyclic({ nodes: ['a', 'b'], edges: [{ from: 'a', to: 'b' }] });  // true
 *  is_acyclic({ nodes: ['a'],      edges: [{ from: 'a', to: 'a' }] });  // false
 *  ```
 *
 *  @param graph - The directed graph to test.
 *
 *  @returns `true` when the graph contains no cycle, `false` otherwise.
 *
 *  @see find_cycle
 *
 */
declare function is_acyclic<N>(graph: TotalityGraph<N>): boolean;
/*******
 *
 *  Simulates a single reaction's eventless-microstep cascade and decides
 *  whether it settles, per §13's *microstep bound*.  Each eventless microstep
 *  is a directed edge; a reaction settles when the cascade reaches a node with
 *  no eventless successor (a fixpoint) within `bound` steps.  A node revisited
 *  before settling is a genuine non-stabilizing eventless loop.
 *
 *  The cascade is **per reaction**, deterministic, and follows the *first*
 *  eventless successor at each node (edge declaration order) — the structural
 *  question is whether *this* eventless chain stabilizes, not which branch a
 *  guard would pick at runtime.  The cap is a safety net: an exact revisit is
 *  reported as `'cycle'` immediately, but if `bound` is set below the acyclic
 *  cascade length the cap still fires as `'unbounded'`.
 *
 *  ```typescript
 *  // a → b → c, c is a fixpoint: settles
 *  microstep_cascade(
 *    { nodes: ['a', 'b', 'c'],
 *      edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }] },
 *    'a'
 *  );
 *  // { outcome: 'settled', terminates: true, path: ['a','b','c'], steps: 2 }
 *
 *  // a → b → a: a non-stabilizing eventless loop
 *  microstep_cascade(
 *    { nodes: ['a', 'b'],
 *      edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }] },
 *    'a'
 *  );
 *  // { outcome: 'cycle', terminates: false, path: ['a','b','a'], steps: 2 }
 *
 *  // bound fires before an acyclic chain settles
 *  microstep_cascade(
 *    { nodes: ['a', 'b', 'c'],
 *      edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }] },
 *    'a', 1
 *  );
 *  // { outcome: 'unbounded', terminates: false, path: ['a','b'], steps: 1 }
 *  ```
 *
 *  @param graph - The eventless-microstep graph (edges = eventless steps).
 *  @param start - The node the reaction begins settling from; must be a
 *                 declared node.
 *  @param bound - Maximum microsteps before the cap fires.  Defaults to
 *                 {@link DEFAULT_MICROSTEP_BOUND} (100,000).  Pass
 *                 `Infinity` to disable the cap (settle/cycle decided
 *                 structurally).
 *
 *  @returns A {@link CascadeResult} describing the outcome, path, and step
 *           count.
 *
 *  @throws {Error} If `start` is not a declared node, if `bound` is negative,
 *                  or if the graph is malformed.
 *
 *  @see CascadeOutcome
 *
 */
declare function microstep_cascade<N>(graph: TotalityGraph<N>, start: N, bound?: number): CascadeResult<N>;
/*******
 *
 *  Whole-graph §13 termination verdict.  A graph *terminates* in the
 *  checkable tier iff (a) it is acyclic — no recursion / no
 *  cycle-through-slot-assignment — and (b) every node's eventless cascade
 *  settles within the bound.  Returns a structured report so a caller can
 *  surface the specific violation (the offending cycle, or the node whose
 *  reaction failed to stabilize).
 *
 *  ```typescript
 *  analyze_termination({
 *    nodes: ['a', 'b', 'c'],
 *    edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }]
 *  });
 *  // { terminates: true }
 *
 *  analyze_termination({
 *    nodes: ['a', 'b'],
 *    edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }]
 *  });
 *  // { terminates: false, reason: 'cyclic', cycle: ['a','b','a'] }
 *  ```
 *
 *  @param graph - The graph to analyze (state/data/microstep graph).
 *  @param bound - Per-node microstep cap.  Defaults to
 *                 {@link DEFAULT_MICROSTEP_BOUND}.
 *
 *  @returns A verdict: `{ terminates: true }`, or `{ terminates: false }`
 *           with `reason: 'cyclic'` and the `cycle` witness, or
 *           `reason: 'unsettled'` with the `start` node and its
 *           {@link CascadeResult}.
 *
 *  @throws {Error} If the graph is malformed, or `bound` is negative.
 *
 *  @see find_cycle
 *  @see microstep_cascade
 *
 */
declare function analyze_termination<N>(graph: TotalityGraph<N>, bound?: number): {
    terminates: true;
} | {
    terminates: false;
    reason: 'cyclic';
    cycle: N[];
} | {
    terminates: false;
    reason: 'unsettled';
    start: N;
    cascade: CascadeResult<N>;
};
export { DEFAULT_MICROSTEP_BOUND, validate_graph, find_cycle, is_acyclic, microstep_cascade, analyze_termination };
export type { TotalityEdge, TotalityGraph, CycleResult, CascadeOutcome, CascadeResult };
