
//
//  fsl_tape.ts — the §14 transducer / tape / channel model (jssm v6).
//
//  A self-contained model of FSL's I/O surface: tapes (ordered records of
//  inputs and emissions), channels (named, typed, directional tapes), the
//  emit-pipeline slot (emissions staged during a macrostep), and the
//  rollback semantics that discard those staged emissions when a macrostep
//  faults.  Pure where possible, typed, and deliberately decoupled from the
//  grammar and the `Machine` runtime — this module knows nothing about
//  states, transitions, or parse trees.
//
//  §14 framing (the megaspec):
//   - Machines are finite-state transducers: input tape in, output tapes out.
//   - The *input tape* is the single retained source of truth (a bounded ring
//     buffer, default 100,000, `input_history: N | unlimited`); replaying it
//     regenerates everything else.
//   - The *output*, *log*, and *error* tapes are *not* retained — they
//     regenerate by replaying the input — so they are modelled here as
//     append-only tapes a caller may bound or leave unbounded.
//   - `emit chan <- expr` is an active effect that is *part of the
//     transaction*: emissions are staged in a pipeline slot during a
//     macrostep and either committed at stable or discarded on fault.
//




/*******
 *
 *  The four standard FSL channel directions (§14).
 *
 *   - `input`  — reactive triggers driving the machine; the retained tape.
 *   - `output` — the machine's emissions (`emit chan <- expr`); the I/O
 *                relation the verifier reasons about.
 *   - `log`    — the user diagnostic tape (`emit log <- …`); not retained.
 *   - `error`  — the runtime-fed diagnostic tape (auto-emitted on rollback);
 *                not retained.
 *
 */

type TapeDirection = 'input' | 'output' | 'log' | 'error';




/*******
 *
 *  A single recorded element on a tape: a value of the channel's element
 *  type, stamped with the monotonic sequence index it occupied when written.
 *
 *  The `seq` is assigned at append time and never reused, so it survives ring
 *  eviction — a reader can tell "entry 100,007" from "entry 7" even after the
 *  buffer has wrapped, which is what makes replay positions stable.
 *
 *  @typeParam T - The channel's element type (the alphabet, §14).
 *
 *  ```typescript
 *  const e: TapeEntry<string> = { seq: 0, value: 'tick' };
 *  ```
 *
 */

type TapeEntry<T> = {
  readonly seq   : number;
  readonly value : T;
};




/*******
 *
 *  A bound for a tape's retention.  A non-negative integer caps the tape to a
 *  ring buffer of that many most-recent entries (`input_history: N`); the
 *  literal `'unlimited'` opts knowingly into unbounded growth
 *  (`input_history: unlimited`).
 *
 *  Per §14's "bounded by default" mantra, the input tape defaults to a finite
 *  bound ({@link DEFAULT_INPUT_HISTORY}); `'unlimited'` is the deliberate,
 *  visible escape hatch.
 *
 */

type TapeBound = number | 'unlimited';




/*******
 *
 *  The default retained-input bound (§14): a ring buffer of 100,000 entries.
 *  Chosen so a typical run's whole tape is retained for replay while a runaway
 *  stream can't exhaust memory.
 *
 */

const DEFAULT_INPUT_HISTORY: number = 100_000;




/*******
 *
 *  Raised when a tape, channel, or pipeline operation is given an invalid
 *  argument (a negative or non-integer bound, an out-of-range read index, an
 *  emit to a channel that does not accept emissions, and so on).
 *
 *  Deliberately a plain `Error` subclass and not `JssmError`: this module is
 *  decoupled from the `Machine` runtime (§14 — "no grammar / Machine
 *  coupling"), so it must not reach for machine context.
 *
 *  ```typescript
 *  throw new FslTapeError('bound must be a non-negative integer or "unlimited"');
 *  ```
 *
 *  @param message - A human-readable description of what went wrong.
 *
 */

class FslTapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FslTapeError';
  }
}




/*******
 *
 *  Validates a {@link TapeBound}, throwing on anything that is neither
 *  `'unlimited'` nor a non-negative safe integer.  Pure (no side effects);
 *  returns the bound unchanged on success so it can be used inline.
 *
 *  ```typescript
 *  validate_bound(10);          // 10
 *  validate_bound('unlimited'); // 'unlimited'
 *  validate_bound(-1);          // throws FslTapeError
 *  ```
 *
 *  @param bound - The candidate retention bound.
 *
 *  @returns The validated bound, unchanged.
 *
 *  @throws {FslTapeError} If `bound` is not `'unlimited'` and not a
 *                         non-negative safe integer.
 *
 */

