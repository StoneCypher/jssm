import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pw = require('../publish_workspaces.cjs');

// Tests here cover two layers. First, the PURE, side-effect-free logic:
// publish ordering + skip-guard planning, the file:-dependency
// rewrite/restore text transform (both directions), publish-argv
// construction, and the unpublished/no-matching-version stderr classifier.
// Second, publishMember's rewrite-publish-restore orchestration, exercised
// against a temp-dir manifest fixture through its injectable collaborators
// (publish/cwd/write_file) — including the restore-under-thrown-publish and
// restore-double-fault regression paths — with no child_process and no npm
// spawn ever reachable. The remaining live plumbing (isVersionPublished,
// runNpmPublish, publishRoot, main) is exercised for real only by a live
// `--dry-run` run, exactly like verify_version_bump.cjs's own
// getPublishedVersion/main are left to CI rather than unit-tested.

describe('PUBLISH_ORDER', () => {

  test('is the root package followed by the three workspace members, in dependency order', () => {
    expect(pw.PUBLISH_ORDER).toEqual(['jssm', 'jssm-viz', 'jssm-fence', 'jssm-cli']);
  });

});

describe('assertPublishOrderCoverage — PUBLISH_ORDER coverage guard', () => {

  test('the real packages/* members are all covered by the real PUBLISH_ORDER (non-vacuity: this is exactly the current repo shape)', () => {
    expect(() => pw.assertPublishOrderCoverage(['jssm-viz', 'jssm-fence', 'jssm-cli'])).not.toThrow();
  });

  test('a workspace member with no PUBLISH_ORDER slot throws, naming it', () => {
    expect(() => pw.assertPublishOrderCoverage(['jssm-viz', 'jssm-new-package'])).toThrow(/"jssm-new-package"/);
  });

  test('the thrown message names PUBLISH_ORDER, so the fix is discoverable from the error alone', () => {
    expect(() => pw.assertPublishOrderCoverage(['jssm-new-package'])).toThrow(/PUBLISH_ORDER/);
  });

  test('multiple missing members are all named, with pluralized wording', () => {
    let caught: Error | undefined;
    try { pw.assertPublishOrderCoverage(['jssm-new-a', 'jssm-new-b']); } catch (e) { caught = e as Error; }
    expect(caught).toBeDefined();
    expect(caught!.message).toContain('"jssm-new-a"');
    expect(caught!.message).toContain('"jssm-new-b"');
    expect(caught!.message).toContain('have no entry');
  });

  test('a single missing member uses singular wording', () => {
    expect(() => pw.assertPublishOrderCoverage(['jssm-new-package'])).toThrow(/has no entry/);
  });

  test('an empty resolved set never throws (nothing to cover)', () => {
    expect(() => pw.assertPublishOrderCoverage([])).not.toThrow();
  });

  test('an explicit publish_order argument overrides PUBLISH_ORDER itself', () => {
    expect(() => pw.assertPublishOrderCoverage(['a', 'b'], ['a', 'b', 'c'])).not.toThrow();
    expect(() => pw.assertPublishOrderCoverage(['a', 'd'], ['a', 'b', 'c'])).toThrow(/"d"/);
  });

});

describe('resolveWorkspaceDirNames', () => {

  test('resolves packages/* via the injected directory lister', () => {
    const names = pw.resolveWorkspaceDirNames({ workspaces: ['packages/*'] }, () => ['jssm-viz', 'jssm-fence', 'jssm-cli']);
    expect(names).toEqual(['jssm-cli', 'jssm-fence', 'jssm-viz']);
  });

  test('no workspaces field resolves to no packages', () => {
    expect(pw.resolveWorkspaceDirNames({ name: 'jssm' }, () => [])).toEqual([]);
  });

  test('a glob that resolves to nothing on disk yields no packages (no DEFAULT_WORKSPACE_PACKAGES fallback here)', () => {
    expect(pw.resolveWorkspaceDirNames({ workspaces: ['packages/*'] }, () => [])).toEqual([]);
  });

});

