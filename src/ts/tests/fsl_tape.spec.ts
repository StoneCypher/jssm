
import {
  unlimited,
  DEFAULT_INPUT_HISTORY,
  is_retained,
  Tape,
  Channel,
  EmitPipeline,
  TapeTransaction
} from '../fsl_tape';

import type { TapeKind } from '../fsl_tape';




describe('fsl_tape: constants and the retention policy', () => {

  test('the default input history is 100,000 (§14 bounded by default)', () => {
    expect(DEFAULT_INPUT_HISTORY).toBe(100_000);
  });

  test('`unlimited` is a distinct symbol sentinel', () => {
    expect(typeof unlimited).toBe('symbol');
    expect(unlimited).not.toBe(Symbol('unlimited'));
  });

  test('only the input tape is retained', () => {
    expect(is_retained('input')).toBe(true);
    expect(is_retained('output')).toBe(false);
    expect(is_retained('log')).toBe(false);
    expect(is_retained('error')).toBe(false);
  });

  test('is_retained agrees for every tape kind via the enum', () => {
    const kinds: TapeKind[] = ['input', 'output', 'log', 'error'];
    for (const kind of kinds) {
      expect(is_retained(kind)).toBe(kind === 'input');
    }
  });

});




describe('fsl_tape: Tape construction and capacity validation', () => {

  test('defaults to the spec input-history bound', () => {
    const t = new Tape<number>('input');
    expect(t.capacity).toBe(DEFAULT_INPUT_HISTORY);
    expect(t.is_unbounded()).toBe(false);
  });

  test('accepts an explicit positive-integer capacity', () => {
    const t = new Tape<number>('output', 5);
    expect(t.capacity).toBe(5);
  });

  test('accepts the `unlimited` sentinel and reports unbounded', () => {
    const t = new Tape<number>('input', unlimited);
    expect(t.is_unbounded()).toBe(true);
    expect(t.capacity).toBe(unlimited);
  });

  test('rejects a zero capacity', () => {
    expect(() => new Tape<number>('input', 0)).toThrow(RangeError);
  });

  test('rejects a negative capacity', () => {
    expect(() => new Tape<number>('input', -3)).toThrow(RangeError);
  });

  test('rejects a fractional capacity', () => {
    expect(() => new Tape<number>('input', 2.5)).toThrow(RangeError);
  });

  test('rejects a NaN capacity', () => {
    expect(() => new Tape<number>('input', NaN)).toThrow(RangeError);
  });

  test('rejects an Infinity capacity (use `unlimited` instead)', () => {
    expect(() => new Tape<number>('input', Infinity)).toThrow(RangeError);
  });

  test('the RangeError message names the bad value', () => {
    expect(() => new Tape<number>('input', 0))
      .toThrow(/positive integer or `unlimited`/);
  });

});




