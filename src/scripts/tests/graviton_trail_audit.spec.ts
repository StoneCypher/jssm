
// Unit tests for the pure logic + seamed orchestration of
// src/scripts/graviton_trail_audit.cjs. No network, no AWS, no dist requires:
// the two executor seams (graviton_perf's object-returning makeExecutor for the
// AWS path, make_perf_chart's string-returning make_executor for the trail read)
// are either dry-run or hand-faked. Assertions are substring/structural per
// house rules — no golden files, and no test builds its expected value with the
// same code path it then asserts against.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const A = require('../graviton_trail_audit.cjs');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeExecutor } = require('../graviton_perf.cjs');

type CaseStat = { median: number; min: number; max: number; stdev: number; mean: number; n: number };

const good_userdata_params = () => ({
  repoUrl         : 'https://github.com/StoneCypher/jssm.git',
  versions        : ['5.1.0', '5.2.0'],
  samples         : 5,
  region          : 'us-east-1',
  bucket          : 'jssm-perf-results-032239181269',
  runId           : 'jssm-perf-20260718-x',
  instanceIndex   : 0,
  instanceType    : 'c8g.medium',
  shutdownMinutes : 120
});



describe('auditDir', () => {

  test('keys under the underscore prefix the nightly sync excludes', () => {
    expect( A.auditDir('r1') ).toBe(`${A.TRAIL_AUDIT_PREFIX}/r1`);
    expect( A.TRAIL_AUDIT_PREFIX.startsWith('_') ).toBe(true);
  });

});



describe('isVersion', () => {

  test('accepts dotted numeric versions, rejects tokens', () => {
    expect( A.isVersion('5.162.7') ).toBe(true);
    expect( A.isVersion('5.1') ).toBe(true);
    expect( A.isVersion('last:20') ).toBe(false);
    expect( A.isVersion('5.x') ).toBe(false);
    expect( A.isVersion('') ).toBe(false);
  });

});



describe('parseVersionSpec', () => {

  test('all', () => expect( A.parseVersionSpec('all') ).toEqual({ kind: 'all' }));

  test('last:N', () => expect( A.parseVersionSpec('last:20') ).toEqual({ kind: 'last', n: 20 }));

  test('range normalizes lo <= hi regardless of input order', () => {
    expect( A.parseVersionSpec('5.160.0..5.162.33') ).toEqual({ kind: 'range', lo: '5.160.0', hi: '5.162.33' });
    expect( A.parseVersionSpec('5.162.33..5.160.0') ).toEqual({ kind: 'range', lo: '5.160.0', hi: '5.162.33' });
  });

  test('comma list', () => {
    const d = A.parseVersionSpec('5.162.7, 5.162.33');
    expect(d.kind).toBe('list');
    expect(d.versions).toEqual(['5.162.7', '5.162.33']);
  });

  test('rejects empty, bad last:N, half-version ranges, and non-version list tokens', () => {
    expect( () => A.parseVersionSpec('') ).toThrow(/requires a value/);
    expect( () => A.parseVersionSpec('   ') ).toThrow(/requires a value/);
    expect( () => A.parseVersionSpec('last:0') ).toThrow(/positive integer/);
    expect( () => A.parseVersionSpec('5.1.0..notaversion') ).toThrow(/range must be/);
    expect( () => A.parseVersionSpec('5.1.0,bogus') ).toThrow(/non-version token/);
  });

});



