
/* eslint-disable max-len */

import { describe, test, expect } from 'vitest';

import { sm } from '../jssm';

import {
  // predicate atoms / constructors
  in_state,
  in_any,
  is_terminal,
  is_final,
  is_error,
  tautology,
  contradiction,
  p_not,
  p_and,
  p_or,
  // safety-property constructors
  always,
  never,
  reachable,
  unreachable,
  absence,
  existence,
  // evaluation
  as_predicate,
  eval_predicate,
  reachable_predecessors,
  trace_to,
  resolve_starts,
  check_safety,
  // machine-decoupled verification graph
  node_has_label,
  build_adjacency,
  bfs_find_path,
  check_graph_safety,
  check_all_graph_safety
} from '../fsl_verify';

import type { StatePredicate, VerificationGraph, VerificationNode, GraphSafetyProperty } from '../fsl_verify';





// A linear pipeline: idle -> work -> done, with done terminal.
const pipeline = () => sm`idle 'go' -> work 'finish' -> done;`;

// A machine with a branch and an unreachable island so reachability matters.
//   start -> ok ; start -> bad ; (orphan is islanded)
const branching = () =>
  sm`allow_islands: true; start 'a' -> ok; start 'b' -> bad; orphan 'z' -> sink;`;

// A cyclic machine so BFS must guard against revisiting.
const cycle = () => sm`on 'toggle' <=> 'toggle' off;`;

const NO_ERR = new Set<string>();





describe('eval_predicate — atoms', () => {

  test('in_state matches the named state only', () => {
    const m = pipeline();
    expect(eval_predicate(m, 'work', in_state('work'), NO_ERR)).toBe(true);
    expect(eval_predicate(m, 'idle', in_state('work'), NO_ERR)).toBe(false);
  });

  test('in_any matches set membership, empty set matches nothing', () => {
    const m = pipeline();
    expect(eval_predicate(m, 'work', in_any(['idle', 'work']), NO_ERR)).toBe(true);
    expect(eval_predicate(m, 'done', in_any(['idle', 'work']), NO_ERR)).toBe(false);
    expect(eval_predicate(m, 'idle', in_any([]), NO_ERR)).toBe(false);
  });

  test('is_terminal is true only at dead ends', () => {
    const m = pipeline();
    expect(eval_predicate(m, 'done', is_terminal, NO_ERR)).toBe(true);
    expect(eval_predicate(m, 'idle', is_terminal, NO_ERR)).toBe(false);
  });

  test('is_final tracks terminal/complete states', () => {
    const m = pipeline();
    expect(eval_predicate(m, 'done', is_final, NO_ERR)).toBe(true);
    expect(eval_predicate(m, 'work', is_final, NO_ERR)).toBe(false);
  });

  test('is_error consults the supplied error set', () => {
    const m = pipeline();
    const errs = new Set(['done']);
    expect(eval_predicate(m, 'done', is_error, errs)).toBe(true);
    expect(eval_predicate(m, 'work', is_error, errs)).toBe(false);
    expect(eval_predicate(m, 'done', is_error, NO_ERR)).toBe(false);
  });

  test('tautology and contradiction are constant', () => {
    const m = pipeline();
    expect(eval_predicate(m, 'idle', tautology, NO_ERR)).toBe(true);
    expect(eval_predicate(m, 'idle', contradiction, NO_ERR)).toBe(false);
  });

});



describe('eval_predicate — connectives', () => {

  const m = pipeline();

  test('not inverts', () => {
    expect(eval_predicate(m, 'idle', p_not(in_state('work')), NO_ERR)).toBe(true);
    expect(eval_predicate(m, 'work', p_not(in_state('work')), NO_ERR)).toBe(false);
  });

  test('and requires all; empty and is a tautology', () => {
    expect(eval_predicate(m, 'done', p_and(is_terminal, is_final), NO_ERR)).toBe(true);
    expect(eval_predicate(m, 'done', p_and(is_terminal, in_state('idle')), NO_ERR)).toBe(false);
    expect(eval_predicate(m, 'idle', p_and(), NO_ERR)).toBe(true); // unit of and
  });

  test('or requires one; empty or is a contradiction', () => {
    expect(eval_predicate(m, 'work', p_or(in_state('idle'), in_state('work')), NO_ERR)).toBe(true);
    expect(eval_predicate(m, 'work', p_or(in_state('idle'), in_state('done')), NO_ERR)).toBe(false);
    expect(eval_predicate(m, 'idle', p_or(), NO_ERR)).toBe(false); // unit of or
  });

});



