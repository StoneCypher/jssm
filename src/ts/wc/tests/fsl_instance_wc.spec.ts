/**
 * @vitest-environment jsdom
 */

import '../fsl_instance_wc.define';
import { FslInstance, resolve_fsl_source } from '../fsl_instance_wc';

// JssmInstance is re-exported as an alias from the define file.
import { JssmInstance } from '../fsl_instance_wc.define';

describe('FslInstance registration', () => {

  it('registers the fsl-instance tag', () => {
    expect(customElements.get('fsl-instance')).toBe(FslInstance);
  });

  it('creates an element with createElement using fsl-instance', () => {
    const el = document.createElement('fsl-instance');
    expect(el).toBeInstanceOf(FslInstance);
  });

});

describe('jssm-instance synonym registration', () => {

  it('registers the jssm-instance synonym tag', () => {
    expect(customElements.get('jssm-instance')).toBeDefined();
  });

  it('creates an element with createElement using jssm-instance', () => {
    const el = document.createElement('jssm-instance');
    expect(el).toBeInstanceOf(FslInstance);
  });

  it('JssmInstance alias is a subclass of FslInstance', () => {
    expect(JssmInstance.prototype).toBeInstanceOf(FslInstance);
  });

});

describe('FslInstance re-registration', () => {

  it('does not re-define or throw when the define module is re-evaluated', async () => {
    const before = customElements.get('fsl-instance');
    expect(before).toBe(FslInstance);

    vi.resetModules();
    await expect(import('../fsl_instance_wc.define')).resolves.toBeDefined();

    expect(customElements.get('fsl-instance')).toBe(before);
  });

});

