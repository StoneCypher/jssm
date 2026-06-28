var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
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
    constructor() {
        super(...arguments);
        this._state = '';
        this._actions = 0;
        this._terminal = false;
        this._complete = false;
        this._observer = null;
    }
    connectedCallback() {
        super.connectedCallback();
        const host = closest_wc(this, 'instance');
        if (host === null) {
            return;
        }
        const sync = () => {
            var _a, _b;
            this._state = (_a = host.getAttribute('current-state')) !== null && _a !== void 0 ? _a : '';
            const la = ((_b = host.getAttribute('legal-actions')) !== null && _b !== void 0 ? _b : '').trim();
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
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._observer !== null) {
            this._observer.disconnect();
            this._observer = null;
        }
    }
    render() {
        return html `
      <div class="bar" part="bar">
        ${this._state ? html `<span class="state">${this._state}</span>` : ''}
        <span>${this._actions} action${this._actions === 1 ? '' : 's'}</span>
        ${this._terminal ? html `<span class="badge">terminal</span>` : ''}
        ${this._complete ? html `<span class="badge">complete</span>` : ''}
        <span class="spacer"></span>
        <slot></slot>
      </div>`;
    }
}
FslFooter.styles = css `
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
__decorate([
    state()
], FslFooter.prototype, "_state", void 0);
__decorate([
    state()
], FslFooter.prototype, "_actions", void 0);
__decorate([
    state()
], FslFooter.prototype, "_terminal", void 0);
__decorate([
    state()
], FslFooter.prototype, "_complete", void 0);
