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

});