describe('resolve_fsl_source', () => {

  it('returns the fsl attribute value when only that channel is populated', () => {
    const host = document.createElement('div');
    const r = resolve_fsl_source(host, 'Off -> On;');
    expect(r.fsl).toBe('Off -> On;');
    expect(r.provided_count).toBe(1);
    expect(r.error).toBeUndefined();
  });

  it('reads from a <script type="text/fsl"> child when no attribute is set', () => {
    const host = document.createElement('div');
    const script = document.createElement('script');
    script.setAttribute('type', 'text/fsl');
    script.textContent = 'Red -> Green;';
    host.append(script);
    const r = resolve_fsl_source(host, '');
    expect(r.fsl).toBe('Red -> Green;');
    expect(r.provided_count).toBe(1);
    expect(r.error).toBeUndefined();
  });

  it('reads from textContent when no attribute and no script child', () => {
    const host = document.createElement('div');
    host.textContent = 'A -> B;';
    const r = resolve_fsl_source(host, '');
    expect(r.fsl).toBe('A -> B;');
    expect(r.provided_count).toBe(1);
    expect(r.error).toBeUndefined();
  });

  it('strips <jssm-*> companion-tag children from the textContent channel', () => {
    // textContent must not pick up text from companion <jssm-*> tags.
    // Build DOM via createElement/textContent rather than innerHTML so the
    // construction itself doesn't depend on HTML parsing.
    const host = document.createElement('div');
    host.append(document.createTextNode('   X -> Y;   '));
    const hook = document.createElement('jssm-hook');
    hook.textContent = 'handlerName';
    host.append(hook);
    host.append(document.createTextNode(' '.repeat(3)));
    const r = resolve_fsl_source(host, '');
    expect(r.fsl).toBe('X -> Y;');
    expect(r.error).toBeUndefined();
  });

  it('strips <fsl-*> companion-tag children from the textContent channel', () => {
    // prefix-agnostic stripping: <fsl-hook> must also be excluded.
    const host = document.createElement('div');
    host.append(document.createTextNode('   P -> Q;   '));
    const hook = document.createElement('fsl-hook');
    hook.textContent = 'handlerName';
    host.append(hook);
    host.append(document.createTextNode(' '.repeat(3)));
    const r = resolve_fsl_source(host, '');
    expect(r.fsl).toBe('P -> Q;');
    expect(r.error).toBeUndefined();
  });

  it('keeps non-fsl/non-jssm child element contributions to textContent', () => {
    // The filter that drops <fsl-*>/<jssm-*> tags has a false branch for any
    // other descendant: that contribution must remain in the assembled FSL text.
    const host = document.createElement('div');
    host.append(document.createTextNode('M -> N'));
    const span = document.createElement('span');
    span.textContent = ';';
    host.append(span);
    const r = resolve_fsl_source(host, '');
    expect(r.fsl).toBe('M -> N;');
    expect(r.error).toBeUndefined();
  });

  it('errors when no source is provided', () => {
    const host = document.createElement('div');
    const r = resolve_fsl_source(host, '');
    expect(r.fsl).toBeUndefined();
    expect(r.provided_count).toBe(0);
    expect(r.error).toBe('no FSL source');
  });

  it('errors when both fsl attribute and script child are provided', () => {
    const host = document.createElement('div');
    const script = document.createElement('script');
    script.setAttribute('type', 'text/fsl');
    script.textContent = 'Red -> Green;';
    host.append(script);
    const r = resolve_fsl_source(host, 'Off -> On;');
    expect(r.fsl).toBeUndefined();
    expect(r.provided_count).toBe(2);
    expect(r.error).toMatch(/use exactly one source/);
    expect(r.error).toMatch(/fsl-attribute/);
    expect(r.error).toMatch(/fsl-script/);
  });

  it('errors when both fsl attribute and textContent are provided', () => {
    const host = document.createElement('div');
    host.textContent = 'A -> B;';
    const r = resolve_fsl_source(host, 'C -> D;');
    expect(r.fsl).toBeUndefined();
    expect(r.provided_count).toBe(2);
    expect(r.error).toMatch(/use exactly one source/);
  });

  it('ignores slotted content (elements with a slot attribute) as a text source', () => {
    const host = document.createElement('div');
    // UI projected into named slots (e.g. an actions panel) is not FSL source.
    const panel = document.createElement('div');
    panel.setAttribute('slot', 'actions');
    panel.innerHTML = '<button>Enable</button><button>Next</button>';
    host.append(panel);
    const r = resolve_fsl_source(host, 'Off -> On;');   // only the fsl attribute counts
    expect(r.fsl).toBe('Off -> On;');
    expect(r.provided_count).toBe(1);
  });

  it('errors when all three channels are provided', () => {
    const host = document.createElement('div');
    const script = document.createElement('script');
    script.setAttribute('type', 'text/fsl');
    script.textContent = 'A -> B;';
    host.append(script);
    // Add some extra text content after the script element.
    host.append(document.createTextNode(' E -> F;'));
    const r = resolve_fsl_source(host, 'C -> D;');
    expect(r.fsl).toBeUndefined();
    expect(r.provided_count).toBe(3);
    expect(r.error).toMatch(/use exactly one source/);
  });

  it('treats a whitespace-only script child as empty', () => {
    // Covers the "script exists but its text is blank" branch.
    const host = document.createElement('div');
    const script = document.createElement('script');
    script.setAttribute('type', 'text/fsl');
    script.textContent = '   \n   ';
    host.append(script);
    const r = resolve_fsl_source(host, '');
    expect(r.fsl).toBeUndefined();
    expect(r.provided_count).toBe(0);
    expect(r.error).toBe('no FSL source');
  });

  it('treats a whitespace-only fsl attribute as empty', () => {
    const host = document.createElement('div');
    const r = resolve_fsl_source(host, ' '.repeat(3));
    expect(r.fsl).toBeUndefined();
    expect(r.provided_count).toBe(0);
    expect(r.error).toBe('no FSL source');
  });

  it('treats a non-string fsl arg as missing', () => {
    // Defensive: the property is typed string, but the resolver is
    // exported so callers could pass it anything.
    const host = document.createElement('div');
    const r = resolve_fsl_source(host, undefined as unknown as string);
    expect(r.fsl).toBeUndefined();
    expect(r.error).toBe('no FSL source');
  });

  it('treats a script child whose textContent is null as empty', () => {
    // Cover the "(script.textContent || '')" fallback when textContent is
    // somehow null (defensive — querySelector returned a node, but its
    // text accessor produced no string).
    const host = document.createElement('div');
    const script = document.createElement('script');
    script.setAttribute('type', 'text/fsl');
    // Patch the textContent accessor on the actual instance to be null.
    Object.defineProperty(script, 'textContent', { get: () => null, configurable: true });
    host.append(script);
    const r = resolve_fsl_source(host, '');
    expect(r.fsl).toBeUndefined();
    expect(r.error).toBe('no FSL source');
  });

});

