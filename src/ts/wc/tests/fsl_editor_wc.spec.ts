// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { FslEditor } from '../fsl_editor_wc.js';

beforeAll(() => {
  if (!customElements.get('fsl-editor')) { customElements.define('fsl-editor', FslEditor); }
});

/** Create, configure, attach, and await a fresh `<fsl-editor>`. */
async function make(setup?: (el: FslEditor) => void): Promise<FslEditor> {
  const el = document.createElement('fsl-editor') as FslEditor;
  setup?.(el);
  document.body.append(el);
  await el.updateComplete;
  return el;
}

describe('<fsl-editor> standalone', () => {
  it('mounts CodeMirror seeded from the fsl property', async () => {
    const el = await make(e => { e.fsl = 'a -> b;'; });
    expect(el.view).not.toBeNull();
    expect(el.view!.state.doc.toString()).toBe('a -> b;');
    el.remove();
  });

  it('mounts fully-configured (dark, all features off, readonly)', async () => {
    const el = await make(e => {
      e.fsl = 'a -> b;';
      e.theme = 'dark'; e.noLint = true; e.noOverlay = true; e.noCompletion = true; e.readonly = true;
    });
    expect(el.getAttribute('theme')).toBe('dark');
    expect(el.view!.state.readOnly).toBe(true);
    el.remove();
  });

  it('applies external fsl writes without emitting change', async () => {
    const el = await make(e => { e.fsl = 'a -> b;'; });
    let changes = 0;
    el.addEventListener('change', () => { changes++; });
    el.fsl = 'c -> d;';
    await el.updateComplete;
    expect(el.view!.state.doc.toString()).toBe('c -> d;');
    expect(changes).toBe(0);
    el.remove();
  });

  it('emits change (and updates fsl) on a user edit', async () => {
    const el = await make(e => { e.fsl = 'a -> b;'; });
    let detail: string | undefined;
    el.addEventListener('change', e => { detail = (e as CustomEvent<{ fsl: string }>).detail.fsl; });
    el.view!.dispatch({ changes: { from: el.view!.state.doc.length, insert: '\nX -> Y;' } });
    expect(detail).toContain('X -> Y;');
    expect(el.fsl).toContain('X -> Y;');
    await el.updateComplete;   // flush the fsl-prop echo: _syncDoc sees doc already in sync (no-op)
    expect(el.view!.state.doc.toString()).toContain('X -> Y;');
    el.remove();
  });

  it('reconfigures each feature compartment when toggled on and off', async () => {
    const el = await make(e => { e.fsl = 'state s : { color: crimson; };'; });
    for (const flag of ['noOverlay', 'noLint', 'noCompletion'] as const) {
      el[flag] = true;  await el.updateComplete;
      el[flag] = false; await el.updateComplete;
    }
    el.theme = 'dark';    await el.updateComplete;
    el.theme = 'light';   await el.updateComplete;
    el.readonly = true;   await el.updateComplete;
    expect(el.view!.state.doc.toString()).toContain('crimson');
    el.remove();
  });

  it('destroys the view on disconnect', async () => {
    const el = await make(e => { e.fsl = 'a -> b;'; });
    el.remove();
    expect(el.view).toBeNull();
  });

  it('disconnect before first render is a no-op (view never created)', () => {
    const el = document.createElement('fsl-editor') as FslEditor;
    document.body.append(el);
    el.remove();                // synchronous: firstUpdated never ran
    expect(el.view).toBeNull();
  });
});
