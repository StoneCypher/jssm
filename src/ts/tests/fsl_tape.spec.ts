
import {
  DEFAULT_INPUT_HISTORY,
  FslTapeError,
  validate_bound,
  Tape,
  Channel,
  EmitPipeline,
  type TapeDirection,
  type TapeEntry
} from '../fsl_tape';




//
//  fsl_tape.spec.ts — vitest spec for the §14 tape / channel / emit-pipeline
//  model.  Targets 100% line + branch coverage of fsl_tape.ts: append / read,
//  emit + commit, emit + rollback, and every guard branch.  No fake / snapshot
//  tests, no unreachable branches.
//




describe('DEFAULT_INPUT_HISTORY', () => {

  test('is the §14 default of 100,000', () => {
    expect(DEFAULT_INPUT_HISTORY).toBe(100_000);
  });

});




describe('FslTapeError', () => {

  test('is an Error', () => {
    expect(new FslTapeError('boom') instanceof Error).toBe(true);
  });

  test('carries its message', () => {
    expect(new FslTapeError('boom').message).toBe('boom');
  });

  test('names itself FslTapeError', () => {
    expect(new FslTapeError('boom').name).toBe('FslTapeError');
  });

});




describe('validate_bound', () => {

  test('passes "unlimited" through', () => {
    expect(validate_bound('unlimited')).toBe('unlimited');
  });

  test('passes a non-negative integer through', () => {
    expect(validate_bound(5)).toBe(5);
  });

  test('passes zero through', () => {
    expect(validate_bound(0)).toBe(0);
  });

  test('rejects a negative integer', () => {
    expect(() => validate_bound(-1)).toThrow(FslTapeError);
  });

  test('rejects a non-integer number', () => {
    expect(() => validate_bound(1.5)).toThrow(FslTapeError);
  });

  test('rejects a non-number, non-"unlimited" value', () => {
    expect(() => validate_bound('lots' as any)).toThrow(FslTapeError);
  });

  test('rejects NaN', () => {
    expect(() => validate_bound(NaN)).toThrow(FslTapeError);
  });

  test('error message echoes the bad value', () => {
    expect(() => validate_bound(-3)).toThrow(/-3/);
  });

});




describe('Tape — construction & bounds', () => {

  test('defaults to an unlimited bound', () => {
    expect(new Tape<number>().bound).toBe('unlimited');
  });

  test('accepts an explicit finite bound', () => {
    expect(new Tape<number>(3).bound).toBe(3);
  });

  test('rejects an invalid bound at construction', () => {
    expect(() => new Tape<number>(-1)).toThrow(FslTapeError);
  });

  test('starts empty', () => {
    const t = new Tape<number>();
    expect(t.length).toBe(0);
  });

  test('starts with zero lifetime writes', () => {
    const t = new Tape<number>();
    expect(t.written).toBe(0);
  });

});




describe('Tape — append', () => {

  test('append returns the entry with seq 0 for the first write', () => {
    const t = new Tape<string>();
    expect(t.append('a')).toStrictEqual({ seq: 0, value: 'a' });
  });

  test('append assigns monotonically increasing seq', () => {
    const t = new Tape<string>();
    t.append('a');
    expect(t.append('b')).toStrictEqual({ seq: 1, value: 'b' });
  });

  test('length grows with each append on an unbounded tape', () => {
    const t = new Tape<number>();
    t.append(1); t.append(2); t.append(3);
    expect(t.length).toBe(3);
  });

  test('written counts lifetime appends', () => {
    const t = new Tape<number>();
    t.append(1); t.append(2); t.append(3);
    expect(t.written).toBe(3);
  });

  test('unbounded tape never evicts', () => {
    const t = new Tape<number>('unlimited');
    t.append(1); t.append(2); t.append(3);
    expect(t.values()).toStrictEqual([1, 2, 3]);
  });

  test('a bound that is not yet exceeded does not evict', () => {
    const t = new Tape<number>(3);
    t.append(1); t.append(2); t.append(3);
    expect(t.values()).toStrictEqual([1, 2, 3]);
  });

  test('a finite bound evicts the oldest entry (ring buffer)', () => {
    const t = new Tape<number>(2);
    t.append(1); t.append(2); t.append(3);
    expect(t.values()).toStrictEqual([2, 3]);
  });

  test('eviction caps length at the bound', () => {
    const t = new Tape<number>(2);
    t.append(1); t.append(2); t.append(3);
    expect(t.length).toBe(2);
  });

  test('eviction does not reset the lifetime written counter', () => {
    const t = new Tape<number>(2);
    t.append(1); t.append(2); t.append(3);
    expect(t.written).toBe(3);
  });

  test('seq survives eviction (positions stay stable after wrap)', () => {
    const t = new Tape<number>(2);
    t.append(1); t.append(2); t.append(3);
    expect(t.entries().map(e => e.seq)).toStrictEqual([1, 2]);
  });

});




