
import { describe, test, expect } from 'vitest';

import {
  sm, from as sm_from, go, on, JssmError,
  data, set_data,
  prop, strict_prop, props, known_prop, known_props,
  val, set_val, vals, known_val, known_vals, val_type
} from '../jssm';

import { data_ref } from '../machine/data';





// Direct tests of the data family as bare functions.  Every expected value
// is written out from the FSL text, the config, or a literal the test itself
// installed.

describe('bare functions — data family', () => {



  describe('data', () => {

    test('returns the configured data', () => {
      const m = sm_from('a -> b;', { data: 1 });
      expect(data(m)).toBe(1);
    });

    test('is undefined when no data was configured', () => {
      expect(data(sm`a -> b;`)).toBeUndefined();
    });

    test('is a structured clone: mutating the result does not change the machine', () => {
      const m = sm_from('a -> b;', { data: { x: [1] } });
      const d = data(m);
      d.x.push(2);
      expect(d).toStrictEqual({ x: [1, 2] });
      expect(data(m)).toStrictEqual({ x: [1] });
    });

    test('two reads return distinct objects', () => {
      const m = sm_from('a -> b;', { data: { x: 1 } });
      expect(data(m)).not.toBe(data(m));
    });

  });



  describe('set_data', () => {

    test('returns the machine and installs the value', () => {
      const m = sm_from<number>('a -> b;', { data: 1 });
      expect(set_data(m, 2)).toBe(m);
      expect(data(m)).toBe(2);
    });

    test('can install undefined, null, and false', () => {
      const m = sm_from<unknown>('a -> b;', { data: 1 });
      set_data(m, undefined);
      expect(data(m)).toBeUndefined();
      set_data(m, null);
      expect(data(m)).toBeNull();
      set_data(m, false);
      expect(data(m)).toBe(false);
    });

    test('does not move the state', () => {
      const m = sm_from<number>('a -> b;', { data: 1 });
      set_data(m, 2);
      expect(m.state()).toBe('a');
    });

    test('fires a data-change event with cause set_data when the value changes, and none when it does not', () => {
      const m = sm_from<number>('a -> b;', { data: 1 });
      const seen: Array<[number, number, string]> = [];
      on(m, 'data-change', ev => { seen.push([ev.old_data, ev.new_data, ev.cause]); });
      set_data(m, 2);
      set_data(m, 2);
      set_data(m, 3);
      expect(seen).toStrictEqual([ [1, 2, 'set_data'], [2, 3, 'set_data'] ]);
    });

    test('agrees with the class method', () => {
      const via_fn    = sm_from<number>('a -> b;', { data: 1 });
      const via_class = sm_from<number>('a -> b;', { data: 1 });
      set_data(via_fn, 7);
      via_class.set_data(7);
      expect(data(via_fn)).toBe(7);
      expect(via_class.data()).toBe(7);
    });

  });



  describe('data_ref (module export, not in the barrel)', () => {

    test('returns the live value by reference, distinct from the clone data() returns', () => {
      const m = sm_from('a -> b;', { data: { a: { b: 1 } } });
      expect(data_ref(m)).toBe(data_ref(m));
      expect(data_ref(m)).not.toBe(data(m));
      expect(data_ref(m)).toStrictEqual({ a: { b: 1 } });
    });

    test('the class _data_ref delegate returns the same reference', () => {
      const m = sm_from('a -> b;', { data: { a: 1 } });
      expect(m._data_ref()).toBe(data_ref(m));
    });

  });



  describe('prop and strict_prop', () => {

    const source = 'property color default "grey"; a -> b; state b: { property: color "blue"; };';

    test('prop reads the default in a state without an override', () => {
      const m = sm_from(source);
      expect(prop(m, 'color')).toBe('grey');
    });

    test('prop reads the per-state override once the machine is in that state', () => {
      const m = sm_from(source);
      go(m, 'b');
      expect(prop(m, 'color')).toBe('blue');
    });

    test('prop is undefined for an unknown property', () => {
      expect(prop(sm_from(source), 'size')).toBeUndefined();
    });

    test('prop is undefined for a declared property with no default in a state that does not set it', () => {
      const m = sm_from('property foo; a -> b; state b: { property: foo 1; };');
      expect(prop(m, 'foo')).toBeUndefined();
      go(m, 'b');
      expect(prop(m, 'foo')).toBe(1);
    });

    test('strict_prop reads the default and the override', () => {
      const m = sm_from(source);
      expect(strict_prop(m, 'color')).toBe('grey');
      go(m, 'b');
      expect(strict_prop(m, 'color')).toBe('blue');
    });

    test('strict_prop throws JssmError for an unknown property', () => {
      expect(() => strict_prop(sm_from(source), 'size')).toThrow(JssmError);
    });

    test('strict_prop throws JssmError for a declared property with no default in a state that does not set it', () => {
      const m = sm_from('property foo; a -> b; state b: { property: foo 1; };');
      expect(() => strict_prop(m, 'foo')).toThrow(JssmError);
      go(m, 'b');
      expect(strict_prop(m, 'foo')).toBe(1);
    });

  });



  describe('props, known_prop, known_props', () => {

    const source = `
      property can_go     default true;
      property stop_first default false;
      a -> b;
      state b: { property: stop_first true; };
    `;

    test('props maps every declared property to its current value', () => {
      const m = sm_from(source);
      expect(props(m)).toStrictEqual({ can_go: true, stop_first: false });
      go(m, 'b');
      expect(props(m)).toStrictEqual({ can_go: true, stop_first: true });
    });

    test('props lists a property with neither default nor override as undefined', () => {
      const m = sm_from('property foo; property bar default 2; a -> b;');
      expect(props(m)).toStrictEqual({ foo: undefined, bar: 2 });
    });

    test('known_prop is true for a declared property and false otherwise', () => {
      const m = sm_from(source);
      expect(known_prop(m, 'can_go')).toBe(true);
      expect(known_prop(m, 'stop_first')).toBe(true);
      expect(known_prop(m, 'size')).toBe(false);
    });

    test('known_props lists the declared property names in declaration order', () => {
      const m = sm_from(source);
      expect(known_props(m)).toStrictEqual(['can_go', 'stop_first']);
    });

    test('known_props is empty on a machine without properties', () => {
      expect(known_props(sm`a -> b;`)).toStrictEqual([]);
    });

  });



  describe('val, set_val, vals, known_val, known_vals, val_type', () => {

    const source = 'val n : int 0..3 default 0; val ok : boolean default true; a -> b;';

    test('val reads the default', () => {
      const m = sm_from(source);
      expect(val(m, 'n')).toBe(0);
      expect(val(m, 'ok')).toBe(true);
    });

    test('val throws JssmError for an undeclared val', () => {
      expect(() => val(sm_from(source), 'nope')).toThrow(JssmError);
    });

    test('set_val installs a well-typed value', () => {
      const m = sm_from(source);
      set_val(m, 'n', 3);
      expect(val(m, 'n')).toBe(3);
      set_val(m, 'ok', false);
      expect(val(m, 'ok')).toBe(false);
    });

    test('set_val throws JssmError on a wrong-typed value and leaves the val alone', () => {
      const m = sm_from(source);
      expect(() => set_val(m, 'n', 'three')).toThrow(JssmError);
      expect(() => set_val(m, 'ok', 1)).toThrow(JssmError);
      expect(val(m, 'n')).toBe(0);
      expect(val(m, 'ok')).toBe(true);
    });

    test('set_val throws JssmError on an out-of-range int', () => {
      const m = sm_from(source);
      expect(() => set_val(m, 'n', 4)).toThrow(JssmError);
      expect(() => set_val(m, 'n', -1)).toThrow(JssmError);
      expect(val(m, 'n')).toBe(0);
    });

    test('set_val throws JssmError for an undeclared val', () => {
      expect(() => set_val(sm_from(source), 'nope', 1)).toThrow(JssmError);
    });

    test('vals maps every declared val to its current value', () => {
      const m = sm_from(source);
      expect(vals(m)).toStrictEqual({ n: 0, ok: true });
      set_val(m, 'n', 2);
      expect(vals(m)).toStrictEqual({ n: 2, ok: true });
    });

    test('known_val is true for a declared val and false otherwise', () => {
      const m = sm_from(source);
      expect(known_val(m, 'n')).toBe(true);
      expect(known_val(m, 'z')).toBe(false);
    });

    test('known_vals lists the declared vals in declaration order', () => {
      expect(known_vals(sm_from(source))).toStrictEqual(['n', 'ok']);
      expect(known_vals(sm`a -> b;`)).toStrictEqual([]);
    });

    test('val_type returns the declared type descriptor', () => {
      const m = sm_from(source);
      expect(val_type(m, 'n')).toStrictEqual({ kind: 'int', lo: 0, hi: 3 });
      expect(val_type(m, 'ok')).toStrictEqual({ kind: 'boolean' });
    });

    test('val_type throws JssmError for an undeclared val', () => {
      expect(() => val_type(sm_from(source), 'nope')).toThrow(JssmError);
    });

    test('an enum val accepts its members and rejects others', () => {
      const m = sm_from('val mode : enum(fast, slow) default slow; a -> b;');
      expect(val(m, 'mode')).toBe('slow');
      set_val(m, 'mode', 'fast');
      expect(val(m, 'mode')).toBe('fast');
      expect(() => set_val(m, 'mode', 'medium')).toThrow(JssmError);
      expect(val_type(m, 'mode')).toStrictEqual({ kind: 'enum', members: ['fast', 'slow'] });
    });

    test('a string val accepts strings and rejects numbers', () => {
      const m = sm_from('val name : string default "x"; a -> b;');
      set_val(m, 'name', 'y');
      expect(val(m, 'name')).toBe('y');
      expect(() => set_val(m, 'name', 1)).toThrow(JssmError);
    });

  });



});
