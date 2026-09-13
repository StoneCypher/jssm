
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

import type {
  HookDescription, HookHandler, HookContext, HookResult, HookComplexResult,
  EverythingHookContext, EverythingHookHandler, PostEverythingHookHandler,
  HookPhase, HookTarget, HookRegistryEntry, HookQuery,
  JssmBoundaryHooks
} from '../jssm_types.js';

import { JssmError }             from '../jssm_error.js';
import { pair_key, un_pair_key } from '../jssm_intern.js';

import { fire } from './events.js';

type StateType = string;





// The spatial fields (besides `handler`, which every hook needs) that each
// hook kind requires, mirroring exactly what `set_hook` reads per case.  Used
// to validate a HookDescription so a mis-shaped one is rejected rather than
// silently registering a dead hook — e.g. an `exit` hook given `to` instead of
// `from` would otherwise intern `undefined` and never fire (#734).  Typed as a
// `Record` over the kind union so the table is exhaustive at compile time:
// adding a hook kind without listing its fields is a build error.
export const hook_required_fields: Record<HookDescription<unknown>['kind'], ReadonlyArray<'from' | 'to' | 'action'>> = {
  'hook'                     : ['from', 'to'],
  'named'                    : ['from', 'to', 'action'],
  'global action'            : ['action'],
  'any action'               : [],
  'standard transition'      : [],
  'main transition'          : [],
  'forced transition'        : [],
  'any transition'           : [],
  'entry'                    : ['to'],
  'exit'                     : ['from'],
  'after'                    : ['from'],
  'after any'                : [],
  'post hook'                : ['from', 'to'],
  'post named'               : ['from', 'to', 'action'],
  'post global action'       : ['action'],
  'post any action'          : [],
  'post standard transition' : [],
  'post main transition'     : [],
  'post forced transition'   : [],
  'post any transition'      : [],
  'post entry'               : ['to'],
  'post exit'                : ['from'],
  'pre everything'           : [],
  'everything'               : [],
  'pre post everything'      : [],
  'post everything'          : [],
};

// The spatial fields a hook descriptor can carry, checked against the per-kind
// requirements above.
export const hook_spatial_fields = ['from', 'to', 'action'] as const;





/**
 *  Validate a {@link HookDescription} before registration.  Every hook needs
 *  a `handler` function, and each kind's identifying spatial fields
 *  (`from`/`to`/`action`) must be exactly those `set_hook` reads for that
 *  kind — present when required, absent otherwise.  This turns a mis-shaped
 *  descriptor into a thrown error instead of a silently dead hook keyed on
 *  `undefined` (e.g. an `exit` hook handed `to` instead of `from`, #734).
 *  @param m        - The machine the descriptor is about to be registered on.
 *  @param HookDesc - The descriptor about to be registered.
 *  @throws JssmError if the kind is unknown, the handler is not a function, a
 *          required field is missing, or an inapplicable field is present.
 *  @example
 *    import { sm, set_hook } from 'jssm';
 *    const m = sm`a -> b;`;
 *    // an exit hook is keyed by `from`, so supplying `to` is rejected:
 *    expect(() => set_hook(m, { kind: 'exit', to: 'a', handler: () => true })).toThrow();
 */
