
import * as jssm         from '../jssm';
import { JssmArrowKind } from '../jssm_types';

const sm = jssm.sm;





describe('.allows_override', () => {

  test('1 undefined in code, no config reads out false', () => {
    const machine = jssm.from(`a -> b;`);
    expect(machine.allows_override).toBe(false);
  });

  test('2 undefined in code, missing in config reads out false', () => {
    const machine = jssm.from(`a -> b;`, { });
    expect(machine.allows_override).toBe(false);
  });

  test('3 undefined in code, undefined in config reads out false', () => {
    const machine = jssm.from(`a -> b;`, { allows_override: undefined });
    expect(machine.allows_override).toBe(false);
  });

  test('4 undefined in code, allowed in config reads out true', () => {
    const machine = jssm.from(`a -> b;`, { allows_override: true });
    expect(machine.allows_override).toBe(true);
  });

  test('5 undefined in code, disallowed in config reads out false', () => {
    const machine = jssm.from(`a -> b;`, { allows_override: false });
    expect(machine.allows_override).toBe(false);
  });



  test('6 allowed in code, no config reads out true', () => {
    const machine = jssm.from(`allows_override: true; a -> b;`);
    expect(machine.allows_override).toBe(true);
  });

  test('7 allowed in code, missing in config reads out true', () => {
    const machine = jssm.from(`allows_override: true; a -> b;`, { });
    expect(machine.allows_override).toBe(true);
  });

  test('8 allowed in code, undefined in config reads out true', () => {
    const machine = jssm.from(`allows_override: true; a -> b;`, { allows_override: undefined });
    expect(machine.allows_override).toBe(true);
  });

  test('9 allowed in code, allowed in config reads out true', () => {
    const machine = jssm.from(`allows_override: true; a -> b;`, { allows_override: true });
    expect(machine.allows_override).toBe(true);
  });

  test('10 allowed in code, disallowed in config reads out false', () => {
    const machine = jssm.from(`allows_override: true; a -> b;`, { allows_override: false });
    expect(machine.allows_override).toBe(false);
  });



  test('11 disallowed in code, no config reads out false', () => {
    const machine = jssm.from(`allows_override: false; a -> b;`);
    expect(machine.allows_override).toBe(false);
  });

  test('12 disallowed in code, missing in config reads out false', () => {
    const machine = jssm.from(`allows_override: false; a -> b;`, { });
    expect(machine.allows_override).toBe(false);
  });

  test('13 disallowed in code, undefined in config reads out false', () => {
    const machine = jssm.from(`allows_override: false; a -> b;`, { allows_override: undefined });
    expect(machine.allows_override).toBe(false);
  });

  test('14 disallowed in code, allowed in config throws an error', () => {
    expect( () => jssm.from(`allows_override: false; a -> b;`, { allows_override: true }).allows_override )
      .toThrow();
  });

  test('15 disallowed in code, allowed in config throws an error', () => {
    expect( () => jssm.from(`allows_override: false; a -> b;`, { allows_override: true }) )
      .toThrow();
  });

  test('16 in datastructure - disallowed in code, allowed in config throws an error', () => {

    const made = {
      start_states           : [ 'a' ],
      end_states             : [],
      transitions            : [ { from        : 'a',
                                   to          : 'b',
                                   kind        : 'legal' as JssmArrowKind,
                                   forced_only : false,
                                   main_path   : false } ],
      state_property         : [],
      allows_override        : false,
      config_allows_override : true
    };

    expect( () => new jssm.Machine<string>(made) )
      .toThrow();

  });

  test('17 disallowed in code, disallowed in config reads out false', () => {
    const machine = jssm.from(`allows_override: false; a -> b;`, { allows_override: false });
    expect(machine.allows_override).toBe(false);
  });

});





