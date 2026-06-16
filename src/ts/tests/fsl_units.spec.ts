
import {

  base_dimension_names,
  make_dimension,
  dimensionless,
  dimensions_equal,
  multiply_dimensions,
  divide_dimensions,
  describe_dimension,

  quantity,
  value_in,
  add,
  sub,
  mul,
  div,
  scale,
  compare,
  is_dimensionless,

  base_unit,
  scaled,
  derived_unit,
  with_si_prefixes,
  si_prefixes,

  SI,

  data_module,
  imperial_module,
  angle_module,
  time_module

} from '../fsl_units';





/* A tolerance helper for float comparisons that come out of conversion. */

const near = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps;





describe('base dimension names', () => {

  test('there are exactly seven, in canonical order', () => {
    expect(base_dimension_names).toStrictEqual([
      'length', 'mass', 'time', 'current', 'temperature', 'amount', 'luminosity'
    ]);
  });

});





describe('make_dimension', () => {

  test('fills omitted slots with zero (the absent branch)', () => {
    const d = make_dimension({ length: 1 });
    expect(d.length).toBe(1);
    expect(d.mass).toBe(0);
    expect(d.time).toBe(0);
  });

  test('keeps supplied exponents (the present branch)', () => {
    const d = make_dimension({ length: 1, time: -1 });
    expect(d.length).toBe(1);
    expect(d.time).toBe(-1);
  });

  test('empty map is the dimensionless vector', () => {
    expect(dimensions_equal(make_dimension({}), dimensionless)).toBe(true);
  });

  test('result is frozen', () => {
    expect(Object.isFrozen(make_dimension({ mass: 1 }))).toBe(true);
  });

});





describe('dimensionless', () => {

  test('every base exponent is zero', () => {
    for (const name of base_dimension_names) {
      expect(dimensionless[name]).toBe(0);
    }
  });

});





describe('dimensions_equal', () => {

  test('a length is equal to itself (km vs m share the length dimension)', () => {
    expect(dimensions_equal(SI.metre.dimension, SI.kilometre.dimension)).toBe(true);
  });

  test('length and time differ', () => {
    expect(dimensions_equal(SI.metre.dimension, SI.second.dimension)).toBe(false);
  });

});





describe('multiply_dimensions / divide_dimensions', () => {

  test('multiplying length by length gives area (exponent 2)', () => {
    const area = multiply_dimensions(SI.metre.dimension, SI.metre.dimension);
    expect(area.length).toBe(2);
  });

  test('length over time is velocity', () => {
    const v = divide_dimensions(SI.metre.dimension, SI.second.dimension);
    expect(v.length).toBe(1);
    expect(v.time).toBe(-1);
  });

  test('a dimension over itself cancels to dimensionless', () => {
    const ratio = divide_dimensions(SI.metre.dimension, SI.metre.dimension);
    expect(dimensions_equal(ratio, dimensionless)).toBe(true);
  });

  test('both products are frozen', () => {
    expect(Object.isFrozen(multiply_dimensions(dimensionless, dimensionless))).toBe(true);
    expect(Object.isFrozen(divide_dimensions(dimensionless, dimensionless))).toBe(true);
  });

});





describe('describe_dimension', () => {

  test('an exponent of one is rendered bare', () => {
    expect(describe_dimension(SI.metre.dimension)).toBe('length');
  });

  test('a negative or non-unit exponent gets a caret suffix', () => {
    expect(describe_dimension(SI.metre_per_second.dimension)).toBe('length·time^-1');
  });

  test('a squared exponent is rendered with ^2', () => {
    const area = multiply_dimensions(SI.metre.dimension, SI.metre.dimension);
    expect(describe_dimension(area)).toBe('length^2');
  });

  test('the zero vector is "dimensionless"', () => {
    expect(describe_dimension(dimensionless)).toBe('dimensionless');
  });

});





describe('quantity / value_in', () => {

  test('a magnitude is stored in base units immediately', () => {
    const d = quantity(100, SI.kilometre);
    expect(d.base_value).toBe(100_000);
  });

  test('value_in applies the inverse factor (auto-convert within a dimension)', () => {
    const d = quantity(1, SI.kilometre);
    expect(value_in(d, SI.metre)).toBe(1000);
    expect(value_in(d, SI.kilometre)).toBe(1);
  });

  test('quantities are frozen', () => {
    expect(Object.isFrozen(quantity(1, SI.metre))).toBe(true);
  });

  test('reading in a unit of a different dimension throws (runtime backstop)', () => {
    const d = quantity(1, SI.metre);
    // bypass the compile-time guard the way an `any`-typed caller would
    expect(() => value_in(d as any, SI.second)).toThrow(/cannot read/);
  });

});





