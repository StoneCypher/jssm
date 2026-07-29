/**
 * T2 (rich-portable) conformance vectors — the opaque `data` blob (§5's
 * deprecated untyped escape hatch, `mDT`).  `data` is *forbidden* on a
 * `finite` machine (§3), so it lives in T2, not T1.  These pin how data is
 * threaded through driving calls, sticks across data-free steps, and is left
 * untouched by a refused stimulus (§11 atomic rollback of the data slot).
 */

import type { CorpusVector } from '../../corpus_types';


export const vectors: ReadonlyArray<CorpusVector> = [

  {
    id    : 't2.data.thread-and-stick',
    tier  : 'T2',
    title : 'Data threads through go(state, data) and sticks across data-free steps',
    document :
      `a -> b -> c -> a;`,
    seed  : 1,
    initial_data : 'init',
    stimuli : [
      { kind: 'transition', arg: 'b', data: 'd1' },
      { kind: 'transition', arg: 'c'             },   // no data -> 'd1' sticks
      { kind: 'transition', arg: 'a', data: 'd2' }
    ],
    trace : [
      { step: 0, from: 'a', to: 'b', accepted: true, props_delta: {}, data: 'd1', emissions: [], rollback: false },
      { step: 1, from: 'b', to: 'c', accepted: true, props_delta: {}, data: 'd1', emissions: [], rollback: false },
      { step: 2, from: 'c', to: 'a', accepted: true, props_delta: {}, data: 'd2', emissions: [], rollback: false }
    ],
    final_state    : 'a',
    final_is_final : false
  },

  {
    id    : 't2.data.refused-keeps-data',
    tier  : 'T2',
    title : 'A refused stimulus leaves the data blob unchanged',
    document :
      `a -> b -> c;`,
    seed  : 1,
    initial_data : 'init',
    stimuli : [
      { kind: 'transition', arg: 'c', data: 'should-not-apply' },   // illegal from a -> refused
      { kind: 'transition', arg: 'b', data: 'applied'          }
    ],
    trace : [
      { step: 0, from: 'a', to: 'a', accepted: false, props_delta: {}, data: 'init',    emissions: [], rollback: true  },
      { step: 1, from: 'a', to: 'b', accepted: true,  props_delta: {}, data: 'applied', emissions: [], rollback: false }
    ],
    final_state    : 'b',
    final_is_final : false
  },

  {
    id    : 't2.data.structured-blob',
    tier  : 'T2',
    title : 'A structured (object) data blob threads through transitions intact',
    document :
      `a 'load' -> b 'commit' -> c;`,
    seed  : 1,
    initial_data : { count: 0 },
    stimuli : [
      { kind: 'action', arg: 'load',   data: { count: 1 } },
      { kind: 'action', arg: 'commit', data: { count: 2 } }
    ],
    trace : [
      { step: 0, from: 'a', to: 'b', accepted: true, props_delta: {}, data: { count: 1 }, emissions: [], rollback: false },
      { step: 1, from: 'b', to: 'c', accepted: true, props_delta: {}, data: { count: 2 }, emissions: [], rollback: false }
    ],
    final_state    : 'c',
    final_is_final : true
  }

];
