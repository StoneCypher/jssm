/**
 * T1 (finite profile) conformance vectors — state-bound props (the §5 `prop`
 * precursor).  Props are the exposed, where-you-are surface; their values are
 * confined to the §3 small-finite band here (boolean / number), so the whole
 * configuration space stays enumerable and the vectors are exact on every
 * host.  These pin the §26 "val deltas" slot of the canonical trace.
 */

import type { CorpusVector } from '../../corpus_types';


export const vectors: ReadonlyArray<CorpusVector> = [

  {
    id    : 't1.props.boolean-state-override',
    tier  : 'T1',
    title : 'Boolean props default then get state-overridden, producing val deltas',
    document :
      `property can_go     default true;
       property stop_first default false;
       Off -> Red => Green => Yellow => Red;
       [Red Yellow Green] ~> Off;
       state Red:   { property: can_go false; property: stop_first true; };
       state Green: { property: can_go true; };`,
    seed  : 1,
    stimuli : [
      { kind: 'transition', arg: 'Red'   },
      { kind: 'transition', arg: 'Green' }
    ],
    trace : [
      // Off -> Red: can_go true->false, stop_first false->true
      { step: 0, from: 'Off', to: 'Red',   accepted: true, props_delta: { can_go: false, stop_first: true  }, data: undefined, emissions: [], rollback: false },
      // Red -> Green: can_go false->true, stop_first true->false (Green re-asserts defaults)
      { step: 1, from: 'Red', to: 'Green', accepted: true, props_delta: { can_go: true,  stop_first: false }, data: undefined, emissions: [], rollback: false }
    ],
    final_state    : 'Green',
    final_is_final : false
  },

  {
    id    : 't1.props.numeric-counter',
    tier  : 'T1',
    title : 'A numeric prop takes a distinct value per state',
    document :
      `property count default 0;
       a -> b -> c;
       state b: { property: count 1; };
       state c: { property: count 2; };`,
    seed  : 1,
    stimuli : [
      { kind: 'transition', arg: 'b' },
      { kind: 'transition', arg: 'c' }
    ],
    trace : [
      { step: 0, from: 'a', to: 'b', accepted: true, props_delta: { count: 1 }, data: undefined, emissions: [], rollback: false },
      { step: 1, from: 'b', to: 'c', accepted: true, props_delta: { count: 2 }, data: undefined, emissions: [], rollback: false }
    ],
    final_state    : 'c',
    final_is_final : true
  },

  {
    id    : 't1.props.refused-no-delta',
    tier  : 'T1',
    title : 'A refused stimulus produces no prop delta; a state without an override reverts to the default',
    document :
      `property count default 0;
       a -> b -> c;
       state b: { property: count 1; };`,
    seed  : 1,
    stimuli : [
      { kind: 'transition', arg: 'b' },
      { kind: 'transition', arg: 'a' },   // illegal from b -> refused: count stays 1, no delta
      { kind: 'transition', arg: 'c' }
    ],
    trace : [
      // a -> b: count default 0 -> override 1
      { step: 0, from: 'a', to: 'b', accepted: true,  props_delta: { count: 1 }, data: undefined, emissions: [], rollback: false },
      // refused: no-op, no delta
      { step: 1, from: 'b', to: 'b', accepted: false, props_delta: {},           data: undefined, emissions: [], rollback: true  },
      // b -> c: c has no override, so count reverts to the default 0 (a real delta)
      { step: 2, from: 'b', to: 'c', accepted: true,  props_delta: { count: 0 }, data: undefined, emissions: [], rollback: false }
    ],
    final_state    : 'c',
    final_is_final : true
  }

];