function validate_bound(bound: TapeBound): TapeBound {

  if (bound === 'unlimited') {
    return bound;
  }

  if (typeof bound !== 'number' || !Number.isSafeInteger(bound) || bound < 0) {
    throw new FslTapeError(
      `tape bound must be a non-negative safe integer or "unlimited"; got ${String(bound)}`
    );
  }

  return bound;

}




/*******
 *
 *  An ordered, append-only record of values written to one direction of a
 *  machine's I/O surface (§14).  A `Tape` is the in-memory realization of a
 *  channel's history: each {@link append} stamps the value with a monotonic
 *  `seq` and stores it; when a finite `bound` is set the oldest entries are
 *  evicted as a ring buffer so memory stays capped while `seq` keeps counting.
 *
 *  Tapes are *values* in the §14 sense — buildable, readable, and snapshot /
 *  restorable — but carry no machine coupling.  The input tape is the retained
 *  source of truth; the output / log / error tapes are conventionally
 *  unretained (regenerated by replay), which a caller models by simply not
 *  persisting them.
 *
 *  ```typescript
 *  const t = new Tape<string>(2);   // ring buffer of 2
 *  t.append('a');
 *  t.append('b');
 *  t.append('c');                   // 'a' evicted
 *  t.values();                      // ['b', 'c']
 *  t.length;                        // 2   (live size)
 *  t.written;                       // 3   (lifetime appends)
 *  ```
 *
 *  @typeParam T - The channel's element type (its alphabet).
 *
 */

class Tape<T> {

  private          _entries : TapeEntry<T>[];
  private          _written : number;
  private readonly _bound   : TapeBound;

  /*******
   *
   *  Builds an empty tape.
   *
   *  @param bound - Retention bound: a non-negative integer ring-buffer size,
   *                 or `'unlimited'` (the default) for unbounded growth.
   *
   *  @throws {FslTapeError} If `bound` is invalid (see {@link validate_bound}).
   *
   */
  constructor(bound: TapeBound = 'unlimited') {
    this._bound   = validate_bound(bound);
    this._entries = [];
    this._written = 0;
  }

  /*******
   *
   *  The retention bound this tape was constructed with.
   *
   */
  get bound(): TapeBound {
    return this._bound;
  }

  /*******
   *
   *  The number of entries currently retained (after any ring eviction).
   *
   */
  get length(): number {
    return this._entries.length;
  }

  /*******
   *
   *  The total number of values ever appended over this tape's lifetime,
   *  including any since evicted.  Doubles as the next `seq` to be assigned.
   *
   */
  get written(): number {
    return this._written;
  }

  /*******
   *
   *  Appends a value, stamping it with the next monotonic `seq` and evicting
   *  the oldest entry if a finite bound is now exceeded.
   *
   *  ```typescript
   *  const t = new Tape<number>();
   *  t.append(7);   // { seq: 0, value: 7 }
   *  ```
   *
   *  @param value - The value to record.
   *
   *  @returns The recorded {@link TapeEntry}, including its assigned `seq`.
   *
   */
  append(value: T): TapeEntry<T> {

    const entry: TapeEntry<T> = { seq: this._written, value };

    this._entries.push(entry);
    this._written += 1;

    if (this._bound !== 'unlimited' && this._entries.length > this._bound) {
      this._entries.shift();
    }

    return entry;

  }

  /*******
   *
   *  Reads the retained entry at a given retained-position (0 = oldest still
   *  held).  Use {@link values} for the whole tape; this is for indexed access.
   *
   *  ```typescript
   *  const t = new Tape<string>();
   *  t.append('x');
   *  t.read(0).value;   // 'x'
   *  ```
   *
   *  @param index - A retained position in `[0, length)`.
   *
   *  @returns The {@link TapeEntry} at that position.
   *
   *  @throws {FslTapeError} If `index` is not an integer in `[0, length)`.
   *
   */
  read(index: number): TapeEntry<T> {

    if (!Number.isInteger(index) || index < 0 || index >= this._entries.length) {
      throw new FslTapeError(
        `tape read index out of range; got ${String(index)}, length ${this._entries.length}`
      );
    }

    return this._entries[index];

  }

  /*******
   *
   *  Returns a copy of the retained entries (each with its `seq`), oldest
   *  first.  The returned array is a fresh shallow copy — mutating it does not
   *  affect the tape.
   *
   *  @returns The retained entries in append order.
   *
   */
  entries(): TapeEntry<T>[] {
    return [...this._entries];
  }

