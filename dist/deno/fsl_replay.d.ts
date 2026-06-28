import type { StimulusTape } from './fsl_stimulus_tape';
declare type ReplayStep = {
    index: number;
    op: string;
    name?: string;
    accepted: boolean;
};
declare type ReplayResult = {
    final_state: unknown;
    final_data: unknown;
    steps: ReplayStep[];
    source_hash: string;
    canonical: string;
};
/**
 * Replay `tape` against the machine compiled from `source`.
 *
 * @param source - FSL source text.
 * @param tape - The parsed stimulus tape.
 * @returns The deterministic {@link ReplayResult}.
 * @throws ReplayError `source_hash_mismatch` / `no_pending_timer`.
 *
 * @example
 *   replay("a 'go' -> b;", parse_tape('{"fsl_tape":1,"machine":{}}\n{"op":"action","name":"go"}'));
 */
declare function replay(source: string, tape: StimulusTape): ReplayResult;
export { replay };
export type { ReplayResult, ReplayStep };
