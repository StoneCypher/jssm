
/* eslint-disable max-len */

import * as jv   from '../jssm_viz';
import * as jssm from '../jssm';

const sm = jssm.sm;




// Helper: extract the slug node-id a state was given in a rendered dot string,
// without re-deriving it (the renderer quotes slugs, so we just look for the
// state name as a label and trust the slugging is deterministic).  For the
// simple lowercase single-word state names used below, slug === name.




describe('cluster_id_for helper', () => {

  test('slugifies a group name into a cluster_ identifier', () =>
    expect(jv._test.cluster_id_for('Active Players', 0))
      .toBe('cluster_active_players'));

  test('collapses runs of non-alphanumerics to a single underscore', () =>
    expect(jv._test.cluster_id_for('a--b  c', 0))
      .toBe('cluster_a_b_c'));

  test('falls back to g<index> when the name slugs to empty', () =>
    expect(jv._test.cluster_id_for('!!!', 3))
      .toBe('cluster_g3'));

});




describe('label_with_chips helper', () => {

  test('returns the label verbatim when there are no chips', () =>
    expect(jv._test.label_with_chips('Foo', []))
      .toBe('Foo'));

  test('appends one bracketed chip per extra group', () =>
    expect(jv._test.label_with_chips('Foo', ['a', 'b']))
      .toBe('Foo [a] [b]'));

});




describe('group_parent_map / group_ancestry helpers', () => {

  test('a nested sub-group points at its declaring parent', () => {
    const m = sm`&inner : [a]; &outer : [&inner b]; a -> b;`;
    const parents = jv._test.group_parent_map(m._group_registry, m.groups());
    expect(parents.get('inner')).toBe('outer');
    expect(parents.has('outer')).toBe(false);
  });

  test('a shared sub-group takes its earliest-declared parent', () => {
    const m = sm`&shared : [a]; &p1 : [&shared]; &p2 : [&shared]; a -> b;`;
    const parents = jv._test.group_parent_map(m._group_registry, m.groups());
    expect(parents.get('shared')).toBe('p1');
  });

  test('ancestry includes the group itself and walks to the root', () => {
    const m = sm`&inner : [a]; &outer : [&inner b]; a -> b;`;
    const parents = jv._test.group_parent_map(m._group_registry, m.groups());
    const chain   = jv._test.group_ancestry('inner', parents);
    expect(chain.has('inner')).toBe(true);
    expect(chain.has('outer')).toBe(true);
  });

});




describe('primary_group_for helper', () => {

  test('returns undefined for a state in no group', () => {
    const m = sm`&g : [a]; a -> z;`;
    expect(jv._test.primary_group_for(m, 'z', m.groups()))
      .toBeUndefined();
  });

  test('picks the innermost (nearest) group by membership distance', () => {
    const m = sm`&inner : [a]; &outer : [&inner b]; a -> b;`;
    expect(jv._test.primary_group_for(m, 'a', m.groups()))
      .toBe('inner');
  });

  test('breaks an equal-distance tie by latest declaration order', () => {
    const m = sm`&g1 : [a b]; &g2 : [b c]; a -> b -> c;`;
    expect(jv._test.primary_group_for(m, 'b', m.groups()))
      .toBe('g2');
  });

});




