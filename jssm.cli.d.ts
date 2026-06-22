/**
 * Render targets supported in v1. Future targets (mermaid, plantuml, scxml,
 * ascii, fsl) will be added in v0.2+.
 */
declare type RenderTarget = 'svg' | 'dot' | 'png' | 'jpeg' | 'html';
/**
 * Options accepted by `render()` and `renderSet()`.
 *
 * `width`, `height`, and `scale` size raster output and are mutually
 * exclusive: `width`/`height` fit to an exact pixel extent, `scale` is a
 * zoom percentage (100 = 3x the SVG's natural size). They are silently
 * ignored for text targets (svg/dot/html).
 */
interface RenderOptions {
    target: RenderTarget;
    width?: number;
    height?: number;
    scale?: number;
    quality?: number;
}
/**
 * A text-shaped render result (svg / dot / html).
 */
interface TextResult {
    target: Extract<RenderTarget, 'svg' | 'dot' | 'html'>;
    kind: 'text';
    content: string;
}
/**
 * A raster-shaped render result (png / jpeg).
 */
interface RasterResult {
    target: Extract<RenderTarget, 'png' | 'jpeg'>;
    kind: 'raster';
    buffer: Uint8Array;
}
declare type RenderResult = TextResult | RasterResult;
/**
 * Base error class for render-time failures.
 */
declare class RenderError extends Error {
    readonly path?: string;
    readonly line?: number;
    readonly column?: number;
    constructor(message: string, opts?: {
        path?: string;
        line?: number;
        column?: number;
    });
}
/**
 * Thrown when raster output is requested in a runtime that supports neither
 * native OffscreenCanvas nor `@resvg/resvg-wasm`.
 */
declare class RasterizationUnsupportedError extends RenderError {
    constructor(message: string);
}

/**
 * Render a single FSL source string to the requested output format.
 *
 * Returns a discriminated union: `kind: 'text'` for SVG / DOT / HTML, and
 * `kind: 'raster'` for PNG / JPEG. Use `kind` to narrow before accessing
 * `content` or `buffer`.
 *
 * @param fsl - FSL source text
 * @param opts.target - Output format ('svg' | 'dot' | 'png' | 'jpeg' | 'html')
 * @param opts.width - Fit raster output to this pixel width (raster only)
 * @param opts.height - Fit raster output to this pixel height (raster only)
 * @param opts.scale - Raster zoom percentage; 100 = 3x natural size (raster only)
 * @param opts.quality - JPEG quality 1-100 (silently ignored for non-jpeg)
 * @returns RenderResult, discriminated by `kind`
 * @throws RenderError on parse, render, or target-dispatch failures
 * @throws RasterizationUnsupportedError on raster targets where no backend exists
 *
 * @example
 *   const r = await render(fslText, { target: 'svg' });
 *   if (r.kind === 'text') console.log(r.content);
 */
declare function render(fsl: string, opts: RenderOptions): Promise<RenderResult>;

interface RenderSetItemOk {
    ok: true;
    index: number;
    result: RenderResult;
}
interface RenderSetItemErr {
    ok: false;
    index: number;
    error: Error;
}
declare type RenderSetItem = RenderSetItemOk | RenderSetItemErr;
/**
 * Render multiple FSL source strings in parallel, returning one result
 * per input. Errors are captured per-input rather than aborting the whole
 * batch: callers can inspect which inputs succeeded and which failed.
 *
 * @param inputs - Array of FSL source strings
 * @param opts - Render options applied to every input
 * @returns Array of per-input results, same length and order as `inputs`
 *
 * @example
 *   const results = await renderSet([fsl1, fsl2], { target: 'svg' });
 *   for (const item of results) {
 *     if (item.ok) console.log('rendered #', item.index);
 *     else        console.error('failed #', item.index, item.error.message);
 *   }
 */
declare function renderSet(inputs: string[], opts: RenderOptions): Promise<RenderSetItem[]>;

/**
 * Types for the `codegen` CLI verb — FSL → host *source*.
 *
 * `codegen` emits an **executable implementation** of a machine for a host
 * runtime (megaspec §25). It is deliberately distinct from its siblings:
 *   - `render`  → images for eyes,
 *   - `typegen` → *declarations* a caller compiles against (no behavior),
 *   - `codegen` → *source* that, when run on its host, behaves as the machine.
 *
 * Targets are addressed by `host:library` coordinates. A `native:*` target
 * emits source against FSL's own certified runtime for that host (T1–T3, §26);
 * adapter targets (xstate/stent/…) are a later, separately-gated seam.
 *
 * These types live in their own module rather than the shared `types.ts` so
 * the codegen verb can grow without touching render's surface.
 */
