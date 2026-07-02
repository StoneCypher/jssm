import { LitElement, TemplateResult, type PropertyValues } from 'lit';
import { Machine } from '../jssm.js';
import { FslHookRegistry } from './fsl_hook_wc.js';
import { type ThemeMode, type ThemeRegistry } from './fsl_themes.js';
/**
 * Allow-list of event names accepted by `<jssm-on event="...">`.  Must stay
 * in sync with the `JssmEventName` union in `jssm_types.ts` (the library's
 * `machine.on(...)` event API, added in #638).  Validating here gives the
 * declarative wiring a clear "unknown event name" error at the WC layer
 * instead of relying on a downstream library throw whose message would
 * mention `machine.on(...)` rather than the offending tag.
 */
export declare const JSSM_ON_EVENT_NAMES: Set<string>;
/**
 * Internal shape produced by {@link parse_jssm_on_element}: a fully-parsed
 * `<jssm-on>` directive ready to be installed on a machine.  Either
 * `handler_name` (form A — named lookup) or `inline_body` (form B —
 * dynamic function) is populated, never both.  Validation errors are
 * surfaced as a thrown `Error` from the parser rather than carried in this
 * record, so by the time a consumer sees a `ParsedJssmOn` it's known good.
 */
export interface ParsedJssmOn {
    event: string;
    handler_name: string | undefined;
    inline_body: string | undefined;
    once: boolean;
    name: string | undefined;
    /** Filter object suitable to pass as `machine.on(name, filter, fn)` — `undefined` means no filter. */
    filter: Record<string, string> | undefined;
}
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
export declare function parse_jssm_on_element(el: HTMLElement): ParsedJssmOn;
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
export declare const jssm_handler_registry: Map<string, (...args: unknown[]) => unknown>;
/**
 * Resolve a named handler from the registry, then from `globalThis`.
 * Throws if neither lookup finds a function — earlier failure here is
 * better than a delayed "is not a function" at first event delivery.
 *
 * @param name - The handler name as supplied by `handler="..."`.
 * @returns The resolved function.
 * @throws If no function is registered under `name`.
 */
export declare function resolve_named_handler(name: string): (e: unknown) => void;
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
export declare function compile_inline_body(body: string, source_id: string): (e: unknown) => void;
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
 * Valid `layout` values for {@link FslInstance}:
 * `''` stacked (default) · `'lr'`/`'rl'` side-by-side (editor left / right) ·
 * `'tb'`/`'bt'` stacked panes (editor top / bottom) · `'editor'`/`'viewer'`
 * single pane · `'tabs'` one pane at a time · `'auto'` by viewport aspect.
 */
export declare type FslLayout = '' | 'lr' | 'rl' | 'tb' | 'bt' | 'editor' | 'viewer' | 'tabs' | 'auto';
/** Which pane the tabbed layout currently shows. */
export declare type FslTab = 'viz' | 'editor';
/**
 * How a panel's visibility is governed, per-panel or as the control-level
 * default: `hide` (never shown, locked), `show` (always shown, locked),
 * `default` (the built-in default — only the editor + renderer show), or
 * `request` (like `default`, but panels the FSL requests are shown). The
 * requested-panels source is the editor-defaults-in-FSL mechanism (fsl#1334);
 * until that lands, {@link FslInstance.requestedPanels} is the embedder-set
 * stand-in it reads.
 */
export declare type PanelMode = 'hide' | 'show' | 'default' | 'request';
/**
 * Resolve `layout="auto"` to a concrete split direction from the viewport
 * shape: side-by-side (`'lr'`) when at least as wide as tall, else stacked
 * (`'tb'`). Pure, so it's testable without a laid-out DOM.
 *
 * @example
 *   auto_mode(1200, 800);   // => 'lr'
 *   auto_mode(600, 900);    // => 'tb'
 */
