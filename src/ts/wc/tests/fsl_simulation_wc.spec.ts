// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from 'vitest';
import '../fsl_instance_wc.define.js';
import { FslSimulation } from '../fsl_simulation_wc.js';
import { FslInstance } from '../fsl_instance_wc.js';

beforeAll(() => {
  if (!customElements.get('fsl-simulation')) { customElements.define('fsl-simulation', FslSimulation); }
});

async function withHost(fsl: string): Promise<{ host: FslInstance; sim: FslSimulation }> {
  const host = document.createElement('fsl-instance') as FslInstance;
  host.setAttribute('fsl', fsl);
  const sim = document.createElement('fsl-simulation') as FslSimulation;
  sim.setAttribute('slot', 'simulation');
  host.append(sim);
  document.body.append(host);
  await host.updateComplete;
  await sim.updateComplete;
  return { host, sim };
}

const btns = (sim: FslSimulation): HTMLButtonElement[] =>
  [...sim.shadowRoot!.querySelectorAll('.btn')] as HTMLButtonElement[];

describe('<fsl-simulation>', () => {

  it('steps through random legal actions and no-ops at a terminal state', async () => {
    const { host, sim } = await withHost("A 'go' -> B 'go' -> C;");
    expect(sim.shadowRoot!.textContent).toContain('0 steps');

    btns(sim)[0].click();                              // A → B
    await sim.updateComplete;
    expect(sim.shadowRoot!.textContent).toContain('1 step');
    expect(host.getAttribute('current-state')).toBe('B');

    btns(sim)[0].click();                              // B → C
    await sim.updateComplete;
    expect(sim.shadowRoot!.textContent).toContain('2 steps');

    btns(sim)[0].click();                              // C is terminal → no-op
    await sim.updateComplete;
    expect(sim.shadowRoot!.textContent).toContain('2 steps');
    host.remove();
  });

  it('auto-steps while playing, then stops on pause', async () => {
    const { host, sim } = await withHost("A 'go' -> B 'go' -> C 'go' -> A;");   // cyclic
    vi.useFakeTimers();
    btns(sim)[1].click();                              // Play → start interval
    await sim.updateComplete;
    expect(btns(sim)[1].textContent).toBe('Pause');

    vi.advanceTimersByTime(700);                       // one interval (600ms) → one step
    await sim.updateComplete;
    expect(sim.shadowRoot!.textContent).toContain('1 step');

    btns(sim)[1].click();                              // Pause → clears the interval
    await sim.updateComplete;
    expect(btns(sim)[1].textContent).toBe('Play');

    vi.advanceTimersByTime(2000);                      // no further steps
    await sim.updateComplete;
    expect(sim.shadowRoot!.textContent).toContain('1 step');
    vi.useRealTimers();
    host.remove();
  });

  it('no-ops and shows idle when standalone (no fsl-instance ancestor)', async () => {
    const sim = document.createElement('fsl-simulation') as FslSimulation;
    document.body.append(sim);
    await sim.updateComplete;
    expect(sim.shadowRoot!.querySelector('.count')!.classList.contains('idle')).toBe(true);

    btns(sim)[0].click();                              // Step → host null → no-op
    btns(sim)[1].click();                              // Play → start → host null → no-op
    await sim.updateComplete;
    expect(sim.shadowRoot!.textContent).toContain('0 steps');
    sim.remove();
  });

});