/**
 * The set of code-generation targets recognized in this build, as
 * `host:library` coordinates.
 *
 * `native:typescript` and `native:javascript` emit a self-contained
 * implementation against FSL's own minimal runtime (no third-party import) —
 * the first two `native:*` targets. Adapter targets (e.g. `xstate:xstate`)
 * arrive later through the same coordinate seam.
 */
declare type CodegenTarget = 'native:typescript' | 'native:javascript';
/**
 * Options accepted by `codegen()` and `codegenSet()`.
 */
interface CodegenOptions {
    /** The `host:library` target coordinate. */
    target: CodegenTarget;
    /**
     * Symbol name for the generated machine class/factory. Defaults to a name
     * derived from the source label, falling back to `Machine`.
     */
    name?: string;
    /**
     * Run the conformance suite against the emitted artifact before returning
     * (`--certify`, §26). Off by default. A reserved hook in this build: the
     * conformance harness is gated on the runtime landing (§25 verb phasing),
     * so requesting it on an un-certifiable target is a structured refusal
     * rather than a silent pass.
     */
    certify?: boolean;
    /**
     * A coarse work budget in milliseconds for long-running generation
     * (`--budget`, the agent verb contract). `0` / omitted means "no budget".
     * Exceeding it yields an `undecided`-style refusal rather than a hang.
     */
    budgetMs?: number;
    /**
     * Clock used for the budget check. A test seam; defaults to `Date.now`.
     * Never set by the CLI — present only so the budget-exceeded branch is
     * deterministically exercisable without depending on wall-clock timing.
     */
    now?: () => number;
}
/**
 * A generated source artifact: the emitted text plus the metadata an agent or
 * build tool needs to place and trust it.
 */
interface CodegenArtifact {
    /** The target this artifact was generated for. */
    target: CodegenTarget;
    /** The host language family (`'typescript'` | `'javascript'`). */
    host: string;
    /** The conventional file extension for this artifact, without the dot. */
    extension: string;
    /** The generated source text. */
    content: string;
    /** The symbol name the artifact exposes (class/factory name). */
    symbol: string;
}
/**
 * Base error class for codegen-time failures. Carries optional source
 * location so a `--json` caller can map the failure back to FSL text.
 */
declare class CodegenError extends Error {
    readonly path?: string;
    readonly line?: number;
    readonly column?: number;
    constructor(message: string, opts?: {
        path?: string;
        line?: number;
        column?: number;
    });
}
/**
 * Thrown when generation cannot complete within the requested budget, or when
 * a gated capability (`--certify` against an un-certifiable target) is
 * requested. Distinct class so a `--json` caller can surface the third
 * answer — `undecided` — beside success and a hard failure.
 */
declare class CodegenUndecidedError extends CodegenError {
    constructor(message: string, opts?: {
        path?: string;
        line?: number;
        column?: number;
    });
}

/**
 * Generate executable host source from a single FSL document.
 *
 * Emits an *implementation* of the machine for the requested `host:library`
 * target — distinct from `render` (images) and `typegen` (declarations). The
 * `native:*` targets emit a self-contained class with no runtime dependency.
 *
 * @param fsl - FSL source text
 * @param opts.target - The `host:library` target coordinate
 * @param opts.name - Symbol name for the generated class (defaults to `Machine`)
 * @param opts.certify - Run conformance before returning (gated; see below)
 * @param opts.budgetMs - Soft work budget in ms; 0/omitted means unbounded
 * @param opts.now - Clock for the budget check (test seam; defaults to Date.now)
 * @returns The generated {@link CodegenArtifact}
 * @throws CodegenError if the FSL fails to compile or the target is unknown
 * @throws CodegenUndecidedError if `certify` is requested (conformance harness
 *   is gated on the runtime landing, §25 verb phasing) or the budget is exhausted
 *
 * @example
 *   const art = codegen("a 'go' -> b;", { target: 'native:typescript' });
 *   // art.extension === 'ts'
 *   // art.content contains "export class Machine"
 */
declare function codegen(fsl: string, opts: CodegenOptions): CodegenArtifact;

