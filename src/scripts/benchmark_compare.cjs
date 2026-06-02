'use strict';

/**
 *  Benchmark comparison generator.  Reads two or three historic benchmark
 *  JSON envelopes (as written by `src/buildjs/benchmark_scaling.cjs`) and
 *  emits the markdown delta tables used in the #636 perf-tracking comments,
 *  removing the hand-transcription step from each writeup.
 *
 *  CLI:
 *    node src/scripts/benchmark_compare.cjs <original.json> <current.json>
 *    node src/scripts/benchmark_compare.cjs <original.json> <previous.json> <current.json>
 *
 *  Two files -> `original`, `current`, `vs orig`.  Three files -> adds
 *  `previous` and `vs prev`.  Output is markdown on stdout.
 */

const fs = require('fs');

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
 *  CLI entry point: parse argv, load the files, print the rendered markdown.
 *  Exits non-zero with a usage message on a wrong argument count.
 */
function main(argv) {
  const paths = argv.slice(2);
  if (paths.length < 2 || paths.length > 3) {
    process.stderr.write('usage: node benchmark_compare.cjs <original.json> [previous.json] <current.json>\n');
    process.exit(1);
    return;
  }
  const benchmarks = paths.map(loadBenchmark);
  process.stdout.write(renderMarkdown(buildComparison(benchmarks)) + '\n');
}

module.exports = { loadBenchmark, pivot, factor, formatOps, formatFactor, buildComparison, renderMarkdown };

if (require.main === module) { main(process.argv); }
