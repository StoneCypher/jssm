import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const gp = require('../graviton_perf.cjs');
const launch = require('../graviton_perf_launch.cjs');

// All tests here exercise the PURE, AWS-free logic only: arg/flag parsing,
// instance-type validation, run-id format, perf_results path construction, the
// dedup decision, meta shaping, tag/filter builders, the remote-script builder,
// and the background launcher's log-path/positional helpers. No AWS, ssh, git,
// or gh call is reachable from any test below.

describe('parseArgs — defaults and positional', () => {

  test('takes the PR number as the first positional', () => {
    expect(gp.parseArgs(['677']).prNumber).toBe(677);
  });

  test('applies documented defaults', () => {
    const o = gp.parseArgs(['677']);
    expect(o.instanceType).toBe('c7g.medium');
    expect(o.mode).toBe('normal');
    expect(o.region).toBe('us-east-1');
    expect(o.shutdownMinutes).toBe(15);
    expect(o.deep).toBe(false);
    expect(o.spot).toBe(false);
    expect(o.force).toBe(false);
    expect(o.dryRun).toBe(false);
  });

  test('rejects a non-numeric PR number', () => {
    expect(() => gp.parseArgs(['feat-branch'])).toThrow(/positive integer/);
  });

  test('requires a PR number for a measurement run', () => {
    expect(() => gp.parseArgs([])).toThrow(/PR number is required/);
  });

  test('does NOT require a PR number under --cleanup-only', () => {
    const o = gp.parseArgs(['--cleanup-only']);
    expect(o.cleanupOnly).toBe(true);
    expect(o.prNumber).toBeUndefined();
  });

  test('rejects a second positional', () => {
    expect(() => gp.parseArgs(['677', '678'])).toThrow(/extra positional/);
  });

});

describe('parseArgs — flags', () => {

  test('--mode deep sets deep true', () => {
    const o = gp.parseArgs(['677', '--mode', 'deep']);
    expect(o.mode).toBe('deep');
    expect(o.deep).toBe(true);
  });

  test('--mode rejects a bad value', () => {
    expect(() => gp.parseArgs(['677', '--mode', 'turbo'])).toThrow(/normal.*deep/);
  });

  test('--instance-type overrides the default', () => {
    expect(gp.parseArgs(['677', '--instance-type', 'c6g.medium']).instanceType).toBe('c6g.medium');
  });

  test('--region, --subnet-id, --my-ip, --run-id thread through', () => {
    const o = gp.parseArgs([
      '677', '--region', 'eu-west-1', '--subnet-id', 'subnet-abc',
      '--my-ip', '203.0.113.7/32', '--run-id', 'jssm-perf-fixed'
    ]);
    expect(o.region).toBe('eu-west-1');
    expect(o.subnetId).toBe('subnet-abc');
    expect(o.myIp).toBe('203.0.113.7/32');
    expect(o.runId).toBe('jssm-perf-fixed');
  });

  test('--spot, --force, --keep, --dry-run are booleans', () => {
    const o = gp.parseArgs(['677', '--spot', '--force', '--keep', '--dry-run']);
    expect(o.spot).toBe(true);
    expect(o.force).toBe(true);
    expect(o.keep).toBe(true);
    expect(o.dryRun).toBe(true);
  });

  test('--shutdown-minutes parses an integer and rejects junk', () => {
    expect(gp.parseArgs(['677', '--shutdown-minutes', '30']).shutdownMinutes).toBe(30);
    expect(() => gp.parseArgs(['677', '--shutdown-minutes', 'soon'])).toThrow(/positive integer/);
  });

  test('rejects an unknown flag', () => {
    expect(() => gp.parseArgs(['677', '--turbo'])).toThrow(/unknown flag/);
  });

  test('rejects a flag missing its value', () => {
    expect(() => gp.parseArgs(['677', '--region'])).toThrow(/requires a value/);
  });

});

describe('validateInstanceType — Graviton allowlist', () => {

  test('accepts every allowlisted type', () => {
    for (const t of gp.ALLOWED_INSTANCE_TYPES) {
      expect(gp.validateInstanceType(t)).toBe(t);
    }
  });

  test('rejects a burstable t4g type with a credit-throttling explanation', () => {
    expect(() => gp.validateInstanceType('t4g.medium')).toThrow(/burstable/);
    expect(() => gp.validateInstanceType('t4g.medium')).toThrow(/CPU-credit/);
  });

  test('rejects a burstable t3 type', () => {
    expect(() => gp.validateInstanceType('t3.medium')).toThrow(/burstable/);
  });

  test('rejects a non-Graviton type that is not on the allowlist', () => {
    expect(() => gp.validateInstanceType('c7g.large')).toThrow(/not an accepted Graviton/);
    expect(() => gp.validateInstanceType('m5.medium')).toThrow(/not an accepted Graviton/);
  });

  test('parseArgs surfaces the burstable rejection', () => {
    expect(() => gp.parseArgs(['677', '--instance-type', 't4g.medium'])).toThrow(/burstable/);
  });

});

