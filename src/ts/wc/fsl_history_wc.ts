import { LitElement, html, css, type TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import { fslTokens } from './fsl_tokens.js';
import { closest_wc } from './wc_tag_helpers.js';

/**
 * `<fsl-history>` — the visited-state timeline for a parent `<fsl-instance>`.
 *
 * Listens to the host's `fsl-transition` DOM events (re-emitted once per
 * transition, #639) and records the host's reflected `current-state`, so it
 * captures every transition and survives a live machine rebuild without a
 * machine subscription. Standalone (no host ancestor) renders empty.
 *
 * @element fsl-history
 * @csspart timeline - The timeline container.
 */
export class FslHistory extends LitElement {

  static styles = css`
    :host { display: block; }
    .timeline {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem;
      padding: 0.5rem 0.7rem; font: 0.82rem var(--_fsl-font);
      color: var(--_fsl-text); background: var(--_fsl-surface);
    }
    .state {
      padding: 0.1rem 0.45rem; border-radius: 4px; border: 1px solid var(--_fsl-border);
      background: color-mix(in srgb, var(--_fsl-accent) 14%, transparent);
    }
    .state.current { background: var(--_fsl-accent); color: #06101f; font-weight: 600; }
    .arrow { color: var(--_fsl-muted); }
    .empty { color: var(--_fsl-muted); font-style: italic; padding: 0.5rem 0.7rem; }
    ${fslTokens}
  `;

  @state() private _history: string[] = [];
  private _unbind: (() => void) | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    const host = closest_wc(this, 'instance');
    if (host === null) { return; }
    const push = (): void => {
      const s = host.getAttribute('current-state');
      if (s !== null && s !== this._history[this._history.length - 1]) {
        this._history = [...this._history, s];
      }
    };
    host.addEventListener('fsl-transition', push);
    this._unbind = (): void => { host.removeEventListener('fsl-transition', push); };
    push();   // seed with the initial state
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._unbind !== null) { this._unbind(); this._unbind = null; }
  }

  render(): TemplateResult {
    if (this._history.length === 0) {
      return html`<div class="timeline" part="timeline"><span class="empty">no history</span></div>`;
    }
    const last = this._history.length - 1;
    return html`
      <div class="timeline" part="timeline">
        ${this._history.map((s, i) => html`${i > 0 ? html`<span class="arrow">→</span>` : ''}<span class="state ${i === last ? 'current' : ''}">${s}</span>`)}
      </div>`;
  }

}

declare global {
  interface HTMLElementTagNameMap { 'fsl-history': FslHistory; }
}
