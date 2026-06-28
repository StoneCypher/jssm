
import { sm }            from '../jssm';
import { theme_mapping } from '../jssm_theme';
import type { JssmTheme, HookRegistryEntry } from '../jssm_types';




/*
 *  Uniform observational-hook registry + introspection (megaspec §12, → #1357).
 *
 *  Exercises hook_registry() (the generated uniform `(kind, target, phase)`
 *  projection), has_hook / hooks_on introspection, state_has_hooks, and the
 *  now-live `hooked_state` viz styling that those drive.
 */




describe('hook_registry — empty machine', () => {

  test('a machine with no hooks has an empty registry', () =>
    expect( sm`a -> b;`.hook_registry() ).toStrictEqual([]) );

  test('state_has_hooks is false everywhere before any hook is set', () => {
    const m = sm`a -> b;`;
    expect( m.state_has_hooks('a') ).toBe(false);
    expect( m.state_has_hooks('b') ).toBe(false);
  });

  test('has_hook is false for every query shape on an unhooked machine', () => {
    const m = sm`a 'go' -> b;`;
    expect( m.has_hook('a') ).toBe(false);
    expect( m.has_hook({ from: 'a', to: 'b' }) ).toBe(false);
    expect( m.has_hook({ from: 'a', to: 'b', action: 'go' }) ).toBe(false);
    expect( m.has_hook({ action: 'go' }) ).toBe(false);
  });

  test('hooks_on returns empty for every query shape on an unhooked machine', () => {
    const m = sm`a 'go' -> b;`;
    expect( m.hooks_on('a') ).toStrictEqual([]);
    expect( m.hooks_on({ from: 'a', to: 'b' }) ).toStrictEqual([]);
    expect( m.hooks_on({ action: 'go' }) ).toStrictEqual([]);
  });

});




describe('hook_registry — every pre-phase kind is enumerated uniformly', () => {

  test('edge hook becomes an edge-scoped pre entry', () => {
    const m = sm`a -> b;`;
    m.hook('a', 'b', () => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'hook', phase: 'pre', target: { scope: 'edge', from: 'a', to: 'b' } }
    ]);
  });

  test('named (action) hook becomes an edge-scoped pre entry carrying the action', () => {
    const m = sm`a 'go' -> b;`;
    m.hook_action('a', 'b', 'go', () => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'named', phase: 'pre', target: { scope: 'edge', from: 'a', to: 'b', action: 'go' } }
    ]);
  });

  test('entry hook becomes a state-scoped pre entry', () => {
    const m = sm`a -> b;`;
    m.hook_entry('b', () => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'entry', phase: 'pre', target: { scope: 'state', state: 'b' } }
    ]);
  });

  test('exit hook becomes a state-scoped pre entry', () => {
    const m = sm`a -> b;`;
    m.hook_exit('a', () => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'exit', phase: 'pre', target: { scope: 'state', state: 'a' } }
    ]);
  });

  test('after hook becomes a state-scoped pre entry', () => {
    const m = sm`a -> b;`;
    m.hook_after('a', () => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'after', phase: 'pre', target: { scope: 'state', state: 'a' } }
    ]);
  });

  test('global-action hook becomes an action-scoped pre entry', () => {
    const m = sm`a 'go' -> b;`;
    m.hook_global_action('go', () => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'global action', phase: 'pre', target: { scope: 'action', action: 'go' } }
    ]);
  });

  test('any-action hook becomes a global-scoped pre entry', () => {
    const m = sm`a 'go' -> b;`;
    m.hook_any_action(() => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'any action', phase: 'pre', target: { scope: 'global' } }
    ]);
  });

  test('standard-transition hook becomes a global-scoped pre entry', () => {
    const m = sm`a -> b;`;
    m.hook_standard_transition(() => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'standard transition', phase: 'pre', target: { scope: 'global' } }
    ]);
  });

  test('main-transition hook becomes a global-scoped pre entry', () => {
    const m = sm`a => b;`;
    m.hook_main_transition(() => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'main transition', phase: 'pre', target: { scope: 'global' } }
    ]);
  });

  test('forced-transition hook becomes a global-scoped pre entry', () => {
    const m = sm`a ~> b;`;
    m.hook_forced_transition(() => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'forced transition', phase: 'pre', target: { scope: 'global' } }
    ]);
  });

  test('any-transition hook becomes a global-scoped pre entry', () => {
    const m = sm`a -> b;`;
    m.hook_any_transition(() => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'any transition', phase: 'pre', target: { scope: 'global' } }
    ]);
  });

  test('pre-everything hook becomes a global-scoped pre entry', () => {
    const m = sm`a -> b;`;
    m.hook_pre_everything(() => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'pre everything', phase: 'pre', target: { scope: 'global' } }
    ]);
  });

  test('everything hook becomes a global-scoped pre entry', () => {
    const m = sm`a -> b;`;
    m.hook_everything(() => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'everything', phase: 'pre', target: { scope: 'global' } }
    ]);
  });

});




