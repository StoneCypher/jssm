import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { extractSurface } from '../../cli/subcommands/codegen/surface';
import { emitNativeJavascript } from '../../cli/subcommands/codegen/targets/native-javascript';
import { emitNativeTypescript } from '../../cli/subcommands/codegen/targets/native-typescript';

const turnstile = "Locked 'coin' -> Unlocked 'push' -> Locked;";
const lonely    = 'a -> b;'; // no actions: every state has an empty action map

/**
 * Write generated JS to a temp `.mjs` and import it, returning the named
 * export. Importing the *actual generated source* and exercising it is what
 * makes these behavioral (not golden) tests.
 */
async function loadGenerated(source: string, symbol: string): Promise<any> {
  const dir  = await fs.mkdtemp(join(tmpdir(), 'fsl-codegen-test-'));
  const file = join(dir, `${symbol}.mjs`);
  await fs.writeFile(file, source, 'utf8');
  const mod = await import(pathToFileURL(file).href);
  return mod[symbol];
}

describe('emitNativeJavascript', () => {

  it('emits an ES module class with the requested symbol', () => {
    const src = emitNativeJavascript(extractSurface(turnstile), 'Turnstile');
    expect(src).toContain('export class Turnstile');
    expect(src).toContain("'coin': 'Unlocked'");
  });

  it('generates code that actually behaves like the source machine', async () => {
    const src = emitNativeJavascript(extractSurface(turnstile), 'Turnstile');
    const Turnstile = await loadGenerated(src, 'Turnstile');
    const m = new Turnstile();

    expect(m.state).toBe('Locked');
    expect(m.actions()).toEqual(['coin']);
    expect(m.can('coin')).toBe(true);
    expect(m.can('push')).toBe(false);

    expect(m.action('coin')).toBe(true);
    expect(m.state).toBe('Unlocked');
    expect(m.action('coin')).toBe(false);   // not fireable from Unlocked
    expect(m.action('push')).toBe(true);
    expect(m.state).toBe('Locked');

    expect(Turnstile.states).toEqual(['Locked', 'Unlocked']);
    expect(Turnstile.actions).toEqual(['coin', 'push']);
  });

  it('emits empty action maps for states with no outgoing named edges', async () => {
    const src = emitNativeJavascript(extractSurface(lonely), 'Lonely');
    expect(src).toContain("'a': {}");
    const Lonely = await loadGenerated(src, 'Lonely');
    const m = new Lonely();
    expect(m.actions()).toEqual([]);
    expect(m.can('anything')).toBe(false);
    expect(m.action('anything')).toBe(false);
    expect(m.state).toBe('a');
  });

  it('exposes final states via finals + isFinal()', async () => {
    const src = emitNativeJavascript(extractSurface("a 'go' -> b;"), 'Gate');
    const Gate = await loadGenerated(src, 'Gate');
    expect(Gate.finals).toContain('b');
    expect(Gate.finals).not.toContain('a');
    const m = new Gate();
    expect(m.isFinal()).toBe(false);   // starts at 'a'
    m.action('go');
    expect(m.state).toBe('b');
    expect(m.isFinal()).toBe(true);    // 'b' is terminal → final
  });

  it('surfaces eventless edges and advances via step()', async () => {
    const surface = extractSurface('a -> b;');
    expect(surface.eventless).toEqual([{ from: 'a', to: 'b' }]);
    const Auto = await loadGenerated(emitNativeJavascript(surface, 'Auto'), 'Auto');
    const m = new Auto();
    expect(m.state).toBe('a');
    expect(m.step()).toBe(true);
    expect(m.state).toBe('b');
    expect(m.step()).toBe(false);   // 'b' has no eventless edge
  });

});

describe('emitNativeTypescript', () => {

  it('emits exported State and Action union types and a class', () => {
    const src = emitNativeTypescript(extractSurface(turnstile), 'Turnstile');
    expect(src).toContain("export type TurnstileState = 'Locked' | 'Unlocked'");
    expect(src).toContain("export type TurnstileAction = 'coin' | 'push'");
    expect(src).toContain('export class Turnstile');
    expect(src).toContain('private current: TurnstileState');
  });

  it('emits `never` union members when there are no states or actions', () => {
    // An action-free machine still has states, but no actions → Action = never.
    const src = emitNativeTypescript(extractSurface(lonely), 'Lonely');
    expect(src).toContain('export type LonelyAction = never');
  });

  it('emits a typed empty transition map for action-less states', () => {
    const src = emitNativeTypescript(extractSurface(lonely), 'Lonely');
    expect(src).toContain("'a': {}");
  });

  it('surfaces final states and emits finals + isFinal()', () => {
    const surface = extractSurface("a 'go' -> b;");
    expect(surface.finals).toContain('b');
    expect(surface.finals).not.toContain('a');
    const src = emitNativeTypescript(surface, 'Gate');
    expect(src).toContain('isFinal(): boolean');
    expect(src).toContain('static readonly finals');
  });

});
