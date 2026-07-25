/**
 *  @packageDocumentation
 *
 *  FSL temporal-property verification — **safety tier** (megaspec §17, fsl
 *  #1360).
 *
 *  §17's north star: a finite-state machine can state and *model-check* its own
 *  temporal properties; every counterexample is a replayable trace.  Of the
 *  phasing **safety → bounded-temporal → liveness → probabilistic**, this module
 *  delivers the first rung — **safety**, which §17 equates with **reachability**
 *  over the machine graph (cheap, with *finite-trace* counterexamples).
 *
 *  The surface is two small, total, pure pieces:
 *
 *  - a **state-predicate** algebra ({@link StatePredicate}) — atoms like
 *    {@link in_state} / {@link is_terminal} / {@link is_error} closed under
 *    {@link p_not} / {@link p_and} / {@link p_or}; and
 *  - a **safety-property** algebra ({@link SafetyProperty}) — {@link always} /
 *    {@link never} invariants plus the Dwyer reachability patterns
 *    {@link reachable} / {@link unreachable} / {@link absence} / {@link existence}.
 *
 *  {@link check_safety} evaluates one property against a machine and returns a
 *  {@link SafetyResult}: a verdict plus, on failure, the **counterexample
 *  trace** — the shortest path of state names from the start state that
 *  witnesses the violation (the skeleton of a replayable §15 tape).
 *
 *  Everything here is **read-only** over the existing jssm machine: it consults
 *  {@link Machine.states}, {@link Machine.state}, {@link Machine.list_exits},
 *  {@link Machine.state_is_terminal}, {@link Machine.state_is_final} and
 *  {@link Machine.has_state}, and never mutates the machine.
 *  @example
 *  Prove a designed failure state is unreachable from start:
 *  ```typescript
 *  import { sm }                      from 'jssm';
 *  import { check_safety, absence }   from './fsl_verify';
 *
 *  const door = sm`shut 'open' -> ajar 'open' -> wide;`;
 *  check_safety(door, absence('wide')).holds;   // false — 'wide' is reachable
 *  ```
 */
import { Machine } from './jssm';
/**
 *  State names are strings in jssm; verification speaks the same alphabet.
 */
type StateName = string;
/**
 *  Atomic state predicates — the leaves of a {@link StatePredicate}.  Each names
 *  a property of a *single* machine state evaluated at a single point on a trace
 *  (a "label" in the Kripke-structure sense §17 cites).
 *
 *  - `in_state`    — the state has a specific name.
 *  - `in_any`      — the state's name is one of a fixed set.
 *  - `is_terminal` — the state has no exits (a dead end; {@link Machine.state_is_terminal}).
 *  - `is_final`    — the state is terminal *or* flagged `complete` ({@link Machine.state_is_final}).
 *  - `is_error`    — the state is in the caller-supplied error set (§17 error states; the Dwyer "hole").
 *  - `tautology`   — always true (the unit of {@link p_and}).
 *  - `contradiction` — always false (the unit of {@link p_or}).
 */
type PredicateAtom = {
    readonly atom: 'in_state';
    readonly name: StateName;
} | {
    readonly atom: 'in_any';
    readonly names: ReadonlySet<StateName>;
} | {
    readonly atom: 'is_terminal';
} | {
    readonly atom: 'is_final';
} | {
    readonly atom: 'is_error';
} | {
    readonly atom: 'tautology';
} | {
    readonly atom: 'contradiction';
};
/**
 *  A **state predicate**: a boolean function of one machine state, built from
 *  {@link PredicateAtom}s closed under negation, conjunction and disjunction.
 *
 *  Predicates are pure data (an AST), not closures — so they are comparable,
 *  serializable, and inspectable, matching §17's "properties are first-class,
 *  fill-the-holes" posture.  Evaluate one with {@link eval_predicate}.
 */
