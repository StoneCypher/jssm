/*******
 *
 *  The hooks family: registering, removing, and introspecting the machine's
 *  transition hooks, plus the step helpers the transition commit path uses
 *  to run them.  Every function takes the machine as its first argument and
 *  reads the machine's hook tables and `_has_*` fast-path flags directly; the
 *  `Machine` class methods of the same names are one-line delegates onto
 *  these.
 *
 *  `set_hook`, `remove_hook`, the 26 `hook_*` / `post_hook_*` wrappers, and
 *  the registry accessors (`hook_registry`, `hooks_on`, `has_hook`,
 *  `state_has_hooks`) are the public surface, re-exported by the `jssm`
 *  barrel together with the `is_hook_*` predicates and the two
 *  `abstract_*_hook_step` adapters.  `update_hook_fields`, `HOOK_PASSED`,
 *  `HOOK_REJECTED`, `hook_required_fields`, and `hook_spatial_fields` are
 *  exported for the other families (the transition commit path) and are not
 *  part of the barrel.
 *
 */
import type { Machine } from './machine.js';
import type { HookDescription, HookHandler, HookContext, HookResult, HookComplexResult, EverythingHookContext, EverythingHookHandler, PostEverythingHookHandler, HookPhase, HookRegistryEntry, HookQuery } from '../jssm_types.js';
type StateType = string;
export declare const hook_required_fields: Record<HookDescription<unknown>['kind'], ReadonlyArray<'from' | 'to' | 'action'>>;
export declare const hook_spatial_fields: readonly ["from", "to", "action"];
/**
 * Low-level hook registration.  Installs a handler described by a
 *  {@link HookDescription} into the appropriate internal map.  Prefer the
 *  convenience wrappers ({@link hook}, {@link hook_entry}, etc.) over
 *  calling this directly.
 *
 *  @example
 *  import { sm, set_hook, transition } from 'jssm';
 *
 *  const m = sm`a -> b;`;
 *  set_hook(m, { kind: 'hook', from: 'a', to: 'b', handler: () => false });
 *  // the hook vetoed it:
 *  transition(m, 'b');   // => false
 *
 *  @param m        - The machine to register the hook on.
 *  @param HookDesc - A hook descriptor specifying kind, states, and handler.
 *  @throws JssmError if the descriptor is mis-shaped (unknown kind, missing
 *          handler, missing or extraneous spatial field).
 *  @see remove_hook
 */
export declare function set_hook<mDT>(m: Machine<mDT>, HookDesc: HookDescription<mDT>): void;
/**
 *  Remove a previously-registered hook described by a
 *  {@link HookDescription}.  Match is by `kind` + identifying keys
 *  (`from`/`to`/`action`/etc.), not by handler reference — there is one
 *  hook per slot in the registry, so the description uniquely identifies
 *  which one to clear.  Fires a `hook-removal` event for inspector tools.
 *
 *  This is the symmetric counterpart of {@link set_hook} for the
 *  event-bridging use case (#638).  Reasoning about hooks via observation
 *  events requires being able to observe their disappearance too.
 *
 *  @example
 *  import { sm, set_hook, remove_hook } from 'jssm';
 *
 *  const m = sm`a -> b;`;
 *  const fn = () => true;
 *  set_hook(m, { kind: 'hook', from: 'a', to: 'b', handler: fn });
 *  remove_hook(m, { kind: 'hook', from: 'a', to: 'b', handler: fn });   // => true
 *  remove_hook(m, { kind: 'hook', from: 'a', to: 'b', handler: fn });   // => false
 *
 *  @param m        - The machine to remove the hook from.
 *  @param HookDesc - A hook descriptor identifying the hook to remove.
 *  @returns `true` if a hook was removed, `false` otherwise.
 *  @throws JssmError if the descriptor's kind is unknown.
 *  @see set_hook
 */
