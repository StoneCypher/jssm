# Graviton perf-chart — package-size panel + linear twins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-shape heap-footprint panel with a single-line package-size panel, and add a linear-scale, last-30-versions twin beneath every existing log panel.

**Architecture:** All changes are inside `src/scripts/make_perf_chart.cjs` (pure functions behind an executor seam) and its spec. `panel_svg` gains a `scale` param (`'log'` default, unchanged; new `'linear'` branch). `render_chart` builds a `{log, linear}` pair per panel, windows the linear twin to the last 30 keys, and lays pairs out in the existing 2-wide grid with a doubled inter-pair gap. Package size is read from the already-collected `scaling.json` `bundles` block.

**Tech Stack:** Node CJS, Vitest (spec config with a 100% coverage gate), SVG-as-string rendering.

## Global Constraints

- **Determinism:** the `'log'` code path in `panel_svg` must emit **byte-identical** SVG for unchanged data — never reformat or reorder its output. (`make_perf_chart.cjs:14-17`.)
- **No golden-file / snapshot tests.** Assert substrings / numbers only. Never pin a known-wrong value.
- **DocBlock rule:** any function whose signature/behavior changes gets its DocBlock updated in the same task.
- **Package-size value = sum of `raw` bytes across all dist bundles** in `run.bundles`. Single series labelled `"package (raw, all dist)"`.
- **Linear y-bounds:** `pad = 0.1×(max−min)`; axis `min−pad … max+pad`; flat data (`span===0`) → `pad = Math.abs(max)*0.1 || 1`.
- **Window:** linear twins show only the last 30 x-keys (`keys.slice(-30)`); log panels keep full history.
- **Layout:** 2-wide grid of pairs; intra-pair gap = `panel_gap` (default 32); inter-pair-row gap = `panel_gap*2` (64).
- Iterate a single spec file with `--coverage.enabled=false`; run the full `npm run vitest-spec` (100% gate) only at the end.
- Commit on `feat_26-07-05_graviton-perf-graphing` (non-protected); use pathspec commits (`git commit -- <paths>`), never `git add -A` (shared tree).

---

### Task 1: Thread the `bundles` block through data collection

**Files:**
- Modify: `src/scripts/make_perf_chart.cjs` (`collect_runs` run-object, `build_data_json` run mapping)
- Test: `src/scripts/tests/make_perf_chart.spec.ts`

**Interfaces:**
- Produces: run objects now carry `bundles?: { [basename:string]: { raw:number, gzip:number, brotli:number } }`; `build_data_json(...).runs[i].bundles` mirrors it.

- [ ] **Step 1: Write the failing tests**

Add to `make_perf_chart.spec.ts`, inside the existing `describe('collect_runs (seamed)', ...)` block:

```ts
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
    expect(runs[0].bundles['jssm.es5.cjs'].raw).toBe(1000);
  });
```

And inside `describe('build_data_json', ...)`:

```ts
  test('carries the bundles block per run', () => {
    const j = mpc.build_data_json([ run({ pr: 1,
      bundles: { 'jssm.es5.cjs': { raw: 1000, gzip: 400, brotli: 300 } } }) ]);
    expect(j.runs[0].bundles['jssm.es5.cjs'].raw).toBe(1000);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/scripts/tests/make_perf_chart.spec.ts --config vitest.spec.config.ts --coverage.enabled=false -t "bundles"`
Expected: FAIL — `runs[0].bundles` is `undefined`; `j.runs[0].bundles` is `undefined`.

- [ ] **Step 3: Implement — thread `bundles` in `collect_runs`**

In `collect_runs`, the `runs.push({...})` object, add a `bundles` field:

```js
    runs.push({
      kind    : pr_m ? 'pr' : 'release',
      pr      : pr_m ? parseInt(pr_m[1], 10) : undefined,
      release : rl_m ? rl_m[1] : undefined,
      version : data.version,
      date    : data.date,
      results : data.results,
      bundles : data.bundles
    });
```

- [ ] **Step 4: Implement — carry `bundles` in `build_data_json`**

In `build_data_json`, the `runs: runs.map((r) => ({...}))` object, add:

```js
    runs         : runs.map((r) => ({
      kind    : r.kind,
      pr      : r.pr,
      release : r.release,
      version : r.version,
      date    : r.date,
      results : r.results,
      bundles : r.bundles
    }))
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/scripts/tests/make_perf_chart.spec.ts --config vitest.spec.config.ts --coverage.enabled=false -t "bundles"`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/scripts/make_perf_chart.cjs src/scripts/tests/make_perf_chart.spec.ts
git commit -m "feat: thread scaling.json bundles block through perf-chart collection"
```

---

### Task 2: `bundle_size_series` — the single package-size line

**Files:**
- Modify: `src/scripts/make_perf_chart.cjs` (new function + export)
- Test: `src/scripts/tests/make_perf_chart.spec.ts`

**Interfaces:**
- Consumes: run objects with optional `bundles` (Task 1).
- Produces: `bundle_size_series(runs) => Map<string, {key:string, ops:number}[]>` — a **single-entry** map keyed `"package (raw, all dist)"`, or an empty map when no run carries bundles. `ops` holds summed raw bytes (reuses `panel_svg`'s point shape).

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block to `make_perf_chart.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/scripts/tests/make_perf_chart.spec.ts --config vitest.spec.config.ts --coverage.enabled=false -t "bundle_size_series"`
Expected: FAIL — `mpc.bundle_size_series is not a function`.

- [ ] **Step 3: Implement `bundle_size_series`**

Add after `pivot_series` (and delete nothing yet — `footprint_series` stays until Task 4). Insert:

```js
/** The single package-size series label; package weight is shape-independent. */
const PACKAGE_SERIES_LABEL = 'package (raw, all dist)';

/**
 *  Pivot the per-run bundle sizes into a single-line series: the summed raw
 *  byte size of every published dist artifact (`run.bundles[*].raw`) at each
 *  run.  Package weight is not a function of machine shape, so — unlike
 *  {@link pivot_series} — this collapses to exactly one series, reusing
 *  {@link panel_svg} with a `bytes` axis.  Runs whose `scaling.json` predates
 *  the bundle-sizing pass carry no `bundles` block and are skipped, so the
 *  panel simply has gaps.
 *
 *  @param runs Sorted runs from {@link collect_runs}.
 *  @returns A one-entry Map (`PACKAGE_SERIES_LABEL` -> ordered points), or an
 *           empty Map when no run carries a `bundles` block.
 *
 *  @example
 *  bundle_size_series([{ bundles: { a: { raw: 10 }, b: { raw: 5 } }, ... }])
 *  // => Map { 'package (raw, all dist)' => [{ key, ops: 15 }] }
 */
function bundle_size_series(runs) {
  const points = [];
  for (const run of runs) {
    if (!run.bundles || typeof run.bundles !== 'object') { continue; }
    let total = 0, seen = false;
    for (const b of Object.values(run.bundles)) {
      if (b && typeof b.raw === 'number') { total += b.raw; seen = true; }
    }
    if (seen) { points.push({ key: key_of(run), ops: total }); }
  }
  return points.length ? new Map([[PACKAGE_SERIES_LABEL, points]]) : new Map();
}
```

Add `bundle_size_series` to `module.exports` (leave `footprint_series` for now):

```js
  semver_compare, compare_runs, key_of, pivot_series, footprint_series, bundle_size_series, data_stamp, summary_line,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/scripts/tests/make_perf_chart.spec.ts --config vitest.spec.config.ts --coverage.enabled=false -t "bundle_size_series"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/make_perf_chart.cjs src/scripts/tests/make_perf_chart.spec.ts
git commit -m "feat: add bundle_size_series (single package-size line from raw bundle bytes)"
```

---

### Task 3: `panel_svg` linear scale + `format_tick`

**Files:**
- Modify: `src/scripts/make_perf_chart.cjs` (`panel_svg` gains `scale`; new `format_tick`)
- Test: `src/scripts/tests/make_perf_chart.spec.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `format_tick(v:number) => string` — humanized magnitude (`1200000 -> '1.2M'`, `1500 -> '1.5k'`, `42 -> '42'`).
  - `panel_svg(op, by_shape, keys, width, height, unit='ops/sec', scale='log') => string` — `scale:'linear'` renders a linear axis padded 10% of span, tick labels via `format_tick`, title note `linear scale, last 30`. `scale:'log'` is unchanged/byte-identical.

