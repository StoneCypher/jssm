import { describe, it, expect } from 'vitest';
import { runReplay } from '../../cli/subcommands/run/run';
import { parse_tape } from '../../fsl_stimulus_tape';

describe('runReplay (lib)', () => {
  it('replays a doc + tape and returns the result with canonical + steps', () => {
    const tape = parse_tape(['{"fsl_tape":1,"machine":{}}', '{"op":"action","name":"go"}'].join('\n'));
    const r = runReplay("a 'go' -> b;", tape);
    expect(r.final_state).toBe('b');
    expect(r.canonical).toContain('"state":"b"');
  });
});
