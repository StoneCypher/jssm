import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const require = createRequire(import.meta.url);
const gate = require('../verify_peer_pins.cjs');
const { isExactVersion, judgeManifest, runGate } = gate;

// Pure-logic coverage: the exact-version discriminator, the per-manifest
// verdict, and the orchestration around an injected fake manifest reader.

describe('isExactVersion', () => {
  it('accepts a bare release', () => {
    expect(isExactVersion('6.0.0')).toBe(true);
  });
  it('accepts a bare prerelease and a build tag', () => {
    expect(isExactVersion('6.0.0-alpha.12')).toBe(true);
    expect(isExactVersion('6.0.0-alpha.12+build.3')).toBe(true);
  });
  it('rejects every range operator', () => {
    for (const r of ['^6.0.0', '~6.0.0', '>=6.0.0', '<6.0.0', '=6.0.0', '6.x', '*', '6.0.0 - 7.0.0', '^6 || ^7']) {
      expect(isExactVersion(r)).toBe(false);
    }
  });
  it('rejects protocol specs and non-strings', () => {
    expect(isExactVersion('file:../..')).toBe(false);
    expect(isExactVersion('workspace:*')).toBe(false);
    expect(isExactVersion(undefined)).toBe(false);
  });
});

describe('judgeManifest', () => {
  it('is clean when a manifest declares no peers at all', () => {
    expect(judgeManifest({ name: 'jssm-fence' }, ['jssm', 'jssm-fence'])).toEqual([]);
  });

  it('flags a sibling pinned to the lockstep version (the jssm-verify case)', () => {
    const bad = judgeManifest({ name: 'jssm-verify', peerDependencies: { jssm: '6.0.0-alpha.12' } }, ['jssm', 'jssm-verify']);
    expect(bad).toHaveLength(1);
    expect(bad[0]).toMatchObject({ dep: 'jssm', spec: '6.0.0-alpha.12' });
  });

  it('suggests the caret form of the offending pin', () => {
    const bad = judgeManifest({ name: 'jssm-verify', peerDependencies: { jssm: '6.0.0-alpha.12' } }, ['jssm']);
    expect(bad[0].why).toContain('^6.0.0-alpha.12');
  });

  it('passes the same sibling once it is a range', () => {
    expect(judgeManifest({ name: 'jssm-verify', peerDependencies: { jssm: '^6.0.0-alpha.12' } }, ['jssm'])).toEqual([]);
  });

  it('ignores third-party peers even when they are pinned exactly', () => {
    const m = { name: 'jssm-viz', peerDependencies: { lit: '3.1.0', '@codemirror/view': '6.43.2' } };
    expect(judgeManifest(m, ['jssm', 'jssm-viz'])).toEqual([]);
  });

  it('leaves the real jssm-viz peer block alone', () => {
    const m = { name: 'jssm-viz', peerDependencies: { lit: '>=3', '@codemirror/view': '>=6 <6.43.3 || >6.43.4' } };
    expect(judgeManifest(m, ['jssm', 'jssm-viz', 'jssm-fence'])).toEqual([]);
  });

  it('reports every offending sibling, not just the first', () => {
    const m = { name: 'x', peerDependencies: { jssm: '6.0.0', 'jssm-viz': '6.0.0', lit: '3.0.0' } };
    expect(judgeManifest(m, ['jssm', 'jssm-viz', 'x']).map((b: { dep: string }) => b.dep)).toEqual(['jssm', 'jssm-viz']);
  });
});

describe('runGate', () => {
  const dirs = ['/root', '/packages/jssm-verify'];

  it('passes when every sibling peer is a range', () => {
    const read = (d: string) => d === '/root'
      ? { name: 'jssm' }
      : { name: 'jssm-verify', peerDependencies: { jssm: '^6.0.0-alpha.12' } };
    const { ok, violations } = runGate(dirs, read);
    expect(ok).toBe(true);
    expect(violations).toEqual([]);
  });

  it('fails and names the package, dep and spec on an exact sibling pin', () => {
    const read = (d: string) => d === '/root'
      ? { name: 'jssm' }
      : { name: 'jssm-verify', peerDependencies: { jssm: '6.0.0-alpha.12' } };
    const { ok, violations, lines } = runGate(dirs, read);
    expect(ok).toBe(false);
    expect(violations[0]).toMatchObject({ pkg: 'jssm-verify', dep: 'jssm', spec: '6.0.0-alpha.12' });
    expect(lines.some((l: string) => /FAIL/.test(l))).toBe(true);
  });

  it('only treats discovered workspace members as siblings', () => {
    // 'jssm-viz' is not among the read manifests, so an exact pin on it is third-party
    const read = () => ({ name: 'solo', peerDependencies: { 'jssm-viz': '6.0.0' } });
    expect(runGate(['/only'], read).ok).toBe(true);
  });
});
