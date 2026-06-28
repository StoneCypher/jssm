var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { closest_wc } from './wc_tag_helpers.js';
import { fslTokens } from './fsl_tokens.js';
/**
 * Read-only panel that displays the parent machine's **resolved FSL
 * properties** for the current state — the values produced by the full
 * override chain (machine `property … default …` → per-state
 * `state X: { property … }`), as returned by `machine.props()`. Refreshes on
 * every transition, so consumers can watch a property's effective value change
 * as the machine moves between states.
 *
 * Binds to the host via {@link closest_wc} (matching both `fsl-instance` and
 * the deprecated `jssm-instance`). Display-only; never drives the machine.
 *
 * v1 shows the FSL `property` bag (`machine.props()`). The render-time visual
 * style resolution (shape/color used by `<fsl-viz>`) is a separate viz-pipeline
 * concern and is not surfaced here.
 *
 * @element fsl-effective-properties
 * @cssproperty [--fsl-effective-properties-gap=0.25rem] - Gap between rows.
 */
export class FslEffectiveProperties extends LitElement {
    constructor() {
        super(...arguments);
        /** Parent host reference; cleared on disconnect. */
        this._host = null;
        /** Unsubscribe callback from the host machine's `transition` subscription. */
        this._sub = null;
        /**
         * Resolved property entries (`[name, stringified value]`) for the current
         * state, or `null` before the panel has bound to a host machine.
         */
        this._entries = null;
    }
    /**
     * Web Components lifecycle hook. Binds to the parent host once
     * `<fsl-instance>` has upgraded, then paints the initial property snapshot
     * and refreshes on each transition. With no host, leaves `_entries` null so
     * {@link render} shows the placeholder.
     */
    connectedCallback() {
        super.connectedCallback();
        const host = closest_wc(this, 'instance');
        if (host === null) {
            return;
        }
        this._host = host;
        void customElements.whenDefined('fsl-instance').then(() => {
            if (this._host !== host) {
                return;
            }
            this._sub = host.machine.on('transition', () => this._refresh(host));
            this._refresh(host); // initial snapshot
        });
    }
    /**
     * Web Components lifecycle hook. Releases the subscription and clears the
     * host reference, retaining the last-painted snapshot so a detached panel
     * keeps showing its final values.
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._sub !== null) {
            this._sub();
            this._sub = null;
        }
        this._host = null;
    }
    /**
     * Read the resolved property bag (`machine.props()`) into reactive entries,
     * triggering a re-render.
     *
     * @param host - The bound parent host whose machine to snapshot.
     */
    _refresh(host) {
        const bag = host.machine.props();
        this._entries = Object.entries(bag).map(([k, v]) => [k, String(v)]);
    }
    /**
     * Lit render method. Placeholder until bound; an empty-state message when the
     * machine declares no properties; otherwise a name → value grid.
     *
     * @returns A Lit `TemplateResult` for the panel.
     */
    render() {
        if (this._entries === null) {
            return html `<div class="placeholder">no fsl-instance host</div>`;
        }
        if (this._entries.length === 0) {
            return html `<div class="placeholder">no properties declared</div>`;
        }
        return html `
      <div class="props">
        ${this._entries.map(([name, value]) => html `
          <div class="row">
            <span class="name">${name}</span><span class="value">${value}</span>
          </div>
        `)}
      </div>
    `;
    }
}
FslEffectiveProperties.styles = css `
    :host { display: block; }
    .props, .placeholder {
      padding: 0.5rem 0.7rem; font: 0.8rem var(--_fsl-font-mono);
      color: var(--_fsl-text); background: var(--_fsl-surface);
    }
    .props { display: grid; gap: var(--fsl-effective-properties-gap, 0.25rem); }
    .row { display: flex; gap: 0.5rem; }
    .name { font-weight: 600; color: var(--_fsl-muted); }
    .placeholder { color: var(--_fsl-muted); font-style: italic; }
    ${fslTokens}
  `;
__decorate([
    state()
], FslEffectiveProperties.prototype, "_entries", void 0);
