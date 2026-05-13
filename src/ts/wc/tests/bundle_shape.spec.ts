/**
 * @jest-environment node
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('dist/wc/viz.js — bundler-friendly build', () => {

  const dist_path = resolve(__dirname, '../../../../dist/wc/viz.js');

  it('exists after running make_wc_viz_es6', () => {
    expect(existsSync(dist_path)).toBe(true);
  });

  it('exports the JssmViz class identifier', () => {
    const built = readFileSync(dist_path, 'utf8');
    expect(built).toContain('JssmViz');
  });

  it('contains the jssm-viz tag name string', () => {
    const built = readFileSync(dist_path, 'utf8');
    expect(built).toContain('jssm-viz');
  });

  it('does NOT inline Lit internals (lit is external for bundlers)', () => {
    const built = readFileSync(dist_path, 'utf8');
    // The string "LitElement" must appear, but only as an *import reference*,
    // not as inlined source. We sanity-check by counting occurrences: a
    // bundled-in Lit copy would have many; an externalized one has very few.
    const lit_element_hits = (built.match(/LitElement/g) || []).length;
    expect(lit_element_hits).toBeGreaterThan(0);
    expect(lit_element_hits).toBeLessThan(20);
  });

  it('is reasonably small with jssm core externalized', () => {
    const built = readFileSync(dist_path, 'utf8');
    // < 50 KB is generous; with jssm core, lit, and viz.js all external,
    // the actual size should be well under 10 KB. Treat this as a regression
    // guard against accidental inlining of large dependencies.
    expect(built.length).toBeLessThan(50_000);
  });

});

describe('dist/cdn/viz.js — CDN-friendly build', () => {

  const cdn_path = resolve(__dirname, '../../../../dist/cdn/viz.js');

  it('exists after running make_wc_viz_cdn', () => {
    expect(existsSync(cdn_path)).toBe(true);
  });

  it('contains the jssm-viz tag name string', () => {
    const built = readFileSync(cdn_path, 'utf8');
    expect(built).toContain('jssm-viz');
  });

  it('inlines Lit (no lit imports remain)', () => {
    const built = readFileSync(cdn_path, 'utf8');
    // A truly bundled CDN file should have no bare-specifier imports left.
    expect(built).not.toMatch(/from\s+['"]lit['"]/);
    expect(built).not.toMatch(/from\s+['"]lit\/decorators\.js['"]/);
    expect(built).not.toMatch(/from\s+['"]lit\/directives\/unsafe-html\.js['"]/);
  });

  it('calls customElements.define for jssm-viz', () => {
    const built = readFileSync(cdn_path, 'utf8');
    expect(built).toContain('customElements.define');
  });

  it('stays under the 10 MB regression-guard ceiling', () => {
    const built = readFileSync(cdn_path, 'utf8');
    // Expected size is ~4-5 MB (jssm core + Lit + WC source all inlined,
    // @viz-js/viz external). 10 MB ceiling gives ~2x headroom as a
    // regression guard against accidentally bundling something pathological.
    expect(built.length).toBeLessThan(10_000_000);
  });

});
