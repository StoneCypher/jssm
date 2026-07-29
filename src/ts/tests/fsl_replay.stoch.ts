import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { Machine, make } from '../jssm';
import { replay } from '../fsl_replay';
import { parse_tape, serialize_tape } from '../fsl_stimulus_tape';
import type { Stimulus } from '../fsl_stimulus_tape';

const RUNS = 200;
const SRC  = "Locked 'coin' -> Unlocked; Unlocked 'push' -> Locked;";
const acts = fc.constantFrom('coin', 'push');

// Drive the live runtime directly with the same actions (no tape). This is the
// oracle: the replayer must reproduce the runtime, not a hand-written value.
function liveDrive(seq: string[]): unknown {
  const m = new Machine<unknown>({ ...make<string, unknown>(SRC), time_source: () => 0 });
  for (const a of seq) m.action(a);
  return m.state();
}

function actionTape(seq: string[]) {
  return { header: { fsl_tape: 1, machine: {} }, stimuli: seq.map(name => ({ op: 'action', name } as Stimulus)) };
}

describe('replay (stochastic)', () => {
  it('replay agrees with the live runtime driven directly (anti-fake cross-check)', () => {
    fc.assert(fc.property(fc.array(acts, { maxLength: 40 }), seq => {
      void expect(replay(SRC, actionTape(seq)).final_state).toBe(liveDrive(seq));
    }), { numRuns: RUNS });
  });

  it('is deterministic: replaying the same tape twice is byte-identical', () => {
    fc.assert(fc.property(fc.array(acts, { maxLength: 40 }), seq => {
      const tape = parse_tape(serialize_tape(actionTape(seq)));
      void expect(replay(SRC, tape).canonical).toBe(replay(SRC, tape).canonical);
    }), { numRuns: RUNS });
  });
});
