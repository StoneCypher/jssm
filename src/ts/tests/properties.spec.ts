
import * as jssm from '../jssm';
const sm = jssm.sm;

import { JssmGenericConfig } from '../jssm_types';





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

    expect( () => jssm.from("property foo default Inf; a -> b;") )
      .not.toThrow();

  });



  test('Creating with special number default negative infinity', () => {

    expect( () => jssm.from("property foo default NInf; a -> b;") )
      .not.toThrow();

  });



  test('Creating with special number default NaN', () => {

    expect( () => jssm.from("property foo default NaN; a -> b;") )
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



  test('Creating with special number default min pos num', () => {

    expect( () => jssm.from("property foo default MinPosNum; a -> b;") )
      .not.toThrow();

  });



  test('Creating with special number default max pos num', () => {

    expect( () => jssm.from("property foo default MaxPosNum; a -> b;") )
      .not.toThrow();

  });



  test('Creating with special number default epsilon', () => {

    expect( () => jssm.from("property foo default Epsilon; a -> b;") )
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





describe('Basic usage', () => {

  const traffic_light = sm`

    property can_go     default true;
    property hesitate   default true;
    property stop_first default false;

    Off -> Red => Green => Yellow => Red;
    [Red Yellow Green] ~> Off;

    state Red:         { property: stop_first true;  property: can_go false; };
    state Off:         { property: stop_first true;  };
    state Green:       { property: hesitate   false; };

  `;

  describe('Off state props', () => {
    expect(traffic_light.state()).toBe('Off');
    expect(traffic_light.props()).toStrictEqual({ can_go: true, hesitate: true, stop_first: true });
  });

  traffic_light.go('Red');

  describe('Red state props', () => {
    expect(traffic_light.state()).toBe('Red');
    expect(traffic_light.props()).toStrictEqual({ can_go: false, hesitate: true, stop_first: true });
  });

  traffic_light.go('Green');

  describe('Green state props', () => {
    expect(traffic_light.state()).toBe('Green');
    expect(traffic_light.props()).toStrictEqual({ can_go: true, hesitate: false, stop_first: false });
  });

  traffic_light.go('Yellow');

  describe('Yellow state props', () => {
    expect(traffic_light.state()).toBe('Yellow');
    expect(traffic_light.props()).toStrictEqual({ can_go: true, hesitate: true, stop_first: false });
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


  test('no default given but present on state', () => {
    const m = sm`property foo; a -> b; state b: { property: foo 1; };`;
    m.go('b');
    expect(m.prop('foo')).toBe(1);
  });


  test('default given but overridden on state', () => {
    const m = sm`property foo default 1; a -> b; state b: { property: foo 2; };`;
    m.go('b');
    expect(m.prop('foo')).toBe(2);
  });


  test('no default given, should supplant undefined', () => {
    const m = sm`property foo; a -> b;`;
    expect(m.prop('foo')).toBe(undefined);
  });



});





describe('Property requirement', () => {



  test('string', () => {
    const m = sm`property foo required; a -> b; state a: { property: foo "a"; }; state b: { property: foo "b"; };`;
    expect(m.prop('foo')).toBe('a');
    m.go('b');
    expect(m.prop('foo')).toBe('b');
  });


  test('number', () => {
    const m = sm`property foo required; a -> b; state a: { property: foo 1; }; state b: { property: foo 2; };`;
    expect(m.prop('foo')).toBe(1);
    m.go('b');
    expect(m.prop('foo')).toBe(2);
  });


  test('boolean', () => {
    const m = sm`property foo required; a -> b; state a: { property: foo true; }; state b: { property: foo false; };`;
    expect(m.prop('foo')).toBe(true);
    m.go('b');
    expect(m.prop('foo')).toBe(false);
  });


  test('undefined and null', () => {
    const m = sm`property foo required; a -> b; state a: { property: foo undefined; }; state b: { property: foo null; };`;
    expect(m.prop('foo')).toBe(undefined);
    m.go('b');
    expect(m.prop('foo')).toBe(null);
  });



});





describe('Strictly read property', () => {



  test('string', () => {
    const m = sm`property foo default "a"; a -> b;`;
    expect(m.strict_prop('foo')).toBe('a');
  });


  test('number', () => {
    const m = sm`property foo default 1; a -> b;`;
    expect(m.strict_prop('foo')).toBe(1);
  });


  test('boolean', () => {
    const m = sm`property foo default false; a -> b;`;
    expect(m.strict_prop('foo')).toBe(false);
  });


  test('undefined', () => {
    const m = sm`property foo default undefined; a -> b;`;
    expect(m.strict_prop('foo')).toBe(undefined);
  });


  test('null', () => {
    const m = sm`property foo default null; a -> b;`;
    expect(m.strict_prop('foo')).toBe(null);
  });


  test('no default given', () => {
    const m = sm`property foo; a -> b;`;
    expect( () => m.strict_prop('foo') ).toThrow();
  });


  test('no default given but present on state', () => {
    const m = sm`property foo; a -> b; state b: { property: foo 1; };`;
    m.go('b');
    expect(m.strict_prop('foo')).toBe(1);
  });


  test('default given but overridden on state', () => {
    const m = sm`property foo default 1; a -> b; state b: { property: foo 2; };`;
    m.go('b');
    expect(m.strict_prop('foo')).toBe(2);
  });


  test('no default given, should throw', () => {
    const m = sm`property foo; a -> b;`;
    expect(() => m.strict_prop('foo')).toThrow();
  });



});





describe('Get all properties', () => {



  describe('from defaults', () => {

    test('One prop', () => {
      const m = sm`property foo default "a"; a -> b;`;
      expect(m.props()).toStrictEqual({foo: 'a'});
    });

    test('Two props with defaults', () => {
      const m = sm`property foo default "a"; property bar default "b"; a -> b;`;
      expect(m.props()).toStrictEqual({foo: 'a', bar: 'b'});
    });

    test('Two props, one with a default', () => {
      const m = sm`property foo default "a"; property bar; a -> b;`;
      expect(m.props()).toStrictEqual({foo: 'a', bar: undefined});
    });

    test('No props', () => {
      const m = sm`a -> b;`;
      expect(m.props()).toStrictEqual({});
    });

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

  test('Repeated state prop', () => {
    expect(() => {
      const m = sm`property foo default "a"; a -> b; state a: { property: a 1; property: a 1; };`;
    }).toThrow();
  });

  test('Conflicted state prop', () => {
    expect(() => {
      const m = sm`property foo default "a"; a -> b; state a: { property: a 1; property: a 2; };`;
    }).toThrow();
  });

  test('Property requirement and default simultaneously', () => {
    expect(() => {
      const m = sm`property foo default "a" required; a -> b;`;
    }).toThrow();
  });

  test('Use of undeclared property', () => {
    expect(() => {
      const m = sm`a -> b; state a: { property: foo 2; };`;
    }).toThrow();
  });

  test('Missing required property', () => {
    expect(() => {
      const m = sm`property foo required; a -> b;`;
    }).toThrow();
  });

});





test('Indiana General Assembly of 1897 Bill 246', () => {

  // https://en.wikipedia.org/wiki/Indiana_Pi_Bill

  const TheLaw = sm`
    property pi default Pi;
    Earth->Indiana;
    state Indiana: { property: pi 3.2; };
  `;

  expect(TheLaw.prop('pi')).toBe(Math.PI);

  TheLaw.go('Indiana');
  expect(TheLaw.prop('pi')).toBe(3.2);

});
