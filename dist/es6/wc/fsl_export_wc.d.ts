import { LitElement, type TemplateResult } from 'lit';
/** Supported export formats. */
export declare type FslExportFormat = 'dot' | 'json' | 'fsl';
/**
 * `<fsl-export>` — export buttons for a parent `<fsl-instance>`. Each produces a
 * string from the host's machine and fires `fsl-export` with `{ format,
 * content }`; the embedder decides what to do with it (copy, download, show).
 * Formats: Graphviz `dot` (via `machine_to_dot`), `json` (the machine's
 * `serialize()`), and `fsl` (the source). Standalone is inert.
 *
 * @element fsl-export
 * @csspart export - The button row.
 * @fires {CustomEvent<{format: FslExportFormat, content: string}>} fsl-export
 */
export declare class FslExport extends LitElement {
    static styles: import("lit").CSSResult;
    private _host;
    connectedCallback(): void;
    private _emit;
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-export': FslExport;
    }
}
