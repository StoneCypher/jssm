import { describe, it, expect } from 'vitest';
import { parse_tape, serialize_tape, ReplayError } from '../fsl_stimulus_tape';

const ok = [
  '{"fsl_tape":1,"machine":{"ref":"m.fsl"}}',
  '{"op":"action","name":"coin"}',
  '{"op":"transition","name":"Locked","data":{"n":1}}',
  '{"op":"timer"}',
].join('\n');

describe('parse_tape / serialize_tape', () => {
  it('parses header + three op kinds', () => {
    const t = parse_tape(ok);
    expect(t.header.fsl_tape).toBe(1);
    expect(t.header.machine.ref).toBe('m.fsl');
    expect(t.stimuli).toHaveLength(3);
    expect(t.stimuli[0]).toEqual({ op: 'action', name: 'coin' });
    expect(t.stimuli[2]).toEqual({ op: 'timer' });
  });

  it('round-trips through serialize_tape (canonical, stable)', () => {
    const t = parse_tape(ok);
    expect(parse_tape(serialize_tape(t))).toEqual(t);
  });

  it('rejects a missing header', () => {
    expect(() => parse_tape('')).toThrow(ReplayError);
  });

  it('rejects an unsupported format version', () => {
    try { parse_tape('{"fsl_tape":999,"machine":{}}'); expect.unreachable(); }
    catch (e) { expect((e as ReplayError).kind).toBe('unsupported_format_version'); }
  });

  it('rejects an unknown op with the offending step index', () => {
    const txt = '{"fsl_tape":1,"machine":{}}\n{"op":"frob","name":"x"}';
    try { parse_tape(txt); expect.unreachable(); }
    catch (e) { expect((e as ReplayError).kind).toBe('unknown_op'); expect((e as ReplayError).step).toBe(0); }
  });
});
