'use strict';

/**
 *  Graviton perf-trend chart generator (#748).  Reads every measured run from
 *  the `perf_results` data branch (`c7g.medium/pr-N/scaling.json` and
 *  `c7g.medium/release-V/scaling.json`), and renders one log-scale SVG panel
 *  per benchmarked operation — one line per machine shape, PRs ordered by
 *  number then releases by semver — plus a machine-readable data JSON.
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
 *        perf_results): additionally commits the per-operation SVGs to the
 *        perf_results branch under charts/<stamp>/ and posts them to the
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
  instanceType : 'c7g.medium',
  issue        : 636,
  ghRepo       : 'StoneCypher/jssm',
  repoUrl      : 'https://github.com/StoneCypher/jssm.git',
  outDir       : path.join(__dirname, '..', 'generated_docs')
});

/** Operations charted, in panel order; absent operations are skipped. */
const OPERATIONS = Object.freeze(['construct()', 'transition()', 'edges_between()', 'has_state()']);

/** Paul Tol-ish categorical palette; cycles when a panel has more shapes. */
const PALETTE = Object.freeze([
  '#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#BBBBBB',
  '#222255', '#225555', '#552222', '#555522', '#8855AA'
]);

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
 *  Render one operation's panel as a standalone SVG: log-scale ops/sec, one
 *  line per machine shape, x ticks per run (releases angled and tinted), a
 *  legend, and an opaque background (panels are embedded in GitHub comments,
 *  where a transparent canvas is illegible in dark mode).
 *
 *  @param op Operation name, e.g. `construct()`.
 *  @param by_shape Map of shape to ordered `{ key, ops }` points.
 *  @param keys Every run key, in x order.
 *  @param width Panel width in px.
 *  @param height Panel height in px.
 *  @returns A self-contained `<svg>` string.
 */
function panel_svg(op, by_shape, keys, width, height) {
  const m  = { t: 34, r: 150, b: 48, l: 64 };
  const iw = width - m.l - m.r, ih = height - m.t - m.b;

  const x = (key) => m.l + (keys.indexOf(key) / Math.max(1, keys.length - 1)) * iw;

  let lo = Infinity, hi = -Infinity;
  for (const pts of by_shape.values()) {
    for (const p of pts) {
      if (p.ops > 0) { lo = Math.min(lo, p.ops); hi = Math.max(hi, p.ops); }
    }
  }
  const ylo = Math.log10(lo), yhi = Math.log10(hi);
  const y   = (ops) => m.t + ih - ((Math.log10(ops) - ylo) / Math.max(1e-9, yhi - ylo)) * ih;

  const els = [];
  els.push(`<rect width="${width}" height="${height}" fill="#ffffff"/>`);
  els.push(`<text x="${m.l}" y="20" font-size="15" font-weight="bold" fill="#333">${op} — ops/sec (log scale) by PR / release, ${DEFAULTS.instanceType}</text>`);

  for (let d = Math.ceil(ylo); d <= Math.floor(yhi); d++) {
    const yy = y(Math.pow(10, d));
    els.push(`<line x1="${m.l}" y1="${yy}" x2="${m.l + iw}" y2="${yy}" stroke="#eee"/>`);
    els.push(`<text x="${m.l - 6}" y="${yy + 4}" font-size="10" text-anchor="end" fill="#888">1e${d}</text>`);
  }

  for (const [i, key] of keys.entries()) {
    if (i % 2 === 0 || keys.length < 14) {
      const is_release = key.startsWith('v');
      const xx         = x(key).toFixed(1);
      const yy         = m.t + ih + 16;
      els.push(is_release
        ? `<text x="${xx}" y="${yy}" font-size="9" text-anchor="end" fill="#a40" transform="rotate(-35 ${xx} ${yy})">${key}</text>`
        : `<text x="${xx}" y="${yy}" font-size="9" text-anchor="middle" fill="#888">${key}</text>`);
    }
  }

  let ci = 0, legend_y = m.t;
  for (const shape of by_shape.keys()) {
    const color = PALETTE[ci++ % PALETTE.length];
    const pts   = by_shape.get(shape).filter((p) => p.ops > 0);
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
 *  Render every operation panel stacked into one tall composite SVG with a
 *  title block — the `src/generated_docs/perf_chart.svg` artifact.
 *
 *  @param runs Sorted runs.
 *  @param width Panel width in px.
 *  @param panel_height Height of each operation panel in px.
 *  @returns `{ svg, panels }` — the composite document and the individual
 *           panel SVGs keyed by operation (the comment flow embeds those).
 */
function render_chart(runs, width = 960, panel_height = 372) {
  const series = pivot_series(runs);
  const keys   = runs.map(key_of);

  const panels = new Map();
  for (const op of OPERATIONS) {
    if (series.has(op)) { panels.set(op, panel_svg(op, series.get(op), keys, width, panel_height)); }
  }

  const header_h = 56;
  const total_h  = header_h + panels.size * panel_height;
  const parts    = [];
  parts.push(`<svg width="${width}" height="${total_h}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,sans-serif">`);
  parts.push(`<rect width="${width}" height="${total_h}" fill="#ffffff"/>`);
  parts.push(`<text x="16" y="24" font-size="17" font-weight="bold" fill="#1a1a1a">jssm performance trend — graviton runners (perf_results branch)</text>`);
  parts.push(`<text x="16" y="44" font-size="11" fill="#666">${summary_line(runs)} Source: ${DEFAULTS.ghRepo} branch perf_results, instance ${DEFAULTS.instanceType}. Data through ${data_stamp(runs)}.</text>`);

  let oy = header_h;
  for (const svg of panels.values()) {
    // re-host each standalone panel at its vertical offset
    parts.push(`<g transform="translate(0 ${oy})">${svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>`);
    oy += panel_height;
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
      results : r.results
    }))
  };
}

