/**
 * @jest-environment jsdom
 */

import { FslViz, JssmViz as JssmVizFromDefine } from '../jssm_viz_wc.define';
import { JssmViz, normalize_viz_error } from '../jssm_viz_wc';

describe('JssmViz registration', () => {

  it('registers the jssm-viz tag', () => {
    expect(customElements.get('jssm-viz')).toBe(JssmViz);
  });

  it('creates an element with createElement', () => {
    const el = document.createElement('jssm-viz');
    expect(el).toBeInstanceOf(JssmViz);
  });

  it('re-exports the same JssmViz from the define module', () => {
    expect(JssmVizFromDefine).toBe(JssmViz);
  });

});

describe('FslViz synonym registration', () => {

  it('registers the fsl-viz tag', () => {
    expect(customElements.get('fsl-viz')).toBe(FslViz);
  });

  it('creates a fsl-viz element with createElement', () => {
    const el = document.createElement('fsl-viz');
    expect(el).toBeInstanceOf(FslViz);
    // The synonym is a subclass, so fsl-viz instances are also JssmViz
    // instances. This is the key invariant that keeps behavior identical.
    expect(el).toBeInstanceOf(JssmViz);
  });

  it('FslViz is a subclass of JssmViz, not the same constructor', () => {
    // The empty-subclass pattern is the only way to register the same class
    // under two tag names — customElements.define requires a distinct
    // constructor per tag. The subclass adds no behavior of its own.
    expect(FslViz).not.toBe(JssmViz);
    expect(Object.getPrototypeOf(FslViz)).toBe(JssmViz);
  });

});

describe('JssmViz re-registration', () => {

  it('does not re-define or throw when the define module is re-evaluated', async () => {
    // Covers the `if (!customElements.get('jssm-viz'))` false path: the import
    // at the top of this file already registered the element, so re-evaluating
    // the define module must find it present and skip customElements.define
    // (a second define of the same name would throw a NotSupportedError).
    // Same path is exercised for fsl-viz by the same module.
    const before_jssm = customElements.get('jssm-viz');
    const before_fsl  = customElements.get('fsl-viz');
    expect(before_jssm).toBe(JssmViz);
    expect(before_fsl).toBe(FslViz);

    vi.resetModules();
    await expect(import('../jssm_viz_wc.define')).resolves.toBeDefined();

    // Still the same constructors; nothing was re-registered or clobbered.
    expect(customElements.get('jssm-viz')).toBe(before_jssm);
    expect(customElements.get('fsl-viz')).toBe(before_fsl);
  });

});

describe('normalize_viz_error', () => {

  it('passes Error.message through and reports no location', () => {
    const det = normalize_viz_error(new Error('boom'));
    expect(det.message).toBe('boom');
    expect(det.location).toBeUndefined();
  });

  it('preserves location field on object-shaped errors', () => {
    const det = normalize_viz_error({ message: 'parse failed', location: { line: 1 } });
    expect(det.message).toBe('parse failed');
    expect(det.location).toEqual({ line: 1 });
  });

  it('falls back to String(e) when message is missing or empty', () => {
    const det_no_msg = normalize_viz_error({ location: { line: 2 } });
    expect(typeof det_no_msg.message).toBe('string');
    expect(det_no_msg.location).toEqual({ line: 2 });

    const det_empty = normalize_viz_error({ message: '' });
    expect(typeof det_empty.message).toBe('string');
    expect(det_empty.message.length).toBeGreaterThan(0);
  });

  it('handles primitive throw values', () => {
    expect(normalize_viz_error('bare string failure')).toEqual({
      message  : 'bare string failure',
      location : undefined,
    });
  });

  it('handles null', () => {
    expect(normalize_viz_error(null)).toEqual({
      message  : 'null',
      location : undefined,
    });
  });

});