- [ ] **Step 1: Write the failing tests**

Add two new `describe` blocks:

```ts
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

  test('log path unchanged: log-scale title and a decade label', () => {
    const svg = mpc.panel_svg('op', series, keys, 720, 372, 'ops/sec', 'log');
    expect(svg).toContain('(log scale)');
    expect(svg).toContain('1e2');
  });

  test('linear title reads "linear scale, last 30" with the given unit', () => {
    const svg = mpc.panel_svg('op', series, keys, 720, 372, 'bytes', 'linear');
    expect(svg).toContain('bytes (linear scale, last 30)');
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/scripts/tests/make_perf_chart.spec.ts --config vitest.spec.config.ts --coverage.enabled=false -t "format_tick|panel_svg .scale."`
Expected: FAIL — `format_tick` undefined; linear-title/bounds substrings absent.

- [ ] **Step 3: Implement `format_tick`**

Add before `panel_svg`:

```js
/**
 *  Humanize a magnitude for a linear-axis tick: thousands as `k`, millions as
 *  `M`, billions as `G`, up to one decimal with no trailing zero.  Locale-free
 *  and deterministic, so tick labels never churn.
 *
 *  @param v A finite number.
 *  @returns e.g. `1200000 -> '1.2M'`, `1500 -> '1.5k'`, `42 -> '42'`.
 *
 *  @example format_tick(1200000) // => '1.2M'
 */
function format_tick(v) {
  const abs   = Math.abs(v);
  const units = [ [1e9, 'G'], [1e6, 'M'], [1e3, 'k'] ];
  for (const [scale, suffix] of units) {
    if (abs >= scale) { return `${Number((v / scale).toFixed(1))}${suffix}`; }
  }
  return `${Number(v.toFixed(1))}`;
}
```

- [ ] **Step 4: Implement the `scale` branch in `panel_svg`**

Change the signature:

```js
function panel_svg(op, by_shape, keys, width, height, unit = 'ops/sec', scale = 'log') {
```

Immediately after `const x = (key) => ...;`, replace the y-scale block. Old:

```js
  let lo = Infinity, hi = -Infinity;
  for (const pts of by_shape.values()) {
    for (const p of pts) {
      if (p.ops > 0) { lo = Math.min(lo, p.ops); hi = Math.max(hi, p.ops); }
    }
  }
  const ylo = 0;                               // anchor the axis at 10^0 (the zeroth order of ten)
  const yhi = Math.floor(Math.log10(hi)) + 1;  // round the top up to the next order of ten above the max
  const y   = (ops) => m.t + ih - ((Math.log10(ops) - ylo) / Math.max(1e-9, yhi - ylo)) * ih;
```

New (note the `'log'` arm keeps `ylo=0`, the same `yhi`, and the same `y` formula → byte-identical):

```js
  const linear = (scale === 'linear');

  let lo = Infinity, hi = -Infinity;
  for (const pts of by_shape.values()) {
    for (const p of pts) {
      const usable = linear ? Number.isFinite(p.ops) : p.ops > 0;
      if (usable) { lo = Math.min(lo, p.ops); hi = Math.max(hi, p.ops); }
    }
  }

  let ylo, yhi, y;
  if (linear) {
    const span = hi - lo;
    const pad  = span > 0 ? span * 0.1 : (Math.abs(hi) * 0.1 || 1);
    ylo = lo - pad;
    yhi = hi + pad;
    y   = (v) => m.t + ih - ((v - ylo) / Math.max(1e-9, yhi - ylo)) * ih;
  } else {
    ylo = 0;                                     // anchor the axis at 10^0 (the zeroth order of ten)
    yhi = Math.floor(Math.log10(hi)) + 1;        // round the top up to the next order of ten above the max
    y   = (ops) => m.t + ih - ((Math.log10(ops) - ylo) / Math.max(1e-9, yhi - ylo)) * ih;
  }
```

Change the title line. Old:

```js
  els.push(`<text x="${m.l}" y="20" font-size="15" font-weight="bold" fill="#333">${op} — ${unit} (log scale) by PR / release, ${DEFAULTS.instanceType}</text>`);
```

