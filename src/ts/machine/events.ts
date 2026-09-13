
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

import type {
  JssmEventName, JssmEventDetailMap, JssmEventFilter, JssmEventHandler, JssmUnsubscribe
} from '../jssm_types.js';

import { JssmError } from '../jssm_error.js';





/**
 *  Internal record holding a single registered event subscription: the
 *  handler, its optional filter, and a flag for `once` semantics.  Exported
 *  only so the machine's `_event_handlers` field can name its element type.
 *  @internal
 */
export type JssmEventEntry<mDT, Ev extends JssmEventName> = {
  handler : JssmEventHandler<mDT, Ev>,
  filter? : JssmEventFilter<mDT, Ev>,
  once    : boolean
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
 *  ```typescript
 *  import { sm, on, transition } from 'jssm';
 *
 *  const m    = sm`a -> b -> c;`;
 *  const seen: string[] = [];
 *
 *  on(m, 'transition', e => { seen.push(`${e.from} -> ${e.to}`); });
 *  on(m, 'entry', { state: 'c' }, e => { seen.push(`entered ${e.state}`); });
 *
 *  const off = on(m, 'transition', () => { seen.push('never'); });
 *  off();  // unsubscribe
 *
 *  transition(m, 'b');
 *  transition(m, 'c');
 *  seen;  // => ['a -> b', 'b -> c', 'entered c']
 *  ```
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
export function on<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
export function on<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, filter: JssmEventFilter<mDT, Ev>, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
export function on<mDT, Ev extends JssmEventName>(
  m          : Machine<mDT>,
  name       : Ev,
  filterOrFn : JssmEventFilter<mDT, Ev> | JssmEventHandler<mDT, Ev>,
  maybeFn?   : JssmEventHandler<mDT, Ev>
): JssmUnsubscribe {
  return subscribe(m, name, filterOrFn, maybeFn, false);
}





/**
 *  Subscribe to a typed observation event for one matching delivery, then
 *  auto-remove.  Accepts the same `(m, name, handler)` and `(m, name, filter,
 *  handler)` shapes as {@link on}.
 *
 *  ```typescript
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
 *  ```
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
export function once<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
export function once<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, filter: JssmEventFilter<mDT, Ev>, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
export function once<mDT, Ev extends JssmEventName>(
  m          : Machine<mDT>,
  name       : Ev,
  filterOrFn : JssmEventFilter<mDT, Ev> | JssmEventHandler<mDT, Ev>,
  maybeFn?   : JssmEventHandler<mDT, Ev>
): JssmUnsubscribe {
  return subscribe(m, name, filterOrFn, maybeFn, true);
}





/**
 *  Remove a previously-registered event handler.  Match is by reference —
 *  the same function value passed to {@link on} or {@link once}.  Returns
 *  `true` if a subscription was found and removed, `false` otherwise.
 *
 *  ```typescript
 *  import { sm, on, off } from 'jssm';
 *
 *  const m  = sm`a -> b;`;
 *  const fn = (e: any) => console.log(e);
 *
 *  on(m, 'transition', fn);
 *  off(m, 'transition', fn);  // => true
 *  off(m, 'transition', fn);  // => false
 *  ```
 *  @param m       The machine the handler was registered on.
 *  @param name    The event name.
 *  @param handler The handler reference to remove.
 *  @returns `true` if removed, `false` if no match was registered.
 */
export function off<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, handler: JssmEventHandler<mDT, Ev>): boolean {
  const set = m._event_handlers.get(name);
  if (set === undefined) { return false; }
  for (const entry of set) {
    if (entry.handler === handler) {
      unsubscribe_entry(m, set, entry);
      return true;
    }
  }
  return false;
}





/**
 *  Remove one event-subscription entry from its set and keep the machine's
 *  `_event_listener_count` in sync.  The count is decremented only when the
 *  entry was actually present, so calling a stale unsubscribe closure (or
 *  removing an already-fired `once` entry) is idempotent and cannot drive
 *  the count negative.
 *  @param m     The machine that owns the set.
 *  @param set   The per-event-name subscription set.
 *  @param entry The entry to remove.
 *  @internal
 */
function unsubscribe_entry<mDT>(m: Machine<mDT>, set: Set<JssmEventEntry<any, any>>, entry: JssmEventEntry<any, any>): void {
  if (set.delete(entry)) { m._event_listener_count--; }
}





