import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { resolve, join } from 'path';
import { cli } from '../../cli/subcommands/codegen/plugin';

const fixturesDir = resolve(__dirname, 'fixtures/machines');

describe('fsl-codegen plugin cli()', () => {

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
    expect(stdout).toContain('fsl-codegen');
    expect(stdout).toContain('--target');
    expect(stdout).toContain('Usage:');
  });

  it('--version prints version and exits 0', async () => {
    const code = await cli(['--version']);
    expect(code).toBe(0);
    expect(stdoutChunks.join('')).toMatch(/fsl-codegen\s+\S/);
  });

  it('reports parse failure on argv (unknown flag) as exit 1', async () => {
    const code = await cli(['--definitely-not-a-real-flag']);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toMatch(/unknown flag/);
  });

  it('reports a config-load failure on stderr and exits 1', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-codegen-test-'));
    const badConfig = join(work, 'config.json');
    await fs.writeFile(badConfig, '{ this is not json', 'utf8');
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--stdout', '--config', badConfig]);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toMatch(/malformed JSON/);
  });

  it('generates a sibling .ts file by default', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-codegen-test-'));
    const src = join(work, 'traffic-light.fsl');
    await fs.copyFile(join(fixturesDir, 'traffic-light.fsl'), src);
    const code = await cli([src]);
    expect(code).toBe(0);
    const out = await fs.readFile(join(work, 'traffic-light.ts'), 'utf8');
    expect(out).toContain('export class TrafficLight');
    expect(out).toContain('transitions');
  });

  it('--stdout writes generated source to stdout for single input', async () => {
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--stdout']);
    expect(code).toBe(0);
    expect(stdoutChunks.join('')).toContain('export class TrafficLight');
  });

  it('--name is pascal-cased into the generated class name', async () => {
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--stdout', '--name', 'Traffic Light']);
    expect(code).toBe(0);
    expect(stdoutChunks.join('')).toContain('export class TrafficLight');
  });

  it('single input with --output writes to the exact path', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-codegen-test-'));
    const src  = join(fixturesDir, 'traffic-light.fsl');
    const out  = join(work, 'explicit-name.ts');
    const code = await cli([src, '-o', out]);
    expect(code).toBe(0);
    expect(await fs.readFile(out, 'utf8')).toContain('export class TrafficLight');
  });

  it('single input with --out-dir writes to that dir (not sibling)', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-codegen-test-'));
    const src  = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--out-dir', work]);
    expect(code).toBe(0);
    expect(await fs.readFile(join(work, 'traffic-light.ts'), 'utf8')).toContain('export class TrafficLight');
  });

  it('reports parse error on stderr with path and exit 1', async () => {
    const src = join(fixturesDir, 'invalid.fsl');
    const code = await cli([src]);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toContain('fsl-codegen: error:');
    expect(stderrChunks.join('')).toContain(src);
  });

  it('single input that cannot be read returns 1 with cannot-read error', async () => {
    const bogus = process.platform === 'win32'
      ? 'C:\\no\\such\\dir\\nope.fsl'
      : '/no/such/dir/nope.fsl';
    const code = await cli([bogus]);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toContain('cannot read');
  });

  it('rejects multi-input without --out-dir, exit 1', async () => {
    const a = join(fixturesDir, 'traffic-light.fsl');
    const b = join(fixturesDir, 'atm.fsl');
    const code = await cli([a, b]);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toContain('--out-dir');
  });

  it('--out-dir writes each input to that directory', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-codegen-test-'));
    const a = join(fixturesDir, 'traffic-light.fsl');
    const b = join(fixturesDir, 'atm.fsl');
    const code = await cli([a, b, '--out-dir', work]);
    expect(code).toBe(0);
    expect(await fs.readFile(join(work, 'traffic-light.ts'), 'utf8')).toContain('export class TrafficLight');
    expect(await fs.readFile(join(work, 'atm.ts'), 'utf8')).toContain('export class Atm');
  });

  it('multi-input continues past unreadable files and reports worst exit code', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-codegen-test-'));
    const good = join(fixturesDir, 'traffic-light.fsl');
    const bad  = join(work, 'does-not-exist.fsl');
    const code = await cli([good, bad, '--out-dir', work]);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toContain('cannot read');
    expect(stderrChunks.join('')).toContain('does-not-exist.fsl');
    expect(await fs.readFile(join(work, 'traffic-light.ts'), 'utf8')).toContain('export class TrafficLight');
  });

  it('mutually exclusive output flags error', async () => {
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--stdout', '-o', 'out.ts']);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toMatch(/mutually exclusive/i);
  });

  it('reads FSL from piped stdin when no input path is given', async () => {
    const { Readable } = await import('stream');
    const realStdin = process.stdin;
    const fakeStdin = Object.assign(Readable.from("a 'go' -> b;\n"), { isTTY: false });
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    try {
      const code = await cli(['--stdout']);
      expect(code).toBe(0);
      expect(stdoutChunks.join('')).toContain('export class Machine');
    } finally {
      Object.defineProperty(process, 'stdin', { value: realStdin, configurable: true });
    }
  });

  it('errors when no input path is given and stdin is a TTY', async () => {
    const realStdin = process.stdin;
    Object.defineProperty(process, 'stdin', { value: { isTTY: true }, configurable: true });
    try {
      const code = await cli([]);
      expect(code).toBe(1);
      expect(stderrChunks.join('')).toContain('no input');
    } finally {
      Object.defineProperty(process, 'stdin', { value: realStdin, configurable: true });
    }
  });

  it('treats path "-" as stdin', async () => {
    const { Readable } = await import('stream');
    const realStdin = process.stdin;
    const fakeStdin = Object.assign(Readable.from("a 'go' -> b;\n"), { isTTY: false });
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    try {
      const code = await cli(['-', '--stdout']);
      expect(code).toBe(0);
      expect(stdoutChunks.join('')).toContain('export class Machine');
    } finally {
      Object.defineProperty(process, 'stdin', { value: realStdin, configurable: true });
    }
  });

  it('reads from bare "-" with no other flags (defaults to stdout)', async () => {
    const { Readable } = await import('stream');
    const realStdin = process.stdin;
    const fakeStdin = Object.assign(Readable.from("a 'go' -> b;\n"), { isTTY: false });
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    try {
      const code = await cli(['-']);
      expect(code).toBe(0);
      expect(stdoutChunks.join('')).toContain('export class Machine');
    } finally {
      Object.defineProperty(process, 'stdin', { value: realStdin, configurable: true });
    }
  });

  it('honors a config-file codegen.defaultTarget (the ?? left branch)', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-codegen-test-'));
    const cfg  = join(work, 'config.json');
    await fs.writeFile(cfg, JSON.stringify({ codegen: { defaultTarget: 'native:typescript' } }), 'utf8');
    const src  = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--stdout', '--config', cfg]);
    expect(code).toBe(0);
    expect(stdoutChunks.join('')).toContain('export class TrafficLight');
  });

  it('honors a config-file codegen.outDir (the ?? left branch)', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-codegen-test-'));
    const cfg  = join(work, 'config.json');
    await fs.writeFile(cfg, JSON.stringify({ codegen: { outDir: work } }), 'utf8');
    const src  = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--config', cfg]);
    expect(code).toBe(0);
    expect(await fs.readFile(join(work, 'traffic-light.ts'), 'utf8')).toContain('export class TrafficLight');
  });

  it('prints a non-CodegenError thrown by codegen() verbatim and returns 1', async () => {
    vi.resetModules();
    vi.doMock('../../cli/subcommands/codegen/codegen', () => ({
      codegen: () => { throw new Error('synthetic non-CodegenError'); },
    }));
    const { cli: mockedCli } = await import('../../cli/subcommands/codegen/plugin');
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await mockedCli([src, '--stdout']);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toContain('synthetic non-CodegenError');
    vi.doUnmock('../../cli/subcommands/codegen/codegen');
  });

  it('prints line number when CodegenError carries .line metadata', async () => {
    vi.resetModules();
    vi.doMock('../../cli/subcommands/codegen/codegen', async () => {
      const { CodegenError } = await import('../../cli/codegen-types');
      return { codegen: () => { throw new CodegenError('codegen failed', { line: 42 }); } };
    });
    const { cli: mockedCli } = await import('../../cli/subcommands/codegen/plugin');
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await mockedCli([src, '--stdout']);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toContain('line 42');
    vi.doUnmock('../../cli/subcommands/codegen/codegen');
  });

  it('formats non-Error throws via String() fallback (?? String(e) branch)', async () => {
    vi.resetModules();
    vi.doMock('../../cli/subcommands/codegen/codegen', () => ({
      codegen: () => { throw 42; },  // a plain number, no .message
    }));
    const { cli: mockedCli } = await import('../../cli/subcommands/codegen/plugin');
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await mockedCli([src, '--stdout']);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toContain('42');
    vi.doUnmock('../../cli/subcommands/codegen/codegen');
  });

  it('readStream handles an immediately-closed stdin (no chunks yielded)', async () => {
    const { Readable } = await import('stream');
    const realStdin = process.stdin;
    const fakeStdin = Object.assign(
      new Readable({ read() { this.push(null); } }),
      { isTTY: false },
    );
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    try {
      const code = await cli(['--stdout']);
      // Empty FSL throws on parse → exit 1; the point is readStream ran the
      // for-await with zero iterations.
      expect(code).toBe(1);
    } finally {
      Object.defineProperty(process, 'stdin', { value: realStdin, configurable: true });
    }
  });

  it('readStream passes through Buffer chunks unchanged (Buffer.isBuffer branch)', async () => {
    const { Readable } = await import('stream');
    const realStdin = process.stdin;
    const fakeStdin = Object.assign(
      new Readable({
        read() { this.push(Buffer.from("a 'go' -> b;\n")); this.push(null); },
      }),
      { isTTY: false },
    );
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    try {
      const code = await cli(['--stdout']);
      expect(code).toBe(0);
      expect(stdoutChunks.join('')).toContain('export class Machine');
    } finally {
      Object.defineProperty(process, 'stdin', { value: realStdin, configurable: true });
    }
  });

  it('readStream wraps string chunks into Buffer (Buffer.from branch)', async () => {
    const { Readable } = await import('stream');
    const realStdin = process.stdin;
    const fakeStdin = Object.assign(
      new Readable({
        objectMode: true,
        read() { this.push("a 'go' -> b;\n"); this.push(null); },
      }),
      { isTTY: false },
    );
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    try {
      const code = await cli(['--stdout']);
      expect(code).toBe(0);
      expect(stdoutChunks.join('')).toContain('export class Machine');
    } finally {
      Object.defineProperty(process, 'stdin', { value: realStdin, configurable: true });
    }
  });

  it('--json emits a success envelope to stdout', async () => {
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--stdout', '--json']);
    expect(code).toBe(0);
    const env = JSON.parse(stdoutChunks.join(''));
    expect(env.ok).toBe(true);
    expect(env.status).toBe('generated');
    expect(env.target).toBe('native:typescript');
    expect(env.content).toContain('export class TrafficLight');
  });

  it('--json emits a success envelope with outputPath when writing a file', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-codegen-test-'));
    const src  = join(fixturesDir, 'traffic-light.fsl');
    const out  = join(work, 'gen.ts');
    const code = await cli([src, '-o', out, '--json']);
    expect(code).toBe(0);
    const env = JSON.parse(stdoutChunks.join(''));
    expect(env.ok).toBe(true);
    expect(env.outputPath).toBe(out);
  });

  it('--json emits an error envelope on bad FSL', async () => {
    const src = join(fixturesDir, 'invalid.fsl');
    const code = await cli([src, '--stdout', '--json']);
    expect(code).toBe(1);
    const env = JSON.parse(stdoutChunks.join(''));
    expect(env.ok).toBe(false);
    expect(env.status).toBe('error');
  });

  it('--json emits an undecided envelope for --certify', async () => {
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--stdout', '--json', '--certify']);
    expect(code).toBe(1);
    const env = JSON.parse(stdoutChunks.join(''));
    expect(env.status).toBe('undecided');
  });

  it('reports a file-write failure on stderr and returns 1', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-codegen-test-'));
    const src  = join(fixturesDir, 'traffic-light.fsl');
    const out  = join(work, 'no-such-subdir', 'out.ts');  // parent dir is missing
    const code = await cli([src, '-o', out]);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toContain('cannot write');
  });

  it('reports a file-write failure as a --json error envelope and returns 1', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-codegen-test-'));
    const src  = join(fixturesDir, 'traffic-light.fsl');
    const out  = join(work, 'no-such-subdir', 'out.ts');
    const code = await cli([src, '-o', out, '--json']);
    expect(code).toBe(1);
    const env = JSON.parse(stdoutChunks.join(''));
    expect(env.ok).toBe(false);
  });

  it('writes a .js sibling file for native:javascript', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-codegen-test-'));
    const src  = join(work, 'traffic-light.fsl');
    await fs.copyFile(join(fixturesDir, 'traffic-light.fsl'), src);
    const code = await cli([src, '--target', 'native:javascript']);
    expect(code).toBe(0);
    const out = await fs.readFile(join(work, 'traffic-light.js'), 'utf8');
    expect(out).toContain('export class TrafficLight');
  });

  it('--json error envelope includes line when the CodegenError carries one', async () => {
    vi.resetModules();
    vi.doMock('../../cli/subcommands/codegen/codegen', async () => {
      const { CodegenError } = await import('../../cli/codegen-types');
      return { codegen: () => { throw new CodegenError('boom', { line: 7 }); } };
    });
    const { cli: mockedCli } = await import('../../cli/subcommands/codegen/plugin');
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await mockedCli([src, '--stdout', '--json']);
    expect(code).toBe(1);
    const env = JSON.parse(stdoutChunks.join(''));
    expect(env.line).toBe(7);
    vi.doUnmock('../../cli/subcommands/codegen/codegen');
  });

});
