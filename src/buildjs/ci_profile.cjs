/**
 * CI phase profiler.
 *
 * Times each of the major phases that `nodejs.yml` runs and emits a
 * JSON report into `benchmark/results/`.  Use the output to decide
 * where CI wall-clock actually goes — `npm install`, the build,
 * spec tests, stochastic tests, etc. — so that optimization effort
 * (caching, matrix pruning, switching test runners) targets the
 * actual bottleneck.
 *
 * Phases are invoked as separate `npm run ...` subprocesses; their
 * exit codes are captured but their stdout/stderr are dropped to
 * avoid the report dragging in test logs.  Stderr is re-emitted on
 * failure so you can see why a phase exited non-zero.
 *
 * Usage:
 *   node src/buildjs/ci_profile.cjs                           # all default phases, 1 run each
 *   node src/buildjs/ci_profile.cjs --repeat 3                # 3 runs each, report median/mean
 *   node src/buildjs/ci_profile.cjs --phases vitest-spec,vitest-stoch
 *   node src/buildjs/ci_profile.cjs --clean                   # rm -rf node_modules before install
 *   node src/buildjs/ci_profile.cjs --help
 *
 * Example output (truncated):
 *
 *   === Summary (median ms, sorted by share of total) ===
 *     install               87,432 ms    62.1 %
 *     make                  31,508 ms    22.4 %
 *     vitest-spec             18,201 ms    12.9 %
 *     vitest-stoch               884 ms     0.6 %
 *     ...
 *   → benchmark/results/ci-profile-2026-05-12T18-04-12-417Z.json
 *
 *   Failure modes:
 *     - Any phase exits non-zero: stderr is printed; the run for
 *       that phase is recorded with the non-zero exit code; the
 *       script continues to the next phase.
 *     - Invalid --phases name: exits 2 with the unknown name.
 *     - Invalid --repeat (non-integer / <1): exits 2.
 */

const fs   = require('fs');
const path = require('path');
const cp   = require('child_process');
const os   = require('os');

const ROOT    = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'benchmark', 'results');
const PKG     = require(path.join(ROOT, 'package.json'));

/**
 * Phase catalogue.  Each entry names an npm script and a short
 * description used in the summary table.  Keep this in sync with
 * what `nodejs.yml` actually runs so the profile reflects real CI.
 */
const PHASES = {
  install:             { description: 'npm install (full dependency resolution)',           cmd: 'npm install'           },
  make:                { description: 'npm run make (clean, peg, tsc, bundle, minify)',     cmd: 'npm run make'          },
  vet:                 { description: 'npm run vet (eslint + audit)',                       cmd: 'npm run vet'           },
  'vitest-spec':         { description: 'npm run vitest-spec (main test suite)',                cmd: 'npm run vitest-spec'     },
  'vitest-stoch':        { description: 'npm run vitest-stoch (stochastic / property suite)',   cmd: 'npm run vitest-stoch'    },
  'vitest-unicode-atom': { description: 'npm run vitest-unicode-atom (one unicode pass)',       cmd: 'npm run vitest-unicode-atom' },
  'ci_build':          { description: 'npm run ci_build (umbrella: vet + test)',            cmd: 'npm run ci_build'      },
};

const DEFAULT_PHASES = ['install', 'make', 'vet', 'vitest-spec', 'vitest-stoch'];



/**
 * Parse command-line arguments into a plain options object.
 *
 * @param   {string[]} argv  Typically `process.argv`.
 * @returns {{ repeat: number, phases: string[], clean: boolean }}
 *
 * @example
 *   parse_args(['node','ci_profile.cjs','--repeat','3','--phases','install,vet'])
 *   // → { repeat: 3, phases: ['install','vet'], clean: false }
 *
 * Exits the process with code 2 on unknown arg, malformed --repeat,
 * or unrecognised phase name.
 */
function parse_args(argv) {

  const args = { repeat: 1, phases: DEFAULT_PHASES.slice(), clean: false };

  for (let i = 2; i < argv.length; ++i) {

    const a = argv[i];

    if (a === '--help')   { print_help(); process.exit(0); }
    if (a === '--clean')  { args.clean = true; continue; }

    if (a === '--repeat') {
      const n = parseInt(argv[++i], 10);
      if (!Number.isInteger(n) || n < 1) { console.error('--repeat must be a positive integer'); process.exit(2); }
      args.repeat = n;
      continue;
    }

    if (a === '--phases') {
      const list = String(argv[++i] || '').split(',').map(s => s.trim()).filter(Boolean);
      for (const p of list) if (!PHASES[p]) { console.error(`unknown phase: ${p}`); process.exit(2); }
      args.phases = list;
      continue;
    }

    console.error(`unknown arg: ${a}  (try --help)`);
    process.exit(2);

  }

  return args;

}



function print_help() {

  console.log('Usage: node src/buildjs/ci_profile.cjs [--repeat N] [--phases p1,p2,...] [--clean] [--help]');
  console.log('');
  console.log('Known phases (default runs the first five):');
  for (const [name, def] of Object.entries(PHASES)) {
    const tag = DEFAULT_PHASES.includes(name) ? '*' : ' ';
    console.log(`  ${tag} ${name.padEnd(22)} ${def.description}`);
  }
  console.log('');
  console.log('Flags:');
  console.log('  --repeat N           Run each phase N times.  Median, min, max, mean reported.');
  console.log('  --phases a,b,c       Comma-separated list of phase names to run (overrides default).');
  console.log('  --clean              Remove node_modules before starting.  First install phase becomes a cold install.');
  console.log('  --help               Print this message.');

}



