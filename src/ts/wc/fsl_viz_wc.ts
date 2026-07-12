import { LitElement, html, css, TemplateResult, PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { fsl_to_svg_string, machine_to_svg_string, slug_for } from '../jssm_viz.js';
import type { Machine } from '../jssm.js';
import { closest_wc } from './wc_tag_helpers.js';
import { reorder_svg_layers } from './svg_layers.js';

/**
 * Styling options for {@link FslViz.highlightTrace}.
 * color      Stroke/fill colour applied to the highlighted nodes
 *                      and edges. Any CSS colour string; defaults to a
 *                      distinct crimson (`#b71c1c`) when omitted.
 * fadeOthers When `true` (the default), every node and edge *not*
 *                      on the trace is dimmed to `opacity: 0.2` so the trace
 *                      stands out. Set `false` to highlight the trace without
 *                      fading the rest of the graph.
 * @see FslViz.highlightTrace
 */
export interface HighlightOptions {
  color?: string;
  fadeOthers?: boolean;
}

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
  message  : string;
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
 * @param e The thrown value to normalize.
 * @returns A `{ message, location }` object suitable for use as the
 * `detail` of a `viz-error` `CustomEvent`.
 */
export function normalize_viz_error(e: unknown): JssmVizErrorDetail {
  if (typeof e === 'object' && e !== null) {
    const rec = e as Record<string, unknown>;
    const raw_message = rec.message;
    const message = (typeof raw_message === 'string' && raw_message.length > 0)
      ? raw_message
      // eslint-disable-next-line @typescript-eslint/no-base-to-string -- intentional last-resort coercion: Error/JssmError throws stringify meaningfully, and '[object Object]' is the accepted fallback for exotic message-less objects
      : String(e);
    return { message, location: rec.location };
  }
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- unreachable for objects: the typeof-object branch above returns, so `e` is a primitive (or function) here and String() is meaningful
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
 * @element fsl-viz
 * @cssproperty [--jssm-viz-min-height=100px] - Minimum height of the rendered SVG container.
 * @cssproperty [--jssm-viz-max-height=none] - Maximum height of the control; the rendered SVG stays bounded (aspect preserved, letterboxed) within it. Equivalent to setting `max-height` on the host from outside, without shadow surgery.
 * @fires {CustomEvent<{ message: string; location?: unknown }>} viz-error - Fires when the FSL source fails to parse or render.
 */
export class FslViz extends LitElement {

  static styles = css`
    :host {
      display: block;
      min-height: var(--jssm-viz-min-height, 100px);
      /* #1934: embedder sizing seam — cap the control via the custom property
         (or plain external max-height on the host) without shadow surgery. */
      max-height: var(--jssm-viz-max-height, none);
    }
    .container {
      width: 100%;
      height: 100%;
      /* #1934: when the host's height is auto (content-driven under an
         external max-height cap), the percentage heights below collapse to
         auto and stop constraining anything. Inheriting the host's computed
         max-height re-threads the cap down to the svg. */
      max-height: inherit;
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
      /* #1934: with an auto-height host the 90% height collapses and the svg
         falls back to ratio-derived (or intrinsic pt) sizing, which can run
         far past an external max-height on the host. The inherited cap keeps
         that fallback bounded; Graphviz SVGs carry viewBox + the default
         preserveAspectRatio, so the capped viewport letterboxes cleanly
         instead of distorting. */
      max-width: 100%;
      max-height: inherit;
    }

    /* Smoothly animate the inline style overrides applied by highlightTrace()
       so a trace fades in/out rather than snapping. */
    .container svg g.node path,
    .container svg g.node polygon,
    .container svg g.node ellipse,
    .container svg g.edge path,
    .container svg g.edge polygon {
      transition: fill 0.3s ease, stroke 0.3s ease, opacity 0.3s ease;
    }

    .container svg g.node text,
    .container svg g.edge text {
      transition: fill 0.3s ease, opacity 0.3s ease;
    }
  `;

  /** FSL source to render. */
  @property({ type: String }) fsl = '';

  /** Optional Graphviz layout engine override (e.g. 'dot', 'neato'). */
  @property({ type: String }) engine: string | undefined = undefined;

  @state() private _svg: string = '';

  /**
   * Parent `<fsl-instance>` (or `<jssm-instance>`) host reference, set in
   * `connectedCallback` when a parent is found.  When non-null the viz is
   * in nested mode and renders the parent's machine instead of its own
   * `fsl` attribute.
   */
  private _parent_host: JssmInstanceHost | null = null;

  /**
   * Unsubscribe callback returned from `host.machine.on('transition', ...)`.
   * Held so `disconnectedCallback` can release the subscription.
   */
  private _parent_sub: (() => void) | null = null;

  /**
   * Detaches the host's `fsl-machine-rebuilt` listener (which re-subscribes the
   * viz to the host's new machine after a live rebuild, #1387). Captures the
   * exact host the listener was attached to, so teardown is correct even if
   * `_parent_host` was cleared or replaced. Null when standalone / before binding.
   */
  private _host_unbind: (() => void) | null = null;

  /**
   * Lit lifecycle hook. Triggers an async SVG render whenever `fsl` or
   * `engine` change — but only in standalone mode.  In nested mode the
   * `fsl` attribute is ignored; renders are driven by the parent machine's
   * transition events instead.
   * @param changed - Map of changed reactive properties supplied by Lit.
   */
  protected willUpdate(changed: PropertyValues<this>): void {
    if (this._parent_host !== null) {
      // Nested mode: ignore `fsl` attr changes; renders come from the
      // parent's transition events.  `engine` changes still re-render
      // because they apply to whichever source is in use.
      if (changed.has('engine')) {
        void this._rerenderFromHostMachine();
      }
      return;
    }
    if (changed.has('fsl') || changed.has('engine')) {
      void this._renderSvg();
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
  connectedCallback(): void {
    super.connectedCallback();

    const host = closest_wc(this, 'instance') as JssmInstanceHost | null;
    if (host === null) {
      return;   // standalone: existing behavior, willUpdate handles render
    }

    // Conflicting-configuration feedback: nested viz with its own `fsl`
    // attribute is almost certainly a bug.  Warn but proceed — the parent
    // owns the machine.
    if (typeof this.fsl === 'string' && this.fsl.trim().length > 0) {
       
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
      if (this._parent_host !== host) { return; }
      let sub: () => void;
      try {
        sub = host.machine.on('transition', () => { void this._rerenderFromHostMachine(); });
      } catch (error: unknown) {
        // The parent existed but its machine wasn't ready / threw.  Emit
        // a viz-error so the consumer learns about it instead of silently
        // showing nothing.
        this.dispatchEvent(new CustomEvent('viz-error', {
          detail   : normalize_viz_error(error),
          bubbles  : true,
          composed : true,
        }));
        return;
      }
      this._parent_sub = sub;

      // Re-subscribe + re-render when the host swaps its machine (#1387 live
      // rebuild): the old subscription is on a dead machine object.
      const on_rebuild = (): void => {
        sub();
        sub = host.machine.on('transition', () => { void this._rerenderFromHostMachine(); });
        this._parent_sub = sub;
        void this._rerenderFromHostMachine();
      };
      host.addEventListener('fsl-machine-rebuilt', on_rebuild);
      this._host_unbind = (): void => { host.removeEventListener('fsl-machine-rebuilt', on_rebuild); };

      void this._rerenderFromHostMachine();
      return;
    });
  }

  /**
   * Web Components lifecycle hook.  Releases any installed
   * parent-transition subscription and clears the host reference so a
   * subsequent re-attach goes through the full `connectedCallback` path
   * again.
   */
  disconnectedCallback(): void {
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
   * @returns A promise that resolves once the render attempt has finished.
   */
  private async _rerenderFromHostMachine(): Promise<void> {
    const host = this._parent_host;
    if (host === null) {
      return;
    }
    try {
      const m = host.machine;
      const result = await machine_to_svg_string(
        m,
        this.engine ? { engine: this.engine } : undefined
      );
      // Guard against the parent disappearing mid-render.
      if (this._parent_host === host) {
        this._svg = reorder_svg_layers(result);
      }
    } catch (error: unknown) {
      this._svg = '';
      this.dispatchEvent(new CustomEvent('viz-error', {
        detail   : normalize_viz_error(error),
        bubbles  : true,
        composed : true,
      }));
    }
  }

  /**
   * Render the current `fsl` source to an SVG string via the headless
   * `fsl_to_svg_string` pipeline. Updates `_svg` on success; emits a
   * `viz-error` `CustomEvent` on failure. Guards against stale results
   * when `fsl` changes mid-flight.
   * @returns A promise that resolves once the render attempt has finished.
   */
  private async _renderSvg(): Promise<void> {
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
    } catch (error: unknown) {
      this._svg = '';
      this.dispatchEvent(new CustomEvent('viz-error', {
        detail   : normalize_viz_error(error),
        bubbles  : true,
        composed : true,
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
   * @returns A Lit `TemplateResult` wrapping the SVG in a `.container` div.
   */
  render(): TemplateResult {
    return html`<div class="container">${unsafeHTML(this._svg)}</div>`;
  }

  /**
   * Clears any active programmatic highlights from the rendered SVG,
   * restoring every node and edge to its default Graphviz presentation.
   *
   * Removes only the inline `fill` / `stroke` / `opacity` overrides that
   * {@link highlightTrace} installs; the SVG's own presentation attributes
   * are untouched. Safe to call when nothing is highlighted, before the
   * first render, or while detached — it no-ops if there is no rendered
   * SVG to clear.
   *
   * ```typescript
   * const viz = document.querySelector('fsl-viz');
   * viz.highlightTrace(['a', 'b']);
   * viz.clearHighlights();   // back to the default rendering
   * ```
   * @see highlightTrace
   */
  public clearHighlights(): void {
    if (!this.shadowRoot) { return; }
    const container = this.shadowRoot.querySelector('.container');
    if (!container) { return; }

    // Remove the inline styles that override the SVG presentation attributes.
    const elements = container.querySelectorAll(':scope .node, :scope .edge, :scope .node *, :scope .edge *');
    elements.forEach(el => {
      (el as SVGElement).style.removeProperty('fill');
      (el as SVGElement).style.removeProperty('stroke');
      (el as SVGElement).style.removeProperty('opacity');
    });
  }

  /**
   * Programmatically highlights one execution trace (a path of state names)
   * through the rendered graph, optionally fading everything off the path.
   *
   * Matches nodes by their Graphviz `<title>` and edges by the `from->to`
   * title Graphviz emits, applying inline style overrides so the highlight
   * composes over — and is reversible against — the default rendering (see
   * {@link clearHighlights}, which this calls first). No-ops when detached,
   * before the first render, or given an empty trace.
   *
   * Because dot generation slugs state names into node identifiers (fsl#1935
   * — `'Wrong Pin'` renders with `<title>wrong-pin</title>`), each trace name
   * is matched in **both** its raw form and its slugged form, using the same
   * `slug_for` the dot generator uses. Display names (`'Red'`, `'Wrong Pin'`,
   * `'Röd'`) and already-slug-form names (`'red'`, `'wrong-pin'`) therefore
   * both work. Names whose slug is empty (e.g. `'!!!'`, which renders under
   * an indexed `node-N` title) are only matchable by passing that literal
   * `node-N` title.
   *
   * ```typescript
   * // Highlight a -> b -> c in green, without dimming the rest:
   * viz.highlightTrace(['a', 'b', 'c'], { color: '#2e7d32', fadeOthers: false });
   *
   * // Display-form names match their slugged titles:
   * viz.highlightTrace(['Wrong Pin', 'Alarm']);   // titles wrong-pin, alarm
   * ```
   * @param trace   Ordered state names describing the path (e.g.
   *                `['A', 'B', 'C']`). Consecutive pairs select the edges
   *                `A->B` and `B->C`. An empty array is a no-op.
   * @param options Highlight styling; see {@link HighlightOptions}. Defaults
   *                to crimson with off-trace fading enabled.
   * @see clearHighlights
   * @see HighlightOptions
   */
  public highlightTrace(trace: string[], options: HighlightOptions = {}): void {
    if (!this.shadowRoot) { return; }
    const container = this.shadowRoot.querySelector('.container');
    if (!container || trace.length === 0) { return; }

    this.clearHighlights();

    const color      = options.color || '#b71c1c';        // default: a distinct crimson
    const fadeOthers = options.fadeOthers !== false;       // default: true — undefined must fade

    const targetNodes = new Set<string>();
    const targetEdges = new Set<string>();

    // fsl#1935: dot generation slugs state names for node identity (see
    // slug_for in jssm_viz.ts), so rendered <title>s carry 'wrong-pin', not
    // 'Wrong Pin'. Match each trace name in both raw and slugged forms; for
    // names already in slug form the two coincide, preserving old behavior.
    const title_forms_of = (name: string): string[] => {
      const slug = slug_for(name);
      return (slug !== '' && slug !== name) ? [name, slug] : [name];
    };

    for (const [i, name] of trace.entries()) {
      const from_forms = title_forms_of(name);
      for (const form of from_forms) { targetNodes.add(form); }
      if (i < trace.length - 1) {
        const to_forms = title_forms_of(trace[i + 1]);
        for (const from_form of from_forms) {
          for (const to_form of to_forms) {
            targetEdges.add(`${from_form}->${to_form}`);
          }
        }
      }
    }

    const allNodes = container.querySelectorAll('.node');
    const allEdges = container.querySelectorAll('.edge');

    // Graphviz escapes '->' inside <title> as '&#45;&gt;'; DOM textContent
    // usually decodes it, but normalize defensively (and drop quotes).
    const unescapeTitle = (title: string): string =>
      title.replace(/&#45;/g, '-').replace(/&gt;/g, '>').replace(/"/g, '');

    allNodes.forEach(node => {
      const titleEl = node.querySelector('title');
      const title   = titleEl ? unescapeTitle(titleEl.textContent || '') : '';

      if (targetNodes.has(title)) {
        node.querySelectorAll('polygon, ellipse, path').forEach(shape => {
          (shape as SVGElement).style.stroke      = color;
          (shape as SVGElement).style.strokeWidth = '2px';
        });
        node.querySelectorAll('text').forEach(text => {
          (text as SVGElement).style.fill = color;
        });
      } else if (fadeOthers) {
        (node as SVGElement).style.opacity = '0.2';
      }
    });

    allEdges.forEach(edge => {
      const titleEl = edge.querySelector('title');
      const title   = titleEl ? unescapeTitle(titleEl.textContent || '') : '';

      if (targetEdges.has(title)) {
        // Recolour the edge line and its arrowhead. The edge's action label
        // is intentionally left alone: reorder_svg_layers() hoists every edge
        // <text> out of its group onto a top paint layer (so labels can't be
        // overdrawn), where it carries no <title> to correlate back to this
        // edge — so a state-name trace cannot reliably re-style it.
        edge.querySelectorAll('path, polygon').forEach(shape => {
          (shape as SVGElement).style.stroke = color;
          if (shape.tagName.toLowerCase() === 'polygon') {
            (shape as SVGElement).style.fill = color;   // arrowheads
          }
        });
      } else if (fadeOthers) {
        (edge as SVGElement).style.opacity = '0.2';
      }
    });
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'fsl-viz'  : FslViz;
    'jssm-viz' : FslViz;
  }
}
