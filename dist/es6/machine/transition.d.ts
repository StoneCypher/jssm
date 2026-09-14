/*******
 *
 *  The transition family: everything that moves the machine.  `transition_impl`
 *  is the single commit path (validation, the hook pipeline, the commit, the
 *  observation events, the boundary actions, the `after` timer), and every
 *  public mover — `transition` / `go`, `force_transition`, `act` / `action`,
 *  and the graph-ignoring `override` — is a one-liner over it.  Every function
 *  takes the machine as its first argument and reads its fields directly; the
 *  `Machine` class methods of the same names are one-line delegates onto these
 *  (the class movers call `transition_impl` directly so the class path gains
 *  no frame).
 *
 *  The class's `do()` has no function form because `do` is a reserved word:
 *  `act` is the function and `action` is an alias of the same function object
 *  (bare-functions design, decision 5; `Machine.do()` is deprecated, its
 *  removal is StoneCypher/fsl#1992).
 *
 *  `transition_impl`, `fire_hook_rejection`, and `fire_boundary_actions` are
 *  exported for the class delegates and the other families (hooks, groups),
 *  not for the barrel.
 *
 */
import type { Machine } from './machine.js';
type StateType = string;
/*********
 *
 *  Shared transition core used by {@link transition}, {@link force_transition},
 *  and {@link act}.  Runs validation, fires the full hook pipeline (pre-
 *  everything, any-action, after, any-transition, exit, named, basic,
 *  edge-type, entry, everything), commits the new state if nothing
 *  rejected, and returns whether the transition succeeded.
 *
 *  Not meant for external use.  Call one of the public wrappers instead:
 *  - `transition` for an ordinary legal transition
 *  - `force_transition` to bypass the legality check
 *  - `act` (alias `action`) to dispatch by action name rather than target state
 *
 *  @remarks
 *  Known sharp edges, carried over from the original `// TODO` comments:
 *  - The forced-ness behavior needs to be cleaned up a lot here.
 *  - The callbacks are not fully correct across the forced / action / plain
 *    cases and should be revisited.
 *  - When multiple edges exist between two states with different `kind`
 *    values, only the first edge's kind is used to pick the edge-type hook.
 *
 *  @typeParam mDT The type of the machine data member; usually omitted.
 *
 *  @param m The machine to move.
 *
 *  @param newStateOrAction The target state name (for a plain or forced
 *  transition) or the action name (when `wasAction` is true).
 *
 *  @param newData Optional replacement machine data to install alongside
 *  the transition.  Hooks may further override this via complex results.
 *
 *  @param wasForced `true` if the caller invoked `force_transition`, in
 *  which case legality is checked against `valid_force_transition` rather
 *  than `valid_transition`.
 *
 *  @param wasAction `true` if the caller invoked `action`, in which case
 *  `newStateOrAction` is an action name and the target state is looked up
 *  via the current action edge.
 *
 *  @param dataProvided `true` when the caller explicitly supplied a data
 *  argument — even an explicitly-`undefined` one, which commits `undefined`
 *  as the new data (StoneCypher/fsl#1264).  When `false` the current data
 *  is preserved.  The public wrappers derive this from call arity; the
 *  default reproduces the old `!== undefined` inference for any direct
 *  callers.
 *
 *  @returns `true` if the transition was valid and every hook passed;
 *  `false` if the transition was invalid or any hook rejected.
 *
 *  @throws {JssmError} If called reentrantly from inside a hook that is still
 *  running in the enclosing transition's pre-commit pipeline — a hook that
 *  calls `transition`/`go`/`do`/`action`.  Committing the inner transition
 *  and then the outer one would silently discard the inner result, so the
 *  reentry is rejected instead (StoneCypher/fsl#1953).  Post-commit reentry
 *  (from a post-hook or the boundary-action cascade) is permitted.
 *
 *  @internal
 *
 */
