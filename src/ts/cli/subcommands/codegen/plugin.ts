import { promises as fs } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { parseFslArgs } from '../../cli-utils';
import { loadConfig } from '../../config/loader';
import { codegen } from './codegen';
import type { CodegenTarget, CodegenOptions, CodegenArtifact } from '../../codegen-types';
import { CodegenError, CodegenUndecidedError } from '../../codegen-types';

const getVersion = (): string => '__JSSM_VERSION__';

const TARGETS = ['native:typescript', 'native:javascript'] as const;

const SPEC = {
  flags: {
    target:     { short: 't' as const, enum: TARGETS },
    name:       { short: 'n' as const },
    output:     { short: 'o' as const },
    'out-dir':  {},
    stdout:     { boolean: true as const },
    json:       { boolean: true as const },
    certify:    { boolean: true as const },
    budget:     { type: 'number' as const },
    config:     {},
    'no-config': { boolean: true as const },
    help:       { short: 'h' as const, boolean: true as const },
    version:    { short: 'V' as const, boolean: true as const },
  },
  usage: 'fsl-codegen [options] <fsl-paths...>',
};

/**
 * Maps each codegen-plugin flag to its dotted config path, or `null` to mark
 * the flag as per-invocation-only. `target` and `out-dir` are config-backed
 * (`codegen.defaultTarget` / `codegen.outDir`) so a config file or machine
 * attribute can supply them; the rest are per-invocation-only.
 */
const CODEGEN_FLAG_TO_CONFIG = {
  target:      'codegen.defaultTarget',
  name:        null,
  output:      null,
  'out-dir':   'codegen.outDir',
  stdout:      null,
  json:        null,
  certify:     null,
  budget:      null,
  config:      null,
  'no-config': null,
  help:        null,
  version:     null,
} as const;

/**
 * Hard fallback target when neither `--target` nor any config layer supplies
 * one.
 */
const DEFAULT_TARGET: CodegenTarget = 'native:typescript';

const writeStdout = (s: string): void => { process.stdout.write(s); };
const writeStderr = (s: string): void => { process.stderr.write(s); };

const printErr = (msg: string, path?: string, line?: number): void => {
  writeStderr(`fsl-codegen: error: ${msg}\n`);
  if (path) {
    const loc = line === undefined ? `  at ${path}` : `  at ${path} line ${line}`;
    writeStderr(loc + '\n');
  }
};

/** Build the `--json` error envelope an agent caller consumes. */
function jsonError(label: string, e: Error): string {
  const undecided = e instanceof CodegenUndecidedError;
  const body = {
    ok: false,
    status: undecided ? 'undecided' : 'error',
    source: label,
    message: e.message,
    ...(e instanceof CodegenError && e.line !== undefined && { line: e.line }),
  };
  return JSON.stringify(body) + '\n';
}

/** Build the `--json` success envelope for a generated artifact. */
function jsonOk(label: string, artifact: CodegenArtifact, outputPath?: string): string {
  const body = {
    ok: true,
    status: 'generated',
    source: label,
    target: artifact.target,
    host: artifact.host,
    extension: artifact.extension,
    symbol: artifact.symbol,
    ...(outputPath && { outputPath }),
    content: artifact.content,
  };
  return JSON.stringify(body) + '\n';
}