describe('add / sub', () => {

  test('add works across units of one dimension', () => {
    const total = add(quantity(1, SI.kilometre), quantity(500, SI.metre));
    expect(value_in(total, SI.metre)).toBe(1500);
  });

  test('sub works across units of one dimension', () => {
    const left = sub(quantity(1, SI.kilometre), quantity(250, SI.metre));
    expect(value_in(left, SI.metre)).toBe(750);
  });

  test('add rejects mismatched dimensions (runtime backstop)', () => {
    expect(() => add(quantity(1, SI.metre) as any, quantity(1, SI.second))).toThrow(/different dimensions/);
  });

  test('sub rejects mismatched dimensions (runtime backstop)', () => {
    expect(() => sub(quantity(1, SI.metre) as any, quantity(1, SI.second))).toThrow(/different dimensions/);
  });

  test('results are frozen', () => {
    expect(Object.isFrozen(add(quantity(1, SI.metre), quantity(1, SI.metre)))).toBe(true);
    expect(Object.isFrozen(sub(quantity(1, SI.metre), quantity(1, SI.metre)))).toBe(true);
  });

});





describe('mul / div', () => {

  test('multiplying force by distance yields energy', () => {
    const work = mul(quantity(2, SI.newton), quantity(3, SI.metre));
    expect(value_in(work, SI.joule)).toBe(6);
  });

  test('mul combines dimensions even when they differ', () => {
    const area = mul(quantity(3, SI.metre), quantity(4, SI.metre));
    expect(area.dimension.length).toBe(2);
    expect(area.base_value).toBe(12);
  });

  test('dividing distance by time yields velocity', () => {
    const v = div(quantity(100, SI.kilometre), quantity(2, SI.hour));
    expect(near(value_in(v, SI.metre_per_second), 100_000 / 7200)).toBe(true);
  });

  test('same-dimension division cancels to dimensionless', () => {
    const ratio = div(quantity(3, SI.metre), quantity(4, SI.metre));
    expect(is_dimensionless(ratio)).toBe(true);
    expect(value_in(ratio, SI.one)).toBe(0.75);
  });

  test('division by a zero-magnitude quantity throws', () => {
    expect(() => div(quantity(1, SI.metre), quantity(0, SI.second))).toThrow(/zero-magnitude/);
  });

  test('mul and div results are frozen', () => {
    expect(Object.isFrozen(mul(quantity(1, SI.metre), quantity(1, SI.metre)))).toBe(true);
    expect(Object.isFrozen(div(quantity(1, SI.metre), quantity(1, SI.second)))).toBe(true);
  });

});





describe('scale', () => {

  test('scales the magnitude, preserves the dimension', () => {
    const doubled = scale(quantity(3, SI.metre), 2);
    expect(value_in(doubled, SI.metre)).toBe(6);
    expect(dimensions_equal(doubled.dimension, SI.metre.dimension)).toBe(true);
  });

  test('result is frozen', () => {
    expect(Object.isFrozen(scale(quantity(1, SI.metre), 2))).toBe(true);
  });

});





describe('compare', () => {

  test('greater', () => {
    expect(compare(quantity(1, SI.kilometre), quantity(500, SI.metre))).toBe(1);
  });

  test('less', () => {
    expect(compare(quantity(500, SI.metre), quantity(1, SI.kilometre))).toBe(-1);
  });

  test('equal in magnitude regardless of unit', () => {
    expect(compare(quantity(1, SI.kilometre), quantity(1000, SI.metre))).toBe(0);
  });

  test('rejects mismatched dimensions (runtime backstop)', () => {
    expect(() => compare(quantity(1, SI.metre) as any, quantity(1, SI.second))).toThrow(/different dimensions/);
  });

});





describe('is_dimensionless', () => {

  test('a ratio is dimensionless', () => {
    expect(is_dimensionless(div(quantity(3, SI.metre), quantity(4, SI.metre)))).toBe(true);
  });

  test('a length is not dimensionless', () => {
    expect(is_dimensionless(quantity(3, SI.metre))).toBe(false);
  });

});





describe('unit construction', () => {

  test('base_unit has factor one', () => {
    const m = base_unit('metre', 'm', make_dimension({ length: 1 }));
    expect(m.factor).toBe(1);
    expect(m.symbol).toBe('m');
    expect(Object.isFrozen(m)).toBe(true);
  });

  test('scaled multiplies the base factor (and composes)', () => {
    const km  = scaled(SI.metre, 1000, 'kilometre', 'km');
    const Mm  = scaled(km, 1000, 'megametre', 'Mm');
    expect(km.factor).toBe(1000);
    expect(Mm.factor).toBe(1_000_000);
    expect(Object.isFrozen(km)).toBe(true);
  });

  test('derived_unit carries factor and dimension', () => {
    const newton = derived_unit('newton', 'N', 1, make_dimension({ mass: 1, length: 1, time: -2 }));
    expect(newton.factor).toBe(1);
    expect(newton.dimension.mass).toBe(1);
    expect(newton.dimension.time).toBe(-2);
    expect(Object.isFrozen(newton)).toBe(true);
  });

});