export declare function remove_hook<mDT>(m: Machine<mDT>, HookDesc: HookDescription<mDT>): boolean;
/**
 * Register a pre-transition hook on a specific edge.  Fires before
 *  transitioning from `from` to `to`.  If the handler returns `false`, the
 *  transition is blocked.
 *
 *  @example
 *  import { sm, hook, transition } from 'jssm';
 *
 *  const m = sm`a -> b -> c;`;
 *  const seen: string[] = [];
 *  hook(m, 'a', 'b', () => { seen.push('a->b'); });
 *  transition(m, 'b');   // => true
 *  seen;                 // => ['a->b']
 *
 *  @param m       - The machine to register the hook on.
 *  @param from    - Source state name.
 *  @param to      - Target state name.
 *  @param handler - Callback invoked before the transition.
 *  @returns The machine, for chaining.
 *  @see set_hook
 *  @see post_hook
 */
export declare function hook<mDT>(m: Machine<mDT>, from: string, to: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook on a specific action-labeled edge.
 *  @param m       - The machine to register the hook on.
 *  @param from    - Source state name.
 *  @param to      - Target state name.
 *  @param action  - The action label that triggers this hook.
 *  @param handler - Callback invoked before the transition.
 *  @returns The machine, for chaining.
 */
export declare function hook_action<mDT>(m: Machine<mDT>, from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook on any edge triggered by a specific action.
 *  @param m       - The machine to register the hook on.
 *  @param action  - The action name to hook.
 *  @param handler - Callback invoked before any transition with this action.
 *  @returns The machine, for chaining.
 */
export declare function hook_global_action<mDT>(m: Machine<mDT>, action: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook on any action-driven transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before any action transition.
 *  @returns The machine, for chaining.
 */
export declare function hook_any_action<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook on any standard (`->`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before any legal transition.
 *  @returns The machine, for chaining.
 */
export declare function hook_standard_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook on any main-path (`=>`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before any main transition.
 *  @returns The machine, for chaining.
 */
export declare function hook_main_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook on any forced (`~>`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before any forced transition.
 *  @returns The machine, for chaining.
 */
export declare function hook_forced_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook on any transition regardless of kind.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before every transition.
 *  @returns The machine, for chaining.
 */
export declare function hook_any_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a hook that fires when entering a specific state.
 *  @param m       - The machine to register the hook on.
 *  @param to      - The state being entered.
 *  @param handler - Callback invoked on entry.
 *  @returns The machine, for chaining.
 */
export declare function hook_entry<mDT>(m: Machine<mDT>, to: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a hook that fires when leaving a specific state.
 *  @param m       - The machine to register the hook on.
 *  @param from    - The state being exited.
 *  @param handler - Callback invoked on exit.
 *  @returns The machine, for chaining.
 */
export declare function hook_exit<mDT>(m: Machine<mDT>, from: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a hook that fires when a state's `after` timer elapses — the
 *  delay-over companion to `a after 5s -> b;` style time transitions.  It
 *  does NOT fire when the state is entered or left by ordinary dispatch;
 *  use {@link hook_entry} / {@link hook_exit} for those.  (Versions through
 *  5.143.28 also spuriously fired it on entering the state, the jssm side
 *  of StoneCypher/fsl#1327.)
 *  @param m       - The machine to register the hook on.
 *  @param from    - The state whose `after` timer is being watched.
 *  @param handler - Callback invoked when the timer fires, just before the
 *                   timed transition is taken; informational — its outcome
 *                   cannot reject the transition.
 *  @returns The machine, for chaining.
 *  @example
 *    import { sm, hook_after, go, clear_state_timeout } from 'jssm';
 *    const m = sm`a after 1000 -> b; a -> c; c -> a;`;
 *    let calls = 0;
 *    hook_after(m, 'a', () => { calls += 1; });
 *    go(m, 'c');
 *    go(m, 'a');
 *    // ordinary dispatch never fires it; only the timer elapsing does:
 *    calls;  // => 0
 *    clear_state_timeout(m);
 *  @see hook_entry
 *  @see hook_exit
 *  @see set_state_timeout
 */
export declare function hook_after<mDT>(m: Machine<mDT>, from: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a hook that fires when ANY state's `after` timer elapses — the
 *  whole-machine companion to {@link hook_after}, mirroring how
 *  {@link hook_any_transition} companions {@link hook}.  When the elapsing
 *  state also has a specific {@link hook_after}, the specific hook fires
 *  first and this one fires second; a specific after hook firing always
 *  implies the any-after hook fires too (StoneCypher/fsl#1299).  Like
 *  `hook_after` it is informational — its outcome cannot reject the timed
 *  transition — and it does NOT fire on ordinary dispatch.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked whenever any `after` timer fires, just
 *                   before the timed transition is taken.
 *  @returns The machine, for chaining.
 *  @example
 *    import { sm, hook_after_any, go, clear_state_timeout } from 'jssm';
 *    const m = sm`a after 1000 -> b; a -> c; c -> a;`;
 *    let calls = 0;
 *    hook_after_any(m, () => { calls += 1; });
 *    go(m, 'c');
 *    go(m, 'a');
 *    // ordinary dispatch never fires it; only a timer elapsing does:
 *    calls;  // => 0
 *    clear_state_timeout(m);
 *  @see hook_after
 *  @see hook_any_transition
 *  @see set_state_timeout
 */
export declare function hook_after_any<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook on a specific edge.  Fires after the transition
 *  from `from` to `to` has completed.  Cannot block the transition.
 *  @param m       - The machine to register the hook on.
 *  @param from    - Source state name.
 *  @param to      - Target state name.
 *  @param handler - Callback invoked after the transition.
 *  @returns The machine, for chaining.
 */
export declare function post_hook<mDT>(m: Machine<mDT>, from: string, to: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook on a specific action-labeled edge.
 *  @param m       - The machine to register the hook on.
 *  @param from    - Source state name.
 *  @param to      - Target state name.
 *  @param action  - The action label.
 *  @param handler - Callback invoked after the transition.
 *  @returns The machine, for chaining.
 */
export declare function post_hook_action<mDT>(m: Machine<mDT>, from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook on any edge triggered by a specific action.
 *  @param m       - The machine to register the hook on.
 *  @param action  - The action name.
 *  @param handler - Callback invoked after any transition with this action.
 *  @returns The machine, for chaining.
 */
export declare function post_hook_global_action<mDT>(m: Machine<mDT>, action: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook on any action-driven transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after any action transition.
 *  @returns The machine, for chaining.
 */
export declare function post_hook_any_action<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook on any standard (`->`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after any legal transition.
 *  @returns The machine, for chaining.
 */
export declare function post_hook_standard_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook on any main-path (`=>`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after any main transition.
 *  @returns The machine, for chaining.
 */
export declare function post_hook_main_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook on any forced (`~>`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after any forced transition.
 *  @returns The machine, for chaining.
 */
export declare function post_hook_forced_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook on any transition regardless of kind.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after every transition.
 *  @returns The machine, for chaining.
 */
export declare function post_hook_any_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook that fires after entering a specific state.
 *  @param m       - The machine to register the hook on.
 *  @param to      - The state that was entered.
 *  @param handler - Callback invoked after entry.
 *  @returns The machine, for chaining.
 */
export declare function post_hook_entry<mDT>(m: Machine<mDT>, to: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook that fires after leaving a specific state.
 *  @param m       - The machine to register the hook on.
 *  @param from    - The state that was exited.
 *  @param handler - Callback invoked after exit.
 *  @returns The machine, for chaining.
 */
export declare function post_hook_exit<mDT>(m: Machine<mDT>, from: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook that fires **before** all other pre-hooks
 *  on every transition.  If the handler returns `false`, the transition is
 *  blocked.  The handler receives an {@link EverythingHookContext} whose
 *  `hook_name` is `'pre everything'`.
 *
 *  @example
 *  import { sm, hook_pre_everything, transition } from 'jssm';
 *
 *  const m = sm`a -> b -> c;`;
 *  const fired: string[] = [];
 *  hook_pre_everything(m, ({ hook_name }) => {
 *    fired.push(hook_name);
 *    return true;
 *  });
 *  transition(m, 'b');   // => true
 *  fired;                // => ['pre everything']
 *
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before all other pre-hooks.
 *  @returns The machine, for chaining.
 */
export declare function hook_pre_everything<mDT>(m: Machine<mDT>, handler: EverythingHookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook that fires **after** all other pre-hooks
 *  on every transition.  If the handler returns `false`, the transition is
 *  blocked.  The handler receives an {@link EverythingHookContext} whose
 *  `hook_name` is `'everything'`.
 *
 *  @example
 *  import { sm, hook_everything, transition } from 'jssm';
 *
 *  const m = sm`a -> b -> c;`;
 *  const fired: string[] = [];
 *  hook_everything(m, ({ hook_name }) => {
 *    fired.push(hook_name);
 *    return true;
 *  });
 *  transition(m, 'b');   // => true
 *  fired;                // => ['everything']
 *
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after all other pre-hooks.
 *  @returns The machine, for chaining.
 */
export declare function hook_everything<mDT>(m: Machine<mDT>, handler: EverythingHookHandler<mDT>): Machine<mDT>;
/**
 * Register a post-transition hook that fires **after** all other
 *  post-hooks on every transition.  Cannot block the transition.  The
 *  handler receives an {@link EverythingHookContext} whose `hook_name` is
 *  `'post everything'`.
 *
 *  @example
 *  import { sm, hook_post_everything, transition } from 'jssm';
 *
 *  const m = sm`a -> b -> c;`;
 *  const fired: string[] = [];
 *  hook_post_everything(m, ({ hook_name }) => {
 *    fired.push(hook_name);
 *  });
 *  transition(m, 'b');   // => true
 *  fired;                // => ['post everything']
 *
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after all other post-hooks.
 *  @returns The machine, for chaining.
 */
export declare function hook_post_everything<mDT>(m: Machine<mDT>, handler: PostEverythingHookHandler<mDT>): Machine<mDT>;
/**
 * Register a post-transition hook that fires **before** all other
 *  post-hooks on every transition.  Cannot block the transition.  The
 *  handler receives an {@link EverythingHookContext} whose `hook_name` is
 *  `'pre post everything'`.
 *
 *  @example
 *  import { sm, hook_pre_post_everything, transition } from 'jssm';
 *
 *  const m = sm`a -> b -> c;`;
 *  const fired: string[] = [];
 *  hook_pre_post_everything(m, ({ hook_name }) => {
 *    fired.push(hook_name);
 *  });
 *  transition(m, 'b');   // => true
 *  fired;                // => ['pre post everything']
 *
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before all other post-hooks.
 *  @returns The machine, for chaining.
 */
export declare function hook_pre_post_everything<mDT>(m: Machine<mDT>, handler: PostEverythingHookHandler<mDT>): Machine<mDT>;
/********
 *
 *  Generate the uniform observational-hook registry — every currently
 *  registered hook projected onto a normalized `(kind, target, phase)` row
 *  (megaspec §12, → #1357).  The registry is *generated* on demand by
 *  walking the concrete per-kind storage tables rather than maintained as a
 *  second copy, so it can never drift from the tables {@link set_hook}
 *  actually dispatches into.  It is the single source of truth behind the
 *  introspection accessors ({@link has_hook}, {@link hooks_on})
 *  and the `hooked_state` viz styling.
 *
 *  Targets are normalized: edge hooks become `{ scope: 'edge', from, to }`
 *  (named hooks add `action`), entry/exit/after become `{ scope: 'state' }`,
 *  global-action hooks become `{ scope: 'action' }`, and the `any-*`,
 *  transition-class, and `everything` observers become `{ scope: 'global' }`.
 *
 *  @example
 *  import { sm, hook_entry, hook_registry } from 'jssm';
 *
 *  const m = sm`a 'go' -> b;`;
 *  hook_entry(m, 'b', () => true);
 *  hook_registry(m);   // => [ { kind: 'entry', phase: 'pre', target: { scope: 'state', state: 'b' } } ]
 *
 *  @param m The machine to inspect.
 *
 *  @returns Every registered hook as a {@link HookRegistryEntry}, in a stable
 *  table-walk order (pre-phase tables first, then post-phase).
 *
 */
export declare function hook_registry<mDT>(m: Machine<mDT>): HookRegistryEntry[];
/********
 *
 *  Return every registry entry observing the given target (megaspec §12).
 *  The `query` selects the target shape:
 *
 *  - a bare **state name** matches entry/exit/after hooks on that state, its
 *    state-boundary hooks, and every edge hook touching it (`from` or `to`),
 *  - a `{ from, to, action? }` **edge** matches edge hooks on that
 *    transition (optionally narrowed to the named action),
 *  - a `{ action }` **action** matches global-action and named-edge hooks
 *    carrying that action,
 *  - a `{ group }` **group** matches that group's boundary hooks (group hooks
 *    are matched by name only and do not propagate to member states).
 *
 *  @example
 *  import { sm, hook_entry, hooks_on } from 'jssm';
 *
 *  const m = sm`a 'go' -> b;`;
 *  hook_entry(m, 'b', () => true);
 *  hooks_on(m, 'b').length;             // => 1
 *  // no edge hook is registered:
 *  hooks_on(m, { from: 'a', to: 'b' }); // => []
 *
 *  @param m     The machine to inspect.
 *  @param query The {@link HookQuery} naming the target to inspect.
 *  @returns The matching {@link HookRegistryEntry} rows (possibly empty).
 *
 */
export declare function hooks_on<mDT>(m: Machine<mDT>, query: HookQuery): HookRegistryEntry[];
/********
 *
 *  Is at least one observational hook bound to the given target (megaspec
 *  §12)?  The `query` is read exactly as in {@link hooks_on}.  An
 *  optional `phase` narrows the test to pre- or post-transition hooks only;
 *  omitted, either phase satisfies it.
 *
 *  @example
 *  import { sm, hook_entry, has_hook } from 'jssm';
 *
 *  const m = sm`a -> b;`;
 *  has_hook(m, 'b');                 // => false
 *  hook_entry(m, 'b', () => true);
 *  has_hook(m, 'b');                 // => true
 *  // the entry hook is pre-phase:
 *  has_hook(m, 'b', 'post');         // => false
 *
 *  @param m     The machine to inspect.
 *  @param query The {@link HookQuery} naming the target to inspect.
 *  @param phase Optional {@link HookPhase} to restrict the test to.
 *  @returns `true` when a matching hook exists.
 *
 */
export declare function has_hook<mDT>(m: Machine<mDT>, query: HookQuery, phase?: HookPhase): boolean;
/********
 *
 *  Does the given state carry any observational hook — i.e. should it receive
 *  the `hooked_state` viz styling?  True when an entry/exit/after hook is
 *  bound to the state, any edge hook touches it, or the state has its own
 *  boundary hook.  Group-boundary hooks do *not* count here — they are
 *  matched by group only and never propagate to member states.  Powers the
 *  `hooked` styling layer in `resolve_state_config`; replaces
 *  the long-stubbed `has_hooks` placeholder (megaspec §12).
 *
 *  @example
 *  import { sm, hook_exit, state_has_hooks } from 'jssm';
 *
 *  const m = sm`a -> b;`;
 *  state_has_hooks(m, 'a');          // => false
 *  hook_exit(m, 'a', () => true);
 *  state_has_hooks(m, 'a');          // => true
 *
 *  @param m     The machine to inspect.
 *  @param state The state to test.
 *  @returns `true` when the state is observed by at least one hook.
 *
 */
export declare function state_has_hooks<mDT>(m: Machine<mDT>, state: StateType): boolean;
/**
 *
 *  Type guard that narrows an unknown value to a {@link HookComplexResult}.
 *
 *  A hook complex result is an object with at minimum a boolean `pass` field,
 *  and may optionally also carry replacement `data` / `next_data` fields that
 *  the machine should adopt if the hook passes.  This helper is used by the
 *  hook-dispatch machinery to tell "hook returned a complex object" from
 *  "hook returned a bare boolean / null / undefined".
 *
 *  @example
 *  import { is_hook_complex_result } from 'jssm';
 *
 *  is_hook_complex_result({ pass: true });                 // => true
 *  is_hook_complex_result({ pass: false, data: { x: 1 }}); // => true
 *  is_hook_complex_result(true);                           // => false
 *  is_hook_complex_result(null);                           // => false
 *  is_hook_complex_result({ other: 'thing' });             // => false
 *
 *  @template mDT The type of the machine data member; usually omitted.
 *  @param hr The value to test.
 *  @returns `true` if `hr` is a non-null object with a boolean `pass` field;
 *  `false` otherwise.  When `true`, TypeScript narrows `hr` to
 *  `HookComplexResult<mDT>`.
 */
export declare function is_hook_complex_result<mDT>(hr: unknown): hr is HookComplexResult<mDT>;
/**
 *
 *  Apply any data-field updates from a hook's complex result into `hook_args`,
 *  and return whether data actually changed.
 *
 *  This is the hoisted, allocation-free replacement for the `update_fields`
 *  inner function that used to be re-created on every hooked transition inside
 *  `transition_impl`.  By moving it to module scope the function
 *  object is allocated once at module load time.
 *
 *  When the result does not carry a `data` property (the common case —
 *  most hooks return `true` or `undefined`) the function returns `false`
 *  immediately without touching `hook_args`.
 *
 *  Not a doctest: `update_hook_fields` is module-only and cannot be imported from `'jssm'`.
 *  ```typescript
 *  const args = { data: 'old', next_data: undefined, ... };
 *  const changed = update_hook_fields(args, { pass: true, data: 'new', next_data: undefined });
 *  // changed === true, args.data === 'new'
 *  ```
 *  @param hook_args  The shared hook-argument object for the current
 *    transition.  Mutated in-place when the result carries `data`.
 *  @param res        The normalised complex result returned by
 *    {@link abstract_hook_step} or {@link abstract_everything_hook_step}.
 *  @returns `true` if `res` contained a `data` property (i.e. the hook
 *    mutated the machine's data); `false` otherwise.
 *  @see abstract_hook_step
 *  @internal
 */
export declare function update_hook_fields<mDT>(hook_args: HookContext<mDT>, res: HookComplexResult<mDT>): boolean;
/**
 *
 *  Normalize any legal hook return value to a single "did it reject?" boolean.
 *
 *  Hooks in jssm may return any of the following to indicate success:
 *  `true`, `undefined`, or a complex result whose `pass` field is `true`.
 *  They may return any of the following to indicate rejection:
 *  `false`, or a complex result whose `pass` field is `false`.  This helper
 *  collapses all of those shapes into one boolean so callers don't have to
 *  re-implement the matrix.
 *
 *  @example
 *  import { is_hook_rejection } from 'jssm';
 *
 *  // passes:
 *  is_hook_rejection(true);            // => false
 *  is_hook_rejection(undefined);       // => false
 *  is_hook_rejection({ pass: true });  // => false
 *  // rejections:
 *  is_hook_rejection(false);           // => true
 *  is_hook_rejection({ pass: false }); // => true
 *
 *  @template mDT The type of the machine data member; usually omitted.
 *  @param hr A hook result of any legal shape.
 *  @returns `true` if the hook rejected the transition; `false` if it passed.
 *  @throws {TypeError} If `hr` is not a recognized hook result shape (for
 *  example, a number or a plain object without a `pass` field).
 */
export declare function is_hook_rejection<mDT>(hr: HookResult<mDT>): boolean;
/**
 *
 *  Shared, frozen outcomes for the simple hook results.  The transition
 *  cascade runs up to ~10 hook steps per transition, and the overwhelmingly
 *  common results — no hook installed, or a hook returning `undefined` /
 *  `true` / `false` — previously allocated a fresh one-field object each
 *  time, just to have `.pass` read once and be discarded.  Callers only read
 *  `pass` and probe for an own `data` property ({@link update_hook_fields}),
 *  so a shared instance is observationally identical; freezing turns that
 *  read-only contract from incidental into enforced.  Complex results (hooks
 *  returning `{ pass, data, ... }`) still pass through untouched.  #705
 *  update_hook_fields additionally identity-checks HOOK_PASSED to skip its
 *  own-property probe on the common no-op outcome.
 *  @see abstract_hook_step
 *  @see abstract_everything_hook_step
 *  @internal
 */
export declare const HOOK_PASSED: HookComplexResult<any>;
export declare const HOOK_REJECTED: HookComplexResult<any>;
/**
 *
 *  Invoke an optional transition/action hook and normalize its return value
 *  into a {@link HookComplexResult}.
 *
 *  This is the central adapter the transition pipeline uses to run every
 *  non-"everything" hook kind (basic, named, entry, exit, after, action, etc).
 *  It accepts `undefined` for the hook slot because most hooks are not set on
 *  most machines; when no hook is installed the step is a no-op pass.
 *
 *  The valid return shapes from a hook and their normalized meanings are:
 *  - `undefined` → `{ pass: true }`
 *  - `true`      → `{ pass: true }`
 *  - `false`     → `{ pass: false }`
 *  - `null`      → `{ pass: false }`
 *  - a complex result object → returned as-is
 *
 *  Anything else is a programmer error and throws.
 *  @template mDT The type of the machine data member; usually omitted.
 *  @param maybe_hook The hook handler to call, or `undefined` for the
 *  "no hook installed" case.
 *  @param hook_args The context object passed to the hook.  Includes the
 *  current and proposed state, current and proposed data, action name, and
 *  transition kind.
 *  @returns A {@link HookComplexResult} describing whether the hook passed
 *  and, optionally, any data replacements it requested.
 *  @throws {TypeError} If the hook returns a value that is not one of the
 *  legal shapes listed above.
 *  @internal
 */
export declare function abstract_hook_step<mDT>(maybe_hook: HookHandler<mDT> | undefined, hook_args: HookContext<mDT>): HookComplexResult<mDT>;
/**
 *
 *  Invoke an optional "everything" hook and normalize its return value into
 *  a {@link HookComplexResult}.
 *
 *  Mechanically identical to {@link abstract_hook_step}, but typed for the
 *  everything-hook family (`pre_everything_hook` and `everything_hook`),
 *  whose context object carries an extra `hook_name` field identifying which
 *  bracket of the pipeline is firing.  Separated from `abstract_hook_step`
 *  so TypeScript can enforce that the hook handler and the context object
 *  agree on shape.
 *
 *  The valid return shapes and their meanings are the same as for
 *  `abstract_hook_step`:
 *  - `undefined` or `true` → `{ pass: true }`
 *  - `false` or `null`     → `{ pass: false }`
 *  - a complex result      → returned as-is
 *  @template mDT The type of the machine data member; usually omitted.
 *  @param maybe_hook The everything-hook handler, or `undefined` when none
 *  is installed.
 *  @param hook_args The everything-hook context object.  Differs from a
 *  normal hook context in that it also includes `hook_name`.
 *  @returns A {@link HookComplexResult} describing whether the hook passed
 *  and any data replacements it requested.
 *  @throws {TypeError} If the hook returns a value outside the legal shapes.
 *  @internal
 */
export declare function abstract_everything_hook_step<mDT>(maybe_hook: EverythingHookHandler<mDT> | undefined, hook_args: EverythingHookContext<mDT>): HookComplexResult<mDT>;
export {};