describe('selectVersions', () => {

  const trail = ['5.1.0', '5.2.0', '5.3.0', '5.10.0'];   // deliberately out of natural sort in places

  test('all → whole trail ascending by semver (not lexical)', () => {
    expect( A.selectVersions({ kind: 'all' }, trail).selected ).toEqual(['5.1.0', '5.2.0', '5.3.0', '5.10.0']);
  });

  test('last:N takes the N greatest, ascending', () => {
    expect( A.selectVersions({ kind: 'last', n: 2 }, trail).selected ).toEqual(['5.3.0', '5.10.0']);
  });

  test('range is inclusive on both ends', () => {
    const r = A.selectVersions({ kind: 'range', lo: '5.2.0', hi: '5.3.0' }, trail);
    expect(r.selected).toEqual(['5.2.0', '5.3.0']);
    expect(r.missing).toEqual([]);
  });

  test('list intersects the trail and reports the rest as missing', () => {
    const r = A.selectVersions({ kind: 'list', versions: ['5.2.0', '9.9.9'] }, trail);
    expect(r.selected).toEqual(['5.2.0']);
    expect(r.missing).toEqual(['9.9.9']);
  });

  test('list with an empty (unfetched) trail is used as-is so --dry-run can walk it', () => {
    const r = A.selectVersions({ kind: 'list', versions: ['5.2.0', '5.1.0'] }, []);
    expect(r.selected).toEqual(['5.1.0', '5.2.0']);   // still sorted ascending
    expect(r.missing).toEqual([]);
  });

});



describe('roundRobinPartition (anti-confound spread)', () => {

  test('deals index j to instance j % k', () => {
    expect( A.roundRobinPartition(['a', 'b', 'c', 'd', 'e'], 2) ).toEqual([['a', 'c', 'e'], ['b', 'd']]);
  });

  test('no two adjacent sorted versions share an instance (era cannot masquerade as instance)', () => {
    const versions = Array.from({ length: 12 }, (_, i) => `5.0.${i}`);   // already ascending
    const slices   = A.roundRobinPartition(versions, 3);
    const sliceOf  = (v: string) => slices.findIndex((s: string[]) => s.includes(v));
    for (let j = 0; j < versions.length - 1; ++j) {
      expect( sliceOf(versions[j]) ).not.toBe( sliceOf(versions[j + 1]) );
    }
  });

  test('every non-empty slice spans the range: it holds both an early and a late version', () => {
    const n        = 12;
    const versions = Array.from({ length: n }, (_, i) => `5.0.${i}`);
    const slices   = A.roundRobinPartition(versions, 3);
    const firstHalf = new Set(versions.slice(0, n / 2));
    const lastHalf  = new Set(versions.slice(n / 2));
    for (const slice of slices) {
      expect( slice.some((v: string) => firstHalf.has(v)) ).toBe(true);
      expect( slice.some((v: string) => lastHalf.has(v)) ).toBe(true);
    }
  });

  test('trailing slices are empty when versions < instances', () => {
    expect( A.roundRobinPartition(['a', 'b'], 4) ).toEqual([['a'], ['b'], [], []]);
  });

  test('rejects a non-positive instance count', () => {
    expect( () => A.roundRobinPartition(['a'], 0) ).toThrow(/positive integer/);
  });

});



describe('interleaveOrder', () => {

  test('repeats the whole slice `samples` times in order', () => {
    expect( A.interleaveOrder(['a', 'b'], 3) ).toEqual(['a', 'b', 'a', 'b', 'a', 'b']);
  });

  test('length is slice × samples', () => {
    expect( A.interleaveOrder(['a', 'b', 'c'], 4).length ).toBe(12);
  });

});



describe('sampleStats', () => {

  test('odd count: exact median, sample stdev (n-1)', () => {
    const s = A.sampleStats([120, 100, 110]);   // unsorted input
    expect(s.n).toBe(3);
    expect(s.median).toBe(110);
    expect(s.min).toBe(100);
    expect(s.max).toBe(120);
    expect(s.mean).toBe(110);
    expect(s.stdev).toBeCloseTo(10, 9);          // sqrt((100+0+100)/2) = 10
  });

  test('even count: mean-of-middles median', () => {
    const s = A.sampleStats([100, 120]);
    expect(s.median).toBe(110);
    expect(s.stdev).toBeCloseTo(Math.sqrt(200), 9);   // sqrt((100+100)/1)
  });

  test('single sample: zero stdev', () => {
    expect( A.sampleStats([42]) ).toMatchObject({ n: 1, median: 42, stdev: 0 });
  });

});



