import { LitElement, html, css, type TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import { fslTokens } from './fsl_tokens.js';
import { closest_wc } from './wc_tag_helpers.js';

/** Machine events (re-emitted by the host as `fsl-<name>`, #639) the log shows. */
const LOGGED_EVENTS = [
  'transition', 'entry', 'exit', 'terminal', 'complete',
  'action', 'rejection', 'override', 'data-change', 'timeout', 'error',
] as const;

/** Cap on retained log entries. */
const MAX_ENTRIES = 50;

/**
 * `<fsl-hook-log>` — a running log of a parent `<fsl-instance>`'s machine
 * events, listening to the host's re-emitted `fsl-*` DOM events (#639). Keeps
 * the most recent {@link MAX_ENTRIES}. Standalone (no host ancestor) is empty.
 * @element fsl-hook-log
 * @csspart log - The log container.
 */
export class FslHookLog extends LitElement {

  static styles = css`
    :host { display: block; }
    .log {
      padding: 0.4rem 0.6rem; font: 0.78rem var(--_fsl-font-mono);
      color: var(--_fsl-text); background: var(--_fsl-surface);
      /* Bounded + scrollable so the running log stays a self-contained panel
         instead of growing without limit and crowding sibling panels out. */
      max-height: var(--fsl-hook-log-max-height, 12em); overflow-y: auto;
    }
    .entry { padding: 0.05rem 0; color: var(--_fsl-text); }
    .entry::before { content: "▸ "; color: var(--_fsl-accent); }
    .empty { color: var(--_fsl-muted); font-style: italic; }
    ${fslTokens}
  `;

  @state() private _log: string[] = [];
  private _unbind: (() => void) | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    const host = closest_wc(this, 'instance');
    if (host === null) { return; }
    const offs = LOGGED_EVENTS.map(name => {
      const handler = (): void => { this._log = [...this._log.slice(-(MAX_ENTRIES - 1)), name]; };
      host.addEventListener(`fsl-${name}`, handler);
      return (): void => { host.removeEventListener(`fsl-${name}`, handler); };
    });
    this._unbind = (): void => { for (const off of offs) { off(); } };
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._unbind !== null) { this._unbind(); this._unbind = null; }
  }

  render(): TemplateResult {
    return html`
      <div class="log" part="log">
        ${this._log.length === 0
          ? html`<span class="empty">no events</span>`
          : this._log.map(name => html`<div class="entry">${name}</div>`)}
      </div>
    `;
  }

}

declare global {
  interface HTMLElementTagNameMap { 'fsl-hook-log': FslHookLog; }
}
