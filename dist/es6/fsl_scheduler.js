//
// fsl_scheduler — a pure run-to-completion (RTC) macrostep / microstep
// scheduler for FSL v6.
//
// This module is deliberately self-contained: it has no parser or runtime
// coupling.  It schedules *microsteps* over an abstract step function until a
// machine reaches a stable (quiescent) configuration — the run-to-completion
// macrostep — enforcing the §13 microstep bound and ordering the §12 lifecycle
// hook phases (pre / post) around the settle.
//
// Megaspec references: §12 (lifecycle hooks / RTC execution model) and §13
// (totality & termination — the microstep bound).
//
/*******
 *
 *  The maximum number of microsteps the scheduler will fire in a single
 *  reaction before declaring a runaway eventless / internal-event cycle and
 *  raising `microstep_overflow`.
 *
 *  §13 sets the default at 100,000 *per reaction* (not per tape).  The bound is
 *  configurable and disable-able (see {@link SchedulerOptions.bound}).
 *
 */
const default_microstep_bound = 100000;
/*******
 *
 *  Error raised when a reaction fails to stabilize within the microstep bound
 *  (§13).  Distinguished from a plain `Error` by its `kind` discriminator
 *  (`'microstep_overflow'`), mirroring the §11 finite `Error.kind` enum, so
 *  callers can route it (e.g. into an error-recovery transition) without
 *  string-matching the message.
 *
 *  `bound` records the cap that was exceeded and `config` the configuration the
 *  machine was stuck cycling through when the cap tripped — the seed of a
 *  replayable repro.
 *
 *  ```typescript
 *  try {
 *    settle_microsteps(() => ({ kind: 'fired', config: 0 }), 0, { bound: 4 });
 *  } catch (e) {
 *    (e as MicrostepOverflowError<number>).kind;   // 'microstep_overflow'
 *    (e as MicrostepOverflowError<number>).bound;  // 4
 *  }
 *  ```
 *
 */
class MicrostepOverflowError extends Error {
    constructor(bound, config) {
        super(`microstep_overflow: reaction did not stabilize within ${bound} microstep`
            + `${bound === 1 ? '' : 's'} (probable non-terminating eventless cycle)`);
        this.name = 'MicrostepOverflowError';
        this.kind = 'microstep_overflow';
        this.bound = bound;
        this.config = config;
    }
}
/*******
 *
 *  Normalizes the `bound` option into a microstep cap.
 *
 *  Returns `Number.POSITIVE_INFINITY` for the deliberate `'unbounded'` opt-out,
 *  the {@link default_microstep_bound} when unspecified, and the supplied value
 *  otherwise — after rejecting values that could not honestly bound a loop (a
 *  negative cap, a fraction, or `NaN`).
 *
 *  ```typescript
 *  resolve_bound(undefined);      // 100000
 *  resolve_bound('unbounded');    // Infinity
 *  resolve_bound(32);             // 32
 *  ```
 *
 *  @param bound - The raw `bound` option, or `undefined` for the default.
 *
 *  @returns The effective numeric cap (possibly `Infinity`).
 *
 *  @throws {RangeError} If `bound` is a number that is negative, non-integer,
 *                       or `NaN`.
 *
 *  @internal
 *
 */
