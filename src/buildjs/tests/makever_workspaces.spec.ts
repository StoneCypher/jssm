// Unit tests for src/buildjs/makever.cjs's workspace-manifest stamping — the
// logic that propagates the root package's lockstep version (and each
// sibling workspace package's dependency pin) into every
// packages/*/package.json, so /sc-commit's single root version bump reaches
// every workspace manifest with no second bump mechanism. Covers the pure
// text-rewriting core directly (exact formatting assertions, no fs) and the
// disk-touching orchestrator through a temp-dir fixture (idempotency and the
// "never touch the file: dep" invariant) — no child_process, nothing written
// outside the fixture's own temp dir.

import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const makever = require('../makever.cjs');

/** Writes a fixture workspace tree (`packages/<name>/package.json` per entry) into a fresh temp dir and returns the dir. */
function fixtureWorkspace(packages: Record<string, string>): string {

  const dir = mkdtempSync(join(tmpdir(), 'jssm-makever-'));

  for (const [name, text] of Object.entries(packages)) {
    const pkg_dir = join(dir, 'packages', name);
    mkdirSync(pkg_dir, { recursive: true });
    writeFileSync(join(pkg_dir, 'package.json'), text);
  }

  return dir;

}

/** A minimal root package.json body, as `stampWorkspaceManifests` expects it. */
const rootPkg = (version: string) => ({ name: 'jssm', version, workspaces: ['packages/*'] });

const VIZ_ALPHA_11 = [
  '{',
  '  "name": "jssm-viz",',
  '  "version": "6.0.0-alpha.11",',
  '  "dependencies": { "jssm": "file:../.." },',
  '  "optionalDependencies": { "@viz-js/viz": "^3.26.0" }',
  '}',
  '',
].join('\n');

const FENCE_ALPHA_11 = [
  '{',
  '  "name": "jssm-fence",',
  '  "version": "6.0.0-alpha.11",',
  '  "dependencies": { "jssm": "file:../..", "jssm-viz": "6.0.0-alpha.11" },',
  '  "optionalDependencies": { "@resvg/resvg-wasm": "^2.6.0" }',
  '}',
  '',
].join('\n');

