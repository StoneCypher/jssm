// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import '../fsl_instance_wc.define.js';
import { FslFooter } from '../fsl_footer_wc.js';
import { FslInstance } from '../fsl_instance_wc.js';

beforeAll(() => {
  if (!customElements.get('fsl-footer')) { customElements.define('fsl-footer', FslFooter); }
});

async function withHost(fsl: string): Promise<{ host: FslInstance; footer: FslFooter }> {
  const host = document.createElement('fsl-instance') as FslInstance;
  host.setAttribute('fsl', fsl);
  const footer = document.createElement('fsl-footer') as FslFooter;
  footer.setAttribute('slot', 'footer');
  host.appendChild(footer);
  document.body.appendChild(host);
  await host.updateComplete;
  await footer.updateComplete;
  return { host, footer };
}

describe('<fsl-footer>', () => {

  it('shows the host state and a singular action count', async () => {
    const { host, footer } = await withHost("A 'go' -> B;");
    const txt = footer.shadowRoot!.textContent!;
    expect(txt).toContain('A');
    expect(txt).toContain('1 action');
    expect(footer.shadowRoot!.querySelector('.badge')).toBeNull();   // A is not terminal
    host.remove();
  });

  it('summarizes local + global counts, separating action names from action-starts', async () => {
    // two action edges share the name 'go'; one plain edge has no action at all.
    const { host, footer } = await withHost("A 'go' -> B; B 'go' -> A; A -> C;");
    const txt = footer.shadowRoot!.textContent!;
    // local (state A): 1 action firable ('go'), 2 transitions out (to B and C)
    expect(txt).toContain('1 action, 2 transitions');
    // global: 1 distinct action NAME, but 2 action-starts (two 'go' edges), 3 transitions total
    expect(txt).toContain('globally 1 action, 2 starts, 3 transitions');
    host.remove();
  });

  it('reflects a terminal state with a badge and a zero/plural action count', async () => {
    const { host, footer } = await withHost("A 'go' -> B;");
    host.do('go');
    await host.updateComplete;
    await footer.updateComplete;
    const txt = footer.shadowRoot!.textContent!;
    expect(txt).toContain('B');
    expect(txt).toContain('0 actions');
    expect(txt).toContain('terminal');
    host.remove();
  });

  it('reflects complete status and cleared attributes through the observer', async () => {
    const { host, footer } = await withHost("A 'go' -> B;");
    const flush = (): Promise<void> => new Promise(r => setTimeout(r));   // let the observer fire

    host.toggleAttribute('complete', true);              // observer → complete badge
    await flush();
    await footer.updateComplete;
    expect(footer.shadowRoot!.textContent).toContain('complete');

    host.removeAttribute('current-state');               // observer → null → '' (no state span)
    host.removeAttribute('legal-actions');               // observer → null → 0 actions
    await flush();
    await footer.updateComplete;
    expect(footer.shadowRoot!.querySelector('.state')).toBeNull();
    expect(footer.shadowRoot!.textContent).toContain('0 actions');
    host.remove();
  });

  it('refreshes the global counts on a live machine rebuild (#1387)', async () => {
    const { host, footer } = await withHost("A 'go' -> B;");
    expect(footer.shadowRoot!.textContent).toContain('globally 1 action, 1 start, 1 transition');

    host.fsl = "X 'a' -> Y; Y 'b' -> Z; X ~> Z;";   // rebuild → fsl-machine-rebuilt
    await host.updateComplete;
    await footer.updateComplete;
    expect(footer.shadowRoot!.textContent).toContain('globally 2 actions, 2 starts, 3 transitions');
    host.remove();
  });

  it('renders only the slot when standalone (no fsl-instance ancestor)', async () => {
    const footer = document.createElement('fsl-footer') as FslFooter;
    document.body.appendChild(footer);
    await footer.updateComplete;
    expect(footer.shadowRoot!.querySelector('.state')).toBeNull();
    expect(footer.shadowRoot!.querySelector('.bar')).not.toBeNull();
    footer.remove();
  });

});
