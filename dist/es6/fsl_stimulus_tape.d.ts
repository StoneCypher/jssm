declare const SUPPORTED_TAPE_VERSION = 1;
type ReplayErrorKind = 'malformed_tape' | 'unsupported_format_version' | 'unknown_op' | 'source_hash_mismatch' | 'no_pending_timer' | 'parse_error';
/** Typed error for the tape/replay layer (kind-discriminated, like FslError). */
declare class ReplayError extends Error {
    kind: ReplayErrorKind;
    step?: number;
    constructor(kind: ReplayErrorKind, message: string, step?: number);
}
type Stimulus = {
    op: 'action';
    name: string;
    data?: unknown;
} | {
    op: 'transition';
    name: string;
    data?: unknown;
} | {
    op: 'timer';
};
type TapeHeader = {
    fsl_tape: number;
    machine: {
        ref?: string;
        source_hash?: string;
        source?: string;
    };
    seed?: unknown;
    created?: number;
    comment?: string;
};
type StimulusTape = {
    header: TapeHeader;
    stimuli: Stimulus[];
};
/**
 * Parse JSONL tape text into a {@link StimulusTape}.
 * @param text - JSONL: a header object line, then stimulus lines.
 * @returns The parsed header + stimuli.
 * @throws ReplayError kind `malformed_tape` / `unsupported_format_version` / `unknown_op`.
 * @example
 *   parse_tape('{"fsl_tape":1,"machine":{}}\n{"op":"timer"}');
 */
declare function parse_tape(text: string): StimulusTape;
/**
 * Serialize a {@link StimulusTape} back to canonical JSONL (stable key order
 * per line, so the bytes are deterministic).
 * @param tape - The tape to serialize.
 * @returns JSONL text.
 * @example
 *   serialize_tape({ header: { fsl_tape: 1, machine: {} }, stimuli: [{ op: 'timer' }] });
 */
declare function serialize_tape(tape: StimulusTape): string;
export { parse_tape, serialize_tape, ReplayError, SUPPORTED_TAPE_VERSION };
export type { Stimulus, TapeHeader, StimulusTape, ReplayErrorKind };