describe('as_predicate', () => {

  test('wraps a bare state name as in_state', () => {
    expect(as_predicate('done')).toStrictEqual(in_state('done'));
  });

  test('passes an existing predicate through unchanged', () => {
    const p: StatePredicate = is_terminal;
    expect(as_predicate(p)).toBe(p);
  });

});



describe('reachable_predecessors & trace_to', () => {

  test('records BFS predecessors from a single seed', () => {
    const m = pipeline();
    const preds = reachable_predecessors(m, ['idle']);
    expect(preds.get('idle')).toBe(null);
    expect(preds.get('work')).toBe('idle');
    expect(preds.get('done')).toBe('work');
    expect(preds.has('orphan')).toBe(false);
  });

  test('seeds multiple starts and de-duplicates them', () => {
    const m = branching();
    const preds = reachable_predecessors(m, ['start', 'start', 'orphan']);
    expect(preds.get('start')).toBe(null);
    expect(preds.get('orphan')).toBe(null);
    // both seeds' successors are reached
    expect(preds.get('ok')).toBe('start');
    expect(preds.get('sink')).toBe('orphan');
  });

  test('terminates on cycles without revisiting', () => {
    const m = cycle();
    const preds = reachable_predecessors(m, ['on']);
    expect(preds.get('on')).toBe(null);
    expect(preds.get('off')).toBe('on');
    expect(preds.size).toBe(2);
  });

  test('trace_to reconstructs the shortest path inclusive of endpoints', () => {
    const m = pipeline();
    const preds = reachable_predecessors(m, ['idle']);
    expect(trace_to(preds, 'done')).toStrictEqual(['idle', 'work', 'done']);
    expect(trace_to(preds, 'idle')).toStrictEqual(['idle']);
  });

});



describe('resolve_starts', () => {

  test('defaults to the current machine state', () => {
    const m = pipeline();
    expect(resolve_starts(m, undefined)).toStrictEqual(['idle']);
  });

  test('honours an explicit, valid start frontier', () => {
    const m = pipeline();
    expect(resolve_starts(m, ['work', 'done'])).toStrictEqual(['work', 'done']);
  });

  test('throws on an unknown start state', () => {
    const m = pipeline();
    expect(() => resolve_starts(m, ['nope'])).toThrow(/not a state of the machine/);
  });

});



describe('check_safety — always (invariant)', () => {

  test('holds: every reachable state satisfies the invariant (no trace)', () => {
    const m = pipeline();
    const r = check_safety(m, always(p_not(is_error)));
    expect(r.holds).toBe(true);
    expect(r.trace).toBeUndefined();
    expect(r.states_explored).toBe(3);
    expect(r.property.kind).toBe('always');
  });

  test('fails: returns the shortest counterexample trace to the first violator', () => {
    const m = pipeline();
    const r = check_safety(m, always(p_not(is_error)), { error_states: ['done'] });
    expect(r.holds).toBe(false);
    expect(r.trace).toStrictEqual(['idle', 'work', 'done']);
  });

  test('accepts a bare state name as "must always be in it"', () => {
    const m = cycle();
    const r = check_safety(m, always('on'));
    expect(r.holds).toBe(false); // 'off' is reachable and is not 'on'
    expect(r.trace).toStrictEqual(['on', 'off']);
  });

});



