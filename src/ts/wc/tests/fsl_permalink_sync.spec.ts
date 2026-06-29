// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LitElement } from 'lit';
import { FslPermalinkSync } from '../fsl_permalink_sync.js';
import { encode_machine } from '../fsl_permalink.js';

// Minimal host: a LitElement carrying `fsl`, firing `fsl-machine-rebuilt` on demand.
class Host extends LitElement {
  fsl = '';
  constructor() {
    super();
    new FslPermalinkSync(this as unknown as LitElement & HTMLElement & { fsl: string });
  }
  rebuilt(): void {
    this.dispatchEvent(new CustomEvent('fsl-machine-rebuilt', { bubbles: true, composed: true }));
  }
}
if (!customElements.get('plk-host')) { customElements.define('plk-host', Host); }

const tick = (ms = 0): Promise<void> => new Promise(r => setTimeout(r, ms));

beforeEach(() => { history.replaceState(history.state, '', location.pathname); vi.restoreAllMocks(); });

describe('FslPermalinkSync', () => {
  it('restores fsl from the fragment on connect, overriding the declared source', async () => {
    const seg = await encode_machine('x -> y;');
    history.replaceState(history.state, '', `#k1=${seg}`);
    const el = document.createElement('plk-host') as Host;
    el.id = 'k1'; el.fsl = 'declared -> only;';
    document.body.appendChild(el);
    await el.updateComplete;
    await tick(20);                                // let the async restore settle
    expect(el.fsl).toBe('x -> y;');
    el.remove();
  });

  it('does not write the URL after a restore (echo guard)', async () => {
    const seg = await encode_machine('a -> b;');
    history.replaceState(history.state, '', `#k4=${seg}`);
    const spy = vi.spyOn(history, 'replaceState');
    const el = document.createElement('plk-host') as Host;
    el.id = 'k4';
    document.body.appendChild(el);
    await el.updateComplete;
    await tick(20);                                // restore settles, _last = seg
    el.rebuilt();                                  // the rebuild the restore would trigger
    await tick(350);                               // past the debounce
    expect(spy).not.toHaveBeenCalled();            // re-encoded segment equals _last → no write
    el.remove();
  });

  it('cancels a pending write when disconnected before the debounce fires', async () => {
    const el = document.createElement('plk-host') as Host;
    el.id = 'k5'; el.fsl = 'x -> y;';
    document.body.appendChild(el);
    await el.updateComplete;
    const spy = vi.spyOn(history, 'replaceState');
    el.rebuilt();                                  // schedule a write (timer starts)
    el.remove();                                   // disconnect should cancel it
    await tick(350);                               // past the debounce
    expect(spy).not.toHaveBeenCalled();
  });

  it('writes its segment via replaceState on rebuilt, preserving siblings', async () => {
    history.replaceState(history.state, '', '#other=0ZZZ');
    const spy = vi.spyOn(history, 'replaceState');
    const el = document.createElement('plk-host') as Host;
    el.id = 'k2'; el.fsl = 'p -> q;';
    document.body.appendChild(el);
    await el.updateComplete;
    el.rebuilt();
    await tick(350);                               // past the 300ms debounce
    expect(spy).toHaveBeenCalled();
    const url = spy.mock.calls[spy.mock.calls.length - 1]![2] as string;
    expect(url).toContain('other=0ZZZ');           // sibling preserved
    expect(url).toContain('k2=');                  // our segment written
    el.remove();
  });

  it('restores when the fragment changes externally (hashchange)', async () => {
    const el = document.createElement('plk-host') as Host;
    el.id = 'k3'; el.fsl = 'start -> here;';
    document.body.appendChild(el);
    await el.updateComplete;
    await tick(20);

    const seg = await encode_machine('Up -> Down;');
    history.replaceState(history.state, '', `#k3=${seg}`);
    window.dispatchEvent(new Event('hashchange'));
    await tick(20);
    expect(el.fsl).toBe('Up -> Down;');
    el.remove();
  });

  it('coalesces rapid rebuilds into a single debounced write', async () => {
    const el = document.createElement('plk-host') as Host;
    el.id = 'k6'; el.fsl = 'a -> b;';
    document.body.appendChild(el);
    await el.updateComplete;
    const spy = vi.spyOn(history, 'replaceState');
    el.rebuilt();                                  // schedules a write (timer set)
    el.rebuilt();                                  // second call clears the pending timer, reschedules
    await tick(350);
    expect(spy).toHaveBeenCalledTimes(1);          // the two rebuilds collapse into one write
    el.remove();
  });

  it('is inert with no id and no uhash', async () => {
    const spy = vi.spyOn(history, 'replaceState');
    const el = document.createElement('plk-host') as Host;
    el.fsl = 'p -> q;';
    document.body.appendChild(el);
    await el.updateComplete;
    el.rebuilt();
    await tick(350);
    expect(spy).not.toHaveBeenCalled();
    el.remove();
  });
});
