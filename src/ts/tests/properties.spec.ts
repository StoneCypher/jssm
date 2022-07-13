
import * as jssm from '../jssm';

const sm = jssm.sm;





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






describe('Read property defaults', () => {



  test('string', () => {
    const m = sm`property foo default "a"; a -> b;`;
    expect(m.prop('foo')).toBe('a');
  });


  test('number', () => {
    const m = sm`property foo default 1; a -> b;`;
    expect(m.prop('foo')).toBe(1);
  });


  test('boolean', () => {
    const m = sm`property foo default false; a -> b;`;
    expect(m.prop('foo')).toBe(false);
  });


  test('undefined', () => {
    const m = sm`property foo default undefined; a -> b;`;
    expect(m.prop('foo')).toBe(undefined);
  });


  test('null', () => {
    const m = sm`property foo default null; a -> b;`;
    expect(m.prop('foo')).toBe(null);
  });


  test('no default given', () => {
    const m = sm`property foo; a -> b;`;
    expect(m.prop('foo')).toBe(undefined);
  });



});





describe('List known properties', () => {



  test('One prop', () => {
    const m = sm`property foo default "a"; a -> b;`;
    expect(m.known_props()).toStrictEqual(['foo']);
  });


  test('Two props', () => {
    const m = sm`property foo default 1; property bar; a -> b;`,
          k = m.known_props();
    k.sort();
    expect(k).toStrictEqual(['bar','foo']);
  });


  test('No props', () => {
    const m = sm`a -> b;`;
    expect(m.known_props()).toStrictEqual([]);
  });



});





describe('Check whether a property is known', () => {

  test('Known property with default', () => {
    const example = sm`property foo default 1; a->b;`;
    expect(example.known_prop('foo')).toBe(true);
  });

  test('Known property without default', () => {
    const example = sm`property foo; a->b;`;
    expect(example.known_prop('foo')).toBe(true);
  });

  test('Unknown property on machine with properties', () => {
    const example = sm`property foo default 1; a->b;`;
    expect(example.known_prop('bar')).toBe(false);
  });

  test('Unknown property on machine without properties', () => {
    const example = sm`a->b;`;
    expect(example.known_prop('bar')).toBe(false);
  });

});





describe('Invalid property errors', () => {



  test('Repeated prop', () => {
    expect(() => {
      const m = sm`property foo default "a"; property foo default "a"; a -> b;`;
    }).toThrow();
  });


  test('Conflicted prop', () => {
    expect(() => {
      const m = sm`property foo default "a"; property foo default "b"; a -> b;`;
    }).toThrow();
  });



});
