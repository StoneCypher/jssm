
 

/**
 * Compile-pass tests for the "Overlapping State Groups" feature (Task 2b-i):
 * the group registry, transitive-membership resolution, the group→group
 * DAG/cycle check, transition-reference resolution, and group-as-fan-out-
 * TARGET expansion.
 *
 * These exercise the real `compile()`/`parse()` pipeline plus the exported
 * registry helpers (`build_group_registry`, `group_registry_cycle_check`,
 * `transitive_members`).  No fakes, no snapshots — edges are asserted as the
 * `{ from, to, kind, ... }` shape `compile().transitions` produces (matching
 * `array_transitions.spec.ts`), and registry shape is asserted structurally.
 *
 * Out of scope (Task 2b-ii): group-as-source expansion, group metadata,
 * hooks, depth-specificity conflict resolution.  Reference VALIDATION of a
 * group used as a source IS in scope and is tested here.
 */

import * as jssm from '../jssm';

import {
  build_group_registry,
  group_registry_cycle_check,
  transitive_members,
  validate_group_members,
  membership_distance
} from '../jssm_compiler';

import { JssmError } from '../jssm_error';

import type { JssmGroupRegistry } from '../jssm_types';





// A registry-equality helper: registries are ordered Maps, so compare the
// entries() arrays (which preserve insertion + member order).
function registry_entries(reg: JssmGroupRegistry): Array<[string, unknown]> {
  return [...reg.entries()];
}





describe('overlapping state groups — registry build (ordered direct members)', () => {


  test('`&g : [a b c];` registers ordered state members', () => {
    const reg = build_group_registry(jssm.parse('&g : [a b c];'));
    expect(registry_entries(reg)).toEqual([
      ['g', [
        { kind: 'state', name: 'a' },
        { kind: 'state', name: 'b' },
        { kind: 'state', name: 'c' }
      ]]
    ]);
  });


  test('`&outer : [&inner x];` keeps the nested-group member as a group member', () => {
    const reg = build_group_registry(jssm.parse('&inner : [p]; &outer : [&inner x];'));
    expect(reg.get('outer')).toEqual([
      { kind: 'group', name: 'inner', mode: 'nest' },
      { kind: 'state', name: 'x' }
    ]);
  });


  test('`&outer : [...&inner x];` keeps the spread-group member as a spread member', () => {
    const reg = build_group_registry(jssm.parse('&inner : [p]; &outer : [...&inner x];'));
    expect(reg.get('outer')).toEqual([
      { kind: 'group', name: 'inner', mode: 'spread' },
      { kind: 'state', name: 'x' }
    ]);
  });


  // build_group_registry must skip non-`named_list` nodes (transitions);
  // this drives the `key !== 'named_list'` branch.
  test('registry ignores transition nodes mixed in with declarations', () => {
    const reg = build_group_registry(jssm.parse('&g : [a b]; foo -> a;'));
    expect([...reg.keys()]).toEqual(['g']);
  });


  // Redeclaring a group name is a compile error.
  test('redeclaring a group name throws JssmError', () => {
    expect(() => build_group_registry(jssm.parse('&g : [a]; &g : [b];')))
      .toThrow(JssmError);
    expect(() => build_group_registry(jssm.parse('&g : [a]; &g : [b];')))
      .toThrow(/redeclare group: &g/);
  });


});





