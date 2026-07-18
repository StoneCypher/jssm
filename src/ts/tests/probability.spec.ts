
 

import * as jssm from '../jssm';

const sm = jssm.sm;

/** Code-unit string comparator, reproducing Array#sort's default ordering explicitly. */
const code_unit_compare = (a: string, b: string): number => (a < b ? -1 : (a > b ? 1 : 0));





describe('probable exits for', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [ { from: 'off', to: 'red', kind: 'legal', forced_only: false, main_path: false } ]
  });

  test('probable exits are an array', () =>
    expect(Array.isArray(machine.probable_exits_for('off')) )
      .toBe(true) );

  test('one probable exit in example', () =>
    expect(machine.probable_exits_for('off').length)
      .toBe(1) );

  test('exit is an object', () =>
    expect(typeof machine.probable_exits_for('off')[0])
      .toBe('object') );

  test('exit 0 has a string from property', () =>
    expect(typeof machine.probable_exits_for('off')[0].from )
      .toBe('string') );

});





describe('probable action exits', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { from:'off', to:'red', action:'on',  kind: 'legal', forced_only: false, main_path: false },
      { from:'red', to:'off', action:'off', kind: 'legal', forced_only: false, main_path: false }
    ]
  });

  test('probable action exits are an array', () =>
    expect(Array.isArray(machine.probable_action_exits()) )
      .toBe(true) );

  test('probable action exit 1 is on', () =>
    expect(machine.probable_action_exits()[0].action)
      .toBe('on') );


  test('probable action exits are an array 2', () =>
    expect(Array.isArray(machine.probable_action_exits('off')) )
      .toBe(true) );

  test('probable action exit 1 is on 2', () =>
    expect(machine.probable_action_exits('off')[0].action)
      .toBe('on') );


  test('probable action exits are an array 3', () =>
    expect(Array.isArray(machine.probable_action_exits('red')) )
      .toBe(true) );

  test('probable action exit 1 is on 3', () =>
    expect(machine.probable_action_exits('red')[0].action)
      .toBe('off') );

});





describe('probabilistic_transition', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [ { from: 'off', to: 'red', kind: 'legal', forced_only: false, main_path: false } ]
  });

  machine.probabilistic_transition();

  test('solo after probabilistic is red', () =>
    expect( machine.state() )
      .toBe('red') );

});





describe('probabilistic_walk', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { from: 'off', to: 'red', kind: 'legal', forced_only: false, main_path: false },
      { from: 'red', to: 'off', kind: 'legal', forced_only: false, main_path: false }
    ]
  });

  machine.probabilistic_walk(3);

  test('solo after probabilistic walk 3 is red', () =>
    expect( machine.state() )
      .toBe('red') );

});





describe('probabilistic_histo_walk', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { from: 'off', to: 'red', kind: 'legal', forced_only: false, main_path: false },
      { from: 'red', to: 'off', kind: 'legal', forced_only: false, main_path: false }
    ]
  });

  const histo = machine.probabilistic_histo_walk(3);

  test('histo is a Map', () =>
    expect(histo instanceof Map)
      .toBe(true) );

  test('histo red is 2', () =>
    expect(histo.get('red'))
      .toBe(2) );

  test('histo off is 2', () =>
    expect(histo.get('off'))
      .toBe(2) );

});