describe('aggregateInstanceSamples', () => {

  test('groups ops per case across a version\'s interleaved runs', () => {
    const agg = A.aggregateInstanceSamples({
      '5.1.0': [
        { results: [ { name: 't', ops: 100 }, { name: 'c', ops: 10 } ] },
        { results: [ { name: 't', ops: 120 }, { name: 'c', ops: 14 } ] }
      ]
    });
    expect(agg['5.1.0'].cases.t.median).toBe(110);
    expect(agg['5.1.0'].cases.c.median).toBe(12);
    expect(agg['5.1.0'].cases.t.n).toBe(2);
  });

  test('tolerates a run missing the results array', () => {
    const agg = A.aggregateInstanceSamples({ '5.1.0': [ {}, { results: [ { name: 't', ops: 50 } ] } ] });
    expect(agg['5.1.0'].cases.t.median).toBe(50);
  });

});



describe('buildAudit', () => {

  const meta = { samples: 1, instances: 1, instanceType: 'c8g.medium', runId: 'r' };

  const st = (median: number): CaseStat => ({ median, min: median, max: median, stdev: 0, mean: median, n: 1 });

  test('ratio is audited/trail; disagreement is |ln(ratio)| so 2x and 1/2x tie', () => {
    const audit = A.buildAudit(
      [{ instance: 0, versions: { '5.1.0': { cases: { t: st(120) } } }, skipped: [] }],
      { '5.1.0': { t: 100 } }, meta
    );
    expect(audit.rows[0].ratio).toBeCloseTo(1.2, 9);
    expect(audit.rows[0].trail_value).toBe(100);
    expect(audit.rows[0].disagreement).toBeCloseTo(Math.log(1.2), 9);
  });

  test('sorts worst disagreement first across cases', () => {
    const audit = A.buildAudit(
      [{ instance: 0, versions: { '5.1.0': { cases: { small: st(105), big: st(200) } } }, skipped: [] }],
      { '5.1.0': { small: 100, big: 100 } }, meta
    );
    expect( audit.rows.map((r: { case: string }) => r.case) ).toEqual(['big', 'small']);
  });

  test('cases without a trail baseline go to noBaseline, not rows', () => {
    const audit = A.buildAudit(
      [{ instance: 0, versions: { '5.1.0': { cases: { t: st(100), orphan: st(50) } } }, skipped: [] }],
      { '5.1.0': { t: 100 } }, meta
    );
    expect(audit.rows).toHaveLength(1);
    expect(audit.noBaseline).toHaveLength(1);
    expect(audit.noBaseline[0].case).toBe('orphan');
  });

  test('spread_pct is stdev/median; summary tracks median & max abs deviation', () => {
    const spread: CaseStat = { median: 100, min: 90, max: 110, stdev: 10, mean: 100, n: 3 };
    const audit = A.buildAudit(
      [{ instance: 0, versions: { '5.1.0': { cases: { t: spread } } }, skipped: [] }],
      { '5.1.0': { t: 80 } }, meta
    );
    expect(audit.rows[0].spread_pct).toBeCloseTo(10, 9);
    // ratio 100/80 = 1.25 -> abs deviation from 1 = 0.25
    expect(audit.summary.max_abs_dev).toBeCloseTo(0.25, 9);
    expect(audit.summary.median_abs_dev).toBeCloseTo(0.25, 9);
  });

  test('collects skipped versions across instances, deduped and sorted', () => {
    const audit = A.buildAudit(
      [
        { instance: 0, versions: {}, skipped: ['5.3.0', '5.1.0'] },
        { instance: 1, versions: {}, skipped: ['5.1.0', '5.2.0'] }
      ], {}, meta
    );
    expect(audit.skipped).toEqual(['5.1.0', '5.2.0', '5.3.0']);
    expect(audit.summary.skipped).toBe(3);
  });

});