function validate_hook_description<mDT>(m: Machine<mDT>, HookDesc: HookDescription<mDT>): void {

  const required: ReadonlyArray<'from' | 'to' | 'action'> | undefined =
    hook_required_fields[HookDesc.kind];

  if (required === undefined) {
    throw new JssmError(m, `unknown hook kind ${JSON.stringify((HookDesc as { kind?: unknown }).kind)}`);
  }

  if (typeof HookDesc.handler !== 'function') {
    throw new JssmError(m, `${HookDesc.kind} hook requires a handler function`);
  }

  for (const field of hook_spatial_fields) {
    const needed = required.includes(field);
    const value  = (HookDesc as Record<string, unknown>)[field];
    // a required spatial field must be a usable key: a non-empty string.
    // presence alone isn't enough — `action: false` or `from: ''` would
    // register a hook nothing can ever fire (fsl#653, fsl#659)
    if (needed && ((typeof value !== 'string') || (value === ''))) {
      throw new JssmError(m, `${HookDesc.kind} hook requires '${field}' to be a non-empty string`);
    }
    if (!needed && (value !== undefined)) {
      throw new JssmError(m, `${HookDesc.kind} hook does not take '${field}'`);
    }
  }

}





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
export function set_hook<mDT>(m: Machine<mDT>, HookDesc: HookDescription<mDT>): void {

  validate_hook_description(m, HookDesc);

  switch (HookDesc.kind) {

    case 'hook': {
      // Numeric pair key (#729).  intern() rather than id_of(): a hook may
      // name a state the machine doesn't have — it gets an id no live state
      // can match, so it registers silently and never fires, as before.
      m._hooks.set(
        pair_key(m._state_interner.intern(HookDesc.from), m._state_interner.intern(HookDesc.to)),
        HookDesc.handler,
      );
      m._has_hooks       = true;
      m._has_basic_hooks = true;
      break;
    }

    case 'named': {
      // Numeric pair key, then action id; the per-pair action map stays a
      // map because the action interner may keep growing (#729).
      const pk = pair_key(m._state_interner.intern(HookDesc.from), m._state_interner.intern(HookDesc.to));
      let inner = m._named_hooks.get(pk);
      if (inner === undefined) {
        inner = new Map();
        m._named_hooks.set(pk, inner);
      }
      inner.set(m._action_interner.intern(HookDesc.action), HookDesc.handler);
      m._has_hooks       = true;
      m._has_named_hooks = true;
      break;
    }

    case 'global action': {
      m._global_action_hooks.set( m._action_interner.intern(HookDesc.action), HookDesc.handler );
      m._has_hooks               = true;
      m._has_global_action_hooks = true;
      break;
    }

    case 'any action': {
      m._any_action_hook = HookDesc.handler;
      m._has_hooks = true;
      break;
    }

    case 'standard transition': {
      m._standard_transition_hook = HookDesc.handler;
      m._has_transition_hooks     = true;
      m._has_hooks                = true;
      break;
    }

    case 'main transition': {
      m._main_transition_hook = HookDesc.handler;
      m._has_transition_hooks = true;
      m._has_hooks            = true;
      break;
    }

    case 'forced transition': {
      m._forced_transition_hook = HookDesc.handler;
      m._has_transition_hooks   = true;
      m._has_hooks              = true;
      break;
    }

    case 'any transition': {
      m._any_transition_hook = HookDesc.handler;
      m._has_hooks = true;
      break;
    }

    case 'entry': {
      m._entry_hooks.set( m._state_interner.intern(HookDesc.to), HookDesc.handler );
      m._has_hooks       = true;
      m._has_entry_hooks = true;
      break;
    }

    case 'exit': {
      m._exit_hooks.set( m._state_interner.intern(HookDesc.from), HookDesc.handler );
      m._has_hooks      = true;
      m._has_exit_hooks = true;
      break;
    }

    case 'after': {
      m._after_hooks.set( HookDesc.from, HookDesc.handler );
      m._has_hooks       = true;
      m._has_after_hooks = true;
      break;
    }

    case 'after any': {
      m._after_any_hook  = HookDesc.handler;
      m._has_hooks       = true;
      m._has_after_hooks = true;
      break;
    }


    case 'post hook': {
      // Numeric pair key; same rationale as 'hook' (#729).
      m._post_hooks.set(
        pair_key(m._state_interner.intern(HookDesc.from), m._state_interner.intern(HookDesc.to)),
        HookDesc.handler,
      );
      m._has_post_hooks       = true;
      m._has_post_basic_hooks = true;
      break;
    }

    case 'post named': {
      // Numeric pair key, then action id; same rationale as 'named' (#729).
      const pk = pair_key(m._state_interner.intern(HookDesc.from), m._state_interner.intern(HookDesc.to));
      let inner = m._post_named_hooks.get(pk);
      if (inner === undefined) {
        inner = new Map();
        m._post_named_hooks.set(pk, inner);
      }
      inner.set(m._action_interner.intern(HookDesc.action), HookDesc.handler);
      m._has_post_hooks       = true;
      m._has_post_named_hooks = true;
      break;
    }

    case 'post global action': {
      m._post_global_action_hooks.set(m._action_interner.intern(HookDesc.action), HookDesc.handler);
      m._has_post_hooks               = true;
      m._has_post_global_action_hooks = true;
      break;
    }

    case 'post any action': {
      m._post_any_action_hook = HookDesc.handler;
      m._has_post_hooks       = true;
      break;
    }

    case 'post standard transition': {
      m._post_standard_transition_hook = HookDesc.handler;
      m._has_post_transition_hooks     = true;
      m._has_post_hooks                = true;
      break;
    }

    case 'post main transition': {
      m._post_main_transition_hook = HookDesc.handler;
      m._has_post_transition_hooks = true;
      m._has_post_hooks            = true;
      break;
    }

    case 'post forced transition': {
      m._post_forced_transition_hook = HookDesc.handler;
      m._has_post_transition_hooks   = true;
      m._has_post_hooks              = true;
      break;
    }

    case 'post any transition': {
      m._post_any_transition_hook = HookDesc.handler;
      m._has_post_hooks           = true;
      break;
    }

    case 'post entry': {
      m._post_entry_hooks.set(m._state_interner.intern(HookDesc.to), HookDesc.handler);
      m._has_post_entry_hooks = true;
      m._has_post_hooks       = true;
      break;
    }

    case 'post exit': {
      m._post_exit_hooks.set(m._state_interner.intern(HookDesc.from), HookDesc.handler);
      m._has_post_exit_hooks = true;
      m._has_post_hooks      = true;
      break;
    }

    case 'pre everything': {
      m._pre_everything_hook = HookDesc.handler;
      m._has_hooks           = true;
      break;
    }

    case 'everything': {
      m._everything_hook = HookDesc.handler;
      m._has_hooks       = true;
      break;
    }

    case 'pre post everything': {
      m._pre_post_everything_hook = HookDesc.handler;
      m._has_post_hooks           = true;
      break;
    }

    case 'post everything': {
      m._post_everything_hook = HookDesc.handler;
      m._has_post_hooks       = true;
      break;
    }

    // No default: `validate_hook_description` above rejects any unknown kind
    // before we reach here, so the switch is exhaustive over the known kinds.

  }

  // The hooked-state styling layer (tier 2.5 of resolve_state_config) depends
  // on which states carry hooks, so registering a hook can change the composed
  // style of a state.  The static config cache assumes tiers 1–5 are fixed
  // after construction; invalidate it so styling stays correct when a hook is
  // added after a style has already been computed and memoized.
  m._static_state_config_cache.clear();

  // fire the registration event for inspector tools (#638)
  fire(m, 'hook-registration', { description: HookDesc });
}





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
export function remove_hook<mDT>(m: Machine<mDT>, HookDesc: HookDescription<mDT>): boolean {

  let removed = false;

  switch (HookDesc.kind) {

    case 'hook': {
      // id_of, not intern: removal of an unknown name reports false and
      // must not grow the interner tables (#729).
      const fid = m._state_interner.id_of(HookDesc.from),
            tid = m._state_interner.id_of(HookDesc.to);
      removed = (fid !== undefined) && (tid !== undefined) && m._hooks.delete(pair_key(fid, tid));
      break;
    }

    case 'named': {
      const fid = m._state_interner.id_of(HookDesc.from),
            tid = m._state_interner.id_of(HookDesc.to),
            aid = m._action_interner.id_of(HookDesc.action);
      const inner = ((fid === undefined) || (tid === undefined)) ? undefined : m._named_hooks.get(pair_key(fid, tid));
      removed = (inner !== undefined) && (aid !== undefined) && inner.delete(aid);
      break;
    }

    case 'global action': {
      const aid = m._action_interner.id_of(HookDesc.action);
      removed = (aid !== undefined) && m._global_action_hooks.delete(aid);
      break;
    }

    case 'any action': {
      if (m._any_action_hook !== undefined) { m._any_action_hook = undefined; removed = true; }
      break;
    }

    case 'standard transition': {
      if (m._standard_transition_hook !== undefined) { m._standard_transition_hook = undefined; removed = true; }
      break;
    }

    case 'main transition': {
      if (m._main_transition_hook !== undefined) { m._main_transition_hook = undefined; removed = true; }
      break;
    }

    case 'forced transition': {
      if (m._forced_transition_hook !== undefined) { m._forced_transition_hook = undefined; removed = true; }
      break;
    }

    case 'any transition': {
      if (m._any_transition_hook !== undefined) { m._any_transition_hook = undefined; removed = true; }
      break;
    }

    case 'entry': {
      const tid = m._state_interner.id_of(HookDesc.to);
      removed = (tid !== undefined) && m._entry_hooks.delete(tid);
      break;
    }

    case 'exit': {
      const fid = m._state_interner.id_of(HookDesc.from);
      removed = (fid !== undefined) && m._exit_hooks.delete(fid);
      break;
    }

    case 'after': {
      removed = m._after_hooks.delete(HookDesc.from);
      break;
    }

    case 'after any': {
      if (m._after_any_hook !== undefined) { m._after_any_hook = undefined; removed = true; }
      break;
    }

    case 'post hook': {
      const fid = m._state_interner.id_of(HookDesc.from),
            tid = m._state_interner.id_of(HookDesc.to);
      removed = (fid !== undefined) && (tid !== undefined) && m._post_hooks.delete(pair_key(fid, tid));
      break;
    }

    case 'post named': {
      const fid = m._state_interner.id_of(HookDesc.from),
            tid = m._state_interner.id_of(HookDesc.to),
            aid = m._action_interner.id_of(HookDesc.action);
      const inner = ((fid === undefined) || (tid === undefined)) ? undefined : m._post_named_hooks.get(pair_key(fid, tid));
      removed = (inner !== undefined) && (aid !== undefined) && inner.delete(aid);
      break;
    }

    case 'post global action': {
      const aid = m._action_interner.id_of(HookDesc.action);
      removed = (aid !== undefined) && m._post_global_action_hooks.delete(aid);
      break;
    }

    case 'post any action': {
      if (m._post_any_action_hook !== undefined) { m._post_any_action_hook = undefined; removed = true; }
      break;
    }

    case 'post standard transition': {
      if (m._post_standard_transition_hook !== undefined) { m._post_standard_transition_hook = undefined; removed = true; }
      break;
    }

    case 'post main transition': {
      if (m._post_main_transition_hook !== undefined) { m._post_main_transition_hook = undefined; removed = true; }
      break;
    }

    case 'post forced transition': {
      if (m._post_forced_transition_hook !== undefined) { m._post_forced_transition_hook = undefined; removed = true; }
      break;
    }

    case 'post any transition': {
      if (m._post_any_transition_hook !== undefined) { m._post_any_transition_hook = undefined; removed = true; }
      break;
    }

    case 'post entry': {
      const tid = m._state_interner.id_of(HookDesc.to);
      removed = (tid !== undefined) && m._post_entry_hooks.delete(tid);
      break;
    }

    case 'post exit': {
      const fid = m._state_interner.id_of(HookDesc.from);
      removed = (fid !== undefined) && m._post_exit_hooks.delete(fid);
      break;
    }

    case 'pre everything': {
      if (m._pre_everything_hook !== undefined) { m._pre_everything_hook = undefined; removed = true; }
      break;
    }

    case 'everything': {
      if (m._everything_hook !== undefined) { m._everything_hook = undefined; removed = true; }
      break;
    }

    case 'pre post everything': {
      if (m._pre_post_everything_hook !== undefined) { m._pre_post_everything_hook = undefined; removed = true; }
      break;
    }

    case 'post everything': {
      if (m._post_everything_hook !== undefined) { m._post_everything_hook = undefined; removed = true; }
      break;
    }

    default: {
      throw new JssmError(m, `Unknown hook type ${(HookDesc as any).kind}, should be impossible`);
    }

  }

  if (removed) {
    // set_hook only ever turns the _has_* fast-path flags ON; they summarize
    // whole families, not counts, so a removal can't simply turn one off.
    // Rederive them all now, or a stale flag keeps the fast path doing work
    // whose last hook is gone -- most visibly _has_transition_hooks, which
    // would otherwise keep resolving trans_type and leaking it into every
    // hook context after the last transition-kind hook was removed.  #1954
    recompute_hook_flags(m);

    // See set_hook: the hooked-state styling layer depends on which states
    // carry hooks, so removing one can change a state's composed style.
    m._static_state_config_cache.clear();
    fire(m, 'hook-removal', { description: HookDesc });
  }

  return removed;
}





