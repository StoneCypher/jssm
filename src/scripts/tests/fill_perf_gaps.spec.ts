// Unit tests for src/scripts/fill_perf_gaps.cjs — pure logic that decides which
// released tags still lack a graviton result on the perf_results branch.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const f = require('../fill_perf_gaps.cjs');

describe('semverCompare', () => {
  test('orders numerically by part, not lexically', () => {
    expect(f.semverCompare('5.143.9', '5.143.10')).toBeLessThan(0);
    expect(f.semverCompare('5.100.0', '5.99.0')).toBeGreaterThan(0);
    expect(f.semverCompare('5.1.0', '5.1.0')).toBe(0);
  });
});

describe('missingReleases', () => {
  test('returns released tags >= floor that lack a result dir for the instance type', () => {
    const tags = ['5.99.0', '5.100.0', '5.100.1', '5.101.0'];
    const existing = [
      'c8g.medium/release-5.100.0/scaling.json',
      'c8g.medium/release-5.101.0/meta.json',
      'c7g.medium/release-5.100.1/scaling.json',   // different instance type: does NOT count
    ];
    const out = f.missingReleases({ tags, existing, since: '5.100.0', instanceType: 'c8g.medium' });
    expect(out).toEqual(['5.100.1']);
  });

  test('sorts the gaps newest-last and ignores everything below the floor', () => {
    const tags = ['5.100.0', '5.102.0', '5.101.0'];
    const out = f.missingReleases({ tags, existing: [], since: '5.101.0', instanceType: 'c8g.medium' });
    expect(out).toEqual(['5.101.0', '5.102.0']);
  });
});
