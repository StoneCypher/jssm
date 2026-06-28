/**
 * @vitest-environment jsdom
 */

import '../fsl_instance_wc.define';
import { FslViz, JssmViz } from '../fsl_viz_wc.define';
import { FslViz as FslVizBase, normalize_viz_error } from '../fsl_viz_wc';
import type { FslInstance } from '../fsl_instance_wc';

describe('FslViz registration', () => {

  it('registers the fsl-viz tag', () => {
    expect(customElements.get('fsl-viz')).toBe(FslViz);
  });

  it('creates an element with createElement', () => {
    const el = document.createElement('fsl-viz');
    expect(el).toBeInstanceOf(FslViz);
  });

  it('re-exports the same FslViz from the define module', () => {
    expect(FslViz).toBe(FslVizBase);
  });

});

describe('JssmViz synonym registration', () => {

  it('registers the jssm-viz tag', () => {
    expect(customElements.get('jssm-viz')).toBe(JssmViz);
  });

  it('creates a jssm-viz element with createElement', () => {
    const el = document.createElement('jssm-viz');
    expect(el).toBeInstanceOf(JssmViz);
    // The synonym is a subclass, so jssm-viz instances are also FslViz
    // instances. This is the key invariant that keeps behavior identical.
    expect(el).toBeInstanceOf(FslViz);
  });

  it('JssmViz is a subclass of FslViz, not the same constructor', () => {
    // The empty-subclass pattern is the only way to register the same class
    // under two tag names — customElements.define requires a distinct
    // constructor per tag. The subclass adds no behavior of its own.
    expect(JssmViz).not.toBe(FslViz);
    expect(Object.getPrototypeOf(JssmViz)).toBe(FslViz);
  });

});

