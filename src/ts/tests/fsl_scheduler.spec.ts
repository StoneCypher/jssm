
import {
  default_microstep_bound,
  MicrostepOverflowError,
  resolve_bound,
  settle_microsteps,
  run_macrostep,
  is_stable
} from '../fsl_scheduler';

import type {
  StepResult,
  StepFn,
  MacrostepResult
} from '../fsl_scheduler';





// A step function that counts up to `n`, one microstep at a time, then stops.
// `n` microsteps fire: 0 -> 1 -> ... -> n -> stable.
const counter_step = (n: number): StepFn<number> =>
  (c: number): StepResult<number> =>
    c < n ? { kind: 'fired', config: c + 1 } : { kind: 'stable' };


// A step function that never stabilizes — always fires back to the same config.
const runaway_step: StepFn<number> =
  (): StepResult<number> => ({ kind: 'fired', config: 0 });


// A step function that is always stable, regardless of configuration.
const always_stable: StepFn<string> =
  (): StepResult<string> => ({ kind: 'stable' });





describe('default_microstep_bound', () => {

  test('is the spec §13 default of 100,000', () => {
    expect(default_microstep_bound).toBe(100_000);
  });

});





describe('resolve_bound', () => {

  test('undefined resolves to the default bound', () => {
    expect(resolve_bound(undefined)).toBe(default_microstep_bound);
  });

  test('"unbounded" resolves to positive infinity', () => {
    expect(resolve_bound('unbounded')).toBe(Number.POSITIVE_INFINITY);
  });

  test('a non-negative integer passes through unchanged', () => {
    expect(resolve_bound(32)).toBe(32);
  });

  test('zero is a valid bound', () => {
    expect(resolve_bound(0)).toBe(0);
  });

  test('a negative bound throws RangeError', () => {
    expect(() => resolve_bound(-1)).toThrow(RangeError);
  });

  test('a fractional bound throws RangeError', () => {
    expect(() => resolve_bound(1.5)).toThrow(RangeError);
  });

  test('NaN throws RangeError', () => {
    expect(() => resolve_bound(NaN)).toThrow(RangeError);
  });

});





