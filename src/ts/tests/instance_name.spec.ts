
import { sm } from '../jssm';





describe('Basic hooks on API callpoint', () => {


  test('Setting a regular hook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a -> b;`;
      _foo.set_hook({ from: 'a', to: 'b', handler: () => console.log('hi'), kind: 'hook' })
    })
      .not.toThrow();

  } );


} );
