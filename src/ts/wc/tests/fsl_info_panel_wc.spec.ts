/**
 * @vitest-environment jsdom
 */

import '../fsl_info_panel_wc.define';
import { FslInfoPanel } from '../fsl_info_panel_wc';
import '../fsl_instance_wc.define';
import { FslInstance } from '../fsl_instance_wc';

/**
 * Flush the `whenDefined(...)` microtask deferral plus the Lit update so the
 * panel has bound to its host and rendered.  Panels read machine state
 * synchronously, so a single macrotask tick is enough (no WASM wait as in viz).
 */
async function settle(panel: FslInfoPanel): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
  await panel.updateComplete;
}

/**
 * Mount a `<fsl-instance>` host with a nested `<fsl-info-panel>` child and
 * return both. Caller removes the host when done.
 */
function mount_with_host(fsl: string): { host: FslInstance; panel: FslInfoPanel } {
  const host  = document.createElement('fsl-instance') as FslInstance;
  host.setAttribute('fsl', fsl);
  const panel = document.createElement('fsl-info-panel') as FslInfoPanel;
  host.append(panel);
  document.body.append(host);
  return { host, panel };
}

describe('FslInfoPanel registration', () => {

  it('registers the canonical fsl-info-panel tag', () => {
    expect(customElements.get('fsl-info-panel')).toBe(FslInfoPanel);
  });

  it('mints no jssm-info-panel synonym (fsl-* only)', () => {
    expect(customElements.get('jssm-info-panel')).toBeUndefined();
  });

});

describe('FslInfoPanel display', () => {

  it('shows the current state of the parent machine', async () => {
    const { host, panel } = mount_with_host("Off 'flip' -> On;");
    await settle(panel);
    expect(panel.shadowRoot!.textContent).toContain('Off');
    host.remove();
  });

  it('lists the available exit actions', async () => {
    const { host, panel } = mount_with_host("Off 'flip' -> On;");
    await settle(panel);
    expect(panel.shadowRoot!.textContent).toContain('flip');
    host.remove();
  });

  it('updates current state and last transition after a transition', async () => {
    const { host, panel } = mount_with_host("Off 'flip' -> On;");
    await settle(panel);

    host.do('flip');
    await settle(panel);

    const text = panel.shadowRoot!.textContent!;
    expect(text).toContain('On');     // new current state
    expect(text).toContain('Off');    // last-transition from
    expect(text).toContain('flip');   // last-transition action
    host.remove();
  });

  it('reflects the terminal flag flipping false → true at a terminal state', async () => {
    const { host, panel } = mount_with_host("Off 'flip' -> On;");
    await settle(panel);
    expect(panel.shadowRoot!.querySelector('.terminal')!.textContent).toBe('false');

    host.do('flip');                  // On has no exits → terminal
    await settle(panel);
    expect(panel.shadowRoot!.querySelector('.terminal')!.textContent).toBe('true');

    host.remove();
  });

  it('renders a placeholder when there is no parent fsl-instance host', async () => {
    const panel = document.createElement('fsl-info-panel') as FslInfoPanel;
    document.body.append(panel);
    await settle(panel);
    expect(panel.shadowRoot!.textContent!.toLowerCase()).toContain('no fsl-instance');
    panel.remove();
  });

  it('releases its machine subscription on disconnect', async () => {
    const { host, panel } = mount_with_host("Off 'flip' -> On;");
    await settle(panel);

    panel.remove();          // disconnect the panel
    host.do('flip');                  // host advances to On
    await settle(panel);

    // Detached before the transition: panel must still show Off, not On.
    expect(panel.shadowRoot!.textContent).toContain('Off');
    expect(panel.shadowRoot!.textContent).not.toContain('On');
    host.remove();
  });

  it('does not bind if disconnected before the whenDefined microtask resolves', async () => {
    const { host, panel } = mount_with_host("Off 'flip' -> On;");
    // Detach synchronously, before the deferred whenDefined().then runs.
    panel.remove();
    await settle(panel);

    // The deferred bind saw _host cleared and bailed: never subscribed, so the
    // panel stays at its placeholder.
    expect(panel.shadowRoot!.textContent!.toLowerCase()).toContain('no fsl-instance');
    host.remove();
  });

  it('binds to a jssm-instance host too (closest_wc matches both prefixes)', async () => {
    const host  = document.createElement('jssm-instance') as FslInstance;
    host.setAttribute('fsl', "Off 'flip' -> On;");
    const panel = document.createElement('fsl-info-panel') as FslInfoPanel;
    host.append(panel);
    document.body.append(host);
    await settle(panel);

    expect(panel.shadowRoot!.textContent).toContain('Off');
    host.remove();
  });

});
