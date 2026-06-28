'use strict';

/**
 *  Gap finder for the graviton perf trail.  Diffs the repo's released tags
 *  against what's already on the `perf_results` branch and prints the release
 *  tags (at/above a `--since` floor) that still lack a result for a given
 *  instance type — so a uniform backfill can be filled newest-gaps-first, on
 *  whatever CI/AWS budget is available, instead of an all-or-nothing re-run.
 *
 *  Pure logic ({@link semverCompare}, {@link missingReleases}) is unit-tested
 *  without git; `main` wires it to `git tag` + the `perf_results` listing.
 *
 *  Usage:
 *      node src/scripts/fill_perf_gaps.cjs [--since 5.100.0] [--instance-type c8g.medium]
 *
 *  @see src/scripts/graviton_perf.cjs (runs one tag: --release <t> --commit <sha> --harness-from main)
 */

const { execFileSync } = require('child_process');

/**
 *  Numeric-by-part version comparison, so `5.143.10` sorts after `5.143.9`.
 *
 *  @param a Version like `5.143.10`.
 *  @param b Version to compare against.
 *  @returns Negative / zero / positive in the usual comparator convention.
 *
 *  @example semverCompare('5.100.0', '5.99.0') // => positive
 */
function semverCompare(a, b) {
  const pa = a.split('.').map((n) => parseInt(n, 10));
  const pb = b.split('.').map((n) => parseInt(n, 10));
  for (let i = 0; i < 3; ++i) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) { return d; }
  }
  return 0;
}

/**
 *  Released tags at/above a floor that have no `<instanceType>/release-<tag>/`
 *  entry on the perf_results branch, sorted ascending.
 *
 *  @param opts `{ tags, existing, since, instanceType }` — `tags` is every
 *         release tag, `existing` is the perf_results path listing.
 *  @returns The missing tags, ascending by version.
 *
 *  @example missingReleases({ tags: ['5.100.0'], existing: [], since: '5.100.0', instanceType: 'c8g.medium' }) // => ['5.100.0']
 */
function missingReleases({ tags, existing, since, instanceType }) {
  const have = new Set();
  const re   = new RegExp(`^${instanceType}/release-([\\w.+-]+)/`);
  for (const p of existing) {
    const m = p.match(re);
    if (m) { have.add(m[1]); }
  }
  return tags
    .filter((t) => semverCompare(t, since) >= 0 && !have.has(t))
    .sort(semverCompare);
}

/**
 *  CLI entry: gather release tags + the perf_results listing from git and print
 *  the gaps.  Returns the process exit code.
 *
 *  @param argv `process.argv`.
 *  @returns 0.
 */
function main(argv) {
  const args         = argv.slice(2);
  const since        = valueOf(args, '--since') || '5.100.0';
  const instanceType = valueOf(args, '--instance-type') || 'c8g.medium';

  const tags = git(['tag', '--list']).split('\n').filter((t) => /^\d+\.\d+\.\d+$/.test(t));
  git(['fetch', 'origin', 'perf_results'], true);
  const existing = git(['ls-tree', '-r', 'FETCH_HEAD', '--name-only'], true).split('\n').filter(Boolean);

  const gaps = missingReleases({ tags, existing, since, instanceType });
  process.stdout.write(`perf gaps for ${instanceType} since ${since}: ${gaps.length} missing\n`);
  for (const t of gaps) { process.stdout.write(`${t}\n`); }
  return 0;
}

function valueOf(args, flag) {
  const i = args.indexOf(flag);
  return (i >= 0 && i + 1 < args.length) ? args[i + 1] : undefined;
}

function git(cmdArgs, allowFail) {
  try { return execFileSync('git', cmdArgs, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }); }
  catch (e) { if (allowFail) { return ''; } throw e; }
}

module.exports = { semverCompare, missingReleases, main };

if (require.main === module) { process.exit(main(process.argv)); }
