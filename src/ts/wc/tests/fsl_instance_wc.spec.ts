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
    host.appendChild(script);
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
    host.appendChild(document.createTextNode('   X -> Y;   '));
    const hook = document.createElement('jssm-hook');
    hook.textContent = 'handlerName';
    host.appendChild(hook);
    host.appendChild(document.createTextNode('   '));
    const r = resolve_fsl_source(host, '');
    expect(r.fsl).toBe('X -> Y;');
    expect(r.error).toBeUndefined();
  });

  it('strips <fsl-*> companion-tag children from the textContent channel', () => {
    // prefix-agnostic stripping: <fsl-hook> must also be excluded.
    const host = document.createElement('div');
    host.appendChild(document.createTextNode('   P -> Q;   '));
    const hook = document.createElement('fsl-hook');
    hook.textContent = 'handlerName';
    host.appendChild(hook);
    host.appendChild(document.createTextNode('   '));
    const r = resolve_fsl_source(host, '');
    expect(r.fsl).toBe('P -> Q;');
    expect(r.error).toBeUndefined();
  });

  it('keeps non-fsl/non-jssm child element contributions to textContent', () => {
    // The filter that drops <fsl-*>/<jssm-*> tags has a false branch for any
    // other descendant: that contribution must remain in the assembled FSL text.
    const host = document.createElement('div');
    host.appendChild(document.createTextNode('M -> N'));
    const span = document.createElement('span');
    span.textContent = ';';
    host.appendChild(span);
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
    host.appendChild(script);
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
    host.appendChild(panel);
    const r = resolve_fsl_source(host, 'Off -> On;');   // only the fsl attribute counts
    expect(r.fsl).toBe('Off -> On;');
    expect(r.provided_count).toBe(1);
  });

  it('errors when all three channels are provided', () => {
    const host = document.createElement('div');
    const script = document.createElement('script');
    script.setAttribute('type', 'text/fsl');
    script.textContent = 'A -> B;';
    host.appendChild(script);
    // Add some extra text content after the script element.
    host.appendChild(document.createTextNode(' E -> F;'));
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
    host.appendChild(script);
    const r = resolve_fsl_source(host, '');
    expect(r.fsl).toBeUndefined();
    expect(r.provided_count).toBe(0);
    expect(r.error).toBe('no FSL source');
  });

  it('treats a whitespace-only fsl attribute as empty', () => {
    const host = document.createElement('div');
    const r = resolve_fsl_source(host, '   ');
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
    host.appendChild(script);
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
 *
 * @param fn - Function that triggers the throwing connection.
 * @returns The captured Error (or `null` if nothing was thrown).
 */
function capture_connection_error(fn: () => void): Error | null {
  let captured: Error | null = null;
  const handler = (e: ErrorEvent) => {
    e.preventDefault();
    captured = e.error instanceof Error ? e.error : new Error(String(e.message));
  };
  window.addEventListener('error', handler);
  try {
    fn();
  } finally {
    window.removeEventListener('error', handler);
  }
  return captured;
}

describe('FslInstance lifecycle (via fsl-instance tag)', () => {

  it('throws on connect when no FSL source is provided', () => {
    const err = capture_connection_error(() => {
      const el = document.createElement('fsl-instance');
      document.body.appendChild(el);
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
      el.appendChild(script);
      document.body.appendChild(el);
    });
    expect(err).not.toBeNull();
    expect(err!.message).toMatch(/use exactly one source/);
  });

  it('constructs a machine from the fsl attribute and exposes it', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', 'Off -> On;');
    document.body.appendChild(el);

    expect(el.machine).toBeDefined();
    expect(el.state()).toBe('Off');

    document.body.removeChild(el);
  });

  it('constructs a machine from a <script type="text/fsl"> child', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    const script = document.createElement('script');
    script.setAttribute('type', 'text/fsl');
    script.textContent = 'Red -> Green;';
    el.appendChild(script);
    document.body.appendChild(el);

    expect(el.state()).toBe('Red');

    document.body.removeChild(el);
  });

  it('constructs a machine from textContent', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.textContent = 'Alpha -> Beta;';
    document.body.appendChild(el);

    expect(el.state()).toBe('Alpha');

    document.body.removeChild(el);
  });

  it('drives transitions via host.do() and reflects updated state', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'flip' -> On 'flip' -> Off;");
    document.body.appendChild(el);

    expect(el.state()).toBe('Off');
    expect(el.getAttribute('current-state')).toBe('Off');

    const ok = el.do('flip');
    expect(ok).toBe(true);
    expect(el.state()).toBe('On');
    expect(el.getAttribute('current-state')).toBe('On');

    document.body.removeChild(el);
  });

  it('returns false from host.do() when the action is illegal', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'flip' -> On;");
    document.body.appendChild(el);

    // After flipping to On, On has no exits.  A second flip must fail.
    el.do('flip');
    expect(el.state()).toBe('On');
    const ok = el.do('flip');
    expect(ok).toBe(false);

    document.body.removeChild(el);
  });

  it('reflects legal-actions, terminal, and complete host attributes', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'flip' -> On;");
    document.body.appendChild(el);

    expect(el.getAttribute('legal-actions')).toContain('flip');
    // Off is not terminal/complete; On (after flipping) becomes terminal.
    expect(el.hasAttribute('terminal')).toBe(false);

    el.do('flip');
    expect(el.state()).toBe('On');
    expect(el.hasAttribute('terminal')).toBe(true);

    document.body.removeChild(el);
  });

  it('sets the --current-state CSS custom property on the host', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'flip' -> On;");
    document.body.appendChild(el);

    // jsdom exposes inline style.getPropertyValue.
    expect(el.style.getPropertyValue('--current-state')).toBe('Off');

    el.do('flip');
    expect(el.style.getPropertyValue('--current-state')).toBe('On');

    document.body.removeChild(el);
  });

  it('throws when machine is accessed before connection', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    expect(() => el.machine).toThrow(/before connection/);
  });

  it('cleans up on disconnect without throwing', () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', 'A -> B;');
    document.body.appendChild(el);
    expect(() => document.body.removeChild(el)).not.toThrow();
  });

});

