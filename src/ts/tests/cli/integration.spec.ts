import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';

const repoRoot = resolve(__dirname, '..', '..', '..', '..');
const fslBin = join(repoRoot, 'dist', 'cli', 'fsl.cjs');
const fslRenderBin = join(repoRoot, 'dist', 'cli', 'fsl-render.cjs');
const fixturesMachines = resolve(__dirname, 'fixtures/machines');
const fixturesPlugins = resolve(__dirname, 'fixtures/plugins');

interface RunResult { stdout: string; stderr: string; code: number; stdoutBuf: Buffer; }

interface RunOptions {
  env?: Record<string, string>;
  cwd?: string;
}

async function run(cmd: string, args: string[], envOrOpts: Record<string, string> | RunOptions = {}): Promise<RunResult> {
  // Back-compat: callers passing a plain env record continue to work.
  const opts: RunOptions = ('env' in envOrOpts || 'cwd' in envOrOpts)
    ? (envOrOpts as RunOptions)
    : { env: envOrOpts as Record<string, string> };
  const env = opts.env ?? {};
  return new Promise(res => {
    const child = spawn(cmd, args, {
      env: { ...process.env, ...env },
      cwd: opts.cwd,
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on('data', d => out.push(d));
    child.stderr.on('data', d => err.push(d));
    child.on('exit', code => {
      const stdoutBuf = Buffer.concat(out);
      res({
        stdout: stdoutBuf.toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
        code: code ?? 1,
        stdoutBuf,
      });
    });
  });
}

describe('integration: fsl + fsl-render spawned', () => {

  it('fsl --version exits 0 with version text', async () => {
    const r = await run(process.execPath, [fslBin, '--version']);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/^fsl\s+\S/);
  }, 15_000);

  it('fsl render <fsl> --stdout produces SVG identical to direct fsl-render invocation', async () => {
    const src = join(fixturesMachines, 'traffic-light.fsl');
    const sep = process.platform === 'win32' ? ';' : ':';
    const distCli = join(repoRoot, 'dist', 'cli');
    const augmentedPath = `${distCli}${sep}${process.env.PATH}`;
    const direct = await run(process.execPath, [fslRenderBin, src, '--target=dot', '--stdout']);
    const viaDispatch = await run(process.execPath, [fslBin, 'render', src, '--target=dot', '--stdout'], { PATH: augmentedPath });
    expect(viaDispatch.code).toBe(direct.code);
    expect(viaDispatch.code).toBe(0);
    expect(viaDispatch.stdout).toBe(direct.stdout);
    expect(viaDispatch.stdout).toContain('digraph');
  }, 30_000);

  it('fsl render writes sibling SVG by default', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-int-test-'));
    const src = join(work, 'traffic-light.fsl');
    const sep = process.platform === 'win32' ? ';' : ':';
    const distCli = join(repoRoot, 'dist', 'cli');
    const augmentedPath = `${distCli}${sep}${process.env.PATH}`;
    await fs.copyFile(join(fixturesMachines, 'traffic-light.fsl'), src);
    const r = await run(process.execPath, [fslBin, 'render', src], { PATH: augmentedPath });
    expect(r.code).toBe(0);
    const expected = join(work, 'traffic-light.svg');
    const content = await fs.readFile(expected, 'utf8');
    expect(content).toContain('<svg');
  }, 30_000);

  it('fsl with unknown subcommand exits 1 with helpful error', async () => {
    const r = await run(process.execPath, [fslBin, 'definitely-not-a-real-cmd'], { PATH: '' });
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('not a known subcommand');
  }, 15_000);

  it('dispatches to non-node fixture plugin via spawn fallback', async () => {
    const sep = process.platform === 'win32' ? ';' : ':';
    const augmentedPath = `${fixturesPlugins}${sep}${process.env.PATH}`;
    const r = await run(process.execPath, [fslBin, 'non-node', 'hello', 'world'], { PATH: augmentedPath });
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('spawned non-node plugin received: hello world');
  }, 15_000);

});

describe('cli integration — config file (issue #631)', () => {
  const configFixtureDir = resolve(__dirname, 'config/fixtures/projects/basic-config');
  const trafficLight = join(fixturesMachines, 'traffic-light.fsl');

  /**
   * Build an env block that isolates the spawned CLI from any user-global
   * config and any project config that might live above the worktree.
   * Points HOME/USERPROFILE at a freshly-made empty temp dir so the loader
   * walks find nothing.
   */
  const isolatedEnv = async (extra: Record<string, string> = {}): Promise<Record<string, string>> => {
    const emptyHome = await fs.mkdtemp(join(tmpdir(), 'fsl-cfg-empty-home-'));
    return { HOME: emptyHome, USERPROFILE: emptyHome, ...extra };
  };

  it('--no-config makes invocation behave identically to today (regression guard)', async () => {
    // The existing render fixtures rely on no config file influencing output.
    // Running with --no-config explicit should produce the same SVG as without.
    // Both invocations run from an isolated home so any real user-global
    // config cannot leak in and break the comparison.
    const env = await isolatedEnv();
    const a = await run(process.execPath, [fslRenderBin, '--stdout', '--no-config', trafficLight], { env });
    const b = await run(process.execPath, [fslRenderBin, '--stdout', trafficLight], { env, cwd: tmpdir() });
    expect(a.code).toBe(0);
    expect(b.code).toBe(0);
    expect(a.stdout).toBe(b.stdout);
  }, 30000);

  it('--config <path> loads that file', async () => {
    // basic-config has render.defaultTarget = 'png'. So omitting --target
    // and using the config should produce PNG.
    const env = await isolatedEnv();
    const r = await run(process.execPath, [
      fslRenderBin, '--stdout', '--config',
      resolve(configFixtureDir, '.fsl/config.json'),
      trafficLight,
    ], { env });
    expect(r.code).toBe(0);
    // PNG magic bytes: 89 50 4E 47 ...
    expect(r.stdoutBuf.slice(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4E, 0x47]));
  }, 30000);

  it('discovered .fsl/config.json sets render defaults when run in that directory', async () => {
    // cd into a project with .fsl/config.json present and invoke fsl render
    // — should pick up the project's defaults.
    const env = await isolatedEnv();
    const r = await run(
      process.execPath,
      [fslRenderBin, '--stdout', trafficLight],
      { env, cwd: configFixtureDir },
    );
    expect(r.code).toBe(0);
    // basic-config sets defaultTarget=png
    expect(r.stdoutBuf.slice(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4E, 0x47]));
  }, 30000);

  it('explicit --target overrides config', async () => {
    const env = await isolatedEnv();
    const r = await run(
      process.execPath,
      [fslRenderBin, '--stdout', '--target=svg', trafficLight],
      { env, cwd: configFixtureDir },
    );
    expect(r.code).toBe(0);
    expect(r.stdout.slice(0, 5)).toBe('<?xml');  // SVG, not PNG
  }, 30000);
});
