// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import '../fsl_instance_wc.define.js';
import { FslStochastic } from '../fsl_stochastic_wc.js';
import { FslInstance } from '../fsl_instance_wc.js';

beforeAll(() => {
  if (!customElements.get('fsl-stochastic')) { customElements.define('fsl-stochastic', FslStochastic); }
});

async function withHost(fsl: string): Promise<{ host: FslInstance; panel: FslStochastic }> {
  const host = document.createElement('fsl-instance') as FslInstance;
  host.setAttribute('fsl', fsl);
  const panel = document.createElement('fsl-stochastic') as FslStochastic;
  panel.setAttribute('slot', 'stochastic');
  host.appendChild(panel);
  document.body.appendChild(host);
  await host.updateComplete;
  await panel.updateComplete;
  return { host, panel };
}

describe('<fsl-stochastic>', () => {

  it('disables Run when standalone (no host)', async () => {
    const panel = document.createElement('fsl-stochastic') as FslStochastic;
    document.body.appendChild(panel);
    await panel.updateComplete;
    const run = panel.shadowRoot!.querySelector<HTMLButtonElement>('.run')!;
    expect(run.disabled).toBe(true);
  });

  it('runs instantly and renders a state-visit bar per state', async () => {
    const { panel } = await withHost(`a 'go' -> b 'go' -> c;`);
    panel.seed = '1';
    panel.run();
    await panel.updateComplete;
    const bars = panel.shadowRoot!.querySelectorAll('.bar');
    expect(bars.length).toBe(3);             // a, b, c
    expect(panel.shadowRoot!.textContent).toContain('Reached terminal');
  });

  it('emits fsl-stochastic-complete with the summary', async () => {
    const { panel } = await withHost(`a 'go' -> b 'go' -> c;`);
    panel.seed = '1';
    let detail: { runs?: number } | null = null;
    panel.addEventListener('fsl-stochastic-complete', (e) => { detail = (e as CustomEvent).detail; });
    panel.run();
    expect(detail).not.toBeNull();
    expect(detail!.runs).toBeGreaterThan(0);
  });

  it('steady_state mode hides the montecarlo-only panes', async () => {
    const { panel } = await withHost(`a 'go' -> b 'go' -> a;`);
    panel.seed = '1';
    panel.mode = 'steady_state';
    panel.run();
    await panel.updateComplete;
    expect(panel.shadowRoot!.textContent).not.toContain('Reached terminal');
  });

  it('defaults the runs field from editor_config().stochastic_run_count', async () => {
    const { panel } = await withHost(`editor: { stochastic_run_count: 42; }; a 'go' -> b;`);
    expect(panel.runs).toBe(42);
  });

  it('animated play accumulates runs then completes', async () => {
    const { panel } = await withHost(`a 'go' -> b 'go' -> c;`);
    panel.seed = '1';
    panel.runs = 5;
    await panel.play();           // resolves when the animated batch finishes
    await panel.updateComplete;
    const bars = panel.shadowRoot!.querySelectorAll('.bar');
    expect(bars.length).toBe(3);
    expect(panel.shadowRoot!.textContent).toContain('Reached terminal');
  });

  it('host exposes a hidden-by-default stochastic slot, shown when requested', async () => {
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', `editor: { panels: [stochastic]; }; a 'go' -> b;`);
    host.setAttribute('panel-mode', 'request');
    document.body.appendChild(host);
    await host.updateComplete;
    const section = host.shadowRoot!.querySelector('.stochastic') as HTMLElement;
    expect(section).not.toBeNull();
    expect(section.hidden).toBe(false);
  });

  it('host hides the stochastic slot by default when not requested', async () => {
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', `a 'go' -> b;`);
    document.body.appendChild(host);
    await host.updateComplete;
    const section = host.shadowRoot!.querySelector('.stochastic') as HTMLElement;
    expect(section).not.toBeNull();
    expect(section.hidden).toBe(true);
  });

});
