
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('compile/1', async _parse_it => {

    describe('a->b;', async it => {
      const a_to_b_str = `a->b;`;
      it('doesn\'t throw', t => t.notThrows(() => { jssm.compile(jssm.parse(a_to_b_str)); }) );
    });

    describe('a->b->c;', async it => {
      const a_to_b_to_c_str = `a->b->c;`;
      it('doesn\'t throw', t => t.notThrows(() => { jssm.compile(jssm.parse(a_to_b_to_c_str)); }) );
    });

    describe('template tokens', async it => {
      const a_through_e_token_str = `a->${'b'}->c->${'d'}->e;`;
      it('doesn\'t throw', t => t.notThrows(() => { jssm.compile(jssm.parse(a_through_e_token_str)); }) );
    });

});





describe('error catchery', async _parse_it => {

    describe('unknown rule', async it => {
      it('throws', t => t.throws( () => { jssm.compile( [{"key":"FAKE_RULE","from":"a","se":{"kind":"->","to":"b"}}] ); } ));
    });

});

// stochable
