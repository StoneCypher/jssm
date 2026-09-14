/*******
 *
 *  The events family: subscribing to, and dispatching, the machine's typed
 *  observation events (`transition`, `entry`, `exit`, `rejection`, `timeout`,
 *  `error`, ...).  Every function takes the machine as its first argument and
 *  works on the machine's `_event_handlers` table directly; the `Machine`
 *  class methods of the same names are one-line delegates onto these.
 *
 *  `on`, `once`, and `off` are the public surface (re-exported by the `jssm`
 *  barrel).  `fire`, `fire_one`, and `has_subscribers` are the dispatch side,
 *  exported for the other families (the transition commit, the timers) but
 *  not part of the barrel.
 *
 */
import type { Machine } from './machine.js';
import type { JssmEventName, JssmEventDetailMap, JssmEventFilter, JssmEventHandler, JssmUnsubscribe } from '../jssm_types.js';
/**
 *  Internal record holding a single registered event subscription: the
 *  handler, its optional filter, and a flag for `once` semantics.  Exported
 *  only so the machine's `_event_handlers` field can name its element type.
 *  @internal
 */
export type JssmEventEntry<mDT, Ev extends JssmEventName> = {
    handler: JssmEventHandler<mDT, Ev>;
    filter?: JssmEventFilter<mDT, Ev>;
    once: boolean;
};
/**
 *  Subscribe to a typed observation event.  Hooks (`set_hook` and friends)
 *  intercept and may cancel a transition; events fire alongside the same
 *  state-machine moments but cannot influence the outcome.  This is the
 *  surface most users actually want for "tell me when state changes".
 *
 *  Handlers run synchronously, in registration order.  A throwing handler
 *  does not block subsequent handlers — its exception is caught and
 *  re-emitted as an `error` event whose detail names the original event
 *  and the offending handler.
 *
 *  @example
 *  import { sm, on, transition } from 'jssm';
 *
 *  const m    = sm`a -> b -> c;`;
 *  const seen: string[] = [];
 *
 *  on(m, 'transition', e => { seen.push(`${e.from} -> ${e.to}`); });
 *  on(m, 'entry', { state: 'c' }, e => { seen.push(`entered ${e.state}`); });
 *
 *  const unsubscribe = on(m, 'transition', () => { seen.push('never'); });
 *  unsubscribe();
 *
 *  transition(m, 'b');
 *  transition(m, 'c');
 *  seen;  // => ['a -> b', 'b -> c', 'entered c']
 *
 *  @template Ev      The event name (drives the detail type).
 *  @param m           The machine to subscribe on.
 *  @param name        The event name to subscribe to.
 *  @param handler     The handler invoked on each matching delivery.  The
 *                     four-argument `(m, name, filter, handler)` form inserts
 *                     a filter object before the handler (see the example
 *                     above).
 *  @returns A function that unsubscribes when called.
 *  @see off
 *  @see once
 */
export declare function on<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
export declare function on<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, filter: JssmEventFilter<mDT, Ev>, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
/**
 *  Subscribe to a typed observation event for one matching delivery, then
 *  auto-remove.  Accepts the same `(m, name, handler)` and `(m, name, filter,
 *  handler)` shapes as {@link on}.
 *
 *  @example
 *  import { sm, once, transition } from 'jssm';
 *
 *  const m = sm`a -> b -> c;`;
 *  let count = 0;
 *
 *  once(m, 'transition', () => { count += 1; });
 *
 *  transition(m, 'b');
 *  transition(m, 'c');
 *  count;  // => 1
 *
 *  @template Ev      The event name.
 *  @param m           The machine to subscribe on.
 *  @param name        The event name.
 *  @param handler     The handler invoked on the first matching delivery.  The
 *                     four-argument `(m, name, filter, handler)` form inserts
 *                     a filter object before the handler (same shapes as `on`).
 *  @returns A function that unsubscribes early if called before the
 *           handler has fired.
 *  @see on
 *  @see off
 */