type StatePredicate = PredicateAtom | {
    readonly atom: 'not';
    readonly arg: StatePredicate;
} | {
    readonly atom: 'and';
    readonly args: ReadonlyArray<StatePredicate>;
} | {
    readonly atom: 'or';
    readonly args: ReadonlyArray<StatePredicate>;
};
/**
 *  A **safety property** over a machine — the §17 safety tier.  Each form
 *  reduces to a reachability question with a finite-trace witness:
 *
 *  - `always P`     — every reachable state satisfies `P`  (invariant; fails with the first violating trace).
 *  - `never P`      — no reachable state satisfies `P`     (`always not P`).
 *  - `reachable P`  — some reachable state satisfies `P`   (witness trace on success).
 *  - `unreachable P`— no reachable state satisfies `P`     (the Dwyer *absence* pattern; alias `never`).
 *
 *  Build them with {@link always} / {@link never} / {@link reachable} /
 *  {@link unreachable}, or the named Dwyer aliases {@link absence} /
 *  {@link existence}.
 */
type SafetyProperty = {
    readonly kind: 'always';
    readonly pred: StatePredicate;
} | {
    readonly kind: 'never';
    readonly pred: StatePredicate;
} | {
    readonly kind: 'reachable';
    readonly pred: StatePredicate;
} | {
    readonly kind: 'unreachable';
    readonly pred: StatePredicate;
};
/**
 *  Options controlling a {@link check_safety} run.
 *  @template mDT - The machine's data type; usually omitted.
 */
type SafetyOptions = {
    /**
     *  States considered "error" states for the {@link is_error} atom.  §17's
     *  error states (`state Crashed: { error; }`) are not yet surfaced by the v5
     *  machine graph, so the caller names them here — the Dwyer "hole" to fill.
     *  Defaults to the empty set (no errors).
     */
    readonly error_states?: ReadonlyArray<StateName>;
    /**
     *  The state(s) reachability starts from.  Defaults to the machine's current
     *  state ({@link Machine.state}), which for a freshly-built machine is its
     *  initial state.  Names that the machine does not know are rejected.
     */
    readonly start_states?: ReadonlyArray<StateName>;
};
/**
 *  The outcome of {@link check_safety}.
 *
 *  `holds` is the verdict.  `trace` is the load-bearing evidence: for a
 *  failed* invariant it is the shortest path to the first violating state; for
 *  a *satisfied* reachability it is the shortest path to a witnessing state; in
 *  the vacuous cases (`always` that holds, `unreachable` that holds) it is
 *  `undefined`.  `states_explored` reports the size of the reachable set the
 *  BFS visited, for cost reporting.
 */
type SafetyResult = {
    readonly property: SafetyProperty;
    readonly holds: boolean;
    readonly trace?: ReadonlyArray<StateName>;
    readonly states_explored: number;
};
/**
 *  Predicate: the state has exactly this name.
 *  @param name - The state name to match.
 *  @example
 *  ```typescript
 *  in_state('Done');   // { atom: 'in_state', name: 'Done' }
 *  ```
 */
declare const in_state: (name: StateName) => StatePredicate;
/**
 *  Predicate: the state's name is one of `names`.  An empty set is a
 *  contradiction (matches nothing).
 *  @param names - The accepted state names.
 *  @example
 *  ```typescript
 *  in_any(['red', 'amber']);   // true in 'red' or 'amber'
 *  ```
 */
declare const in_any: (names: ReadonlyArray<StateName>) => StatePredicate;
/**
 *  Predicate: the state is terminal — it has no outgoing transitions.
 *  @example
 *  ```typescript
 *  is_terminal;   // true only in dead-end states
 *  ```
 */
declare const is_terminal: StatePredicate;
/**
 *  Predicate: the state is final — terminal, or flagged `complete`.
 *  @example
 *  ```typescript
 *  is_final;   // true in completing states
 *  ```
 */
