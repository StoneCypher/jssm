
 

import * as jssm from '../jssm';





describe('stripe strategies', () => {



  const is_v = (str, v) =>
    // eslint-disable-next-line vitest/valid-title -- title is data-driven by design
    test(str, () =>
      expect( jssm.parse(str) ).toEqual(v)
    );



  describe('basic stripe', () => {
    is_v(
      '[a b c] -> +|1;',
      [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'stripe', value: 1}}}]
    );
  });

  describe('negative stripe', () => {
    is_v(
      '[a b c] -> -|1;',
      [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'stripe', value: -1}}}]
    );
  });

  describe('wide stripe', () => {
    is_v(
      '[a b c] -> +|2;',
      [{from: ['a','b','c'], key: 'transition', se: {kind: '->', to: {key: 'stripe', value: 2}}}]
    );
  });



  test('illegal fractional stripe throws', () => {

    expect( () =>
      jssm.parse('[a b c] -> +|2.5;')
    ).toThrow();

  });

});
