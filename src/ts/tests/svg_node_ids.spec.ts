
/* eslint-disable max-len */

import * as jv   from '../jssm_viz';
import * as jssm from '../jssm';

const sm = jssm.sm;




describe('slug_for helper', () => {

  test('lowercases ASCII letters', () =>
    expect(jv._test.slug_for('Foo'))
      .toBe('foo'));

  test('converts spaces to hyphens', () =>
    expect(jv._test.slug_for('green light'))
      .toBe('green-light'));

  test('collapses runs of non-alphanumeric characters into single hyphen', () =>
    expect(jv._test.slug_for('a !! b'))
      .toBe('a-b'));

  test('strips leading and trailing hyphens', () =>
    expect(jv._test.slug_for('  foo  bar  '))
      .toBe('foo-bar'));

  test('returns empty string for all-non-alphanumeric input', () =>
    expect(jv._test.slug_for('!!!'))
      .toBe(''));

  test('keeps digits', () =>
    expect(jv._test.slug_for('State 42'))
      .toBe('state-42'));

});




describe('slug_states collision and fallback handling', () => {

  test('assigns base slug to first occurrence', () => {
    const m = jv._test.slug_states(['Red Light', 'red-light']);
    expect(m.get('Red Light')).toBe('red-light');
  });

  test('appends -2 to second slug colliding with first', () => {
    const m = jv._test.slug_states(['Red Light', 'red-light']);
    expect(m.get('red-light')).toBe('red-light-2');
  });

  test('appends -3 to third collider', () => {
    const m = jv._test.slug_states(['Foo', 'foo', 'FOO']);
    expect(m.get('Foo')).toBe('foo');
    expect(m.get('foo')).toBe('foo-2');
    expect(m.get('FOO')).toBe('foo-3');
  });

  test('falls back to node-N when slug would be empty', () => {
    const m = jv._test.slug_states(['!!!']);
    expect(m.get('!!!')).toBe('node-1');
  });

  test('node-N fallback uses the original declaration index', () => {
    const m = jv._test.slug_states(['a', '???']);
    expect(m.get('a')).toBe('a');
    expect(m.get('???')).toBe('node-2');
  });

  test('every state in input appears as a key in the map', () => {
    const m = jv._test.slug_states(['one', 'two', 'three']);
    expect(m.size).toBe(3);
    expect(m.has('one')).toBe(true);
    expect(m.has('two')).toBe(true);
    expect(m.has('three')).toBe(true);
  });

});




describe('dot output uses slugs as node identifiers', () => {

  test('simple multi-word state name becomes hyphenated slug', () => {
    const dot = jv.machine_to_dot(sm`"green light" -> "red light";`);
    expect(dot).toContain('"green-light"');
    expect(dot).toContain('"red-light"');
  });

  test('two states with different cases collide; first wins, second gets -2 suffix', () => {
    const dot = jv.machine_to_dot(sm`"Red Light" -> "red-light";`);
    expect(dot).toContain('"red-light"');
    expect(dot).toContain('"red-light-2"');
  });

  test('state with only non-alphanumeric characters falls back to node-N form', () => {
    const dot = jv.machine_to_dot(sm`"???" -> ok;`);
    expect(dot).toContain('"node-1"');
    expect(dot).toContain('"ok"');
  });

  test('original state name is preserved as the label attribute', () => {
    const dot = jv.machine_to_dot(sm`"Green Light" -> "Red Light";`);
    expect(dot).toContain('label="Green Light"');
    expect(dot).toContain('label="Red Light"');
  });

  test('edges reference both endpoints by their slug-quoted ids', () => {
    const dot = jv.machine_to_dot(sm`"green light" -> "red light";`);
    expect(dot).toMatch(/"green-light"\s*->\s*"red-light"/);
  });

});
