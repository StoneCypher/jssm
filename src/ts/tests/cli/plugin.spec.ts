import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { resolve, join } from 'path';
import { cli } from '../../cli/subcommands/render/plugin';

const fixturesDir = resolve(__dirname, 'fixtures/machines');

describe('fsl-render plugin cli()', () => {

  let stdoutChunks: string[];
  let stderrChunks: string[];
  let realStdoutWrite: typeof process.stdout.write;
  let realStderrWrite: typeof process.stderr.write;

  beforeEach(() => {
    stdoutChunks = [];
    stderrChunks = [];
    realStdoutWrite = process.stdout.write.bind(process.stdout);
    realStderrWrite = process.stderr.write.bind(process.stderr);
    (process.stdout as any).write = (chunk: any) => { stdoutChunks.push(String(chunk)); return true; };
    (process.stderr as any).write = (chunk: any) => { stderrChunks.push(String(chunk)); return true; };
  });

  afterEach(() => {
    (process.stdout as any).write = realStdoutWrite;
    (process.stderr as any).write = realStderrWrite;
  });

  it('--help prints usage and exits 0', async () => {
    const code = await cli(['--help']);
    expect(code).toBe(0);
    const stdout = stdoutChunks.join('');
    expect(stdout).toContain('fsl-render');
    expect(stdout).toContain('--target');
    expect(stdout).toContain('Usage:');
  });

  it('--version prints version and exits 0', async () => {
    const code = await cli(['--version']);
    expect(code).toBe(0);
    expect(stdoutChunks.join('')).toMatch(/fsl-render\s+\S/);
  });

  it('renders single file to sibling .svg by default', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-render-test-'));
    const src = join(work, 'traffic-light.fsl');
    await fs.copyFile(join(fixturesDir, 'traffic-light.fsl'), src);
    const code = await cli([src]);
    expect(code).toBe(0);
    const expected = join(work, 'traffic-light.svg');
    const content = await fs.readFile(expected, 'utf8');
    expect(content).toContain('<svg');
    expect(content).toMatch(/>Red</);
  });

  it('--stdout writes SVG to stdout for single input', async () => {
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--stdout']);
    expect(code).toBe(0);
    expect(stdoutChunks.join('')).toContain('<svg');
  });

  it('reports parse error on stderr with path and exit 1', async () => {
    const src = join(fixturesDir, 'invalid.fsl');
    const code = await cli([src]);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toContain('fsl-render: error:');
    expect(stderrChunks.join('')).toContain(src);
  });

  it('rejects multi-input without --out-dir, exit 1', async () => {
    const a = join(fixturesDir, 'traffic-light.fsl');
    const b = join(fixturesDir, 'atm.fsl');
    const code = await cli([a, b]);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toContain('--out-dir');
  });

  it('--out-dir writes each input to that directory', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-render-test-'));
    const a = join(fixturesDir, 'traffic-light.fsl');
    const b = join(fixturesDir, 'atm.fsl');
    const code = await cli([a, b, '--out-dir', work]);
    expect(code).toBe(0);
    const outA = await fs.readFile(join(work, 'traffic-light.svg'), 'utf8');
    const outB = await fs.readFile(join(work, 'atm.svg'), 'utf8');
    expect(outA).toContain('<svg');
    expect(outB).toContain('<svg');
  });

  it('--target=dot --stdout emits DOT to stdout', async () => {
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--target=dot', '--stdout']);
    expect(code).toBe(0);
    expect(stdoutChunks.join('')).toMatch(/^\s*digraph/);
  });

  it('mutually exclusive output flags error', async () => {
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--stdout', '-o', 'out.svg']);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toMatch(/mutually exclusive|conflict/i);
  });

});
