
import {
  DEFAULT_MICROSTEP_BOUND,
  validate_graph,
  find_cycle,
  is_acyclic,
  microstep_cascade,
  analyze_termination
} from '../fsl_totality';

import type { TotalityGraph } from '../fsl_totality';





// ---- shared example graphs -------------------------------------------------

// a → b → c, c is a fixpoint: a terminating DAG / settling cascade
const chain: TotalityGraph<string> = {
  nodes : ['a', 'b', 'c'],
  edges : [ { from: 'a', to: 'b' }, { from: 'b', to: 'c' } ]
};

// a ⇄ b: a two-node cycle / non-stabilizing eventless loop
const two_cycle: TotalityGraph<string> = {
  nodes : ['a', 'b'],
  edges : [ { from: 'a', to: 'b' }, { from: 'b', to: 'a' } ]
};

// x → x: the shortest possible cycle
const self_loop: TotalityGraph<string> = {
  nodes : ['x'],
  edges : [ { from: 'x', to: 'x' } ]
};

// no edges at all: trivially acyclic, every node a fixpoint
const isolated: TotalityGraph<string> = {
  nodes : ['lonely'],
  edges : []
};





describe('fsl_totality DEFAULT_MICROSTEP_BOUND', () => {

  test('matches the §13 default of 100,000', () => {
    expect( DEFAULT_MICROSTEP_BOUND ).toBe( 100_000 );
  });

});





describe('fsl_totality validate_graph/1', () => {

  test('returns void for a well-formed graph', () => {
    expect( validate_graph(chain) ).toBeUndefined();
  });

  test('returns void for an empty graph', () => {
    expect( validate_graph({ nodes: [], edges: [] }) ).toBeUndefined();
  });

  test('throws on a duplicate node id', () => {
    expect( () => validate_graph({ nodes: ['a', 'a'], edges: [] }) )
      .toThrow(/duplicate node id/);
  });

  test('throws when an edge starts from an undeclared node', () => {
    expect( () => validate_graph({ nodes: ['a'], edges: [ { from: 'ghost', to: 'a' } ] }) )
      .toThrow(/edge from undeclared node/);
  });

  test('throws when an edge points to an undeclared node', () => {
    expect( () => validate_graph({ nodes: ['a'], edges: [ { from: 'a', to: 'ghost' } ] }) )
      .toThrow(/edge to undeclared node/);
  });

});





describe('fsl_totality find_cycle/1', () => {

  test('reports a linear chain as acyclic', () => {
    const result = find_cycle(chain);
    expect( result.acyclic ).toBe( true );
    expect( result.cycle   ).toBeUndefined();
  });

  test('reports an edgeless graph as acyclic', () => {
    expect( find_cycle(isolated).acyclic ).toBe( true );
  });

  test('finds a two-node cycle and slices the witness', () => {
    const result = find_cycle(two_cycle);
    expect( result.acyclic ).toBe( false );
    expect( result.cycle   ).toEqual( ['a', 'b', 'a'] );
  });

  test('finds a self-loop as the shortest cycle', () => {
    const result = find_cycle(self_loop);
    expect( result.acyclic ).toBe( false );
    expect( result.cycle   ).toEqual( ['x', 'x'] );
  });

  test('finds a back edge that closes a longer cycle, slicing from the entry', () => {
    // a → b → c → b : the cycle is b → c → b, with `a` a non-cyclic prefix
    const result = find_cycle({
      nodes : ['a', 'b', 'c'],
      edges : [ { from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'b' } ]
    });
    expect( result.acyclic ).toBe( false );
    expect( result.cycle   ).toEqual( ['b', 'c', 'b'] );
  });

  test('revisits a BLACK (already-cleared) node without reporting a false cycle', () => {
    // diamond: a → b, a → c, b → d, c → d.  Exploring `a`'s second successor
    // `c` reaches `d`, which is already BLACK from the b-branch — exercises
    // the "skip BLACK child" path with no cycle present.
    const diamond: TotalityGraph<string> = {
      nodes : ['a', 'b', 'c', 'd'],
      edges : [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'c' },
        { from: 'b', to: 'd' },
        { from: 'c', to: 'd' }
      ]
    };
    expect( find_cycle(diamond).acyclic ).toBe( true );
  });

  test('explores every disconnected component (multiple white roots)', () => {
    // two separate acyclic components; the second root starts WHITE and is
    // visited by the outer loop's next iteration
    const forest: TotalityGraph<string> = {
      nodes : ['a', 'b', 'p', 'q'],
      edges : [ { from: 'a', to: 'b' }, { from: 'p', to: 'q' } ]
    };
    expect( find_cycle(forest).acyclic ).toBe( true );
  });

  test('skips a node already blackened by an earlier root (continue branch)', () => {
    // `b` is reachable from `a` and blackened while exploring root `a`; when
    // the outer loop reaches `b` as a candidate root it is no longer WHITE and
    // is skipped via `continue`.
    const shared: TotalityGraph<string> = {
      nodes : ['a', 'b'],
      edges : [ { from: 'a', to: 'b' } ]
    };
    expect( find_cycle(shared).acyclic ).toBe( true );
  });

  test('propagates validation errors from a malformed graph', () => {
    expect( () => find_cycle({ nodes: ['a'], edges: [ { from: 'a', to: 'z' } ] }) )
      .toThrow(/undeclared node/);
  });

});





