
import * as jssm from '../jssm';





describe('weighted_sample_select/2', () => {

  const fruit = [ { label: 'apple',  probability: 0.1 },
                  { label: 'orange', probability: 0.4 },
                  { label: 'banana', probability: 0.5 } ];

  const none = jssm.weighted_sample_select(0, fruit),
        one  = jssm.weighted_sample_select(1, fruit),
        some = jssm.weighted_sample_select(2, fruit),
        over = jssm.weighted_sample_select(4, fruit);

  test('0 returns []',                () => expect(none.length).toBe(0) );
  test('1 returns [any]',             () => expect(one.length ).toBe(1) );
  test('2 returns [any,any]',         () => expect(some.length).toBe(2) );
  test('4 returns [any,any,any,any]', () => expect(over.length).toBe(4) );

});