describe('si_prefixes and with_si_prefixes', () => {

  test('the prefix ladder spans yotta to yocto', () => {
    const first = si_prefixes[0];
    const last  = si_prefixes[si_prefixes.length - 1];
    expect(first?.symbol).toBe('Y');
    expect(first?.factor).toBe(1e24);
    expect(last?.symbol).toBe('y');
    expect(last?.factor).toBe(1e-24);
    expect(si_prefixes.length).toBe(20);
  });

  test('a base unit gets every prefix for free, plus its own symbol', () => {
    const lengths = with_si_prefixes(SI.metre);
    expect(lengths['m']?.factor).toBe(1);            // unprefixed base
    expect(lengths['km']?.factor).toBe(1000);
    expect(lengths['mm']?.factor).toBe(0.001);
    expect(near(lengths['μm']?.factor ?? NaN, 1e-6)).toBe(true);
    expect(lengths['Mm']?.factor).toBe(1e6);
  });

  test('a prefixed unit keeps the base dimension', () => {
    const lengths = with_si_prefixes(SI.metre);
    expect(dimensions_equal(lengths['km']!.dimension, SI.metre.dimension)).toBe(true);
  });

  test('a prefixed unit reads back through value_in', () => {
    const lengths = with_si_prefixes(SI.metre);
    const d = quantity(2, lengths['km']!);
    expect(value_in(d, SI.metre)).toBe(2000);
  });

});





describe('the SI prelude', () => {

  test('ships the seven SI base units with factor one', () => {
    for (const u of [SI.metre, SI.kilogram, SI.second, SI.ampere, SI.kelvin, SI.mole, SI.candela]) {
      expect(u.factor).toBe(1);
    }
  });

  test('ships the named derived units with the right dimensions', () => {
    expect(SI.hertz.dimension.time).toBe(-1);
    expect(SI.newton.dimension.mass).toBe(1);
    expect(SI.joule.dimension.length).toBe(2);
    expect(SI.watt.dimension.time).toBe(-3);
    expect(SI.pascal.dimension.length).toBe(-1);
    expect(SI.coulomb.dimension.current).toBe(1);
    expect(SI.volt.dimension.current).toBe(-1);
    expect(SI.ohm.dimension.current).toBe(-2);
    expect(SI.farad.dimension.current).toBe(2);
    expect(SI.siemens.dimension.current).toBe(2);
  });

  test('the dimensionless "one" unit is dimensionless with factor one', () => {
    expect(SI.one.factor).toBe(1);
    expect(dimensions_equal(SI.one.dimension, dimensionless)).toBe(true);
  });

  test('prefixed convenience units carry the expected factors', () => {
    expect(SI.kilometre.factor).toBe(1000);
    expect(SI.centimetre.factor).toBe(0.01);
    expect(SI.millimetre.factor).toBe(0.001);
    expect(SI.millisecond.factor).toBe(0.001);
    expect(SI.gram.factor).toBe(0.001);
    expect(near(SI.microampere.factor, 1e-6)).toBe(true);
    expect(SI.hour.factor).toBe(3600);
  });

  test('a newton·metre equals a joule (derived-unit cross-check)', () => {
    const work = mul(quantity(1, SI.newton), quantity(1, SI.metre));
    expect(dimensions_equal(work.dimension, SI.joule.dimension)).toBe(true);
    expect(value_in(work, SI.joule)).toBe(1);
  });

  test('volts times amperes equals watts', () => {
    const p = mul(quantity(2, SI.volt), quantity(3, SI.ampere));
    expect(dimensions_equal(p.dimension, SI.watt.dimension)).toBe(true);
    expect(value_in(p, SI.watt)).toBe(6);
  });

  test('the prelude is frozen', () => {
    expect(Object.isFrozen(SI)).toBe(true);
  });

});





describe('a worked km/h velocity, end to end', () => {

  test('100 km over 2 h is ~13.89 m/s', () => {
    const distance = quantity(100, SI.kilometre);
    const elapsed  = quantity(2,   SI.hour);
    const speed    = div(distance, elapsed);
    expect(dimensions_equal(speed.dimension, SI.metre_per_second.dimension)).toBe(true);
    expect(near(value_in(speed, SI.metre_per_second), 13.8888888889, 1e-7)).toBe(true);
  });

});





describe('opt-in module stubs', () => {

  test('data_module throws as a not-yet-implemented stub', () => {
    expect(() => data_module()).toThrow(/opt-in and not yet implemented/);
  });

  test('imperial_module throws as a not-yet-implemented stub', () => {
    expect(() => imperial_module()).toThrow(/opt-in and not yet implemented/);
  });

  test('angle_module throws as a not-yet-implemented stub', () => {
    expect(() => angle_module()).toThrow(/opt-in and not yet implemented/);
  });

  test('time_module throws as a not-yet-implemented stub', () => {
    expect(() => time_module()).toThrow(/opt-in and not yet implemented/);
  });

});
