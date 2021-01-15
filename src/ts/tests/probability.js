
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js');





describe('probable exits for', async it => {

  const machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[ { from:'off', to:'red' } ]
  });

  it('probable exits are an array',       t => t.is(true,     Array.isArray(machine.probable_exits_for('off')) ) );
  it('one probable exit in example',      t => t.is(1,        machine.probable_exits_for('off').length         ) );
  it('exit is an object',                 t => t.is('object', typeof machine.probable_exits_for('off')[0]      ) );
  it('exit 0 has a string from property', t => t.is('string', typeof machine.probable_exits_for('off')[0].from ) );

});





describe('probable action exits', async it => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { from:'off', to:'red', action:'on' },
      { from:'red', to:'off',action:'off' }
    ]
  });

  it('probable action exits are an array',   t => t.is(true,  Array.isArray(machine.probable_action_exits())      ) );
  it('probable action exit 1 is on',         t => t.is('on',  machine.probable_action_exits()[0].action           ) );

  it('probable action exits are an array 2', t => t.is(true,  Array.isArray(machine.probable_action_exits('off')) ) );
  it('probable action exit 1 is on 2',       t => t.is('on',  machine.probable_action_exits('off')[0].action      ) );

  it('probable action exits are an array 3', t => t.is(true,  Array.isArray(machine.probable_action_exits('red')) ) );
  it('probable action exit 1 is on 3',       t => t.is('off', machine.probable_action_exits('red')[0].action      ) );

});





describe('probabilistic_transition', async it => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [ { from:'off', to:'red' } ]
  });

  machine.probabilistic_transition();

  it('solo after probabilistic is red', t => t.is('red', machine.state() ) );

});





describe('probabilistic_walk', async it => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [ { from:'off', to:'red' }, { from:'red', to:'off' } ]
  });

  machine.probabilistic_walk(3);

  it('solo after probabilistic walk 3 is red', t => t.is('red', machine.state() ) );

});





describe('probabilistic_histo_walk', async it => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [ { from:'off', to:'red' }, { from:'red', to:'off' } ]
  });

  const histo = machine.probabilistic_histo_walk(3);

  it('histo is a Map', t => t.is(true, histo instanceof Map) );
  it('histo red is 2', t => t.is(2,    histo.get('red'))     );
  it('histo off is 2', t => t.is(2,    histo.get('off'))     );

});





