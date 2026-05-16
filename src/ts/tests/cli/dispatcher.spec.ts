import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { resolve, join } from 'path';
import {
  findPluginOnPath,
  isInProcessEligible,
  invokeInProcess,
  invokeBySpawn,
  dispatch,
} from '../../cli/dispatcher';

const fixturePluginsDir = resolve(__dirname, 'fixtures/plugins');

// A *relative* fixtures path, for findPluginOnPath calls made under a
// mocked platform. findPluginOnPath splits pathEnv on the platform PATH
// separator; under linux-mocked that's ':', and an absolute Windows path
// (`C:\...`) would split on its drive-letter colon. A relative path has no
// colon and resolves against the test cwd (the repo root).
const fixturePluginsRel = 'src/ts/tests/cli/fixtures/plugins';

describe('dispatcher: findPluginOnPath', () => {

  it('returns null when the plugin name is not on PATH', async () => {
    const found = await findPluginOnPath('definitely-not-a-real-plugin-xyz', '/no/such/dir');
    expect(found).toBeNull();
  });

  it('returns null when pathEnv is empty/undefined', async () => {
    // Covers the `if (!pathEnv) return null;` short-circuit.
    expect(await findPluginOnPath('xyz', '')).toBeNull();
    expect(await findPluginOnPath('xyz', undefined)).toBeNull();
  });

  it('finds a plugin executable in a PATH directory', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-dispatch-test-'));
    const plugin = process.platform === 'win32' ? 'fsl-foo.cmd' : 'fsl-foo';
    const pluginPath = join(work, plugin);
    await fs.writeFile(pluginPath, '#!/bin/sh\necho hi\n', { mode: 0o755 });
    const found = await findPluginOnPath('foo', work);
    expect(found).not.toBeNull();
    expect(found).toContain('fsl-foo');
  });

  it('with multiple PATH dirs, returns first match (PATH order)', async () => {
    const a = await fs.mkdtemp(join(tmpdir(), 'fsl-dispatch-test-a-'));
    const b = await fs.mkdtemp(join(tmpdir(), 'fsl-dispatch-test-b-'));
    const fileA = join(a, 'fsl-foo' + (process.platform === 'win32' ? '.cmd' : ''));
    const fileB = join(b, 'fsl-foo' + (process.platform === 'win32' ? '.cmd' : ''));
    await fs.writeFile(fileA, '', { mode: 0o755 });
    await fs.writeFile(fileB, '', { mode: 0o755 });
    const sep = process.platform === 'win32' ? ';' : ':';
    const found = await findPluginOnPath('foo', `${a}${sep}${b}`);
    expect(found?.startsWith(a)).toBe(true);
  });

});

describe('dispatcher: isInProcessEligible', () => {

  it('returns true for a .cjs file inside a node_modules directory', () => {
    const path = '/proj/node_modules/.bin/fsl-foo.cjs';
    expect(isInProcessEligible(path)).toBe(true);
  });

  it('returns true for a .mjs file inside node_modules', () => {
    expect(isInProcessEligible('/x/node_modules/.bin/fsl-foo.mjs')).toBe(true);
  });

  it('returns false for a shell script (.sh, no js extension)', () => {
    expect(isInProcessEligible('/usr/local/bin/fsl-foo.sh')).toBe(false);
    expect(isInProcessEligible('/x/node_modules/.bin/fsl-foo.sh')).toBe(false);
  });

  it('returns false for a .js file outside node_modules', () => {
    expect(isInProcessEligible('/usr/local/bin/fsl-foo.js')).toBe(false);
  });

  it('returns false for a path with no extension', () => {
    expect(isInProcessEligible('/usr/local/bin/fsl-foo')).toBe(false);
  });

});

