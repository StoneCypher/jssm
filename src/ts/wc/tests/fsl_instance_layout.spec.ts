// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import '../fsl_instance_wc.define.js';
import { FslInstance, split_ratio } from '../fsl_instance_wc.js';

/** A bare event carrying the pointer coordinates the handlers read. */
function ptr(type: string, x = 0, y = 0): Event {
  const e = new Event(type, { bubbles: true });
  Object.assign(e, { clientX: x, clientY: y, pointerId: 1 });
  return e;
}

async function mount(fsl: string, layout?: string): Promise<FslInstance> {
  const el = document.createElement('fsl-instance') as FslInstance;
  el.setAttribute('fsl', fsl);
  if (layout) { el.setAttribute('layout', layout); }
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('split_ratio', () => {
  it('returns the percent of a coordinate within the container', () => {
    expect(split_ratio(30, 0, 100)).toBe(30);
    expect(split_ratio(70, 0, 100)).toBe(70);
  });
  it('clamps to [15, 85] so neither pane collapses', () => {
    expect(split_ratio(5, 0, 100)).toBe(15);
    expect(split_ratio(95, 0, 100)).toBe(85);
  });
  it('returns 50 when the container has no measured size (jsdom)', () => {
    expect(split_ratio(40, 0, 0)).toBe(50);
  });
});

describe('fsl-instance arrangement', () => {
  it('renders a workbench with viz/editor panes and a gutter for layout="split"', async () => {
    const el = await mount('A -> B;', 'split');
    const root = el.shadowRoot!;
    expect(root.querySelector('.workbench')).not.toBeNull();
    expect(root.querySelector('.gutter')).not.toBeNull();
    expect(root.querySelector('.pane.viz')).not.toBeNull();
    expect(root.querySelector('.pane.editor')).not.toBeNull();
    el.remove();
  });

  it('uses a column workbench for layout="split-stack"', async () => {
    const el = await mount('A -> B;', 'split-stack');
    expect(el.shadowRoot!.querySelector('.workbench.col')).not.toBeNull();
    el.remove();
  });

  it('renders the stacked sections by default (no workbench)', async () => {
    const el = await mount('A -> B;');
    expect(el.shadowRoot!.querySelector('.workbench')).toBeNull();
    expect(el.shadowRoot!.querySelector('section.viz')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('section.editor')).not.toBeNull();
    el.remove();
  });

  it('drives the gutter drag lifecycle (clientX) without error', async () => {
    const el = await mount('A -> B;', 'split');
    const g = el.shadowRoot!.querySelector('.gutter') as HTMLElement;
    g.dispatchEvent(ptr('pointerdown', 10));        // begin (adds document listeners)
    document.dispatchEvent(ptr('pointermove', 40)); // drag — clientX path
    document.dispatchEvent(ptr('pointerup'));        // end (removes them)
    g.dispatchEvent(ptr('dblclick'));                // reset to 50/50
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.workbench')).not.toBeNull();
    el.remove();
  });

  it('uses clientY for the gutter in layout="split-stack"', async () => {
    const el = await mount('A -> B;', 'split-stack');
    const g = el.shadowRoot!.querySelector('.gutter') as HTMLElement;
    g.dispatchEvent(ptr('pointerdown', 0, 10));
    document.dispatchEvent(ptr('pointermove', 0, 40));   // clientY path
    document.dispatchEvent(ptr('pointerup'));
    await el.updateComplete;
    el.remove();
  });
});
