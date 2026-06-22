/**
 * FSL I/O tape / transducer model — the self-contained core of megaspec §14
 * ("the transducer / tape model") together with the §11 rollback contract.
 *
 * FSL machines are **finite-state transducers**: an external stimulus is read
 * from an *input* tape, a run-to-completion macrostep reacts, and the reaction
 * may `emit` values onto *output* channels.  This module supplies the value
 * abstractions that layer carries — tapes, channels, the emit-pipeline slot,
 * and the transactional rollback bracket — as **pure, host-agnostic** data
 * structures with no parser or runtime coupling.  Phase 2/3 of the spec wires
 * these into the compiler and the machine; here they stand alone and are
 * exhaustively unit-tested.
 *
 * The four spec invariants this module encodes:
 *
 *   1. **Bounded by default.** A tape is a ring buffer whose capacity defaults
 *      to {@link DEFAULT_INPUT_HISTORY} (100,000); going unbounded is the
 *      deliberate, visible {@link unlimited} act (§14 "bounded by default").
 *   2. **Input is the single source of truth.** The `input` tape is retained;
 *      the `output`, `log`, and `error` tapes are *not* retained — they
 *      regenerate by replaying input (§14 "Tapes", §15).  {@link is_retained}
 *      states the policy.
 *   3. **`emit` is part of the transaction.** Emitted values are journaled into
 *      an {@link EmitPipeline} slot and only reach their channels' tapes when
 *      the surrounding {@link TapeTransaction} **commits** (§14 "Output =
 *      emit"; §11 "part of the transaction — rolled back with the transition").
 *   4. **Atomic rollback.** On fault the transaction discards every in-flight
 *      emit, leaving the tapes exactly as they were before the macrostep — but
 *      rollback is **not** responsible for external hook side effects (§11).
 *
 * @see Tape
 * @see Channel
 * @see EmitPipeline
 * @see TapeTransaction
 */


/**
 * The four standard tape roles of the §14 I/O model.  `input` is the retained
 * source-of-truth tape; `output` is the machine's primary `emit` sink; `log`
 * and `error` are the two standard diagnostic tapes, kept *separate from the
 * main output tape* so verification of the I/O relation isn't polluted (§14
 * "Tapes").  `error` is the one the runtime auto-feeds on rollback (§11).
 */
type TapeKind = 'input' | 'output' | 'log' | 'error';


/**
 * The direction of a {@link Channel} in the I/O 2×2 (§14 "the I/O 2×2"): an
 * `input` channel carries reactive triggers *into* the machine (`on chan(p) ->`)
 * and an `output` channel carries active `emit`s *out* of it (`emit chan <- e`).
 */
type ChannelDirection = 'input' | 'output';


/**
 * A tape's history bound (§14 "`input_history: N | unlimited`").  A finite `N`
 * caps the ring buffer at the most-recent `N` entries; the {@link unlimited}
 * sentinel opts — knowingly — into unbounded retention.
 */
type TapeHistory = number | typeof unlimited;


/**
 * The deliberate opt-out from bounded tape retention (§14 "opt into unbounded
 * knowingly").  Pass it as a {@link Tape}'s capacity to disable the ring's cap.
 *
 * @example
 *   const t = new Tape<number>('input', unlimited);
 *   t.is_unbounded();   // true
 *
 * @see TapeHistory
 */
const unlimited = Symbol('unlimited');


/**
 * The default input-history bound (§14): a tape retains its most-recent 100,000
 * entries unless told otherwise.  Chosen so the common case is safe/analyzable
 * without the author thinking about it.
 */
const DEFAULT_INPUT_HISTORY = 100_000;


