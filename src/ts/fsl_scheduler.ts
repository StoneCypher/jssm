
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
 *  The outcome of asking the abstract step function to advance a configuration
 *  by one microstep.
 *
 *  Per §12, a *macrostep* is the whole reaction to one external stimulus; each
 *  transition fired inside it is a *microstep*.  A step function therefore
 *  reports either that the configuration is already **stable** (the quiescent
 *  config where no transition — eventless or internal-event-driven — is
 *  enabled), or that it **fired** one microstep and yields the resulting
 *  configuration.
 *
 *  `kind: 'stable'` carries no payload; `kind: 'fired'` carries the `config`
 *  that the next microstep should operate on.
 *
 *  ```typescript
 *  const stable_now : StepResult<number> = { kind: 'stable' };
 *  const advanced   : StepResult<number> = { kind: 'fired', config: 7 };
 *  ```
 *
 */

type StepResult<Config> =
  | { kind: 'stable' }
  | { kind: 'fired'; config: Config };


/*******
 *
 *  An abstract microstep function.  Given the current configuration, it returns
 *  a {@link StepResult}: `stable` when no transition is enabled (quiescence), or
 *  `fired` with the next configuration when exactly one microstep advanced the
 *  machine.
 *
 *  The scheduler is agnostic to what `Config` is — a state name, a tuple of
 *  group states, a full val-record, anything — and to how the step function
 *  decides enabledness and resolution order.  That keeps the scheduler pure and
 *  free of parser / runtime coupling: priority, document-order tiebreak, the
 *  internal-event queue, and eventless edges all live *inside* the caller's
 *  step function (§12); the scheduler only drives it to a fixpoint.
 *
 *  ```typescript
 *  // a toy three-microstep settle: 0 -> 1 -> 2 -> stable
 *  const step: StepFn<number> = c =>
 *    c < 2 ? { kind: 'fired', config: c + 1 } : { kind: 'stable' };
 *  ```
 *
 *  @param config - The configuration to advance by at most one microstep.
 *
 *  @returns A {@link StepResult} describing whether the machine was already
 *           stable or which configuration the fired microstep produced.
 *
 */

type StepFn<Config> = (config: Config) => StepResult<Config>;


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

const default_microstep_bound: number = 100_000;


/*******
 *
 *  Options controlling a single macrostep settle.
 *
 *  - `bound`: the §13 microstep cap.  A non-negative integer caps the reaction
 *    at that many microsteps; `'unbounded'` disables the cap entirely (the
 *    deliberate, visible opt-out the spec's "bounded by default" mantra
 *    demands).  Omitted ⇒ {@link default_microstep_bound}.
 *  - `pre`: the *before-macrostep* hook phase — fires once, before any
 *    microstep, with the initial configuration.
 *  - `post`: the *at-stable* / *post-commit* hook phase — fires once, after
 *    quiescence is reached, with the final stable configuration.
 *
 *  Hooks are *pure observers* (§12): the scheduler ignores their return value
 *  and never lets them mutate the configuration.  They exist so callers can
 *  thread observational side effects (logging, span emission) at the two RTC
 *  boundary points without the scheduler knowing what those effects are.
 *
 *  ```typescript
 *  const opts : SchedulerOptions<number> = {
 *    bound : 32,
 *    pre   : c => console.log('start', c),
 *    post  : c => console.log('stable', c)
 *  };
 *  ```
 *
 */

type SchedulerOptions<Config> = {
  bound? : number | 'unbounded';
  pre?   : (config: Config) => void;
  post?  : (config: Config) => void;
};


/*******
 *
 *  The result of a completed macrostep settle.
 *
 *  - `config`: the final stable configuration.
 *  - `microsteps`: how many microsteps fired before quiescence (0 when the
 *    initial configuration was already stable).
 *
 *  ```typescript
 *  const out : MacrostepResult<number> = { config: 2, microsteps: 2 };
 *  ```
 *
 */

type MacrostepResult<Config> = {
  config     : Config;
  microsteps : number;
};


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

class MicrostepOverflowError<Config> extends Error {

  readonly kind   : 'microstep_overflow';
  readonly bound  : number;
  readonly config : Config;

  constructor(bound: number, config: Config) {
    super(
      `microstep_overflow: reaction did not stabilize within ${bound} microstep`
        + `${bound === 1 ? '' : 's'} (probable non-terminating eventless cycle)`
    );
    this.name   = 'MicrostepOverflowError';
    this.kind   = 'microstep_overflow';
    this.bound  = bound;
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
 *  negative cap, a fraction, `NaN`, or an integer too large to count exactly —
 *  beyond `Number.MAX_SAFE_INTEGER`, use `'unbounded'` instead).
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
 *                       `NaN`, or not a safe integer (above 2^53 − 1).
 *
 *  @internal
 *
 */

function resolve_bound(bound: number | 'unbounded' | undefined): number {

  if (bound === undefined)     { return default_microstep_bound;       }
  if (bound === 'unbounded')   { return Infinity;      }

  if (!Number.isSafeInteger(bound) || bound < 0) {
    throw new RangeError(
      'microstep bound must be a non-negative safe integer or the string "unbounded"'
    );
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

function settle_microsteps<Config>(
  step    : StepFn<Config>,
  initial : Config,
  options : SchedulerOptions<Config> = {}
): MacrostepResult<Config> {

  const cap: number = resolve_bound(options.bound);

  // before-macrostep phase (§12): fires once with the initial configuration.
  if (options.pre !== undefined) { options.pre(initial); }

  let config     : Config = initial;
  let microsteps : number = 0;

  // settle until quiescence; the bound is checked before each fire so the cap
  // counts microsteps actually fired, never the terminating `stable` probe.
  for (;;) {

    const result: StepResult<Config> = step(config);

    if (result.kind === 'stable') { break; }

    if (microsteps >= cap) {
      throw new MicrostepOverflowError<Config>(cap, config);
    }

    config      = result.config;
    microsteps += 1;

  }

  // at-stable / post-commit phase (§12): fires once with the stable config.
  if (options.post !== undefined) { options.post(config); }

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

function run_macrostep<Config>(
  step    : StepFn<Config>,
  initial : Config,
  options : SchedulerOptions<Config> = {}
): MacrostepResult<Config> {
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

function is_stable<Config>(step: StepFn<Config>, config: Config): boolean {
  return step(config).kind === 'stable';
}


export {
  default_microstep_bound,
  MicrostepOverflowError,
  resolve_bound,
  settle_microsteps,
  run_macrostep,
  is_stable
};

export type {
  StepResult,
  StepFn,
  SchedulerOptions,
  MacrostepResult
};
