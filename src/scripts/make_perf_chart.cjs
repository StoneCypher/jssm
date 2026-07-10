'use strict';

/**
 *  Graviton perf-trend chart generator (#748).  Reads every measured run from
 *  the `perf_results` data branch (`c8g.medium/pr-N/scaling.json` and
 *  `c8g.medium/release-V/scaling.json`), and renders, per benchmarked operation,
 *  a log-scale SVG panel (full history, one line per machine shape) over a
 *  linear-scale twin (the most recent `LINEAR_WINDOW` versions, y-axis padded 10% of the data
 *  span) — PRs ordered by number then releases by semver.  A final panel tracks
 *  package size as a single line (the summed raw byte size of the published dist
 *  bundles, from each run's `bundles` block).  Also emits a machine-readable data
 *  JSON.
 *
 *  Three consumers:
 *
 *    node src/scripts/make_perf_chart.cjs
 *        Build-pipeline mode (the `perf_chart` step of `npm run build`):
 *        regenerates src/generated_docs/perf_chart.svg and perf_data.json.
 *        DETERMINISTIC — stamped from the newest data point's date, never
 *        wall clock, with stable ordering — so unchanged data produces
 *        byte-identical artifacts and no diff churn in unrelated PRs.
 *        Degrades gracefully (warns and keeps existing files, exit 0) when
 *        the perf_results fetch fails, so offline builds still pass.
 *
 *    node src/scripts/make_perf_chart.cjs --out <dir>
 *        Same, into another directory.
 *
 *    node src/scripts/make_perf_chart.cjs --comment [--issue <n>]
 *        Run-end mode (the perf_chart workflow, on every push to
 *        perf_results): additionally commits the per-operation log + linear SVGs
 *        to the perf_results branch under charts/<stamp>/ and posts them to the
 *        perf-tracking issue (default #636) via raw URLs pinned to the
 *        publishing commit SHA — GitHub's API has no comment-attachment
 *        upload, and SHA-pinning means later branch movement can never break
 *        the images.  Push uses the non-fast-forward rebase retry from
 *        graviton_perf.cjs, since concurrent runs race the branch.
 *
 *  Every shell-out (git, gh) goes through the {@link make_executor} seam, so
 *  the pure logic (run collection and ordering, series pivoting, SVG
 *  rendering, comment building) is unit-testable without a network; pass
 *  `--dry-run` to print every command instead of executing.
 *
 *  @see https://github.com/StoneCypher/jssm/issues/748
 *  @see src/scripts/graviton_perf.cjs
 */

const { execFileSync } = require('child_process');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

/** Defaults shared by the CLI parser and the docs. */
const DEFAULTS = Object.freeze({
  instanceType : 'c8g.medium',   // the re-baselined trail namespace (matches graviton_perf.cjs)
  issue        : 636,
  ghRepo       : 'StoneCypher/jssm',
  repoUrl      : 'https://github.com/StoneCypher/jssm.git',
  outDir       : path.join(__dirname, '..', 'generated_docs')
});

/** Operations charted, in panel order; absent operations are skipped. */
const OPERATIONS = Object.freeze([
  'construct()',
  'transition()',
  'action()',
  'edges_between()',
  'has_state()',
  'list_exit_actions()',
  'probable_action_exits()'
]);

/** Paul Tol-ish categorical palette; cycles when a panel has more shapes. */
const PALETTE = Object.freeze([
  '#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#BBBBBB',
  '#222255', '#225555', '#552222', '#555522', '#8855AA'
]);

/** How many most-recent versions the linear twin panels window to. */
const LINEAR_WINDOW = 50;

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested; no side effects)
// ---------------------------------------------------------------------------

/**
 *  Numeric-by-part version comparison, so `5.143.10` sorts after `5.143.9`.
 *
 *  @param a Version string like `5.143.10`.
 *  @param b Version string to compare against.
 *  @returns Negative / zero / positive in the usual comparator convention.
 *
 *  @example semver_compare('5.143.10', '5.143.9') // => positive
 */