describe('expandWorkspacePattern', () => {

  test('a literal path (no wildcard) yields its own basename', () => {
    expect(pw.expandWorkspacePattern('packages/jssm-cli', () => { throw new Error('must not list dir'); })).toEqual(['jssm-cli']);
  });

  test('a trailing /* wildcard lists the base directory', () => {
    const names = pw.expandWorkspacePattern('packages/*', (dir: string) => {
      expect(dir).toBe('packages');
      return ['jssm-viz', 'jssm-fence', 'jssm-cli'];
    });
    expect(names).toEqual(['jssm-viz', 'jssm-fence', 'jssm-cli']);
  });

});

describe('manifestPathFor', () => {

  test('the root package resolves to the repo-root manifest', () => {
    expect(pw.manifestPathFor('jssm')).toBe('./package.json');
  });

  test('a workspace member resolves under packages/<name>', () => {
    expect(pw.manifestPathFor('jssm-viz')).toBe(require('node:path').join('packages', 'jssm-viz', 'package.json'));
    expect(pw.manifestPathFor('jssm-fence')).toBe(require('node:path').join('packages', 'jssm-fence', 'package.json'));
    expect(pw.manifestPathFor('jssm-cli')).toBe(require('node:path').join('packages', 'jssm-cli', 'package.json'));
  });

});

describe('planPublishes', () => {

  const PACKAGES = [
    { name: 'jssm',       version: '6.0.0-alpha.12' },
    { name: 'jssm-viz',   version: '6.0.0-alpha.12' },
    { name: 'jssm-fence', version: '6.0.0-alpha.12' },
    { name: 'jssm-cli',   version: '6.0.0-alpha.12' },
  ];

  test('preserves input order in the returned plan', () => {
    const plan = pw.planPublishes(PACKAGES, () => false);
    expect(plan.map((p: { name: string }) => p.name)).toEqual(['jssm', 'jssm-viz', 'jssm-fence', 'jssm-cli']);
  });

  test('every package publishes when none are already published', () => {
    const plan = pw.planPublishes(PACKAGES, () => false);
    expect(plan.every((p: { action: string }) => p.action === 'publish')).toBe(true);
  });

  test('a package already published at its exact version is skipped', () => {
    const isPublished = ({ name }: { name: string }) => name === 'jssm-viz';
    const plan = pw.planPublishes(PACKAGES, isPublished);
    const byName = Object.fromEntries(plan.map((p: { name: string; action: string }) => [p.name, p.action]));
    expect(byName['jssm-viz']).toBe('skip');
    expect(byName['jssm']).toBe('publish');
    expect(byName['jssm-fence']).toBe('publish');
    expect(byName['jssm-cli']).toBe('publish');
  });

  test('all-published short-circuits to an all-skip plan', () => {
    const plan = pw.planPublishes(PACKAGES, () => true);
    expect(plan.every((p: { action: string }) => p.action === 'skip')).toBe(true);
  });

  test('every plan entry names its package and version in the reason', () => {
    const plan = pw.planPublishes(PACKAGES, () => false);
    for (const entry of plan as Array<{ name: string; version: string; reason: string }>) {
      expect(entry.reason).toContain(entry.name);
      expect(entry.reason).toContain(entry.version);
    }
  });

  test('isPublished is called with the exact {name, version} pair, not just the name', () => {
    const seen: Array<{ name: string; version: string }> = [];
    pw.planPublishes(PACKAGES, (pkg: { name: string; version: string }) => { seen.push(pkg); return false; });
    expect(seen).toEqual(PACKAGES);
  });

});

describe('allSkipped', () => {

  test('true when every entry is a skip', () => {
    expect(pw.allSkipped([{ action: 'skip' }, { action: 'skip' }])).toBe(true);
  });

  test('false when any entry needs a publish', () => {
    expect(pw.allSkipped([{ action: 'skip' }, { action: 'publish' }])).toBe(false);
  });

  test('an empty plan counts as all-skipped (nothing to do)', () => {
    expect(pw.allSkipped([])).toBe(true);
  });

});

describe('buildPublishArgs', () => {

  test('the root package publishes bare (no -w)', () => {
    const args = pw.buildPublishArgs('jssm', false);
    expect(args).toEqual(['publish', '--provenance', '--access', 'public']);
  });

  test('a workspace member publishes with -w <name>', () => {
    const args = pw.buildPublishArgs('jssm-viz', false);
    expect(args).toEqual(['publish', '--provenance', '--access', 'public', '-w', 'jssm-viz']);
  });

  test('--dry-run is appended last, for both root and members', () => {
    expect(pw.buildPublishArgs('jssm', true)).toEqual(['publish', '--provenance', '--access', 'public', '--dry-run']);
    expect(pw.buildPublishArgs('jssm-cli', true)).toEqual(['publish', '--provenance', '--access', 'public', '-w', 'jssm-cli', '--dry-run']);
  });

});