interface CodegenSetItemOk {
    ok: true;
    index: number;
    artifact: CodegenArtifact;
}
interface CodegenSetItemErr {
    ok: false;
    index: number;
    error: Error;
}
declare type CodegenSetItem = CodegenSetItemOk | CodegenSetItemErr;
/**
 * Generate host source for multiple FSL documents, returning one result per
 * input. Errors are captured per-input rather than aborting the batch — so a
 * caller learns exactly which documents generated and which failed, mirroring
 * `renderSet`.
 *
 * @param inputs - FSL source strings
 * @param opts - Codegen options applied to every input
 * @returns Per-input results, same length and order as `inputs`
 *
 * @example
 *   const results = codegenSet([fslA, fslB], { target: 'native:javascript' });
 *   for (const item of results) {
 *     if (item.ok) console.log('generated #', item.index);
 *     else         console.error('failed #', item.index, item.error.message);
 *   }
 */
declare function codegenSet(inputs: string[], opts: CodegenOptions): CodegenSetItem[];

/**
 * One named transition in the extracted surface: firing `action` while in
 * `from` moves the machine to `to`.
 */
interface SurfaceTransition {
    from: string;
    action: string;
    to: string;
}
/**
 * A host-language-neutral description of a compiled machine — exactly the
 * facts a `native:*` target needs to emit an implementation. Extracted once,
 * consumed by every target, and trivially serializable (so it is itself
 * test-inspectable without rendering source).
 */
interface MachineSurface {
    /** Every state name, declaration order. */
    states: string[];
    /** The start state (the machine's state immediately after construction). */
    initial: string;
    /** Every distinct action name (the input alphabet). */
    actions: string[];
    /** Every state that is final (terminal or complete). */
    finals: string[];
    /** Every action-bearing transition. */
    transitions: SurfaceTransition[];
    /** Every eventless/unnamed edge (an automatic transition with no action). */
    eventless: {
        from: string;
        to: string;
    }[];
}
/**
 * Compile FSL source and extract its host-agnostic {@link MachineSurface}.
 *
 * Named transitions (edges carrying an action) populate `transitions` — the
 * ones a generated `action(name)` dispatcher can fire. Eventless / unnamed
 * edges (automatic transitions with no caller-visible trigger) are surfaced
 * separately in `eventless`, which a target emits as a `step()` transition.
 *
 * @param fsl - FSL source text
 * @returns The extracted surface
 * @throws CodegenError if the FSL fails to parse or compile
 *
 * @example
 *   const s = extractSurface("a 'go' -> b;");
 *   // s.states  === ['a', 'b']
 *   // s.initial === 'a'
 *   // s.actions === ['go']
 *   // s.finals  === ['b']
 *   // s.transitions === [{ from: 'a', action: 'go', to: 'b' }]
 *   // s.eventless === []
 */
declare function extractSurface(fsl: string): MachineSurface;

declare type FlagType = 'string' | 'number' | 'boolean';
interface FlagSpec {
    short?: string;
    type?: FlagType;
    boolean?: boolean;
    enum?: readonly string[];
    default?: string | number | boolean;
}
interface ParseSpec {
    flags: Record<string, FlagSpec>;
    usage: string;
}
interface ParseResult<S extends ParseSpec> {
    positional: string[];
    flags: Record<string, string | number | boolean | undefined>;
    helpText: () => string;
}
/**
 * Parse a CLI-style argv array against a flag specification.
 *
 * Supported forms:
 *   --long=value     long flag with =
 *   --long value     long flag with space-separated value
 *   --bool           boolean long flag
 *   -s value         short flag with space value
 *   -svalue          short flag with attached value
 *   -b               boolean short flag
 *   --               terminate flag parsing; remaining args are positional
 *   -                positional (stdin sentinel)
 *
 * @param argv - The argument array to parse (e.g. process.argv.slice(2))
 * @param spec - The flag specification describing accepted flags, their types, and defaults
 * @returns A ParseResult containing positional args, parsed flag values, and a helpText() generator
 *
 * @throws Error if an unknown flag is seen, an enum value mismatches,
 *   or a numeric flag receives a non-numeric value.
 *
 * @example
 * ```ts
 * const spec = {
 *   flags: {
 *     target: { short: 't', enum: ['svg', 'png'], default: 'svg' },
 *     help:   { short: 'h', boolean: true },
 *   },
 *   usage: 'fsl-render [options] <fsl-paths...>',
 * } as const;
 *
 * const result = parseFslArgs(['--target=png', 'machine.fsl'], spec);
 * // result.flags.target === 'png'
 * // result.positional   === ['machine.fsl']
 * ```
 */
