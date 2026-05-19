import { LitElement, TemplateResult, PropertyValues } from 'lit';
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
 * @element jssm-viz
 * @cssproperty [--jssm-viz-min-height=100px] - Minimum height of the rendered SVG container.
 * @fires {CustomEvent<{ message: string; location?: unknown }>} viz-error - Fires when the FSL source fails to parse or render.
 */
export declare class JssmViz extends LitElement {
    static styles: import("lit").CSSResult;
    /** FSL source to render. */
    fsl: string;
    /** Optional Graphviz layout engine override (e.g. 'dot', 'neato'). */
    engine: string | undefined;
    private _svg;
    /**
     * Lit lifecycle hook. Triggers an async SVG render whenever `fsl` or
     * `engine` change.
     *
     * @param changed - Map of changed reactive properties supplied by Lit.
     */
    protected willUpdate(changed: PropertyValues<this>): void;
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
        'jssm-viz': JssmViz;
    }
}