/**
 * Helper: jsdom invokes custom-element connection callbacks and, when
 * they throw, reports the error via a window 'error' event rather than
 * re-throwing synchronously to `appendChild`.  This helper captures the
 * thrown value so a test can assert against its message.  The captured
 * error's default handling is suppressed so vitest doesn't flag it as
 * an uncaught exception.
 * @param fn - Function that triggers the throwing connection.
 * @returns The captured Error (or `null` if nothing was thrown).
 */
function capture_connection_error(fn: () => void): Error | null {
  let captured: Error | null = null;
  const handler = (e: ErrorEvent) => {
    e.preventDefault();
    captured = e.error instanceof Error ? e.error : new Error(String(e.message));
  };
  addEventListener('error', handler);
  try {
    fn();
  } finally {
    removeEventListener('error', handler);
  }
  return captured;
}

describe('FslInstance lifecycle (via fsl-instance tag)', () => {

  it('throws on connect when no FSL source is provided', () => {
    const err = capture_connection_error(() => {
      const el = document.createElement('fsl-instance');
      document.body.append(el);
    });
    expect(err).not.toBeNull();
    expect(err!.message).toMatch(/no FSL source/);
  });

  it('throws on connect when more than one source is provided', () => {
    const err = capture_connection_error(() => {
      const el = document.createElement('fsl-instance') as FslInstance;
      el.setAttribute('fsl', 'Off -> On;');
      const script = document.createElement('script');
      script.setAttribute('type', 'text/fsl');
      script.textContent = 'Red -> Green;';
      el.append(script);
      document.body.append(el);
    });
    expect(err).not.toBeNull();
    expect(err!.message).toMatch(/use exactly one source/);
  });

  it('constructs a machine from the fsl attribute and exposes it', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', 'Off -> On;');
    document.body.append(el);

    expect(el.machine).toBeDefined();
    expect(el.state()).toBe('Off');

    el.remove();
  });

  it('constructs a machine from a <script type="text/fsl"> child', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    const script = document.createElement('script');
    script.setAttribute('type', 'text/fsl');
    script.textContent = 'Red -> Green;';
    el.append(script);
    document.body.append(el);

    expect(el.state()).toBe('Red');

    el.remove();
  });

  it('constructs a machine from textContent', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.textContent = 'Alpha -> Beta;';
    document.body.append(el);

    expect(el.state()).toBe('Alpha');

    el.remove();
  });

  it('drives transitions via host.do() and reflects updated state', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'flip' -> On 'flip' -> Off;");
    document.body.append(el);

    expect(el.state()).toBe('Off');
    expect(el.getAttribute('current-state')).toBe('Off');

    const ok = el.do('flip');
    expect(ok).toBe(true);
    expect(el.state()).toBe('On');
    expect(el.getAttribute('current-state')).toBe('On');

    el.remove();
  });

  it('returns false from host.do() when the action is illegal', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'flip' -> On;");
    document.body.append(el);

    // After flipping to On, On has no exits.  A second flip must fail.
    el.do('flip');
    expect(el.state()).toBe('On');
    const ok = el.do('flip');
    expect(ok).toBe(false);

    el.remove();
  });

  it('moves via host.transition() (legal) and host.force_transition() (forced)', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "A 'go' -> B; A ~> C;");
    document.body.append(el);

    expect(el.transition('B')).toBe(true);   // legal edge A -> B
    expect(el.state()).toBe('B');

    const el2 = document.createElement('fsl-instance') as FslInstance;
    el2.setAttribute('fsl', "A 'go' -> B; A ~> C;");
    document.body.append(el2);

    expect(el2.transition('C')).toBe(false);        // A ~> C is forced-only
    expect(el2.state()).toBe('A');
    expect(el2.force_transition('C')).toBe(true);   // force succeeds
    expect(el2.state()).toBe('C');

    el.remove();
    el2.remove();
  });

  it('reflects legal-actions, terminal, and complete host attributes', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'flip' -> On;");
    document.body.append(el);

    expect(el.getAttribute('legal-actions')).toContain('flip');
    // Off is not terminal/complete; On (after flipping) becomes terminal.
    expect(el.hasAttribute('terminal')).toBe(false);

    el.do('flip');
    expect(el.state()).toBe('On');
    expect(el.hasAttribute('terminal')).toBe(true);

    el.remove();
  });

  it('sets the --current-state CSS custom property on the host', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'flip' -> On;");
    document.body.append(el);

    // jsdom exposes inline style.getPropertyValue.
    expect(el.style.getPropertyValue('--current-state')).toBe('Off');

    el.do('flip');
    expect(el.style.getPropertyValue('--current-state')).toBe('On');

    el.remove();
  });

  it('throws when machine is accessed before connection', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    expect(() => el.machine).toThrow(/before connection/);
  });

  it('cleans up on disconnect without throwing', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', 'A -> B;');
    document.body.append(el);
    expect(() => { el.remove(); }).not.toThrow();
  });

});

