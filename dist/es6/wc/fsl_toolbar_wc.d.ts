import { LitElement, type TemplateResult } from 'lit';
import { permalink_for, fsl_from_permalink } from './fsl_permalink.js';
export { permalink_for, fsl_from_permalink };
/**
 * A paste-able HTML snippet that renders the given FSL from the CDN builds: an
 * `<fsl-instance>` reading its source from a `<script type="text/fsl">` child,
 * with a slotted `<fsl-viz>` for the graph.
 *
 * @example
 * embed_snippet_for("a -> b;"); // "<script …instance.js …><fsl-instance>…</fsl-instance>"
 */
export declare function embed_snippet_for(fsl: string): string;
/**
 * `<fsl-toolbar>` — a control bar for a parent `<fsl-instance>`. Validate + Lint
 * action buttons (fired as `fsl-validate` / `fsl-lint` events for the embedder
 * to fulfill, each suppressible via `no-validate` / `no-lint`); an icon toggle
 * to show/hide each panel present in the host (renderer, code, history, …); and
 * Layout / Export / Theme pulldowns (the Layout button shows the current
 * layout's icon). Standalone (no host) the host-dependent controls disappear.
 * A trailing slot carries extra buttons.
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
    /** Hide the Validate button (e.g. when the consumer validates inline). */
    noValidate: boolean;
    /** Hide the Lint button. */
    noLint: boolean;
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
    /** Fire a workspace-action intent (validate / lint) for the consumer to
     *  fulfill — the toolbar presents the action; the embedder runs it. The
     *  current machine source rides along in the detail as a convenience. The
     *  buttons only render with a host, so `_host` is non-null here. */
    private _fireAction;
    private _toggleMenu;
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-toolbar': FslToolbar;
    }
}