declare function parseFslArgs<S extends ParseSpec>(argv: string[], spec: S): ParseResult<S>;

/**
 * Public types and error classes for the `jssm/cli` config loader.
 *
 * This module is **Pure** — no Node API references — so it can be bundled
 * into browser, edge-worker, and other non-Node environments without
 * pulling in `fs`/`path`/`os`.
 *
 * See `notes/superpowers/specs/2026-05-22-fsl-cli-config-design.md` for the
 * full architectural design.
 */


/** Signature for an injected config-file reader (fs.readFile, fetch, etc.). */
declare type Reader = (path: string) => Promise<string>;
/** A render target alias — re-exports `RenderTarget` from the parent CLI types module so the config types stay in sync automatically. */
declare type RenderTargetName = RenderTarget;
/** Render subcommand configuration; fully populated in v1. */
interface RenderConfig {
    /** Default render target when none specified on CLI. Default: `'svg'`. */
    defaultTarget?: RenderTargetName;
    /** Output directory for multi-file render. */
    outDir?: string;
    /** Output zoom scale. Default: `3`. */
    scale?: number;
    /** Output pixel width (raster). Mutually exclusive with `height` and `scale`. */
    width?: number;
    /** Output pixel height (raster). Mutually exclusive with `width` and `scale`. */
    height?: number;
    /** JPEG quality 1-100. Default: `85`. */
    quality?: number;
    /** Named theme (reserved for issue #607). */
    theme?: string;
}
/** Lint subcommand configuration — empty in v1; fields land with issue #620. */
interface LintConfig {
}
/** Format subcommand configuration — empty in v1; fields land with the v6 `format` verb (megaspec §25; formerly issue #621's `fmt`). */
interface FormatConfig {
}
/** Test subcommand configuration — empty in v1; fields land with issue #622. */
interface TestConfig {
}
/** Check subcommand configuration — empty in v1; fields land with issue #623. */
interface CheckConfig {
}
/** Typegen subcommand configuration — empty in v1; fields land with issue #624. Typegen exports *types* so a consumer of the machine gets a typed surface; it is distinct from codegen, which emits an implementation. */
interface TypegenConfig {
}
/** Codegen subcommand configuration (megaspec §25). Codegen generates an *implementation* of the machine, frequently in another language (cross-compilation); distinct from typegen's consumer-facing type exports. */
interface CodegenConfig {
    /** Default codegen target when none is specified on the CLI. Default: `'native:typescript'`. */
    defaultTarget?: string;
    /** Output directory for multi-file codegen. */
    outDir?: string;
}
/** Init (project scaffolder) subcommand configuration — empty in v1; fields land with the v6 `init` verb (megaspec §25; formerly issue #625's `new`). */
interface InitConfig {
}
/** Import (SCXML / xstate / mermaid / dot → FSL) subcommand configuration — empty in v1; fields land with the v6 `import` verb (megaspec §25). */
interface ImportConfig {
}
/** Export (FSL → SCXML / xstate / mermaid / grammar artifacts) subcommand configuration — empty in v1; fields land with the v6 `export` verb (megaspec §25). */
interface ExportConfig {
}
/** MCP server subcommand configuration — empty in v1; fields land with issue #628. */
interface McpConfig {
}
/** LSP server subcommand configuration — empty in v1; fields land with issue #629. */
interface LspConfig {
}
/** REPL subcommand configuration — empty in v1; fields land with issue #630. */
interface ReplConfig {
}
/**
 * The registry section: a map from machine/system name to the file that
 * defines it, consumed by every name-resolving verb (megaspec §25). Empty
 * in v1 — reserved here so configs written today validate tomorrow.
 *
 * @example
 *   { "traffic": "./machines/traffic-light.fsl" }
 */