/**
 * The `fsl-codegen` plugin entry point. Emits executable host source for one
 * or more FSL documents (megaspec §25). Exported as `cli(argv)` so the
 * dispatcher can run it in-process.
 *
 * Returns an exit code; never throws to the caller and never calls
 * `process.exit()` directly (the plugin contract). Honors the agent verb
 * contract: `--json` structured output, meaningful exit codes, no TTY
 * assumptions.
 * @param argv - Args after the subcommand name (e.g. `['m.fsl', '--target=native:javascript']`)
 * @returns 0 on success, 1 on user error, 2 on an unexpected internal error
 * @example
 *   const code = await cli(['traffic-light.fsl', '--stdout']);
 *   // code === 0, TypeScript source written to stdout
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
    writeStdout(`fsl-codegen ${getVersion()}\n`);
    return 0;
  }

  let config: Awaited<ReturnType<typeof loadConfig>>;
  try {
    config = await loadConfig({
      cwd:                process.cwd(),
      machinePath:        parsed.positional[0],
      flags:              parsed.flags,
      flagMapping:        CODEGEN_FLAG_TO_CONFIG,
      explicitConfigPath: parsed.flags.config as string | undefined,
      skipConfig:         parsed.flags['no-config'] === true,
    });
  } catch (error) {
    printErr((error as Error).message);
    return 1;
  }

  const codegenCfg = config.codegen;
  const target  = (codegenCfg.defaultTarget ?? DEFAULT_TARGET) as CodegenTarget;
  const name    = parsed.flags.name as string | undefined;
  const output  = parsed.flags.output as string | undefined;
  const outDir  = (parsed.flags['out-dir'] as string | undefined) ?? codegenCfg.outDir;
  const stdout  = parsed.flags.stdout === true;
  const json    = parsed.flags.json === true;
  const certify = parsed.flags.certify === true;
  const budget  = parsed.flags.budget as number | undefined;

  const outputFlags = [output, outDir, stdout ? '--stdout' : undefined].filter(x => x !== undefined);
  if (outputFlags.length > 1) {
    printErr('--output, --out-dir, and --stdout are mutually exclusive');
    return 1;
  }

  const opts: CodegenOptions = { target, name, certify, budgetMs: budget };

  const inputs = parsed.positional;

  if (inputs.length === 0) {
    if (process.stdin.isTTY) {
      printErr('no input (provide a file or pipe FSL via stdin)');
      return 1;
    }
    const fsl = await readStream(process.stdin);
    return generateOne(fsl, '<stdin>', opts, { stdout: true }, { json, defaultName: name });
  }

  const explicitStdout = stdout || output === '-';

  if (inputs.length === 1) {
    const path = inputs[0];
    let fsl: string;
    try {
      fsl = path === '-' ? await readStream(process.stdin) : await fs.readFile(path, 'utf8');
    } catch (error) {
      printErr(`cannot read ${path}: ${(error as Error).message}`);
      return 1;
    }
    const label = path === '-' ? '<stdin>' : path;
    const perFileName = name ?? (path === '-' ? undefined : basename(path, extname(path)));
    const perFileOpts: CodegenOptions = { ...opts, name: perFileName };

    if (explicitStdout) {
      return generateOne(fsl, label, perFileOpts, { stdout: true }, { json });
    }
    if (output) {
      return generateOne(fsl, label, perFileOpts, { outputPath: output }, { json });
    }
    if (outDir) {
      const outPath = join(outDir, basename(path, extname(path)) + '.' + extOf(target));
      return generateOne(fsl, label, perFileOpts, { outputPath: outPath }, { json });
    }
    if (path === '-') {
      return generateOne(fsl, label, perFileOpts, { stdout: true }, { json });
    }
    const sibling = join(dirname(path), basename(path, extname(path)) + '.' + extOf(target));
    return generateOne(fsl, label, perFileOpts, { outputPath: sibling }, { json });
  }

  // Multi-input: requires --out-dir (the mutex check above guarantees the
  // others are unset once out-dir is present).
  if (!outDir) {
    printErr('specify --out-dir for multi-file codegen');
    return 1;
  }

  let worstCode = 0;
  for (const path of inputs) {
    let fsl: string;
    try {
      fsl = await fs.readFile(path, 'utf8');
    } catch (error) {
      printErr(`cannot read ${path}: ${(error as Error).message}`);
      worstCode = Math.max(worstCode, 1);
      continue;
    }
    const perFileName = name ?? basename(path, extname(path));
    const outPath = join(outDir, basename(path, extname(path)) + '.' + extOf(target));
    const code = await generateOne(fsl, path, { ...opts, name: perFileName }, { outputPath: outPath }, { json });
    worstCode = Math.max(worstCode, code);
  }
  return worstCode;
}

/** Conventional extension for a target, used to name sibling/out-dir files. */
const extOf = (target: CodegenTarget): string =>
  target === 'native:javascript' ? 'js' : 'ts';

type OutputDestination = { stdout: true } | { outputPath: string };

async function generateOne(
  fsl: string,
  label: string,
  opts: CodegenOptions,
  out: OutputDestination,
  emit: { json: boolean; defaultName?: string },
): Promise<number> {
  let artifact: CodegenArtifact;
  try {
    artifact = codegen(fsl, opts);
  } catch (error) {
    const err = error as Error;
    if (emit.json) {
      writeStdout(jsonError(label, err));
    } else if (err instanceof CodegenError) {
      printErr(err.message, label, err.line);
    } else {
      printErr(err.message ?? String(err), label);
    }
    // An undecided result (gated certify / budget) is still a user-facing
    // refusal, not an internal crash: exit 1, distinguished only by status.
    return 1;
  }

  if ('stdout' in out) {
    writeStdout(emit.json ? jsonOk(label, artifact) : artifact.content);
    return 0;
  }
  try {
    await fs.writeFile(out.outputPath, artifact.content);
  } catch (error) {
    const err = error as Error;
    if (emit.json) writeStdout(jsonError(label, err));
    else           printErr(`cannot write ${out.outputPath}: ${err.message}`, label);
    return 1;
  }
  if (emit.json) writeStdout(jsonOk(label, artifact, out.outputPath));
  return 0;
}

async function readStream(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}
