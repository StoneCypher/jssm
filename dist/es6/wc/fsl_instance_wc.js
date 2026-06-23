import { LitElement, html, css } from 'lit';
import { sm } from '../jssm.js';
import { install_bindings } from './fsl_bind_wc.js';
import { build_hook_descriptor, parse_hook_element, wrap_user_handler, } from './fsl_hook_wc.js';
import { closest_wc } from './wc_tag_helpers.js';
/**
 * Allow-list of event names accepted by `<jssm-on event="...">`.  Must stay
 * in sync with the `JssmEventName` union in `jssm_types.ts` (the library's
 * `machine.on(...)` event API, added in #638).  Validating here gives the
 * declarative wiring a clear "unknown event name" error at the WC layer
 * instead of relying on a downstream library throw whose message would
 * mention `machine.on(...)` rather than the offending tag.
 */
export const JSSM_ON_EVENT_NAMES = new Set([
    'transition',
    'rejection',
    'action',
    'entry',
    'exit',
    'terminal',
    'complete',
    'error',
    'data-change',
    'override',
    'timeout',
    'hook-registration',
    'hook-removal'
]);
/**
 * Parse a `<jssm-on>` element into a validated {@link ParsedJssmOn}
 * record.  Centralized so the declarative-tag logic is testable without
 * spinning up the full `<jssm-instance>` lifecycle.
 *
 * Validation rules (per #643):
 *   - `event` is required and must be in {@link JSSM_ON_EVENT_NAMES}.
 *   - Either a `handler="name"` attribute or non-empty `textContent`
 *     must be supplied, but not both.
 *   - `state` is only meaningful for `event="entry"` / `event="exit"`;
 *     it's silently ignored on other events.
 *   - `from` / `to` are only meaningful for `event="transition"`; they
 *     are silently ignored on other events.  Both → AND (a specific
 *     edge).  Neither → unfiltered.
 *
 * ```typescript
 * const el = document.createElement('jssm-on');
 * el.setAttribute('event', 'entry');
 * el.setAttribute('state', 'paid');
 * el.setAttribute('handler', 'onPaid');
 * parse_jssm_on_element(el);
 * // => { event: 'entry', handler_name: 'onPaid', inline_body: undefined,
 * //      once: false, name: undefined, filter: { state: 'paid' } }
 * ```
 *
 * @param el - The `<jssm-on>` element to parse.
 * @returns A validated {@link ParsedJssmOn} record.
 * @throws If `event` is missing, unknown, both handler forms are
 *         supplied, or neither handler form is supplied.
 */
export function parse_jssm_on_element(el) {
    const event_attr = el.getAttribute('event');
    if (event_attr === null || event_attr.trim().length === 0) {
        throw new Error('<jssm-on>: missing required `event` attribute');
    }
    const event = event_attr.trim();
    if (!JSSM_ON_EVENT_NAMES.has(event)) {
        throw new Error(`<jssm-on>: unknown event "${event}"`);
    }
    const handler_attr = el.getAttribute('handler');
    const handler_name = (handler_attr !== null && handler_attr.trim().length > 0)
        ? handler_attr.trim()
        : undefined;
    // textContent on a connected HTMLElement is always a string, so the
    // historical `?? ''` fallback never executed.  Use a direct cast here
    // and let test cases that supply a literal `null` (defensive coverage)
    // hit the `=== null` branch instead — that branch is reachable via
    // Object.defineProperty in tests, where the `??` form would be a dead
    // operator.
    const body_text = el.textContent;
    const inline_body = (body_text !== null && body_text.trim().length > 0) ? body_text : undefined;
    if (handler_name !== undefined && inline_body !== undefined) {
        throw new Error('<jssm-on>: specify handler="name" OR inline body, not both');
    }
    if (handler_name === undefined && inline_body === undefined) {
        throw new Error('<jssm-on>: must specify handler="name" or an inline body');
    }
    const once_attr = el.hasAttribute('once');
    const name_attr = el.getAttribute('name');
    const name = (name_attr !== null && name_attr.trim().length > 0) ? name_attr.trim() : undefined;
    // Build the filter, but only honour attributes that apply to this event.
    // Unknown filter attributes for an event are silently ignored, matching
    // the documented semantics in the issue.
    let filter;
    if (event === 'entry' || event === 'exit') {
        const state_attr = el.getAttribute('state');
        if (state_attr !== null && state_attr.length > 0) {
            filter = { state: state_attr };
        }
    }
    else if (event === 'transition') {
        const from_attr = el.getAttribute('from');
        const to_attr = el.getAttribute('to');
        const candidate = {};
        if (from_attr !== null && from_attr.length > 0) {
            candidate.from = from_attr;
        }
        if (to_attr !== null && to_attr.length > 0) {
            candidate.to = to_attr;
        }
        if (Object.keys(candidate).length > 0) {
            filter = candidate;
        }
    }
    return {
        event,
        handler_name,
        inline_body,
        once: once_attr,
        name,
        filter
    };
}
/**
 * Optional global registry that `<jssm-on>` (and, later, `<jssm-hook>`)
 * consult first when resolving a `handler="name"` attribute.  Consumers
 * register named handlers here in a strict-CSP environment where a stray
 * `globalThis[name]` isn't acceptable.  Falls through to `globalThis[name]`
 * if the registry has no entry.
 *
 * Intentionally a `Map<string, Function>` rather than a class with methods,
 * so consumers can use any of `.get`, `.set`, `.delete`, `.clear` directly
 * without a thin wrapper API.
 */
