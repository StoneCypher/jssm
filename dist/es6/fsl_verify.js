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
 *
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
// ---------------------------------------------------------------------------
//  Predicate constructors
// ---------------------------------------------------------------------------
/**
 *  Predicate: the state has exactly this name.
 *
 *  @param name - The state name to match.
 *
 *  @example
 *  ```typescript
 *  in_state('Done');   // { atom: 'in_state', name: 'Done' }
 *  ```
 */
const in_state = (name) => ({ atom: 'in_state', name });
/**
 *  Predicate: the state's name is one of `names`.  An empty set is a
 *  contradiction (matches nothing).
 *
 *  @param names - The accepted state names.
 *
 *  @example
 *  ```typescript
 *  in_any(['red', 'amber']);   // true in 'red' or 'amber'
 *  ```
 */
const in_any = (names) => ({ atom: 'in_any', names: new Set(names) });
/**
 *  Predicate: the state is terminal — it has no outgoing transitions.
 *
 *  @example
 *  ```typescript
 *  is_terminal;   // true only in dead-end states
 *  ```
 */
const is_terminal = { atom: 'is_terminal' };
/**
 *  Predicate: the state is final — terminal, or flagged `complete`.
 *
 *  @example
 *  ```typescript
 *  is_final;   // true in completing states
 *  ```
 */
const is_final = { atom: 'is_final' };
/**
 *  Predicate: the state is one of the caller-supplied error states (§17).
 *
 *  @example
 *  ```typescript
 *  is_error;   // true in states named by SafetyOptions.error_states
 *  ```
 */
const is_error = { atom: 'is_error' };
/**
 *  The predicate that is true in every state — the unit of {@link p_and}.
 */
const tautology = { atom: 'tautology' };
/**
 *  The predicate that is false in every state — the unit of {@link p_or}.
 */
const contradiction = { atom: 'contradiction' };
/**
 *  Negate a predicate.
 *
 *  @param arg - The predicate to invert.
 *
 *  @example
 *  ```typescript
 *  p_not(in_state('Crashed'));   // true everywhere except 'Crashed'
 *  ```
 */
const p_not = (arg) => ({ atom: 'not', arg });
/**
 *  Conjoin predicates.  With no arguments this is {@link tautology}.
 *
 *  @param args - The predicates that must all hold.
 *
 *  @example
 *  ```typescript
 *  p_and(is_terminal, p_not(is_final));   // a terminal that isn't "complete"
 *  ```
 */
const p_and = (...args) => ({ atom: 'and', args });
/**
 *  Disjoin predicates.  With no arguments this is {@link contradiction}.
 *
 *  @param args - The predicates of which at least one must hold.
 *
 *  @example
 *  ```typescript
 *  p_or(is_error, is_terminal);   // either an error state or a dead end
 *  ```
 */
const p_or = (...args) => ({ atom: 'or', args });
// ---------------------------------------------------------------------------
//  Safety-property constructors
// ---------------------------------------------------------------------------
/**
 *  Coerce a predicate-or-state-name into a predicate.  A bare string is read as
 *  {@link in_state}, so callers can write `absence('Crashed')`.
 *
 *  @param p - Either a {@link StatePredicate} or a state name.
 */
const as_predicate = (p) => (typeof p === 'string') ? in_state(p) : p;
/**
 *  Safety property: `P` holds in **every** reachable state (an invariant).
 *
 *  @param pred - The invariant predicate, or a state name (= must always be in it).
 *
 *  @example
 *  ```typescript
 *  always(p_not(is_error));   // "never reach an error state"
 *  ```
 */
const always = (pred) => ({ kind: 'always', pred: as_predicate(pred) });
/**
 *  Safety property: `P` holds in **no** reachable state (`always not P`).
 *
 *  @param pred - The forbidden predicate, or a state name.
 *
 *  @example
 *  ```typescript
 *  never(is_error);            // no error state is reachable
 *  never('Crashed');           // the 'Crashed' state is unreachable
 *  ```
 */
