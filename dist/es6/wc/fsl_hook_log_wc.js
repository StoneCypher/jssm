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
/** Machine events (re-emitted by the host as `fsl-<name>`, #639) the log shows. */
const LOGGED_EVENTS = [
    'transition', 'entry', 'exit', 'terminal', 'complete',
    'action', 'rejection', 'override', 'data-change', 'timeout', 'error',
];
/** Cap on retained log entries. */
const MAX_ENTRIES = 50;
/**
 * `<fsl-hook-log>` — a running log of a parent `<fsl-instance>`'s machine
 * events, listening to the host's re-emitted `fsl-*` DOM events (#639). Keeps
 * the most recent {@link MAX_ENTRIES}. Standalone (no host ancestor) is empty.
 *
 * @element fsl-hook-log
 * @csspart log - The log container.
 */
export class FslHookLog extends LitElement {
    constructor() {
        super(...arguments);
        this._log = [];
        this._unbind = null;
    }
    connectedCallback() {
        super.connectedCallback();
        const host = closest_wc(this, 'instance');
        if (host === null) {
            return;
        }
        const offs = LOGGED_EVENTS.map(name => {
            const handler = () => { this._log = [...this._log.slice(-(MAX_ENTRIES - 1)), name]; };
            host.addEventListener(`fsl-${name}`, handler);
            return () => { host.removeEventListener(`fsl-${name}`, handler); };
        });
        this._unbind = () => { for (const off of offs) {
            off();
        } };
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._unbind !== null) {
            this._unbind();
            this._unbind = null;
        }
    }
    render() {
        return html `
      <div class="log" part="log">
        ${this._log.length === 0
            ? html `<span class="empty">no events</span>`
            : this._log.map(name => html `<div class="entry">${name}</div>`)}
      </div>`;
    }
}
FslHookLog.styles = css `
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
__decorate([
    state()
], FslHookLog.prototype, "_log", void 0);
