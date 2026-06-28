
// Unit tests for the pure logic of src/scripts/make_perf_chart.cjs (#748).
// The executor seam keeps git/gh out of every test here; assertions are
// substring/identifier checks per house rules (no golden files).

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mpc = require('../make_perf_chart.cjs');



const run = (over: object) => ({
  kind: 'pr', pr: 1, release: undefined, version: '5.0.0',
  date: '2026-06-01T00:00:00.000Z', results: [], ...over
});

const two_runs = [
  run({ pr: 598, version: '5.128.0', date: '2026-06-01T10:00:00.000Z',
        results: [ { name: 'chain-200 transition()', ops: 100 },
                   { name: 'chain-200 action()',     ops: 90  },
                   { name: 'dense-200 transition()', ops: 50  },
                   { name: 'chain-200 construct()',  ops: 10  } ] }),
  run({ pr: 700, version: '5.143.2', date: '2026-06-11T01:02:03.000Z',
        results: [ { name: 'chain-200 transition()', ops: 200 },
                   { name: 'chain-200 action()',     ops: 180 },
                   { name: 'dense-200 transition()', ops: 75  },
                   { name: 'chain-200 construct()',  ops: 40  } ] })
];



describe('semver_compare', () => {

  test('numeric by part: 5.143.10 > 5.143.9', () =>
    expect( mpc.semver_compare('5.143.10', '5.143.9') ).toBeGreaterThan(0));

  test('equal versions compare 0', () =>
    expect( mpc.semver_compare('1.2.3', '1.2.3') ).toBe(0));

  test('shorter version pads with zeros', () =>
    expect( mpc.semver_compare('1.2', '1.2.1') ).toBeLessThan(0));

});



describe('compare_runs / key_of', () => {

  test('every PR precedes every release', () => {
    const sorted = [
      run({ kind: 'release', pr: undefined, release: '5.1.0' }),
      run({ pr: 9 }),
      run({ pr: 598 })
    ].sort(mpc.compare_runs);
    expect( sorted.map(mpc.key_of) ).toEqual(['9', '598', 'v5.1.0']);
  });

  test('releases order by semver, not lexically', () => {
    const sorted = [
      run({ kind: 'release', pr: undefined, release: '5.143.10' }),
      run({ kind: 'release', pr: undefined, release: '5.143.9'  })
    ].sort(mpc.compare_runs);
    expect( sorted.map(mpc.key_of) ).toEqual(['v5.143.9', 'v5.143.10']);
  });

});



describe('pivot_series', () => {

  test('splits result names at the final space into op -> shape -> points', () => {
    const series = mpc.pivot_series(two_runs);
    expect( [...series.keys()] ).toEqual(expect.arrayContaining(['transition()', 'construct()']));
    const chain = series.get('transition()').get('chain-200');
    expect( chain.map((p: { ops: number }) => p.ops) ).toEqual([100, 200]);
    expect( chain.map((p: { key: string }) => p.key) ).toEqual(['598', '700']);
  });

});



describe('footprint_series', () => {

  test('reads footprintBytes off construct() rows, per shape, in run order', () => {
    const runs = [
      run({ pr: 1, results: [ { name: 'chain-10 construct()',  ops: 5, footprintBytes: 1000 },
                              { name: 'dense-10 construct()',  ops: 3, footprintBytes: 2000 },
                              { name: 'chain-10 transition()', ops: 9 } ] }),
      run({ pr: 2, results: [ { name: 'chain-10 construct()',  ops: 6, footprintBytes: 1100 } ] })
    ];
    const fp = mpc.footprint_series(runs);
    expect( [...fp.keys()] ).toEqual(expect.arrayContaining(['chain-10', 'dense-10']));
    expect( fp.get('chain-10').map((p: { ops: number }) => p.ops) ).toEqual([1000, 1100]); // footprintBytes in the value field
    expect( fp.get('chain-10').map((p: { key: string }) => p.key) ).toEqual(['1', '2']);
  });

  test('ignores non-construct rows and construct rows lacking a numeric footprintBytes', () => {
    const runs = [ run({ pr: 1, results: [
      { name: 'chain-10 construct()',  ops: 5 },                       // construct, but no footprintBytes
      { name: 'chain-10 transition()', ops: 9, footprintBytes: 999 }   // has footprintBytes, but not construct
    ] }) ];
    expect( mpc.footprint_series(runs).size ).toBe(0);
  });

});



