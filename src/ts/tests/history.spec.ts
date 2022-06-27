
import * as jssm from '../jssm';





describe('History', () => {





  test('Creating with history doesn\'t throw', () => {

    expect( () => { const foo = jssm.from('a -> b;', { history: 5 }); })
      .not.toThrow();

  });





  test('Creating with history prepares history correctly', () => {

    const foo = jssm.from('a -> b;', { history: 5 });

    expect(foo.history_length).toBe(5);
    expect(foo.history).toStrictEqual([]);

  });





  test('History length is changeable from nil', () => {

    const foo = jssm.from("a 'next' <-> 'next' b;");

    expect(foo.history_length).toBe(0);
    expect(foo.history).toStrictEqual([]);

    foo.action('next');
    foo.action('next');

    expect(foo.history).toStrictEqual([]);
    foo.history_length = 3;
    expect(foo.history_length).toBe(3);

    foo.action('next');
    foo.action('next');

    expect(foo.history).toStrictEqual([ ['a',undefined], ['b',undefined] ]);

    foo.action('next');
    foo.action('next');

    expect(foo.history).toStrictEqual([ ['b',undefined], ['a',undefined], ['b',undefined] ]);

    foo.history_length = 0;
    expect(foo.history_length).toBe(0);
    expect(foo.history).toStrictEqual([]);

  });





  test('History length is changeable from initial', () => {

    const foo = jssm.from("a 'next' <-> 'next' b;", { history: 3 });

    expect(foo.history_length).toBe(3);
    expect(foo.history).toStrictEqual([]);

    foo.action('next');
    foo.action('next');

    expect(foo.history).toStrictEqual([ ['a',undefined], ['b',undefined] ]);

    foo.history_length = 0;
    expect(foo.history).toStrictEqual([]);
    expect(foo.history_length).toBe(0);

  });





  test('History cycles correctly unhooked', () => {

    const foo = jssm.from("a 'next' -> b 'next' -> c 'next' -> d 'next' -> e;", { history: 3 });

    foo.action('next');
    foo.action('next');
    foo.action('next');
    foo.action('next');

    expect( foo.history ).toStrictEqual( [ ['b',undefined], ['c',undefined], ['d',undefined] ] );

    expect( foo.history_inclusive ).toStrictEqual( [
      ['b',undefined], ['c',undefined], ['d',undefined], ['e',undefined]
    ] );

  });





  test('History cycles correctly when hooked', () => {

    const foo = jssm.from("a 'next' <-> 'next' b;", { history: 3, data: 0 });
    foo.hook_any_transition( ({data}) => ({ pass: true, data: data+1 }) );

    expect(foo.history_length).toBe(3);
    expect(foo.history).toStrictEqual([]);

    foo.action('next');
    expect(foo.history).toStrictEqual([ ['a',0] ]);

    foo.action('next');
    expect(foo.history).toStrictEqual([ ['a',0], ['b',1] ]);

    foo.action('next');
    expect(foo.history).toStrictEqual([ ['a',0], ['b',1], ['a',2] ]);

    foo.action('next');
    expect(foo.history).toStrictEqual([ ['b',1], ['a',2], ['b',3] ]);

    foo.action('next');
    expect(foo.history).toStrictEqual([ ['a',2], ['b',3], ['a',4] ]);

    foo.action('next');
    expect(foo.history).toStrictEqual([ ['b',3], ['a',4], ['b',5] ]);

    foo.action('next');
    expect(foo.history).toStrictEqual([ ['a',4], ['b',5], ['a',6] ]);

  });





} );