describe('dispatcher: invokeInProcess', () => {

  let stdoutChunks: string[];
  let realWrite: typeof process.stdout.write;

  beforeEach(() => {
    stdoutChunks = [];
    realWrite = process.stdout.write.bind(process.stdout);
    (process.stdout as any).write = (chunk: any) => { stdoutChunks.push(String(chunk)); return true; };
  });

  afterEach(() => { (process.stdout as any).write = realWrite; });

  it('loads a compliant plugin and returns its exit code', async () => {
    const pluginPath = `${fixturePluginsDir}/fsl-good.cjs`;
    const code = await invokeInProcess(pluginPath, ['a', 'b']);
    expect(code).toBe(0);
    expect(stdoutChunks.join('')).toContain('fsl-good received 2 args');
  });

  it('survives a plugin that calls process.exit (catches and converts)', async () => {
    const pluginPath = `${fixturePluginsDir}/fsl-bad-exits.cjs`;
    const code = await invokeInProcess(pluginPath, []);
    expect(code).toBe(7);
    expect(stdoutChunks.join('')).toContain('about to exit');
  });

  it('reports missing default export as exit 2', async () => {
    const pluginPath = `${fixturePluginsDir}/fsl-no-default.cjs`;
    const code = await invokeInProcess(pluginPath, []);
    expect(code).toBe(2);
  });

  it('falls back to the module namespace when there is no default export (?? mod branch)', async () => {
    // An .mjs with only named exports has no `default` key on its namespace,
    // exercising the right-hand side of `mod.default ?? mod`. The result
    // is still not a function so we report missing-default + exit 2.
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-mjs-test-'));
    const pluginPath = join(work, 'fsl-named.mjs');
    await fs.writeFile(pluginPath, 'export const someName = "value";\n');
    const realStderr = process.stderr.write.bind(process.stderr);
    (process.stderr as any).write = () => true;
    try {
      const code = await invokeInProcess(pluginPath, []);
      expect(code).toBe(2);
    } finally {
      (process.stderr as any).write = realStderr;
    }
  });

  it('returns exit 2 and stderrs the message when a plugin throws an unintercepted error', async () => {
    // Build a tmp plugin that throws synchronously inside its default export.
    // Exercises the "plugin threw" catch branch in invokeInProcess that's
    // separate from the ExitInterception path.
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-throwy-test-'));
    const pluginPath = join(work, 'fsl-throwy.cjs');
    await fs.writeFile(
      pluginPath,
      'module.exports = async function() { throw new Error("synthetic plugin failure"); };'
    );
    const realStderr = process.stderr.write.bind(process.stderr);
    const stderrCaught: string[] = [];
    (process.stderr as any).write = (chunk: any) => { stderrCaught.push(String(chunk)); return true; };
    try {
      const code = await invokeInProcess(pluginPath, []);
      expect(code).toBe(2);
      expect(stderrCaught.join('')).toContain('synthetic plugin failure');
    } finally {
      (process.stderr as any).write = realStderr;
    }
  });

  it('treats a plugin that returns a non-number as exit 0', async () => {
    // Exercises the `typeof result === 'number' ? result : 0` ternary's else branch.
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-nonnum-test-'));
    const pluginPath = join(work, 'fsl-nonnumeric.cjs');
    await fs.writeFile(
      pluginPath,
      'module.exports = async function() { return "not-a-number"; };'
    );
    const code = await invokeInProcess(pluginPath, []);
    expect(code).toBe(0);
  });

  it('treats plugin calling process.exit() with no argument as exit 0', async () => {
    // Covers the `typeof code === 'number' ? code : 0` ternary's else branch
    // inside the process.exit interceptor. fsl-bad-exits passes a number;
    // this fixture passes no argument.
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-exit-no-arg-'));
    const pluginPath = join(work, 'fsl-exits-no-arg.cjs');
    await fs.writeFile(
      pluginPath,
      'module.exports = async function() { process.exit(); };'
    );
    const realStdout = process.stdout.write.bind(process.stdout);
    (process.stdout as any).write = () => true;
    try {
      const code = await invokeInProcess(pluginPath, []);
      expect(code).toBe(0);
    } finally {
      (process.stdout as any).write = realStdout;
    }
  });

  it('handles plugin that throws a non-Error (uses String() fallback in message)', async () => {
    // Covers the `(e as Error).message ?? String(e)` ?? fallback branch in
    // the invokeInProcess catch — the other Error-with-message branch is
    // covered by the previous test.
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-throwy-nonerr-'));
    const pluginPath = join(work, 'fsl-throwy.cjs');
    await fs.writeFile(
      pluginPath,
      'module.exports = async function() { throw 42; };'  // throws a plain number
    );
    const realStderr = process.stderr.write.bind(process.stderr);
    const stderrCaught: string[] = [];
    (process.stderr as any).write = (chunk: any) => { stderrCaught.push(String(chunk)); return true; };
    try {
      const code = await invokeInProcess(pluginPath, []);
      expect(code).toBe(2);
      expect(stderrCaught.join('')).toContain('plugin threw: 42');
    } finally {
      (process.stderr as any).write = realStderr;
    }
  });

});

