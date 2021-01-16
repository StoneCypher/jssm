
import * as jssm from '../jssm';





describe('weighted_rand_select/2', () => {

  const fruit = [ { label: 'apple',  probability: 0.1 },
                  { label: 'orange', probability: 0.4 },
                  { label: 'banana', probability: 0.5 } ];

  const acc = { apple: 0, orange: 0, banana: 0 };

  for (let i=0; i<10000; ++i) {
    acc[jssm.weighted_rand_select(fruit).label] = acc[jssm.weighted_rand_select(fruit).label] + 1;
  }

  test('banana baseline',                () => expect( acc.banana > 3000 ).toBe(true) );

  test('requires an array',              () => expect( () => jssm.weighted_rand_select( 'not_an_array' )).toThrow() );
  test('requires members to be objects', () => expect( () => jssm.weighted_rand_select( ['not_an_obj'] )).toThrow() );

});

// stochable
