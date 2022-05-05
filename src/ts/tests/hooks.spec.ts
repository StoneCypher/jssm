
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


  test('Setting a kind of hook that doesn\'t exist throws', () => {

    expect( () => {
      const _foo = sm`a 'foo' -> b;`;
      _foo.set_hook({ from: 'a', to: 'b', handler: () => console.log('hi'), kind: 'Smaug the Merciless', action: 'foo' } as any)
    })
      .toThrow();

  } );

});





test('Basic hook rejection works', () => {

  const foo = sm`a => b;`;

  foo.set_hook({ from: 'a', to: 'b', kind: 'hook', handler: () => false });
  expect(foo.transition('b')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.set_hook({ from: 'a', to: 'b', kind: 'hook', handler: () => true });
  expect(foo.transition('b')).toBe(true);
  expect(foo.state()).toBe('b');

});





test('Basic hook rejection works on forced edges', () => {

  const foo = sm`a ~> b ~> c;`;

  foo.set_hook({ from: 'a', to: 'b', kind: 'hook', handler: () => false });
  expect(foo.force_transition('b')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.set_hook({ from: 'a', to: 'b', kind: 'hook', handler: () => true });
  expect(foo.force_transition('b')).toBe(true);
  expect(foo.state()).toBe('b');

  // line completion for when a hook lookup finds nothing
  expect(foo.force_transition('c')).toBe(true);
  expect(foo.state()).toBe('c');

});





test('Named hook rejection works', () => {

  const foo = sm`a 'foo' => b;`;

  foo.set_hook({ from: 'a', to: 'b', action: 'foo', kind: 'named', handler: () => false });
  expect(foo.action('foo')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.set_hook({ from: 'a', to: 'b', action: 'foo', kind: 'named', handler: () => true });
  expect(foo.action('foo')).toBe(true);
  expect(foo.state()).toBe('b');

});





test('Named hook rejection doesn\'t block transitions', () => {

  const foo = sm`a 'foo' => b;`;

  foo.set_hook({ from: 'a', to: 'b', action: 'foo', kind: 'named', handler: () => false });
  expect(foo.action('foo')).toBe(false);
  expect(foo.state()).toBe('a');

  expect(foo.transition('b')).toBe(true);
  expect(foo.state()).toBe('b');

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

  test('Forced hooks call their handler', () => {

    const handler  = jest.fn(x => true),
          uncalled = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a ~> b ~> c;`;
      _foo.set_hook({ from: 'a', to: 'b', handler,           kind: 'hook' });
      _foo.set_hook({ from: 'b', to: 'a', handler: uncalled, kind: 'hook' });
      _foo.set_hook({ from: 'b', to: 'c', handler: uncalled, kind: 'hook' });
      _foo.force_transition('b');
    })
      .not.toThrow();

    // should hook from first, but not from second
    expect(handler.mock.calls.length).toBe(1);
    expect(uncalled.mock.calls.length).toBe(0);

  } );

});





describe('Basic hooks on fluent API', () => {

  test('Fluent hooks call their handler called fluently', () => {

    const handler  = jest.fn(x => true),
          uncalled = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a -> b -> c;`;
      _foo.hook('a', 'b', handler);
      _foo.hook('b', 'a', uncalled);
      _foo.hook('b', 'c', uncalled);
      _foo.transition('b');
    })
      .not.toThrow();

    // should hook from first, but not from second
    expect(handler.mock.calls.length).toBe(1);
    expect(uncalled.mock.calls.length).toBe(0);

  } );

  test('Fluent hooks call their handler called after', () => {

    const handler  = jest.fn(x => true),
          uncalled = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a -> b -> c;`;
      _foo.hook('a', 'b', handler);
      _foo.hook('b', 'a', uncalled);
      _foo.hook('b', 'c', uncalled);
      _foo.transition('b');
    })
      .not.toThrow();

    // should hook from first, but not from second
    expect(handler.mock.calls.length).toBe(1);
    expect(uncalled.mock.calls.length).toBe(0);

  } );

  test('Chained hooks call their handler, fluent or after', () => {

    const handler1 = jest.fn(x => true),
          handler2 = jest.fn(x => true),
          handler3 = jest.fn(x => true);

    let state_ex = undefined;

    expect( () => {

      const _foo = sm`a -> b -> c -> d;`
        .hook('a', 'b', handler1)
        .hook('b', 'c', handler2);

      _foo.hook('c', 'd', handler3);

      _foo.transition('b');
      _foo.transition('c');
      _foo.transition('d');

      state_ex = _foo.state();

    })
      .not.toThrow();

    expect( state_ex ).toBe('d');

    expect(handler1.mock.calls.length).toBe(1);
    expect(handler2.mock.calls.length).toBe(1);
    expect(handler3.mock.calls.length).toBe(1);

  } );

  // test('Named hooks call their handler', () => {

  //   const handler  = jest.fn(x => true),
  //         uncalled = jest.fn(x => true);

  //   expect( () => {
  //     const _foo = sm`a 'next' -> b 'next' -> c;`;
  //     _foo.hook_action('a', 'b', handler,  'next');
  //     _foo.hook_action('a', 'b', uncalled, 'borg');
  //     _foo.hook_action('b', 'a', uncalled, 'next');
  //     _foo.action('next');
  //     _foo.action('next');
  //   })
  //     .not.toThrow();

  //   // should hook from first, but not from second
  //   expect(handler.mock.calls.length).toBe(1);
  //   expect(uncalled.mock.calls.length).toBe(0);

  // } );

  test('Forced hooks call their handler', () => {

    const handler  = jest.fn(x => true),
          uncalled = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a ~> b ~> c;`;
      _foo.hook('a', 'b', handler);
      _foo.hook('b', 'a', uncalled);
      _foo.hook('b', 'c', uncalled);
      _foo.force_transition('b');
    })
      .not.toThrow();

    // should hook from first, but not from second
    expect(handler.mock.calls.length).toBe(1);
    expect(uncalled.mock.calls.length).toBe(0);

  } );

});