New:

```js
  const scale_note = linear ? 'linear scale, last 30' : 'log scale';
  els.push(`<text x="${m.l}" y="20" font-size="15" font-weight="bold" fill="#333">${op} — ${unit} (${scale_note}) by PR / release, ${DEFAULTS.instanceType}</text>`);
```

Guard the log-only minor gridlines (pass 2) so linear skips them. Wrap the existing pass-2 loop:

```js
  // pass 2 — minor log gridlines at 2..9 × 10^d (log only)
  if (!linear) {
    for (let d = Math.floor(ylo); d <= Math.ceil(yhi); d++) {
      for (let mul = 2; mul <= 9; mul++) {
        const lv = Math.log10(mul * Math.pow(10, d));
        if (lv >= ylo && lv <= yhi) {
          const my = y(mul * Math.pow(10, d)).toFixed(1);
          els.push(`<line x1="${m.l}" y1="${my}" x2="${m.l + iw}" y2="${my}" stroke="#d8d8d8"/>`);
        }
      }
    }
  }
```

Replace pass 4 (decade lines + labels) with a log-or-linear branch. Old:

```js
  // pass 4 — decade gridlines + 1e<d> labels: the heaviest gridline, drawn last
  // so the log-decade reference lines read cleanly through every crossing
  for (let d = Math.ceil(ylo); d <= Math.floor(yhi); d++) {
    const yy = y(Math.pow(10, d));
    els.push(`<line x1="${m.l}" y1="${yy}" x2="${m.l + iw}" y2="${yy}" stroke="#b0b0b0"/>`);
    els.push(`<text x="${m.l - 6}" y="${yy + 4}" font-size="10" text-anchor="end" fill="#888">1e${d}</text>`);
  }
```

New:

```js
  // pass 4 — heaviest horizontal gridlines + axis labels, drawn last.
  if (linear) {
    // five evenly-spaced ticks across the padded linear range, humanized labels
    const TICKS = 5;
    for (let i = 0; i <= TICKS; i++) {
      const v  = ylo + (i / TICKS) * (yhi - ylo);
      const yy = y(v).toFixed(1);
      els.push(`<line x1="${m.l}" y1="${yy}" x2="${m.l + iw}" y2="${yy}" stroke="#b0b0b0"/>`);
      els.push(`<text x="${m.l - 6}" y="${(y(v) + 4).toFixed(1)}" font-size="10" text-anchor="end" fill="#888">${format_tick(v)}</text>`);
    }
  } else {
    // log decades + 1e<d> labels, so the decade reference lines read cleanly through every crossing
    for (let d = Math.ceil(ylo); d <= Math.floor(yhi); d++) {
      const yy = y(Math.pow(10, d));
      els.push(`<line x1="${m.l}" y1="${yy}" x2="${m.l + iw}" y2="${yy}" stroke="#b0b0b0"/>`);
      els.push(`<text x="${m.l - 6}" y="${yy + 4}" font-size="10" text-anchor="end" fill="#888">1e${d}</text>`);
    }
  }
```

In the legend/data loop, make the point filter scale-aware. Old:

```js
    const pts   = by_shape.get(shape).filter((p) => p.ops > 0);
```

New (log arm identical to before → byte-identical):

```js
    const pts   = by_shape.get(shape).filter((p) => linear ? Number.isFinite(p.ops) : p.ops > 0);
```

Add `format_tick` to `module.exports`:

```js
  panel_svg, render_chart, build_data_json, build_comment_body, chart_slug, format_tick,
```

- [ ] **Step 5: Run the new tests + verify log determinism holds**

Run: `npx vitest run src/scripts/tests/make_perf_chart.spec.ts --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS — the new `format_tick`/`panel_svg (scale)` tests pass, and every pre-existing `render_chart` test (which renders log panels) still passes, proving the log path is unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/make_perf_chart.cjs src/scripts/tests/make_perf_chart.spec.ts
git commit -m "feat: add linear scale + format_tick to panel_svg (log path unchanged)"
```

---

### Task 4: `render_chart` — pairs, windowing, package panel; remove footprint