describe('jssm-instance synonym lifecycle', () => {

  it('constructs a working machine via the jssm-instance synonym tag', () => {
    const el = document.createElement('jssm-instance') as FslInstance;
    el.setAttribute('fsl', 'Off -> On;');
    document.body.append(el);

    expect(el.machine).toBeDefined();
    expect(el.state()).toBe('Off');

    el.remove();
  });

  it('drives transitions via jssm-instance synonym', () => {
    const el = document.createElement('jssm-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'go' -> On;");
    document.body.append(el);

    expect(el.do('go')).toBe(true);
    expect(el.state()).toBe('On');

    el.remove();
  });

});

describe('FslInstance shadow DOM', () => {

  it('renders the named slots and the state-specific slot', async () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'flip' -> On;");
    document.body.append(el);
    await (el as any).updateComplete;

    const sr = el.shadowRoot!;
    const html_str = sr.innerHTML;

    // Named slots present.
    expect(html_str).toContain('name="title"');
    expect(html_str).toContain('name="viz"');
    expect(html_str).toContain('name="editor"');
    expect(html_str).toContain('name="toolbar"');
    expect(html_str).toContain('name="actions"');
    expect(html_str).toContain('name="info-panel"');
    expect(html_str).toContain('name="footer"');

    // State-specific slot targets the current state.
    expect(html_str).toContain('name="state-Off"');

    el.remove();
  });

  it('reflects the theme property so its built-in palette can drive the suite', async () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'flip' -> On;");
    document.body.append(el);
    await (el as any).updateComplete;

    expect(el.theme).toBe('light');                  // default
    el.theme = 'dark';
    await (el as any).updateComplete;
    expect(el.getAttribute('theme')).toBe('dark');   // reflected to the attribute

    el.remove();
  });

  it('shows and hides panels via togglePanel / setPanelHidden', async () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "A 'go' -> B;");
    el.setAttribute('layout', 'rl');
    document.body.append(el);
    await (el as any).updateComplete;

    // aux panels (everything but viz/editor) start hidden by default; toggling
    // shows the panel, toggling again re-hides it.
    expect(el.isPanelHidden('history')).toBe(true);
    el.togglePanel('history');
    await (el as any).updateComplete;
    expect(el.isPanelHidden('history')).toBe(false);
    expect(el.shadowRoot!.querySelector('section.history')!.hasAttribute('hidden')).toBe(false);
    el.togglePanel('history');                        // back to hidden
    await (el as any).updateComplete;
    expect(el.isPanelHidden('history')).toBe(true);

    // workbench panes → hide-viz / hide-editor classes
    el.setPanelHidden('viz', true);
    el.setPanelHidden('editor', true);
    await (el as any).updateComplete;
    const wb = el.shadowRoot!.querySelector('.workbench')!;
    expect(wb.classList.contains('hide-viz')).toBe(true);
    expect(wb.classList.contains('hide-editor')).toBe(true);
    el.setPanelHidden('viz', false);
    el.setPanelHidden('editor', false);
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('.workbench')!.classList.contains('hide-viz')).toBe(false);

    // In split layouts the events (hook-log) + data-inspector panels are easing
    // side docks, lifted out of the stacked aux; actions instead lives in the
    // stack as a horizontal bar. Docked panels start hidden, so both docks start
    // closed; toggling one on flips its 'open' class (not display:none).
    expect(el.shadowRoot!.querySelector('section.hook-log')).toBeNull();        // docked, not stacked
    expect(el.shadowRoot!.querySelector('section.data-inspector')).toBeNull();  // docked, not stacked
    expect(el.shadowRoot!.querySelector('section.actions')).not.toBeNull();     // now in the stack
    expect(el.shadowRoot!.querySelector('.events-dock')!.classList.contains('open')).toBe(false);
    expect(el.shadowRoot!.querySelector('.data-dock')!.classList.contains('open')).toBe(false);
    el.togglePanel('hook-log');
    el.togglePanel('data-inspector');
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('.events-dock')!.classList.contains('open')).toBe(true);
    expect(el.shadowRoot!.querySelector('.data-dock')!.classList.contains('open')).toBe(true);

    el.remove();
  });

  it('resolves panel visibility by mode: hide / show / default / request', async () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "A 'go' -> B;");
    document.body.append(el);
    await (el as any).updateComplete;

    // default control mode: only viz + editor show
    expect(el.isPanelHidden('viz')).toBe(false);
    expect(el.isPanelHidden('editor')).toBe(false);
    expect(el.isPanelHidden('history')).toBe(true);

    // per-panel hide / show lock the state — togglePanel is a no-op for them
    el.panelModes = { history: 'show', viz: 'hide' };
    await (el as any).updateComplete;
    expect(el.isPanelHidden('history')).toBe(false);   // show
    expect(el.isPanelHidden('viz')).toBe(true);        // hide
    el.togglePanel('history');
    el.togglePanel('viz');
    await (el as any).updateComplete;
    expect(el.isPanelHidden('history')).toBe(false);   // still locked
    expect(el.isPanelHidden('viz')).toBe(true);

    // request mode: requested panels show, others fall back to default
    el.panelModes = { history: 'request', 'data-inspector': 'request' };
    el.requestedPanels = ['history'];
    await (el as any).updateComplete;
    expect(el.isPanelHidden('history')).toBe(false);          // requested → shown
    expect(el.isPanelHidden('data-inspector')).toBe(true);    // not requested → default

    // control-level mode applies when there is no per-panel override
    el.panelModes = {};
    el.panelMode = 'show';
    await (el as any).updateComplete;
    expect(el.isPanelHidden('history')).toBe(false);
    expect(el.isPanelHidden('data-inspector')).toBe(false);
    el.remove();
  });

  it('drives requestedPanels from the FSL editor:{} block, feeding request mode (fsl#1334)', async () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "editor: { panels: [history]; }; A 'go' -> B;");
    el.panelMode = 'request';
    document.body.append(el);
    await (el as any).updateComplete;

    expect(el.requestedPanels).toEqual(['history']);
    expect(el.isPanelHidden('history')).toBe(false);          // FSL-requested → shown under request mode
    expect(el.isPanelHidden('data-inspector')).toBe(true);    // not requested → default-hidden
    el.remove();
  });

  it('seeds the machine with initial data when the data property is set', async () => {
    const seed = { count: 7, items: [{ sku: 'A1', qty: 2 }] };
    const el = document.createElement('fsl-instance') as FslInstance;
    el.data = seed;
    el.setAttribute('fsl', "A 'go' -> B;");
    document.body.append(el);
    await (el as any).updateComplete;

    expect(el.machine.data()).toEqual(seed);

    el.remove();
  });

  it('updates the state-specific slot name after a transition', async () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'flip' -> On;");
    document.body.append(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.innerHTML).toContain('name="state-Off"');

    el.do('flip');
    await (el as any).updateComplete;

    expect(el.shadowRoot!.innerHTML).toContain('name="state-On"');
    expect(el.shadowRoot!.innerHTML).not.toContain('name="state-Off"');

    el.remove();
  });

  it('shows fallback placeholder content when slots are empty', async () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', 'A -> B;');
    document.body.append(el);
    await (el as any).updateComplete;

    const html_str = el.shadowRoot!.innerHTML;
    // Title slot has the fsl-instance placeholder.
    expect(html_str).toContain('fsl-instance');
    expect(html_str).toContain('no viz configured');

    el.remove();
  });

  it('renders the placeholder state slot name before connection', () => {
    // Direct render-method call with no machine attached covers the
    // pre-connection render branch (state slot becomes "state-unknown").
    const inst = new FslInstance();
    const result = inst.render();
    // The dynamic value is interpolated into the template; it should be
    // the unknown placeholder when no machine is set.
    expect(result.values).toContain('state-unknown');
  });

});

