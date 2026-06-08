
/* eslint-disable max-len */

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
  transitive_members
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
