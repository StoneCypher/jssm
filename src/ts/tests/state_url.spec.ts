
 

/**
 *  Tests for the per-state `url:` declaration introduced for
 *  StoneCypher/fsl#420.  Verifies that:
 *
 *    1. Parsing a `state Foo: { url: "..."; };` block does not throw.
 *    2. The URL string is reachable through `state_declaration()` and
 *       through the composited `style_for()` accessor.
 *    3. The Graphviz emitter writes the URL onto the matching node as
 *       the uppercase `URL=` attribute (which Graphviz translates to
 *       `xlink:href` on the SVG output).
 *    4. The URL pass-through is verbatim — query strings, ampersands,
 *       and other reserved URL characters are preserved.
 *    5. The new attribute is additive: when a state has both `url` and
 *       other styling, none of the existing attributes are lost.
 *    6. States without a `url` declaration do not emit a `URL=` attr.
 */

import * as jssm from '../jssm';
import * as jv   from '../jssm_viz';

const sm = jssm.sm;





describe('per-state url declaration parses', () => {

  test('url alone does not throw', () =>
    expect(() => { const _m = sm`state Foo: { url: "https://example.com/"; }; Foo -> b;`; })
      .not.toThrow() );

  test('url alongside other state attributes does not throw', () =>
    expect(() => { const _m = sm`state Foo: { url: "https://example.com/"; shape: circle; color: red; }; Foo -> b;`; })
      .not.toThrow() );

});





describe('url is exposed through machine accessors', () => {

  test('state_declaration carries url', () => {
    const mach = sm`state Foo: { url: "https://example.com/x"; }; Foo -> b;`;
    expect(mach.state_declaration('Foo')?.url).toBe('https://example.com/x');
  });

  test('style_for composites url onto state style', () => {
    const mach = sm`state Foo: { url: "https://example.com/x"; }; Foo -> b;`;
    expect(mach.style_for('Foo').url).toBe('https://example.com/x');
  });

  test('state without url returns undefined for declaration', () => {
    const mach = sm`state Foo: { color: red; }; Foo -> b;`;
    expect(mach.state_declaration('Foo')?.url).toBeUndefined();
  });

  test('state without url returns undefined for style_for', () => {
    const mach = sm`Foo -> b;`;
    expect(mach.style_for('Foo').url).toBeUndefined();
  });

});





describe('url renders into dot output as URL= attribute', () => {

  test('single state with url emits URL=', () => {
    const dot = jv.machine_to_dot(sm`state Foo: { url: "https://example.com/"; }; Foo -> b;`);
    expect(dot).toContain('URL="https://example.com/"');
  });

  test('two states, only the urled one emits URL=', () => {
    const dot     = jv.machine_to_dot(sm`state Foo: { url: "https://example.com/foo"; }; Foo -> Bar;`);
    const urlHits = (dot.match(/URL=/g) || []).length;
    expect(urlHits).toBe(1);
    expect(dot).toContain('URL="https://example.com/foo"');
  });

  test('url with query string and ampersand is preserved verbatim', () => {
    const target = 'https://example.com/page?x=1&y=two';
    const dot    = jv.machine_to_dot(sm`state Foo: { url: "https://example.com/page?x=1&y=two"; }; Foo -> b;`);
    expect(dot).toContain(`URL="${target}"`);
  });

  test('url state still carries its other attributes (label, shape)', () => {
    const dot = jv.machine_to_dot(sm`state Foo: { url: "https://example.com/"; shape: circle; }; Foo -> b;`);
    expect(dot).toContain('URL="https://example.com/"');
    expect(dot).toContain('shape="circle"');
    expect(dot).toContain('label="Foo"');
  });

  test('a machine without any url declaration emits no URL= attribute', () => {
    const dot = jv.machine_to_dot(sm`a -> b;`);
    expect(dot).not.toContain('URL=');
  });

});
