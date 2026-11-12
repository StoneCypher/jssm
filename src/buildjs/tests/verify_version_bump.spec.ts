// Unit tests for src/buildjs/verify_version_bump.cjs — the release-gate
// script that CI's `verify-version-bump` job runs on every push. Tests cover
// the per-package decision, the lockstep assertion, the whole-workspace
// verdict, the 404-detection helper, and the workspaces-glob expander (no
// filesystem, no child_process, no process.exit): the live `npm view` lookup
// is exercised by CI itself, never by this suite. Property tests for the
// verdict live beside this file in verify_version_bump.stoch.ts.

import { readFileSync } from 'node:fs';
import { join }         from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const vvb = require('../verify_version_bump.cjs');

type Pkg = { name: string, version: string };

/**
 * Builds a lookup that answers from a fixed table and records every name it
 * was asked about, so tests can assert which registry calls were made.
 * @param table - published version per package name; a missing name means unpublished
 * @returns the lookup function and the list of names it was called with
 * @example
 * const { lookup, asked } = recordingLookup({ jssm: '5.164.1' });
 * lookup('jssm');       // '5.164.1'
 * lookup('jssm-cli');   // null
 * asked;                // ['jssm', 'jssm-cli']
 */
function recordingLookup(table: Record<string, string>) {
  const asked: string[] = [];
  const lookup = (name: string): string | null => { asked.push(name); return table[name] ?? null; };
  return { lookup, asked };
}

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

describe('decideRelease', () => {

  const seven: Pkg[] = ['jssm', 'jssm-cli', 'jssm-commonjs', 'jssm-fence', 'jssm-iife', 'jssm-verify', 'jssm-viz']
    .map(name => ({ name, version: '6.0.0' }));

  test('passes a lockstep workspace bumped over 5.x, with unpublished siblings as first publishes', () => {
    const { lookup } = recordingLookup({ jssm: '5.164.1', 'jssm-viz': '5.104.2' });
    const r = vvb.decideRelease(seven, lookup);
    expect(r.ok).toBe(true);
    expect(r.messages[0]).toBe('lockstep ok: all packages at 6.0.0');
    expect(r.messages).toContain('jssm: version is updated (public 5.164.1, private 6.0.0)');
    expect(r.messages).toContain('jssm-cli: unpublished; first publish at 6.0.0');
    expect(r.messages).toHaveLength(1 + seven.length);
  });

  test('fails when any one package is unchanged, while still reporting every package', () => {
    const { lookup } = recordingLookup({ jssm: '5.164.1', 'jssm-fence': '6.0.0' });
    const r = vvb.decideRelease(seven, lookup);
    expect(r.ok).toBe(false);
    expect(r.messages).toContain('jssm-fence: version unchanged: locally 6.0.0, publicly also 6.0.0');
    expect(r.messages).toHaveLength(1 + seven.length);
  });

  test('fails a regression in any package', () => {
    const { lookup } = recordingLookup({ 'jssm-iife': '6.0.1' });
    const r = vvb.decideRelease(seven, lookup);
    expect(r.ok).toBe(false);
    expect(r.messages.some((m: string) => m.startsWith('jssm-iife: version regression'))).toBe(true);
  });

  test('a lockstep violation fails before any registry lookup', () => {
    const { lookup, asked } = recordingLookup({});
    const r = vvb.decideRelease([{ name: 'jssm', version: '6.0.0' }, { name: 'jssm-viz', version: '6.0.1' }], lookup);
    expect(r.ok).toBe(false);
    expect(r.messages).toEqual(['lockstep violation: jssm-viz is at 6.0.1, expected 6.0.0 (from jssm)']);
    expect(asked).toEqual([]);
  });

  test('a lookup that throws fails as a hard error naming the package, and stops further lookups', () => {
    const asked: string[] = [];
    const lookup = (name: string) => {
      asked.push(name);
      if (name === 'jssm-fence') { throw new Error('npm view jssm-fence version failed:\nETIMEDOUT'); }
      return '5.164.1';
    };
    const r = vvb.decideRelease(seven, lookup);
    expect(r.ok).toBe(false);
    expect(r.messages.at(-1)).toBe('Hard error checking jssm-fence: npm view jssm-fence version failed:\nETIMEDOUT');
    expect(asked).toEqual(['jssm', 'jssm-cli', 'jssm-commonjs', 'jssm-fence']);
  });

  test('root-only mode checks just jssm', () => {
    const { lookup, asked } = recordingLookup({ jssm: '5.164.1' });
    const r = vvb.decideRelease([{ name: 'jssm', version: '6.0.0' }], lookup);
    expect(r.ok).toBe(true);
    expect(asked).toEqual(['jssm']);
  });

});

describe('verify_version_bump.cjs is read-only', () => {

  // Regression guard for the stray `v<version>` tags this script used to
  // create (#993): the gate must never shell out to git. The release tag
  // comes from `gh release create` in the workflow's `release` job.
  const source = readFileSync(join(__dirname, '..', 'verify_version_bump.cjs'), 'utf8');

  test('never spawns git', () => {
    expect(source).not.toMatch(/exec(File)?Sync\(\s*['"`]git['"`]/);
    expect(source).not.toMatch(/spawn(Sync)?\(\s*['"`]git['"`]/);
  });

  test('no longer exports or reads a --check-only escape hatch', () => {
    expect(source).not.toMatch(/process\.argv/);
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
