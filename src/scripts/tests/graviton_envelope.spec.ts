
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  ENVELOPE_PREFIX,
  envelopeDir,
  sync_sleep,
  parseEnvelopeArgs,
  computeVerdict,
  renderVerdictMarkdown,
  buildEnvelopeUserData,
  fireEnvelope,
  waitForVerdict,
  main
} = require('../graviton_envelope.cjs');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeExecutor } = require('../graviton_perf.cjs');

const A40 = 'a'.repeat(40);
const B40 = 'b'.repeat(40);

const good_userdata_params = () => ({
  repoUrl         : 'https://github.com/StoneCypher/jssm.git',
  baseSha         : A40,
  headSha         : B40,
  samples         : 3,
  region          : 'us-east-1',
  bucket          : 'jssm-perf-results-032239181269',
  runId           : 'jssm-perf-20260702-x',
  instanceType    : 'c8g.medium',
  shutdownMinutes : 90
});



describe('envelopeDir', () => {

  test('keys under the underscore prefix the nightly sync excludes', () => {
    expect( envelopeDir('r1') ).toBe(`${ENVELOPE_PREFIX}/r1`);
    expect( ENVELOPE_PREFIX.startsWith('_') ).toBe(true);
  });

});



describe('sync_sleep', () => {

  test('blocks for roughly the requested time', () => {
    const before = Date.now();
    sync_sleep(5);
    expect( Date.now() - before ).toBeGreaterThanOrEqual(3);
  });

});



describe('parseEnvelopeArgs', () => {

  const base = ['node', 'graviton_envelope.cjs', '--base', A40, '--head', B40];

  test('defaults', () => {
    const o = parseEnvelopeArgs(base);
    expect(o.samples).toBe(3);
    expect(o.instanceType).toBe('c8g.medium');
    expect(o.spot).toBe(false);
    expect(o.wait).toBe(false);
    expect(o.dryRun).toBe(false);
    expect(o.timeoutMinutes).toBe(45);
  });

  test('flags land', () => {
    const o = parseEnvelopeArgs([...base, '--samples', '5', '--spot', '--wait',
      '--timeout-minutes', '10', '--region', 'us-west-2', '--subnet-id', 'subnet-1',
      '--run-id', 'rid', '--repo-url', 'https://github.com/x/y.git', '--dry-run',
      '--instance-type', 'c8g.medium']);
    expect(o.samples).toBe(5);
    expect(o.spot).toBe(true);
    expect(o.wait).toBe(true);
    expect(o.timeoutMinutes).toBe(10);
    expect(o.region).toBe('us-west-2');
    expect(o.subnetId).toBe('subnet-1');
    expect(o.runId).toBe('rid');
    expect(o.repoUrl).toBe('https://github.com/x/y.git');
    expect(o.dryRun).toBe(true);
    expect(o.instanceType).toBe('c8g.medium');
  });

  test('rejects a non-allowed instance type via the shared validator', () => {
    expect(() => parseEnvelopeArgs([...base, '--instance-type', 'm7g.large'])).toThrow(/not an accepted/);
  });

  test('rejects a missing or short sha', () => {
    expect(() => parseEnvelopeArgs(['node', 's', '--head', B40])).toThrow(/--base/);
    expect(() => parseEnvelopeArgs(['node', 's', '--base', 'abc', '--head', B40])).toThrow(/--base/);
  });

  test('rejects bad samples and timeout', () => {
    expect(() => parseEnvelopeArgs([...base, '--samples', '0'])).toThrow(/--samples/);
    expect(() => parseEnvelopeArgs([...base, '--samples', 'x'])).toThrow(/--samples/);
    expect(() => parseEnvelopeArgs([...base, '--timeout-minutes', '0'])).toThrow(/--timeout-minutes/);
  });

  test('rejects unknown flags and dangling values', () => {
    expect(() => parseEnvelopeArgs([...base, '--nope'])).toThrow(/unknown flag/);
    expect(() => parseEnvelopeArgs([...base, '--samples'])).toThrow(/requires a value/);
  });

});



describe('computeVerdict', () => {

  test('medians (odd and even counts) and deltas', () => {
    const b = [ { results: [ { name: 't', ops: 100 } ] },
                { results: [ { name: 't', ops: 110 } ] },
                { results: [ { name: 't', ops: 120 } ] } ];
    const h = [ { results: [ { name: 't', ops: 130 } ] },
                { results: [ { name: 't', ops: 150 } ] } ];
    const v = computeVerdict(b, h);
    expect(v.cases.length).toBe(1);
    expect(v.cases[0].base_ops).toBe(110);           // odd-count median
    expect(v.cases[0].head_ops).toBe(140);           // even-count mean-of-middles
    expect(v.cases[0].delta_pct).toBeCloseTo((140 - 110) / 110 * 100, 6);
  });

  test('regressions sort first; one-sided cases are reported not compared', () => {
    const b = [ { results: [ { name: 'slower', ops: 100 }, { name: 'faster', ops: 100 }, { name: 'gone', ops: 1 } ] } ];
    const h = [ { results: [ { name: 'slower', ops: 50 },  { name: 'faster', ops: 200 }, { name: 'new',  ops: 1 } ] } ];
    const v = computeVerdict(b, h);
    expect(v.cases.map((c: { name: string }) => c.name)).toEqual(['slower', 'faster']);
    expect(v.counts.compared).toBe(2);
    expect(v.counts.only_base).toEqual(['gone']);
    expect(v.counts.only_head).toEqual(['new']);
  });

});



