
import * as jssm from '../jssm';

const sm = jssm.sm;





describe('Round trip for machine without hooks', () => {

  const m1 = jssm.from('a -> b -> c -> a;', { data: 'initial', history: 5 });

  test('initial state', () => {
    expect(m1.state()).toBe('a');
    expect(m1.data()).toBe('initial');
  });

  test('first transition', () => {
    m1.go('b');
    expect(m1.state()).toBe('b');
    expect(m1.data()).toBe('initial');
  });

  test('first data change', () => {
    m1.go('c', 'newdata');
    expect(m1.state()).toBe('c');
    expect(m1.data()).toBe('newdata');
  });

  test('next unchanging transition', () => {
    m1.go('a');
    expect(m1.state()).toBe('a');
    expect(m1.data()).toBe('newdata');
  });

  test('second data change', () => {
    m1.go('b', 'lastdata');
    expect(m1.state()).toBe('b');
    expect(m1.data()).toBe('lastdata');
  });

  test('final transition', () => {
    m1.go('c');
    expect(m1.state()).toBe('c');
    expect(m1.data()).toBe('lastdata');
  });

  test('validate history', () => {
    expect(m1.history).toStrictEqual([
      ['a', 'initial'],
      ['b', 'initial'],
      ['c', 'newdata'],
      ['a', 'newdata'],
      ['b', 'lastdata']
    ]);
  });

});





describe('Data member separate from data retval', () => {

  const m1 = jssm.from('a -> b;', { data: { foo: 'first_value' } }),
        d  = m1.data();

  test('initial state updates', () => {

    expect(m1.data().foo).toBe( 'first_value' );
    expect(d.foo        ).toBe( 'first_value' );

    d.foo = 'second_value';

    expect(m1.data().foo).toBe( 'first_value'  );
    expect(d.foo        ).toBe( 'second_value' );

  });

});





describe('Round trip for machine with hooks', () => {

  const m1 = jssm.from('a -> b -> c -> a;', { data: 'initial', history: 5 });
  m1.hook_any_transition( () => true );
  m1.hook( 'c', 'a', () => { return { pass: true, data: 'c-c-c-combo breaker' } });

  test('initial state', () => {
    expect(m1.state()).toBe('a');
    expect(m1.data()).toBe('initial');
  });

  test('first transition', () => {
    m1.go('b');
    expect(m1.state()).toBe('b');
    expect(m1.data()).toBe('initial');
  });

  test('first data change', () => {
    m1.go('c', 'newdata');
    expect(m1.state()).toBe('c');
    expect(m1.data()).toBe('newdata');
  });

  test('next unchanging transition', () => {
    m1.go('a');
    expect(m1.state()).toBe('a');
    expect(m1.data()).toBe('c-c-c-combo breaker');
  });

  test('second data change', () => {
    m1.go('b', 'lastdata');
    expect(m1.state()).toBe('b');
    expect(m1.data()).toBe('lastdata');
  });

  test('final transition', () => {
    m1.go('c');
    expect(m1.state()).toBe('c');
    expect(m1.data()).toBe('lastdata');
  });

  test('validate history', () => {
    expect(m1.history).toStrictEqual([
      ['a', 'initial'],
      ['b', 'initial'],
      ['c', 'newdata'],
      ['a', 'c-c-c-combo breaker'],
      ['b', 'lastdata']
    ]);
  });

});





