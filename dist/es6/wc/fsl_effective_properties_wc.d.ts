import { LitElement, TemplateResult } from 'lit';
import type { Machine } from '../jssm.js';
/**
 * Structural shape used to detect a parent `<fsl-instance>` (or the deprecated
 * `<jssm-instance>`) host without importing the instance module.
 */
export interface JssmInstanceHost extends HTMLElement {
    readonly machine: Machine<unknown>;
}
/**
 * Read-only panel that displays the parent machine's **resolved FSL
 * properties** for the current state — the values produced by the full
 * override chain (machine `property … default …` → per-state
 * `state X: { property … }`), as returned by `machine.props()`. Refreshes on
 * every transition, so consumers can watch a property's effective value change
 * as the machine moves between states.
 *
 * Binds to the host via {@link closest_wc} (matching both `fsl-instance` and
 * the deprecated `jssm-instance`). Display-only; never drives the machine.
 *
 * v1 shows the FSL `property` bag (`machine.props()`). The render-time visual
 * style resolution (shape/color used by `<fsl-viz>`) is a separate viz-pipeline
 * concern and is not surfaced here.
 * @element fsl-effective-properties
 * @cssproperty [--fsl-effective-properties-gap=0.25rem] - Gap between rows.
 */
export declare class FslEffectiveProperties extends LitElement {
    static styles: import("lit").CSSResult;
    /** Parent host reference; cleared on disconnect. */
    private _host;
    /** Unsubscribe callback from the host machine's `transition` subscription. */
    private _sub;
    /**
     * Resolved property entries (`[name, stringified value]`) for the current
     * state, or `null` before the panel has bound to a host machine.
     */
    private _entries;
    /**
     * Web Components lifecycle hook. Binds to the parent host once
     * `<fsl-instance>` has upgraded, then paints the initial property snapshot
     * and refreshes on each transition. With no host, leaves `_entries` null so
     * {@link render} shows the placeholder.
     */
    connectedCallback(): void;
    /**
     * Web Components lifecycle hook. Releases the subscription and clears the
     * host reference, retaining the last-painted snapshot so a detached panel
     * keeps showing its final values.
     */
    disconnectedCallback(): void;
    /**
     * Read the resolved property bag (`machine.props()`) into reactive entries,
     * triggering a re-render.
     * @param host - The bound parent host whose machine to snapshot.
     */
    private _refresh;
    /**
     * Lit render method. Placeholder until bound; an empty-state message when the
     * machine declares no properties; otherwise a name → value grid.
     * @returns A Lit `TemplateResult` for the panel.
     */
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-effective-properties': FslEffectiveProperties;
    }
}
