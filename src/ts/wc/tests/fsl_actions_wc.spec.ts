// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import '../fsl_instance_wc.define.js';
import { FslActions } from '../fsl_actions_wc.js';
import { FslInstance } from '../fsl_instance_wc.js';

beforeAll(() => {
  if (!customElements.get('fsl-actions')) { customElements.define('fsl-actions', FslActions); }
});

async function withHost(fsl: string): Promise<{ host: FslInstance; el: FslActions }> {
  const host = document.createElement('fsl-instance') as FslInstance;
  host.setAttribute('fsl', fsl);
  const el = document.createElement('fsl-actions') as FslActions;
  el.setAttribute('slot', 'actions');
  host.appendChild(el);
  document.body.appendChild(host);
  await host.updateComplete;
  await el.updateComplete;
  return { host, el };
}

const labels = (el: FslActions, sel: string): string[] =>
  [...el.shadowRoot!.querySelectorAll(sel)].map(b => b.textContent!.trim());

describe('<fsl-actions>', () => {

  it('derives the legal actions + transitions and re-derives as the machine moves', async () => {
    // In Off: the named action `Enable` and the transition target `Red` (same edge, both groups).
    const { host, el } = await withHost("Off 'Enable' -> Red; Red 'Next' -> Green;");
    expect(labels(el, 'button.act')).toEqual(['Enable']);
    expect(labels(el, 'button.trn')).toEqual(['→ Red']);

    el.shadowRoot!.querySelector<HTMLButtonElement>('button.act')!.click();   // fire Enable
    await host.updateComplete;
    await el.updateComplete;
    expect(host.state()).toBe('Red');
    expect(labels(el, 'button.act')).toEqual(['Next']);
    expect(labels(el, 'button.trn')).toEqual(['→ Green']);
    host.remove();
  });

  it('marks forced-only transitions and fires them with force_transition', async () => {
    const { host, el } = await withHost("A 'go' -> B; A ~> C;");
    expect(labels(el, 'button.act')).toEqual(['go']);
    expect(labels(el, 'button.trn')).toEqual(['→ B', '→ C']);   // B legal, C forced
    const forced = el.shadowRoot!.querySelector<HTMLButtonElement>('button.trn.forced')!;
    expect(forced.textContent!.trim()).toBe('→ C');

    forced.click();                                              // transition() would fail; force works
    await host.updateComplete;
    await el.updateComplete;
    expect(host.state()).toBe('C');
    host.remove();
  });

  it('fires a legal transition with transition()', async () => {
    const { host, el } = await withHost("A 'go' -> B; A ~> C;");
    const legal = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.trn')]
      .find(b => b.textContent!.includes('→ B'))!;
    legal.click();
    await host.updateComplete;
    await el.updateComplete;
    expect(host.state()).toBe('B');
    host.remove();
  });

  it('omits the Transitions group when every exit is a self-loop (no target ≠ current)', async () => {
    const { host, el } = await withHost("A 'go' -> A;");
    expect(labels(el, 'button.act')).toEqual(['go']);
    expect(el.shadowRoot!.querySelectorAll('button.trn')).toHaveLength(0);
    expect([...el.shadowRoot!.querySelectorAll('.label')].map(l => l.textContent)).toEqual(['Actions']);
    host.remove();
  });

  it('omits the Actions group when only forced / unnamed exits exist', async () => {
    const { host, el } = await withHost("A ~> B;");
    expect(el.shadowRoot!.querySelectorAll('button.act')).toHaveLength(0);
    expect(labels(el, 'button.trn')).toEqual(['→ B']);
    expect([...el.shadowRoot!.querySelectorAll('.label')].map(l => l.textContent)).toEqual(['Transitions']);
    host.remove();
  });

  it('shows "no actions available" at a terminal state', async () => {
    const { host, el } = await withHost("A 'go' -> B;");
    host.do('go');                                              // → B (terminal: no exits)
    await host.updateComplete;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.empty')!.textContent).toContain('no actions');
    expect(el.shadowRoot!.querySelector('button')).toBeNull();
    host.remove();
  });

  it('renders empty when standalone (no fsl-instance ancestor)', async () => {
    const el = document.createElement('fsl-actions') as FslActions;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.empty')!.textContent).toContain('no machine');
    el.remove();
  });

});