describe('overlapping state groups — transitive_members resolution', () => {


  test('nested group splices in at its position: outer → [a, b, c]', () => {
    const reg = build_group_registry(jssm.parse('&inner : [a b]; &outer : [&inner c];'));
    expect(transitive_members(reg, 'outer', new Map())).toEqual(['a', 'b', 'c']);
  });


  test('spread group resolves to the same states as the nested form', () => {
    const reg = build_group_registry(jssm.parse('&inner : [a b]; &outer : [...&inner c];'));
    expect(transitive_members(reg, 'outer', new Map())).toEqual(['a', 'b', 'c']);
  });


  test('a flat group resolves to its own states', () => {
    const reg = build_group_registry(jssm.parse('&g : [a b];'));
    expect(transitive_members(reg, 'g', new Map())).toEqual(['a', 'b']);
  });


  // Memoization: a sub-group shared by two parents resolves once.  The
  // second visit returns the cached array — same reference — exercising the
  // `cached !== undefined` (memo-hit) branch.
  test('a shared sub-group is resolved once and cached (memo hit)', () => {
    const reg  = build_group_registry(jssm.parse('&inner : [a b]; &one : [&inner]; &two : [&inner];'));
    const memo = new Map<string, string[]>();

    const one_first  = transitive_members(reg, 'one', memo);
    const inner_seen = memo.get('inner');
    const two_first  = transitive_members(reg, 'two', memo);

    expect(one_first).toEqual(['a', 'b']);
    expect(two_first).toEqual(['a', 'b']);
    // `two` reuses the already-cached `inner` array (identity, not just value).
    expect(memo.get('inner')).toBe(inner_seen);
  });


  // Re-asking for the same top-level group returns the cached result,
  // covering the memo-hit branch for the requested group itself.
  test('re-requesting a group hits the memo for the group itself', () => {
    const reg  = build_group_registry(jssm.parse('&g : [a b];'));
    const memo = new Map<string, string[]>();
    const first  = transitive_members(reg, 'g', memo);
    const second = transitive_members(reg, 'g', memo);
    expect(second).toBe(first);
  });


  // An undeclared sub-group contributes no states (the `?? []` nullish
  // branch in transitive_members).  Membership refs are not validated in
  // 2b-i; only transition refs are.
  test('a member group with no declaration contributes no states', () => {
    const reg = build_group_registry(jssm.parse('&outer : [&missing x];'));
    expect(transitive_members(reg, 'outer', new Map())).toEqual(['x']);
  });


});





describe('overlapping state groups — group→group cycle check', () => {


  test('a direct cycle `&a:[&b]; &b:[&a];` throws JssmError', () => {
    const reg = build_group_registry(jssm.parse('&a : [&b]; &b : [&a];'));
    expect(() => group_registry_cycle_check(reg)).toThrow(JssmError);
    expect(() => group_registry_cycle_check(reg)).toThrow(/cycle detected/);
  });


  test('a spread cycle is rejected too (spread members are edges)', () => {
    const reg = build_group_registry(jssm.parse('&a : [...&b]; &b : [...&a];'));
    expect(() => group_registry_cycle_check(reg)).toThrow(/cycle detected/);
  });


  test('a self-referential group `&a:[&a];` throws', () => {
    const reg = build_group_registry(jssm.parse('&a : [&a];'));
    expect(() => group_registry_cycle_check(reg)).toThrow(/cycle detected/);
  });


  // Acyclic diamond: a sub-group reached from two parents is marked visited
  // and short-circuits on the second visit (`visited.has` early return).
  test('an acyclic diamond passes (sub-group visited only once)', () => {
    const reg = build_group_registry(
      jssm.parse('&leaf : [z]; &one : [&leaf]; &two : [&leaf]; &top : [&one &two];')
    );
    expect(() => group_registry_cycle_check(reg)).not.toThrow();
  });


  // A pure state-only registry has no group→group edges (drives the
  // `member.kind === 'group'` false / state branch) and passes.
  test('a state-only registry has no cycle', () => {
    const reg = build_group_registry(jssm.parse('&g : [a b c];'));
    expect(() => group_registry_cycle_check(reg)).not.toThrow();
  });


  // A group whose member references an undeclared sub-group: the cycle walk
  // hits the `?? []` nullish branch and still passes.
  test('a member referencing an undeclared sub-group does not cycle', () => {
    const reg = build_group_registry(jssm.parse('&outer : [&missing];'));
    expect(() => group_registry_cycle_check(reg)).not.toThrow();
  });


});





describe('overlapping state groups — reference resolution', () => {


  test('an unresolved group used as a TARGET throws JssmError', () => {
    expect(() => jssm.compile(jssm.parse('foo -> &nope;'))).toThrow(JssmError);
    expect(() => jssm.compile(jssm.parse('foo -> &nope;'))).toThrow(/Unresolved group reference: &nope/);
  });


  test('an unresolved group used as a SOURCE throws JssmError (validation only)', () => {
    expect(() => jssm.compile(jssm.parse("&nope 'x' -> y;"))).toThrow(/Unresolved group reference: &nope/);
  });


  test('a forward reference resolves (group declared after its target use)', () => {
    const cfg = jssm.compile(jssm.parse('foo -> &g; &g : [a b];'));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'foo', to: 'a', kind: 'legal' },
      { main_path: false, forced_only: false, from: 'foo', to: 'b', kind: 'legal' }
    ]);
  });


  test('a plain `&g : [a b];` declaration with no references compiles cleanly', () => {
    const cfg = jssm.compile(jssm.parse('&g : [a b]; foo -> a;'));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'foo', to: 'a', kind: 'legal' }
    ]);
    // The registry rides along on the compiled config.
    expect(cfg.group_registry instanceof Map).toBe(true);
    expect(cfg.group_registry?.get('g')).toEqual([
      { kind: 'state', name: 'a' },
      { kind: 'state', name: 'b' }
    ]);
  });


});





