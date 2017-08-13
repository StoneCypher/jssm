
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('array on left', async it => {

  const aLeft = [{"from":"a","to":"d","kind":"legal"},{"from":"b","to":"d","kind":"legal"},{"from":"c","to":"d","kind":"legal"}];

  it('[a b c]->d;', t => t.deepEqual(aLeft, jssm.compile(jssm.parse('[a b c]->d;')).transitions ));

});





describe('array on right', async it => {

  const aRight = [{"from":"a","to":"b","kind":"legal"},{"from":"a","to":"c","kind":"legal"},{"from":"a","to":"d","kind":"legal"}];

  it('a->[b c d];', t => t.deepEqual(aRight, jssm.compile(jssm.parse('a->[b c d];')).transitions ));

});





describe('array on both sides', async it => {

  const aBoth = [{"from":"a","to":"x","kind":"legal"},{"from":"a","to":"y","kind":"legal"},{"from":"a","to":"z","kind":"legal"},{"from":"b","to":"x","kind":"legal"},{"from":"b","to":"y","kind":"legal"},{"from":"b","to":"z","kind":"legal"},{"from":"c","to":"x","kind":"legal"},{"from":"c","to":"y","kind":"legal"},{"from":"c","to":"z","kind":"legal"}];

  it('[a b c]->[x y z];', t => t.deepEqual(aBoth, jssm.compile(jssm.parse('[a b c]->[x y z];')).transitions ));

});