describe('mixed-prefix companion discovery', () => {

  it('discovers a jssm-on child under a fsl-instance host', () => {
    // A <jssm-on> child under <fsl-instance> must be discovered and wired.
    // We verify by checking the host drives the subscription: the handler
    // fires on the transition and updates a local flag.
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'go' -> On;");

    const on_el = document.createElement('jssm-on');
    on_el.setAttribute('event', 'transition');
    let fired = false;
    // Use a named handler on globalThis so the inline resolver can find it.
    (globalThis as any)['_test_mixed_prefix_handler'] = () => { fired = true; };
    on_el.setAttribute('handler', '_test_mixed_prefix_handler');
    el.append(on_el);

    document.body.append(el);
    el.do('go');
    expect(fired).toBe(true);

    el.remove();
    delete (globalThis as any)['_test_mixed_prefix_handler'];
  });

});

/**
 * Helper: create a connected `<fsl-instance>` from an FSL string and return
 * it.  Caller is responsible for `document.body.removeChild`.
 */
function mount_instance(fsl: string): FslInstance {
  const el = document.createElement('fsl-instance') as FslInstance;
  el.setAttribute('fsl', fsl);
  document.body.append(el);
  return el;
}

describe('FslInstance DOM CustomEvent re-emission (mechanism 4, #639)', () => {

  it('dispatches a composed, bubbling fsl-transition with from/to/action detail', async () => {
    const el = mount_instance("Off 'flip' -> On;");
    const seen: CustomEvent[] = [];
    el.addEventListener('fsl-transition', e => { seen.push(e as CustomEvent); });

    el.do('flip');
    await el.updateComplete;

    expect(seen).toHaveLength(1);
    const e = seen[0]!;
    expect(e.bubbles).toBe(true);
    expect(e.composed).toBe(true);
    expect(e.detail.from).toBe('Off');
    expect(e.detail.to).toBe('On');
    expect(e.detail.action).toBe('flip');

    el.remove();
  });

  it('paints the new state to host attributes before the fsl-transition handler runs', async () => {
    const el = mount_instance("Off 'flip' -> On;");
    let state_in_handler: string | null = null;
    el.addEventListener('fsl-transition', () => {
      state_in_handler = el.getAttribute('current-state');
    });

    el.do('flip');
    await el.updateComplete;

    // Ordering guarantee (#639): mechanism 1 reflection precedes mechanism 4 dispatch.
    expect(state_in_handler).toBe('On');

    el.remove();
  });

  it('also dispatches fsl-exit and fsl-entry on a transition', async () => {
    const el = mount_instance("Off 'flip' -> On;");
    const names: string[] = [];
    el.addEventListener('fsl-exit',  () => { names.push('exit'); });
    el.addEventListener('fsl-entry', () => { names.push('entry'); });

    el.do('flip');
    await el.updateComplete;

    expect(names).toContain('exit');
    expect(names).toContain('entry');

    el.remove();
  });

  it('re-emits even when the machine is driven directly via host.machine.action()', async () => {
    const el = mount_instance("Off 'flip' -> On;");
    const seen: CustomEvent[] = [];
    el.addEventListener('fsl-transition', e => { seen.push(e as CustomEvent); });

    el.machine.action('flip');   // bypasses host.do()
    await el.updateComplete;

    expect(seen).toHaveLength(1);
    expect(seen[0]!.detail.to).toBe('On');

    el.remove();
  });

  it('stops dispatching after the host is disconnected', async () => {
    const el = mount_instance("Off 'flip' -> On 'flip' -> Off;");
    const seen: CustomEvent[] = [];
    el.addEventListener('fsl-transition', e => { seen.push(e as CustomEvent); });

    el.remove();   // disconnectedCallback unsubscribes
    el.machine.action('flip');       // machine still alive, WC detached
    await Promise.resolve();

    expect(seen).toHaveLength(0);
  });

});

