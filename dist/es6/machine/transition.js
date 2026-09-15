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
import { JssmError } from '../jssm_error.js';
import { pair_key } from '../jssm_intern.js';
import { fire, has_subscribers } from './events.js';
import { clear_state_timeout, auto_set_state_timeout } from './timers.js';
import { abstract_hook_step, abstract_everything_hook_step, update_hook_fields } from './hooks.js';
import { state, allows_override, current_action_for, lookup_transition_for } from './query.js';
// Shared empty group set for states that belong to no group (see
// fire_boundary_actions); one instance so the hot path never allocates it.
const empty_string_set = new Set();
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
export function transition_impl(m, newStateOrAction, newData, wasForced, wasAction, dataProvided = newData !== undefined) {
    // Reject reentry from inside the pre-commit hook pipeline.  Without this, a
    // hook that itself transitions the machine would commit an inner transition
    // that this outer, not-yet-committed frame then silently overwrites.  Post-
    // commit reentry (post-hooks, the boundary-action cascade) is fine: the flag
    // is already cleared by then.  StoneCypher/fsl#1953
    if (m._committing_transition) {
        throw new JssmError(m, 'cannot start a transition from within a transition hook: the enclosing transition has not committed yet, so the inner result would be silently discarded');
    }
    let valid = false, 
    // deliberately `string`, not `JssmArrowKind`, though only arrow kinds are
    // ever assigned: declaring this local as the 4-member union makes tsc's
    // control-flow analysis narrow it across the whole of this (very large)
    // function, which overflows the checker's stack under `npm run make`.
    // The union is recovered at the hook boundary below -- see hook_args_obj.
    trans_type, newState, newStateId = NaN, actionId = NaN, fromAction;
    if (wasForced) {
        // numeric inline of valid_force_transition: any existing edge
        // qualifies, forced or not.  one string probe (the user's target name)
        // plus one numeric probe, replacing two string probes.
        const to_id = m._state_interner.id_of(newStateOrAction);
        const edgeId = (to_id === undefined) ? undefined : m._edge_id_by_pair.get(pair_key(m._state_id, to_id));
        if (edgeId !== undefined) {
            valid = true;
            trans_type = 'forced';
            newState = newStateOrAction;
            newStateId = to_id;
        }
    }
    else if (wasAction) {
        // single numeric resolution: the old path looked the action up twice,
        // once inside valid_action and again inside current_action_edge_for.
        // aid is captured for the numeric hook probes below (#729).
        const aid = m._action_interner.id_of(newStateOrAction);
        const edgeId = (aid === undefined) ? undefined : m._edge_id_by_action_pair.get(pair_key(aid, m._state_id));
        if (edgeId !== undefined) {
            const edge = m._edges[edgeId];
            valid = true;
            trans_type = edge.kind;
            newState = edge.to;
            newStateId = m._edge_to_ids[edgeId];
            fromAction = newStateOrAction;
            actionId = aid;
        }
    }
    else {
        // numeric inline of valid_transition: the edge must exist and must not
        // be forced_only (truthiness, matching the old refusal exactly)
        const to_id = m._state_interner.id_of(newStateOrAction);
        const edgeId = (to_id === undefined) ? undefined : m._edge_id_by_pair.get(pair_key(m._state_id, to_id));
        if ((edgeId !== undefined) && (!(m._edges[edgeId].forced_only))) {
            if (m._has_transition_hooks || m._has_post_transition_hooks) {
                // kind of the dispatched edge.  _edge_id_by_pair and _edge_map are
                // both first-declared-wins for parallel (from, to) pairs (see the
                // constructor around _edge_map / _edge_id_by_pair), and
                // _outbound_edge_ids fills in declaration order — so the old
                // first-match outbound scan always resolved to this same edgeId.
                // Direct read replaces the O(out-degree) object-deref scan; the
                // first-declared-kind semantics are pinned by the parallel-edge
                // transition-kind hook spec.  #735
                trans_type = m._edges[edgeId].kind;
            }
            valid = true;
            newState = newStateOrAction;
            newStateId = to_id;
        }
    }
    // hook_args is read only inside the `_has_hooks` / `_has_post_hooks`
    // blocks below.  Skip building it for hook-free machines (every
    // chain/dense/hub/messy benchmark shape) so the hot path stops allocating
    // a 7-field object it never reads.  The NonNullable cast keeps the type
    // unchanged for all downstream uses without introducing an impossible
    // (uncoverable) branch; the value is only dereferenced under the guards
    // that imply it was built.  #670
    // NOTE (#735): the { ...hook_args, hook_name } spreads at the four
    // everything-hook sites are contractual, not waste — handlers may capture
    // their context, and each captured context must durably carry its own
    // hook_name (pinned by the simultaneous-everything-hook specs).  A shared
    // mutated object cannot satisfy that; do not "optimize" the spreads away.
    const hook_args_obj = (m._has_hooks || m._has_post_hooks)
        ? {
            data: m._data,
            action: fromAction,
            from: m._state,
            to: newState,
            next_data: newData,
            forced: wasForced,
            // sound: the only values ever assigned to trans_type are an edge's
            // `kind` and the literal 'forced'.  The local is typed `string` only
            // to keep tsc's flow analysis off it (see its declaration above).
            trans_type: trans_type
        }
        : undefined;
    const hook_args = hook_args_obj;
    // 'action' event fires when an action is attempted, regardless of whether
    // it ultimately succeeds — matches the issue spec for observation events.
    // Gated on live listener count so we skip the detail-object allocation
    // when nothing is subscribed.  Gate is read at fire time, so a listener
    // registered inside a pre-hook still receives the event.  #671
    if (wasAction && m._event_listener_count !== 0) {
        fire(m, 'action', {
            action: newStateOrAction,
            from: m._state,
            to: newState,
            data: m._data,
            next_data: newData
        });
    }
    // Captured pre-transition source state so 'data-change' detail and similar
    // events can name where we came from.  fromStateId mirrors it for the
    // numeric post-hook probes: by the time they run, _state_id is already
    // the destination (#729).
    const fromState = m._state;
    const fromStateId = m._state_id;
    const oldData = m._data;
    if (valid) {
        if (m._has_hooks) {
            // Open the pre-commit window: from here until the commit below, any
            // reentrant transition_impl call (a hook transitioning the machine)
            // throws instead of being silently reverted.  The `finally` below closes
            // it on every exit path; _fire_hook_rejection additionally clears it
            // before firing the rejection event so a rejection listener may itself
            // transition.  The pipeline body is intentionally left at its original
            // indentation to keep this fix's diff focused.  #1953
            m._committing_transition = true;
            try {
                let data_changed = false;
                // 0. pre everything hook (fires before all other pre-hooks)
                if (m._pre_everything_hook !== undefined) {
                    const outcome = abstract_everything_hook_step(m._pre_everything_hook, Object.assign(Object.assign({}, hook_args), { hook_name: 'pre everything' }));
                    if (!outcome.pass) {
                        fire_hook_rejection(m, 'pre everything', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                if (wasAction) {
                    // 1a. any action hook
                    const outcome = abstract_hook_step(m._any_action_hook, hook_args);
                    if (!outcome.pass) {
                        fire_hook_rejection(m, 'any action', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                    // 1b. global specific action hook
                    const outcome2 = abstract_hook_step(m._global_action_hooks.get(actionId), hook_args);
                    if (!outcome2.pass) {
                        fire_hook_rejection(m, 'global action', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (update_hook_fields(hook_args, outcome2)) {
                        data_changed = true;
                    }
                }
                // 2. (removed) After hooks do NOT fire on dispatch.  They are the
                // `after`-timer's companion (fsl#698: "delay over!") and fire only from
                // the state-timeout path.  Through v5.143.28 a probe here keyed on
                // newStateOrAction spuriously fired them on entering the hooked state —
                // or on a same-named action — making one timer elapse read as two
                // handler calls (StoneCypher/fsl#1327).
                // 3. any transition hook
                if (m._any_transition_hook !== undefined) {
                    const outcome = abstract_hook_step(m._any_transition_hook, hook_args);
                    if (!outcome.pass) {
                        fire_hook_rejection(m, 'any transition', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                // 4. exit hook
                if (m._has_exit_hooks) {
                    const outcome = abstract_hook_step(m._exit_hooks.get(m._state_id), hook_args);
                    if (!outcome.pass) {
                        fire_hook_rejection(m, 'exit', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                // shared by steps 5 and 6: pre-commit, m._state_id is still the
                // from-state, so both probes key on the same pair; compute it once
                const pre_pair_id = pair_key(m._state_id, newStateId);
                // 5. named transition / action hook
                if (m._has_named_hooks && wasAction) {
                    // Numeric pair probe, then the action id captured at dispatch (#729).
                    const byPair = m._named_hooks.get(pre_pair_id);
                    const nh = byPair === undefined ? undefined : byPair.get(actionId);
                    const outcome = abstract_hook_step(nh, hook_args);
                    if (!outcome.pass) {
                        fire_hook_rejection(m, 'named', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                // 6. regular hook
                if (m._has_basic_hooks) {
                    // Numeric pair probe (#729); one integer hash replaces two string maps.
                    const h = m._hooks.get(pre_pair_id);
                    const outcome = abstract_hook_step(h, hook_args);
                    if (!outcome.pass) {
                        fire_hook_rejection(m, 'hook', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                // 7. edge type hook
                // 7a. standard transition hook
                if (trans_type === 'legal') {
                    const outcome = abstract_hook_step(m._standard_transition_hook, hook_args);
                    if (!outcome.pass) {
                        fire_hook_rejection(m, 'standard transition', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                    // 7b. main type hook
                }
                else if (trans_type === 'main') {
                    const outcome = abstract_hook_step(m._main_transition_hook, hook_args);
                    if (!outcome.pass) {
                        fire_hook_rejection(m, 'main transition', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                    // 7c. forced transition hook
                }
                else if (trans_type === 'forced') {
                    const outcome = abstract_hook_step(m._forced_transition_hook, hook_args);
                    if (!outcome.pass) {
                        fire_hook_rejection(m, 'forced transition', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                // 8. entry hook
                if (m._has_entry_hooks) {
                    const outcome = abstract_hook_step(m._entry_hooks.get(newStateId), hook_args);
                    if (!outcome.pass) {
                        fire_hook_rejection(m, 'entry', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                // 9. everything hook (fires after all other pre-hooks)
                if (m._everything_hook !== undefined) {
                    const outcome = abstract_everything_hook_step(m._everything_hook, Object.assign(Object.assign({}, hook_args), { hook_name: 'everything' }));
                    if (!outcome.pass) {
                        fire_hook_rejection(m, 'everything', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                // all hooks passed!  let's now establish the result
                // a hook may have redirected the destination via a complex result's
                // `state` (carried on hook_args.to).  Apply it now, validating it names
                // a real state.  Pre-transition hooks (including entry/exit) fired for
                // the original edge; the committed state and the post-hooks, observation
                // events, and after-timer all reflect the override.  Last writer wins.
                // StoneCypher/fsl#1947
                if (hook_args.to !== newState) {
                    const override_id = m._state_interner.id_of(hook_args.to);
                    if (override_id === undefined) {
                        throw new JssmError(m, `A hook overrode the transition destination to '${hook_args.to}', which is not a state in this machine`);
                    }
                    newState = hook_args.to;
                    newStateId = override_id;
                }
                if (m._history_length) {
                    m._history.shove([m._state, m._data]);
                }
                m._state = newState;
                m._state_id = newStateId;
                if (data_changed) {
                    m._data = hook_args.next_data;
                }
                else if (dataProvided) {
                    m._data = newData;
                }
                // success fallthrough to posthooks; intentionally no return here
                // look for "posthooks begin here"
            }
            finally {
                // Close the pre-commit window on EVERY exit from the pipeline: normal
                // fallthrough after commit, a hook veto's `return false`, the
                // destination-override throw, or a user hook throwing.  Post-hooks and
                // the boundary-action cascade run after this and may re-enter the
                // machine coherently from the committed state.  #1953
                m._committing_transition = false;
            }
            // or without hooks
        }
        else {
            if (m._history_length) {
                m._history.shove([m._state, m._data]);
            }
            m._state = newState;
            m._state_id = newStateId;
            // provision is detected by caller arity, so an explicit `undefined`
            // commits while an omitted argument preserves (StoneCypher/fsl#1264)
            if (dataProvided) {
                m._data = newData;
            }
            // success fallthrough to posthooks; intentionally no return here
            // look for "posthooks begin here"
        }
        // not valid
    }
    else {
        // Gated on live listener count so we skip the detail-object allocation
        // when nothing is subscribed.  A listener still receives the event
        // because the gate is read at fire time.  #671
        if (m._event_listener_count !== 0) {
            fire(m, 'rejection', {
                from: fromState,
                to: newStateOrAction, // we never resolved a real target
                action: fromAction,
                data: oldData,
                next_data: newData,
                reason: 'invalid',
                forced: wasForced
            });
        }
        return false;
    }
    // posthooks begin here
    if (m._has_post_hooks) {
        // 0. pre post everything hook (fires before all other post-hooks)
        if (m._pre_post_everything_hook !== undefined) {
            m._pre_post_everything_hook(Object.assign(Object.assign({}, hook_args), { hook_name: 'pre post everything' }));
        }
        if (wasAction) {
            // 1. any action posthook
            if (m._post_any_action_hook !== undefined) {
                m._post_any_action_hook(hook_args);
            }
            // 2. global specific action hook
            const pgah = m._post_global_action_hooks.get(actionId);
            if (pgah !== undefined) {
                pgah(hook_args);
            }
        }
        // 3. any transition hook
        if (m._post_any_transition_hook !== undefined) {
            m._post_any_transition_hook(hook_args);
        }
        // 4. exit hook
        if (m._has_post_exit_hooks) {
            const peh = m._post_exit_hooks.get(fromStateId);
            if (peh !== undefined) {
                peh(hook_args);
            }
        }
        // shared by steps 5 and 6: post-commit m._state_id has moved on, so
        // the from-side of the pair comes from the captured fromStateId;
        // compute it once
        const post_pair_id = pair_key(fromStateId, newStateId);
        // 5. named transition / action hook
        if (m._has_post_named_hooks && wasAction) {
            // Numeric pair probe, then the action id captured at dispatch (#729).
            const byPair = m._post_named_hooks.get(post_pair_id);
            const pnh = byPair === undefined ? undefined : byPair.get(actionId);
            if (pnh !== undefined) {
                pnh(hook_args);
            }
        }
        // 6. regular hook
        if (m._has_post_basic_hooks) {
            // Numeric pair probe (#729).
            const hook = m._post_hooks.get(post_pair_id);
            if (hook !== undefined) {
                hook(hook_args);
            }
        }
        // 7. edge type hook
        // 7a. standard transition hook
        if (trans_type === 'legal' && m._post_standard_transition_hook !== undefined) {
            m._post_standard_transition_hook(hook_args);
        }
        // 7b. main type hook
        if (trans_type === 'main' && m._post_main_transition_hook !== undefined) {
            m._post_main_transition_hook(hook_args);
        }
        // 7c. forced transition hook
        if (trans_type === 'forced' && m._post_forced_transition_hook !== undefined) {
            m._post_forced_transition_hook(hook_args);
        }
        // 8. entry hook
        if (m._has_post_entry_hooks) {
            const hook = m._post_entry_hooks.get(newStateId);
            if (hook !== undefined) {
                hook(hook_args);
            }
        }
        // 9. post everything hook (fires after all other post-hooks)
        if (m._post_everything_hook !== undefined) {
            m._post_everything_hook(Object.assign(Object.assign({}, hook_args), { hook_name: 'post everything' }));
        }
    }
    // Observation events (#638) fire after the state is committed.  Each call
    // builds a detail literal at the call site, so guard the whole block on a
    // live subscription count: with zero listeners (the common hot-path case,
    // and every benchmark shape) we skip all of these allocations entirely.
    // Read after pre-hooks, so a listener a pre-hook installed is still seen.
    // ('action' above and 'rejection' on the invalid path are intentionally
    // NOT under this gate — they fire regardless, and `_fire` itself no-ops
    // cheaply when that specific event has no subscribers.)  #670
    if (m._event_listener_count !== 0) {
        const newData_after = m._data;
        // per-name gates: each detail literal below is only built when that
        // specific event has a live subscriber — a single-purpose panel
        // listening only to 'transition' previously paid for the exit/entry/
        // data-change/terminal/complete allocations _fire then discarded.
        // Gates read at fire time, like the outer count, preserving #671.
        if (has_subscribers(m, 'exit')) {
            fire(m, 'exit', {
                state: fromState,
                to: newState,
                action: fromAction,
                data: newData_after
            });
        }
        if (has_subscribers(m, 'transition')) {
            fire(m, 'transition', {
                from: fromState,
                to: newState,
                action: fromAction,
                data: newData_after,
                next_data: newData,
                trans_type,
                forced: wasForced
            });
        }
        if (has_subscribers(m, 'entry')) {
            fire(m, 'entry', {
                state: newState,
                from: fromState,
                action: fromAction,
                data: newData_after
            });
        }
        if ((oldData !== newData_after) && has_subscribers(m, 'data-change')) {
            fire(m, 'data-change', {
                from: fromState,
                to: newState,
                action: fromAction,
                old_data: oldData,
                new_data: newData_after,
                cause: 'transition'
            });
        }
        // one state-record fetch answers both checks; newState is known-valid
        // here, and the public state_is_terminal / state_is_complete pair would
        // each redo has_state plus its own map walk.  Same predicates:
        // terminal = no exits, complete = the constructor-set flag.  #735
        const new_state_rec = m._states.get(newState);
        if ((new_state_rec.to.length === 0) && has_subscribers(m, 'terminal')) {
            fire(m, 'terminal', { state: newState, data: newData_after });
        }
        if (new_state_rec.complete && has_subscribers(m, 'complete')) {
            fire(m, 'complete', { state: newState, data: newData_after });
        }
    }
    // FSL boundary-hook actions (`on enter/exit &g do 'X'`) fire after the
    // state is committed and after the observation events, matching the
    // statechart "exits before enters" convention.  Cascades are depth-bounded
    // inside the helper.
    fire_boundary_actions(m, fromState, newState);
    // Clear the departed state's `after` timer and re-establish the new state's,
    // now that the transition has actually committed.  This clear runs only on a
    // successful commit -- a hook that VETOES the transition returns above, so
    // the machine stays put and its pending `after` timer is preserved
    // (StoneCypher/fsl#1945).  It still runs for hook-free machines, so a manual
    // transition away cannot leave a ghost timer to fire a stray go() later
    // (the fsl#1327 guarantee).  The clear must precede the arm because
    // set_state_timeout throws if a timer is already pending.
    clear_state_timeout(m);
    auto_set_state_timeout(m);
    return true;
}
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
export function transition(m, newState, newData) {
    // arity, not undefined-comparison: with the machine in slot 0 the data
    // argument is the third, so an explicit `undefined` is a real data
    // assignment and an omitted one preserves (StoneCypher/fsl#1264)
    return transition_impl(m, newState, newData, false, false, arguments.length >= 3);
}
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
export function go(m, newState, newData) {
    return transition_impl(m, newState, newData, false, false, arguments.length >= 3);
}
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
export function force_transition(m, newState, newData) {
    return transition_impl(m, newState, newData, true, false, arguments.length >= 3);
}
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
export function act(m, actionName, newData) {
    // arity, not undefined-comparison: an explicit `undefined` is a real
    // data assignment (StoneCypher/fsl#1264); the data argument is the third
    return transition_impl(m, actionName, newData, false, true, arguments.length >= 3);
}
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
export function override(m, newState, newData) {
    // arity, not undefined-comparison: an omitted argument preserves the
    // data, an explicit `undefined` clears it (StoneCypher/fsl#1264)
    const dataProvided = arguments.length >= 3;
    if (allows_override(m)) {
        if (m._states.has(newState)) {
            const fromState = m._state;
            const oldData = m._data;
            m._state = newState;
            m._state_id = m._state_interner.intern(newState);
            if (dataProvided) {
                m._data = newData;
            }
            fire(m, 'override', {
                from: fromState,
                to: newState,
                old_data: oldData,
                new_data: m._data
            });
            if (dataProvided && (oldData !== newData)) {
                fire(m, 'data-change', {
                    from: fromState,
                    to: newState,
                    old_data: oldData,
                    new_data: newData,
                    cause: 'override'
                });
            }
            // An override is still a real state change that may cross group/state
            // boundaries, so its boundary-hook actions fire too (depth-bounded).
            fire_boundary_actions(m, fromState, newState);
        }
        else {
            throw new JssmError(m, `Cannot override state to "${newState}", a state that does not exist`);
        }
    }
    else {
        throw new JssmError(m, "Code specifies no override, but config tries to permit; config may not be less strict than code");
    }
}
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
export function valid_action(m, action, _newData) {
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    return current_action_for(m, action) !== undefined;
}
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
export function valid_transition(m, newState, _newData) {
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    const transition_for = lookup_transition_for(m, state(m), newState);
    if (!(transition_for)) {
        return false;
    }
    if (transition_for.forced_only) {
        return false;
    }
    return true;
}
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
export function valid_force_transition(m, newState, _newData) {
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    return (lookup_transition_for(m, state(m), newState) !== undefined);
}
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
export function fire_hook_rejection(m, hook_name, fromState, newState, fromAction, oldData, newData, wasForced) {
    // Every hook veto in transition_impl's pre-commit pipeline exits through
    // here, so this is the single close point for the reentrancy guard on the
    // rejection path: clear it before firing the event so a `rejection` listener
    // may itself transition (the outer transition is abandoned, not reverted).
    // #1953
    m._committing_transition = false;
    fire(m, 'rejection', {
        from: fromState,
        to: newState,
        action: fromAction,
        data: oldData,
        next_data: newData,
        reason: 'hook',
        hook_name,
        forced: wasForced
    });
}
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
export function fire_boundary_actions(m, prev_state, next_state) {
    var _a, _b, _c, _d, _e, _f;
    // Nothing crosses a boundary when the state name is unchanged.
    if (prev_state === next_state) {
        return;
    }
    // Skip entirely for machines that declared no boundary hooks at all — the
    // overwhelming common case, and it keeps the hot transition path free of
    // set arithmetic.
    if (m._group_hooks.size === 0 && m._state_hooks.size === 0) {
        return;
    }
    if (m._boundary_depth >= m._boundary_depth_limit) {
        throw new JssmError(m, `boundary-hook action cascade exceeded depth limit (${m._boundary_depth_limit}) `
            + `crossing from ${JSON.stringify(prev_state)} to ${JSON.stringify(next_state)} `
            + `(possible infinite loop)`);
    }
    const prev_groups = (_a = m._state_to_groups.get(prev_state)) !== null && _a !== void 0 ? _a : empty_string_set;
    const next_groups = (_b = m._state_to_groups.get(next_state)) !== null && _b !== void 0 ? _b : empty_string_set;
    // The labels to dispatch, gathered before any firing so that re-entrant
    // transitions caused by an early action cannot perturb which boundaries the
    // *current* crossing fires.  Exits precede enters (statechart convention).
    const labels = [];
    // Exits: groups left (in prev but not next), then the plain prev state.
    for (const group of prev_groups) {
        if (next_groups.has(group)) {
            continue;
        }
        const label = (_c = m._group_hooks.get(group)) === null || _c === void 0 ? void 0 : _c.onExit;
        if (label !== undefined) {
            labels.push(label);
        }
    }
    const prev_state_exit = (_d = m._state_hooks.get(prev_state)) === null || _d === void 0 ? void 0 : _d.onExit;
    if (prev_state_exit !== undefined) {
        labels.push(prev_state_exit);
    }
    // Enters: groups entered (in next but not prev), then the plain next state.
    for (const group of next_groups) {
        if (prev_groups.has(group)) {
            continue;
        }
        const label = (_e = m._group_hooks.get(group)) === null || _e === void 0 ? void 0 : _e.onEnter;
        if (label !== undefined) {
            labels.push(label);
        }
    }
    const next_state_enter = (_f = m._state_hooks.get(next_state)) === null || _f === void 0 ? void 0 : _f.onEnter;
    if (next_state_enter !== undefined) {
        labels.push(next_state_enter);
    }
    if (labels.length === 0) {
        return;
    }
    // Each dispatched action re-enters transition_impl, which (on success) calls
    // back here for the boundary it just crossed.  The depth counter brackets
    // the whole fan-out so a self-perpetuating cascade is bounded, not infinite.
    m._boundary_depth += 1;
    try {
        for (const label of labels) {
            act(m, label); // safe no-op (returns false) if inapplicable here
        }
    }
    finally {
        m._boundary_depth -= 1;
    }
}