describe('makeRunId — format', () => {

  test('is deterministic given an injected time and suffix', () => {
    const id = gp.makeRunId(new Date('2026-06-02T14:30:12Z'), 'a1b9f2');
    expect(id).toBe('jssm-perf-20260602-143012-a1b9f2');
  });

  test('matches the jssm-perf-<stamp>-<6hex> shape with random parts', () => {
    expect(gp.makeRunId()).toMatch(/^jssm-perf-\d{8}-\d{6}-[0-9a-f]{6}$/);
  });

});

describe('perfResultPath / perfResultDir — layout keyed by machine type then PR', () => {

  test('builds <instance-type>/pr-<num>/<file>', () => {
    expect(gp.perfResultPath('c7g.medium', 677, 'scaling.json')).toBe('c7g.medium/pr-677/scaling.json');
    expect(gp.perfResultPath('c6g.medium', 12, 'construct.prof.txt')).toBe('c6g.medium/pr-12/construct.prof.txt');
    expect(gp.perfResultPath('c7g.medium', 677, 'meta.json')).toBe('c7g.medium/pr-677/meta.json');
  });

  test('dir is the prefix without a filename', () => {
    expect(gp.perfResultDir('c7g.medium', 677)).toBe('c7g.medium/pr-677');
  });

});

describe('decideMeasure — measure a (type, PR) at most once', () => {

  test('measures when perf_results is empty (branch absent)', () => {
    const d = gp.decideMeasure([], 'c7g.medium', 677, false);
    expect(d.measure).toBe(true);
    expect(d.reason).toMatch(/no existing results/);
  });

  test('skips when a result already exists for that (type, PR)', () => {
    const existing = ['c7g.medium/pr-677/scaling.json', 'c7g.medium/pr-677/meta.json'];
    const d = gp.decideMeasure(existing, 'c7g.medium', 677, false);
    expect(d.measure).toBe(false);
    expect(d.reason).toMatch(/already exist/);
    expect(d.reason).toMatch(/--force/);
  });

  test('--force re-measures despite existing results', () => {
    const existing = ['c7g.medium/pr-677/scaling.json'];
    const d = gp.decideMeasure(existing, 'c7g.medium', 677, true);
    expect(d.measure).toBe(true);
    expect(d.reason).toMatch(/force/i);
  });

  test('a result for a DIFFERENT machine type does not block this one', () => {
    const existing = ['c6g.medium/pr-677/scaling.json'];
    expect(gp.decideMeasure(existing, 'c7g.medium', 677, false).measure).toBe(true);
  });

  test('a result for a DIFFERENT PR does not block this one', () => {
    const existing = ['c7g.medium/pr-678/scaling.json'];
    expect(gp.decideMeasure(existing, 'c7g.medium', 677, false).measure).toBe(true);
  });

  test('does not false-positive on a PR that is a numeric prefix of another', () => {
    // pr-67 must not be considered "already measured" because pr-677 exists.
    const existing = ['c7g.medium/pr-677/scaling.json'];
    expect(gp.decideMeasure(existing, 'c7g.medium', 67, false).measure).toBe(true);
  });

});

describe('buildMeta — sidecar shape', () => {

  test('records provenance and stamps arm64', () => {
    const m = gp.buildMeta({
      prNumber: 677, instanceType: 'c7g.medium', mode: 'deep',
      commitSha: 'abc123', headRefName: 'feat_x', region: 'us-east-1',
      timestamp: '2026-06-02T00:00:00.000Z'
    });
    expect(m.pr).toBe(677);
    expect(m.instanceType).toBe('c7g.medium');
    expect(m.arch).toBe('arm64');
    expect(m.mode).toBe('deep');
    expect(m.commitSha).toBe('abc123');
    expect(m.headRefName).toBe('feat_x');
    expect(m.region).toBe('us-east-1');
    expect(m.timestamp).toBe('2026-06-02T00:00:00.000Z');
    expect(m.runner).toMatch(/graviton_perf/);
  });

  test('round-trips through JSON', () => {
    const m = gp.buildMeta({
      prNumber: 1, instanceType: 'c6g.medium', mode: 'normal',
      commitSha: 'deadbeef', headRefName: 'x', region: 'r', timestamp: 't'
    });
    expect(JSON.parse(JSON.stringify(m))).toEqual(m);
  });

});

