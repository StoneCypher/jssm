
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



describe('bundle_size_series', () => {

  test('sums raw bytes across all dist bundles into one line, in run order', () => {
    const runs = [
      run({ pr: 1, bundles: { 'jssm.es5.cjs': { raw: 1000, gzip: 1, brotli: 1 },
                              'jssm.es6.mjs': { raw:  500, gzip: 1, brotli: 1 } } }),
      run({ pr: 2, bundles: { 'jssm.es5.cjs': { raw: 1100, gzip: 1, brotli: 1 },
                              'jssm.es6.mjs': { raw:  520, gzip: 1, brotli: 1 } } })
    ];
    const s = mpc.bundle_size_series(runs);
    expect([...s.keys()]).toEqual(['package (raw, all dist)']);
    const pts = s.get('package (raw, all dist)');
    expect(pts.map((p: { ops: number }) => p.ops)).toEqual([1500, 1620]);
    expect(pts.map((p: { key: string }) => p.key)).toEqual(['1', '2']);
  });

  test('skips runs lacking a bundles block; empty map when none carry bundles', () => {
    expect(mpc.bundle_size_series([ run({ pr: 1 }) ]).size).toBe(0);
    const mixed = mpc.bundle_size_series([
      run({ pr: 1 }),
      run({ pr: 2, bundles: { 'jssm.es5.cjs': { raw: 1000, gzip: 1, brotli: 1 } } })
    ]);
    expect(mixed.get('package (raw, all dist)').map((p: { key: string }) => p.key)).toEqual(['2']);
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



describe('format_tick', () => {

  test('humanizes with k/M/G and trims trailing zeros', () => {
    expect(mpc.format_tick(1200000)).toBe('1.2M');
    expect(mpc.format_tick(1500)).toBe('1.5k');
    expect(mpc.format_tick(2000000)).toBe('2M');
    expect(mpc.format_tick(42)).toBe('42');
  });

});



describe('panel_svg (scale)', () => {

  const series = new Map([[ 's', [ { key: 'a', ops: 100 }, { key: 'b', ops: 200 }, { key: 'c', ops: 300 } ] ]]);
  const keys   = ['a', 'b', 'c'];

  test('log-scale title and a decade label', () => {
    const svg = mpc.panel_svg('op', series, keys, 720, 372, 'ops/sec', 'log');
    expect(svg).toContain('(log scale)');
    expect(svg).toContain('1e2');
  });

  test('log axis anchors at the data\'s lowest decade, not 1e0', () => {
    // data 2e5..5e6 -> ylo floor(log10(2e5)) = 5, yhi floor(log10(5e6))+1 = 7
    const high = new Map([[ 's', [ { key: 'a', ops: 200000 }, { key: 'b', ops: 5000000 } ] ]]);
    const svg  = mpc.panel_svg('op', high, ['a', 'b'], 720, 372, 'ops/sec', 'log');
    expect(svg).toContain('>1e5<');       // bottom decade = the data's lowest
    expect(svg).toContain('>1e7<');       // top still rounds up past the max
    expect(svg).not.toContain('>1e0<');   // no longer anchored at the zeroth decade
  });

  test('zero_base pins the log anchor back to 1e0', () => {
    const high = new Map([[ 's', [ { key: 'a', ops: 200000 }, { key: 'b', ops: 5000000 } ] ]]);
    const svg  = mpc.panel_svg('op', high, ['a', 'b'], 720, 372, 'bytes', 'log', 'lower', true);
    expect(svg).toContain('>1e0<');
    expect(svg).toContain('>1e5<');       // interior decades still labeled
  });

  test('empty series keeps a sane 1e0 anchor (degenerate guard)', () => {
    const svg = mpc.panel_svg('op', new Map(), [], 720, 372, 'ops/sec', 'log');
    expect(svg).toContain('(log scale)'); // renders without throwing
  });

  test('linear title reads "linear scale, last 50" with the given unit', () => {
    const svg = mpc.panel_svg('op', series, keys, 720, 372, 'bytes', 'linear');
    expect(svg).toContain('bytes (linear scale, last 50)');
  });

  test('linear y-bounds pad 10% of the span on each side', () => {
    // min 100, max 300 -> span 200 -> pad 20 -> axis 80..320; ticks include both ends
    const svg = mpc.panel_svg('op', series, keys, 720, 372, 'bytes', 'linear');
    expect(svg).toContain('>320<');
    expect(svg).toContain('>80<');
  });

  test('linear flat data falls back to +/-10% of the value', () => {
    const flat = new Map([[ 's', [ { key: 'a', ops: 1000 }, { key: 'b', ops: 1000 } ] ]]);
    const svg  = mpc.panel_svg('op', flat, ['a', 'b'], 720, 372, 'bytes', 'linear');
    // span 0 -> pad = |1000|*0.1 = 100 -> axis 900..1100
    expect(svg).toContain('>1.1k<');
    expect(svg).toContain('>900<');
  });

});



describe('render_chart', () => {

  test('emits one panel per present operation and a composite header', () => {
    const { svg, panels } = mpc.render_chart(two_runs);
    expect( [...panels.keys()] ).toEqual(['transition()', 'action()', 'construct()']);
    expect(svg).toContain('jssm performance trend');
    expect(svg).toContain('Data through 20260611-010203');
    expect(svg).toContain('chain-200');     // legend entries survive compositing
    expect(svg).toContain('dense-200');
  });

  test('is deterministic: identical input renders byte-identical output', () => {
    const a = mpc.render_chart(two_runs).svg;
    const b = mpc.render_chart(two_runs).svg;
    expect(a).toBe(b);
  });

  test('renders a log+linear pair per operation, panels keyed by op', () => {
    const { panels } = mpc.render_chart(two_runs);
    expect([...panels.keys()]).toEqual(['transition()', 'action()', 'construct()']);
    const pair = panels.get('transition()');
    expect(pair.log).toContain('(log scale)');
    expect(pair.linear).toContain('(linear scale, last 50)');
  });

  test('every panel (log and linear) carries an opaque background', () => {
    const { panels } = mpc.render_chart(two_runs);
    for (const pair of panels.values()) {
      expect(pair.log).toContain('fill="#ffffff"');
      expect(pair.linear).toContain('fill="#ffffff"');
    }
  });

  test('panels draw per-run vertical guides behind the data', () => {
    const { panels } = mpc.render_chart(two_runs);
    for (const pair of panels.values()) {
      expect(pair.log).toContain('stroke="#e8e8e8"');      // the in-between (light) guides
      expect(pair.log).toContain('stroke="#d0d0d0"');      // the every-fifth (stronger) guide
      expect(pair.linear).toContain('stroke="#d0d0d0"');
    }
  });

  test('gridlines paint lightest before heaviest', () => {
    const { panels } = mpc.render_chart(two_runs);
    for (const pair of panels.values()) {
      // light vertical guide (pass 1) must be emitted before the heaviest gridline (pass 4)
      expect(pair.log.indexOf('stroke="#e8e8e8"')).toBeLessThan(pair.log.indexOf('stroke="#b0b0b0"'));
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

  test('lays each pair log-on-top / linear-beneath at the same width', () => {
    // defaults: panel_width 1296, panel_height 372, panel_gap 32 (intra 32/4=8, inter 128)
    // first pair: log (0,56), linear (0, 56+372+8=436); second pair at x=1296+40=1336
    const { svg } = mpc.render_chart(two_runs);
    expect(svg).toContain('translate(0 56)');
    expect(svg).toContain('translate(0 436)');
    expect(svg).toContain('translate(1336 56)');
    expect(svg).toContain('translate(1336 436)');
  });

  test('sets the inter-pair-row gap to 4x the base; height matches the pair formula', () => {
    // pair_height = 2*372 + 8 = 752; inter-pair gap = 32*4 = 128
    // row1 (action) oy = 56 + (752 + 128) = 936
    // total_h = 56 + 2*752 + 128 = 1688
    const { svg } = mpc.render_chart(two_runs);
    expect(svg).toContain('translate(0 936)');
    expect(svg).toMatch(/<svg[^>]*height="1688"/);
  });

  test('panel_gap sets intra-pair gap (and 4x for inter-pair)', () => {
    const height = (s: string) => Number((s.match(/<svg[^>]*height="(\d+)"/) || [])[1]);
    const gapped = mpc.render_chart(two_runs, 720, 372, 32);
    const flush  = mpc.render_chart(two_runs, 720, 372, 0);
    expect(height(gapped.svg)).toBeGreaterThan(height(flush.svg));
    expect(flush.svg).toContain('translate(0 428)');   // 56 + 372, no intra gap
  });

  test('linear twin windows to the most recent 50 versions', () => {
    const many = Array.from({ length: 60 }, (_, i) => run({
      pr: i + 1, version: `5.0.${i}`,
      results: [ { name: 'chain-200 transition()', ops: 100 + i } ]
    }));
    const { panels } = mpc.render_chart(many);
    const pair = panels.get('transition()');
    expect(pair.log).toContain('>1<');        // oldest PR present in the full-history log panel
    expect(pair.linear).not.toContain('>1<'); // ...but dropped from the last-50 linear twin (window = PRs 11..60)
    expect(pair.linear).toContain('>60<');    // newest PR present in both
  });

  test('adds a single-line package-size panel when runs carry bundles', () => {
    const bruns = [
      run({ pr: 1, results: [ { name: 'chain-200 transition()', ops: 100 } ],
            bundles: { 'jssm.es5.cjs': { raw: 1000, gzip: 1, brotli: 1 },
                       'jssm.es6.mjs': { raw:  500, gzip: 1, brotli: 1 } } }),
      run({ pr: 2, results: [ { name: 'chain-200 transition()', ops: 200 } ],
            bundles: { 'jssm.es5.cjs': { raw: 1100, gzip: 1, brotli: 1 },
                       'jssm.es6.mjs': { raw:  520, gzip: 1, brotli: 1 } } })
    ];
    const { panels } = mpc.render_chart(bruns);
    expect([...panels.keys()]).toContain('packageBytes');
    const pair = panels.get('packageBytes');
    expect(pair.log).toContain('bytes (log scale)');
    expect(pair.log).toContain('package (raw, all dist)');   // the one legend entry
    expect(pair.log).not.toContain('ops/sec');
  });

  test('omits the package-size panel when no run carries bundles', () => {
    const { panels } = mpc.render_chart(two_runs);
    expect([...panels.keys()]).not.toContain('packageBytes');
  });

  test('renders each panel at the 1296px default width', () => {
    const { panels } = mpc.render_chart(two_runs);
    const pair = panels.get('transition()');
    expect(pair.log).toContain('<svg width="1296"');
    expect(pair.linear).toContain('<svg width="1296"');
  });

  test('titles throughput panels "(higher is better)" in 50%-lighter text', () => {
    const { panels } = mpc.render_chart(two_runs);
    const pair = panels.get('transition()');
    expect(pair.log).toContain('<tspan fill-opacity="0.5"> (higher is better)</tspan>');
    expect(pair.linear).toContain('<tspan fill-opacity="0.5"> (higher is better)</tspan>');
  });

  test('package-size panel: absolute log twin, auto-fit linear twin, "(lower is better)"', () => {
    const bruns = [
      run({ pr: 1, results: [ { name: 'chain-200 transition()', ops: 100 } ],
            bundles: { 'jssm.es5.cjs': { raw: 1000, gzip: 1, brotli: 1 },
                       'jssm.es6.mjs': { raw:  500, gzip: 1, brotli: 1 } } }),
      run({ pr: 2, results: [ { name: 'chain-200 transition()', ops: 200 } ],
            bundles: { 'jssm.es5.cjs': { raw: 1100, gzip: 1, brotli: 1 },
                       'jssm.es6.mjs': { raw:  520, gzip: 1, brotli: 1 } } })
    ];
    const { panels } = mpc.render_chart(bruns);
    const pkg = panels.get('packageBytes');
    // direction suffix
    expect(pkg.log).toContain('<tspan fill-opacity="0.5"> (lower is better)</tspan>');
    // last-window linear twin auto-fits as a zoom (min bundle sum is 1500, so a
    // 0 tick would prove an unwanted zero-floor)
    expect(pkg.linear).not.toContain('>0<');
    // full-history log twin keeps the 10^0 anchor (lowest-decade anchoring is
    // ops-panels only; min sum 1500 would otherwise anchor at 1e3)
    expect(pkg.log).toContain('>1e0<');
  });

  test('operation log twins anchor at the data\'s lowest decade', () => {
    // chain-200 transition() spans 50..200 in two_runs -> anchor 1e1, not 1e0
    const { panels } = mpc.render_chart(two_runs);
    const pair = panels.get('transition()');
    expect(pair.log).toContain('>1e1<');
    expect(pair.log).not.toContain('>1e0<');
  });

  test('operation linear twins keep their auto-fit floor (not zero-based)', () => {
    // chain-200 transition() spans 100..200; a zero floor would put a 0 tick on
    // the axis, so its absence confirms only the package panel is zero-floored.
    const { panels } = mpc.render_chart(two_runs);
    expect(panels.get('transition()').linear).not.toContain('>0<');
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

  test('carries the bundles block per run', () => {
    const j = mpc.build_data_json([ run({ pr: 1,
      bundles: { 'jssm.es5.cjs': { raw: 1000, gzip: 400, brotli: 300 } } }) ]);
    expect(j.runs[0].bundles['jssm.es5.cjs'].raw).toBe(1000);
  });

});



describe('build_comment_body', () => {

  test('embeds each op\'s log and linear image and the publishing sha', () => {
    const urls = new Map([[ 'construct()',
      { log: 'https://x/construct.svg', linear: 'https://x/construct.linear.svg' } ]]);
    const body = mpc.build_comment_body(urls, two_runs, 'abc123');
    expect(body).toContain('![construct() trend (log)](https://x/construct.svg)');
    expect(body).toContain('![construct() trend (linear, last 50)](https://x/construct.linear.svg)');
    expect(body).toContain('abc123');
    expect(body).toContain('2 measured PRs');
  });

});



describe('publish_charts (dry-run urls)', () => {

  test('returns a log and a linear url per op, pinned to the stamp dir', () => {
    const exec   = mpc.make_executor(true);
    const panels = new Map([[ 'construct()', { log: '<svg/>', linear: '<svg/>' } ]]);
    const { urls } = mpc.publish_charts(exec, panels, '20260101-000000');
    const u = urls.get('construct()');
    expect(u.log).toContain('/charts/20260101-000000/construct.svg');
    expect(u.linear).toContain('/charts/20260101-000000/construct.linear.svg');
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

  test('threads the bundles block onto each run when present', () => {
    const listing = 'c8g.medium/pr-42/scaling.json';
    const canned: Record<string, string> = {
      'FETCH_HEAD:c8g.medium/pr-42/scaling.json':
        '{"version":"5.0.0","date":"2026-06-01T00:00:00.000Z","results":[],' +
        '"bundles":{"jssm.es5.cjs":{"raw":1000,"gzip":400,"brotli":300}}}'
    };
    const fake_exec = {
      dryRun: false,
      run: (_cmd: string, args: string[]) => {
        if (args[0] === 'fetch')   { return ''; }
        if (args[0] === 'ls-tree') { return listing; }
        if (args[0] === 'show')    { return canned[args[1]]; }
        throw new Error(`unexpected git args ${args.join(' ')}`);
      }
    };
    const runs = mpc.collect_runs(fake_exec, '.');
    expect( runs[0].bundles['jssm.es5.cjs'].raw ).toBe(1000);
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