export const jssm_handler_registry = new Map();
/**
 * Resolve a named handler from the registry, then from `globalThis`.
 * Throws if neither lookup finds a function — earlier failure here is
 * better than a delayed "is not a function" at first event delivery.
 *
 * @param name - The handler name as supplied by `handler="..."`.
 * @returns The resolved function.
 * @throws If no function is registered under `name`.
 */
export function resolve_named_handler(name) {
    const from_registry = jssm_handler_registry.get(name);
    if (typeof from_registry === 'function') {
        return from_registry;
    }
    const from_global = globalThis[name];
    if (typeof from_global === 'function') {
        return from_global;
    }
    throw new Error(`<jssm-on>: handler "${name}" not found in registry or globalThis`);
}
/**
 * Compile an inline-body string into a handler function whose single
 * parameter is `e` (the event detail object).  Uses the same dynamic
 * `Function(...)` constructor that browsers use internally for inline
 * event-handler attributes such as `<a onclick="...">`; the input here
 * is consumer-authored markup, never network data, so the surface is
 * exactly that of an inline event-handler attribute and the same CSP
 * caveats apply (strict CSP without `'unsafe-eval'` blocks it).  A
 * `//# sourceURL=jssm-on:N` pragma is appended so devtools stack traces
 * point at a meaningful name.
 *
 * @param body - The inline JS body (function body, not full function).
 * @param source_id - A short identifier for the sourceURL pragma.
 * @returns The compiled handler.
 */