/**
 * The typed error raised by every {@link Tape}, {@link Channel}, and
 * {@link TapeTransaction} guard in this module — an invalid capacity, an
 * out-of-range {@link Tape.read}, an emit/receive against the wrong channel
 * direction, or an operation on a settled transaction.
 *
 * Deliberately a plain `Error` subclass and **not** an `FslError`: that
 * taxonomy's `kind` enumerates *runtime FSL-expression* faults (§11), whereas a
 * tape misuse is a host-level API error.  Keeping it a bare `Error` also keeps
 * this module host-agnostic and free of any `fsl_errors` coupling (§14).
 *
 * The constructor re-pins the prototype so `instanceof FslTapeError` stays true
 * even when this file is down-levelled to an ES5/ES2015 target (where
 * `extends Error` otherwise severs the chain).
 *
 * @example
 *   try { new Tape<number>('input', 0); }
 *   catch (e) { e instanceof FslTapeError; }   // true
 *
 * @see Tape
 * @see Channel
 * @see TapeTransaction
 */
class FslTapeError extends Error {

  /**
   * @param message - Human-readable description of the tape-model misuse.
   */
  constructor(message: string) {
    super(message);
    this.name = 'FslTapeError';
    Object.setPrototypeOf(this, FslTapeError.prototype);
  }

}


/**
 * One entry on a {@link Tape}: a payload of the tape's element type plus a
 * monotone **sequence index** assigned at append time.  The index is stable
 * across ring eviction (it keeps counting up even as old entries fall off the
 * front), so it doubles as the entry's identity in a repro bundle (§15).
 *
 * @typeParam T - The tape's element type (`tape of T`, §14 "First-class tapes").
 */
type TapeEntry<T> = {
  /** The emitted/recorded value. */
  readonly value : T;
  /** Monotone position in the tape's lifetime, 0-based; survives eviction. */
  readonly seq   : number;
};


/**
 * The policy half of §14's retention rule, as a pure predicate: the `input`
 * tape is retained (the single source of truth), every other tape regenerates
 * by replay and so is *not* retained.
 *
 * @param kind - Which standard tape role to ask about.
 * @returns `true` only for `'input'`.
 *
 * @example
 *   is_retained('input');   // true  — the source of truth
 *   is_retained('output');  // false — regenerated by replay
 *   is_retained('log');     // false
 *   is_retained('error');   // false
 *
 * @see Tape
 */
function is_retained(kind: TapeKind): boolean {
  return kind === 'input';
}


/**
 * A first-class FSL tape (`tape of T`, §14): an **ordered, bounded ring buffer**
 * of {@link TapeEntry} values.  Tapes are plain values — buildable, storable,
 * passable, snapshot-/restore-able — so a machine can build a tape, run a
 * sub-machine over it, and transform tapes in-language.
 *
 * Capacity defaults to {@link DEFAULT_INPUT_HISTORY}; pass a positive integer to
 * cap it tighter, or {@link unlimited} to opt out of the bound entirely.  When a
 * bounded tape overflows, the **oldest** entry is evicted (FIFO) — but the
 * sequence counter keeps climbing, so {@link TapeEntry.seq} is never reused.
 *
 * @typeParam T - The tape's element type.
 *
 * @example
 *   // A bounded output tape that keeps only its last two emits.
 *   const out = new Tape<string>('output', 2);
 *   out.append('a');
 *   out.append('b');
 *   out.append('c');           // 'a' is evicted
 *   out.values();              // ['b', 'c']
 *   out.entries()[0].seq;      // 1  — seq survives eviction
 *
 * @throws RangeError when constructed with a non-positive or non-integer
 *         numeric capacity.
 *
 * @see TapeTransaction
 * @see is_retained
 */
class Tape<T> {

  readonly kind     : TapeKind;
  readonly capacity : TapeHistory;

  private buffer : TapeEntry<T>[];
  private next   : number;

  /**
   * @param kind     - Which standard tape role this tape plays (§14).
   * @param capacity - The history bound; a positive integer count or
   *                   {@link unlimited}.  Defaults to
   *                   {@link DEFAULT_INPUT_HISTORY}.
   *
   * @throws RangeError when `capacity` is a number that is not a positive
   *         integer (zero, negative, fractional, NaN, or ±Infinity).
   */
  constructor(kind: TapeKind, capacity: TapeHistory = DEFAULT_INPUT_HISTORY) {

    if (capacity !== unlimited) {
      if (!Number.isInteger(capacity) || capacity <= 0) {
        throw new FslTapeError(
          `Tape capacity must be a positive integer or \`unlimited\`, got ${String(capacity)}`
        );
      }
    }

    this.kind     = kind;
    this.capacity = capacity;
    this.buffer   = [];
    this.next     = 0;

  }