declare type RegistryConfig = Record<string, string>;
/** The fully-merged, defaults-populated configuration the loader returns. */
interface ResolvedConfig {
    include: string[];
    exclude: string[];
    render: Required<Pick<RenderConfig, 'defaultTarget' | 'scale' | 'quality'>> & RenderConfig;
    lint: LintConfig;
    format: FormatConfig;
    test: TestConfig;
    check: CheckConfig;
    typegen: TypegenConfig;
    codegen: CodegenConfig;
    init: InitConfig;
    import: ImportConfig;
    export: ExportConfig;
    mcp: McpConfig;
    lsp: LspConfig;
    repl: ReplConfig;
    registry: RegistryConfig;
}
declare type DeepPartial<T> = T extends object ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : T;
/** What users actually write in their config file — every field optional. */
declare type PartialConfig = DeepPartial<ResolvedConfig> & {
    $schema?: string;
    extends?: string | string[];
};
/** Base class for all config errors. */
declare abstract class ConfigError extends Error {
    /** Discriminator for catch-block branching without instanceof chains. */
    abstract readonly kind: 'parse' | 'schema' | 'extends' | 'io';
    /** Source file path, if known. */
    readonly path?: string;
    /** Source line, if known. */
    readonly line?: number;
    /** Source column, if known. */
    readonly column?: number;
    constructor(message: string, opts?: {
        path?: string;
        line?: number;
        column?: number;
    });
}
/** Thrown when a config file is not valid JSON. */
declare class ConfigParseError extends ConfigError {
    readonly kind: "parse";
    constructor(message: string, opts?: {
        path?: string;
        line?: number;
        column?: number;
    });
}
/** Thrown when a parsed config violates the schema. */
declare class ConfigSchemaError extends ConfigError {
    readonly kind: "schema";
    /** Raw ajv error array — callers may format as they please. */
    readonly violations: ReadonlyArray<unknown>;
    constructor(message: string, opts: {
        path?: string;
        line?: number;
        column?: number;
        violations: ReadonlyArray<unknown>;
    });
}
/** Thrown on extends-chain failures: missing path, cycle, depth exceeded. */
declare class ConfigExtendsError extends ConfigError {
    readonly kind: "extends";
    /** The chain of file paths leading to the failure. */
    readonly chain: ReadonlyArray<string>;
    constructor(message: string, opts: {
        path?: string;
        chain: ReadonlyArray<string>;
    });
}
/** Thrown on filesystem failures (permission denied, etc.). */
declare class ConfigIOError extends ConfigError {
    readonly kind: "io";
    /** The underlying Node errno error. (Named `errno` rather than `cause` to avoid shadowing the native ES2022 Error.cause field.) */
    readonly errno: NodeJS.ErrnoException;
    constructor(message: string, opts: {
        path?: string;
        errno: NodeJS.ErrnoException;
    });
}

/**
 * Apply a `flag-name → config-dot-path` mapping to produce a
 * `PartialConfig` suitable as the top layer of a config stack.
 *
 * Each subcommand owns its mapping table. Flags whose mapping is `null`
 * are per-invocation-only and never written to the config layer.
 *
 * Pure module — no I/O, no global state.
 */

/** A mapping from flag name to dotted config path, or `null` to skip. */
declare type FlagMapping = Record<string, string | null>;
/**
 * @param flags - Parsed flags (typed as `Record<string, unknown>` because
 *   flag values can be strings, numbers, booleans, arrays, or undefined).
 * @param mapping - Per-subcommand flag → config-path table.
 * @returns A `PartialConfig` representing the flag overrides.
 *
 * @example
 *   flagsToConfig({ target: 'png' }, { target: 'render.defaultTarget' });
 *   // { render: { defaultTarget: 'png' } }
 */
declare function flagsToConfig(flags: Record<string, unknown>, mapping: FlagMapping): PartialConfig;

/**
 * The CLI-environment orchestrator. Collects every config layer (defaults,
 * user-global, project, machine attributes, flag overrides) and merges
 * them into a `ResolvedConfig`.
 *
 * Non-CLI consumers (GitHub Actions, editor plugins, static-site
 * generators) can use this same function — pass `skipUserGlobal: true`
 * for reproducibility and/or `projectRoot` to anchor discovery.
 *
 * Browser consumers should skip this and use `mergeConfigs` + the pure
 * helpers directly.
 *
 * Node-only.
 */

