
/* eslint-disable max-len */

import * as jv   from '../jssm_viz';
import * as jssm from '../jssm';

const sm = jssm.sm;





describe('jssm_viz module loads', () => {

  test('exports version as string', () =>
    expect(typeof jv.version)
      .toBe('string'));

  test('exports build_time as number', () =>
    expect(typeof jv.build_time)
      .toBe('number'));

});



describe('color8to6 helper', () => {

  test('strips alpha channel from #RRGGBBAA', () =>
    expect(jv._test.color8to6('#11223344'))
      .toBe('#112233'));

  test('throws on non-#-prefixed input', () =>
    expect(() => jv._test.color8to6('11223344'))
      .toThrow());

  test('throws on length mismatch', () =>
    expect(() => jv._test.color8to6('#1122'))
      .toThrow());

  test('u_color8to6 returns undefined for undefined input', () =>
    expect(jv._test.u_color8to6(undefined))
      .toBeUndefined());

  test('u_color8to6 delegates to color8to6 for defined input', () =>
    expect(jv._test.u_color8to6('#aabbccdd'))
      .toBe('#aabbcc'));

});



describe('vc helper', () => {

  test('returns the palette value for a known key', () =>
    expect(jv._test.vc('graph_bg_color'))
      .toBe('#eeeeee'));

  test('returns empty string for an unknown key', () =>
    expect(jv._test.vc('not_a_real_key'))
      .toBe(''));

});



describe('node_of helper', () => {

  test('returns n<index> for the first state', () =>
    expect(jv._test.node_of('a', ['a', 'b', 'c']))
      .toBe('n0'));

  test('returns n<index> for the last state', () =>
    expect(jv._test.node_of('c', ['a', 'b', 'c']))
      .toBe('n2'));

});



describe('state-declaration readers', () => {

  test('image_for_state reads image property from declaration', () => {
    const m = sm`state c: { image: "foo.png"; }; a -> c;`;
    expect(jv._test.image_for_state(m, 'c'))
      .toBe('foo.png');
  });

  test('image_for_state returns undefined for state without image', () => {
    const m = sm`state c: { color: red; }; a -> c;`;
    expect(jv._test.image_for_state(m, 'c'))
      .toBeUndefined();
  });

  test('shape_for_state reads shape', () => {
    const m = sm`state c: { shape: circle; }; a -> c;`;
    expect(jv._test.shape_for_state(m, 'c'))
      .toBe('circle');
  });

});



describe('machine_to_dot output structure', () => {

  test('produces a digraph G { ... } envelope', () => {
    const dot = jv.machine_to_dot(sm`a -> b;`);
    expect(dot).toMatch(/^digraph G \{/);
    expect(dot).toMatch(/\}\s*$/);
  });

  test('contains node identifiers for all states', () => {
    const dot = jv.machine_to_dot(sm`alpha -> beta;`);
    expect(dot).toMatch(/"alpha"/);
    expect(dot).toMatch(/"beta"/);
    expect(dot).toMatch(/label="alpha"/);
    expect(dot).toMatch(/label="beta"/);
  });

  test('fsl_to_dot is equivalent to machine_to_dot(sm`...`)', () => {
    const a = jv.machine_to_dot(sm`a -> b;`);
    const b = jv.fsl_to_dot('a -> b;');
    expect(a).toBe(b);
  });

});



describe('state-styling renders into dot', () => {

  test('shape: circle produces shape="circle"', () => {
    const dot = jv.machine_to_dot(sm`state c: { shape: circle; }; a -> c;`);
    expect(dot).toMatch(/shape="circle"/);
  });

  test('color (border-color) produces a color attribute', () => {
    const dot = jv.machine_to_dot(sm`state c: { border-color: #FF0000FF; }; a -> c;`);
    expect(dot).toMatch(/color="#FF0000FF"/);
  });

  test('corners: rounded produces style with rounded', () => {
    const dot = jv.machine_to_dot(sm`state c: { corners: rounded; }; a -> c;`);
    expect(dot).toMatch(/style="rounded[^"]*filled"/);
  });

  test('line-style: dashed produces style with dashed', () => {
    const dot = jv.machine_to_dot(sm`state c: { line-style: dashed; }; a -> c;`);
    expect(dot).toMatch(/style="[^"]*dashed[^"]*filled"/);
  });

  test('image: foo.png produces image="foo.png"', () => {
    const dot = jv.machine_to_dot(sm`state c: { image: "foo.png"; }; a -> c;`);
    expect(dot).toMatch(/image="foo\.png"/);
  });

});



describe('arrange declarations render into dot', () => {

  test('arrange [a b] produces a rank=same group', () => {
    const dot = jv.machine_to_dot(sm`a -> b; arrange [a b];`);
    expect(dot).toMatch(/rank=same/);
  });

  test('arrange-start [a] produces a rank=min group', () => {
    const dot = jv.machine_to_dot(sm`a -> b; arrange-start [a];`);
    expect(dot).toMatch(/rank=min/);
  });

  test('arrange-end [b] produces a rank=max group', () => {
    const dot = jv.machine_to_dot(sm`a -> b; arrange-end [b];`);
    expect(dot).toMatch(/rank=max/);
  });

});



describe('flow direction renders into dot', () => {

  test('flow: right produces rankdir=LR', () => {
    const dot = jv.machine_to_dot(sm`flow: right; a -> b;`);
    expect(dot).toMatch(/rankdir=LR/);
  });

  test('default flow (down) produces rankdir=TB', () => {
    const dot = jv.machine_to_dot(sm`a -> b;`);
    expect(dot).toMatch(/rankdir=TB/);
  });

});



describe('*_svg_element in Node without configure', () => {

  test('fsl_to_svg_element rejects with a clear JssmError', async () => {
    await expect(jv.fsl_to_svg_element('a -> b;'))
      .rejects.toThrow(/requires a browser DOM/);
  });

  test('machine_to_svg_element rejects with a clear JssmError', async () => {
    await expect(jv.machine_to_svg_element(sm`a -> b;`))
      .rejects.toThrow(/requires a browser DOM/);
  });

});





describe('configure() input validation', () => {

  test('throws on non-constructor DOMParser', () => {
    expect(() => jv.configure({ DOMParser: 'not a constructor' as any }))
      .toThrow(/must be a constructor/);
  });

  test('no-op for empty options object', () => {
    expect(() => jv.configure({}))
      .not.toThrow();
  });

});



describe('parallel action edges render as separate labelled edges (#325, #531)', () => {

  test('two actions to the same target emit two labelled edges', () => {
    const dot = jv.fsl_to_dot(`a 'f' -> c; a 'g' -> c;`);
    expect(dot).toContain('taillabel="f"');
    expect(dot).toContain('taillabel="g"');
  });

  test('a self-loop with two actions emits both labels (#531)', () => {
    const dot = jv.fsl_to_dot(`A 'blah' -> A; A 'foo' -> A;`);
    expect(dot).toContain('taillabel="blah"');
    expect(dot).toContain('taillabel="foo"');
  });

  test('an ordinary single edge is unchanged (one taillabel)', () => {
    const dot = jv.fsl_to_dot(`a 'go' -> b;`);
    expect(dot).toContain('taillabel="go"');
  });

  test('a bidirectional pair still merges into one dir=both edge', () => {
    const dot = jv.fsl_to_dot(`a -> b; b -> a;`);
    expect(dot).toContain('dir=both');
  });

});
