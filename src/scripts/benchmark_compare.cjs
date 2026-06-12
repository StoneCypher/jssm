'use strict';

/**
 *  Benchmark comparison generator.  Reads historic benchmark JSON envelopes
 *  (as written by `src/buildjs/benchmark_scaling.cjs`) and emits the markdown
 *  delta tables used in the #636 perf-tracking comments, removing the
 *  hand-transcription step from each writeup.
 *
 *  The original #636 baseline ({@link DEFAULT_BASELINE}, jssm 5.128.0) is
 *  *always* prepended as the leading `original` column, so a writeup can never
 *  silently drop the vs-baseline comparison.  Positional args are therefore
 *  just the step(s) layered on top of it:
 *
 *    node benchmark_compare.cjs <current.json>
 *      -> original | current | vs orig
 *    node benchmark_compare.cjs <previous.json> <current.json>
 *      -> original | previous | current | vs prev | vs orig
 *
 *  `--baseline <path>` swaps in a different original; `--no-baseline` drops it
 *  (then you supply the original yourself as the first positional — the old
 *  fully-explicit form).  Output is markdown on stdout.
 */

const fs   = require('fs');
const path = require('path');

// The canonical #636 original baseline (jssm 5.128.0), always prepended unless
// overridden with --baseline or suppressed with --no-baseline.  Resolved from
// this file's location so it works regardless of the caller's cwd.
const DEFAULT_BASELINE = path.join(__dirname, '..', 'historic_benchmarks', 'benchmark_2026-05-26.json');

// Tables are emitted in this order; operations absent from the current file
// are skipped.
const OPERATION_ORDER = ['transition()', 'edges_between()', 'has_state()', 'construct()'];

/**
 *  Load one benchmark envelope from disk.
 *
 *  @param path Filesystem path to a `scaling.json`-shaped file.
 *  @returns `{ version, date, opsByName }` where `opsByName` maps each
 *           `"<shape> <operation>"` name to its ops/sec number.
 *
 *  @example
 *  loadBenchmark('src/historic_benchmarks/benchmark_2026-05-26.json').version
 *  // => '5.128.0'
 */
function loadBenchmark(path) {
  const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
  const opsByName = new Map();
  for (const r of raw.results) { opsByName.set(r.name, r.ops); }
  return { version: raw.version, date: raw.date, opsByName };
}

/**
 *  Pivot a flat ops map into operation -> shape -> ops by splitting each
 *  result name at its final space (`"chain-200 transition()"` -> op
 *  `"transition()"`, shape `"chain-200"`).
 *
 *  @param opsByName Map of `"<shape> <operation>"` to ops/sec.
 *  @returns Map of operation to (Map of shape to ops/sec).
 */
function pivot(opsByName) {
  const ops = new Map();
  for (const [name, value] of opsByName) {
    const i     = name.lastIndexOf(' ');
    const shape = name.slice(0, i);
    const op    = name.slice(i + 1);
    if (!ops.has(op)) { ops.set(op, new Map()); }
    ops.get(op).set(shape, value);
  }
  return ops;
}

/**
 *  Speedup factor of `current` over `reference`.
 *
 *  @param current   Current ops/sec, or null/undefined if the shape is absent.
 *  @param reference Reference ops/sec, or null/undefined if absent.
 *  @returns `current / reference`, or `null` when either side is missing or
 *           the reference is zero (avoids divide-by-zero / NaN in the table).
 *
 *  @example factor(300, 150) // => 2
 *  @example factor(5, 0)     // => null
 */
function factor(current, reference) {
  if (current == null || reference == null || reference === 0) { return null; }
  return current / reference;
}

/**
 *  Format an ops/sec value with thousands separators, or `—` when null.
 *
 *  @example formatOps(1234567) // => '1,234,567'
 */
function formatOps(n) {
  if (n == null) { return '—'; }
  return n.toLocaleString('en-US');
}

/**
 *  Format a speedup factor as `X.XX×`, or `—` when null.
 *
 *  @example formatFactor(3) // => '3.00×'
 */
function formatFactor(f) {
  if (f == null) { return '—'; }
  return f.toFixed(2) + '×';
}

/**
 *  Build the comparison structure from 2 or 3 loaded benchmarks.  The first
 *  is the original baseline, the last is current; a middle entry (3-file
 *  form) is the previous step.
 *
 *  Rows track the shapes present in the *current* file: a shape that exists
 *  only in an earlier file is dropped (the symmetric dual of skipping
 *  operations absent from the current file).  Cells for an earlier file that
 *  lacks a current shape render as `—` via {@link formatOps} / {@link formatFactor}.
 *
 *  @param benchmarks Array of `{ version, date, opsByName }`, length 2 or 3.
 *  @returns `{ hasPrevious, original, previous, current, operations }`, where
 *           `operations` is an ordered list of `{ operation, rows }` and each
 *           row is `{ shape, original, previous?, current, vsPrev?, vsOrig }`.
 *  @throws Error if `benchmarks` is not length 2 or 3.
 */
