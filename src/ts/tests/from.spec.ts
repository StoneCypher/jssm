
import * as jssm from '../jssm';

const sm = jssm.sm;





describe('Creating with .from', () => {

  test('doesn\'t throw', () => {

    expect( () => { const _foo = jssm.from('a -> b;'); })
      .not.toThrow();

  });

  test('matches results from sm``', () => {

    const a = jssm.from('a -> b;'),
          b = sm`a -> b;`;

    // they will legitimately vary because the RNG seed is clock-set.
    // manually suppress that difference
    a.rng_seed = 1;
    b.rng_seed = 1;

    expect( `${a}` )
      .toStrictEqual( `${b}` );

  });

  test('honors pseudo-constructor', () => {

    expect( jssm.from('a -> b;', { instance_name: 'bob' }).instance_name() )
      .toBe('bob');

  });

});