describe('isUnpublishedVersionError — classifies "not there yet" vs. real failures', () => {

  test('a plain E404 (package name never published) counts as unpublished', () => {
    expect(pw.isUnpublishedVersionError('npm error code E404\nnpm error 404 Not Found')).toBe(true);
  });

  test('a "not in this registry" 404 counts as unpublished', () => {
    expect(pw.isUnpublishedVersionError("npm error 404 'jssm-cli@*' is not in this registry.")).toBe(true);
  });

  test('ETARGET (package exists, exact version does not) ALSO counts as unpublished', () => {
    // This is the case that matters for "jssm" itself: the root package has
    // been on npm for years, so checking one specific not-yet-released
    // version resolves to ETARGET/"no matching version", never E404. If this
    // were misclassified as a hard failure, the root package could never be
    // released via this guard.
    expect(pw.isUnpublishedVersionError('npm error code ETARGET\nnpm error notarget No matching version found for jssm@6.0.0-alpha.12.')).toBe(true);
  });

  test('a bare "No matching version found" message counts as unpublished', () => {
    expect(pw.isUnpublishedVersionError('No matching version found for jssm@9.9.9.')).toBe(true);
  });

  test('a network failure is NOT treated as unpublished', () => {
    expect(pw.isUnpublishedVersionError('npm error code ETIMEDOUT\nnpm error network request failed')).toBe(false);
  });

  test('an auth failure is NOT treated as unpublished', () => {
    expect(pw.isUnpublishedVersionError('npm error code E401\nnpm error need auth')).toBe(false);
  });

});

// ---------------------------------------------------------------------------
// rewriteDependencyValue — the manifest rewrite/restore text transform.
// Pure, no fs. Exercised in BOTH directions: rewrite (file:../.. -> exact
// version, for publish) and restore (exact version -> file:../.., after
// publish). The same function drives both, since restoring is just rewriting
// toward a different target value.
// ---------------------------------------------------------------------------

const VIZ_MANIFEST = [
  '{',
  '  "name": "jssm-viz",',
  '  "version": "6.0.0-alpha.12",',
  '  "dependencies": { "jssm": "file:../.." },',
  '  "optionalDependencies": { "@viz-js/viz": "^3.26.0" }',
  '}',
  '',
].join('\n');

const FENCE_MANIFEST = [
  '{',
  '  "name": "jssm-fence",',
  '  "version": "6.0.0-alpha.12",',
  '  "dependencies": { "jssm": "file:../..", "jssm-viz": "6.0.0-alpha.12" },',
  '  "optionalDependencies": { "@resvg/resvg-wasm": "^2.6.0" }',
  '}',
  '',
].join('\n');

const CLI_MANIFEST = [
  '{',
  '  "name": "jssm-cli",',
  '  "version": "6.0.0-alpha.12",',
  '  "dependencies": { "jssm": "file:../..", "jssm-viz": "6.0.0-alpha.12", "jssm-fence": "6.0.0-alpha.12" }',
  '}',
  '',
].join('\n');

