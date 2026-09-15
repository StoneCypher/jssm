/*******
 *
 *  The timers family: the machine's single pending state timeout, which
 *  backs the FSL `after` clause (`a after 5s -> b;`) and can also be armed
 *  by hand.  Every function takes the machine as its first argument and
 *  reads the machine's `_timeout_*` / `_after_mapping` fields directly; the
 *  `Machine` class methods of the same names are one-line delegates onto
 *  these.
 *
 *  The three `DEFAULT_*_SOURCE` singletons are the machine constructor's
 *  fallbacks for the injectable `time_source` / `timeout_source` /
 *  `clear_timeout_source` config; they are exported for `machine.ts` and are
 *  not part of the barrel.
 *
 */
import { JssmError } from '../jssm_error.js';
import { fire } from './events.js';
// transition.ts imports clear_state_timeout / auto_set_state_timeout from this
// module, so this is an ESM cycle; it is safe because both sides only reach
// the other's bindings inside function bodies (the timer callback below, the
// commit tail of transition_impl), never at module evaluation.
import { go } from './transition.js';
/**
 *  Default time / timeout sources, hoisted to module scope so machines that
 *  don't override them (nearly all) share three singletons instead of
 *  allocating three fresh closures per construction.
 *  @internal
 */
export const DEFAULT_TIME_SOURCE = () => Date.now();
export const DEFAULT_TIMEOUT_SOURCE = (f, a) => {
    const handle = setTimeout(f, a);
    // In Node, setTimeout returns a Timeout with .unref(), so a pending `after`
    // timer does NOT by itself keep the process alive -- an abandoned machine can
    // be collected and the process can exit instead of hanging until the timer
    // fires go() on it.  The browser returns a plain number with no such method.
    // A consumer who wants the timer to hold the loop open can supply their own
    // timeout_source.  StoneCypher/fsl#1952
    const maybe_unref = handle;
    // The no-unref path is the browser's numeric handle; it can't be reached in
    // the node-only coverage environment, so the false branch is ignored here.
    /* v8 ignore next */
    if (typeof maybe_unref.unref === 'function') {
        maybe_unref.unref();
    }
    return handle;
};
export const DEFAULT_CLEAR_TIMEOUT_SOURCE = (h) => clearTimeout(h);
/**
 *  Schedule an automatic transition to `next_state` after `after_time`
 *  milliseconds.  Only one timeout may be active at a time.
 *
 *  @example
 *  import { sm, set_state_timeout, current_state_timeout, clear_state_timeout } from 'jssm';
 *
 *  const m = sm`a -> b;`;
 *  set_state_timeout(m, 'b', 1000);
 *  current_state_timeout(m);  // => ['b', 1000]
 *  clear_state_timeout(m);
 *
 *  @param m          - The machine to arm.
 *  @param next_state - The state to transition to when the timer fires.
 *  @param after_time - Delay in milliseconds.
 *  @throws JssmError If a timeout is already pending.
 *  @see clear_state_timeout
 *  @see current_state_timeout
 */
export function set_state_timeout(m, next_state, after_time) {
    if (m._timeout_handle !== undefined) {
        throw new JssmError(m, `Asked to set a state timeout to ${next_state}:${after_time}, but already timing out to ${m._timeout_target}:${m._timeout_target_time}`);
    }
    m._timeout_handle = m._timeout_source(
    // it seems like istanbul can't see this line being followed, even though it is, actively
    // this is enforced by the "after mapping runs normally with very short time" tests in after_mapping.spec
    // we'll mark it no-check so that our coverage numbers aren't wrecked
    /* istanbul ignore next */
    /* v8 ignore next 10 */
    () => {
        const from_state = m._state;
        clear_state_timeout(m);
        if (m._has_after_hooks) {
            const ah = m._after_hooks.get(from_state);
            if (ah !== undefined) {
                ah({ data: m._data, next_data: m._data });
            }
            // a specific after hook firing implies the any-after hook fires too,
            // afterward; and it also fires alone (StoneCypher/fsl#1299)
            if (m._after_any_hook !== undefined) {
                m._after_any_hook({ data: m._data, next_data: m._data });
            }
        }
        fire(m, 'timeout', { from: from_state, to: next_state, after_time });
        go(m, next_state);
    }, after_time);
    m._timeout_target = next_state;
    m._timeout_target_time = after_time;
}
/**
 *  Cancel any pending state timeout.  Safe to call when no timeout is active.
 *
 *  @example
 *  import { sm, set_state_timeout, current_state_timeout, clear_state_timeout } from 'jssm';
 *
 *  const m = sm`a -> b;`;
 *  set_state_timeout(m, 'b', 1000);
 *  clear_state_timeout(m);
 *  current_state_timeout(m);  // => undefined
 *
 *  @param m - The machine to disarm.
 *  @see set_state_timeout
 */
