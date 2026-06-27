// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import '../fsl_instance_wc.define.js';
import { FslHistory } from '../fsl_history_wc.js';
import { FslInstance } from '../fsl_instance_wc.js';

beforeAll(() => {
  if (!customElements.get('fsl-history')) { customElements.define('fsl-history', FslHistory); }
});

async function withHost(fsl: string): Promise<{ host: FslInstance; hist: FslHistory }> {
  const host = document.createElement('fsl-instance') as FslInstance;
  host.setAttribute('fsl', fsl);
  const hist = document.createElement('fsl-history') as FslHistory;
  hist.setAttribute('slot', 'history');
  host.appendChild(hist);
  document.body.appendChild(host);
  await host.updateComplete;
  await hist.updateComplete;
  return { host, hist };
}

describe('<fsl-history>', () => {

  it('accumulates the visited-state timeline from host transitions', async () => {
    const { host, hist } = await withHost("A 'go' -> B 'go' -> C;");
    expect(hist.shadowRoot!.querySelectorAll('.state').length).toBe(1);   // seeded with A
    expect(hist.shadowRoot!.textContent).toContain('A');
    expect(hist.shadowRoot!.querySelector('.arrow')).toBeNull();          // single → no arrow

    host.do('go');
    await host.updateComplete;
    await hist.updateComplete;
    expect(hist.shadowRoot!.querySelectorAll('.state').length).toBe(2);   // A → B
    expect(hist.shadowRoot!.querySelector('.arrow')).not.toBeNull();
    expect(hist.shadowRoot!.querySelector('.state.current')!.textContent).toBe('B');

    // same-state and cleared-state transition events are no-ops
    host.dispatchEvent(new CustomEvent('fsl-transition'));   // current-state still B
    host.removeAttribute('current-state');
    host.dispatchEvent(new CustomEvent('fsl-transition'));   // current-state null
    await hist.updateComplete;
    expect(hist.shadowRoot!.querySelectorAll('.state').length).toBe(2);
    host.remove();
  });

  it('renders empty when standalone (no fsl-instance ancestor)', async () => {
    const hist = document.createElement('fsl-history') as FslHistory;
    document.body.appendChild(hist);
    await hist.updateComplete;
    expect(hist.shadowRoot!.querySelector('.empty')).not.toBeNull();
    hist.remove();
  });

});
