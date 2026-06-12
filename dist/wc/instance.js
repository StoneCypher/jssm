import { css, LitElement, html } from 'lit';
import { sm } from 'jssm';

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
function wc_suffix_matches(tag_name, suffix) {
    const lower = tag_name.toLowerCase();
    return lower === `fsl-${suffix}` || lower === `jssm-${suffix}`;
}
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
 * Walk a dotted path into a value.  Used by the `data.path.to.field`
 * variant of {@link resolve_binding}.  Returns `undefined` whenever the
 * traversal would dereference a non-object, missing field, or `null` —
 * matching the natural "missing data" semantics rather than throwing.
 *
 * ```typescript
 * walk_path({ a: { b: 7 } }, 'a.b');     // => 7
 * walk_path({ a: { b: 7 } }, 'a.c');     // => undefined
 * walk_path({ a: { b: 7 } }, 'a.b.c');   // => undefined (7 is not an object)
 * walk_path(undefined,        'a');      // => undefined
 * walk_path({ a: null },     'a.b');     // => undefined (null is not an object)
 * walk_path({ a: 1 },         '');       // => { a: 1 } (empty path = identity)
 * ```
 *
 * @param obj  - The root value to traverse.
 * @param path - Dotted path of property names, e.g. `"a.b.c"`.
 * @returns The terminal value, or `undefined` if any step fails.
 */
function walk_path(obj, path) {
    if (path.length === 0) {
        return obj;
    }
    let cur = obj;
    for (const part of path.split('.')) {
        if (cur === null || typeof cur !== 'object') {
            return undefined;
        }
        cur = cur[part];
    }
    return cur;
}
/**
 * Resolve a `<jssm-bind>` / `data-jssm-bind` expression against a live
 * machine.  Throws on any unknown expression — bindings fail fast at
 * install time rather than silently producing `undefined` strings in the
 * DOM.
 *
 * Recognized expressions:
 *
 * | Expression       | Resolves to                                   |
 * | ---------------- | --------------------------------------------- |
 * | `data`           | `machine.data()`                              |
 * | `data.a.b.c`     | dotted-path traversal into `machine.data()`   |
 * | `state`          | `machine.state()`                             |
 * | `terminal`       | `machine.is_terminal()`                       |
 * | `complete`       | `machine.is_complete()`                       |
 * | `legal-actions`  | `machine.list_exit_actions().join(' ')`       |
 *
 * ```typescript
 * resolve_binding(m, 'state');              // current state name
 * resolve_binding(m, 'data.username');      // typed-data subfield
 * resolve_binding(m, 'wat');                // throws
 * ```
 *
 * @param m    - The machine whose state/data is being projected.
 * @param expr - The binding expression text (raw attribute value).
 * @returns The resolved value, typed `unknown` since each expression
 *          yields a different shape.
 *
 * @throws Error - When `expr` is not a recognized binding form.
 */
function resolve_binding(m, expr) {
    switch (expr) {
        case 'state': return m.state();
        case 'terminal': return m.is_terminal();
        case 'complete': return m.is_complete();
        case 'legal-actions': return m.list_exit_actions().map(a => String(a)).join(' ');
        case 'data': return m.data();
        default:
            if (expr.startsWith('data.')) {
                return walk_path(m.data(), expr.slice(5));
            }
            throw new Error(`<jssm-bind>: unknown binding expression "${expr}"`);
    }
}
/**
 * Apply a resolved binding value to an element's target property.  The
 * `target` selector follows the rules documented in #645:
 *
 * - `textContent` (or omitted) sets `el.textContent` to the value coerced
 *   with `String()`.
 * - Any string starting with `data-` is treated as an attribute name and
 *   set via `setAttribute`, value coerced with `String()`.
 * - Any other string is assigned directly as a property of the element
 *   (no coercion) — supports `value`, `disabled`, `hidden`, `checked`,
 *   and the documented power-user escape hatch.
 *
 * ```typescript
 * set_on_element(span,   'textContent',     7);            // span.textContent = '7'
 * set_on_element(input,  'value',           'hi');         // input.value = 'hi'
 * set_on_element(button, 'disabled',        true);         // button.disabled = true
 * set_on_element(div,    'data-current',    'red');        // setAttribute('data-current', 'red')
 * ```
 *
 * @param el     - The element to update.
 * @param target - Target property name, possibly a `data-*` attribute.
 * @param value  - The resolved value to assign.
 */