describe('rewriteDependencyValue', () => {

  test('rewrites "jssm": "file:../.." to the exact publish version', () => {
    const out = pw.rewriteDependencyValue(VIZ_MANIFEST, 'jssm', '6.0.0-alpha.12');
    expect(out).toContain('"jssm": "6.0.0-alpha.12"');
    expect(out).not.toContain('file:../..');
  });

  test('preserves every other byte: 2-space indent, trailing newline, compact inline dependencies', () => {
    const out = pw.rewriteDependencyValue(FENCE_MANIFEST, 'jssm', '6.0.0-alpha.12');
    expect(out).toBe([
      '{',
      '  "name": "jssm-fence",',
      '  "version": "6.0.0-alpha.12",',
      '  "dependencies": { "jssm": "6.0.0-alpha.12", "jssm-viz": "6.0.0-alpha.12" },',
      '  "optionalDependencies": { "@resvg/resvg-wasm": "^2.6.0" }',
      '}',
      '',
    ].join('\n'));
  });

  test('does not touch a sibling pin (jssm-viz) alongside the jssm rewrite', () => {
    const out = pw.rewriteDependencyValue(CLI_MANIFEST, 'jssm', '6.0.0-alpha.12');
    expect(out).toContain('"jssm-viz": "6.0.0-alpha.12"');
    expect(out).toContain('"jssm-fence": "6.0.0-alpha.12"');
  });

  test('restore direction: rewriting the version back to file:../.. reconstructs the original text exactly', () => {
    const rewritten = pw.rewriteDependencyValue(FENCE_MANIFEST, 'jssm', '6.0.0-alpha.12'),
          restored   = pw.rewriteDependencyValue(rewritten, 'jssm', 'file:../..');
    expect(restored).toBe(FENCE_MANIFEST);
  });

  test('round-trips cleanly for every fixture manifest shape (viz/fence/cli)', () => {
    for (const original of [VIZ_MANIFEST, FENCE_MANIFEST, CLI_MANIFEST]) {
      const rewritten = pw.rewriteDependencyValue(original, 'jssm', '6.0.0-alpha.13'),
            restored   = pw.rewriteDependencyValue(rewritten, 'jssm', 'file:../..');
      expect(restored).toBe(original);
    }
  });

  test('is a no-op (returns the text unchanged) when the key is absent from dependencies', () => {
    const NO_JSSM_DEP = [
      '{',
      '  "name": "standalone",',
      '  "dependencies": { "left-pad": "^1.0.0" }',
      '}',
      '',
    ].join('\n');
    expect(pw.rewriteDependencyValue(NO_JSSM_DEP, 'jssm', '6.0.0-alpha.12')).toBe(NO_JSSM_DEP);
  });

  test('only touches the "dependencies" object, never a same-named key elsewhere in the manifest', () => {
    const DECOY = [
      '{',
      '  "name": "decoy",',
      '  "dependencies": { "jssm": "file:../.." },',
      '  "devDependencies": { "jssm": "^1.0.0" }',
      '}',
      '',
    ].join('\n');
    const out = pw.rewriteDependencyValue(DECOY, 'jssm', '6.0.0-alpha.12');
    expect(out).toContain('"dependencies": { "jssm": "6.0.0-alpha.12" }');
    expect(out).toContain('"devDependencies": { "jssm": "^1.0.0" }');
  });

});

// ---------------------------------------------------------------------------
// publishMember — rewrite-publish-restore orchestration, against a temp-dir
// manifest fixture via the injectable publish/cwd/write_file collaborators.
// These are the restore-under-failure regression tests: a publish failure
// must leave the manifest byte-identical to its original, and a restore
// failure must never silently swallow a publish failure (the double fault).
// ---------------------------------------------------------------------------

/** Writes a fixture member manifest (`packages/<name>/package.json`) into a fresh temp dir and returns the dir. */
function fixtureMember(name: string, text: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'jssm-publish-'));
  const pkg_dir = join(dir, 'packages', name);
  mkdirSync(pkg_dir, { recursive: true });
  writeFileSync(join(pkg_dir, 'package.json'), text);
  return dir;
}

