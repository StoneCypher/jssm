
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


  describe('reverse basic cycle', async it => {
    is_v('+1 <- [a b c];', [{from: {key: 'cycle', value: 1}, key: 'transition', se: {kind: '<-', to: ['a','b','c']}}], it);
  });

  describe('reverse negative cycle', async it => {
    is_v('-1 <- [a b c];', [{from: {key: 'cycle', value: -1}, key: 'transition', se: {kind: '<-', to: ['a','b','c']}}], it);
  });

  describe('reverse nullary cycle', async it => {
    is_v('+0 <- [a b c];', [{from: {key: 'cycle', value: 0}, key: 'transition', se: {kind: '<-', to: ['a','b','c']}}], it);
  });

  describe('reverse wide cycle', async it => {
    is_v('+2 <- [a b c];', [{from: {key: 'cycle', value: 2}, key: 'transition', se: {kind: '<-', to: ['a','b','c']}}], it);
  });


  describe('bidi basic cycle', async it => {
    is_v('+1 <- [a b c] -> +1;', [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'cycle', value: 1}}}], it);
  });

  describe('bidi negative cycle', async it => {
    is_v('-1 <- [a b c] -> -1;', [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'cycle', value: -1}}}], it);
  });

  describe('bidi nullary cycle', async it => {
    is_v('+0 <- [a b c] -> +0;', [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'cycle', value: 0}}}], it);
  });

  describe('bidi wide cycle', async it => {
    is_v('+2 <- [a b c] -> +2;', [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'cycle', value: 2}}}], it);
  });

/*
  describe('full parse of 2-step cycle', async it => {
    it('[a b] -> +1;', t => t.deepEqual(
      sm`[a b] -> +1;`.list_edges(),
      [{"from":"a","to":"b","kind":"legal","forced_only":false,"main_path":false},
       {"from":"b","to":"a","kind":"legal","forced_only":false,"main_path":false}]
    ));
  });

/*
  describe('full parse of 5-step cycle', async it => {
    it('[a b c d e] -> +1;', t => t.deepEqual(
      sm`[a b] -> +1;`.list_edges(),
      [{"from":"a","to":"b","kind":"legal","forced_only":false,"main_path":false},
       {"from":"b","to":"c","kind":"legal","forced_only":false,"main_path":false},
       {"from":"c","to":"d","kind":"legal","forced_only":false,"main_path":false},
       {"from":"d","to":"e","kind":"legal","forced_only":false,"main_path":false},
       {"from":"e","to":"a","kind":"legal","forced_only":false,"main_path":false}]
    ));

  describe('full parse of 5-step reverse cycle', async it => {
    it('[a b c d e] -> -1;', t => t.deepEqual(
      sm`[a b] -> +1;`.list_edges(),
      [{"from":"a","to":"e","kind":"legal","forced_only":false,"main_path":false},
       {"from":"b","to":"a","kind":"legal","forced_only":false,"main_path":false},
       {"from":"c","to":"b","kind":"legal","forced_only":false,"main_path":false},
       {"from":"d","to":"c","kind":"legal","forced_only":false,"main_path":false},
       {"from":"e","to":"d","kind":"legal","forced_only":false,"main_path":false}]
    ));
  });

  describe('full parse of 5-step two-step cycle (star)', async it => {
    it('[a b c d e] -> +2;', t => t.deepEqual(
      sm`[a b] -> +1;`.list_edges(),
      [{"from":"a","to":"c","kind":"legal","forced_only":false,"main_path":false},
       {"from":"b","to":"d","kind":"legal","forced_only":false,"main_path":false},
       {"from":"c","to":"e","kind":"legal","forced_only":false,"main_path":false},
       {"from":"d","to":"a","kind":"legal","forced_only":false,"main_path":false},
       {"from":"e","to":"b","kind":"legal","forced_only":false,"main_path":false}]
    ));
  });
*/
  describe('illegal fractional cycle throws', async it => {
    it('throws', t => t.throws( () => {
      jssm.parse('[a b c] -> +2.5;');
    } ));
  });

});
