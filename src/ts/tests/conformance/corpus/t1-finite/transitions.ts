/**
 * T1 (finite profile) conformance vectors — pure topology: named
 * transitions, actions, forced edges, and refusals.  No props, no data, no
 * RNG: these exercise the §26 "trivially exact everywhere, including C" core
 * — the deterministic transition engine over a small-finite state set.
 */

import type { CorpusVector } from '../../corpus_types';


export const vectors: ReadonlyArray<CorpusVector> = [

  {
    id    : 't1.transitions.linear-go',
    tier  : 'T1',
    title : 'Linear named transitions advance and reach a terminal final state',
    document :
      `a -> b -> c;`,
    seed  : 1,
    stimuli : [
      { kind: 'transition', arg: 'b' },
      { kind: 'transition', arg: 'c' }
    ],
    trace : [
      { step: 0, from: 'a', to: 'b', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 1, from: 'b', to: 'c', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false }
    ],
    final_state    : 'c',
    final_is_final : true
  },

  {
    id    : 't1.transitions.illegal-refused',
    tier  : 'T1',
    title : 'An illegal named transition is refused and leaves state unchanged',
    document :
      `a -> b -> c;`,
    seed  : 1,
    stimuli : [
      { kind: 'transition', arg: 'b' },
      { kind: 'transition', arg: 'a' },   // b has no edge to a -> refused
      { kind: 'transition', arg: 'c' }
    ],
    trace : [
      { step: 0, from: 'a', to: 'b', accepted: true,  props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 1, from: 'b', to: 'b', accepted: false, props_delta: {}, data: undefined, emissions: [], rollback: true  },
      { step: 2, from: 'b', to: 'c', accepted: true,  props_delta: {}, data: undefined, emissions: [], rollback: false }
    ],
    final_state    : 'c',
    final_is_final : true
  },

  {
    id    : 't1.transitions.actions',
    tier  : 'T1',
    title : 'Action (event) stimuli fire named edges; an unknown action is refused',
    document :
      `off 'start' -> red;
       red 'next' -> green 'next' -> yellow 'next' -> red;
       [red yellow green] 'stop' ~> off;`,
    seed  : 1,
    stimuli : [
      { kind: 'action', arg: 'start' },
      { kind: 'action', arg: 'next'  },
      { kind: 'action', arg: 'next'  },
      { kind: 'action', arg: 'nope'  }   // unknown action -> refused
    ],
    trace : [
      { step: 0, from: 'off',    to: 'red',    accepted: true,  props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 1, from: 'red',    to: 'green',  accepted: true,  props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 2, from: 'green',  to: 'yellow', accepted: true,  props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 3, from: 'yellow', to: 'yellow', accepted: false, props_delta: {}, data: undefined, emissions: [], rollback: true  }
    ],
    final_state    : 'yellow',
    final_is_final : false
  },

  {
    id    : 't1.transitions.forced-edge',
    tier  : 'T1',
    title : 'A forced (~>) edge rejects transition() but accepts force_transition()',
    document :
      `off 'start' -> red;
       red 'next' -> green 'next' -> yellow 'next' -> red;
       [red yellow green] 'stop' ~> off;`,
    seed  : 1,
    stimuli : [
      { kind: 'action',     arg: 'start' },
      { kind: 'transition', arg: 'off'   },   // forced-only target -> refused
      { kind: 'force',      arg: 'off'    }    // forced move -> accepted
    ],
    trace : [
      { step: 0, from: 'off', to: 'red', accepted: true,  props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 1, from: 'red', to: 'red', accepted: false, props_delta: {}, data: undefined, emissions: [], rollback: true  },
      { step: 2, from: 'red', to: 'off', accepted: true,  props_delta: {}, data: undefined, emissions: [], rollback: false }
    ],
    final_state    : 'off',
    final_is_final : false
  },

  {
    id    : 't1.transitions.forced-via-action',
    tier  : 'T1',
    title : 'An action name bound to a forced edge fires it through action()',
    document :
      `off 'start' -> red;
       red 'next' -> green;
       [red green] 'shutdown' ~> off;`,
    seed  : 1,
    stimuli : [
      { kind: 'action', arg: 'start'    },
      { kind: 'action', arg: 'shutdown' }   // forced edge reached by its action name
    ],
    trace : [
      { step: 0, from: 'off', to: 'red', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 1, from: 'red', to: 'off', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false }
    ],
    final_state    : 'off',
    final_is_final : false
  }

];