describe('renderVerdictMarkdown', () => {

  test('contains the header, signed deltas, and one-sided lists', () => {
    const v = computeVerdict(
      [ { results: [ { name: 'up', ops: 100 }, { name: 'down', ops: 100 }, { name: 'gone', ops: 1 } ] } ],
      [ { results: [ { name: 'up', ops: 150 }, { name: 'down', ops: 50 } ] } ]
    );
    const md = renderVerdictMarkdown(v, { base: A40, head: B40, samples: 3, instanceType: 'c8g.medium' });
    expect(md).toContain(`head ${B40} vs base ${A40}`);
    expect(md).toContain('+50.0%');
    expect(md).toContain('-50.0%');
    expect(md).toContain('only in base: gone');
    expect(md).toContain('c8g.medium');
  });

});



describe('buildEnvelopeUserData', () => {

  test('carries the hardened conventions and the A/B alternation', () => {
    const s = buildEnvelopeUserData(good_userdata_params());
    expect(s.startsWith('#!/bin/bash')).toBe(true);
    expect(s).toContain('shutdown -h +90');                              // dead-man first
    expect(s).toContain(`git worktree add ../base ${A40}`);
    expect(s).toContain(`git worktree add ../head ${B40}`);
    expect(s).toContain('for i in $(seq 1 3); do');                      // sample loop
    expect(s).toContain('for side in base head; do');                    // strict alternation
    expect(s).toContain('refusing to rebuild-and-measure');              // committed-dist guard
    expect(s).toContain('node ./src/buildjs/benchmark.cjs');
    expect(s).toContain('s3://jssm-perf-results-032239181269/_envelopes/jssm-perf-20260702-x');
    expect(s).toContain('FAILED.txt');                                   // loud failure marker
    expect(s).toContain('shutdown -h now');                              // self-terminate
  });

  test('rejects unsafe interpolations', () => {
    const p = good_userdata_params;
    expect(() => buildEnvelopeUserData({ ...p(), baseSha: 'evil' })).toThrow(/unsafe baseSha/);
    expect(() => buildEnvelopeUserData({ ...p(), headSha: 'evil' })).toThrow(/unsafe headSha/);
    expect(() => buildEnvelopeUserData({ ...p(), region: 'a b' })).toThrow(/unsafe region/);
    expect(() => buildEnvelopeUserData({ ...p(), bucket: 'NO' })).toThrow(/unsafe bucket/);
    expect(() => buildEnvelopeUserData({ ...p(), repoUrl: 'ftp://x' })).toThrow(/unsafe repo url/);
    expect(() => buildEnvelopeUserData({ ...p(), runId: 'a b' })).toThrow(/unsafe run id/);
    expect(() => buildEnvelopeUserData({ ...p(), samples: 99 })).toThrow(/unsafe samples/);
  });

});



describe('fireEnvelope / waitForVerdict / main (dry-run and fake executors)', () => {

  const opts = () => parseEnvelopeArgs(['node', 's', '--base', A40, '--head', B40, '--dry-run', '--run-id', 'rid']);

  test('fireEnvelope dry-run returns the destination under _envelopes', () => {
    const exec = makeExecutor(true);
    const r = fireEnvelope(exec, opts());
    expect(r.runId).toBe('rid');
    expect(r.dest).toContain('/_envelopes/rid');
  });

  test('waitForVerdict returns 0 immediately in dry-run', () => {
    const exec = makeExecutor(true);
    expect( waitForVerdict(exec, opts(), 's3://b/_envelopes/rid') ).toBe(0);
  });

  test('waitForVerdict prints and returns 0 when the verdict is present', () => {
    const exec = { dryRun: false, run: () => ({ stdout: '# verdict', stderr: '', status: 0 }) };
    expect( waitForVerdict(exec, { timeoutMinutes: 1, region: 'us-east-1' }, 's3://b/_envelopes/rid') ).toBe(0);
  });

  test('waitForVerdict returns 1 on a failure marker', () => {
    let call = 0;
    const exec = { dryRun: false, run: () => (++call === 1
      ? { stdout: '', stderr: '', status: 1 }          // envelope.md miss
      : { stdout: 'boom', stderr: '', status: 0 }) };  // FAILED.txt hit
    expect( waitForVerdict(exec, { timeoutMinutes: 1, region: 'us-east-1' }, 's3://b/x') ).toBe(1);
  });

  test('waitForVerdict returns 2 on timeout, sleeping between polls', () => {
    let naps = 0;
    const exec = { dryRun: false, run: () => ({ stdout: '', stderr: '', status: 1 }) };
    const o = { timeoutMinutes: 1, region: 'us-east-1', _sleep: () => { naps += 1; } };
    // a 1-minute deadline with an instant fake sleep: loop until Date passes?
    // no — force the deadline by monkeying time forward via the sleep hook
    const realNow = Date.now;
    try {
      let t = realNow();
      Date.now = () => t;
      o._sleep = () => { naps += 1; t += 61_000; };
      expect( waitForVerdict(exec, o, 's3://b/x') ).toBe(2);
      expect(naps).toBe(1);
    } finally {
      Date.now = realNow;
    }
  });

  test('main returns 1 with usage on bad args', () => {
    expect( main(['node', 's', '--base', 'nope']) ).toBe(1);
  });

  test('main dry-run fires without waiting', () => {
    expect( main(['node', 's', '--base', A40, '--head', B40, '--dry-run']) ).toBe(0);
  });

  test('main dry-run with --wait exercises the wait path', () => {
    expect( main(['node', 's', '--base', A40, '--head', B40, '--dry-run', '--wait']) ).toBe(0);
  });

});