function set_on_element(el, target, value) {
    if (target.startsWith('data-')) {
        el.setAttribute(target, String(value));
    }
    else if (target === 'textContent') {
        el.textContent = String(value);
    }
    else {
        // Power-user escape hatch — assigns value as-is so booleans hit
        // properties like `disabled`/`hidden`/`checked` with the correct
        // semantics rather than being coerced to a string.
        el[target] = value;
    }
}
/**
 * Discover every binding declaration under `host` and install live
 * subscriptions that refresh them on every machine transition.  Returns
 * a list of unsubscribe callbacks so the host's `disconnectedCallback`
 * can tear them all down.
 *
 * Two surface forms are recognized:
 *
 * 1. Inline attribute — any descendant with `data-jssm-bind="<expr>"`.
 *    Optional `data-jssm-bind-to="<target>"` chooses the target property
 *    (defaults to `textContent`).
 *
 * 2. Dedicated tag — direct-child `<jssm-bind>` configuration tags with
 *    `selector="<css>"` and `source="<expr>"` attributes, plus an
 *    optional `target="<target>"` (also defaulting to `textContent`).
 *    The `selector` is scoped to `host`'s descendants.
 *
 * Each binding is painted once immediately (using the machine's current
 * state) and then re-painted on every `transition` event.
 *
 * ```typescript
 * // typical install during <jssm-instance>.connectedCallback:
 * const unsubs = install_bindings(this, this.machine);
 * this._unsubs.push(...unsubs);
 * ```
 *
 * @param host    - The host element whose descendants carry the bindings.
 * @param machine - The machine whose state/data is being projected.
 * @returns A flat array of unsubscribe callbacks, one per installed
 *          subscription.
 *
 * @throws Error - When any binding expression is unrecognized
 *                 (propagated from {@link resolve_binding}).
 * @throws Error - When a `<jssm-bind>` tag is missing its `selector`
 *                 or `source` attribute.
 */
function install_bindings(host, machine) {
    var _a, _b;
    const unsubs = [];
    // Form 1: inline `data-jssm-bind` on descendants.
    const inline_nodes = host.querySelectorAll('[data-jssm-bind]');
    for (const el of Array.from(inline_nodes)) {
        const expr = el.dataset.jssmBind;
        const target = (_a = el.dataset.jssmBindTo) !== null && _a !== void 0 ? _a : 'textContent';
        const apply = () => {
            set_on_element(el, target, resolve_binding(machine, expr));
        };
        apply();
        unsubs.push(machine.on('transition', apply));
    }
    // Form 2: dedicated `<fsl-bind>` / `<jssm-bind>` configuration tags.  Only
    // direct children are considered configuration tags for THIS host — nested
    // `<fsl-instance>` / `<jssm-instance>` children would have their own
    // bindings handled by their own component.
    const all_direct = host.querySelectorAll(':scope > *');
    const config_tags = Array.from(all_direct).filter(el => wc_suffix_matches(el.tagName, 'bind'));
    for (const tag of config_tags) {
        const selector = tag.getAttribute('selector');
        const expr = tag.getAttribute('source');
        const target = (_b = tag.getAttribute('target')) !== null && _b !== void 0 ? _b : 'textContent';
        if (selector === null || selector.length === 0) {
            throw new Error('<jssm-bind>: missing required "selector" attribute');
        }
        if (expr === null || expr.length === 0) {
            throw new Error('<jssm-bind>: missing required "source" attribute');
        }
        const targets = host.querySelectorAll(selector);
        for (const el of Array.from(targets)) {
            const apply = () => {
                set_on_element(el, target, resolve_binding(machine, expr));
            };
            apply();
            unsubs.push(machine.on('transition', apply));
        }
    }
    return unsubs;
}
/**
 * `<fsl-bind>` / `<jssm-bind>` configuration tag.  The element itself is
 * invisible — it carries `selector`, `source`, and optional `target`
 * attributes that the parent `<fsl-instance>` reads during its connection
 * lifecycle to wire up a machine-to-DOM binding.
 *
 * Registering it as a `LitElement` (rather than leaving it as a generic
 * unknown tag) gives it a stable upgrade timing, a `display: none`
 * default style, and a proper place in the custom-elements registry so
 * `customElements.get('fsl-bind')` resolves.
 *
 * @element fsl-bind
 * @attribute selector - CSS selector for the target element(s), scoped to the host.
 * @attribute source - Binding expression (see {@link resolve_binding}).
 * @attribute target - Target property name; defaults to `textContent`.
 */