describe('hook_registry — every post-phase kind is enumerated uniformly', () => {

  test('post edge hook becomes an edge-scoped post entry', () => {
    const m = sm`a -> b;`;
    m.post_hook('a', 'b', () => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'post hook', phase: 'post', target: { scope: 'edge', from: 'a', to: 'b' } }
    ]);
  });

  test('post named hook becomes an edge-scoped post entry carrying the action', () => {
    const m = sm`a 'go' -> b;`;
    m.post_hook_action('a', 'b', 'go', () => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'post named', phase: 'post', target: { scope: 'edge', from: 'a', to: 'b', action: 'go' } }
    ]);
  });

  test('post entry hook becomes a state-scoped post entry', () => {
    const m = sm`a -> b;`;
    m.post_hook_entry('b', () => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'post entry', phase: 'post', target: { scope: 'state', state: 'b' } }
    ]);
  });

  test('post exit hook becomes a state-scoped post entry', () => {
    const m = sm`a -> b;`;
    m.post_hook_exit('a', () => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'post exit', phase: 'post', target: { scope: 'state', state: 'a' } }
    ]);
  });

  test('post global-action hook becomes an action-scoped post entry', () => {
    const m = sm`a 'go' -> b;`;
    m.post_hook_global_action('go', () => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'post global action', phase: 'post', target: { scope: 'action', action: 'go' } }
    ]);
  });

  test('post any-action hook becomes a global-scoped post entry', () => {
    const m = sm`a 'go' -> b;`;
    m.post_hook_any_action(() => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'post any action', phase: 'post', target: { scope: 'global' } }
    ]);
  });

  test('post standard-transition hook becomes a global-scoped post entry', () => {
    const m = sm`a -> b;`;
    m.post_hook_standard_transition(() => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'post standard transition', phase: 'post', target: { scope: 'global' } }
    ]);
  });

  test('post main-transition hook becomes a global-scoped post entry', () => {
    const m = sm`a => b;`;
    m.post_hook_main_transition(() => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'post main transition', phase: 'post', target: { scope: 'global' } }
    ]);
  });

  test('post forced-transition hook becomes a global-scoped post entry', () => {
    const m = sm`a ~> b;`;
    m.post_hook_forced_transition(() => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'post forced transition', phase: 'post', target: { scope: 'global' } }
    ]);
  });

  test('post any-transition hook becomes a global-scoped post entry', () => {
    const m = sm`a -> b;`;
    m.post_hook_any_transition(() => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'post any transition', phase: 'post', target: { scope: 'global' } }
    ]);
  });

  test('pre-post-everything hook becomes a global-scoped post entry', () => {
    const m = sm`a -> b;`;
    m.hook_pre_post_everything(() => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'pre post everything', phase: 'post', target: { scope: 'global' } }
    ]);
  });

  test('post-everything hook becomes a global-scoped post entry', () => {
    const m = sm`a -> b;`;
    m.hook_post_everything(() => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'post everything', phase: 'post', target: { scope: 'global' } }
    ]);
  });

});




describe('hook_registry — combined and multi-entry walks', () => {

  test('two edge hooks on the same from-state both enumerate', () => {
    const m = sm`a -> b; a -> c;`;
    m.hook('a', 'b', () => true);
    m.hook('a', 'c', () => true);
    const reg = m.hook_registry();
    expect(reg.length).toBe(2);
    expect(reg.every(e => e.kind === 'hook' && e.phase === 'pre')).toBe(true);
  });

  test('pre and post tables are both walked, pre first', () => {
    const m = sm`a -> b;`;
    m.post_hook('a', 'b', () => true);
    m.hook('a', 'b', () => true);
    const phases = m.hook_registry().map(e => e.phase);
    expect(phases).toStrictEqual(['pre', 'post']);
  });

});




