import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const require = createRequire(import.meta.url);
const msc = require('../make_size_chart.cjs');
const { family } = require('../size_families.cjs');

// Pure, network-free logic only: flag parsing, payload assembly and path
// interning, rail reduction, the model-record adapter the conservation gate
// runs over, and the node-only source cut that keeps the browser and the unit
// tests on one copy of the model. No git, no fetch, no archive read.

const { parseArgs, buildPayload, buildRails, flowRecords, browserSource, LIFECYCLE } = msc;

const archive = (name: string, versions: Record<string, any>) => ({ package: name, versions });
const ver = (published: string, files: Record<string, number>, deprecated = false) =>
  ({ published, files, ...(deprecated ? { deprecated: 'gone' } : {}) });


describe('parseArgs', () => {

  it('defaults to reading the data branch', () => {
    expect(parseArgs([]).fromDir).toBeNull();
  });

  it('accepts a local archive directory', () => {
    expect(parseArgs(['--from', 'build/pkgsizes']).fromDir).toBe('build/pkgsizes');
  });

  it('accepts an output directory', () => {
    expect(parseArgs(['--out', 'somewhere']).outDir).toBe('somewhere');
  });

  it('rejects an unknown flag rather than silently ignoring it', () => {
    expect(() => parseArgs(['--nope'])).toThrow(/unknown flag/);
  });

});


describe('buildPayload', () => {

  it('interns each distinct path exactly once across every package', () => {
    const { paths } = buildPayload([
      archive('a', { '1.0.0': ver('2020-01-01', { 'dist/x.js': 10 }) }),
      archive('b', { '1.0.0': ver('2020-02-01', { 'dist/x.js': 20, 'dist/y.js': 5 }) }),
    ]);
    expect(paths).toHaveLength(2);
    expect(new Set(paths).size).toBe(2);
  });

  it('sorts versions by publish time, not by key order', () => {
    const { packages } = buildPayload([archive('a', {
      '2.0.0': ver('2021-01-01', { 'x': 1 }),
      '1.0.0': ver('2020-01-01', { 'x': 1 }),
    })]);
    expect(packages[0].versions.map((v: any) => v.v)).toEqual(['1.0.0', '2.0.0']);
  });

  it('joins the curated lifecycle onto the archive', () => {
    const { packages } = buildPayload([archive('jssm-viz', { '1.0.0': ver('2020-01-01', { 'x': 1 }) })]);
    expect(packages[0].status).toBe('obsoleted');
    expect(packages[0].by).toBe('jssm');
  });

  it('treats an unlisted package as current, so a new package needs no code change', () => {
    const { packages } = buildPayload([archive('brand-new', { '1.0.0': ver('2020-01-01', { 'x': 1 }) })]);
    expect(packages[0].status).toBe('current');
    expect(LIFECYCLE['brand-new']).toBeUndefined();
  });

  it('reads deprecation from the archive rather than the curated map', () => {
    const { packages } = buildPayload([archive('brand-new', { '1.0.0': ver('2020-01-01', { 'x': 1 }, true) })]);
    expect(packages[0].deprecated).toBe(true);
  });

  it('is deterministic regardless of the order archives arrive in', () => {
    const a = archive('a', { '1.0.0': ver('2020-01-01', { 'x': 1 }) });
    const b = archive('b', { '1.0.0': ver('2020-02-01', { 'y': 2 }) });
    expect(buildPayload([a, b]).packages.map((p: any) => p.name))
      .toEqual(buildPayload([b, a]).packages.map((p: any) => p.name));
  });

});


describe('buildRails', () => {

  const repos = {
    categoryOrder: ['current'],
    repos: [
      { name: 'shipped',   category: 'current', created: '2020-01-01', lastPush: '2021-01-01', obsoletedBy: null },
      { name: 'rail',      category: 'current', created: '2019-01-01', lastPush: '2020-01-01', obsoletedBy: null },
      { name: 'undateable', category: 'current', created: null, lastPush: null, obsoletedBy: null },
    ],
  };

  it('drops repos that already appear as npm streams', () => {
    const out = buildRails(repos, new Set(['shipped']));
    expect(out.repos.map((r: any) => r.name)).not.toContain('shipped');
  });

  it('drops repos with no lifespan, which cannot be drawn', () => {
    const out = buildRails(repos, new Set());
    expect(out.repos.map((r: any) => r.name)).not.toContain('undateable');
  });

  it('orders rails by start date', () => {
    const out = buildRails(repos, new Set());
    expect(out.repos[0].name).toBe('rail');
  });

  it('returns null when there is no timeline at all', () => {
    expect(buildRails(null, new Set())).toBeNull();
  });

  it('returns null when every repo was filtered out', () => {
    expect(buildRails(repos, new Set(['shipped', 'rail', 'undateable']))).toBeNull();
  });

});


describe('flowRecords', () => {

  const { paths, packages } = buildPayload([
    archive('jssm-viz', {
      '1.0.0': ver('2020-01-01', { 'dist/jssm_viz.js': 100, 'cli/x.js': 5 }),
      '1.1.0': ver('2020-06-01', { 'dist/jssm_viz.js': 150 }),
    }),
  ]);
  const recs = flowRecords(packages, paths);

  it('totals every file in each version', () => {
    expect(recs[0].totals).toEqual([105, 150]);
  });

  it('marks a non-current package as flowing out', () => {
    expect(recs[0].dead).toBe(true);
  });

  it('spans each family from its first appearance to its last', () => {
    const cli = recs[0].famSpan.get('cli');
    expect(cli.first).toBe(Date.parse('2020-01-01'));
    expect(cli.last).toBe(Date.parse('2020-01-01'));      // dropped in 1.1.0
  });

  it('carries the supersession edge the model needs', () => {
    expect(recs[0].by).toBe('jssm');
  });

});


describe('browserSource', () => {

  it('cuts the model at its node-only marker so no CommonJS export ships', () => {
    const src = browserSource(require.resolve('../flow_model.cjs'));
    expect(src).toContain('function buildFlow');
    expect(src).not.toContain('module.exports');
  });

  it('cuts the family classifier the same way', () => {
    const src = browserSource(require.resolve('../size_families.cjs'));
    expect(src).toContain('function family');
    expect(src).not.toContain('module.exports');
  });

  it('throws rather than shipping a page whose marker went missing', () => {
    expect(() => browserSource(require.resolve('../collect_package_sizes.cjs')))
      .toThrow(/node-only marker/);
  });

});


describe('family', () => {

  it('classifies CLI files before generic javascript', () => {
    expect(family('cli/fsl.cjs')).toBe('cli');
  });

  it('classifies typedefs', () => {
    expect(family('jssm.es6.d.ts')).toBe('typedefs');
  });

  it('classifies core bundles', () => {
    expect(family('dist/jssm.es6.mjs')).toBe('core');
  });

  it('falls back to misc for anything unrecognised', () => {
    expect(family('LICENSE')).toBe('misc');
  });

});
