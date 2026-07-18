// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import '../fsl_instance_wc.define.js';
import { FslInstance, split_ratio, auto_mode } from '../fsl_instance_wc.js';

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
  document.body.append(el);
  await el.updateComplete;
  return el;
}

function mode(el: FslInstance): string | null {
  // `dataset` lives on HTMLElement, not the bare Element querySelector infers.
  return el.shadowRoot!.querySelector<HTMLElement>('.workbench')?.dataset.mode ?? null;
}

// jsdom defaults to 1024x768 (landscape); restore it after tests that resize.
afterEach(() => { (globalThis as { innerWidth: number }).innerWidth = 1024; (globalThis as { innerHeight: number }).innerHeight = 768; });

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

describe('auto_mode', () => {
  it('is side-by-side (lr) when at least as wide as tall', () => {
    expect(auto_mode(1200, 800)).toBe('lr');
    expect(auto_mode(800, 800)).toBe('lr');
  });
  it('is stacked (tb) when taller than wide', () => {
    expect(auto_mode(600, 900)).toBe('tb');
  });
});

describe('fsl-instance layout modes', () => {
  it('renders a gutter-split workbench with a data-mode for lr/rl/tb/bt', async () => {
    for (const m of ['lr', 'rl', 'tb', 'bt']) {
      const el = await mount('A -> B;', m);
      expect(mode(el)).toBe(m);
      expect(el.shadowRoot!.querySelector('.gutter')).not.toBeNull();
      expect(el.shadowRoot!.querySelector('.pane.viz')).not.toBeNull();
      expect(el.shadowRoot!.querySelector('.pane.editor')).not.toBeNull();
      el.remove();
    }
  });

  it('renders single-pane workbenches for editor / viewer', async () => {
    const ed = await mount('A -> B;', 'editor');
    expect(mode(ed)).toBe('editor');
    ed.remove();
    const vw = await mount('A -> B;', 'viewer');
    expect(mode(vw)).toBe('viewer');
    vw.remove();
  });

  it('renders a tab strip in tabs mode and switches the visible pane', async () => {
    const el = await mount('A -> B;', 'tabs');
    const root = el.shadowRoot!;
    expect(root.querySelector('.tabbar')).not.toBeNull();
    expect(root.querySelector('.pane.viz')!.hasAttribute('hidden')).toBe(false);
    expect(root.querySelector('.pane.editor')!.hasAttribute('hidden')).toBe(true);

    // eslint-disable-next-line unicorn/prefer-scoped-selector -- jsdom (nwsapi) does not match `:scope` inside a ShadowRoot; prefixing returns nothing and changes behavior
    (root.querySelectorAll('.tabbar button')[1] as HTMLButtonElement).click();   // "Code"
    await el.updateComplete;
    expect(root.querySelector('.pane.editor')!.hasAttribute('hidden')).toBe(false);
    expect(root.querySelector('.pane.viz')!.hasAttribute('hidden')).toBe(true);

    // eslint-disable-next-line unicorn/prefer-scoped-selector -- jsdom (nwsapi) does not match `:scope` inside a ShadowRoot; prefixing returns nothing and changes behavior
    (root.querySelector('.tabbar button') as HTMLButtonElement).click();   // back to "Graph"
    await el.updateComplete;
    expect(root.querySelector('.pane.viz')!.hasAttribute('hidden')).toBe(false);
    expect(root.querySelector('.pane.editor')!.hasAttribute('hidden')).toBe(true);
    el.remove();
  });

  it('renders the stacked sections by default (no workbench)', async () => {
    const el = await mount('A -> B;');
    expect(el.shadowRoot!.querySelector('.workbench')).toBeNull();
    expect(el.shadowRoot!.querySelector('section.viz')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('section.editor')).not.toBeNull();
    el.remove();
  });

  it('drags the gutter with clientX in a row mode', async () => {
    const el = await mount('A -> B;', 'lr');
    const g = el.shadowRoot!.querySelector('.gutter') as HTMLElement;
    g.dispatchEvent(ptr('pointerdown', 10));
    document.dispatchEvent(ptr('pointermove', 40));
    document.dispatchEvent(ptr('pointerup'));
    g.dispatchEvent(ptr('dblclick'));
    await el.updateComplete;
    expect(mode(el)).toBe('lr');
    el.remove();
  });

  it('drags the gutter with clientY in a column mode', async () => {
    const el = await mount('A -> B;', 'tb');
    const g = el.shadowRoot!.querySelector('.gutter') as HTMLElement;
    g.dispatchEvent(ptr('pointerdown', 0, 10));
    document.dispatchEvent(ptr('pointermove', 0, 40));
    document.dispatchEvent(ptr('pointerup'));
    await el.updateComplete;
    expect(mode(el)).toBe('tb');
    el.remove();
  });

  it('resolves layout="auto" by aspect and follows window resize', async () => {
    const el = await mount('A -> B;', 'auto');
    expect(mode(el)).toBe('lr');                         // 1024x768 → side-by-side

    (globalThis as { innerWidth: number }).innerWidth = 500;
    (globalThis as { innerHeight: number }).innerHeight = 900;
    dispatchEvent(new Event('resize'));
    await el.updateComplete;
    expect(mode(el)).toBe('tb');                         // tall → stacked

    el.setAttribute('layout', 'lr');                     // leaving auto removes the listener
    await el.updateComplete;
    expect(mode(el)).toBe('lr');
    dispatchEvent(new Event('resize'));           // now a no-op
    el.remove();
  });

  it('removes the auto resize listener on disconnect', async () => {
    const el = await mount('A -> B;', 'auto');
    el.remove();                                          // disconnect while still auto
    dispatchEvent(new Event('resize'));            // must not throw / touch the detached el
    expect(el.isConnected).toBe(false);
  });
});