describe('hooks_on — query shapes', () => {

  test('state query matches an entry hook on that state', () => {
    const m = sm`a -> b;`;
    m.hook_entry('b', () => true);
    expect( m.hooks_on('b') ).toStrictEqual([
      { kind: 'entry', phase: 'pre', target: { scope: 'state', state: 'b' } }
    ]);
    expect( m.hooks_on('a') ).toStrictEqual([]);
  });

  test('state query matches an edge hook whose from is that state', () => {
    const m = sm`a -> b;`;
    m.hook('a', 'b', () => true);
    expect( m.hooks_on('a').length ).toBe(1);
  });

  test('state query matches an edge hook whose to is that state', () => {
    const m = sm`a -> b;`;
    m.hook('a', 'b', () => true);
    expect( m.hooks_on('b').length ).toBe(1);
  });

  test('state query does not match an unrelated edge hook', () => {
    const m = sm`a -> b; c -> d;`;
    m.hook('a', 'b', () => true);
    expect( m.hooks_on('c') ).toStrictEqual([]);
  });

  test('state query does not match an action-scoped or global-scoped hook', () => {
    const m = sm`a 'go' -> b;`;
    m.hook_global_action('go', () => true);
    m.hook_any_transition(() => true);
    expect( m.hooks_on('a') ).toStrictEqual([]);
  });

  test('edge query matches the edge hook on that transition', () => {
    const m = sm`a -> b;`;
    m.hook('a', 'b', () => true);
    expect( m.hooks_on({ from: 'a', to: 'b' }).length ).toBe(1);
  });

  test('edge query with mismatched to does not match', () => {
    const m = sm`a -> b; a -> c;`;
    m.hook('a', 'b', () => true);
    expect( m.hooks_on({ from: 'a', to: 'c' }) ).toStrictEqual([]);
  });

  test('edge query with mismatched from does not match', () => {
    const m = sm`a -> b; z -> b;`;
    m.hook('a', 'b', () => true);
    expect( m.hooks_on({ from: 'z', to: 'b' }) ).toStrictEqual([]);
  });

  test('edge query ignores the entry action when none is supplied', () => {
    const m = sm`a 'go' -> b;`;
    m.hook_action('a', 'b', 'go', () => true);
    expect( m.hooks_on({ from: 'a', to: 'b' }).length ).toBe(1);
  });

  test('edge query with action matches only the same action', () => {
    const m = sm`a 'go' -> b;`;
    m.hook_action('a', 'b', 'go', () => true);
    expect( m.hooks_on({ from: 'a', to: 'b', action: 'go' }).length ).toBe(1);
    expect( m.hooks_on({ from: 'a', to: 'b', action: 'stop' }) ).toStrictEqual([]);
  });

  test('edge query does not match a non-edge (state-scoped) hook', () => {
    const m = sm`a -> b;`;
    m.hook_entry('b', () => true);
    expect( m.hooks_on({ from: 'a', to: 'b' }) ).toStrictEqual([]);
  });

  test('action query matches a global-action hook', () => {
    const m = sm`a 'go' -> b;`;
    m.hook_global_action('go', () => true);
    expect( m.hooks_on({ action: 'go' }).length ).toBe(1);
  });

  test('action query matches a named-edge hook carrying that action', () => {
    const m = sm`a 'go' -> b;`;
    m.hook_action('a', 'b', 'go', () => true);
    expect( m.hooks_on({ action: 'go' }).length ).toBe(1);
  });

  test('action query does not match a different action', () => {
    const m = sm`a 'go' -> b;`;
    m.hook_global_action('go', () => true);
    expect( m.hooks_on({ action: 'stop' }) ).toStrictEqual([]);
  });

  test('action query does not match a state-scoped or global-scoped hook', () => {
    const m = sm`a -> b;`;
    m.hook_entry('b', () => true);
    m.hook_any_transition(() => true);
    expect( m.hooks_on({ action: 'go' }) ).toStrictEqual([]);
  });

});




describe('has_hook — presence and phase narrowing', () => {

  test('has_hook is true when a matching hook exists, no phase given', () => {
    const m = sm`a -> b;`;
    m.hook_entry('b', () => true);
    expect( m.has_hook('b') ).toBe(true);
  });

  test('has_hook narrows to the matching phase', () => {
    const m = sm`a -> b;`;
    m.hook_entry('b', () => true);
    expect( m.has_hook('b', 'pre') ).toBe(true);
    expect( m.has_hook('b', 'post') ).toBe(false);
  });

  test('has_hook with phase finds a post hook', () => {
    const m = sm`a -> b;`;
    m.post_hook_entry('b', () => true);
    expect( m.has_hook('b', 'post') ).toBe(true);
    expect( m.has_hook('b', 'pre') ).toBe(false);
  });

  test('has_hook is false for an unmatched target', () => {
    const m = sm`a -> b;`;
    m.hook_entry('b', () => true);
    expect( m.has_hook('a') ).toBe(false);
  });

});