describe('tagSpec / tagFilter — sweepable tagging', () => {

  test('tagSpec tags run, sweep marker, and Name', () => {
    const s = gp.tagSpec('instance', 'jssm-perf-x');
    expect(s).toContain('ResourceType=instance');
    expect(s).toContain('Key=jssm-perf-run,Value=jssm-perf-x');
    expect(s).toContain('Key=jssm-perf,Value=true');
    expect(s).toContain('Key=Name,Value=jssm-perf-x');
  });

  test('tagFilter scopes to all runner resources without a run id', () => {
    expect(gp.tagFilter()).toBe('Name=tag:jssm-perf,Values=true');
  });

  test('tagFilter narrows to one run with a run id', () => {
    expect(gp.tagFilter('jssm-perf-x')).toBe('Name=tag:jssm-perf-run,Values=jssm-perf-x');
  });

});

describe('buildUserData — dead-man\'s-switch', () => {

  test('arms shutdown with the given minutes', () => {
    expect(gp.buildUserData(15)).toContain('shutdown -h +15');
    expect(gp.buildUserData(20)).toContain('shutdown -h +20');
  });

  test('is a bash script', () => {
    expect(gp.buildUserData(15).startsWith('#!/bin/bash')).toBe(true);
  });

});

describe('buildRemoteScript — normal vs deep and ref safety', () => {

  const ok = {
    repoUrl: 'https://github.com/StoneCypher/jssm.git',
    headRefName: 'feat_26-06-02_x',
    commitSha: 'a'.repeat(40),
    shutdownMinutes: 15
  };

  test('normal mode runs benny without BENNY_DEEP', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: false });
    expect(s).toContain('npm run benny:scaling');
    expect(s).not.toContain('BENNY_DEEP=1');
  });

  test('deep mode prefixes BENNY_DEEP=1', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: true });
    expect(s).toContain('BENNY_DEEP=1 npm run benny:scaling');
  });

  test('pins the exact PR commit and builds dist via make', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: false });
    expect(s).toContain(`git checkout ${'a'.repeat(40)}`);
    expect(s).toContain('npm ci');
    expect(s).toContain('npm run make');
    expect(s).toContain('JSSM_PERF_DONE');
  });

  test('includes the bounded profiled construct pass', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: false });
    expect(s).toContain('node --prof');
    expect(s).toContain('--prof-process');
    expect(s).toContain('construct.prof.txt');
    expect(s).toContain('jssm.es5.nonmin.cjs');
  });

  test('rejects an unsafe commit SHA (injection guard)', () => {
    expect(() => gp.buildRemoteScript({ ...ok, commitSha: 'a; rm -rf /', deep: false }))
      .toThrow(/unsafe commit/);
  });

  test('rejects an unsafe head ref (injection guard)', () => {
    expect(() => gp.buildRemoteScript({ ...ok, headRefName: 'x; curl evil', deep: false }))
      .toThrow(/unsafe head ref/);
  });

  test('rejects an unsafe repo url', () => {
    expect(() => gp.buildRemoteScript({ ...ok, repoUrl: 'file:///etc/passwd', deep: false }))
      .toThrow(/unsafe repo url/);
  });

});

describe('quoteForDisplay — dry-run rendering only', () => {

  test('leaves simple tokens unquoted', () => {
    expect(gp.quoteForDisplay('ec2')).toBe('ec2');
    expect(gp.quoteForDisplay('--region')).toBe('--region');
  });

  test('quotes tokens with spaces or special chars', () => {
    expect(gp.quoteForDisplay('a b')).toBe("'a b'");
    expect(gp.quoteForDisplay('Tags=[{Key=Name}]')).toBe('Tags=[{Key=Name}]');
  });

});

describe('makeExecutor — dry-run seam never executes', () => {

  test('dry-run returns a canned result and a dryRun flag, runs nothing', () => {
    const exec = gp.makeExecutor(true);
    const res = exec.run('aws', ['sts', 'get-caller-identity']);
    expect(res.dryRun).toBe(true);
    expect(res.status).toBe(0);
  });

  test('dry-run honors a canned stdout for downstream parsing', () => {
    const exec = gp.makeExecutor(true);
    const res = exec.run('aws', ['ssm', 'get-parameter'], { dryRunStdout: 'ami-123' });
    expect(res.stdout).toBe('ami-123');
  });

});

describe('graviton_perf_launch — pure helpers', () => {

  test('logPathFor stamps PR and UTC time under build/', () => {
    const p = launch.logPathFor('/r/build', '677', new Date('2026-06-02T14:30:12Z'));
    expect(p.replace(/\\/g, '/')).toBe('/r/build/graviton_perf_pr677_20260602-143012.log');
  });

  test('firstPositional finds the PR number past valued flags', () => {
    expect(launch.firstPositional(['677', '--mode', 'deep'])).toBe('677');
    expect(launch.firstPositional(['--mode', 'deep', '677'])).toBe('677');
    expect(launch.firstPositional(['--region', 'us-east-1', '--spot', '677'])).toBe('677');
  });

  test('firstPositional returns unknown when there is no positional', () => {
    expect(launch.firstPositional(['--cleanup-only'])).toBe('unknown');
  });

});
