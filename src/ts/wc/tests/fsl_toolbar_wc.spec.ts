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

  it('themes the suite, toggles the present panels, and drives the layout', async () => {
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

    // theme → host (whole suite) + editor (CM highlight)
    byLabel(toolbar, 'Dark theme').click();
    await toolbar.updateComplete;
    expect(host.theme).toBe('dark');
    expect(editor.theme).toBe('dark');

    // one panel toggle per present panel (viz=Renderer, editor=Code, history=History)
    expect(byLabel(toolbar, 'Renderer')).not.toBeNull();
    expect(byLabel(toolbar, 'History')).not.toBeNull();
    expect(byLabel(toolbar, 'Export')).toBeNull();              // not present → no toggle
    expect(byLabel(toolbar, 'Code').getAttribute('aria-pressed')).toBe('true');   // visible
    byLabel(toolbar, 'Code').click();                          // hide the editor pane
    await toolbar.updateComplete;
    expect(host.isPanelHidden('editor')).toBe(true);
    expect(byLabel(toolbar, 'Code').getAttribute('aria-pressed')).toBe('false');

    // light theme (covers the light arrow + host theme back)
    byLabel(toolbar, 'Light theme').click();
    await toolbar.updateComplete;
    expect(host.theme).toBe('light');

    // View menu (icon button) → host.layout, menu closes
    byLabel(toolbar, 'Layout').click();
    await toolbar.updateComplete;
    expect(q(toolbar, '.menu')).not.toBeNull();
    byText(toolbar, '.menu button', 'Tabbed').click();
    await toolbar.updateComplete;
    expect(host.getAttribute('layout')).toBe('tabs');
    expect(q(toolbar, '.menu')).toBeNull();

    // re-open: the active layout is checked
    byLabel(toolbar, 'Layout').click();
    await toolbar.updateComplete;
    expect(byText(toolbar, '.menu button', 'Tabbed').getAttribute('aria-checked')).toBe('true');
    host.remove();
  });

  it('shows only theme + an inert View button when standalone (no host)', async () => {
    const toolbar = document.createElement('fsl-toolbar') as FslToolbar;
    document.body.appendChild(toolbar);
    await toolbar.updateComplete;

    expect(byLabel(toolbar, 'Light theme').getAttribute('aria-pressed')).toBe('true');   // default theme
    expect(byLabel(toolbar, 'Code')).toBeNull();                                          // no host → no panels

    // theme + layout clicks are no-ops (must not throw)
    byLabel(toolbar, 'Dark theme').click();
    byLabel(toolbar, 'Layout').click();
    await toolbar.updateComplete;
    byText(toolbar, '.menu button', 'Just editor').click();   // _setLayout with no host
    await toolbar.updateComplete;
    expect(q(toolbar, '.menu')).toBeNull();
    toolbar.remove();
  });

});