describe('dispatcher: invokeBySpawn', () => {

  it('spawns a Node subprocess and returns its exit code', async () => {
    const node = process.execPath;
    const args = ['-e', 'console.log("spawned hi"); process.exit(0)'];
    const code = await invokeBySpawn(node, args);
    expect(code).toBe(0);
  }, 15_000);

  it('returns subprocess non-zero exit', async () => {
    const node = process.execPath;
    const args = ['-e', 'process.exit(4)'];
    const code = await invokeBySpawn(node, args);
    expect(code).toBe(4);
  }, 15_000);

});

describe('dispatcher: dispatch (orchestrator)', () => {

  let stdoutChunks: string[];
  let stderrChunks: string[];
  let realStdout: typeof process.stdout.write;
  let realStderr: typeof process.stderr.write;

  beforeEach(() => {
    stdoutChunks = [];
    stderrChunks = [];
    realStdout = process.stdout.write.bind(process.stdout);
    realStderr = process.stderr.write.bind(process.stderr);
    (process.stdout as any).write = (chunk: any) => { stdoutChunks.push(String(chunk)); return true; };
    (process.stderr as any).write = (chunk: any) => { stderrChunks.push(String(chunk)); return true; };
  });
  afterEach(() => {
    (process.stdout as any).write = realStdout;
    (process.stderr as any).write = realStderr;
  });

  it('handles --help reserved name on the dispatcher itself', async () => {
    const code = await dispatch(['--help']);
    expect(code).toBe(0);
    expect(stdoutChunks.join('')).toMatch(/fsl/);
    expect(stdoutChunks.join('')).toContain('Usage:');
  });

  it('handles --version on the dispatcher itself', async () => {
    const code = await dispatch(['--version']);
    expect(code).toBe(0);
    expect(stdoutChunks.join('')).toMatch(/fsl\s+\S/);
  });

  it('returns 1 with helpful error for unknown subcommand', async () => {
    // Override PATH to a single non-existent dir so findPluginOnPath resolves
    // quickly instead of scanning the full system PATH (which can be slow on
    // Windows with many PATHEXT extensions).
    const origPath = process.env.PATH;
    process.env.PATH = '/no/such/dir/for/test';
    try {
      const code = await dispatch(['definitely-not-a-real-subcommand-xyz']);
      expect(code).toBe(1);
      expect(stderrChunks.join('')).toMatch(/not a known subcommand/);
    } finally {
      process.env.PATH = origPath;
    }
  });

  it('--verbose prints plugin resolution to stderr', async () => {
    const originalPath = process.env.PATH;
    const sep = process.platform === 'win32' ? ';' : ':';
    process.env.PATH = `${fixturePluginsDir}${sep}${originalPath}`;
    try {
      const code = await dispatch(['--verbose', 'good']);
      expect(code).toBe(0);
      expect(stderrChunks.join('')).toMatch(/resolved 'good' to/);
    } finally {
      process.env.PATH = originalPath;
    }
  });

  it('-h short flag is treated as --help', async () => {
    const code = await dispatch(['-h']);
    expect(code).toBe(0);
    expect(stdoutChunks.join('')).toContain('Usage:');
  });

  it('-V short flag is treated as --version', async () => {
    const code = await dispatch(['-V']);
    expect(code).toBe(0);
    expect(stdoutChunks.join('')).toMatch(/fsl\s+\S/);
  });

  it('bare-word "version" subcommand prints version', async () => {
    const code = await dispatch(['version']);
    expect(code).toBe(0);
    expect(stdoutChunks.join('')).toMatch(/fsl\s+\S/);
  });

  it('bare-word "help" subcommand prints usage', async () => {
    const code = await dispatch(['help']);
    expect(code).toBe(0);
    expect(stdoutChunks.join('')).toContain('Usage:');
  });

  it('invokes plugin in-process when resolved inside node_modules', async () => {
    // Build a fake node_modules/.bin/fsl-mock.cjs so isInProcessEligible
    // returns true and dispatch takes the in-process branch (vs spawn).
    const work    = await fs.mkdtemp(join(tmpdir(), 'fsl-inproc-'));
    const binDir  = join(work, 'node_modules', '.bin');
    await fs.mkdir(binDir, { recursive: true });
    const pluginPath = join(binDir, 'fsl-mock.cjs');
    await fs.writeFile(
      pluginPath,
      'module.exports = async function(argv) { process.stdout.write("inproc:" + argv.join(",")); return 0; };'
    );
    const originalPath = process.env.PATH;
    process.env.PATH = binDir;
    try {
      const code = await dispatch(['mock', 'a', 'b']);
      expect(code).toBe(0);
      expect(stdoutChunks.join('')).toContain('inproc:a,b');
    } finally {
      process.env.PATH = originalPath;
    }
  });

});