const never = (pred) => ({ kind: 'never', pred: as_predicate(pred) });
/**
 *  Safety property: **some** reachable state satisfies `P`.  Succeeds with a
 *  witness trace.
 *
 *  @param pred - The target predicate, or a state name.
 *
 *  @example
 *  ```typescript
 *  reachable('Done');          // 'Done' can be reached from start
 *  ```
 */
const reachable = (pred) => ({ kind: 'reachable', pred: as_predicate(pred) });
/**
 *  Safety property: **no** reachable state satisfies `P` — the same query as
 *  {@link never}, named for symmetry with {@link reachable}.
 *
 *  @param pred - The target predicate, or a state name.
 *
 *  @example
 *  ```typescript
 *  unreachable('Crashed');     // 'Crashed' is never reached
 *  ```
 */
const unreachable = (pred) => ({ kind: 'unreachable', pred: as_predicate(pred) });
/**
 *  Dwyer **absence** pattern (globally): the target never occurs — alias for
 *  {@link unreachable}.
 *
 *  @param pred - The state name or predicate that must be absent.
 *
 *  @example
 *  ```typescript
 *  absence('Deadlock');        // "Deadlock is absent globally"
 *  ```
 */
const absence = (pred) => unreachable(pred);
/**
 *  Dwyer **existence** pattern (globally): the target eventually occurs on some
 *  path — alias for {@link reachable}.
 *
 *  @param pred - The state name or predicate that must exist.
 *
 *  @example
 *  ```typescript
 *  existence('Done');          // "Done exists globally"
 *  ```
 */
const existence = (pred) => reachable(pred);
// ---------------------------------------------------------------------------
//  Evaluation
// ---------------------------------------------------------------------------
/**
 *  Evaluate a {@link StatePredicate} against a single machine state.  Pure and
 *  total — every atom and connective is handled, recursion bottoms out at the
 *  finite predicate AST.
 *
 *  @typeParam mDT - The machine's data type; usually omitted.
 *
 *  @param machine - The machine, consulted read-only for state metadata.
 *  @param state   - The state name to test.
 *  @param pred    - The predicate to evaluate.
 *  @param errors  - The set of error-state names (for the {@link is_error} atom).
 *
 *  @returns `true` iff `state` satisfies `pred`.
 *
 *  @example
 *  ```typescript
 *  import { sm } from 'jssm';
 *  const m = sm`a -> b;`;
 *  eval_predicate(m, 'b', is_terminal, new Set());   // true
 *  ```
 */
const eval_predicate = (machine, state, pred, errors) => {
    switch (pred.atom) {
        case 'in_state': return state === pred.name;
        case 'in_any': return pred.names.has(state);
        case 'is_terminal': return machine.state_is_terminal(state);
        case 'is_final': return machine.state_is_final(state);
        case 'is_error': return errors.has(state);
        case 'tautology': return true;
        case 'contradiction': return false;
        case 'not':
            return !eval_predicate(machine, state, pred.arg, errors);
        case 'and':
            return pred.args.every(p => eval_predicate(machine, state, p, errors));
        case 'or':
            return pred.args.some(p => eval_predicate(machine, state, p, errors));
    }
};
/**
 *  Breadth-first reachability from `starts`, recording, for each reached state,
 *  the immediate predecessor on its shortest path — enough to reconstruct a
 *  counterexample trace.  Pure: returns a fresh map, mutates nothing.
 *
 *  @typeParam mDT - The machine's data type; usually omitted.
 *
 *  @param machine - The machine, consulted read-only via {@link Machine.list_exits}.
 *  @param starts  - The frontier seed (already validated to exist).
 *
 *  @returns A map from each reachable state to its predecessor (`null` for a
 *  seed), in BFS discovery order.
 */
