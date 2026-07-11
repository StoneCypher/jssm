import { LitElement, TemplateResult } from 'lit';
import type { Machine } from '../jssm.js';
/**
 * Structural shape used to detect a parent `<fsl-instance>` (or, while the
 * deprecated alias survives, `<jssm-instance>`) host without importing the
 * instance module — same duck-typed approach `<fsl-viz>` uses.
 */
export interface JssmInstanceHost extends HTMLElement {
    readonly machine: Machine<unknown>;
}
/**
 * The most recent transition observed on the host machine, captured from the
 * `transition` event detail.  `null` until the first transition fires.
 */
export interface LastTransition {
    from: string;
    to: string;
    action: string;
}
/**
 * Read-only state-inspector web component for a parent `<fsl-instance>`.
 *
 * Slotted into the host's `info-panel` slot (or nested anywhere inside it), it
 * displays the machine's current state, the most recent transition
 * (`from → to via action`), the currently-legal exit actions, and the
 * terminal / complete flags. Every field refreshes on each `transition`
 * event.
 *
 * Display-only: it never drives the machine. It binds by walking up to the
 * host via {@link closest_wc} (which matches both the canonical `fsl-instance`
 * and the deprecated `jssm-instance` host tags), so it works under either.
 * @element fsl-info-panel
 * @cssproperty [--fsl-info-panel-gap=0.25rem] - Vertical gap between rows.
 */
export declare class FslInfoPanel extends LitElement {
    static styles: import("lit").CSSResult;
    /**
     * Parent host reference, set in `connectedCallback` when one is found.
     * Cleared on disconnect so a stale deferred subscription cannot fire.
     */
    private _host;
    /** Unsubscribe callback from the host machine's `transition` subscription. */
    private _sub;
    /** Current state name; `null` until the panel has bound to a host machine. */
    private _current;
    /** Space-separated legal exit actions for the current state. */
    private _actions;
    /** Whether the current state has no exits. */
    private _terminal;
    /** Whether the current state is a `complete` state. */
    private _complete;
    /** Most recent transition, or `null` before the first one. */
    private _last;
    /**
     * Web Components lifecycle hook. Finds the parent host via {@link closest_wc}
     * and, once `<fsl-instance>` has upgraded, subscribes to its machine's
     * `transition` events and paints the initial snapshot. With no host, it
     * leaves `_current` null so {@link render} shows the placeholder.
     */
    connectedCallback(): void;
    /**
     * Web Components lifecycle hook. Releases the machine subscription and clears
     * the host reference. The last-painted snapshot is intentionally retained so
     * a detached panel keeps showing its final state rather than blanking.
     */
    disconnectedCallback(): void;
    /**
     * Read the current machine snapshot into the reactive fields, triggering a
     * re-render. Called once on bind and again on every transition. The bound
     * host is passed in by the caller (which already holds a non-null reference),
     * so no re-null-check is needed here.
     * @param host - The bound parent host whose machine to snapshot.
     */
    private _refresh;
    /**
     * Lit render method. Shows a placeholder until the panel has bound to a host
     * machine; thereafter a labeled grid of the live snapshot.
     * @returns A Lit `TemplateResult` for the panel.
     */
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-info-panel': FslInfoPanel;
    }
}
