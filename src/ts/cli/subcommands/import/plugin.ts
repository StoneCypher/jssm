import { promises as fs } from 'node:fs';
import { parseFslArgs } from '../../cli-utils';
import { importMachine } from './import';
import type { ImportFormat } from '../interchange/types';
import { InterchangeError } from '../interchange/types';

const getVersion = (): string => '__JSSM_VERSION__';

const SPEC = {
  flags: {
    format:  { short: 'f' as const, enum: [
      'json', 'mermaid', 'scxml', 'xstate', 'dot',
    ] as const, default: 'json' as const },
    output:  { short: 'o' as const },
    quiet:   { short: 'q' as const, boolean: true as const },
    help:    { short: 'h' as const, boolean: true as const },
    version: { short: 'V' as const, boolean: true as const },
  },
  usage: 'fsl-import [options] <source-path | ->',
};

const writeStdout = (s: string): void => { process.stdout.write(s); };
const writeStderr = (s: string): void => { process.stderr.write(s); };

const printErr = (msg: string): void => { writeStderr(`fsl-import: error: ${msg}\n`); };

/**
 * Read an entire readable stream to a UTF-8 string. Used for `-`/stdin input.
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
 * The `fsl-import` plugin entry point (megaspec §25's `import` verb).
 *
 * Reads one interchange-format document (from a path, or stdin via `-`/pipe),
 * converts it to FSL, and writes the FSL to stdout or `--output`. Lossy-import
 * notes ("lossy conversions marked") are printed to stderr unless `--quiet`.
 *
 * Exported as `cli(argv)` so the dispatcher can invoke it in-process; never
 * throws to the caller and never calls `process.exit()` directly.
 * @param argv - Args after the subcommand name (e.g. `['m.mmd', '--format=mermaid']`)
 * @returns 0 on success, 1 on user error, 2 on internal error
 * @example
 *   const code = await cli(['machine.json', '--format=json']);
 *   // code === 0, FSL written to stdout
 *
 *   const code2 = await cli(['--help']);
 *   // code2 === 0, usage printed to stdout
 */
export async function cli(argv: string[]): Promise<number> {
  let parsed: ReturnType<typeof parseFslArgs>;
  try {
    parsed = parseFslArgs(argv, SPEC);
  } catch (error) {
    printErr((error as Error).message);
    return 1;
  }

  if (parsed.flags.help) {
    writeStdout(parsed.helpText() + '\n');
    return 0;
  }
  if (parsed.flags.version) {
    writeStdout(`fsl-import ${getVersion()}\n`);
    return 0;
  }

  const format = parsed.flags.format as ImportFormat;
  const output = parsed.flags.output as string | undefined;
  const quiet  = parsed.flags.quiet === true;
  const inputs = parsed.positional;

  if (inputs.length > 1) {
    printErr('import accepts a single input (got ' + inputs.length + ')');
    return 1;
  }

  let source: string;
  const path = inputs[0];
  if (path === undefined || path === '-') {
    if (path === undefined && process.stdin.isTTY) {
      printErr('no input (provide a file or pipe a document via stdin)');
      return 1;
    }
    source = await readStream(process.stdin);
  } else {
    try {
      source = await fs.readFile(path, 'utf8');
    } catch (error) {
      printErr(`cannot read ${path}: ${(error as Error).message}`);
      return 1;
    }
  }

  let result: ReturnType<typeof importMachine>;
  try {
    result = importMachine(source, { format });
  } catch (error) {
    if (error instanceof InterchangeError) {
      printErr(error.message);
      return 1;
    }
    printErr((error as Error).message ?? String(error));
    return 2;
  }

  if (!quiet) {
    for (const note of result.lossy) {
      writeStderr(`fsl-import: lossy: ${note}\n`);
    }
  }

  if (output !== undefined && output !== '-') {
    try {
      await fs.writeFile(output, result.output);
    } catch (error) {
      printErr(`cannot write ${output}: ${(error as Error).message}`);
      return 1;
    }
    return 0;
  }

  writeStdout(result.output);
  return 0;
}