  /*******
   *
   *  Returns just the retained values (unwrapping the `seq` stamps), oldest
   *  first — the tape's content as a plain array.
   *
   *  ```typescript
   *  const t = new Tape<string>();
   *  t.append('a'); t.append('b');
   *  t.values();   // ['a', 'b']
   *  ```
   *
   *  @returns The retained values in append order.
   *
   */
  values(): T[] {
    return this._entries.map(e => e.value);
  }

  /*******
   *
   *  Iterates the retained values, oldest first, so a tape works directly in
   *  `for…of` and spread positions.
   *
   *  ```typescript
   *  const t = new Tape<number>();
   *  t.append(1); t.append(2);
   *  [...t];   // [1, 2]
   *  ```
   *
   */
  *[Symbol.iterator](): Iterator<T> {
    for (const e of this._entries) {
      yield e.value;
    }
  }

  /*******
   *
   *  Empties the tape's retained entries.  Does *not* reset the lifetime
   *  `written` counter, so subsequent `seq` stamps stay monotonic and replay
   *  positions remain meaningful.
   *
   */
  clear(): void {
    this._entries = [];
  }

}




/*******
 *
 *  A named, typed, directional tape — the §14 channel: the actor-model port a
 *  machine reads from (`input`) or emits to (`output` / `log` / `error`).  A
 *  channel is a thin policy layer over a {@link Tape}: it adds the channel's
 *  `name`, its `direction`, and the rule that only output-side channels accept
 *  {@link emit}.
 *
 *  Per §14 the input channel is retained (default-bounded ring buffer) and the
 *  output / log / error channels are unretained diagnostics; the default bound
 *  here reflects that — `input` defaults to {@link DEFAULT_INPUT_HISTORY},
 *  every other direction to `'unlimited'` (the caller is expected not to
 *  persist them, regenerating by replay instead).
 *
 *  ```typescript
 *  const out = new Channel<string>('tokens', 'output');
 *  out.emit('LPAREN');
 *  out.values();   // ['LPAREN']
 *
 *  const inp = new Channel<string>('events', 'input');
 *  inp.receive('go');
 *  inp.values();   // ['go']
 *  ```
 *
 *  @typeParam T - The channel's element type (its alphabet, §14).
 *
 */

class Channel<T> {

  readonly name      : string;
  readonly direction : TapeDirection;
  readonly tape      : Tape<T>;

  /*******
   *
   *  Builds a channel and its backing tape.
   *
   *  @param name      - The channel's declared name (the wiring identifier).
   *  @param direction - One of the four §14 directions.
   *  @param bound     - Optional retention bound; defaults to
   *                     {@link DEFAULT_INPUT_HISTORY} for `input` channels and
   *                     `'unlimited'` for output / log / error channels.
   *
   *  @throws {FslTapeError} If `bound` is invalid.
   *
   */
  constructor(name: string, direction: TapeDirection, bound?: TapeBound) {

    this.name      = name;
    this.direction = direction;

    const effective_bound: TapeBound = (bound === undefined)
      ? (direction === 'input' ? DEFAULT_INPUT_HISTORY : 'unlimited')
      : bound;

    this.tape = new Tape<T>(effective_bound);

  }

  /*******
   *
   *  Records an inbound value on an `input` channel — the reactive trigger
   *  side of the transducer (§14).  Appending to the input tape *is* feeding
   *  the machine; there is no `consume` (input drives the machine, it is not
   *  imperatively pulled).
   *
   *  @param value - The inbound value (event / token / sensor read).
   *
   *  @returns The recorded {@link TapeEntry}.
   *
   *  @throws {FslTapeError} If this channel is not an `input` channel.
   *
   */
  receive(value: T): TapeEntry<T> {

    if (this.direction !== 'input') {
      throw new FslTapeError(
        `cannot receive on non-input channel "${this.name}" (direction "${this.direction}")`
      );
    }

    return this.tape.append(value);

  }

  /*******
   *
   *  Records an emission on an output-side channel — the active-effect side of
   *  the transducer (`emit chan <- expr`, §14).  Permitted on `output`, `log`,
   *  and `error` channels; refused on `input`.
   *
   *  This writes the tape *directly*; transactional staging (so emissions roll
   *  back with a faulted macrostep) is the job of {@link EmitPipeline}, which
   *  calls this only on commit.
   *
   *  @param value - The value to emit.
   *
   *  @returns The recorded {@link TapeEntry}.
   *
   *  @throws {FslTapeError} If this channel is an `input` channel.
   *
   */
  emit(value: T): TapeEntry<T> {

    if (this.direction === 'input') {
      throw new FslTapeError(
        `cannot emit on input channel "${this.name}"`
      );
    }

    return this.tape.append(value);

  }

