
import { describe, test, expect } from 'vitest';

import {
  from as sm_from,
  set_state_timeout, clear_state_timeout, state_timeout_for, current_state_timeout, auto_set_state_timeout,
  JssmError
} from '../jssm';





// Direct tests of the timers family as bare functions.  No real timers run:
// each machine is built with an injected `timeout_source` /
// `clear_timeout_source` pair (the same shape after_mapping.spec.ts and
// machine_timeouts.stoch.ts use), so the scheduled callback and delay are
// captured and fired by hand.

/**
 *  A fake timer registry standing in for setTimeout/clearTimeout.
 *  @returns  The injectable sources plus inspection helpers.
 */
function fake_timers() {

  const scheduled = new Map<number, { f: () => void, ms: number }>();
  const cleared   = new Set<number>();
  let   next      = 1;

  return {

    timeout_source: (f: () => void, ms: number): number => {
      const handle = next++;
      scheduled.set(handle, { f, ms });
      return handle;
    },

    clear_timeout_source: (handle: number): void => {
      cleared.add(handle);
      scheduled.delete(handle);
    },

    pending: () => [...scheduled],

    fire: (handle: number) => {
      const t = scheduled.get(handle);
      expect(t).toBeDefined();
      scheduled.delete(handle);
      t.f();
    },

    cleared_handles: () => cleared

  };

}

/**
 *  Builds a machine over `source` wired to a fresh fake timer registry.
 *  @param source  The FSL source.
 *  @returns       The machine and its timers.
 */
function timed_machine(source: string) {
  const timers = fake_timers();
  const m      = sm_from(source, {
    timeout_source       : timers.timeout_source,
    clear_timeout_source : timers.clear_timeout_source
  });
  return { m, timers };
}





describe('bare functions — timers family', () => {



  describe('set_state_timeout and current_state_timeout', () => {

    test('arming a timeout makes current_state_timeout report the target and delay', () => {
      const { m, timers } = timed_machine('a -> b;');
      expect(current_state_timeout(m)).toBe(undefined);
      set_state_timeout(m, 'b', 10);
      expect(current_state_timeout(m)).toStrictEqual(['b', 10]);
      expect(timers.pending()).toHaveLength(1);
      expect(timers.pending()[0][1].ms).toBe(10);
    });

    test('firing the captured callback moves the machine to the target and disarms', () => {
      const { m, timers } = timed_machine('a -> b;');
      set_state_timeout(m, 'b', 10);
      const [handle] = timers.pending()[0];
      timers.fire(handle);
      expect(m.state()).toBe('b');
      expect(current_state_timeout(m)).toBe(undefined);
    });

    test('firing emits a timeout event with from, to, and after_time', () => {
      const { m, timers } = timed_machine('a -> b;');
      let received: any = null;
      m.on('timeout', ev => { received = ev; });
      set_state_timeout(m, 'b', 25);
      timers.fire(timers.pending()[0][0]);
      expect(received).toStrictEqual({ from: 'a', to: 'b', after_time: 25 });
    });

    test('firing runs the after hook for the state that timed out', () => {
      const { m, timers } = timed_machine('a -> b;');
      let hooked = 0;
      m.hook_after('a', () => { hooked += 1; });
      set_state_timeout(m, 'b', 5);
      timers.fire(timers.pending()[0][0]);
      expect(hooked).toBe(1);
      expect(m.state()).toBe('b');
    });

    test('throws a JssmError when a timeout is already pending', () => {
      const { m } = timed_machine('a -> b;');
      set_state_timeout(m, 'b', 10);
      expect(() => set_state_timeout(m, 'b', 20)).toThrow(JssmError);
      expect(current_state_timeout(m)).toStrictEqual(['b', 10]);
    });

  });



  describe('clear_state_timeout', () => {

    test('disarms a pending timeout through the injected clear source', () => {
      const { m, timers } = timed_machine('a -> b;');
      set_state_timeout(m, 'b', 10);
      const [handle] = timers.pending()[0];
      clear_state_timeout(m);
      expect(current_state_timeout(m)).toBe(undefined);
      expect(timers.pending()).toHaveLength(0);
      expect(timers.cleared_handles().has(handle)).toBe(true);
    });

    test('is a no-op when nothing is pending', () => {
      const { m, timers } = timed_machine('a -> b;');
      expect(() => clear_state_timeout(m)).not.toThrow();
      expect(timers.cleared_handles().size).toBe(0);
    });

    test('after clearing, a new timeout may be armed', () => {
      const { m } = timed_machine('a -> b;');
      set_state_timeout(m, 'b', 10);
      clear_state_timeout(m);
      set_state_timeout(m, 'b', 30);
      expect(current_state_timeout(m)).toStrictEqual(['b', 30]);
    });

  });



  describe('state_timeout_for', () => {

    test('reflects an after mapping declared in FSL', () => {
      const { m } = timed_machine('a after 5s -> b; b -> c;');
      expect(state_timeout_for(m, 'a')).toStrictEqual(['b', 5000]);
    });

    test('is undefined for a state with no after mapping', () => {
      const { m } = timed_machine('a after 5s -> b; b -> c;');
      expect(state_timeout_for(m, 'b')).toBe(undefined);
      expect(state_timeout_for(m, 'c')).toBe(undefined);
    });

  });



  describe('auto_set_state_timeout', () => {

    test('construction auto-arms the start state after mapping', () => {
      const { m, timers } = timed_machine('a after 250ms -> b;');
      expect(current_state_timeout(m)).toStrictEqual(['b', 250]);
      expect(timers.pending()).toHaveLength(1);
    });

    test('re-arms the current state after mapping once cleared', () => {
      const { m, timers } = timed_machine('a after 250ms -> b;');
      clear_state_timeout(m);
      expect(current_state_timeout(m)).toBe(undefined);
      auto_set_state_timeout(m);
      expect(current_state_timeout(m)).toStrictEqual(['b', 250]);
      expect(timers.pending()).toHaveLength(1);
    });

    test('does nothing on a machine with no after mappings', () => {
      const { m, timers } = timed_machine('a -> b;');
      auto_set_state_timeout(m);
      expect(current_state_timeout(m)).toBe(undefined);
      expect(timers.pending()).toHaveLength(0);
    });

    test('does nothing when the current state has no after mapping', () => {
      const { m, timers } = timed_machine('a -> b after 100ms -> c;');
      expect(current_state_timeout(m)).toBe(undefined);
      auto_set_state_timeout(m);
      expect(current_state_timeout(m)).toBe(undefined);
      expect(timers.pending()).toHaveLength(0);
    });

  });



});