/**
 *  Rederive every `_has_*` fast-path flag from the underlying hook stores.
 *
 *  Called after a successful {@link remove_hook}.  `set_hook` turns the flags
 *  on as hooks arrive, but because each flag summarizes a whole family rather
 *  than counting it, a removal cannot know whether it cleared the last hook of
 *  that family without re-checking.  Recomputing here fixes the `trans_type`
 *  context leak (a `_has_transition_hooks` that never went back to `false`)
 *  and drops the standing per-transition fast-path overhead once a family's
 *  last hook is gone.
 *
 *  Cheap and cold: it runs only on removal.  Every check is an O(1) `size` or
 *  definedness test except the two nested maps, which scan their (small)
 *  inner maps.  The flags are combined with `.includes(true)` over boolean
 *  arrays rather than `||` chains so the function carries no branches of its
 *  own.
 *  @param m - The machine whose flags are rederived.
 *  @internal
 */
function recompute_hook_flags<mDT>(m: Machine<mDT>): void {

  const nested_has = (table: Map<number, Map<number, HookHandler<mDT>>>): boolean =>
    [ ...table.values() ].some(inner => inner.size > 0);

  // pre-hook family flags
  m._has_basic_hooks         = m._hooks.size > 0;
  m._has_named_hooks         = nested_has(m._named_hooks);
  m._has_entry_hooks         = m._entry_hooks.size > 0;
  m._has_exit_hooks          = m._exit_hooks.size > 0;
  m._has_after_hooks         = [ m._after_hooks.size > 0, m._after_any_hook !== undefined ].includes(true);
  m._has_global_action_hooks = m._global_action_hooks.size > 0;
  m._has_transition_hooks    = [
    m._standard_transition_hook !== undefined,
    m._main_transition_hook     !== undefined,
    m._forced_transition_hook   !== undefined,
  ].includes(true);

  m._has_hooks = [
    m._has_basic_hooks,
    m._has_named_hooks,
    m._has_entry_hooks,
    m._has_exit_hooks,
    m._has_after_hooks,
    m._has_global_action_hooks,
    m._has_transition_hooks,
    m._any_action_hook     !== undefined,
    m._any_transition_hook !== undefined,
    m._pre_everything_hook !== undefined,
    m._everything_hook     !== undefined,
  ].includes(true);

  // post-hook family flags (mirror of the above)
  m._has_post_basic_hooks         = m._post_hooks.size > 0;
  m._has_post_named_hooks         = nested_has(m._post_named_hooks);
  m._has_post_entry_hooks         = m._post_entry_hooks.size > 0;
  m._has_post_exit_hooks          = m._post_exit_hooks.size > 0;
  m._has_post_global_action_hooks = m._post_global_action_hooks.size > 0;
  m._has_post_transition_hooks    = [
    m._post_standard_transition_hook !== undefined,
    m._post_main_transition_hook     !== undefined,
    m._post_forced_transition_hook   !== undefined,
  ].includes(true);

  m._has_post_hooks = [
    m._has_post_basic_hooks,
    m._has_post_named_hooks,
    m._has_post_entry_hooks,
    m._has_post_exit_hooks,
    m._has_post_global_action_hooks,
    m._has_post_transition_hooks,
    m._post_any_action_hook     !== undefined,
    m._post_any_transition_hook !== undefined,
    m._pre_post_everything_hook !== undefined,
    m._post_everything_hook     !== undefined,
  ].includes(true);

}





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
export function hook<mDT>(m: Machine<mDT>, from: string, to: string, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'hook', from, to, handler });
  return m;

}



