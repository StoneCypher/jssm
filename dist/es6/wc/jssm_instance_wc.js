import { LitElement, html, css } from 'lit';
import { sm } from '../jssm.js';
/**
 * Resolve a `<jssm-instance>`'s FSL source from the three legal channels:
 * the `fsl=""` attribute, a child `<script type="text/fsl">`, and the
 * element's own text content (after stripping the script and any
 * `<jssm-*>` companion tags).  Exactly one channel may be used; using
 * none or more than one is an error.
 *
 * Pulled out as a pure function so it's testable without spinning up a
 * Lit element.
 *
 * ```typescript
 * const div = document.createElement('div');
 * div.setAttribute('fsl', 'Off -> On;');
 * resolve_fsl_source(div as HTMLElement, 'Off -> On;');
 * // => { fsl: 'Off -> On;', provided_count: 1, error: undefined }
 * ```
 *
 * @param host - The `<jssm-instance>` element being resolved.
 * @param fsl_attr - The current value of the host's `fsl` attribute (or property), or empty string.
 * @returns A {@link JssmInstanceFslResolution} describing the outcome.
 */
export function resolve_fsl_source(host, fsl_attr) {
    const sources = [];
    // Channel 1: fsl="" attribute / property.
    if (typeof fsl_attr === 'string' && fsl_attr.trim().length > 0) {
        sources.push({ kind: 'fsl-attribute', fsl: fsl_attr });
    }
    // Channel 2: <script type="text/fsl"> child.
    const script_child = host.querySelector('script[type="text/fsl"]');
    if (script_child !== null) {
        const text = (script_child.textContent || '').trim();
        if (text.length > 0) {
            sources.push({ kind: 'fsl-script', fsl: text });
        }
    }
    // Channel 3: textContent of the host, EXCLUDING the script-child and any
    // <jssm-*> companion tags.  We clone the host and strip those nodes before
    // reading textContent so the consumer's literal FSL is not contaminated
    // by companion-tag markup.
    const text_content_fsl = (function extract_text_fsl() {
        const clone = host.cloneNode(true);
        // Drop every script tag (any type — we only want raw text FSL here).
        clone.querySelectorAll('script').forEach(n => n.remove());
        // Drop every <jssm-*> companion tag (e.g. <jssm-hook>, <jssm-on>, etc.).
        clone.querySelectorAll('*').forEach(n => {
            if (n.tagName.toLowerCase().startsWith('jssm-')) {
                n.remove();
            }
        });
        return (clone.textContent || '').trim();
    })();
    if (text_content_fsl.length > 0) {
        sources.push({ kind: 'text-content', fsl: text_content_fsl });
    }
    if (sources.length === 0) {
        return { fsl: undefined, provided_count: 0, error: 'no FSL source' };
    }
    if (sources.length > 1) {
        return {
            fsl: undefined,
            provided_count: sources.length,
            error: `use exactly one source (found ${sources.length}: ${sources.map(s => s.kind).join(', ')})`,
        };
    }
    // sources.length === 1, so the non-null assertion is sound; `noUncheckedIndexedAccess`
    // widens the indexed type to include `undefined`, but the length check above
    // narrows the runtime invariant.
    const only = sources[0];
    return { fsl: only.fsl, provided_count: 1, error: undefined };
}
/**
 * Web component that owns a single `Machine<unknown>` constructed from an
 * FSL source supplied via one of three mutually exclusive channels:
 *
 *   1. The `fsl=""` attribute,
 *   2. A child `<script type="text/fsl">`,
 *   3. The element's own text content (companion `<jssm-*>` children and
 *      any `<script type="text/fsl">` are excluded from this channel).
 *
 * Supplying zero or more than one channel is a thrown error.
 *
 * On every transition the component reflects machine state to its own
 * attributes (`current-state`, `legal-actions`, `terminal`, `complete`)
 * and sets a `--current-state` CSS custom property so consumer CSS can
 * style by state without subclassing.
 *
 * @element jssm-instance
 * @cssproperty [--current-state] - The machine's current state name as a CSS string token.
 * @slot title - Heading area for the instance.
 * @slot viz - Visualization slot; fallback is a placeholder string.
 * @slot editor - Editor surface slot.
 * @slot actions - Slot for action buttons / UI.
 * @slot toolbar - Slot for toolbar UI.
 * @slot info-panel - Slot for an info / status panel.
 * @slot footer - Footer slot.
 */