  /**
   * Whether this tape's retention is unbounded (§14 "opt into unbounded
   * knowingly").
   *
   * @example
   *   new Tape<number>('input', unlimited).is_unbounded();  // true
   *   new Tape<number>('input', 10).is_unbounded();         // false
   */
  is_unbounded(): boolean {
    return this.capacity === unlimited;
  }

  /**
   * Whether this tape is retained across replay — i.e. it is the `input` tape.
   * The non-retained tapes (`output`/`log`/`error`) regenerate by replaying
   * input (§14, §15).
   *
   * @example
   *   new Tape<number>('input',  10).is_retained();  // true
   *   new Tape<number>('output', 10).is_retained();  // false
   *
   * @see is_retained
   */
  is_retained(): boolean {
    return is_retained(this.kind);
  }

  /** The number of entries currently held (after any eviction). */
  get length(): number {
    return this.buffer.length;
  }

  /**
   * Append `value` to the end of the tape, assigning it the next sequence
   * index.  If a bounded tape is at capacity, the oldest entry is evicted
   * first.
   *
   * @param value - The element to record/emit.
   * @returns The {@link TapeEntry} that was appended (with its assigned `seq`).
   *
   * @example
   *   const t = new Tape<number>('input', 100);
   *   const e = t.append(7);
   *   e.seq;        // 0
   *   t.append(8);
   *   t.values();   // [7, 8]
   */
  append(value: T): TapeEntry<T> {
    const entry: TapeEntry<T> = { value, seq: this.next };
    this.next += 1;
    this.buffer.push(entry);
    if (this.capacity !== unlimited && this.buffer.length > this.capacity) {
      this.buffer.shift();
    }
    return entry;
  }

  /**
   * A shallow copy of the live entries, oldest first.  Returned as a fresh
   * array so callers can't mutate the tape's internal buffer.
   *
   * @example
   *   const t = new Tape<string>('log', 10);
   *   t.append('hi');
   *   t.entries();   // [{ value: 'hi', seq: 0 }]
   */
  entries(): TapeEntry<T>[] {
    return this.buffer.slice();
  }

  /**
   * Just the payloads, oldest first — the tape's contents without the sequence
   * bookkeeping.
   *
   * @example
   *   const t = new Tape<number>('output', 10);
   *   t.append(1);
   *   t.append(2);
   *   t.values();   // [1, 2]
   */
  values(): T[] {
    return this.buffer.map(e => e.value);
  }

  /**
   * The most-recently-appended entry, or `undefined` on an empty tape.  This
   * is the freshest input symbol / latest emit.
   *
   * @example
   *   const t = new Tape<number>('input', 10);
   *   t.peek();        // undefined
   *   t.append(42);
   *   t.peek()?.value; // 42
   */
  peek(): TapeEntry<T> | undefined {
    return this.buffer[this.buffer.length - 1];
  }

  /**
   * Read the live entry at a given retained position (0 = oldest still held),
   * with its `seq` stamp.  Use {@link values}/{@link entries} for the whole
   * tape; this is for bounds-checked indexed access into the live window.
   *
   * @param index - A retained position in `[0, length)`.
   * @returns The {@link TapeEntry} at that position.
   *
   * @throws FslTapeError when `index` is not an integer in `[0, length)`
   *         (negative, fractional, NaN, or at/beyond {@link length}).
   *
   * @example
   *   const t = new Tape<string>('input', 10);
   *   t.append('x');
   *   t.read(0).value;   // 'x'
   */
  read(index: number): TapeEntry<T> {
    if (!Number.isInteger(index) || index < 0 || index >= this.buffer.length) {
      throw new FslTapeError(
        `tape read index out of range; got ${String(index)}, length ${this.buffer.length}`
      );
    }
    return this.buffer[index];
  }