describe('state_has_hooks — predicate behind hooked styling', () => {

  test('is true for a state an entry hook is bound to', () => {
    const m = sm`a -> b;`;
    m.hook_entry('b', () => true);
    expect( m.state_has_hooks('b') ).toBe(true);
    expect( m.state_has_hooks('a') ).toBe(false);
  });

  test('is true for both endpoints of an edge hook', () => {
    const m = sm`a -> b;`;
    m.hook('a', 'b', () => true);
    expect( m.state_has_hooks('a') ).toBe(true);
    expect( m.state_has_hooks('b') ).toBe(true);
  });

  test('a global-only hook marks no specific state', () => {
    const m = sm`a -> b;`;
    m.hook_any_transition(() => true);
    expect( m.state_has_hooks('a') ).toBe(false);
    expect( m.state_has_hooks('b') ).toBe(false);
  });

  test('a post hook also marks its state (post tables are walked too)', () => {
    const m = sm`a -> b;`;
    m.post_hook_exit('a', () => true);
    expect( m.state_has_hooks('a') ).toBe(true);
  });

});




describe('hooked_state styling is now live (megaspec §12)', () => {

  test('an unhooked state keeps its base (non-hooked) shape', () => {
    const m = sm`a -> b -> c;`;
    expect( m.style_for('b').shape ).toBe('rectangle');
  });

  test('a hooked state picks up the base hooked shape', () => {
    // base_theme.hooked sets shape: 'component'
    const m = sm`a -> b -> c;`;
    m.hook_entry('b', () => true);
    expect( m.style_for('b').shape ).toBe('component');
  });

  test('an edge-hooked state also picks up hooked styling on its from-state', () => {
    const m = sm`z -> a -> b;`;
    m.hook('a', 'b', () => true);
    expect( m.style_for('a').shape ).toBe('component');
  });

  describe('theme layering of the hooked sub-style', () => {

    // A theme that supplies a `.hooked` sub-style exercises the TRUE arm of the
    // `if (theme.hooked)` guard; a sparse theme without one exercises the FALSE
    // arm. theme_mapping.set is the documented registration mechanism.

    const hooked_theme_name = 'spec-hooked-theme';
    const sparse_theme_name = 'spec-hookless-theme';

    const hooked_theme: JssmTheme = { name: hooked_theme_name, hooked: { backgroundColor: 'hotpink' } };
    const sparse_theme: JssmTheme = { name: sparse_theme_name };

    beforeAll(() => {
      theme_mapping.set(hooked_theme_name as any, hooked_theme as any);
      theme_mapping.set(sparse_theme_name as any, sparse_theme as any);
    });

    afterAll(() => {
      theme_mapping.delete(hooked_theme_name as any);
      theme_mapping.delete(sparse_theme_name as any);
    });

    test('a theme with a .hooked sub-style contributes it to a hooked state', () => {
      // 'b' is a plain mid-graph state (not start/active/terminal), so the
      // hooked layer's backgroundColor survives compositing.
      const m = sm`a -> b -> c;`;
      m.themes = [hooked_theme_name] as any;
      m.hook_entry('b', () => true);
      expect( m.style_for('b').backgroundColor ).toBe('hotpink');
    });

    test('a sparse theme omitting .hooked is skipped for a hooked state', () => {
      const m = sm`a -> b -> c;`;
      m.themes = [sparse_theme_name] as any;
      m.hook_entry('b', () => true);
      // No throw, and the hooked layer still resolves from the base theme.
      expect( () => m.style_for('b') ).not.toThrow();
      expect( m.style_for('b').shape ).toBe('component');
    });

  });

});




describe('hook_registry — type-surface sanity', () => {

  test('every entry carries kind, phase, and a scoped target', () => {
    const m = sm`a 'go' -> b;`;
    m.hook_entry('b', () => true);
    m.hook_global_action('go', () => true);
    m.hook_any_transition(() => true);
    m.post_hook('a', 'b', () => true);

    const reg: HookRegistryEntry[] = m.hook_registry();
    const scopes = reg.map(e => e.target.scope).sort();
    expect(scopes).toStrictEqual(['action', 'edge', 'global', 'state']);
    expect(reg.every(e => e.phase === 'pre' || e.phase === 'post')).toBe(true);
  });

});




