
import * as jssm from '../jssm';





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

    let   val_was = false;

    const _bar    = jssm.from('a -> b;', { data: 1 });
    _bar.hook_any_transition( ctx => val_was = ctx.data );
    _bar.transition('b');

    expect(val_was).toBe(1);


  });



  test('Hooks can read low-complex data (member a,) no mDT', () => {

    let   val_was = false;

    const _bar    = jssm.from('a -> b;', { data: { a: 1 } });
    _bar.hook_any_transition( ctx => val_was = ctx.data['a'] );
    _bar.transition('b');

    expect(val_was).toBe(1);

  });



  test('Hooks can read complex data (member a obj array idx 1,) no mDT', () => {

    let   val_was = false;

    const _bar    = jssm.from('a -> b;', { data: { a: [0,1,2] } });
    _bar.hook_any_transition( ctx => val_was = ctx.data['a'][1] );
    _bar.transition('b');

    expect(val_was).toBe(1);

  });


});
