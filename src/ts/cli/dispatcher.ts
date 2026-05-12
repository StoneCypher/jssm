import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { spawn } from 'child_process';

const IS_WINDOWS = process.platform === 'win32';
const PATH_SEP   = IS_WINDOWS ? ';' : ':';
const PATHEXT    = IS_WINDOWS
  ? (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').map(s => s.toLowerCase())
  : [''];

/**
 * Look for a plugin binary on PATH.
 *
 * Searches each PATH directory in order. On Windows, also probes
 * `name.cmd`, `name.bat`, etc., per `PATHEXT`. Returns the first match.
 *
 * @param subcommand - The subcommand name (e.g., 'render'). The probed
 *   binary name is `fsl-<subcommand>`.
 * @param pathEnv - The PATH string to search (default `process.env.PATH`)
 * @returns Absolute path to the binary, or null if not found.
 *
 * @example
 * ```ts
 * const found = await findPluginOnPath('render', '/usr/local/bin:/usr/bin');
 * // found === '/usr/local/bin/fsl-render'  (if it exists)
 * // found === null                          (if not found)
 * ```
 */
export async function findPluginOnPath(
  subcommand: string,
  pathEnv: string | undefined = process.env.PATH,
): Promise<string | null> {
  if (!pathEnv) return null;
  const dirs = pathEnv.split(PATH_SEP).filter(d => d.length > 0);
  const baseName = `fsl-${subcommand}`;
  const exts = IS_WINDOWS ? PATHEXT : [''];

  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = join(dir, baseName + ext);
      try {
        const st = await fs.stat(candidate);
        if (st.isFile()) return candidate;
      } catch {
        // not found in this location, keep looking
      }
    }
  }
  return null;
}

/**
 * Decide whether a resolved plugin path is safe to load in-process via
 * dynamic `import()` rather than spawning as a subprocess.
 *
 * Heuristic for v1:
 *   - File extension is .js, .mjs, or .cjs
 *   - File path is inside a `node_modules` directory
 *
 * Anything else (shell scripts, non-JS files, files outside node_modules)
 * falls back to spawn.
 *
 * @param resolvedPath - Absolute path to the plugin binary
 * @returns true if in-process load is appropriate, false to use spawn
 *
 * @example
 * ```ts
 * isInProcessEligible('/proj/node_modules/.bin/fsl-render.cjs');
 * // true
 *
 * isInProcessEligible('/usr/local/bin/fsl-render');
 * // false  (no JS extension, outside node_modules)
 * ```
 */
export function isInProcessEligible(resolvedPath: string): boolean {
  const ext = extname(resolvedPath).toLowerCase();
  if (ext !== '.js' && ext !== '.mjs' && ext !== '.cjs') return false;
  const norm = resolvedPath.replace(/\\/g, '/');
  return norm.includes('/node_modules/');
}

/**
 * Invoke a plugin in-process via dynamic import.
 *
 * Safety wrappers:
 *   - Intercepts `process.exit()` calls by replacing the function temporarily;
 *     the intercepted exit code becomes the return value.
 *   - Restores `process.argv` after the call.
 *   - Catches thrown errors and converts to exit code 2.
 *
 * @param pluginPath - Absolute path to the plugin module
 * @param argv - Args to forward (already stripped of dispatcher prefix)
 * @returns Plugin's exit code (0 = success, 1 = user error, 2 = internal)
 *
 * @example
 * ```ts
 * const code = await invokeInProcess('/proj/node_modules/fsl-render/cli.cjs', ['--format', 'svg']);
 * // code === 0  (on success)
 * ```
 */
export async function invokeInProcess(pluginPath: string, argv: string[]): Promise<number> {
  const originalExit = process.exit;
  const originalArgv = process.argv;

  let interceptedExit: number | null = null;

  const ExitInterception = Symbol('ExitInterception');
  (process as any).exit = (code?: number) => {
    interceptedExit = typeof code === 'number' ? code : 0;
    throw ExitInterception;
  };
  process.argv = [originalArgv[0], pluginPath, ...argv];

  try {
    const mod = await import(pluginPath);
    const cli = (mod && (mod.default ?? mod)) as ((argv: string[]) => Promise<number>) | undefined;
    if (typeof cli !== 'function') {
      process.stderr.write(`fsl: error: plugin ${pluginPath} is missing default cli() export\n`);
      return 2;
    }
    const result = await cli(argv);
    return typeof result === 'number' ? result : 0;
  } catch (e) {
    if (e === ExitInterception && interceptedExit !== null) {
      return interceptedExit;
    }
    process.stderr.write(`fsl: error: plugin threw: ${(e as Error).message ?? String(e)}\n`);
    return 2;
  } finally {
    process.exit = originalExit;
    process.argv = originalArgv;
  }
}