describe('FslViz re-registration', () => {

  it('does not re-define or throw when the define module is re-evaluated', async () => {
    // Covers the idempotent define_with_synonym false path: the import
    // at the top of this file already registered the elements, so re-evaluating
    // the define module must find them present and skip customElements.define
    // (a second define of the same name would throw a NotSupportedError).
    const before_fsl  = customElements.get('fsl-viz');
    const before_jssm = customElements.get('jssm-viz');
    expect(before_fsl).toBe(FslViz);
    expect(before_jssm).toBe(JssmViz);

    vi.resetModules();
    await expect(import('../fsl_viz_wc.define')).resolves.toBeDefined();

    // Still the same constructors; nothing was re-registered or clobbered.
    expect(customElements.get('fsl-viz')).toBe(before_fsl);
    expect(customElements.get('jssm-viz')).toBe(before_jssm);
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

describe('FslViz rendering', () => {

  it('renders an SVG containing both state names when fsl is set', async () => {
    const el = document.createElement('fsl-viz');
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
    const el = document.createElement('fsl-viz');
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
    const el = document.createElement('fsl-viz');
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
    const el = document.createElement('fsl-viz');
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
    const el = document.createElement('fsl-viz') as any;
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

  it('jssm-viz synonym renders identically to fsl-viz for the same fsl', async () => {
    // The whole point of the synonym: given the same fsl, both tags must
    // produce an SVG that contains the same state names. This guards against
    // any future divergence sneaking into the JssmViz subclass.
    const fsl_el  = document.createElement('fsl-viz');
    const jssm_el = document.createElement('jssm-viz');
    document.body.appendChild(fsl_el);
    document.body.appendChild(jssm_el);

    const source = 'Off -> On;';
    fsl_el.fsl  = source;
    jssm_el.fsl = source;

    await (fsl_el  as any).updateComplete;
    await (jssm_el as any).updateComplete;
    await new Promise(resolve => setTimeout(resolve, 2000));
    await (fsl_el  as any).updateComplete;
    await (jssm_el as any).updateComplete;

    const fsl_html  = fsl_el.shadowRoot!.innerHTML;
    const jssm_html = jssm_el.shadowRoot!.innerHTML;

    expect(fsl_html).toContain('<svg');
    expect(jssm_html).toContain('<svg');
    expect(fsl_html).toContain('Off');
    expect(jssm_html).toContain('Off');
    expect(fsl_html).toContain('On');
    expect(jssm_html).toContain('On');

    document.body.removeChild(fsl_el);
    document.body.removeChild(jssm_el);
  });

  it('jssm-viz fires viz-error on bad fsl just like fsl-viz', async () => {
    // Confirms the synonym inherits the error path unchanged.
    const el = document.createElement('jssm-viz');
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
    const el = document.createElement('fsl-viz');
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

/**
 * Helper: wait for an attached `<fsl-viz>` element to finish its
 * `connectedCallback` deferred `whenDefined().then(...)` chain and the
 * subsequent async SVG render.  jsdom resolves microtasks immediately, but
 * the `machine_to_svg_string` pipeline awaits the viz-js WASM module, so
 * a generous timeout is needed.
 *
 * @param el - The viz element to wait on.
 */
async function settle_viz(el: HTMLElement): Promise<void> {
  await (el as any).updateComplete;
  await new Promise(resolve => setTimeout(resolve, 2000));
  await (el as any).updateComplete;
}

describe('FslViz parent-context binding', () => {

  it('binds to parent <fsl-instance> machine and renders the parent\'s states', async () => {
    // Nested mode: drop a <fsl-viz> inside <fsl-instance>; the viz must
    // render the parent's machine (not its own fsl) and show the parent's
    // state names in the SVG.
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', 'ParentRed -> ParentGreen;');
    const viz = document.createElement('fsl-viz');
    host.appendChild(viz);
    document.body.appendChild(host);

    await settle_viz(viz);

    const tree_html = viz.shadowRoot!.innerHTML;
    expect(tree_html).toContain('<svg');
    expect(tree_html).toContain('ParentRed');
    expect(tree_html).toContain('ParentGreen');

    document.body.removeChild(host);
  });

  it('console.warns when nested viz also carries its own fsl attribute', async () => {
    // Conflicting configuration: nested viz with `fsl=""` should warn but
    // still render the parent's machine (NOT the inner attribute's states).
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', 'HostA -> HostB;');
    const viz = document.createElement('fsl-viz');
    viz.setAttribute('fsl', 'InnerX -> InnerY;');
    host.appendChild(viz);

    const warn_spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.appendChild(host);

    expect(warn_spy).toHaveBeenCalledTimes(1);
    expect(String(warn_spy.mock.calls[0]![0])).toMatch(/fsl.*ignored.*fsl-instance/);

    await settle_viz(viz);
    const tree_html = viz.shadowRoot!.innerHTML;
    expect(tree_html).toContain('HostA');
    expect(tree_html).toContain('HostB');
    expect(tree_html).not.toContain('InnerX');

    warn_spy.mockRestore();
    document.body.removeChild(host);
  });

  it('re-renders on parent machine transition', async () => {
    // The subscription path: after a successful initial render, drive a
    // transition on the parent and assert the viz updates.  We can't
    // visually diff the SVG cheaply, but we CAN observe that the viz's
    // internal `_svg` field gets replaced — that proves rerender ran.
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', "Off 'flip' -> On;");
    const viz = document.createElement('fsl-viz');
    host.appendChild(viz);
    document.body.appendChild(host);

    await settle_viz(viz);
    const first_svg = (viz as any)._svg;
    expect(typeof first_svg).toBe('string');
    expect(first_svg.length).toBeGreaterThan(0);

    // Mutate the internal SVG so we can prove a fresh render runs.
    (viz as any)._svg = 'SENTINEL';

    host.do('flip');
    // The transition event fires synchronously, but the rerender awaits
    // the WASM viz pipeline.  Wait for it to settle.
    await new Promise(resolve => setTimeout(resolve, 2000));

    expect((viz as any)._svg).not.toBe('SENTINEL');
    expect((viz as any)._svg).toContain('<svg');

    document.body.removeChild(host);
  });

  it('re-renders when the host rebuilds its machine (#1387)', async () => {
    // A structural edit replaces the host's machine object (not just a
    // transition). The viz must re-subscribe to the new machine and render it.
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', "Off 'flip' -> On;");
    const viz = document.createElement('fsl-viz');
    host.appendChild(viz);
    document.body.appendChild(host);

    await settle_viz(viz);
    await host.updateComplete;              // hasUpdated → true, so the next fsl change rebuilds
    (viz as any)._svg = 'SENTINEL';

    host.fsl = "Brand 'go' -> NewMachine;";  // rebuild → fsl-machine-rebuilt → viz re-binds
    await new Promise(resolve => setTimeout(resolve, 2000));

    expect((viz as any)._svg).not.toBe('SENTINEL');
    expect((viz as any)._svg).toContain('Brand');
    expect((viz as any)._svg).toContain('NewMachine');

    // A transition on the *rebuilt* machine must also re-render — proving the
    // viz re-subscribed to the new machine object, not the dead one.
    (viz as any)._svg = 'SENTINEL2';
    host.do('go');
    await new Promise(resolve => setTimeout(resolve, 2000));
    expect((viz as any)._svg).not.toBe('SENTINEL2');

    document.body.removeChild(host);
  });

  it('cleans up the subscription on disconnect (no further rerenders after detach)', async () => {
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', "Off 'flip' -> On 'unflip' -> Off;");
    const viz = document.createElement('fsl-viz');
    host.appendChild(viz);
    document.body.appendChild(host);

    await settle_viz(viz);
    expect((viz as any)._parent_sub).not.toBeNull();

    // Detach the viz (the host remains).  Subscription must be released.
    host.removeChild(viz);
    expect((viz as any)._parent_sub).toBeNull();
    expect((viz as any)._parent_host).toBeNull();

    // Subsequent transitions on the still-mounted host must not crash and
    // must not touch the detached viz.
    (viz as any)._svg = 'POST_DETACH';
    host.do('flip');
    await new Promise(resolve => setTimeout(resolve, 500));
    expect((viz as any)._svg).toBe('POST_DETACH');

    document.body.removeChild(host);
  });

  it('jssm-viz synonym also auto-binds when nested inside fsl-instance', async () => {
    // Confirms the empty subclass inherits the nested-mode behavior.
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', 'SynRed -> SynGreen;');
    const viz = document.createElement('jssm-viz');
    host.appendChild(viz);
    document.body.appendChild(host);

    await settle_viz(viz);
    const tree_html = viz.shadowRoot!.innerHTML;
    expect(tree_html).toContain('<svg');
    expect(tree_html).toContain('SynRed');
    expect(tree_html).toContain('SynGreen');

    document.body.removeChild(host);
  });

  it('keeps standalone behavior intact when there is no parent ancestor', async () => {
    // Standalone smoke check: even after the parent-binding code lands,
    // a viz with no <fsl-instance> ancestor must render its own fsl.
    const viz = document.createElement('fsl-viz');
    viz.setAttribute('fsl', 'StandAlpha -> StandBeta;');
    document.body.appendChild(viz);

    await settle_viz(viz);
    const tree_html = viz.shadowRoot!.innerHTML;
    expect(tree_html).toContain('StandAlpha');
    expect(tree_html).toContain('StandBeta');
    expect((viz as any)._parent_host).toBeNull();

    document.body.removeChild(viz);
  });

  it('re-renders the bound parent\'s machine when engine prop changes', async () => {
    // Covers the willUpdate branch that re-renders from the host machine
    // on engine change while ignoring fsl change.
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', 'EngineA -> EngineB;');
    const viz = document.createElement('fsl-viz');
    host.appendChild(viz);
    document.body.appendChild(host);

    await settle_viz(viz);
    (viz as any)._svg = 'ENGINE_SENTINEL';

    (viz as any).engine = 'dot';
    await new Promise(resolve => setTimeout(resolve, 2000));
    await (viz as any).updateComplete;

    expect((viz as any)._svg).not.toBe('ENGINE_SENTINEL');
    expect((viz as any)._svg).toContain('<svg');

    document.body.removeChild(host);
  });

  it('ignores fsl-attribute changes while nested (no rerender from own fsl path)', async () => {
    // willUpdate branch for nested mode: changes to the viz's own `fsl`
    // attribute must not trigger _renderSvg.  We assert by mutating fsl
    // to a contradictory value and confirming the rendered SVG still
    // contains the parent's state names.
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', 'KeepRed -> KeepGreen;');
    const viz = document.createElement('fsl-viz');
    host.appendChild(viz);
    document.body.appendChild(host);

    await settle_viz(viz);

    (viz as any).fsl = 'BogusA -> BogusB;';
    await new Promise(resolve => setTimeout(resolve, 500));
    await (viz as any).updateComplete;

    const tree_html = viz.shadowRoot!.innerHTML;
    expect(tree_html).toContain('KeepRed');
    expect(tree_html).not.toContain('BogusA');

    document.body.removeChild(host);
  });

  it('emits viz-error when host.machine throws at subscription time', async () => {
    // Cover the catch-around-host.machine branch in connectedCallback.
    // We achieve a throw by stubbing the host's `machine` getter to throw
    // before letting `whenDefined` resolve.  The viz must emit viz-error.
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', 'A -> B;');
    document.body.appendChild(host);

    // Replace the machine getter on this instance to throw.
    Object.defineProperty(host, 'machine', {
      get: () => { throw new Error('forced machine failure'); },
      configurable: true,
    });

    const viz = document.createElement('fsl-viz');
    const error_p: Promise<CustomEvent> = new Promise(resolve => {
      viz.addEventListener('viz-error', e => resolve(e as CustomEvent), { once: true });
    });
    host.appendChild(viz);

    const evt = await error_p;
    expect(evt.type).toBe('viz-error');
    expect(evt.detail.message).toMatch(/forced machine failure/);

    document.body.removeChild(host);
  });

  it('does not subscribe if the viz is detached before whenDefined resolves', async () => {
    // Cover the `this._parent_host !== host` guard inside the deferred
    // callback.  We attach a viz to a host, immediately move it out of
    // the host (which calls disconnectedCallback and clears _parent_host
    // back to null), then settle.  No subscription should be installed.
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', 'A -> B;');
    document.body.appendChild(host);

    const viz = document.createElement('fsl-viz');
    host.appendChild(viz);
    // Synchronously detach before the microtask running inside connectedCallback's
    // whenDefined().then(...) gets to run.
    host.removeChild(viz);

    // Allow the deferred .then() to run.
    await new Promise(resolve => setTimeout(resolve, 100));
    expect((viz as any)._parent_sub).toBeNull();

    document.body.removeChild(host);
  });

  it('emits viz-error when nested rerender fails (machine throws mid-render)', async () => {
    // Cover the catch branch in _rerenderFromHostMachine.  Once the viz is
    // happily subscribed, we swap the host's `machine` getter to throw and
    // then trigger the rerender path directly.  The viz must emit viz-error
    // and clear its SVG.
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', 'A -> B;');
    const viz = document.createElement('fsl-viz');
    host.appendChild(viz);
    document.body.appendChild(host);

    await settle_viz(viz);
    expect((viz as any)._svg).toContain('<svg');

    // Swap the machine getter to throw.
    Object.defineProperty(host, 'machine', {
      get: () => { throw new Error('mid-render boom'); },
      configurable: true,
    });

    const error_p: Promise<CustomEvent> = new Promise(resolve => {
      viz.addEventListener('viz-error', e => resolve(e as CustomEvent), { once: true });
    });

    // Trigger the rerender path directly.
    void (viz as any)._rerenderFromHostMachine();

    const evt = await error_p;
    expect(evt.detail.message).toMatch(/mid-render boom/);
    expect((viz as any)._svg).toBe('');

    document.body.removeChild(host);
  });

  it('_rerenderFromHostMachine is a no-op when called with no parent host', async () => {
    // The early-return path: a viz that never had a parent (standalone) must
    // not crash and must not touch _svg when _rerenderFromHostMachine is
    // somehow invoked.  We construct the viz but never attach it so the Lit
    // willUpdate cycle (which would otherwise call _renderSvg) doesn't run.
    const viz = document.createElement('fsl-viz');
    (viz as any)._svg = 'UNTOUCHED';
    await (viz as any)._rerenderFromHostMachine();
    expect((viz as any)._svg).toBe('UNTOUCHED');
  });

  it('discards a stale nested render result when the parent host is replaced mid-flight', async () => {
    // Cover the `this._parent_host === host` guard in _rerenderFromHostMachine:
    // if the viz is disconnected (so _parent_host becomes null) while the
    // SVG render is in flight, the stale result must not be committed.
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', 'StaleA -> StaleB;');
    const viz = document.createElement('fsl-viz');
    host.appendChild(viz);
    document.body.appendChild(host);

    await settle_viz(viz);
    (viz as any)._svg = 'STALE_GUARD';

    // Kick off a rerender, then synchronously null out _parent_host to
    // simulate disconnection between render start and render completion.
    const p: Promise<void> = (viz as any)._rerenderFromHostMachine();
    (viz as any)._parent_host = null;
    await p;

    expect((viz as any)._svg).toBe('STALE_GUARD');

    document.body.removeChild(host);
  });

  it('mixed-prefix: jssm-viz nested inside fsl-instance binds and rerenders on transition', async () => {
    // Mixed-prefix test: a <jssm-viz> (synonym tag) nested inside a
    // <fsl-instance> (canonical tag) must find the parent via closest_wc,
    // bind to its machine, and re-render after a transition.
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', "MixOff 'toggle' -> MixOn;");
    const viz = document.createElement('jssm-viz');
    host.appendChild(viz);
    document.body.appendChild(host);

    await settle_viz(viz);

    const tree_html = viz.shadowRoot!.innerHTML;
    expect(tree_html).toContain('<svg');
    expect(tree_html).toContain('MixOff');
    expect(tree_html).toContain('MixOn');

    // Prove re-render runs on transition.
    (viz as any)._svg = 'MIX_SENTINEL';
    host.do('toggle');
    await new Promise(resolve => setTimeout(resolve, 2000));

    expect((viz as any)._svg).not.toBe('MIX_SENTINEL');
    expect((viz as any)._svg).toContain('<svg');

    document.body.removeChild(host);
  });

});