declare const is_final: StatePredicate;
/**
 *  Predicate: the state is one of the caller-supplied error states (§17).
 *  @example
 *  ```typescript
 *  is_error;   // true in states named by SafetyOptions.error_states
 *  ```
 */
declare const is_error: StatePredicate;
/**
 *  The predicate that is true in every state — the unit of {@link p_and}.
 */
declare const tautology: StatePredicate;
/**
 *  The predicate that is false in every state — the unit of {@link p_or}.
 */
declare const contradiction: StatePredicate;
/**
 *  Negate a predicate.
 *  @param arg - The predicate to invert.
 *  @example
 *  ```typescript
 *  p_not(in_state('Crashed'));   // true everywhere except 'Crashed'
 *  ```
 */
declare const p_not: (arg: StatePredicate) => StatePredicate;
/**
 *  Conjoin predicates.  With no arguments this is {@link tautology}.
 *  @param args - The predicates that must all hold.
 *  @example
 *  ```typescript
 *  p_and(is_terminal, p_not(is_final));   // a terminal that isn't "complete"
 *  ```
 */
declare const p_and: (...args: ReadonlyArray<StatePredicate>) => StatePredicate;
/**
 *  Disjoin predicates.  With no arguments this is {@link contradiction}.
 *  @param args - The predicates of which at least one must hold.
 *  @example
 *  ```typescript
 *  p_or(is_error, is_terminal);   // either an error state or a dead end
 *  ```
 */
declare const p_or: (...args: ReadonlyArray<StatePredicate>) => StatePredicate;
/**
 *  Coerce a predicate-or-state-name into a predicate.  A bare string is read as
 *  {@link in_state}, so callers can write `absence('Crashed')`.
 *  @param p - Either a {@link StatePredicate} or a state name.
 */
declare const as_predicate: (p: StatePredicate | StateName) => StatePredicate;
/**
 *  Safety property: `P` holds in **every** reachable state (an invariant).
 *  @param pred - The invariant predicate, or a state name (= must always be in it).
 *  @example
 *  ```typescript
 *  always(p_not(is_error));   // "never reach an error state"
 *  ```
 */
declare const always: (pred: StatePredicate | StateName) => SafetyProperty;
/**
 *  Safety property: `P` holds in **no** reachable state (`always not P`).
 *  @param pred - The forbidden predicate, or a state name.
 *  @example
 *  ```typescript
 *  never(is_error);            // no error state is reachable
 *  never('Crashed');           // the 'Crashed' state is unreachable
 *  ```
 */
declare const never: (pred: StatePredicate | StateName) => SafetyProperty;
/**
 *  Safety property: **some** reachable state satisfies `P`.  Succeeds with a
 *  witness trace.
 *  @param pred - The target predicate, or a state name.
 *  @example
 *  ```typescript
 *  reachable('Done');          // 'Done' can be reached from start
 *  ```
 */
declare const reachable: (pred: StatePredicate | StateName) => SafetyProperty;
/**
 *  Safety property: **no** reachable state satisfies `P` — the same query as
 *  {@link never}, named for symmetry with {@link reachable}.
 *  @param pred - The target predicate, or a state name.
 *  @example
 *  ```typescript
 *  unreachable('Crashed');     // 'Crashed' is never reached
 *  ```
 */
declare const unreachable: (pred: StatePredicate | StateName) => SafetyProperty;
/**
 *  Dwyer **absence** pattern (globally): the target never occurs — alias for
 *  {@link unreachable}.
 *  @param pred - The state name or predicate that must be absent.
 *  @example
 *  ```typescript
 *  absence('Deadlock');        // "Deadlock is absent globally"
 *  ```
 */
declare const absence: (pred: StatePredicate | StateName) => SafetyProperty;
/**
 *  Dwyer **existence** pattern (globally): the target eventually occurs on some
 *  path — alias for {@link reachable}.
 *  @param pred - The state name or predicate that must exist.
 *  @example
 *  ```typescript
 *  existence('Done');          // "Done exists globally"
 *  ```
 */
