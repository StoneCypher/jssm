import { css, LitElement, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { machine_to_svg_string, fsl_to_svg_string } from 'jssm/viz';

/**
 * Shared helpers for the dual-prefix (`fsl-` canonical, `jssm-` synonym)
 * web-component naming convention.  Centralizes the "match either prefix"
 * rule so it lives in exactly one place.
 */
/**
 * Returns true when `tag_name` is exactly `fsl-<suffix>` or `jssm-<suffix>`
 * (case-insensitive).
 *
 * @param tag_name - The element tag name to test (e.g. `"FSL-VIZ"`, `"jssm-viz"`).
 * @param suffix   - The suffix to match after the prefix (e.g. `"viz"`).
 * @returns `true` when `tag_name` is `fsl-<suffix>` or `jssm-<suffix>`.
 *
 * @example
 * wc_suffix_matches('FSL-VIZ', 'viz');   // true
 * wc_suffix_matches('jssm-viz', 'viz');  // true
 * wc_suffix_matches('div', 'viz');       // false
 * wc_suffix_matches('fsl-vizard', 'viz'); // false — suffix must match exactly
 */
/**
 * Returns the nearest ancestor of `el` (or `el` itself) whose tag is
 * `fsl-<suffix>` or `jssm-<suffix>`, or `null` if none exists.
 *
 * @param el     - The element to start the search from.
 * @param suffix - The suffix to match (e.g. `"instance"`).
 * @returns The closest matching ancestor element, or `null`.
 *
 * @example
 * // <fsl-instance><div id="k"></div></fsl-instance>
 * closest_wc(document.getElementById('k'), 'instance'); // <fsl-instance>
 *
 * @see wc_suffix_matches
 */
function closest_wc(el, suffix) {
    return el.closest(`fsl-${suffix}, jssm-${suffix}`);
}

/**
 * Reorder a graphviz-rendered SVG's paint stack so action labels can't be
 * painted over by edges. Graphviz interleaves nodes and edges and keeps each
 * edge's label `<text>` inside the edge group, so a later edge can draw over an
 * earlier edge's label. This lifts the layers into a clean back-to-front order:
 *
 *   background → edges → nodes → action (edge) labels
 *
 * Each edge's label text is hoisted out of its edge group to the very top.
 * Markup that isn't graphviz output (no `g.graph`) is returned untouched.
 *
 * @param svg - SVG markup from the viz pipeline (`machine_to_svg_string`, etc.).
 * @returns The reordered SVG markup; identical input for non-graphviz SVG.
 *
 * @example
 * // <g class="graph"><polygon/>…<g class="node"/><g class="edge"><path/><text/></g></g>
 * // becomes: <g class="graph"><polygon/><g class="edge"><path/></g><g class="node"/><text/></g>
 */
function reorder_svg_layers(svg) {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const graph = doc.querySelector('g.graph');
    if (graph === null) {
        return svg;
    }
    const background = graph.querySelector(':scope > polygon');
    const edges = [...graph.querySelectorAll(':scope > g.edge')];
    const nodes = [...graph.querySelectorAll(':scope > g.node')];
    // Hoist every edge's label out of its group so it lands on the top layer.
    const labels = [];
    for (const edge of edges) {
        for (const text of [...edge.querySelectorAll(':scope > text')]) {
            labels.push(text);
        }
    }
    // appendChild moves a node to the end (top of the stack), so appending in
    // back-to-front order yields: background, edges, nodes, labels.
    if (background !== null) {
        graph.appendChild(background);
    }
    for (const edge of edges) {
        graph.appendChild(edge);
    }
    for (const node of nodes) {
        graph.appendChild(node);
    }
    for (const label of labels) {
        graph.appendChild(label);
    }
    return new XMLSerializer().serializeToString(doc);
}

var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
function normalize_viz_error(e) {
    if (typeof e === 'object' && e !== null) {
        const rec = e;
        const raw_message = rec.message;
        const message = (typeof raw_message === 'string' && raw_message.length > 0)
            ? raw_message
            : String(e);
        return { message, location: rec.location };
    }
    return { message: String(e), location: undefined };
}
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
class FslViz extends LitElement {
    constructor() {
        super(...arguments);
        /** FSL source to render. */
        this.fsl = '';
        /** Optional Graphviz layout engine override (e.g. 'dot', 'neato'). */
        this.engine = undefined;
        this._svg = '';
        /**
         * Parent `<fsl-instance>` (or `<jssm-instance>`) host reference, set in
         * `connectedCallback` when a parent is found.  When non-null the viz is
         * in nested mode and renders the parent's machine instead of its own
         * `fsl` attribute.
         */
        this._parent_host = null;
        /**
         * Unsubscribe callback returned from `host.machine.on('transition', ...)`.
         * Held so `disconnectedCallback` can release the subscription.
         */
        this._parent_sub = null;
        /**
         * Detaches the host's `fsl-machine-rebuilt` listener (which re-subscribes the
         * viz to the host's new machine after a live rebuild, #1387). Captures the
         * exact host the listener was attached to, so teardown is correct even if
         * `_parent_host` was cleared or replaced. Null when standalone / before binding.
         */
        this._host_unbind = null;
    }
    /**
     * Lit lifecycle hook. Triggers an async SVG render whenever `fsl` or
     * `engine` change — but only in standalone mode.  In nested mode the
     * `fsl` attribute is ignored; renders are driven by the parent machine's
     * transition events instead.
     *
     * @param changed - Map of changed reactive properties supplied by Lit.
     */
    willUpdate(changed) {
        if (this._parent_host !== null) {
            // Nested mode: ignore `fsl` attr changes; renders come from the
            // parent's transition events.  `engine` changes still re-render
            // because they apply to whichever source is in use.
            if (changed.has('engine')) {
                this._rerenderFromHostMachine();
            }
            return;
        }
        if (changed.has('fsl') || changed.has('engine')) {
            this._renderSvg();
        }
    }
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
    connectedCallback() {
        super.connectedCallback();
        const host = closest_wc(this, 'instance');
        if (host === null) {
            return; // standalone: existing behavior, willUpdate handles render
        }
        // Conflicting-configuration feedback: nested viz with its own `fsl`
        // attribute is almost certainly a bug.  Warn but proceed — the parent
        // owns the machine.
        if (typeof this.fsl === 'string' && this.fsl.trim().length > 0) {
            // eslint-disable-next-line no-console
            console.warn('<fsl-viz>: `fsl` ignored when nested inside <fsl-instance>; parent owns the machine');
        }
        this._parent_host = host;
        // Defer to whenDefined so a not-yet-upgraded host has its machine
        // available before we access `host.machine` (which throws when called
        // pre-connection).
        void customElements.whenDefined('fsl-instance').then(() => {
            // Re-check the host is still attached and the viz still belongs to
            // it — disconnection between the deferred resolution and now is
            // legal and should not error.
            if (this._parent_host !== host) {
                return;
            }
            let sub;
            try {
                sub = host.machine.on('transition', () => { this._rerenderFromHostMachine(); });
            }
            catch (e) {
                // The parent existed but its machine wasn't ready / threw.  Emit
                // a viz-error so the consumer learns about it instead of silently
                // showing nothing.
                this.dispatchEvent(new CustomEvent('viz-error', {
                    detail: normalize_viz_error(e),
                    bubbles: true,
                    composed: true,
                }));
                return;
            }
            this._parent_sub = sub;
            // Re-subscribe + re-render when the host swaps its machine (#1387 live
            // rebuild): the old subscription is on a dead machine object.
            const on_rebuild = () => {
                sub();
                sub = host.machine.on('transition', () => { this._rerenderFromHostMachine(); });
                this._parent_sub = sub;
                this._rerenderFromHostMachine();
            };
            host.addEventListener('fsl-machine-rebuilt', on_rebuild);
            this._host_unbind = () => { host.removeEventListener('fsl-machine-rebuilt', on_rebuild); };
            this._rerenderFromHostMachine();
        });
    }
    /**
     * Web Components lifecycle hook.  Releases any installed
     * parent-transition subscription and clears the host reference so a
     * subsequent re-attach goes through the full `connectedCallback` path
     * again.
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._parent_sub !== null) {
            this._parent_sub();
            this._parent_sub = null;
        }
        if (this._host_unbind !== null) {
            this._host_unbind();
            this._host_unbind = null;
        }
        this._parent_host = null;
    }
    /**
     * Nested-mode render path.  Renders the bound parent's machine via the
     * {@link machine_to_svg_string} pipeline and commits the result to
     * `_svg`.  On failure emits a `viz-error` `CustomEvent` and clears the
     * SVG.
     *
     * @returns A promise that resolves once the render attempt has finished.
     */
    async _rerenderFromHostMachine() {
        const host = this._parent_host;
        if (host === null) {
            return;
        }
        try {
            const m = host.machine;
            const result = await machine_to_svg_string(m, this.engine ? { engine: this.engine } : undefined);
            // Guard against the parent disappearing mid-render.
            if (this._parent_host === host) {
                this._svg = reorder_svg_layers(result);
            }
        }
        catch (e) {
            this._svg = '';
            this.dispatchEvent(new CustomEvent('viz-error', {
                detail: normalize_viz_error(e),
                bubbles: true,
                composed: true,
            }));
        }
    }
    /**
     * Render the current `fsl` source to an SVG string via the headless
     * `fsl_to_svg_string` pipeline. Updates `_svg` on success; emits a
     * `viz-error` `CustomEvent` on failure. Guards against stale results
     * when `fsl` changes mid-flight.
     *
     * @returns A promise that resolves once the render attempt has finished.
     */
    async _renderSvg() {
        const source = this.fsl;
        if (!source) {
            this._svg = '';
            return;
        }
        try {
            const result = await fsl_to_svg_string(source, this.engine ? { engine: this.engine } : undefined);
            // Guard against stale results: only commit if fsl has not changed since this render started.
            if (this.fsl === source) {
                this._svg = reorder_svg_layers(result);
            }
        }
        catch (e) {
            this._svg = '';
            this.dispatchEvent(new CustomEvent('viz-error', {
                detail: normalize_viz_error(e),
                bubbles: true,
                composed: true,
            }));
        }
    }
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
    render() {
        return html `<div class="container">${unsafeHTML(this._svg)}</div>`;
    }
}
FslViz.styles = css `
    :host {
      display: block;
      min-height: var(--jssm-viz-min-height, 100px);
    }
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container svg {
      /* Zoom the graph to fill the container (aspect maintained via the SVG's
         own preserveAspectRatio), leaving 5% padding on the constraining axis —
         the 90% box centered in the flex container yields the 5% inset. */
      width: 90%;
      height: 90%;
    }
  `;
__decorate([
    property({ type: String })
], FslViz.prototype, "fsl", void 0);
__decorate([
    property({ type: String })
], FslViz.prototype, "engine", void 0);
__decorate([
    state()
], FslViz.prototype, "_svg", void 0);

export { FslViz, normalize_viz_error };
