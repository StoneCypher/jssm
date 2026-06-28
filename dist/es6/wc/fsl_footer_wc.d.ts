import { LitElement, type TemplateResult } from 'lit';
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
export declare class FslFooter extends LitElement {
    static styles: import("lit").CSSResult;
    private _state;
    private _actions;
    private _terminal;
    private _complete;
    private _observer;
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-footer': FslFooter;
    }
}
