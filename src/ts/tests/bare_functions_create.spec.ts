
import { describe, test, expect } from 'vitest';

import {
  sm, from as sm_from, go, deserialize, JssmError,
  state, data, history, has_state,
  serialize, instance_name, creation_date, creation_timestamp, create_start_time
} from '../jssm';

import { new_state, find_connected_components } from '../machine/create';
import { version }                              from '../version';





// Direct tests of the create family as bare functions.  Expected values come
// from the FSL text, the construction options, or an injected time source.

describe('bare functions — create family', () => {



  describe('serialize', () => {

    test('captures the state, data, history, capacity, version, and comment', () => {
      const m = sm_from('a -> b -> c;', { history: 3, data: { n: 1 } });
      go(m, 'b');
      const s = serialize(m, 'note');
      expect(s.state).toBe('b');
      expect(s.comment).toBe('note');
      expect(s.data).toStrictEqual({ n: 1 });
      expect(s.history).toStrictEqual([ ['a', { n: 1 }] ]);
      expect(s.history_capacity).toBe(3);
      expect(s.jssm_version).toBe(version);
      expect(typeof s.timestamp).toBe('number');
    });

    test('the timestamp comes from the machine time source', () => {
      const m = sm_from('a -> b;', { time_source: () => 4242 });
      expect(serialize(m).timestamp).toBe(4242);
    });

    test('round-trips through deserialize', () => {
      const m = sm_from('a -> b -> c;', { history: 3, data: { n: 1 } });
      go(m, 'b');
      const r = deserialize('a -> b -> c;', serialize(m));
      expect(state(r)).toBe('b');
      expect(data(r)).toStrictEqual({ n: 1 });
      expect(history(r)).toStrictEqual([ ['a', { n: 1 }] ]);
      expect(go(r, 'c')).toBe(true);
    });

    test('agrees with the class method', () => {
      const m = sm_from('a -> b;', { time_source: () => 1 });
      expect(serialize(m, 'x')).toStrictEqual(m.serialize('x'));
    });

  });



  describe('instance_name', () => {
    test('is the construction-time name, or undefined', () => {
      expect(instance_name(sm_from('a -> b;', { instance_name: 'lamp' }))).toBe('lamp');
      expect(instance_name(sm`a -> b;`)).toBeUndefined();
    });
  });



  describe('creation times', () => {

    test('construction reads the time source at its start and at its end, in order', () => {
      let t = 100;
      const m = sm_from('a -> b;', { time_source: () => t++ });
      expect(create_start_time(m)).toBe(100);
      expect(creation_timestamp(m)).toBeGreaterThan(create_start_time(m));
      expect(creation_timestamp(m)).toBeLessThan(t);
    });

    test('creation_date is a Date whose time is the creation timestamp', () => {
      const m = sm_from('a -> b;', { time_source: () => 1_234_567.9 });
      const d = creation_date(m);
      expect(d).toBeInstanceOf(Date);
      expect(d.getTime()).toBe(1_234_567);
      expect(creation_timestamp(m)).toBe(1_234_567.9);
    });

    test('are monotone on a real clock', () => {
      const m = sm`a -> b;`;
      expect(create_start_time(m)).toBeLessThanOrEqual(creation_timestamp(m));
      expect(creation_date(m).getTime()).toBe(Math.floor(creation_timestamp(m)));
    });

    test('agree with the class getters', () => {
      const m = sm_from('a -> b;', { time_source: () => 55 });
      expect(create_start_time(m)).toBe(m.create_start_time);
      expect(creation_timestamp(m)).toBe(m.creation_timestamp);
      expect(creation_date(m)).toStrictEqual(m.creation_date);
    });

  });



  describe('new_state (module export; the class keeps _new_state)', () => {

    test('adds a state through the function and reports its name', () => {
      const m = sm`a -> b;`;
      expect(has_state(m, 'z')).toBe(false);
      expect(new_state(m, { name: 'z', from: [], to: [], complete: false })).toBe('z');
      expect(has_state(m, 'z')).toBe(true);
    });

    test('adds a state through the class delegate', () => {
      const m = sm`a -> b;`;
      expect(m._new_state({ name: 'q', from: [], to: [], complete: false })).toBe('q');
      expect(has_state(m, 'q')).toBe(true);
    });

    test('rejects a duplicate with a JssmError', () => {
      const m = sm`a -> b;`;
      expect(() => new_state(m, { name: 'a', from: [], to: [], complete: false })).toThrow(JssmError);
    });

  });



  describe('find_connected_components (module export)', () => {

    const st = (names: string[]) => new Map(names.map(n => [n, { name: n, from: [], to: [], complete: false }]));
    const ed = (pairs: Array<[string, string]>) => pairs.map(([from, to]) => ({ from, to, kind: 'legal', forced_only: false, main_path: false })) as any;

    test('groups states joined by an edge in either direction, and isolates the rest', () => {
      expect(find_connected_components(st(['a', 'b', 'c']), ed([['a', 'b']]))).toStrictEqual([ ['a', 'b'], ['c'] ]);
      expect(find_connected_components(st(['a', 'b', 'c']), ed([['b', 'a'], ['c', 'b']]))).toStrictEqual([ ['a', 'b', 'c'] ]);
    });

    test('an edgeless graph is one component per state', () => {
      expect(find_connected_components(st(['x', 'y']), ed([]))).toStrictEqual([ ['x'], ['y'] ]);
    });

  });

});
