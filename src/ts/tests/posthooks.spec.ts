
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





describe('Posthook category flag set but specific lookup misses', () => {

  // These exercise the false arm of the per-category lookup guards in the
  // post-transition hook dispatcher: the category flag (_has_post_*_hooks) is
  // true because a hook of that kind exists somewhere, but THIS transition's
  // from/to/edge does not match a registered hook, so the lookup returns
  // undefined and the hook does not fire.

  test('exit-hook category set, but the transitioning from-state has no exit hook', () => {

    const hooked   = jest.fn(x => true),
          uncalled = jest.fn(x => true);

    const foo = sm`a -> b -> c;`;
    // Registering an exit hook on 'b' flips _has_post_exit_hooks true.
    foo.set_hook({ handler: hooked, from: 'b', kind: 'post exit' });
    // Also register a basic hook so the transition we make actually does
    // something observable; assert the exit hook stays uncalled.
    foo.set_hook({ handler: () => true, from: 'a', to: 'b', kind: 'post hook' });

    // Transition a -> b: 'a' has no exit hook, so the exit-hook lookup misses.
    foo.transition('b');
    expect(hooked.mock.calls.length).toBe(0);
    expect(uncalled.mock.calls.length).toBe(0);

  });


  test('basic-hook category set, but the transitioned edge has no basic hook', () => {

    const hooked = jest.fn(x => true);

    const foo = sm`a -> b -> c;`;
    // Registering a basic hook on b->c flips _has_post_basic_hooks true.
    foo.set_hook({ handler: hooked, from: 'b', to: 'c', kind: 'post hook' });

    // Transition a -> b: the b->c basic hook does not match this edge.
    foo.transition('b');
    expect(hooked.mock.calls.length).toBe(0);

  });


  test('main-type transition with no post-main hook registered', () => {

    const standard_hook = jest.fn(x => true);

    // Machine with a 'main' transition (=>). Register a *standard*-transition
    // post-hook: that sets _has_post_transition_hooks, which makes
    // transition_impl compute trans_type for a plain transition. With a main
    // edge, trans_type === 'main' is true — but _post_main_transition_hook
    // was never registered, so the post-main lookup takes its false arm.
    const foo = sm`a => b;`;
    foo.set_hook({ handler: standard_hook, kind: 'post standard transition' });

    expect( () => { foo.transition('b'); } ).not.toThrow();
    // The edge is 'main', not 'legal', so the standard-transition hook does
    // not fire — confirming we crossed a genuine main edge.
    expect(standard_hook.mock.calls.length).toBe(0);
    expect(foo.state()).toBe('b');

  });


  test('entry-hook category set, but the transitioned to-state has no entry hook', () => {

    const hooked = jest.fn(x => true);

    const foo = sm`a -> b -> c;`;
    // Registering an entry hook on 'c' flips _has_post_entry_hooks true.
    foo.set_hook({ handler: hooked, to: 'c', kind: 'post entry' });

    // Transition a -> b: 'b' has no entry hook, so the entry-hook lookup misses.
    foo.transition('b');
    expect(hooked.mock.calls.length).toBe(0);

  });

});





