
/*******
 *
 *  `fsl_verify` — the safety-fragment model checker for FSL v6's verification
 *  layer (§17 of the megaspec, issue #1360).
 *
 *  §17 phases verification as **safety → bounded-temporal → liveness (Büchi) →
 *  probabilistic**.  This module ships the *first* phase only: **safety**
 *  properties, which §17 defines as "`always` / invariants (#1355) =
 *  reachability (cheap, finite-trace counterexamples)".  A safety violation is
 *  always witnessed by a *finite* path — you can always point at the first
 *  reachable state where something went wrong — so the checker is a plain
 *  graph reachability over a finite structure, with no need for the Büchi
 *  products or accepting-cycle detection that liveness requires.
 *
 *  The structure checked is a **Kripke structure / labelled transition system**
 *  — in §17's words, "states + props — what the checker sees".  It is defined
 *  here as a self-contained value (nodes, directed edges, per-node boolean
 *  labels) with **no coupling to the live `Machine` class**: a `Machine` (or a
 *  `System`, or a hand-written test fixture) lowers itself into this structure,
 *  and the checker reasons purely over the lowered form.  Everything in this
 *  module is a pure function of its arguments.
 *
 *  The two safety questions §17 names are both answered here:
 *
 *  - **Reachability** — "is some labelled configuration reachable from a start
 *    state?" (e.g. error-state reachability: `state Crashed: { error; }` should
 *    *not* be reachable).
 *  - **Invariants** — "does a predicate hold in *every* reachable
 *    configuration?" (e.g. `always not in(error)`).  The two are duals: an
 *    invariant `P` is violated exactly when `not P` is reachable, so the
 *    invariant checker is the reachability checker run over the negated label
 *    set, and it reports the witnessing path as its counterexample.
 *
 *  Deferred to later §17 phases (and so deliberately absent here): **liveness**
 *  (`eventually`, `leads-to`, `always eventually`, …) needs Büchi products and
 *  lasso counterexamples; **probabilistic** verification (PCTL over Markov
 *  chains / MDPs) needs weighted transitions and a numeric solver; **bounded
 *  temporal** operators (`leads-to[within N]`, `settles_within(k)`) sit between
 *  the two.  None are safety properties, so none belong in this file.
 *
 *  @see {@link https://github.com/StoneCypher/fsl/issues/1360} the temporal-property tracker
 *
 */




/*******
 *
 *  A single node in a {@link VerificationGraph}: an opaque identifier paired
 *  with the set of **atomic propositions** (labels) that hold at it.  This is
 *  the per-state row of a Kripke structure / labelled transition system.
 *
 *  Labels are the *only* thing the safety checker reads about a node — the
 *  identifier is for building paths and counterexamples, the labels are the
 *  facts properties are written against.  A label being absent from the set
 *  means it is **false** at that node (closed-world); there is no third value.
 *
 *  ```typescript
 *  const crashed: VerificationNode = { id: 'Crashed', labels: ['error', 'terminal'] };
 *  const running: VerificationNode = { id: 'Running', labels: [] };
 *  ```
 *
 */

type VerificationNode = {
  id      : string,
  labels? : string[]
};




/*******
 *
 *  A directed edge in a {@link VerificationGraph}: a transition the machine may
 *  take from `from` to `to`.  The safety checker treats edges as a plain
 *  reachability relation — guards, events, weights and timing are *abstracted
 *  away* (the §3 over-approximation rule: if an edge might fire, the checker
 *  assumes it can).  An optional `label` carries the triggering event name for
 *  human-readable counterexamples, but does not affect the result.
 *
 *  ```typescript
 *  const e: VerificationEdge = { from: 'Green', to: 'Yellow', label: 'tick' };
 *  ```
 *
 */

type VerificationEdge = {
  from    : string,
  to      : string,
  label?  : string
};