/**
 * Invoke a plugin as a subprocess.
 *
 * Forwards stdin / stdout / stderr to the child. Passes through env.
 *
 * @param pluginPath - Absolute path to the binary (or interpreter path
 *   if you want to specify, e.g., `node` for explicit Node spawn)
 * @param argv - Args to forward
 * @returns Subprocess exit code
 *
 * @example
 * ```ts
 * const code = await invokeBySpawn('/usr/local/bin/fsl-render', ['--format', 'png']);
 * // code === 0  (on success)
 * ```
 */
export async function invokeBySpawn(pluginPath: string, argv: string[]): Promise<number> {
  return new Promise<number>((res) => {
    const ext = extname(pluginPath).toLowerCase();
    const isCmdScript = IS_WINDOWS && (ext === '.cmd' || ext === '.bat');
    const [spawnCmd, spawnArgs] = isCmdScript
      ? ['cmd.exe', ['/c', pluginPath, ...argv]]
      : [pluginPath, argv];
    const child = spawn(spawnCmd, spawnArgs, { stdio: ['inherit', 'pipe', 'pipe'] });
    child.stdout?.on('data', (chunk: Buffer) => { process.stdout.write(chunk); });
    child.stderr?.on('data', (chunk: Buffer) => { process.stderr.write(chunk); });
    child.on('exit', (code, signal) => {
      if (signal) res(128 + (process.platform === 'win32' ? 1 : 0));
      else res(typeof code === 'number' ? code : 2);
    });
    child.on('error', (err) => {
      process.stderr.write(`fsl: error: failed to spawn plugin: ${err.message}\n`);
      res(2);
    });
  });
}

const RESERVED_FLAGS = new Set(['--help', '-h', '--version', '-V']);
const RESERVED_NAMES = new Set(['help', 'version']);

const getDispatcherVersion = (): string => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../../../package.json');
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
};

const printDispatcherHelp = (): void => {
  process.stdout.write(`fsl — finite-state language toolchain dispatcher

Usage:
  fsl <subcommand> [options] [args...]
  fsl [--help|--version]

Built-in subcommands (resolved via PATH):
  render    Render FSL machines to SVG, DOT, PNG, JPEG, or HTML

Discovery:
  Any \`fsl-<name>\` executable on PATH is dispatched when you run
  \`fsl <name>\`. Third-party plugins follow the same contract as
  first-party ones.

  See: notes/superpowers/specs/2026-05-12-fsl-cli-design.md
`);
};

/**
 * Top-level dispatcher entry point.
 *
 * - Handles reserved flags (--help, --version) on the dispatcher itself.
 * - Resolves the first positional as a subcommand and forwards the rest.
 * - In-processes Node-resolvable plugins, spawns the rest.
 *
 * @param argv - The args passed to `fsl` (already stripped of node binary
 *   and the dispatcher's own script path).
 * @returns Exit code.
 *
 * @example
 * ```ts
 * const code = await dispatch(['--help']);
 * // code === 0, and help text written to stdout
 *
 * const code2 = await dispatch(['unknown-cmd']);
 * // code2 === 1, error written to stderr
 * ```
 */
export async function dispatch(argv: string[]): Promise<number> {
  if (argv.length === 0 || RESERVED_FLAGS.has(argv[0])) {
    if (argv[0] === '--version' || argv[0] === '-V') {
      process.stdout.write(`fsl ${getDispatcherVersion()}\n`);
      return 0;
    }
    printDispatcherHelp();
    return 0;
  }

  const subcommand = argv[0];
  const rest = argv.slice(1);

  if (RESERVED_NAMES.has(subcommand)) {
    if (subcommand === 'version') {
      process.stdout.write(`fsl ${getDispatcherVersion()}\n`);
      return 0;
    }
    printDispatcherHelp();
    return 0;
  }

  const pluginPath = await findPluginOnPath(subcommand);
  if (!pluginPath) {
    process.stderr.write(`fsl: '${subcommand}' is not a known subcommand and no \`fsl-${subcommand}\` was found on PATH\n`);
    return 1;
  }

  if (isInProcessEligible(pluginPath)) {
    return invokeInProcess(pluginPath, rest);
  }
  return invokeBySpawn(pluginPath, rest);
}