class FslBind extends LitElement {
    /**
     * No-op render.  The tag's purpose is purely declarative
     * configuration; it must not contribute any DOM to the page.
     */
    render() {
        return null;
    }
}
FslBind.styles = css `:host { display: none; }`;

const VALID_KINDS = new Set([
    'hook',
    'named',
    'any transition',
    'standard transition',
    'main transition',
    'forced transition',
    'entry',
    'exit',
    'any action',
    'global action',
]);
/**
 * Build a {@link JssmHookProxy} that wraps an arbitrary hook context object.
 *
 * The context shape varies by hook kind (`from`/`to`/`action` may be absent
 * for transition-kind hooks), so this normalizes the shape via optional
 * fields and exposes mutable `data` while keeping the rest read-only.
 *
 * The `machine` parameter is used only for `state()`, so unit tests can
 * substitute any object with a `state(): unknown` method.
 *
 * @param ctx     - Raw hook context passed by jssm.
 * @param machine - The owning machine; used for the `state()` accessor.
 * @returns A proxy object suitable for passing to a user handler.
 */
function make_hook_proxy(ctx, machine) {
    return {
        get data() {
            return ctx.data;
        },
        set data(next) {
            ctx.data = next;
        },
        get from() {
            return ctx.from;
        },
        get to() {
            return ctx.to;
        },
        get action() {
            return ctx.action;
        },
        state() {
            return String(machine.state());
        },
    };
}
/**
 * Compile a textContent body into a callable user handler.
 *
 * Uses dynamic function construction — the same primitive browsers use
 * internally for `<a onclick="...">` and `setTimeout(stringBody, ms)`.
 * Strict CSP without `'unsafe-eval'` blocks this and the call will throw;
 * consumers should fall back to the `handler="name"` form there.
 *
 * Prepends a `//# sourceURL=` comment so devtools surface a meaningful name
 * in stack traces instead of `anonymous`.
 *
 * @param body     - Trimmed textContent of the `<jssm-hook>` element.
 * @param debug_id - Identifier appended to the synthetic sourceURL.
 * @returns The compiled handler.
 */
function compile_inline_body$1(body, debug_id) {
    const annotated = `//# sourceURL=jssm-hook:${debug_id}\n${body}`;
    const ctor = Function;
    return new ctor('m', annotated);
}
/**
 * Resolve a `handler="name"` attribute to a callable by consulting first the
 * optional in-WC registry, then `globalThis[name]`.  Throws a clear error if
 * neither resolves.
 *
 * @param name     - The handler name from the `handler=""` attribute.
 * @param registry - Optional in-WC registry to consult first.
 * @returns The resolved handler.
 * @throws Error  - If no callable of that name is found in either location.
 */