/*******
 *
 *  A self-contained, host-agnostic verification graph: the lowered form a
 *  machine hands to the checker.  It is a finite Kripke structure — a set of
 *  labelled `nodes`, a set of directed `edges`, and a non-empty set of
 *  `start_states` (the initial configurations; §17's weighted-start machinery
 *  collapses to "this set may be the start" for over-approximating safety
 *  checking).
 *
 *  There is intentionally **no reference to the live `Machine` class** here:
 *  this is a pure data structure, so the checker can be tested, serialized,
 *  and reused over fixtures that no runtime ever produced.
 *
 *  ```typescript
 *  const traffic: VerificationGraph = {
 *    nodes: [
 *      { id: 'Green',  labels: ['go']   },
 *      { id: 'Yellow', labels: []        },
 *      { id: 'Red',    labels: ['stop'] }
 *    ],
 *    edges: [
 *      { from: 'Green',  to: 'Yellow' },
 *      { from: 'Yellow', to: 'Red'    },
 *      { from: 'Red',    to: 'Green'  }
 *    ],
 *    start_states: ['Green']
 *  };
 *  ```
 *
 */

type VerificationGraph = {
  nodes        : VerificationNode[],
  edges        : VerificationEdge[],
  start_states : string[]
};




/*******
 *
 *  A safety property to discharge against a {@link VerificationGraph}.  Two
 *  kinds, the two §17 names under safety:
 *
 *  - **`reachability`** — "is a node satisfying `label` reachable from a start
 *    state?"  Used for error-state reachability (`Crashed` *should not* be
 *    reachable → expect `holds: false`) and for liveness-flavoured sanity
 *    ("`Done` *is* reachable" → expect `holds: true`).  Whether reachability
 *    being possible is good or bad is the *author's* call; the checker only
 *    reports the fact.
 *  - **`invariant`** — "does `label` hold at *every* reachable node?"  This is
 *    the `always P` / #1355-invariant fragment.  It is violated exactly when a
 *    node *missing* `label` is reachable, and that node's path is the
 *    counterexample.
 *
 *  The `label` names an atomic proposition referenced by node labels.  The
 *  optional `name` is carried through to the result for diagnostics.
 *
 *  ```typescript
 *  const no_crash:   SafetyProperty = { kind: 'invariant',    label: 'safe' };
 *  const reaches_ok: SafetyProperty = { kind: 'reachability', label: 'done' };
 *  ```
 *
 */

type SafetyProperty = {
  kind  : 'reachability' | 'invariant',
  label : string,
  name? : string
};




/*******
 *
 *  The verdict of checking a {@link SafetyProperty} against a graph.
 *
 *  - `holds` — `true` when the property is **proved** (a reachability target is
 *    reachable, or an invariant holds at every reachable node), `false` when it
 *    is **refuted**.
 *  - `witness` — the path that justifies the verdict.  For a *proved*
 *    reachability it is the path *to* the satisfying node; for a *refuted*
 *    invariant it is the path to the violating node (the replayable
 *    counterexample tape §17 promises).  For a *refuted* reachability (target
 *    unreachable) and a *proved* invariant there is nothing to point at, so it
 *    is `undefined`.
 *  - `property` — the property that was checked, echoed back for diagnostics.
 *
 *  ```typescript
 *  // proved reachability
 *  { holds: true,  witness: ['Green', 'Yellow', 'Red'], property: {...} }
 *  // refuted invariant — counterexample path included
 *  { holds: false, witness: ['Green', 'Crashed'],        property: {...} }
 *  ```
 *
 */

type SafetyResult = {
  holds     : boolean,
  witness?  : string[],
  property  : SafetyProperty
};




/*******
 *
 *  Tests whether a node carries a given label.  A node with no `labels` array,
 *  or one whose array omits `label`, does **not** carry it (closed-world).  Pure.
 *
 *  ```typescript
 *  node_has_label({ id: 'a', labels: ['x', 'y'] }, 'x');  // true
 *  node_has_label({ id: 'a', labels: ['x', 'y'] }, 'z');  // false
 *  node_has_label({ id: 'a' },                     'x');  // false
 *  ```
 *
 *  @param node  - The node whose labels are inspected.
 *  @param label - The atomic proposition to look for.
 *
 *  @returns `true` when `node` carries `label`, otherwise `false`.
 *
 */