describe('overlapping state groups — group-as-fan-out-TARGET expansion', () => {


  test('`&g:[a b]; foo -> &g;` fans out to foo->a and foo->b', () => {
    const cfg = jssm.compile(jssm.parse('&g : [a b]; foo -> &g;'));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'foo', to: 'a', kind: 'legal' },
      { main_path: false, forced_only: false, from: 'foo', to: 'b', kind: 'legal' }
    ]);
  });


  test('a nested group target fans out through transitive members', () => {
    const cfg = jssm.compile(jssm.parse('&inner : [a b]; &outer : [&inner c]; foo -> &outer;'));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'foo', to: 'a', kind: 'legal' },
      { main_path: false, forced_only: false, from: 'foo', to: 'b', kind: 'legal' },
      { main_path: false, forced_only: false, from: 'foo', to: 'c', kind: 'legal' }
    ]);
  });


  test('a spread group target fans out to the same states as the nested form', () => {
    const cfg = jssm.compile(jssm.parse('&inner : [a b]; &outer : [...&inner c]; foo -> &outer;'));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'foo', to: 'a', kind: 'legal' },
      { main_path: false, forced_only: false, from: 'foo', to: 'b', kind: 'legal' },
      { main_path: false, forced_only: false, from: 'foo', to: 'c', kind: 'legal' }
    ]);
  });


  // A group target in the MIDDLE of a chain fans out on the prior arrow's
  // right side; this exercises the multi-link `for (let link = node.se; ...)`
  // walk past more than one arrow.
  test('a group target mid-chain fans out, then continues the chain', () => {
    const cfg = jssm.compile(jssm.parse('&g : [x y]; a -> &g -> b;'));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'a', to: 'x', kind: 'legal' },
      { main_path: false, forced_only: false, from: 'a', to: 'y', kind: 'legal' },
      { main_path: false, forced_only: false, from: 'x', to: 'b', kind: 'legal' },
      { main_path: false, forced_only: false, from: 'y', to: 'b', kind: 'legal' }
    ]);
  });


});





describe('overlapping state groups — backward compatibility', () => {


  // An inline list target must fan out identically to a group target.
  test('inline `foo -> [a b];` still fans out to foo->a, foo->b', () => {
    const cfg = jssm.compile(jssm.parse('foo -> [a b];'));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'foo', to: 'a', kind: 'legal' },
      { main_path: false, forced_only: false, from: 'foo', to: 'b', kind: 'legal' }
    ]);
  });


  // A group-free machine carries no `group_registry` (the `size` guard's
  // false branch).
  test('a group-free machine carries no group_registry', () => {
    const cfg = jssm.compile(jssm.parse('a -> b;'));
    expect(cfg.group_registry).toBeUndefined();
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'a', to: 'b', kind: 'legal' }
    ]);
  });


  // A plain transition target (a string, not an object) and an inline list
  // target (an object — an Array — whose `.key` is not `'group_ref'`) both
  // pass through resolution untouched, exercising the `is_group_ref` false
  // branches alongside a declared group so the resolution pass actually runs.
  test('plain and inline-list targets are untouched when a group is also present', () => {
    const cfg = jssm.compile(jssm.parse('&g : [a b]; p -> q; r -> [s t];'));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'p', to: 'q', kind: 'legal' },
      { main_path: false, forced_only: false, from: 'r', to: 's', kind: 'legal' },
      { main_path: false, forced_only: false, from: 'r', to: 't', kind: 'legal' }
    ]);
  });


});





