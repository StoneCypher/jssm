import * as jssm from '../jssm';
import { sm, graph_renderer, graph_layout } from '../jssm';
import type { FslSourceLocation } from '../jssm_types';

// FSL `graph_renderer: <name>;` — the language half of the renderer
// selector.  The name is an open Label (bareword or quoted), stored
// verbatim, independent of graph_layout, and never reserved anywhere else
// in the grammar.  Rendering with it is covered in
// viz_renderer_registry.spec.ts.

type AnyCfg = Record<string, unknown>;

const compile = (src: string): AnyCfg =>
  jssm.compile(jssm.parse(src)) as AnyCfg;

const slice = (src: string, loc: FslSourceLocation) =>
  src.slice(loc.start.offset, loc.end.offset);



describe('parsing graph_renderer', () => {

  test('a bareword name parses to a graph_renderer node', () => {
    expect(jssm.parse('graph_renderer: tonal;')).toEqual([{ key: 'graph_renderer', value: 'tonal' }]);
  });

  test('a quoted name keeps its punctuation and spaces', () => {
    expect(jssm.parse('graph_renderer: "my-cards v2";')).toEqual([{ key: 'graph_renderer', value: 'my-cards v2' }]);
  });

  test('whitespace around the colon is optional, like the other single-value configs', () => {
    expect(jssm.parse('graph_renderer:tonal;')).toEqual(jssm.parse('graph_renderer  :  tonal ;'));
  });

  test('a bareword with a character barewords forbid is rejected with the quote-it hint', () => {
    expect(() => jssm.parse('graph_renderer: my-cards;')).toThrow(/quote it/);
  });

  test('a missing value is a parse error', () => {
    expect(() => jssm.parse('graph_renderer: ;')).toThrow();
  });

  test('graph_layout no longer accepts tonal; it only names Graphviz engines', () => {
    expect(() => jssm.parse('graph_layout: tonal;')).toThrow();
  });

  test('with locations, the node and its value carry spans', () => {
    const src  = 'graph_renderer: "my cards"; a -> b;';
    const node = jssm.parse(src, { locations: true })[0] as unknown as { loc: FslSourceLocation, value_loc: FslSourceLocation, value: string };
    expect(node.value).toBe('my cards');
    expect(slice(src, node.loc)).toContain('graph_renderer: "my cards";');
    expect(slice(src, node.value_loc)).toBe('"my cards"');
  });

});



describe('graph_renderer is not reserved outside its own statement', () => {

  test('a state may be named graph_renderer', () => {
    const m = sm`graph_renderer 'go' -> b; b -> graph_renderer;`;
    expect(m.states()).toEqual(['graph_renderer', 'b']);
    expect(m.graph_renderer()).toBeUndefined();
  });

  test('a state may be named tonal while tonal is also the renderer', () => {
    const m = sm`graph_renderer: tonal; tonal 'go' -> b; b -> tonal;`;
    expect(m.states()).toEqual(['tonal', 'b']);
    expect(m.graph_renderer()).toBe('tonal');
  });

  test('a state may be named graph_layout, and graph_layout: dot still parses beside it', () => {
    const m = sm`graph_layout: dot; graph_renderer: graphviz; graph_layout -> b;`;
    expect(m.states()).toEqual(['graph_layout', 'b']);
    expect(m.graph_layout()).toBe('dot');
    expect(m.graph_renderer()).toBe('graphviz');
  });

  test('actions may be named graph_renderer and tonal', () => {
    const m = sm`a 'graph_renderer' -> b 'tonal' -> c;`;
    expect(m.list_actions()).toEqual(['graph_renderer', 'tonal']);
    expect(m.action('graph_renderer')).toBe(true);
    expect(m.action('tonal')).toBe(true);
    expect(m.state()).toBe('c');
  });

});



describe('compiling graph_renderer', () => {

  test('the name lands in the config verbatim', () => {
    expect(compile('a -> b; graph_renderer: tonal;').graph_renderer).toBe('tonal');
  });

  test('the config has no graph_renderer when the source names none', () => {
    expect(compile('a -> b;')).not.toHaveProperty('graph_renderer');
  });

  test('an unregistered name still compiles: the registry is checked at render time', () => {
    expect(compile('a -> b; graph_renderer: nowhere;').graph_renderer).toBe('nowhere');
  });

  test('a second graph_renderer statement throws', () => {
    expect(() => compile('graph_renderer: tonal; graph_renderer: graphviz; a -> b;'))
      .toThrow('May only have one graph_renderer statement');
  });

  test('it folds into default_graph_config under its own key, beside graph_layout', () => {
    expect(compile('a -> b; graph_layout: circo; graph_renderer: tonal;').default_graph_config).toEqual([
      { key: 'graph_layout',   value: 'circo' },
      { key: 'graph_renderer', value: 'tonal' }
    ]);
  });

  test('graph_layout and graph_renderer compile independently', () => {
    const cfg = compile('graph_renderer: tonal; graph_layout: neato; a -> b;');
    expect(cfg.graph_layout).toBe('neato');
    expect(cfg.graph_renderer).toBe('tonal');
  });

});



describe('reading graph_renderer from a machine', () => {

  test('the method and the bare function agree', () => {
    const m = sm`graph_renderer: "my cards"; a -> b;`;
    expect(m.graph_renderer()).toBe('my cards');
    expect(graph_renderer(m)).toBe('my cards');
  });

  test('undefined when the machine names no renderer, while graph_layout keeps its dot default', () => {
    const m = sm`a -> b;`;
    expect(graph_renderer(m)).toBeUndefined();
    expect(graph_layout(m)).toBe('dot');
  });

  test('a renderer choice leaves the layout engine alone', () => {
    expect(graph_layout(sm`graph_renderer: tonal; a -> b;`)).toBe('dot');
  });

});
