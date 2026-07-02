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

async function withStandalone(): Promise<FslStochastic> {
  const panel = document.createElement('fsl-stochastic') as FslStochastic;
  document.body.appendChild(panel);
  await panel.updateComplete;
  return panel;
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

  // ─── disconnectedCallback ─────────────────────────────────────────────────

  it('disconnectedCallback clears _host when panel leaves the DOM', async () => {
    const { host, panel } = await withHost(`a 'go' -> b;`);
    expect((panel as any)._host).not.toBeNull();
    host.remove();
    expect((panel as any)._host).toBeNull();
  });

  // ─── run() coverage ───────────────────────────────────────────────────────

  it('run() no-ops when host is null (standalone)', async () => {
    const panel = await withStandalone();
    panel.run();
    expect((panel as any)._summary).toBeNull();
    expect((panel as any)._error).toBeNull();
  });

  it('run() sets _error and renders .error div when FSL is invalid', async () => {
    const { host, panel } = await withHost(`a 'go' -> b;`);
    (host as any).fsl = '!!! completely invalid FSL !!!';
    panel.run();
    await panel.updateComplete;
    expect((panel as any)._error).toBe('Cannot run on invalid FSL source.');
    expect(panel.shadowRoot!.querySelector('.error')).not.toBeNull();
  });

  it('run() with blank seed passes undefined (seed=\'\' branch)', async () => {
    const { panel } = await withHost(`a 'go' -> b 'go' -> c;`);
    // seed property defaults to '' — do not assign it, leaving the '' → undefined path
    panel.runs = 5;
    panel.run();
    expect((panel as any)._summary).not.toBeNull();
    expect((panel as any)._error).toBeNull();
  });

  // ─── play() coverage ──────────────────────────────────────────────────────

  it('play() resolves immediately when host is null (standalone)', async () => {
    const panel = await withStandalone();
    await panel.play();
    expect((panel as any)._summary).toBeNull();
    expect((panel as any)._error).toBeNull();
  });

  it('play() sets _error and renders .error div when FSL is invalid', async () => {
    const { host, panel } = await withHost(`a 'go' -> b;`);
    (host as any).fsl = '!!! completely invalid FSL !!!';
    await panel.play();
    await panel.updateComplete;
    expect((panel as any)._error).toBe('Cannot run on invalid FSL source.');
    expect(panel.shadowRoot!.querySelector('.error')).not.toBeNull();
  });

  it('play() with blank seed skips rng_seed assignment (seed=\'\' branch)', async () => {
    const { panel } = await withHost(`a 'go' -> b 'go' -> c;`);
    // seed property defaults to '' — leave it, exercising the if-body=false path at line 122
    panel.runs = 5;
    await panel.play();
    expect((panel as any)._summary).not.toBeNull();
  });

  it('play() uses synchronous fallback when requestAnimationFrame is absent', async () => {
    // Covers the else branch of schedule() at line 136 (fn() direct call)
    const { panel } = await withHost(`a 'go' -> b 'go' -> c;`);
    const origRaf = (globalThis as any).requestAnimationFrame;
    (globalThis as any).requestAnimationFrame = undefined;
    try {
      panel.runs = 5;
      panel.seed = '1';
      await panel.play();
    } finally {
      (globalThis as any).requestAnimationFrame = origRaf;
    }
    expect((panel as any)._summary).not.toBeNull();
  });

  it('play() processes multiple chunks when runs exceed the chunk size', async () => {
    // Covers lines 157-158: _commit + schedule(tick) after a full 50-run chunk
    const { panel } = await withHost(`a 'go' -> b 'go' -> c;`);
    panel.runs = 100;    // > internal CHUNK=50, requires at least two ticks
    panel.seed = '1';
    await panel.play();
    await panel.updateComplete;
    const bars = panel.shadowRoot!.querySelectorAll('.bar');
    expect(bars.length).toBe(3);
  });

  it('play() resolves early when _playing is cleared before the first tick fires', async () => {
    // Covers line 140: if (!this._playing) { resolve(); return; }
    // Use a capturing rAF mock so we control exactly when tick() runs
    const { panel } = await withHost(`a 'go' -> b 'go' -> a;`);
    panel.runs = 200;

    const pending: Array<(t: number) => void> = [];
    const origRaf = (globalThis as any).requestAnimationFrame;
    (globalThis as any).requestAnimationFrame = (fn: (t: number) => void) => { pending.push(fn); return 0; };

    try {
      const promise = panel.play();
      // play() has set _playing=true and queued the first tick — but hasn't called it yet
      expect((panel as any)._playing).toBe(true);

      // Simulate a pause: clear _playing before the tick fires
      (panel as any)._playing = false;

      // Fire the captured tick — it should see _playing=false, resolve immediately, schedule nothing
      if (pending.length > 0) { pending[0](0); }

      await promise;
      // tick returned early before any _commit, so summary is still null
      expect((panel as any)._summary).toBeNull();
    } finally {
      (globalThis as any).requestAnimationFrame = origRaf;
    }
  });

  it('play() in steady_state mode commits summary without montecarlo fields', async () => {
    // Covers branch 9 (line 153 if-montecarlo skip) and branch 13 (line 191 _commit else)
    const { panel } = await withHost(`a 'go' -> b 'go' -> a;`);
    panel.mode = 'steady_state';
    panel.runs = 5;
    panel.seed = '1';
    await panel.play();
    await panel.updateComplete;
    expect(panel.shadowRoot!.textContent).toContain('steady-state distribution');
    const summary = (panel as any)._summary;
    expect(summary).not.toBeNull();
    expect(summary.path_lengths).toBeUndefined();
  });

  it('play() increments capped counter for runs that hit maxSteps without terminating', async () => {
    // Covers line 154 else branch: else { capped += 1; }
    // A tight loop machine has no terminal state, so every run is capped
    const { panel } = await withHost(`a 'go' -> a;`);
    panel.runs = 5;
    panel.maxSteps = 3;
    panel.seed = '1';
    await panel.play();
    const summary = (panel as any)._summary;
    expect(summary).not.toBeNull();
    expect(summary.capped).toBeGreaterThan(0);
  });

  // ─── _togglePlay coverage ─────────────────────────────────────────────────

  it('_togglePlay starts play from idle state', async () => {
    // Covers line 200 else branch: void this.play()
    // Use synchronous fallback so play() completes immediately inside _togglePlay
    const { panel } = await withHost(`a 'go' -> b 'go' -> c;`);
    const origRaf = (globalThis as any).requestAnimationFrame;
    (globalThis as any).requestAnimationFrame = undefined;
    try {
      panel.runs = 5;
      panel.seed = '1';
      (panel as any)._togglePlay();
      // play() ran synchronously to completion since rAF is absent
      expect((panel as any)._summary).not.toBeNull();
      expect((panel as any)._playing).toBe(false);
    } finally {
      (globalThis as any).requestAnimationFrame = origRaf;
    }
  });

  it('_togglePlay pauses an in-progress animation by setting _playing false', async () => {
    // Covers line 200 then branch: this._playing = false
    const panel = await withStandalone();
    (panel as any)._playing = true;
    (panel as any)._togglePlay();
    expect((panel as any)._playing).toBe(false);
  });

  // ─── input handler coverage ───────────────────────────────────────────────

  it('input handlers update mode, runs, maxSteps, and seed properties', async () => {
    // Covers _onMode (line 202), _onRuns (203), _onMax (204), _onSeed (205)
    const { panel } = await withHost(`a 'go' -> b;`);
    const mkEv = (value: string) => ({ target: { value } } as unknown as Event);

    (panel as any)._onMode(mkEv('steady_state'));
    expect(panel.mode).toBe('steady_state');

    (panel as any)._onRuns(mkEv('42'));
    expect(panel.runs).toBe(42);

    (panel as any)._onMax(mkEv('999'));
    expect(panel.maxSteps).toBe(999);

    (panel as any)._onSeed(mkEv('7'));
    expect(panel.seed).toBe('7');
  });

});