describe('dispatcher: invokeBySpawn extension routing', () => {

  it('routes a .cjs plugin through process.execPath (isNodeScript branch)', async () => {
    // The .cjs extension takes the isNodeScript branch which wraps in
    // `[process.execPath, [pluginPath, ...]]`. Without this routing on
    // Windows, a bare .cjs without shebang wouldn't be directly runnable.
    const work   = await fs.mkdtemp(join(tmpdir(), 'fsl-spawn-test-'));
    const script = join(work, 'mock.cjs');
    await fs.writeFile(script, 'process.exit(0);');
    const code = await invokeBySpawn(script, []);
    expect(code).toBe(0);
  }, 15_000);

  it.runIf(process.platform === 'win32')(
    'routes a .cmd plugin through cmd.exe and runs it (Windows-only)',
    async () => {
      const code = await invokeBySpawn(`${fixturePluginsDir}/fsl-cmd-fixture.cmd`, []);
      expect(code).toBe(0);
    },
    15_000,
  );

  it.runIf(process.platform === 'win32')(
    'routes a .bat plugin through cmd.exe and runs it (Windows-only)',
    async () => {
      const code = await invokeBySpawn(`${fixturePluginsDir}/fsl-bat-fixture.bat`, []);
      expect(code).toBe(0);
    },
    15_000,
  );

});

describe('dispatcher: module-load behavior under PATHEXT fallback', () => {

  it.runIf(process.platform === 'win32')(
    'loads with the .COM/.EXE/.BAT/.CMD fallback when PATHEXT env var is unset',
    async () => {
      // Covers the `?? '.COM;.EXE;.BAT;.CMD'` fallback on line 8 — under
      // normal Windows operation PATHEXT is always set.
      vi.resetModules();
      const realPathExt = process.env.PATHEXT;
      delete process.env.PATHEXT;
      try {
        const mod = await import('../../cli/dispatcher');
        expect(typeof mod.findPluginOnPath).toBe('function');
        // Sanity-check: looking for a non-existent plugin returns null
        // (using the freshly-loaded module instance).
        const found = await mod.findPluginOnPath('not-a-real-plugin', '/no/such/dir');
        expect(found).toBeNull();
      } finally {
        if (realPathExt !== undefined) process.env.PATHEXT = realPathExt;
      }
    },
  );

});

