
/* eslint-disable max-len */

import {test, describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('stripe strategies', async _it => {

  const is_v = (str, v, it) => it(test, t => t.deepEqual(v, jssm.parse(str)));

  describe('basic stripe', async it => {
    is_v('[a b c] -> +|1;', [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'stripe', value: 1}}}], it);
  });

  describe('negative stripe', async it => {
    is_v('[a b c] -> -|1;', [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'stripe', value: -1}}}], it);
  });

  describe('wide stripe', async it => {
    is_v('[a b c] -> +|2;', [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'stripe', value: 2}}}], it);
  });

  describe('illegal fractional stripe throws', async it => {
    it('throws', t => t.throws( () => {
      jssm.parse('[a b c] -> +|2.5;');
    } ));
  });

});
