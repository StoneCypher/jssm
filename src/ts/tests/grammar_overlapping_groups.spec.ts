
/* eslint-disable max-len */

/**
 * Parse-level grammar tests for the "Overlapping State Groups" feature
 * (Task 1).  These assert PARSE-TREE shape only — not machine behaviour;
 * compile/runtime/viz are later tasks.  Mirrors the style of
 * `cycles.spec.ts`: `import * as jssm`, then `expect(jssm.parse(str))`.
 *
 * Coverage:
 *   - GroupRef atom (`&Name`) in ArrowTarget, StateDeclaration, and hook
 *     subject positions.
 *   - Nest (`&child`) / spread (`...&child`) members inside a NamedList.
 *   - HookDeclaration (`on enter|exit <subject> do '<action>';`).
 *   - Normalized `transition: {}` / new `graph: {}` config blocks.
 *   - Backward-compatibility of bare label lists and plain transitions.
 */

import * as jssm from '../jssm';





describe('overlapping state groups — grammar (parse-tree shape)', () => {


  // 1. A bare NamedList declaration keeps its historical shape: `value`
  //    is a plain `string[]` (no member objects), so every existing
  //    NamedList consumer is unaffected.
  test('1. `&busy : [loading saving];` parses as the existing NamedList shape', () => {
    expect( jssm.parse('&busy : [loading saving];') ).toEqual(
      [ { key: 'named_list', name: 'busy', value: ['loading', 'saving'] } ]
    );
  });


  // 2. A GroupRef in transition-source (ArrowTarget) position becomes a
  //    `{ key:'group_ref', name }` node in the transition's `from`.
  test('2. `&busy ... -> idle;` carries a GroupRef in the transition `from`', () => {
    const tree = jssm.parse("&busy : [loading saving]; &busy 'CANCEL' -> idle;");
    expect(tree[0]).toEqual({ key: 'named_list', name: 'busy', value: ['loading', 'saving'] });
    expect(tree[1]).toEqual({
      key:  'transition',
      from: { key: 'group_ref', name: 'busy' },
      se:   { kind: '->', to: 'idle', r_action: 'CANCEL' }
    });
  });


  // 3. A GroupRef as a `state` declaration subject lands in `name` while
  //    the rest of the `state_declaration` shape is preserved.  (The
  //    task's illustrative `amber` is not an SVG color name the grammar
  //    recognizes, so a real color is used; the GroupRef subject is the
  //    point under test.)
  test('3. `state &busy : { color: orange; };` carries a GroupRef subject', () => {
    const tree = jssm.parse('&busy : [loading saving]; state &busy : { color: orange; };');
    expect(tree[1]).toEqual({
      key:   'state_declaration',
      name:  { key: 'group_ref', name: 'busy' },
      value: [ { key: 'color', value: '#ffa500ff' } ]
    });
  });


  // 4. HookDeclaration on enter with a GroupRef subject.
  test('4. `on enter &busy do \'log\';` parses as a hook_decl (enter)', () => {
    const tree = jssm.parse("&busy : [loading saving]; on enter &busy do 'log';");
    expect(tree[1]).toEqual({
      key:     'hook_decl',
      event:   'enter',
      subject: { key: 'group_ref', name: 'busy' },
      action:  'log'
    });
  });


  // 5. HookDeclaration on exit with a GroupRef subject.
  test('5. `on exit &busy do \'cleanup\';` parses as a hook_decl (exit)', () => {
    const tree = jssm.parse("&busy : [loading saving]; on exit &busy do 'cleanup';");
    expect(tree[1]).toEqual({
      key:     'hook_decl',
      event:   'exit',
      subject: { key: 'group_ref', name: 'busy' },
      action:  'cleanup'
    });
  });


  // 6. HookDeclaration on a plain state subject (a bare Label, not a group).
  test('6. `on enter foo do \'log\';` parses as a hook_decl on a plain state', () => {
    expect( jssm.parse("on enter foo do 'log';") ).toEqual(
      [ { key: 'hook_decl', event: 'enter', subject: 'foo', action: 'log' } ]
    );
  });


  // 7. An undeclared GroupRef still PARSES (resolution is Task 2); the
  //    parse tree contains the GroupRef in source position.
  test('7. `&undeclared \'x\' -> y;` parses and contains a GroupRef', () => {
    const tree = jssm.parse("&undeclared 'x' -> y;");
    expect(tree[0]).toEqual({
      key:  'transition',
      from: { key: 'group_ref', name: 'undeclared' },
      se:   { kind: '->', to: 'y', r_action: 'x' }
    });
  });


  // 8. A nested member (`&inner`) plus a state member produce ordered
  //    member objects; the plain label becomes `{kind:'state'}`.
  test('8. `&outer : [&inner x];` produces ordered nest + state members', () => {
    expect( jssm.parse('&outer : [&inner x];') ).toEqual(
      [ { key: 'named_list', name: 'outer', value: [
          { kind: 'group', name: 'inner', mode: 'nest' },
          { kind: 'state', name: 'x' }
        ] } ]
    );
  });


  // 9. A spread member (`...&inner`) marks the inner member `mode:'spread'`.
  test('9. `&outer : [...&inner x];` marks the inner member as spread', () => {
    expect( jssm.parse('&outer : [...&inner x];') ).toEqual(
      [ { key: 'named_list', name: 'outer', value: [
          { kind: 'group', name: 'inner', mode: 'spread' },
          { kind: 'state', name: 'x' }
        ] } ]
    );
  });


  // 10. The `transition: {}` and `graph: {}` config blocks parse to the
  //     normalized `{ key:'default_<x>_config', value:[…] }` shape — NOT
  //     the old orphan `{ config_kind, config_items }`.
  test('10a. `transition : { color: red; };` normalizes to default_transition_config', () => {
    expect( jssm.parse('transition : { color: red; };') ).toEqual(
      [ { key: 'default_transition_config', value: [ { key: 'color', value: '#ff0000ff' } ] } ]
    );
  });

  test('10b. `graph : { color: red; };` parses to default_graph_config', () => {
    expect( jssm.parse('graph : { color: red; };') ).toEqual(
      [ { key: 'default_graph_config', value: [ { key: 'color', value: '#ff0000ff' } ] } ]
    );
  });

  test('10c. neither block uses the old orphan `config_kind` shape', () => {
    const t = jssm.parse('transition : { color: red; };')[0] as Record<string, unknown>;
    const g = jssm.parse('graph : { color: red; };')[0]      as Record<string, unknown>;
    expect(t.config_kind).toBeUndefined();
    expect(g.config_kind).toBeUndefined();
  });


  // 11. Backward-compatibility: a bare `[a b c]` fan-out target and a
  //     plain `a -> b;` transition still parse identically to before.
  test('11a. bare `[a b c] -> +1;` fan-out parses unchanged', () => {
    expect( jssm.parse('[a b c] -> +1;') ).toEqual(
      [ { from: ['a', 'b', 'c'], key: 'transition', se: { kind: '->', to: { key: 'cycle', value: 1 } } } ]
    );
  });

  test('11b. plain `a -> b;` transition parses unchanged', () => {
    expect( jssm.parse('a -> b;') ).toEqual(
      [ { from: 'a', key: 'transition', se: { kind: '->', to: 'b' } } ]
    );
  });


});
