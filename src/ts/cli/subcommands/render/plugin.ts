import { promises as fs } from 'fs';
import { basename, dirname, extname, join } from 'path';
import { parseFslArgs } from '../../cli-utils.js';
import { loadConfig } from '../../config/loader.js';
import { render } from './render.js';
import type { RenderTarget, RenderOptions } from '../../types.js';
import { RenderError } from '../../types.js';

const getVersion = (): string => '__JSSM_VERSION__';

// Defaults for `target` and `quality` previously lived on `SPEC` flags. They
// have been moved to the config `defaults` layer so that an absent flag stays
// `undefined` in `parsed.flags` and `flagsToConfig` correctly treats it as
// "no override" — letting the config file's value win. SPEC defaults would
// otherwise stamp a value over the config layer every invocation.
const SPEC = {
  flags: {
    target:   { short: 't' as const, enum: ['svg','dot','png','jpeg','html'] as const },
    output:   { short: 'o' as const },
    'out-dir': {},
    stdout:   { boolean: true as const },
    width:    { type: 'number' as const },
    height:   { type: 'number' as const },
    scale:    { type: 'number' as const },
    quality:  { type: 'number' as const },
    config:   {},
    'no-config': { boolean: true as const },
    help:     { short: 'h' as const, boolean: true as const },
    version:  { short: 'V' as const, boolean: true as const },
  },
  usage: 'fsl-render [options] <fsl-paths...>',
};

/**
 * Maps each render-plugin flag to its dotted config path, or `null` to mark
 * the flag as per-invocation-only (never sourced from or written to the
 * config layer). The loader uses this to convert parsed flags into a
 * top-priority config override layer.
 */
const RENDER_FLAG_TO_CONFIG = {
  target:    'render.defaultTarget',
  output:    null,
  'out-dir': 'render.outDir',
  stdout:    null,
  width:     'render.width',
  height:    'render.height',
  scale:     'render.scale',
  quality:   'render.quality',
  config:    null,
  'no-config': null,
  help:      null,
  version:   null,
} as const;

const extOf = (target: RenderTarget): string => target;

const writeStdout = (s: string | Uint8Array): void => {
  if (typeof s === 'string') process.stdout.write(s);
  else process.stdout.write(Buffer.from(s));
};

const writeStderr = (s: string): void => { process.stderr.write(s); };

const printErr = (msg: string, path?: string, line?: number): void => {
  writeStderr(`fsl-render: error: ${msg}\n`);
  if (path) {
    const loc = line !== undefined ? `  at ${path} line ${line}` : `  at ${path}`;
    writeStderr(loc + '\n');
  }
};