describe('stampWorkspaceManifests', () => {

  test('rewrites version and sibling pins to the root version', () => {

    const dir = fixtureWorkspace({ 'jssm-viz': VIZ_ALPHA_11, 'jssm-fence': FENCE_ALPHA_11 }),
          stamped = makever.stampWorkspaceManifests(rootPkg('6.0.0-alpha.12'), { cwd: dir });

    expect(stamped.length).toBe(2);

    const viz = JSON.parse(readFileSync(join(dir, 'packages/jssm-viz/package.json'), 'utf8')),
          fence = JSON.parse(readFileSync(join(dir, 'packages/jssm-fence/package.json'), 'utf8'));

    expect(viz.version).toBe('6.0.0-alpha.12');
    expect(fence.version).toBe('6.0.0-alpha.12');
    expect(fence.dependencies['jssm-viz']).toBe('6.0.0-alpha.12');

    rmSync(dir, { recursive: true, force: true });

  });

  test('never touches the "jssm": "file:../.." root dependency', () => {

    const dir = fixtureWorkspace({ 'jssm-viz': VIZ_ALPHA_11, 'jssm-fence': FENCE_ALPHA_11 });

    makever.stampWorkspaceManifests(rootPkg('6.0.0-alpha.12'), { cwd: dir });

    const fenceText = readFileSync(join(dir, 'packages/jssm-fence/package.json'), 'utf8'),
          vizText = readFileSync(join(dir, 'packages/jssm-viz/package.json'), 'utf8');

    expect(fenceText).toContain('"jssm": "file:../.."');
    expect(vizText).toContain('"jssm": "file:../.."');

    rmSync(dir, { recursive: true, force: true });

  });

  test('preserves 2-space indent, trailing newline, and the compact inline dependencies formatting', () => {

    const dir = fixtureWorkspace({ 'jssm-viz': VIZ_ALPHA_11, 'jssm-fence': FENCE_ALPHA_11 });

    makever.stampWorkspaceManifests(rootPkg('6.0.0-alpha.12'), { cwd: dir });

    const text = readFileSync(join(dir, 'packages/jssm-fence/package.json'), 'utf8');

    expect(text).toBe([
      '{',
      '  "name": "jssm-fence",',
      '  "version": "6.0.0-alpha.12",',
      '  "dependencies": { "jssm": "file:../..", "jssm-viz": "6.0.0-alpha.12" },',
      '  "optionalDependencies": { "@resvg/resvg-wasm": "^2.6.0" }',
      '}',
      '',
    ].join('\n'));

    rmSync(dir, { recursive: true, force: true });

  });

  test('idempotent: a second run at the same version writes nothing', () => {

    const dir = fixtureWorkspace({ 'jssm-viz': VIZ_ALPHA_11, 'jssm-fence': FENCE_ALPHA_11 });

    makever.stampWorkspaceManifests(rootPkg('6.0.0-alpha.12'), { cwd: dir });

    const fence_path = join(dir, 'packages/jssm-fence/package.json'),
          text_after_first_run = readFileSync(fence_path, 'utf8'),
          stamped_second_run = makever.stampWorkspaceManifests(rootPkg('6.0.0-alpha.12'), { cwd: dir });

    expect(stamped_second_run).toEqual([]);
    expect(readFileSync(fence_path, 'utf8')).toBe(text_after_first_run);

    rmSync(dir, { recursive: true, force: true });

  });

  test('a tree already at the root version is left completely untouched (byte-identical, no gratuitous write)', () => {

    const already = FENCE_ALPHA_11.replace(/6\.0\.0-alpha\.11/g, '6.0.0-alpha.12'),
          dir = fixtureWorkspace({ 'jssm-fence': already }),
          stamped = makever.stampWorkspaceManifests(rootPkg('6.0.0-alpha.12'), { cwd: dir });

    expect(stamped).toEqual([]);
    expect(readFileSync(join(dir, 'packages/jssm-fence/package.json'), 'utf8')).toBe(already);

    rmSync(dir, { recursive: true, force: true });

  });

});

describe('stampWorkspaceManifestText (pure, no fs)', () => {

  test('rewrites only the targeted fields', () => {
    const out = makever.stampWorkspaceManifestText(FENCE_ALPHA_11, '6.0.0-alpha.12', ['jssm-viz']);
    expect(out).toContain('"version": "6.0.0-alpha.12"');
    expect(out).toContain('"jssm-viz": "6.0.0-alpha.12"');
    expect(out).toContain('"jssm": "file:../.."');
  });

  test('leaves an already-correct text byte-identical', () => {
    const already = FENCE_ALPHA_11.replace(/6\.0\.0-alpha\.11/g, '6.0.0-alpha.12');
    expect(makever.stampWorkspaceManifestText(already, '6.0.0-alpha.12', ['jssm-viz'])).toBe(already);
  });

  test('a sibling name absent from dependencies is left alone', () => {
    const out = makever.stampWorkspaceManifestText(VIZ_ALPHA_11, '6.0.0-alpha.12', ['jssm-fence', 'jssm-cli']);
    expect(out).toContain('"version": "6.0.0-alpha.12"');
    expect(out).toContain('"jssm": "file:../.."');
    expect(out).not.toContain('jssm-fence');
    expect(out).not.toContain('jssm-cli');
  });

});

describe('resolveWorkspaceDirNames', () => {

  test('resolves packages/* via the injected directory lister', () => {
    const names = makever.resolveWorkspaceDirNames({ workspaces: ['packages/*'] }, () => ['jssm-viz', 'jssm-fence', 'jssm-cli']);
    expect(names).toEqual(['jssm-cli', 'jssm-fence', 'jssm-viz']);
  });

  test('no workspaces field resolves to no packages', () => {
    expect(makever.resolveWorkspaceDirNames({ name: 'jssm' }, () => [])).toEqual([]);
  });

});
