
import { describe, test, expect } from 'vitest';

import {
  sm,
  transition, act, force_transition,
  set_hook, remove_hook,
  hook, hook_action, hook_global_action, hook_any_action,
  hook_standard_transition, hook_main_transition, hook_forced_transition, hook_any_transition,
  hook_entry, hook_exit, hook_after, hook_after_any,
  post_hook, post_hook_action, post_hook_global_action, post_hook_any_action,
  post_hook_standard_transition, post_hook_main_transition, post_hook_forced_transition, post_hook_any_transition,
  post_hook_entry, post_hook_exit,
  hook_pre_everything, hook_everything, hook_post_everything, hook_pre_post_everything,
  hook_registry, hooks_on, has_hook, state_has_hooks,
  is_hook_rejection, is_hook_complex_result,
  clear_state_timeout,
  JssmError
} from '../jssm';

import type { HookRegistryEntry } from '../jssm_types';





// Direct tests of the hooks family as bare functions.  Every expected value
// is written out from the FSL text and the call sequence; nothing here is
// computed by the code under test.  State reads go through the class's
// `m.state()` until the query family lands (Task 5 of the bare-functions
// plan).

describe('bare functions — hooks family', () => {



  describe('hook', () => {

    test('returns the machine, so registrations chain', () => {
      const m = sm`a -> b -> c;`;
      expect(hook(m, 'a', 'b', () => true)).toBe(m);
    });

    test('the handler sees the transition it guards', () => {
      const m = sm`a -> b -> c;`;
      const seen: Array<[string, string]> = [];
      hook(m, 'a', 'b', ({ from, to }) => { seen.push([from, to]); return true; });
      expect(transition(m, 'b')).toBe(true);
      expect(seen).toStrictEqual([ ['a', 'b'] ]);
    });

    test('a false return vetoes the transition and the state stays', () => {
      const m = sm`a -> b -> c;`;
      hook(m, 'a', 'b', () => false);
      expect(transition(m, 'b')).toBe(false);
      expect(m.state()).toBe('a');
    });

    test('a hook on a different edge does not fire', () => {
      const m = sm`a -> b -> c;`;
      let calls = 0;
      hook(m, 'b', 'c', () => { calls += 1; return false; });
      expect(transition(m, 'b')).toBe(true);
      expect(calls).toBe(0);
      expect(m.state()).toBe('b');
    });

  });



  describe('set_hook and remove_hook', () => {

    test('set_hook installs a descriptor that then guards the edge', () => {
      const m = sm`a -> b;`;
      set_hook(m, { kind: 'hook', from: 'a', to: 'b', handler: () => false });
      expect(transition(m, 'b')).toBe(false);
      expect(m.state()).toBe('a');
    });

    test('remove_hook reports true on removal, then false once it is gone', () => {
      const m = sm`a -> b;`;
      const fn = () => false;
      hook(m, 'a', 'b', fn);
      expect(remove_hook(m, { kind: 'hook', from: 'a', to: 'b', handler: fn })).toBe(true);
      expect(remove_hook(m, { kind: 'hook', from: 'a', to: 'b', handler: fn })).toBe(false);
      expect(transition(m, 'b')).toBe(true);
      expect(m.state()).toBe('b');
    });

    test('remove_hook of a global singleton reports true then false', () => {
      const m = sm`a -> b;`;
      const fn = () => true;
      hook_any_transition(m, fn);
      expect(remove_hook(m, { kind: 'any transition', handler: fn })).toBe(true);
      expect(remove_hook(m, { kind: 'any transition', handler: fn })).toBe(false);
    });

    test('remove_hook of an unknown state or action reports false without registering it', () => {
      const m = sm`a 'go' -> b;`;
      const fn = () => true;
      expect(remove_hook(m, { kind: 'hook', from: 'zed', to: 'b', handler: fn })).toBe(false);
      expect(remove_hook(m, { kind: 'named', from: 'a', to: 'b', action: 'nope', handler: fn })).toBe(false);
      expect(remove_hook(m, { kind: 'global action', action: 'nope', handler: fn })).toBe(false);
      expect(remove_hook(m, { kind: 'entry', to: 'zed', handler: fn })).toBe(false);
      expect(remove_hook(m, { kind: 'exit', from: 'zed', handler: fn })).toBe(false);
      expect(hook_registry(m)).toStrictEqual([]);
    });

    test('set_hook rejects a mis-shaped descriptor with a JssmError (#734)', () => {
      const m = sm`a -> b;`;
      expect(() => set_hook(m, { kind: 'exit', to: 'a', handler: () => true } as any)).toThrow(JssmError);
      expect(() => set_hook(m, { kind: 'hook', from: 'a', to: 'b', handler: 'nope' } as any)).toThrow(JssmError);
      expect(() => set_hook(m, { kind: 'Smaug', handler: () => true } as any)).toThrow(JssmError);
      expect(() => set_hook(m, { kind: 'hook', from: '', to: 'b', handler: () => true })).toThrow(JssmError);
      expect(hook_registry(m)).toStrictEqual([]);
    });

    test('remove_hook rejects an unknown kind with a JssmError', () => {
      const m = sm`a -> b;`;
      expect(() => remove_hook(m, { kind: 'Smaug', handler: () => true } as any)).toThrow(JssmError);
    });

    test('set_hook fires hook-registration and remove_hook fires hook-removal', () => {
      const m = sm`a -> b;`;
      const seen: string[] = [];
      m.on('hook-registration', ev => { seen.push(`+${ev.description.kind}`); });
      m.on('hook-removal',      ev => { seen.push(`-${ev.description.kind}`); });
      const fn = () => true;
      hook_entry(m, 'b', fn);
      remove_hook(m, { kind: 'entry', to: 'b', handler: fn });
      remove_hook(m, { kind: 'entry', to: 'b', handler: fn });
      expect(seen).toStrictEqual(['+entry', '-entry']);
    });

  });



  describe('hook_registry, hooks_on, has_hook, state_has_hooks', () => {

    test('hook_registry lists the installed edge hook with its from and to', () => {
      const m = sm`a -> b -> c;`;
      hook(m, 'a', 'b', () => true);
      expect(hook_registry(m)).toStrictEqual([
        { kind: 'hook', phase: 'pre', target: { scope: 'edge', from: 'a', to: 'b' } }
      ]);
    });

    test('hooks_on finds the hook by state, by edge, and not elsewhere', () => {
      const m = sm`a 'go' -> b -> c;`;
      hook(m, 'a', 'b', () => true);
      const row: HookRegistryEntry = { kind: 'hook', phase: 'pre', target: { scope: 'edge', from: 'a', to: 'b' } };
      expect(hooks_on(m, 'a')).toStrictEqual([row]);
      expect(hooks_on(m, 'b')).toStrictEqual([row]);
      expect(hooks_on(m, 'c')).toStrictEqual([]);
      expect(hooks_on(m, { from: 'a', to: 'b' })).toStrictEqual([row]);
      expect(hooks_on(m, { from: 'b', to: 'c' })).toStrictEqual([]);
      expect(hooks_on(m, { action: 'go' })).toStrictEqual([]);
      expect(hooks_on(m, { group: 'g' })).toStrictEqual([]);
    });

    test('hooks_on matches a named-edge hook by action, narrowed edge, and group hooks by group', () => {
      const m = sm`&g: [a b]; a 'go' -> b 'go' -> c; on enter &g do 'go';`;
      hook_action(m, 'a', 'b', 'go', () => true);
      const named: HookRegistryEntry = { kind: 'named', phase: 'pre', target: { scope: 'edge', from: 'a', to: 'b', action: 'go' } };
      const group: HookRegistryEntry = { kind: 'group enter', phase: 'post', target: { scope: 'group', group: 'g' } };
      expect(hooks_on(m, { action: 'go' })).toStrictEqual([named]);
      expect(hooks_on(m, { from: 'a', to: 'b', action: 'go' })).toStrictEqual([named]);
      expect(hooks_on(m, { from: 'a', to: 'b', action: 'stop' })).toStrictEqual([]);
      expect(hooks_on(m, { group: 'g' })).toStrictEqual([group]);
      expect(hooks_on(m, 'a')).toStrictEqual([named]);
    });

    test('has_hook agrees with hooks_on and honors the phase', () => {
      const m = sm`a -> b -> c;`;
      hook(m, 'a', 'b', () => true);
      expect(has_hook(m, 'a')).toBe(true);
      expect(has_hook(m, 'a', 'pre')).toBe(true);
      expect(has_hook(m, 'a', 'post')).toBe(false);
      expect(has_hook(m, 'c')).toBe(false);
      expect(has_hook(m, { from: 'a', to: 'b' })).toBe(true);
    });

    test('state_has_hooks is true for a hooked state and false for an unhooked one', () => {
      const m = sm`a -> b -> c;`;
      hook(m, 'a', 'b', () => true);
      expect(state_has_hooks(m, 'a')).toBe(true);
      expect(state_has_hooks(m, 'b')).toBe(true);
      expect(state_has_hooks(m, 'c')).toBe(false);
    });

    test('state_has_hooks is false everywhere on a hook-free machine', () => {
      const m = sm`a -> b;`;
      expect(state_has_hooks(m, 'a')).toBe(false);
      expect(state_has_hooks(m, 'b')).toBe(false);
    });

    test('state_has_hooks sees a state boundary hook but not a group boundary hook', () => {
      const m = sm`&g: [a b]; a 'go' -> b 'go' -> c; on exit c do 'go'; on enter &g do 'go';`;
      expect(state_has_hooks(m, 'c')).toBe(true);
      expect(state_has_hooks(m, 'a')).toBe(false);
    });

  });



  describe('post hooks and everything hooks', () => {

    test('post_hook_entry fires after the state has changed and returns the machine', () => {
      const m = sm`a -> b -> c;`;
      const seen: string[][] = [];
      expect(post_hook_entry(m, 'b', ({ from, to }) => { seen.push([from, to, m.state()]); })).toBe(m);
      expect(transition(m, 'b')).toBe(true);
      expect(seen).toStrictEqual([ ['a', 'b', 'b'] ]);
    });

    test('a post hook cannot veto', () => {
      const m = sm`a -> b;`;
      post_hook(m, 'a', 'b', () => false);
      expect(transition(m, 'b')).toBe(true);
      expect(m.state()).toBe('b');
    });

    test('hook_everything sees its hook_name and a false return vetoes', () => {
      const m = sm`a -> b;`;
      const names: string[] = [];
      expect(hook_everything(m, ({ hook_name }) => { names.push(hook_name); return false; })).toBe(m);
      expect(transition(m, 'b')).toBe(false);
      expect(m.state()).toBe('a');
      expect(names).toStrictEqual(['everything']);
    });

    test('hook_pre_everything fires before hook_everything, and hook_post_everything after the commit', () => {
      const m = sm`a -> b;`;
      const order: string[] = [];
      hook_everything(m, ({ hook_name }) => { order.push(hook_name); });
      hook_pre_everything(m, ({ hook_name }) => { order.push(hook_name); });
      hook_post_everything(m, ({ hook_name }) => { order.push(`${hook_name}@${m.state()}`); });
      hook_pre_post_everything(m, ({ hook_name }) => { order.push(`${hook_name}@${m.state()}`); });
      expect(transition(m, 'b')).toBe(true);
      expect(order).toStrictEqual(['pre everything', 'everything', 'pre post everything@b', 'post everything@b']);
    });

  });



  // Every wrapper returns the machine and installs exactly the registry row
  // its name promises.  The rows are written out by hand from the wrapper's
  // documented kind, phase, and target.

  describe('every wrapper returns the machine and installs its documented registry row', () => {

    const FSL = `a 'go' -> b 'go' -> c; a ~> c;`;

    const wrappers: Array<[string, (m: any) => any, HookRegistryEntry]> = [
      [ 'hook',                          m => hook(m, 'a', 'b', () => true),                   { kind: 'hook',                     phase: 'pre',  target: { scope: 'edge', from: 'a', to: 'b' } } ],
      [ 'hook_action',                   m => hook_action(m, 'a', 'b', 'go', () => true),      { kind: 'named',                    phase: 'pre',  target: { scope: 'edge', from: 'a', to: 'b', action: 'go' } } ],
      [ 'hook_global_action',            m => hook_global_action(m, 'go', () => true),         { kind: 'global action',            phase: 'pre',  target: { scope: 'action', action: 'go' } } ],
      [ 'hook_any_action',               m => hook_any_action(m, () => true),                  { kind: 'any action',               phase: 'pre',  target: { scope: 'global' } } ],
      [ 'hook_standard_transition',      m => hook_standard_transition(m, () => true),         { kind: 'standard transition',      phase: 'pre',  target: { scope: 'global' } } ],
      [ 'hook_main_transition',          m => hook_main_transition(m, () => true),             { kind: 'main transition',          phase: 'pre',  target: { scope: 'global' } } ],
      [ 'hook_forced_transition',        m => hook_forced_transition(m, () => true),           { kind: 'forced transition',        phase: 'pre',  target: { scope: 'global' } } ],
      [ 'hook_any_transition',           m => hook_any_transition(m, () => true),              { kind: 'any transition',           phase: 'pre',  target: { scope: 'global' } } ],
      [ 'hook_entry',                    m => hook_entry(m, 'b', () => true),                  { kind: 'entry',                    phase: 'pre',  target: { scope: 'state', state: 'b' } } ],
      [ 'hook_exit',                     m => hook_exit(m, 'a', () => true),                   { kind: 'exit',                     phase: 'pre',  target: { scope: 'state', state: 'a' } } ],
      [ 'hook_after',                    m => hook_after(m, 'a', () => true),                  { kind: 'after',                    phase: 'pre',  target: { scope: 'state', state: 'a' } } ],
      [ 'hook_after_any',                m => hook_after_any(m, () => true),                   { kind: 'after any',                phase: 'pre',  target: { scope: 'global' } } ],
      [ 'post_hook',                     m => post_hook(m, 'a', 'b', () => true),              { kind: 'post hook',                phase: 'post', target: { scope: 'edge', from: 'a', to: 'b' } } ],
      [ 'post_hook_action',              m => post_hook_action(m, 'a', 'b', 'go', () => true), { kind: 'post named',               phase: 'post', target: { scope: 'edge', from: 'a', to: 'b', action: 'go' } } ],
      [ 'post_hook_global_action',       m => post_hook_global_action(m, 'go', () => true),    { kind: 'post global action',       phase: 'post', target: { scope: 'action', action: 'go' } } ],
      [ 'post_hook_any_action',          m => post_hook_any_action(m, () => true),             { kind: 'post any action',          phase: 'post', target: { scope: 'global' } } ],
      [ 'post_hook_standard_transition', m => post_hook_standard_transition(m, () => true),    { kind: 'post standard transition', phase: 'post', target: { scope: 'global' } } ],
      [ 'post_hook_main_transition',     m => post_hook_main_transition(m, () => true),        { kind: 'post main transition',     phase: 'post', target: { scope: 'global' } } ],
      [ 'post_hook_forced_transition',   m => post_hook_forced_transition(m, () => true),      { kind: 'post forced transition',   phase: 'post', target: { scope: 'global' } } ],
      [ 'post_hook_any_transition',      m => post_hook_any_transition(m, () => true),         { kind: 'post any transition',      phase: 'post', target: { scope: 'global' } } ],
      [ 'post_hook_entry',               m => post_hook_entry(m, 'b', () => true),             { kind: 'post entry',               phase: 'post', target: { scope: 'state', state: 'b' } } ],
      [ 'post_hook_exit',                m => post_hook_exit(m, 'a', () => true),              { kind: 'post exit',                phase: 'post', target: { scope: 'state', state: 'a' } } ],
      [ 'hook_pre_everything',           m => hook_pre_everything(m, () => true),              { kind: 'pre everything',           phase: 'pre',  target: { scope: 'global' } } ],
      [ 'hook_everything',               m => hook_everything(m, () => true),                  { kind: 'everything',               phase: 'pre',  target: { scope: 'global' } } ],
      [ 'hook_post_everything',          m => hook_post_everything(m, () => {}),        { kind: 'post everything',          phase: 'post', target: { scope: 'global' } } ],
      [ 'hook_pre_post_everything',      m => hook_pre_post_everything(m, () => {}),    { kind: 'pre post everything',      phase: 'post', target: { scope: 'global' } } ],
    ];

    test('there are 26 wrappers under test', () => {
      expect(wrappers.length).toBe(26);
    });

    test.each(wrappers)('%s', (_name, install, row) => {
      const m = sm`${FSL}`;
      expect(install(m)).toBe(m);
      expect(hook_registry(m)).toStrictEqual([row]);
      clear_state_timeout(m);
    });

  });



  // The kind-specific pre-hooks fire for their kind only.

  describe('kind-specific hooks fire for their own kind', () => {

    test('hook_standard_transition, hook_main_transition, hook_forced_transition each see one of three edges', () => {
      const m = sm`a -> b => c ~> a;`;
      const seen: string[] = [];
      hook_standard_transition(m, () => { seen.push('legal'); });
      hook_main_transition(m,     () => { seen.push('main'); });
      hook_forced_transition(m,   () => { seen.push('forced'); });
      expect(transition(m, 'b')).toBe(true);
      expect(transition(m, 'c')).toBe(true);
      expect(force_transition(m, 'a')).toBe(true);
      expect(seen).toStrictEqual(['legal', 'main', 'forced']);
    });

    test('hook_action, hook_global_action, and hook_any_action fire on the action they name', () => {
      const m = sm`a 'go' -> b 'go' -> c 'back' -> a;`;
      const seen: string[] = [];
      hook_action(m, 'a', 'b', 'go', () => { seen.push('named'); });
      hook_global_action(m, 'back',  () => { seen.push('global'); });
      hook_any_action(m,             () => { seen.push('any'); });
      expect(act(m, 'go')).toBe(true);
      expect(act(m, 'go')).toBe(true);
      expect(act(m, 'back')).toBe(true);
      expect(seen).toStrictEqual(['any', 'named', 'any', 'any', 'global']);
    });

    test('hook_entry and hook_exit bracket the state they name', () => {
      const m = sm`a -> b -> c;`;
      const seen: string[] = [];
      hook_exit(m, 'a',  () => { seen.push('exit a'); });
      hook_entry(m, 'b', () => { seen.push('enter b'); });
      hook_entry(m, 'c', () => { seen.push('enter c'); });
      transition(m, 'b');
      transition(m, 'c');
      expect(seen).toStrictEqual(['exit a', 'enter b', 'enter c']);
    });

    test('hook_after and hook_after_any do not fire on ordinary dispatch', () => {
      const m = sm`a after 1000 -> b; a -> c; c -> a;`;
      let calls = 0;
      hook_after(m, 'a', () => { calls += 1; });
      hook_after_any(m,  () => { calls += 1; });
      transition(m, 'c');
      transition(m, 'a');
      expect(calls).toBe(0);
      clear_state_timeout(m);
    });

  });



  describe('is_hook_rejection and is_hook_complex_result', () => {

    test('is_hook_rejection on every literal shape', () => {
      expect(is_hook_rejection(true)).toBe(false);
      expect(is_hook_rejection(undefined)).toBe(false);
      expect(is_hook_rejection(false)).toBe(true);
      expect(is_hook_rejection({ pass: true })).toBe(false);
      expect(is_hook_rejection({ pass: false })).toBe(true);
      expect(is_hook_rejection({ pass: false, data: { x: 1 } })).toBe(true);
      expect(() => is_hook_rejection(7 as any)).toThrow(TypeError);
    });

    test('is_hook_complex_result on literal inputs', () => {
      expect(is_hook_complex_result({ pass: true })).toBe(true);
      expect(is_hook_complex_result({ pass: false, data: { x: 1 } })).toBe(true);
      expect(is_hook_complex_result(true)).toBe(false);
      expect(is_hook_complex_result(false)).toBe(false);
      expect(is_hook_complex_result(null)).toBe(false);
      expect(is_hook_complex_result(undefined)).toBe(false);
      expect(is_hook_complex_result({ other: 'thing' })).toBe(false);
      expect(is_hook_complex_result({ pass: 'yes' })).toBe(false);
    });

  });



  // The class keeps every member as a delegate onto the family.

  describe('the class side', () => {

    test('the class wrappers install the same registry the functions do', () => {
      const via_class = sm`a 'go' -> b 'go' -> c;`;
      const via_fns   = sm`a 'go' -> b 'go' -> c;`;
      via_class.hook('a', 'b', () => true).hook_entry('c', () => true).post_hook_global_action('go', () => true);
      post_hook_global_action(hook_entry(hook(via_fns, 'a', 'b', () => true), 'c', () => true), 'go', () => true);
      expect(hook_registry(via_fns)).toStrictEqual(via_class.hook_registry());
      expect(via_class.hook_registry()).toStrictEqual([
        { kind: 'hook',               phase: 'pre',  target: { scope: 'edge', from: 'a', to: 'b' } },
        { kind: 'entry',              phase: 'pre',  target: { scope: 'state', state: 'c' } },
        { kind: 'post global action', phase: 'post', target: { scope: 'action', action: 'go' } },
      ]);
    });

    test('the class delegates for set_hook, remove_hook, hooks_on, has_hook, and state_has_hooks agree with the functions', () => {
      const via_class = sm`a -> b;`;
      const via_fns   = sm`a -> b;`;
      const fn = () => true;
      via_class.set_hook({ kind: 'exit', from: 'a', handler: fn });
      set_hook(via_fns, { kind: 'exit', from: 'a', handler: fn });
      expect(via_class.hooks_on('a')).toStrictEqual(hooks_on(via_fns, 'a'));
      expect(via_class.has_hook('a')).toBe(has_hook(via_fns, 'a'));
      expect(via_class.has_hook('a', 'post')).toBe(has_hook(via_fns, 'a', 'post'));
      expect(via_class.state_has_hooks('a')).toBe(state_has_hooks(via_fns, 'a'));
      expect(via_class.state_has_hooks('b')).toBe(state_has_hooks(via_fns, 'b'));
      expect(via_class.remove_hook({ kind: 'exit', from: 'a', handler: fn })).toBe(remove_hook(via_fns, { kind: 'exit', from: 'a', handler: fn }));
      expect(via_class.remove_hook({ kind: 'exit', from: 'a', handler: fn })).toBe(remove_hook(via_fns, { kind: 'exit', from: 'a', handler: fn }));
      expect(via_class.hook_registry()).toStrictEqual([]);
      expect(hook_registry(via_fns)).toStrictEqual([]);
    });

  });



});
