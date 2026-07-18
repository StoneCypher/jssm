import { LitElement, type TemplateResult } from 'lit';
/**
 * `<fsl-help>` — a documentation drawer shell: a titled, scrollable panel with
 * a close button and a default slot for content (typically foldable
 * `<details>` sections). Presentational and self-contained — it owns no machine
 * binding. The reflected `open` attribute drives visibility, so embedders can
 * animate it (e.g. a width transition on the host) purely from CSS.
 * @element fsl-help
 * @csspart drawer - The drawer container.
 * @csspart head - The header bar.
 * @csspart body - The scrollable content area.
 * @csspart close - The close button.
 * @slot - The documentation content.
 * @fires {CustomEvent<void>} close - When the close button is pressed.
 */
export declare class FslHelp extends LitElement {
    static styles: import("lit").CSSResult;
    /** Whether the drawer is shown. Reflected so embedders can animate off it. */
    open: boolean;
    /** Heading shown in the drawer's header. */
    heading: string;
    /** Close the drawer and emit `close`. */
    private _onClose;
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-help': FslHelp;
    }
}
