
import test from 'ava';

const jssm = require('../../build/jssm.es5.js');





test('build-set version number is present', t => t.is(typeof jssm.version, 'string'));

const seq = upTo => new Array(upTo).fill(false).map( (_,i) => i );





function promise_delay(how_long, f) {
    return new Promise( (resolve, reject) => setTimeout( () => { resolve(f()); }, how_long ) );
}

// todo whargarbl get rid of this nonsense before 1.0
seq(3000).map(i =>
    test(`Delay test ${i}`, t => promise_delay(Math.random() * 1500, () => { t.is(1,1); return 'res'; }))
);

// p_test('text', 'expected', test());





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
