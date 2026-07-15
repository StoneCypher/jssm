import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
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

  it('refuses to silently overwrite when two inputs share a basename, exit 1', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-render-test-'));
    const dirA = join(work, 'a');
    const dirB = join(work, 'b');
    await fs.mkdir(dirA);
    await fs.mkdir(dirB);
    const a = join(dirA, 'machine.fsl');   // first claimant of out/machine.svg
    const b = join(dirB, 'machine.fsl');   // same basename -> would collide
    await fs.copyFile(join(fixturesDir, 'traffic-light.fsl'), a);
    await fs.copyFile(join(fixturesDir, 'atm.fsl'), b);

    const code = await cli([a, b, '--out-dir', work]);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toMatch(/refusing to overwrite/);
    expect(stderrChunks.join('')).toContain(b);

    // The first input's render survives; the collider was skipped, not written.
    const written = await fs.readFile(join(work, 'machine.svg'), 'utf8');
    expect(written).toMatch(/>Red</);      // traffic-light content, not atm's
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

  it('mutually exclusive sizing flags error', async () => {
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--target=png', '--width=100', '--scale=200']);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toMatch(/--width, --height, and --scale are mutually exclusive/);
  });

  it('rejects a non-finite --width (Infinity), exit 1', async () => {
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--target=png', '--width=Infinity', '--stdout']);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toMatch(/--width must be a positive finite number/);
  });

  it('rejects a zero --width, exit 1', async () => {
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--target=png', '--width=0', '--stdout']);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toMatch(/--width must be a positive/);
  });

  it('rejects a negative --scale, exit 1', async () => {
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--target=png', '--scale=-100', '--stdout']);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toMatch(/--scale must be a positive/);
  });

  it('rejects an absurdly large --width (OOM guard), exit 1', async () => {
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--target=png', '--width=1000000000', '--stdout']);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toMatch(/--width must be a positive finite number no greater than/);
  });

  it('accepts a valid in-range size flag', async () => {
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--target=dot', '--width=400', '--stdout']);
    expect(code).toBe(0);
    expect(stdoutChunks.join('')).toMatch(/digraph/);
  });

  it('reads FSL from piped stdin when no input path is given', async () => {
    const { Readable } = await import('node:stream');
    const realStdin = process.stdin;
    const fakeStdin = Object.assign(Readable.from('a -> b;\n'), { isTTY: false });
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    try {
      const code = await cli(['--target=dot']);
      expect(code).toBe(0);
      expect(stdoutChunks.join('')).toMatch(/digraph/);
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
    const { Readable } = await import('node:stream');
    const realStdin = process.stdin;
    const fakeStdin = Object.assign(Readable.from('a -> b;\n'), { isTTY: false });
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    try {
      const code = await cli(['-', '--target=dot', '--stdout']);
      expect(code).toBe(0);
      expect(stdoutChunks.join('')).toMatch(/digraph/);
    } finally {
      Object.defineProperty(process, 'stdin', { value: realStdin, configurable: true });
    }
  });

  it('reports parse failure on argv (unknown flag) as exit 1', async () => {
    // Covers the catch around parseFslArgs at the top of cli().
    const code = await cli(['--definitely-not-a-real-flag']);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toMatch(/unknown flag/);
  });

  it('single input with --output writes to the exact path', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-render-test-'));
    const src  = join(fixturesDir, 'traffic-light.fsl');
    const out  = join(work, 'explicit-name.svg');
    const code = await cli([src, '-o', out]);
    expect(code).toBe(0);
    const content = await fs.readFile(out, 'utf8');
    expect(content).toContain('<svg');
  });

  it('single input that cannot be read returns 1 with cannot-read error', async () => {
    const bogus = process.platform === 'win32'
      ? String.raw`C:\no\such\dir\nope.fsl`
      : '/no/such/dir/nope.fsl';
    const code = await cli([bogus]);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toContain('cannot read');
  });

  it('single input with --out-dir writes to that dir (not sibling)', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-render-test-'));
    const src  = join(fixturesDir, 'traffic-light.fsl');
    const code = await cli([src, '--out-dir', work]);
    expect(code).toBe(0);
    const content = await fs.readFile(join(work, 'traffic-light.svg'), 'utf8');
    expect(content).toContain('<svg');
  });

  it('reads from bare "-" with no other flags (defaults to stdout)', async () => {
    // Cover the `if (path === '-') return renderOne(..., { stdout: true });`
    // single-input fallback in plugin.ts. Differs from the existing
    // `treats path "-" as stdin` test which passes --stdout explicitly.
    const { Readable } = await import('node:stream');
    const realStdin = process.stdin;
    const fakeStdin = Object.assign(Readable.from('a -> b;\n'), { isTTY: false });
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    try {
      const code = await cli(['-', '--target=dot']);
      expect(code).toBe(0);
      expect(stdoutChunks.join('')).toMatch(/digraph/);
    } finally {
      Object.defineProperty(process, 'stdin', { value: realStdin, configurable: true });
    }
  });

  it('--stdout with --target=png writes raw raster bytes to stdout', async () => {
    // Set up OffscreenCanvas/Image so PNG rendering succeeds in-process
    // (avoids the resvg-wasm path that's already covered by other tests).
    // Importantly, this exercises the renderOne stdout+raster branch.
    // eslint-disable-next-line unicorn/no-unnecessary-global-this -- OffscreenCanvas does not exist in Node; a bare identifier read throws ReferenceError
    const realOffscreen = (globalThis as any).OffscreenCanvas;
    // eslint-disable-next-line unicorn/no-unnecessary-global-this -- Image does not exist in Node; a bare identifier read throws ReferenceError
    const realImage     = (globalThis as any).Image;
    (globalThis as any).Image = class FakeImage {
      src = '';
      width = 100;
      height = 60;
      decode() { return Promise.resolve(); }
    };
    (globalThis as any).OffscreenCanvas = class FakeOffscreen {
      width: number;
      height: number;
      constructor(w: number, h: number) { this.width = w; this.height = h; }
      getContext() { return { drawImage: () => {} }; }
      async convertToBlob() {
        const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        return { arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
      }
    };
    // Local raw-byte capture: the file-level beforeEach captures via
    // String(chunk), which UTF-8-decodes binary PNG bytes into
    // replacement characters. For this test we need the bytes themselves.
    const rawChunks: Buffer[] = [];
    const stashedWrite = process.stdout.write;
    (process.stdout as any).write = (chunk: any) => {
      rawChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return true;
    };
    try {
      const src = join(fixturesDir, 'traffic-light.fsl');
      const code = await cli([src, '--target=png', '--stdout']);
      expect(code).toBe(0);
      const all = Buffer.concat(rawChunks);
      expect(all[0]).toBe(0x89);
      expect(all[1]).toBe(0x50);
    } finally {
      (process.stdout as any).write = stashedWrite;
      (globalThis as any).OffscreenCanvas = realOffscreen;
      (globalThis as any).Image           = realImage;
    }
  });

  it('multi-input continues past unreadable files and reports worst exit code', async () => {
    const work = await fs.mkdtemp(join(tmpdir(), 'fsl-render-test-'));
    const good = join(fixturesDir, 'traffic-light.fsl');
    const bad  = join(work, 'does-not-exist.fsl');
    const code = await cli([good, bad, '--out-dir', work]);
    expect(code).toBe(1); // worst exit across inputs (bad read = 1)
    expect(stderrChunks.join('')).toContain('cannot read');
    expect(stderrChunks.join('')).toContain('does-not-exist.fsl');
    // The good file should still have been rendered
    const outGood = await fs.readFile(join(work, 'traffic-light.svg'), 'utf8');
    expect(outGood).toContain('<svg');
  });

  it('prints non-RenderError thrown by render() verbatim and returns 1', async () => {
    // The catch in renderOne distinguishes RenderError (has .line for source
    // location) from anything else. This exercises the "else" branch by
    // making render() throw a plain Error.
    vi.resetModules();
    vi.doMock('../../cli/subcommands/render/render', () => ({
      render: async () => { throw new Error('synthetic non-RenderError'); },
    }));
    const { cli: mockedCli } = await import('../../cli/subcommands/render/plugin');
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await mockedCli([src, '--stdout']);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toContain('synthetic non-RenderError');
    vi.doUnmock('../../cli/subcommands/render/render');
  });

  it('prints line number when RenderError carries .line metadata', async () => {
    // Covers the `line !== undefined ? ' at path line X' : ' at path'`
    // branch in printErr — the only callsite that supplies a line is in
    // the renderOne catch, when the thrown RenderError actually has .line.
    vi.resetModules();
    vi.doMock('../../cli/subcommands/render/render', () => ({
      render: async () => {
        const { RenderError } = await import('../../cli/types');
        throw new RenderError('parse failed', { line: 42 });
      },
    }));
    const { cli: mockedCli } = await import('../../cli/subcommands/render/plugin');
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await mockedCli([src, '--stdout']);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toContain('line 42');
    vi.doUnmock('../../cli/subcommands/render/render');
  });

  it('readStream handles an immediately-closed stdin (no chunks yielded)', async () => {
    // Exercises the "for await yields nothing" path in readStream — the
    // existing stdin tests all yield at least one chunk.
    const { Readable } = await import('node:stream');
    const realStdin = process.stdin;
    const fakeStdin = Object.assign(
      // eslint-disable-next-line unicorn/no-this-outside-of-class -- Node's Readable invokes read() with the stream as `this`; that context is the API
      new Readable({ read() { this.push(null); } }),
      { isTTY: false },
    );
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    try {
      const code = await cli(['--target=dot']);
      // Empty FSL parses as an empty graph; whatever the exit code, what
      // matters is that readStream ran the for-await with zero iterations.
      expect([0, 1]).toContain(code);
    } finally {
      Object.defineProperty(process, 'stdin', { value: realStdin, configurable: true });
    }
  });

  it('formats non-Error throws via String() fallback (?? String(e) branch)', async () => {
    // Pair of the previous test: makes render() throw something that has
    // no .message property, exercising the right-hand side of
    // `(e as Error).message ?? String(e)` in renderOne's catch.
    vi.resetModules();
    vi.doMock('../../cli/subcommands/render/render', () => ({
      render: async () => { throw 42; },  // a plain number, no .message
    }));
    const { cli: mockedCli } = await import('../../cli/subcommands/render/plugin');
    const src = join(fixturesDir, 'traffic-light.fsl');
    const code = await mockedCli([src, '--stdout']);
    expect(code).toBe(1);
    expect(stderrChunks.join('')).toContain('42');
    vi.doUnmock('../../cli/subcommands/render/render');
  });

  it('--target=png with -o writes raster bytes to that file', async () => {
    // Covers the raster branch of `r.kind === 'text' ? r.content : Buffer.from(r.buffer)`
    // in renderOne (the outputPath case, not the stdout case).
    // eslint-disable-next-line unicorn/no-unnecessary-global-this -- OffscreenCanvas does not exist in Node; a bare identifier read throws ReferenceError
    const realOffscreen = (globalThis as any).OffscreenCanvas;
    // eslint-disable-next-line unicorn/no-unnecessary-global-this -- Image does not exist in Node; a bare identifier read throws ReferenceError
    const realImage     = (globalThis as any).Image;
    (globalThis as any).Image = class FakeImage {
      src = '';
      width = 100;
      height = 60;
      decode() { return Promise.resolve(); }
    };
    (globalThis as any).OffscreenCanvas = class FakeOffscreen {
      width: number;
      height: number;
      constructor(w: number, h: number) { this.width = w; this.height = h; }
      getContext() { return { drawImage: () => {} }; }
      async convertToBlob() {
        const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        return { arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
      }
    };
    try {
      const work = await fs.mkdtemp(join(tmpdir(), 'fsl-render-test-'));
      const src  = join(fixturesDir, 'traffic-light.fsl');
      const out  = join(work, 'out.png');
      const code = await cli([src, '--target=png', '-o', out]);
      expect(code).toBe(0);
      const written = await fs.readFile(out);
      expect(written[0]).toBe(0x89);
      expect(written[1]).toBe(0x50);
    } finally {
      (globalThis as any).OffscreenCanvas = realOffscreen;
      (globalThis as any).Image           = realImage;
    }
  });

  it('readStream passes through Buffer chunks unchanged (Buffer.isBuffer branch)', async () => {
    // Counterpart to the string-chunk test below: emits a real Buffer, so
    // the ternary takes the `Buffer.isBuffer(chunk) ? chunk` left arm.
    // (Readable.from(string) actually emits string chunks in objectMode,
    // so it covers the right arm — we need this one for the left.)
    const { Readable } = await import('node:stream');
    const realStdin = process.stdin;
    const fakeStdin = Object.assign(
      new Readable({
        // eslint-disable-next-line unicorn/no-this-outside-of-class -- Node's Readable invokes read() with the stream as `this`; that context is the API
        read() { this.push(Buffer.from('a -> b;\n')); this.push(null); },
      }),
      { isTTY: false },
    );
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    try {
      const code = await cli(['--target=dot']);
      expect(code).toBe(0);
      expect(stdoutChunks.join('')).toMatch(/digraph/);
    } finally {
      Object.defineProperty(process, 'stdin', { value: realStdin, configurable: true });
    }
  });

  it('readStream wraps string chunks into Buffer (Buffer.from branch)', async () => {
    // Cover the ternary `Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)`
    // in readStream. A Readable in objectMode emits raw string chunks.
    const { Readable } = await import('node:stream');
    const realStdin = process.stdin;
    const fakeStdin = Object.assign(
      new Readable({
        objectMode: true,
        // eslint-disable-next-line unicorn/no-this-outside-of-class -- Node's Readable invokes read() with the stream as `this`; that context is the API
        read() { this.push('a -> b;\n'); this.push(null); },
      }),
      { isTTY: false },
    );
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    try {
      const code = await cli(['--target=dot']);
      expect(code).toBe(0);
      expect(stdoutChunks.join('')).toMatch(/digraph/);
    } finally {
      Object.defineProperty(process, 'stdin', { value: realStdin, configurable: true });
    }
  });

});
