import { LitElement, html, css } from 'lit';
import { sm } from '../jssm.js';
import { build_hook_descriptor, parse_hook_element, wrap_user_handler, } from './jssm_hook_wc.js';
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
        /**
         * Per-instance registry of named hook handlers consulted before
         * `globalThis` when resolving `<jssm-hook handler="name">`.
         *
         * Initialized to an empty `Map`; consumers may populate it before the
         * element connects to provide handlers without polluting global scope —
         * useful for module-scoped SPAs where strict CSP blocks inline-body hooks.
         *
         * @see {@link parse_hook_element}
         */
        this.registry = new Map();
        /**
         * Descriptors for hooks this WC installed at connect time, used in
         * `disconnectedCallback` to call `remove_hook` for each so the underlying
         * machine doesn't leak handlers when the element is detached.
         *
         * Captured at install time because `remove_hook` matches by descriptor
         * shape (not handler identity), and we need to record the wrapped handler
         * we passed to `set_hook` to undo the registration cleanly.  Stored as
         * `unknown[]` and cast at the call site because jssm's `HookDescription`
         * is a discriminated union whose discriminator is only known at runtime.
         */
        this._installed_hooks = [];
        /**
         * Counter used to give each compiled inline-body hook a unique debug id
         * for its `//# sourceURL=jssm-hook:N` annotation.  Per-instance so that
         * multiple `<jssm-instance>` elements on a page don't share numbering.
         */
        this._hook_debug_counter = 0;
        /**
         * Records every DOM listener installed by `<jssm-action>` / `data-jssm-action`
         * discovery so {@link disconnectedCallback} can remove each one with the
         * same handler reference originally passed to `addEventListener`.
         *
         * Listeners installed via the dedicated `<jssm-action>` tag form may target
         * elements outside the host (its `selector` is resolved against the host,
         * but matching elements live in the document tree), so cleanup must be
         * explicit — relying on the host's GC is not sufficient.
         */
        this._action_listeners = [];
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
        // #641: <jssm-hook> declarative discovery.
        this._install_declarative_hooks();
        // TODO #643: <jssm-on> discovery happens here.
        this._discover_jssm_actions();
        // TODO #645: <jssm-bind> discovery happens here.
    }
    /**
     * Discover every direct-child `<jssm-hook>` element and install each
     * against the owned machine.  Handlers are wrapped with the friendly-proxy
     * adapter that lets user code write `m.data = ...` and return `false` to
     * cancel — see {@link make_hook_proxy} and the issue (#641) doc-comment
     * for the full contract.
     *
     * Direct children only (the `:scope > jssm-hook` selector) so that nested
     * `<jssm-instance>` elements don't have their child hooks installed on
     * the outer machine.
     *
     * Tracks every installed descriptor in `_installed_hooks` so that
     * `disconnectedCallback` can remove them on detach.
     *
     * @throws Error - On a malformed `<jssm-hook>` (mutual-exclusion violation,
     *                 unknown kind, unresolved name, or jssm's own missing-key
     *                 errors from `set_hook`).
     */
    _install_declarative_hooks() {
        const machine = this._machine;
        const hook_els = this.querySelectorAll(':scope > jssm-hook');
        for (const el of Array.from(hook_els)) {
            const debug_id = `${this._hook_id_prefix()}${++this._hook_debug_counter}`;
            const spec = parse_hook_element(el, debug_id, this.registry);
            const wrapped = wrap_user_handler(spec, machine);
            const desc = build_hook_descriptor(spec, wrapped);
            // `desc` is shaped from runtime kind discrimination; jssm's typed
            // `HookDescription` is a static discriminated union that TS can't
            // unify with our runtime-built object, hence the cast.
            machine.set_hook(desc);
            this._installed_hooks.push(desc);
        }
    }
    /**
     * Prefix used in synthetic `//# sourceURL=jssm-hook:<prefix><n>` annotations
     * for inline-body hooks compiled by this element.  Includes the element's
     * `id` when present so multi-instance pages can tell sources apart in
     * devtools.
     */
    _hook_id_prefix() {
        const host_id = this.getAttribute('id');
        return host_id !== null && host_id.length > 0 ? `${host_id}-` : '';
    }
    /**
     * Lifecycle hook.  Removes every hook this WC installed via
     * `<jssm-hook>` discovery so the underlying machine doesn't leak handlers
     * when the element detaches.  Called automatically by the browser; the
     * machine itself is not destroyed (consumers can reuse it).
     *
     * Future tickets #638/#643/#645 will extend this to drop other
     * subscriptions / listeners installed by their respective tags.
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        // TODO #638: unsubscribe from machine.on(...) handlers.
        // #641: remove installed hooks.
        if (this._machine !== undefined) {
            const machine = this._machine;
            for (const desc of this._installed_hooks) {
                machine.remove_hook(desc);
            }
        }
        this._installed_hooks = [];
        // TODO #643/#645: remove installed listeners / bindings.
        // Remove every listener installed during `<jssm-action>` / `data-jssm-action`
        // discovery.  Using the original handler reference ensures `removeEventListener`
        // actually unbinds — anonymous re-creation here would silently leak.
        for (const entry of this._action_listeners) {
            entry.target.removeEventListener(entry.event, entry.handler);
        }
        this._action_listeners = [];
    }
    /**
     * Wire DOM events to machine actions, using the two declarative forms from
     * issue #640:
     *
     *  1. Inline attribute form: every descendant of the host carrying a
     *     `data-jssm-action="<name>"` attribute receives a listener on the
     *     event named by `data-jssm-event` (default `click`).
     *  2. Dedicated tag form: each direct `<jssm-action>` child of the host
     *     supplies a CSS `selector` (scoped to the host), an `action`, and an
     *     optional `event` (default `click`); every matching descendant
     *     receives a listener configured by the tag's attributes.
     *
     * Both forms support optional `from-state` guards (dispatch only when the
     * machine's current state matches), `from-property` data extraction (pass
     * the source element's named property as the action's data argument), and
     * `prevent-default` / `stop-propagation` modifiers.
     *
     * Every installed listener is recorded in {@link _action_listeners} so
     * {@link disconnectedCallback} can detach them cleanly.
     */
    _discover_jssm_actions() {
        var _a, _b, _c, _d;
        // Inline attribute form: `[data-jssm-action]` descendants.  Per the
        // ticket, we scan the host's light DOM (not the shadow tree, which is
        // owned by us) and skip any element living inside a `<jssm-action>` tag
        // — those tags are pure data markup, never the source of an event.
        const inline_targets = Array.from(this.querySelectorAll('[data-jssm-action]')).filter(el => el.closest('jssm-action') === null);
        for (const el of inline_targets) {
            this._install_action_listener({
                source: el,
                event_name: (_a = el.dataset['jssmEvent']) !== null && _a !== void 0 ? _a : 'click',
                action_name: el.dataset['jssmAction'],
                from_state: el.dataset['jssmFromState'],
                from_property: el.dataset['jssmFromProperty'],
                prevent_default: 'jssmPreventDefault' in el.dataset,
                stop_propagation: 'jssmStopPropagation' in el.dataset,
            });
        }
        // Dedicated tag form: direct `<jssm-action>` children of the host.
        // `:scope >` keeps a nested `<jssm-instance>`'s actions from being
        // claimed by an outer host.
        const tags = this.querySelectorAll(':scope > jssm-action');
        for (const tag of Array.from(tags)) {
            const selector = tag.getAttribute('selector');
            const action_name = tag.getAttribute('action');
            if (selector === null || action_name === null) {
                // Required attrs missing — skip, but don't throw: a malformed tag
                // shouldn't break the rest of the host's wiring.
                continue;
            }
            const event_name = (_b = tag.getAttribute('event')) !== null && _b !== void 0 ? _b : 'click';
            const from_state = (_c = tag.getAttribute('from-state')) !== null && _c !== void 0 ? _c : undefined;
            const from_property = (_d = tag.getAttribute('from-property')) !== null && _d !== void 0 ? _d : undefined;
            const prevent_default = tag.hasAttribute('prevent-default');
            const stop_propagation = tag.hasAttribute('stop-propagation');
            const sources = this.querySelectorAll(selector);
            for (const src of Array.from(sources)) {
                this._install_action_listener({
                    source: src,
                    event_name,
                    action_name,
                    from_state,
                    from_property,
                    prevent_default,
                    stop_propagation,
                });
            }
        }
    }
    /**
     * Attach one DOM listener that translates a DOM event into a
     * `machine.action(...)` call, honoring the configured modifiers.  The
     * listener is recorded in {@link _action_listeners} so it can be removed
     * on disconnect.
     *
     * @param config - Listener configuration.
     * @param config.source - Element to attach the listener to.
     * @param config.event_name - DOM event to listen for.
     * @param config.action_name - Action to dispatch on the machine.
     * @param config.from_state - If set, only fire when `machine.state() === from_state`.
     * @param config.from_property - If set, pass `source[from_property]` as the action's data argument.
     * @param config.prevent_default - If true, call `e.preventDefault()` before checking the guard.
     * @param config.stop_propagation - If true, call `e.stopPropagation()` before checking the guard.
     */
    _install_action_listener(config) {
        const handler = (e) => {
            if (config.prevent_default) {
                e.preventDefault();
            }
            if (config.stop_propagation) {
                e.stopPropagation();
            }
            // Guard: skip dispatch when the machine isn't in the required state.
            if (config.from_state !== undefined && this.state() !== config.from_state) {
                return;
            }
            const data = config.from_property !== undefined
                ? config.source[config.from_property]
                : undefined;
            this.do(config.action_name, data);
        };
        config.source.addEventListener(config.event_name, handler);
        this._action_listeners.push({
            target: config.source,
            event: config.event_name,
            handler,
        });
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
