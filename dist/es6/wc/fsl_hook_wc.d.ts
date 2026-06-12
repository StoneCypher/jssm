/**
 * Minimal shape of jssm's native hook context required by the friendly
 * proxy.  Kept as an interface (rather than re-exporting jssm's full
 * `HookContext`/`HookComplexResult` types) because jssm's `set_hook` is
 * happy to receive a handler typed as `Function`-ish and we want this
 * module independent of those internal types.
 */
export interface RawHookContext {
    data?: unknown;
    next_data?: unknown;
    from?: string;
    to?: string;
    action?: string;
}
/**
 * The discriminator strings that may appear in `<fsl-hook kind="...">` /
 * `<jssm-hook kind="...">`.  Mirrors jssm's pre-transition hook kinds;
 * post-transition and "everything" variants are intentionally left out of
 * v1 of the declarative tag.
 *
 * @see {@link Machine.set_hook}
 */
export declare type FslHookKind = 'hook' | 'named' | 'any transition' | 'standard transition' | 'main transition' | 'forced transition' | 'entry' | 'exit' | 'any action' | 'global action';
/** @deprecated Use {@link FslHookKind} instead; kept for backwards compat. */
export declare type JssmHookKind = FslHookKind;
/**
 * Friendly proxy surface that wraps jssm's native `HookContext` for the
 * declarative `<fsl-hook>` / `<jssm-hook>` form.  User-authored handlers
 * (named function or inline body) receive an `m` of this shape rather than
 * the raw hook context.
 *
 * `data` is read/write — mutating it flows back into the synthesized
 * `HookComplexResult` so jssm commits the new value.  The remaining fields
 * are read-only views of the underlying context.
 *
 * `state()` returns the live machine state at the time the hook fires.  It
 * defers to the underlying machine rather than reading a snapshot so it
 * works inside `entry`/`exit` hooks where `from`/`to` differ from the
 * machine's stored `_state` at hook time.
 *
 * @example
 *   function incr(m) {
 *     m.data = (m.data ?? 0) + 1;
 *   }
 */
export interface FslHookProxy<TData = unknown> {
    data: TData;
    readonly from: string | undefined;
    readonly to: string | undefined;
    readonly action: string | undefined;
    state(): string;
}
/** @deprecated Use {@link FslHookProxy} instead; kept for backwards compat. */
export declare type JssmHookProxy<TData = unknown> = FslHookProxy<TData>;
/**
 * Type of a user-authored declarative-hook handler.  The return value is
 * checked: an explicit `false` cancels the transition; any other value
 * (including `undefined`, `true`, or an arbitrary object) allows it.
 */
export declare type FslHookUserHandler<TData = unknown> = (m: FslHookProxy<TData>) => unknown;
/** @deprecated Use {@link FslHookUserHandler} instead; kept for backwards compat. */
export declare type JssmHookUserHandler<TData = unknown> = FslHookUserHandler<TData>;
/**
 * Optional per-instance registry of named handlers.  Looked up before
 * `globalThis` when resolving `<fsl-hook handler="name">` /
 * `<jssm-hook handler="name">`.  Provided as a `Map` so consumers can
 * register their own handlers without polluting the global namespace; useful
 * for module-scoped SPAs where strict CSP blocks inline-body hooks.
 */
export declare type FslHookRegistry = Map<string, FslHookUserHandler<unknown>>;
/** @deprecated Use {@link FslHookRegistry} instead; kept for backwards compat. */
export declare type JssmHookRegistry = FslHookRegistry;
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
export declare function make_hook_proxy<TData = unknown>(ctx: {
    data?: TData;
    from?: string;
    to?: string;
    action?: string;
}, machine: {
    state(): unknown;
}): FslHookProxy<TData>;
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
export declare function compile_inline_body<TData = unknown>(body: string, debug_id: string): FslHookUserHandler<TData>;
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
export declare function resolve_named_handler<TData = unknown>(name: string, registry?: FslHookRegistry): FslHookUserHandler<TData>;
/**
 * Validate and normalize a `<jssm-hook kind="...">` value, defaulting to
 * `"hook"` when the attribute is absent.  Throws on unknown kinds rather
 * than silently doing nothing later.
 *
 * @param raw - The raw attribute value, or null if not present.
 * @returns The normalized {@link JssmHookKind}.
 * @throws Error - On an unknown kind.
 */
export declare function normalize_hook_kind(raw: string | null | undefined): FslHookKind;
/**
 * Resolved description of a single `<fsl-hook>` / `<jssm-hook>` element,
 * ready to install.  Carries the kind, optional name, the user handler to
 * wrap, and the descriptor pieces needed by `set_hook` / `remove_hook`.
 *
 * Wrapping into a `HookDescription<unknown>` is deferred to the caller so
 * the friendly-proxy wrapper closes over both the underlying machine and
 * the registry at install time.
 */
export interface FslHookInstallSpec {
    kind: FslHookKind;
    name: string | undefined;
    from: string | undefined;
    to: string | undefined;
    action: string | undefined;
    user_handler: FslHookUserHandler<unknown>;
}
/** @deprecated Use {@link FslHookInstallSpec} instead; kept for backwards compat. */
export declare type JssmHookInstallSpec = FslHookInstallSpec;
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
export declare function parse_hook_element(el: HTMLElement, debug_id: string, registry?: FslHookRegistry): FslHookInstallSpec;
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
export declare function wrap_user_handler(spec: FslHookInstallSpec, machine: {
    state(): unknown;
}): (ctx: RawHookContext) => unknown;
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
export declare function build_hook_descriptor(spec: FslHookInstallSpec, wrapped: (ctx: RawHookContext) => unknown): Record<string, unknown>;