function semver_compare(a, b) {
  const pa = a.split('.').map((n) => parseInt(n, 10));
  const pb = b.split('.').map((n) => parseInt(n, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); ++i) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) { return d; }
  }
  return 0;
}

/**
 *  Comparator for collected runs: every PR (ascending number) precedes every
 *  release (ascending semver), matching the trail's reading order.
 *
 *  @param a A run from {@link collect_runs}.
 *  @param b A run to compare against.
 *  @returns Standard comparator result.
 *
 *  @example
 *  [{kind:'release',release:'5.1.0'},{kind:'pr',pr:9}].sort(compare_runs)[0].pr // => 9
 */
function compare_runs(a, b) {
  if (a.kind !== b.kind) { return a.kind === 'pr' ? -1 : 1; }
  return a.kind === 'pr' ? a.pr - b.pr : semver_compare(a.release, b.release);
}

/**
 *  Stable x-axis key for a run; doubles as its tick label.
 *
 *  @param run A run from {@link collect_runs}.
 *  @returns `"598"` for PRs, `"v5.143.9"` for releases.
 *
 *  @example key_of({ kind: 'release', release: '5.1.0' }) // => 'v5.1.0'
 */
function key_of(run) {
  return run.kind === 'pr' ? `${run.pr}` : `v${run.release}`;
}

/**
 *  Pivot sorted runs into operation -> shape -> [{ key, ops }] series by
 *  splitting each benny result name at its final space
 *  (`"chain-200 transition()"` -> shape `"chain-200"`, op `"transition()"`).
 *
 *  @param runs Sorted runs from {@link collect_runs}.
 *  @returns Map of operation to (Map of shape to ordered point list).
 */
function pivot_series(runs) {
  const series = new Map();
  for (const run of runs) {
    for (const r of run.results) {
      const sp    = r.name.lastIndexOf(' ');
      const shape = r.name.slice(0, sp);
      const op    = r.name.slice(sp + 1);
      if (!series.has(op)) { series.set(op, new Map()); }
      const by_shape = series.get(op);
      if (!by_shape.has(shape)) { by_shape.set(shape, []); }
      by_shape.get(shape).push({ key: key_of(run), ops: r.ops });
    }
  }
  return series;
}

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

/**
 *  The deterministic stamp for a data set: the lexicographically greatest
 *  `date` across all runs, normalized to `YYYYMMDD-HHMMSS`.  Using data time
 *  instead of wall clock is what makes regeneration reproducible — a build
 *  over unchanged data emits byte-identical artifacts.
 *
 *  @param runs Collected runs (each carries its scaling.json `date`).
 *  @returns A filesystem-safe stamp, or `'empty'` when there are no runs.
 *
 *  @example
 *  data_stamp([{ date: '2026-06-11T01:02:03.000Z' }]) // => '20260611-010203'
 */
function data_stamp(runs) {
  if (runs.length === 0) { return 'empty'; }
  const newest = runs.map((r) => r.date || '').sort().pop();
  const m = String(newest).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  return m ? `${m[1]}${m[2]}${m[3]}-${m[4]}${m[5]}${m[6]}` : 'empty';
}

/**
 *  One-sentence human summary of the data set, used in the SVG title block,
 *  the JSON, and the issue comment.
 *
 *  @param runs Sorted runs.
 *  @returns e.g. `24 measured PRs (pr-598 → pr-682) and 2 measured releases
 *           (v5.1.0 → v5.2.0) (latest jssm 5.143.4).`
 */
function summary_line(runs) {
  const prs      = runs.filter((r) => r.kind === 'pr');
  const releases = runs.filter((r) => r.kind === 'release');
  const latest   = runs[runs.length - 1];

  return `${prs.length} measured PRs` +
    (prs.length ? ` (pr-${prs[0].pr} → pr-${prs[prs.length - 1].pr})` : '') +
    ` and ${releases.length} measured releases` +
    (releases.length ? ` (v${releases[0].release} → v${releases[releases.length - 1].release})` : '') +
    ` (latest jssm ${latest ? latest.version : '?'}).`;
}

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