/** Options accepted by `loadConfig`. */
interface LoadConfigOptions {
    /** Base for walk-up discovery. Usually `process.cwd()`. */
    cwd: string;
    /** Anchor discovery here instead of walking up from cwd. */
    projectRoot?: string;
    /** If set, run `extractMachineAttributes` on this file's content. */
    machinePath?: string;
    /** Parsed CLI flags. */
    flags?: Record<string, unknown>;
    /** Flag → config-dot-path mapping table. */
    flagMapping?: FlagMapping;
    /** Bypass project discovery; load exactly this file. */
    explicitConfigPath?: string;
    /** Skip ALL discovery (defaults + flags only). */
    skipConfig?: boolean;
    /** Skip the ~/.fsl layer specifically (Action / CI / sandbox use). */
    skipUserGlobal?: boolean;
    /** Override home directory (test seam). */
    home?: string;
}
/**
 * Load and merge every config layer for the CLI environment.
 *
 * Layer precedence (lowest to highest):
 *   1. Built-in defaults
 *   2. User-global config (~/.fsl/config.json) — skipped if `skipUserGlobal`
 *   3. Project config (walking up from cwd or anchored at `projectRoot`)
 *   4. Machine source attributes (from `machinePath` if provided)
 *   5. CLI flag overrides (`flags` + `flagMapping`)
 *
 * @param opts - Options controlling which layers to load and how to discover them.
 * @returns A complete `ResolvedConfig` with defaults populated.
 * @throws Any of the `Config*Error` classes if a discovered file is malformed.
 *
 * @example
 *   const cfg = await loadConfig({ cwd: process.cwd(), flags, flagMapping });
 *
 * @example
 *   // GitHub Action use
 *   const cfg = await loadConfig({
 *     cwd:            process.env.GITHUB_WORKSPACE,
 *     projectRoot:    process.env.GITHUB_WORKSPACE,
 *     skipUserGlobal: true,
 *     flags:          inputs,
 *     flagMapping:    ACTION_INPUT_TO_CONFIG,
 *   });
 */
declare function loadConfig(opts: LoadConfigOptions): Promise<ResolvedConfig>;

/**
 * Pure deep-merge for an ordered array of `PartialConfig` layers.
 *
 * Semantics:
 *   - objects merge recursively per-key, later wins per-key
 *   - arrays REPLACE (later array wholly replaces former — not concat, not union)
 *   - scalars: later wins
 *   - `null` from a later layer explicitly clears (sets to null)
 *   - `undefined` from a later layer does NOT override an earlier value
 *   - type mismatch (object on one side, array on the other): later wins
 *
 * Input layers are never mutated.
 */

/**
 * Merge an ordered list of partial configs into a single `PartialConfig`.
 *
 * Layers are applied left-to-right: the last layer has the highest precedence.
 * The merge is deep for plain objects but arrays REPLACE rather than concatenate
 * (consistent with how most CLI config systems treat array-valued settings).
 *
 * @param layers - From lowest precedence (first) to highest (last).
 * @returns A new object; inputs are never mutated.
 *
 * @example
 *   mergeConfigs([
 *     { render: { scale: 3 } },
 *     { render: { scale: 7 } },
 *   ]);
 *   // { render: { scale: 7 } }
 *
 * @example
 *   mergeConfigs([]);
 *   // {}
 *
 * @see mergeTwo for the per-value merge semantics.
 */
declare function mergeConfigs(layers: ReadonlyArray<PartialConfig>): PartialConfig;

/**
 * Resolve a `PartialConfig`'s `extends` chain into a single merged
 * `PartialConfig`. Pure module — takes a `Reader` callback so the same
 * logic serves Node (`fs.readFile`) and browser (`fetch`).
 *
 * Resolution rules (per the design spec):
 *   - paths relative to the file containing the extends
 *   - cycle detection via the recursion stack
 *   - depth limit: 32 nested extends
 *   - merge order: bases resolve bottom-up first; the file's own keys merge last
 *   - array form: bases merge in order before the file's own keys
 */

/**
 * Resolve `raw.extends` into the fully merged effective config.
 *
 * Each base file is read via the injected `reader`, parsed, schema-validated,
 * and then recursively resolved before being merged. The merge order is
 * lowest-precedence-first: each base is merged before the file that extends it,
 * and the file's own keys win over all bases.
 *
 * @param raw - The parsed config object (may or may not have `extends`).
 * @param basePath - Absolute path of the file `raw` came from; extends paths
 *   resolve relative to its dirname.
 * @param reader - Async function that turns a path into the file's text.
 *   The CLI passes `fs.readFile`; a browser integration would pass a `fetch`
 *   wrapper.
 * @param visited - Internal recursion stack used for cycle detection. Callers
 *   should omit this parameter; it is managed by the recursive calls.
 * @returns The merged config, with the `extends` key stripped.
 * @throws ConfigExtendsError on cycle or depth overrun.
 * @throws ConfigParseError if a base file is malformed JSON.
 * @throws ConfigSchemaError if a base file violates the schema.
 * @throws Whatever the `reader` callback rejects with — propagated unwrapped (typically a Node `ErrnoException` from `fs.readFile`).
 *
 * @see mergeConfigs
 * @see validateConfig
 *
 * @example
 *   const cfg = await resolveExtends(parsed, '/p/.fsl/config.json', fsReader);
 */
