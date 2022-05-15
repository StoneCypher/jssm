
import * as jssm from '../jssm';

const sm = jssm.sm;





describe('Creating with .from', () => {

  test('doesn\'t throw', () => {

    expect( () => { const _foo = jssm.from('a -> b;'); })
      .not.toThrow();

  });

  test('matches results from sm``', () => {

    expect( jssm.from('a -> b;') )
      .toStrictEqual( sm`a -> b;` );

  });

  test('honors pseudo-constructor', () => {

    expect( jssm.from('a -> b;', { instance_name: 'bob' }).instance_name() )
      .toBe('bob');

  });

});