describe('data_stamp (determinism)', () => {

  test('uses the newest data date, not wall clock', () =>
    expect( mpc.data_stamp(two_runs) ).toBe('20260611-010203'));

  test('empty data stamps as "empty"', () =>
    expect( mpc.data_stamp([]) ).toBe('empty'));

});



describe('summary_line', () => {

  test('names the PR range and the latest version', () => {
    const s = mpc.summary_line(two_runs);
    expect(s).toContain('2 measured PRs');
    expect(s).toContain('pr-598');
    expect(s).toContain('pr-700');
    expect(s).toContain('5.143.2');
  });

});



describe('render_chart', () => {

  test('emits one panel per present operation and a composite header', () => {
    const { svg, panels } = mpc.render_chart(two_runs);
    expect( [...panels.keys()] ).toEqual(['construct()', 'transition()', 'action()']);
    expect(svg).toContain('jssm performance trend');
    expect(svg).toContain('Data through 20260611-010203');
    expect(svg).toContain('chain-200');     // legend entries survive compositing
    expect(svg).toContain('dense-200');
  });

  test('adds a footprintBytes panel (the 8th cell) when construct rows carry footprintBytes', () => {
    const fpruns = [
      run({ pr: 1, results: [ { name: 'chain-200 construct()',  ops: 10, footprintBytes: 40000 },
                              { name: 'chain-200 transition()', ops: 100 } ] }),
      run({ pr: 2, results: [ { name: 'chain-200 construct()',  ops: 20, footprintBytes: 42000 },
                              { name: 'chain-200 transition()', ops: 200 } ] })
    ];
    const { panels } = mpc.render_chart(fpruns);
    expect( [...panels.keys()] ).toContain('footprintBytes');
    expect( panels.get('footprintBytes') ).toContain('bytes (log scale)');   // its own unit label, not ops/sec
    expect( panels.get('footprintBytes') ).not.toContain('ops/sec');
  });

  test('omits the footprintBytes panel when no construct row carries footprintBytes', () => {
    const { panels } = mpc.render_chart(two_runs);
    expect( [...panels.keys()] ).not.toContain('footprintBytes');
  });

  test('is deterministic: identical input renders byte-identical output', () => {
    const a = mpc.render_chart(two_runs).svg;
    const b = mpc.render_chart(two_runs).svg;
    expect(a).toBe(b);
  });

  test('panels carry an opaque background for dark-mode embedding', () => {
    const { panels } = mpc.render_chart(two_runs);
    for (const svg of panels.values()) {
      expect(svg).toContain('fill="#ffffff"');
    }
  });

  test('panels draw per-run vertical guides behind the data', () => {
    const { svg, panels } = mpc.render_chart(two_runs);
    expect(svg).toContain('stroke="#e8e8e8"');      // the in-between (light) guides
    for (const p of panels.values()) {
      expect(p).toContain('stroke="#d0d0d0"');      // the every-fifth (stronger) guide
    }
  });

  test('gridlines paint lightest before heaviest, so decade lines are never overpainted', () => {
    const { panels } = mpc.render_chart(two_runs);
    for (const p of panels.values()) {
      // light vertical guide (pass 1) must be emitted before the decade line (pass 4)
      expect(p.indexOf('stroke="#e8e8e8"')).toBeLessThan(p.indexOf('stroke="#b0b0b0"'));
    }
  });

  test('release x-labels are tinted by version-change kind', () => {
    const rel = (release: string, ops: number) => run({
      kind: 'release', pr: undefined, release, version: release, results:
        [{ name: 'chain-200 transition()', ops }]
    });
    const runs = [ rel('5.143.0', 100), rel('5.143.1', 110), rel('5.144.0', 120) ].sort(mpc.compare_runs);
    const { svg } = mpc.render_chart(runs);
    expect(svg).toContain('>v5.143.1<');            // the label renders
    expect(svg).toContain('fill="#d6a382"');        // 5.143.1: patch-only bump -> lighter (twice)
    expect(svg).toContain('fill="#aa4400"');        // 5.144.0 (and first release): base tint
  });

  test('lays panels out in a two-wide grid, row-major', () => {
    // three panels (construct/transition/action) at default 720 width, 32 row-gap,
    // 40 col-gap: construct (0,0)->(0 56), transition (1,0)->(760 56), action (0,1)->(0 460)
    const { svg } = mpc.render_chart(two_runs);
    expect(svg).toContain('translate(0 56)');
    expect(svg).toContain('translate(760 56)');
    expect(svg).toContain('translate(0 460)');
  });

  test('panel_gap is configurable and widens the composite height', () => {
    const height = (s: string) => Number((s.match(/<svg[^>]*height="(\d+)"/) || [])[1]);
    const gapped = mpc.render_chart(two_runs, 960, 372, 40);
    const flush  = mpc.render_chart(two_runs, 960, 372, 0);
    expect(height(gapped.svg)).toBeGreaterThan(height(flush.svg));
    expect(flush.svg).toContain('translate(0 428)');   // 56 + 372, no gap
  });

});



