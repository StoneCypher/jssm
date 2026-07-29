/**
 * Shared types and errors for the `import` / `export` tool-interchange verbs
 * (megaspec §25). These verbs convert *between* FSL and other state-machine
 * interchange formats; they are explicitly **not** a package fetcher — fetching
 * a machine by name is the registry's job, never `import`'s.
 *
 * The model deliberately mirrors the structural surface jssm already exposes
 * (`Machine.states()` + `Machine.list_edges()`): a set of named states and a
 * list of typed edges. Anything an interchange format cannot express against
 * that surface is reported as a *lossy* note rather than silently dropped, so
 * a conversion's fidelity is always visible to the caller.
 */

/**
 * The interchange formats `export` can target. `fsl` is included so the verb
 * surface is uniform (export to FSL is the canonical-formatter identity), but
 * the typical targets are the non-FSL ones.
 *
 * Fully implemented in this phase: `json`, `mermaid`. The remainder are
 * documented opt-ins (megaspec §25's "formal-methods bridges" and "grammar
 * artifacts") that parse and validate but report `unsupported` until their
 * own phase lands — so the flag surface is stable and discoverable now.
 */
export type ExportFormat =
  | 'json'
  | 'mermaid'
  | 'scxml'
  | 'xstate'
  | 'dot'
  | 'tla+'
  | 'alloy'
  | 'smv'
  | 'promela'
  | 'gbnf'
  | 'lark'
  | 'ebnf';

/**
 * The interchange formats `import` can read and convert *into* FSL.
 *
 * Fully implemented in this phase: `json`, `mermaid`. The remainder are
 * documented opt-ins reported as `unsupported` until their phase lands.
 */
export type ImportFormat =
  | 'json'
  | 'mermaid'
  | 'scxml'
  | 'xstate'
  | 'dot';

/** Formats whose `export` direction is implemented in this phase. */
export const EXPORT_IMPLEMENTED: ReadonlySet<ExportFormat> = new Set<ExportFormat>(['json', 'mermaid']);

/** Formats whose `import` direction is implemented in this phase. */
export const IMPORT_IMPLEMENTED: ReadonlySet<ImportFormat> = new Set<ImportFormat>(['json', 'mermaid']);

/**
 * The format-neutral structural model `export` produces and `import` consumes.
 *
 * It is intentionally small — the lossless core that every supported format
 * can carry. Format-specific detail that does not fit (hooks, contracts,
 * vals, themes) is surfaced via {@link ConversionResult.lossy} rather than
 * encoded here, keeping the model honest about what round-trips.
 */
export interface InterchangeModel {
  /** All state names, in declaration order. */
  states: string[];
  /** All transitions between states. */
  edges: InterchangeEdge[];
  /** The states the machine may start in, when known. */
  start_states?: string[];
}

/**
 * One directed transition in an {@link InterchangeModel}.
 *
 * `kind` is FSL's arrow semantics: `legal` (`->`), `main` (`=>`), or `forced`
 * (`~>`). `action` is the optional event/action label that drives the edge.
 */
export interface InterchangeEdge {
  from: string;
  to: string;
  kind: 'legal' | 'main' | 'forced';
  action?: string;
}

/**
 * The outcome of a conversion: the produced text plus any fidelity notes.
 *
 * `lossy` is the spec's "lossy conversions marked" contract (megaspec §25,
 * `import` row) made concrete: each entry names a construct the target format
 * could not represent. An empty `lossy` array means the conversion was
 * faithful for everything the model carried.
 */
export interface ConversionResult {
  /** The converted output text (FSL for `import`, the target format for `export`). */
  output: string;
  /** Human-readable notes naming each piece of fidelity that was lost. */
  lossy: string[];
}

/**
 * Thrown when an interchange conversion cannot complete: malformed input, an
 * unknown format name, or a format whose direction is not yet implemented.
 *
 * `format` names the interchange format involved (when known) and `reason`
 * discriminates the failure class so callers can branch without string
 * matching — `unsupported` is the "documented opt-in, not yet implemented"
 * case, distinct from `parse` (bad input) and `unknown-format` (typo'd flag).
 * @throws is itself — this is the error type other interchange code throws.
 * @example
 *   try { exportMachine(fsl, { format: 'scxml' }); }
 *   catch (e) {
 *     if (e instanceof InterchangeError && e.reason === 'unsupported') {
 *       // tell the user the format is a known-but-pending opt-in
 *     }
 *   }
 */
export class InterchangeError extends Error {
  public readonly reason: 'parse' | 'unsupported' | 'unknown-format';
  public readonly format?: string;

  constructor(
    message: string,
    opts: { reason: 'parse' | 'unsupported' | 'unknown-format'; format?: string },
  ) {
    super(message);
    this.name = 'InterchangeError';
    this.reason = opts.reason;
    this.format = opts.format;
    Object.setPrototypeOf(this, InterchangeError.prototype);
  }
}