/**
 * Register a pre-transition hook on a specific action-labeled edge.
 *  @param m       - The machine to register the hook on.
 *  @param from    - Source state name.
 *  @param to      - Target state name.
 *  @param action  - The action label that triggers this hook.
 *  @param handler - Callback invoked before the transition.
 *  @returns The machine, for chaining.
 */
export function hook_action<mDT>(m: Machine<mDT>, from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'named', from, to, action, handler });
  return m;

}



/**
 * Register a pre-transition hook on any edge triggered by a specific action.
 *  @param m       - The machine to register the hook on.
 *  @param action  - The action name to hook.
 *  @param handler - Callback invoked before any transition with this action.
 *  @returns The machine, for chaining.
 */
export function hook_global_action<mDT>(m: Machine<mDT>, action: string, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'global action', action, handler });
  return m;

}



/**
 * Register a pre-transition hook on any action-driven transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before any action transition.
 *  @returns The machine, for chaining.
 */
export function hook_any_action<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'any action', handler });
  return m;

}



/**
 * Register a pre-transition hook on any standard (`->`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before any legal transition.
 *  @returns The machine, for chaining.
 */
export function hook_standard_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'standard transition', handler });
  return m;

}



/**
 * Register a pre-transition hook on any main-path (`=>`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before any main transition.
 *  @returns The machine, for chaining.
 */
