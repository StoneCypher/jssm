import { promises as fs } from 'fs';
import { parseFslArgs }   from '../../cli-utils';
import { parse_tape, ReplayError } from '../../../fsl_stimulus_tape';
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

const EXIT: Record<string, number> = {
  parse_error: 3, malformed_tape: 4, unsupported_format_version: 5,
  unknown_op: 4, source_hash_mismatch: 6, no_pending_timer: 7,
};

/**
 * `fsl run` entry point. `fsl run <doc> <tape>`, or `fsl run <tape>` when the
 * tape bundles its source (`machine.source`).
 *
 * @param argv - Args after the subcommand name.
 * @returns Exit code: 0 success; distinct codes per error class; 1 user error.
 * @example
 *   await cli(['m.fsl', 'run.jsonl', '--json']);
 */
export async function cli(argv: string[]): Promise<number> {
  let parsed: ReturnType<typeof parseFslArgs>;
  try { parsed = parseFslArgs(argv, SPEC); }
  catch (e) { process.stderr.write(`fsl-run: ${(e as Error).message}\n`); return 1; }

  if (parsed.flags.help) { process.stdout.write(parsed.helpText() + '\n'); return 0; }

  const pos = parsed.positional;
  if (pos.length === 0) { process.stderr.write('fsl-run: need a tape (and a doc unless bundled)\n'); return 1; }

  const tapePath = pos[pos.length - 1];
  const docPath  = pos.length >= 2 ? pos[0] : undefined;

  let tapeText: string;
  let tape: ReturnType<typeof parse_tape>;
  try { tapeText = await fs.readFile(tapePath, 'utf8'); }
  catch (e) { process.stderr.write(`fsl-run: cannot read ${tapePath}: ${(e as Error).message}\n`); return 1; }
  try { tape = parse_tape(tapeText); }
  catch (e) {
    const re = e as ReplayError;
    process.stderr.write(`fsl-run: ${re.message}\n`);
    return EXIT[re.kind] ?? 2;
  }

  let source: string | undefined = tape.header.machine.source;
  if (source === undefined) {
    if (docPath === undefined) { process.stderr.write('fsl-run: no <doc> and tape is not bundled\n'); return 1; }
    try { source = await fs.readFile(docPath, 'utf8'); }
    catch (e) { process.stderr.write(`fsl-run: cannot read ${docPath}: ${(e as Error).message}\n`); return 1; }
  }

  let result: ReturnType<typeof runReplay>;
  try { result = runReplay(source, tape); }
  catch (e) {
    const re = e as ReplayError;
    process.stderr.write(`fsl-run: ${re.message}\n`);
    return EXIT[re.kind] ?? 2;
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
    let human = `state: ${String(result.final_state)}\n`
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
