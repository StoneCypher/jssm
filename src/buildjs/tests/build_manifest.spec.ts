// Unit tests for src/buildjs/build_manifest.cjs — the artifact manifest hasher
// used as the byte-equivalence gate for the build orchestrator. Tests cover the
// pure normalization + diff helpers (no filesystem); the full buildManifest() is
// exercised integration-style by the T0/T6 reference-vs-orchestrated comparison.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bm = require('../build_manifest.cjs');

describe('neutralizeBuildTime', () => {
  test('replaces every occurrence of the epoch with a stable placeholder', () => {
    const t = '1782222479159';
    const src = `const build_time=${t};x(${t});/*${t}*/`;
    const out = bm.neutralizeBuildTime(src, t);
    expect(out).not.toContain(t);
    expect(out.match(/<BUILD_TIME>/g)?.length).toBe(3);
  });
  test('is a no-op when no build_time is known', () => {
    expect(bm.neutralizeBuildTime('abc', null)).toBe('abc');
  });
  test('leaves unrelated digits intact', () => {
    expect(bm.neutralizeBuildTime('v=42', '1782222479159')).toBe('v=42');
  });
});

describe('parseBuildTime', () => {
  test('reads the epoch from TypeScript source with a type annotation', () => {
    expect(bm.parseBuildTime('const build_time : number = 1782222479159;')).toBe('1782222479159');
  });
  test('reads the epoch from compiled JS without an annotation', () => {
    expect(bm.parseBuildTime('const build_time = 42;')).toBe('42');
  });
  test('returns null when absent', () => {
    expect(bm.parseBuildTime('no build time here')).toBe(null);
  });
});

describe('stripDateLines', () => {
  test('drops ISO-date lines, keeps the rest', () => {
    const txt = 'keep me\n2026-06-23 generated\nalso keep';
    expect(bm.stripDateLines(txt)).toBe('keep me\nalso keep');
  });
  test('drops a locale "generated at" clock-time stamp', () => {
    const txt = 'title\n* Generated for version 5.147.1 at 6/23/2026, 11:53:39 AM\nbody';
    expect(bm.stripDateLines(txt)).toBe('title\nbody');
  });
});

describe('diffManifests', () => {
  const ref = { artifacts: { 'a.js': 'h1', 'b.js': 'h2' }, docs: { count: 3 } };
  test('reports changed hashes', () => {
    const cur = { artifacts: { 'a.js': 'h1', 'b.js': 'XX' }, docs: { count: 3 } };
    expect(bm.diffManifests(ref, cur)).toEqual([{ path: 'b.js', kind: 'changed' }]);
  });
  test('reports missing and added paths', () => {
    const cur = { artifacts: { 'a.js': 'h1', 'c.js': 'h9' }, docs: { count: 3 } };
    const d = bm.diffManifests(ref, cur);
    expect(d).toContainEqual({ path: 'b.js', kind: 'missing' });
    expect(d).toContainEqual({ path: 'c.js', kind: 'added' });
  });
  test('flags a doc-count change', () => {
    const cur = { artifacts: { 'a.js': 'h1', 'b.js': 'h2' }, docs: { count: 5 } };
    expect(bm.diffManifests(ref, cur)).toContainEqual({ path: 'docs/', kind: 'doc-count', reason: '3 -> 5' });
  });
  test('empty when identical', () => {
    expect(bm.diffManifests(ref, ref)).toEqual([]);
  });
});
