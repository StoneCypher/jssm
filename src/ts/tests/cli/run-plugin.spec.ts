import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { cli } from '../../cli/subcommands/run/plugin';
import { source_hash } from '../../fsl_hash';

const DOC = "a 'go' -> b;";
const tapeLines = (...lines: string[]) => ['{"fsl_tape":1,"machine":{}}', ...lines].join('\n');

async function work(): Promise<string> {
  return fs.mkdtemp(join(tmpdir(), 'fsl-run-test-'));
}

describe('fsl-run plugin cli()', () => {
  let stdout: string[];
  let stderr: string[];
  let realOut: typeof process.stdout.write;
  let realErr: typeof process.stderr.write;

  beforeEach(() => {
    stdout = []; stderr = [];
    realOut = process.stdout.write.bind(process.stdout);
    realErr = process.stderr.write.bind(process.stderr);
    (process.stdout as any).write = (c: any) => { stdout.push(String(c)); return true; };
    (process.stderr as any).write = (c: any) => { stderr.push(String(c)); return true; };
  });
  afterEach(() => {
    (process.stdout as any).write = realOut;
    (process.stderr as any).write = realErr;
  });

  it('--help prints usage and exits 0', async () => {
    expect(await cli(['--help'])).toBe(0);
    expect(stdout.join('')).toContain('Usage:');
  });

  it('reports an unknown flag as exit 1', async () => {
    expect(await cli(['--definitely-not-real'])).toBe(1);
    expect(stderr.join('')).toMatch(/fsl-run:/);
  });

  it('errors with exit 1 when no positional is given', async () => {
    expect(await cli([])).toBe(1);
    expect(stderr.join('')).toMatch(/need a tape/);
  });

  it('replays doc + tape and prints a human summary (exit 0)', async () => {
    const w = await work();
    const doc = join(w, 'm.fsl'); const tape = join(w, 'r.jsonl');
    await fs.writeFile(doc, DOC); await fs.writeFile(tape, tapeLines('{"op":"action","name":"go"}'));
    expect(await cli([doc, tape])).toBe(0);
    const s = stdout.join('');
    expect(s).toContain('state: b');
    expect(s).toMatch(/1 stimuli \(1 accepted, 0 rejected\)/);
  });

  it('--json emits the structured result', async () => {
    const w = await work();
    const doc = join(w, 'm.fsl'); const tape = join(w, 'r.jsonl');
    await fs.writeFile(doc, DOC); await fs.writeFile(tape, tapeLines('{"op":"action","name":"go"}'));
    expect(await cli([doc, tape, '--json'])).toBe(0);
    expect(JSON.parse(stdout.join('')).final_state).toBe('b');
  });

  it('--trace lists each step, including rejected ones', async () => {
    const w = await work();
    const doc = join(w, 'm.fsl'); const tape = join(w, 'r.jsonl');
    await fs.writeFile(doc, DOC);
    // first 'go' moves a->b (accepted); the second 'go' from b has no edge (rejected)
    await fs.writeFile(tape, tapeLines('{"op":"action","name":"go"}', '{"op":"action","name":"go"}'));
    expect(await cli([doc, tape, '--trace'])).toBe(0);
    const s = stdout.join('');
    expect(s).toContain('[0] action go -> accepted');
    expect(s).toContain('[1] action go -> rejected');
  });

  it('--out writes the result to a file', async () => {
    const w = await work();
    const doc = join(w, 'm.fsl'); const tape = join(w, 'r.jsonl'); const out = join(w, 'out.json');
    await fs.writeFile(doc, DOC); await fs.writeFile(tape, tapeLines('{"op":"action","name":"go"}'));
    expect(await cli([doc, tape, '--json', '--out', out])).toBe(0);
    expect(stdout.join('')).toBe('');
    expect(JSON.parse(await fs.readFile(out, 'utf8')).final_state).toBe('b');
  });

  it('replays a bundled tape without a separate doc', async () => {
    const w = await work();
    const tape = join(w, 'r.jsonl');
    await fs.writeFile(tape, ['{"fsl_tape":1,"machine":{"source":"a \'go\' -> b;"}}',
                              '{"op":"action","name":"go"}'].join('\n'));
    expect(await cli([tape])).toBe(0);
    expect(stdout.join('')).toContain('state: b');
  });

  it('returns 1 when the tape cannot be read', async () => {
    expect(await cli([join(await work(), 'nope.jsonl')])).toBe(1);
    expect(stderr.join('')).toMatch(/cannot read/);
  });

  it('maps a malformed tape to its exit code', async () => {
    const w = await work();
    const tape = join(w, 'bad.jsonl');
    await fs.writeFile(tape, 'not json');
    expect(await cli([tape])).toBe(4);
    expect(stderr.join('')).toMatch(/fsl-run:/);
  });

  it('returns 1 when the tape is unbundled and no doc is given', async () => {
    const w = await work();
    const tape = join(w, 'r.jsonl');
    await fs.writeFile(tape, tapeLines('{"op":"action","name":"go"}'));
    expect(await cli([tape])).toBe(1);
    expect(stderr.join('')).toMatch(/not bundled/);
  });

  it('returns 1 when the doc cannot be read', async () => {
    const w = await work();
    const tape = join(w, 'r.jsonl');
    await fs.writeFile(tape, tapeLines('{"op":"action","name":"go"}'));
    expect(await cli([join(w, 'missing.fsl'), tape])).toBe(1);
    expect(stderr.join('')).toMatch(/cannot read/);
  });

  it('returns 2 when the FSL document fails to parse (non-ReplayError fallback)', async () => {
    const w = await work();
    const doc = join(w, 'bad.fsl'); const tape = join(w, 'r.jsonl');
    await fs.writeFile(doc, '@#$ not valid fsl %^&');
    await fs.writeFile(tape, tapeLines('{"op":"action","name":"go"}'));
    expect(await cli([doc, tape])).toBe(2);
    expect(stderr.join('')).toMatch(/fsl-run:/);
  });

  it('--trace renders a timer step with no name', async () => {
    const w = await work();
    const doc = join(w, 'm.fsl'); const tape = join(w, 'r.jsonl');
    await fs.writeFile(doc, 'a after 100 -> b;');
    await fs.writeFile(tape, tapeLines('{"op":"timer"}'));
    expect(await cli([doc, tape, '--trace'])).toBe(0);
    expect(stdout.join('')).toContain('[0] timer -> accepted');
  });

  it('maps a source_hash mismatch from replay to its exit code', async () => {
    const w = await work();
    const doc = join(w, 'm.fsl'); const tape = join(w, 'r.jsonl');
    await fs.writeFile(doc, DOC);
    await fs.writeFile(tape, ['{"fsl_tape":1,"machine":{"source_hash":"provisional:0000000000000000"}}',
                              '{"op":"action","name":"go"}'].join('\n'));
    expect(await cli([doc, tape])).toBe(6);
    expect(source_hash(DOC)).not.toBe('provisional:0000000000000000');
  });
});