describe('Basic posthooks on fluent callpoint', () => {



  test('Fluent basic posthooks call their handler', () => {

    const handler  = jest.fn(x => true),
          uncalled = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a -> b -> c;`;
      _foo.post_hook('a', 'b', handler);
      _foo.post_hook('b', 'a', uncalled);
      _foo.post_hook('b', 'c', uncalled);
      _foo.transition('b');
    })
      .not.toThrow();

    // should hook from first, but not from second
    expect(handler.mock.calls.length).toBe(1);
    expect(uncalled.mock.calls.length).toBe(0);

  } );



  test('Fluent named hooks call their handler', () => {

    const handler  = jest.fn(x => true),
          uncalled = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a 'next' -> b 'next' -> c;`;
      _foo.post_hook_action('a', 'b', 'next', handler);
      _foo.post_hook_action('b', 'c', 'next', uncalled);
      _foo.post_hook_action('b', 'a', 'next', uncalled);
      _foo.action('next');
    })
      .not.toThrow();

    // should hook from first, but not from second
    expect(handler.mock.calls.length).toBe(1);
    expect(uncalled.mock.calls.length).toBe(0);

  } );



  test('Fluent basic and named hooks on same transition both fire when action is called', () => {

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



  test('Only fluent basic hook is called with named on same transition when transition is called', () => {

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



  test('Fluent standard posthooks call their handler', () => {

    const handler  = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a -> b -> c;`;
      _foo.post_hook_standard_transition(handler);
      _foo.transition('b');
    })
      .not.toThrow();

    expect(handler.mock.calls.length).toBe(1);

  } );



  test('Fluent main posthooks call their handler', () => {

    const handler  = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a => b => c;`;
      _foo.post_hook_main_transition(handler);
      _foo.transition('b');
    })
      .not.toThrow();

    expect(handler.mock.calls.length).toBe(1);

  } );



  test('Fluent forced posthooks call their handler', () => {

    const handler  = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a ~> b ~> c;`;
      _foo.post_hook_forced_transition(handler);
      _foo.force_transition('b');
    })
      .not.toThrow();

    expect(handler.mock.calls.length).toBe(1);

  } );



  test('Fluent any transition posthooks call their handler', () => {

    const handler = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a -> b => c ~> d;`;
      _foo.post_hook_any_transition(handler);
      _foo.transition('b');
      _foo.transition('c');
      _foo.force_transition('d');
    })
      .not.toThrow();

    expect(handler.mock.calls.length).toBe(3);

  } );



  test('Fluent exit posthooks call their handler', () => {

    const handler = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a -> b;`;
      _foo.post_hook_exit('a', handler);
      _foo.transition('b');
    })
      .not.toThrow();

    expect(handler.mock.calls.length).toBe(1);

  } );



  test('Fluent entry posthooks call their handler', () => {

    const handler = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a -> b;`;
      _foo.post_hook_entry('b', handler);
      _foo.transition('b');
    })
      .not.toThrow();

    expect(handler.mock.calls.length).toBe(1);

  } );



  test('Fluent global action posthooks call their handler', () => {

    const handler = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a 'next' -> b;`;
      _foo.post_hook_global_action('next', handler);
      _foo.action('next');
    })
      .not.toThrow();

    expect(handler.mock.calls.length).toBe(1);

  } );



  test('Fluent any action posthooks call their handler', () => {

    const handler = jest.fn(x => true);

    expect( () => {
      const _foo = sm`a 'next' -> b;`;
      _foo.post_hook_any_action(handler);
      _foo.action('next');
    })
      .not.toThrow();

    expect(handler.mock.calls.length).toBe(1);

  } );



});





describe('Everything posthooks on API callpoint', () => {


  test('Setting a pre post everything hook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a -> b;`;
      _foo.set_hook({ handler: () => {}, kind: 'pre post everything' })
    })
      .not.toThrow();

  });


  test('Setting a post everything hook doesn\'t throw', () => {

    expect( () => {
      const _foo = sm`a -> b;`;
      _foo.set_hook({ handler: () => {}, kind: 'post everything' })
    })
      .not.toThrow();

  });


});





describe('Pre post everything hook', () => {


  test('Pre post everything hook calls its handler', () => {

    const handler = jest.fn();

    const foo = sm`a -> b;`;
    foo.set_hook({ handler, kind: 'pre post everything' });
    foo.transition('b');

    expect(handler.mock.calls.length).toBe(1);

  });


  test('Fluent pre post everything hook calls its handler', () => {

    const handler = jest.fn();

    const foo = sm`a -> b;`;
    foo.hook_pre_post_everything(handler);
    foo.transition('b');

    expect(handler.mock.calls.length).toBe(1);

  });


  test('Pre post everything hook fires before other post-hooks', () => {

    const order = [];

    const foo = sm`a -> b;`;
    foo.hook_pre_post_everything( () => { order.push('pre_post_everything'); } );
    foo.set_hook({ handler: () => { order.push('post_entry'); }, to: 'b', kind: 'post entry' });
    foo.set_hook({ handler: () => { order.push('post_hook'); }, from: 'a', to: 'b', kind: 'post hook' });

    foo.transition('b');

    expect(order[0]).toBe('pre_post_everything');
    expect(order.length).toBe(3);

  });


  test('Pre post everything hook receives hook_name in context', () => {

    let received_name;

    const foo = sm`a -> b;`;
    foo.hook_pre_post_everything( (ctx) => { received_name = ctx.hook_name; } );

    foo.transition('b');
    expect(received_name).toBe('pre post everything');

  });


  test('Pre post everything hook fires on action transitions', () => {

    const handler = jest.fn();

    const foo = sm`a 'go' -> b;`;
    foo.hook_pre_post_everything(handler);
    foo.action('go');

    expect(handler.mock.calls.length).toBe(1);

  });


  test('Pre post everything hook fires on forced transitions', () => {

    const handler = jest.fn();

    const foo = sm`a ~> b;`;
    foo.hook_pre_post_everything(handler);
    foo.force_transition('b');

    expect(handler.mock.calls.length).toBe(1);

  });


});





