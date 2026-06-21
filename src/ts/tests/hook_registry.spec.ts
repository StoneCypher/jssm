
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
