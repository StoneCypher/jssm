import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { sm } from '../jssm.js';
import { find_differentiating_trace, PickResult } from '../jssm_pick.js';
import type { Machine } from '../jssm.js';
import './fsl_viz_wc.define.js';

/**
 * Web component that implements the PICK Disambiguation visualizer.
 * Takes an array of candidate FSL strings, finds their differences, and
 * presents a UI to the user to narrow them down.
 * 
 * @element fsl-pick
 */
export class FslPick extends LitElement {
  static styles = css`
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
  `;

  @property({ type: Array })
  candidates: string[] = [];

  @state()
  private _machines: Machine<unknown>[] = [];

  @state()
  private _currentDiff: PickResult | null = null;

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('candidates')) {
      this._machines = this.candidates.map(c => sm(c));
      this._recalculate();
    }
  }

  private _recalculate() {
    if (this._machines.length > 1) {
      this._currentDiff = find_differentiating_trace(this._machines);
    } else {
      this._currentDiff = null;
    }
  }

  private _handleAccept() {
    if (!this._currentDiff) return;
    // The trace is valid. Machine A accepts it, Machine B rejects it.
    // Drop Machine B.
    this._machines.splice(this._currentDiff.machine_b_index, 1);
    this._recalculate();
  }

  private _handleReject() {
    if (!this._currentDiff) return;
    // The trace is invalid. Machine A accepted it (wrong), Machine B rejected it (correct).
    // Drop Machine A.
    this._machines.splice(this._currentDiff.machine_a_index, 1);
    this._recalculate();
  }

  render() {
    if (this._machines.length === 0) {
      return html`<div>No candidates provided.</div>`;
    }

    if (this._machines.length === 1) {
      return html`
        <div class="winner">
          <h2>Disambiguation Complete!</h2>
          <p>Winning Machine:</p>
          <fsl-viz .fsl=${this._machines[0].list_edges().length > 0 ? "TODO: serialize machine back to fsl if possible or just use original string" : "..."}></fsl-viz>
        </div>
      `;
    }

    if (!this._currentDiff) {
      return html`<div>No behavioral differences found among the ${this._machines.length} remaining candidates.</div>`;
    }

    const mA = this._machines[this._currentDiff.machine_a_index];
    const mB = this._machines[this._currentDiff.machine_b_index];
    const traceStr = this._currentDiff.trace.join(" ➔ ");

    // For MVP without the Graph Highlighter, we just display the text trace
    return html`
      <div>
        <h3>Candidate Disambiguation</h3>
        <p>Remaining Candidates: ${this._machines.length}</p>
        
        <div class="trace-box">
          <p>Is this sequence of actions valid according to your spec?</p>
          <div class="trace-path">${traceStr}</div>
          <div class="controls">
            <button class="btn-yes" @click=${this._handleAccept}>Yes, this is valid</button>
            <button class="btn-no" @click=${this._handleReject}>No, this should be blocked</button>
          </div>
        </div>

        <div class="split-screen">
          <div class="candidate">
            <h4>Candidate A (Accepts Trace)</h4>
            <fsl-viz></fsl-viz> 
            <!-- Note: <fsl-viz> requires an fsl string. For full implementation, we need to map the Machine back to its source string or just store the source strings array in sync. -->
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
