import { LitElement, type TemplateResult } from 'lit';
/**
 * `<fsl-history>` — the visited-state timeline for a parent `<fsl-instance>`.
 *
 * Listens to the host's `fsl-transition` DOM events (re-emitted once per
 * transition, #639) and records the host's reflected `current-state`, so it
 * captures every transition and survives a live machine rebuild without a
 * machine subscription. Standalone (no host ancestor) renders empty.
 *
 * @element fsl-history
 * @csspart timeline - The timeline container.
 */
export declare class FslHistory extends LitElement {
    static styles: import("lit").CSSResult;
    private _history;
    private _unbind;
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-history': FslHistory;
    }
}