describe('check_safety — never / unreachable / absence', () => {

  test('never holds when the forbidden predicate is unreachable', () => {
    const m = pipeline();
    const r = check_safety(m, never(is_error));
    expect(r.holds).toBe(true);
    expect(r.trace).toBeUndefined();
  });

  test('never fails with a counterexample when the forbidden state is reachable', () => {
    const m = pipeline();
    const r = check_safety(m, never('done'));
    expect(r.holds).toBe(false);
    expect(r.trace).toStrictEqual(['idle', 'work', 'done']);
  });

  test('unreachable is the same query, reported via its own kind', () => {
    const m = pipeline();
    const r = check_safety(m, unreachable('work'));
    expect(r.holds).toBe(false);
    expect(r.trace).toStrictEqual(['idle', 'work']);
    expect(r.property.kind).toBe('unreachable');
  });

  test('absence proves a designed failure state is never reached', () => {
    const m = branching();
    const reached = check_safety(m, absence('bad'));
    expect(reached.holds).toBe(false);
    expect(reached.trace).toStrictEqual(['start', 'bad']);

    // From a start frontier that cannot reach 'bad', absence holds.
    const safe = check_safety(m, absence('bad'), { start_states: ['orphan'] });
    expect(safe.holds).toBe(true);
    expect(safe.trace).toBeUndefined();
  });

});



describe('check_safety — reachable / existence', () => {

  test('reachable succeeds with a witness trace', () => {
    const m = pipeline();
    const r = check_safety(m, reachable('done'));
    expect(r.holds).toBe(true);
    expect(r.trace).toStrictEqual(['idle', 'work', 'done']);
  });

  test('reachable fails with no trace when the target is unreachable', () => {
    const m = branching();
    const r = check_safety(m, reachable('orphan')); // start frontier defaults to 'start'
    expect(r.holds).toBe(false);
    expect(r.trace).toBeUndefined();
  });

  test('existence is reachable under another name', () => {
    const m = pipeline();
    const r = check_safety(m, existence(is_final));
    expect(r.holds).toBe(true);
    expect(r.trace).toStrictEqual(['idle', 'work', 'done']);
    expect(r.property.kind).toBe('reachable');
  });

});



describe('check_safety — options & determinism', () => {

  test('respects an explicit start frontier', () => {
    const m = pipeline();
    const r = check_safety(m, reachable('idle'), { start_states: ['work'] });
    expect(r.holds).toBe(false); // can't reach 'idle' from 'work'
  });

  test('default options object works without an explicit argument', () => {
    const m = pipeline();
    const r = check_safety(m, always(tautology));
    expect(r.holds).toBe(true);
    expect(r.states_explored).toBe(3);
  });

  test('error states feed compound predicates', () => {
    const m = pipeline();
    const dangerous = p_or(is_error, is_terminal);
    const r = check_safety(m, never(dangerous), { error_states: ['idle'] });
    expect(r.holds).toBe(false);
    // 'idle' (error) is the start, so the shortest witness is itself.
    expect(r.trace).toStrictEqual(['idle']);
  });

});



// ---------------------------------------------------------------------------
//  Machine-decoupled verification graph
// ---------------------------------------------------------------------------

// A linear traffic ring; 'go' only at Green, 'safe' everywhere, 'crash' nowhere.
const traffic_graph: VerificationGraph = {
  nodes: [
    { id: 'Green',  labels: ['go',   'safe'] },
    { id: 'Yellow', labels: [        'safe'] },
    { id: 'Red',    labels: ['stop', 'safe'] }
  ],
  edges: [
    { from: 'Green',  to: 'Yellow', label: 'tick' },
    { from: 'Yellow', to: 'Red',    label: 'tick' },
    { from: 'Red',    to: 'Green',  label: 'tick' }
  ],
  start_states: ['Green']
};

// A machine that can reach a tagged error state: Boot -> Running -> Crashed.
const crashable_graph: VerificationGraph = {
  nodes: [
    { id: 'Boot',    labels: ['safe'] },
    { id: 'Running', labels: ['safe'] },
    { id: 'Crashed', labels: ['error'] }
  ],
  edges: [
    { from: 'Boot',    to: 'Running' },
    { from: 'Running', to: 'Crashed' }
  ],
  start_states: ['Boot']
};



