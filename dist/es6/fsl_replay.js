/**
 * Deterministic stimulus-tape replayer (M3). Given FSL source and a tape,
 * reconstructs the run bit-identically by feeding stimuli through the runtime
 * with an injected logical clock and a controlled timer queue (no wall-clock,
 * no real setTimeout, no host hooks). Zero Node deps.
 */
import { Machine, make } from './jssm';
import { source_hash } from './fsl_hash';
import { canonical_config } from './fsl_canonical';
import { ReplayError } from './fsl_stimulus_tape';
/**
 * Replay `tape` against the machine compiled from `source`.
 * @param source - FSL source text.
 * @param tape - The parsed stimulus tape.
 * @returns The deterministic {@link ReplayResult}.
 * @throws ReplayError `source_hash_mismatch` / `no_pending_timer`.
 * @example
 *   replay("a 'go' -> b;", parse_tape('{"fsl_tape":1,"machine":{}}\n{"op":"action","name":"go"}'));
 */
function replay(source, tape) {
    const computed = source_hash(source);
    const declared = tape.header.machine.source_hash;
    if (declared !== undefined && declared !== computed) {
        throw new ReplayError('source_hash_mismatch', `tape source_hash ${declared} != source ${computed}`);
    }
    // Controlled, deterministic time + timers: one pending callback at a time.
    let pending = null;
    const machine = new Machine(Object.assign(Object.assign({}, make(source)), { time_source: () => 0, timeout_source: (f, _ms) => { pending = f; return 1; }, clear_timeout_source: (_h) => { pending = null; } }));
    const steps = [];
    for (const [index, s] of tape.stimuli.entries()) {
        let accepted;
        if (s.op === 'action') {
            accepted = machine.action(s.name, s.data);
        }
        else if (s.op === 'transition') {
            accepted = machine.transition(s.name, s.data);
        }
        else { // timer
            if (pending === null) {
                throw new ReplayError('no_pending_timer', 'timer with no pending timeout', index);
            }
            const cb = pending;
            pending = null;
            cb();
            accepted = true;
        }
        steps.push(s.op === 'timer'
            ? { index, op: 'timer', accepted }
            : { index, op: s.op, name: s.name, accepted });
    }
    const final_state = machine.state();
    const final_data = machine.data();
    return {
        final_state, final_data, steps,
        source_hash: computed,
        canonical: canonical_config(final_state, final_data),
    };
}
export { replay };