function buildComparison(benchmarks) {
  if (benchmarks.length < 2 || benchmarks.length > 3) {
    throw new Error(`expected 2 or 3 benchmarks, got ${benchmarks.length}`);
  }
  const hasPrevious = benchmarks.length === 3;
  const original    = benchmarks[0];
  const current     = benchmarks[benchmarks.length - 1];
  const previous    = hasPrevious ? benchmarks[1] : null;

  const origPivot = pivot(original.opsByName);
  const currPivot = pivot(current.opsByName);
  const prevPivot = previous ? pivot(previous.opsByName) : null;

  const getOp = (p, op, shape) => {
    const byShape = p.get(op);
    if (byShape === undefined) { return null; }
    const v = byShape.get(shape);
    return v === undefined ? null : v;
  };

  const operations = [];
  for (const op of OPERATION_ORDER) {
    const currOps = currPivot.get(op);
    if (currOps === undefined) { continue; }
    const rows = [];
    for (const [shape, currentVal] of currOps) {
      const originalVal = getOp(origPivot, op, shape);
      const previousVal = prevPivot ? getOp(prevPivot, op, shape) : null;
      rows.push({
        shape,
        original : originalVal,
        previous : hasPrevious ? previousVal : undefined,
        current  : currentVal,
        vsPrev   : hasPrevious ? factor(currentVal, previousVal) : undefined,
        vsOrig   : factor(currentVal, originalVal)
      });
    }
    operations.push({ operation: op, rows });
  }
  return { hasPrevious, original, previous, current, operations };
}

/**
 *  Render a comparison (from {@link buildComparison}) to markdown: a header
 *  naming each input's version/date, then one table per operation.
 *
 *  @param comparison The structure returned by {@link buildComparison}.
 *  @returns A markdown string suitable for pasting into a #636 comment.
 *  @see buildComparison
 */
function renderMarkdown(comparison) {
  const { hasPrevious, original, previous, current, operations } = comparison;
  const lines = [];

  lines.push('## Comparison');
  lines.push('');
  lines.push(`- original: ${original.version} (${original.date})`);
  if (hasPrevious) { lines.push(`- previous: ${previous.version} (${previous.date})`); }
  lines.push(`- current: ${current.version} (${current.date})`);
  lines.push('');

  for (const { operation, rows } of operations) {
    lines.push(`### \`${operation}\` ops/sec`);
    lines.push('');
    if (hasPrevious) {
      lines.push('| shape | original | previous | current | vs prev | vs orig |');
      lines.push('|---|---:|---:|---:|---:|---:|');
      for (const r of rows) {
        lines.push(`| ${r.shape} | ${formatOps(r.original)} | ${formatOps(r.previous)} | ${formatOps(r.current)} | ${formatFactor(r.vsPrev)} | ${formatFactor(r.vsOrig)} |`);
      }
    } else {
      lines.push('| shape | original | current | vs orig |');
      lines.push('|---|---:|---:|---:|');
      for (const r of rows) {
        lines.push(`| ${r.shape} | ${formatOps(r.original)} | ${formatOps(r.current)} | ${formatFactor(r.vsOrig)} |`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

/**
 *  Resolve CLI args into the ordered list of benchmark file paths to compare.
 *  The #636 original baseline is prepended automatically (so it can't be
 *  forgotten) unless `--no-baseline` is given; `--baseline <path>` swaps in a
 *  different original.  Remaining positionals are the step(s) layered on top:
 *  one (`current`) or two (`previous` then `current`).
 *
 *  @param args The CLI args *after* `node script` (i.e. `process.argv.slice(2)`).
 *  @param defaultBaseline Path used as the original when neither `--no-baseline`
 *         nor `--baseline` is supplied.  Defaults to {@link DEFAULT_BASELINE}.
 *  @returns Ordered file paths — length 2 (`[original, current]`) or 3
 *           (`[original, previous, current]`) — ready for {@link loadBenchmark}.
 *  @throws Error if `--baseline` is missing its path, an unknown `--flag`
 *          appears, or the resolved list isn't 2 or 3 files.
 *
 *  @example resolveInputPaths(['cur.json'], 'base.json')
 *  // => ['base.json', 'cur.json']
 *  @example resolveInputPaths(['--no-baseline', 'orig.json', 'cur.json'])
 *  // => ['orig.json', 'cur.json']
 */
function resolveInputPaths(args, defaultBaseline = DEFAULT_BASELINE) {
  let noBaseline    = false;
  let baseline      = defaultBaseline;
  const positionals = [];

  for (let i = 0; i < args.length; ++i) {
    const a = args[i];
    if (a === '--no-baseline') {
      noBaseline = true;
    } else if (a === '--baseline') {
      baseline = args[++i];
      if (baseline === undefined) { throw new Error('--baseline requires a path argument'); }
    } else if (a.startsWith('--')) {
      throw new Error(`unknown flag: ${a}`);
    } else {
      positionals.push(a);
    }
  }

  const list = noBaseline ? positionals.slice() : [baseline, ...positionals];

  if (list.length < 2 || list.length > 3) {
    throw new Error(
      `expected 1-2 step files on top of the baseline (or 2-3 with --no-baseline); got ${list.length} total`
    );
  }
  return list;
}

/**
 *  CLI entry point: resolve args (auto-including the #636 baseline), load the
 *  files, and print the rendered markdown.  Exits non-zero with the error and a
 *  usage line on bad arguments.
 */
function main(argv) {
  let paths;
  try {
    paths = resolveInputPaths(argv.slice(2));
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.stderr.write('usage: node benchmark_compare.cjs [--no-baseline] [--baseline <path>] [previous.json] <current.json>\n');
    process.exit(1);
    return;
  }
  const benchmarks = paths.map(loadBenchmark);
  process.stdout.write(renderMarkdown(buildComparison(benchmarks)) + '\n');
}

module.exports = { loadBenchmark, pivot, factor, formatOps, formatFactor, buildComparison, renderMarkdown, resolveInputPaths, DEFAULT_BASELINE };

if (require.main === module) { main(process.argv); }