export declare function transition_impl<mDT>(m: Machine<mDT>, newStateOrAction: StateType, newData: mDT | undefined, wasForced: boolean, wasAction: boolean, dataProvided?: boolean): boolean;
/********
 *
 *  Instruct the machine to complete a transition.  Synonym for {@link go}.
 *
 *  @example
 *  import { sm, transition, state } from 'jssm';
 *
 *  const light = sm`
 *    off 'start' -> red;
 *    red 'next' -> green 'next' -> yellow 'next' -> red;
 *    [red yellow green] 'shutdown' ~> off;
 *  `;
 *
 *  state(light);                 // => 'off'
 *  transition(light, 'red');     // => true
 *  state(light);                 // => 'red'
 *  transition(light, 'green');   // => true
 *  state(light);                 // => 'green'
 *  // no such state, so the transition is refused and the machine stays put:
 *  transition(light, 'blue');    // => false
 *  state(light);                 // => 'green'
 *  // green may not go directly to red, only to yellow:
 *  transition(light, 'red');     // => false
 *  state(light);                 // => 'green'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to move
 *
 *  @param newState The state to switch to
 *
 *  @param newData The data change to insert during the transition.  Omit to
 *  keep the current data; an explicit `undefined` clears it
 *  (StoneCypher/fsl#1264).
 *
 *  @returns `true` if the transition was legal and occurred, `false` otherwise.
 *
 *  @see go
 *  @see force_transition
 *  @see act
 *
 */
export declare function transition<mDT>(m: Machine<mDT>, newState: StateType, newData?: mDT): boolean;
/********
 *
 *  Instruct the machine to complete a transition.  Synonym for {@link transition}.
 *
 *  @example
 *  import { sm, go, state } from 'jssm';
 *
 *  const light = sm`red -> green -> yellow -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
 *
 *  state(light);          // => 'red'
 *  go(light, 'green');    // => true
 *  state(light);          // => 'green'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to move
 *
 *  @param newState The state to switch to
 *
 *  @param newData The data change to insert during the transition.  Omit to
 *  keep the current data; an explicit `undefined` clears it
 *  (StoneCypher/fsl#1264).
 *
 *  @returns `true` if the transition was legal and occurred, `false` otherwise.
 *
 *  @see transition
 *
 */
export declare function go<mDT>(m: Machine<mDT>, newState: StateType, newData?: mDT): boolean;
/********
 *
 *  Instruct the machine to complete a forced transition (which will reject if
 *  called with a normal {@link transition} call.)  Any existing edge
 *  qualifies, forced-only or not; a target with no edge from the current
 *  state is refused.
 *
 *  @example
 *  import { sm, transition, force_transition, state } from 'jssm';
 *
 *  const light = sm`red -> green -> yellow -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
 *
 *  state(light);                        // => 'red'
 *  transition(light, 'off');            // => false
 *  state(light);                        // => 'red'
 *  force_transition(light, 'off');      // => true
 *  state(light);                        // => 'off'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to move
 *
 *  @param newState The state to switch to
 *
 *  @param newData The data change to insert during the transition.  Omit to
 *  keep the current data; an explicit `undefined` clears it
 *  (StoneCypher/fsl#1264).
 *
 *  @returns `true` if a transition (forced or otherwise) existed and occurred,
 *  `false` otherwise.
 *
 *  @see transition
 *  @see valid_force_transition
 *
 */
export declare function force_transition<mDT>(m: Machine<mDT>, newState: StateType, newData?: mDT): boolean;
/********
 *
 *  Instruct the machine to complete an action.  Also exported as `action`,
 *  the same function object, so `import { action }` and `import { act }` are
 *  interchangeable.  This is the function form of the 5.x class methods
 *  `action()` and `do()`; `do` itself has no function form because it is a
 *  JavaScript reserved word, and `Machine.do()` is deprecated in its favor
 *  (removal tracked as StoneCypher/fsl#1992).
 *
 *  @example
 *  import { sm, act, state } from 'jssm';
 *
 *  const light = sm`
 *    off 'start' -> red;
 *    red 'next' -> green 'next' -> yellow 'next' -> red;
 *    [red yellow green] 'shutdown' ~> off;
 *  `;
 *
 *  state(light);           // => 'off'
 *  act(light, 'start');    // => true
 *  state(light);           // => 'red'
 *  act(light, 'next');     // => true
 *  state(light);           // => 'green'
 *  act(light, 'next');     // => true
 *  state(light);           // => 'yellow'
 *  // no such action anywhere in the machine:
 *  act(light, 'dance');    // => false
 *  state(light);           // => 'yellow'
 *  // yellow does not have the action 'start':
 *  act(light, 'start');    // => false
 *  state(light);           // => 'yellow'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to move
 *
 *  @param actionName The action to engage
 *
 *  @param newData The data change to insert during the action.  Omit to keep
 *  the current data; an explicit `undefined` clears it (StoneCypher/fsl#1264).
 *
 *  @returns `true` if the action was valid and the transition occurred,
 *  `false` otherwise.
 *
 *  @see transition
 *  @see valid_action
 *
 */
