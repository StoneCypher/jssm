
import { sm } from '../jssm';





describe('Hooks open and closed in grammar', () => {

  test.todo('Hooks open doesn\'t throw' /*, () => {

    expect( () => { const _foo = sm`hooks: open; a -> b;`; })
      .not.toThrow();

  } */);

  test.todo('Hooks closed doesn\'t throw' /*, () => {

    expect( () => { const _foo = sm`hooks: closed; a -> b;`; })
      .not.toThrow();

  } */);

});





describe('Basic hooks on API callpoint', () => {

  test('Setting a hook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a -> b;`;
      _foo.set_hook({ from: 'a', to: 'b', handler: () => console.log('hi'), kind: 'hook' })
    })
      .not.toThrow();

  } );

});
