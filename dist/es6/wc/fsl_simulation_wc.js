var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fslTokens } from './fsl_tokens.js';
import { closest_wc } from './wc_tag_helpers.js';
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
    constructor() {
        super(...arguments);
        /** Auto-step period in milliseconds. */
        this.interval = 600;
        this._running = false;
        this._steps = 0;
        this._host = null;
        this._timer = null;
        this._step = () => {
            if (this._host === null) {
                return;
            }
            const actions = this._host.machine.list_exit_actions();
            if (actions.length === 0) {
                this._stop();
                return;
            } // terminal — nothing to do
            this._host.do(actions[Math.floor(Math.random() * actions.length)]);
            this._steps += 1;
        };
        this._toggle = () => { if (this._running) {
            this._stop();
        }
        else {
            this._start();
        } };
    }
    connectedCallback() {
        super.connectedCallback();
        this._host = closest_wc(this, 'instance');
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this._stop();
    }
    _start() {
        if (this._host === null) {
            return;
        }
        this._running = true;
        this._timer = setInterval(this._step, this.interval);
    }
    _stop() {
        this._running = false;
        if (this._timer !== null) {
            clearInterval(this._timer);
            this._timer = null;
        }
    }
    render() {
        return html `
      <div class="sim" part="sim">
        <button class="btn" @click=${this._step}>Step</button>
        <button class="btn" @click=${this._toggle}>${this._running ? 'Pause' : 'Play'}</button>
        <span class="count ${this._host === null ? 'idle' : ''}">${this._steps} step${this._steps === 1 ? '' : 's'}</span>
      </div>
    `;
    }
}
FslSimulation.styles = css `
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
__decorate([
    property({ type: Number })
], FslSimulation.prototype, "interval", void 0);
__decorate([
    state()
], FslSimulation.prototype, "_running", void 0);
__decorate([
    state()
], FslSimulation.prototype, "_steps", void 0);
