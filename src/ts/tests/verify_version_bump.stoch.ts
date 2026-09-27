import * as fc from 'fast-check';

const part = fc.integer({ min: 0, max: 5000 });

const version = fc.tuple(part, part, part).map(([ma, mi, pa]) => ({ ma, mi, pa, s: `${ma}.${mi}.${pa}` }));

const bump = fc.constantFrom('major', 'minor', 'patch');

/**
 * Applies one semver increment by hand, so the property does not lean on the
 * library the checker itself uses to compare.
 * @param v - the version being bumped, as its three numeric parts
 * @param v.ma - the major part
 * @param v.mi - the minor part
 * @param v.pa - the patch part
 * @param kind - which part to increment; lower parts reset to zero
 * @returns the bumped version as a dotted string
 * @example
 * bumped({ ma: 5, mi: 164, pa: 0 }, 'minor');   // '5.165.0'
 */
function bumped(v: { ma: number, mi: number, pa: number }, kind: string): string {
  if (kind === 'major') { return `${v.ma + 1}.0.0`; }
  if (kind === 'minor') { return `${v.ma}.${v.mi + 1}.0`; }
  return `${v.ma}.${v.mi}.${v.pa + 1}`;
}

describe('verify_version_bump: check_version_bump (stochastic)', () => {

  let check_version_bump: (local: string, pub: string) => { ok: boolean, message: string };

  beforeAll(async () => {
    ({ check_version_bump } = await import('../../buildjs/verify_version_bump.cjs'));
  });

  it('passes every major, minor, or patch bump over the published version', () => {
    fc.assert(fc.property(version, bump, (v, kind) => {
      expect(check_version_bump(bumped(v, kind), v.s).ok).toBe(true);
    }));
  });

  it('fails the published version against itself, as unchanged', () => {
    fc.assert(fc.property(version, v => {
      const r = check_version_bump(v.s, v.s);
      expect(r.ok).toBe(false);
      expect(r.message).toContain('unchanged');
    }));
  });

  it('reports any bump run backwards as a regression', () => {
    fc.assert(fc.property(version, bump, (v, kind) => {
      const r = check_version_bump(v.s, bumped(v, kind));
      expect(r.ok).toBe(false);
      expect(r.message).toContain('regression');
    }));
  });

});