function node_has_label(node: VerificationNode, label: string): boolean {
  return Array.isArray(node.labels) && node.labels.indexOf(label) !== -1;
}




/*******
 *
 *  Builds an adjacency map from a graph's edges: each node id mapped to the
 *  list of node ids directly reachable from it in one step.  Nodes that appear
 *  only as edge sources, only as edge targets, or only in the node list are all
 *  represented, so callers can index any declared id without an undefined hole.
 *  Pure.
 *
 *  ```typescript
 *  build_adjacency({
 *    nodes: [{ id: 'a' }, { id: 'b' }],
 *    edges: [{ from: 'a', to: 'b' }],
 *    start_states: ['a']
 *  });
 *  // Map { 'a' => ['b'], 'b' => [] }
 *  ```
 *
 *  @param graph - The verification graph to index.
 *
 *  @returns A `Map` from node id to the array of one-step successor ids.
 *
 */

function build_adjacency(graph: VerificationGraph): Map<string, string[]> {

  const adjacency = new Map<string, string[]>();

  /* Returns the successor list for `id`, creating an empty one on first sight.
     Centralizing creation here means every read is guaranteed non-undefined,
     so there is no defensive (and untestable) undefined branch downstream. */
  const list_for = (id: string): string[] => {
    const existing = adjacency.get(id);
    if (existing !== undefined) { return existing; }
    const fresh: string[] = [];
    adjacency.set(id, fresh);
    return fresh;
  };

  for (const node of graph.nodes) { list_for(node.id); }

  for (const edge of graph.edges) {
    list_for(edge.to);             // ensure pure-sink targets appear as keys
    list_for(edge.from).push(edge.to);
  }

  return adjacency;

}




/*******
 *
 *  Searches a graph for a node satisfying `predicate` reachable from any start
 *  state, by breadth-first exploration, and returns the **shortest** witness
 *  path (start → … → satisfying node) — or `undefined` when no reachable node
 *  satisfies the predicate.
 *
 *  BFS is used so the witness is the shortest counterexample, which is the most
 *  useful failing tape (§17 / shrinking).  The search is finite and terminates
 *  on any graph because each node is enqueued at most once.  Pure.
 *
 *  Start states that are not declared as nodes are still explored (they seed the
 *  frontier directly); this keeps the checker total over slightly-malformed
 *  fixtures rather than throwing mid-search.
 *
 *  ```typescript
 *  bfs_find_path(graph, node => node_has_label(node, 'error'));
 *  // ['Green', 'Crashed']  — or undefined if no error node is reachable
 *  ```
 *
 *  @param graph     - The verification graph to search.
 *  @param predicate - Tested against the *node object* for each id reached; the
 *                     id is paired with its declared node, or a bare
 *                     `{ id }` stand-in when the id has no declared node.
 *
 *  @returns The shortest path to a satisfying node, or `undefined` if none.
 *
 */

function bfs_find_path(
  graph     : VerificationGraph,
  predicate : (node: VerificationNode) => boolean
): string[] | undefined {

  const adjacency = build_adjacency(graph);
  const node_by_id = new Map<string, VerificationNode>();

  for (const node of graph.nodes) { node_by_id.set(node.id, node); }

  const node_for = (id: string): VerificationNode =>
    node_by_id.get(id) ?? { id };

  const visited = new Set<string>();

  /* Each pending item carries the frontier node's id and the path that reached
     it, so the witness is reconstructed without ever indexing an array (which
     would force a defensive, untestable `undefined` branch). */
  let frontier: { id: string, path: string[] }[] = [];

  for (const start of graph.start_states) {
    if (!visited.has(start)) {
      visited.add(start);
      frontier.push({ id: start, path: [start] });
    }
  }

  while (frontier.length > 0) {

    const next_frontier: { id: string, path: string[] }[] = [];

    for (const item of frontier) {

      if (predicate(node_for(item.id))) {
        return item.path;
      }

      const successors = adjacency.get(item.id) ?? [];

      for (const successor of successors) {
        if (!visited.has(successor)) {
          visited.add(successor);
          next_frontier.push({ id: successor, path: [...item.path, successor] });
        }
      }

    }

    frontier = next_frontier;

  }

  return undefined;

}