describe('overlapping state groups — group-as-SOURCE expansion (Task 2b-ii)', () => {


  // The core 2b-ii case: a group used as a transition source fans out to one
  // edge per transitive member, preserving the action and target.  Crucially
  // the emitted edges are PLAIN — the transient conflict-resolution tags are
  // stripped — so they are byte-identical to hand-authored `a 'x' -> y;`.
  test('`&g:[a b]; &g \'x\' -> y;` expands to a/b sourced edges with the action', () => {
    const cfg = jssm.compile(jssm.parse("&g : [a b]; &g 'x' -> y;"));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'a', to: 'y', kind: 'legal', action: 'x' },
      { main_path: false, forced_only: false, from: 'b', to: 'y', kind: 'legal', action: 'x' }
    ]);
  });


  // A group source whose membership is nested fans out through transitive
  // members, in declaration order.
  test('a nested group source fans out through transitive members', () => {
    const cfg = jssm.compile(jssm.parse("&inner : [a b]; &outer : [&inner c]; &outer 'go' -> done;"));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'a', to: 'done', kind: 'legal', action: 'go' },
      { main_path: false, forced_only: false, from: 'b', to: 'done', kind: 'legal', action: 'go' },
      { main_path: false, forced_only: false, from: 'c', to: 'done', kind: 'legal', action: 'go' }
    ]);
  });


  // A group source whose members come from a SPREAD sub-group fans out the
  // same way (spread and nest resolve to the same member set).
  test('a spread group source fans out through transitive members', () => {
    const cfg = jssm.compile(jssm.parse("&inner : [a b]; &outer : [...&inner c]; &outer 'go' -> done;"));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'a', to: 'done', kind: 'legal', action: 'go' },
      { main_path: false, forced_only: false, from: 'b', to: 'done', kind: 'legal', action: 'go' },
      { main_path: false, forced_only: false, from: 'c', to: 'done', kind: 'legal', action: 'go' }
    ]);
  });


  // The sibling edges of ONE group source's plain-target fan-out share a
  // declaration and never override each other on (state, action): a group
  // source to a single target gives exactly one edge per member, no warns.
  test('a single group-source declaration is never self-overridden', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cfg  = jssm.compile(jssm.parse("&g : [a b]; &g 'x' -> y;"));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'a', to: 'y', kind: 'legal', action: 'x' },
      { main_path: false, forced_only: false, from: 'b', to: 'y', kind: 'legal', action: 'x' }
    ]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });


});





describe('overlapping state groups — depth-specificity conflict resolution (Task 2b-ii)', () => {


  // Rule 1: a state-specific transition (authored directly, via no group)
  // always beats a group-sourced one for the same (state, action).  The
  // group edge is dropped silently — overriding a group with a state is the
  // documented case, so NO warning fires.
  test('a state-specific transition beats a group-sourced one (state wins, no warn)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cfg  = jssm.compile(jssm.parse("&g : [a]; &g 'x' -> b; a 'x' -> c;"));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'a', to: 'c', kind: 'legal', action: 'x' }
    ]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });


  // The state-specific override survives regardless of declaration order
  // (group declared AFTER the state-specific edge): specificity, not order,
  // decides state-vs-group.
  test('state wins even when the group source is declared after it', () => {
    const cfg = jssm.compile(jssm.parse("&g : [a]; a 'x' -> c; &g 'x' -> b;"));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'a', to: 'c', kind: 'legal', action: 'x' }
    ]);
  });


  // Rule 2 (the media-player worked example): for `normal`, &Playing is at
  // distance 1 and &Active at distance 2 (via Playing), so the nearer
  // &Playing wins and the surviving edge targets `buffering`.  A
  // group-vs-group override warns, naming both groups and the state.
  test('the inner (nearer) group wins: Playing(d1) beats Active(d2) for normal', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cfg  = jssm.compile(jssm.parse(
      "&Playing : [normal]; &Active : [&Playing]; &Playing 'error' -> buffering; &Active 'error' -> stopped;"
    ));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'normal', to: 'buffering', kind: 'legal', action: 'error' }
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = String(warn.mock.calls[0][0]);
    expect(msg).toContain('&Active');     // the overridden (farther) group
    expect(msg).toContain('&Playing');    // the overriding (nearer) group
    expect(msg).toContain('normal');      // the shared source state
    warn.mockRestore();
  });


  // Adding a state-specific override to the media-player example: it beats
  // BOTH group edges, so the surviving edge targets `elsewhere`.
  test('a state-specific override beats both competing group edges', () => {
    const cfg = jssm.compile(jssm.parse(
      "&Playing : [normal]; &Active : [&Playing]; "
      + "&Playing 'error' -> buffering; &Active 'error' -> stopped; normal 'error' -> elsewhere;"
    ));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'normal', to: 'elsewhere', kind: 'legal', action: 'error' }
    ]);
  });


  // Rule 3: two unrelated groups both at distance 1 from `a` tie on
  // specificity; the LATER-declared group (&g2) wins by declaration order.
  // The group-vs-group override warns.
  test('an equal-distance tie breaks by declaration order (later group wins, warns)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cfg  = jssm.compile(jssm.parse("&g1 : [a]; &g2 : [a]; &g1 'x' -> b; &g2 'x' -> c;"));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'a', to: 'c', kind: 'legal', action: 'x' }
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = String(warn.mock.calls[0][0]);
    expect(msg).toContain('&g1');   // overridden
    expect(msg).toContain('&g2');   // overriding (later-declared)
    expect(msg).toContain('a');     // source state
    warn.mockRestore();
  });


  // No conflict: two group-sourced edges on DIFFERENT actions from the same
  // state both survive (the buckets-of-one / actionless fast paths) and no
  // warning fires.
  test('group edges on different actions do not conflict', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cfg  = jssm.compile(jssm.parse("&g : [a]; &g 'x' -> b; &g 'y' -> c;"));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'a', to: 'b', kind: 'legal', action: 'x' },
      { main_path: false, forced_only: false, from: 'a', to: 'c', kind: 'legal', action: 'y' }
    ]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });


  // A constructed machine actually runs the conflict-resolved edges: the
  // winning group edge drives a real transition, proving the survivors are
  // valid (no one-action-per-origin throw) and wired to the right target.
  // The nearer &Playing wins, so `error` from `normal` lands in `buffering`,
  // not `stopped`.
  test('the resolved winner drives a real transition at runtime', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const m = jssm.from(
      "&Playing : [normal]; &Active : [&Playing]; "
      + "&Playing 'error' -> buffering; &Active 'error' -> stopped;"
    );
    expect(m.state()).toBe('normal');
    expect(m.action('error')).toBe(true);
    expect(m.state()).toBe('buffering');   // nearer &Playing won
    warn.mockRestore();
  });


});