**Files:**
- Modify: `src/scripts/make_perf_chart.cjs` (`render_chart`; delete `footprint_series` + its export)
- Test: `src/scripts/tests/make_perf_chart.spec.ts` (rewrite footprint/layout tests)

**Interfaces:**
- Consumes: `panel_svg(..., scale)` (Task 3), `bundle_size_series` (Task 2).
- Produces: `render_chart(runs, panel_width=720, panel_height=372, panel_gap=32, cols=2) => { svg, panels }` where **`panels: Map<op, { log:string, linear:string }>`** (was `Map<op,string>`). Package panel keyed `'packageBytes'`, display name `'package size'`. Removes `footprint_series` from the module surface.

- [ ] **Step 1: Rewrite the affected tests (failing)**

In `make_perf_chart.spec.ts`:

1. **Delete** the entire `describe('footprint_series', ...)` block.
2. In `describe('render_chart', ...)`, **delete** the two footprint tests (`adds a footprintBytes panel ...`, `omits the footprintBytes panel ...`).
3. **Replace** the tests `panels carry an opaque background ...`, `panels draw per-run vertical guides ...`, `gridlines paint lightest before heaviest ...`, `lays panels out in a two-wide grid, row-major`, and `panel_gap is configurable ...` with the pair-aware versions below, and **add** the package-size + windowing tests:

```ts
  test('renders a log+linear pair per operation, panels keyed by op', () => {
    const { panels } = mpc.render_chart(two_runs);
    expect([...panels.keys()]).toEqual(['construct()', 'transition()', 'action()']);
    const pair = panels.get('transition()');
    expect(pair.log).toContain('(log scale)');
    expect(pair.linear).toContain('(linear scale, last 30)');
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
      expect(pair.log).toContain('stroke="#e8e8e8"');
      expect(pair.log).toContain('stroke="#d0d0d0"');
      expect(pair.linear).toContain('stroke="#d0d0d0"');
    }
  });

  test('gridlines paint lightest before heaviest', () => {
    const { panels } = mpc.render_chart(two_runs);
    for (const pair of panels.values()) {
      expect(pair.log.indexOf('stroke="#e8e8e8"')).toBeLessThan(pair.log.indexOf('stroke="#b0b0b0"'));
    }
  });

  test('lays each pair log-on-top / linear-beneath at the same width', () => {
    // defaults: panel_width 720, panel_height 372, panel_gap 32 (intra 32, inter 64)
    // construct pair: log (0,56), linear (0, 56+372+32=460); transition pair at x=760
    const { svg } = mpc.render_chart(two_runs);
    expect(svg).toContain('translate(0 56)');
    expect(svg).toContain('translate(0 460)');
    expect(svg).toContain('translate(760 56)');
    expect(svg).toContain('translate(760 460)');
  });

  test('doubles the vertical gap between pair-rows; height matches the pair formula', () => {
    // pair_height = 2*372 + 32 = 776; row1 (action) oy = 56 + (776 + 64) = 896
    // total_h = 56 + 2*776 + 64 = 1672
    const { svg } = mpc.render_chart(two_runs);
    expect(svg).toContain('translate(0 896)');
    expect(svg).toMatch(/<svg[^>]*height="1672"/);
  });

  test('panel_gap sets intra-pair gap (and doubles for inter-pair)', () => {
    const height = (s: string) => Number((s.match(/<svg[^>]*height="(\d+)"/) || [])[1]);
    const gapped = mpc.render_chart(two_runs, 720, 372, 32);
    const flush  = mpc.render_chart(two_runs, 720, 372, 0);
    expect(height(gapped.svg)).toBeGreaterThan(height(flush.svg));
    expect(flush.svg).toContain('translate(0 428)');   // 56 + 372, no intra gap
  });

  test('linear twin windows to the most recent 30 versions', () => {
    const many = Array.from({ length: 35 }, (_, i) => run({
      pr: i + 1, version: `5.0.${i}`,
      results: [ { name: 'chain-200 transition()', ops: 100 + i } ]
    }));
    const { panels } = mpc.render_chart(many);
    const pair = panels.get('transition()');
    expect(pair.log).toContain('>1<');        // oldest PR present in the full-history log panel
    expect(pair.linear).not.toContain('>1<'); // ...but dropped from the last-30 linear twin
    expect(pair.linear).toContain('>35<');    // newest PR present in both
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
```

