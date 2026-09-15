
import { describe, test, expect } from 'vitest';

import { from as sm_from, history, history_inclusive, history_length, set_history_length } from '../jssm';





// Direct tests of the history family as bare functions.  Expected histories
// are written out from the FSL text and the action sequence.

describe('bare functions — history family', () => {



  describe('history', () => {

    test('is empty on a fresh machine', () => {
      const m = sm_from('a -> b;', { history: 5 });
      expect(history(m)).toStrictEqual([]);
    });

    test('holds the prior states in order after two transitions, without the current state', () => {
      const m = sm_from("a 'next' -> b 'next' -> c;", { history: 3 });
      m.action('next');
      m.action('next');
      expect(history(m)).toStrictEqual([ ['a', undefined], ['b', undefined] ]);
    });

    test('is truncated to the configured length, keeping the most recent', () => {
      const m = sm_from("a 'next' -> b 'next' -> c 'next' -> d 'next' -> e;", { history: 3 });
      m.action('next');
      m.action('next');
      m.action('next');
      m.action('next');
      expect(history(m)).toStrictEqual([ ['b', undefined], ['c', undefined], ['d', undefined] ]);
    });

    test('records the data alongside each state', () => {
      const m = sm_from<number>("a 'next' <-> 'next' b;", { history: 3, data: 0 });
      m.hook_any_transition( ({ data }) => ({ pass: true, data: data + 1 }) );
      m.action('next');
      m.action('next');
      expect(history(m)).toStrictEqual([ ['a', 0], ['b', 1] ]);
    });

  });



  describe('history_inclusive', () => {

    test('ends with the current state and is one longer than history', () => {
      const m = sm_from("a 'next' -> b 'next' -> c 'next' -> d 'next' -> e;", { history: 3 });
      m.action('next');
      m.action('next');
      m.action('next');
      m.action('next');
      expect(history_inclusive(m)).toStrictEqual([
        ['b', undefined], ['c', undefined], ['d', undefined], ['e', undefined]
      ]);
      expect(history_inclusive(m).length).toBe(history(m).length + 1);
    });

    test('on a fresh machine is just the start state and its data', () => {
      const m = sm_from<number>('a -> b;', { history: 2, data: 9 });
      expect(history_inclusive(m)).toStrictEqual([ ['a', 9] ]);
    });

  });



  describe('history_length and set_history_length', () => {

    test('history_length defaults to zero and reflects the configured value', () => {
      expect(history_length(sm_from('a -> b;'))).toBe(0);
      expect(history_length(sm_from('a -> b;', { history: 3 }))).toBe(3);
    });

    test('set_history_length(m, 1) then a transition leaves length 1 and one entry', () => {
      const m = sm_from("a 'next' -> b 'next' -> c;", { history: 3 });
      set_history_length(m, 1);
      expect(history_length(m)).toBe(1);
      m.action('next');
      m.action('next');
      expect(history(m)).toStrictEqual([ ['b', undefined] ]);
    });

    test('set_history_length from zero turns history on going forward', () => {
      const m = sm_from("a 'next' <-> 'next' b;");
      m.action('next');
      set_history_length(m, 3);
      m.action('next');
      m.action('next');
      expect(history(m)).toStrictEqual([ ['b', undefined], ['a', undefined] ]);
    });

    test('set_history_length to zero empties the history', () => {
      const m = sm_from("a 'next' <-> 'next' b;", { history: 3 });
      m.action('next');
      set_history_length(m, 0);
      expect(history_length(m)).toBe(0);
      expect(history(m)).toStrictEqual([]);
    });

    test('the setter and the class getter see the same length', () => {
      const m = sm_from('a -> b;');
      set_history_length(m, 4);
      expect(m.history_length).toBe(4);
      m.history_length = 2;
      expect(history_length(m)).toBe(2);
    });

  });



});