  /**
   * The total number of entries ever appended over this tape's lifetime,
   * including ones since evicted — equivalently, the `seq` the next append will
   * receive.  Distinct from {@link length}, which counts only live entries.
   *
   * @example
   *   const t = new Tape<number>('output', 1);
   *   t.append(1);
   *   t.append(2);     // evicts the first
   *   t.length;        // 1
   *   t.appended();    // 2
   */
  appended(): number {
    return this.next;
  }

  /**
   * Drop every live entry.  The sequence counter is **not** reset — a cleared
   * tape keeps numbering where it left off, so identity stays stable across a
   * clear (matching eviction).
   *
   * @example
   *   const t = new Tape<number>('output', 10);
   *   t.append(1);
   *   t.clear();
   *   t.length;        // 0
   *   t.append(2).seq; // 1 — counter preserved
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Iterate the live values, oldest first, so a tape drops straight into
   * `for…of` and spread positions without going through {@link values}.
   *
   * @example
   *   const t = new Tape<number>('output', 10);
   *   t.append(1);
   *   t.append(2);
   *   [...t];   // [1, 2]
   */
  *[Symbol.iterator](): Iterator<T> {
    for (const entry of this.buffer) {
      yield entry.value;
    }
  }

}


/**
 * A named, typed I/O **channel** — one of the actor-model ports of §14 ("Named
 * typed channels").  A channel pairs a {@link ChannelDirection} with the tape
 * that backs it: an `input` channel's tape is the retained source of truth, an
 * `output` channel's tape is a regenerated `emit` sink.  Wiring one machine's
 * `out` channel to another's `in` channel is transducer composition; that
 * wiring lives in Phase 2/3 and is out of scope here.
 *
 * @typeParam T - The channel's payload type (its declared alphabet, #1358).
 *
 * @example
 *   const left = new Channel<number>('left', 'output');
 *   left.tape.kind;        // 'output'
 *   left.is_output();      // true
 *   left.is_input();       // false
 *
 * @see Tape
 * @see EmitPipeline
 */
class Channel<T> {

  readonly name      : string;
  readonly direction : ChannelDirection;
  readonly tape      : Tape<T>;

  /**
   * @param name      - The channel's source-declared name (its port label).
   * @param direction - `'input'` (reactive trigger port) or `'output'`
   *                    (`emit` sink port).
   * @param capacity  - History bound for the backing tape; defaults to
   *                    {@link DEFAULT_INPUT_HISTORY}.  Passed straight through
   *                    to {@link Tape}, so the same {@link FslTapeError} applies.
   *
   * @throws FslTapeError when `capacity` is an invalid {@link Tape} capacity.
   */
  constructor(name: string, direction: ChannelDirection, capacity: TapeHistory = DEFAULT_INPUT_HISTORY) {
    this.name      = name;
    this.direction = direction;
    this.tape      = new Tape<T>(direction === 'input' ? 'input' : 'output', capacity);
  }

  /**
   * Whether this is an input (reactive-trigger) channel.
   *
   * @example
   *   new Channel<number>('ev', 'input').is_input();  // true
   */
  is_input(): boolean {
    return this.direction === 'input';
  }

  /**
   * Whether this is an output (`emit`) channel.
   *
   * @example
   *   new Channel<number>('ev', 'input').is_output();  // false
   */
  is_output(): boolean {
    return this.direction === 'output';
  }

  /**
   * Record an inbound value on an `input` channel — the reactive-trigger side
   * of the transducer (§14).  Appending to the input tape *is* feeding the
   * machine; there is no `consume` (input drives the machine, it is not pulled).
   *
   * @param value - The inbound value (event / token / sensor read).
   * @returns The recorded {@link TapeEntry}.
   *
   * @throws FslTapeError when this is not an `input` channel.
   *
   * @example
   *   const inp = new Channel<string>('events', 'input');
   *   inp.receive('go');
   *   inp.values();   // ['go']
   */
  receive(value: T): TapeEntry<T> {
    if (this.direction !== 'input') {
      throw new FslTapeError(
        `cannot receive on non-input channel "${this.name}" (direction "${this.direction}")`
      );
    }
    return this.tape.append(value);
  }