describe('probable_exits_for filters by probability data (StoneCypher/fsl#1325)', () => {

  test('returns only probability-bearing exits when any exit declares one', () => {

    // 'b' has a declared probability, 'c' does not.  Before the fix,
    // probable_exits_for returned both, letting 'c' (default weight 1)
    // sit alongside 'b' (weight 50) and distort the distribution.
    const m = sm`a 50% -> b; a -> c; b -> a; c -> a;`;
    const exits = m.probable_exits_for('a');

    expect(exits.length).toBe(1);
    expect(exits[0].to).toBe('b');
    expect(exits[0].probability).toBe(50);

  });

  test('returns all legal exits when no exit declares a probability', () => {

    // No probability decorations on any edge — falls back to returning
    // every legal exit so that weighted_rand_select gives them equal weight.
    const m = sm`a -> b; a -> c;`;
    const exits = m.probable_exits_for('a');
    const targets = exits.map(e => e.to).sort(code_unit_compare);

    expect(exits.length).toBe(2);
    expect(targets).toEqual(['b', 'c']);

  });

  test('excludes forced-only exits even when no probability is declared', () => {

    // Forced-only (~>) exits cannot be reached via transition(), so they
    // must not be candidates for probabilistic selection.
    const m = sm`a -> b; a ~> c;`;
    const exits = m.probable_exits_for('a');

    expect(exits.length).toBe(1);
    expect(exits[0].to).toBe('b');
    expect(exits.every(e => e.forced_only === false)).toBe(true);

  });

  test('excludes forced-only exits even when a probability is declared on them', () => {

    // A forced-only edge with a probability decoration is still unreachable
    // by transition(), so it must not appear in probable_exits_for.
    const m = sm`a 50% -> b; a 50% ~> c;`;
    const exits = m.probable_exits_for('a');

    expect(exits.length).toBe(1);
    expect(exits[0].to).toBe('b');

  });

  test('probabilistic_transition respects the probability filter', () => {

    // With the bug, 'c' (default weight 1) would occasionally beat 'b'
    // (weight 99).  After the fix, only 'b' is a candidate, so every
    // probabilistic step from 'a' must land on 'b'.
    const m = sm`a 99% -> b; a -> c; b -> a; c -> a;`;
    m.rng_seed = 42;

    for (let i = 0; i < 25; i++) {
      m.force_transition('a');
      m.probabilistic_transition();
      expect(m.state()).toBe('b');
    }

  });

  test('every returned exit has probability defined when any declared it', () => {

    const m = sm`a 10% -> b; a 90% -> c; a -> d;`;
    const exits = m.probable_exits_for('a');
    const targets = exits.map(e => e.to).sort(code_unit_compare);

    expect(targets).toEqual(['b', 'c']);
    expect(exits.every(e => typeof e.probability === 'number')).toBe(true);

  });

  test('throws on unknown state', () => {

    const m = sm`a -> b;`;
    expect(() => m.probable_exits_for('nope')).toThrow();

  });

});





describe('random seed', () => {

  const a = sm`a -> b;`;
  const b = jssm.from(`a -> b;`, { rng_seed: 2 });
  const c = new jssm.Machine({
    start_states : ['off'],
    transitions  : [ { from: 'off', to: 'red', kind: 'legal', forced_only: false, main_path: false } ],
    rng_seed     : 2
  });

  test('Has RNG seed when unspecified', () => {
    expect(typeof a.rng_seed).toBe('number')
  });

  test('Has RNG seed when specified in .from form', () => {
    expect(b.rng_seed).toBe(2)
  });

  test('Has RNG seed when specified in constructor form', () => {
    expect(c.rng_seed).toBe(2)
  });


  test('Can get and set RNG to 1 and then to 2', () => {

    a.rng_seed = 1;
    expect(a.rng_seed).toBe(1);

    a.rng_seed = 2;
    expect(a.rng_seed).toBe(2);

  });


  test('Setting RNG to undefined actually sets to clock', () => {

    a.rng_seed = 1;
    expect(a.rng_seed).toBe(1);

    a.rng_seed = undefined;
    expect(a.rng_seed).not.toBe(undefined);
    expect(a.rng_seed).not.toBe(1);

    a.rng_seed = 1;
    expect(a.rng_seed).toBe(1);

    a.rng_seed = undefined;
    expect(a.rng_seed).not.toBe(undefined);
    expect(a.rng_seed).not.toBe(1);

  });

  test('Setting rng_seed at runtime regenerates the RNG and produces deterministic results', () => {

    const m = sm`a 50% -> b; a 50% -> c; b -> a; c -> a;`;

    // Run N probabilistic transitions with a known seed
    const N = 20;

    m.rng_seed = 12_345;
    const run1: string[] = [];
    for (let i = 0; i < N; i++) {
      m.force_transition('a');
      m.probabilistic_transition();
      run1.push(m.state());
    }

    // Reset to same seed and repeat
    m.rng_seed = 12_345;
    const run2: string[] = [];
    for (let i = 0; i < N; i++) {
      m.force_transition('a');
      m.probabilistic_transition();
      run2.push(m.state());
    }

    // Both runs must be identical, proving the setter regenerated the RNG
    expect(run1).toEqual(run2);

  });

});