Keep the existing `is deterministic: identical input renders byte-identical output` and `release x-labels are tinted ...` and `emits one panel per present operation and a composite header` tests as-is (they read `.svg`, still valid).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/scripts/tests/make_perf_chart.spec.ts --config vitest.spec.config.ts --coverage.enabled=false -t "render_chart"`
Expected: FAIL — `panels.get(...).log` is undefined (panels still hold strings), no `packageBytes` key, height/translate values differ.

- [ ] **Step 3: Rewrite `render_chart`**

Replace the whole `render_chart` function body with:

```js
function render_chart(runs, panel_width = 720, panel_height = 372, panel_gap = 32, cols = 2) {
  const series = pivot_series(runs);
  const keys   = runs.map(key_of);
  const keys30 = keys.slice(-30);

  // Each panel is a { log, linear } pair: the log twin over full history, the
  // linear twin over the last 30 keys with a 10%-padded axis.
  const make_pair = (op, by_shape, unit) => {
    const windowed = new Map();
    for (const [shape, pts] of by_shape) {
      windowed.set(shape, pts.filter((p) => keys30.includes(p.key)));
    }
    return {
      log    : panel_svg(op, by_shape,  keys,   panel_width, panel_height, unit, 'log'),
      linear : panel_svg(op, windowed,  keys30, panel_width, panel_height, unit, 'linear')
    };
  };

  const panels = new Map();
  for (const op of OPERATIONS) {
    if (series.has(op)) { panels.set(op, make_pair(op, series.get(op), 'ops/sec')); }
  }

  // package-size panel (single line, bytes): the shape-independent package
  // weight, only when the data carries a bundles block.
  const pkg = bundle_size_series(runs);
  if (pkg.size > 0) { panels.set('packageBytes', make_pair('package size', pkg, 'bytes')); }

  const col_gap        = 40;                        // horizontal breathing room between columns
  const intra_pair_gap = panel_gap;                 // log -> linear twin inside a pair
  const inter_pair_gap = panel_gap * 2;             // between pair-rows: doubled, so pairs read as distinct
  const pair_height    = 2 * panel_height + intra_pair_gap;
  const rows           = Math.ceil(panels.size / cols);
  const header_h       = 56;
  const width          = cols * panel_width + Math.max(0, cols - 1) * col_gap;
  const total_h        = header_h + rows * pair_height + Math.max(0, rows - 1) * inter_pair_gap;

  const strip = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const parts = [];
  parts.push(`<svg width="${width}" height="${total_h}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,sans-serif">`);
  parts.push(`<rect width="${width}" height="${total_h}" fill="#ffffff"/>`);
  parts.push(`<text x="16" y="24" font-size="17" font-weight="bold" fill="#1a1a1a">jssm performance trend — graviton runners (perf_results branch)</text>`);
  parts.push(`<text x="16" y="44" font-size="11" fill="#666">${summary_line(runs)} Source: ${DEFAULTS.ghRepo} branch perf_results, instance ${DEFAULTS.instanceType}. Data through ${data_stamp(runs)}.</text>`);

  // lay pairs out in a cols-wide grid, row-major; each cell stacks log over linear
  let i = 0;
  for (const pair of panels.values()) {
    const col = i % cols, row = Math.floor(i / cols);
    const ox  = col * (panel_width + col_gap);
    const oy  = header_h + row * (pair_height + inter_pair_gap);
    parts.push(`<g transform="translate(${ox} ${oy})">${strip(pair.log)}</g>`);
    parts.push(`<g transform="translate(${ox} ${oy + panel_height + intra_pair_gap})">${strip(pair.linear)}</g>`);
    i++;
  }
  parts.push('</svg>');

  return { svg: parts.join('\n'), panels };
}
```

- [ ] **Step 4: Delete `footprint_series` and its export**

Remove the entire `footprint_series` function (its DocBlock + body). In `module.exports`, drop `footprint_series`:

```js
  semver_compare, compare_runs, key_of, pivot_series, bundle_size_series, data_stamp, summary_line,
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/scripts/tests/make_perf_chart.spec.ts --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS — all `render_chart` tests (pairs, layout, windowing, package panel) green; no reference to `footprint_series` remains.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/make_perf_chart.cjs src/scripts/tests/make_perf_chart.spec.ts
git commit -m "feat: render log+linear panel pairs and a package-size panel; drop footprint panel"
```

---

### Task 5: `--comment` mode parity (publish + embed both twins)

**Files:**
- Modify: `src/scripts/make_perf_chart.cjs` (`publish_charts`, `build_comment_body`)
- Test: `src/scripts/tests/make_perf_chart.spec.ts`

**Interfaces:**
- Consumes: `render_chart(...).panels` as `Map<op, {log,linear}>` (Task 4).
- Produces:
  - `publish_charts(exec, panels, stamp) => { sha, urls }` where `urls: Map<op, { log:string, linear:string }>`; writes `<slug>.svg` and `<slug>.linear.svg` per op.
  - `build_comment_body(urls, runs, sha)` embeds, per op, the log image then the linear image beneath it.

- [ ] **Step 1: Update/add the failing tests**

Replace the `build_comment_body` test with:

```ts
describe('build_comment_body', () => {

  test('embeds each op\'s log and linear image and the publishing sha', () => {
    const urls = new Map([[ 'construct()',
      { log: 'https://x/construct.svg', linear: 'https://x/construct.linear.svg' } ]]);
    const body = mpc.build_comment_body(urls, two_runs, 'abc123');
    expect(body).toContain('![construct() trend (log)](https://x/construct.svg)');
    expect(body).toContain('![construct() trend (linear, last 30)](https://x/construct.linear.svg)');
    expect(body).toContain('abc123');
    expect(body).toContain('2 measured PRs');
  });

});
```

Add a dry-run test for `publish_charts` URL shaping (no fs writes on the dry-run path):

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/scripts/tests/make_perf_chart.spec.ts --config vitest.spec.config.ts --coverage.enabled=false -t "build_comment_body|publish_charts"`
Expected: FAIL — comment body embeds a single `[op trend]` image; `urls.get(op)` is a string, so `.log`/`.linear` are undefined.