describe('renderAuditMarkdown', () => {

  test('leads with the audit header and the worst-disagreement table', () => {
    const st = (m: number): CaseStat => ({ median: m, min: m, max: m, stdev: 0, mean: m, n: 1 });
    const audit = A.buildAudit(
      [{ instance: 0, versions: { '5.1.0': { cases: { t: st(150) } } }, skipped: ['5.0.0'] }],
      { '5.1.0': { t: 100 } },
      { samples: 5, instances: 10, instanceType: 'c8g.medium', runId: 'rid' }
    );
    const md = A.renderAuditMarkdown(audit);
    expect(md.startsWith('# jssm trail audit')).toBe(true);
    expect(md).toContain('Worst disagreements');
    expect(md).toContain('+50.0%');
    expect(md).toContain('5.1.0');
    expect(md).toContain('Skipped versions: 5.0.0');
    expect(md).toContain('run rid');
  });

  test('empty audit still renders a well-formed header (no rows)', () => {
    const audit = A.buildAudit([], {}, { samples: 5, instances: 10, instanceType: 'c8g.medium', runId: 'r' });
    const md = A.renderAuditMarkdown(audit);
    expect(md).toContain('# jssm trail audit');
    expect(md).toContain('0 (version, case) pairs had a trail baseline');
  });

});



describe('buildPlan (guardrail)', () => {

  test('largest slice bounds cost; sane plan is not absurd', () => {
    const p = A.buildPlan({ versionCount: 20, samples: 5, instances: 10 });
    expect(p.versionsPerInstance).toBe(2);          // ceil(20/10)
    expect(p.suitePassesPerInstance).toBe(10);      // 2 * 5
    expect(p.absurd).toBe(false);
    expect(p.planLine).toContain('plan:');
    expect(p.planLine).toContain('20 versions');
    expect(p.estWallClockMinutes).toBe(p.estInstanceMinutes);   // parallel instances
  });

  test('flags an absurd plan when a single instance would exceed the pass ceiling', () => {
    const p = A.buildPlan({ versionCount: 11, samples: 5, instances: 1 });
    expect(p.suitePassesPerInstance).toBe(55);
    expect(p.absurd).toBe(true);
    expect(55).toBeGreaterThan(A.MAX_SUITE_PASSES_PER_INSTANCE);
  });

  test('caps effective instances at the version count (never idle-launches)', () => {
    const p = A.buildPlan({ versionCount: 3, samples: 2, instances: 10 });
    expect(p.versionsPerInstance).toBe(1);          // ceil(3/3), not ceil(3/10)
    expect(p.planLine).toContain('across 3 instances');
  });

});



describe('parseAuditArgs', () => {

  const base = ['node', 's', '--versions', 'last:20'];

  test('defaults', () => {
    const o = A.parseAuditArgs(base);
    expect(o.samples).toBe(5);
    expect(o.instances).toBe(10);
    expect(o.instanceType).toBe('c8g.medium');
    expect(o.timeoutMinutes).toBe(120);
    expect(o.spot).toBe(false);
    expect(o.wait).toBe(false);
    expect(o.iKnow).toBe(false);
    expect(o.dryRun).toBe(false);
    expect(o.descriptor).toEqual({ kind: 'last', n: 20 });
  });

  test('flags land', () => {
    const o = A.parseAuditArgs(['node', 's', '--versions', '5.1.0,5.2.0', '--samples', '3',
      '--instances', '4', '--instance-type', 'c8g.medium', '--spot', '--wait',
      '--timeout-minutes', '30', '--region', 'us-west-2', '--subnet-id', 'subnet-1',
      '--run-id', 'rid', '--i-know', '--dry-run']);
    expect(o.samples).toBe(3);
    expect(o.instances).toBe(4);
    expect(o.spot).toBe(true);
    expect(o.wait).toBe(true);
    expect(o.timeoutMinutes).toBe(30);
    expect(o.region).toBe('us-west-2');
    expect(o.subnetId).toBe('subnet-1');
    expect(o.runId).toBe('rid');
    expect(o.iKnow).toBe(true);
    expect(o.dryRun).toBe(true);
    expect(o.descriptor.kind).toBe('list');
  });

  test('requires --versions', () =>
    expect( () => A.parseAuditArgs(['node', 's']) ).toThrow(/--versions is required/));

  test('propagates a bad version spec', () =>
    expect( () => A.parseAuditArgs(['node', 's', '--versions', 'last:0']) ).toThrow(/positive integer/));

  test('rejects out-of-range samples / instances / timeout', () => {
    expect( () => A.parseAuditArgs([...base, '--samples', '0']) ).toThrow(/--samples/);
    expect( () => A.parseAuditArgs([...base, '--samples', '10']) ).toThrow(/--samples/);
    expect( () => A.parseAuditArgs([...base, '--instances', '0']) ).toThrow(/--instances/);
    expect( () => A.parseAuditArgs([...base, '--instances', '51']) ).toThrow(/--instances/);
    expect( () => A.parseAuditArgs([...base, '--timeout-minutes', '0']) ).toThrow(/--timeout-minutes/);
  });

  test('rejects a non-allowed instance type via the shared validator', () =>
    expect( () => A.parseAuditArgs([...base, '--instance-type', 't4g.medium']) ).toThrow());

  test('rejects unknown flags and dangling values', () => {
    expect( () => A.parseAuditArgs([...base, '--nope']) ).toThrow(/unknown flag/);
    expect( () => A.parseAuditArgs([...base, '--samples']) ).toThrow(/requires a value/);
  });

});



