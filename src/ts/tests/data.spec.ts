
import * as jssm from '../jssm';

const sm = jssm.sm;





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
