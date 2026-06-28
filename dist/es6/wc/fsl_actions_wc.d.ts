import { LitElement, type TemplateResult } from 'lit';
/**
 * `<fsl-actions>` — interactive controls derived from a parent `<fsl-instance>`'s
 * machine. Renders a button for every currently-legal named **action** and, split
 * into three groups, every reachable transition target by edge kind: **main**
 * (`=>`) first, plain **transitions** (`->`) next, and **forced** (`~>`) last.
 * Legal targets fire with `transition`, forced-only ones with `force_transition`.
 * Re-derives on the host's transition / rebuild events; only firable controls
 * appear, and each group is omitted when empty, so a self-loop-only state shows
 * just its actions and a terminal state shows `no actions available`. Standalone
 * (no host ancestor) renders empty.
 *
 * @element fsl-actions
 * @csspart actions - The container.
 *
 * @example
 * // For `A 'x' -> B; A 'y' => C; A ~> D;` while in A:
 * //   Actions:      [ x ] [ y ]
 * //   Main:         [ → C ]
 * //   Transitions:  [ → B ]
 * //   Forced:       [ → D ]
 */
export declare class FslActions extends LitElement {
    static styles: import("lit").CSSResult;
    private _actions;
    private _main;
    private _regular;
    private _forced;
    private _host;
    private _unbind;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Recompute the legal actions and the three transition groups from the host. */
    private _derive;
    /** A transition group, or `''` when empty. Forced targets fire via force. */
    private _group;
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-actions': FslActions;
    }
}
