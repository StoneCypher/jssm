// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import '../fsl_instance_wc.define.js';
import { FslToolbar, permalink_for, fsl_from_permalink, embed_snippet_for } from '../fsl_toolbar_wc.js';
import { FslEditor } from '../fsl_editor_wc.js';
import { FslInstance } from '../fsl_instance_wc.js';

beforeAll(() => {
  if (!customElements.get('fsl-toolbar')) { customElements.define('fsl-toolbar', FslToolbar); }
  if (!customElements.get('fsl-editor'))  { customElements.define('fsl-editor', FslEditor); }
});

function q(el: FslToolbar, sel: string): HTMLElement {
  return el.shadowRoot!.querySelector(sel) as HTMLElement;
}
function byLabel(el: FslToolbar, label: string): HTMLButtonElement {
  // eslint-disable-next-line unicorn/require-css-escape -- this jsdom has no CSS global (CSS.escape throws ReferenceError); every label passed is a static ASCII word needing no escaping
  return el.shadowRoot!.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement;
}
function byText(el: FslToolbar, sel: string, text: string): HTMLElement {
  return [...el.shadowRoot!.querySelectorAll(sel)].find(b => b.textContent!.includes(text)) as HTMLElement;
}

describe('<fsl-toolbar>', () => {

  it('themes the suite, toggles present panels, drives layout, and exports', async () => {
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', "A 'go' -> B;");
    host.setAttribute('layout', 'rl');
    const editor = document.createElement('fsl-editor') as FslEditor;
    editor.setAttribute('slot', 'editor');
    const vizStub = document.createElement('div'); vizStub.setAttribute('slot', 'viz');
    const histStub = document.createElement('div'); histStub.setAttribute('slot', 'history');
    const toolbar = document.createElement('fsl-toolbar') as FslToolbar;
    toolbar.setAttribute('slot', 'toolbar');
    host.append(vizStub, editor, histStub, toolbar);
    document.body.append(host);
    await host.updateComplete;
    await toolbar.updateComplete;

    // Theme pulldown: System/Light/Dark modes drive host.theme; the registry
    // theme list drives host.themeName. The menu stays open across selections
    // (two radio groups) and closes on toggling the Theme button.
    byLabel(toolbar, 'Theme').click();
    await toolbar.updateComplete;
    byText(toolbar, '.menu button', 'Dark').click();
    await toolbar.updateComplete;
    expect(host.theme).toBe('dark');
    byText(toolbar, '.menu button', 'System').click();
    await toolbar.updateComplete;
    expect(host.theme).toBe('system');
    byText(toolbar, '.menu button', 'Solarized').click();         // a built-in registry theme
    await toolbar.updateComplete;
    expect(host.themeName).toBe('Solarized');
    byLabel(toolbar, 'Theme').click();                            // toggle the still-open menu closed
    await toolbar.updateComplete;
    expect(q(toolbar, '.menu')).toBeNull();

    // one toggle per present panel (Renderer/Code/History); absent panels have none
    expect(byLabel(toolbar, 'Renderer')).not.toBeNull();
    expect(byLabel(toolbar, 'History')).not.toBeNull();
    expect(byLabel(toolbar, 'Data')).toBeNull();
    byLabel(toolbar, 'Code').click();
    await toolbar.updateComplete;
    expect(host.isPanelHidden('editor')).toBe(true);

    // Layout menu → host.layout
    byLabel(toolbar, 'Layout').click();
    await toolbar.updateComplete;
    byText(toolbar, '.menu button', 'Tabbed').click();
    await toolbar.updateComplete;
    expect(host.getAttribute('layout')).toBe('tabs');
    expect(q(toolbar, '.menu')).toBeNull();

    // Export pulldown opens, toggles closed, and the three formats emit fsl-export
    byLabel(toolbar, 'Export').click();
    await toolbar.updateComplete;
    expect(q(toolbar, '.menu')).not.toBeNull();
    byLabel(toolbar, 'Export').click();           // toggle the same menu closed
    await toolbar.updateComplete;
    expect(q(toolbar, '.menu')).toBeNull();

    const got: Array<{ format: string; content: string; destination: string }> = [];
    // dot/json/fsl resolve synchronously; SVG is async (graphviz), so wait for all four.
    const allExported = new Promise<void>(resolve => {
      toolbar.addEventListener('fsl-export', e => {
        got.push((e as CustomEvent).detail);
        if (got.length === 4) { resolve(); }
      });
    });
    for (const label of ['Graphviz DOT', 'JSON (serialized)', 'FSL source', 'SVG']) {
      byLabel(toolbar, 'Export').click();
      await toolbar.updateComplete;
      byText(toolbar, '.menu button', label).click();
      await toolbar.updateComplete;
    }
    await allExported;
    expect(got.map(g => g.format)).toEqual(['dot', 'json', 'fsl', 'svg']);
    expect(got[0].content).toContain('digraph');
    expect(got[1].content).toContain('jssm_version');
    expect(got[2].content).toContain("A 'go' -> B");
    expect(got[3].content).toContain('<svg');
    expect(got.every(g => g.destination === 'clipboard')).toBe(true);   // default destination

    // Destination radios: only clipboard + "choose directory" until a saved
    // directory name is reported by the embedder.
    const destCount = (): number => toolbar.shadowRoot!.querySelectorAll('[role="menuitemradio"]').length;
    byLabel(toolbar, 'Export').click();
    await toolbar.updateComplete;
    expect(destCount()).toBe(2);
    byText(toolbar, '.menu button', 'to clipboard').click();   // select the default destination

    // "choose directory" tags the next export `pick`.
    byText(toolbar, '.menu button', 'choose directory').click();
    await toolbar.updateComplete;
    const pickDetail = new Promise<{ destination: string }>(resolve =>
      toolbar.addEventListener('fsl-export', e => resolve((e as CustomEvent).detail), { once: true }));
    byText(toolbar, '.menu button', 'FSL source').click();
    const picked = await pickDetail;
    expect(picked.destination).toBe('pick');

    // Once a directory name is set, a "to <name>" destination appears + targets `lastdir`.
    toolbar.lastDirectory = 'exports';
    await toolbar.updateComplete;
    byLabel(toolbar, 'Export').click();
    await toolbar.updateComplete;
    expect(destCount()).toBe(3);
    byText(toolbar, '.menu button', 'to exports').click();
    await toolbar.updateComplete;
    const lastDetail = new Promise<{ destination: string }>(resolve =>
      toolbar.addEventListener('fsl-export', e => resolve((e as CustomEvent).detail), { once: true }));
    byText(toolbar, '.menu button', 'Graphviz DOT').click();
    const lasted = await lastDetail;
    expect(lasted.destination).toBe('lastdir');
    host.remove();
  });

  it('builds a compressed, URL-safe permalink that round-trips', async () => {
    // Exact round-trip across short, quoted, Unicode, and long compressible FSL.
    for (const fsl of [
      'a -> b;',
      "A 'go' -> B; B 'back' -> A;",
      'café ☕ → ★;',
      "Green 'next' -> Yellow 'next' -> Red 'next' -> Green;\nRed ~> Off; Yellow ~> Off; Green ~> Off;".repeat(4),
    ]) {
      const link = await permalink_for(fsl);
      expect(link).toContain('#m=');
      // The fragment is a one-digit scheme tag followed by the URL-safe base64
      // alphabet only — nothing that would need percent-escaping.
      expect(link.split('#m=', 2)[1]).toMatch(/^[01][\w-]*$/);
      expect(await fsl_from_permalink(link)).toBe(fsl);
    }

    // A long machine actually compresses (scheme '1') and beats the old
    // percent-encoded `#fsl=` form on length.
    const big  = "Green 'next' -> Yellow 'next' -> Red 'next' -> Green;\nRed ~> Off; Yellow ~> Off; Green ~> Off;".repeat(4);
    const link = await permalink_for(big);
    expect(link.split('#m=', 2)[1][0]).toBe('1');
    expect(link.length).toBeLessThan(`#fsl=${encodeURIComponent(big)}`.length);

    // A URL with no permalink fragment decodes to null.
    expect(await fsl_from_permalink('https://host/path')).toBeNull();

    const embed = embed_snippet_for('a -> b;');
    expect(embed).toContain('<fsl-instance>');
    expect(embed).toContain('cdn.jsdelivr.net/npm/jssm/dist/cdn/instance.js');
    expect(embed).toContain('<fsl-viz slot="viz">');
    expect(embed).toContain('a -> b;');
  });

  it('exports a permalink and an embed snippet via the menu', async () => {
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', "A 'go' -> B;");
    const vizStub = document.createElement('div'); vizStub.setAttribute('slot', 'viz');
    const toolbar = document.createElement('fsl-toolbar') as FslToolbar;
    toolbar.setAttribute('slot', 'toolbar');
    host.append(vizStub, toolbar);
    document.body.append(host);
    await host.updateComplete;
    await toolbar.updateComplete;

    for (const [label, fmt, needle] of [
      ['Permalink (URL)', 'permalink', '#m='],
      ['Embed snippet',   'embed',     '<fsl-instance>'],
    ] as const) {
      const detail = new Promise<{ format: string; content: string }>(resolve =>
        toolbar.addEventListener('fsl-export', e => resolve((e as CustomEvent).detail), { once: true }));
      byLabel(toolbar, 'Export').click();
      await toolbar.updateComplete;
      byText(toolbar, '.menu button', label).click();
      const d = await detail;
      expect(d.format).toBe(fmt);
      expect(d.content).toContain(needle);
    }
    host.remove();
  });

  it('exports a permalink under the host key, merging into an existing fragment', async () => {
    history.replaceState(history.state, '', '#other=0ZZZ');   // a sibling segment already present
    const host = document.createElement('fsl-instance') as FslInstance;
    host.id = 'mykey';
    host.setAttribute('fsl', 'a -> b;');
    const vizStub = document.createElement('div'); vizStub.setAttribute('slot', 'viz');
    const toolbar = document.createElement('fsl-toolbar') as FslToolbar;
    toolbar.setAttribute('slot', 'toolbar');
    host.append(vizStub, toolbar);
    document.body.append(host);
    await host.updateComplete;
    await toolbar.updateComplete;

    const detail = new Promise<{ content: string }>(resolve =>
      toolbar.addEventListener('fsl-export', e => resolve((e as CustomEvent).detail), { once: true }));
    byLabel(toolbar, 'Export').click();
    await toolbar.updateComplete;
    byText(toolbar, '.menu button', 'Permalink (URL)').click();
    const { content } = await detail;

    expect(content).toContain('other=0ZZZ');   // sibling segment preserved
    expect(content).toContain('mykey=');         // host id used as the key
    host.remove();
    history.replaceState(history.state, '', location.pathname);
  });

  it('fires fsl-validate / fsl-lint, suppressible via no-validate / no-lint', async () => {
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', "A 'go' -> B;");
    const vizStub = document.createElement('div'); vizStub.setAttribute('slot', 'viz');
    const toolbar = document.createElement('fsl-toolbar') as FslToolbar;
    toolbar.setAttribute('slot', 'toolbar');
    host.append(vizStub, toolbar);
    document.body.append(host);
    await host.updateComplete;
    await toolbar.updateComplete;

    expect(byLabel(toolbar, 'Validate')).not.toBeNull();
    expect(byLabel(toolbar, 'Lint')).not.toBeNull();

    // each button fires its intent with the current machine source in the detail
    const vDetail = new Promise<{ fsl: string }>(resolve =>
      toolbar.addEventListener('fsl-validate', e => resolve((e as CustomEvent).detail), { once: true }));
    byLabel(toolbar, 'Validate').click();
    const validated = await vDetail;
    expect(validated.fsl).toContain("A 'go' -> B");

    const lDetail = new Promise<{ fsl: string }>(resolve =>
      toolbar.addEventListener('fsl-lint', e => resolve((e as CustomEvent).detail), { once: true }));
    byLabel(toolbar, 'Lint').click();
    const linted = await lDetail;
    expect(linted.fsl).toContain("A 'go' -> B");

    // no-validate / no-lint hide the respective buttons
    toolbar.noValidate = true;
    toolbar.noLint = true;
    await toolbar.updateComplete;
    expect(byLabel(toolbar, 'Validate')).toBeNull();
    expect(byLabel(toolbar, 'Lint')).toBeNull();
    host.remove();
  });

  it('orders the Validate/Lint block after Simulation and before Layout', async () => {
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', "A 'go' -> B;");
    const sim = document.createElement('div'); sim.setAttribute('slot', 'simulation');
    const toolbar = document.createElement('fsl-toolbar') as FslToolbar;
    toolbar.setAttribute('slot', 'toolbar');
    host.append(sim, toolbar);
    document.body.append(host);
    await host.updateComplete;
    await toolbar.updateComplete;

    const labels = [...toolbar.shadowRoot!.querySelectorAll('button[aria-label]')]
      .map(b => b.getAttribute('aria-label'));
    const iSim    = labels.indexOf('Simulation');
    const iValid  = labels.indexOf('Validate');
    const iLint   = labels.indexOf('Lint');
    const iLayout = labels.indexOf('Layout');
    expect(iSim).toBeGreaterThanOrEqual(0);
    expect(iValid).toBeGreaterThan(iSim);     // Validate sits after the Simulation panel icon
    expect(iLint).toBeGreaterThan(iValid);    // Lint follows Validate
    expect(iLayout).toBeGreaterThan(iLint);   // …and the whole block sits before Layout
    host.remove();
  });

  it('renders inert controls when standalone (no host)', async () => {
    const toolbar = document.createElement('fsl-toolbar') as FslToolbar;
    document.body.append(toolbar);
    await toolbar.updateComplete;

    expect(byLabel(toolbar, 'Code')).toBeNull();                                          // no host → no panels
    expect(byLabel(toolbar, 'Validate')).toBeNull();                                      // validate/lint are host-gated too

    let fired = false;
    toolbar.addEventListener('fsl-export', () => { fired = true; });
    byLabel(toolbar, 'Theme').click();                           // open the theme menu
    await toolbar.updateComplete;
    byText(toolbar, '.menu button', 'Dark').click();             // _setMode with no host → no-op
    await toolbar.updateComplete;
    byLabel(toolbar, 'Layout').click();
    await toolbar.updateComplete;
    byText(toolbar, '.menu button', 'Just editor').click();   // _setLayout with no host
    await toolbar.updateComplete;
    byLabel(toolbar, 'Export').click();
    await toolbar.updateComplete;
    byText(toolbar, '.menu button', 'FSL source').click();    // _export with no host → no event
    await toolbar.updateComplete;
    expect(fired).toBe(false);
    expect(q(toolbar, '.menu')).toBeNull();
    toolbar.remove();
  });

});