  /**
   * Record an emission *directly* on an `output` channel (`emit chan <- expr`,
   * §14).  This writes the tape immediately; for emissions that must roll back
   * with a faulted macrostep, stage them through {@link TapeTransaction.emit}
   * instead — that path defers the write to commit.
   *
   * @param value - The value to emit.
   * @returns The recorded {@link TapeEntry}.
   *
   * @throws FslTapeError when this is an `input` channel (you cannot emit onto
   *         a reactive-trigger port).
   *
   * @example
   *   const out = new Channel<string>('tokens', 'output');
   *   out.emit('LPAREN');
   *   out.values();   // ['LPAREN']
   */
  emit(value: T): TapeEntry<T> {
    if (this.direction === 'input') {
      throw new FslTapeError(
        `cannot emit on input channel "${this.name}"`
      );
    }
    return this.tape.append(value);
  }

  /**
   * The channel's live values, oldest first — a convenience over
   * `channel.tape.values()`.
   *
   * @example
   *   const out = new Channel<number>('o', 'output');
   *   out.emit(1);
   *   out.emit(2);
   *   out.values();   // [1, 2]
   */
  values(): T[] {
    return this.tape.values();
  }

}


/**
 * One staged emission inside an {@link EmitPipeline}: the target channel name
 * plus the value bound for it.  Held untyped at the value level (`unknown`)
 * because a single pipeline batches emits across heterogeneously-typed
 * channels within one macrostep; the per-channel type is recovered when the
 * value lands on its {@link Channel.tape} at commit.
 *
 * @see EmitPipeline
 */
type StagedEmit = {
  /** The name of the {@link Channel} this value will land on at commit. */
  readonly channel : string;
  /** The value to append to that channel's tape. */
  readonly value   : unknown;
};


/**
 * The **emit pipeline slot** of §14 — the staging buffer for the active `emit`
 * effects produced during a single transition/macrostep.  An `emit chan <- e`
 * does *not* touch its channel's tape directly; it {@link stage}s the value
 * here.  The staged batch is part of the transaction (§11): a
 * {@link TapeTransaction} either {@link drain}s it onto the channels' tapes at
 * commit, or {@link discard}s it on rollback — so an emit is rolled back with
 * its transition, exactly as the spec requires.
 *
 * A pipeline is a pure accumulator: it never resolves channel names itself (the
 * transaction owns the channel registry), so it stays trivially testable.
 *
 * @example
 *   const p = new EmitPipeline();
 *   p.stage('left', 70);
 *   p.stage('log', 'done');
 *   p.size;                       // 2
 *   p.staged().map(e => e.channel); // ['left', 'log']
 *   p.discard();                  // rollback path
 *   p.size;                       // 0
 *
 * @see TapeTransaction
 * @see StagedEmit
 */
class EmitPipeline {

  private slot : StagedEmit[];

  constructor() {
    this.slot = [];
  }

  /**
   * Stage one `emit chan <- value` for later commit.  Order is preserved: the
   * emits drain in the order they were staged, so observers see them in
   * document order within the macrostep.
   *
   * @param channel - The target channel's name.
   * @param value   - The value to emit onto it.
   * @returns The {@link StagedEmit} record that was queued.
   *
   * @example
   *   const p = new EmitPipeline();
   *   p.stage('out', 1).channel;  // 'out'
   */
  stage(channel: string, value: unknown): StagedEmit {
    const emit: StagedEmit = { channel, value };
    this.slot.push(emit);
    return emit;
  }

  /** How many emits are currently staged. */
  get size(): number {
    return this.slot.length;
  }

  /** Whether the slot holds no staged emits. */
  is_empty(): boolean {
    return this.slot.length === 0;
  }

