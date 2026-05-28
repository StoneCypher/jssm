import type { Machine } from '../jssm.js';

/**
 * Minimal shape of jssm's native hook context required by the friendly
 * proxy.  Kept as an interface (rather than re-exporting jssm's full
 * `HookContext`/`HookComplexResult` types) because jssm's `set_hook` is
 * happy to receive a handler typed as `Function`-ish and we want this
 * module independent of those internal types.
 */
export interface RawHookContext {
  data?     : unknown;
  next_data?: unknown;
  from?     : string;
  to?       : string;
  action?   : string;
}

/**
 * The discriminator strings that may appear in `<jssm-hook kind="...">`.
 * Mirrors jssm's pre-transition hook kinds; post-transition and "everything"
 * variants are intentionally left out of v1 of the declarative tag.
 *
 * @see {@link Machine.set_hook}
 */
export type JssmHookKind =
  | 'hook'
  | 'named'
  | 'any transition'
  | 'standard transition'
  | 'main transition'
  | 'forced transition'
  | 'entry'
  | 'exit'
  | 'any action'
  | 'global action';

const VALID_KINDS: ReadonlySet<string> = new Set<JssmHookKind>([
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
 * Friendly proxy surface that wraps jssm's native `HookContext` for the
 * declarative `<jssm-hook>` form.  User-authored handlers (named function or
 * inline body) receive an `m` of this shape rather than the raw hook context.
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
export interface JssmHookProxy<TData = unknown> {
  data           : TData;
  readonly from  : string | undefined;
  readonly to    : string | undefined;
  readonly action: string | undefined;
  state(): string;
}

/**
 * Type of a user-authored declarative-hook handler.  The return value is
 * checked: an explicit `false` cancels the transition; any other value
 * (including `undefined`, `true`, or an arbitrary object) allows it.
 */
export type JssmHookUserHandler<TData = unknown> =
  (m: JssmHookProxy<TData>) => unknown;

/**
 * Optional per-instance registry of named handlers.  Looked up before
 * `globalThis` when resolving `<jssm-hook handler="name">`.  Provided as a
 * `Map` so consumers can register their own handlers without polluting the
 * global namespace; useful for module-scoped SPAs where strict CSP blocks
 * inline-body hooks.
 */
export type JssmHookRegistry = Map<string, JssmHookUserHandler<unknown>>;

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
export function make_hook_proxy<TData = unknown>(
  ctx: { data?: TData; from?: string; to?: string; action?: string },
  machine: { state(): unknown },
): JssmHookProxy<TData> {

  return {
    get data(): TData {
      return ctx.data as TData;
    },
    set data(next: TData) {
      ctx.data = next;
    },
    get from(): string | undefined {
      return ctx.from;
    },
    get to(): string | undefined {
      return ctx.to;
    },
    get action(): string | undefined {
      return ctx.action;
    },
    state(): string {
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
export function compile_inline_body<TData = unknown>(
  body: string,
  debug_id: string,
): JssmHookUserHandler<TData> {

  const annotated = `//# sourceURL=jssm-hook:${debug_id}\n${body}`;
  const ctor = Function as unknown as new (arg: string, body: string) => JssmHookUserHandler<TData>;
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
export function resolve_named_handler<TData = unknown>(
  name: string,
  registry?: JssmHookRegistry,
): JssmHookUserHandler<TData> {

  if (registry !== undefined) {
    const registered = registry.get(name);
    if (registered !== undefined) {
      return registered as JssmHookUserHandler<TData>;
    }
  }

  const global = (globalThis as Record<string, unknown>)[name];
  if (typeof global === 'function') {
    return global as JssmHookUserHandler<TData>;
  }

  throw new Error(
    `<jssm-hook handler="${name}">: handler not found in registry or globalThis`,
  );

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
export function normalize_hook_kind(raw: string | null | undefined): JssmHookKind {

  if (raw === null || raw === undefined || raw === '') {
    return 'hook';
  }

  if (!VALID_KINDS.has(raw)) {
    throw new Error(
      `<jssm-hook kind="${raw}">: unknown hook kind (expected one of: ${[...VALID_KINDS].join(', ')})`,
    );
  }

  return raw as JssmHookKind;

}

/**
 * Resolved description of a single `<jssm-hook>` element, ready to install.
 * Carries the kind, optional name, the user handler to wrap, and the
 * descriptor pieces needed by `set_hook` / `remove_hook`.
 *
 * Wrapping into a `HookDescription<unknown>` is deferred to the caller so
 * the friendly-proxy wrapper closes over both the underlying machine and
 * the registry at install time.
 */
export interface JssmHookInstallSpec {
  kind        : JssmHookKind;
  name        : string | undefined;
  from        : string | undefined;
  to          : string | undefined;
  action      : string | undefined;
  user_handler: JssmHookUserHandler<unknown>;
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
export function parse_hook_element(
  el       : HTMLElement,
  debug_id : string,
  registry?: JssmHookRegistry,
): JssmHookInstallSpec {

  const handler_attr = el.getAttribute('handler');
  const raw_text     = el.textContent;
  const body_text    = (raw_text === null ? '' : raw_text).trim();

  if (handler_attr !== null && body_text.length > 0) {
    throw new Error(
      '<jssm-hook>: specify handler="name" OR inline body, not both',
    );
  }

  if (handler_attr === null && body_text.length === 0) {
    throw new Error(
      '<jssm-hook>: must specify either handler="name" attribute or an inline body',
    );
  }

  const user_handler: JssmHookUserHandler<unknown> = handler_attr !== null
    ? resolve_named_handler(handler_attr, registry)
    : compile_inline_body(body_text, debug_id);

  const kind = normalize_hook_kind(el.getAttribute('kind'));

  // Convert null → undefined so downstream descriptors omit absent keys.
  const from   = el.getAttribute('from')   ?? undefined;
  const to     = el.getAttribute('to')     ?? undefined;
  const action = el.getAttribute('action') ?? undefined;
  const name   = el.getAttribute('name')   ?? undefined;

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
export function wrap_user_handler(
  spec   : JssmHookInstallSpec,
  machine: { state(): unknown },
): (ctx: RawHookContext) => unknown {

  const user = spec.user_handler;

  return (ctx: RawHookContext): unknown => {
    const proxy  = make_hook_proxy(ctx, machine);
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
export function build_hook_descriptor(
  spec    : JssmHookInstallSpec,
  wrapped : (ctx: RawHookContext) => unknown,
): Record<string, unknown> {

  const base: Record<string, unknown> = { kind: spec.kind, handler: wrapped };

  if (spec.from   !== undefined) base.from   = spec.from;
  if (spec.to     !== undefined) base.to     = spec.to;
  if (spec.action !== undefined) base.action = spec.action;

  return base;

}
