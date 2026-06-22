import { promises as fs } from 'fs';
import { parseFslArgs } from '../../cli-utils';
import { exportMachine } from './export';
import type { ExportFormat } from '../interchange/types';
import { InterchangeError } from '../interchange/types';

const getVersion = (): string => '__JSSM_VERSION__';

const SPEC = {
  flags: {
    format:  { short: 'f' as const, enum: [
      'json', 'mermaid', 'scxml', 'xstate', 'dot',
      'tla+', 'alloy', 'smv', 'promela', 'gbnf', 'lark', 'ebnf',
    ] as const, default: 'json' as const },
    output:  { short: 'o' as const },
    quiet:   { short: 'q' as const, boolean: true as const },
    help:    { short: 'h' as const, boolean: true as const },
    version: { short: 'V' as const, boolean: true as const },
  },
  usage: 'fsl-export [options] <fsl-path | ->',
};

const writeStdout = (s: string): void => { process.stdout.write(s); };
const writeStderr = (s: string): void => { process.stderr.write(s); };

const printErr = (msg: string): void => { writeStderr(`fsl-export: error: ${msg}\n`); };

/**
 * Read an entire readable stream to a UTF-8 string. Used for `-`/stdin input.
 *
 * @param stream - The readable stream to drain
 * @returns The stream's full contents decoded as UTF-8
 */
async function readStream(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * The `fsl-export` plugin entry point (megaspec §25's `export` verb).
 *
 * Reads one FSL document (from a path, or stdin via `-`/pipe), converts it to
 * the requested interchange format, and writes the result to stdout or
 * `--output`. Lossy-conversion notes are printed to stderr unless `--quiet`,
 * honoring the spec's "lossy conversions marked" contract without polluting
 * the converted output on stdout.
 *
 * Exported as `cli(argv)` so the dispatcher can invoke it in-process; never
 * throws to the caller and never calls `process.exit()` directly.
 *
 * @param argv - Args after the subcommand name (e.g. `['m.fsl', '--format=mermaid']`)
 * @returns 0 on success, 1 on user error, 2 on internal error
 *
 * @example
 *   const code = await cli(['traffic.fsl', '--format=json']);
 *   // code === 0, JSON written to stdout
 *
 *   const code2 = await cli(['--help']);
 *   // code2 === 0, usage printed to stdout
 */
export async function cli(argv: string[]): Promise<number> {
  let parsed: ReturnType<typeof parseFslArgs>;
  try {
    parsed = parseFslArgs(argv, SPEC);
  } catch (e) {
    printErr((e as Error).message);
    return 1;
  }

  if (parsed.flags.help) {
    writeStdout(parsed.helpText() + '\n');
    return 0;
  }
  if (parsed.flags.version) {
    writeStdout(`fsl-export ${getVersion()}\n`);
    return 0;
  }

  const format = parsed.flags.format as ExportFormat;
  const output = parsed.flags.output as string | undefined;
  const quiet  = parsed.flags.quiet === true;
  const inputs = parsed.positional;

  if (inputs.length > 1) {
    printErr('export accepts a single input (got ' + inputs.length + ')');
    return 1;
  }

  let fsl: string;
  const path = inputs[0];
  if (path === undefined || path === '-') {
    if (path === undefined && process.stdin.isTTY) {
      printErr('no input (provide a file or pipe FSL via stdin)');
      return 1;
    }
    fsl = await readStream(process.stdin);
  } else {
    try {
      fsl = await fs.readFile(path, 'utf8');
    } catch (e) {
      printErr(`cannot read ${path}: ${(e as Error).message}`);
      return 1;
    }
  }

  let result: ReturnType<typeof exportMachine>;
  try {
    result = exportMachine(fsl, { format });
  } catch (e) {
    if (e instanceof InterchangeError) {
      printErr(e.message);
      return 1;
    }
    printErr((e as Error).message ?? String(e));
    return 2;
  }

  if (!quiet) {
    for (const note of result.lossy) {
      writeStderr(`fsl-export: lossy: ${note}\n`);
    }
  }

  if (output !== undefined && output !== '-') {
    try {
      await fs.writeFile(output, result.output);
    } catch (e) {
      printErr(`cannot write ${output}: ${(e as Error).message}`);
      return 1;
    }
    return 0;
  }

  writeStdout(result.output);
  return 0;
}
