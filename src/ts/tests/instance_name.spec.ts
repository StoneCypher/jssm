
import * as jssm from '../jssm';

const sm = jssm.sm;





describe('Basic hooks on API callpoint', () => {


  test('Setting an instance name during construction doesn\'t throw', () => {

    expect( () => {
      const _foo = jssm.from(`a -> b;`);
      _foo.set_hook({ from: 'a', to: 'b', handler: () => console.log('hi'), kind: 'hook' })
    })
      .not.toThrow();

  } );


  test('Setting an instance name after construction doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a -> b;`;
      _foo.set_hook({ from: 'a', to: 'b', handler: () => console.log('hi'), kind: 'hook' })
    })
      .not.toThrow();

  } );


} );
