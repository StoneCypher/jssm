import { describe, it, expect } from 'vitest';
import { replay } from '../fsl_replay';
import { parse_tape, ReplayError } from '../fsl_stimulus_tape';
import { source_hash } from '../fsl_hash';

const SRC = "Locked 'coin' -> Unlocked; Unlocked 'push' -> Locked;";

function tape(...lines: string[]) {
  return parse_tape(['{"fsl_tape":1,"machine":{}}', ...lines].join('\n'));
}

describe('replay', () => {
  it('drives actions and reports the final state', () => {
    const r = replay(SRC, tape('{"op":"action","name":"coin"}'));
    expect(r.final_state).toBe('Unlocked');
    expect(r.steps[0]).toEqual({ index: 0, op: 'action', name: 'coin', accepted: true });
  });

  it('records a rejected stimulus without throwing', () => {
    const r = replay(SRC, tape('{"op":"action","name":"push"}')); // illegal from Locked
    expect(r.steps[0].accepted).toBe(false);
    expect(r.final_state).toBe('Locked');
  });

  it('is deterministic: same (source, tape) -> identical canonical', () => {
    const t = tape('{"op":"action","name":"coin"}');
    expect(replay(SRC, t).canonical).toBe(replay(SRC, t).canonical);
  });

  it('errors on source_hash mismatch', () => {
    const t = parse_tape(['{"fsl_tape":1,"machine":{"source_hash":"provisional:dead"}}',
                          '{"op":"action","name":"coin"}'].join('\n'));
    try { replay(SRC, t); expect.unreachable(); }
    catch (e) { expect((e as ReplayError).kind).toBe('source_hash_mismatch'); }
  });

  it('stamps source_hash when absent', () => {
    expect(replay(SRC, tape()).source_hash).toBe(source_hash(SRC));
  });

  it('errors on a timer with no pending timeout', () => {
    try { replay(SRC, tape('{"op":"timer"}')); expect.unreachable(); }
    catch (e) { expect((e as ReplayError).kind).toBe('no_pending_timer'); }
  });

  it('drives a transition op', () => {
    const r = replay(SRC, tape('{"op":"transition","name":"Unlocked"}'));
    expect(r.steps[0].op).toBe('transition');
    expect(r.steps[0].accepted).toBe(true);
    expect(r.final_state).toBe('Unlocked');
  });

  it('fires a pending after-timeout on a timer stimulus', () => {
    const r = replay('a after 100 -> b;', tape('{"op":"timer"}'));
    expect(r.steps[0]).toEqual({ index: 0, op: 'timer', accepted: true });
    expect(r.final_state).toBe('b');
  });
});