export declare function auto_mode(width: number, height: number): 'lr' | 'tb';
/**
 * Clamp a gutter-drag coordinate to a split ratio (percent of the first pane).
 * Pure so it's testable without a laid-out DOM: returns a neutral `50` when the
 * container has no measured size (e.g. jsdom, where `getBoundingClientRect`
 * yields zeros), and otherwise clamps to `[15, 85]` so neither pane collapses.
 *
 * @example
 *   split_ratio(30, 0, 100);   // => 30
 *   split_ratio(5,  0, 100);   // => 15  (clamped low)
 *   split_ratio(0,  0, 0);     // => 50  (no layout)
 */
export declare function split_ratio(coord: number, start: number, size: number): number;
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
 * @slot stochastic - Slot for the stochastic analysis panel (`<fsl-stochastic>`, fsl#1384).
 * @slot export - Slot for the export menu (`<fsl-export>`, #667).
 * @slot footer - Footer slot.
 */
export declare class FslInstance extends LitElement {
    /** Bind this instance to a URL-fragment segment keyed by its `uhash`/`id`
     *  (inert if it has neither): restore on connect, write debounced on edit. */
    constructor();
    static styles: import("lit").CSSResult;
    /**
     * FSL source attribute.  When non-empty, this is the sole channel
     * supplying the machine's source.  Setting both this and a child
     * `<script type="text/fsl">` (or non-empty text content) is an error.
     */
    fsl: string;
    /**
     * Panel arrangement of the viz + editor panes (see {@link FslLayout}). `''`
     * (default) renders the stacked sections; `'lr'`/`'rl'` lay them side-by-side
     * with a draggable vertical gutter (editor left / right); `'tb'`/`'bt'` stack
     * them with a horizontal gutter; `'editor'`/`'viewer'` show a single pane;
     * `'tabs'` shows one pane at a time behind a tab strip; `'auto'` follows the
     * viewport aspect. Other panels (toolbar, info-panel, …) render below.
     */
    layout: FslLayout;
    /**
     * Theme **mode**, reflected to the `theme` attribute: `system` (follow the OS
     * `prefers-color-scheme`), `light`, or `dark`. Combined with {@link themeName}
     * it selects a palette from {@link themes}, applied as inline `--fsl-color-*`
     * by {@link _applyTheme}. `<fsl-toolbar>` sets this from its theme pulldown.
     */
    theme: ThemeMode;
    /**
     * Selected theme name, reflected to the `theme-name` attribute. A key of
     * {@link themes}; an unknown name falls back to the built-in `Default`.
     */
    themeName: string;
    /**
     * The theme registry — named light/dark palette pairs. Defaults to the
     * built-in `Default` + `Solarized`; a consumer can replace or extend it, and
     * every entry appears in the toolbar's theme list.
     */
    themes: ThemeRegistry;
    /**
     * Initial extended-state data seeded into the machine at build time. When set
     * (to anything other than `undefined`), the machine is built via `from(fsl,
     * { data })` so `<fsl-data-inspector>` has something to show before any
     * transition; the default keeps the lighter `sm`-tag build path.
     */
    data: unknown;
    /** Split ratio (percent of the first pane), updated by the gutter drag. */
    private _split;
    /** Which pane the tabbed layout shows. */
    private _tab;
    /** Concrete direction that `layout="auto"` currently resolves to. */
    private _autoMode;
    /** Window-resize listener installed while `layout="auto"`, or null. */
    private _autoListener;
    /** Per-panel runtime visibility overrides set by the user via the toolbar
     *  toggles; a slot absent here falls back to its mode-resolved base. */
    private _overrides;
    /** Control-level default {@link PanelMode}; {@link panelModes} overrides it
     *  per panel. `default` shows only the editor + renderer; every other panel
     *  starts hidden and is opt-in. */
    panelMode: PanelMode;
    /** Per-panel {@link PanelMode} overrides (slot → mode), each overriding the
     *  control-level {@link panelMode}. */
    panelModes: Record<string, PanelMode>;
    /** Panels the FSL "requests" — the embedder-set stand-in for the
     *  editor-defaults-in-FSL mechanism (fsl#1334). `request`-mode panels listed
     *  here are shown; others fall back to the default. */
    requestedPanels: string[];
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
     * Live unsubscribe callbacks for #645 `<fsl-bind>` / `data-jssm-bind`
     * projections.  Every entry must be invoked exactly once during
     * {@link disconnectedCallback}.
     */
    private _unsubs;
    /**
     * Unsubscribe callbacks for every `machine.on(...)` / `machine.once(...)`
     * subscription installed from a `<jssm-on>` child during
     * `connectedCallback`.  Walked in `disconnectedCallback`.
     */
    private _on_unsubscribes;
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
    private static readonly REEMITTED_EVENTS;
    /**
     * Unsubscribe callbacks for the host-level mechanism-4 re-emission
     * subscriptions installed in {@link _install_event_reemission}.  Distinct
     * from {@link _on_unsubscribes} (which belongs to `<jssm-on>` children).
     */
    private _reemit_unsubscribes;
    /**
     * Library events captured during the current transition, awaiting DOM
     * re-dispatch once Lit commits the next render.  Dispatching here (rather
     * than synchronously from the machine subscription) guarantees the #639
     * ordering: mechanism 1/3 reflection and mechanism 2 slot re-pick are all
     * in place before a mechanism-4 listener runs.
     */
    private _pending_dom_events;
    /**
     * Per-instance registry of named hook handlers consulted before
     * `globalThis` when resolving `<fsl-hook handler="name">` /
     * `<jssm-hook handler="name">`.
     */
    readonly registry: FslHookRegistry;
    /**
     * Descriptors for hooks this WC installed at connect time.
     */
    private _installed_hooks;
    /**
     * Counter for compiled inline-body hook debug ids.
     */
    private _hook_debug_counter;
    /**
     * DOM listeners installed by `<jssm-action>` / `data-jssm-action` discovery.
     */
    private _action_listeners;
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
        layout: {
            type: StringConstructor;
            reflect: boolean;
        };
        theme: {
            type: StringConstructor;
            reflect: boolean;
        };
        themeName: {
            type: StringConstructor;
            attribute: string;
            reflect: boolean;
        };
        themes: {
            type: ObjectConstructor;
            reflect: boolean;
        };
        data: {
            type: ObjectConstructor;
            reflect: boolean;
        };
        panelMode: {
            type: StringConstructor;
            attribute: string;
            reflect: boolean;
        };
        panelModes: {
            type: ObjectConstructor;
            attribute: boolean;
        };
        requestedPanels: {
            type: ArrayConstructor;
            attribute: boolean;
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
     * Convenience wrapper for `machine.transition(state, data)` — moves directly
     * to a state along a legal (non-forced) edge. Reflects the new state and
     * requests an update, exactly as {@link FslInstance.do} does for actions.
     *
     * @param state - The destination state.
     * @param data - Optional data payload.
     * @returns `true` if the transition succeeded (a legal edge existed).
     */
    transition(state: string, data?: unknown): boolean;
    /**
     * Convenience wrapper for `machine.force_transition(state, data)` — moves to a
     * state along any edge, including forced-only ones. Reflects the new state and
     * requests an update.
     *
     * @param state - The destination state.
     * @param data - Optional data payload.
     * @returns `true` if the forced transition succeeded (any edge existed).
     */
    force_transition(state: string, data?: unknown): boolean;
    /**
     * Convenience wrapper for `machine.state()`.  Returns the current
     * state's name.
     */
    state(): string;
    /** Tracks the OS color scheme; null when `matchMedia` is unavailable. */
    private _mql;
    /** Re-apply on an OS color-scheme change — only relevant while in `system` mode. */
    private _on_os_theme_change;
    /** Whether the OS currently prefers a dark color scheme. */
    private _prefers_dark;
    /**
     * Resolve `theme` (mode) × `themeName` to a palette and apply it: write the
     * `--fsl-color-*` tokens inline (overriding the CSS fallback and cascading to
     * every slotted widget), reflect the chosen variant to `resolved-theme`, and
     * drive each slotted editor's light/dark CodeMirror theme.
     */
    private _applyTheme;
    /**
     * Gutter pointer-down: begin a drag. Move/up are attached to the document so
     * the drag survives the pointer leaving the thin gutter (no pointer-capture,
     * which keeps the handlers testable in jsdom).
     */
    private _onGutterDown;
    /** Document pointer-move during a drag: recompute the split ratio. */
    private _onGutterMove;
    /** Resolve the active layout to a concrete mode (`'auto'` → a direction). */
    private _effectiveMode;
    /** Tab strip for the `tabs` layout. */
    private _renderTabbar;
    /** Switch the visible pane in the `tabs` layout. */
    private _setTab;
    /** The built-in default hidden state: only the editor + renderer (viz) show. */
    private _defaultHidden;
    /**
     * Whether the panel slotted under `slot` is currently hidden, resolving its
     * {@link PanelMode} ({@link panelModes} for the slot, else {@link panelMode}):
     * `hide`/`show` force the state; otherwise a user toggle wins, then a
     * `request`ed panel shows, then the built-in default.
     *
     * @param slot - A panel slot name (e.g. `"viz"`, `"editor"`, `"history"`).
     * @returns `true` when the panel is hidden.
     *
     * @example
     * el.panelModes = { history: 'show' };
     * el.isPanelHidden('history'); // false
     */
    isPanelHidden(slot: string): boolean;
    /**
     * Show or hide the panel slotted under `slot` (a runtime override). Hiding
     * `viz` or `editor` collapses that workbench pane (the other fills); hiding
     * an aux panel removes its section. `<fsl-toolbar>` drives this from its
     * panel toggles.
     *
     * @param slot   - A panel slot name (e.g. `"viz"`, `"editor"`, `"history"`).
     * @param hidden - `true` to hide, `false` to show.
     */
    setPanelHidden(slot: string, hidden: boolean): void;
    /**
     * Toggle the visibility of the panel slotted under `slot`. A no-op when the
     * panel's mode is `hide` or `show` — those lock the visibility.
     *
     * @param slot - A panel slot name (e.g. `"viz"`, `"editor"`, `"history"`).
     */
    togglePanel(slot: string): void;
    /**
     * Install or remove the window-resize listener that resolves `layout="auto"`
     * to a concrete direction. Called from {@link updated}; uses the viewport
     * aspect so it needs no layout measurement (works in jsdom).
     */
    private _syncAutoListener;
    /** Document pointer-up: end the drag and detach the document listeners. */
    private _onGutterUp;
    /** Gutter double-click: reset the split to 50/50. */
    private _onGutterReset;
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
     * True when this instance owns a URL permalink segment (keyed by its
     * `uhash`/`id`) that a pending {@link FslPermalinkSync} restore will turn into
     * its FSL source — so `connectedCallback` can defer the machine build to that
     * restore instead of throwing on an otherwise-absent source.
     */
    private _permalinkSegmentPresent;
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
    private _install_jssm_on_children;
    /**
     * Discover every direct-child `<jssm-hook>` element and install each
     * against the owned machine.  Handlers are wrapped with the friendly-proxy
     * adapter that lets user code write `m.data = ...` and return `false` to
     * cancel — see {@link make_hook_proxy} and the issue (#641) doc-comment
     * for the full contract.
     */
    private _install_declarative_hooks;
    /**
     * Prefix used in synthetic `//# sourceURL=jssm-hook:<prefix><n>` annotations
     * for inline-body hooks compiled by this element.
     */
    private _hook_id_prefix;
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
    private _install_event_reemission;
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
    /**
     * Lit lifecycle. After the initial connect, a change to the `fsl` property
     * (e.g. written back by a bound `<fsl-editor>`, #1387) rebuilds the machine.
     * The first update is skipped via `hasUpdated` — `connectedCallback` already
     * built the initial machine.
     */
    protected willUpdate(changed: PropertyValues): void;
    /**
     * Rebuild the owned machine from the current `fsl` property and re-install
     * every machine-scoped subscription against the new machine (#1387).
     *
     * Semantics:
     *   - **Keep-last-good:** if the new FSL is empty or fails to parse/compile,
     *     the current machine is left untouched (a bound editor's lint surfaces
     *     the error); we never blank or throw on mid-edit invalid source.
     *   - **Reset-to-start:** a successful rebuild is a fresh machine at its
     *     start state — the structure changed, so preserving position is unsafe.
     *   - **Re-subscribe:** mechanism-4 re-emission, `<fsl-hook>`, `<fsl-on>`,
     *     and `<fsl-bind>` projections are torn down from the old machine and
     *     re-installed on the new one. DOM action listeners (`<fsl-action>`)
     *     persist untouched — they read `this.machine` live.
     */
    /**
     * Build a machine from FSL source, seeding {@link data} when it is set.
     *
     * @param fsl_source - The FSL string to compile.
     * @returns The compiled machine.
     */
    private _build_machine;
    /** Adopt the FSL's `editor: {}` panel request (fsl#1334): when the machine
     *  declares `panels`, drive {@link requestedPanels} from it so `request` panel
     *  mode honors the source. The embedder's value persists when the FSL is
     *  silent. Called after each (re)build, with `_machine` freshly assigned. */
    private _applyEditorConfig;
    private _rebuild_machine;
    updated(changed: PropertyValues): void;
    /**
     * Dispatch and clear the queue of pending DOM events.  The queue is
     * snapshotted and reset *before* dispatching so that a listener which
     * re-enters the machine (e.g. calls `host.machine.action(...)`
     * synchronously) enqueues into a fresh batch handled by the next update
     * cycle, rather than mutating the array mid-iteration.  This is the
     * documented re-entrancy behavior: re-entrant transitions are deferred,
     * not dropped.
     */
    private _flush_pending_dom_events;
    /**
     * Release every machine-scoped subscription installed against the current
     * machine: #639 mechanism-4 re-emission, #641 `<fsl-hook>` registrations,
     * #643 `<fsl-on>` subscriptions, and #645 `<fsl-bind>` projections. Shared by
     * {@link disconnectedCallback} (full teardown) and the live-rebuild path
     * ({@link _rebuild_machine}, #1387), which re-installs against the new machine.
     * DOM action listeners (`<fsl-action>`) are NOT touched here — they read
     * `this.machine` live and survive a rebuild.
     */
    private _unbind_machine_subscriptions;
    /**
     * Lifecycle hook.  Cleans up everything the WC installed at connect: hook
     * registrations from `<jssm-hook>`, event subscriptions from `<jssm-on>`,
     * mechanism-4 re-emission subscriptions, and DOM listeners from
     * `<jssm-action>` / `data-jssm-action`.
     */
    disconnectedCallback(): void;
    /**
     * Wire DOM events to machine actions, using the two declarative forms from
     * issue #640.  Both forms support optional `from-state` guards,
     * `from-property` data extraction, and `prevent-default` /
     * `stop-propagation` modifiers.
     */
    private _discover_jssm_actions;
    /**
     * Attach one DOM listener that translates a DOM event into a
     * `machine.action(...)` call, honoring the configured modifiers.
     */
    private _install_action_listener;
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
    /** The stacked middle panels, shared by both layouts. The toolbar slot is
     *  rendered at the top of {@link render}. In split mode the `hook-log` (events)
     *  and `data-inspector` panels are lifted out into easing side docks, so
     *  `docked` is true there and they are skipped here to avoid duplicating
     *  their slots; `actions` instead lives here as a horizontal bar. The
     *  state-section + footer stay in {@link render} so the dynamic state-slot
     *  name binds at the top level.
     *
     *  @param docked - True when hook-log + data-inspector are rendered as side
     *  docks (split layouts); they are then omitted from this stack. */
    private _renderAuxPanels;
}
/** @deprecated Use `FslInstance` instead; kept for backwards compat. */
export declare type JssmInstance = FslInstance;
declare global {
    interface HTMLElementTagNameMap {
        'fsl-instance': FslInstance;
        'jssm-instance': FslInstance;
    }
}
