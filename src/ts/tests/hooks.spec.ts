
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


  test('Setting a regular hook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a -> b;`;
      _foo.set_hook({ from: 'a', to: 'b', handler: () => console.log('hi'), kind: 'hook' })
    })
      .not.toThrow();

  } );


  test('Setting a named hook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a 'foo' -> b;`;
      _foo.set_hook({ from: 'a', to: 'b', handler: () => console.log('hi'), kind: 'named', action: 'foo' })
    })
      .not.toThrow();

  } );

});





describe('Basic hooks on API callpoint', () => {

  test('Basic hooks call their handler', () => {

    const handler  = jest.fn(x => true),
          uncalled = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a -> b -> c;`;
      _foo.set_hook({ from: 'a', to: 'b', handler,           kind: 'hook' });
      _foo.set_hook({ from: 'b', to: 'a', handler: uncalled, kind: 'hook' });
      _foo.set_hook({ from: 'b', to: 'c', handler: uncalled, kind: 'hook' });
      _foo.transition('b');
    })
      .not.toThrow();

    // should hook from first, but not from second
    expect(handler.mock.calls.length).toBe(1);
    expect(uncalled.mock.calls.length).toBe(0);

  } );

  test('Named hooks call their handler', () => {

    const handler  = jest.fn(x => true),
          uncalled = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a 'next' -> b 'next' -> c;`;
      _foo.set_hook({ from: 'a', to: 'b', handler,           kind: 'named', action: 'next' });
      _foo.set_hook({ from: 'a', to: 'b', handler: uncalled, kind: 'named', action: 'borg' });
      _foo.set_hook({ from: 'b', to: 'a', handler: uncalled, kind: 'named', action: 'next' });
      _foo.action('next');
      _foo.action('next');
    })
      .not.toThrow();

    // should hook from first, but not from second
    expect(handler.mock.calls.length).toBe(1);
    expect(uncalled.mock.calls.length).toBe(0);

  } );

});