describe('.config_allows_override', () => {

  test('18 whole config missing', () => {
    const machine = jssm.from(`a -> b;`);
    expect(machine.config_allows_override).toBe(undefined);
  });

  test('19 config field missing', () => {
    const machine = jssm.from(`a -> b;`, { });
    expect(machine.config_allows_override).toBe(undefined);
  });

  test('20 config undefined', () => {
    const machine = jssm.from(`a -> b;`, { allows_override: undefined });
    expect(machine.config_allows_override).toBe(undefined);
  });

  test('21 config true', () => {
    const machine = jssm.from(`a -> b;`, { allows_override: true });
    expect(machine.config_allows_override).toBe(true);
  });

  test('22 config false', () => {
    const machine = jssm.from(`a -> b;`, { allows_override: false });
    expect(machine.config_allows_override).toBe(false);
  });

});





describe('.code_allows_override', () => {

  test('23 code missing', () => {
    const machine = sm`a -> b;`;
    expect(machine.code_allows_override).toBe(undefined);
  });

  test('24 code undefined', () => {
    const machine = sm`allows_override: undefined; a -> b;`;
    expect(machine.code_allows_override).toBe(undefined);
  });

  test('25 code true', () => {
    const machine = sm`allows_override: true; a -> b;`;
    expect(machine.code_allows_override).toBe(true);
  });

  test('26 code false', () => {
    const machine = sm`allows_override: false; a -> b;`;
    expect(machine.code_allows_override).toBe(false);
  });

});





describe('.allows_override negative tests', () => {

  test('27 cannot have two allows_override statements', () => {
    expect( () => sm`allows_override: false; allows_override: false; a -> b;` )
      .toThrow()
  });

});





describe('.override/2', () => {

  test('working override without data', () => {
    const machine = sm`allows_override: true; a -> b -> c;`;
    machine.go('b');
    machine.go('c');
    expect(machine.state()).toBe('c');
    machine.override('a', undefined);
    expect(machine.state()).toBe('a');
  });

  test('working override with data', () => {
    const machine = jssm.from(`allows_override: true; a -> b -> c;`, { data: 'foo' });
    machine.go('b');
    machine.go('c');
    expect(machine.state()).toBe('c');
    expect(machine.data()).toBe('foo');
    machine.override('a', 'bar');
    expect(machine.state()).toBe('a');
    expect(machine.data()).toBe('bar');
  });

  test('working override to distinct chain', () => {
    const machine = sm`allows_override: true; a -> b -> c -> a; d -> e -> f -> d;`;
    machine.go('b');
    machine.go('c');
    expect(machine.state()).toBe('c');
    machine.override('d', undefined);
    machine.go('e')
    expect(machine.state()).toBe('e');
  });

  test('working override to distinct chain then back', () => {
    const machine = sm`allows_override: true; a -> b -> c -> a; d -> e -> f -> d;`;
    machine.go('b');
    machine.go('c');
    expect(machine.state()).toBe('c');
    machine.override('d', undefined);
    machine.go('e')
    expect(machine.state()).toBe('e');
    machine.override('a', undefined);
    machine.go('b')
    expect(machine.state()).toBe('b');
  });

});





describe('.override/2 negative tests', () => {

  test('allowed, but to state that does not exist', () => {
    const machine = sm`allows_override: true; a -> b;`;
    expect(machine.state()).toBe('a');
    expect( () => machine.override('c') ).toThrow();
  });

  test('disallowed in code', () => {
    const machine = sm`allows_override: false; a -> b;`;
    expect(machine.state()).toBe('a');
    expect( () => machine.override('b') ).toThrow();
  });

  test('disallowed in config', () => {
    const machine = jssm.from(`a -> b;`, { allows_override: false });
    expect(machine.state()).toBe('a');
    expect( () => machine.override('b') ).toThrow();
  });

  test('disallowed by default', () => {
    const machine = jssm.from(`a -> b;`);
    expect(machine.state()).toBe('a');
    expect( () => machine.override('b') ).toThrow();
  });

  test('disallowed in code and config', () => {
    const machine = jssm.from(`allows_override: false; a -> b;`, { allows_override: false });
    expect( () => machine.override('b') ).toThrow();
  });

});