  /**
   * A shallow copy of the staged emits, in stage order — for inspection
   * without draining (e.g. an observer peeking at the in-flight batch).
   *
   * @example
   *   const p = new EmitPipeline();
   *   p.stage('a', 1);
   *   p.staged();   // [{ channel: 'a', value: 1 }]
   */
  staged(): StagedEmit[] {
    return this.slot.slice();
  }

  /**
   * The **rollback** path (§11): throw away every staged emit so nothing
   * reaches any tape.  Idempotent — discarding an empty slot is a no-op.
   *
   * @example
   *   const p = new EmitPipeline();
   *   p.stage('a', 1);
   *   p.discard();
   *   p.is_empty();   // true
   */
  discard(): void {
    this.slot = [];
  }

  /**
   * The **commit** path: hand the staged emits to `sink` in order and clear the
   * slot.  The caller (a {@link TapeTransaction}) supplies the sink that knows
   * how to land each value on its channel's tape; this method only sequences
   * and empties the slot, keeping the pipeline itself free of channel knowledge.
   *
   * @param sink - Called once per staged emit, in stage order, before the slot
   *               is cleared.
   *
   * @example
   *   const p   = new EmitPipeline();
   *   const got : string[] = [];
   *   p.stage('a', 1);
   *   p.drain(e => got.push(e.channel));
   *   got;          // ['a']
   *   p.is_empty(); // true
   */
  drain(sink: (emit: StagedEmit) => void): void {
    for (const emit of this.slot) {
      sink(emit);
    }
    this.slot = [];
  }

}


/**
 * The transactional bracket that makes `emit` atomic (§11 "atomic rollback of
 * state + data — and the in-flight `emit`s").  A transaction owns a channel
 * registry and a private {@link EmitPipeline}; transition logic stages emits
 * through {@link emit}, then the macrostep ends by either {@link commit}ting —
 * draining every staged emit onto its channel's tape — or {@link rollback}ing —
 * discarding them so the tapes are untouched.
 *
 * Rollback restores the tape side of the world only.  Per §11 it is **not**
 * responsible for external hook side effects, and there is intentionally no
 * `on rollback` handler (that would break atomicity); this class models exactly
 * that boundary — it reverses staged emits and nothing else.
 *
 * A transaction is **single-shot**: once committed or rolled back it is
 * `settled` and rejects further `emit`/`commit`/`rollback` calls, so a stale
 * reference can't leak emits into a later macrostep.
 *
 * @example
 *   const out = new Channel<number>('left', 'output');
 *   const tx  = new TapeTransaction([out]);
 *
 *   tx.emit('left', 70);
 *   tx.commit();              // 70 lands on the tape
 *   out.tape.values();        // [70]
 *
 * @example
 *   // The rollback path leaves the tape pristine.
 *   const out2 = new Channel<number>('left', 'output');
 *   const tx2  = new TapeTransaction([out2]);
 *   tx2.emit('left', 70);
 *   tx2.rollback();
 *   out2.tape.values();       // []  — the emit was rolled back with the txn
 *
 * @throws FslTapeError from {@link emit} when the named channel is unknown, when
 *         the channel is an input channel, or when the transaction has settled.
 * @throws FslTapeError from {@link commit}/{@link rollback} when already settled.
 *
 * @see EmitPipeline
 * @see Channel
 */
class TapeTransaction {

  private readonly channels : Map<string, Channel<unknown>>;
  private readonly pipeline : EmitPipeline;
  private settled_state     : boolean;

  /**
   * @param channels - The output channels this transaction may emit onto.
   *                   Input channels are accepted (a real machine's registry
   *                   holds both) but {@link emit} refuses to target them.
   */
  constructor(channels: Channel<unknown>[]) {
    this.channels      = new Map(channels.map(c => [c.name, c]));
    this.pipeline      = new EmitPipeline();
    this.settled_state = false;
  }

