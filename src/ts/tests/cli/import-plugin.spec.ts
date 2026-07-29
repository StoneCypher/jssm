import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cli } from '../../cli/subcommands/import/plugin';

const MERMAID = 'stateDiagram-v2\n  s0 --> s1 : go\n';

const withStdin = async (text: string, fn: () => Promise<void>): Promise<void> => {
  const { Readable } = await import('node:stream');
  const real = process.stdin;
  const fake = Object.assign(Readable.from(text), { isTTY: false });
  Object.defineProperty(process, 'stdin', { value: fake, configurable: true });
  try { await fn(); } finally { Object.defineProperty(process, 'stdin', { value: real, configurable: true }); }
};

describe('fsl-import plugin cli()', () => {

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
    expect(stdoutChunks.join('')).toContain('fsl-import');
  });

  it('--version prints version and exits 0', async () => {
    expect(await cli(['--version'])).toBe(0);
    expect(stdoutChunks.join('')).toMatch(/fsl-import\s+\S/);
  });

  it('reports an unknown flag as exit 1', async () => {
    expect(await cli(['--definitely-not-a-flag'])).toBe(1);
    expect(stderrChunks.join('')).toContain('fsl-import: error:');
  });

  it('rejects more than one input', async () => {
    expect(await cli(['a.json', 'b.json'])).toBe(1);
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

  it('reads a piped mermaid document from stdin and writes FSL to stdout (with lossy note)', async () => {
    await withStdin(MERMAID, async () => {
      expect(await cli(['--format=mermaid'])).toBe(0);
      expect(stdoutChunks.join('')).toContain('->');
      expect(stderrChunks.join('')).toContain('lossy');
    });
  });

  it('treats "-" as stdin', async () => {
    await withStdin(MERMAID, async () => {
      expect(await cli(['-', '--format=mermaid', '--quiet'])).toBe(0);
      expect(stdoutChunks.join('')).toContain('->');
    });
  });

  it('reads a mermaid file and writes FSL to stdout', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-import-test-'));
    const src = join(work, 'm.mmd');
    await fs.writeFile(src, MERMAID);
    expect(await cli([src, '--format=mermaid', '--quiet'])).toBe(0);
    expect(stdoutChunks.join('')).toContain('->');
  });

  it('returns 1 when the input file cannot be read', async () => {
    const bogus = process.platform === 'win32' ? String.raw`C:\no\such\f.mmd` : '/no/such/f.mmd';
    expect(await cli([bogus, '--format=mermaid'])).toBe(1);
    expect(stderrChunks.join('')).toContain('cannot read');
  });

  it('returns 1 on an InterchangeError (unsupported format)', async () => {
    await withStdin('<scxml/>', async () => {
      expect(await cli(['--format=scxml'])).toBe(1);
      expect(stderrChunks.join('')).toContain('fsl-import: error:');
    });
  });

  it('--quiet suppresses lossy notes', async () => {
    await withStdin(MERMAID, async () => {
      expect(await cli(['--format=mermaid', '--quiet'])).toBe(0);
      expect(stderrChunks.join('')).not.toContain('lossy');
    });
  });

  it('writes to --output and returns 0', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-import-test-'));
    const src = join(work, 'm.mmd');
    const out = join(work, 'out.fsl');
    await fs.writeFile(src, MERMAID);
    expect(await cli([src, '--format=mermaid', '-o', out, '--quiet'])).toBe(0);
    expect(await fs.readFile(out, 'utf8')).toContain('->');
  });

  it('treats --output "-" as stdout', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-import-test-'));
    const src = join(work, 'm.mmd');
    await fs.writeFile(src, MERMAID);
    expect(await cli([src, '--format=mermaid', '-o', '-', '--quiet'])).toBe(0);
    expect(stdoutChunks.join('')).toContain('->');
  });

  it('returns 1 when the output file cannot be written', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-import-test-'));
    const src = join(work, 'm.mmd');
    await fs.writeFile(src, MERMAID);
    const out = join(work, 'no-such-dir', 'out.fsl');
    expect(await cli([src, '--format=mermaid', '-o', out, '--quiet'])).toBe(1);
    expect(stderrChunks.join('')).toContain('cannot write');
  });

  it('returns 2 on a non-InterchangeError thrown by importMachine', async () => {
    vi.resetModules();
    vi.doMock('../../cli/subcommands/import/import', () => ({
      importMachine: () => { throw new Error('boom non-interchange'); },
    }));
    const { cli: mockedCli } = await import('../../cli/subcommands/import/plugin');
    await withStdin(MERMAID, async () => {
      expect(await mockedCli(['--format=mermaid'])).toBe(2);
      expect(stderrChunks.join('')).toContain('boom non-interchange');
    });
    vi.doUnmock('../../cli/subcommands/import/import');
  });

  it('reads Buffer chunks from stdin (the Buffer.isBuffer branch)', async () => {
    const { Readable } = await import('node:stream');
    const real = process.stdin;
    const fake = Object.assign(
      new Readable({ read: () => {} }),
      { isTTY: false },
    );
    fake.push(Buffer.from(MERMAID));
    // eslint-disable-next-line unicorn/prefer-single-call -- Readable.push, not Array#push: push(null) is the stream EOF signal
    fake.push(null);
    Object.defineProperty(process, 'stdin', { value: fake, configurable: true });
    try {
      expect(await cli(['--format=mermaid', '--quiet'])).toBe(0);
      expect(stdoutChunks.join('')).toContain('->');
    } finally {
      Object.defineProperty(process, 'stdin', { value: real, configurable: true });
    }
  });

  it('String()s a non-Error value thrown by importMachine (the ?? fallback)', async () => {
    vi.resetModules();
    vi.doMock('../../cli/subcommands/import/import', () => ({
      importMachine: () => { throw 'plain-string-failure'; },
    }));
    const { cli: mockedCli } = await import('../../cli/subcommands/import/plugin');
    await withStdin(MERMAID, async () => {
      expect(await mockedCli(['--format=mermaid'])).toBe(2);
      expect(stderrChunks.join('')).toContain('plain-string-failure');
    });
    vi.doUnmock('../../cli/subcommands/import/import');
  });

});
