
/* eslint-disable max-len */

import {test, describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js'),
      sm   = jssm.sm;





describe('cycle strategies', async _it => {

  const is_v = (str, v, it) => it(test, t => t.deepEqual(v, jssm.parse(str)));

  describe('basic cycle', async it => {
    is_v('[a b c] -> +1;', [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'cycle', value: 1}}}], it);
  });

  describe('negative cycle', async it => {
    is_v('[a b c] -> -1;', [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'cycle', value: -1}}}], it);
  });

  describe('nullary cycle', async it => {
    is_v('[a b c] -> +0;', [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'cycle', value: 0}}}], it);
  });

  describe('wide cycle', async it => {
    is_v('[a b c] -> +2;', [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'cycle', value: 2}}}], it);
  });

  describe('full parse', async it => {
    it('[a b] -> +1;', t => t.deepEqual(
      sm`[a b] -> +1;`.list_edges(),
      [{"from":"a","to":"b","kind":"legal","forced_only":false,"main_path":false},{"from":"b","to":"a","kind":"legal","forced_only":false,"main_path":false}]
    ));
  });

  describe('illegal fractional cycle throws', async it => {
    it('throws', t => t.throws( () => {
      jssm.parse('[a b c] -> +2.5;');
    } ));
  });

});