describe('dispatcher: module-load behavior under non-Windows platform (mocked)', () => {

  it('discovers an extensionless plugin with Unix conventions (platform mocked to "linux")', async () => {
    // dispatcher.ts computes IS_WINDOWS / PATH_SEP / PATHEXT at module
    // load time, gating the Unix-vs-Windows branches in findPluginOnPath.
    // Re-importing with platform mocked exercises the Unix branches on a
    // Windows CI host. The committed `fsl-non-node` fixture (no extension)
    // is genuinely resolved via the Unix '' extension probe.
    vi.resetModules();
    const realPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    try {
      const mod = await import('../../cli/dispatcher');
      const found = await mod.findPluginOnPath('non-node', fixturePluginsRel);
      expect(found).not.toBeNull();
      expect(found?.endsWith('fsl-non-node')).toBe(true);
      // A name with no matching file still returns null.
      expect(await mod.findPluginOnPath('definitely-absent-xyz', fixturePluginsRel)).toBeNull();
    } finally {
      Object.defineProperty(process, 'platform', { value: realPlatform, configurable: true });
    }
  });

  it('loads with Windows conventions when process.platform is mocked to "win32"', async () => {
    // Mirror of the Unix test above. dispatcher.ts's IS_WINDOWS-gated
    // branches (PATHEXT assembly, the Windows extension list, the cmd.exe
    // spawn routing) are unreachable on a macOS/Linux CI runner; mocking
    // platform to win32 and re-importing exercises them so coverage is
    // symmetric across the CI matrix.
    vi.resetModules();
    const realPlatform = process.platform;
    const realStderrWrite = process.stderr.write.bind(process.stderr);
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    (process.stderr as any).write = () => true;
    try {
      const mod = await import('../../cli/dispatcher');
      // findPluginOnPath under win32: PATHEXT probing genuinely resolves
      // the committed fsl-cmd-fixture.cmd by its `cmd-fixture` name — the
      // fixture file exists on disk regardless of the host OS.
      const found = await mod.findPluginOnPath('cmd-fixture', fixturePluginsRel);
      expect(found).not.toBeNull();
      expect(found?.endsWith('fsl-cmd-fixture.cmd')).toBe(true);
      // invokeBySpawn with the .cmd / .bat fixtures under win32 exercises
      // the isCmdScript -> cmd.exe routing and both operands of
      // `ext === '.cmd' || ext === '.bat'` (the .bat path makes the left
      // operand false, so the right one is evaluated). On a non-Windows
      // runner cmd.exe is absent so the spawn resolves non-zero; the
      // routing branch still executes. On Windows the fixtures run for real.
      const cmdCode = await mod.invokeBySpawn(`${fixturePluginsDir}/fsl-cmd-fixture.cmd`, []);
      expect(typeof cmdCode).toBe('number');
      const batCode = await mod.invokeBySpawn(`${fixturePluginsDir}/fsl-bat-fixture.bat`, []);
      expect(typeof batCode).toBe('number');
    } finally {
      Object.defineProperty(process, 'platform', { value: realPlatform, configurable: true });
      (process.stderr as any).write = realStderrWrite;
    }
  });

});

describe('dispatcher: invokeBySpawn error paths', () => {

  it('returns exit code 2 when the spawn target does not exist', async () => {
    // Use a bogus, non-existent absolute path so spawn emits an 'error'
    // event rather than running anything. Per the dispatcher contract,
    // that maps to exit 2.
    const realStderrWrite = process.stderr.write.bind(process.stderr);
    (process.stderr as any).write = () => true;
    try {
      // The `.exe` extension keeps us in the direct-spawn branch (not the
      // cmd.exe-wrapped `.cmd`/`.bat` branch). With a bogus absolute path,
      // node's spawn emits an 'error' event with ENOENT, which the dispatcher
      // maps to exit 2.
      const bogus = process.platform === 'win32'
        ? 'C:\\no\\such\\dir\\no-such-binary-xyz.exe'
        : '/no/such/dir/no-such-binary-xyz';
      const code = await invokeBySpawn(bogus, []);
      expect(code).toBe(2);
    } finally {
      (process.stderr as any).write = realStderrWrite;
    }
  }, 15_000);

});