describe('jssm-instance synonym lifecycle', () => {

  it('constructs a working machine via the jssm-instance synonym tag', () => {
    const el = document.createElement('jssm-instance') as FslInstance;
    el.setAttribute('fsl', 'Off -> On;');
    document.body.appendChild(el);

    expect(el.machine).toBeDefined();
    expect(el.state()).toBe('Off');

    document.body.removeChild(el);
  });

  it('drives transitions via jssm-instance synonym', () => {
    const el = document.createElement('jssm-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'go' -> On;");
    document.body.appendChild(el);

    expect(el.do('go')).toBe(true);
    expect(el.state()).toBe('On');

    document.body.removeChild(el);
  });

});

describe('FslInstance shadow DOM', () => {

  it('renders the named slots and the state-specific slot', async () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'flip' -> On;");
    document.body.appendChild(el);
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

    document.body.removeChild(el);
  });

  it('reflects the theme property so its built-in palette can drive the suite', async () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'flip' -> On;");
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.theme).toBe('light');                  // default
    el.theme = 'dark';
    await (el as any).updateComplete;
    expect(el.getAttribute('theme')).toBe('dark');   // reflected to the attribute

    document.body.removeChild(el);
  });

  it('shows and hides panels via togglePanel / setPanelHidden', async () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "A 'go' -> B;");
    el.setAttribute('layout', 'rl');
    document.body.appendChild(el);
    await (el as any).updateComplete;

    // aux panel section → hidden attribute
    expect(el.isPanelHidden('history')).toBe(false);
    el.togglePanel('history');
    await (el as any).updateComplete;
    expect(el.isPanelHidden('history')).toBe(true);
    expect(el.shadowRoot!.querySelector('section.history')!.hasAttribute('hidden')).toBe(true);
    el.togglePanel('history');                        // back on
    await (el as any).updateComplete;
    expect(el.isPanelHidden('history')).toBe(false);

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

    // actions + data-inspector are easing side docks in split layouts: lifted out
    // of the stacked aux, and the toggle flips an 'open' class (not display:none).
    expect(el.shadowRoot!.querySelector('section.data-inspector')).toBeNull();
    expect(el.shadowRoot!.querySelector('.actions-dock')!.classList.contains('open')).toBe(true);
    expect(el.shadowRoot!.querySelector('.data-dock')!.classList.contains('open')).toBe(true);
    el.togglePanel('data-inspector');
    el.togglePanel('actions');
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('.data-dock')!.classList.contains('open')).toBe(false);
    expect(el.shadowRoot!.querySelector('.actions-dock')!.classList.contains('open')).toBe(false);

    document.body.removeChild(el);
  });

  it('seeds the machine with initial data when the data property is set', async () => {
    const seed = { count: 7, items: [{ sku: 'A1', qty: 2 }] };
    const el = document.createElement('fsl-instance') as FslInstance;
    el.data = seed;
    el.setAttribute('fsl', "A 'go' -> B;");
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.machine.data()).toEqual(seed);

    document.body.removeChild(el);
  });

  it('updates the state-specific slot name after a transition', async () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', "Off 'flip' -> On;");
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.innerHTML).toContain('name="state-Off"');

    el.do('flip');
    await (el as any).updateComplete;

    expect(el.shadowRoot!.innerHTML).toContain('name="state-On"');
    expect(el.shadowRoot!.innerHTML).not.toContain('name="state-Off"');

    document.body.removeChild(el);
  });

  it('shows fallback placeholder content when slots are empty', async () => {
    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', 'A -> B;');
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const html_str = el.shadowRoot!.innerHTML;
    // Title slot has the fsl-instance placeholder.
    expect(html_str).toContain('fsl-instance');
    expect(html_str).toContain('no viz configured');

    document.body.removeChild(el);
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
    el.appendChild(on_el);

    document.body.appendChild(el);
    el.do('go');
    expect(fired).toBe(true);

    document.body.removeChild(el);
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
  document.body.appendChild(el);
  return el;
}

describe('FslInstance DOM CustomEvent re-emission (mechanism 4, #639)', () => {

  it('dispatches a composed, bubbling fsl-transition with from/to/action detail', async () => {
    const el = mount_instance("Off 'flip' -> On;");
    const seen: CustomEvent[] = [];
    el.addEventListener('fsl-transition', e => seen.push(e as CustomEvent));

    el.do('flip');
    await el.updateComplete;

    expect(seen).toHaveLength(1);
    const e = seen[0]!;
    expect(e.bubbles).toBe(true);
    expect(e.composed).toBe(true);
    expect(e.detail.from).toBe('Off');
    expect(e.detail.to).toBe('On');
    expect(e.detail.action).toBe('flip');

    document.body.removeChild(el);
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

    document.body.removeChild(el);
  });

  it('also dispatches fsl-exit and fsl-entry on a transition', async () => {
    const el = mount_instance("Off 'flip' -> On;");
    const names: string[] = [];
    el.addEventListener('fsl-exit',  () => names.push('exit'));
    el.addEventListener('fsl-entry', () => names.push('entry'));

    el.do('flip');
    await el.updateComplete;

    expect(names).toContain('exit');
    expect(names).toContain('entry');

    document.body.removeChild(el);
  });

  it('re-emits even when the machine is driven directly via host.machine.action()', async () => {
    const el = mount_instance("Off 'flip' -> On;");
    const seen: CustomEvent[] = [];
    el.addEventListener('fsl-transition', e => seen.push(e as CustomEvent));

    el.machine.action('flip');   // bypasses host.do()
    await el.updateComplete;

    expect(seen).toHaveLength(1);
    expect(seen[0]!.detail.to).toBe('On');

    document.body.removeChild(el);
  });

  it('stops dispatching after the host is disconnected', async () => {
    const el = mount_instance("Off 'flip' -> On 'flip' -> Off;");
    const seen: CustomEvent[] = [];
    el.addEventListener('fsl-transition', e => seen.push(e as CustomEvent));

    document.body.removeChild(el);   // disconnectedCallback unsubscribes
    el.machine.action('flip');       // machine still alive, WC detached
    await Promise.resolve();

    expect(seen).toHaveLength(0);
  });

});

describe('FslInstance default-template slots (S2)', () => {

  it('exposes a named slot for every sub-component panel', async () => {
    const el = mount_instance('A -> B;');
    await el.updateComplete;

    const slot_names = Array.from(el.shadowRoot!.querySelectorAll('slot'))
      .map(s => s.getAttribute('name'));

    for (const name of ['history', 'data-inspector', 'hook-log',
                        'effective-properties', 'simulation', 'export']) {
      expect(slot_names).toContain(name);
    }

    document.body.removeChild(el);
  });

});
