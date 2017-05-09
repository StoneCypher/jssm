
import {test, describe} from 'ava-spec';

const jssm = require('../../build/jssm.es5.js');





test('build-set version number is present', t => t.is(typeof jssm.version, 'string'));

const seq = upTo => new Array(upTo).fill(false).map( (_,i) => i );





describe('Simple stop light', async it => {

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





describe('Complex stop light', async it => {

  const light2 = new jssm.machine({

    initial_state: 'off',

    transitions:[

      { name:'turn_on',     action:'power_on',  from:'off',    to:'red'},

      {                     action:'power_off', from:'red',    to:'off', probability: 0.01 },
      {                     action:'power_off', from:'yellow', to:'off', probability: 0.01 },
      {                     action:'power_off', from:'green',  to:'off', probability: 0.01 },

      { name:'switch_warn',                     from:'green',  to:'yellow' },
      { name:'switch_halt',                     from:'yellow', to:'red'    },
      { name:'switch_go',                       from:'red',    to:'green'  }

    ]

  });

  const r_states = light2.states();
  it('has the right state count', t => t.is(r_states.length, 4));
  ['red', 'yellow', 'green', 'off'].map(c =>
  	it(`has state "${c}"`, t => t.is(r_states.includes(c), true))
  );

  const r_names = light2.named_transitions();
  it('has the right named transition count', t => t.is(r_names.size, 4));
  ['turn_on', 'switch_warn', 'switch_halt', 'switch_go'].map(a =>
  	it(`has named transition "${a}"`, t => t.is(r_names.has(a), true))
  );

});





describe('Illegal machines', async it => {

  it('catch repeated names', t => t.throws(() => {

    const same_name = new jssm.machine({
      initial_state: 'moot',
      transitions:[
        { name:'identical', from:'1', to:'2' },
        { name:'identical', from:'2', to:'3' }
      ]
    });

  }, Error));

});