export declare function once<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
export declare function once<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, filter: JssmEventFilter<mDT, Ev>, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
/**
 *  Remove a previously-registered event handler.  Match is by reference —
 *  the same function value passed to {@link on} or {@link once}.  Returns
 *  `true` if a subscription was found and removed, `false` otherwise.
 *
 *  @example
 *  import { sm, on, off } from 'jssm';
 *
 *  const m  = sm`a -> b;`;
 *  const fn = () => {};
 *
 *  on(m, 'transition', fn);
 *  off(m, 'transition', fn);  // => true
 *  off(m, 'transition', fn);  // => false
 *
 *  @param m       The machine the handler was registered on.
 *  @param name    The event name.
 *  @param handler The handler reference to remove.
 *  @returns `true` if removed, `false` if no match was registered.
 */
export declare function off<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, handler: JssmEventHandler<mDT, Ev>): boolean;
/**
 *  Invoke a single event-handler entry, respecting its filter, once-removal
 *  semantics, and the error re-fire / recursion-guard logic.  Extracted so
 *  {@link fire} can share identical behavior between the size-1 fast-path
 *  and the general snapshotted loop.
 *  @param m      - The machine dispatching the event.
 *  @param entry  - The subscriber descriptor to invoke.
 *  @param set    - The live Set that owns `entry`; needed for once-removal.
 *  @param name   - The event name being dispatched (used in error re-fires).
 *  @param detail - The event payload forwarded to the handler.
 *  @internal
 */
export declare function fire_one<mDT, Ev extends JssmEventName>(m: Machine<mDT>, entry: JssmEventEntry<mDT, Ev>, set: Set<JssmEventEntry<any, any>>, name: Ev, detail: JssmEventDetailMap<mDT>[Ev]): void;
/**
 *  Whether at least one live subscriber is registered for `name`.  Used by
 *  the transition-commit observation block to skip building a detail
 *  literal that {@link fire} would immediately discard — a panel listening
 *  only to `'transition'` (fsl-bind, fsl-viz, fsl-info-panel) previously
 *  paid for the exit/entry/data-change detail allocations on every
 *  transition.  Read at fire time, so a listener installed by a pre-hook is
 *  still seen (#671).
 *  @param m    The machine to probe.
 *  @param name The event name to probe.
 *  @returns `true` when a subsequent `fire(m, name, ...)` would reach at
 *  least one handler.
 *
 *  Not a doctest: `has_subscribers` is module-only and cannot be imported from `'jssm'`.
 *  ```typescript
 *  import { sm, on } from 'jssm';
 *  import { has_subscribers } from './events';   // same-package import; not on the barrel
 *
 *  const machine = sm`a -> b;`;
 *  on(machine, 'transition', () => {});
 *  has_subscribers(machine, 'transition');  // => true
 *  has_subscribers(machine, 'exit');        // => false
 *  ```
 *  @see fire
 *  @internal
 */
export declare function has_subscribers<mDT>(m: Machine<mDT>, name: JssmEventName): boolean;
/**
 *  Dispatch an event to every registered subscriber in registration
 *  order.  Filters are checked first; non-matching handlers are skipped
 *  without invoking the handler.  Exceptions thrown by a handler are
 *  caught and re-emitted as an `error` event so subsequent handlers
 *  still run.
 *
 *  Re-entry into the `error` event itself is guarded — if an `error`
 *  handler throws, the new exception is swallowed rather than rebroadcast
 *  to avoid an infinite loop.
 *
 *  When exactly one subscriber is registered the common case avoids the
 *  `Array.from(set)` snapshot allocation by capturing the lone entry into a
 *  local first — equivalent to a 1-element snapshot but allocation-free.
 *  The general path still snapshots for re-entrancy safety.
 *  @param m      The machine dispatching the event.
 *  @param name   The event name.
 *  @param detail The event payload handed to each handler.
 *  @internal
 */
export declare function fire<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, detail: JssmEventDetailMap<mDT>[Ev]): void;