/**
 *  Shared registration core used by {@link on} and {@link once}.  Normalizes
 *  the optional filter argument and installs the entry into the per-event
 *  subscription set.
 *  @internal
 */
function subscribe<mDT, Ev extends JssmEventName>(
  m          : Machine<mDT>,
  name       : Ev,
  filterOrFn : JssmEventFilter<mDT, Ev> | JssmEventHandler<mDT, Ev>,
  maybeFn    : JssmEventHandler<mDT, Ev> | undefined,
  once       : boolean
): JssmUnsubscribe {

  let filter: JssmEventFilter<mDT, Ev> | undefined;
  let handler: JssmEventHandler<mDT, Ev>;

  if (typeof filterOrFn === 'function') {
    filter  = undefined;
    handler = filterOrFn;
  } else {
    filter  = filterOrFn;
    handler = maybeFn;
  }

  if (typeof handler !== 'function') {
    throw new JssmError(m, `event handler for "${name}" must be a function`);
  }

  let set = m._event_handlers.get(name);
  if (set === undefined) {
    set = new Set();
    m._event_handlers.set(name, set);
  }

  const entry: JssmEventEntry<mDT, Ev> = { handler, filter, once };
  set.add(entry);
  m._event_listener_count++;

  return () => { unsubscribe_entry(m, set, entry); };
}





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
// PERF: the class keeps `_fire_one`, `_fire`, and `_has_subscribers` as
// underscore-convention delegates, NOT `#`-private methods: they sit on the
// per-transition hot path and a `#`-private method cannot be inlined the way
// its `_` twin can (brand check).  Do not re-privatize.  StoneCypher/fsl#1959
export function fire_one<mDT, Ev extends JssmEventName>(
  m      : Machine<mDT>,
  entry  : JssmEventEntry<mDT, Ev>,
  set    : Set<JssmEventEntry<any, any>>,
  name   : Ev,
  detail : JssmEventDetailMap<mDT>[Ev]
): void {

  // filter check
  if (entry.filter !== undefined) {
    for (const [k, v] of Object.entries(entry.filter)) {
      if (v !== (detail as any)[k]) { return; }
    }
  }

  // once removal happens BEFORE invocation so a throwing handler still
  // gets removed and so re-entrant `on` calls during the handler see
  // the post-removal state.
  if (entry.once) { unsubscribe_entry(m, set, entry); }

  try {
    entry.handler(detail);
  } catch (error) {
    if (name === 'error' || m._firing_error) {
      // surface to stderr as a last resort but never recurse;
      // `console` is in the JS standard library and present in every
      // supported runtime, so guarding it would just add an untestable
      // branch.  See #638.
      console.error(error);
    } else {
      m._firing_error = true;
      try {
        fire(m, 'error', {
          error         : error,
          source_event  : name,
          source_detail : detail,
          handler       : entry.handler
        });
      } finally {
        m._firing_error = false;
      }
    }
  }
}





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
 *  ```typescript
 *  import { sm } from 'jssm';
 *  import { on, has_subscribers } from './events';
 *
 *  const machine = sm`a -> b;`;
 *  on(machine, 'transition', () => {});
 *  has_subscribers(machine, 'transition');  // => true
 *  has_subscribers(machine, 'exit');        // => false
 *  ```
 *  @see fire
 *  @internal
 */
export function has_subscribers<mDT>(m: Machine<mDT>, name: JssmEventName): boolean {
  const set = m._event_handlers.get(name);
  return (set !== undefined) && (set.size > 0);
}





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
export function fire<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, detail: JssmEventDetailMap<mDT>[Ev]): void {

  const set = m._event_handlers.get(name);
  if (set === undefined || set.size === 0) { return; }

  // Fast-path: single subscriber — capture entry before invoking so that
  // even if the handler mutates `set` (via off/once auto-removal) we hold a
  // stable reference.  Behaviorally identical to a 1-element snapshot.
  if (set.size === 1) {
    const only = set.values().next().value as JssmEventEntry<mDT, Ev>;
    fire_one(m, only, set, name, detail);
    return;
  }

  // General path: snapshot so handlers can `off()` mid-loop without
  // disturbing iteration.
  const entries = [...set];
  for (const entry of entries) {
    fire_one(m, entry, set, name, detail);
  }
}