function resolve_bound(bound) {
    if (bound === undefined) {
        return default_microstep_bound;
    }
    if (bound === 'unbounded') {
        return Number.POSITIVE_INFINITY;
    }
    if (!Number.isInteger(bound) || bound < 0) {
        throw new RangeError('microstep bound must be a non-negative integer or the string "unbounded"');
    }
    return bound;
}
/*******
 *
 *  Settles microsteps from an initial configuration until the machine reaches a
 *  stable (quiescent) configuration — one full run-to-completion macrostep over
 *  the abstract step function.
 *
 *  Mechanics (§12): repeatedly call `step`; while it reports `fired`, adopt the
 *  yielded configuration and count a microstep; when it reports `stable`, stop
 *  and return.  The §13 microstep bound is enforced *before* each fire — once
 *  the count would exceed the cap, a {@link MicrostepOverflowError} is raised
 *  rather than looping forever on a non-stabilizing eventless cycle.
 *
 *  Pure and deterministic: the initial `config` is never mutated, no state is
 *  retained between calls, and the same `(step, config, options)` always
 *  produces the same {@link MacrostepResult} (or the same throw).
 *
 *  ```typescript
 *  // 0 -> 1 -> 2 -> stable
 *  const step: StepFn<number> = c =>
 *    c < 2 ? { kind: 'fired', config: c + 1 } : { kind: 'stable' };
 *
 *  settle_microsteps(step, 0);
 *  // { config: 2, microsteps: 2 }
 *
 *  // already stable: zero microsteps
 *  settle_microsteps(() => ({ kind: 'stable' }), 'Idle');
 *  // { config: 'Idle', microsteps: 0 }
 *  ```
 *
 *  A runaway cycle trips the bound:
 *
 *  ```typescript
 *  settle_microsteps(() => ({ kind: 'fired', config: 0 }), 0, { bound: 100 });
 *  // throws MicrostepOverflowError (kind 'microstep_overflow', bound 100)
 *  ```
 *
 *  @param step    - The abstract microstep function (§12 resolution lives here).
 *  @param initial - The configuration the reaction starts from.
 *  @param options - Optional {@link SchedulerOptions}: the microstep `bound`
 *                   and the `pre` / `post` hook phases.  Hooks are pure
 *                   observers; their return value is ignored.
 *
 *  @returns A {@link MacrostepResult} with the final stable `config` and the
 *           number of `microsteps` that fired.
 *
 *  @throws {MicrostepOverflowError} If the reaction does not stabilize within
 *                                   the resolved microstep bound (§13).
 *  @throws {RangeError} If `options.bound` is an invalid number (see
 *                       {@link resolve_bound}).
 *
 *  @see run_macrostep
 *
 */
function settle_microsteps(step, initial, options = {}) {
    const cap = resolve_bound(options.bound);
    // before-macrostep phase (§12): fires once with the initial configuration.
    if (options.pre !== undefined) {
        options.pre(initial);
    }
    let config = initial;
    let microsteps = 0;
    // settle until quiescence; the bound is checked before each fire so the cap
    // counts microsteps actually fired, never the terminating `stable` probe.
    for (;;) {
        const result = step(config);
        if (result.kind === 'stable') {
            break;
        }
        if (microsteps >= cap) {
            throw new MicrostepOverflowError(cap, config);
        }
        config = result.config;
        microsteps += 1;
    }
    // at-stable / post-commit phase (§12): fires once with the stable config.
    if (options.post !== undefined) {
        options.post(config);
    }
    return { config, microsteps };
}
/*******
 *
 *  Runs one macrostep: the whole run-to-completion reaction to a single
 *  external stimulus.  A thin, intention-revealing alias over
 *  {@link settle_microsteps} — the spec names the *macrostep* as the unit of
 *  external reaction (§12), so callers reacting to one event read better
 *  against `run_macrostep` while bound enforcement and hook ordering stay in
 *  one place.
 *
 *  ```typescript
 *  const step: StepFn<number> = c =>
 *    c < 3 ? { kind: 'fired', config: c + 1 } : { kind: 'stable' };
 *
 *  run_macrostep(step, 0);
 *  // { config: 3, microsteps: 3 }
 *  ```
 *
 *  @param step    - The abstract microstep function.
 *  @param initial - The configuration the macrostep starts from.
 *  @param options - Optional {@link SchedulerOptions}.
 *
 *  @returns The {@link MacrostepResult} for the reaction.
 *
 *  @throws {MicrostepOverflowError} If the reaction does not stabilize (§13).
 *  @throws {RangeError} If `options.bound` is an invalid number.
 *
 *  @see settle_microsteps
 *
 */
function run_macrostep(step, initial, options = {}) {
    return settle_microsteps(step, initial, options);
}
/*******
 *
 *  Reports whether a configuration is already stable (quiescent) under the
 *  given step function — i.e. whether a macrostep from it would fire zero
 *  microsteps.  A convenience predicate for callers that want to test
 *  quiescence (the §12 *stable* config) without driving a full settle.
 *
 *  ```typescript
 *  const step: StepFn<number> = c =>
 *    c < 1 ? { kind: 'fired', config: c + 1 } : { kind: 'stable' };
 *
 *  is_stable(step, 0);  // false
 *  is_stable(step, 1);  // true
 *  ```
 *
 *  @param step   - The abstract microstep function.
 *  @param config - The configuration to test for quiescence.
 *
 *  @returns `true` if `step(config)` reports `stable`, `false` otherwise.
 *
 */
function is_stable(step, config) {
    return step(config).kind === 'stable';
}
export { default_microstep_bound, MicrostepOverflowError, resolve_bound, settle_microsteps, run_macrostep, is_stable };
