import { LitElement, html, css, type TemplateResult, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fslTokens } from './fsl_tokens.js';
import { closest_wc } from './wc_tag_helpers.js';
import { sm, STOCHASTIC_DEFAULT_RUNS, STOCHASTIC_DEFAULT_MAX_STEPS } from '../jssm.js';
import type { JssmStochasticMode, JssmStochasticSummary } from '../jssm_types.js';

/** Host the stochastic panel reads its FSL source from. */
interface StochHost extends HTMLElement {
  fsl: string;
  machine?: { editor_config?(): { stochastic_run_count?: number } | undefined };
}

/**
 * `<fsl-stochastic>` — a statistical/Monte-Carlo explorer for a parent
 * `<fsl-instance>` (fsl#1384).  Builds its own throwaway machine from the
 * host's `.fsl` source (never touching the live machine) and renders
 * aggregate run statistics in-panel.  Standalone (no host) the controls are
 * disabled.
 *
 * @element fsl-stochastic
 * @csspart controls - The control row.
 * @fires fsl-stochastic-complete - CustomEvent<JssmStochasticSummary> after a run.
 */
export class FslStochastic extends LitElement {

  static styles = css`
    :host { display: block; font: 0.8rem var(--_fsl-font); color: var(--_fsl-text); }
    .controls {
      display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
      padding: 0.4rem 0.6rem; background: var(--_fsl-surface);
      border-top: 1px solid var(--_fsl-border);
    }
    .btn, .run {
      height: 1.8rem; padding: 0 0.7rem; cursor: pointer; border-radius: 4px;
      border: 1px solid var(--_fsl-border); background: var(--_fsl-surface);
      color: var(--_fsl-text); font: 600 0.8rem var(--_fsl-font);
    }
    .btn:disabled, .run:disabled { opacity: 0.5; cursor: not-allowed; }
    input { width: 4.5rem; height: 1.6rem; background: var(--_fsl-surface);
            color: var(--_fsl-text); border: 1px solid var(--_fsl-border); border-radius: 4px; }
    .panes { padding: 0.4rem 0.6rem; display: grid; gap: 0.5rem; }
    .bar-row { display: grid; grid-template-columns: 4rem 1fr 3rem; align-items: center; gap: 0.4rem; }
    .track { background: color-mix(in srgb, var(--_fsl-text) 8%, var(--_fsl-surface)); border-radius: 3px; height: 0.9rem; }
    .bar { background: var(--_fsl-accent); height: 0.9rem; border-radius: 3px; }
    .muted { color: var(--_fsl-muted); }
    .error { color: var(--_fsl-danger, #c0392b); padding: 0.4rem 0.6rem; }
    ${fslTokens}
  `;

  /** Run-count (montecarlo). Defaults from editor_config().stochastic_run_count. */
  @property({ type: Number }) runs = STOCHASTIC_DEFAULT_RUNS;
  /** Per-run step cap (montecarlo) / walk length (steady_state). */
  @property({ type: Number }) maxSteps = STOCHASTIC_DEFAULT_MAX_STEPS;
  /** Seed string ('' = time-based). Kept as string so the field can be blank. */
  @property({ type: String }) seed = '';
  /** Run mode. */
  @property({ type: String }) mode: JssmStochasticMode = 'montecarlo';

  @state() private _summary: JssmStochasticSummary | null = null;
  @state() private _error: string | null = null;
  @state() private _host: StochHost | null = null;
  @state() private _playing = false;

  connectedCallback(): void {
    super.connectedCallback();
    this._host = closest_wc(this, 'instance') as StochHost | null;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._host = null;
  }