describe('fsl_tape: Tape append, eviction, and accessors', () => {

  test('a fresh tape is empty', () => {
    const t = new Tape<number>('input', 10);
    expect(t.length).toBe(0);
    expect(t.entries()).toEqual([]);
    expect(t.values()).toEqual([]);
    expect(t.peek()).toBeUndefined();
    expect(t.appended()).toBe(0);
  });

  test('append assigns monotone sequence indices from zero', () => {
    const t = new Tape<string>('input', 10);
    expect(t.append('a').seq).toBe(0);
    expect(t.append('b').seq).toBe(1);
    expect(t.append('c').seq).toBe(2);
    expect(t.values()).toEqual(['a', 'b', 'c']);
  });

  test('append returns the stored entry', () => {
    const t = new Tape<number>('input', 10);
    expect(t.append(7)).toEqual({ value: 7, seq: 0 });
  });

  test('peek returns the most-recent entry', () => {
    const t = new Tape<number>('output', 10);
    t.append(1);
    t.append(2);
    expect(t.peek()).toEqual({ value: 2, seq: 1 });
  });

  test('entries() returns a defensive copy (mutating it does not affect the tape)', () => {
    const t = new Tape<number>('output', 10);
    t.append(1);
    const snap = t.entries();
    snap.push({ value: 999, seq: 999 });
    expect(t.length).toBe(1);
  });

  test('a bounded tape evicts the oldest entry on overflow (FIFO)', () => {
    const t = new Tape<number>('output', 2);
    t.append(1);
    t.append(2);
    t.append(3);
    expect(t.values()).toEqual([2, 3]);
    expect(t.length).toBe(2);
  });

  test('seq survives eviction — it is the lifetime counter, not the slot index', () => {
    const t = new Tape<number>('output', 2);
    t.append(10);
    t.append(20);
    t.append(30);
    expect(t.entries().map(e => e.seq)).toEqual([1, 2]);
    expect(t.appended()).toBe(3);
  });

  test('appended() counts every append including evicted ones; length counts live', () => {
    const t = new Tape<number>('output', 1);
    t.append(1);
    t.append(2);
    expect(t.length).toBe(1);
    expect(t.appended()).toBe(2);
  });

  test('an unbounded tape never evicts', () => {
    const t = new Tape<number>('input', unlimited);
    for (let i = 0; i < 50; i++) { t.append(i); }
    expect(t.length).toBe(50);
    expect(t.values()[0]).toBe(0);
    expect(t.values()[49]).toBe(49);
  });

});




describe('fsl_tape: Tape predicates and clear', () => {

  test('is_retained() on the instance mirrors the free function', () => {
    expect(new Tape<number>('input',  10).is_retained()).toBe(true);
    expect(new Tape<number>('output', 10).is_retained()).toBe(false);
    expect(new Tape<number>('log',    10).is_retained()).toBe(false);
    expect(new Tape<number>('error',  10).is_retained()).toBe(false);
  });

  test('clear empties the live buffer but preserves the sequence counter', () => {
    const t = new Tape<number>('output', 10);
    t.append(1);
    t.append(2);
    t.clear();
    expect(t.length).toBe(0);
    expect(t.values()).toEqual([]);
    expect(t.append(3).seq).toBe(2);
  });

});




describe('fsl_tape: Channel', () => {

  test('an input channel is backed by an input tape', () => {
    const c = new Channel<number>('ev', 'input');
    expect(c.name).toBe('ev');
    expect(c.direction).toBe('input');
    expect(c.is_input()).toBe(true);
    expect(c.is_output()).toBe(false);
    expect(c.tape.kind).toBe('input');
    expect(c.tape.is_retained()).toBe(true);
  });

  test('an output channel is backed by an output tape', () => {
    const c = new Channel<string>('left', 'output');
    expect(c.is_input()).toBe(false);
    expect(c.is_output()).toBe(true);
    expect(c.tape.kind).toBe('output');
    expect(c.tape.is_retained()).toBe(false);
  });

  test('the capacity argument flows through to the backing tape', () => {
    const c = new Channel<number>('o', 'output', 3);
    expect(c.tape.capacity).toBe(3);
  });

  test('the backing tape defaults to the spec history bound', () => {
    const c = new Channel<number>('o', 'output');
    expect(c.tape.capacity).toBe(DEFAULT_INPUT_HISTORY);
  });

  test('an invalid capacity surfaces as the Tape RangeError', () => {
    expect(() => new Channel<number>('o', 'output', 0)).toThrow(RangeError);
  });

  test('appending to the channel tape records values', () => {
    const c = new Channel<number>('o', 'output', 10);
    c.tape.append(70);
    expect(c.tape.values()).toEqual([70]);
  });

});




