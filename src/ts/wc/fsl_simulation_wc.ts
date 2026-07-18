import { LitElement, html, css, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fslTokens } from './fsl_tokens.js';
import { closest_wc } from './wc_tag_helpers.js';

/** Host the simulation drives. */
interface SimHost extends HTMLElement {
  machine: { list_exit_actions(): string[] };
  do(action: string): boolean;
}

/**
 * `<fsl-simulation>` — a random-walk driver for a parent `<fsl-instance>`.
 *
 * `Step` fires one uniformly-random legal action; `Play` auto-steps every
 * {@link FslSimulation.interval} ms and stops automatically when the machine
 * reaches a terminal state (no legal actions). Standalone (no host ancestor)
 * the controls are disabled.
 * @element fsl-simulation
 * @csspart sim - The control row.
 * @attr {number} interval - Auto-step period in milliseconds (default 600).
 */
export class FslSimulation extends LitElement {

  static styles = css`
    :host { display: block; }
    .sim {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.4rem 0.6rem; background: var(--_fsl-surface);
      border-top: 1px solid var(--_fsl-border); font: 0.8rem var(--_fsl-font);
    }
    .btn {
      height: 1.8rem; padding: 0 0.7rem; cursor: pointer; border-radius: 4px;
      border: 1px solid var(--_fsl-border); background: var(--_fsl-surface); color: var(--_fsl-text);
      font: 600 0.8rem var(--_fsl-font);
    }
    .btn:hover { background: color-mix(in srgb, var(--_fsl-text) 8%, var(--_fsl-surface)); }
    .count { color: var(--_fsl-muted); }
    .count.idle { font-style: italic; }
    ${fslTokens}
  `;

  /** Auto-step period in milliseconds. */
  @property({ type: Number }) interval = 600;

  @state() private _running = false;
  @state() private _steps = 0;
  private _host: SimHost | null = null;
  private _timer: ReturnType<typeof setInterval> | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this._host = closest_wc(this, 'instance') as SimHost | null;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stop();
  }

  private _step = (): void => {
    if (this._host === null) { return; }
    const actions = this._host.machine.list_exit_actions();
    if (actions.length === 0) { this._stop(); return; }   // terminal — nothing to do
    this._host.do(actions[Math.floor(Math.random() * actions.length)]);
    this._steps += 1;
  };

  private _toggle = (): void => { if (this._running) { this._stop(); } else { this._start(); } };

  private _start(): void {
    if (this._host === null) { return; }
    this._running = true;
    this._timer = setInterval(this._step, this.interval);
  }

  private _stop(): void {
    this._running = false;
    if (this._timer !== null) { clearInterval(this._timer); this._timer = null; }
  }

  render(): TemplateResult {
    return html`
      <div class="sim" part="sim">
        <button class="btn" @click=${this._step}>Step</button>
        <button class="btn" @click=${this._toggle}>${this._running ? 'Pause' : 'Play'}</button>
        <span class="count ${this._host === null ? 'idle' : ''}">${this._steps} step${this._steps === 1 ? '' : 's'}</span>
      </div>
    `;
  }

}

declare global {
  interface HTMLElementTagNameMap { 'fsl-simulation': FslSimulation; }
}