describe('Tape — read', () => {

  test('reads the entry at a valid retained position', () => {
    const t = new Tape<string>();
    t.append('x'); t.append('y');
    expect(t.read(1)).toStrictEqual({ seq: 1, value: 'y' });
  });

  test('rejects a negative index', () => {
    const t = new Tape<string>();
    t.append('x');
    expect(() => t.read(-1)).toThrow(FslTapeError);
  });

  test('rejects an index at length (out of range)', () => {
    const t = new Tape<string>();
    t.append('x');
    expect(() => t.read(1)).toThrow(FslTapeError);
  });

  test('rejects an index beyond length', () => {
    const t = new Tape<string>();
    t.append('x');
    expect(() => t.read(99)).toThrow(FslTapeError);
  });

  test('rejects a non-integer index', () => {
    const t = new Tape<string>();
    t.append('x');
    expect(() => t.read(0.5)).toThrow(FslTapeError);
  });

  test('read error message reports the length', () => {
    const t = new Tape<string>();
    t.append('x');
    expect(() => t.read(5)).toThrow(/length 1/);
  });

});




describe('Tape — entries / values / iterator / clear', () => {

  test('entries returns stamped entries oldest first', () => {
    const t = new Tape<string>();
    t.append('a'); t.append('b');
    expect(t.entries()).toStrictEqual([
      { seq: 0, value: 'a' },
      { seq: 1, value: 'b' }
    ]);
  });

  test('entries returns a fresh copy (mutation does not leak in)', () => {
    const t = new Tape<string>();
    t.append('a');
    const snap = t.entries();
    snap.push({ seq: 99, value: 'z' });
    expect(t.length).toBe(1);
  });

  test('values unwraps the seq stamps', () => {
    const t = new Tape<string>();
    t.append('a'); t.append('b');
    expect(t.values()).toStrictEqual(['a', 'b']);
  });

  test('is iterable via for…of / spread', () => {
    const t = new Tape<number>();
    t.append(1); t.append(2);
    expect([...t]).toStrictEqual([1, 2]);
  });

  test('iterator yields each value in order', () => {
    const t = new Tape<number>();
    t.append(10); t.append(20);
    const seen: number[] = [];
    for (const v of t) { seen.push(v); }
    expect(seen).toStrictEqual([10, 20]);
  });

  test('clear empties retained entries', () => {
    const t = new Tape<number>();
    t.append(1); t.append(2);
    t.clear();
    expect(t.length).toBe(0);
  });

  test('clear leaves the lifetime written counter intact', () => {
    const t = new Tape<number>();
    t.append(1); t.append(2);
    t.clear();
    expect(t.written).toBe(2);
  });

  test('seq keeps counting after clear', () => {
    const t = new Tape<number>();
    t.append(1); t.append(2);
    t.clear();
    expect(t.append(3).seq).toBe(2);
  });

});




