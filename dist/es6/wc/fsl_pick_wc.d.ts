import { LitElement } from 'lit';
import './fsl_viz_wc.define.js';
/**
 * Web component that implements the PICK Disambiguation visualizer.
 * Takes an array of candidate FSL strings, finds their differences, and
 * presents a UI to the user to narrow them down, or resolves them automatically
 * if a rubric is provided.
 *
 * @element fsl-pick
 */
export declare class FslPick extends LitElement {
    static styles: import("lit").CSSResult;
    candidates: string[];
    rubric: string;
    private _machines;
    private _currentDiff;
    private _isEvaluating;
    updated(changedProperties: Map<string, any>): void;
    private _recalculate;
    private _handleAccept;
    private _handleReject;
    render(): import("lit-html").TemplateResult<1>;
}
