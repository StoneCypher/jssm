import { LitElement, TemplateResult } from 'lit';
import { Machine } from '../jssm.js';
/**
 * Internal record describing the result of resolving a `<jssm-instance>`'s
 * FSL source.  Exactly one of `fsl` is populated on success; otherwise
 * `error` carries an explanatory message that gets thrown.
 *
 * `provided_count` is exposed mainly so the error path can report how many
 * conflicting sources were found, but it's useful in tests too.
 */
export interface JssmInstanceFslResolution {
    fsl: string | undefined;
    provided_count: number;
    error: string | undefined;
}
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
export declare function resolve_fsl_source(host: HTMLElement, fsl_attr: string): JssmInstanceFslResolution;
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
export declare class JssmInstance extends LitElement {
    static styles: import("lit").CSSResult;
    /**
     * FSL source attribute.  When non-empty, this is the sole channel
     * supplying the machine's source.  Setting both this and a child
     * `<script type="text/fsl">` (or non-empty text content) is an error.
     */
    fsl: string;
    /**
     * The underlying machine instance, constructed at `connectedCallback`.
     * Exposed raw (not proxied) per the #639/#648 design decision so that
     * consumers can use the full {@link Machine} API directly.
     *
     * Marked optional because Lit will instantiate the element before
     * `connectedCallback` runs; the instance is guaranteed present after
     * connection.
     */
    private _machine;
    /**
     * Live unsubscribe callbacks for every machine-driven subscription
     * installed by this host (currently: `<jssm-bind>` / `data-jssm-bind`
     * projections from #645).  Every entry must be invoked exactly once
     * during {@link disconnectedCallback}.
     */
    private _unsubs;
    /**
     * Raw machine accessor.  Returns the owned {@link Machine} instance.
     *
     * @throws If accessed before the element has been connected.
     */
    get machine(): Machine<unknown>;
    /**
     * Lit reactive properties declaration.  We declare `fsl` here (rather
     * than via a decorator) so the attribute observation stays explicit and
     * survives the future companion-tag work without colliding with
     * dynamically declared attributes.
     */
    static properties: {
        fsl: {
            type: StringConstructor;
            reflect: boolean;
        };
    };
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
    do(action: string, data?: unknown): boolean;
    /**
     * Convenience wrapper for `machine.state()`.  Returns the current
     * state's name.
     */
    state(): string;
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
    connectedCallback(): void;
    /**
     * Lifecycle hook.  Cleans up any installed subscriptions.  Currently a
     * no-op (no subscriptions are installed in the base scaffolding) — the
     * empty body is intentional so the future tickets #638/#641/#643/#645
     * have a single canonical hook to extend.
     */
    disconnectedCallback(): void;
    /**
     * Reflect machine state onto host attributes and CSS custom properties.
     * Called after every transition and once during `connectedCallback`.
     *
     * Mechanism 1 (#639): writes to host attributes.
     * Mechanism 3 (#639): writes to host inline-style custom properties.
     */
    private _paint_state_reflection;
    /**
     * Lit render method.  Produces the shadow-DOM template with named slots
     * and a state-specific `<slot name="state-...">` that re-targets on each
     * transition.  Fallback content in each slot keeps a bare
     * `<jssm-instance fsl="...">` from rendering as a blank box.
     *
     * @returns A Lit `TemplateResult` describing the shadow tree.
     */
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'jssm-instance': JssmInstance;
    }
}