describe('Assert that hooks and data interact in correct ordering', () => {

  // Correct override order, lowest first:
  //   - just on the .go()
  //   - any action
  //   - global specific action
  //   - any transition
  //   - exit
  //   - specific action (named transition)
  //   - regular a->b
  //   - by edge type: standard
  //   - by edge type: main
  //   - by edge type: forced
  //   - enter

  test('data overrides: any_action overrides go()', () => {
    const m1 = jssm.from("a 'shoo' -> b;", { data: 'initial', history: 3 });
    m1.hook_any_action( () => { return { pass: true, data: 'hook haa wins' } } );
    m1.do('shoo', 'do/2 data wins');
    expect(m1.data()).toBe('hook haa wins');
  });

  test('data overrides: global_specific_action overrides any_action', () => {
    const m1 = jssm.from("a 'shoo' -> b;", { data: 'initial', history: 3 });
    m1.hook_any_action( () => { return { pass: true, data: 'hook haa wins' } } );
    m1.hook_global_action('shoo', () => { return { pass: true, data: 'hook hga wins' } });
    m1.do('shoo');
    expect(m1.data()).toBe('hook hga wins');
  });

  test('data overrides: any_transition overrides global_specific_action', () => {
    const m1 = jssm.from("a 'shoo' -> b;", { data: 'initial', history: 3 });
    m1.hook_global_action('shoo', () => { return { pass: true, data: 'hook hga wins' } });
    m1.hook_any_transition( () => { return { pass: true, data: 'hook hat wins' } } )
    m1.do('shoo');
    expect(m1.data()).toBe('hook hat wins');
  });

  test('data overrides: exit overrides any_transition', () => {
    const m1 = jssm.from("a 'shoo' -> b;", { data: 'initial', history: 3 });
    m1.hook_any_transition( () => { return { pass: true, data: 'hook hat wins' } } )
    m1.hook_exit( 'a', () => { return { pass: true, data: 'hook hex wins' } } )
    m1.do('shoo');
    expect(m1.data()).toBe('hook hex wins');
  });

  test('data overrides: specific_action overrides exit', () => {
    const m1 = jssm.from("a 'shoo' -> b;", { data: 'initial', history: 3 });
    m1.hook_exit( 'a', () => { return { pass: true, data: 'hook hex wins' } } )
    m1.hook_action( 'a', 'b', 'shoo', () => { return { pass: true, data: 'hook hsa wins' } } )
    m1.do('shoo');
    expect(m1.data()).toBe('hook hsa wins');
  });

  test('data overrides: regular_a_to_b overrides specific_action', () => {
    const m1 = jssm.from("a 'shoo' -> b;", { data: 'initial', history: 3 });
    m1.hook_action( 'a', 'b', 'shoo', () => { return { pass: true, data: 'hook hsa wins' } } )
    m1.hook( 'a', 'b', () => { return { pass: true, data: 'hook hra wins' } } )
    m1.do('shoo');
    expect(m1.data()).toBe('hook hra wins');
  });

  // you can't actually test that the three edge types override one another correctly,
  // because it's not possible to follow more than one edge type simultaneously.  so we'll
  // test that they all override regular correctly, and that enter overrides them all correctly

  test('data overrides: by_type_standard overrides regular_a_to_b', () => {
    const m1 = jssm.from("a 'shoo' -> b;", { data: 'initial', history: 3 });
    m1.hook( 'a', 'b', () => { return { pass: true, data: 'hook hra wins' } } )
    m1.hook_standard_transition( () => { return { pass: true, data: 'hook hst wins' } } )
    m1.do('shoo');
    expect(m1.data()).toBe('hook hst wins');
  });

  test('data overrides: by_type_main overrides regular_a_to_b', () => {
    const m1 = jssm.from("a 'shoo' => b;", { data: 'initial', history: 3 });
    m1.hook( 'a', 'b', () => { return { pass: true, data: 'hook hra wins' } } )
    m1.hook_main_transition( () => { return { pass: true, data: 'hook hmt wins' } } )
    m1.do('shoo');
    expect(m1.data()).toBe('hook hmt wins');
  });

  test('data overrides: by_type_forced overrides regular_a_to_b', () => {
    const m1 = jssm.from("a 'shoo' ~> b;", { data: 'initial', history: 3 });
    m1.hook( 'a', 'b', () => { return { pass: true, data: 'hook hra wins' } } )
    m1.hook_forced_transition( () => { return { pass: true, data: 'hook hft wins' } } )
    m1.force_transition('b');
    expect(m1.data()).toBe('hook hft wins');
  });

  // ... and that enter overrides them all correctly

  test('data overrides: enter overrides by_type_forced', () => {
    const m1 = jssm.from("a 'shoo' -> b;", { data: 'initial', history: 3 });
    m1.hook_standard_transition( () => { return { pass: true, data: 'hook hst wins' } } )
    m1.hook_entry('b', () => { return { pass: true, data: 'hook hen wins' } } );
    m1.do('shoo');
    expect(m1.data()).toBe('hook hen wins');
  });

  test('data overrides: enter overrides by_type_forced', () => {
    const m1 = jssm.from("a 'shoo' => b;", { data: 'initial', history: 3 });
    m1.hook_main_transition( () => { return { pass: true, data: 'hook hmt wins' } } )
    m1.hook_entry('b', () => { return { pass: true, data: 'hook hen wins' } } );
    m1.do('shoo');
    expect(m1.data()).toBe('hook hen wins');
  });

  test('data overrides: enter overrides by_type_forced', () => {
    const m1 = jssm.from("a 'shoo' ~> b;", { data: 'initial', history: 3 });
    m1.hook_forced_transition( () => { return { pass: true, data: 'hook hft wins' } } )
    m1.hook_entry('b', () => { return { pass: true, data: 'hook hen wins' } } );
    m1.do('shoo');
    expect(m1.data()).toBe('hook hen wins');
  });

});