declare const existence: (pred: StatePredicate | StateName) => SafetyProperty;
/**
 *  Evaluate a {@link StatePredicate} against a single machine state.  Pure and
 *  total — every atom and connective is handled, recursion bottoms out at the
 *  finite predicate AST.
 *  @template mDT - The machine's data type; usually omitted.
 *  @param machine - The machine, consulted read-only for state metadata.
 *  @param state   - The state name to test.
 *  @param pred    - The predicate to evaluate.
 *  @param errors  - The set of error-state names (for the {@link is_error} atom).
 *  @returns `true` iff `state` satisfies `pred`.
 *  @example
 *  ```typescript
 *  import { sm } from 'jssm';
 *  const m = sm`a -> b;`;
 *  eval_predicate(m, 'b', is_terminal, new Set());   // true
 *  ```
 */
declare const eval_predicate: <mDT>(machine: Machine<mDT>, state: StateName, pred: StatePredicate, errors: ReadonlySet<StateName>) => boolean;
/**
 *  Breadth-first reachability from `starts`, recording, for each reached state,
 *  the immediate predecessor on its shortest path — enough to reconstruct a
 *  counterexample trace.  Pure: returns a fresh map, mutates nothing.
 *  @template mDT - The machine's data type; usually omitted.
 *  @param machine - The machine, consulted read-only via {@link Machine.list_exits}.
 *  @param starts  - The frontier seed (already validated to exist).
 *  @returns A map from each reachable state to its predecessor (`null` for a
 *  seed), in BFS discovery order.
 */
declare const reachable_predecessors: <mDT>(machine: Machine<mDT>, starts: ReadonlyArray<StateName>) => Map<StateName, StateName | null>;
/**
 *  Reconstruct the shortest trace from a seed to `target`, walking the
 *  predecessor map produced by {@link reachable_predecessors} backwards and then
 *  reversing.
 *  @param predecessor - The BFS predecessor map.
 *  @param target      - The state to trace back from (must be a key).
 *  @returns The path of state names from a start state to `target`, inclusive.
 */
declare const trace_to: (predecessor: ReadonlyMap<StateName, StateName | null>, target: StateName) => ReadonlyArray<StateName>;
/**
 *  Resolve the start frontier for a run: the caller's {@link SafetyOptions.start_states}
 *  if given, else the machine's current state.  Every name is validated against
 *  the machine.
 *  @template mDT - The machine's data type; usually omitted.
 *  @param machine - The machine to resolve against.
 *  @param starts  - The requested start states, or `undefined` for the default.
 *  @returns The validated, de-duplicated start frontier.
 *  @throws {Error} If a requested start state is not known to the machine.
 */
declare const resolve_starts: <mDT>(machine: Machine<mDT>, starts: ReadonlyArray<StateName> | undefined) => ReadonlyArray<StateName>;
/**
 *  Model-check one **safety property** against a machine (§17 safety tier).
 *
 *  Builds the reachable set by BFS from the start frontier, then decides the
 *  property over exactly those states:
 *
 *  - `always P` / `never P` scan for a *violating* reachable state and, if one
 *    exists, return its shortest trace as the counterexample.
 *  - `reachable P` / `unreachable P` scan for a *witnessing* reachable state;
 *    `reachable` returns its trace on success, `unreachable` returns no trace
 *    when it holds.
 *
 *  Read-only: the machine is never mutated.  Deterministic: BFS discovery order
 *  fixes which shortest trace is reported.
 *  @template mDT - The machine's data type; usually omitted.
 *  @param machine  - The machine to check.
 *  @param property - The safety property, e.g. from {@link always} / {@link absence}.
 *  @param options  - Error states and/or an explicit start frontier.
 *  @returns A {@link SafetyResult} carrying the verdict and any counterexample
 *  or witness trace.
 *  @throws {Error} If an explicit start state is not known to the machine.
 *  @example
 *  An invariant that holds, then one that fails with a counterexample:
 *  ```typescript
 *  import { sm }                                     from 'jssm';
 *  import { check_safety, always, p_not, is_error } from './fsl_verify';
 *
 *  const flow = sm`idle 'go' -> work 'finish' -> done;`;
 *
 *  check_safety(flow, always(p_not(is_error))).holds;        // true (no errors declared)
 *
 *  const bad = check_safety(
 *    flow,
 *    always(p_not(is_error)),
 *    { error_states: ['done'] }
 *  );
 *  bad.holds;    // false
 *  bad.trace;    // ['idle', 'work', 'done'] — the replayable counterexample
 *  ```
 *  @see absence
 *  @see reachable
 */