declare function resolveExtends(raw: PartialConfig, basePath: string, reader: Reader, visited?: ReadonlyArray<string>): Promise<PartialConfig>;

/**
 * Compile-time-constant default `ResolvedConfig`. The lowest layer of the
 * config stack — every loadConfig call starts here.
 *
 * **Calibrated to today's `fsl render` behavior** so a project with no
 * config file produces identical output to the current release.
 *
 * Deep-frozen so consumers cannot accidentally mutate the shared singleton.
 */

/**
 * The built-in defaults.
 *
 * @example
 *   import { defaults } from 'jssm/cli';
 *   const cfg = mergeConfigs([defaults, userConfig]);
 */
declare const defaults: ResolvedConfig;

/**
 * JSON Schema for the `fsl` config file, plus the `validateConfig`
 * function used by the loader.
 *
 * The schema is hand-written in v1; a follow-up will generate it from the
 * TS types via `ts-json-schema-generator`. Until then, when types in
 * `types.ts` change, update this file in lockstep.
 *
 * Pure module — uses ajv directly with no Node API references.
 */

/** The JSON Schema (draft-07) used at runtime and published for editor autocomplete. */
declare const CONFIG_SCHEMA: {
    readonly $schema: "http://json-schema.org/draft-07/schema#";
    readonly $id: "https://stonecypher.github.io/jssm/schemas/fsl-config.json";
    readonly title: "fsl Configuration";
    readonly description: "Unified configuration for the fsl CLI and the jssm/cli library.";
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly $schema: {
            readonly type: "string";
        };
        readonly extends: {
            readonly oneOf: readonly [{
                readonly type: "string";
            }, {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
            }];
        };
        readonly include: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
        readonly exclude: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
        readonly render: {
            readonly type: "object";
            readonly additionalProperties: false;
            readonly properties: {
                readonly defaultTarget: {
                    readonly type: "string";
                    readonly enum: readonly ["svg", "dot", "png", "jpeg", "html"];
                };
                readonly outDir: {
                    readonly type: "string";
                };
                readonly scale: {
                    readonly type: "number";
                };
                readonly width: {
                    readonly type: "number";
                };
                readonly height: {
                    readonly type: "number";
                };
                readonly quality: {
                    readonly type: "number";
                };
                readonly theme: {
                    readonly type: "string";
                };
            };
        };
        readonly lint: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly format: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly test: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly check: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly typegen: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly codegen: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly init: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly import: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly export: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly mcp: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly lsp: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly repl: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly registry: {
            readonly type: "object";
            readonly additionalProperties: {
                readonly type: "string";
            };
        };
    };
};
/**
 * Validate a parsed config object against the schema. Throws
 * `ConfigSchemaError` with the full ajv violation array on failure.
 *
 * @param config - The parsed object from a config file (or assembled in code)
 * @param opts.path - Source path for the error message (optional but recommended)
 * @throws ConfigSchemaError if the object violates the schema
 *
 * @example
 *   validateConfig({ render: { defaultTarget: 'svg' } }, { path: '/x.json' });
 *   // returns void
 *
 * @example
 *   validateConfig({ render: { defaultTarget: 'tiff' } }, { path: '/x.json' });
 *   // throws ConfigSchemaError
 *
 * @see CONFIG_SCHEMA
 * @see ConfigSchemaError
 */
declare function validateConfig(config: unknown, opts?: {
    path?: string;
}): asserts config is PartialConfig;

/**
 * Filesystem-backed config file loader. Wraps `resolveExtends` with
 * `fs.readFile` as the reader, runs schema validation, returns the
 * fully-merged `PartialConfig`.
 *
 * Node-only — uses `fs/promises`.
 */

