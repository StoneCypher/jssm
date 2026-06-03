'use strict';

/**
 *  Background launcher for the Graviton perf runner.  A full run takes several
 *  minutes (boot + build + benchmark) and must survive the launching shell, so
 *  `npm run graviton_perf -- <pr-number> [flags]` shells here instead of running
 *  {@link module:graviton_perf} inline.  This launcher spawns the runner
 *  *detached*, redirects its output to a timestamped log file under `build/`,
 *  prints the log path plus a follow command, and exits immediately — which is
 *  the cross-platform (incl. Windows) way to "run in the background" without a
 *  trailing `&` the npm-on-Windows shell won't honor.
 *
 *  Invocation:
 *
 *      npm run graviton_perf -- <pr-number> [flags]
 *
 *  Everything after `--` is forwarded verbatim to `graviton_perf.cjs`, e.g.:
 *
 *      npm run graviton_perf -- 677
 *      npm run graviton_perf -- 677 --mode deep
 *      npm run graviton_perf -- 677 --dry-run        # foreground-style dry-run still logs to file
 *
 *  Use `--dry-run` to confirm what *would* run without provisioning anything.
 *
 *  @see src/scripts/graviton_perf.cjs
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const cp   = require('child_process');

/**
 *  Build the absolute path to the log file for a launch, stamped with the UTC
 *  time and (when present) the PR number so concurrent launches don't collide.
 *
 *  @param buildDir Absolute path to the repo's `build/` directory.
 *  @param prNumber The PR number (first non-flag arg), or `unknown`.
 *  @param now Injectable Date for tests; defaults to now.
 *  @returns Absolute log path, e.g. `<build>/graviton_perf_pr677_20260602-143012.log`.
 *
 *  @example
 *  logPathFor('/r/build', '677', new Date('2026-06-02T14:30:12Z'))
 *  // => '/r/build/graviton_perf_pr677_20260602-143012.log'
 */
function logPathFor(buildDir, prNumber, now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const stamp =
    `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}-` +
    `${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}`;
  return path.join(buildDir, `graviton_perf_pr${prNumber}_${stamp}.log`);
}

/**
 *  Extract the first non-flag positional (the PR number) from forwarded args,
 *  for naming the log file.  Returns `'unknown'` when there is none.
 *
 *  @param args The args forwarded to the runner (`process.argv.slice(2)`).
 *  @returns The PR number string, or `'unknown'`.
 *
 *  @example firstPositional(['677', '--mode', 'deep']) // => '677'
 *  @example firstPositional(['--cleanup-only'])        // => 'unknown'
 */
function firstPositional(args) {
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (!a.startsWith('--')) { return a; }
    // Skip a value for flags that take one.
    if (FLAGS_WITH_VALUE.has(a)) { i += 2; } else { i += 1; }
  }
  return 'unknown';
}

/** Flags that consume the following token as their value (for positional scanning). */
const FLAGS_WITH_VALUE = new Set([
  '--instance-type', '--mode', '--region', '--subnet-id', '--my-ip',
  '--run-id', '--shutdown-minutes'
]);

/**
 *  Launch the runner detached, log to `build/`, and print follow instructions.
 *
 *  @param argv Full `process.argv`.
 *  @returns Process exit code (0 on successful spawn).
 */
function main(argv) {
  const forwarded = argv.slice(2);
  const repoRoot  = path.resolve(__dirname, '..', '..');
  const buildDir  = path.join(repoRoot, 'build');
  fs.mkdirSync(buildDir, { recursive: true });

  const prNumber = firstPositional(forwarded);
  const logPath  = logPathFor(buildDir, prNumber);
  const runner   = path.join(__dirname, 'graviton_perf.cjs');

  const out = fs.openSync(logPath, 'a');
  const err = fs.openSync(logPath, 'a');

  const child = cp.spawn(process.execPath, [runner, ...forwarded], {
    cwd      : repoRoot,
    detached : true,
    stdio    : ['ignore', out, err]
  });
  child.unref();

  const follow = os.platform() === 'win32'
    ? `Get-Content -Wait "${logPath}"`
    : `tail -f "${logPath}"`;

  process.stdout.write(
    `graviton_perf launched in the background (pid ${child.pid}).\n` +
    `  log:    ${logPath}\n` +
    `  follow: ${follow}\n`
  );
  return 0;
}

module.exports = { logPathFor, firstPositional, FLAGS_WITH_VALUE, main };

if (require.main === module) {
  process.exit(main(process.argv));
}
