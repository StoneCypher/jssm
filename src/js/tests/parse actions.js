
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;





describe('matter', async it => {

    const matter = sm` Solid 'Heat' <-> 'Cool' Liquid 'Heat' <-> 'Cool' Gas 'Heat' <-> 'Cool' Plasma; `;

    it( 'starts Solid',    t => t.is('Solid',  matter.state()        ));
    it( 'Heat is true',    t => t.is(true,     matter.action('Heat') ));
    it( 'is now Liquid',   t => t.is('Liquid', matter.state()        ));
    it( 'Heat is true 2',  t => t.is(true,     matter.action('Heat') ));
    it( 'is now Gas',      t => t.is('Gas',    matter.state()        ));
    it( 'Heat is true 3',  t => t.is(true,     matter.action('Heat') ));
    it( 'is now Plasma',   t => t.is('Plasma', matter.state()        ));
    it( 'Heat is false',   t => t.is(false,    matter.action('Heat') ));
    it( 'is now Plasma 2', t => t.is('Plasma', matter.state()        ));
    it( 'Cool is true',    t => t.is(true,     matter.action('Cool') ));
    it( 'is now Gas 2',    t => t.is('Gas',    matter.state()        ));
    it( 'Cool is true 2',  t => t.is(true,     matter.action('Cool') ));
    it( 'is now Liquid 2', t => t.is('Liquid', matter.state()        ));
    it( 'Cool is true 3',  t => t.is(true,     matter.action('Cool') ));
    it( 'is now Solid',    t => t.is('Solid',  matter.state()        ));
    it( 'Cool is false',   t => t.is(false,    matter.action('Cool') ));
    it( 'is now Solid 2',  t => t.is('Solid',  matter.state()        ));

});
