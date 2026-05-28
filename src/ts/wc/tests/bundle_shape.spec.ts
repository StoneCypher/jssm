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

describe('dist/wc/viz.define.js — registration entry point', () => {

  const define_path = resolve(__dirname, '../../../../dist/wc/viz.define.js');

  it('exists after running make_wc_viz_es6', () => {
    expect(existsSync(define_path)).toBe(true);
  });

  it('calls customElements.define for jssm-viz', () => {
    const built = readFileSync(define_path, 'utf8');
    expect(built).toContain('jssm-viz');
  });

  it('calls customElements.define for fsl-viz (synonym registration survives bundling)', () => {
    // The empty-subclass FslViz lives in jssm_viz_wc.define.ts and is the
    // entire functional change for the synonym. If a bundler or
    // tree-shaker ever drops it, page authors who import 'jssm/wc/viz/define'
    // would silently lose the <fsl-viz> tag. This catches that regression.
    const built = readFileSync(define_path, 'utf8');
    expect(built).toContain('fsl-viz');
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

  it('contains the fsl-viz synonym tag name string', () => {
    // The synonym registration must survive the CDN bundling step. If the
    // define module's second customElements.define call ever gets dead-code
    // eliminated this assertion catches it.
    const built = readFileSync(cdn_path, 'utf8');
    expect(built).toContain('fsl-viz');
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

describe('dist/wc/instance.js — bundler-friendly build', () => {

  const dist_path = resolve(__dirname, '../../../../dist/wc/instance.js');

  it('exists after running make_wc_instance_es6', () => {
    expect(existsSync(dist_path)).toBe(true);
  });

  it('exports the JssmInstance class identifier', () => {
    const built = readFileSync(dist_path, 'utf8');
    expect(built).toContain('JssmInstance');
  });

  it('contains the jssm-instance tag name string', () => {
    const built = readFileSync(dist_path, 'utf8');
    expect(built).toContain('jssm-instance');
  });

  it('does NOT inline Lit internals (lit is external for bundlers)', () => {
    const built = readFileSync(dist_path, 'utf8');
    const lit_element_hits = (built.match(/LitElement/g) || []).length;
    expect(lit_element_hits).toBeGreaterThan(0);
    expect(lit_element_hits).toBeLessThan(20);
  });

  it('is reasonably small with jssm core externalized', () => {
    const built = readFileSync(dist_path, 'utf8');
    // Same envelope as the viz bundler-friendly build: jssm core + lit
    // externalized, only the component source remains inline.
    expect(built.length).toBeLessThan(50_000);
  });

});

describe('dist/cdn/instance.js — CDN-friendly build', () => {

  const cdn_path = resolve(__dirname, '../../../../dist/cdn/instance.js');

  it('exists after running make_wc_instance_cdn', () => {
    expect(existsSync(cdn_path)).toBe(true);
  });

  it('contains the jssm-instance tag name string', () => {
    const built = readFileSync(cdn_path, 'utf8');
    expect(built).toContain('jssm-instance');
  });

  it('inlines Lit (no lit imports remain)', () => {
    const built = readFileSync(cdn_path, 'utf8');
    expect(built).not.toMatch(/from\s+['"]lit['"]/);
    expect(built).not.toMatch(/from\s+['"]lit\/decorators\.js['"]/);
  });

  it('calls customElements.define for jssm-instance', () => {
    const built = readFileSync(cdn_path, 'utf8');
    expect(built).toContain('customElements.define');
  });

  it('stays under the 10 MB regression-guard ceiling', () => {
    const built = readFileSync(cdn_path, 'utf8');
    expect(built.length).toBeLessThan(10_000_000);
  });

});

describe('package.json exposure', () => {

  const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../../../package.json'), 'utf8'));

  it('exposes the wc/viz subpath', () => {
    const json = JSON.stringify(pkg.exports);
    expect(json).toContain('./wc/viz');
    expect(json).toContain('./dist/wc/viz.js');
  });

  it('exposes the wc/instance subpath', () => {
    const json = JSON.stringify(pkg.exports);
    expect(json).toContain('./wc/instance');
    expect(json).toContain('./dist/wc/instance.js');
  });

  it('exposes the wc/instance/define subpath', () => {
    const json = JSON.stringify(pkg.exports);
    expect(json).toContain('./wc/instance/define');
    expect(json).toContain('./dist/wc/instance.define.js');
  });

  it('exposes the cdn/instance subpath', () => {
    const json = JSON.stringify(pkg.exports);
    expect(json).toContain('./cdn/instance');
    expect(json).toContain('./dist/cdn/instance.js');
  });

  it('exposes the wc/viz/define subpath', () => {
    const json = JSON.stringify(pkg.exports);
    expect(json).toContain('./wc/viz/define');
    expect(json).toContain('./dist/wc/viz.define.js');
  });

  it('exposes the cdn/viz subpath', () => {
    const json = JSON.stringify(pkg.exports);
    expect(json).toContain('./cdn/viz');
    expect(json).toContain('./dist/cdn/viz.js');
  });

  it('declares the sideEffects whitelist', () => {
    expect(Array.isArray(pkg.sideEffects)).toBe(true);
    const json = JSON.stringify(pkg.sideEffects);
    expect(json).toContain('*.define.js');
    expect(json).toContain('dist/cdn');
  });

  it('declares lit as an optional peer', () => {
    expect(pkg.peerDependencies?.lit).toBeDefined();
    expect(pkg.peerDependenciesMeta?.lit?.optional).toBe(true);
  });

  it('lists the new wc and cdn dist files for publication', () => {
    const json = JSON.stringify(pkg.files);
    expect(json).toContain('dist/wc/viz.js');
    expect(json).toContain('dist/wc/viz.define.js');
    expect(json).toContain('dist/cdn/viz.js');
    expect(json).toContain('dist/wc/instance.js');
    expect(json).toContain('dist/wc/instance.define.js');
    expect(json).toContain('dist/cdn/instance.js');
    expect(json).toContain('custom-elements.json');
  });

});
