
import * as fc from 'fast-check';

import * as jssm from '../jssm';





// Property-based coverage for the state-timeout machinery: FSL `after`
// edges, auto-armed timers, manual set/clear, and the 'timeout' event.
//
// No real timers run: tests inject a fake `timeout_source` /
// `clear_timeout_source` pair, capture the scheduled callback and delay,
// and fire the callback by hand.  This keeps the suite instant and makes
// the timer lifecycle fully observable.



const RUNS = 60;



/**
 *  A fake timer registry standing in for setTimeout/clearTimeout.  Records
 *  every scheduled `(callback, delay)` under an incrementing handle and
 *  remembers which handles were cleared.
 *  @returns  The injectable sources plus inspection helpers.
 *  @example
 *    const timers = fake_timers();
 *    const machine = jssm.from('a after 5s -> b;  a -> b;', {
 *      timeout_source       : timers.timeout_source,
 *      clear_timeout_source : timers.clear_timeout_source
 *    });
 *    timers.pending().length  // 1 — the auto-armed `after` timer
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

    /** Live (scheduled, not yet cleared or fired) timers. */
    pending: () => [...scheduled],

    /** Fire one live timer by handle, removing it first like a real timeout. */
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
 *  Builds a two-state machine with an `after` edge from the start, plus
 *  the manual edge `after` requires to also exist for the timed hop.
 *  @param ms  The declared delay in milliseconds.
 *  @returns   The FSL source.
 */
const after_fsl = (ms: number): string =>
  `ta after ${ms} ms -> tb;  tb -> ta;`;





describe('FSL `after` edges auto-arm a timer', () => {

  test('creation in an after-state schedules exactly one timer with the declared delay', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (ms) => {

          const timers  = fake_timers();
          const machine = jssm.from(after_fsl(ms), {
            timeout_source       : timers.timeout_source,
            clear_timeout_source : timers.clear_timeout_source
          });

          const pending = timers.pending();
          expect(pending.length).toBe(1);
          expect(pending[0][1].ms).toBe(ms);

          expect(machine.state_timeout_for('ta')).toEqual(['tb', ms]);
          expect(machine.state_timeout_for('tb')).toBe(undefined);
          expect(machine.current_state_timeout()).toEqual(['tb', ms]);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('firing the armed timer transitions to the after-target and emits a timeout event', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (ms) => {

          const timers  = fake_timers();
          const machine = jssm.from(after_fsl(ms), {
            timeout_source       : timers.timeout_source,
            clear_timeout_source : timers.clear_timeout_source
          });

          const events: Array<{ from: string, to: string, after_time: number }> = [];
          machine.on('timeout', (d) => {
            events.push({ from: d.from as string, to: d.to as string, after_time: d.after_time as number });
          });

          const [handle] = timers.pending()[0];
          timers.fire(handle);

          expect(machine.state()).toBe('tb');
          expect(events).toEqual([ { from: 'ta', to: 'tb', after_time: ms } ]);
          expect(machine.current_state_timeout()).toBe(undefined);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('leaving the state before the timer fires clears it', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (ms) => {

          const timers  = fake_timers();
          const machine = jssm.from(after_fsl(ms), {
            timeout_source       : timers.timeout_source,
            clear_timeout_source : timers.clear_timeout_source
          });

          const [handle] = timers.pending()[0];

          expect(machine.transition('tb')).toBe(true);

          expect(timers.cleared_handles().has(handle)).toBe(true);

          // returning to `ta` re-arms a fresh timer
          expect(machine.transition('ta')).toBe(true);
          expect(timers.pending().length).toBe(1);
          expect(machine.current_state_timeout()).toEqual(['tb', ms]);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('hooked machines clear the timer on exit identically to hook-free ones', () => {

    // regression pair for the hook-free clear fix: the same scenario as
    // above must behave the same whether or not the machine has hooks

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.boolean(),
        (ms, with_hook) => {

          const timers  = fake_timers();
          const machine = jssm.from(after_fsl(ms), {
            timeout_source       : timers.timeout_source,
            clear_timeout_source : timers.clear_timeout_source
          });

          if (with_hook) {
            machine.hook_any_transition( () => true );
          }

          const [handle] = timers.pending()[0];

          expect(machine.transition('tb')).toBe(true);

          expect(timers.cleared_handles().has(handle)).toBe(true);
          expect(timers.pending().length).toBe(0);
          expect(machine.current_state_timeout()).toBe(undefined);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('manual state timeouts', () => {

  test('set_state_timeout arms; clear_state_timeout disarms; double-set throws', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (ms1, ms2) => {

          const timers  = fake_timers();
          const machine = jssm.from('ma -> mb;  mb -> ma;', {
            timeout_source       : timers.timeout_source,
            clear_timeout_source : timers.clear_timeout_source
          });

          expect(machine.current_state_timeout()).toBe(undefined);

          machine.set_state_timeout('mb', ms1);
          expect(machine.current_state_timeout()).toEqual(['mb', ms1]);
          expect(timers.pending().length).toBe(1);

          // a second timeout while one is pending is an error
          expect(() => machine.set_state_timeout('mb', ms2)).toThrow();

          machine.clear_state_timeout();
          expect(machine.current_state_timeout()).toBe(undefined);
          expect(timers.pending().length).toBe(0);

          // clearing again is a safe no-op
          expect(() => machine.clear_state_timeout()).not.toThrow();

          // and the slot is free again
          machine.set_state_timeout('mb', ms2);
          expect(machine.current_state_timeout()).toEqual(['mb', ms2]);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('a manually armed timer fires a real transition', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (ms) => {

          const timers  = fake_timers();
          const machine = jssm.from('ma -> mb;  mb -> ma;', {
            timeout_source       : timers.timeout_source,
            clear_timeout_source : timers.clear_timeout_source
          });

          machine.set_state_timeout('mb', ms);

          const [handle] = timers.pending()[0];
          timers.fire(handle);

          expect(machine.state()).toBe('mb');

        }
      ),
      { numRuns: RUNS }
    );

  });

});
