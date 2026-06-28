import { LitElement, TemplateResult, PropertyValues } from 'lit';
import type { Machine } from '../jssm.js';
/**
 * Structural shape used to detect a parent `<fsl-instance>` (or `<jssm-instance>`) host without
 * creating a hard import cycle from the viz module into the instance module.
 *
 * `<fsl-instance>` exposes its underlying machine via a `machine` getter
 * that returns the raw {@link Machine} instance.  Treating that shape as a
 * duck-typed interface here keeps the viz file standalone-compilable and
 * lets tests stub a host without instantiating the real element.
 */
export interface JssmInstanceHost extends HTMLElement {
    readonly machine: Machine<unknown>;
}
/**
 * Shape of the `viz-error` `CustomEvent.detail` payload.  `message` is
 * always a string; `location` is whatever the renderer attached to the
 * thrown error (typically a parser-supplied source position), or
 * `undefined` if no such field was present.
 */
export interface JssmVizErrorDetail {
    message: string;
    location?: unknown;
}
/**
 * Normalize an arbitrary thrown value into a {@link JssmVizErrorDetail}.
 * Accepts anything (Error instances, JssmErrors with `.location`, plain
 * strings, etc.) and always produces a string `message`.
 *
 * ```typescript
 * normalize_viz_error(new Error('boom'));
 * // => { message: 'boom', location: undefined }
 *
 * normalize_viz_error({ message: 'parse failed', location: { line: 1 } });
 * // => { message: 'parse failed', location: { line: 1 } }
 *
 * normalize_viz_error('bare string failure');
 * // => { message: 'bare string failure', location: undefined }
 * ```
 *
 * @param e The thrown value to normalize.
 * @returns A `{ message, location }` object suitable for use as the
 * `detail` of a `viz-error` `CustomEvent`.
 */
export declare function normalize_viz_error(e: unknown): JssmVizErrorDetail;
/**
 * Web component that renders a jssm machine as inline SVG.
 *
 * Two operating modes:
 *
 *   1. **Standalone** (no parent `<fsl-instance>` ancestor): render from
 *      the element's own `fsl=""` attribute / property.  Re-renders on
 *      attribute change.
 *   2. **Nested** (inside a `<fsl-instance>` or `<jssm-instance>` ancestor,
 *      found via `closest_wc(this, 'instance')` at `connectedCallback`):
 *      bind to the parent's machine and re-render on every `transition`
 *      event.  The element's own `fsl` attribute is ignored in this mode;
 *      supplying it emits a `console.warn` for developer feedback.
 *
 * @element fsl-viz
 * @cssproperty [--jssm-viz-min-height=100px] - Minimum height of the rendered SVG container.
 * @fires {CustomEvent<{ message: string; location?: unknown }>} viz-error - Fires when the FSL source fails to parse or render.
 */
export declare class FslViz extends LitElement {
    static styles: import("lit").CSSResult;
    /** FSL source to render. */
    fsl: string;
    /** Optional Graphviz layout engine override (e.g. 'dot', 'neato'). */
    engine: string | undefined;
    private _svg;
    /**
     * Parent `<fsl-instance>` (or `<jssm-instance>`) host reference, set in
     * `connectedCallback` when a parent is found.  When non-null the viz is
     * in nested mode and renders the parent's machine instead of its own
     * `fsl` attribute.
     */
    private _parent_host;
    /**
     * Unsubscribe callback returned from `host.machine.on('transition', ...)`.
     * Held so `disconnectedCallback` can release the subscription.
     */
    private _parent_sub;
    /**
     * Detaches the host's `fsl-machine-rebuilt` listener (which re-subscribes the
     * viz to the host's new machine after a live rebuild, #1387). Captures the
     * exact host the listener was attached to, so teardown is correct even if
     * `_parent_host` was cleared or replaced. Null when standalone / before binding.
     */
    private _host_unbind;
    /**
     * Lit lifecycle hook. Triggers an async SVG render whenever `fsl` or
     * `engine` change — but only in standalone mode.  In nested mode the
     * `fsl` attribute is ignored; renders are driven by the parent machine's
     * transition events instead.
     *
     * @param changed - Map of changed reactive properties supplied by Lit.
     */
    protected willUpdate(changed: PropertyValues<this>): void;
    /**
     * Web Components lifecycle hook.  Walks up to find a parent
     * `<fsl-instance>` or `<jssm-instance>` ancestor via `closest_wc`; if
     * found, switches into nested mode and subscribes to the parent machine's
     * `transition` events.  Otherwise leaves standalone behavior intact.
     *
     * Subscription setup is deferred via `customElements.whenDefined` so the
     * parent has had a chance to upgrade and construct its machine before
     * we touch `host.machine`.
     */
    connectedCallback(): void;
    /**
     * Web Components lifecycle hook.  Releases any installed
     * parent-transition subscription and clears the host reference so a
     * subsequent re-attach goes through the full `connectedCallback` path
     * again.
     */
    disconnectedCallback(): void;
    /**
     * Nested-mode render path.  Renders the bound parent's machine via the
     * {@link machine_to_svg_string} pipeline and commits the result to
     * `_svg`.  On failure emits a `viz-error` `CustomEvent` and clears the
     * SVG.
     *
     * @returns A promise that resolves once the render attempt has finished.
     */
    private _rerenderFromHostMachine;
    /**
     * Render the current `fsl` source to an SVG string via the headless
     * `fsl_to_svg_string` pipeline. Updates `_svg` on success; emits a
     * `viz-error` `CustomEvent` on failure. Guards against stale results
     * when `fsl` changes mid-flight.
     *
     * @returns A promise that resolves once the render attempt has finished.
     */
    private _renderSvg;
    /**
     * Lit render method. Injects the most recent SVG string into the shadow
     * tree via the `unsafeHTML` directive.
     *
     * SVG content originates from `@viz-js/viz` (Graphviz WASM), which emits
     * sanitized SVG. `unsafeHTML` is required because Lit's template-literal
     * interpolation otherwise escapes the markup as text. The directive name
     * makes the trust boundary explicit at the call site.
     *
     * @returns A Lit `TemplateResult` wrapping the SVG in a `.container` div.
     */
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-viz': FslViz;
        'jssm-viz': FslViz;
    }
}