/**
 * Read, parse, validate, and resolve the extends chain of one config file.
 *
 * @param path - Absolute or cwd-relative path to a config file.
 * @returns The fully-merged `PartialConfig` (with `extends` and `$schema` stripped).
 * @throws ConfigIOError if the file cannot be read.
 * @throws ConfigParseError if the file is not valid JSON.
 * @throws ConfigSchemaError if the parsed object violates the schema.
 * @throws ConfigExtendsError on cycle or depth overrun.
 *
 * @example
 *   const cfg = await loadConfigFile('/project/.fsl/config.json');
 *   // { render: { scale: 4, ... } }
 *
 * @see resolveExtends
 * @see validateConfig
 */
declare function loadConfigFile(path: string): Promise<PartialConfig>;

/**
 * Discover the user-global and project-level config files.
 *
 * Two separately exported functions so non-CLI consumers (GitHub Actions,
 * editor plugins, SSGs) can pick which one(s) to call. The CLI's
 * `loadConfig` orchestrator calls both.
 *
 * Node-only — uses `fs` and `os`.
 */

/**
 * Look for `~/.fsl/config.json` (or `<home>/.fsl/config.json` if `home`
 * is provided for testing).
 *
 * @param opts.home - Override the home directory (test seam). Defaults to `os.homedir()`.
 * @returns The parsed config, or `null` if the file does not exist.
 * @throws ConfigParseError / ConfigSchemaError / ConfigIOError if the file exists but is malformed.
 *
 * @example
 *   const userCfg = await discoverUserGlobalConfig();
 *   // null on a fresh machine, a PartialConfig if the user wrote one.
 *
 * @see discoverProjectConfig
 */
declare function discoverUserGlobalConfig(opts?: {
    home?: string;
}): Promise<PartialConfig | null>;
/**
 * Walk up from `from` looking for a directory containing `.fsl/config.json`.
 * Returns the first one found; null if none up to the filesystem root.
 *
 * @param opts.from - Directory to start walking from. Walks toward the filesystem root.
 * @returns The parsed config, or `null` if none exists in any ancestor.
 * @throws ConfigParseError / ConfigSchemaError / ConfigIOError if a file is found but malformed.
 *
 * @example
 *   const projCfg = await discoverProjectConfig({ from: process.cwd() });
 *   // { render: { defaultTarget: 'svg', scale: 3, quality: 85 }, ... }
 *
 * @see discoverUserGlobalConfig
 */
declare function discoverProjectConfig(opts: {
    from: string;
}): Promise<PartialConfig | null>;

/**
 * Extract config-relevant attributes from an FSL machine source.
 *
 * The v1 mapping table is **deliberately empty** — almost nothing in
 * today's grammar is invocation-config-shaped. The function exists so
 * the layer slot is wired and tested; concrete mappings land alongside
 * the features that need them (e.g. issue #607 will add `theme`).
 *
 * Pure module — does not throw on invalid FSL; returns `{}` instead, so
 * config layering never blocks on parser errors.
 *
 * @param machineSource - FSL source text.
 * @returns A `PartialConfig` derived from machine attributes (empty in v1).
 *
 * @example
 *   extractMachineAttributes("a 'next' -> b;");
 *   // {}
 *
 *   // Future (after issue #607 lands):
 *   //   extractMachineAttributes('theme : "neon"; a -> b;');
 *   //   // { render: { theme: 'neon' } }
 */

declare function extractMachineAttributes(_machineSource: string): PartialConfig;

export { CONFIG_SCHEMA, CodegenError, CodegenUndecidedError, ConfigError, ConfigExtendsError, ConfigIOError, ConfigParseError, ConfigSchemaError, RasterizationUnsupportedError, RenderError, codegen, codegenSet, defaults, discoverProjectConfig, discoverUserGlobalConfig, extractMachineAttributes, extractSurface, flagsToConfig, loadConfig, loadConfigFile, mergeConfigs, parseFslArgs, render, renderSet, resolveExtends, validateConfig };
export type { CheckConfig, CodegenArtifact, CodegenConfig, CodegenOptions, CodegenSetItem, CodegenSetItemErr, CodegenSetItemOk, CodegenTarget, ExportConfig, FlagMapping, FlagSpec, FlagType, FormatConfig, ImportConfig, InitConfig, LintConfig, LoadConfigOptions, LspConfig, MachineSurface, McpConfig, ParseResult, ParseSpec, PartialConfig, RasterResult, Reader, RegistryConfig, RenderConfig, RenderOptions, RenderResult, RenderSetItem, RenderSetItemErr, RenderSetItemOk, RenderTarget, ReplConfig, ResolvedConfig, SurfaceTransition, TestConfig, TextResult, TypegenConfig };