export function hook_main_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'main transition', handler });
  return m;

}



/**
 * Register a pre-transition hook on any forced (`~>`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before any forced transition.
 *  @returns The machine, for chaining.
 */
export function hook_forced_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'forced transition', handler });
  return m;

}



/**
 * Register a pre-transition hook on any transition regardless of kind.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before every transition.
 *  @returns The machine, for chaining.
 */
export function hook_any_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'any transition', handler });
  return m;

}



/**
 * Register a hook that fires when entering a specific state.
 *  @param m       - The machine to register the hook on.
 *  @param to      - The state being entered.
 *  @param handler - Callback invoked on entry.
 *  @returns The machine, for chaining.
 */
export function hook_entry<mDT>(m: Machine<mDT>, to: string, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'entry', to, handler });
  return m;

}



/**
 * Register a hook that fires when leaving a specific state.
 *  @param m       - The machine to register the hook on.
 *  @param from    - The state being exited.
 *  @param handler - Callback invoked on exit.
 *  @returns The machine, for chaining.
 */
export function hook_exit<mDT>(m: Machine<mDT>, from: string, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'exit', from, handler });
  return m;

}



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
export function hook_after<mDT>(m: Machine<mDT>, from: string, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'after', from, handler });
  return m;

}



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
export function hook_after_any<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'after any', handler });
  return m;

}





/**
 * Post-transition hook on a specific edge.  Fires after the transition
 *  from `from` to `to` has completed.  Cannot block the transition.
 *  @param m       - The machine to register the hook on.
 *  @param from    - Source state name.
 *  @param to      - Target state name.
 *  @param handler - Callback invoked after the transition.
 *  @returns The machine, for chaining.
 */
export function post_hook<mDT>(m: Machine<mDT>, from: string, to: string, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'post hook', from, to, handler });
  return m;

}



/**
 * Post-transition hook on a specific action-labeled edge.
 *  @param m       - The machine to register the hook on.
 *  @param from    - Source state name.
 *  @param to      - Target state name.
 *  @param action  - The action label.
 *  @param handler - Callback invoked after the transition.
 *  @returns The machine, for chaining.
 */
export function post_hook_action<mDT>(m: Machine<mDT>, from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'post named', from, to, action, handler });
  return m;

}



/**
 * Post-transition hook on any edge triggered by a specific action.
 *  @param m       - The machine to register the hook on.
 *  @param action  - The action name.
 *  @param handler - Callback invoked after any transition with this action.
 *  @returns The machine, for chaining.
 */
export function post_hook_global_action<mDT>(m: Machine<mDT>, action: string, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'post global action', action, handler });
  return m;

}



/**
 * Post-transition hook on any action-driven transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after any action transition.
 *  @returns The machine, for chaining.
 */
export function post_hook_any_action<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'post any action', handler });
  return m;

}



/**
 * Post-transition hook on any standard (`->`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after any legal transition.
 *  @returns The machine, for chaining.
 */
export function post_hook_standard_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'post standard transition', handler });
  return m;

}



/**
 * Post-transition hook on any main-path (`=>`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after any main transition.
 *  @returns The machine, for chaining.
 */
export function post_hook_main_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'post main transition', handler });
  return m;

}



/**
 * Post-transition hook on any forced (`~>`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after any forced transition.
 *  @returns The machine, for chaining.
 */
export function post_hook_forced_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'post forced transition', handler });
  return m;

}



/**
 * Post-transition hook on any transition regardless of kind.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after every transition.
 *  @returns The machine, for chaining.
 */
export function post_hook_any_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'post any transition', handler });
  return m;

}



/**
 * Post-transition hook that fires after entering a specific state.
 *  @param m       - The machine to register the hook on.
 *  @param to      - The state that was entered.
 *  @param handler - Callback invoked after entry.
 *  @returns The machine, for chaining.
 */
