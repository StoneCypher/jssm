
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;





describe('reject and accept correctly', async it => {

    const machine = sm` a ~> b -> c; `;

    it('starts in a',                    t => t.is('a',   machine.state()               ));
    it('rejects transition to b',        t => t.is(false, machine.transition('b')       ));
    it('still in a',                     t => t.is('a',   machine.state()               ));
    it('rejects transition to c',        t => t.is(false, machine.transition('c')       ));
    it('still in a 2',                   t => t.is('a',   machine.state()               ));
    it('rejects forced transition to c', t => t.is(false, machine.force_transition('c') ));
    it('still in a 3',                   t => t.is('a',   machine.state()               ));
    it('accepts forced transition to b', t => t.is(true,  machine.force_transition('b') ));
    it('now in b',                       t => t.is('b',   machine.state()               ));
    it('accepts transition to c',        t => t.is(true,  machine.transition('c')       ));
    it('now in c',                       t => t.is('c',   machine.state()               ));

});