describe('node_has_label', () => {

  test('label present', () => {
    expect(node_has_label({ id: 'a', labels: ['x', 'y'] }, 'x')).toBe(true);
  });

  test('label absent from a populated set', () => {
    expect(node_has_label({ id: 'a', labels: ['x', 'y'] }, 'z')).toBe(false);
  });

  test('node with no labels array carries nothing', () => {
    expect(node_has_label({ id: 'a' }, 'x')).toBe(false);
  });

  test('node with empty labels array carries nothing', () => {
    expect(node_has_label({ id: 'a', labels: [] }, 'x')).toBe(false);
  });

});



describe('build_adjacency', () => {

  test('maps every source to its one-step successors', () => {
    const adj = build_adjacency(traffic_graph);
    expect(adj.get('Green')).toStrictEqual(['Yellow']);
    expect(adj.get('Yellow')).toStrictEqual(['Red']);
    expect(adj.get('Red')).toStrictEqual(['Green']);
  });

  test('a pure-sink target still appears as a key with an empty list', () => {
    const adj = build_adjacency(crashable_graph);
    expect(adj.get('Crashed')).toStrictEqual([]);
  });

  test('a node declared but never an edge endpoint appears with an empty list', () => {
    const island: VerificationGraph = {
      nodes: [{ id: 'Lonely' }],
      edges: [],
      start_states: ['Lonely']
    };
    expect(build_adjacency(island).get('Lonely')).toStrictEqual([]);
  });

  test('a source seen by both the node list and an edge is created once, pushed twice', () => {
    // 'A' is declared (first creation), is an edge source (list_for re-read),
    // and has two out-edges (push twice).
    const graph: VerificationGraph = {
      nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' }
      ],
      start_states: ['A']
    };
    expect(build_adjacency(graph).get('A')).toStrictEqual(['B', 'C']);
  });

  test('an edge endpoint not in the node list is still keyed', () => {
    const graph: VerificationGraph = {
      nodes: [],
      edges: [{ from: 'X', to: 'Y' }],
      start_states: ['X']
    };
    const adj = build_adjacency(graph);
    expect(adj.get('X')).toStrictEqual(['Y']);
    expect(adj.get('Y')).toStrictEqual([]);
  });

});



describe('bfs_find_path', () => {

  test('finds the shortest path to a satisfying node', () => {
    const path = bfs_find_path(crashable_graph, (n: VerificationNode) => node_has_label(n, 'error'));
    expect(path).toStrictEqual(['Boot', 'Running', 'Crashed']);
  });

  test('returns undefined when no reachable node satisfies the predicate', () => {
    const path = bfs_find_path(crashable_graph, (n: VerificationNode) => node_has_label(n, 'nope'));
    expect(path).toBeUndefined();
  });

  test('matches a start state immediately (single-node witness)', () => {
    const path = bfs_find_path(traffic_graph, (n: VerificationNode) => node_has_label(n, 'go'));
    expect(path).toStrictEqual(['Green']);
  });

  test('explores past a cycle without looping (visited-successor branch)', () => {
    const path = bfs_find_path(traffic_graph, (n: VerificationNode) => node_has_label(n, 'stop'));
    expect(path).toStrictEqual(['Green', 'Yellow', 'Red']);
  });

  test('deduplicates repeated start states (visited-start branch)', () => {
    const dup: VerificationGraph = {
      nodes: [{ id: 'S', labels: ['target'] }],
      edges: [],
      start_states: ['S', 'S']
    };
    const path = bfs_find_path(dup, (n: VerificationNode) => node_has_label(n, 'target'));
    expect(path).toStrictEqual(['S']);
  });

  test('explores a start state with no declared node (node_for fallback)', () => {
    const ghostly: VerificationGraph = {
      nodes: [],
      edges: [],
      start_states: ['Ghost']
    };
    const path = bfs_find_path(ghostly, (n: VerificationNode) => node_has_label(n, 'anything'));
    expect(path).toBeUndefined();
  });

  test('a start with no adjacency entry uses the empty-successors branch', () => {
    const solo: VerificationGraph = {
      nodes: [],
      edges: [],
      start_states: ['Solo']
    };
    const path = bfs_find_path(solo, (n: VerificationNode) => node_has_label(n, 'x'));
    expect(path).toBeUndefined();
  });

  test('a diamond re-converges without revisiting the join (visited-successor branch)', () => {
    // A -> B, A -> C, B -> D, C -> D : D is enqueued once via B; C->D hits visited.
    const diamond: VerificationGraph = {
      nodes: [
        { id: 'A' },
        { id: 'B' },
        { id: 'C' },
        { id: 'D', labels: ['goal'] }
      ],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'D' },
        { from: 'C', to: 'D' }
      ],
      start_states: ['A']
    };
    const path = bfs_find_path(diamond, (n: VerificationNode) => node_has_label(n, 'goal'));
    expect(path).toStrictEqual(['A', 'B', 'D']);
  });

});