/**
 *  Build the issue-comment markdown: summary, one embedded chart per
 *  operation, provenance footer naming the publishing commit.
 *
 *  @param urls Map of operation name -> SHA-pinned image URL.
 *  @param runs Sorted runs (for the summary line).
 *  @param sha The perf_results commit the images are pinned to.
 *  @returns Markdown for `gh issue comment --body-file`.
 */
function build_comment_body(urls, runs, sha) {
  const lines = [];
  lines.push(`## Graviton perf trend — ${DEFAULTS.instanceType}`);
  lines.push('');
  lines.push(`${summary_line(runs)} Log-scale ops/sec, one line per machine shape.`);
  lines.push('');
  for (const [op, url] of urls) {
    lines.push(`![${op} ops/sec trend](${url})`);
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
      results : data.results
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
 *  @param panels Map of operation name -> SVG markup.
 *  @param stamp The data stamp naming this chart set's directory.
 *  @returns `{ sha, urls }` — `urls` maps operation to its pinned raw URL.
 */
function publish_charts(exec, panels, stamp) {
  const tmp = exec.dryRun ? '<tmp>' : fs.mkdtempSync(path.join(os.tmpdir(), 'jssm-perf-charts-'));
  try {
    exec.run('git', ['clone', '--depth', '1', '--branch', 'perf_results', DEFAULTS.repoUrl, String(tmp)]);

    if (!exec.dryRun) {
      const dest = path.join(tmp, 'charts', stamp);
      fs.mkdirSync(dest, { recursive: true });
      for (const [op, svg] of panels) {
        fs.writeFileSync(path.join(dest, `${chart_slug(op)}.svg`), svg);
      }
    }

    exec.run('git', ['add', '-A'], { cwd: tmp });
    exec.run('git', ['commit', '-m', `chart: graviton perf trend ${stamp}`], { cwd: tmp });
    push_with_retry(exec, tmp);

    const sha  = exec.run('git', ['rev-parse', 'HEAD'], { cwd: tmp, dryRunStdout: '<sha>' });
    const urls = new Map([...panels.keys()].map((op) => [
      op,
      `https://raw.githubusercontent.com/${DEFAULTS.ghRepo}/${sha}/charts/${stamp}/${chart_slug(op)}.svg`
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
  semver_compare, compare_runs, key_of, pivot_series, data_stamp, summary_line,
  panel_svg, render_chart, build_data_json, build_comment_body, chart_slug,
  parse_args, make_executor, collect_runs, publish_charts, push_with_retry,
  DEFAULTS, OPERATIONS
};

if (require.main === module) {
  process.exit(main(process.argv));
}
