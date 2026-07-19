/**
 * FSL conformance-corpus runner (megaspec §26).
 *
 * §26 specifies cross-host equivalence as *data, not N ported suites*: a
 * **vector** is `(document, seed, stimuli)` and the expected result is a
 * **canonical trace** (one record per macrostep: transition, val deltas,
 * emissions, rollbacks).  Each backend ships a thin harness that reads a
 * vector, runs it, and emits a trace; a host-agnostic differ compares against
 * the normative trace.  This file is that thin harness for the jssm reference
 * runtime: it drives each vector through the built `Machine`, *independently
 * reconstructs* the canonical trace from observable runtime state, and asserts
 * it equals the hand-authored normative trace stored with the vector.
 *
 * The expected traces are authored from the specified semantics and reviewed
 * into the corpus as spec artifacts — they are **not** dumped from runtime
 * output.  The runner re-derives prop deltas by diffing `props()` before and
 * after each macrostep, so a regression in the runtime surfaces as a trace
 * mismatch rather than being silently re-recorded.
 *
 * Driving map (a stimulus' `kind` selects the API call):
 *   action        -> machine.action(arg, data?)
 *   transition    -> machine.transition(arg, data?)
 *   force         -> machine.force_transition(arg, data?)
 *   probabilistic -> machine.probabilistic_transition()
 */

import * as jssm from '../../jssm';

import type {
  CorpusVector,
  CorpusStimulus,
  CorpusTraceStep,
  CorpusScalar
} from './corpus_types';

import {
  ALL_VECTORS,
  CORPUS_BY_TIER
} from './corpus/index';


/** Read the full prop map as a plain record (props() returns an object). */
function read_props(m: jssm.Machine<unknown>): Record<string, CorpusScalar> {
  return m.props() as Record<string, CorpusScalar>;
}


/**
 * The §26 "val deltas" for one macrostep: the prop keys whose value differs
 * between the before- and after- maps, mapped to their after-value.  Uses
 * `Object.is` so that `NaN`/`-0` deltas are detected correctly and re-asserting
 * the same value is *not* a delta.
 */
function prop_deltas(
  before : Record<string, CorpusScalar>,
  after  : Record<string, CorpusScalar>
): Record<string, CorpusScalar> {

  const delta: Record<string, CorpusScalar> = {};

  // every key present after the step (props() always returns the full map)
  for (const [key, value] of Object.entries(after)) {
    if (!Object.is(before[key], value)) {
      delta[key] = value;
    }
  }
  // a key that vanished (cannot happen with the current runtime, but keep the
  // delta total): record it as undefined
  for (const key of Object.keys(before)) {
    if (!Object.hasOwn(after, key)) {
      delta[key] = undefined;
    }
  }

  return delta;
}


/** Apply one stimulus to the machine, returning whether it fired. */
function apply_stimulus(m: jssm.Machine<unknown>, s: CorpusStimulus): boolean {
  switch (s.kind) {
    case 'action': {        return m.action(s.arg as string, s.data);
    }
    case 'transition': {    return m.transition(s.arg as string, s.data);
    }
    case 'force': {         return m.force_transition(s.arg as string, s.data);
    }
    case 'probabilistic': { return m.probabilistic_transition();
    }
    default: {
      // exhaustiveness — a new stimulus kind must extend this switch
      const _never: never = s.kind;
      throw new Error(`unknown stimulus kind: ${String(_never)}`);
    }
  }
}


/**
 * Run a vector through the reference runtime and reconstruct its canonical
 * trace.  This is the harness half of §26 — pure observation, no assertions.
 */
function run_vector(v: CorpusVector): CorpusTraceStep[] {

  const m: jssm.Machine<unknown> =
    jssm.from(v.document, { rng_seed: v.seed, data: v.initial_data });

  const trace: CorpusTraceStep[] = [];

  for (const [step, s] of v.stimuli.entries()) {
    const from   = m.state();
    const before = read_props(m);

    const accepted = apply_stimulus(m, s);

    const to    = m.state();
    const after = read_props(m);

    trace.push({
      step,
      from,
      to,
      accepted,
      // a refused step is a no-op: no delta (before === after anyway)
      props_delta : prop_deltas(before, after),
      data        : m.data(),
      emissions   : [],          // pre-v6 runtime has no output tape
      rollback    : !accepted    // refusal is the runtime's only "rollback" sense
    });
  }

  return trace;
}


// ---------------------------------------------------------------------------
// Corpus-level invariants
// ---------------------------------------------------------------------------

describe('conformance corpus — structural invariants', () => {

  test('the corpus is non-empty', () => {
    expect(ALL_VECTORS.length).toBeGreaterThan(0);
  });

  test('every vector id is unique', () => {
    const ids = ALL_VECTORS.map(v => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every vector lands in the tier its document is filed under', () => {
    for (const tier of ['T1', 'T2', 'T3'] as const) {
      const tier_vectors = CORPUS_BY_TIER[tier];
      for (const v of tier_vectors) {
        expect(v.tier).toBe(tier);
      }
    }
  });

  test('every trace has exactly one record per stimulus', () => {
    for (const v of ALL_VECTORS) {
      expect(v.trace.length).toBe(v.stimuli.length);
    }
  });

  test('every probabilistic vector carries a seed', () => {
    for (const v of ALL_VECTORS) {
      if (v.stimuli.some(s => s.kind === 'probabilistic')) {
        expect(typeof v.seed).toBe('number');
      }
    }
  });

});


// ---------------------------------------------------------------------------
// Every document must parse (task requirement) — §26 / §25 parser totality
// ---------------------------------------------------------------------------

describe('conformance corpus — every document parses', () => {

  for (const v of ALL_VECTORS) {
    test(`[${v.tier}] ${v.id} parses`, () => {
      expect(() => jssm.parse(v.document)).not.toThrow();
    });
  }

});


// ---------------------------------------------------------------------------
// Trace conformance: reference runtime reproduces the normative trace
// ---------------------------------------------------------------------------

describe('conformance corpus — canonical trace matches reference runtime', () => {

  for (const v of ALL_VECTORS) {

    describe(`[${v.tier}] ${v.id} — ${v.title}`, () => {

      const actual = run_vector(v);

      test('macrostep count matches', () => {
        expect(actual.length).toBe(v.trace.length);
      });

      for (const [i, expected] of v.trace.entries()) {
        test(`macrostep ${i}: ${expected.from} -> ${expected.to} (${expected.accepted ? 'accepted' : 'refused'})`, () => {
          expect(actual[i]).toStrictEqual(expected);
        });
      }

      test('terminal state matches', () => {
        const m = jssm.from(v.document, { rng_seed: v.seed, data: v.initial_data });
        for (const s of v.stimuli) { apply_stimulus(m, s); }
        expect(m.state()).toBe(v.final_state);
        expect(m.is_final()).toBe(v.final_is_final);
      });

    });

  }

});