function resolve_named_handler$1(name, registry) {
    if (registry !== undefined) {
        const registered = registry.get(name);
        if (registered !== undefined) {
            return registered;
        }
    }
    const global = globalThis[name];
    if (typeof global === 'function') {
        return global;
    }
    throw new Error(`<jssm-hook handler="${name}">: handler not found in registry or globalThis`);
}
/**
 * Validate and normalize a `<jssm-hook kind="...">` value, defaulting to
 * `"hook"` when the attribute is absent.  Throws on unknown kinds rather
 * than silently doing nothing later.
 *
 * @param raw - The raw attribute value, or null if not present.
 * @returns The normalized {@link JssmHookKind}.
 * @throws Error - On an unknown kind.
 */
function normalize_hook_kind(raw) {
    if (raw === null || raw === undefined || raw === '') {
        return 'hook';
    }
    if (!VALID_KINDS.has(raw)) {
        throw new Error(`<jssm-hook kind="${raw}">: unknown hook kind (expected one of: ${[...VALID_KINDS].join(', ')})`);
    }
    return raw;
}
/**
 * Parse a single `<jssm-hook>` element into a {@link JssmHookInstallSpec}.
 *
 * Validates the mutual-exclusion rule between `handler="name"` and inline
 * body, defaults `kind` to `"hook"`, resolves named handlers against the
 * optional registry then `globalThis`, and compiles inline bodies via
 * dynamic function construction.  Conditional-required attributes (e.g.
 * `from`/`to` for `kind="hook"`) are NOT validated here — `set_hook` will
 * throw with its own clear errors on missing pieces, which keeps the
 * error surface single-sourced.
 *
 * @param el       - The `<jssm-hook>` element to parse.
 * @param debug_id - Identifier used in the inline body's sourceURL.
 * @param registry - Optional in-WC registry of named handlers.
 * @returns A {@link JssmHookInstallSpec} describing what to install.
 * @throws Error - On mutual-exclusion violation, unknown kind, or unresolved name.
 */
function parse_hook_element(el, debug_id, registry) {
    var _a, _b, _c, _d;
    const handler_attr = el.getAttribute('handler');
    const raw_text = el.textContent;
    const body_text = (raw_text === null ? '' : raw_text).trim();
    if (handler_attr !== null && body_text.length > 0) {
        throw new Error('<jssm-hook>: specify handler="name" OR inline body, not both');
    }
    if (handler_attr === null && body_text.length === 0) {
        throw new Error('<jssm-hook>: must specify either handler="name" attribute or an inline body');
    }
    const user_handler = handler_attr !== null
        ? resolve_named_handler$1(handler_attr, registry)
        : compile_inline_body$1(body_text, debug_id);
    const kind = normalize_hook_kind(el.getAttribute('kind'));
    // Convert null → undefined so downstream descriptors omit absent keys.
    const from = (_a = el.getAttribute('from')) !== null && _a !== void 0 ? _a : undefined;
    const to = (_b = el.getAttribute('to')) !== null && _b !== void 0 ? _b : undefined;
    const action = (_c = el.getAttribute('action')) !== null && _c !== void 0 ? _c : undefined;
    const name = (_d = el.getAttribute('name')) !== null && _d !== void 0 ? _d : undefined;
    return { kind, name, from, to, action, user_handler };
}
/**
 * Wrap a {@link JssmHookUserHandler} so that jssm's native hook contract is
 * satisfied: the user gets a friendly proxy, the proxy's mutated `data`
 * becomes the `HookComplexResult.data`, and an explicit `false` return
 * cancels the transition.
 *
 * Any non-`false` return — including `undefined`, `true`, or an arbitrary
 * object — allows the transition.  This matches the contract spelled out
 * in the issue (#641): "return false cancels; anything else allows".
 *
 * @param spec    - The parsed install spec carrying the user handler.
 * @param machine - The owning machine; used by the proxy's `state()`.
 * @returns A wrapped handler suitable for `set_hook`.
 */
