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
/** Feature buttons are icon-only — select them by aria-label. */
function byLabel(el: FslToolbar, label: string): HTMLButtonElement {
  return el.shadowRoot!.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement;
}
/** Menu items still carry text. */
function byText(el: FslToolbar, sel: string, text: string): HTMLElement {
  return [...el.shadowRoot!.querySelectorAll(sel)].find(b => b.textContent!.includes(text)) as HTMLElement;
}

describe('<fsl-toolbar>', () => {

  it('themes the whole host + the editor, toggles features, drives the host layout', async () => {
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', "A 'go' -> B;");
    const editor = document.createElement('fsl-editor') as FslEditor;
    editor.setAttribute('slot', 'editor');
    const toolbar = document.createElement('fsl-toolbar') as FslToolbar;
    toolbar.setAttribute('slot', 'toolbar');
    host.append(editor, toolbar);
    document.body.appendChild(host);
    await host.updateComplete;
    await toolbar.updateComplete;

    // theme → the host (whole suite) AND the editor (CM highlight)
    q(toolbar, '[title="Dark"]').click();
    await toolbar.updateComplete;
    expect(host.theme).toBe('dark');
    expect(editor.theme).toBe('dark');
    expect(q(toolbar, '[title="Dark"]').getAttribute('aria-pressed')).toBe('true');

    // feature toggle → editor.noLint flips true (icon button shows un-pressed)
    expect(byLabel(toolbar, 'Lint').getAttribute('aria-pressed')).toBe('true');   // on by default
    byLabel(toolbar, 'Lint').click();
    await toolbar.updateComplete;
    expect(editor.noLint).toBe(true);
    expect(byLabel(toolbar, 'Lint').getAttribute('aria-pressed')).toBe('false');

    // exercise the remaining control arrows (Light theme, Autocomplete feature)
    q(toolbar, '[title="Light"]').click();
    await toolbar.updateComplete;
    expect(host.theme).toBe('light');
    expect(editor.theme).toBe('light');
    byLabel(toolbar, 'Autocomplete').click();
    await toolbar.updateComplete;
    expect(editor.noCompletion).toBe(true);

    // View menu → host.layout, and the menu closes
    q(toolbar, '[aria-haspopup="true"]').click();
    await toolbar.updateComplete;
    expect(q(toolbar, '.menu')).not.toBeNull();
    byText(toolbar, '.menu button', 'Tabbed').click();
    await toolbar.updateComplete;
    expect(host.getAttribute('layout')).toBe('tabs');
    expect(q(toolbar, '.menu')).toBeNull();

    // re-open: the active layout is checked
    q(toolbar, '[aria-haspopup="true"]').click();
    await toolbar.updateComplete;
    expect(byText(toolbar, '.menu button', 'Tabbed').getAttribute('aria-checked')).toBe('true');
    host.remove();
  });

  it('renders inert controls when standalone (no host / editor)', async () => {
    const toolbar = document.createElement('fsl-toolbar') as FslToolbar;
    document.body.appendChild(toolbar);
    await toolbar.updateComplete;

    expect(q(toolbar, '[title="Light"]').getAttribute('aria-pressed')).toBe('true');         // default theme
    expect(byLabel(toolbar, 'Color chips').getAttribute('aria-pressed')).toBe('true');       // editor-absent → on

    // every control click is a no-op (must not throw)
    q(toolbar, '[title="Dark"]').click();
    byLabel(toolbar, 'Color chips').click();
    q(toolbar, '[aria-haspopup="true"]').click();
    await toolbar.updateComplete;
    byText(toolbar, '.menu button', 'Just editor').click();   // _setLayout with no host
    await toolbar.updateComplete;
    expect(q(toolbar, '.menu')).toBeNull();   // closed after select
    toolbar.remove();
  });

});
