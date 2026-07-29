import { replay }            from '../../../fsl_replay';
import type { ReplayResult } from '../../../fsl_replay';
import type { StimulusTape } from '../../../fsl_stimulus_tape';

/**
 * Replay a tape against FSL source — the library seam over the engine, reused
 * by the CLI shell, M5/M6, and the web replay shell (#819).
 * @param source - FSL source text.
 * @param tape - The parsed stimulus tape.
 * @returns The {@link ReplayResult}.
 * @example
 *   runReplay("a 'go' -> b;", parse_tape(tapeText));
 */
function runReplay(source: string, tape: StimulusTape): ReplayResult {
  return replay(source, tape);
}

export { runReplay };