describe('overlapping state groups — group metadata (Task 2b-ii)', () => {


  // `state &g : { … }` registers ONE per-group metadata entry, keyed by group
  // name — it is NOT fanned out to per-member state declarations (the runtime
  // cascade in Task 3 needs the single group entry to preserve depth).
  test('`state &g : { color };` registers group_metadata, not per-state config', () => {
    const cfg = jssm.compile(jssm.parse('&g : [a b]; a -> b; state &g : { color: red; };'));
    expect(cfg.group_metadata instanceof Map).toBe(true);
    expect([...(cfg.group_metadata as Map<string, unknown>).keys()]).toEqual(['g']);
    expect((cfg.group_metadata as Map<string, { declarations: unknown }>).get('g')).toEqual({
      declarations: [{ key: 'color', value: '#ff0000ff' }]
    });
    // It must NOT have leaked into per-member state declarations.
    expect(cfg.state_declaration).toBeUndefined();
  });


  // A forward reference works: the group metadata is declared before the
  // group itself, and still resolves (registry is whole-tree).
  test('group metadata declared before the group resolves (forward ref)', () => {
    const cfg = jssm.compile(jssm.parse('state &g : { color: blue; }; &g : [a b]; a -> b;'));
    expect((cfg.group_metadata as Map<string, unknown>).get('g')).toBeDefined();
  });


  // A plain `state foo : { … }` keeps its existing per-state behavior and
  // does NOT populate group_metadata.
  test('a plain state declaration is unaffected by group_metadata routing', () => {
    const cfg = jssm.compile(jssm.parse('a -> b; state a : { color: red; };'));
    expect(cfg.group_metadata).toBeUndefined();
    expect(cfg.state_declaration).toEqual([
      { state: 'a', declarations: [{ key: 'color', value: '#ff0000ff' }] }
    ]);
  });


});