  /**
   * Whether this transaction has already committed or rolled back.  A settled
   * transaction is inert.
   *
   * @example
   *   const tx = new TapeTransaction([]);
   *   tx.settled();   // false
   *   tx.commit();
   *   tx.settled();   // true
   */
  settled(): boolean {
    return this.settled_state;
  }

  /** How many emits are currently staged but not yet committed. */
  get pending(): number {
    return this.pipeline.size;
  }

  /**
   * Stage `emit channel <- value`.  Validates the channel up front so a bad
   * emit faults immediately (and, via rollback, vanishes) rather than landing
   * a half-batch at commit.
   *
   * @param channel - The target output channel's name.
   * @param value   - The value to emit.
   * @returns This transaction, for chaining successive emits.
   *
   * @throws FslTapeError when the transaction has already settled.
   * @throws FslTapeError when no channel of that name is registered.
   * @throws FslTapeError when the named channel is an `input` channel (you
   *         cannot emit onto a reactive-trigger port).
   *
   * @example
   *   const out = new Channel<number>('o', 'output');
   *   new TapeTransaction([out]).emit('o', 1).pending;  // 1
   */
  emit(channel: string, value: unknown): this {
    if (this.settled_state) {
      throw new FslTapeError(`Cannot emit on a settled transaction (channel "${channel}")`);
    }
    const target = this.channels.get(channel);
    if (target === undefined) {
      throw new FslTapeError(`Cannot emit to unknown channel "${channel}"`);
    }
    if (target.is_input()) {
      throw new FslTapeError(`Cannot emit to input channel "${channel}"`);
    }
    this.pipeline.stage(channel, value);
    return this;
  }

  /**
   * **Commit** the macrostep: drain every staged emit onto its channel's tape,
   * in stage order, then settle.  After commit the emits are observable on the
   * channels and the transaction is inert.
   *
   * @returns The {@link TapeEntry} list produced, one per drained emit, in
   *          commit (stage) order — empty when nothing was staged.
   *
   * @throws FslTapeError when the transaction has already settled.
   *
   * @example
   *   const out = new Channel<string>('log', 'output');
   *   const tx  = new TapeTransaction([out]);
   *   tx.emit('log', 'a');
   *   tx.emit('log', 'b');
   *   tx.commit().map(e => e.value);   // ['a', 'b']  — in stage order
   *   out.tape.values();               // ['a', 'b']
   */
  commit(): TapeEntry<unknown>[] {
    if (this.settled_state) {
      throw new FslTapeError('Cannot commit a settled transaction');
    }
    const produced: TapeEntry<unknown>[] = [];
    this.pipeline.drain(emit => {
      // emit.channel was validated at stage time, so the lookup always hits.
      const target = this.channels.get(emit.channel) as Channel<unknown>;
      produced.push(target.tape.append(emit.value));
    });
    this.settled_state = true;
    return produced;
  }

  /**
   * **Roll back** the macrostep (§11): discard every staged emit so no tape is
   * touched, then settle.  This is the atomic-undo of the in-flight emits — and
   * the whole of it; external hook effects are deliberately out of scope.
   *
   * @returns The number of staged emits discarded.
   *
   * @throws FslTapeError when the transaction has already settled.
   *
   * @example
   *   const out = new Channel<number>('o', 'output');
   *   const tx  = new TapeTransaction([out]);
   *   tx.emit('o', 1);
   *   tx.emit('o', 2);
   *   tx.rollback();       // 2  — two emits discarded
   *   out.tape.values();   // []
   *   tx.settled();        // true
   */
  rollback(): number {
    if (this.settled_state) {
      throw new FslTapeError('Cannot roll back a settled transaction');
    }
    const discarded = this.pipeline.size;
    this.pipeline.discard();
    this.settled_state = true;
    return discarded;
  }

}


export {
  unlimited,
  DEFAULT_INPUT_HISTORY,
  FslTapeError,
  is_retained,
  Tape,
  Channel,
  EmitPipeline,
  TapeTransaction
};

export type {
  TapeKind,
  ChannelDirection,
  TapeHistory,
  TapeEntry,
  StagedEmit
};