describe('FslInstance default-template slots (S2)', () => {

  it('exposes a named slot for every sub-component panel', async () => {
    const el = mount_instance('A -> B;');
    await el.updateComplete;

    const slot_names = [...el.shadowRoot!.querySelectorAll('slot')]
      .map(s => s.getAttribute('name'));

    for (const name of ['history', 'data-inspector', 'hook-log',
                        'effective-properties', 'simulation', 'export']) {
      expect(slot_names).toContain(name);
    }

    el.remove();
  });

});

describe('FslInstance theming', () => {

  const mount_theme = (attrs: Record<string, string> = {}): FslInstance => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', 'a -> b;');
    for (const [k, v] of Object.entries(attrs)) { el.setAttribute(k, v); }
    document.body.append(el);
    return el;
  };
  const surface = (el: FslInstance): string => el.style.getPropertyValue('--fsl-color-surface').trim();

  it('applies the Default light palette inline and reflects resolved-theme', async () => {
    const el = mount_theme();
    await el.updateComplete;
    expect(surface(el)).toBe('#ffffff');
    expect(el.getAttribute('resolved-theme')).toBe('light');
    el.remove();
  });

  it('applies the dark variant when theme=dark', async () => {
    const el = mount_theme({ theme: 'dark' });
    await el.updateComplete;
    expect(surface(el)).toBe('#1e1e22');
    expect(el.getAttribute('resolved-theme')).toBe('dark');
    el.remove();
  });

  it('applies a named theme and falls back to Default for an unknown name', async () => {
    const el = mount_theme({ 'theme-name': 'Solarized' });
    await el.updateComplete;
    expect(surface(el)).toBe('#fdf6e3');               // Solarized light
    el.themeName = 'Nonexistent';
    await el.updateComplete;
    expect(surface(el)).toBe('#ffffff');               // unknown name → Default light
    el.remove();
  });

  it("drives a slotted editor's theme to the resolved variant", async () => {
    const el = mount_theme();
    await el.updateComplete;
    const ed = document.createElement('div');
    ed.setAttribute('slot', 'editor');
    (ed as unknown as { theme: string }).theme = 'unset';
    el.append(ed);
    el.theme = 'dark';                                 // updated → _applyTheme drives the editor
    await el.updateComplete;
    expect((ed as unknown as { theme: string }).theme).toBe('dark');
    el.remove();
  });

  it('resolves system mode from the OS and re-applies on OS change (mocked matchMedia)', async () => {
    let prefersDark = true;
    let osHandler: (() => void) | undefined;
    const original = matchMedia;
    globalThis.matchMedia = ((q: string) => ({
      get matches() { return prefersDark; },
      media: q,
      addEventListener: (_e: string, h: () => void) => { osHandler = h; },
      removeEventListener: (): void => { osHandler = undefined; },
    })) as unknown as typeof window.matchMedia;

    const el = mount_theme({ theme: 'system' });
    await el.updateComplete;
    expect(el.getAttribute('resolved-theme')).toBe('dark');     // OS prefers dark
    expect(surface(el)).toBe('#1e1e22');

    prefersDark = false;
    osHandler!();                                                // OS switches to light
    await el.updateComplete;
    expect(el.getAttribute('resolved-theme')).toBe('light');

    el.theme = 'dark';                                           // a fixed mode ignores OS changes
    await el.updateComplete;
    prefersDark = true;
    osHandler!();
    await el.updateComplete;
    expect(el.getAttribute('resolved-theme')).toBe('dark');

    el.remove();
    globalThis.matchMedia = original;
  });

});