export class JssmInstance extends LitElement {
    constructor() {
        super(...arguments);
        /**
         * FSL source attribute.  When non-empty, this is the sole channel
         * supplying the machine's source.  Setting both this and a child
         * `<script type="text/fsl">` (or non-empty text content) is an error.
         */
        this.fsl = '';
        /**
         * The underlying machine instance, constructed at `connectedCallback`.
         * Exposed raw (not proxied) per the #639/#648 design decision so that
         * consumers can use the full {@link Machine} API directly.
         *
         * Marked optional because Lit will instantiate the element before
         * `connectedCallback` runs; the instance is guaranteed present after
         * connection.
         */
        this._machine = undefined;
    }
    /**
     * Raw machine accessor.  Returns the owned {@link Machine} instance.
     *
     * @throws If accessed before the element has been connected.
     */
    get machine() {
        if (this._machine === undefined) {
            throw new Error('jssm-instance: machine accessed before connection');
        }
        return this._machine;
    }
    /**
     * Convenience wrapper for `machine.action(action, data)`.
     * After the action, reflects updated state to host attributes and the
     * `--current-state` CSS custom property, and requests a Lit update so
     * the state-specific `<slot name="state-...">` can re-pick.
     *
     * @param action - The action name to dispatch.
     * @param data - Optional data payload to pass to the action.
     * @returns `true` if the action succeeded, `false` otherwise.
     */
    do(action, data) {
        const result = this.machine.action(action, data);
        this._paint_state_reflection();
        this.requestUpdate();
        return result;
    }
    /**
     * Convenience wrapper for `machine.state()`.  Returns the current
     * state's name.
     */
    state() {
        return String(this.machine.state());
    }
    /**
     * Lifecycle hook.  Resolves the FSL source, constructs the machine,
     * paints initial reflection, then defers shadow-DOM rendering to Lit.
     *
     * Order is important: state reflection happens BEFORE the first render
     * so that consumer CSS rules keyed off `[current-state="..."]` apply on
     * first paint without a flash of unstyled content.
     *
     * @throws If no FSL source was provided, or if more than one channel
     * supplied a source.
     */
    connectedCallback() {
        super.connectedCallback();
        // Step 1: resolve FSL source.
        const resolved = resolve_fsl_source(this, this.fsl);
        if (resolved.error !== undefined) {
            throw new Error(`jssm-instance: ${resolved.error}`);
        }
        // Step 2: construct the machine.
        // (The resolver guarantees `fsl` is a non-empty string when error is undefined.)
        const fsl_source = resolved.fsl;
        this._machine = sm `${fsl_source}`;
        // Step 3: paint initial host attributes + CSS custom properties.
        this._paint_state_reflection();
        // Step 4: shadow DOM render is automatic via Lit; requesting an update
        // here ensures the first paint sees the freshly painted attributes.
        this.requestUpdate();
        // TODO #638: subscribe to machine.on('transition', ...) once available
        //            and dispatch DOM CustomEvents from this element.
        // TODO #641: <jssm-hook> discovery happens here.
        // TODO #643: <jssm-on> discovery happens here.
        // TODO #640: <jssm-action> discovery happens here.
        // TODO #645: <jssm-bind> discovery happens here.
    }
    /**
     * Lifecycle hook.  Cleans up any installed subscriptions.  Currently a
     * no-op (no subscriptions are installed in the base scaffolding) — the
     * empty body is intentional so the future tickets #638/#641/#643/#645
     * have a single canonical hook to extend.
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        // TODO #638: unsubscribe from machine.on(...) handlers.
        // TODO #641: remove installed hooks.
        // TODO #643/#645: remove installed listeners / bindings.
    }
    /**
     * Reflect machine state onto host attributes and CSS custom properties.
     * Called after every transition and once during `connectedCallback`.
     *
     * Mechanism 1 (#639): writes to host attributes.
     * Mechanism 3 (#639): writes to host inline-style custom properties.
     */
    _paint_state_reflection() {
        // Invariant: only called after `connectedCallback` has set `_machine`.
        const m = this._machine;
        const current_state = String(m.state());
        const legal_actions = m.list_exit_actions().map(a => String(a)).join(' ');
        const is_terminal = m.is_terminal();
        const is_complete = m.is_complete();
        this.setAttribute('current-state', current_state);
        this.setAttribute('legal-actions', legal_actions);
        this.toggleAttribute('terminal', is_terminal);
        this.toggleAttribute('complete', is_complete);
        // CSS custom properties.  v1 only sets --current-state; --current-state-color
        // is left commented out because it requires the theme system integration
        // tracked in a separate ticket.
        this.style.setProperty('--current-state', current_state);
    }
    /**
     * Lit render method.  Produces the shadow-DOM template with named slots
     * and a state-specific `<slot name="state-...">` that re-targets on each
     * transition.  Fallback content in each slot keeps a bare
     * `<jssm-instance fsl="...">` from rendering as a blank box.
     *
     * @returns A Lit `TemplateResult` describing the shadow tree.
     */
    render() {
        const state_slot_name = this._machine === undefined
            ? 'state-unknown'
            : `state-${String(this._machine.state())}`;
        return html `
      <div class="container">
        <header>
          <slot name="title"><span class="placeholder">jssm-instance</span></slot>
        </header>
        <section class="viz">
          <slot name="viz"><span class="placeholder">no viz configured</span></slot>
        </section>
        <section class="editor">
          <slot name="editor"></slot>
        </section>
        <section class="toolbar">
          <slot name="toolbar"></slot>
        </section>
        <section class="actions">
          <slot name="actions"></slot>
        </section>
        <section class="info-panel">
          <slot name="info-panel"></slot>
        </section>
        <section class="state-section">
          <slot name=${state_slot_name}></slot>
        </section>
        <footer>
          <slot name="footer"></slot>
        </footer>
      </div>
    `;
    }
}
JssmInstance.styles = css `
    :host {
      display: block;
    }
    .container {
      width: 100%;
      height: 100%;
    }
    .placeholder {
      opacity: 0.6;
      font-style: italic;
    }
  `;
/**
 * Lit reactive properties declaration.  We declare `fsl` here (rather
 * than via a decorator) so the attribute observation stays explicit and
 * survives the future companion-tag work without colliding with
 * dynamically declared attributes.
 */
JssmInstance.properties = {
    fsl: { type: String, reflect: false },
};
