
import {
  seq,
  unique,
  find_repeated,
  make_mulberry_rand,
  name_bind_prop_and_state
} from '../jssm_util';





describe('seq', () => {

  test('zero', () => {
    expect(seq(0)).toStrictEqual([]);
  });

  test('one', () => {
    expect(seq(1)).toStrictEqual([0]);
  });

  test('five', () => {
    expect(seq(5)).toStrictEqual([0,1,2,3,4]);
  });

  test('fractions must throw', () => {
    expect( () => seq( 1.5 ) ).toThrow();
  });

  test('negatives must throw', () => {
    expect( () => seq( -2 ) ).toThrow();
  });

  test('NaN must throw', () => {
    expect( () => seq( NaN ) ).toThrow();
  });

  test('positive infinity must throw', () => {
    expect( () => seq( Number.POSITIVE_INFINITY ) ).toThrow();
  });

  test('negative infinity must throw', () => {
    expect( () => seq( Number.NEGATIVE_INFINITY ) ).toThrow();
  });

  test('strings must throw', () => {
    expect( () => seq( "2" as any ) ).toThrow();
  });

  test('arrays must throw', () => {
    expect( () => seq( [2] as any ) ).toThrow();
  });

  test('objects must throw', () => {
    expect( () => seq( {two: 2} as any ) ).toThrow();
  });

  test('booleans must throw', () => {
    expect( () => seq( false as any ) ).toThrow();
  });

  test('symbols must throw', () => {
    expect( () => seq( Symbol('two') as any ) ).toThrow();
  });

  test('undefined must throw', () => {
    expect( () => seq( undefined as any ) ).toThrow();
  });

  test('null must throw', () => {
    expect( () => seq( null as any ) ).toThrow();
  });

});





describe('make_mulberry_rand', () => {



  seq(3).map(n =>

    test(`Seed ${n} - Generates 500 numbers [0,1)`, () => {

      const rnd  = make_mulberry_rand(n);
      let   fail = false;

      seq(500).forEach(_ => {

        const r = rnd();

        if (typeof r !== 'number') { fail = true; }
        if (r < 0)                 { fail = true; }
        if (r >= 1)                { fail = true; }

      });

      expect(fail).toBe(false);

    })

  );



  const rnd = (n) => Math.floor(make_mulberry_rand( new Date().getTime()+n )() * Number.MAX_SAFE_INTEGER );

  [ rnd(0), rnd(1), rnd(2), rnd(3), rnd(4) ].map( n =>

    test(`Seed ${n} - Generates 500 numbers [0,1)`, () => {

      const rnd  = make_mulberry_rand(n);
      let   fail = false;

      seq(500).forEach(_ => {

        const r = rnd();

        if (typeof r !== 'number') { fail = true; }
        if (r < 0)                 { fail = true; }
        if (r >= 1)                { fail = true; }

      });

      expect(fail).toBe(false);

    })

  );



  test(`Seed undefined - Generates 500 numbers [0,1)`, () => {

    const rnd  = make_mulberry_rand();
    let   fail = false;

    seq(500).forEach(_ => {

      const r = rnd();

      if (typeof r !== 'number') { fail = true; }
      if (r < 0)                 { fail = true; }
      if (r >= 1)                { fail = true; }

    });

    expect(fail).toBe(false);

  });



});





describe('unique', () => {

  test('empty', () => {
    expect(unique<number>([])).toStrictEqual([]);
  });

  test('1', () => {
    expect(unique<number>([1])).toStrictEqual([1]);
  });

  test('1,1', () => {
    expect(unique<number>([1,1])).toStrictEqual([1]);
  });

  test('1,2', () => {
    expect(unique<number>([1,2])).toStrictEqual([1,2]);
  });

  test('1,2,1,2', () => {
    expect(unique<number>([1,2,1,2])).toStrictEqual([1,2]);
  });

  test('1,2,1.0,2.0', () => {
    expect(unique<number>([1,2,1.0,2.0])).toStrictEqual([1,2]);
  });

  test('"one","two","one"', () => {
    expect(unique<string>(["one","two","one"])).toStrictEqual(["one","two"]);
  });

  test('false,true,false', () => {
    expect(unique<boolean>([false,true,false])).toStrictEqual([false,true]);
  });

  test('NaN,undefined,null,NaN,undefined,null mixed type', () => {
    expect(unique<number | undefined | null>([NaN,undefined,null,NaN,undefined,null])).toStrictEqual([undefined,null]);
  });

  test('[1],[1]', () => {
    expect(unique<number[]>([ [1],[1] ])).toStrictEqual([ [1],[1] ]);
  });

  test('{one:1},{one:1}', () => {
    expect(unique<object>([{one:1},{one:1}])).toStrictEqual([ {one:1},{one:1} ]);
  });

});





describe('find_repeated', () => {

  test('empty', () => {
    expect(find_repeated<string>([])).toStrictEqual([]);
  });

  test('"a"', () => {
    expect(find_repeated<string>(["a"])).toStrictEqual([]);
  });

  test('"a","a"', () => {
    expect(find_repeated<string>(["a","a"])).toStrictEqual([ ["a",2] ]);
  });

  test('"a","a","a"', () => {
    expect(find_repeated<string>(["a","a","a"])).toStrictEqual([ ["a", 3] ]);
  });

  test('"a","b","a"', () => {
    expect(find_repeated<string>(["a","b","a"])).toStrictEqual([ ["a", 2] ]);
  });

  test('"a","b","a","b"', () => {
    expect(find_repeated<string>(["a","b","a","b"])).toStrictEqual([ ["a",2], ["b",2] ]);
  });

  test('"a","b","c","b","a"', () => {
    expect(find_repeated<string>(["a","b","c","b","a"])).toStrictEqual([ ["a",2], ["b",2] ]);
  });

  test('"a","b","c","b","a"', () => {
    expect(find_repeated<number>([0, NaN, 0, NaN])).toStrictEqual([ [0,2] ]);
  });

});





describe('name_bind_prop_and_state', () => {

  test('a,b', () => {
    expect(name_bind_prop_and_state('a','b')).toBe('["a","b"]');
  });

  test('false,b', () => {
    expect(() => name_bind_prop_and_state(false as any, 'b')).toThrow();
  });

  test('a,false', () => {
    expect(() => name_bind_prop_and_state('a', false as any)).toThrow();
  });

});