describe('build_data_json', () => {

  test('carries provenance, stamp, and every run in chart order', () => {
    const j = mpc.build_data_json(two_runs);
    expect(j.source).toContain('perf_results');
    expect(j.dataThrough).toBe('20260611-010203');
    expect(j.runs.map((r: { pr: number }) => r.pr)).toEqual([598, 700]);
    expect(j.runs[0].results[0].name).toBe('chain-200 transition()');
  });

});



describe('build_comment_body', () => {

  test('embeds each chart url and the publishing sha', () => {
    const urls = new Map([['construct()', 'https://x/construct.svg']]);
    const body = mpc.build_comment_body(urls, two_runs, 'abc123');
    expect(body).toContain('![construct() trend](https://x/construct.svg)');
    expect(body).toContain('abc123');
    expect(body).toContain('2 measured PRs');
  });

});



describe('chart_slug', () => {

  test('strips parens, keeps word chars', () => {
    expect( mpc.chart_slug('edges_between()') ).toBe('edges_between');
    expect( mpc.chart_slug('construct()')     ).toBe('construct');
  });

});



describe('parse_args', () => {

  test('defaults: generated_docs out dir, no comment, issue 636', () => {
    const o = mpc.parse_args([]);
    expect(o.outDir.replace(/\\/g, '/')).toContain('generated_docs');
    expect(o.comment).toBe(false);
    expect(o.issue).toBe(636);
  });

  test('--comment --issue parses', () => {
    const o = mpc.parse_args(['--comment', '--issue', '748']);
    expect(o.comment).toBe(true);
    expect(o.issue).toBe(748);
  });

  test('unknown flag throws', () =>
    expect( () => mpc.parse_args(['--bogus']) ).toThrow('unknown flag'));

  test('--issue requires a positive integer', () =>
    expect( () => mpc.parse_args(['--issue', 'x']) ).toThrow('positive integer'));

  test('--out requires a directory argument', () =>
    expect( () => mpc.parse_args(['--out']) ).toThrow('requires a directory'));

});



describe('collect_runs (seamed)', () => {

  test('parses pr and release paths, skips charts/ and strays, sorts', () => {
    const listing = [
      'c8g.medium/pr-700/scaling.json',
      'c8g.medium/pr-598/scaling.json',
      'c8g.medium/release-5.143.4/scaling.json',
      'c8g.medium/shootout/runid-1/scaling.json',  // not a trend point
      'charts/20260611-010203/construct.svg',      // own output, ignored
      'c8g.medium/pr-598/meta.json'                // not a scaling file
    ].join('\n');

    const canned: Record<string, string> = {
      'FETCH_HEAD:c8g.medium/pr-700/scaling.json'           : '{"version":"5.143.2","date":"2026-06-11T00:00:00.000Z","results":[]}',
      'FETCH_HEAD:c8g.medium/pr-598/scaling.json'           : '{"version":"5.128.0","date":"2026-06-01T00:00:00.000Z","results":[]}',
      'FETCH_HEAD:c8g.medium/release-5.143.4/scaling.json'  : '{"version":"5.143.4","date":"2026-06-12T00:00:00.000Z","results":[]}'
    };

    const fake_exec = {
      dryRun : false,
      run    : (_cmd: string, args: string[]) => {
        if (args[0] === 'fetch')   { return ''; }
        if (args[0] === 'ls-tree') { return listing; }
        if (args[0] === 'show')    { return canned[args[1]]; }
        throw new Error(`unexpected git args ${args.join(' ')}`);
      }
    };

    const runs = mpc.collect_runs(fake_exec, '.');
    expect( runs.map(mpc.key_of) ).toEqual(['598', '700', 'v5.143.4']);
  });

  test('returns null when the fetch fails, so builds degrade gracefully', () => {
    const fake_exec = {
      dryRun : false,
      run    : (_cmd: string, args: string[], opts: { allowFail?: boolean }) => {
        if (args[0] === 'fetch' && opts.allowFail) { return null; }
        throw new Error('should not reach');
      }
    };
    expect( mpc.collect_runs(fake_exec, '.') ).toBeNull();
  });

});
