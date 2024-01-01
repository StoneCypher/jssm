
/* eslint-disable max-len */

import * as jssm from '../jssm';

const sm = jssm.sm;





describe('Reports on actions', () => {

  const roa_machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { name: 'turn_on', action: 'power_on', from: 'off', to: 'red', kind: 'legal', forced_only: false, main_path: false }
    ]
  });

  const roa_la = roa_machine.list_actions();  // todo comeback

  test('Actions that it has', () =>
    expect( typeof roa_machine.current_action_for('power_on') )
      .toBe('number') );

  test('Actions that it doesn\'t have', () =>
    expect( typeof roa_machine.current_action_for('power_left') )
      .toBe('undefined') );

  test('Correct list type', () =>
    expect( Array.isArray(roa_la) )
      .toBe(true) );

  test('Correct list size', () =>
    expect( roa_la.length )
      .toBe(1) );

});





describe('Actions', () => {

  const act_machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { from: 'off', to: 'red', action: 'on',  kind: 'legal', forced_only: false, main_path: false },
      { from: 'red', to: 'off', action: 'off', kind: 'legal', forced_only: false, main_path: false }
    ]
  });

  test('Red has actions().length 1', () =>
    expect( act_machine.actions().length )
      .toBe(1) );

  test('Red has actions()[0] "on"', () =>
    expect( act_machine.actions()[0] )
      .toBe('on') );

  test('Red has actions().length 1 again', () =>
    expect( act_machine.actions('off').length )
      .toBe(1) );

  test('Red has actions()[0] "on" again', () =>
    expect( act_machine.actions('off')[0] )
      .toBe('on') );

  test('Red has actions().length 1 re-again', () =>
    expect( act_machine.actions('red').length )
      .toBe(1) );

  test('Red has actions()[0] "off" re-again', () =>
    expect( act_machine.actions('red')[0] )
      .toBe('off') );

});





describe('States having actions', () => {

  const sha_machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { from: 'off', to: 'red', action: 'on',  kind: 'legal', forced_only: false, main_path: false },
      { from: 'red', to: 'off', action: 'off', kind: 'legal', forced_only: false, main_path: false }
    ]
  });

  test('One action has "on"', () =>
    expect( sha_machine.list_states_having_action('on').length )
      .toBe(1) );

  test('"on" is had by "off"', () =>
    expect( sha_machine.list_states_having_action('on')[0] )
      .toBe('off') );

});





describe('List exit actions', () => {

  const lea_machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { from: 'off', to: 'red', action: 'on',  kind: 'legal', forced_only: false, main_path: false },
      { from: 'red', to: 'off', action: 'off', kind: 'legal', forced_only: false, main_path: false }
    ]
  });

  test('List exit actions, shows "on" from off as default', () =>
    expect( lea_machine.list_exit_actions()[0] )
      .toBe('on')  );

  test('List exit actions, shows "on" from off', () =>
    expect( lea_machine.list_exit_actions('off')[0] )
      .toBe('on') );

  test('List exit actions, shows "off" from red', () =>
    expect( lea_machine.list_exit_actions('red')[0] )
      .toBe('off') );

});





describe('Reports on action edges', () => {

  const roae_machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { name:'turn_on', action:'power_on', from:'off', to:'red', kind: 'legal', forced_only: false, main_path: false }
    ]
  });

  test('Reports on action edges, that it has', () =>
    expect( typeof roae_machine.current_action_edge_for('power_on') )
      .toBe('object') );

  test('Reports on action edges, that it doesn\'t have', () =>
    expect( () => roae_machine.current_action_edge_for('power_west') )
      .toThrow() );

});





describe('When states don\'t have actions', () => {

  const m = sm`a 'foo' -> b; a 'bar' -> c; b -> c;`;

  test('a has two actions', () =>
    expect( m.actions('a').sort() )
      .toStrictEqual(['bar', 'foo']) );

  test('b has zero actions', () =>
    expect( m.actions('b') )
      .toStrictEqual([]) );

  test('d throws, as d does not exist', () =>
    expect( () => m.actions('d') )
      .toThrow() );

  const m2 = sm`a -> b;`;

  test('a has zero actions', () =>
    expect( m2.actions('a') )
      .toStrictEqual([]) );

});





describe('uses_actions', () => {

  const does   = sm`a 'next' -> b;`,
        doesnt = sm`a -> b;`;

  test('uses_actions true when does', () =>
    expect( does.uses_actions )
      .toBe(true) );

  test('uses_actions false when doesn\'t', () =>
    expect( doesnt.uses_actions )
      .toBe(false) );

});





describe('Two nodes should be able to have matching edges with differing action labels', () => {

  // const machine = sm`a 'first' -> a; a 'second' -> a;`;

  // test('that it has',           () => expect( typeof machine.current_action_edge_for('power_on')  ).toBe('object') );
  // test('that it doesn\'t have', () => expect( () => machine.current_action_edge_for('power_west') ).toThrow()      );

  test.todo('todo - uncomment when #531 is resolved');

});
