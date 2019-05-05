
import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js');





describe('named lists', async it => {

  it('alone',        t => t.notThrows(() => { jssm.parse('&b: [a c e];'); }) );
  it('before trans', t => t.notThrows(() => { jssm.parse('&b: [a c e]; a->c;'); }) );
  it('after trans',  t => t.notThrows(() => { jssm.parse('a->c; &b: [a c e];'); }) );

});