describe('Post everything hook', () => {


  test('Post everything hook calls its handler', () => {

    const handler = jest.fn();

    const foo = sm`a -> b;`;
    foo.set_hook({ handler, kind: 'post everything' });
    foo.transition('b');

    expect(handler.mock.calls.length).toBe(1);

  });


  test('Fluent post everything hook calls its handler', () => {

    const handler = jest.fn();

    const foo = sm`a -> b;`;
    foo.hook_post_everything(handler);
    foo.transition('b');

    expect(handler.mock.calls.length).toBe(1);

  });


  test('Post everything hook fires after other post-hooks', () => {

    const order = [];

    const foo = sm`a -> b;`;
    foo.set_hook({ handler: () => { order.push('post_entry'); }, to: 'b', kind: 'post entry' });
    foo.set_hook({ handler: () => { order.push('post_hook'); }, from: 'a', to: 'b', kind: 'post hook' });
    foo.hook_post_everything( () => { order.push('post_everything'); } );

    foo.transition('b');

    expect(order[order.length - 1]).toBe('post_everything');
    expect(order.length).toBe(3);

  });


  test('Post everything hook receives hook_name in context', () => {

    let received_name;

    const foo = sm`a -> b;`;
    foo.hook_post_everything( (ctx) => { received_name = ctx.hook_name; } );

    foo.transition('b');
    expect(received_name).toBe('post everything');

  });


  test('Post everything hook fires on action transitions', () => {

    const handler = jest.fn();

    const foo = sm`a 'go' -> b;`;
    foo.hook_post_everything(handler);
    foo.action('go');

    expect(handler.mock.calls.length).toBe(1);

  });


  test('Post everything hook fires on forced transitions', () => {

    const handler = jest.fn();

    const foo = sm`a ~> b;`;
    foo.hook_post_everything(handler);
    foo.force_transition('b');

    expect(handler.mock.calls.length).toBe(1);

  });


  test('Pre post everything and post everything bracket other post-hooks', () => {

    const order = [];

    const foo = sm`a -> b;`;
    foo.hook_pre_post_everything( () => { order.push('pre_post'); } );
    foo.set_hook({ handler: () => { order.push('post_hook'); }, from: 'a', to: 'b', kind: 'post hook' });
    foo.hook_post_everything( () => { order.push('post'); } );

    foo.transition('b');

    expect(order).toEqual(['pre_post', 'post_hook', 'post']);

  });


  test('Post everything hooks bracket all post-hook types on action transitions', () => {

    const order = [];

    const foo = sm`a 'go' -> b;`;
    foo.hook_pre_post_everything( () => { order.push('pre_post'); } );
    foo.set_hook({ handler: () => { order.push('any_action'); }, kind: 'post any action' });
    foo.set_hook({ handler: () => { order.push('entry'); }, to: 'b', kind: 'post entry' });
    foo.set_hook({ handler: () => { order.push('exit'); }, from: 'a', kind: 'post exit' });
    foo.hook_post_everything( () => { order.push('post'); } );

    foo.action('go');

    expect(order[0]).toBe('pre_post');
    expect(order[order.length - 1]).toBe('post');
    expect(order.length).toBe(5);

  });


  test('Post everything hooks fire on multiple consecutive transitions', () => {

    const pre_cnt  = jest.fn();
    const post_cnt = jest.fn();

    const foo = sm`a -> b -> c;`;
    foo.hook_pre_post_everything(pre_cnt);
    foo.hook_post_everything(post_cnt);

    foo.transition('b');
    foo.transition('c');

    expect(pre_cnt).toHaveBeenCalledTimes(2);
    expect(post_cnt).toHaveBeenCalledTimes(2);

  });


  test('Pre post everything receives correct from/to on each transition', () => {

    const transitions: any[] = [];

    const foo = sm`a -> b -> c;`;
    foo.hook_pre_post_everything( (ctx: any) => { transitions.push({ from: ctx.from, to: ctx.to }); } );

    foo.transition('b');
    foo.transition('c');

    expect(transitions).toEqual([
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' }
    ]);

  });


  test('Post everything does not fire when transition is invalid', () => {

    const handler = jest.fn();

    const foo = sm`a -> b;`;
    foo.hook_post_everything(handler);

    expect(foo.transition('c')).toBe(false);
    expect(handler).not.toHaveBeenCalled();

  });


  test('Pre post everything does not fire when transition is invalid', () => {

    const handler = jest.fn();

    const foo = sm`a -> b;`;
    foo.hook_pre_post_everything(handler);

    expect(foo.transition('c')).toBe(false);
    expect(handler).not.toHaveBeenCalled();

  });


  test('Post everything does not fire when pre-hook rejects', () => {

    const handler = jest.fn();

    const foo = sm`a -> b;`;
    foo.set_hook({ kind: 'hook', from: 'a', to: 'b', handler: () => false });
    foo.hook_post_everything(handler);

    expect(foo.transition('b')).toBe(false);
    expect(handler).not.toHaveBeenCalled();

  });


  // Regression coverage for #642: nested-Map post-dispatch must short-circuit
  // when there is no inner map for the current from-state.
  test('Post named hook with non-matching from-state is silently skipped', () => {

    const uncalled = jest.fn();
    const foo = sm`a 'go' -> b; b 'go' -> c;`;
    foo.set_hook({ from: 'b', to: 'c', action: 'go', kind: 'post named', handler: uncalled });

    expect(foo.action('go')).toBe(true);
    expect(uncalled).not.toHaveBeenCalled();

  });


});
