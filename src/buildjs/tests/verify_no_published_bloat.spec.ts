import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const require = createRequire(import.meta.url);
const gate = require('../verify_no_published_bloat.cjs');
const { BLOAT_RULES, parsePackFiles, findBloat, runGate } = gate;

// Pure-logic coverage: the denylist matcher, the pack-manifest parser, and the
// orchestration around an injected fake pack seam. No npm, no filesystem pack.

describe('parsePackFiles', () => {
  it('flattens npm pack --json into a path list', () => {
    expect(parsePackFiles('[{"files":[{"path":"dist/jssm.mjs"},{"path":"README.md"}]}]'))
      .toEqual(['dist/jssm.mjs', 'README.md']);
  });
  it('throws on an unexpected shape', () => {
    expect(() => parsePackFiles('{"nope":true}')).toThrow(/files\[\] array/);
  });
});

describe('findBloat', () => {
  it('is empty for a clean package', () => {
    expect(findBloat(['dist/jssm.mjs', 'dist/jssm.d.ts', 'README.md'])).toEqual([]);
  });
  it('flags a non-minified bundle (the 5.32.10 / 5.112.3 class of leak)', () => {
    const bad = findBloat(['dist/jssm.mjs', 'dist/jssm.es5.iife.nonmin.js']);
    expect(bad).toHaveLength(1);
    expect(bad[0]).toMatchObject({ path: 'dist/jssm.es5.iife.nonmin.js', id: 'nonmin' });
  });
  it('flags source maps, build caches, and leaked node_modules', () => {
    const ids = findBloat([
      'dist/jssm.iife.js.map',
      '.rpt2_cache/rpt2_abc/code/cache/deadbeef',
      'node_modules/lodash/index.js',
      'dist/jssm.mjs',
    ]).map(b => b.id);
    expect(ids).toEqual(['sourcemap', 'rpt2-cache', 'nodemodules']);
  });
  it('carries the reason for every flagged file', () => {
    for (const b of findBloat(['a.nonmin.js', 'b.map'])) expect(typeof b.why).toBe('string');
  });
  it('every rule has a distinct id and a reason', () => {
    const ids = BLOAT_RULES.map((r: { id: string }) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(BLOAT_RULES.every((r: { why: string }) => r.why.length > 0)).toBe(true);
  });
});

describe('runGate', () => {
  // one clean package, one dirty — but discoverPackageDirs/readFileSync are real,
  // so drive it against this repo's own dirs with a fake pack keyed by basename.
  const require2 = createRequire(import.meta.url);
  const path = require2('node:path');
  const root = path.join(__dirname, '..', '..', '..');

  it('passes when every package is clean', () => {
    const { ok, violations } = runGate([root], () => ['dist/jssm.mjs', 'README.md']);
    expect(ok).toBe(true);
    expect(violations).toEqual([]);
  });
  it('fails and names the offending path when a package is dirty', () => {
    const { ok, violations, lines } = runGate([root], () => ['dist/x.nonmin.js']);
    expect(ok).toBe(false);
    expect(violations[0]).toMatchObject({ pkg: 'jssm', path: 'dist/x.nonmin.js', id: 'nonmin' });
    expect(lines.some((l: string) => /FAIL/.test(l))).toBe(true);
  });
});