declare const check_safety: <mDT>(machine: Machine<mDT>, property: SafetyProperty, options?: SafetyOptions) => SafetyResult;
/**
 *  A single node in a {@link VerificationGraph}: an opaque identifier paired
 *  with the set of **atomic propositions** (labels) that hold at it — the
 *  per-state row of a Kripke structure.
 *
 *  Labels are the only thing the safety checker reads about a node; the
 *  identifier is for building paths and counterexamples.  A label absent from
 *  the set is **false** at that node (closed-world); there is no third value.
 *  @example
 *  ```typescript
 *  const crashed: VerificationNode = { id: 'Crashed', labels: ['error', 'terminal'] };
 *  const running: VerificationNode = { id: 'Running', labels: [] };
 *  ```
 */
type VerificationNode = {
    readonly id: string;
    readonly labels?: ReadonlyArray<string>;
};
/**
 *  A directed edge in a {@link VerificationGraph}: a transition the machine may
 *  take from `from` to `to`.  The checker treats edges as a plain reachability
 *  relation — guards, events, weights and timing are abstracted away (the §3
 *  over-approximation rule: if an edge might fire, assume it can).  The optional
 *  `label` carries the triggering event name for human-readable
 *  counterexamples, but does not affect the verdict.
 *  @example
 *  ```typescript
 *  const e: VerificationEdge = { from: 'Green', to: 'Yellow', label: 'tick' };
 *  ```
 */
type VerificationEdge = {
    readonly from: string;
    readonly to: string;
    readonly label?: string;
};
/**
 *  A self-contained, host-agnostic verification graph — the lowered form a
 *  machine hands to the decoupled checker.  A finite Kripke structure: labelled
 *  `nodes`, directed `edges`, and a non-empty set of `start_states`.
 *
 *  There is intentionally **no reference to the live {@link Machine} class**:
 *  this is pure data, so the checker can be tested, serialized, and reused over
 *  fixtures no runtime ever produced.
 *  @example
 *  ```typescript
 *  const traffic: VerificationGraph = {
 *    nodes: [
 *      { id: 'Green',  labels: ['go']   },
 *      { id: 'Yellow', labels: []       },
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
 */
type VerificationGraph = {
    readonly nodes: ReadonlyArray<VerificationNode>;
    readonly edges: ReadonlyArray<VerificationEdge>;
    readonly start_states: ReadonlyArray<StateName>;
};
/**
 *  A safety property to discharge against a {@link VerificationGraph} — the two
 *  §17 safety questions over the decoupled graph:
 *
 *  - `reachability` — "is a node carrying `label` reachable from a start state?"
 *    (error-state reachability: `Crashed` *should not* be reachable, so expect
 *    `holds: false`; or liveness-flavoured sanity: `Done` *is* reachable).
 *  - `invariant` — "does `label` hold at *every* reachable node?" (the `always P`
 *    fragment).  Violated exactly when a node *missing* `label` is reachable;
 *    that node's path is the counterexample.
 *
 *  Distinct from the machine-coupled {@link SafetyProperty}: this form is a
 *  flat label query over graph data, not a {@link StatePredicate} AST over a
 *  live machine.  The optional `name` is echoed to the result for diagnostics.
 *  @example
 *  ```typescript
 *  const no_crash:   GraphSafetyProperty = { kind: 'invariant',    label: 'safe' };
 *  const reaches_ok: GraphSafetyProperty = { kind: 'reachability', label: 'done' };
 *  ```
 */