export function clear_state_timeout(m) {
    if (m._timeout_handle === undefined) {
        return; // calling with no timeout is a no-op, means it can be called glad-handedly
    }
    m._clear_timeout_source(m._timeout_handle);
    m._timeout_handle = undefined;
    m._timeout_target = undefined;
    m._timeout_target_time = undefined;
}
/**
 *  Get the configured `after` timeout for a given state, if any.
 *
 *  @example
 *  import { sm, state_timeout_for, clear_state_timeout } from 'jssm';
 *
 *  const m = sm`a after 5s -> b; b -> c;`;
 *  state_timeout_for(m, 'a');  // => ['b', 5000]
 *  state_timeout_for(m, 'b');  // => undefined
 *  clear_state_timeout(m);
 *
 *  @param m           - The machine to inspect.
 *  @param which_state - The state to look up.
 *  @returns A `[targetState, delayMs]` tuple, or `undefined` if no timeout
 *  is configured for that state.
 *  @see current_state_timeout
 */
export function state_timeout_for(m, which_state) {
    return m._after_mapping.get(which_state);
}
/**
 *  Get the pending state timeout, if any: the target of the timer that is
 *  currently armed, whether it came from an FSL `after` clause or from
 *  `set_state_timeout`.
 *
 *  @example
 *  import { sm, current_state_timeout, clear_state_timeout } from 'jssm';
 *
 *  const m = sm`a after 5s -> b;`;
 *  current_state_timeout(m);  // => ['b', 5000]
 *  clear_state_timeout(m);
 *  current_state_timeout(m);  // => undefined
 *
 *  @param m - The machine to inspect.
 *  @returns A `[targetState, delayMs]` tuple, or `undefined`.
 *  @see state_timeout_for
 */
export function current_state_timeout(m) {
    return (m._timeout_target === undefined)
        ? undefined
        : [m._timeout_target, m._timeout_target_time];
}
/**
 *  If the current state has an `after` timeout configured, schedule it.
 *  Called internally after each transition.
 *
 *  @example
 *  import { sm, auto_set_state_timeout, current_state_timeout, clear_state_timeout } from 'jssm';
 *
 *  const m = sm`a after 5s -> b;`;
 *  clear_state_timeout(m);
 *  current_state_timeout(m);  // => undefined
 *  auto_set_state_timeout(m);
 *  current_state_timeout(m);  // => ['b', 5000]
 *  clear_state_timeout(m);
 *
 *  @param m - The machine to arm.
 *  @throws JssmError If a timeout is already pending and the current state
 *  has an `after` mapping (see `set_state_timeout`).
 *  @see set_state_timeout
 */
export function auto_set_state_timeout(m) {
    // called on every successful transition-commit.  Machines with no `after`
    // clauses at all (the overwhelmingly common case) previously still paid a
    // string hash + map probe here per transition; one integer size read
    // short-circuits that.
    if (m._after_mapping.size === 0) {
        return;
    }
    const after_res = m._after_mapping.get(m._state);
    if (after_res !== undefined) {
        const [next_state, after_time] = after_res;
        set_state_timeout(m, next_state, after_time);
    }
}
