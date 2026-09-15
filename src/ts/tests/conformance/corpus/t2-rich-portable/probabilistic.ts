/**
 * T2 (rich-portable) conformance vectors — seeded probabilistic transitions.
 *
 * §15 makes RNG deterministic and seed-recorded: the seed is part of the
 * repro bundle and replay reproduces the walk bit-for-bit.  §3 places `rand`
 * in the rich band but *allows* it on finite machines under
 * over-approximation; here we exercise the concrete (non-over-approximated)
 * runtime, so each vector carries a seed and an exact expected walk.  These
 * pin §26's "(document, seed, stimuli) → canonical trace" with the seed doing
 * real work: a `probabilistic` stimulus consumes the stream and the resulting
 * state is determined by `seed`.  The traces below were derived from the
 * reference runtime's SplitMix32 stream and are the normative artifact.
 */

import type { CorpusVector } from '../../corpus_types';


export const vectors: ReadonlyArray<CorpusVector> = [

  {
    // 50/50 diamond, seed 42 -> b,a,b,a,b,a,b,a
    id    : 't2.prob.diamond-seed42',
    tier  : 'T2',
    title : 'Seeded 50/50 fan-out walk is reproducible (seed 42)',
    document :
      `a 50% -> b; a 50% -> c; b -> a; c -> a;`,
    seed  : 42,
    stimuli : [
      { kind: 'probabilistic' }, { kind: 'probabilistic' },
      { kind: 'probabilistic' }, { kind: 'probabilistic' },
      { kind: 'probabilistic' }, { kind: 'probabilistic' },
      { kind: 'probabilistic' }, { kind: 'probabilistic' }
    ],
    trace : [
      { step: 0, from: 'a', to: 'b', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 1, from: 'b', to: 'a', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 2, from: 'a', to: 'b', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 3, from: 'b', to: 'a', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 4, from: 'a', to: 'b', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 5, from: 'b', to: 'a', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 6, from: 'a', to: 'b', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 7, from: 'b', to: 'a', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false }
    ],
    final_state    : 'a',
    final_is_final : false
  },

  {
    // 50/50 diamond, seed 12345 -> c,a,c,a,c,a,b,a
    id    : 't2.prob.diamond-seed12345',
    tier  : 'T2',
    title : 'A different seed produces a different reproducible walk (seed 12345)',
    document :
      `a 50% -> b; a 50% -> c; b -> a; c -> a;`,
    seed  : 12_345,
    stimuli : [
      { kind: 'probabilistic' }, { kind: 'probabilistic' },
      { kind: 'probabilistic' }, { kind: 'probabilistic' },
      { kind: 'probabilistic' }, { kind: 'probabilistic' },
      { kind: 'probabilistic' }, { kind: 'probabilistic' }
    ],
    trace : [
      { step: 0, from: 'a', to: 'c', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 1, from: 'c', to: 'a', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 2, from: 'a', to: 'c', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 3, from: 'c', to: 'a', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 4, from: 'a', to: 'c', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 5, from: 'c', to: 'a', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 6, from: 'a', to: 'b', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 7, from: 'b', to: 'a', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false }
    ],
    final_state    : 'a',
    final_is_final : false
  },

  {
    // 30/70 weighted, seed 1 -> c,a,c,a,b,a
    id    : 't2.prob.weighted-seed1',
    tier  : 'T2',
    title : 'Weighted (30/70) fan-out honours the declared weights under a seed',
    document :
      `a 30% -> b; a 70% -> c; b -> a; c -> a;`,
    seed  : 1,
    stimuli : [
      { kind: 'probabilistic' }, { kind: 'probabilistic' },
      { kind: 'probabilistic' }, { kind: 'probabilistic' },
      { kind: 'probabilistic' }, { kind: 'probabilistic' }
    ],
    trace : [
      { step: 0, from: 'a', to: 'c', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 1, from: 'c', to: 'a', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 2, from: 'a', to: 'c', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 3, from: 'c', to: 'a', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 4, from: 'a', to: 'b', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 5, from: 'b', to: 'a', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false }
    ],
    final_state    : 'a',
    final_is_final : false
  },

  {
    // three-way uniform fan, seed 5 -> z,s,x,s,z,s,y,s
    id    : 't2.prob.triple-seed5',
    tier  : 'T2',
    title : 'Uniform three-way fan-out is reproducible under a seed',
    document :
      `s 1% -> x; s 1% -> y; s 1% -> z; x -> s; y -> s; z -> s;`,
    seed  : 5,
    stimuli : [
      { kind: 'probabilistic' }, { kind: 'probabilistic' },
      { kind: 'probabilistic' }, { kind: 'probabilistic' },
      { kind: 'probabilistic' }, { kind: 'probabilistic' },
      { kind: 'probabilistic' }, { kind: 'probabilistic' }
    ],
    trace : [
      { step: 0, from: 's', to: 'z', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 1, from: 'z', to: 's', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 2, from: 's', to: 'x', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 3, from: 'x', to: 's', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 4, from: 's', to: 'z', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 5, from: 'z', to: 's', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 6, from: 's', to: 'y', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 7, from: 'y', to: 's', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false }
    ],
    final_state    : 's',
    final_is_final : false
  }

];
