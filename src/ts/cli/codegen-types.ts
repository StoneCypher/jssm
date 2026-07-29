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
export type CodegenTarget =
  | 'native:typescript'
  | 'native:javascript';

/**
 * Options accepted by `codegen()` and `codegenSet()`.
 */
export interface CodegenOptions {
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
export interface CodegenArtifact {
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
export class CodegenError extends Error {
  public readonly path?: string;
  public readonly line?: number;
  public readonly column?: number;

  constructor(message: string, opts: { path?: string; line?: number; column?: number } = {}) {
    super(message);
    this.name = 'CodegenError';
    this.path   = opts.path;
    this.line   = opts.line;
    this.column = opts.column;
    Object.setPrototypeOf(this, CodegenError.prototype);
  }
}

/**
 * Thrown when generation cannot complete within the requested budget, or when
 * a gated capability (`--certify` against an un-certifiable target) is
 * requested. Distinct class so a `--json` caller can surface the third
 * answer — `undecided` — beside success and a hard failure.
 */
export class CodegenUndecidedError extends CodegenError {
  constructor(message: string, opts: { path?: string; line?: number; column?: number } = {}) {
    super(message, opts);
    this.name = 'CodegenUndecidedError';
    Object.setPrototypeOf(this, CodegenUndecidedError.prototype);
  }
}