- [ ] **Step 3: Update `publish_charts`**

Replace the write loop:

```js
      for (const [op, svg] of panels) {
        fs.writeFileSync(path.join(dest, `${chart_slug(op)}.svg`), svg);
      }
```

with:

```js
      for (const [op, pair] of panels) {
        fs.writeFileSync(path.join(dest, `${chart_slug(op)}.svg`),        pair.log);
        fs.writeFileSync(path.join(dest, `${chart_slug(op)}.linear.svg`), pair.linear);
      }
```

Replace the `urls` construction:

```js
    const urls = new Map([...panels.keys()].map((op) => [
      op,
      `https://raw.githubusercontent.com/${DEFAULTS.ghRepo}/${sha}/charts/${stamp}/${chart_slug(op)}.svg`
    ]));
```

with:

```js
    const base = `https://raw.githubusercontent.com/${DEFAULTS.ghRepo}/${sha}/charts/${stamp}`;
    const urls = new Map([...panels.keys()].map((op) => [
      op,
      { log    : `${base}/${chart_slug(op)}.svg`,
        linear : `${base}/${chart_slug(op)}.linear.svg` }
    ]));
```

- [ ] **Step 4: Update `build_comment_body`**

Replace the embed loop and intro line. Old:

```js
  lines.push(`${summary_line(runs)} Log-scale ops/sec, one line per machine shape.`);
  lines.push('');
  for (const [op, url] of urls) {
    lines.push(`![${op} trend](${url})`);
    lines.push('');
  }
