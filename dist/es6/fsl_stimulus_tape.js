/**
 * The JSONL stimulus-tape format for the M3 replayer: one header line, then one
 * stimulus per line. Pure data + (de)serialization, zero Node deps.
 */
import { canonicalize } from './fsl_canonical';
const SUPPORTED_TAPE_VERSION = 1;
/** Typed error for the tape/replay layer (kind-discriminated, like FslError). */
class ReplayError extends Error {
    constructor(kind, message, step) {
        super(message);
        this.name = 'ReplayError';
        this.kind = kind;
        this.step = step;
        Object.setPrototypeOf(this, ReplayError.prototype);
    }
}
/**
 * Parse JSONL tape text into a {@link StimulusTape}.
 * @param text - JSONL: a header object line, then stimulus lines.
 * @returns The parsed header + stimuli.
 * @throws ReplayError kind `malformed_tape` / `unsupported_format_version` / `unknown_op`.
 * @example
 *   parse_tape('{"fsl_tape":1,"machine":{}}\n{"op":"timer"}');
 */
function parse_tape(text) {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0)
        throw new ReplayError('malformed_tape', 'empty tape (no header)');
    let header;
    try {
        header = JSON.parse(lines[0]);
    }
    catch (_a) {
        throw new ReplayError('malformed_tape', 'header line is not valid JSON');
    }
    if (typeof header.fsl_tape !== 'number' || typeof header.machine !== 'object' || header.machine === null) {
        throw new ReplayError('malformed_tape', 'header missing fsl_tape/machine');
    }
    if (header.fsl_tape > SUPPORTED_TAPE_VERSION) {
        throw new ReplayError('unsupported_format_version', `tape format ${header.fsl_tape} > supported ${SUPPORTED_TAPE_VERSION}`);
    }
    const stimuli = [];
    for (let i = 1; i < lines.length; i++) {
        const step = i - 1;
        let s;
        try {
            s = JSON.parse(lines[i]);
        }
        catch (_b) {
            throw new ReplayError('malformed_tape', 'stimulus line is not valid JSON', step);
        }
        if (s.op === 'action' || s.op === 'transition') {
            if (typeof s.name !== 'string')
                throw new ReplayError('malformed_tape', `${s.op} missing name`, step);
            stimuli.push('data' in s ? { op: s.op, name: s.name, data: s.data } : { op: s.op, name: s.name });
        }
        else if (s.op === 'timer') {
            stimuli.push({ op: 'timer' });
        }
        else {
            throw new ReplayError('unknown_op', `unknown stimulus op ${JSON.stringify(s.op)}`, step);
        }
    }
    return { header, stimuli };
}
/**
 * Serialize a {@link StimulusTape} back to canonical JSONL (stable key order
 * per line, so the bytes are deterministic).
 * @param tape - The tape to serialize.
 * @returns JSONL text.
 * @example
 *   serialize_tape({ header: { fsl_tape: 1, machine: {} }, stimuli: [{ op: 'timer' }] });
 */
function serialize_tape(tape) {
    return [canonicalize(tape.header), ...tape.stimuli.map(s => canonicalize(s))].join('\n');
}
export { parse_tape, serialize_tape, ReplayError, SUPPORTED_TAPE_VERSION };