/**
 * Time a function in milliseconds using a monotonic clock.
 *
 * @param   {() => void} fn  Synchronous function to time.
 * @returns {number}         Elapsed milliseconds, sub-millisecond precision.
 */
function time_ms(fn) {

  const start = process.hrtime.bigint();
  fn();
  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6;

}



/**
 * Run a shell command and capture exit info without streaming output.
 *
 * Uses `shell: true` so platform-native shells resolve `npm` to
 * `npm.cmd` on Windows and `npm` on POSIX.  Output is captured into
 * memory but only its length is returned; on non-zero exit, stderr
 * is printed so the developer can see the failure.
 *
 * @param   {string} cmd  A shell command line (`npm run vitest-spec` etc.).
 * @returns {{ exit: number, stdout_len: number, stderr_len: number }}
 */
function run(cmd) {

  const result = cp.spawnSync(cmd, [], {
    shell: true,
    cwd:   ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const exit = result.status === null ? -1 : result.status;
  if (exit !== 0) {
    console.error(`    ⚠ command failed (exit ${exit}); stderr follows:`);
    process.stderr.write(result.stderr || '');
  }

  return {
    exit,
    stdout_len: (result.stdout || '').length,
    stderr_len: (result.stderr || '').length,
  };

}



/**
 * Summary statistics for a series of timing samples.
 *
 * @param   {number[]} samples  Wall-clock millisecond values.
 * @returns {{ n: number, min: number, max: number, median: number, mean: number }}
 *
 * Median uses a simple middle-index pick (lower of the two middles
 * for even-length arrays) — sufficient precision for wall-clock CI
 * phase timings where samples are coarse-grained.
 */
function stats(samples) {

  const sorted = samples.slice().sort((a, b) => a - b);
  const sum    = sorted.reduce((s, n) => s + n, 0);

  return {
    n:      sorted.length,
    min:    sorted[0],
    max:    sorted[sorted.length - 1],
    median: sorted[Math.floor((sorted.length - 1) / 2)],
    mean:   sum / sorted.length,
  };

}



function main() {

  const args = parse_args(process.argv);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (args.clean) {
    const nm = path.join(ROOT, 'node_modules');
    if (fs.existsSync(nm)) {
      console.log(`removing ${path.relative(ROOT, nm)} ...`);
      fs.rmSync(nm, { recursive: true, force: true });
    }
  }

  const report = {
    name:      'CI phase profile',
    date:      new Date().toISOString(),
    version:   PKG.version,
    node:      process.version,
    platform:  process.platform,
    arch:      process.arch,
    cpu:       os.cpus()[0]?.model || 'unknown',
    cpu_cores: os.cpus().length,
    mem_gb:    Math.round(os.totalmem() / 1024 ** 3),
    phases:    [],
  };

  console.log(`\nCI phase profile · ${report.platform}/${report.arch} · ${report.cpu_cores} cores · node ${report.node}`);
  console.log(`Output: ${path.relative(ROOT, OUT_DIR)}/`);

  for (const name of args.phases) {

    const def = PHASES[name];
    console.log(`\n=== ${name}: ${def.description} ===`);
    console.log(`    $ ${def.cmd}`);

    const runs = [];

    for (let i = 0; i < args.repeat; ++i) {
      console.log(`  run ${i + 1}/${args.repeat} ...`);
      let res;
      const ms = time_ms(() => { res = run(def.cmd); });
      console.log(`    ${ms.toFixed(0).padStart(8)} ms   exit ${res.exit}`);
      runs.push({ ms, exit: res.exit, stdout_len: res.stdout_len, stderr_len: res.stderr_len });
    }

    report.phases.push({ name, command: def.cmd, runs, summary: stats(runs.map(r => r.ms)) });

  }

  // Sort a copy of phases by descending median for the summary table.
  // (Don't mutate `report.phases`, which we keep in run order in JSON.)
  const ranked = report.phases.slice().sort((a, b) => b.summary.median - a.summary.median);
  const total  = ranked.reduce((s, p) => s + p.summary.median, 0);

  console.log('\n=== Summary (median ms, sorted by share of total) ===');
  for (const p of ranked) {
    const pct = total > 0 ? ((p.summary.median / total) * 100).toFixed(1) : '  0.0';
    console.log(`  ${p.name.padEnd(22)} ${p.summary.median.toFixed(0).padStart(8)} ms   ${pct.padStart(5)} %`);
  }
  console.log(`  ${'TOTAL'.padEnd(22)} ${total.toFixed(0).padStart(8)} ms`);

  const safe_date = report.date.replace(/[:.]/g, '-');
  const out_file  = path.join(OUT_DIR, `ci-profile-${safe_date}.json`);
  fs.writeFileSync(out_file, JSON.stringify(report, null, 2));
  console.log(`\n→ ${path.relative(ROOT, out_file)}`);

}



main();