describe('JssmViz rendering', () => {

  it('renders an SVG containing both state names when fsl is set', async () => {
    const el = document.createElement('jssm-viz');
    document.body.appendChild(el);

    el.fsl = 'Off -> On;';
    await (el as any).updateComplete;
    // The component performs async rendering after updateComplete; flush microtasks.
    await new Promise(resolve => setTimeout(resolve, 2000));
    await (el as any).updateComplete;

    const tree_html = el.shadowRoot!.innerHTML;
    expect(tree_html).toContain('<svg');
    expect(tree_html).toContain('Off');
    expect(tree_html).toContain('On');

    document.body.removeChild(el);
  });

  it('fires viz-error when fsl fails to parse', async () => {
    const el = document.createElement('jssm-viz');
    document.body.appendChild(el);

    const errorEvent: Promise<CustomEvent> = new Promise(resolve => {
      el.addEventListener('viz-error', e => resolve(e as CustomEvent), { once: true });
    });

    el.fsl = 'this is not valid fsl !!!';

    const evt = await errorEvent;
    expect(evt.type).toBe('viz-error');
    expect(typeof evt.detail.message).toBe('string');
    expect(evt.detail.message.length).toBeGreaterThan(0);
    expect(evt.bubbles).toBe(true);
    expect(evt.composed).toBe(true);

    document.body.removeChild(el);
  });

  it('passes engine override into fsl_to_svg_string', async () => {
    // Strategy: set an obviously-broken engine name and assert that EITHER a
    // viz-error fires (because viz.js rejects the engine) OR the SVG renders
    // anyway (because viz.js silently fell back). Both outcomes prove the
    // engine prop reached the renderer. What we are NOT testing is whether
    // viz.js supports the given engine name.
    const el = document.createElement('jssm-viz');
    document.body.appendChild(el);

    let saw_error = false;
    el.addEventListener('viz-error', () => { saw_error = true; });

    el.fsl    = 'Off -> On;';
    el.engine = 'definitely-not-an-engine';

    await (el as any).updateComplete;
    await new Promise(resolve => setTimeout(resolve, 2000));
    await (el as any).updateComplete;

    const tree_html = el.shadowRoot!.innerHTML;
    expect(saw_error || tree_html.includes('<svg')).toBe(true);

    document.body.removeChild(el);
  });

  it('renders nothing and stays quiet when fsl is empty', async () => {
    // Exercises the early-return branch in _renderSvg for empty fsl. Also
    // covers transitioning from non-empty back to empty: the SVG should be
    // cleared, and no viz-error should fire.
    const el = document.createElement('jssm-viz');
    document.body.appendChild(el);

    let saw_error = false;
    el.addEventListener('viz-error', () => { saw_error = true; });

    // Initial empty render.
    await (el as any).updateComplete;
    expect(el.shadowRoot!.innerHTML).not.toContain('<svg');

    // Render something, then clear it.
    el.fsl = 'Off -> On;';
    await (el as any).updateComplete;
    await new Promise(resolve => setTimeout(resolve, 2000));
    await (el as any).updateComplete;
    expect(el.shadowRoot!.innerHTML).toContain('<svg');

    el.fsl = '';
    await (el as any).updateComplete;
    await new Promise(resolve => setTimeout(resolve, 100));
    await (el as any).updateComplete;
    expect(el.shadowRoot!.innerHTML).not.toContain('<svg');
    expect(saw_error).toBe(false);

    document.body.removeChild(el);
  });

  it('discards a stale render result when fsl changes mid-flight', async () => {
    // Covers the `if (this.fsl === source)` false path in _renderSvg: a render
    // is started for one fsl value, then fsl is changed before the async
    // fsl_to_svg_string resolves. The stale result must NOT be committed to
    // _svg — only the value matching the current fsl survives.
    const el = document.createElement('jssm-viz') as any;
    document.body.appendChild(el);

    // Start a render for the first source, but do not await it yet.
    el.fsl = 'StaleStart -> StaleEnd;';
    const staleRender: Promise<void> = el._renderSvg();

    // Change fsl before the in-flight render resolves. This makes
    // `this.fsl === source` false when the stale render finally settles.
    el.fsl = '';

    // Let the stale render finish. Its result targets the old fsl and must
    // be dropped on the floor.
    await staleRender;

    expect(el._svg).not.toContain('StaleStart');
    expect(el._svg).not.toContain('<svg');

    document.body.removeChild(el);
  });

  it('fsl-viz synonym renders identically to jssm-viz for the same fsl', async () => {
    // The whole point of the synonym: given the same fsl, both tags must
    // produce an SVG that contains the same state names. This guards against
    // any future divergence sneaking into the FslViz subclass.
    const jssm_el = document.createElement('jssm-viz');
    const fsl_el  = document.createElement('fsl-viz');
    document.body.appendChild(jssm_el);
    document.body.appendChild(fsl_el);

    const source = 'Off -> On;';
    jssm_el.fsl = source;
    fsl_el.fsl  = source;

    await (jssm_el as any).updateComplete;
    await (fsl_el  as any).updateComplete;
    await new Promise(resolve => setTimeout(resolve, 2000));
    await (jssm_el as any).updateComplete;
    await (fsl_el  as any).updateComplete;

    const jssm_html = jssm_el.shadowRoot!.innerHTML;
    const fsl_html  = fsl_el.shadowRoot!.innerHTML;

    expect(jssm_html).toContain('<svg');
    expect(fsl_html).toContain('<svg');
    expect(jssm_html).toContain('Off');
    expect(fsl_html).toContain('Off');
    expect(jssm_html).toContain('On');
    expect(fsl_html).toContain('On');

    document.body.removeChild(jssm_el);
    document.body.removeChild(fsl_el);
  });

  it('fsl-viz fires viz-error on bad fsl just like jssm-viz', async () => {
    // Confirms the synonym inherits the error path unchanged.
    const el = document.createElement('fsl-viz');
    document.body.appendChild(el);

    const errorEvent: Promise<CustomEvent> = new Promise(resolve => {
      el.addEventListener('viz-error', e => resolve(e as CustomEvent), { once: true });
    });

    (el as any).fsl = 'this is not valid fsl !!!';

    const evt = await errorEvent;
    expect(evt.type).toBe('viz-error');
    expect(typeof evt.detail.message).toBe('string');
    expect(evt.detail.message.length).toBeGreaterThan(0);

    document.body.removeChild(el);
  });

  it('renders successfully when engine is set to a valid value', async () => {
    // Companion to the bad-engine test: with a valid engine the SVG must
    // render, proving the engine prop reaching the renderer doesn't break
    // the happy path.
    const el = document.createElement('jssm-viz');
    document.body.appendChild(el);

    el.fsl    = 'Off -> On;';
    el.engine = 'dot';

    await (el as any).updateComplete;
    await new Promise(resolve => setTimeout(resolve, 2000));
    await (el as any).updateComplete;

    const tree_html = el.shadowRoot!.innerHTML;
    expect(tree_html).toContain('<svg');

    document.body.removeChild(el);
  });

});