describe("machine_to_dot 'cluster' mode — nested groups", () => {

  test('emits a subgraph cluster for a declared group', () => {
    const dot = jv.machine_to_dot(sm`&g : [a b]; a -> b;`);
    expect(dot).toMatch(/subgraph cluster_g \{/);
    expect(dot).toMatch(/label="g"/);
  });

  test("member node identifiers appear inside their group's cluster", () => {
    const dot = jv.machine_to_dot(sm`&g : [a b]; a -> b;`);
    // grab the cluster_g { ... } body and assert both nodes live within it
    const body = dot.slice(dot.indexOf('subgraph cluster_g {'));
    const close = body.indexOf('};');
    const inner = body.slice(0, close);
    expect(inner).toContain('"a"');
    expect(inner).toContain('"b"');
  });

  test('a nested sub-group cluster is emitted inside its parent cluster', () => {
    const dot = jv.machine_to_dot(sm`&inner : [a]; &outer : [&inner b]; a -> b;`);
    expect(dot).toMatch(/subgraph cluster_outer \{/);
    expect(dot).toMatch(/subgraph cluster_inner \{/);

    // cluster_inner must open after cluster_outer opens, i.e. it is nested
    const outerAt = dot.indexOf('subgraph cluster_outer {');
    const innerAt = dot.indexOf('subgraph cluster_inner {');
    expect(outerAt).toBeGreaterThanOrEqual(0);
    expect(innerAt).toBeGreaterThan(outerAt);

    // 'a' (inner-only) sits in the inner cluster, 'b' in the outer
    const innerBody = dot.slice(innerAt);
    const innerClose = innerBody.indexOf('};');
    expect(innerBody.slice(0, innerClose)).toContain('"a"');
  });

});




describe("machine_to_dot 'cluster' mode — genuine overlap chips onto label", () => {

  test('an overlapping membership appears as a chip on the node label', () => {
    // b is in both g1 and g2; neither nests inside the other.  b is placed in
    // one cluster (g2, the latest-declared at equal distance) and chips g1.
    const dot = jv.machine_to_dot(sm`&g1 : [a b]; &g2 : [b c]; a -> b -> c;`);
    expect(dot).toMatch(/label="b \[g1\]"/);
  });

  test('non-overlapping members do not get chips', () => {
    const dot = jv.machine_to_dot(sm`&g1 : [a b]; &g2 : [b c]; a -> b -> c;`);
    expect(dot).toMatch(/label="a"/);   // a is only in g1 → no chip
    expect(dot).toMatch(/label="c"/);   // c is only in g2 → no chip
  });

});




describe("machine_to_dot 'chips' mode", () => {

  test('renders every membership as a chip and emits NO clusters', () => {
    const dot = jv.machine_to_dot(sm`&inner : [a]; &outer : [&inner b]; a -> b;`, { render_groups: 'chips' });
    expect(dot).not.toMatch(/subgraph cluster_/);
    // a is in inner and outer → both chips; b is in outer → one chip
    expect(dot).toMatch(/label="a \[inner\] \[outer\]"/);
    expect(dot).toMatch(/label="b \[outer\]"/);
  });

});




describe("machine_to_dot 'off' mode and group-free machines", () => {

  test("'off' emits no clusters and no chips even when groups are declared", () => {
    const dot = jv.machine_to_dot(sm`&g : [a b]; a -> b;`, { render_groups: 'off' });
    expect(dot).not.toMatch(/subgraph cluster_/);
    expect(dot).toMatch(/label="a"/);
    expect(dot).toMatch(/label="b"/);
    expect(dot).not.toMatch(/\[g\]/);
  });

  test("'off' output is byte-identical to a machine with no groups at all", () => {
    const withGroupsOff = jv.machine_to_dot(sm`&g : [a b]; a -> b;`, { render_groups: 'off' });
    const noGroups      = jv.machine_to_dot(sm`a -> b;`);
    expect(withGroupsOff).toBe(noGroups);
  });

  test('a machine without groups renders no clusters in the default mode', () => {
    const dot = jv.machine_to_dot(sm`a -> b;`);
    expect(dot).not.toMatch(/subgraph cluster_/);
    expect(dot).toMatch(/"a"->"b"/);
  });

  test('default cluster mode is identical to explicit render_groups: cluster', () => {
    const a = jv.machine_to_dot(sm`&g : [a b]; a -> b;`);
    const b = jv.machine_to_dot(sm`&g : [a b]; a -> b;`, { render_groups: 'cluster' });
    expect(a).toBe(b);
  });

});




describe('cluster-mode DOT is valid Graphviz (renders to SVG)', () => {

  test('a nested + overlapping machine round-trips through the viz renderer', async () => {
    // If the cluster nesting were malformed, @viz-js/viz would throw here.
    const svg = await jv.fsl_to_svg_string('&inner : [a]; &outer : [&inner b]; &side : [b c]; a -> b -> c;');
    expect(svg).toMatch(/<svg/);
    // group label boxes carry the group name as visible text
    expect(svg).toContain('outer');
    expect(svg).toContain('inner');
  });

});




describe('groups_to_subgraph_string direct helper', () => {

  test('returns cluster text plus the ungrouped node statements separately', () => {
    const m = sm`&g : [a b]; a -> b -> z;`;
    const state_index = jv._test.slug_states(m.states());
    // state_kinds via the public render path: easiest is to just call the helper
    // through machine_to_dot, but we exercise the split directly here.
    const result = jv._test.groups_to_subgraph_string(
      m, m.states(), state_index,
      // minimal kinds map: every state 'base' is fine for structural assertions
      new Map(m.states().map(s => [s, 'base' as const])),
      false
    );
    expect(result.clusters).toMatch(/subgraph cluster_g \{/);
    expect(result.clusters).toContain('"a"');
    expect(result.clusters).toContain('"b"');
    expect(result.ungrouped_nodes).toContain('"z"');
    expect(result.ungrouped_nodes).not.toContain('subgraph');
  });

});