describe('Channel — construction', () => {

  test('records its name', () => {
    expect(new Channel<string>('tokens', 'output').name).toBe('tokens');
  });

  test('records its direction', () => {
    expect(new Channel<string>('tokens', 'output').direction).toBe('output');
  });

  test('an input channel defaults to the retained-input bound', () => {
    expect(new Channel<string>('in', 'input').tape.bound).toBe(DEFAULT_INPUT_HISTORY);
  });

  test('an output channel defaults to unlimited', () => {
    expect(new Channel<string>('out', 'output').tape.bound).toBe('unlimited');
  });

  test('a log channel defaults to unlimited', () => {
    expect(new Channel<string>('log', 'log').tape.bound).toBe('unlimited');
  });

  test('an error channel defaults to unlimited', () => {
    expect(new Channel<string>('error', 'error').tape.bound).toBe('unlimited');
  });

  test('an explicit bound overrides the per-direction default', () => {
    expect(new Channel<string>('in', 'input', 10).tape.bound).toBe(10);
  });

  test('an explicit "unlimited" overrides an input channel default', () => {
    expect(new Channel<string>('in', 'input', 'unlimited').tape.bound).toBe('unlimited');
  });

  test('an invalid explicit bound throws', () => {
    expect(() => new Channel<string>('in', 'input', -2)).toThrow(FslTapeError);
  });

});




describe('Channel — receive', () => {

  test('an input channel records received values', () => {
    const c = new Channel<string>('events', 'input');
    c.receive('go');
    expect(c.values()).toStrictEqual(['go']);
  });

  test('receive returns the stamped entry', () => {
    const c = new Channel<string>('events', 'input');
    expect(c.receive('go')).toStrictEqual({ seq: 0, value: 'go' });
  });

  test('receive on a non-input channel throws', () => {
    const c = new Channel<string>('out', 'output');
    expect(() => c.receive('nope')).toThrow(FslTapeError);
  });

  test('receive error names the offending channel', () => {
    const c = new Channel<string>('out', 'output');
    expect(() => c.receive('nope')).toThrow(/"out"/);
  });

});




describe('Channel — emit', () => {

  test('an output channel records emitted values', () => {
    const c = new Channel<string>('out', 'output');
    c.emit('LPAREN');
    expect(c.values()).toStrictEqual(['LPAREN']);
  });

  test('a log channel accepts emissions', () => {
    const c = new Channel<string>('log', 'log');
    c.emit('retry');
    expect(c.values()).toStrictEqual(['retry']);
  });

  test('an error channel accepts emissions', () => {
    const c = new Channel<string>('error', 'error');
    c.emit('div_by_zero');
    expect(c.values()).toStrictEqual(['div_by_zero']);
  });

  test('emit returns the stamped entry', () => {
    const c = new Channel<string>('out', 'output');
    expect(c.emit('x')).toStrictEqual({ seq: 0, value: 'x' });
  });

  test('emit on an input channel throws', () => {
    const c = new Channel<string>('in', 'input');
    expect(() => c.emit('nope')).toThrow(FslTapeError);
  });

  test('emit error names the offending input channel', () => {
    const c = new Channel<string>('in', 'input');
    expect(() => c.emit('nope')).toThrow(/"in"/);
  });

});




describe('EmitPipeline — staging', () => {

  test('starts with nothing pending', () => {
    expect(new EmitPipeline().pending).toBe(0);
  });

  test('stage increments pending', () => {
    const out  = new Channel<string>('out', 'output');
    const pipe = new EmitPipeline();
    pipe.stage(out, 'x');
    expect(pipe.pending).toBe(1);
  });

  test('stage writes nothing to the channel before commit', () => {
    const out  = new Channel<string>('out', 'output');
    const pipe = new EmitPipeline();
    pipe.stage(out, 'x');
    expect(out.values()).toStrictEqual([]);
  });

  test('stage onto an input channel throws', () => {
    const inp  = new Channel<string>('in', 'input');
    const pipe = new EmitPipeline();
    expect(() => pipe.stage(inp, 'x')).toThrow(FslTapeError);
  });

  test('stage-onto-input error names the channel', () => {
    const inp  = new Channel<string>('in', 'input');
    const pipe = new EmitPipeline();
    expect(() => pipe.stage(inp, 'x')).toThrow(/"in"/);
  });

});




