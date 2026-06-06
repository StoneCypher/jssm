/**
 * @vitest-environment jsdom
 */

import '../jssm_instance_wc.define';
import { JssmInstance, resolve_fsl_source } from '../jssm_instance_wc';

describe('JssmInstance registration', () => {

  it('registers the jssm-instance tag', () => {
    expect(customElements.get('jssm-instance')).toBe(JssmInstance);
  });

  it('creates an element with createElement', () => {
    const el = document.createElement('jssm-instance');
    expect(el).toBeInstanceOf(JssmInstance);
  });

});

describe('JssmInstance re-registration', () => {

  it('does not re-define or throw when the define module is re-evaluated', async () => {
    const before = customElements.get('jssm-instance');
    expect(before).toBe(JssmInstance);

    vi.resetModules();
    await expect(import('../jssm_instance_wc.define')).resolves.toBeDefined();

    expect(customElements.get('jssm-instance')).toBe(before);
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

  it('keeps non-jssm child element contributions to textContent', () => {
    // The filter that drops <jssm-*> tags has a false branch for any non-jssm
    // descendant: that contribution must remain in the assembled FSL text.
    // This exercises the "tagName does NOT start with jssm-" branch.
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

describe('JssmInstance lifecycle', () => {

  it('throws on connect when no FSL source is provided', () => {
    const err = capture_connection_error(() => {
      const el = document.createElement('jssm-instance');
      document.body.appendChild(el);
    });
    expect(err).not.toBeNull();
    expect(err!.message).toMatch(/no FSL source/);
  });

  it('throws on connect when more than one source is provided', () => {
    const err = capture_connection_error(() => {
      const el = document.createElement('jssm-instance') as JssmInstance;
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
    const el = document.createElement('jssm-instance') as JssmInstance;
    el.setAttribute('fsl', 'Off -> On;');
    document.body.appendChild(el);

    expect(el.machine).toBeDefined();
    expect(el.state()).toBe('Off');

    document.body.removeChild(el);
  });

  it('constructs a machine from a <script type="text/fsl"> child', () => {
    const el = document.createElement('jssm-instance') as JssmInstance;
    const script = document.createElement('script');
    script.setAttribute('type', 'text/fsl');
    script.textContent = 'Red -> Green;';
    el.appendChild(script);
    document.body.appendChild(el);

    expect(el.state()).toBe('Red');

    document.body.removeChild(el);
  });

  it('constructs a machine from textContent', () => {
    const el = document.createElement('jssm-instance') as JssmInstance;
    el.textContent = 'Alpha -> Beta;';
    document.body.appendChild(el);

    expect(el.state()).toBe('Alpha');

    document.body.removeChild(el);
  });

  it('drives transitions via host.do() and reflects updated state', () => {
    const el = document.createElement('jssm-instance') as JssmInstance;
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
    const el = document.createElement('jssm-instance') as JssmInstance;
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
    const el = document.createElement('jssm-instance') as JssmInstance;
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
    const el = document.createElement('jssm-instance') as JssmInstance;
    el.setAttribute('fsl', "Off 'flip' -> On;");
    document.body.appendChild(el);

    // jsdom exposes inline style.getPropertyValue.
    expect(el.style.getPropertyValue('--current-state')).toBe('Off');

    el.do('flip');
    expect(el.style.getPropertyValue('--current-state')).toBe('On');

    document.body.removeChild(el);
  });

  it('throws when machine is accessed before connection', () => {
    const el = document.createElement('jssm-instance') as JssmInstance;
    expect(() => el.machine).toThrow(/before connection/);
  });

  it('cleans up on disconnect without throwing', () => {
    const el = document.createElement('jssm-instance') as JssmInstance;
    el.setAttribute('fsl', 'A -> B;');
    document.body.appendChild(el);
    expect(() => document.body.removeChild(el)).not.toThrow();
  });

});

describe('JssmInstance shadow DOM', () => {

  it('renders the named slots and the state-specific slot', async () => {
    const el = document.createElement('jssm-instance') as JssmInstance;
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

  it('updates the state-specific slot name after a transition', async () => {
    const el = document.createElement('jssm-instance') as JssmInstance;
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
    const el = document.createElement('jssm-instance') as JssmInstance;
    el.setAttribute('fsl', 'A -> B;');
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const html_str = el.shadowRoot!.innerHTML;
    // Title and viz both have explicit fallback strings.
    expect(html_str).toContain('jssm-instance');
    expect(html_str).toContain('no viz configured');

    document.body.removeChild(el);
  });

  it('renders the placeholder state slot name before connection', () => {
    // Direct render-method call with no machine attached covers the
    // pre-connection render branch (state slot becomes "state-unknown").
    const inst = new JssmInstance();
    const result = inst.render();
    // The dynamic value is interpolated into the template; it should be
    // the unknown placeholder when no machine is set.
    expect(result.values).toContain('state-unknown');
  });

});
