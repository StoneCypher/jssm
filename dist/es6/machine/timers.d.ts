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
import type { Machine } from './machine.js';
type StateType = string;
/**
 *  Default time / timeout sources, hoisted to module scope so machines that
 *  don't override them (nearly all) share three singletons instead of
 *  allocating three fresh closures per construction.
 *  @internal
 */
export declare const DEFAULT_TIME_SOURCE: () => number;
export declare const DEFAULT_TIMEOUT_SOURCE: (f: () => void, a: number) => number;
export declare const DEFAULT_CLEAR_TIMEOUT_SOURCE: (h: number) => void;
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
export declare function set_state_timeout<mDT>(m: Machine<mDT>, next_state: StateType, after_time: number): void;
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
export declare function clear_state_timeout<mDT>(m: Machine<mDT>): void;
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
export declare function state_timeout_for<mDT>(m: Machine<mDT>, which_state: StateType): [StateType, number] | undefined;
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
export declare function current_state_timeout<mDT>(m: Machine<mDT>): [StateType, number] | undefined;
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
export declare function auto_set_state_timeout<mDT>(m: Machine<mDT>): void;
export {};
