import { LitElement, type TemplateResult } from 'lit';
/** `load-example` detail: the FSL a tutorial fence wants loaded into an editor. */
export interface FslDocsLoadExampleDetail {
    fsl: string;
}
/**
 * `<fsl-docs>` — the language-docs content engine: drill-in nav over the bundled
 * curriculum (Getting Started / About State Machines / Tutorials / Example
 * Machines / Index / Search), a markdown page renderer, and "load into editor"
 * for tagged FSL examples. Content-only; slot it into `<fsl-help>`.
 *
 * @element fsl-docs
 * @fires {CustomEvent<FslDocsLoadExampleDetail>} load-example - When a fence's "Load into editor" is clicked.
 */
export declare class FslDocs extends LitElement {
    static styles: import("lit").CSSResult;
    /** Color theme; reflected so it drives the `--fsl-*` token defaults. */
    theme: 'light' | 'dark';
    private _view;
    private _section;
    private _pageId;
    private _query;
    private _pagesIn;
    /** Display label for a section id (falls back to the id for unknown sections). */
    private _sectionLabel;
    private _go;
    private _loadExample;
    private _renderSections;
    private _renderPages;
    private _renderPage;
    /** Append a "Load into editor" button to every runnable fsl fence. */
    private _withButtons;
    render(): TemplateResult;
    private _renderIndex;
    private _renderSearch;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-docs': FslDocs;
    }
}