  /**
   * Read `editor_config().stochastic_run_count` after the first render so the
   * host's machine is guaranteed to be built (machine construction happens in
   * the host's connectedCallback, which may fire after the panel's own
   * connectedCallback in some environments).
   */
  firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    try {
      const declared = this._host?.machine?.editor_config?.()?.stochastic_run_count;
      if (typeof declared === 'number') { this.runs = declared; }
    } catch { /* machine not ready — leave default */ }
  }

  /** Execute a batch synchronously and render the aggregates. */
  run = (): void => {
    if (this._host === null) { return; }
    let machine: ReturnType<typeof sm>;
    try { machine = sm`${this._host.fsl}`; }
    catch { this._error = 'Cannot run on invalid FSL source.'; this._summary = null; return; }
    this._error = null;
    const seedNum = this.seed.trim() === '' ? undefined : Number(this.seed);
    this._summary = machine.stochastic_summary({
      mode: this.mode, runs: this.runs, max_steps: this.maxSteps, seed: seedNum,
    });
    this.dispatchEvent(new CustomEvent<JssmStochasticSummary>('fsl-stochastic-complete', {
      detail: this._summary, bubbles: true, composed: true,
    }));
  };

  /**
   * Animate the batch: accumulate runs incrementally via `requestAnimationFrame`,
   * redrawing as they land. Resolves when the batch completes or is paused-to-stop.
   *
   * Falls back to immediate (synchronous chunk) scheduling under jsdom where
   * `requestAnimationFrame` is undefined.
   *
   * @example
   * panel.runs = 100;
   * await panel.play(); // resolves when all 100 runs are done
   */
  play = (): Promise<void> => new Promise((resolve) => {
    if (this._host === null) { resolve(); return; }
    let machine: ReturnType<typeof sm>;
    try { machine = sm`${this._host.fsl}`; }
    catch { this._error = 'Cannot run on invalid FSL source.'; this._summary = null; resolve(); return; }
    this._error = null;
    if (this.seed.trim() !== '') { machine.rng_seed = Number(this.seed); }
    const effective_seed = machine.rng_seed;

    const state_visits  = new Map<string, number>();
    const edges         = new Map<string, number>();
    const path_lengths: number[] = [];
    let reached = 0;
    let capped  = 0;
    let runs    = 0;
    const iter = machine.stochastic_runs({ mode: this.mode, runs: this.runs, max_steps: this.maxSteps });

    this._playing = true;
    const CHUNK = 50;
    const schedule = (fn: () => void): void => {
      if (typeof requestAnimationFrame === 'function') { requestAnimationFrame(fn); } else { fn(); }
    };

    const tick = (): void => {
      if (!this._playing) { resolve(); return; }
      for (let i = 0; i < CHUNK; i++) {
        const next = iter.next();
        if (next.done) {
          this._commit(state_visits, edges, path_lengths, reached, capped, runs, effective_seed);
          this._playing = false;
          resolve();
          return;
        }
        const r = next.value;
        runs += 1;
        for (const s of r.states) { state_visits.set(s, (state_visits.get(s) ?? 0) + 1); }
        for (const e of r.edges)  { edges.set(e, (edges.get(e) ?? 0) + 1); }
        if (this.mode === 'montecarlo') {
          if (r.terminated) { reached += 1; path_lengths.push(r.length); } else { capped += 1; }
        }
      }
      this._commit(state_visits, edges, path_lengths, reached, capped, runs, effective_seed);
      schedule(tick);
    };
    schedule(tick);
  });

  /**
   * Fold accumulated counters into a rendered summary. Shared by {@link play}
   * for incremental rendering during animation.
   *
   * @param state_visits     - Accumulated visit counts per state name.
   * @param edge_traversals  - Accumulated traversal counts per edge key.
   * @param path_lengths     - Lengths of completed (terminated) paths.
   * @param terminal_reached - Count of runs that reached a terminal state.
   * @param capped           - Count of runs that hit the step cap.
   * @param runs             - Total runs processed so far.
   * @param seed             - The effective RNG seed used for this batch.
   */
  private _commit(
    state_visits: Map<string, number>,
    edge_traversals: Map<string, number>,
    path_lengths: number[],
    terminal_reached: number,
    capped: number,
    runs: number,
    seed: number,
  ): void {
    const total = [...state_visits.values()].reduce((a, b) => a + b, 0);
    const frac = new Map<string, number>();
    for (const [s, c] of state_visits) { frac.set(s, c / total); }
    const summary: JssmStochasticSummary = {
      mode: this.mode, runs, seed,
      state_visits, state_visit_fraction: frac, edge_traversals,
    };
    if (this.mode === 'montecarlo') {
      summary.path_lengths = path_lengths;
      summary.terminal_reached = terminal_reached;
      summary.capped = capped;
    }
    this._summary = summary;
  }

  /** Toggle between playing and paused. Starts a new {@link play} batch when idle. */
  private _togglePlay = (): void => { if (this._playing) { this._playing = false; } else { void this.play(); } };

  private _onMode = (e: Event): void => { this.mode = (e.target as HTMLInputElement).value as JssmStochasticMode; };
  private _onRuns = (e: Event): void => { this.runs = Number((e.target as HTMLInputElement).value); };
  private _onMax  = (e: Event): void => { this.maxSteps = Number((e.target as HTMLInputElement).value); };
  private _onSeed = (e: Event): void => { this.seed = (e.target as HTMLInputElement).value; };

  private _bars(): TemplateResult {
    const frac = this._summary!.state_visit_fraction;
    const rows = [...frac.entries()].sort((a, b) => b[1] - a[1]);
    return html`${rows.map(([name, f]) => html`
      <div class="bar-row">
        <span>${name}</span>
        <span class="track"><span class="bar" style="width:${(f * 100).toFixed(1)}%"></span></span>
        <span>${(f * 100).toFixed(1)}%</span>
      </div>`)}`;
  }

  private _panes(): TemplateResult {
    const s = this._summary!;
    const mc = s.mode === 'montecarlo';
    const reached = mc && s.runs > 0 ? Math.round((s.terminal_reached! / s.runs) * 100) : 0;
    const capped  = mc && s.runs > 0 ? Math.round((s.capped! / s.runs) * 100) : 0;
    return html`
      <div class="panes">
        <div><strong>State visits</strong></div>
        ${this._bars()}
        ${mc ? html`<div>Reached terminal: ${reached}% · Hit cap: ${capped}%</div>` : html`<div class="muted">steady-state distribution</div>`}
      </div>`;
  }

  render(): TemplateResult {
    const disabled = this._host === null;
    return html`
      <div class="controls" part="controls">
        <select @change=${this._onMode} .value=${this.mode}>
          <option value="montecarlo">Monte Carlo</option>
          <option value="steady_state">Steady-state</option>
        </select>
        ${this.mode === 'montecarlo'
          ? html`<label>runs <input type="number" .value=${String(this.runs)} @change=${this._onRuns}></label>`
          : ''}
        <label>max steps <input type="number" .value=${String(this.maxSteps)} @change=${this._onMax}></label>
        <label>seed <input type="text" .value=${this.seed} @change=${this._onSeed}></label>
        <button class="run" ?disabled=${disabled} @click=${this.run}>Run</button>
        <button class="btn" ?disabled=${disabled} @click=${this._togglePlay}>${this._playing ? 'Pause' : 'Play'}</button>
      </div>
      ${this._error ? html`<div class="error">${this._error}</div>` : ''}
      ${this._summary && !this._error ? this._panes() : html`<div class="panes muted">No run yet.</div>`}`;
  }

}

declare global {
  interface HTMLElementTagNameMap { 'fsl-stochastic': FslStochastic; }
}