describe('fsl_tape: EmitPipeline (the emit pipeline slot)', () => {

  test('a fresh pipeline is empty', () => {
    const p = new EmitPipeline();
    expect(p.size).toBe(0);
    expect(p.is_empty()).toBe(true);
    expect(p.staged()).toEqual([]);
  });

  test('stage queues an emit and returns the record', () => {
    const p = new EmitPipeline();
    expect(p.stage('left', 70)).toEqual({ channel: 'left', value: 70 });
    expect(p.size).toBe(1);
    expect(p.is_empty()).toBe(false);
  });

  test('staging preserves order across channels', () => {
    const p = new EmitPipeline();
    p.stage('left', 70);
    p.stage('log', 'done');
    expect(p.staged().map(e => e.channel)).toEqual(['left', 'log']);
  });

  test('staged() is a defensive copy', () => {
    const p = new EmitPipeline();
    p.stage('a', 1);
    const snap = p.staged();
    snap.push({ channel: 'x', value: 0 });
    expect(p.size).toBe(1);
  });

  test('discard drops every staged emit (the rollback path)', () => {
    const p = new EmitPipeline();
    p.stage('a', 1);
    p.stage('b', 2);
    p.discard();
    expect(p.is_empty()).toBe(true);
  });

  test('discard is idempotent on an empty slot', () => {
    const p = new EmitPipeline();
    p.discard();
    expect(p.is_empty()).toBe(true);
  });

  test('drain hands each staged emit to the sink in order and clears the slot', () => {
    const p = new EmitPipeline();
    const seen: Array<[string, unknown]> = [];
    p.stage('a', 1);
    p.stage('b', 2);
    p.drain(e => seen.push([e.channel, e.value]));
    expect(seen).toEqual([['a', 1], ['b', 2]]);
    expect(p.is_empty()).toBe(true);
  });

  test('drain on an empty slot calls the sink zero times', () => {
    const p = new EmitPipeline();
    let calls = 0;
    p.drain(() => { calls += 1; });
    expect(calls).toBe(0);
    expect(p.is_empty()).toBe(true);
  });

});




describe('fsl_tape: TapeTransaction commit path', () => {

  test('a fresh transaction is unsettled with no pending emits', () => {
    const tx = new TapeTransaction([]);
    expect(tx.settled()).toBe(false);
    expect(tx.pending).toBe(0);
  });

  test('emit stages onto the pipeline and is chainable', () => {
    const out = new Channel<number>('o', 'output');
    const tx  = new TapeTransaction([out]);
    const ret = tx.emit('o', 1);
    expect(ret).toBe(tx);
    expect(tx.pending).toBe(1);
  });

  test('commit drains staged emits onto their channel tapes in stage order', () => {
    const out = new Channel<string>('log', 'output', 10);
    const tx  = new TapeTransaction([out]);
    tx.emit('log', 'a');
    tx.emit('log', 'b');
    tx.commit();
    expect(out.tape.values()).toEqual(['a', 'b']);
    expect(tx.settled()).toBe(true);
    expect(tx.pending).toBe(0);
  });

  test('commit routes each emit to the correct channel', () => {
    const left = new Channel<number>('left', 'output', 10);
    const log  = new Channel<string>('log',  'output', 10);
    const tx   = new TapeTransaction([left, log]);
    tx.emit('left', 70);
    tx.emit('log', 'done');
    tx.commit();
    expect(left.tape.values()).toEqual([70]);
    expect(log.tape.values()).toEqual(['done']);
  });

  test('committing an emit-free transaction simply settles it', () => {
    const tx = new TapeTransaction([]);
    tx.commit();
    expect(tx.settled()).toBe(true);
  });

});