type GraphSafetyProperty = {
    readonly kind: 'reachability' | 'invariant';
    readonly label: string;
    readonly name?: string;
};
/**
 *  The verdict of checking a {@link GraphSafetyProperty} against a graph.
 *
 *  - `holds` — `true` when proved (reachability target reachable, or invariant
 *    holds everywhere), `false` when refuted.
 *  - `witness` — the justifying path: to the satisfying node for a *proved*
 *    reachability, to the violating node for a *refuted* invariant (the
 *    replayable counterexample tape §17 promises).  `undefined` for a *refuted*
 *    reachability (nothing reachable to point at) and a *proved* invariant.
 *  - `property` — the property checked, echoed back for diagnostics.
 *
 *  Distinct from the machine-coupled {@link SafetyResult}: the witness field is
 *  named `witness` (not `trace`) and there is no `states_explored`.
 *  @example
 *  ```typescript
 *  // proved reachability
 *  ({ holds: true,  witness: ['Green', 'Yellow', 'Red'], property: { kind: 'reachability', label: 'stop' } });
 *  // refuted invariant — counterexample path included
 *  ({ holds: false, witness: ['Boot', 'Running', 'Crashed'], property: { kind: 'invariant', label: 'safe' } });
 *  ```
 */
type GraphSafetyResult = {
    readonly holds: boolean;
    readonly witness?: ReadonlyArray<StateName>;
    readonly property: GraphSafetyProperty;
};
/**
 *  Tests whether a node carries a given label.  A node with no `labels` array,
 *  or one whose array omits `label`, does **not** carry it (closed-world).
 *  Pure.
 *  @param node  - The node whose labels are inspected.
 *  @param label - The atomic proposition to look for.
 *  @returns `true` when `node` carries `label`, otherwise `false`.
 *  @example
 *  ```typescript
 *  node_has_label({ id: 'a', labels: ['x', 'y'] }, 'x');   // true
 *  node_has_label({ id: 'a', labels: ['x', 'y'] }, 'z');   // false
 *  node_has_label({ id: 'a' },                     'x');   // false
 *  ```
 */
declare const node_has_label: (node: VerificationNode, label: string) => boolean;
/**
 *  Build an adjacency map from a graph's edges: each node id mapped to the list
 *  of ids directly reachable in one step.  Nodes appearing only as edge
 *  sources, only as edge targets, or only in the node list are all represented,
 *  so callers can index any declared id without an undefined hole.  Pure.
 *  @param graph - The verification graph to index.
 *  @returns A `Map` from node id to its array of one-step successor ids.
 *  @example
 *  ```typescript
 *  build_adjacency({
 *    nodes: [{ id: 'a' }, { id: 'b' }],
 *    edges: [{ from: 'a', to: 'b' }],
 *    start_states: ['a']
 *  });
 *  // Map { 'a' => ['b'], 'b' => [] }
 *  ```
 */
declare const build_adjacency: (graph: VerificationGraph) => Map<StateName, StateName[]>;
/**
 *  Search a graph for a node satisfying `predicate` reachable from any start
 *  state, by breadth-first exploration, returning the **shortest** witness path
 *  (start → … → satisfying node) — or `undefined` when no reachable node
 *  satisfies it.
 *
 *  BFS yields the shortest counterexample, the most useful failing tape (§17).
 *  Finite and terminating on any graph: each node is enqueued at most once.
 *  Start states with no declared node still seed the frontier (the search stays
 *  total over slightly-malformed fixtures rather than throwing).  Pure.
 *  @param graph     - The verification graph to search.
 *  @param predicate - Tested against the *node object* for each id reached; the
 *                     id is paired with its declared node, or a bare `{ id }`
 *                     stand-in when the id has no declared node.
 *  @returns The shortest path to a satisfying node, or `undefined` if none.
 *  @example
 *  ```typescript
 *  bfs_find_path(graph, node => node_has_label(node, 'error'));
 *  // ['Green', 'Crashed']  — or undefined if no error node is reachable
 *  ```
 */
