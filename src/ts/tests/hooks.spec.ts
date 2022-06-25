
import * as jssm from '../jssm';
const sm = jssm.sm;





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


  test('Setting an global action hook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a 'foo' -> b;`;
      _foo.set_hook({ handler: () => console.log('hi'), action: 'foo', kind: 'global action' })
    })
      .not.toThrow();

  });


  test('Setting an any-action hook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a 'foo' -> b;`;
      _foo.set_hook({ handler: () => console.log('hi'), kind: 'any action' })
    })
      .not.toThrow();

  });


  test('Setting an any-transition hook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a 'foo' -> b;`;
      _foo.set_hook({ handler: () => console.log('hi'), kind: 'any transition' })
    })
      .not.toThrow();

  });


  test('Setting an entry hook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a 'foo' -> b;`;
      _foo.set_hook({ to: 'b', handler: () => console.log('hi'), kind: 'entry' })
    })
      .not.toThrow();

  });


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





test('Standard transition hook rejection works', () => {

  const foo = sm`a -> b;`;

  foo.set_hook({ kind: 'standard transition', handler: () => false });
  expect(foo.transition('b')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.set_hook({ kind: 'standard transition', handler: () => true });
  expect(foo.transition('b')).toBe(true);
  expect(foo.state()).toBe('b');

});





test('Main transition hook rejection works', () => {

  const foo = sm`a => b;`;

  foo.set_hook({ kind: 'main transition', handler: () => false });
  expect(foo.transition('b')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.set_hook({ kind: 'main transition', handler: () => true });
  expect(foo.transition('b')).toBe(true);
  expect(foo.state()).toBe('b');

});





test('Forced transition hook rejection works', () => {

  const foo = sm`a ~> b;`;

  foo.set_hook({ kind: 'forced transition', handler: () => false });
  expect(foo.force_transition('b')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.set_hook({ kind: 'forced transition', handler: () => true });
  expect(foo.force_transition('b')).toBe(true);
  expect(foo.state()).toBe('b');

});





test('Standard transition fluent hook rejection works', () => {

  const foo = sm`a -> b;`
    .hook_standard_transition( () => false );

  expect(foo.transition('b')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.hook_standard_transition( () => true );

  expect(foo.transition('b')).toBe(true);
  expect(foo.state()).toBe('b');

});





test('Main transition fluent hook rejection works', () => {

  const foo = sm`a => b;`
    .hook_main_transition( () => false );

  expect(foo.transition('b')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.hook_main_transition( () => true );

  expect(foo.transition('b')).toBe(true);
  expect(foo.state()).toBe('b');

});





test('Forced transition fluent hook rejection works', () => {

  const foo = sm`a ~> b;`
    .hook_forced_transition( () => false );

  expect(foo.force_transition('b')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.hook_forced_transition( () => true );

  expect(foo.force_transition('b')).toBe(true);
  expect(foo.state()).toBe('b');

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





test('Global action hook rejection works', () => {

  const foo = sm`a 'foo' => b;`;

  foo.set_hook({ kind: 'global action', action: 'foo', handler: () => false });
  expect(foo.action('foo')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.set_hook({ kind: 'global action', action: 'foo', handler: () => true });
  expect(foo.action('foo')).toBe(true);
  expect(foo.state()).toBe('b');

});





test('All-action hook rejection works', () => {

  const foo = sm`a 'foo' => b;`;

  foo.set_hook({ kind: 'any action', handler: () => false });
  expect(foo.action('foo')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.set_hook({ kind: 'any action', handler: () => true });
  expect(foo.action('foo')).toBe(true);
  expect(foo.state()).toBe('b');

});





test('Fluent global action hook rejection works', () => {

  const foo = sm`a 'foo' => b;`
    .hook_global_action( 'foo', () => false );

  expect(foo.action('foo')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.hook_global_action( 'foo', () => true );

  expect(foo.action('foo')).toBe(true);
  expect(foo.state()).toBe('b');

});





test('Fluent all-action hook rejection works', () => {

  const foo = sm`a 'foo' => b;`
    .hook_any_action( () => false );

  expect(foo.action('foo')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.hook_any_action( () => true );

  expect(foo.action('foo')).toBe(true);
  expect(foo.state()).toBe('b');

});





test('All-transition hook rejection works on actions', () => {

  const foo = sm`a 'foo' => b;`;

  foo.set_hook({ kind: 'any transition', handler: () => false });
  expect(foo.action('foo')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.set_hook({ kind: 'any transition', handler: () => true });
  expect(foo.action('foo')).toBe(true);
  expect(foo.state()).toBe('b');

});





test('Entry hook rejection works', () => {

  const foo = sm`a => b => c;`;

  // test that an unused handler is never hit, for coverage
  foo.set_hook({ kind: 'entry', to: 'a', handler: () => { throw 'Should never hit, should be unused'; } });

  foo.set_hook({ kind: 'entry', to: 'b', handler: () => false });
  expect(foo.transition('b')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.set_hook({ kind: 'entry', to: 'b', handler: () => true });
  expect(foo.transition('b')).toBe(true);
  expect(foo.state()).toBe('b');

  // test that a third step doesn't inappropriately fire the handler, for coverage
  expect(foo.transition('c')).toBe(true);

});





test('Fluent entry hook works', () => {

  const cnt  = jest.fn(x => true),
        nope = jest.fn(x => true);

  const foo = sm`a => b => c;`
    .hook_entry('b', cnt)
    .hook_entry('c', nope);

  foo.transition('b');

  expect(cnt.mock.calls.length).toBe(1);
  expect(nope.mock.calls.length).toBe(0);

});





test('Exit hook rejection works', () => {

  const foo = sm`a => b => c;`;

  // test that an unused handler is never hit, for coverage
  foo.set_hook({ kind: 'exit', from: 'c', handler: () => { throw 'Should never hit, should be unused'; } });

  foo.set_hook({ kind: 'exit', from: 'a', handler: () => false });
  expect(foo.transition('b')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.set_hook({ kind: 'exit', from: 'a', handler: () => true });
  expect(foo.transition('b')).toBe(true);
  expect(foo.state()).toBe('b');

  // test that a third step doesn't inappropriately fire the handler, for coverage
  expect(foo.transition('c')).toBe(true);

});





test('Fluent exit hook works', () => {

  const cnt  = jest.fn(x => true),
        nope = jest.fn(x => true);

  const foo = sm`a => b => c;`
    .hook_exit('a', cnt)
    .hook_exit('b', nope);

  foo.transition('b');

  expect(cnt.mock.calls.length).toBe(1);
  expect(nope.mock.calls.length).toBe(0);

});





test('All-transition hook rejection works on transitions', () => {

  const foo = sm`a => b;`;

  foo.set_hook({ kind: 'any transition', handler: () => false });
  expect(foo.transition('b')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.set_hook({ kind: 'any transition', handler: () => true });
  expect(foo.transition('b')).toBe(true);
  expect(foo.state()).toBe('b');

});





test('All-transition hook rejection works on forced transitions', () => {

  const foo = sm`a ~> b;`;

  foo.set_hook({ kind: 'any transition', handler: () => false });
  expect(foo.force_transition('b')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.set_hook({ kind: 'any transition', handler: () => true });
  expect(foo.force_transition('b')).toBe(true);
  expect(foo.state()).toBe('b');

});





test('All-transition fluent hook rejection works on transitions', () => {

  const foo = sm`a => b;`
    .hook_any_transition( () => false );

  expect(foo.transition('b')).toBe(false);
  expect(foo.state()).toBe('a');

  foo.hook_any_transition( () => true );

  expect(foo.transition('b')).toBe(true);
  expect(foo.state()).toBe('b');

});





test('All-transition hook rejection prevents subsequent hooks', () => {

  const foo = sm`a => b;`,
        cnt = jest.fn(x => true);

  foo.set_hook({ kind: 'any transition', handler: () => false });
  foo.set_hook({ kind: 'hook',           handler: cnt,        from: 'a', to: 'b' });
  expect(foo.transition('b')).toBe(false);
  expect(foo.state()).toBe('a');
  expect(cnt.mock.calls.length).toBe(0);

  foo.set_hook({ kind: 'any transition', handler: () => true });
  expect(foo.transition('b')).toBe(true);
  expect(foo.state()).toBe('b');
  expect(cnt.mock.calls.length).toBe(1);

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



  test('Basic and named hooks on same transition both fire when action is called', () => {

    const basic = jest.fn(x => true),
          named = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a 'next' -> b;`;
      _foo.hook('a', 'b', basic);
      _foo.hook_action('a', 'b', 'next', named);
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
      _foo.hook('a', 'b', basic);
      _foo.hook_action('a', 'b', 'next', named);
      _foo.transition('b');
    })
      .not.toThrow();

    // should hook from first, but not from second
    expect(basic.mock.calls.length).toBe(1);
    expect(named.mock.calls.length).toBe(0);

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



  test('Named hooks call their handler', () => {

    const handler  = jest.fn(x => true),
          handler2 = jest.fn(x => true),
          handler3 = jest.fn(x => true),
          uncalled = jest.fn(x => true);

    expect( () => {

      const _foo = sm`a 'next' -> b 'next' -> c 'next' -> d 'next' -> e;`
        .hook_action('c', 'd', 'next', handler3)
        .hook_action('d', 'c', 'next', uncalled)
        .hook_action('d', 'e', 'borg', uncalled);

      _foo.hook_action('a', 'b', 'next', handler);
      _foo.hook_action('a', 'b', 'borg', uncalled);
      _foo.hook_action('b', 'a', 'next', uncalled);

      _foo.action('next');
      _foo.action('next');
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





describe('Hooks can change data (basic)', () => {

  test('Basic hook data change succeeds from no prior', () => {

    const foo = sm`a -> b;`
      .hook('a', 'b', () => ({ pass: true, data: 'creation value' }));

    foo.transition('b');
    expect( foo.data() ).toBe('creation value');

  });

  test('Basic hook data change succeeds from prior', () => {

    const foo = jssm.from('a -> b;', {data: 'original value'})
      .hook('a', 'b', () => ({ pass: true, data: 'you' }));

    foo.transition('b');
    expect( foo.data() ).toBe('you');

  });

});





describe('Hooks can change data (full matrix)', () => {

  const matrix_priors = [true, false],
        non_action    = ['basic', 'entry', 'exit', 'any', 'standard', 'main', /* 'forced', */ 'any_transition'], // TODO main, forced
        action_driven = ['action', 'gl_action', 'any_action'],
        matrix_hook   = [... non_action, ... action_driven],

        plans         = [];

  const setters = {
    'basic': (m: jssm.Machine<string>) => m.hook('a', 'b', () => ({ pass: true, data: 'creation value' })),
    'entry': (m: jssm.Machine<string>) => m.hook_entry('b', () => ({ pass: true, data: 'creation value' })),
    'exit': (m: jssm.Machine<string>) => m.hook_exit('a', () => ({ pass: true, data: 'creation value' })),
    'any': (m: jssm.Machine<string>) => m.hook_any_transition(() => ({ pass: true, data: 'creation value' })),
    'action': (m: jssm.Machine<string>) => m.hook_action('a', 'b', 'foo', () => ({ pass: true, data: 'creation value' })),
    'gl_action': (m: jssm.Machine<string>) => m.hook_global_action('foo', () => ({ pass: true, data: 'creation value' })),
    'any_action': (m: jssm.Machine<string>) => m.hook_any_action(() => ({ pass: true, data: 'creation value' })),
    'standard': (m: jssm.Machine<string>) => m.hook_standard_transition(() => ({ pass: true, data: 'creation value' })),
    'main': (m: jssm.Machine<string>) => m.hook_main_transition(() => ({ pass: true, data: 'creation value' })),
    'any_transition': (m: jssm.Machine<string>) => m.hook_any_transition(() => ({ pass: true, data: 'creation value' })),
  };

  const blockers = {
    'basic': (m: jssm.Machine<string>) => m.hook('a', 'b', () => ({ pass: false })),
    'entry': (m: jssm.Machine<string>) => m.hook_entry('b', () => ({ pass: false })),
    'exit': (m: jssm.Machine<string>) => m.hook_exit('a', () => ({ pass: false })),
    'any': (m: jssm.Machine<string>) => m.hook_any_transition(() => ({ pass: false })),
    'action': (m: jssm.Machine<string>) => m.hook_action('a', 'b', 'foo', () => ({ pass: false })),
    'gl_action': (m: jssm.Machine<string>) => m.hook_global_action('foo', () => ({ pass: false })),
    'any_action': (m: jssm.Machine<string>) => m.hook_any_action(() => ({ pass: false })),
    'standard': (m: jssm.Machine<string>) => m.hook_standard_transition(() => ({ pass: false })),
    'main': (m: jssm.Machine<string>) => m.hook_main_transition(() => ({ pass: false })),
    'any_transition': (m: jssm.Machine<string>) => m.hook_any_transition(() => ({ pass: false })),
  };

  const selfblockers = {
    'basic': (m: jssm.Machine<string>) => m.hook('a', 'b', () => ({ pass: false, data: 'never correct' })),
    'entry': (m: jssm.Machine<string>) => m.hook_entry('b', () => ({ pass: false, data: 'never correct' })),
    'exit': (m: jssm.Machine<string>) => m.hook_exit('a', () => ({ pass: false, data: 'never correct' })),
    'any': (m: jssm.Machine<string>) => m.hook_any_transition(() => ({ pass: false, data: 'never correct' })),
    'action': (m: jssm.Machine<string>) => m.hook_action('a', 'b', 'foo', () => ({ pass: false, data: 'never correct' })),
    'gl_action': (m: jssm.Machine<string>) => m.hook_global_action('foo', () => ({ pass: false, data: 'never correct' })),
    'any_action': (m: jssm.Machine<string>) => m.hook_any_action(() => ({ pass: false, data: 'never correct' })),
    'standard': (m: jssm.Machine<string>) => m.hook_standard_transition(() => ({ pass: false, data: 'never correct' })),
    'main': (m: jssm.Machine<string>) => m.hook_main_transition(() => ({ pass: false, data: 'never correct' })),
    'any_transition': (m: jssm.Machine<string>) => m.hook_any_transition(() => ({ pass: false, data: 'never correct' })),
  };


  matrix_priors.forEach(usePrior =>

    // good rules - senders - cause the change
    matrix_hook.forEach( (good, g) => {

      plans.push({ use_prior: usePrior, setter: good, blocker: undefined, g, b: undefined });

      // bad rules - blockers - block the change
      matrix_hook.forEach( (bad, b) => {

        // TODO - temporarily skip blocked-by-main and blocked-by-forced
        if (bad === 'main')   { return; }
        if (bad === 'forced') { return; }

        // single edge machines can't have both standard-and-main,
        // standard-and-forced, or main-and-forced in the same edge.  therefore
        // if the sender is one, don't test the other two (but do still test
        // self collision
        if (good === 'standard') { if ((bad === 'main')     || (bad === 'forced')) { return; } }
        if (good === 'main')     { if ((bad === 'standard') || (bad === 'forced')) { return; } }
        if (good === 'forced')   { if ((bad === 'standard') || (bad === 'main')  ) { return; } }

        let should_push = true;

        // if the sender isn't action driven, the blocker can't be either,
        // because the blocking event won't occur
        if ( (!(action_driven.includes(good))) && action_driven.includes(bad) ) {
          should_push = false;
        }

        if (should_push) {
          plans.push({ use_prior: usePrior, setter: good, blocker: bad, g, b });
        }

      });

      // now execute the plans (steeples evil fingers)
      plans.forEach(({ use_prior, setter, blocker, b, g }) => {

        let wwo,
            ctx,
            arrow;

        if (use_prior) {
          ctx = { data: 'original value' };
          wwo = "with";
        } else {
          ctx = undefined;
          wwo = "without";
        }

        switch (setter) {

          case 'main':
            arrow = '=>'; break;

          default:
            arrow = '->'; break;

        }

        const foo = jssm.from(`a 'foo' ${arrow} b;`, ctx);

        // if the blocker is the same as the setter
        if (b === g) {
          selfblockers[setter](foo);
        } else {
          setters[setter](foo);
          if (blocker) { blockers[blocker](foo); }
        }

        // what do we do to actually trigger it?  depends on if we are testing
        // an action trigger or a transition trigger
        if (action_driven.includes(setter)) {
          foo.action('foo');
        } else {
          foo.transition('b');
        }

        if (blocker) {

          if (b === g) {
            test(`self-blocking ${setter} ${wwo} prior`, () =>
              expect( foo.data() ).toBe(use_prior? 'original value' : undefined) );
          } else {
            test(`${setter} ${wwo} prior, blocked by ${blocker}`, () =>
              expect( foo.data() ).toBe(use_prior? 'original value' : undefined) );
          }

        } else {
          test(`${setter} ${wwo} prior, not blocked`, () =>
            expect( foo.data() ).toBe('creation value') );
        }

      });

    })
  );

});





describe('is_hook_complex_result', () => {

  test('true', () =>
    expect( jssm.is_hook_complex_result(true) )
      .toBe(false) );

  test('false', () =>
    expect( jssm.is_hook_complex_result(false) )
      .toBe(false) );

  test('undefined', () =>
    expect( jssm.is_hook_complex_result(undefined) )
      .toBe(false) );

  test('complex result pass', () =>
    expect( jssm.is_hook_complex_result( { pass: true } ) )
      .toBe(true) );

  test('complex result reject', () =>
    expect( jssm.is_hook_complex_result( { pass: false } ) )
      .toBe(true) );

});





describe('is_hook_rejection', () => {

  test('true', () =>
    expect( jssm.is_hook_rejection(true) )
      .toBe(false) );

  test('false', () =>
    expect( jssm.is_hook_rejection(false) )
      .toBe(true) );

  test('undefined', () =>
    expect( jssm.is_hook_rejection(undefined) )
      .toBe(false) );

  test('complex result pass', () =>
    expect( jssm.is_hook_rejection( { pass: true } ) )
      .toBe(false) );

  test('complex result reject', () =>
    expect( jssm.is_hook_rejection( { pass: false } ) )
      .toBe(true) );

  test('complex result on an invalid argument', () =>
    expect( () => jssm.is_hook_rejection( "blork" as any ) )
      .toThrow() );

});





describe('abstract_hook_step', () => {

  test('generates pass for undefined', () =>
    expect( jssm.abstract_hook_step(undefined, {data: undefined}) )
      .toStrictEqual({ pass: true }) );

  test('generates pass for function returning undefined', () => {
    const fn = jest.fn();
    expect( jssm.abstract_hook_step(fn, {data: undefined}) )
      .toStrictEqual({ pass: true })
    expect(fn).toHaveBeenCalled();
  });

  test('generates pass for function returning true', () => {
    const fn = jest.fn( () => true );
    expect( jssm.abstract_hook_step(fn, {data: undefined}) )
      .toStrictEqual({ pass: true })
    expect(fn).toHaveBeenCalled();
  });

  test('generates reject for function returning false', () => {
    const fn = jest.fn( () => false );
    expect( jssm.abstract_hook_step(fn, {data: undefined}) )
      .toStrictEqual({ pass: false })
    expect(fn).toHaveBeenCalled();
  });

  test('generates pass for function returning complex pass', () => {
    const fn = jest.fn( () => ({pass: true}) );
    expect( jssm.abstract_hook_step(fn, {data: undefined}) )
      .toStrictEqual({ pass: true })
    expect(fn).toHaveBeenCalled();
  });

  test('generates reject for function returning complex reject', () => {
    const fn = jest.fn( () => ({pass: false}) );
    expect( jssm.abstract_hook_step(fn, {data: undefined}) )
      .toStrictEqual({ pass: false })
    expect(fn).toHaveBeenCalled();
  });

  test('throws for hook returning illegal value', () => {
    expect( () => jssm.abstract_hook_step( () => "squid" as any, {data: undefined}) )
      .toThrow()
  });

});
