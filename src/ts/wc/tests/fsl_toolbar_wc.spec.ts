// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import '../fsl_instance_wc.define.js';
import { FslToolbar } from '../fsl_toolbar_wc.js';
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
    document.body.appendChild(host);
    await host.updateComplete;
    await toolbar.updateComplete;

    // theme → host + editor
    byLabel(toolbar, 'Dark theme').click();
    await toolbar.updateComplete;
    expect(host.theme).toBe('dark');
    expect(editor.theme).toBe('dark');
    byLabel(toolbar, 'Light theme').click();
    await toolbar.updateComplete;
    expect(host.theme).toBe('light');

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

    const got: Array<{ format: string; content: string }> = [];
    // dot/json/fsl resolve synchronously; SVG is async (graphviz), so wait for all four.
    const allExported = new Promise<void>(res => {
      toolbar.addEventListener('fsl-export', e => {
        got.push((e as CustomEvent).detail);
        if (got.length === 4) { res(); }
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
    host.remove();
  });

  it('renders inert controls when standalone (no host)', async () => {
    const toolbar = document.createElement('fsl-toolbar') as FslToolbar;
    document.body.appendChild(toolbar);
    await toolbar.updateComplete;

    expect(byLabel(toolbar, 'Light theme').getAttribute('aria-pressed')).toBe('true');   // default theme
    expect(byLabel(toolbar, 'Code')).toBeNull();                                          // no host → no panels

    let fired = false;
    toolbar.addEventListener('fsl-export', () => { fired = true; });
    byLabel(toolbar, 'Dark theme').click();      // _setTheme no-op
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
