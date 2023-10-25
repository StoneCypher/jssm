
/* eslint-disable max-len */

import * as jssm from '../jssm';

const sm = jssm.sm;





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

});