export function post_hook_entry<mDT>(m: Machine<mDT>, to: string, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'post entry', to, handler });
  return m;

}



/**
 * Post-transition hook that fires after leaving a specific state.
 *  @param m       - The machine to register the hook on.
 *  @param from    - The state that was exited.
 *  @param handler - Callback invoked after exit.
 *  @returns The machine, for chaining.
 */
export function post_hook_exit<mDT>(m: Machine<mDT>, from: string, handler: HookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'post exit', from, handler });
  return m;

}



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
export function hook_pre_everything<mDT>(m: Machine<mDT>, handler: EverythingHookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'pre everything', handler });
  return m;

}



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
export function hook_everything<mDT>(m: Machine<mDT>, handler: EverythingHookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'everything', handler });
  return m;

}



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
export function hook_post_everything<mDT>(m: Machine<mDT>, handler: PostEverythingHookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'post everything', handler });
  return m;

}



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
export function hook_pre_post_everything<mDT>(m: Machine<mDT>, handler: PostEverythingHookHandler<mDT>): Machine<mDT> {

  set_hook(m, { kind: 'pre post everything', handler });
  return m;

}





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

export function hook_registry<mDT>(m: Machine<mDT>): HookRegistryEntry[] {

  const entries: HookRegistryEntry[] = [];

  // The hot-path hook tables are keyed by interned integer ids (states and
  // actions) and, for edges, by `pair_key(from_id, to_id)`.  Decode each key
  // back to its original name so the registry speaks states/actions, never
  // ids.  The lone exception is `_after_hooks`, deliberately string-keyed.
  const state_name  = (id: number): StateType => m._state_interner.name_of(id);
  const action_name = (id: number): string    => m._action_interner.name_of(id);

  // edge tables: pair_key(from_id, to_id) -> handler
  const push_edges = (
    table : Map<number, HookHandler<mDT>>,
    kind  : HookRegistryEntry['kind'],
    phase : HookPhase
  ): void => {
    table.forEach((_handler, pk) => {
      const [fid, tid] = un_pair_key(pk);
      entries.push({ kind, phase, target: { scope: 'edge', from: state_name(fid), to: state_name(tid) } });
    });
  };

  // named-edge tables: pair_key(from_id, to_id) -> action_id -> handler
  const push_named = (
    table : Map<number, Map<number, HookHandler<mDT>>>,
    kind  : HookRegistryEntry['kind'],
    phase : HookPhase
  ): void => {
    table.forEach((byAction, pk) => {
      const [fid, tid] = un_pair_key(pk);
      const from = state_name(fid), to = state_name(tid);
      byAction.forEach((_handler, aid) => {
        entries.push({ kind, phase, target: { scope: 'edge', from, to, action: action_name(aid) } });
      });
    });
  };

  // entry/exit tables: interned state_id -> handler
  const push_states = (
    table : Map<number, HookHandler<mDT>>,
    kind  : HookRegistryEntry['kind'],
    phase : HookPhase
  ): void => {
    table.forEach((_handler, sid) => {
      entries.push({ kind, phase, target: { scope: 'state', state: state_name(sid) } });
    });
  };

  // the `after` table is the lone string-keyed exception: state name -> handler
  const push_states_by_name = (
    table : Map<string, HookHandler<mDT>>,
    kind  : HookRegistryEntry['kind'],
    phase : HookPhase
  ): void => {
    table.forEach((_handler, state) => {
      entries.push({ kind, phase, target: { scope: 'state', state: state } });
    });
  };

  // global-action tables: interned action_id -> handler
  const push_actions = (
    table : Map<number, HookHandler<mDT>>,
    kind  : HookRegistryEntry['kind'],
    phase : HookPhase
  ): void => {
    table.forEach((_handler, aid) => {
      entries.push({ kind, phase, target: { scope: 'action', action: action_name(aid) } });
    });
  };

  const push_global = (
    handler : HookHandler<mDT> | EverythingHookHandler<mDT> | PostEverythingHookHandler<mDT> | undefined,
    kind    : HookRegistryEntry['kind'],
    phase   : HookPhase
  ): void => {
    if (handler !== undefined) {
      entries.push({ kind, phase, target: { scope: 'global' } });
    }
  };

  // FSL boundary hooks: subject name -> { onEnter?, onExit? }, fired post-
  // commit.  Each present direction becomes its own row, all phase 'post'.
  const push_boundary = (
    table     : Map<string, JssmBoundaryHooks>,
    enterKind : HookRegistryEntry['kind'],
    exitKind  : HookRegistryEntry['kind'],
    target_of : (subject: string) => HookTarget
  ): void => {
    table.forEach((bh, subject) => {
      if (bh.onEnter !== undefined) { entries.push({ kind: enterKind, phase: 'post', target: target_of(subject) }); }
      if (bh.onExit  !== undefined) { entries.push({ kind: exitKind,  phase: 'post', target: target_of(subject) }); }
    });
  };

  // pre-phase, edge- and state-keyed tables
  push_edges        (m._hooks,                'hook',          'pre');
  push_named        (m._named_hooks,          'named',         'pre');
  push_states       (m._entry_hooks,          'entry',         'pre');
  push_states       (m._exit_hooks,           'exit',          'pre');
  push_states_by_name(m._after_hooks,         'after',         'pre');
  push_actions      (m._global_action_hooks,  'global action', 'pre');

  // pre-phase, global singletons
  push_global(m._any_action_hook,          'any action',          'pre');
  push_global(m._standard_transition_hook, 'standard transition', 'pre');
  push_global(m._main_transition_hook,     'main transition',     'pre');
  push_global(m._forced_transition_hook,   'forced transition',   'pre');
  push_global(m._any_transition_hook,      'any transition',      'pre');
  push_global(m._after_any_hook,           'after any',           'pre');
  push_global(m._pre_everything_hook,      'pre everything',      'pre');
  push_global(m._everything_hook,          'everything',          'pre');

  // post-phase, edge- and state-keyed tables
  push_edges  (m._post_hooks,                'post hook',          'post');
  push_named  (m._post_named_hooks,          'post named',         'post');
  push_states (m._post_entry_hooks,          'post entry',         'post');
  push_states (m._post_exit_hooks,           'post exit',          'post');
  push_actions(m._post_global_action_hooks,  'post global action', 'post');

  // post-phase, global singletons
  push_global(m._post_any_action_hook,          'post any action',          'post');
  push_global(m._post_standard_transition_hook, 'post standard transition', 'post');
  push_global(m._post_main_transition_hook,     'post main transition',     'post');
  push_global(m._post_forced_transition_hook,   'post forced transition',   'post');
  push_global(m._post_any_transition_hook,      'post any transition',      'post');
  push_global(m._pre_post_everything_hook,      'pre post everything',      'post');
  push_global(m._post_everything_hook,          'post everything',          'post');

  // FSL boundary hooks (post-commit): group and plain-state subjects
  push_boundary(m._group_hooks, 'group enter', 'group exit', (group) => ({ scope: 'group', group }));
  push_boundary(m._state_hooks, 'state enter', 'state exit', (state) => ({ scope: 'state', state: state }));

  return entries;

}





