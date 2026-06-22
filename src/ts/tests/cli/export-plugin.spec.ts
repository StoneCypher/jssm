import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { cli } from '../../cli/subcommands/export/plugin';

const FSL      = "a 'go' -> b;\n";
const MAIN_FSL = 'a => b;\n';  // a 'main' edge — lossy when exported to mermaid

const withStdin = async (text: string, fn: () => Promise<void>): Promise<void> => {
  const { Readable } = await import('stream');
  const real = process.stdin;
  const fake = Object.assign(Readable.from(text), { isTTY: false });
  Object.defineProperty(process, 'stdin', { value: fake, configurable: true });
  try { await fn(); } finally { Object.defineProperty(process, 'stdin', { value: real, configurable: true }); }
};

describe('fsl-export plugin cli()', () => {

  let stdoutChunks: string[];
  let stderrChunks: string[];
  let realOut: typeof process.stdout.write;
  let realErr: typeof process.stderr.write;

  beforeEach(() => {
    stdoutChunks = []; stderrChunks = [];
    realOut = process.stdout.write.bind(process.stdout);
    realErr = process.stderr.write.bind(process.stderr);
    (process.stdout as any).write = (c: any) => { stdoutChunks.push(String(c)); return true; };
    (process.stderr as any).write = (c: any) => { stderrChunks.push(String(c)); return true; };
  });
  afterEach(() => {
    (process.stdout as any).write = realOut;
    (process.stderr as any).write = realErr;
  });

  it('--help prints usage and exits 0', async () => {
    expect(await cli(['--help'])).toBe(0);
    expect(stdoutChunks.join('')).toContain('fsl-export');
  });

  it('--version prints version and exits 0', async () => {
    expect(await cli(['--version'])).toBe(0);
    expect(stdoutChunks.join('')).toMatch(/fsl-export\s+\S/);
  });

  it('reports an unknown flag as exit 1', async () => {
    expect(await cli(['--definitely-not-a-flag'])).toBe(1);
    expect(stderrChunks.join('')).toContain('fsl-export: error:');
  });

  it('rejects more than one input', async () => {
    expect(await cli(['a.fsl', 'b.fsl'])).toBe(1);
    expect(stderrChunks.join('')).toContain('single input');
  });

  it('errors when no input is given and stdin is a TTY', async () => {
    const real = process.stdin;
    Object.defineProperty(process, 'stdin', { value: { isTTY: true }, configurable: true });
    try {
      expect(await cli([])).toBe(1);
      expect(stderrChunks.join('')).toContain('no input');
    } finally {
      Object.defineProperty(process, 'stdin', { value: real, configurable: true });
    }
  });

  it('reads piped FSL from stdin and writes json to stdout (default format)', async () => {
    await withStdin(FSL, async () => {
      expect(await cli([])).toBe(0);
      expect(stdoutChunks.join('')).toContain('"a"');
    });
  });

  it('treats "-" as stdin', async () => {
    await withStdin(FSL, async () => {
      expect(await cli(['-', '--format=json'])).toBe(0);
      expect(stdoutChunks.join('')).toContain('"b"');
    });
  });

  it('reads an FSL file and writes the converted output to stdout', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-export-test-'));
    const src = join(work, 'm.fsl');
    await fs.writeFile(src, FSL);
    expect(await cli([src, '--format=mermaid'])).toBe(0);
    expect(stdoutChunks.join('')).toContain('stateDiagram-v2');
  });

  it('returns 1 when the input file cannot be read', async () => {
    const bogus = process.platform === 'win32' ? 'C:\\no\\such\\f.fsl' : '/no/such/f.fsl';
    expect(await cli([bogus])).toBe(1);
    expect(stderrChunks.join('')).toContain('cannot read');
  });

  it('returns 1 on an InterchangeError (unsupported format)', async () => {
    await withStdin(FSL, async () => {
      expect(await cli(['--format=scxml'])).toBe(1);
      expect(stderrChunks.join('')).toContain('fsl-export: error:');
    });
  });

  it('prints lossy notes for a lossy export, and --quiet suppresses them', async () => {
    await withStdin(MAIN_FSL, async () => {
      expect(await cli(['--format=mermaid'])).toBe(0);
      expect(stderrChunks.join('')).toContain('lossy');
    });
    stderrChunks.length = 0;
    await withStdin(MAIN_FSL, async () => {
      expect(await cli(['--format=mermaid', '--quiet'])).toBe(0);
      expect(stderrChunks.join('')).not.toContain('lossy');
    });
  });

  it('writes to --output and returns 0', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-export-test-'));
    const src = join(work, 'm.fsl');
    const out = join(work, 'out.json');
    await fs.writeFile(src, FSL);
    expect(await cli([src, '--format=json', '-o', out])).toBe(0);
    expect(await fs.readFile(out, 'utf8')).toContain('"a"');
  });

  it('treats --output "-" as stdout', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-export-test-'));
    const src = join(work, 'm.fsl');
    await fs.writeFile(src, FSL);
    expect(await cli([src, '--format=json', '-o', '-'])).toBe(0);
    expect(stdoutChunks.join('')).toContain('"a"');
  });

  it('returns 1 when the output file cannot be written', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-export-test-'));
    const src = join(work, 'm.fsl');
    await fs.writeFile(src, FSL);
    const out = join(work, 'no-such-dir', 'out.json');
    expect(await cli([src, '--format=json', '-o', out])).toBe(1);
    expect(stderrChunks.join('')).toContain('cannot write');
  });

  it('returns 2 on a non-InterchangeError thrown by exportMachine', async () => {
    vi.resetModules();
    vi.doMock('../../cli/subcommands/export/export', () => ({
      exportMachine: () => { throw new Error('boom non-interchange'); },
    }));
    const { cli: mockedCli } = await import('../../cli/subcommands/export/plugin');
    await withStdin(FSL, async () => {
      expect(await mockedCli(['--format=json'])).toBe(2);
      expect(stderrChunks.join('')).toContain('boom non-interchange');
    });
    vi.doUnmock('../../cli/subcommands/export/export');
  });

});
