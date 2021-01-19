
/* eslint-disable max-len */

import * as jssm from '../jssm';





const testdata = [

  [
    'basic cycle',
    '[a b c] -> +1;',
    [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'cycle', value: 1}}}]
  ],

  [
    'negative cycle',
    '[a b c] -> -1;',
    [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'cycle', value: -1}}}]
  ],

  [
    'nullary cycle',
    '[a b c] -> +0;',
    [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'cycle', value: 0}}}]
  ],

  [
    'wide cycle',
    '[a b c] -> +2;',
    [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'cycle', value: 2}}}]
  ],

  [
    'reverse basic cycle',
    '+1 <- [a b c];',
    [{from: {key: 'cycle', value: 1}, key: 'transition', se: {kind: '<-', to: ['a','b','c']}}]
  ],

  [
    'reverse negative cycle',
    '-1 <- [a b c];',
    [{from: {key: 'cycle', value: -1}, key: 'transition', se: {kind: '<-', to: ['a','b','c']}}]
  ],

  [
    'reverse nullary cycle',
    '+0 <- [a b c];',
    [{from: {key: 'cycle', value: 0}, key: 'transition', se: {kind: '<-', to: ['a','b','c']}}]
  ],

  [
    'reverse wide cycle',
    '+2 <- [a b c];',
    [{from: {key: 'cycle', value: 2}, key: 'transition', se: {kind: '<-', to: ['a','b','c']}}]
  ],

  [
    'bidi basic cycle',
    '+1 <- [a b c] -> +1;',
    [{from: {key: 'cycle', value:  1}, key: 'transition', se: {kind: '<-', se: {kind: '->', to: {key: 'cycle', value:  1}}, to: ['a','b','c']}}]
  ],

  [
    'bidi negative cycle',
    '-1 <- [a b c] -> -1;',
    [{from: {key: 'cycle', value: -1}, key: 'transition', se: {kind: '<-', se: {kind: '->', to: {key: 'cycle', value: -1}}, to: ['a','b','c']}}]
  ],

  [
    'bidi basic/negative cycle',
    '+1 <- [a b c] -> -1;',
    [{from: {key: 'cycle', value:  1}, key: 'transition', se: {kind: '<-', se: {kind: '->', to: {key: 'cycle', value: -1}}, to: ['a','b','c']}}]
  ],

  [
    'bidi nullary cycle',
    '+0 <- [a b c] -> +0;',
    [{from: {key: 'cycle', value:  0}, key: 'transition', se: {kind: '<-', se: {kind: '->', to: {key: 'cycle', value:  0}}, to: ['a','b','c']}}]
  ],

  [
    'bidi wide cycle',
    '+2 <- [a b c] -> -2;',
    [{from: {key: 'cycle', value:  2}, key: 'transition', se: {kind: '<-', se: {kind: '->', to: {key: 'cycle', value: -2}}, to: ['a','b','c']}}]
  ]

];





describe('cycle strategies', () => {


  const is_v = (label, str, v) =>
    test(`${label} (strategy ${str})`, () =>
      expect( jssm.parse(str) ).toEqual(v) );

  testdata.map( ([ label, code, res ]) => is_v(label, code, res) );

  test.todo('cycle full parses');

/*
  describe('full parse of 2-step cycle', () => {
    it('[a b] -> +1;', t => t.deepEqual(
      sm`[a b] -> +1;`.list_edges(),
      [{"from":"a","to":"b","kind":"legal","forced_only":false,"main_path":false},
       {"from":"b","to":"a","kind":"legal","forced_only":false,"main_path":false}]
    ));
  });

  describe('full parse of 5-step cycle', () => {
    it('[a b c d e] -> +1;', t => t.deepEqual(
      sm`[a b] -> +1;`.list_edges(),
      [{"from":"a","to":"b","kind":"legal","forced_only":false,"main_path":false},
       {"from":"b","to":"c","kind":"legal","forced_only":false,"main_path":false},
       {"from":"c","to":"d","kind":"legal","forced_only":false,"main_path":false},
       {"from":"d","to":"e","kind":"legal","forced_only":false,"main_path":false},
       {"from":"e","to":"a","kind":"legal","forced_only":false,"main_path":false}]
    ));

  describe('full parse of 5-step reverse cycle', () => {
    it('[a b c d e] -> -1;', t => t.deepEqual(
      sm`[a b] -> +1;`.list_edges(),
      [{"from":"a","to":"e","kind":"legal","forced_only":false,"main_path":false},
       {"from":"b","to":"a","kind":"legal","forced_only":false,"main_path":false},
       {"from":"c","to":"b","kind":"legal","forced_only":false,"main_path":false},
       {"from":"d","to":"c","kind":"legal","forced_only":false,"main_path":false},
       {"from":"e","to":"d","kind":"legal","forced_only":false,"main_path":false}]
    ));
  });

  describe('full parse of 5-step two-step cycle (star)', () => {
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

});

test('illegal fractional cycle throws', () => {
  expect( () => jssm.parse('[a b c] -> +2.5;') ).toThrow();
});
