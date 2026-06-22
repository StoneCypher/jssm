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
    expect(o.shutdownMinutes).toBe(90);   // raised from 30; see #725
    expect(o.deep).toBe(false);
    expect(o.spot).toBe(false);
    expect(o.force).toBe(false);
    expect(o.dryRun).toBe(false);
    expect(o.harnessFrom).toBeUndefined();
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

  test('--harness-from threads through (overlay ref for benching old PRs)', () => {
    expect(gp.parseArgs(['677', '--harness-from', 'main']).harnessFrom).toBe('main');
  });

  test('--harness-from requires a value', () => {
    expect(() => gp.parseArgs(['677', '--harness-from'])).toThrow(/requires a value/);
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
    shutdownMinutes: 15,
    prNumber: 677
  };

  test('the scaling benchmark exposes gc on the --harness-from direct-node path', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: false, harnessFrom: 'main' });
    expect(s).toContain('node --expose-gc ./src/buildjs/benchmark_scaling.cjs');
  });

  test('the --harness-from overlay also checks out the memory module', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: false, harnessFrom: 'main' });
    expect(s).toContain('benchmark_scaling_memory.cjs');
  });

  test('benny:scaling npm script exposes gc (covers the non-overlay run paths)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../../../package.json');
    expect(pkg.scripts['benny:scaling']).toContain('--expose-gc');
  });

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
    expect(s).toContain('npm install');
    expect(s).toContain('npm run make');
    expect(s).toContain('JSSM_PERF_DONE');
  });

  test('includes the bounded profiled construct pass', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: false });
    expect(s).toContain('node --prof');
    expect(s).toContain('--prof-process');
    expect(s).toContain('cat > perf_probe.cjs');   // in the repo cwd, not /tmp, so
    expect(s).not.toContain('/tmp/perf_probe');     // require('./dist/...') resolves to ./dist
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

  test('fetches refs/pull/<n>/head so a deleted-branch PR still resolves', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: false });
    expect(s).toContain('refs/pull/677/head');
  });

  test('without --harness-from, runs the PR\'s own benny:scaling', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: false });
    expect(s).toContain('npm run benny:scaling');
    expect(s).not.toContain('git checkout FETCH_HEAD');
  });

  test('--harness-from overlays today\'s harness and runs it directly', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: false, harnessFrom: 'main' });
    expect(s).toContain('git fetch origin "main"');
    expect(s).toContain('git checkout FETCH_HEAD -- src/buildjs/benchmark_scaling.cjs');
    expect(s).toContain('benchmark/fixtures');
    expect(s).toContain('npm install benny');
    expect(s).toContain('node --expose-gc ./src/buildjs/benchmark_scaling.cjs');
    expect(s).not.toContain('npm run benny:scaling');
  });

  test('--harness-from honors deep mode', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: true, harnessFrom: 'main' });
    expect(s).toContain('BENNY_DEEP=1 node --expose-gc ./src/buildjs/benchmark_scaling.cjs');
  });

  test('runs the general (hook microbenchmark) suite as its own line', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: false });
    // line-exact: 'npm run benny:scaling' contains 'npm run benny' as a substring
    expect(s.split('\n')).toContain('npm run benny');
  });

  test('general suite is not deepened', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: true });
    expect(s.split('\n')).toContain('npm run benny');
    expect(s.split('\n')).not.toContain('BENNY_DEEP=1 npm run benny');
  });

  test('--harness-from overlays and runs the general suite too', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: false, harnessFrom: 'main' });
    expect(s).toContain('src/buildjs/benchmark.cjs');
    expect(s.split('\n')).toContain('node ./src/buildjs/benchmark.cjs');
  });

  test('rejects a non-numeric PR number (injection guard)', () => {
    expect(() => gp.buildRemoteScript({ ...ok, prNumber: '1; rm -rf /', deep: false }))
      .toThrow(/non-numeric PR/);
  });

  test('rejects an unsafe harness ref (injection guard)', () => {
    expect(() => gp.buildRemoteScript({ ...ok, harnessFrom: 'main; curl evil', deep: false }))
      .toThrow(/unsafe harness ref/);
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

describe('summarizeFinalInstanceState — post-teardown report', () => {

  test('a single terminated instance reads as cleaned up', () => {
    const r = gp.summarizeFinalInstanceState('terminated');
    expect(r.states).toEqual(['terminated']);
    expect(r.allClear).toBe(true);
    expect(r.summary).toContain('terminated');
    expect(r.summary).toContain('✓');
  });

  test('shutting-down counts as cleared (it always proceeds to terminated)', () => {
    const r = gp.summarizeFinalInstanceState('shutting-down');
    expect(r.allClear).toBe(true);
    expect(r.summary).toContain('shutting-down');
  });

  test('empty result (no surviving instance) is clear', () => {
    const r = gp.summarizeFinalInstanceState('');
    expect(r.states).toEqual([]);
    expect(r.allClear).toBe(true);
    expect(r.summary).toContain('no tagged instance survives');
  });

  test('a still-running instance is surfaced as a leak, not swallowed', () => {
    const r = gp.summarizeFinalInstanceState('running');
    expect(r.allClear).toBe(false);
    expect(r.summary).toContain('NOT torn down');
    expect(r.summary).toContain('running');
    expect(r.summary).toContain('--cleanup-only');
  });

  test('mixed states report every survivor and stay not-clear if any lingers', () => {
    const r = gp.summarizeFinalInstanceState('terminated\nstopped');
    expect(r.states).toEqual(['terminated', 'stopped']);
    expect(r.allClear).toBe(false);
    expect(r.summary).toContain('stopped');
  });

  test('whitespace/newline/tab-separated text output parses cleanly', () => {
    const r = gp.summarizeFinalInstanceState('  terminated \n shutting-down \t');
    expect(r.states).toEqual(['terminated', 'shutting-down']);
    expect(r.allClear).toBe(true);
  });

});

describe('provisionDetached / runDetached — fire and walk away', () => {

  // Fake exec that records calls and returns canned stdout per aws subcommand.
  const fakeExec = () => {
    const calls: string[] = [];
    const run = (cmd: string, args: string[]) => {
      calls.push([cmd, ...args].join(' '));
      const a = args.join(' ');
      if (a.includes('ssm get-parameter')) { return { status: 0, stdout: 'ami-abc', stderr: '' }; }
      if (a.includes('describe-vpcs'))      { return { status: 0, stdout: 'vpc-abc', stderr: '' }; }
      if (a.includes('describe-subnets'))   { return { status: 0, stdout: 'subnet-abc', stderr: '' }; }
      if (a.includes('run-instances'))      { return { status: 0, stdout: 'i-abc', stderr: '' }; }
      return { status: 0, stdout: '', stderr: '' };
    };
    return { exec: { run, dryRun: false }, calls };
  };

  const opts = {
    detached: true, release: '5.1.0', commit: 'a'.repeat(40),
    instanceType: 'c7g.medium', region: 'us-east-1', mode: 'normal', deep: false,
    shutdownMinutes: 30, spot: false, force: false
  };

  test('provisionDetached launches one tagged instance and records its id', () => {
    const h = fakeExec();
    const state = { runId: 'jssm-perf-x', region: 'us-east-1', instanceType: 'c7g.medium',
                    tmpDir: require('os').tmpdir() };
    gp.provisionDetached(h.exec, opts, state);
    expect(state.instanceId).toBe('i-abc');
    expect(h.calls.some((c) => c.includes('run-instances'))).toBe(true);
    expect(h.calls.some((c) => c.includes('--iam-instance-profile'))).toBe(true);
  });

  test('runDetached never tears down (no terminate / no wait)', () => {
    const h = fakeExec();
    const code = gp.runDetached(h.exec, opts);
    expect(code).toBe(0);
    expect(h.calls.some((c) => c.includes('terminate-instances'))).toBe(false);
    expect(h.calls.some((c) => c.includes('wait instance-terminated'))).toBe(false);
  });

});

describe('buildDetachedRunInstancesArgs — no key, no SG ingress, instance profile', () => {

  const base = {
    region: 'us-east-1', amiId: 'ami-123', instanceType: 'c7g.medium',
    subnetId: 'subnet-abc', userDataPath: '/tmp/ud.sh', runId: 'jssm-perf-x',
    instanceProfile: 'jssm-graviton-perf', spot: false
  };

  test('attaches the instance profile and self-terminates on shutdown', () => {
    const a = gp.buildDetachedRunInstancesArgs(base);
    const joined = a.join(' ');
    expect(joined).toContain('--iam-instance-profile');
    expect(joined).toContain('Name=jssm-graviton-perf');
    expect(joined).toContain('--instance-initiated-shutdown-behavior terminate');
    expect(joined).toContain('file:///tmp/ud.sh');
  });

  test('uses no key pair and no security-group ingress (SSH-less)', () => {
    const joined = gp.buildDetachedRunInstancesArgs(base).join(' ');
    expect(joined).not.toContain('--key-name');
    expect(joined).not.toContain('--security-group-ids');
  });

  test('tags the instance for sweepability', () => {
    const joined = gp.buildDetachedRunInstancesArgs(base).join(' ');
    expect(joined).toContain('jssm-perf-run');
    expect(joined).toContain('Value=jssm-perf-x');
  });

  test('--spot injects one-time terminate market options', () => {
    const joined = gp.buildDetachedRunInstancesArgs({ ...base, spot: true }).join(' ');
    expect(joined).toContain('--instance-market-options');
    expect(joined).toContain('SpotInstanceType=one-time');
  });

});

describe('buildDetachedUserData — self-contained release run', () => {

  const ok = {
    repoUrl: 'https://github.com/StoneCypher/jssm.git',
    commitSha: 'a'.repeat(40),
    release: '5.141.5',
    instanceType: 'c7g.medium',
    region: 'us-east-1',
    shutdownMinutes: 30,
    bucket: 'jssm-perf-results-test'
  };

  test('arms the dead-man\'s-switch and ends by self-terminating', () => {
    const s = gp.buildDetachedUserData({ ...ok, deep: false });
    expect(s.startsWith('#!/bin/bash')).toBe(true);
    expect(s).toContain('shutdown -h +30');   // backstop
    expect(s).toContain('shutdown -h now');    // explicit self-terminate at the end
  });

  test('checks out the exact commit and benchmarks the committed dist (no rebuild)', () => {
    const s = gp.buildDetachedUserData({ ...ok, deep: false });
    expect(s).toContain(`git checkout ${'a'.repeat(40)}`);
    // The release path benchmarks the SHIPPED artifact, not a rebuild (#725):
    // installs harness deps but does NOT run make, and guards on committed dist.
    expect(s).toContain('npm install');
    expect(s).not.toContain('npm run make');
    expect(s).toContain('dist/jssm.es5.cjs');
    expect(s).toContain('dist/jssm.es5.nonmin.cjs');
  });

  test('normal vs deep benny gate', () => {
    expect(gp.buildDetachedUserData({ ...ok, deep: false })).toContain('npm run benny:scaling');
    expect(gp.buildDetachedUserData({ ...ok, deep: false })).not.toContain('BENNY_DEEP=1');
    expect(gp.buildDetachedUserData({ ...ok, deep: true })).toContain('BENNY_DEEP=1 npm run benny:scaling');
  });

  test('includes the bounded profiled construct pass', () => {
    const s = gp.buildDetachedUserData({ ...ok, deep: false });
    expect(s).toContain('node --prof');
    expect(s).toContain('--prof-process');
    expect(s).toContain('jssm.es5.nonmin.cjs');
  });

  test('runs the general suite and uploads general.json best-effort', () => {
    const s = gp.buildDetachedUserData({ ...ok, deep: false });
    // line-exact: 'npm run benny:scaling' contains 'npm run benny' as a substring
    expect(s.split('\n')).toContain('npm run benny');
    expect(s).toContain('benchmark/results/general.json');
    expect(s).toContain('JSSM_PERF: general.json upload failed; continuing');
  });

  test('uploads to the S3 bucket under the release dir, with no GitHub credential anywhere', () => {
    const s = gp.buildDetachedUserData({ ...ok, deep: false });
    expect(s).toContain('aws s3 cp');
    expect(s).toContain('s3://jssm-perf-results-test/c7g.medium/release-5.141.5');
    // the whole point of the S3 design: no token machinery on the instance
    expect(s).not.toContain('x-access-token');
    expect(s).not.toContain('ssm get-parameter --region us-east-1 --name "/jssm/perf-push-pat"');
    expect(s).not.toContain('git push');
  });

  test('writes a meta.json stamped arm64 + release', () => {
    const s = gp.buildDetachedUserData({ ...ok, deep: false });
    expect(s).toContain('"arch": "arm64"');
    expect(s).toContain('"release": "5.141.5"');
  });

  test('reports upload success and failure explicitly, naming the likely fix on failure', () => {
    const s = gp.buildDetachedUserData({ ...ok, deep: false });
    expect(s).toContain('JSSM_PERF: uploaded to $DEST');
    expect(s).toContain('JSSM_PERF: upload FAILED; results were not published');
    expect(s).toContain('s3:PutObject');
    // the misleading failure label from the git-publish era must never return
    expect(s).not.toContain('rebase conflict');
  });

  test('a failed profile upload continues rather than failing the publish', () => {
    const s = gp.buildDetachedUserData({ ...ok, deep: false });
    expect(s).toContain('JSSM_PERF: prof upload failed; continuing');
  });

  test('guards the upload on a produced scaling.json (no dedup poisoning on a failed build)', () => {
    const s = gp.buildDetachedUserData({ ...ok, deep: false });
    expect(s).toContain('if [ -s benchmark/results/scaling.json ]; then');
    expect(s).toContain('skipping upload');
  });

  test('rejects an unsafe commit SHA', () => {
    expect(() => gp.buildDetachedUserData({ ...ok, commitSha: 'a; rm -rf /', deep: false }))
      .toThrow(/unsafe commit/);
  });

  test('rejects an unsafe release string', () => {
    expect(() => gp.buildDetachedUserData({ ...ok, release: 'a;b', deep: false }))
      .toThrow(/unsafe release/);
  });

  test('rejects an unsafe region', () => {
    expect(() => gp.buildDetachedUserData({ ...ok, region: 'us east 1', deep: false }))
      .toThrow(/unsafe region/);
  });

  test('rejects an unsafe bucket name', () => {
    expect(() => gp.buildDetachedUserData({ ...ok, bucket: 'a;b', deep: false }))
      .toThrow(/unsafe bucket/);
    expect(() => gp.buildDetachedUserData({ ...ok, bucket: 'Has_Uppercase', deep: false }))
      .toThrow(/unsafe bucket/);
  });

});

describe('release-slug keying', () => {

  test('releaseSlug builds release-<version>', () => {
    expect(gp.releaseSlug('5.141.5')).toBe('release-5.141.5');
  });

  test('slug path/dir builders', () => {
    expect(gp.perfResultPathForSlug('c7g.medium', 'release-5.1.0', 'scaling.json'))
      .toBe('c7g.medium/release-5.1.0/scaling.json');
    expect(gp.perfResultDirForSlug('c7g.medium', 'release-5.1.0'))
      .toBe('c7g.medium/release-5.1.0');
  });

  test('PR helpers still build pr-<num> (unchanged API)', () => {
    expect(gp.perfResultPath('c7g.medium', 677, 'scaling.json')).toBe('c7g.medium/pr-677/scaling.json');
    expect(gp.perfResultDir('c7g.medium', 677)).toBe('c7g.medium/pr-677');
  });

  test('decideMeasureSlug skips an already-present release, force overrides', () => {
    const existing = ['c7g.medium/release-5.1.0/scaling.json'];
    expect(gp.decideMeasureSlug(existing, 'c7g.medium', 'release-5.1.0', false).measure).toBe(false);
    expect(gp.decideMeasureSlug(existing, 'c7g.medium', 'release-5.1.0', true).measure).toBe(true);
    expect(gp.decideMeasureSlug(existing, 'c7g.medium', 'release-5.2.0', false).measure).toBe(true);
  });

});

describe('parseArgs — detached release mode', () => {

  const sha = 'a'.repeat(40);

  test('accepts --detached with --release and --commit', () => {
    const o = gp.parseArgs(['--detached', '--release', '5.141.5', '--commit', sha]);
    expect(o.detached).toBe(true);
    expect(o.release).toBe('5.141.5');
    expect(o.commit).toBe(sha);
    expect(o.prNumber).toBeUndefined();
  });

  test('--detached + --mode deep still sets deep', () => {
    const o = gp.parseArgs(['--detached', '--release', '5.1.0', '--commit', sha, '--mode', 'deep']);
    expect(o.deep).toBe(true);
  });

  test('--detached rejects a PR positional', () => {
    expect(() => gp.parseArgs(['677', '--detached', '--release', '5.1.0', '--commit', sha]))
      .toThrow(/not a PR/);
  });

  test('--detached requires --release', () => {
    expect(() => gp.parseArgs(['--detached', '--commit', sha])).toThrow(/requires --release/);
  });

  test('--detached requires --commit', () => {
    expect(() => gp.parseArgs(['--detached', '--release', '5.1.0'])).toThrow(/requires --commit/);
  });

  test('--detached rejects a non-hex commit', () => {
    expect(() => gp.parseArgs(['--detached', '--release', '5.1.0', '--commit', 'nope']))
      .toThrow(/hex SHA/);
  });

  test('--detached rejects an unsafe release string', () => {
    expect(() => gp.parseArgs(['--detached', '--release', 'a b;c', '--commit', sha]))
      .toThrow(/version string/);
  });

  test('--release/--commit are rejected without --detached', () => {
    expect(() => gp.parseArgs(['677', '--release', '5.1.0'])).toThrow(/only valid with --detached/);
  });

});

describe('pushPerfResults — concurrent push retry', () => {

  // Build a fake executor whose `git push` returns the given status sequence
  // (clamped to the last value), and 0 for every other git call.
  const fakeExec = (pushStatuses) => {
    let pushIdx = 0;
    const calls: string[] = [];
    const run = (cmd: string, args: string[]) => {
      calls.push([cmd, ...args].join(' '));
      if (args.includes('push')) {
        const status = pushStatuses[Math.min(pushIdx, pushStatuses.length - 1)];
        pushIdx += 1;
        return { status, stdout: '', stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    };
    return { exec: { run, dryRun: false }, calls, pushCount: () => pushIdx };
  };

  test('pushes once and never rebases when the first push succeeds', () => {
    const h = fakeExec([0]);
    gp.pushPerfResults(h.exec, '/repo');
    expect(h.pushCount()).toBe(1);
    expect(h.calls.some((c) => c.includes('rebase'))).toBe(false);
  });

  test('fetches + rebases + retries on a rejected (non-fast-forward) push', () => {
    const h = fakeExec([1, 0]);   // reject once, then succeed
    gp.pushPerfResults(h.exec, '/repo');
    expect(h.pushCount()).toBe(2);
    expect(h.calls.some((c) => c.includes('fetch origin perf_results'))).toBe(true);
    expect(h.calls.some((c) => c.includes('rebase origin/perf_results'))).toBe(true);
  });

  test('gives up with a clear error after exhausting the retry budget', () => {
    const h = fakeExec([1]);      // always rejected
    expect(() => gp.pushPerfResults(h.exec, '/repo')).toThrow(/after \d+ attempts/);
  });

  test('returns on the first push in dry-run (no rebase)', () => {
    const calls: string[] = [];
    const exec = { dryRun: true, run: (cmd: string, args: string[]) => { calls.push([cmd, ...args].join(' ')); return { status: 0 }; } };
    gp.pushPerfResults(exec, '/repo');
    expect(calls.filter((c) => c.includes('push')).length).toBe(1);
  });

});
