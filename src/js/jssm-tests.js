
import {test, describe} from 'ava-spec';

const jssm = require('../../build/jssm.es5.js');





test('build-set version number is present', t => t.is(typeof jssm.version, 'string'));

const seq = upTo => new Array(upTo).fill(false).map( (_,i) => i );





describe('Stop light', async it => {

  const light = new jssm.machine({
    initial_state: 'red',
    transitions:[
      { name:'switch_warn', action: 'proceed', from:'green',  to:'yellow' },
      { name:'switch_halt', action: 'proceed', from:'yellow', to:'red'    },
      { name:'switch_go',   action: 'proceed', from:'red',    to:'green'  }
    ]
  });

  const r_states = light.states();
  it('has the right state count', t => t.is(r_states.length, 3));
  ['red', 'yellow', 'green'].map(c =>
  	it(`has state "${c}"`, t => t.is(r_states.includes(c), true))
  );

  const r_names = light.named_transitions();
  it('has the right named transition count', t => t.is(r_names.size, 3));
  ['switch_warn', 'switch_halt', 'switch_go'].map(a =>
  	it(`has named transition "${a}"`, t => t.is(r_names.has(a), true))
  );

});
