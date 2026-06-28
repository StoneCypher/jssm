import { LitElement, html, css, type TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import { fslTokens } from './fsl_tokens.js';
import { closest_wc } from './wc_tag_helpers.js';

/**
 * `<fsl-footer>` — a status bar for a parent `<fsl-instance>`.
 *
 * Reflects the host's current state, legal-action count, and
 * terminal/complete status by observing the host's reflected attributes
 * (`current-state`, `legal-actions`, `terminal`, `complete`) — so it tracks
 * transitions *and* survives a live machine rebuild (#1387) without a machine
 * subscription. A default slot carries embedder status (line/column, parse
 * state, …). Standalone (no `<fsl-instance>` ancestor) it renders just the slot.
 *
 * @element fsl-footer
 * @csspart bar - The footer bar container.
 * @slot - Trailing custom status, right-aligned.
 */
export class FslFooter extends LitElement {

  static styles = css`
    :host { display: block; }
    .bar {
      display: flex; align-items: center; gap: 0.6rem;
      font: 12px var(--_fsl-font-mono); color: var(--_fsl-muted);
      padding: 0.3rem 0.7rem; background: var(--_fsl-surface);
      border-top: 1px solid var(--_fsl-border);
    }
    .state { color: var(--_fsl-text); font-weight: 600; }
    .badge { padding: 0 0.4rem; border-radius: 3px; background: var(--_fsl-accent); color: #06101f; font-weight: 600; }
    .spacer { flex: 1; }
    ${fslTokens}
  `;

  @state() private _state = '';
  @state() private _actions = 0;
  @state() private _terminal = false;
  @state() private _complete = false;

  private _observer: MutationObserver | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    const host = closest_wc(this, 'instance');
    if (host === null) { return; }
    const sync = (): void => {
      this._state = host.getAttribute('current-state') ?? '';
      const la = (host.getAttribute('legal-actions') ?? '').trim();
      this._actions = la === '' ? 0 : la.split(/\s+/).length;
      this._terminal = host.hasAttribute('terminal');
      this._complete = host.hasAttribute('complete');
    };
    this._observer = new MutationObserver(sync);
    this._observer.observe(host, {
      attributes: true,
      attributeFilter: ['current-state', 'legal-actions', 'terminal', 'complete'],
    });
    sync();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._observer !== null) { this._observer.disconnect(); this._observer = null; }
  }

  render(): TemplateResult {
    return html`
      <div class="bar" part="bar">
        ${this._state ? html`<span class="state">${this._state}</span>` : ''}
        <span>${this._actions} action${this._actions === 1 ? '' : 's'}</span>
        ${this._terminal ? html`<span class="badge">terminal</span>` : ''}
        ${this._complete ? html`<span class="badge">complete</span>` : ''}
        <span class="spacer"></span>
        <slot></slot>
      </div>`;
  }

}

declare global {
  interface HTMLElementTagNameMap { 'fsl-footer': FslFooter; }
}
