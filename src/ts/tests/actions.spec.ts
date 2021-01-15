
/* eslint-disable max-len */

const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;



describe('Reports on actions', () => {

  const roa_machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });

  const roa_la = roa_machine.list_actions();  // todo comeback

  test('Actions that it has',           () => expect( typeof roa_machine.current_action_for('power_on')   ).toBe('number')    );
  test('Actions that it doesn\'t have', () => expect( typeof roa_machine.current_action_for('power_left') ).toBe('undefined') );
  test('Correct list type',             () => expect( Array.isArray(roa_la)                               ).toBe(true)        );
  test('Correct list size',             () => expect( roa_la.length                                       ).toBe(1)           );

});





describe('Actions', () => {

  const act_machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[ { from:'off', to:'red', action:'on' }, { from:'red', to:'off',action:'off' } ]
  });

  test('Red has actions().length 1',          () => expect( act_machine.actions().length      ).toBe(1)     );
  test('Red has actions()[0] "on"',           () => expect( act_machine.actions()[0]          ).toBe('on')  );

  test('Red has actions().length 1 again',    () => expect( act_machine.actions('off').length ).toBe(1)     );
  test('Red has actions()[0] "on" again',     () => expect( act_machine.actions('off')[0]     ).toBe('on')  );

  test('Red has actions().length 1 re-again', () => expect( act_machine.actions('red').length ).toBe(1)     );
  test('Red has actions()[0] "off" re-again', () => expect( act_machine.actions('red')[0]     ).toBe('off') );

});





describe('States having actions', () => {

  const sha_machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[ { from:'off', to:'red', action:'on' }, { from:'red', to:'off',action:'off' } ]
  });

  test('One action has "on"',   () => expect( sha_machine.list_states_having_action('on').length ).toBe(1)     );
  test('"on" is had by "off"',  () => expect( sha_machine.list_states_having_action('on')[0]     ).toBe('off') );

});





describe('List exit actions', () => {

  const lea_machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[ { from:'off', to:'red', action:'on' }, { from:'red', to:'off',action:'off' } ]
  });

  test('List exit actions, shows "on" from off as default', () => expect( lea_machine.list_exit_actions()[0]      ).toBe('on')  );
  test('List exit actions, shows "on" from off',            () => expect( lea_machine.list_exit_actions('off')[0] ).toBe('on')  );
  test('List exit actions, shows "off" from red',           () => expect( lea_machine.list_exit_actions('red')[0] ).toBe('off') );

});





describe('Reports on action edges', () => {

  const roae_machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });

  test('Reports on action edges, that it has',           () => expect( typeof roae_machine.current_action_edge_for('power_on')  ).toBe('object') );
  test('Reports on action edges, that it doesn\'t have', () => expect( () => roae_machine.current_action_edge_for('power_west') ).toThrow()      );

});





describe('Two nodes should be able to have matching edges with differing action labels', () => {

  // const machine = sm`a 'first' -> a; a 'second' -> a;`;

  // test('that it has',           () => expect( typeof machine.current_action_edge_for('power_on')  ).toBe('object') );
  // test('that it doesn\'t have', () => expect( () => machine.current_action_edge_for('power_west') ).toThrow()      );

  test.todo('todo - uncomment when #531 is resolved');

});