describe('overlapping state groups — boundary hooks (Task 2b-ii)', () => {


  // A group-subject hook registers into group_hooks; a state-subject hook
  // into state_hooks; enter and exit for the same subject merge into one
  // entry with both onEnter and onExit.
  test('group-subject hooks go to group_hooks; enter+exit merge', () => {
    const cfg = jssm.compile(jssm.parse(
      "&g : [a]; a -> b; on enter &g do 'log_in'; on exit &g do 'log_out';"
    ));
    expect(cfg.group_hooks instanceof Map).toBe(true);
    expect((cfg.group_hooks as Map<string, unknown>).get('g')).toEqual({
      onEnter: 'log_in',
      onExit:  'log_out'
    });
    expect(cfg.state_hooks).toBeUndefined();
  });


  test('state-subject hooks go to state_hooks; enter+exit merge', () => {
    const cfg = jssm.compile(jssm.parse(
      "a -> b; on enter a do 'wake'; on exit a do 'sleep';"
    ));
    expect(cfg.state_hooks instanceof Map).toBe(true);
    expect((cfg.state_hooks as Map<string, unknown>).get('a')).toEqual({
      onEnter: 'wake',
      onExit:  'sleep'
    });
    expect(cfg.group_hooks).toBeUndefined();
  });


  // A single-direction hook produces an entry with only that direction set.
  test('a lone enter hook sets only onEnter', () => {
    const cfg = jssm.compile(jssm.parse("&g : [a]; a -> b; on enter &g do 'only_in';"));
    expect((cfg.group_hooks as Map<string, unknown>).get('g')).toEqual({ onEnter: 'only_in' });
  });


  // Group AND state hooks can coexist in one machine, each routed to its
  // own table.
  test('group and state hooks coexist, routed separately', () => {
    const cfg = jssm.compile(jssm.parse(
      "&g : [a]; a -> b; on enter &g do 'g_in'; on exit b do 'b_out';"
    ));
    expect((cfg.group_hooks as Map<string, unknown>).get('g')).toEqual({ onEnter: 'g_in' });
    expect((cfg.state_hooks as Map<string, unknown>).get('b')).toEqual({ onExit: 'b_out' });
  });


  // A hook whose group subject is undeclared throws at resolution time.
  test('a hook on an undeclared group throws JssmError', () => {
    expect(() => jssm.compile(jssm.parse("a -> b; on enter &nope do 'x';")))
      .toThrow(/Unresolved group reference: &nope/);
  });


});





describe('overlapping state groups — undeclared sub-group member (Task 2b-ii gap close)', () => {


  // `&outer : [&missing]` where `missing` is never declared is now a compile
  // error (the 2b-i gap), mirroring the transition-ref resolution message.
  test('an undeclared sub-group MEMBER throws JssmError naming it', () => {
    expect(() => jssm.compile(jssm.parse('&outer : [&missing]; a -> b;')))
      .toThrow(JssmError);
    expect(() => jssm.compile(jssm.parse('&outer : [&missing]; a -> b;')))
      .toThrow(/Unresolved group reference: &missing/);
  });


  // A spread sub-group member is validated the same way.
  test('an undeclared spread sub-group member also throws', () => {
    expect(() => jssm.compile(jssm.parse('&outer : [...&gone]; a -> b;')))
      .toThrow(/Unresolved group reference: &gone/);
  });


  // A member that is a plain STATE name is fine — states are never
  // pre-declared, so no validation applies to state members.
  test('a plain-state member needs no declaration', () => {
    expect(() => jssm.compile(jssm.parse('&g : [free_state]; a -> b;'))).not.toThrow();
  });


  // The exported helper itself, exercised directly: a declared sub-group
  // member passes, an undeclared one throws.
  test('validate_group_members passes a fully-declared registry', () => {
    const reg = build_group_registry(jssm.parse('&inner : [a]; &outer : [&inner b];'));
    expect(() => validate_group_members(reg)).not.toThrow();
  });


  test('validate_group_members throws on an undeclared member', () => {
    const reg = build_group_registry(jssm.parse('&outer : [&missing];'));
    expect(() => validate_group_members(reg)).toThrow(/Unresolved group reference: &missing/);
  });


});





