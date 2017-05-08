
import test from 'ava';

const jssm = require('../../build/jssm.es5.js');





test('build-set version number is present', t => t.is(typeof jssm.version, 'string'));

const seq = upTo => new Array(upTo).fill(false).map( (_,i) => i );





test('Stop light', async t => {

    const light = new jssm.machine({
      initial_state: 'red',
      transitions:[
        { name:'switch_warn', from:'green',  to:'yellow' },
        { name:'switch_halt', from:'yellow', to:'red'    },
        { name:'switch_go',   from:'red',    to:'green'  }
      ]
    });

    t.is(light.states().length, 3);

});