/********
 *
 *  Does a single registry entry reference the state `state`?  An entry
 *  references a state when it is a `'state'`-scoped hook on that state, or an
 *  `'edge'`-scoped hook whose `from` or `to` is that state.  `'action'`- and
 *  `'global'`-scoped entries reference no particular state.  This is the
 *  predicate behind both per-state introspection and the `hooked_state`
 *  styling layer.
 *
 *  @param entry The registry entry to test.
 *  @param state The state name to test membership of.
 *  @returns `true` when the entry observes that state.
 *
 */

function entry_touches_state(entry: HookRegistryEntry, state: StateType): boolean {
  const t: HookTarget = entry.target;
  if (t.scope === 'state') { return t.state === state; }
  if (t.scope === 'edge')  { return t.from === state || t.to === state; }
  return false;
}



/********
 *
 *  Does a single registry entry match a `{ from, to, action? }` edge query?
 *  Only `'edge'`-scoped entries can match.  When the query omits `action`
 *  the entry's action (if any) is ignored; when the query supplies `action`
 *  it must match exactly.
 *
 *  @param entry The registry entry to test.
 *  @param from  The edge origin to match.
 *  @param to    The edge destination to match.
 *  @param action Optional named action to match exactly.
 *  @returns `true` when the entry observes that edge.
 *
 */

function entry_matches_edge(entry: HookRegistryEntry, from: StateType, to: StateType, action?: string): boolean {
  const t: HookTarget = entry.target;
  if (t.scope !== 'edge') {
    return false;
  }
  if (t.from !== from || t.to !== to) {
    return false;
  }
  if (action !== undefined) {
    return t.action === action;
  }
  return true;
}



/********
 *
 *  Does a single registry entry match an action name?  Both `'action'`-scoped
 *  hooks (global-action hooks) and named-edge hooks carrying that action
 *  count as matches.
 *
 *  @param entry  The registry entry to test.
 *  @param action The action name to match.
 *  @returns `true` when the entry observes that action.
 *
 */

function entry_matches_action(entry: HookRegistryEntry, action: string): boolean {
  const t: HookTarget = entry.target;
  if (t.scope === 'action') { return t.action === action; }
  if (t.scope === 'edge')   { return t.action === action; }
  return false;
}



/********
 *
 *  Does a single registry entry match a named state group?  Only
 *  `'group'`-scoped entries (FSL group-boundary hooks) match.  Group hooks
 *  are matched by group name only — they deliberately do not propagate to
 *  member states, so a member-state query never returns them.
 *
 *  @param entry The registry entry to test.
 *  @param group The group name to match.
 *  @returns `true` when the entry observes that group's boundary.
 *
 */

function entry_matches_group(entry: HookRegistryEntry, group: string): boolean {
  const t: HookTarget = entry.target;
  if (t.scope === 'group') { return t.group === group; }
  return false;
}



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

