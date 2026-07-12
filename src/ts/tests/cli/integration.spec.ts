import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';

const repoRoot = resolve(__dirname, '..', '..', '..', '..');
const fslBin = join(repoRoot, 'dist', 'cli', 'fsl.cjs');
const fslRenderBin = join(repoRoot, 'dist', 'cli', 'fsl-render.cjs');
const fixturesMachines = resolve(__dirname, 'fixtures/machines');
const fixturesPlugins = resolve(__dirname, 'fixtures/plugins');

interface RunResult { stdout: string; stderr: string; code: number; }

async function run(cmd: string, args: string[], env: Record<string, string> = {}): Promise<RunResult> {
  return new Promise(resolve => {
    const child = spawn(cmd, args, { env: { ...process.env, ...env } });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on('data', d => { out.push(d); });
    child.stderr.on('data', d => { err.push(d); });
    child.on('exit', code => resolve({
      stdout: Buffer.concat(out).toString('utf8'),
      stderr: Buffer.concat(err).toString('utf8'),
      code: code ?? 1,
    }));
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
