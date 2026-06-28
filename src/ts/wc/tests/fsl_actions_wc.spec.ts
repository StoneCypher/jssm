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

const texts = (el: FslActions, sel: string): string[] =>
  [...el.shadowRoot!.querySelectorAll(sel)].map(b => b.textContent!.trim());

// `A 'x' -> B` (plain), `A 'y' => C` (main), `A ~> D` (forced); `B 'z' -> A` adds
// an edge that does NOT leave A, exercising the from-filter.
const ALL_KINDS = "A 'x' -> B; A 'y' => C; A ~> D; B 'z' -> A;";

describe('<fsl-actions>', () => {

  it('splits transitions into main / plain / forced groups (main first, forced last)', async () => {
    const { host, el } = await withHost(ALL_KINDS);
    expect(texts(el, 'button.act')).toEqual(['x', 'y']);
    // groups appear in order, each labelled; only non-empty ones render
    expect(texts(el, '.label')).toEqual(['Actions', 'Main', 'Transitions', 'Forced']);
    expect(texts(el, 'button.trn')).toEqual(['→ C', '→ B', '→ D']);   // main, plain, forced
    host.remove();
  });

  it('fires a plain/main transition with transition()', async () => {
    const { host, el } = await withHost(ALL_KINDS);
    [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.trn')]
      .find(b => b.textContent!.includes('→ B'))!.click();
    await host.updateComplete;
    await el.updateComplete;
    expect(host.state()).toBe('B');
    host.remove();
  });

  it('fires a forced transition with force_transition()', async () => {
    const { host, el } = await withHost(ALL_KINDS);
    [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.trn')]
      .find(b => b.textContent!.includes('→ D'))!.click();   // transition() would fail; force works
    await host.updateComplete;
    await el.updateComplete;
    expect(host.state()).toBe('D');
    host.remove();
  });

  it('re-derives as the machine moves and drives named actions', async () => {
    const { host, el } = await withHost("Off 'Enable' => Red; Red 'Next' => Green;");
    expect(texts(el, 'button.act')).toEqual(['Enable']);
    el.shadowRoot!.querySelector<HTMLButtonElement>('button.act')!.click();   // fire Enable
    await host.updateComplete;
    await el.updateComplete;
    expect(host.state()).toBe('Red');
    expect(texts(el, 'button.act')).toEqual(['Next']);
    host.remove();
  });

  it('omits all transition groups when every exit is a self-loop', async () => {
    const { host, el } = await withHost("A 'go' -> A;");
    expect(texts(el, 'button.act')).toEqual(['go']);
    expect(el.shadowRoot!.querySelectorAll('button.trn')).toHaveLength(0);
    expect(texts(el, '.label')).toEqual(['Actions']);
    host.remove();
  });

  it('omits the Actions group when only forced / unnamed exits exist', async () => {
    const { host, el } = await withHost("A ~> B;");
    expect(el.shadowRoot!.querySelectorAll('button.act')).toHaveLength(0);
    expect(texts(el, '.label')).toEqual(['Forced']);
    expect(texts(el, 'button.trn')).toEqual(['→ B']);
    host.remove();
  });

  it('shows "no actions available" at a terminal state', async () => {
    const { host, el } = await withHost("A 'go' => B;");
    host.do('go');                                            // → B (terminal)
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
