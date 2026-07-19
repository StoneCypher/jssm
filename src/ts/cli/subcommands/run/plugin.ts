import { promises as fs } from 'node:fs';
import { parseFslArgs }   from '../../cli-utils';
import { parse_tape, ReplayError } from '../../../fsl_stimulus_tape';
import type { ReplayErrorKind }    from '../../../fsl_stimulus_tape';
import { runReplay }      from './run';

const SPEC = {
  flags: {
    json:  { boolean: true as const },
    trace: { boolean: true as const },
    out:   { short: 'o' as const },
    help:  { short: 'h' as const, boolean: true as const },
  },
  usage: 'fsl-run [options] [<doc.fsl>] <tape.jsonl>',
};

const EXIT: Record<ReplayErrorKind, number> = {
  parse_error: 3, malformed_tape: 4, unsupported_format_version: 5,
  unknown_op: 4, source_hash_mismatch: 6, no_pending_timer: 7,
};

// Map a thrown error to an exit code. A ReplayError maps by its kind; anything
// else (e.g. an FSL parse failure thrown by the compiler) falls back to 2.
function exit_for(e: unknown): number {
  const kind = (e as ReplayError).kind;
  return Object.prototype.hasOwnProperty.call(EXIT, kind) ? EXIT[kind] : 2;
}

/**
 * `fsl run` entry point. `fsl run <doc> <tape>`, or `fsl run <tape>` when the
 * tape bundles its source (`machine.source`).
 * @param argv - Args after the subcommand name.
 * @returns Exit code: 0 success; distinct codes per error class; 1 user error.
 * @example
 *   await cli(['m.fsl', 'run.jsonl', '--json']);
 */
export async function cli(argv: string[]): Promise<number> {
  let parsed: ReturnType<typeof parseFslArgs>;
  try { parsed = parseFslArgs(argv, SPEC); }
  catch (error) { process.stderr.write(`fsl-run: ${(error as Error).message}\n`); return 1; }

  if (parsed.flags.help) { process.stdout.write(parsed.helpText() + '\n'); return 0; }

  const pos = parsed.positional;
  if (pos.length === 0) { process.stderr.write('fsl-run: need a tape (and a doc unless bundled)\n'); return 1; }

  const tapePath = pos[pos.length - 1];
  const docPath  = pos.length >= 2 ? pos[0] : undefined;

  let tapeText: string;
  let tape: ReturnType<typeof parse_tape>;
  try { tapeText = await fs.readFile(tapePath, 'utf8'); }
  catch (error) { process.stderr.write(`fsl-run: cannot read ${tapePath}: ${(error as Error).message}\n`); return 1; }
  try { tape = parse_tape(tapeText); }
  catch (error) {
    const re = error as ReplayError;
    process.stderr.write(`fsl-run: ${re.message}\n`);
    return exit_for(error);
  }

  let source: string | undefined = tape.header.machine.source;
  if (source === undefined) {
    if (docPath === undefined) { process.stderr.write('fsl-run: no <doc> and tape is not bundled\n'); return 1; }
    try { source = await fs.readFile(docPath, 'utf8'); }
    catch (error) { process.stderr.write(`fsl-run: cannot read ${docPath}: ${(error as Error).message}\n`); return 1; }
  }

  let result: ReturnType<typeof runReplay>;
  try { result = runReplay(source, tape); }
  catch (error) {
    const re = error as ReplayError;
    process.stderr.write(`fsl-run: ${re.message}\n`);
    return exit_for(error);
  }

  const out = async (s: string): Promise<void> => {
    if (parsed.flags.out) { await fs.writeFile(parsed.flags.out as string, s); }
    else { process.stdout.write(s); }
  };

  if (parsed.flags.json) {
    await out(JSON.stringify(result) + '\n');
  } else {
    const acc = result.steps.filter(s => s.accepted).length;
    const rej = result.steps.length - acc;
    // final_state is typed unknown; jssm states are strings today, but render
    // any non-string explicitly rather than letting it collapse to [object Object]
    const shownState = typeof result.final_state === 'string' ? result.final_state : JSON.stringify(result.final_state);
    let human = `state: ${shownState}\n`
              + `data:  ${JSON.stringify(result.final_data)}\n`
              + `${result.steps.length} stimuli (${acc} accepted, ${rej} rejected)\n`;
    if (parsed.flags.trace) {
      human += result.steps.map(s =>
        `  [${s.index}] ${s.op}${s.name ? ' ' + s.name : ''} -> ${s.accepted ? 'accepted' : 'rejected'}`).join('\n') + '\n';
    }
    await out(human);
  }
  return 0;
}
