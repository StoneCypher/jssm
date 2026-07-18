
import * as jssm from '../jssm';





describe('weighted_rand_select/2', () => {

  const fruit = [ { label: 'apple',  probability: 0.1 },
                  { label: 'orange', probability: 0.4 },
                  { label: 'banana', probability: 0.5 } ];

  const acc = { apple: 0, orange: 0, banana: 0 };

  for (let i=0; i<10_000; ++i) {
    acc[jssm.weighted_rand_select(fruit).label] = acc[jssm.weighted_rand_select(fruit).label] + 1;
  }

  test('banana baseline',                () => expect( acc.banana > 3000 ).toBe(true) );

  // @ts-expect-error deliberately passing a non-array to prove the TypeError guard
  test('requires an array',              () => expect( () => jssm.weighted_rand_select( 'not_an_array' )).toThrow() );
  test('requires a non-empty array',    () => expect( () => jssm.weighted_rand_select( [] )).toThrow() );
  test('requires members to be objects', () => expect( () => jssm.weighted_rand_select( ['not_an_obj'] )).toThrow() );

  test('uses rng when provided', () => {

    const rng1 = jssm.gen_splitmix32(12_345);
    const rng2 = jssm.gen_splitmix32(12_345);

    const results1 = Array.from({length: 100}, () => jssm.weighted_rand_select(fruit, 'probability', rng1).label);
    const results2 = Array.from({length: 100}, () => jssm.weighted_rand_select(fruit, 'probability', rng2).label);

    expect(results1).toEqual(results2);

  });

  test('different rng seeds produce different results', () => {

    const rng1 = jssm.gen_splitmix32(12_345);
    const rng2 = jssm.gen_splitmix32(99_999);

    const results1 = Array.from({length: 100}, () => jssm.weighted_rand_select(fruit, 'probability', rng1).label);
    const results2 = Array.from({length: 100}, () => jssm.weighted_rand_select(fruit, 'probability', rng2).label);

    expect(results1).not.toEqual(results2);

  });

  test('honors a custom probability property name', () => {
    // a zero-weight option under the custom key can never be selected, so
    // every draw must land on the weighted one; this also exercises the
    // dynamic-keyed (non-'probability') load path
    const weighted = [ { label: 'never', weight: 0 }, { label: 'always', weight: 1 } ];
    for (let i = 0; i < 25; ++i) {
      expect( jssm.weighted_rand_select(weighted, 'weight').label ).toBe('always');
    }
  });

});

// stochable
