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
 * @param ctx     - Raw hook context passed by jssm.
 * @param machine - The owning machine; used for the `state()` accessor.
 * @returns A proxy object suitable for passing to a user handler.
 */
export function make_hook_proxy(ctx, machine) {
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
            // eslint-disable-next-line @typescript-eslint/no-base-to-string -- `machine` is deliberately duck-typed `state(): unknown` so tests can stub it (see docblock); real machines return string, and String() is the documented normalization
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
 * @param body     - Trimmed textContent of the `<jssm-hook>` element.
 * @param debug_id - Identifier appended to the synthetic sourceURL.
 * @returns The compiled handler.
 */
export function compile_inline_body(body, debug_id) {
    const annotated = `//# sourceURL=jssm-hook:${debug_id}\n${body}`;
    const ctor = Function;
    return new ctor('m', annotated);
}
/**
 * Resolve a `handler="name"` attribute to a callable by consulting first the
 * optional in-WC registry, then `globalThis[name]`.  Throws a clear error if
 * neither resolves.
 * @param name     - The handler name from the `handler=""` attribute.
 * @param registry - Optional in-WC registry to consult first.
 * @returns The resolved handler.
 * @throws Error  - If no callable of that name is found in either location.
 */
export function resolve_named_handler(name, registry) {
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
 * @param raw - The raw attribute value, or null if not present.
 * @returns The normalized {@link JssmHookKind}.
 * @throws Error - On an unknown kind.
 */
export function normalize_hook_kind(raw) {
    if (!raw) { // null, undefined, and '' — the only falsy values of this type
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
 * @param el       - The `<jssm-hook>` element to parse.
 * @param debug_id - Identifier used in the inline body's sourceURL.
 * @param registry - Optional in-WC registry of named handlers.
 * @returns A {@link JssmHookInstallSpec} describing what to install.
 * @throws Error - On mutual-exclusion violation, unknown kind, or unresolved name.
 */
export function parse_hook_element(el, debug_id, registry) {
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
    const user_handler = handler_attr === null
        ? compile_inline_body(body_text, debug_id)
        : resolve_named_handler(handler_attr, registry);
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
 * @param spec    - The parsed install spec carrying the user handler.
 * @param machine - The owning machine; used by the proxy's `state()`.
 * @returns A wrapped handler suitable for `set_hook`.
 */
export function wrap_user_handler(spec, machine) {
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
 * @param spec    - The parsed install spec.
 * @param wrapped - The wrapped (friendly-proxy) handler from {@link wrap_user_handler}.
 * @returns A descriptor object for `set_hook`/`remove_hook`.
 */
export function build_hook_descriptor(spec, wrapped) {
    const base = { kind: spec.kind, handler: wrapped };
    if (spec.from !== undefined)
        base.from = spec.from;
    if (spec.to !== undefined)
        base.to = spec.to;
    if (spec.action !== undefined)
        base.action = spec.action;
    return base;
}