  /*******
   *
   *  Convenience accessor for the channel's retained values, oldest first.
   *
   *  @returns The backing tape's values.
   *
   */
  values(): T[] {
    return this.tape.values();
  }

}




/*******
 *
 *  One staged emission held in the {@link EmitPipeline}: which channel it is
 *  bound for and the value to write when (and only when) the macrostep
 *  commits.
 *
 *  @typeParam T - The element type of the target channel.
 *
 */

type StagedEmission<T> = {
  readonly channel : Channel<T>;
  readonly value   : T;
};




/*******
 *
 *  The §14 emit-pipeline slot with rollback semantics.
 *
 *  During a macrostep every `emit chan <- expr` is *staged* here rather than
 *  written straight to its channel, because emissions are part of the
 *  transaction (§14 / §11): if the macrostep faults, the in-flight emissions
 *  must be discarded along with the rolled-back state and vals.  At stable the
 *  pipeline {@link commit}s — flushing staged emissions to their channels in
 *  order — and a fault instead triggers {@link rollback}, dropping them with
 *  no channel write at all.
 *
 *  The pipeline is intentionally untyped across channels (`Channel<unknown>`):
 *  a single macrostep may emit on several differently-typed channels, and each
 *  staged emission carries its own channel so type pairing stays local to the
 *  `emit` call site.
 *
 *  ```typescript
 *  const out = new Channel<string>('out', 'output');
 *  const log = new Channel<string>('log', 'log');
 *  const pipe = new EmitPipeline();
 *
 *  // — a macrostep that commits —
 *  pipe.stage(out, 'x');
 *  pipe.stage(log, 'fired');
 *  pipe.commit();              // both written, in order
 *  out.values();              // ['x']
 *  log.values();              // ['fired']
 *
 *  // — a macrostep that faults —
 *  pipe.stage(out, 'y');
 *  pipe.rollback();            // discarded
 *  out.values();              // ['x']   (unchanged)
 *  ```
 *
 */

class EmitPipeline {

  private _staged : StagedEmission<unknown>[];

  /*******
   *
   *  Builds an empty pipeline.
   *
   */
  constructor() {
    this._staged = [];
  }

  /*******
   *
   *  The number of emissions currently staged (awaiting commit / rollback).
   *
   */
  get pending(): number {
    return this._staged.length;
  }

  /*******
   *
   *  Stages an emission for `channel` without writing it.  The value is held
   *  until {@link commit} flushes it or {@link rollback} discards it.  Refuses
   *  to stage onto an `input` channel — input is received, never emitted.
   *
   *  @typeParam T - The channel's element type.
   *
   *  @param channel - The output-side channel to emit on.
   *  @param value   - The value to emit at commit.
   *
   *  @throws {FslTapeError} If `channel` is an `input` channel.
   *
   */
  stage<T>(channel: Channel<T>, value: T): void {

    if (channel.direction === 'input') {
      throw new FslTapeError(
        `cannot stage an emission onto input channel "${channel.name}"`
      );
    }

    this._staged.push({ channel: channel as Channel<unknown>, value });

  }

  /*******
   *
   *  Flushes every staged emission to its channel, in stage order, then clears
   *  the slot — the macrostep reached stable and its I/O is now durable.
   *
   *  ```typescript
   *  pipe.stage(out, 'a');
   *  pipe.commit();   // 'a' now on out's tape; pending back to 0
   *  ```
   *
   *  @returns The {@link TapeEntry} list produced, in commit order.
   *
   */
  commit(): TapeEntry<unknown>[] {

    const produced = this._staged.map(
      ({ channel, value }) => channel.emit(value)
    );

    this._staged = [];

    return produced;

  }

  /*******
   *
   *  Discards every staged emission without writing any channel — the
   *  macrostep faulted, so its in-flight emissions are unwound along with
   *  state and vals (§11 atomic rollback).  Safe to call when nothing is
   *  staged (a no-op).
   *
   *  @returns The number of emissions discarded.
   *
   */
  rollback(): number {

    const discarded = this._staged.length;

    this._staged = [];

    return discarded;

  }

}




export {

  // types
  type TapeDirection,
  type TapeEntry,
  type TapeBound,
  type StagedEmission,

  // constants
  DEFAULT_INPUT_HISTORY,

  // errors
  FslTapeError,

  // helpers
  validate_bound,

  // classes
  Tape,
  Channel,
  EmitPipeline

};
