
import * as jssm from '../jssm';





describe('Serialization', () => {





  test('Creating serializes', () => {

    const foo = jssm.from("a 'next' <-> 'next' b;");

    foo.do('next');
    foo.do('next');

    const ser = foo.serialize(),
          s2  = foo.serialize("test");

    expect(ser.jssm_version)
      .toBe(jssm.version);

    expect(typeof ser.timestamp)
      .toBe('number');

    expect(typeof ser.comment)
      .toBe('undefined');

    expect(s2.comment)
      .toBe('test');

    expect(ser.state)
      .toBe('a');

    expect(ser.history)
      .toStrictEqual( [] );

    expect(ser.history_capacity)
      .toBe(0);

    expect(ser.data)
      .toBe(undefined);

  });



  test('Creating with history and data serializes', () => {

    const foo = jssm.from("a 'next' <-> 'next' b;", { history: 5, data: 2 });

    foo.do('next');
    foo.do('next');

    const ser = foo.serialize(),
          s2  = foo.serialize("test");

    expect(ser.jssm_version)
      .toBe(jssm.version);

    expect(typeof ser.timestamp)
      .toBe('number');

    expect(typeof ser.comment)
      .toBe('undefined');

    expect(s2.comment)
      .toBe('test');

    expect(ser.state)
      .toBe('a');

    expect(ser.history)
      .toStrictEqual([ ['a',2], ['b',2] ]);

    expect(ser.history_capacity)
      .toBe(5);

    expect(ser.data)
      .toBe(2);

  });





} );