/*******
 *
 *  Discharges a single {@link SafetyProperty} against a {@link
 *  VerificationGraph}, returning a {@link SafetyResult} that is either a proof
 *  or a finite counterexample path.  This is the safety-fragment model checker
 *  of §17 — the dispatch over the two safety question kinds:
 *
 *  - **`reachability`** — runs BFS for a node carrying `label`.  If found, the
 *    property `holds` (`true`) with the path to it as `witness`.  If not found,
 *    the target is unreachable, so `holds` is `false` with no witness.
 *  - **`invariant`** — an invariant `P` holds iff `not P` is *un*reachable, so
 *    this runs BFS for a node *missing* `label`.  If such a node is found the
 *    invariant is violated: `holds` is `false` and `witness` is the
 *    counterexample path to the offending node.  If none is found the invariant
 *    is proved: `holds` is `true`, no witness.
 *
 *  Pure: depends only on its arguments and returns a fresh result.
 *
 *  ```typescript
 *  // an invariant that holds (proved, no witness)
 *  check_safety(traffic, { kind: 'invariant', label: 'ok' });
 *  // { holds: true, property: {...} }
 *
 *  // a reachability that fails (target unreachable)
 *  check_safety(traffic, { kind: 'reachability', label: 'crash' });
 *  // { holds: false, property: {...} }
 *
 *  // an invariant that fails (counterexample path returned)
 *  check_safety(traffic, { kind: 'invariant', label: 'go' });
 *  // { holds: false, witness: ['Green', 'Yellow'], property: {...} }
 *  ```
 *
 *  @param graph    - The lowered, host-agnostic graph to verify over.
 *  @param property - The safety property to discharge.
 *
 *  @returns A {@link SafetyResult} — proved (`holds: true`) or refuted
 *           (`holds: false`, with a counterexample `witness` where one exists).
 *
 *  @throws {Error} If `property.kind` is not a recognized safety kind.
 *
 *  @see {@link check_all_safety} to discharge a batch of properties at once.
 *
 */

function check_safety(graph: VerificationGraph, property: SafetyProperty): SafetyResult {

  if (property.kind === 'reachability') {

    const witness = bfs_find_path(graph, node => node_has_label(node, property.label));

    return (witness === undefined)
      ? { holds: false, property }
      : { holds: true, witness, property };

  }

  if (property.kind === 'invariant') {

    const counterexample = bfs_find_path(graph, node => !node_has_label(node, property.label));

    return (counterexample === undefined)
      ? { holds: true, property }
      : { holds: false, witness: counterexample, property };

  }

  throw new Error(`fsl_verify: unknown safety property kind "${(property as SafetyProperty).kind}"`);

}




/*******
 *
 *  Discharges a batch of {@link SafetyProperty} values against one graph,
 *  preserving input order.  A thin, pure convenience over {@link check_safety}
 *  for the common case of a property suite (`test reaches Done;` etc.).
 *
 *  ```typescript
 *  check_all_safety(traffic, [
 *    { kind: 'reachability', label: 'go' },
 *    { kind: 'invariant',    label: 'ok' }
 *  ]);
 *  // [ { holds: true, witness: [...], property: {...} },
 *  //   { holds: true, property: {...} } ]
 *  ```
 *
 *  @param graph      - The graph to verify over.
 *  @param properties - The properties to discharge, in order.
 *
 *  @returns One {@link SafetyResult} per input property, in the same order.
 *
 */

function check_all_safety(graph: VerificationGraph, properties: SafetyProperty[]): SafetyResult[] {
  return properties.map(property => check_safety(graph, property));
}




export {

  VerificationNode,
  VerificationEdge,
  VerificationGraph,
  SafetyProperty,
  SafetyResult,

  node_has_label,
  build_adjacency,
  bfs_find_path,
  check_safety,
  check_all_safety

};