/**
 *  Render one operation's panel as a standalone SVG: log-scale ops/sec, one
 *  line per machine shape, x ticks per run (releases angled and tinted), a
 *  faint vertical guide behind every run column (to line a point up with its
 *  source version), a legend, and an opaque background (panels are embedded in
 *  GitHub comments, where a transparent canvas is illegible in dark mode).
 *
 *  @param op Operation name, e.g. `construct()`.
 *  @param by_shape Map of shape to ordered `{ key, ops }` points.
 *  @param keys Every run key, in x order.
 *  @param width Panel width in px.
 *  @param height Panel height in px.
 *  @param unit Y-axis metric label for the title, e.g. `'ops/sec'` (throughput
 *         panels) or `'bytes'` (the package-size panel).  The point values still come
 *         from each point's `ops` field — `unit` only renames the axis.
 *  @param scale `'log'` (default) renders the log-decade axis anchored at 10^0;
 *         `'linear'` renders a linear axis padded 10% of the data span on each
 *         side, tick labels humanized via {@link format_tick}, and titles the
 *         panel `(linear scale, last N)` (N = {@link LINEAR_WINDOW}) — the caller windows the points.
 *  @returns A self-contained `<svg>` string.
 */
function panel_svg(op, by_shape, keys, width, height, unit = 'ops/sec', scale = 'log') {
  const m  = { t: 34, r: 150, b: 48, l: 64 };
  const iw = width - m.l - m.r, ih = height - m.t - m.b;

  const x = (key) => m.l + (keys.indexOf(key) / Math.max(1, keys.length - 1)) * iw;

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
    const pad  = span > 0 ? span * 0.1 : (Math.abs(hi) * 0.1 || 1);   // 10% of the span; flat data -> 10% of the value
    ylo = lo - pad;
    yhi = hi + pad;
    y   = (v) => m.t + ih - ((v - ylo) / Math.max(1e-9, yhi - ylo)) * ih;
  } else {
    ylo = 0;                                     // anchor the axis at 10^0 (the zeroth order of ten)
    yhi = Math.floor(Math.log10(hi)) + 1;        // round the top up to the next order of ten above the max
    y   = (ops) => m.t + ih - ((Math.log10(ops) - ylo) / Math.max(1e-9, yhi - ylo)) * ih;
  }

  const els = [];
  els.push(`<rect width="${width}" height="${height}" fill="#ffffff"/>`);
  const scale_note = linear ? `linear scale, last ${LINEAR_WINDOW}` : 'log scale';
  els.push(`<text x="${m.l}" y="20" font-size="15" font-weight="bold" fill="#333">${op} — ${unit} (${scale_note}) by PR / release, ${DEFAULTS.instanceType}</text>`);

  // Gridlines, painted strictly lightest → heaviest so a heavier line is never
  // overpainted by a lighter one at a crossing (in SVG, paint order IS z-order):
  //   #e8e8e8 light verticals < #d8d8d8 minor decades < #d0d0d0 heavy verticals < #b0b0b0 decade lines.
  // The vertical guides sit behind the data so a point lines up with its source
  // version/PR column; the every-fifth guide is a stronger column marker.

  // pass 1 — light vertical guides (the four between every fifth): lightest, first
  for (const [i, key] of keys.entries()) {
    if (i % 5 !== 0) {
      const vx = x(key).toFixed(1);
      els.push(`<line x1="${vx}" y1="${m.t}" x2="${vx}" y2="${m.t + ih}" stroke="#e8e8e8"/>`);
    }
  }
  // pass 2 — minor log gridlines at 2..9 × 10^d; the non-uniform spacing within
  // each decade is the visual tell that the axis is logarithmic (log only)
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
  // pass 3 — every-fifth vertical guide: heavier than the minor decades, on top
  for (const [i, key] of keys.entries()) {
    if (i % 5 === 0) {
      const vx = x(key).toFixed(1);
      els.push(`<line x1="${vx}" y1="${m.t}" x2="${vx}" y2="${m.t + ih}" stroke="#d0d0d0"/>`);
    }
  }
  // pass 4 — heaviest horizontal gridlines + axis labels, drawn last so they
  // read cleanly through every crossing.
  if (linear) {
    // five evenly-spaced ticks across the padded linear range, humanized labels
    const TICKS = 5;
    for (let i = 0; i <= TICKS; i++) {
      const v  = ylo + (i / TICKS) * (yhi - ylo);
      const yy = y(v);
      els.push(`<line x1="${m.l}" y1="${yy.toFixed(1)}" x2="${m.l + iw}" y2="${yy.toFixed(1)}" stroke="#b0b0b0"/>`);
      els.push(`<text x="${m.l - 6}" y="${(yy + 4).toFixed(1)}" font-size="10" text-anchor="end" fill="#888">${format_tick(v)}</text>`);
    }
  } else {
    // log decades + 1e<d> labels
    for (let d = Math.ceil(ylo); d <= Math.floor(yhi); d++) {
      const yy = y(Math.pow(10, d));
      els.push(`<line x1="${m.l}" y1="${yy}" x2="${m.l + iw}" y2="${yy}" stroke="#b0b0b0"/>`);
      els.push(`<text x="${m.l - 6}" y="${yy + 4}" font-size="10" text-anchor="end" fill="#888">1e${d}</text>`);
    }
  }

  // x labels: every run (no skipping), tiny and steep, hard against the axis.
  // Release labels are tinted by what changed vs the previous release — a major
  // bump 30% darker, a patch-only bump 30% lighter (twice), a minor bump at the
  // base tint; PR labels stay neutral.  prev_rel holds the last release seen so
  // the comparison skips intervening PR columns.
  let prev_rel = null;
  for (const key of keys) {
    const xx = x(key).toFixed(1);
    const yy = m.t + ih + 3.2;                            // gap cut ~80% (was +16)
    if (key.startsWith('v')) {
      const cur = key.slice(1).split('.').map(Number);
      let fill = '#aa4400';                               // minor bump / first release = base
      if (prev_rel) {
        if (cur[0] !== prev_rel[0])      { fill = '#773000'; }   // major bump: 30% darker
        else if (cur[1] === prev_rel[1]) { fill = '#d6a382'; }   // patch-only bump: 30% lighter, twice
      }
      prev_rel = cur;
      els.push(`<text x="${xx}" y="${yy}" font-size="4" text-anchor="end" fill="${fill}" transform="rotate(-80 ${xx} ${yy})">${key}</text>`);
    } else {
      els.push(`<text x="${xx}" y="${yy}" font-size="4" text-anchor="end" fill="#888" transform="rotate(-80 ${xx} ${yy})">${key}</text>`);
    }
  }

  let ci = 0, legend_y = m.t;
  for (const shape of by_shape.keys()) {
    const color = PALETTE[ci++ % PALETTE.length];
    const pts   = by_shape.get(shape).filter((p) => linear ? Number.isFinite(p.ops) : p.ops > 0);
    if (pts.length > 1) {
      const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.key).toFixed(1)},${y(p.ops).toFixed(1)}`).join(' ');
      els.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="1.6"/>`);
    }
    for (const p of pts) {
      els.push(`<circle cx="${x(p.key).toFixed(1)}" cy="${y(p.ops).toFixed(1)}" r="2" fill="${color}"/>`);
    }
    els.push(`<rect x="${m.l + iw + 10}" y="${legend_y}" width="10" height="10" fill="${color}"/>`);
    els.push(`<text x="${m.l + iw + 24}" y="${legend_y + 9}" font-size="10" fill="#444">${shape}</text>`);
    legend_y += 15;
  }

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${els.join('')}</svg>`;
}

/**
 *  Render every panel as a log-over-linear pair, laid out in a `cols`-wide grid
 *  (row-major, left→right then top→bottom) with a title block — the
 *  `src/generated_docs/perf_chart.svg` artifact.  Each cell stacks the
 *  full-history log panel above a linear twin windowed to the last `LINEAR_WINDOW` versions;
 *  the final panel is the single-line package size (summed raw dist-bundle
 *  bytes), added only when the data carries a `bundles` block.
 *
 *  @param runs Sorted runs.
 *  @param panel_width Width of each panel in px (both twins share it).
 *  @param panel_height Height of each panel in px.
 *  @param panel_gap Base gap unit in px.  The intra-pair gap (log → linear) is
 *                   `panel_gap / 4` so the two twins read as one tightly-coupled
 *                   unit; the inter-pair-row gap is `panel_gap * 4` so separate
 *                   pair sets read as clearly distinct.
 *  @param cols Number of pair columns (2 ⇒ a two-wide grid).
 *  @returns `{ svg, panels }` — the composite document and a Map of each panel's
 *           `{ log, linear }` SVG pair keyed by operation (`'packageBytes'` for
 *           the package panel); the comment flow embeds both twins.
 */
function render_chart(runs, panel_width = 720, panel_height = 372, panel_gap = 32, cols = 2) {
  const series = pivot_series(runs);
  const keys   = runs.map(key_of);
  const keysWindow = keys.slice(-LINEAR_WINDOW);

  // Each panel is a { log, linear } pair: the log twin over full history, the
  // linear twin over the last LINEAR_WINDOW keys with a 10%-padded axis.
  const make_pair = (op, by_shape, unit) => {
    const windowed = new Map();
    for (const [shape, pts] of by_shape) {
      windowed.set(shape, pts.filter((p) => keysWindow.includes(p.key)));
    }
    return {
      log    : panel_svg(op, by_shape, keys,       panel_width, panel_height, unit, 'log'),
      linear : panel_svg(op, windowed, keysWindow, panel_width, panel_height, unit, 'linear')
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
  const intra_pair_gap = panel_gap / 4;             // log → linear twin: tight, so each pair reads as one unit
  const inter_pair_gap = panel_gap * 4;             // between pair-rows: 4× the base gap, so pair sets read as clearly distinct
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

/**
 *  Shape the machine-readable sidecar (`perf_data.json`): provenance plus
 *  every run's identity, version, date, and full benny results, in chart
 *  order.  Key order is fixed so unchanged data serializes byte-identically.
 *
 *  @param runs Sorted runs.
 *  @returns A plain object ready to stringify.
 */
function build_data_json(runs) {
  return {
    source       : `${DEFAULTS.ghRepo}#perf_results`,
    instanceType : DEFAULTS.instanceType,
    dataThrough  : data_stamp(runs),
    summary      : summary_line(runs),
    runs         : runs.map((r) => ({
      kind    : r.kind,
      pr      : r.pr,
      release : r.release,
      version : r.version,
      date    : r.date,
      results : r.results,
      bundles : r.bundles
    }))
  };
}