describe('overlapping state groups — membership_distance metric (Task 2b-ii)', () => {


  // The metric driving conflict resolution, exercised directly.  A direct
  // member is distance 1; a member of a nested sub-group is distance 2.
  test('a direct member is at distance 1', () => {
    const reg = build_group_registry(jssm.parse('&g : [a b];'));
    expect(membership_distance(reg, 'a', 'g')).toBe(1);
    expect(membership_distance(reg, 'b', 'g')).toBe(1);
  });


  // The media-player nesting: normal is direct in Playing (d1) and one hop
  // deeper in Active (d2, via Playing).
  test('a nested member counts each nesting hop', () => {
    const reg = build_group_registry(jssm.parse('&Playing : [normal]; &Active : [&Playing];'));
    expect(membership_distance(reg, 'normal', 'Playing')).toBe(1);
    expect(membership_distance(reg, 'normal', 'Active')).toBe(2);
  });


  // BFS picks the SHORTEST path when a state is reachable two ways: `x` is a
  // direct member of `top` (d1) and also reachable via `mid` (d2); the
  // nearer distance wins.
  test('the shortest path wins when a state is reachable two ways', () => {
    const reg = build_group_registry(jssm.parse('&mid : [x]; &top : [x &mid];'));
    expect(membership_distance(reg, 'x', 'top')).toBe(1);
  });


  // A state that is not a transitive member of the group has no path: the
  // metric reports Infinity (the not-found terminal branch).
  test('a non-member yields Infinity', () => {
    const reg = build_group_registry(jssm.parse('&g : [a b];'));
    expect(membership_distance(reg, 'zzz', 'g')).toBe(Infinity);
  });


  // A diamond where one sub-group is reachable through two parents: the BFS
  // visits it once and skips the second arrival (the already-visited branch),
  // still finding the deep leaf at the correct distance.
  test('a sub-group reachable two ways is descended only once', () => {
    const reg = build_group_registry(
      jssm.parse('&shared : [leaf]; &a : [&shared]; &b : [&shared]; &top : [&a &b];')
    );
    // top(0) -> a,b(1) -> shared(2, visited once) -> leaf(3)
    expect(membership_distance(reg, 'leaf', 'top')).toBe(3);
  });


  // Descending into an undeclared sub-group hits the `?? []` empty-members
  // branch and contributes no path, so a non-member still yields Infinity.
  test('descending into an undeclared sub-group contributes no path', () => {
    const reg = build_group_registry(jssm.parse('&top : [&gone];'));
    expect(membership_distance(reg, 'zzz', 'top')).toBe(Infinity);
  });


});





describe('overlapping state groups — sibling fan-out is not self-arbitrated (Task 2b-ii)', () => {


  // A single group-source declaration with a LIST target produces multiple
  // edges that share one (source, action) AND one declaration.  The compiler
  // must NOT silently collapse them — they belong to one statement — so the
  // genuine one-action-per-origin error surfaces at Machine construction, not
  // earlier.  `compile()` keeps both edges (the same-decl bucket branch).
  test('compile keeps both edges of one group-source list fan-out', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cfg  = jssm.compile(jssm.parse("&g : [a]; &g 'x' -> [b c];"));
    expect(cfg.transitions).toEqual([
      { main_path: false, forced_only: false, from: 'a', to: 'b', kind: 'legal', action: 'x' },
      { main_path: false, forced_only: false, from: 'a', to: 'c', kind: 'legal', action: 'x' }
    ]);
    expect(warn).not.toHaveBeenCalled();   // siblings never override each other
    warn.mockRestore();
  });


  // ...and that malformed single statement is rejected by the runtime, proving
  // the compiler correctly deferred (rather than masked) the error.
  test('the runtime rejects one action bound to two targets from a group source', () => {
    expect(() => jssm.from("&g : [a]; &g 'x' -> [b c];"))
      .toThrow(/already attached to origin/);
  });


});




describe('overlapping state groups — bucket-key collision regression (Bug 1)', () => {


  // Regression: the old plain-space separator `${from} ${action}` caused
  // (from="a b", action="c") and (from="a", action="b c") to both hash to
  // "a b c", so one legal edge was silently dropped and a spurious
  // console.warn fired.  The fix uses JSON.stringify([from, action]) which
  // is collision-safe for any state/action strings.
  test('space-in-name collision: both edges survive and no console.warn fires', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // &g1 has state "a b"; &g2 has state "a".
    // &g1 edge: from="a b", action="c"  → old key "a b c"
    // &g2 edge: from="a",   action="b c" → old key "a b c"  ← collision!
    const cfg = jssm.compile(jssm.parse('&g1 : ["a b"]; &g2 : [a]; &g1 \'c\' -> z1; &g2 \'b c\' -> z2;'));

    // Both edges must survive in the compiled transitions.
    const transitions = cfg.transitions;
    const edge1 = transitions.find(t => t.from === 'a b' && t.action === 'c'   && t.to === 'z1');
    const edge2 = transitions.find(t => t.from === 'a'   && t.action === 'b c' && t.to === 'z2');

    expect(edge1).toBeDefined();
    expect(edge2).toBeDefined();

    // No spurious override warning must have fired.
    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
  });


});