describe('FslInstance permalink restore', () => {

  it('restores its machine from the URL fragment when given an id', async () => {
    const { encode_machine } = await import('../fsl_permalink');
    const seg = await encode_machine('Up -> Down;');
    history.replaceState(history.state, '', `#mach=${seg}`);

    const el = document.createElement('fsl-instance') as FslInstance;
    el.id = 'mach';
    el.setAttribute('fsl', 'Left -> Right;');        // declared source — should be overridden
    document.body.append(el);
    await el.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(el.fsl).toBe('Up -> Down;');

    el.remove();
    history.replaceState(history.state, '', location.pathname);
  });

  it('builds a working machine from a permalink when no source is declared', async () => {
    const { encode_machine } = await import('../fsl_permalink');
    const seg = await encode_machine('Up -> Down;');
    history.replaceState(history.state, '', `#solo=${seg}`);

    const el = document.createElement('fsl-instance') as FslInstance;
    el.id = 'solo';                                // no fsl/script/text — the URL is the only source
    document.body.append(el);                 // must NOT throw despite no declared source
    await el.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 20));      // restore + deferred build

    expect(el.fsl).toBe('Up -> Down;');
    expect(el.machine.state()).toBe('Up');         // the deferred build produced a live machine
    el.transition('Down');
    expect(el.machine.state()).toBe('Down');       // and it is drivable

    el.remove();
    history.replaceState(history.state, '', location.pathname);
  });

  it('still throws on connect when there is no source and no permalink segment', () => {
    const err = capture_connection_error(() => {
      const el = document.createElement('fsl-instance') as FslInstance;
      el.id = 'absent';                            // a key, but no #absent= segment and no declared source
      document.body.append(el);
    });
    expect(err).not.toBeNull();
    expect(err!.message).toMatch(/no FSL source/);
  });

  it('does not throw when an action fires before the deferred machine is built', async () => {
    const { encode_machine } = await import('../fsl_permalink');
    const seg = await encode_machine('Up -> Down;');
    history.replaceState(history.state, '', `#act=${seg}`);

    const el = document.createElement('fsl-instance') as FslInstance;
    el.id = 'act';
    const btn = document.createElement('button');
    btn.dataset.jssmAction = 'go';
    el.append(btn);
    document.body.append(el);                 // deferred — _machine still undefined

    // Fire the wired action during the restore window: it must be a no-op, not a
    // throw through the `machine` getter.
    expect(() => btn.click()).not.toThrow();

    el.remove();
    history.replaceState(history.state, '', location.pathname);
  });

});