describe('zero-probability candidate pools throw (StoneCypher/fsl#1248)', () => {

  test('an all-0% pool throws a JssmError naming the state, and does not move', () => {

    const m = sm`a 0% -> b; a 0% -> c; b -> a; c -> a;`;

    expect(() => m.probabilistic_transition())
      .toThrow(/every candidate edge has probability 0%/);
    expect(() => m.probabilistic_transition()).toThrow(/"a"/);

    expect(m.state()).toBe('a');

  });

  test('a lone 0% edge that shadowed an unweighted sibling (per #1325) also throws', () => {

    // the probability filter drops the undecorated 'c', leaving only b@0%
    const m = sm`a 0% -> b; a -> c; b -> a; c -> a;`;

    expect(() => m.probabilistic_transition())
      .toThrow(/every candidate edge has probability 0%/);

  });

  test('the non-destructive stochastic walk path throws on the same pool', () => {

    const m = sm`a 0% -> b; b -> a;`;

    expect(() => [...m.stochastic_runs({ runs: 1, seed: 1 })])
      .toThrow(/every candidate edge has probability 0%/);

  });

  test('manual transition through a 0% edge remains legal', () => {

    const m = sm`a 0% -> b; a 0% -> c;`;

    expect(m.valid_transition('b')).toBe(true);
    expect(m.transition('b')).toBe(true);
    expect(m.state()).toBe('b');

  });

  test('a pool with any positive weight does not throw', () => {

    const m = sm`a 0% -> b; a 1% -> c; b -> a; c -> a;`;
    m.rng_seed = 5;

    expect(m.probabilistic_transition()).toBe(true);
    expect(m.state()).toBe('c');   // the 0% arm can never be the winner

  });

  test('an empty pool (terminal state) is not the guard\'s concern: walks just terminate', () => {

    const m = sm`a -> b;`;
    const runs = [...m.stochastic_runs({ runs: 1, seed: 1 })];

    expect(runs.length).toBe(1);
    expect(runs[0].terminated).toBe(true);
    expect(runs[0].states).toEqual(['a', 'b']);

  });

});




// A one-way arrow has no reverse edge, so a probability/action/after written
// AFTER the arrow used to be silently dropped.  It is now rejected.  fsl#1950
describe('post-arrow decorations on a one-way arrow are rejected, not dropped', () => {

  test('a -> 40% b throws', () =>
    expect(() => jssm.from('a -> 40% b;')).toThrow(/write it before the arrow/));

  test('a -> 0% b throws (a real 0% decoration, not absence)', () =>
    expect(() => jssm.from('a -> 0% b;')).toThrow(/write it before the arrow/));

  test('a => 40% b (main arrow) throws', () =>
    expect(() => jssm.from('a => 40% b;')).toThrow(/write it before the arrow/));

  test('the documented pre-arrow form still works and keeps the probability', () => {
    const m = jssm.from('a 40% -> b;');
    expect(m.list_edges()[0].probability).toBe(40);
  });

  test('a plain one-way arrow with no decoration compiles', () =>
    expect(() => jssm.from('a -> b;')).not.toThrow());

  test('a two-way arrow keeps its post-arrow decoration on the reverse edge', () => {
    const m = jssm.from('a <-> 40% b;');
    const rev = m.list_edges().find(e => e.from === 'b' && e.to === 'a');
    expect(rev?.probability).toBe(40);
  });

});
