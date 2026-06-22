
/* eslint-disable max-len */

/**
 * Task 2a of the overlapping-state-groups plan: the `transition: {}` and
 * `graph: {}` default-config blocks must compile (not throw "Unknown rule"),
 * and the deprecated top-level graph keywords (`graph_layout`,
 * `graph_bg_color`, `dot_preamble`, `theme`, `flow`) must fold into a
 * consolidated `default_graph_config`, with an explicit `graph: {}` block
 * winning on key conflict and a deprecation warning firing per alias used.
 *
 * These assertions read real `compile()` output -- no snapshots / golden files.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import * as jssm from '../jssm';

type AnyCfg = Record<string, unknown>;

const compile = (src: string): AnyCfg =>
  jssm.compile(jssm.parse(src)) as AnyCfg;





describe('transition: {} compiles into default_transition_config', () => {

  test('`transition: { color: red; };` no longer throws', () => {
    expect(() => compile('a -> b; transition: { color: red; };')).not.toThrow();
  });

  test('a per-state style item lands in default_transition_config', () => {
    const cfg = compile('a -> b; transition: { color: red; };');
    expect(cfg.default_transition_config).toEqual([
      { key: 'color', value: '#ff0000ff' }
    ]);
  });

  test('the edge-color default (`edge_color`) lands as graph_default_edge_color', () => {
    // This exercises the single-object value normalization: the grammar's
    // GraphDefaultEdgeColor branch returns one node, not a list, so the
    // compiler must still flatten it into the config array.
    const cfg = compile('a -> b; transition: { edge_color: blue; };');
    expect(cfg.default_transition_config).toEqual([
      { key: 'graph_default_edge_color', value: '#0000ffff' }
    ]);
  });

  test('a machine with no transition block has no default_transition_config', () => {
    const cfg = compile('a -> b;');
    expect(cfg.default_transition_config).toBeUndefined();
  });

});





describe('graph: {} compiles into default_graph_config', () => {

  test('`graph: { color: green; };` no longer throws', () => {
    expect(() => compile('a -> b; graph: { color: green; };')).not.toThrow();
  });

  test('a per-state style item lands in default_graph_config', () => {
    const cfg = compile('a -> b; graph: { color: green; };');
    expect(cfg.default_graph_config).toEqual([
      { key: 'color', value: '#008000ff' }
    ]);
  });

  test('an `edge_color` inside the graph block lands as graph_default_edge_color', () => {
    const cfg = compile('a -> b; graph: { edge_color: blue; };');
    expect(cfg.default_graph_config).toEqual([
      { key: 'graph_default_edge_color', value: '#0000ffff' }
    ]);
  });

  test('a machine with no graph config at all has no default_graph_config', () => {
    const cfg = compile('a -> b;');
    expect(cfg.default_graph_config).toBeUndefined();
  });

});





describe('deprecated graph aliases fold into default_graph_config', () => {

  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => { warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach (() => { warn.mockRestore(); });

  test('`graph_bg_color` folds in as a `background-color` item', () => {
    const cfg = compile('a -> b; graph_bg_color: #ffffff;');
    expect(cfg.default_graph_config).toEqual([
      { key: 'background-color', value: '#ffffffff' }
    ]);
  });

  test('`graph_bg_color` still also exposes the legacy top-level field', () => {
    // Backward-compat: the current visualizer reads the top-level field; the
    // fold is additive and must not remove it.
    const cfg = compile('a -> b; graph_bg_color: #ffffff;');
    expect(cfg.graph_bg_color).toBe('#ffffffff');
  });

  test('`graph_layout` folds in under its own key (no graph-block equivalent)', () => {
    const cfg = compile('a -> b; graph_layout: circo;');
    expect(cfg.default_graph_config).toEqual([
      { key: 'graph_layout', value: 'circo' }
    ]);
    expect(cfg.graph_layout).toBe('circo');
  });

  test('`theme`, `flow`, and `dot_preamble` each fold in under their own key', () => {
    const cfg = compile('a -> b; theme: ocean; flow: down; dot_preamble: "rankdir=LR";');
    expect(cfg.default_graph_config).toEqual([
      { key: 'dot_preamble', value: 'rankdir=LR' },
      { key: 'theme',        value: 'ocean'      },
      { key: 'flow',         value: 'down'       }
    ]);
    // legacy top-level fields preserved
    expect(cfg.theme       ).toEqual(['ocean']);
    expect(cfg.flow        ).toBe('down');
    expect(cfg.dot_preamble).toBe('rankdir=LR');
  });

  test('`theme`, `flow`, and `dot_preamble` fold silently — no deprecation warning', () => {
    compile('a -> b; theme: ocean; flow: down; dot_preamble: "rankdir=LR";');
    expect(warn).not.toHaveBeenCalled();
  });

  test('`graph_layout` folds silently — no deprecation warning', () => {
    compile('a -> b; graph_layout: circo;');
    expect(warn).not.toHaveBeenCalled();
  });

  test('`graph_bg_color` emits a deprecation warning naming the keyword', () => {
    compile('a -> b; graph_bg_color: #ffffff;');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('graph_bg_color');
    expect(warn.mock.calls[0][0]).toContain('deprecated');
  });

  test('no alias keyword means no deprecation warning', () => {
    compile('a -> b; graph: { color: green; };');
    expect(warn).not.toHaveBeenCalled();
  });

});





describe('explicit graph: {} overrides a conflicting alias (graph block wins)', () => {

  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => { warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach (() => { warn.mockRestore(); });

  test('`graph: { background-color }` beats a `graph_bg_color` alias on the same key', () => {
    const cfg = compile('a -> b; graph_bg_color: #000000; graph: { background-color: #ffffff; };');
    // Single, de-duplicated entry holding the explicit block's value.
    expect(cfg.default_graph_config).toEqual([
      { key: 'background-color', value: '#ffffffff' }
    ]);
  });

  test('a non-conflicting alias and graph block coexist, alias positioned first', () => {
    const cfg = compile('a -> b; graph_layout: circo; graph: { color: green; };');
    expect(cfg.default_graph_config).toEqual([
      { key: 'graph_layout', value: 'circo'     },
      { key: 'color',        value: '#008000ff' }
    ]);
  });

});