describe('buildAuditUserData', () => {

  test('carries the hardened conventions and the strict interleaved rotation', () => {
    const s = A.buildAuditUserData(good_userdata_params());
    expect(s.startsWith('#!/bin/bash')).toBe(true);
    expect(s).toContain('shutdown -h +120');                              // dead-man first
    expect(s).toContain('for i in $(seq 1 5); do');                       // sample rotations
    expect(s).toContain('git worktree add');                             // side-by-side checkouts
    expect(s).toContain('dist/jssm.es5.cjs');                            // committed-dist guard
    expect(s).toContain('node ./src/buildjs/benchmark.cjs');             // general suite
    expect(s).toContain('graviton_trail_audit.cjs');                     // on-instance stats helper
    expect(s).toContain('s3://jssm-perf-results-032239181269/_trail_audit/jssm-perf-20260718-x');
    expect(s).toContain('FAILED.txt');                                   // loud failure marker
    expect(s).toContain('shutdown -h now');                              // self-terminate last
  });

  test('interpolates each slice version into the rotation list', () => {
    const s = A.buildAuditUserData(good_userdata_params());
    expect(s).toContain('VERSIONS="5.1.0 5.2.0"');
  });

  test('rejects unsafe interpolations', () => {
    const p = good_userdata_params;
    expect( () => A.buildAuditUserData({ ...p(), versions: [] }) ).toThrow(/empty version slice/);
    expect( () => A.buildAuditUserData({ ...p(), versions: ['5.1.0; rm -rf /'] }) ).toThrow(/unsafe version/);
    expect( () => A.buildAuditUserData({ ...p(), region: 'a b' }) ).toThrow(/unsafe region/);
    expect( () => A.buildAuditUserData({ ...p(), bucket: 'NO' }) ).toThrow(/unsafe bucket/);
    expect( () => A.buildAuditUserData({ ...p(), repoUrl: 'ftp://x' }) ).toThrow(/unsafe repo url/);
    expect( () => A.buildAuditUserData({ ...p(), runId: 'a b' }) ).toThrow(/unsafe run id/);
    expect( () => A.buildAuditUserData({ ...p(), samples: 99 }) ).toThrow(/unsafe samples/);
    expect( () => A.buildAuditUserData({ ...p(), instanceIndex: -1 }) ).toThrow(/unsafe instanceIndex/);
  });

});