describe('fsl_tape: TapeTransaction rollback path (§11 atomicity)', () => {

  test('rollback discards in-flight emits so no tape is touched', () => {
    const out = new Channel<number>('o', 'output', 10);
    const tx  = new TapeTransaction([out]);
    tx.emit('o', 70);
    expect(tx.pending).toBe(1);
    tx.rollback();
    expect(out.tape.values()).toEqual([]);
    expect(tx.settled()).toBe(true);
    expect(tx.pending).toBe(0);
  });

  test('a committed transaction is left intact when a later txn rolls back', () => {
    const out = new Channel<number>('o', 'output', 10);

    const good = new TapeTransaction([out]);
    good.emit('o', 1);
    good.commit();

    const bad = new TapeTransaction([out]);
    bad.emit('o', 2);
    bad.rollback();

    expect(out.tape.values()).toEqual([1]);
  });

});




describe('fsl_tape: TapeTransaction guards', () => {

  test('emit rejects an unknown channel', () => {
    const tx = new TapeTransaction([]);
    expect(() => tx.emit('nope', 1)).toThrow(/unknown channel "nope"/);
  });

  test('emit rejects an input channel (cannot emit onto a trigger port)', () => {
    const inp = new Channel<number>('ev', 'input');
    const tx  = new TapeTransaction([inp]);
    expect(() => tx.emit('ev', 1)).toThrow(/input channel "ev"/);
  });

  test('emit after commit throws (single-shot)', () => {
    const out = new Channel<number>('o', 'output');
    const tx  = new TapeTransaction([out]);
    tx.commit();
    expect(() => tx.emit('o', 1)).toThrow(/settled transaction/);
  });

  test('emit after rollback throws (single-shot)', () => {
    const out = new Channel<number>('o', 'output');
    const tx  = new TapeTransaction([out]);
    tx.rollback();
    expect(() => tx.emit('o', 1)).toThrow(/settled transaction/);
  });

  test('double commit throws', () => {
    const tx = new TapeTransaction([]);
    tx.commit();
    expect(() => tx.commit()).toThrow(/Cannot commit a settled transaction/);
  });

  test('commit after rollback throws', () => {
    const tx = new TapeTransaction([]);
    tx.rollback();
    expect(() => tx.commit()).toThrow(/Cannot commit a settled transaction/);
  });

  test('double rollback throws', () => {
    const tx = new TapeTransaction([]);
    tx.rollback();
    expect(() => tx.rollback()).toThrow(/Cannot roll back a settled transaction/);
  });

  test('rollback after commit throws', () => {
    const tx = new TapeTransaction([]);
    tx.commit();
    expect(() => tx.rollback()).toThrow(/Cannot roll back a settled transaction/);
  });

});




describe('fsl_tape: end-to-end transducer slice', () => {

  test('input tape feeds, emits commit, replay-relevant retention holds', () => {
    // Model one macrostep: read an input symbol, emit two outputs, commit.
    const input  = new Channel<string>('events', 'input', 10);
    const left   = new Channel<number>('left',   'output', 10);
    const log    = new Channel<string>('log',    'output', 10);

    // External stimulus lands on the retained input tape.
    input.tape.append('done');
    expect(input.tape.is_retained()).toBe(true);

    // The reaction stages emits transactionally.
    const tx = new TapeTransaction([input, left, log]);
    tx.emit('left', 70);
    tx.emit('log', 'satisfied');
    tx.commit();

    // Outputs landed; output/log tapes are the non-retained, regenerable side.
    expect(left.tape.values()).toEqual([70]);
    expect(log.tape.values()).toEqual(['satisfied']);
    expect(left.tape.is_retained()).toBe(false);
    expect(log.tape.is_retained()).toBe(false);
  });

  test('a faulting macrostep leaves the output side pristine', () => {
    const input = new Channel<string>('events', 'input', 10);
    const left  = new Channel<number>('left',   'output', 10);

    input.tape.append('go');

    const tx = new TapeTransaction([input, left]);
    tx.emit('left', 1);
    tx.emit('left', 2);
    // Something downstream faults -> roll the whole reaction back.
    tx.rollback();

    expect(left.tape.values()).toEqual([]);
    // The input remains the source of truth, unaffected by the rollback.
    expect(input.tape.values()).toEqual(['go']);
  });

});
