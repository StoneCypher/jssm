
import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('weighted_sample_select/1', async it => {

  // wow is this hard to meaningfully test
  it('(0) generates []', t => t.deepEqual(
    [],
    jssm.weighted_sample_select(0, [{item:'a',probability:2},{item:'a',probability:3}]) )
  );



  describe('has reasonable unweighted distribution', async uit => {

    const unweighted = new jssm.Machine({

      initial_state: 'a',

      transitions: [

        { from: 'a', to: 'b' },
        { from: 'a', to: 'c' },

        { from: 'b', to: 'a' },
        { from: 'b', to: 'c' },

        { from: 'c', to: 'a' },
        { from: 'c', to: 'b' }

      ]

    });

    const res = unweighted.probabilistic_histo_walk(1500);

    // statistically each should be around 500.  raise alarms if they aren't 300.
    uit('a expects 500 requires 300', t => t.is(true, res.get('a') >= 300));
    uit('b expects 500 requires 300', t => t.is(true, res.get('b') >= 300));
    uit('c expects 500 requires 300', t => t.is(true, res.get('c') >= 300));

  });



  describe('has reasonable weighted distribution', async uit => {

    const weighted = new jssm.Machine({

      initial_state: 'a',

      transitions: [

        { from: 'a', to: 'b', probability: 0.5 },
        { from: 'a', to: 'c', probability: 4 },
        { from: 'a', to: 'd', probability: 0.5 },
        { from: 'a', to: 'e', probability: 0.5 },

        { from: 'b', to: 'a', probability: 0.5 },
        { from: 'b', to: 'c', probability: 4 },
        { from: 'b', to: 'd', probability: 0.5 },
        { from: 'b', to: 'e', probability: 0.5 },

        { from: 'c', to: 'a', probability: 0.5 },
        { from: 'c', to: 'b', probability: 0.5 },
        { from: 'c', to: 'd', probability: 0.5 },
        { from: 'c', to: 'e', probability: 0.5 },

        { from: 'd', to: 'a', probability: 0.5 },
        { from: 'd', to: 'b', probability: 0.5 },
        { from: 'd', to: 'c', probability: 4 },
        { from: 'd', to: 'e', probability: 0.5 },

        { from: 'e', to: 'a', probability: 0.5 },
        { from: 'e', to: 'b', probability: 0.5 },
        { from: 'e', to: 'c', probability: 4 },
        { from: 'e', to: 'd', probability: 0.5 }

      ]

    });

    const res = weighted.probabilistic_histo_walk(2500);

    // statistically each should be around 375, or 1050 for c.  raise alarms if they aren't 250, or 800 for c.
    uit('a expects 375 requires 250',  t => t.is(true, res.get('a') >= 250));
    uit('b expects 375 requires 250',  t => t.is(true, res.get('b') >= 250));
    uit('c expects 1050 requires 800', t => t.is(true, res.get('c') >= 800));
    uit('d expects 375 requires 250',  t => t.is(true, res.get('c') >= 250));
    uit('e expects 375 requires 250',  t => t.is(true, res.get('c') >= 250));

  });

  // stochastics would help, eg "every returned item is a member" and "in a
  // sufficient list any positive sample size is reasonable" and "always
  // returns the right sample size" - whargarbl todo


});





// stochable
