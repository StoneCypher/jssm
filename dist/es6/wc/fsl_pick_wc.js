var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { sm } from '../jssm.js';
import { find_differentiating_trace } from '../jssm_pick.js';
import { evaluate_trace } from '../oracle/nli_oracle.js';
import './fsl_viz_wc.define.js';
/**
 * Web component that implements the PICK Disambiguation visualizer.
 * Takes an array of candidate FSL strings, finds their differences, and
 * presents a UI to the user to narrow them down, or resolves them automatically
 * if a rubric is provided.
 *
 * @element fsl-pick
 */
export class FslPick extends LitElement {
    constructor() {
        super(...arguments);
        this.candidates = [];
        this.rubric = '';
        this._machines = [];
        this._currentDiff = null;
        this._isEvaluating = false;
    }
    updated(changedProperties) {
        if (changedProperties.has('candidates') || changedProperties.has('rubric')) {
            this._machines = this.candidates.map(c => sm `${c}`);
            this._recalculate();
        }
    }
    async _recalculate() {
        if (this._machines.length > 1) {
            this._currentDiff = find_differentiating_trace(this._machines);
            // Auto-evaluate if rubric is present
            if (this.rubric && this._currentDiff) {
                this._isEvaluating = true;
                try {
                    // Delay briefly to allow UI to render 'Evaluating...'
                    await new Promise(r => setTimeout(r, 50));
                    const isTraceValid = await evaluate_trace(this._currentDiff.trace, this.rubric);
                    if (isTraceValid) {
                        this._handleAccept();
                    }
                    else {
                        this._handleReject();
                    }
                }
                catch (e) {
                    console.error("Builtin Oracle failed in the browser:", e);
                }
                finally {
                    this._isEvaluating = false;
                }
            }
        }
        else {
            this._currentDiff = null;
        }
    }
    _handleAccept() {
        if (!this._currentDiff)
            return;
        this._machines.splice(this._currentDiff.machine_b_index, 1);
        this._recalculate();
    }
    _handleReject() {
        if (!this._currentDiff)
            return;
        this._machines.splice(this._currentDiff.machine_a_index, 1);
        this._recalculate();
    }
    render() {
        if (this._machines.length === 0) {
            return html `<div>No candidates provided.</div>`;
        }
        if (this._machines.length === 1) {
            return html `
        <div class="winner">
          <h2>Disambiguation Complete!</h2>
          <p>Winning Machine:</p>
          <fsl-viz .fsl=${this._machines[0].list_edges().length > 0 ? "TODO: map to fsl string" : "..."}></fsl-viz>
        </div>
      `;
        }
        if (!this._currentDiff) {
            return html `<div>No behavioral differences found among the ${this._machines.length} remaining candidates.</div>`;
        }
        const traceStr = this._currentDiff.trace.join(" ➔ ");
        return html `
      <div>
        <h3>Candidate Disambiguation</h3>
        <p>Remaining Candidates: ${this._machines.length}</p>
        
        <div class="trace-box">
          <p>Trace under consideration:</p>
          <div class="trace-path">${traceStr}</div>
          
          ${this._isEvaluating ? html `<div class="evaluating">🤖 Auto-evaluating via Built-in NLI Oracle...</div>` : ''}
          
          ${(!this.rubric && !this._isEvaluating) ? html `
          <div class="controls">
            <button class="btn-yes" @click=${this._handleAccept}>Yes, this is valid</button>
            <button class="btn-no" @click=${this._handleReject}>No, this should be blocked</button>
          </div>
          ` : ''}
        </div>

        <div class="split-screen">
          <div class="candidate">
            <h4>Candidate A (Accepts Trace)</h4>
            <fsl-viz></fsl-viz> 
          </div>
          <div class="candidate">
            <h4>Candidate B (Rejects Trace)</h4>
            <fsl-viz></fsl-viz>
          </div>
        </div>
      </div>
    `;
    }
}
FslPick.styles = css `
    :host {
      display: block;
      font-family: sans-serif;
      border: 1px solid #ccc;
      padding: 16px;
      border-radius: 8px;
    }
    .split-screen {
      display: flex;
      gap: 16px;
      margin-top: 16px;
    }
    .candidate {
      flex: 1;
      border: 1px solid #eee;
      padding: 8px;
      border-radius: 4px;
    }
    .trace-box {
      background: #f9f9f9;
      padding: 16px;
      border-left: 4px solid #007acc;
      margin: 16px 0;
    }
    .trace-path {
      font-family: monospace;
      font-size: 1.2em;
      font-weight: bold;
    }
    .controls {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }
    button {
      padding: 8px 16px;
      cursor: pointer;
      font-size: 1em;
    }
    .btn-yes { background: #4caf50; color: white; border: none; }
    .btn-no { background: #f44336; color: white; border: none; }
    .winner {
      text-align: center;
      padding: 32px;
      background: #e8f5e9;
      border-radius: 8px;
    }
    .evaluating {
      color: #666;
      font-style: italic;
    }
  `;
__decorate([
    property({ type: Array })
], FslPick.prototype, "candidates", void 0);
__decorate([
    property({ type: String })
], FslPick.prototype, "rubric", void 0);
__decorate([
    state()
], FslPick.prototype, "_machines", void 0);
__decorate([
    state()
], FslPick.prototype, "_currentDiff", void 0);
__decorate([
    state()
], FslPick.prototype, "_isEvaluating", void 0);
