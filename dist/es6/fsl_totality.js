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
 *  The default per-reaction microstep cap from §13: RTC settling is bounded
 *  at 100,000 eventless microsteps per reaction to catch non-stabilizing
 *  cycles.  Configurable / disable-able by passing an explicit `bound` to
 *  {@link microstep_cascade}.
 *
 */
const DEFAULT_MICROSTEP_BOUND = 100000;
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
function validate_graph(graph) {
    const seen = new Set();
    for (const node of graph.nodes) {
        if (seen.has(node)) {
            throw new Error(`fsl_totality: duplicate node id ${String(node)}`);
        }
        seen.add(node);
    }
    for (const edge of graph.edges) {
        if (!seen.has(edge.from)) {
            throw new Error(`fsl_totality: edge from undeclared node ${String(edge.from)}`);
        }
        if (!seen.has(edge.to)) {
            throw new Error(`fsl_totality: edge to undeclared node ${String(edge.to)}`);
        }
    }
}
/*******
 *
 *  Builds an adjacency map (`node → ordered successors`) from a graph's edge
 *  list, preserving edge declaration order so cycle witnesses and cascade
 *  paths are deterministic.  Every declared node gets an entry, even with no
 *  outgoing edges (so a fixpoint node maps to `[]`).  Internal helper.
 *
 *  ```typescript
 *  build_adjacency({ nodes: ['a', 'b'], edges: [{ from: 'a', to: 'b' }] });
 *  // Map { 'a' => ['b'], 'b' => [] }
 *  ```
 *
 *  @param graph - A well-formed {@link TotalityGraph}.
 *
 *  @returns A `Map` from each node id to its ordered list of successor ids.
 *
 */
function build_adjacency(graph) {
    const adjacency = new Map();
    for (const node of graph.nodes) {
        adjacency.set(node, []);
    }
    for (const edge of graph.edges) {
        // every endpoint is declared (validate_graph), so get() is defined
        (adjacency.get(edge.from)).push(edge.to);
    }
    return adjacency;
}
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
function find_cycle(graph) {
    validate_graph(graph);
    const adjacency = build_adjacency(graph);
    const WHITE = 0, // unvisited
    GREY = 1, // on the current DFS stack
    BLACK = 2; // fully explored, no cycle through it
    const colour = new Map();
    for (const node of graph.nodes) {
        colour.set(node, WHITE);
    }
    for (const root of graph.nodes) {
        if (colour.get(root) !== WHITE) {
            continue;
        }
        const stack = [{ node: root, next: 0 }];
        const path = [root];
        colour.set(root, GREY);
        while (stack.length > 0) {
            const frame = stack[stack.length - 1];
            const succs = adjacency.get(frame.node);
            if (frame.next < succs.length) {
                const child = succs[frame.next];
                frame.next += 1;
                const child_colour = colour.get(child);
                if (child_colour === GREY) {
                    // back edge into the active stack: slice the cycle out of `path`
                    const start = path.indexOf(child);
                    return { acyclic: false, cycle: [...path.slice(start), child] };
                }
                if (child_colour === WHITE) {
                    colour.set(child, GREY);
                    path.push(child);
                    stack.push({ node: child, next: 0 });
                }
                // BLACK child: already proven cycle-free, skip
            }
            else {
                // exhausted this node's successors: pop and blacken
                colour.set(frame.node, BLACK);
                stack.pop();
                path.pop();
            }
        }
    }
    return { acyclic: true };
}
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
function is_acyclic(graph) {
    return find_cycle(graph).acyclic;
}
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
function microstep_cascade(graph, start, bound = DEFAULT_MICROSTEP_BOUND) {
    validate_graph(graph);
    const adjacency = build_adjacency(graph);
    if (!adjacency.has(start)) {
        throw new Error(`fsl_totality: start node ${String(start)} is not in the graph`);
    }
    if (bound < 0) {
        throw new Error(`fsl_totality: microstep bound must be non-negative; got ${bound}`);
    }
    const path = [start];
    const visited = new Set([start]);
    let current = start;
    let steps = 0;
    while (true) {
        const succs = adjacency.get(current);
        // fixpoint: no eventless successor — the reaction has settled
        if (succs.length === 0) {
            return { outcome: 'settled', terminates: true, path, steps };
        }
        // cap fired: defensive non-termination signal
        if (steps >= bound) {
            return { outcome: 'unbounded', terminates: false, path, steps };
        }
        const next = succs[0];
        steps += 1;
        path.push(next);
        // exact revisit: a genuine non-stabilizing eventless loop
        if (visited.has(next)) {
            return { outcome: 'cycle', terminates: false, path, steps };
        }
        visited.add(next);
        current = next;
    }
}
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
function analyze_termination(graph, bound = DEFAULT_MICROSTEP_BOUND) {
    const cycle_result = find_cycle(graph);
    if (!cycle_result.acyclic) {
        return { terminates: false, reason: 'cyclic', cycle: cycle_result.cycle };
    }
    for (const node of graph.nodes) {
        const cascade = microstep_cascade(graph, node, bound);
        if (!cascade.terminates) {
            return { terminates: false, reason: 'unsettled', start: node, cascade };
        }
    }
    return { terminates: true };
}
export { DEFAULT_MICROSTEP_BOUND, validate_graph, find_cycle, is_acyclic, microstep_cascade, analyze_termination };