const reachable_predecessors = (machine, starts) => {
    const predecessor = new Map();
    const queue = [];
    for (const s of starts) {
        if (!predecessor.has(s)) {
            predecessor.set(s, null);
            queue.push(s);
        }
    }
    // Manual head index avoids O(n) Array.shift on long frontiers.
    let head = 0;
    while (head < queue.length) {
        const current = queue[head++];
        for (const next of machine.list_exits(current)) {
            if (!predecessor.has(next)) {
                predecessor.set(next, current);
                queue.push(next);
            }
        }
    }
    return predecessor;
};
/**
 *  Reconstruct the shortest trace from a seed to `target`, walking the
 *  predecessor map produced by {@link reachable_predecessors} backwards and then
 *  reversing.
 *
 *  @param predecessor - The BFS predecessor map.
 *  @param target      - The state to trace back from (must be a key).
 *
 *  @returns The path of state names from a start state to `target`, inclusive.
 */
const trace_to = (predecessor, target) => {
    var _a;
    const reversed = [];
    let cursor = target;
    while (cursor !== null) {
        reversed.push(cursor);
        cursor = (_a = predecessor.get(cursor)) !== null && _a !== void 0 ? _a : null;
    }
    return reversed.reverse();
};
/**
 *  Resolve the start frontier for a run: the caller's {@link SafetyOptions.start_states}
 *  if given, else the machine's current state.  Every name is validated against
 *  the machine.
 *
 *  @typeParam mDT - The machine's data type; usually omitted.
 *
 *  @param machine - The machine to resolve against.
 *  @param starts  - The requested start states, or `undefined` for the default.
 *
 *  @returns The validated, de-duplicated start frontier.
 *
 *  @throws {Error} If a requested start state is not known to the machine.
 */
const resolve_starts = (machine, starts) => {
    const requested = (starts === undefined) ? [machine.state()] : starts;
    for (const s of requested) {
        if (!machine.has_state(s)) {
            throw new Error(`fsl_verify: start state "${s}" is not a state of the machine`);
        }
    }
    return requested;
};
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
 *
 *  @typeParam mDT - The machine's data type; usually omitted.
 *
 *  @param machine  - The machine to check.
 *  @param property - The safety property, e.g. from {@link always} / {@link absence}.
 *  @param options  - Error states and/or an explicit start frontier.
 *
 *  @returns A {@link SafetyResult} carrying the verdict and any counterexample
 *  or witness trace.
 *
 *  @throws {Error} If an explicit start state is not known to the machine.
 *
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
 *
 *  @see absence
 *  @see reachable
 */
const check_safety = (machine, property, options = {}) => {
    var _a;
    const errors = new Set((_a = options.error_states) !== null && _a !== void 0 ? _a : []);
    const starts = resolve_starts(machine, options.start_states);
    const predecessor = reachable_predecessors(machine, starts);
    const reached = Array.from(predecessor.keys());
    const states_explored = reached.length;
    // `always P` and `reachable P` differ only in what counts as the witness and
    // how the verdict reads, so reduce both to a single "find the marked state".
    const hit = (p) => reached.find(s => eval_predicate(machine, s, p, errors));
    switch (property.kind) {
        case 'always': {
            // Counterexample = first reachable state violating the invariant.
            const witness = hit(p_not(property.pred));
            return {
                property,
                holds: witness === undefined,
                trace: (witness === undefined) ? undefined : trace_to(predecessor, witness),
                states_explored
            };
        }
        case 'never':
        case 'unreachable': {
            // Counterexample = first reachable state matching the forbidden predicate.
            const witness = hit(property.pred);
            return {
                property,
                holds: witness === undefined,
                trace: (witness === undefined) ? undefined : trace_to(predecessor, witness),
                states_explored
            };
        }
        case 'reachable': {
            // Witness on success; no trace on failure (nothing to point at).
            const witness = hit(property.pred);
            return {
                property,
                holds: witness !== undefined,
                trace: (witness === undefined) ? undefined : trace_to(predecessor, witness),
                states_explored
            };
        }
    }
};
export { 
// predicate atoms / constructors
in_state, in_any, is_terminal, is_final, is_error, tautology, contradiction, p_not, p_and, p_or, 
// safety-property constructors
always, never, reachable, unreachable, absence, existence, 
// evaluation
as_predicate, eval_predicate, reachable_predecessors, trace_to, resolve_starts, check_safety };
