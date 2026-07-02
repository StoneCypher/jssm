import { LitElement, type TemplateResult } from 'lit';
/**
 * `<fsl-hook-log>` — a running log of a parent `<fsl-instance>`'s machine
 * events, listening to the host's re-emitted `fsl-*` DOM events (#639). Keeps
 * the most recent {@link MAX_ENTRIES}. Standalone (no host ancestor) is empty.
 *
 * @element fsl-hook-log
 * @csspart log - The log container.
 */
export declare class FslHookLog extends LitElement {
    static styles: import("lit").CSSResult;
    private _log;
    private _unbind;
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-hook-log': FslHookLog;
    }
}