describe('EmitPipeline — commit', () => {

  test('commit flushes staged emissions to their channels', () => {
    const out  = new Channel<string>('out', 'output');
    const pipe = new EmitPipeline();
    pipe.stage(out, 'x');
    pipe.commit();
    expect(out.values()).toStrictEqual(['x']);
  });

  test('commit writes across multiple channels', () => {
    const out  = new Channel<string>('out', 'output');
    const log  = new Channel<string>('log', 'log');
    const pipe = new EmitPipeline();
    pipe.stage(out, 'x');
    pipe.stage(log, 'fired');
    pipe.commit();
    expect([out.values(), log.values()]).toStrictEqual([['x'], ['fired']]);
  });

  test('commit preserves stage order on one channel', () => {
    const out  = new Channel<string>('out', 'output');
    const pipe = new EmitPipeline();
    pipe.stage(out, 'a');
    pipe.stage(out, 'b');
    pipe.commit();
    expect(out.values()).toStrictEqual(['a', 'b']);
  });

  test('commit returns the produced entries in order', () => {
    const out  = new Channel<string>('out', 'output');
    const pipe = new EmitPipeline();
    pipe.stage(out, 'a');
    pipe.stage(out, 'b');
    const produced = pipe.commit() as TapeEntry<string>[];
    expect(produced.map(e => e.value)).toStrictEqual(['a', 'b']);
  });

  test('commit clears the slot', () => {
    const out  = new Channel<string>('out', 'output');
    const pipe = new EmitPipeline();
    pipe.stage(out, 'x');
    pipe.commit();
    expect(pipe.pending).toBe(0);
  });

  test('committing an empty pipeline writes nothing and returns []', () => {
    const pipe = new EmitPipeline();
    expect(pipe.commit()).toStrictEqual([]);
  });

  test('two macrosteps commit cumulatively to the tape', () => {
    const out  = new Channel<string>('out', 'output');
    const pipe = new EmitPipeline();
    pipe.stage(out, 'a');
    pipe.commit();
    pipe.stage(out, 'b');
    pipe.commit();
    expect(out.values()).toStrictEqual(['a', 'b']);
  });

});




describe('EmitPipeline — rollback', () => {

  test('rollback discards staged emissions without writing', () => {
    const out  = new Channel<string>('out', 'output');
    const pipe = new EmitPipeline();
    pipe.stage(out, 'y');
    pipe.rollback();
    expect(out.values()).toStrictEqual([]);
  });

  test('rollback returns the count discarded', () => {
    const out  = new Channel<string>('out', 'output');
    const pipe = new EmitPipeline();
    pipe.stage(out, 'y');
    pipe.stage(out, 'z');
    expect(pipe.rollback()).toBe(2);
  });

  test('rollback clears the slot', () => {
    const out  = new Channel<string>('out', 'output');
    const pipe = new EmitPipeline();
    pipe.stage(out, 'y');
    pipe.rollback();
    expect(pipe.pending).toBe(0);
  });

  test('rollback on an empty pipeline is a no-op returning 0', () => {
    const pipe = new EmitPipeline();
    expect(pipe.rollback()).toBe(0);
  });

  test('a committed emission survives a later macrostep rollback', () => {
    const out  = new Channel<string>('out', 'output');
    const pipe = new EmitPipeline();

    // — macrostep 1: commits —
    pipe.stage(out, 'x');
    pipe.commit();

    // — macrostep 2: faults and rolls back —
    pipe.stage(out, 'y');
    pipe.rollback();

    expect(out.values()).toStrictEqual(['x']);
  });

  test('rollback then a fresh commit emits only the new value', () => {
    const out  = new Channel<string>('out', 'output');
    const pipe = new EmitPipeline();

    pipe.stage(out, 'doomed');
    pipe.rollback();

    pipe.stage(out, 'kept');
    pipe.commit();

    expect(out.values()).toStrictEqual(['kept']);
  });

});




describe('Tape direction type surface', () => {

  test('all four §14 directions construct', () => {
    const dirs: TapeDirection[] = ['input', 'output', 'log', 'error'];
    const names = dirs.map(d => new Channel<string>(d, d).direction);
    expect(names).toStrictEqual(dirs);
  });

});