describe('settle_microsteps', () => {

  test('an already-stable config fires zero microsteps', () => {
    const out: MacrostepResult<string> = settle_microsteps(always_stable, 'Idle');
    expect(out).toStrictEqual({ config: 'Idle', microsteps: 0 });
  });

  test('settles a multi-microstep cascade to quiescence', () => {
    const out: MacrostepResult<number> = settle_microsteps(counter_step(3), 0);
    expect(out).toStrictEqual({ config: 3, microsteps: 3 });
  });

  test('does not mutate a structured initial configuration', () => {
    const initial = { count: 0 };
    const step: StepFn<{ count: number }> = c =>
      c.count < 2
        ? { kind: 'fired', config: { count: c.count + 1 } }
        : { kind: 'stable' };

    const out = settle_microsteps(step, initial);

    expect(initial.count).toBe(0);          // original untouched
    expect(out.config.count).toBe(2);
    expect(out.microsteps).toBe(2);
  });

  test('is deterministic — same inputs, same result', () => {
    const a = settle_microsteps(counter_step(5), 0);
    const b = settle_microsteps(counter_step(5), 0);
    expect(a).toStrictEqual(b);
  });

  test('fires the pre hook once with the initial config', () => {
    const seen: number[] = [];
    settle_microsteps(counter_step(2), 0, { pre: c => seen.push(c) });
    expect(seen).toStrictEqual([0]);
  });

  test('fires the post hook once with the stable config', () => {
    const seen: number[] = [];
    settle_microsteps(counter_step(2), 0, { post: c => seen.push(c) });
    expect(seen).toStrictEqual([2]);
  });

  test('orders pre before post around the settle', () => {
    const order: string[] = [];
    settle_microsteps(counter_step(1), 0, {
      pre  : () => order.push('pre'),
      post : () => order.push('post')
    });
    expect(order).toStrictEqual(['pre', 'post']);
  });

  test('honours a custom finite bound that is sufficient', () => {
    const out = settle_microsteps(counter_step(4), 0, { bound: 10 });
    expect(out).toStrictEqual({ config: 4, microsteps: 4 });
  });

  test('settles right at the bound (boundary, no overflow)', () => {
    // exactly 3 microsteps with a cap of 3 must succeed
    const out = settle_microsteps(counter_step(3), 0, { bound: 3 });
    expect(out.microsteps).toBe(3);
  });

  test('a runaway cascade throws MicrostepOverflowError', () => {
    expect(() => settle_microsteps(runaway_step, 0, { bound: 100 }))
      .toThrow(MicrostepOverflowError);
  });

  test('overflow fires the pre hook but not the post hook', () => {
    const order: string[] = [];
    expect(() =>
      settle_microsteps(runaway_step, 0, {
        bound : 5,
        pre   : () => order.push('pre'),
        post  : () => order.push('post')
      })
    ).toThrow(MicrostepOverflowError);
    expect(order).toStrictEqual(['pre']);   // post never reached
  });

  test('a bound of zero overflows on the very first fire', () => {
    expect(() => settle_microsteps(runaway_step, 0, { bound: 0 }))
      .toThrow(MicrostepOverflowError);
  });

  test('a bound of zero still allows an already-stable config', () => {
    const out = settle_microsteps(always_stable, 'Idle', { bound: 0 });
    expect(out).toStrictEqual({ config: 'Idle', microsteps: 0 });
  });

  test('"unbounded" settles a long-but-terminating cascade', () => {
    const out = settle_microsteps(counter_step(1000), 0, { bound: 'unbounded' });
    expect(out.microsteps).toBe(1000);
  });

  test('an invalid numeric bound throws RangeError', () => {
    expect(() => settle_microsteps(counter_step(1), 0, { bound: -3 }))
      .toThrow(RangeError);
  });

});





describe('MicrostepOverflowError', () => {

  test('carries kind, bound, and the stuck config', () => {
    try {
      settle_microsteps(runaway_step, 0, { bound: 4 });
      throw new Error('expected an overflow');
    } catch (e) {
      const err = e as MicrostepOverflowError<number>;
      expect(err).toBeInstanceOf(MicrostepOverflowError);
      expect(err).toBeInstanceOf(Error);
      expect(err.kind).toBe('microstep_overflow');
      expect(err.bound).toBe(4);
      expect(err.config).toBe(0);
    }
  });

  test('pluralizes the microstep count in its message', () => {
    const err = new MicrostepOverflowError<number>(4, 0);
    expect(err.message).toContain('4 microsteps');
  });

  test('uses the singular form for a bound of one', () => {
    const err = new MicrostepOverflowError<number>(1, 0);
    expect(err.message).toContain('1 microstep ');
    expect(err.message).not.toContain('1 microsteps');
  });

  test('has the conventional error name', () => {
    const err = new MicrostepOverflowError<number>(2, 0);
    expect(err.name).toBe('MicrostepOverflowError');
  });

});





describe('run_macrostep', () => {

  test('delegates to settle_microsteps', () => {
    const out = run_macrostep(counter_step(3), 0);
    expect(out).toStrictEqual({ config: 3, microsteps: 3 });
  });

  test('forwards options through to the settle', () => {
    const seen: number[] = [];
    const out = run_macrostep(counter_step(2), 0, {
      bound : 10,
      post  : c => seen.push(c)
    });
    expect(out.config).toBe(2);
    expect(seen).toStrictEqual([2]);
  });

});





describe('is_stable', () => {

  test('returns false for a config with an enabled microstep', () => {
    expect(is_stable(counter_step(1), 0)).toBe(false);
  });

  test('returns true for a quiescent config', () => {
    expect(is_stable(counter_step(1), 1)).toBe(true);
  });

  test('is true for an always-stable step function', () => {
    expect(is_stable(always_stable, 'whatever')).toBe(true);
  });

});
