import { LitElement, html, css } from 'lit';
import { fslTokens } from './fsl_tokens.js';
import { closest_wc } from './wc_tag_helpers.js';
import { machine_to_dot } from '../jssm_viz.js';
/**
 * `<fsl-export>` — export buttons for a parent `<fsl-instance>`. Each produces a
 * string from the host's machine and fires `fsl-export` with `{ format,
 * content }`; the embedder decides what to do with it (copy, download, show).
 * Formats: Graphviz `dot` (via `machine_to_dot`), `json` (the machine's
 * `serialize()`), and `fsl` (the source). Standalone is inert.
 * @element fsl-export
 * @csspart export - The button row.
 * @fires {CustomEvent<{format: FslExportFormat, content: string}>} fsl-export
 */
export class FslExport extends LitElement {
    constructor() {
        super(...arguments);
        this._host = null;
    }
    connectedCallback() {
        super.connectedCallback();
        this._host = closest_wc(this, 'instance');
    }
    _emit(format) {
        if (this._host === null) {
            return;
        }
        let content;
        if (format === 'dot') {
            content = machine_to_dot(this._host.machine);
        }
        else if (format === 'json') {
            content = JSON.stringify(this._host.machine.serialize(), null, 2);
        }
        else {
            content = this._host.fsl;
        }
        this.dispatchEvent(new CustomEvent('fsl-export', { detail: { format, content }, bubbles: true, composed: true }));
    }
    render() {
        return html `
      <div class="export" part="export">
        <span class="label">export</span>
        <button class="btn" @click=${() => this._emit('dot')}>DOT</button>
        <button class="btn" @click=${() => this._emit('json')}>JSON</button>
        <button class="btn" @click=${() => this._emit('fsl')}>FSL</button>
      </div>
    `;
    }
}
FslExport.styles = css `
    :host { display: block; }
    .export {
      display: flex; align-items: center; gap: 0.4rem;
      padding: 0.4rem 0.6rem; background: var(--_fsl-surface);
      border-top: 1px solid var(--_fsl-border);
    }
    .btn {
      height: 1.8rem; padding: 0 0.7rem; cursor: pointer; border-radius: 4px;
      border: 1px solid var(--_fsl-border); background: var(--_fsl-surface); color: var(--_fsl-text);
      font: 600 0.78rem var(--_fsl-font);
    }
    .btn:hover { background: color-mix(in srgb, var(--_fsl-text) 8%, var(--_fsl-surface)); }
    .label { color: var(--_fsl-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em; }
    ${fslTokens}
  `;
