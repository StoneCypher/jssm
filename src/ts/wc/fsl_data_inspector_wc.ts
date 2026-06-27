import { LitElement, html, css, type TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import { fslTokens } from './fsl_tokens.js';
import { closest_wc } from './wc_tag_helpers.js';

/** Host whose machine data the inspector reads. */
interface DataHost extends HTMLElement { machine: { data(): unknown }; }

/** Host DOM events that can change the machine's data. */
const DATA_EVENTS = ['fsl-transition', 'fsl-data-change', 'fsl-machine-rebuilt'] as const;

/**
 * `<fsl-data-inspector>` — a view of a parent `<fsl-instance>`'s extended-state
 * data. Re-reads `host.machine.data()` on the host's transition / data-change /
 * rebuild DOM events. Renders `no data` when the machine carries none.
 * Standalone (no host ancestor) renders empty.
 *
 * @element fsl-data-inspector
 * @csspart inspector - The container.
 */
export class FslDataInspector extends LitElement {

  static styles = css`
    :host { display: block; }
    .inspector {
      padding: 0.5rem 0.7rem; font: 0.8rem var(--_fsl-font-mono);
      color: var(--_fsl-text); background: var(--_fsl-surface); overflow: auto;
    }
    .json { margin: 0; white-space: pre-wrap; }
    .empty { color: var(--_fsl-muted); font-style: italic; }
    ${fslTokens}
  `;

  @state() private _data: unknown = undefined;
  private _unbind: (() => void) | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    const host = closest_wc(this, 'instance') as DataHost | null;
    if (host === null) { return; }
    const sync = (): void => { this._data = host.machine.data(); };
    for (const ev of DATA_EVENTS) { host.addEventListener(ev, sync); }
    this._unbind = (): void => { for (const ev of DATA_EVENTS) { host.removeEventListener(ev, sync); } };
    sync();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._unbind !== null) { this._unbind(); this._unbind = null; }
  }

  render(): TemplateResult {
    return html`
      <div class="inspector" part="inspector">
        ${this._data === undefined
          ? html`<span class="empty">no data</span>`
          : html`<pre class="json">${JSON.stringify(this._data, null, 2)}</pre>`}
      </div>`;
  }

}

declare global {
  interface HTMLElementTagNameMap { 'fsl-data-inspector': FslDataInspector; }
}