/**
 *  Build the issue-comment markdown: summary, each operation's log panel with
 *  its linear twin embedded directly beneath it, provenance footer naming the
 *  publishing commit.
 *
 *  @param urls Map of operation name -> `{ log, linear }` SHA-pinned image URLs.
 *  @param runs Sorted runs (for the summary line).
 *  @param sha The perf_results commit the images are pinned to.
 *  @returns Markdown for `gh issue comment --body-file`.
 */
function build_comment_body(urls, runs, sha) {
  const lines = [];
  lines.push(`## Graviton perf trend — ${DEFAULTS.instanceType}`);
  lines.push('');
  lines.push(`${summary_line(runs)} Each operation shows a log panel (full history) above a linear twin (last ${LINEAR_WINDOW} versions).`);
  lines.push('');
  for (const [op, u] of urls) {
    lines.push(`![${op} trend (log)](${u.log})`);
    lines.push('');
    lines.push(`![${op} trend (linear, last ${LINEAR_WINDOW})](${u.linear})`);
    lines.push('');
  }
  lines.push(`<sub>Generated by \`src/scripts/make_perf_chart.cjs\` from the \`perf_results\` branch; charts committed at ${sha}.</sub>`);
  return lines.join('\n');
}

/** Filename slug for an operation name: 'edges_between()' -> 'edges_between'. */
function chart_slug(op) {
  return op.replace(/\(\)$/, '').replace(/[^\w-]/g, '_');
}

