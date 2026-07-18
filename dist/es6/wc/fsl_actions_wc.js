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
/** Host events that can change which actions / transitions are currently legal. */
const ACTION_EVENTS = ['fsl-transition', 'fsl-machine-rebuilt'];
/**
 * `<fsl-actions>` — interactive controls derived from a parent `<fsl-instance>`'s
 * machine. Renders a button for every currently-legal named **action** and, split
 * into three groups, every reachable transition target by edge kind: **main**
 * (`=>`) first, plain **transitions** (`->`) next, and **forced** (`~>`) last.
 * Legal targets fire with `transition`, forced-only ones with `force_transition`.
 * Re-derives on the host's transition / rebuild events; only firable controls
 * appear, and each group is omitted when empty, so a self-loop-only state shows
 * just its actions and a terminal state shows `no actions available`. Standalone
 * (no host ancestor) renders empty.
 * @element fsl-actions
 * @csspart actions - The container.
 * @example
 * // For `A 'x' -> B; A 'y' => C; A ~> D;` while in A:
 * //   Actions:      [ x ] [ y ]
 * //   Main:         [ → C ]
 * //   Transitions:  [ → B ]
 * //   Forced:       [ → D ]
 */
export class FslActions extends LitElement {
    constructor() {
        super(...arguments);
        this._actions = [];
        this._main = [];
        this._regular = [];
        this._forced = [];
        this._host = null;
        this._unbind = null;
    }
    connectedCallback() {
        super.connectedCallback();
        const host = closest_wc(this, 'instance');
        this._host = host;
        if (host === null) {
            return;
        }
        const sync = () => { this._derive(host); };
        for (const ev of ACTION_EVENTS) {
            host.addEventListener(ev, sync);
        }
        this._unbind = () => { for (const ev of ACTION_EVENTS) {
            host.removeEventListener(ev, sync);
        } };
        this._derive(host);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._unbind !== null) {
            this._unbind();
            this._unbind = null;
        }
    }
    /** Recompute the legal actions and the three transition groups from the host. */
    _derive(host) {
        const current = host.machine.state();
        this._actions = host.machine.list_exit_actions();
        const main = new Set(), regular = new Set(), forced = new Set();
        for (const e of host.machine.list_edges()) {
            if (e.from !== current || e.to === current) {
                continue;
            } // only non-self exits from here
            const to = e.to;
            if (e.main_path) {
                main.add(to);
            }
            else if (e.forced_only) {
                forced.add(to);
            }
            else {
                regular.add(to);
            }
        }
        this._main = [...main];
        this._regular = [...regular];
        this._forced = [...forced];
    }
    /** A transition group, or `''` when empty. Forced targets fire via force. */
    _group(host, label, targets, forced) {
        if (targets.length === 0) {
            return '';
        }
        return html `
      <div class="group">
        <div class="label">${label}</div>
        ${targets.map(to => html `
          <button class="trn" @click=${() => { if (forced) {
            host.force_transition(to);
        }
        else {
            host.transition(to);
        } }}>→ ${to}</button>
        `)}
      </div>
    `;
    }
    render() {
        const host = this._host;
        if (host === null) {
            return html `<div class="actions" part="actions"><span class="empty">no machine</span></div>`;
        }
        if (this._actions.length === 0 && this._main.length === 0
            && this._regular.length === 0 && this._forced.length === 0) {
            return html `<div class="actions" part="actions"><span class="empty">no actions available</span></div>`;
        }
        return html `
      <div class="actions" part="actions">
        ${this._actions.length === 0 ? '' : html `
          <div class="group">
            <div class="label">Actions</div>
            ${this._actions.map(a => html `
              <button class="act" @click=${() => host.do(a)}>${a}</button>
            `)}
          </div>
        `}
        ${this._group(host, 'Main', this._main, false)}
        ${this._group(host, 'Transitions', this._regular, false)}
        ${this._group(host, 'Forced', this._forced, true)}
      </div>
    `;
    }
}
FslActions.styles = css `
    :host { display: block; }
    /* Horizontal bar: groups flow left-to-right and wrap; within a group the
       label sits inline before its buttons. Suits the panel's home below the
       workbench rather than a tall side dock. */
    .actions {
      display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 0.4rem 1.1rem;
      padding: 0.55rem 0.65rem; background: var(--_fsl-surface);
      color: var(--_fsl-text); font: 0.8rem var(--_fsl-font);
    }
    .group { display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 0.3rem; }
    .label {
      font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--_fsl-muted); white-space: nowrap;
    }
    button {
      text-align: center; padding: 0.4rem 0.6rem; cursor: pointer; border-radius: 4px;
      border: 1px solid var(--_fsl-border); background: var(--_fsl-surface);
      color: var(--_fsl-text); font: 600 0.8rem var(--_fsl-font);
    }
    button:hover { background: color-mix(in srgb, var(--_fsl-text) 8%, var(--_fsl-surface)); }
    .empty { color: var(--_fsl-muted); font-style: italic; }
    ${fslTokens}
  `;
__decorate([
    state()
], FslActions.prototype, "_actions", void 0);
__decorate([
    state()
], FslActions.prototype, "_main", void 0);
__decorate([
    state()
], FslActions.prototype, "_regular", void 0);
__decorate([
    state()
], FslActions.prototype, "_forced", void 0);