describe('fsl_totality is_acyclic/1', () => {

  test('true for a DAG', () => {
    expect( is_acyclic(chain) ).toBe( true );
  });

  test('false for a self-loop', () => {
    expect( is_acyclic(self_loop) ).toBe( false );
  });

});





describe('fsl_totality microstep_cascade/3', () => {

  test('settles when the cascade reaches a fixpoint within the bound', () => {
    const result = microstep_cascade(chain, 'a');
    expect( result.outcome    ).toBe( 'settled' );
    expect( result.terminates ).toBe( true );
    expect( result.path       ).toEqual( ['a', 'b', 'c'] );
    expect( result.steps      ).toBe( 2 );
  });

  test('settles immediately on an isolated fixpoint node (zero steps)', () => {
    const result = microstep_cascade(isolated, 'lonely');
    expect( result.outcome    ).toBe( 'settled' );
    expect( result.terminates ).toBe( true );
    expect( result.path       ).toEqual( ['lonely'] );
    expect( result.steps      ).toBe( 0 );
  });

  test('reports a non-stabilizing eventless loop as a cycle', () => {
    const result = microstep_cascade(two_cycle, 'a');
    expect( result.outcome    ).toBe( 'cycle' );
    expect( result.terminates ).toBe( false );
    expect( result.path       ).toEqual( ['a', 'b', 'a'] );
    expect( result.steps      ).toBe( 2 );
  });

  test('detects a self-loop as a cycle in a single step', () => {
    const result = microstep_cascade(self_loop, 'x');
    expect( result.outcome    ).toBe( 'cycle' );
    expect( result.terminates ).toBe( false );
    expect( result.path       ).toEqual( ['x', 'x'] );
    expect( result.steps      ).toBe( 1 );
  });

  test('fires the cap as unbounded when the bound is below the cascade length', () => {
    const result = microstep_cascade(chain, 'a', 1);
    expect( result.outcome    ).toBe( 'unbounded' );
    expect( result.terminates ).toBe( false );
    expect( result.path       ).toEqual( ['a', 'b'] );
    expect( result.steps      ).toBe( 1 );
  });

  test('with bound 0, an already-settled node still settles', () => {
    const result = microstep_cascade(isolated, 'lonely', 0);
    expect( result.outcome ).toBe( 'settled' );
  });

  test('with bound 0, a node that needs a step reports unbounded', () => {
    const result = microstep_cascade(chain, 'a', 0);
    expect( result.outcome ).toBe( 'unbounded' );
    expect( result.steps   ).toBe( 0 );
  });

  test('with the cap disabled (Infinity) a long acyclic chain still settles', () => {
    const result = microstep_cascade(chain, 'a', Number.POSITIVE_INFINITY);
    expect( result.outcome ).toBe( 'settled' );
  });

  test('follows the first declared eventless successor at a branching node', () => {
    // `a` has two eventless successors; the cascade follows the first edge
    const branch: TotalityGraph<string> = {
      nodes : ['a', 'first', 'second'],
      edges : [ { from: 'a', to: 'first' }, { from: 'a', to: 'second' } ]
    };
    const result = microstep_cascade(branch, 'a');
    expect( result.path ).toEqual( ['a', 'first'] );
  });

  test('throws when the start node is not in the graph', () => {
    expect( () => microstep_cascade(chain, 'nope') )
      .toThrow(/not in the graph/);
  });

  test('throws on a negative bound', () => {
    expect( () => microstep_cascade(chain, 'a', -1) )
      .toThrow(/non-negative/);
  });

  test('propagates validation errors from a malformed graph', () => {
    expect( () => microstep_cascade({ nodes: ['a'], edges: [ { from: 'a', to: 'z' } ] }, 'a') )
      .toThrow(/undeclared node/);
  });

});





describe('fsl_totality analyze_termination/2', () => {

  test('terminating for an acyclic, settling graph', () => {
    expect( analyze_termination(chain) ).toEqual( { terminates: true } );
  });

  test('non-terminating with a cyclic witness when the graph has a cycle', () => {
    const result = analyze_termination(two_cycle);
    expect( result.terminates ).toBe( false );
    expect( (result as { reason: string }).reason ).toBe( 'cyclic' );
    expect( (result as { cycle: string[] }).cycle ).toEqual( ['a', 'b', 'a'] );
  });

  test('non-terminating with an unsettled witness when an acyclic cascade exceeds the bound', () => {
    // `chain` is acyclic, so the cycle check passes; bound 1 then trips the
    // per-node microstep cap on the `a` cascade, yielding `unsettled`.
    const result = analyze_termination(chain, 1);
    expect( result.terminates ).toBe( false );
    expect( (result as { reason: string }).reason ).toBe( 'unsettled' );
    expect( (result as { start: string }).start ).toBe( 'a' );
    expect( (result as { cascade: { outcome: string } }).cascade.outcome ).toBe( 'unbounded' );
  });

  test('terminating for an edgeless graph (every node a fixpoint)', () => {
    expect( analyze_termination(isolated) ).toEqual( { terminates: true } );
  });

});
