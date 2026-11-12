// Property tests for src/buildjs/verify_version_bump.cjs's whole-workspace
// verdict, decideRelease. Example-based coverage lives beside this file in
// verify_version_bump.spec.ts.

import * as fc from 'fast-check';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const vvb = require('../verify_version_bump.cjs');

type Parts = { ma: number, mi: number, pa: number, s: string };

const part    = fc.integer({ min: 0, max: 5000 });
const version = fc.tuple(part, part, part).map(([ma, mi, pa]): Parts => ({ ma, mi, pa, s: `${ma}.${mi}.${pa}` }));
const bump    = fc.constantFrom('major', 'minor', 'patch');

/** Workspace sizes from root-only up to the seven packages the v6 line releases in lockstep. */
const names = fc.integer({ min: 1, max: 7 }).map(n => ['jssm', ...Array.from({ length: n - 1 }, (_, i) => `jssm-pkg${i}`)]);

/**
 * Applies one semver increment by hand, so the properties do not lean on the
 * library the checker itself uses to compare.
 * @param v - the version being bumped, as its three numeric parts
 * @param v.ma - the major part
 * @param v.mi - the minor part
 * @param v.pa - the patch part
 * @param kind - which part to increment; lower parts reset to zero
 * @returns the bumped version as a dotted string
 * @example
 * bumped({ ma: 5, mi: 164, pa: 1, s: '5.164.1' }, 'major');   // '6.0.0'
 */
function bumped(v: Parts, kind: string): string {
  if (kind === 'major') { return `${v.ma + 1}.0.0`; }
  if (kind === 'minor') { return `${v.ma}.${v.mi + 1}.0`; }
  return `${v.ma}.${v.mi}.${v.pa + 1}`;
}

describe('verify_version_bump: decideRelease (stochastic)', () => {

  it('passes any lockstep bump, whatever mix of published and never-published packages', () => {
    fc.assert(fc.property(version, bump, names, fc.array(fc.boolean(), { minLength: 7, maxLength: 7 }), (v, kind, ns, published) => {
      const local  = bumped(v, kind);
      const lookup = (name: string) => (published[ns.indexOf(name)] ? v.s : null);
      const r      = vvb.decideRelease(ns.map(name => ({ name, version: local })), lookup);
      expect(r.ok).toBe(true);
      expect(r.messages).toHaveLength(ns.length + 1);
    }));
  });

  it('fails when any single package is unchanged against npm, and names it', () => {
    fc.assert(fc.property(version, bump, names, fc.nat(), (v, kind, ns, pick) => {
      const local   = bumped(v, kind);
      const stale   = ns[pick % ns.length];
      const lookup  = (name: string) => (name === stale ? local : v.s);
      const r       = vvb.decideRelease(ns.map(name => ({ name, version: local })), lookup);
      expect(r.ok).toBe(false);
      expect(r.messages).toContain(`${stale}: version unchanged: locally ${local}, publicly also ${local}`);
    }));
  });

  it('reports a bump run backwards in any package as a regression', () => {
    fc.assert(fc.property(version, bump, names, fc.nat(), (v, kind, ns, pick) => {
      const ahead  = ns[pick % ns.length];
      const lookup = (name: string) => (name === ahead ? bumped(v, kind) : null);
      const r      = vvb.decideRelease(ns.map(name => ({ name, version: v.s })), lookup);
      expect(r.ok).toBe(false);
      expect(r.messages.some((m: string) => m.startsWith(`${ahead}: version regression`))).toBe(true);
    }));
  });

  it('fails any workspace out of lockstep without asking the registry anything', () => {
    fc.assert(fc.property(version, bump, names.filter(ns => ns.length > 1), fc.nat(), (v, kind, ns, pick) => {
      const odd    = ns[1 + (pick % (ns.length - 1))];
      let   calls  = 0;
      const lookup = () => { calls += 1; return null; };
      const r      = vvb.decideRelease(ns.map(name => ({ name, version: name === odd ? bumped(v, kind) : v.s })), lookup);
      expect(r.ok).toBe(false);
      expect(r.messages).toHaveLength(1);
      expect(r.messages[0]).toContain(`lockstep violation: ${odd}`);
      expect(calls).toBe(0);
    }));
  });

});
