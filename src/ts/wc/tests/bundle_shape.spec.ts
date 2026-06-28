/**
 * @vitest-environment node
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('dist/wc/viz.js — bundler-friendly build', () => {

  const dist_path = resolve(__dirname, '../../../../dist/wc/viz.js');

  it('exists after running make_wc_viz_es6', () => {
    expect(existsSync(dist_path)).toBe(true);
  });

  it('exports the FslViz class identifier', () => {
    const built = readFileSync(dist_path, 'utf8');
    expect(built).toContain('FslViz');
  });

  it('contains the fsl-viz canonical tag name string', () => {
    const built = readFileSync(dist_path, 'utf8');
    expect(built).toContain('fsl-viz');
  });

  it('contains the jssm-viz synonym tag name string', () => {
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
    // The empty-subclass JssmViz lives in fsl_viz_wc.define.ts and is the
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

  it('exports the FslInstance class identifier', () => {
    const built = readFileSync(dist_path, 'utf8');
    expect(built).toContain('FslInstance');
  });

  it('contains the fsl-instance canonical tag name string', () => {
    const built = readFileSync(dist_path, 'utf8');
    expect(built).toContain('fsl-instance');
  });

  it('contains the jssm-instance synonym tag name string', () => {
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
    // jssm core + lit are externalized (asserted above), so only the component
    // source is inline. <fsl-instance> is the largest WC — FSL resolution, the
    // four declarative-tag families, mechanism-4 DOM-event re-emission (#639),
    // and the panel slots — so its ceiling is higher than viz's. The guard's
    // real job is catching an accidental core-inline regression (which would be
    // 150KB+), not policing incremental component growth (now ~82KB after the
    // theme registry, side-docks, fsl-actions, and the export/theme menus).
    expect(built.length).toBeLessThan(100_000);
  });

});

describe('dist/cdn/instance.js — CDN-friendly build', () => {

  const cdn_path = resolve(__dirname, '../../../../dist/cdn/instance.js');

  it('exists after running make_wc_instance_cdn', () => {
    expect(existsSync(cdn_path)).toBe(true);
  });

  it('contains the fsl-instance canonical tag name string', () => {
    const built = readFileSync(cdn_path, 'utf8');
    expect(built).toContain('fsl-instance');
  });

  it('contains the jssm-instance synonym tag name string', () => {
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

describe('dist/wc/editor.js — bundler-friendly build', () => {

  const dist_path = resolve(__dirname, '../../../../dist/wc/editor.js');

  it('exists after running make_wc_editor_es6', () => {
    expect(existsSync(dist_path)).toBe(true);
  });

  it('exports the FslEditor class identifier', () => {
    expect(readFileSync(dist_path, 'utf8')).toContain('FslEditor');
  });

  it('keeps CodeMirror external (imports @codemirror, never inlines it)', () => {
    const built = readFileSync(dist_path, 'utf8');
    expect(built).toMatch(/from\s*['"]@codemirror\/view['"]/);
    // A bundled-in CodeMirror copy would be hundreds of KB; externalized as a
    // peer keeps the editor bundle tiny. Guards against accidental inlining.
    expect(built.length).toBeLessThan(80_000);
  });

  it('keeps jssm core + the cm6 grammar external via the jssm / jssm/cm6 subpaths', () => {
    const built = readFileSync(dist_path, 'utf8');
    expect(built).toMatch(/from\s*['"]jssm['"]/);
    expect(built).toMatch(/from\s*['"]jssm\/cm6['"]/);
  });

});

describe('dist/wc/editor.define.js — registration entry point', () => {

  const define_path = resolve(__dirname, '../../../../dist/wc/editor.define.js');

  it('exists after running make_wc_editor_es6', () => {
    expect(existsSync(define_path)).toBe(true);
  });

  it('registers the fsl-editor tag', () => {
    expect(readFileSync(define_path, 'utf8')).toContain('fsl-editor');
  });

  it('imports the class build rather than re-inlining it', () => {
    expect(readFileSync(define_path, 'utf8')).toMatch(/from\s*['"]\.\/editor\.js['"]/);
  });

});

describe('dist/wc/widgets.js — bundler-friendly build', () => {

  const dist_path = resolve(__dirname, '../../../../dist/wc/widgets.js');

  it('exists after running make_wc_widgets_es6', () => {
    expect(existsSync(dist_path)).toBe(true);
  });

  it('exports the widget class identifiers', () => {
    const built = readFileSync(dist_path, 'utf8');
    expect(built).toContain('FslToolbar');
    expect(built).toContain('FslExport');
  });

  it('does NOT inline Lit internals (lit is external for bundlers)', () => {
    const built = readFileSync(dist_path, 'utf8');
    const lit_element_hits = (built.match(/LitElement/g) || []).length;
    expect(lit_element_hits).toBeGreaterThan(0);
    expect(lit_element_hits).toBeLessThan(20);
  });

  it('keeps jssm/viz external (fsl-export uses machine_to_dot)', () => {
    expect(readFileSync(dist_path, 'utf8')).toMatch(/from\s*['"]jssm\/viz['"]/);
  });

  it('is reasonably small with jssm core + lit externalized', () => {
    // The widget suite, no inlined core/lit. Under 80 KB; the guard exists to
    // catch an accidental core-or-lit inline (which would balloon past 150KB+).
    expect(readFileSync(dist_path, 'utf8').length).toBeLessThan(80_000);
  });

});

describe('dist/wc/widgets.define.js — registration entry point', () => {

  const define_path = resolve(__dirname, '../../../../dist/wc/widgets.define.js');

  it('exists after running make_wc_widgets_es6', () => {
    expect(existsSync(define_path)).toBe(true);
  });

  it('registers all eight new canonical tags', () => {
    const built = readFileSync(define_path, 'utf8');
    for (const tag of ['fsl-toolbar', 'fsl-footer', 'fsl-help', 'fsl-history',
      'fsl-data-inspector', 'fsl-hook-log', 'fsl-simulation', 'fsl-export']) {
      expect(built, tag).toContain(tag);
    }
  });

  it('imports the class build rather than re-inlining the eight widgets', () => {
    expect(readFileSync(define_path, 'utf8')).toMatch(/from\s*['"]\.\/widgets\.js['"]/);
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

  it('exposes the wc/editor + wc/editor/define subpaths', () => {
    const json = JSON.stringify(pkg.exports);
    expect(json).toContain('./wc/editor');
    expect(json).toContain('./dist/wc/editor.js');
    expect(json).toContain('./wc/editor/define');
    expect(json).toContain('./dist/wc/editor.define.js');
  });

  it('exposes the wc/widgets + wc/widgets/define subpaths', () => {
    const json = JSON.stringify(pkg.exports);
    expect(json).toContain('./wc/widgets');
    expect(json).toContain('./dist/wc/widgets.js');
    expect(json).toContain('./wc/widgets/define');
    expect(json).toContain('./dist/wc/widgets.define.js');
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
    expect(json).toContain('dist/wc/editor.js');
    expect(json).toContain('dist/wc/editor.define.js');
    expect(json).toContain('dist/wc/widgets.js');
    expect(json).toContain('dist/wc/widgets.define.js');
    expect(json).toContain('dist/cdn/instance.js');
    expect(json).toContain('custom-elements.json');
  });

});