describe('collectTrailVersions / collectTrailValues (string-executor seam)', () => {

  const listing = [
    'c8g.medium/pr-700/scaling.json',
    'c8g.medium/release-5.1.0/scaling.json',
    'c8g.medium/release-5.10.0/scaling.json',
    'c8g.medium/release-5.2.0/scaling.json',
    'charts/x/construct.svg'                       // own output, ignored
  ].join('\n');

  const scalingCanned: Record<string, string> = {
    'FETCH_HEAD:c8g.medium/pr-700/scaling.json'          : '{"version":"5.143.2","date":"d","results":[]}',
    'FETCH_HEAD:c8g.medium/release-5.1.0/scaling.json'   : '{"version":"5.1.0","date":"d","results":[]}',
    'FETCH_HEAD:c8g.medium/release-5.10.0/scaling.json'  : '{"version":"5.10.0","date":"d","results":[]}',
    'FETCH_HEAD:c8g.medium/release-5.2.0/scaling.json'   : '{"version":"5.2.0","date":"d","results":[]}'
  };

  const stringExec = (showTable: Record<string, string>) => ({
    dryRun : false,
    run    : (_cmd: string, args: string[]) => {
      if (args[0] === 'fetch')   { return ''; }
      if (args[0] === 'ls-tree') { return listing; }
      if (args[0] === 'show')    { return showTable[args[1]] ?? null; }
      throw new Error(`unexpected git args ${args.join(' ')}`);
    }
  });

  test('collectTrailVersions returns only releases, ascending by semver', () => {
    const vs = A.collectTrailVersions(stringExec(scalingCanned), '.');
    expect(vs).toEqual(['5.1.0', '5.2.0', '5.10.0']);   // pr-700 excluded; numeric sort
  });

  test('collectTrailValues reads general.json cases and skips versions lacking one', () => {
    const generalCanned: Record<string, string> = {
      'FETCH_HEAD:c8g.medium/release-5.1.0/general.json':
        '{"results":[{"name":"transition()","ops":1000},{"name":"action()","ops":2000}]}'
      // 5.2.0 general.json deliberately absent -> skipped
    };
    const vals = A.collectTrailValues(stringExec(generalCanned), '.', ['5.1.0', '5.2.0'], 'c8g.medium');
    expect(vals['5.1.0']).toEqual({ 'transition()': 1000, 'action()': 2000 });
    expect(vals['5.2.0']).toBeUndefined();
  });

});