export function compile_inline_body(body, source_id) {
    const wrapped = `${body}\n//# sourceURL=jssm-on:${source_id}`;
    // The Function constructor is intentional here — see the docblock above
    // for the rationale and the CSP caveat.  Equivalent to how browsers wire
    // up inline event handlers; the input is consumer-authored markup.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    return new Function('e', wrapped); // skipcq: JS-0086
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
        // Drop every <fsl-*> or <jssm-*> companion tag (e.g. <fsl-hook>, <jssm-on>, etc.).
        clone.querySelectorAll('*').forEach(n => {
            const t = n.tagName.toLowerCase();
            if (t.startsWith('fsl-') || t.startsWith('jssm-')) {
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
 * @element fsl-instance
 * @cssproperty [--current-state] - The machine's current state name as a CSS string token.
 * @slot title - Heading area for the instance.
 * @slot viz - Visualization slot; fallback is a placeholder string.
 * @slot editor - Editor surface slot (`<fsl-editor>`, #659).
 * @slot actions - Slot for action buttons / UI.
 * @slot toolbar - Slot for toolbar UI (`<fsl-toolbar>`, #660).
 * @slot info-panel - Slot for an info / status panel (`<fsl-info-panel>`, #661).
 * @slot history - Slot for the visited-state timeline (`<fsl-history>`, #662).
 * @slot data-inspector - Slot for the typed-data tree view (`<fsl-data-inspector>`, #663).
 * @slot hook-log - Slot for the hook-firing log (`<fsl-hook-log>`, #664).
 * @slot effective-properties - Slot for the resolved-properties panel (`<fsl-effective-properties>`, #665).
 * @slot simulation - Slot for the random-walk simulation (`<fsl-simulation>`, #668).
 * @slot export - Slot for the export menu (`<fsl-export>`, #667).
 * @slot footer - Footer slot.
 */
export class FslInstance extends LitElement {
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
         * Live unsubscribe callbacks for #645 `<fsl-bind>` / `data-jssm-bind`
         * projections.  Every entry must be invoked exactly once during
         * {@link disconnectedCallback}.
         */
        this._unsubs = [];
        /**
         * Unsubscribe callbacks for every `machine.on(...)` / `machine.once(...)`
         * subscription installed from a `<jssm-on>` child during
         * `connectedCallback`.  Walked in `disconnectedCallback`.
         */
        this._on_unsubscribes = [];
        /**
         * Unsubscribe callbacks for the host-level mechanism-4 re-emission
         * subscriptions installed in {@link _install_event_reemission}.  Distinct
         * from {@link _on_unsubscribes} (which belongs to `<jssm-on>` children).
         */
        this._reemit_unsubscribes = [];
        /**
         * Library events captured during the current transition, awaiting DOM
         * re-dispatch once Lit commits the next render.  Dispatching here (rather
         * than synchronously from the machine subscription) guarantees the #639
         * ordering: mechanism 1/3 reflection and mechanism 2 slot re-pick are all
         * in place before a mechanism-4 listener runs.
         */
        this._pending_dom_events = [];
        /**
         * Per-instance registry of named hook handlers consulted before
         * `globalThis` when resolving `<fsl-hook handler="name">` /
         * `<jssm-hook handler="name">`.
         */
        this.registry = new Map();
        /**
         * Descriptors for hooks this WC installed at connect time.
         */
        this._installed_hooks = [];
        /**
         * Counter for compiled inline-body hook debug ids.
         */
        this._hook_debug_counter = 0;
        /**
         * DOM listeners installed by `<jssm-action>` / `data-jssm-action` discovery.
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
            throw new Error('fsl-instance: machine accessed before connection');
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
            throw new Error(`fsl-instance: ${resolved.error}`);
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
        // #639 mechanism 4: subscribe to library events and re-emit them as
        // DOM CustomEvents from this host (#638 supplies the event API).
        this._install_event_reemission();
        // #641: <jssm-hook> declarative discovery.
        this._install_declarative_hooks();
        // #643: <jssm-on> declarative event observation.
        this._install_jssm_on_children();
        // #645: discover <jssm-bind> tags and `data-jssm-bind` descendants,
        // install live machine-to-DOM projections.
        this._unsubs.push(...install_bindings(this, this._machine));
        // #640: <jssm-action> DOM event → machine action wiring.
        this._discover_jssm_actions();
    }
    /**
     * Discover direct-child `<jssm-on>` elements and install their
     * subscriptions on the owned machine.  Per #643:
     *
     * - Direct children only (`:scope > jssm-on`).  Deeper nesting is the
     *   responsibility of a future MutationObserver-driven v2.
     * - Each `<jssm-on>` is parsed by {@link parse_jssm_on_element}, which
     *   enforces the form / event-name / filter rules.
     * - Handlers come from {@link resolve_named_handler} (form A) or
     *   {@link compile_inline_body} (form B), and the result is installed
     *   via `machine.on(...)` or `machine.once(...)` depending on the
     *   element's `once` attribute.
     * - Every returned unsubscribe is tracked in {@link _on_unsubscribes}
     *   so {@link disconnectedCallback} can release them all.
     *
     * Called once from `connectedCallback` after the machine has been
     * constructed.  Any error thrown by parsing or resolution propagates
     * out so it surfaces via jsdom's error event (matching the rest of
     * `<jssm-instance>`'s "fail loud at connect" policy).
     */
    _install_jssm_on_children() {
        const machine = this._machine;
        const on_nodes = this.querySelectorAll(':scope > fsl-on, :scope > jssm-on');
        let index = 0;
        for (const el of Array.from(on_nodes)) {
            index += 1;
            const parsed = parse_jssm_on_element(el);
            const handler = parsed.handler_name !== undefined
                ? resolve_named_handler(parsed.handler_name)
                : compile_inline_body(parsed.inline_body, String(index));
            // Argument shape: machine.on(name, handler) when no filter, or
            // machine.on(name, filter, handler) when filtered.  Same for once.
            // `as any` collapses the per-event detail typing — the WC is a
            // schema-erased entry point and the type-safety belongs upstream.
            const subscribe = parsed.once ? machine.once.bind(machine) : machine.on.bind(machine);
            const unsubscribe = parsed.filter === undefined
                ? subscribe(parsed.event, handler)
                : subscribe(parsed.event, parsed.filter, handler);
            this._on_unsubscribes.push(unsubscribe);
        }
    }
    /**
     * Discover every direct-child `<jssm-hook>` element and install each
     * against the owned machine.  Handlers are wrapped with the friendly-proxy
     * adapter that lets user code write `m.data = ...` and return `false` to
     * cancel — see {@link make_hook_proxy} and the issue (#641) doc-comment
     * for the full contract.
     */
    _install_declarative_hooks() {
        const machine = this._machine;
        const hook_els = this.querySelectorAll(':scope > fsl-hook, :scope > jssm-hook');
        for (const el of Array.from(hook_els)) {
            const debug_id = `${this._hook_id_prefix()}${++this._hook_debug_counter}`;
            const spec = parse_hook_element(el, debug_id, this.registry);
            const wrapped = wrap_user_handler(spec, machine);
            const desc = build_hook_descriptor(spec, wrapped);
            machine.set_hook(desc);
            this._installed_hooks.push(desc);
        }
    }
    /**
     * Prefix used in synthetic `//# sourceURL=jssm-hook:<prefix><n>` annotations
     * for inline-body hooks compiled by this element.
     */
    _hook_id_prefix() {
        const host_id = this.getAttribute('id');
        return host_id !== null && host_id.length > 0 ? `${host_id}-` : '';
    }
    /**
     * Install the mechanism-4 (#639) re-emission subscriptions: one
     * `machine.on(name, ...)` per entry in {@link REEMITTED_EVENTS}.  Each
     * captured library event is queued and re-dispatched as a `fsl-<name>` DOM
     * event after the next render commit (see {@link updated}).
     *
     * Subscribing is also what *enables* the gated observation events: the
     * library suppresses `transition` / `entry` / `exit` / etc. while no
     * listeners exist (#670), so this host subscription is the bridge that
     * turns them on.
     *
     * The subscription handler paints state reflection eagerly so that a host
     * driven directly via `host.machine.action(...)` (bypassing {@link do})
     * still updates its `current-state` attribute and `--current-state`
     * property.
     */
    _install_event_reemission() {
        const machine = this._machine;
        for (const name of FslInstance.REEMITTED_EVENTS) {
            // `as any` collapses the per-event detail typing — the WC is a
            // schema-erased entry point; per-event payload typing belongs upstream.
            const off = machine.on(name, (detail) => {
                this._pending_dom_events.push({ name, detail });
                this._paint_state_reflection();
                this.requestUpdate();
            });
            this._reemit_unsubscribes.push(off);
        }
    }
    /**
     * Lit lifecycle.  After every committed render, flush any library events
     * captured since the last commit as DOM `CustomEvent`s.  Deferring to this
     * point is what gives mechanism-4 listeners the #639 ordering guarantee:
     * host attributes (mechanism 1), CSS custom properties (mechanism 3), and
     * the state-specific slot (mechanism 2) are all current by the time a
     * `fsl-*` listener runs.
     *
     * @param changed - Lit's changed-property map (forwarded to super).
     */
    updated(changed) {
        super.updated(changed);
        this._flush_pending_dom_events();
    }
    /**
     * Dispatch and clear the queue of pending DOM events.  The queue is
     * snapshotted and reset *before* dispatching so that a listener which
     * re-enters the machine (e.g. calls `host.machine.action(...)`
     * synchronously) enqueues into a fresh batch handled by the next update
     * cycle, rather than mutating the array mid-iteration.  This is the
     * documented re-entrancy behavior: re-entrant transitions are deferred,
     * not dropped.
     */
    _flush_pending_dom_events() {
        if (this._pending_dom_events.length === 0) {
            return;
        }
        const batch = this._pending_dom_events;
        this._pending_dom_events = [];
        for (const ev of batch) {
            this.dispatchEvent(new CustomEvent(`fsl-${ev.name}`, {
                detail: ev.detail,
                bubbles: true,
                composed: true,
            }));
        }
    }
    /**
     * Lifecycle hook.  Cleans up everything the WC installed at connect: hook
     * registrations from `<jssm-hook>`, event subscriptions from `<jssm-on>`,
     * mechanism-4 re-emission subscriptions, and DOM listeners from
     * `<jssm-action>` / `data-jssm-action`.
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        // #639 mechanism 4: release host-level re-emission subscriptions and drop
        // any events that were queued but not yet flushed.
        for (const off of this._reemit_unsubscribes) {
            off();
        }
        this._reemit_unsubscribes = [];
        this._pending_dom_events = [];
        // #641: remove installed hooks.
        if (this._machine !== undefined) {
            const machine = this._machine;
            for (const desc of this._installed_hooks) {
                machine.remove_hook(desc);
            }
        }
        this._installed_hooks = [];
        // #643: release every subscription installed from a <jssm-on> child.
        for (const off of this._on_unsubscribes) {
            try {
                off();
            }
            catch ( /* swallow — cleanup must not throw past us */_a) { /* swallow — cleanup must not throw past us */ }
        }
        this._on_unsubscribes = [];
        // #645: tear down every live binding.
        for (const off of this._unsubs) {
            off();
        }
        this._unsubs = [];
        // #640: remove DOM listeners installed via <jssm-action> / data-jssm-action.
        for (const entry of this._action_listeners) {
            entry.target.removeEventListener(entry.event, entry.handler);
        }
        this._action_listeners = [];
    }
    /**
     * Wire DOM events to machine actions, using the two declarative forms from
     * issue #640.  Both forms support optional `from-state` guards,
     * `from-property` data extraction, and `prevent-default` /
     * `stop-propagation` modifiers.
     */
    _discover_jssm_actions() {
        var _a, _b, _c, _d;
        const inline_targets = Array.from(this.querySelectorAll('[data-jssm-action]')).filter(el => closest_wc(el, 'action') === null);
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
        const tags = this.querySelectorAll(':scope > fsl-action, :scope > jssm-action');
        for (const tag of Array.from(tags)) {
            const selector = tag.getAttribute('selector');
            const action_name = tag.getAttribute('action');
            if (selector === null || action_name === null) {
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
     * `machine.action(...)` call, honoring the configured modifiers.
     */
    _install_action_listener(config) {
        const handler = (e) => {
            if (config.prevent_default) {
                e.preventDefault();
            }
            if (config.stop_propagation) {
                e.stopPropagation();
            }
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
          <slot name="title"><span class="placeholder">fsl-instance</span></slot>
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
        <section class="history">
          <slot name="history"></slot>
        </section>
        <section class="data-inspector">
          <slot name="data-inspector"></slot>
        </section>
        <section class="hook-log">
          <slot name="hook-log"></slot>
        </section>
        <section class="effective-properties">
          <slot name="effective-properties"></slot>
        </section>
        <section class="simulation">
          <slot name="simulation"></slot>
        </section>
        <section class="export">
          <slot name="export"></slot>
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
FslInstance.styles = css `
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
 * Library event names this WC re-emits as DOM `CustomEvent`s, fulfilling
 * mechanism 4 of #639.  Each library `machine.on(name, ...)` is bridged to
 * a `fsl-<name>` DOM event (`composed`, `bubbling`) so slotted content and
 * outside consumers can observe machine activity declaratively.
 *
 * `fsl-` is the canonical prefix (matching the canonical `<fsl-*>` tag
 * names); the older `jssm-*` event prose in #639 predates that naming flip.
 * Events are NOT double-emitted under both prefixes — a symmetric listener
 * would otherwise run twice per machine event.
 */
FslInstance.REEMITTED_EVENTS = [
    'transition', 'entry', 'exit', 'terminal', 'complete',
    'action', 'rejection', 'override', 'data-change', 'timeout', 'error',
];
/**
 * Lit reactive properties declaration.  We declare `fsl` here (rather
 * than via a decorator) so the attribute observation stays explicit and
 * survives the future companion-tag work without colliding with
 * dynamically declared attributes.
 */
FslInstance.properties = {
    fsl: { type: String, reflect: false },
};