```

New:

```js
  lines.push(`${summary_line(runs)} Each operation shows a log panel (full history) above a linear twin (last 30 versions).`);
  lines.push('');
  for (const [op, u] of urls) {
    lines.push(`![${op} trend (log)](${u.log})`);
    lines.push('');
    lines.push(`![${op} trend (linear, last 30)](${u.linear})`);
    lines.push('');
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/scripts/tests/make_perf_chart.spec.ts --config vitest.spec.config.ts --coverage.enabled=false -t "build_comment_body|publish_charts"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/make_perf_chart.cjs src/scripts/tests/make_perf_chart.spec.ts
git commit -m "feat: publish and embed linear twins in the perf-chart issue comment"
```

---

### Task 6: DocBlocks, artifact regen, and full verification

**Files:**
- Modify: `src/scripts/make_perf_chart.cjs` (module + `panel_svg` + `render_chart` + `build_comment_body` DocBlocks)
- Regenerate: `src/generated_docs/perf_chart.svg`, `src/generated_docs/perf_data.json`

**Interfaces:** none new.

- [ ] **Step 1: Update the module-level DocBlock**

At the top of `make_perf_chart.cjs`, revise the summary: it currently says it "renders one log-scale SVG panel per operation". Change to describe that each operation renders a **log panel over a linear twin** (linear = last 30 versions, 10%-padded axis), and that the final panel is **package size** (summed raw bytes of the dist bundles, a single line), not machine footprint. Remove any "machine footprint" wording.

- [ ] **Step 2: Update `panel_svg` / `render_chart` / `build_comment_body` DocBlocks**

- `panel_svg`: document the new `@param scale` (`'log'` default | `'linear'`); note linear pads 10% of span and labels ticks via `format_tick`.
- `render_chart`: document that `panels` now maps each op to a `{ log, linear }` pair, the intra/inter-pair gaps (`panel_gap` / `panel_gap*2`), and the last-30 linear window.
- `build_comment_body`: update `@param urls` to `Map<op, { log, linear }>`.

- [ ] **Step 3: Check IDE diagnostics**

Run `mcp__ide__getDiagnostics` on `src/scripts/make_perf_chart.cjs` and `src/scripts/tests/make_perf_chart.spec.ts`. Expected: no new errors/warnings. Fix any that appear.

- [ ] **Step 4: Regenerate the committed artifacts**

Run: `node src/scripts/make_perf_chart.cjs`
Expected: either `perf_chart: N runs, M panels, data through <stamp> -> ...generated_docs` (regenerated), OR `perf_chart: perf_results unreachable or empty; keeping existing artifacts` when this host can't reach the `perf_results` branch.

- If regenerated: `git add src/generated_docs/perf_chart.svg src/generated_docs/perf_data.json` and include them in the commit below.
- If unreachable: note it; CI regenerates on push (the `perf_chart` build step runs with network). Do **not** hand-edit the SVG.

- [ ] **Step 5: Run the full spec suite (100% coverage gate) + lint**

Run: `npm run vitest-spec`
Expected: PASS with 100% coverage over the gated `src/` surface (the new pure functions are all unit-covered; `footprint_series`'s removal drops its old lines).

Run: `npm run eslint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/make_perf_chart.cjs
# add regenerated artifacts too, only if Step 4 regenerated them:
# git add src/generated_docs/perf_chart.svg src/generated_docs/perf_data.json
git commit -m "docs: update perf-chart DocBlocks for package-size panel + linear twins"
```

---

## Post-plan (out of individual tasks, done from the main session)

- Run `/sc-commit` on `feat_26-07-05_graviton-perf-graphing` (version bump + full `npm run build` + commit) — required before opening the PR, and the full build is what regenerates `perf_chart.svg`/`perf_data.json` from real `perf_results` data in CI.
- Open the PR from the feature branch.

## Self-Review

**Spec coverage:**
- Req 1 (package-size single line, sum of raw) → Tasks 1, 2, 4. ✓
- Req 2 (linear twin: linear scale, 10%-span bounds, last-30 window) → Tasks 3 (scale+bounds), 4 (windowing). ✓
- Req 3 (twin beneath each graph, same width, doubled inter-pair gap) → Task 4 layout. ✓
- Req 4 (comment-mode parity) → Task 5. ✓
- Non-goal (log path byte-identical) → guarded in Task 3, re-verified by unchanged log tests in Tasks 3–4. ✓
- DocBlocks/artifacts → Task 6. ✓

**Placeholder scan:** none — every code step carries complete code.

**Type consistency:** `panels` is `Map<op,{log,linear}>` from Task 4 onward; `urls` is `Map<op,{log,linear}>` in Task 5; `bundle_size_series`/`PACKAGE_SERIES_LABEL`/`format_tick`/`make_pair` names are consistent across tasks. Package panel key `'packageBytes'` and display name `'package size'` used consistently.
