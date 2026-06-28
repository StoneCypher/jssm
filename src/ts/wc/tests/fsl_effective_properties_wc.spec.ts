/**
 * @vitest-environment jsdom
 */

import '../fsl_effective_properties_wc.define';
import { FslEffectiveProperties } from '../fsl_effective_properties_wc';
import '../fsl_instance_wc.define';
import { FslInstance } from '../fsl_instance_wc';

async function settle(panel: FslEffectiveProperties): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
  await panel.updateComplete;
}

function mount_with_host(fsl: string): { host: FslInstance; panel: FslEffectiveProperties } {
  const host  = document.createElement('fsl-instance') as FslInstance;
  host.setAttribute('fsl', fsl);
  const panel = document.createElement('fsl-effective-properties') as FslEffectiveProperties;
  host.appendChild(panel);
  document.body.appendChild(host);
  return { host, panel };
}

const COLOR_FSL = 'property color default "grey"; a \'go\' -> b; state b: { property: color "blue"; };';

describe('FslEffectiveProperties registration', () => {

  it('registers the canonical fsl-effective-properties tag', () => {
    expect(customElements.get('fsl-effective-properties')).toBe(FslEffectiveProperties);
  });

  it('mints no jssm-effective-properties synonym (fsl-* only)', () => {
    expect(customElements.get('jssm-effective-properties')).toBeUndefined();
  });

});

describe('FslEffectiveProperties display', () => {

  it('shows the resolved property values for the current state', async () => {
    const { host, panel } = mount_with_host(COLOR_FSL);
    await settle(panel);
    const text = panel.shadowRoot!.textContent!;
    expect(text).toContain('color');
    expect(text).toContain('grey');   // default resolves at state 'a'
    document.body.removeChild(host);
  });

  it('re-resolves through the override chain after a transition', async () => {
    const { host, panel } = mount_with_host(COLOR_FSL);
    await settle(panel);

    host.do('go');                     // a -> b, where b overrides color to "blue"
    await settle(panel);

    const text = panel.shadowRoot!.textContent!;
    expect(text).toContain('blue');
    expect(text).not.toContain('grey');
    document.body.removeChild(host);
  });

  it('shows an empty-state message when the machine declares no properties', async () => {
    const { host, panel } = mount_with_host("a 'go' -> b;");
    await settle(panel);
    expect(panel.shadowRoot!.textContent!.toLowerCase()).toContain('no properties');
    document.body.removeChild(host);
  });

  it('renders a placeholder when there is no parent fsl-instance host', async () => {
    const panel = document.createElement('fsl-effective-properties') as FslEffectiveProperties;
    document.body.appendChild(panel);
    await settle(panel);
    expect(panel.shadowRoot!.textContent!.toLowerCase()).toContain('no fsl-instance');
    document.body.removeChild(panel);
  });

  it('releases its machine subscription on disconnect', async () => {
    const { host, panel } = mount_with_host(COLOR_FSL);
    await settle(panel);

    host.removeChild(panel);
    host.do('go');                     // host moves to b (blue)
    await settle(panel);

    // Detached before the transition: still shows grey, not blue.
    expect(panel.shadowRoot!.textContent).toContain('grey');
    expect(panel.shadowRoot!.textContent).not.toContain('blue');
    document.body.removeChild(host);
  });

  it('does not bind if disconnected before the whenDefined microtask resolves', async () => {
    const { host, panel } = mount_with_host(COLOR_FSL);
    host.removeChild(panel);
    await settle(panel);
    expect(panel.shadowRoot!.textContent!.toLowerCase()).toContain('no fsl-instance');
    document.body.removeChild(host);
  });

  it('binds to a jssm-instance host too (closest_wc matches both prefixes)', async () => {
    const host  = document.createElement('jssm-instance') as FslInstance;
    host.setAttribute('fsl', COLOR_FSL);
    const panel = document.createElement('fsl-effective-properties') as FslEffectiveProperties;
    host.appendChild(panel);
    document.body.appendChild(host);
    await settle(panel);

    expect(panel.shadowRoot!.textContent).toContain('grey');
    document.body.removeChild(host);
  });

});
