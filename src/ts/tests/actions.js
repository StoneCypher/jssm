
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;





describe('reports on actions', async it => {

  const machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });

  const a = machine.list_actions();  // todo comeback

  it('that it has',           t => t.is('number',    typeof machine.current_action_for('power_on')   ) );
  it('that it doesn\'t have', t => t.is('undefined', typeof machine.current_action_for('power_left') ) );
  it('correct list type',     t => t.is(true,        Array.isArray(a)                                ) );
  it('correct list size',     t => t.is(1,           a.length                                        ) );

});





describe('actions', async it => {

  const machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[ { from:'off', to:'red', action:'on' }, { from:'red', to:'off',action:'off' } ]
  });

  it('red has actions().length 1',          t => t.is(1,     machine.actions().length      ) );
  it('red has actions()[0] "on"',           t => t.is('on',  machine.actions()[0]          ) );

  it('red has actions().length 1 again',    t => t.is(1,     machine.actions('off').length ) );
  it('red has actions()[0] "on" again',     t => t.is('on',  machine.actions('off')[0]     ) );

  it('red has actions().length 1 re-again', t => t.is(1,     machine.actions('red').length ) );
  it('red has actions()[0] "off" re-again', t => t.is('off', machine.actions('red')[0]     ) );

});





describe('states having action', async it => {

  const machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[ { from:'off', to:'red', action:'on' }, { from:'red', to:'off',action:'off' } ]
  });

  it('one action has on', t => t.is(1,     machine.list_states_having_action('on').length ) );
  it('on is had by off',  t => t.is('off', machine.list_states_having_action('on')[0]     ) );

});





describe('list exit actions', async it => {

  const machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[ { from:'off', to:'red', action:'on' }, { from:'red', to:'off',action:'off' } ]
  });

  it('shows "on" from off as default', t => t.is('on',  machine.list_exit_actions()[0]      ) );
  it('shows "on" from off',            t => t.is('on',  machine.list_exit_actions('off')[0] ) );
  it('shows "off" from red',           t => t.is('off', machine.list_exit_actions('red')[0] ) );

});





describe('reports on action edges', async it => {

  const machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });

  it('that it has',           t => t.is('object', typeof machine.current_action_edge_for('power_on')) );
  it('that it doesn\'t have', t => t.throws(() => { machine.current_action_edge_for('power_west'); }) );

});





// describe('two nodes should be able to have matching edges with differing action labels', async it => {

//   const machine = sm`a 'first' -> a; a 'second' -> a;`;

//   it('that it has',           t => t.is('object', typeof machine.current_action_edge_for('power_on')) );
//   it('that it doesn\'t have', t => t.throws(() => { machine.current_action_edge_for('power_west'); }) );

// });