export declare function act<mDT>(m: Machine<mDT>, actionName: StateType, newData?: mDT): boolean;
export { act as action };
/*********
 *
 *  Replace the current state — and, when a data argument is provided, the
 *  data — with no regard to the graph.
 *
 *  The data argument is arity-detected: omitting it preserves the current
 *  data, while explicitly passing `undefined` really sets the data to
 *  `undefined` (StoneCypher/fsl#1264).  Before 5.163 an omitted data
 *  argument silently cleared the data.
 *
 *  @example
 *  import { sm, go, override, state } from 'jssm';
 *
 *  const machine = sm`allows_override: true; a -> b -> c;`;
 *  state(machine);    // => 'a'
 *
 *  go(machine, 'b');
 *  go(machine, 'c');
 *  state(machine);    // => 'c'
 *
 *  override(machine, 'a');
 *  state(machine);    // => 'a'
 *
 *  @param m The machine to teleport; must have `allows_override` on.
 *
 *  @param newState The state to teleport to; must exist in the graph.
 *
 *  @param newData Replacement data.  Omit to keep the current data; pass
 *  `undefined` explicitly to clear it.
 *
 *  @throws {JssmError} If the machine's config does not set
 *  `allows_override: true`, or if `newState` does not exist.
 *
 *  @see set_data
 *
 */
export declare function override<mDT>(m: Machine<mDT>, newState: StateType, newData?: mDT): void;
/**
 * Check whether an action is available from the current state.
 *
 *  @example
 *  import { sm, act, valid_action } from 'jssm';
 *
 *  const m = sm`a 'next' -> b 'back' -> a;`;
 *  valid_action(m, 'next');   // => true
 *  // b has 'back'; a does not:
 *  valid_action(m, 'back');   // => false
 *  act(m, 'next');
 *  valid_action(m, 'back');   // => true
 *
 *  @param m        - The machine to inspect; it does not move.
 *  @param action   - The action name to check.
 *  @param _newData - Reserved for future data validation.
 *  @returns `true` if the action can be taken.
 *  @see act
 */
export declare function valid_action<mDT>(m: Machine<mDT>, action: StateType, _newData?: mDT): boolean;
/**
 * Check whether a transition to a given state is legal (non-forced) from
 *  the current state.
 *
 *  @example
 *  import { sm, valid_transition } from 'jssm';
 *
 *  const m = sm`a -> b; a ~> c;`;
 *  valid_transition(m, 'b');   // => true
 *  // a forced-only edge:
 *  valid_transition(m, 'c');   // => false
 *  // no such state:
 *  valid_transition(m, 'd');   // => false
 *
 *  @param m        - The machine to inspect; it does not move.
 *  @param newState - The target state.
 *  @param _newData - Reserved for future data validation.
 *  @returns `true` if the transition is legal.
 *  @see transition
 */
export declare function valid_transition<mDT>(m: Machine<mDT>, newState: StateType, _newData?: mDT): boolean;
/**
 * Check whether a forced transition to a given state exists from the
 *  current state.
 *
 *  @example
 *  import { sm, valid_force_transition } from 'jssm';
 *
 *  const m = sm`a -> b; a ~> c; d -> e;`;
 *  valid_force_transition(m, 'b');   // => true
 *  valid_force_transition(m, 'c');   // => true
 *  // no edge from a to e:
 *  valid_force_transition(m, 'e');   // => false
 *
 *  @param m        - The machine to inspect; it does not move.
 *  @param newState - The target state.
 *  @param _newData - Reserved for future data validation.
 *  @returns `true` if a forced (or any) transition exists.
 *  @see force_transition
 */
