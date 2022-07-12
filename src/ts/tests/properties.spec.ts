
import * as jssm from '../jssm';





describe('Creating with properties doesn\'t throw', () => {





  test('Creating with no default', () => {

    expect( () => jssm.from("property foo; a -> b;") )
      .not.toThrow();

  });



  test('Creating with boolean default', () => {

    expect( () => jssm.from("property foo default true; a -> b;") )
      .not.toThrow();

  });



  test('Creating with string default', () => {

    expect( () => jssm.from("property foo default \"one\"; a -> b;") )
      .not.toThrow();

  });



  test('Creating with number default', () => {

    expect( () => jssm.from("property foo default 1; a -> b;") )
      .not.toThrow();

  });



  test('Creating with special number default infinity', () => {

    expect( () => jssm.from("property foo default Infinity; a -> b;") )
      .not.toThrow();

  });



  test('Creating with special number default negative infinity', () => {

    expect( () => jssm.from("property foo default NegInfinity; a -> b;") )
      .not.toThrow();

  });



  test('Creating with special number default NaN', () => {

    expect( () => jssm.from("property foo default Infinity; a -> b;") )
      .not.toThrow();

  });



  test('Creating with special number default min safe integer', () => {

    expect( () => jssm.from("property foo default MinSafeInt; a -> b;") )
      .not.toThrow();

  });



  test('Creating with special number default max safe integer', () => {

    expect( () => jssm.from("property foo default MaxSafeInt; a -> b;") )
      .not.toThrow();

  });



  test('Creating with null default', () => {

    expect( () => jssm.from("property foo default null; a -> b;") )
      .not.toThrow();

  });



  test('Creating with undefined default', () => {

    expect( () => jssm.from("property foo default undefined; a -> b;") )
      .not.toThrow();

  });





});

