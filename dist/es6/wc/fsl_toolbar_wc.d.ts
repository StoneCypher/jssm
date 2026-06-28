import { LitElement, type TemplateResult } from 'lit';
/**
 * `<fsl-toolbar>` — a control bar for a parent `<fsl-instance>`. A light/dark
 * theme toggle on the left; on the right, an icon toggle to show/hide each
 * panel present in the host (renderer, code, history, …) plus a View menu of
 * the layout set (its button shows the current layout's icon). Standalone (no
 * host) the panel toggles disappear. A trailing slot carries extra buttons.
 *
 * @element fsl-toolbar
 * @csspart toolbar - The bar container.
 * @slot - Trailing custom controls.
 */
export declare class FslToolbar extends LitElement {
    static styles: import("lit").CSSResult;
    private _openMenu;
    /** Active export destination; the next format click targets it. */
    private _dest;
    /**
     * The last directory an export was saved to this session (its final path
     * segment). When non-empty, the Export menu offers a `to <name>` destination.
     * The embedder sets this after fulfilling a `pick` export.
     */
    lastDirectory: string;
    private _host;
    /** Panels actually present in the host — one toggle each. */
    private _present;
    connectedCallback(): void;
    /** Set the theme mode (System/Light/Dark). The host applies the palette + drives
     *  the editor; the menu stays open so a theme can be picked in the same trip. */
    private _setMode;
    /** Select a named theme from the host's registry. The theme-name buttons only
     *  render when a host exists, so `_host` is non-null here. */
    private _setThemeName;
    private _setLayout;
    /** Set the active export destination; the menu stays open so a format can be
     *  chosen next. */
    private _setDest;
    /** Emit `fsl-export` with the chosen format's content + the active destination.
     *  The embedder performs the actual clipboard / file save. */
    private _export;
    private _toggleMenu;
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-toolbar': FslToolbar;
    }
}