describe('check_graph_safety — reachability', () => {

  test('reachable target: holds with a witness path', () => {
    const result = check_graph_safety(traffic_graph, { kind: 'reachability', label: 'stop', name: 'red-reachable' });
    expect(result.holds).toBe(true);
    expect(result.witness).toStrictEqual(['Green', 'Yellow', 'Red']);
    expect(result.property.name).toBe('red-reachable');
  });

  test('unreachable target: fails with no witness', () => {
    const result = check_graph_safety(traffic_graph, { kind: 'reachability', label: 'crash' });
    expect(result.holds).toBe(false);
    expect(result.witness).toBeUndefined();
  });

});



describe('check_graph_safety — invariant', () => {

  test('invariant that holds at every reachable node: proved, no witness', () => {
    const result = check_graph_safety(traffic_graph, { kind: 'invariant', label: 'safe' });
    expect(result.holds).toBe(true);
    expect(result.witness).toBeUndefined();
  });

  test('invariant that is violated: refuted with a counterexample path', () => {
    const result = check_graph_safety(traffic_graph, { kind: 'invariant', label: 'go' });
    expect(result.holds).toBe(false);
    expect(result.witness).toStrictEqual(['Green', 'Yellow']);
  });

  test('error-state reachability refutes the no-error invariant with a tape', () => {
    const result = check_graph_safety(crashable_graph, { kind: 'invariant', label: 'safe' });
    expect(result.holds).toBe(false);
    expect(result.witness).toStrictEqual(['Boot', 'Running', 'Crashed']);
  });

});



describe('check_graph_safety — unknown kind', () => {

  test('throws on an unrecognized property kind', () => {
    const bogus = { kind: 'liveness', label: 'eventually-done' } as unknown as GraphSafetyProperty;
    expect(() => check_graph_safety(traffic_graph, bogus)).toThrow(/unknown safety property kind/);
  });

  test('the thrown message names the offending kind', () => {
    const bogus = { kind: 'whatever', label: 'x' } as unknown as GraphSafetyProperty;
    expect(() => check_graph_safety(traffic_graph, bogus)).toThrow(/whatever/);
  });

});



describe('check_all_graph_safety', () => {

  test('discharges a batch in input order', () => {
    const results = check_all_graph_safety(traffic_graph, [
      { kind: 'reachability', label: 'stop' },
      { kind: 'invariant',    label: 'safe' },
      { kind: 'invariant',    label: 'go'   }
    ]);
    expect(results.map(r => r.holds)).toStrictEqual([true, true, false]);
    expect(results[2].witness).toStrictEqual(['Green', 'Yellow']);
  });

  test('an empty batch yields an empty result list', () => {
    expect(check_all_graph_safety(traffic_graph, [])).toStrictEqual([]);
  });

});
