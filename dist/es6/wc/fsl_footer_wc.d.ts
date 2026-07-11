import { LitElement, type TemplateResult } from 'lit';
/**
 * `<fsl-footer>` — a status bar for a parent `<fsl-instance>`.
 *
 * Shows the current state with both **local** counts (actions firable from
 * here + transitions out of here) and **global** machine counts: distinct
 * action *names*, **action-starts** (action-bearing edges — each place an
 * action fires from), and total transitions. Plus terminal/complete badges.
 *
 * Local counts track transitions by observing the host's reflected
 * `current-state` / `legal-actions` attributes; the global counts refresh on
 * `fsl-machine-rebuilt`, so the footer survives a live rebuild (#1387). A
 * default slot carries embedder status. Standalone (no `<fsl-instance>`
 * ancestor) it renders just the slot.
 * @element fsl-footer
 * @csspart bar - The footer bar container.
 * @slot - Trailing custom status, right-aligned.
 */
export declare class FslFooter extends LitElement {
    static styles: import("lit").CSSResult;
    private _state;
    private _actions;
    private _transitions;
    private _terminal;
    private _complete;
    private _gActions;
    private _gStarts;
    private _gTransitions;
    private _observer;
    private _host;
    private readonly _onRebuilt;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /**
     * Recompute the machine-derived counts: local transitions out of the current
     *  state, and the global action / action-start / transition totals. Only
     *  called while a host is attached, so `_host` is non-null here.
     */
    private _syncMachine;
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-footer': FslFooter;
    }
}