describe('fireAudit / waitForAudit / main (dry-run and fake executors)', () => {

  const dryOpts = () => A.parseAuditArgs(['node', 's', '--versions', '5.1.0,5.2.0,5.3.0',
    '--instances', '2', '--samples', '2', '--dry-run', '--run-id', 'rid']);

  test('fireAudit dry-run lands under _trail_audit and launches one instance per non-empty slice', () => {
    const exec = makeExecutor(true);
    const r = A.fireAudit(exec, dryOpts(), ['5.1.0', '5.2.0', '5.3.0']);
    expect(r.runId).toBe('rid');
    expect(r.dest).toContain('/_trail_audit/rid');
    expect(r.instances).toHaveLength(2);                // 3 versions, 2 instances -> 2 non-empty slices
    expect(r.instances[0].versions).toEqual(['5.1.0', '5.3.0']);   // round-robin deal
  });

  test('fireAudit launches nothing beyond the version count', () => {
    const exec = makeExecutor(true);
    const opts = A.parseAuditArgs(['node', 's', '--versions', '5.1.0', '--instances', '5', '--dry-run']);
    const r = A.fireAudit(exec, opts, ['5.1.0']);
    expect(r.instances).toHaveLength(1);
  });

  test('waitForAudit returns 0 immediately in dry-run', () => {
    const exec = makeExecutor(true);
    const ctx  = { dest: 's3://b/_trail_audit/rid', runId: 'rid', instanceIndices: [0],
                   selected: ['5.1.0'], repoDir: '.', chartExec: makeExecutor(true) };
    expect( A.waitForAudit(exec, dryOpts(), ctx) ).toBe(0);
  });

  test('waitForAudit aggregates present instance files against the trail baseline', () => {
    // AWS seam (object-returning): every instance-i.json read succeeds; uploads succeed.
    const instanceBody = JSON.stringify({
      instance: 0, samples: 1, instanceType: 'c8g.medium',
      versions: { '5.1.0': { cases: { 't': { median: 120, min: 120, max: 120, stdev: 0, mean: 120, n: 1 } } } },
      skipped: []
    });
    const awsExec = {
      dryRun: false,
      run: (_cmd: string, args: string[]) => {
        const key = args.join(' ');
        if (key.includes('instance-0.json')) { return { stdout: instanceBody, stderr: '', status: 0 }; }
        return { stdout: '', stderr: '', status: 0 };   // uploads / FAILED probes
      }
    };
    // trail seam (string-returning): 5.1.0 general.json exists with a baseline.
    const chartExec = {
      dryRun: false,
      run: (_cmd: string, args: string[]) => {
        if (args[0] === 'fetch') { return ''; }
        if (args[0] === 'show' && args[1].includes('release-5.1.0/general.json')) {
          return '{"results":[{"name":"t","ops":100}]}';
        }
        return null;
      }
    };
    const opts = { region: 'us-east-1', timeoutMinutes: 1, instanceType: 'c8g.medium', samples: 1, instances: 1 };
    const ctx  = { dest: 's3://b/_trail_audit/rid', runId: 'rid', instanceIndices: [0],
                   selected: ['5.1.0'], repoDir: '.', chartExec };
    expect( A.waitForAudit(awsExec, opts, ctx) ).toBe(0);
  });

  test('waitForAudit returns 1 on a failure marker', () => {
    let call = 0;
    const awsExec = {
      dryRun: false,
      run: (_cmd: string, args: string[]) => {
        const key = args.join(' ');
        if (key.includes('instance-0.json')) { return { stdout: '', stderr: '', status: 1 }; }   // not landed
        if (key.includes('FAILED')) { return (++call, { stdout: 'boom', stderr: '', status: 0 }); }
        return { stdout: '', stderr: '', status: 1 };
      }
    };
    const opts = { region: 'us-east-1', timeoutMinutes: 1, instanceType: 'c8g.medium', samples: 1, instances: 1 };
    const ctx  = { dest: 's3://b/x', runId: 'rid', instanceIndices: [0], selected: ['5.1.0'], repoDir: '.', chartExec: awsExec };
    expect( A.waitForAudit(awsExec, opts, ctx) ).toBe(1);
  });

  test('waitForAudit returns 2 on timeout, sleeping between polls', () => {
    const awsExec = { dryRun: false, run: () => ({ stdout: '', stderr: '', status: 1 }) };
    const realNow = Date.now;
    try {
      let t = realNow();
      Date.now = () => t;
      let naps = 0;
      const opts = { region: 'us-east-1', timeoutMinutes: 1, instanceType: 'c8g.medium', samples: 1, instances: 1,
                     _sleep: () => { naps += 1; t += 61_000; } };
      const ctx  = { dest: 's3://b/x', runId: 'rid', instanceIndices: [0], selected: ['5.1.0'], repoDir: '.', chartExec: awsExec };
      expect( A.waitForAudit(awsExec, opts, ctx) ).toBe(2);
      expect(naps).toBe(1);
    } finally {
      Date.now = realNow;
    }
  });

  test('main returns 1 with usage on bad args', () => {
    expect( A.main(['node', 's', '--versions', 'last:0']) ).toBe(1);
  });

  test('main returns 1 when the selection resolves empty (range vs empty dry-run trail)', () => {
    expect( A.main(['node', 's', '--versions', '5.1.0..5.9.0', '--dry-run']) ).toBe(1);
  });

  test('main refuses an absurd plan without --i-know', () => {
    const many = Array.from({ length: 11 }, (_, i) => `5.1.${i}`).join(',');
    expect( A.main(['node', 's', '--versions', many, '--samples', '5', '--instances', '1', '--dry-run']) ).toBe(1);
  });

  test('main proceeds through the absurd plan with --i-know', () => {
    const many = Array.from({ length: 11 }, (_, i) => `5.1.${i}`).join(',');
    expect( A.main(['node', 's', '--versions', many, '--samples', '5', '--instances', '1', '--i-know', '--dry-run']) ).toBe(0);
  });

  test('main dry-run fires without waiting (list spec walkable offline)', () => {
    expect( A.main(['node', 's', '--versions', '5.1.0,5.2.0', '--dry-run']) ).toBe(0);
  });

  test('main dry-run with --wait exercises the wait path', () => {
    expect( A.main(['node', 's', '--versions', '5.1.0,5.2.0', '--wait', '--dry-run']) ).toBe(0);
  });

});