describe('publishMember — restore-under-failure regressions', () => {

  let log_spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => { log_spy = vi.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { log_spy.mockRestore(); });

  test('a successful publish sees the REWRITTEN manifest, and the original bytes are restored afterward', () => {

    const dir = fixtureMember('jssm-fence', FENCE_MANIFEST);
    const manifest_path = join(dir, 'packages', 'jssm-fence', 'package.json');

    let seen_during_publish = '';

    pw.publishMember('jssm-fence', '6.0.0-alpha.12', true, {
      cwd     : dir,
      publish : () => { seen_during_publish = readFileSync(manifest_path, 'utf8'); },
    });

    expect(seen_during_publish).toContain('"jssm": "6.0.0-alpha.12"');
    expect(seen_during_publish).not.toContain('file:../..');
    expect(readFileSync(manifest_path, 'utf8')).toBe(FENCE_MANIFEST);

    rmSync(dir, { recursive: true, force: true });

  });

  test('a thrown publish failure restores the manifest byte-identically AND propagates the original error unchanged', () => {

    const dir = fixtureMember('jssm-viz', VIZ_MANIFEST);
    const manifest_path = join(dir, 'packages', 'jssm-viz', 'package.json');
    const publish_failure = new Error('npm publish exploded');

    let caught: unknown;

    try {
      pw.publishMember('jssm-viz', '6.0.0-alpha.12', true, {
        cwd     : dir,
        publish : () => { throw publish_failure; },
      });
    } catch (e) { caught = e; }

    expect(caught).toBe(publish_failure);
    expect(readFileSync(manifest_path, 'utf8')).toBe(VIZ_MANIFEST);

    rmSync(dir, { recursive: true, force: true });

  });

  test('a manifest with no jssm dependency throws BEFORE any write: manifest untouched, publish never invoked', () => {

    const NO_JSSM_DEP = [
      '{',
      '  "name": "jssm-viz",',
      '  "version": "6.0.0-alpha.12",',
      '  "dependencies": { "left-pad": "^1.0.0" }',
      '}',
      '',
    ].join('\n');

    const dir = fixtureMember('jssm-viz', NO_JSSM_DEP);
    const manifest_path = join(dir, 'packages', 'jssm-viz', 'package.json');

    let publish_invoked = false;
    let write_invoked = false;

    expect(() => pw.publishMember('jssm-viz', '6.0.0-alpha.12', true, {
      cwd        : dir,
      publish    : () => { publish_invoked = true; },
      write_file : () => { write_invoked = true; },
    })).toThrow(/expected a "jssm": "file:\.\.\/\.\." dependency/);

    expect(publish_invoked).toBe(false);
    expect(write_invoked).toBe(false);
    expect(readFileSync(manifest_path, 'utf8')).toBe(NO_JSSM_DEP);

    rmSync(dir, { recursive: true, force: true });

  });

  test('publish ok but restore write fails: a restore error naming the manifest path propagates, with the write failure as its cause', () => {

    const dir = fixtureMember('jssm-viz', VIZ_MANIFEST);
    const manifest_path = join(dir, 'packages', 'jssm-viz', 'package.json');
    const disk_full = new Error('disk full');

    let write_calls = 0;
    const write_file = (p: string, text: string) => {
      write_calls += 1;
      if (write_calls === 2) { throw disk_full; }   // first call = rewrite, second = restore
      writeFileSync(p, text);
    };

    let caught: Error | undefined;

    try {
      pw.publishMember('jssm-viz', '6.0.0-alpha.12', true, { cwd: dir, publish: () => undefined, write_file });
    } catch (e) { caught = e as Error; }

    expect(caught).toBeDefined();
    expect(caught!.message).toContain('restoring');
    expect(caught!.message).toContain(manifest_path);
    expect(caught!.message).toContain('manual recovery');
    expect(caught!.cause).toBe(disk_full);

    // and the manifest really is left rewritten — the state the message warns about
    expect(readFileSync(manifest_path, 'utf8')).toContain('"jssm": "6.0.0-alpha.12"');

    rmSync(dir, { recursive: true, force: true });

  });

  test('double fault: publish fails AND restore fails — one error carries BOTH on its cause, and both are logged', () => {

    const dir = fixtureMember('jssm-viz', VIZ_MANIFEST);
    const manifest_path = join(dir, 'packages', 'jssm-viz', 'package.json');
    const publish_failure = new Error('npm publish exploded');
    const disk_full = new Error('disk full');

    let write_calls = 0;
    const write_file = (p: string, text: string) => {
      write_calls += 1;
      if (write_calls === 2) { throw disk_full; }
      writeFileSync(p, text);
    };

    let caught: Error | undefined;

    try {
      pw.publishMember('jssm-viz', '6.0.0-alpha.12', true, {
        cwd     : dir,
        publish : () => { throw publish_failure; },
        write_file,
      });
    } catch (e) { caught = e as Error; }

    expect(caught).toBeDefined();
    expect(caught!.message).toContain('publish failed AND restoring');
    expect(caught!.message).toContain(manifest_path);
    expect(caught!.message).toContain('manual recovery');

    const cause = caught!.cause as { publish_error: Error; restore_error: Error };
    expect(cause.publish_error).toBe(publish_failure);
    expect(cause.restore_error).toBe(disk_full);

    const logged = log_spy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logged).toContain('RESTORE FAILED');
    expect(logged).toContain('npm publish exploded');
    expect(logged).toContain('disk full');

    rmSync(dir, { recursive: true, force: true });

  });

});