describe('hook_registry — interned/pair-keyed storage decodes back to names', () => {

  // main keys the hot-path hook tables by interned ids and pair_key(from,to).
  // These tests would fail if the registry leaked integers instead of names —
  // especially for states/actions interned after the first (id !== 0).

  test('an edge hook on later-interned states reports the real names, not ids', () => {
    const m = sm`a -> b; b -> c;`;
    m.hook('b', 'c', () => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'hook', phase: 'pre', target: { scope: 'edge', from: 'b', to: 'c' } }
    ]);
  });

  test('a named-edge hook reports decoded from/to and the action name', () => {
    const m = sm`a 'go' -> b; b 'stop' -> c;`;
    m.hook_action('b', 'c', 'stop', () => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'named', phase: 'pre', target: { scope: 'edge', from: 'b', to: 'c', action: 'stop' } }
    ]);
  });

});




describe('hook_registry — FSL boundary hooks (group and state subjects)', () => {

  test('a group with enter+exit boundary hooks yields two group-scoped post rows', () => {
    const m = sm`&g : [a]; a -> b; on enter &g do 'log_in'; on exit &g do 'log_out';`;
    const reg = m.hook_registry();
    expect(reg).toContainEqual({ kind: 'group enter', phase: 'post', target: { scope: 'group', group: 'g' } });
    expect(reg).toContainEqual({ kind: 'group exit',  phase: 'post', target: { scope: 'group', group: 'g' } });
  });

  test('a lone group enter hook yields only the enter row', () => {
    const m = sm`&g : [a]; a -> b; on enter &g do 'only_in';`;
    const groupRows = m.hook_registry().filter(e => e.target.scope === 'group');
    expect(groupRows).toStrictEqual([
      { kind: 'group enter', phase: 'post', target: { scope: 'group', group: 'g' } }
    ]);
  });

  test('a state with enter+exit boundary hooks yields two state-scoped post rows', () => {
    const m = sm`a -> b; on enter a do 'wake'; on exit a do 'sleep';`;
    const reg = m.hook_registry();
    expect(reg).toContainEqual({ kind: 'state enter', phase: 'post', target: { scope: 'state', state: 'a' } });
    expect(reg).toContainEqual({ kind: 'state exit',  phase: 'post', target: { scope: 'state', state: 'a' } });
  });

});




describe('hooks_on / state_has_hooks — boundary hooks', () => {

  test('hooks_on({ group }) matches that group’s boundary hooks only', () => {
    const m = sm`&g : [a]; &h : [a]; a -> b; on enter &g do 'gi'; on enter &h do 'hi';`;
    // a non-group hook (state-scoped) and a different group must both be excluded
    m.hook_entry('b', () => true);
    expect( m.hooks_on({ group: 'g' }) ).toStrictEqual([
      { kind: 'group enter', phase: 'post', target: { scope: 'group', group: 'g' } }
    ]);
  });

  test('a state-boundary hook makes the state count as hooked', () => {
    const m = sm`a -> b; on exit a do 'sleep';`;
    expect( m.state_has_hooks('a') ).toBe(true);
    expect( m.hooks_on('a') ).toContainEqual(
      { kind: 'state exit', phase: 'post', target: { scope: 'state', state: 'a' } }
    );
  });

  test('a group-boundary hook does NOT make member states count as hooked', () => {
    const m = sm`&g : [a]; a -> b; on enter &g do 'gi';`;
    // group-only decision: member 'a' is not auto-hooked by its group's hook
    expect( m.state_has_hooks('a') ).toBe(false);
    expect( m.hooks_on('a') ).toStrictEqual([]);
  });

  test('a state-boundary hook drives the live hooked_state styling', () => {
    const m = sm`a -> b -> c; on exit b do 'x';`;
    expect( m.style_for('b').shape ).toBe('component');
  });

});




describe('hooked styling — config cache stays coherent when hooks change', () => {

  test('a hook added AFTER style_for was already called still styles the state', () => {
    const m = sm`a -> b -> c;`;
    // prime the static config cache for a non-active state while it is unhooked
    expect( m.style_for('b').shape ).toBe('rectangle');
    // now hook it — the cache must be invalidated so the hooked layer appears
    m.hook_entry('b', () => true);
    expect( m.style_for('b').shape ).toBe('component');
  });

  test('removing the last hook reverts the hooked styling', () => {
    const m = sm`a -> b -> c;`;
    const fn = () => true;
    m.set_hook({ kind: 'entry', to: 'b', handler: fn } as any);
    expect( m.style_for('b').shape ).toBe('component');
    m.remove_hook({ kind: 'entry', to: 'b', handler: fn } as any);
    expect( m.style_for('b').shape ).toBe('rectangle');
  });

});
