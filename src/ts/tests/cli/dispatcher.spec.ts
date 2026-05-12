import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { resolve, join } from 'path';
import {
  findPluginOnPath,
  isInProcessEligible,
  invokeInProcess,
  invokeBySpawn,
} from '../../cli/dispatcher';

const fixturePluginsDir = resolve(__dirname, 'fixtures/plugins');

describe('dispatcher: findPluginOnPath', () => {

  it('returns null when the plugin name is not on PATH', async () => {
    const found = await findPluginOnPath('definitely-not-a-real-plugin-xyz', '/no/such/dir');
    expect(found).toBeNull();
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

});

describe('dispatcher: invokeBySpawn', () => {

  it('spawns a Node subprocess and returns its exit code', async () => {
    const node = process.execPath;
    const args = ['-e', 'console.log("spawned hi"); process.exit(0)'];
    const code = await invokeBySpawn(node, args);
    expect(code).toBe(0);
  });

  it('returns subprocess non-zero exit', async () => {
    const node = process.execPath;
    const args = ['-e', 'process.exit(4)'];
    const code = await invokeBySpawn(node, args);
    expect(code).toBe(4);
  });

});
