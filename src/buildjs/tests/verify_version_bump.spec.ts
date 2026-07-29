// Unit tests for src/buildjs/verify_version_bump.cjs — the release-gate
// script that CI's `verify-version-bump` job runs on every push. Tests cover
// the pure decision function, the lockstep assertion, the 404-detection
// helper, and the workspaces-glob expander (no filesystem, no child_process,
// no process.exit): the full CLI run (npm view + git tag) is exercised live
// by CI itself, never by this suite.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const vvb = require('../verify_version_bump.cjs');

describe('checkOnePackage', () => {

  test('greater local version passes', () => {
    const r = vvb.checkOnePackage('jssm', '6.0.1', '6.0.0');
    expect(r.pass).toBe(true);
  });

  test('equal versions fail (no bump)', () => {
    const r = vvb.checkOnePackage('jssm', '6.0.0', '6.0.0');
    expect(r.pass).toBe(false);
  });

  test('lesser local version fails (regression)', () => {
    const r = vvb.checkOnePackage('jssm', '5.9.0', '6.0.0');
    expect(r.pass).toBe(false);
  });

  test('unpublished (404, represented as null) passes as first publish', () => {
    const r = vvb.checkOnePackage('jssm-cli', '1.0.0', null);
    expect(r.pass).toBe(true);
    expect(r.message).toContain('jssm-cli');
  });

  test('invalid local version fails', () => {
    const r = vvb.checkOnePackage('jssm', 'not-a-version', '6.0.0');
    expect(r.pass).toBe(false);
  });

  test('invalid published version fails', () => {
    const r = vvb.checkOnePackage('jssm', '6.0.1', 'not-a-version');
    expect(r.pass).toBe(false);
  });

  test('message names the package in every branch', () => {
    for (const [local, published] of [['6.0.1', '6.0.0'], ['6.0.0', '6.0.0'], ['5.9.0', '6.0.0'], ['1.0.0', null]] as const) {
      expect(vvb.checkOnePackage('jssm-viz', local, published).message).toContain('jssm-viz');
    }
  });

});

describe('checkLockstep', () => {

  test('identical versions across all packages pass', () => {
    const r = vvb.checkLockstep([
      { name: 'jssm',       version: '6.0.1' },
      { name: 'jssm-viz',   version: '6.0.1' },
      { name: 'jssm-fence', version: '6.0.1' },
      { name: 'jssm-cli',   version: '6.0.1' },
    ]);
    expect(r.pass).toBe(true);
  });

  test('a single divergent package fails and is named', () => {
    const r = vvb.checkLockstep([
      { name: 'jssm',     version: '6.0.1' },
      { name: 'jssm-viz', version: '6.0.0' },
    ]);
    expect(r.pass).toBe(false);
    expect(r.message).toContain('jssm-viz');
  });

  test('root-only mode (single package) trivially passes', () => {
    const r = vvb.checkLockstep([{ name: 'jssm', version: '6.0.1' }]);
    expect(r.pass).toBe(true);
  });

});

describe('isUnpublishedError', () => {

  test('an E404 stderr counts as unpublished', () => {
    expect(vvb.isUnpublishedError('npm error code E404\nnpm error 404 Not Found')).toBe(true);
  });

  test('a "not in this registry" stderr counts as unpublished', () => {
    expect(vvb.isUnpublishedError("npm error 404 'jssm-cli@*' is not in this registry.")).toBe(true);
  });

  test('a network failure is NOT treated as unpublished', () => {
    expect(vvb.isUnpublishedError('npm error code ETIMEDOUT\nnpm error network request failed')).toBe(false);
  });

});

describe('expandWorkspacePattern', () => {

  test('a literal path (no wildcard) yields its own basename', () => {
    expect(vvb.expandWorkspacePattern('packages/jssm-cli', () => { throw new Error('must not list dir'); })).toEqual(['jssm-cli']);
  });

  test('a trailing /* wildcard lists the base directory', () => {
    const names = vvb.expandWorkspacePattern('packages/*', (dir: string) => {
      expect(dir).toBe('packages');
      return ['jssm-viz', 'jssm-fence', 'jssm-cli'];
    });
    expect(names).toEqual(['jssm-viz', 'jssm-fence', 'jssm-cli']);
  });

});

describe('resolveWorkspaceDirNames', () => {

  test('no workspaces field means root-only mode (null)', () => {
    expect(vvb.resolveWorkspaceDirNames({ name: 'jssm', version: '6.0.0' }, () => [])).toBeNull();
  });

  test('workspaces globs resolve via the injected directory lister', () => {
    const names = vvb.resolveWorkspaceDirNames(
      { workspaces: ['packages/*'] },
      () => ['jssm-viz', 'jssm-fence', 'jssm-cli'],
    );
    expect(names).toEqual(['jssm-cli', 'jssm-fence', 'jssm-viz']);
  });

  test('an empty resolution falls back to the four known package names', () => {
    const names = vvb.resolveWorkspaceDirNames({ workspaces: ['packages/*'] }, () => []);
    expect(names).toEqual(vvb.DEFAULT_WORKSPACE_PACKAGES);
  });

});