function wrap_user_handler(spec, machine) {
    const user = spec.user_handler;
    return (ctx) => {
        const proxy = make_hook_proxy(ctx, machine);
        const result = user(proxy);
        if (result === false) {
            return false;
        }
        return { pass: true, data: proxy.data };
    };
}
/**
 * Build the typed descriptor object passed to `machine.set_hook` (and later
 * to `machine.remove_hook` for cleanup) from a parsed {@link JssmHookInstallSpec}
 * and the wrapped handler.
 *
 * For kinds that need `from`/`to`/`action`, the descriptor includes those.
 * Missing required keys produce `undefined` here; jssm's `set_hook` will
 * surface the error with its own clear message so we don't duplicate
 * validation.
 *
 * Return type is `unknown` because jssm's `HookDescription` is a
 * discriminated union and our runtime-discriminator value can't be tracked
 * by TypeScript across the build.  The WC casts at the `set_hook` call site.
 *
 * @param spec    - The parsed install spec.
 * @param wrapped - The wrapped (friendly-proxy) handler from {@link wrap_user_handler}.
 * @returns A descriptor object for `set_hook`/`remove_hook`.
 */
function build_hook_descriptor(spec, wrapped) {
    const base = { kind: spec.kind, handler: wrapped };
    if (spec.from !== undefined)
        base.from = spec.from;
    if (spec.to !== undefined)
        base.to = spec.to;
    if (spec.action !== undefined)
        base.action = spec.action;
    return base;
}

/**
 * Allow-list of event names accepted by `<jssm-on event="...">`.  Must stay
 * in sync with the `JssmEventName` union in `jssm_types.ts` (the library's
 * `machine.on(...)` event API, added in #638).  Validating here gives the
 * declarative wiring a clear "unknown event name" error at the WC layer
 * instead of relying on a downstream library throw whose message would
 * mention `machine.on(...)` rather than the offending tag.
 */
const JSSM_ON_EVENT_NAMES = new Set([
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
function parse_jssm_on_element(el) {
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
const jssm_handler_registry = new Map();
/**
 * Resolve a named handler from the registry, then from `globalThis`.
 * Throws if neither lookup finds a function — earlier failure here is
 * better than a delayed "is not a function" at first event delivery.
 *
 * @param name - The handler name as supplied by `handler="..."`.
 * @returns The resolved function.
 * @throws If no function is registered under `name`.
 */
function resolve_named_handler(name) {
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
function compile_inline_body(body, source_id) {
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
function resolve_fsl_source(host, fsl_attr) {
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
 * @slot editor - Editor surface slot.
 * @slot actions - Slot for action buttons / UI.
 * @slot toolbar - Slot for toolbar UI.
 * @slot info-panel - Slot for an info / status panel.
 * @slot footer - Footer slot.
 */
class FslInstance extends LitElement {
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
        // TODO #638: subscribe to machine.on('transition', ...) once available
        //            and dispatch DOM CustomEvents from this element.
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
     * Lifecycle hook.  Cleans up everything the WC installed at connect: hook
     * registrations from `<jssm-hook>`, event subscriptions from `<jssm-on>`,
     * and DOM listeners from `<jssm-action>` / `data-jssm-action`.
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        // TODO #638: unsubscribe from any direct machine.on(...) handlers added by host.
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
 * Lit reactive properties declaration.  We declare `fsl` here (rather
 * than via a decorator) so the attribute observation stays explicit and
 * survives the future companion-tag work without colliding with
 * dynamically declared attributes.
 */
FslInstance.properties = {
    fsl: { type: String, reflect: false },
};

export { FslInstance, JSSM_ON_EVENT_NAMES, compile_inline_body, jssm_handler_registry, parse_jssm_on_element, resolve_fsl_source, resolve_named_handler };
