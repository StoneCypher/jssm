/**
 * Conformance-corpus vector & canonical-trace data model.
 *
 * These types are the executable encoding of FSL megaspec §26 (conformance
 * mechanics) for the jssm reference runtime.  §26 defines cross-host
 * equivalence as *data, not N ported suites*: a **vector** is
 * `(document, seed, stimuli)` and its expected result is a **canonical trace**
 * — one record per macrostep capturing the fired transition, val deltas,
 * emissions and rollbacks, plus a digest.  Each backend ships a thin harness
 * that reads a vector, runs it, and emits the trace; a host-agnostic differ
 * compares.  Here the "thin harness" is `corpus.spec.ts` and the reference
 * runtime is the built jssm.
 *
 * The corpus is organised by §26 **certification tier**:
 *   - `T1` finite profile — no floats / locale / regex / unicode tables;
 *      trivially exact on every host including C.  These vectors restrict
 *      themselves to the §3 small-finite band (boolean / enum / bounded int)
 *      and the deterministic core of the runtime.
 *   - `T2` rich-portable — deterministic but uses the rich/portable surface
 *      (opaque `data`, seeded RNG over the §3 over-approximated `rand`).
 *   - `T3` pinned-unicode — §8's locked-Unicode-version operations
 *      (code-point state/action identifiers, grapheme-bearing labels).
 *
 * The current jssm runtime predates the v6 `val`/`sensor`/`emit` layer, so
 * its observable surface per macrostep is: the resulting `state`, the typed
 * **prop** map (the §5 `prop` precursor — state-bound, exposed), and the
 * opaque `data` blob (the §5 deprecated escape hatch).  `props_delta` carries
 * the §26 "val deltas" slot, `data` carries the post-step data blob, and
 * `emissions` / `rollback` are recorded for forward-compatibility with the v6
 * tape model — empty under today's runtime, never absent, so the trace shape
 * is stable across the language tiers.
 */


/** Primitive values a prop / data slot may hold in a vector trace. */
export type CorpusScalar =
  | string
  | number
  | boolean
  | null
  | undefined;


/**
 * A single stimulus applied to the machine.  Mirrors §26's `stimuli` stream —
 * the input tape that is the *single source of truth* for a deterministic run
 * (§15: input is recorded, everything else regenerates).
 *
 * `kind` selects the driving API on the reference runtime:
 *   - `action`        → `machine.action(arg)`         (an event / named edge)
 *   - `transition`    → `machine.transition(arg)`     (a named-target move)
 *   - `force`         → `machine.force_transition(arg)` (a forced `~>` edge)
 *   - `probabilistic` → `machine.probabilistic_transition()` (consumes seed)
 *
 * `data`, when present, is threaded as the optional data argument of the
 * driving call (the opaque blob; absent for `probabilistic`).
 */
export interface CorpusStimulus {
  readonly kind: 'action' | 'transition' | 'force' | 'probabilistic';
  /** Edge / action / target name.  Omitted only for `probabilistic`. */
  readonly arg?: string;
  /** Optional data-blob argument threaded through the driving call. */
  readonly data?: unknown;
}


/**
 * One macrostep of the canonical trace (§26: "JSONL per macrostep:
 * transition, val deltas, emissions, rollbacks").
 *
 * `accepted` records whether the stimulus fired (the reference runtime returns
 * a boolean from every driving call); a refused stimulus is a no-op macrostep
 * — the v6 analogue of an atomic rollback with no state change (§11), so it is
 * recorded with `accepted: false`, `from === to`, and an empty `props_delta`.
 */
export interface CorpusTraceStep {
  /** Zero-based index into the stimulus stream. */
  readonly step: number;
  /** State the machine occupied *before* this stimulus. */
  readonly from: string;
  /** State the machine occupies *after* this stimulus. */
  readonly to: string;
  /** Did the stimulus fire?  `false` ⇒ refused / illegal ⇒ no-op. */
  readonly accepted: boolean;
  /**
   * The props that changed value across this macrostep (the §26 "val deltas").
   * Keys are prop names; values are the post-step value.  Empty object when
   * nothing changed (e.g. a refused stimulus, or a transition into a state
   * that re-asserts the same prop values).
   */
  readonly props_delta: Readonly<Record<string, CorpusScalar>>;
  /** The opaque data blob after this macrostep (§5 escape hatch). */
  readonly data: unknown;
  /**
   * Channel emissions produced this macrostep (§14 output tape).  Always an
   * array; empty under the pre-v6 runtime, present for shape-stability.
   */
  readonly emissions: ReadonlyArray<unknown>;
  /**
   * Whether this macrostep rolled back (§11 atomic rollback).  The pre-v6
   * runtime has no fault-driven rollback, so this is `false` for every fired
   * step and is the recorded sense of a refused (non-fired) stimulus.
   */
  readonly rollback: boolean;
}


/**
 * One conformance vector: `(document, seed, stimuli)` plus its expected
 * canonical trace and the expected terminal observation.  The expected trace
 * is a **normative spec artifact** (§26) — hand-authored from the specified
 * semantics and versioned with the corpus, not an incidental snapshot of
 * runtime output.  The runner asserts the reference runtime reproduces it.
 */
export interface CorpusVector {
  /** Stable identifier, unique across the whole corpus. */
  readonly id: string;
  /** Certification tier this vector belongs to (§26). */
  readonly tier: 'T1' | 'T2' | 'T3';
  /** One-line statement of what behaviour the vector pins. */
  readonly title: string;
  /** The FSL document under test. */
  readonly document: string;
  /**
   * The seed for the run's deterministic RNG (§15).  Required for any vector
   * with `probabilistic` stimuli; harmless otherwise.  Omitted ⇒ the runtime
   * clock-seeds, which is non-reproducible, so every vector supplies one.
   */
  readonly seed: number;
  /**
   * Optional initial data blob supplied at construction (`from(doc, {data})`).
   */
  readonly initial_data?: unknown;
  /** The input tape. */
  readonly stimuli: ReadonlyArray<CorpusStimulus>;
  /** The expected canonical trace, one record per stimulus. */
  readonly trace: ReadonlyArray<CorpusTraceStep>;
  /** Expected `state()` after the whole stimulus stream is applied. */
  readonly final_state: string;
  /** Expected `is_final()` after the whole stimulus stream is applied. */
  readonly final_is_final: boolean;
}