/**
 *  Parse the script's flags.
 *
 *  @param argv `process.argv.slice(2)`.
 *  @returns `{ outDir, comment, issue, dryRun }`.
 *  @throws Error on an unknown flag, a missing flag value, or a non-numeric
 *          `--issue`.
 *
 *  @example parse_args([]).outDir.endsWith('generated_docs') // => true
 *  @example parse_args(['--comment', '--issue', '9']).issue  // => 9
 */
function parse_args(argv) {
  const opts = { outDir: DEFAULTS.outDir, comment: false, issue: DEFAULTS.issue, dryRun: false };
  for (let i = 0; i < argv.length; ++i) {
    const a = argv[i];
    if (a === '--out') {
      opts.outDir = argv[++i];
      if (opts.outDir === undefined) { throw new Error('--out requires a directory'); }
    } else if (a === '--issue') {
      opts.issue = parseInt(argv[++i], 10);
      if (!Number.isInteger(opts.issue) || opts.issue < 1) { throw new Error('--issue requires a positive integer'); }
    } else if (a === '--comment') { opts.comment = true; }
    else if   (a === '--dry-run') { opts.dryRun  = true; }
    else { throw new Error(`unknown flag: ${a}`); }
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Executor seam (side effects live here; --dry-run swaps in a printer)
// ---------------------------------------------------------------------------

/**
 *  Build the executor used for every shell-out (git, gh).  In dry-run mode it
 *  prints the command and returns a benign canned value instead of executing.
 *
 *  @param dry_run When true, print-and-return; when false, actually run.
 *  @returns `{ run, dryRun }` where `run(cmd, args, opts)` executes without a
 *           shell and returns the trimmed stdout string; `opts.cwd` sets the
 *           working directory, `opts.allowFail` returns null instead of
 *           throwing on a nonzero exit.
 *
 *  @example make_executor(true).run('git', ['fetch']) // => ''
 */
function make_executor(dry_run) {
  const run = (cmd, args, opts = {}) => {
    if (dry_run) {
      process.stdout.write(`[dry-run] ${cmd} ${args.join(' ')}\n`);
      return opts.dryRunStdout !== undefined ? opts.dryRunStdout : '';
    }
    try {
      return execFileSync(cmd, args, {
        encoding  : 'utf8',
        maxBuffer : 256 * 1024 * 1024,
        cwd       : opts.cwd
      }).trim();
    } catch (e) {
      if (opts.allowFail) { return null; }
      throw e;
    }
  };
  return { run, dryRun: dry_run };
}

// ---------------------------------------------------------------------------
// Data collection
// ---------------------------------------------------------------------------

/**
 *  Fetch `origin/perf_results` and collect every measured run, sorted by
 *  {@link compare_runs}.  Paths under `charts/` (this script's own output on
 *  that branch) and anything not shaped `pr-N` / `release-V` are ignored.
 *
 *  @param exec An executor from {@link make_executor}.
 *  @param repo_dir Local repo directory to run git from.
 *  @returns Sorted run array, or `null` when the fetch fails (offline /
 *           branch absent) — callers degrade gracefully on null.
 */
function collect_runs(exec, repo_dir) {
  const fetched = exec.run('git', ['fetch', 'origin', 'perf_results'], { cwd: repo_dir, allowFail: true, dryRunStdout: '' });
  if (fetched === null) { return null; }

  const listing = exec.run('git', ['ls-tree', '-r', 'FETCH_HEAD', '--name-only'], { cwd: repo_dir, allowFail: true, dryRunStdout: '' });
  if (listing === null) { return null; }

  const runs = [];
  for (const p of listing.split('\n')) {
    if (!p.startsWith(`${DEFAULTS.instanceType}/`) || !p.endsWith('/scaling.json')) { continue; }
    const dir  = path.posix.dirname(p);
    const pr_m = dir.match(/\/pr-(\d+)$/);
    const rl_m = dir.match(/\/release-([\w.+-]+)$/);
    if (!pr_m && !rl_m) { continue; }

    const raw  = exec.run('git', ['show', `FETCH_HEAD:${p}`], { cwd: repo_dir, dryRunStdout: '{"version":"0.0.0","date":"","results":[]}' });
    const data = JSON.parse(raw);
    runs.push({
      kind    : pr_m ? 'pr' : 'release',
      pr      : pr_m ? parseInt(pr_m[1], 10) : undefined,
      release : rl_m ? rl_m[1] : undefined,
      version : data.version,
      date    : data.date,
      results : data.results,
      bundles : data.bundles
    });
  }

  runs.sort(compare_runs);
  return runs;
}

// ---------------------------------------------------------------------------
// Publish + comment (run-end mode)
// ---------------------------------------------------------------------------

/**
 *  Push the staged perf_results commit, retrying on a non-fast-forward
 *  reject — a concurrent graviton run may have advanced the branch.  Each
 *  chart run only adds its own `charts/<stamp>/` files, so a rebase replays
 *  cleanly; only the ref race is retried, never a content merge.
 *
 *  @param exec An executor from {@link make_executor}.
 *  @param dir The throwaway clone, already committed.
 *  @throws Error after 5 rejected attempts, or on a real rebase conflict.
 */
function push_with_retry(exec, dir) {
  for (let attempt = 1; attempt <= 5; ++attempt) {
    const pushed = exec.run('git', ['push', 'origin', 'perf_results'], { cwd: dir, allowFail: true });
    if (exec.dryRun || pushed !== null) { return; }
    exec.run('git', ['fetch', 'origin', 'perf_results'], { cwd: dir });
    const rebased = exec.run('git', ['rebase', 'origin/perf_results'], { cwd: dir, allowFail: true });
    if (rebased === null) {
      exec.run('git', ['rebase', '--abort'], { cwd: dir, allowFail: true });
      throw new Error('perf_results: rebase conflict while publishing charts (fresh charts/<stamp>/ files should never conflict)');
    }
  }
  throw new Error('perf_results: push still rejected after 5 attempts');
}

/**
 *  Commit the per-operation SVGs to perf_results under `charts/<stamp>/` via
 *  a throwaway clone and return SHA-pinned raw URLs for embedding.
 *
 *  @param exec An executor from {@link make_executor}.
 *  @param panels Map of operation name -> `{ log, linear }` SVG markup.
 *  @param stamp The data stamp naming this chart set's directory.
 *  @returns `{ sha, urls }` — `urls` maps operation to `{ log, linear }` pinned
 *           raw URLs (`<slug>.svg` and `<slug>.linear.svg`).
 */
function publish_charts(exec, panels, stamp) {
  const tmp = exec.dryRun ? '<tmp>' : fs.mkdtempSync(path.join(os.tmpdir(), 'jssm-perf-charts-'));
  try {
    exec.run('git', ['clone', '--depth', '1', '--branch', 'perf_results', DEFAULTS.repoUrl, String(tmp)]);

    if (!exec.dryRun) {
      const dest = path.join(tmp, 'charts', stamp);
      fs.mkdirSync(dest, { recursive: true });
      for (const [op, pair] of panels) {
        fs.writeFileSync(path.join(dest, `${chart_slug(op)}.svg`),        pair.log);
        fs.writeFileSync(path.join(dest, `${chart_slug(op)}.linear.svg`), pair.linear);
      }
    }

    exec.run('git', ['add', '-A'], { cwd: tmp });
    exec.run('git', ['commit', '-m', `chart: graviton perf trend ${stamp}`], { cwd: tmp });
    push_with_retry(exec, tmp);

    const sha  = exec.run('git', ['rev-parse', 'HEAD'], { cwd: tmp, dryRunStdout: '<sha>' });
    const base = `https://raw.githubusercontent.com/${DEFAULTS.ghRepo}/${sha}/charts/${stamp}`;
    const urls = new Map([...panels.keys()].map((op) => [
      op,
      { log    : `${base}/${chart_slug(op)}.svg`,
        linear : `${base}/${chart_slug(op)}.linear.svg` }
    ]));
    return { sha, urls };
  } finally {
    if (!exec.dryRun) { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ } }
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 *  CLI entry: collect runs, write the composite SVG + data JSON to the out
 *  directory, and in `--comment` mode publish panels and post the issue
 *  comment.  Exits 0 with a warning (keeping any existing artifacts) when
 *  perf_results is unreachable, so offline builds never fail on this step.
 *
 *  @param argv Full `process.argv`.
 *  @returns Process exit code.
 */
function main(argv) {
  let opts;
  try {
    opts = parse_args(argv.slice(2));
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.stderr.write('usage: node make_perf_chart.cjs [--out <dir>] [--comment] [--issue <n>] [--dry-run]\n');
    return 1;
  }

  const exec     = make_executor(opts.dryRun);
  const repo_dir = path.join(__dirname, '..', '..');
  const runs     = collect_runs(exec, repo_dir);

  if (runs === null || (runs.length === 0 && !exec.dryRun)) {
    process.stdout.write('perf_chart: perf_results unreachable or empty; keeping existing artifacts\n');
    return 0;
  }

  const stamp             = data_stamp(runs);
  const { svg, panels }   = render_chart(runs);

  if (!exec.dryRun) {
    fs.mkdirSync(opts.outDir, { recursive: true });
    fs.writeFileSync(path.join(opts.outDir, 'perf_chart.svg'), svg);
    fs.writeFileSync(path.join(opts.outDir, 'perf_data.json'), JSON.stringify(build_data_json(runs), null, 2) + '\n');
  }
  process.stdout.write(`perf_chart: ${runs.length} runs, ${panels.size} panels, data through ${stamp} -> ${opts.outDir}\n`);

  if (opts.comment) {
    const { sha, urls } = publish_charts(exec, panels, stamp);
    const body          = build_comment_body(urls, runs, sha);
    const body_path     = exec.dryRun ? '<body>' : path.join(os.tmpdir(), `jssm-perf-comment-${stamp}.md`);
    if (!exec.dryRun) { fs.writeFileSync(body_path, body); }
    try {
      const posted = exec.run('gh', ['issue', 'comment', String(opts.issue), '--repo', DEFAULTS.ghRepo, '--body-file', String(body_path)], { dryRunStdout: '<comment-url>' });
      process.stdout.write(`perf_chart: commented on #${opts.issue}: ${posted}\n`);
    } finally {
      if (!exec.dryRun) { try { fs.rmSync(body_path, { force: true }); } catch { /* best effort */ } }
    }
  }

  return 0;
}

module.exports = {
  semver_compare, compare_runs, key_of, pivot_series, bundle_size_series, data_stamp, summary_line,
  panel_svg, render_chart, build_data_json, build_comment_body, chart_slug, format_tick,
  parse_args, make_executor, collect_runs, publish_charts, push_with_retry,
  DEFAULTS, OPERATIONS
};

if (require.main === module) {
  process.exit(main(process.argv));
}