describe('Constructor data', () => {



  test('No throw creating without data, no mDT', () => {

    expect( () => { const _foo = jssm.from('a -> b;'); })
      .not.toThrow();

  });



  test('No throw creating with undefined data, no mDT', () => {

    expect( () => { const _foo = jssm.from('a -> b;'); })
      .not.toThrow();

  });



  test('No throw creating with data (number 1,) no mDT', () => {

    expect( () => { const _foo = jssm.from('a -> b;', { data: 1 }); })
      .not.toThrow();

  });



  test('No throw creating with low-complex data (member a,) no mDT', () => {

    expect( () => { const _foo = jssm.from('a -> b;', { data: { a: 1 }}); })
      .not.toThrow();

  });



  test('No throw creating with complex data (member a array,) no mDT', () => {

    expect( () => { const _foo = jssm.from('a -> b;', { data: { a: [0,1,2] }}); })
      .not.toThrow();

  });



  test('Hooks can read simple data (number 1,) no mDT', () => {

    let val_was: any;

    const _bar = jssm.from('a -> b;', { data: 1 });
    _bar.hook_any_transition( ctx => { val_was = ctx.data; } );
    _bar.transition('b');

    expect(val_was).toBe(1);


  });



  test('Hooks can read low-complex data (member a,) no mDT', () => {

    let val_was: any;

    const _bar    = jssm.from('a -> b;', { data: { a: 1 } });
    _bar.hook_any_transition( ctx => { val_was = ctx.data; } );
    _bar.transition('b');

    expect(val_was).toStrictEqual({a: 1});

  });



  test('Hooks can read complex data (member a obj array idx 1,) no mDT', () => {

    let val_was: any;

    const _bar    = jssm.from('a -> b;', { data: { a: [0,1,2] } });
    _bar.hook_any_transition( ctx => { val_was = ctx.data; } );
    _bar.transition('b');

    expect(val_was).toStrictEqual({a: [0,1,2]});

  });


});





describe('next_data for each hook', () => {

  test("any action hook", () => {
    const m = jssm.from<string>("a 'nx' -> b;");
    let nd: string;
    m.hook_any_action( ({ next_data }) => { nd = next_data; });
    m.action('nx', 'foo');
    expect(nd).toBe('foo');
  });

  test("global specific action hook", () => {
    const m = jssm.from<string>("a 'nx' -> b;");
    let nd: string;
    m.hook_global_action( 'nx', ({ next_data }) => { nd = next_data; });
    m.action('nx', 'foo');
    expect(nd).toBe('foo');
  });

  test("any transition hook", () => {
    const m = jssm.from<string>('a -> b;');
    let nd: string;
    m.hook_any_transition( ({ next_data }) => { nd = next_data; });
    m.go('b', 'foo');
    expect(nd).toBe('foo');
  });

  test("exit hook", () => {
    const m = jssm.from<string>("a 'nx' -> b;");
    let nd: string;
    m.hook_exit( 'a', ({ next_data }) => { nd = next_data; });
    m.go('b', 'foo');
    expect(nd).toBe('foo');
  });

  test("action hook", () => {
    const m = jssm.from<string>("a 'nx' -> b;");
    let nd: string;
    m.hook_action( 'a', 'b', 'nx', ({ next_data }) => { nd = next_data; });
    m.action('nx', 'foo');
    expect(nd).toBe('foo');
  });

  test("regular ol' transition hook", () => {
    const m = jssm.from<string>('a -> b;');
    let nd: string;
    m.hook( 'a', 'b', ({ next_data }) => { nd = next_data; });
    m.go('b', 'foo');
    expect(nd).toBe('foo');
  });

  test("hook any standard transition", () => {
    const m = jssm.from<string>('a -> b;');
    let nd: string;
    m.hook_standard_transition( ({ next_data }) => { nd = next_data; });
    m.go('b', 'foo');
    expect(nd).toBe('foo');
  });

  test("hook any main transition", () => {
    const m = jssm.from<string>('a => b;');
    let nd: string;
    m.hook_main_transition( ({ next_data }) => { nd = next_data; });
    m.go('b', 'foo');
    expect(nd).toBe('foo');
  });

  test("hook any forced transition", () => {
    const m = jssm.from<string>('a ~> b;');
    let nd: string;
    m.hook_forced_transition( ({ next_data }) => { nd = next_data; });
    m.force_transition('b', 'foo');
    expect(nd).toBe('foo');
  });

  test("entry hook", () => {
    const m = jssm.from<string>("a 'nx' -> b;");
    let nd: string;
    m.hook_entry( 'b', ({ next_data }) => { nd = next_data; });
    m.go('b', 'foo');
    expect(nd).toBe('foo');
  });


});





describe('data/0 for reading current data', () => {

  test('data/0 for data 1', () => {

    const _bar = jssm.from('a -> b;', { data: 1 });
    const data = _bar.data();

    expect(data).toBe(1);

  } );





  test('data/0 for explicitly undefined data', () => {

    const _bar = jssm.from('a -> b;', { data: undefined });
    const data = _bar.data();

    expect(data).toBe(undefined);

  } );





  test('data/0 for data was never defined', () => {

    const _bar = jssm.from('a -> b;');
    const data = _bar.data();

    expect(data).toBe(undefined);

  } );

} );