export declare function valid_force_transition<mDT>(m: Machine<mDT>, newState: StateType, _newData?: mDT): boolean;
/*********
 *
 *  Fire a `'rejection'` event caused by a hook vetoing a pending transition.
 *  Extracted from the per-call closures inside {@link transition_impl} so
 *  that it is allocated once at module-load time rather than on every
 *  hooked transition.
 *
 *  @param m          The machine whose transition was vetoed.
 *  @param hook_name  Name of the hook that rejected (e.g. `'exit'`).
 *  @param fromState  State the machine was in when the transition was
 *    attempted; used as the `from` field of the rejection event.
 *  @param newState   State that would have been entered had the hook
 *    passed; used as the `to` field of the rejection event.
 *  @param fromAction Action name when the transition was initiated by an
 *    action call; `undefined` for plain state transitions.
 *  @param oldData    Machine data at the moment the transition was
 *    attempted, before any hook mutations.
 *  @param newData    The `next_data` value passed to the transition call.
 *  @param wasForced  Whether the transition was attempted via
 *    `force_transition`.
 *
 *  @see transition_impl
 *  @see fire
 *
 *  @internal
 *
 */
export declare function fire_hook_rejection<mDT>(m: Machine<mDT>, hook_name: string, fromState: StateType, newState: StateType, fromAction: StateType | undefined, oldData: mDT, newData: mDT | undefined, wasForced: boolean): void;
/*********
 *
 *  Fire the FSL boundary-hook actions for a single, already-committed state
 *  change.  In FSL, `do` is a synonym for `action`, so `on enter &g do 'X';`
 *  means "when the machine crosses INTO group `g`, dispatch machine action
 *  `X`" — and likewise `on exit` / plain-state subjects.  This is the runtime
 *  that fires those parked hooks.
 *
 *  Crossing semantics (statechart convention — exits before enters):
 *
 *  1. `prev_groups` / `next_groups` are the deep (transitive) group sets of
 *     the old and new states, from `_state_to_groups`.
 *  2. **Exits** fire first: every group in `prev_groups \ next_groups` with an
 *     `onExit`, plus the plain `prev_state`'s `onExit` (when the state name
 *     actually changed).
 *  3. **Enters** fire next: every group in `next_groups \ prev_groups` with an
 *     `onEnter`, plus the plain `next_state`'s `onEnter` (when the state name
 *     changed).
 *  4. A group present in BOTH sets is a transition *within* that group and
 *     fires neither of its boundary hooks.  `prev_state === next_state` fires
 *     nothing at all.
 *  5. "Fire its action" is `act(m, label)`.  If that action is not valid
 *     from the current state, `action` is a safe no-op (returns `false`) — an
 *     inapplicable boundary action never throws.
 *  6. Multi-membership and nesting both fan out naturally: a state in groups
 *     A and B fires both; crossing an inner and an outer boundary fires both
 *     levels.
 *
 *  Because firing an action can drive a further transition (which crosses
 *  more boundaries, which fires more actions), this is a bounded
 *  run-to-completion: `_boundary_depth` tracks the live cascade depth and a
 *  cascade deeper than `_boundary_depth_limit` throws a {@link JssmError}
 *  rather than overflowing the stack or hanging.  The limit defaults to 100
 *  and is configurable via the `boundary_depth_limit` constructor option.
 *
 *  @param m          The machine that just committed the state change.
 *  @param prev_state The state the machine was in before this commit.
 *  @param next_state The state the machine is in now (already committed).
 *
 *  @throws {JssmError} If cascaded boundary firing exceeds `_boundary_depth_limit`
 *    (a probable infinite loop).
 *
 *  @see act
 *  @see transition_impl
 *
 *  @internal
 *
 */
export declare function fire_boundary_actions<mDT>(m: Machine<mDT>, prev_state: StateType, next_state: StateType): void;