declare const bfs_find_path: (graph: VerificationGraph, predicate: (node: VerificationNode) => boolean) => ReadonlyArray<StateName> | undefined;
/**
 *  Discharge a single {@link GraphSafetyProperty} against a
 *  {@link VerificationGraph}, returning a {@link GraphSafetyResult} that is
 *  either a proof or a finite counterexample path — the decoupled-graph
 *  counterpart of the machine-coupled {@link check_safety}:
 *
 *  - `reachability` — BFS for a node carrying `label`.  Found → `holds: true`
 *    with the path as `witness`; not found → `holds: false`, no witness.
 *  - `invariant` — holds iff `not P` is unreachable, so BFS for a node *missing*
 *    `label`.  Found → `holds: false` with the counterexample path; none →
 *    `holds: true`, no witness.
 *
 *  Pure: depends only on its arguments and returns a fresh result.
 *  @param graph    - The lowered, host-agnostic graph to verify over.
 *  @param property - The safety property to discharge.
 *  @returns A {@link GraphSafetyResult} — proved (`holds: true`) or refuted
 *  (`holds: false`, with a counterexample `witness` where one exists).
 *  @throws {Error} If `property.kind` is not a recognized safety kind.
 *  @see check_all_graph_safety
 *  @example
 *  ```typescript
 *  // an invariant that holds (proved, no witness)
 *  check_graph_safety(traffic, { kind: 'invariant', label: 'safe' });
 *  // { holds: true, property: {...} }
 *
 *  // a reachability that fails (target unreachable)
 *  check_graph_safety(traffic, { kind: 'reachability', label: 'crash' });
 *  // { holds: false, property: {...} }
 *
 *  // an invariant that fails (counterexample path returned)
 *  check_graph_safety(traffic, { kind: 'invariant', label: 'go' });
 *  // { holds: false, witness: ['Green', 'Yellow'], property: {...} }
 *  ```
 */
declare const check_graph_safety: (graph: VerificationGraph, property: GraphSafetyProperty) => GraphSafetyResult;
/**
 *  Discharge a batch of {@link GraphSafetyProperty} values against one graph,
 *  preserving input order.  A thin, pure convenience over
 *  {@link check_graph_safety} for a property suite (`test reaches Done;` etc.).
 *  @param graph      - The graph to verify over.
 *  @param properties - The properties to discharge, in order.
 *  @returns One {@link GraphSafetyResult} per input property, in the same order.
 *  @example
 *  ```typescript
 *  check_all_graph_safety(traffic, [
 *    { kind: 'reachability', label: 'go' },
 *    { kind: 'invariant',    label: 'ok' }
 *  ]);
 *  // [ { holds: true,  witness: [...], property: {...} },
 *  //   { holds: true,  property: {...} } ]
 *  ```
 */
declare const check_all_graph_safety: (graph: VerificationGraph, properties: ReadonlyArray<GraphSafetyProperty>) => ReadonlyArray<GraphSafetyResult>;
export { StateName, PredicateAtom, StatePredicate, SafetyProperty, SafetyOptions, SafetyResult, in_state, in_any, is_terminal, is_final, is_error, tautology, contradiction, p_not, p_and, p_or, always, never, reachable, unreachable, absence, existence, as_predicate, eval_predicate, reachable_predecessors, trace_to, resolve_starts, check_safety, VerificationNode, VerificationEdge, VerificationGraph, GraphSafetyProperty, GraphSafetyResult, node_has_label, build_adjacency, bfs_find_path, check_graph_safety, check_all_graph_safety };
