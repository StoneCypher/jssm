
import * as jssm from '../jssm';
const sm = jssm.sm;





describe('Basic posthooks on API callpoint', () => {


  test('Setting a regular posthook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a -> b;`;
      _foo.set_hook({ from: 'a', to: 'b', handler: () => console.log('hi'), kind: 'post hook' })
    })
      .not.toThrow();

  } );


  test('Setting a named posthook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a 'foo' -> b;`;
      _foo.set_hook({ from: 'a', to: 'b', handler: () => console.log('hi'), kind: 'post named', action: 'foo' })
    })
      .not.toThrow();

  } );


  test('Setting an global action posthook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a 'foo' -> b;`;
      _foo.set_hook({ handler: () => console.log('hi'), action: 'foo', kind: 'post global action' })
    })
      .not.toThrow();

  });


  test('Setting an any-action posthook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a 'foo' -> b;`;
      _foo.set_hook({ handler: () => console.log('hi'), kind: 'post any action' })
    })
      .not.toThrow();

  });


  test('Setting an any-transition posthook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a 'foo' -> b;`;
      _foo.set_hook({ handler: () => console.log('hi'), kind: 'post any transition' })
    })
      .not.toThrow();

  });


  test('Setting an entry posthook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a 'foo' -> b;`;
      _foo.set_hook({ to: 'b', handler: () => console.log('hi'), kind: 'post entry' })
    })
      .not.toThrow();

  });


  test('Setting an exit posthook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a 'foo' -> b;`;
      _foo.set_hook({ from: 'a', handler: () => console.log('hi'), kind: 'post exit' })
    })
      .not.toThrow();

  });


});





describe('Basic posthooks on API callpoint', () => {



  test('Basic posthooks call their handler', () => {

    const handler  = jest.fn(x => true),
          uncalled = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a -> b -> c;`;
      _foo.set_hook({ from: 'a', to: 'b', handler,           kind: 'post hook' });
      _foo.set_hook({ from: 'b', to: 'a', handler: uncalled, kind: 'post hook' });
      _foo.set_hook({ from: 'b', to: 'c', handler: uncalled, kind: 'post hook' });
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
      _foo.set_hook({ from: 'a', to: 'b', handler,           kind: 'post named', action: 'next' });
      _foo.set_hook({ from: 'a', to: 'b', handler: uncalled, kind: 'post named', action: 'borg' });
      _foo.set_hook({ from: 'b', to: 'a', handler: uncalled, kind: 'post named', action: 'next' });
      _foo.action('next');
      _foo.action('next');
    })
      .not.toThrow();

    // should hook from first, but not from second
    expect(handler.mock.calls.length).toBe(1);
    expect(uncalled.mock.calls.length).toBe(0);

  } );



  test('Basic and named hooks on same transition both fire when action is called', () => {

    const basic = jest.fn(x => true),
          named = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a 'next' -> b;`;
      _foo.post_hook('a', 'b', basic);
      _foo.post_hook_action('a', 'b', 'next', named);
      _foo.action('next');
    })
      .not.toThrow();

    // should hook from first, but not from second
    expect(basic.mock.calls.length).toBe(1);
    expect(named.mock.calls.length).toBe(1);

  } );



  test('Only basic hook is called with named on same transition when transition is called', () => {

    const basic = jest.fn(x => true),
          named = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a 'next' -> b;`;
      _foo.post_hook('a', 'b', basic);
      _foo.post_hook_action('a', 'b', 'next', named);
      _foo.transition('b');
    })
      .not.toThrow();

    // should hook from first, but not from second
    expect(basic.mock.calls.length).toBe(1);
    expect(named.mock.calls.length).toBe(0);

  } );



  test('Standard posthooks call their handler', () => {

    const handler  = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a -> b -> c;`;
      _foo.set_hook({ handler, kind: 'post standard transition' });
      _foo.transition('b');
    })
      .not.toThrow();

    expect(handler.mock.calls.length).toBe(1);

  } );



  test('Main posthooks call their handler', () => {

    const handler  = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a => b => c;`;
      _foo.set_hook({ handler, kind: 'post main transition' });
      _foo.transition('b');
    })
      .not.toThrow();

    expect(handler.mock.calls.length).toBe(1);

  } );



  test('Forced posthooks call their handler', () => {

    const handler  = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a ~> b ~> c;`;
      _foo.set_hook({ handler, kind: 'post forced transition' });
      _foo.force_transition('b');
    })
      .not.toThrow();

    expect(handler.mock.calls.length).toBe(1);

  } );



  test('Any transition posthooks call their handler', () => {

    const handler = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a -> b => c ~> d;`;
      _foo.set_hook({ handler, kind: 'post any transition' });
      _foo.transition('b');
      _foo.transition('c');
      _foo.force_transition('d');
    })
      .not.toThrow();

    expect(handler.mock.calls.length).toBe(3);

  } );



  test('Exit posthooks call their handler', () => {

    const handler = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a -> b;`;
      _foo.set_hook({ handler, from: 'a', kind: 'post exit' });
      _foo.transition('b');
    })
      .not.toThrow();

    expect(handler.mock.calls.length).toBe(1);

  } );



  test('Entry posthooks call their handler', () => {

    const handler = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a -> b;`;
      _foo.set_hook({ handler, to: 'b', kind: 'post entry' });
      _foo.transition('b');
    })
      .not.toThrow();

    expect(handler.mock.calls.length).toBe(1);

  } );



});