export function hooks_on<mDT>(m: Machine<mDT>, query: HookQuery): HookRegistryEntry[] {

  const registry = hook_registry(m);

  if (typeof query === 'string') {
    return registry.filter(e => entry_touches_state(e, query));
  }

  // An edge query is distinguished by carrying `from` (it may *also* carry
  // `action`, which narrows the edge — so this must be tested before the
  // action-only case, whose discriminator `action` an edge query can share).
  if ('from' in query) {
    return registry.filter(e => entry_matches_edge(e, query.from, query.to, query.action));
  }

  if ('group' in query) {
    return registry.filter(e => entry_matches_group(e, query.group));
  }

  return registry.filter(e => entry_matches_action(e, query.action));

}



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

export function has_hook<mDT>(m: Machine<mDT>, query: HookQuery, phase?: HookPhase): boolean {
  const matches = hooks_on(m, query);
  if (phase === undefined) { return matches.length > 0; }
  return matches.some(e => e.phase === phase);
}



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

export function state_has_hooks<mDT>(m: Machine<mDT>, state: StateType): boolean {
  // Boundary hooks are a separate mechanism that sets neither _has_hooks nor
  // _has_post_hooks, so the fast-out must also consult the boundary tables —
  // otherwise a state whose only hook is a boundary hook reports unhooked.
  if (!m._has_hooks
      && !m._has_post_hooks
      && (m._state_hooks.size === 0)
      && (m._group_hooks.size === 0)) { return false; }
  return hook_registry(m).some(e => entry_touches_state(e, state));
}





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

export function is_hook_complex_result<mDT>(hr: unknown): hr is HookComplexResult<mDT> {

  return hr !== null && typeof hr === 'object' && typeof (hr as any).pass === 'boolean';

}



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

export function update_hook_fields<mDT>(hook_args: HookContext<mDT>, res: HookComplexResult<mDT>): boolean {
  // HOOK_PASSED is the shared frozen outcome for "no hook installed" and for
  // hooks returning true/undefined — the overwhelming majority of the up-to-
  // ~10 steps per hooked transition.  It can never carry `data`/`state` (frozen,
  // built without them), so one pointer compare replaces the hasOwnProperty
  // reflection call for the common case.
  if (res === HOOK_PASSED) { return false; }
  // a complex result's `state` redirects the transition's destination; carry it
  // on hook_args.to (the destination field), which transition_impl applies at
  // commit (last writer wins).  An explicit `state: undefined` is not a
  // redirect.  StoneCypher/fsl#1947
  if (Object.prototype.hasOwnProperty.call(res, 'state') && res.state !== undefined) {
    hook_args.to = res.state;
  }
  // Two channels (StoneCypher/fsl#1948): `data` overrides the value observed by
  // later hooks in this chain AND is the default committed value; `next_data`
  // overrides only the committed value.  So `data` sets both, then an explicit
  // `next_data` overrides the commit channel.  transition_impl commits
  // hook_args.next_data.  hasOwnProperty (not truthiness) so a falsy override
  // (false/null/0/''/undefined) still commits (fsl#1264/#935).
  let changed = false;
  if (Object.prototype.hasOwnProperty.call(res, 'data')) {
    hook_args.data      = res.data;
    hook_args.next_data = res.data;
    changed = true;
  }
  if (Object.prototype.hasOwnProperty.call(res, 'next_data')) {
    hook_args.next_data = res.next_data;
    changed = true;
  }
  return changed;
}





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

export function is_hook_rejection<mDT>(hr: HookResult<mDT>): boolean {

  if (hr === true)      { return false; }
  if (hr === undefined) { return false; }
  if (hr === false)     { return true;  }

  if (is_hook_complex_result(hr)) {
    return (!(hr.pass));
  }

  throw new TypeError('unknown hook rejection type result');

}





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

export const HOOK_PASSED   : HookComplexResult<any> = Object.freeze({ pass: true  });
export const HOOK_REJECTED : HookComplexResult<any> = Object.freeze({ pass: false });





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

export function abstract_hook_step<mDT>(maybe_hook: HookHandler<mDT> | undefined, hook_args: HookContext<mDT>): HookComplexResult<mDT> {

  if (maybe_hook === undefined) {
    return HOOK_PASSED;
  }

  const result = maybe_hook(hook_args);

  if (result === undefined) {
    return HOOK_PASSED;
  }

  if (result === true) {
    return HOOK_PASSED;
  }

  if (result === false) {
    return HOOK_REJECTED;
  }

  if (result === null) {
    return HOOK_REJECTED;
  }

  if (is_hook_complex_result<mDT>(result)) {
    return result;
  }

  throw new TypeError(`Unknown hook result type ${String(result)}`);

}



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

export function abstract_everything_hook_step<mDT>(maybe_hook: EverythingHookHandler<mDT> | undefined, hook_args: EverythingHookContext<mDT>): HookComplexResult<mDT> {

  if (maybe_hook === undefined) {
    return HOOK_PASSED;
  }

  const result = maybe_hook(hook_args);

  if (result === undefined) {
    return HOOK_PASSED;
  }

  if (result === true) {
    return HOOK_PASSED;
  }

  if (result === false) {
    return HOOK_REJECTED;
  }

  if (result === null) {
    return HOOK_REJECTED;
  }

  if (is_hook_complex_result<mDT>(result)) {
    return result;
  }

  throw new TypeError(`Unknown hook result type ${String(result)}`);

}