/**
 * The `fsl-render` plugin entry point. Exported as `cli(argv)` so the
 * dispatcher can invoke it in-process; also called by the binary
 * (`fsl-render.ts`) which adds the shebang.
 *
 * Returns an exit code; never throws to the caller and never calls
 * `process.exit()` directly (per the plugin contract).
 *
 * @param argv - Args after the subcommand name (e.g. `['m.fsl', '--target=svg']`)
 * @returns 0 on success, 1 on user error, 2 on internal error
 *
 * @example
 *   const code = await cli(['traffic-light.fsl', '--stdout']);
 *   // code === 0, SVG written to stdout
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
    writeStdout(`fsl-render ${getVersion()}\n`);
    return 0;
  }

  let config: Awaited<ReturnType<typeof loadConfig>>;
  try {
    config = await loadConfig({
      cwd:                process.cwd(),
      machinePath:        parsed.positional[0],
      flags:              parsed.flags,
      flagMapping:        RENDER_FLAG_TO_CONFIG,
      explicitConfigPath: parsed.flags.config as string | undefined,
      skipConfig:         parsed.flags['no-config'] === true,
    });
  } catch (e) {
    printErr((e as Error).message);
    return 1;
  }

  const target  = config.render.defaultTarget as RenderTarget;
  const output  = parsed.flags.output as string | undefined;
  const outDir  = (parsed.flags['out-dir'] as string | undefined) ?? config.render.outDir;
  const stdout  = parsed.flags.stdout === true;
  const width   = config.render.width;
  const height  = config.render.height;
  const scale   = config.render.scale;
  const quality = config.render.quality;

  // Conflict rules
  const outputFlags = [output, outDir, stdout ? '--stdout' : undefined].filter(x => x !== undefined);
  if (outputFlags.length > 1) {
    printErr('--output, --out-dir, and --stdout are mutually exclusive');
    return 1;
  }

  const sizeFlags = [width, height, scale].filter(x => x !== undefined);
  if (sizeFlags.length > 1) {
    printErr('--width, --height, and --scale are mutually exclusive');
    return 1;
  }

  const renderOpts: RenderOptions = { target, width, height, scale, quality };

  const inputs = parsed.positional;
  if (inputs.length === 0) {
    if (process.stdin.isTTY) {
      printErr('no input (provide a file or pipe FSL via stdin)');
      return 1;
    }
    const fsl = await readStream(process.stdin);
    return await renderOne(fsl, '<stdin>', renderOpts, { stdout: true });
  }

  const explicitStdout = stdout || output === '-';

  if (inputs.length === 1) {
    const path = inputs[0];
    let fsl: string;
    try {
      fsl = path === '-' ? await readStream(process.stdin) : await fs.readFile(path, 'utf8');
    } catch (e) {
      printErr(`cannot read ${path}: ${(e as Error).message}`);
      return 1;
    }
    const inputLabel = path === '-' ? '<stdin>' : path;

    if (explicitStdout) {
      return renderOne(fsl, inputLabel, renderOpts, { stdout: true });
    }
    if (output) {
      return renderOne(fsl, inputLabel, renderOpts, { outputPath: output });
    }
    if (outDir) {
      const outPath = join(outDir, basename(path, extname(path)) + '.' + extOf(target));
      return renderOne(fsl, inputLabel, renderOpts, { outputPath: outPath });
    }
    if (path === '-') {
      return renderOne(fsl, inputLabel, renderOpts, { stdout: true });
    }
    const sibling = join(dirname(path), basename(path, extname(path)) + '.' + extOf(target));
    return renderOne(fsl, inputLabel, renderOpts, { outputPath: sibling });
  }

  // Multi-input. The earlier mutex check at the top of this function
  // already ensures `output`, `outDir`, and `stdout` are mutually
  // exclusive — so once we know `outDir` is set, the others can't be,
  // and we don't need redundant defensive checks here.
  if (!outDir) {
    printErr('specify --out-dir for multi-file render');
    return 1;
  }

  let worstCode = 0;
  for (const path of inputs) {
    let fsl: string;
    try {
      fsl = await fs.readFile(path, 'utf8');
    } catch (e) {
      printErr(`cannot read ${path}: ${(e as Error).message}`);
      worstCode = Math.max(worstCode, 1);
      continue;
    }
    const outPath = join(outDir, basename(path, extname(path)) + '.' + extOf(target));
    const code = await renderOne(fsl, path, renderOpts, { outputPath: outPath });
    worstCode = Math.max(worstCode, code);
  }
  return worstCode;
}

type OutputDestination = { stdout: true } | { outputPath: string };

async function renderOne(
  fsl: string,
  label: string,
  opts: RenderOptions,
  out: OutputDestination,
): Promise<number> {
  try {
    const r = await render(fsl, opts);
    if ('stdout' in out) {
      if (r.kind === 'text') writeStdout(r.content);
      else                   writeStdout(r.buffer);
      return 0;
    }
    // `out` narrows to { outputPath: string } here.
    const data: string | Uint8Array = r.kind === 'text' ? r.content : Buffer.from(r.buffer);
    await fs.writeFile(out.outputPath, data);
    return 0;
  } catch (e) {
    if (e instanceof RenderError) {
      printErr(e.message, label, e.line);
    } else {
      printErr(`${(e as Error).message ?? String(e)}`, label);
    }
    return 1;
  }
}

async function readStream(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}
