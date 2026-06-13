
import {
  VerificationGraph,
  VerificationNode,
  SafetyProperty,
  node_has_label,
  build_adjacency,
  bfs_find_path,
  check_safety,
  check_all_safety
} from '../fsl_verify';




/*  A small linear traffic light with a cycle back to the start.

      Green(go) -> Yellow() -> Red(stop) -> Green ...

    `go` holds only at Green; `safe` holds at every node; `crash` holds nowhere.
*/

const traffic: VerificationGraph = {
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


/*  A machine that can reach a tagged error state.

      Boot(safe) -> Running(safe) -> Crashed(error)
                 -> Running already covered

    Used to prove error-state reachability fails the `always not error` invariant
    and to return a counterexample path.
*/

const crashable: VerificationGraph = {
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
    const adj = build_adjacency(traffic);
    expect(adj.get('Green')).toStrictEqual(['Yellow']);
    expect(adj.get('Yellow')).toStrictEqual(['Red']);
    expect(adj.get('Red')).toStrictEqual(['Green']);
  });

  test('a pure-sink target still appears as a key with an empty list', () => {
    const adj = build_adjacency(crashable);
    expect(adj.get('Crashed')).toStrictEqual([]);
  });

  test('a node declared but never an edge endpoint appears with an empty list', () => {
    const island: VerificationGraph = {
      nodes: [{ id: 'Lonely' }],
      edges: [],
      start_states: ['Lonely']
    };
    const adj = build_adjacency(island);
    expect(adj.get('Lonely')).toStrictEqual([]);
  });

  test('a source seen by both node list and an edge is created once (list_for re-read branch)', () => {
    // 'A' is declared as a node (first creation) AND is an edge source (re-read
    // of the already-present list) AND has two out-edges (push twice).
    const graph: VerificationGraph = {
      nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' }
      ],
      start_states: ['A']
    };
    const adj = build_adjacency(graph);
    expect(adj.get('A')).toStrictEqual(['B', 'C']);
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
    const path = bfs_find_path(crashable, (n: VerificationNode) => node_has_label(n, 'error'));
    expect(path).toStrictEqual(['Boot', 'Running', 'Crashed']);
  });

  test('returns undefined when no reachable node satisfies the predicate', () => {
    const path = bfs_find_path(crashable, (n: VerificationNode) => node_has_label(n, 'nope'));
    expect(path).toBeUndefined();
  });

  test('matches a start state immediately (single-node witness)', () => {
    const path = bfs_find_path(traffic, (n: VerificationNode) => node_has_label(n, 'go'));
    expect(path).toStrictEqual(['Green']);
  });

  test('explores past a cycle without looping (visited successor branch)', () => {
    // traffic cycles Red -> Green; reaching 'stop' at Red proves we traverse
    // the whole ring, and revisiting Green (already visited) is skipped.
    const path = bfs_find_path(traffic, (n: VerificationNode) => node_has_label(n, 'stop'));
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

  test('explores a start state that has no declared node (node_for fallback)', () => {
    // 'Ghost' is a start state with no entry in `nodes`; node_for falls back to
    // a bare { id }, which carries no labels, so the search continues and fails.
    const ghostly: VerificationGraph = {
      nodes: [],
      edges: [],
      start_states: ['Ghost']
    };
    const path = bfs_find_path(ghostly, (n: VerificationNode) => node_has_label(n, 'anything'));
    expect(path).toBeUndefined();
  });

  test('a start with no adjacency entry uses the empty-successors branch', () => {
    // 'Solo' is a start state absent from both nodes and edges, so
    // adjacency.get('Solo') is undefined and the `?? []` branch fires.
    const solo: VerificationGraph = {
      nodes: [],
      edges: [],
      start_states: ['Solo']
    };
    const path = bfs_find_path(solo, (n: VerificationNode) => node_has_label(n, 'x'));
    expect(path).toBeUndefined();
  });

  test('a diamond re-converges without revisiting the join (visited successor branch)', () => {
    // A -> B, A -> C, B -> D, C -> D : D is enqueued once via B, and the C->D
    // edge hits the already-visited branch.
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




describe('check_safety — reachability', () => {

  test('reachable target: holds with a witness path', () => {
    const result = check_safety(traffic, { kind: 'reachability', label: 'stop', name: 'red-reachable' });
    expect(result.holds).toBe(true);
    expect(result.witness).toStrictEqual(['Green', 'Yellow', 'Red']);
    expect(result.property.name).toBe('red-reachable');
  });

  test('unreachable target: fails with no witness', () => {
    const result = check_safety(traffic, { kind: 'reachability', label: 'crash' });
    expect(result.holds).toBe(false);
    expect(result.witness).toBeUndefined();
  });

});




describe('check_safety — invariant', () => {

  test('invariant that holds at every reachable node: proved, no witness', () => {
    const result = check_safety(traffic, { kind: 'invariant', label: 'safe' });
    expect(result.holds).toBe(true);
    expect(result.witness).toBeUndefined();
  });

  test('invariant that is violated: refuted with a counterexample path', () => {
    // `always go` is false the moment we leave Green; counterexample is the path
    // to the first node missing `go`.
    const result = check_safety(traffic, { kind: 'invariant', label: 'go' });
    expect(result.holds).toBe(false);
    expect(result.witness).toStrictEqual(['Green', 'Yellow']);
  });

  test('error-state reachability refutes the no-error invariant with a tape', () => {
    const result = check_safety(crashable, { kind: 'invariant', label: 'safe' });
    expect(result.holds).toBe(false);
    expect(result.witness).toStrictEqual(['Boot', 'Running', 'Crashed']);
  });

});




describe('check_safety — unknown kind', () => {

  test('throws on an unrecognized property kind', () => {
    const bogus = { kind: 'liveness', label: 'eventually-done' } as unknown as SafetyProperty;
    expect(() => check_safety(traffic, bogus)).toThrow(/unknown safety property kind/);
  });

  test('the thrown message names the offending kind', () => {
    const bogus = { kind: 'whatever', label: 'x' } as unknown as SafetyProperty;
    expect(() => check_safety(traffic, bogus)).toThrow(/whatever/);
  });

});




describe('check_all_safety', () => {

  test('discharges a batch in input order', () => {
    const results = check_all_safety(traffic, [
      { kind: 'reachability', label: 'stop' },
      { kind: 'invariant',    label: 'safe' },
      { kind: 'invariant',    label: 'go'   }
    ]);
    expect(results.map(r => r.holds)).toStrictEqual([true, true, false]);
    expect(results[2].witness).toStrictEqual(['Green', 'Yellow']);
  });

  test('an empty batch yields an empty result list', () => {
    expect(check_all_safety(traffic, [])).toStrictEqual([]);
  });

});
