'use strict';

/**
 *  Graviton perf runner (#675).  Benchmarks a *pull request's* code on a clean,
 *  dedicated AWS Graviton EC2 core so `npm run benny:scaling` numbers come from
 *  an isolated whole physical core instead of a contended laptop, then deletes
 *  every AWS resource it created and files the results into a dedicated
 *  `perf_results` git branch keyed by machine type and PR.
 *
 *  Usage:
 *
 *      node src/scripts/graviton_perf.cjs <pr-number> [flags]
 *
 *  Primary argument is a GitHub PR number; the runner resolves its head branch
 *  via `gh pr view <num>` and benchmarks *that PR's* commit (not main).
 *
 *  Flags (see {@link parseArgs} for the authoritative list and defaults):
 *
 *    --instance-type <type>   Graviton `.medium` type (default `c7g.medium`).
 *    --mode normal|deep       `deep` sets `BENNY_DEEP=1` on the remote run.
 *    --region <aws-region>    AWS region (default `us-east-1`).
 *    --subnet-id <id>         Subnet to launch in (auto-detected if omitted).
 *    --my-ip <cidr>           SSH-ingress CIDR override (default: resolved /32).
 *    --harness-from <ref>     Overlay the current scaling harness from <ref> (e.g.
 *                             `main`) onto the PR checkout, so a PR predating the
 *                             benchmark suite can still be measured.
 *    --shutdown-minutes <n>   Dead-man's-switch timer (default 30).
 *    --spot                   Launch as a Spot instance (default on-demand).
 *    --force                  Re-measure even if results already exist.
 *    --keep                   Skip teardown (debug); dead-man's-switch still fires.
 *    --cleanup-only           Sweep+delete tagged resources; do not provision.
 *    --run-id <id>            Override the generated run id.
 *    --dry-run                Print every AWS/ssh/git command; execute none.
 *
 *  SAFETY: the orchestration here is *only* exercised against live AWS when
 *  `--dry-run` is absent.  Every AWS/ssh/git/gh shell-out goes through the
 *  {@link makeExecutor} seam, which a `--dry-run` build replaces with a printer,
 *  so the pure logic (arg parsing, path construction, dedup, meta shaping,
 *  command building) is unit-testable without spending a cent.
 *
 *  @see notes/superpowers/plans/2026-06-02-graviton-benchmark-runner.md
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const cp   = require('child_process');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 *  Graviton `.medium` instance types this runner accepts.  All are single-vCPU
 *  = one whole physical ARM core, non-burstable — the property that removes the
 *  laptop-contention variance.  Burstable `t*` types are deliberately excluded:
 *  CPU-credit throttling on a shared core reintroduces exactly the contamination
 *  the dedicated core is escaping.
 */
const ALLOWED_INSTANCE_TYPES = Object.freeze([
  'c7g.medium',   // Graviton3 (recommended default)
  'c6g.medium',   // Graviton2 (cheaper fallback)
  'm7g.medium',   // Graviton3, more RAM
  'r7g.medium'    // Graviton3, most RAM
]);

/** Default flag values, single source of truth shared by parser and docs. */
const DEFAULTS = Object.freeze({
  instanceType    : 'c7g.medium',
  mode            : 'normal',
  region          : 'us-east-1',
  shutdownMinutes : 30,
  repoUrl         : 'https://github.com/StoneCypher/jssm.git',
  ghRepo          : 'StoneCypher/jssm'
});

/**
 *  SSM Parameter Store alias for the current Amazon Linux 2023 ARM64 AMI.
 *  Resolved at runtime per region so the AMI id never goes stale and is never
 *  hardcoded.
 */
const AL2023_ARM64_SSM_PARAM =
  '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64';

/** Tag every created resource so a partial-failure stray is always reapable. */
const BENCH_TAG_KEY = 'jssm-perf';

/** SSM SecureString holding the contents:write PAT the instance uses to push perf_results. */
const PERF_PUSH_PAT_SSM_PARAM = '/jssm/perf-push-pat';

/** IAM instance profile attached to the detached instance so it can read PERF_PUSH_PAT_SSM_PARAM. */
const PERF_INSTANCE_PROFILE = 'jssm-graviton-perf';

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested; no side effects)
// ---------------------------------------------------------------------------

/**
 *  Parse the runner's CLI arguments.  The first non-flag positional is the
 *  required PR number; everything else is a recognized flag.
 *
 *  @param argv Args *after* `node script` (i.e. `process.argv.slice(2)`).
 *  @returns A normalized options object with every flag resolved to a value or
 *           its default, `prNumber` (number) for the positional, and `deep`
 *           (boolean) derived from `--mode deep`.
 *  @throws Error on an unknown flag, a missing flag argument, a bad
 *          `--instance-type` (including any `t*` burstable type), a non-numeric
 *          PR number, a bad `--mode`, or a missing PR number when one is
 *          required (i.e. not `--cleanup-only`).
 *
 *  @example
 *  parseArgs(['677']).prNumber              // => 677
 *  parseArgs(['677', '--mode', 'deep']).deep // => true
 *  @example
 *  parseArgs(['--cleanup-only']).cleanupOnly // => true  (no PR needed)
 */
function parseArgs(argv) {
  const opts = {
    prNumber        : undefined,
    instanceType    : DEFAULTS.instanceType,
    mode            : DEFAULTS.mode,
    region          : DEFAULTS.region,
    subnetId        : undefined,
    myIp            : undefined,
    shutdownMinutes : DEFAULTS.shutdownMinutes,
    runId           : undefined,
    harnessFrom     : undefined,
    spot            : false,
    force           : false,
    keep            : false,
    cleanupOnly     : false,
    dryRun          : false,
    detached        : false,
    release         : undefined,
    commit          : undefined
  };

  const needsValue = (flag, value) => {
    if (value === undefined) { throw new Error(`${flag} requires a value`); }
    return value;
  };

  for (let i = 0; i < argv.length; ++i) {
    const a = argv[i];
    switch (a) {
      case '--instance-type'    : opts.instanceType    = needsValue(a, argv[++i]); break;
      case '--mode'             : opts.mode            = needsValue(a, argv[++i]); break;
      case '--region'           : opts.region          = needsValue(a, argv[++i]); break;
      case '--subnet-id'        : opts.subnetId        = needsValue(a, argv[++i]); break;
      case '--my-ip'            : opts.myIp            = needsValue(a, argv[++i]); break;
      case '--run-id'           : opts.runId           = needsValue(a, argv[++i]); break;
      case '--harness-from'     : opts.harnessFrom     = needsValue(a, argv[++i]); break;
      case '--shutdown-minutes' : opts.shutdownMinutes = parseInt(needsValue(a, argv[++i]), 10); break;
      case '--spot'             : opts.spot            = true; break;
      case '--force'            : opts.force           = true; break;
      case '--keep'             : opts.keep            = true; break;
      case '--cleanup-only'     : opts.cleanupOnly     = true; break;
      case '--dry-run'          : opts.dryRun          = true; break;
      case '--detached'         : opts.detached        = true; break;
      case '--release'          : opts.release         = needsValue(a, argv[++i]); break;
      case '--commit'           : opts.commit          = needsValue(a, argv[++i]); break;
      default:
        if (a.startsWith('--')) { throw new Error(`unknown flag: ${a}`); }
        if (opts.prNumber !== undefined) { throw new Error(`unexpected extra positional argument: ${a}`); }
        if (!/^\d+$/.test(a)) { throw new Error(`PR number must be a positive integer, got: ${a}`); }
        opts.prNumber = parseInt(a, 10);
    }
  }

  if (opts.mode !== 'normal' && opts.mode !== 'deep') {
    throw new Error(`--mode must be "normal" or "deep", got: ${opts.mode}`);
  }
  opts.deep = opts.mode === 'deep';

  validateInstanceType(opts.instanceType);

  if (!Number.isInteger(opts.shutdownMinutes) || opts.shutdownMinutes < 1) {
    throw new Error(`--shutdown-minutes must be a positive integer`);
  }

  // Targeting: a measurement run benchmarks a PR; a detached run benchmarks a
  // published release (no PR, no open branch). The two are mutually exclusive.
  if (opts.detached) {
    if (opts.prNumber !== undefined) {
      throw new Error('--detached benchmarks a release, not a PR; do not pass a PR number');
    }
    if (!opts.release) { throw new Error('--detached requires --release <version>'); }
    if (!opts.commit)  { throw new Error('--detached requires --commit <sha>'); }
    if (!/^[0-9a-f]{40}([0-9a-f]{24})?$/i.test(opts.commit)) {
      throw new Error(`--commit must be a 40- or 64-char hex SHA, got: ${opts.commit}`);
    }
    if (!/^[\w.+-]+$/.test(opts.release)) {
      throw new Error(`--release must be a simple version string, got: ${opts.release}`);
    }
  } else {
    if (opts.release || opts.commit) {
      throw new Error('--release/--commit are only valid with --detached');
    }
    // A PR number is required for a measurement run, but not for a pure sweep.
    if (!opts.cleanupOnly && opts.prNumber === undefined) {
      throw new Error('a PR number is required: node graviton_perf.cjs <pr-number> [flags]');
    }
  }

  return opts;
}

/**
 *  Validate an instance type against the Graviton `.medium` allowlist, rejecting
 *  burstable `t*` types with a pointed explanation.
 *
 *  @param instanceType e.g. `c7g.medium`.
 *  @returns The same string, unchanged, when valid (so it can be used inline).
 *  @throws Error naming the allowlist when the type is not an accepted Graviton
 *          `.medium`, with a distinct message for `t*` burstable types.
 *
 *  @example validateInstanceType('c7g.medium') // => 'c7g.medium'
 *  @example validateInstanceType('t4g.medium') // throws (burstable rejected)
 */
function validateInstanceType(instanceType) {
  if (/^t\d/i.test(instanceType) || /^t[0-9]?g/i.test(instanceType)) {
    throw new Error(
      `burstable type "${instanceType}" is rejected: CPU-credit throttling on a ` +
      `shared core reintroduces the contention this runner exists to escape. ` +
      `Use one of: ${ALLOWED_INSTANCE_TYPES.join(', ')}.`
    );
  }
  if (!ALLOWED_INSTANCE_TYPES.includes(instanceType)) {
    throw new Error(
      `instance type "${instanceType}" is not an accepted Graviton .medium. ` +
      `Use one of: ${ALLOWED_INSTANCE_TYPES.join(', ')}.`
    );
  }
  return instanceType;
}

/**
 *  Generate a unique run id used as the value of the resource tags and embedded
 *  in the key-pair and security-group names, so even an untagged stray is
 *  greppable.
 *
 *  @param now A Date (injectable for tests); defaults to the current time.
 *  @param rand A 6-hex-char suffix (injectable for tests); defaults to random.
 *  @returns e.g. `jssm-perf-20260602-143012-a1b9f2`.
 *
 *  @example
 *  makeRunId(new Date('2026-06-02T14:30:12Z'), 'a1b9f2')
 *  // => 'jssm-perf-20260602-143012-a1b9f2'
 */
function makeRunId(now = new Date(), rand = randomHex6()) {
  const p = (n) => String(n).padStart(2, '0');
  const stamp =
    `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}-` +
    `${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}`;
  return `jssm-perf-${stamp}-${rand}`;
}

/** Six random lowercase-hex characters for run-id uniqueness. */
function randomHex6() {
  return Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, '0');
}

/** Generic perf_results path keyed by a target slug (`pr-<n>` or `release-<v>`). */
function perfResultPathForSlug(instanceType, slug, filename) {
  return `${instanceType}/${slug}/${filename}`;
}

/** Generic perf_results dir prefix (no filename) keyed by a target slug. */
function perfResultDirForSlug(instanceType, slug) {
  return `${instanceType}/${slug}`;
}

/** The perf_results target slug for a published release version. */
function releaseSlug(version) {
  return `release-${version}`;
}

/**
 *  Build the `perf_results`-branch path for one artifact, keyed by machine type
 *  then PR.  This is the on-branch layout the runner commits to.
 *
 *  @param instanceType e.g. `c7g.medium` — the top-level directory.
 *  @param prNumber The PR number (number or numeric string).
 *  @param filename e.g. `scaling.json`, `construct.prof.txt`, `meta.json`.
 *  @returns A POSIX-style relative path, e.g. `c7g.medium/pr-677/scaling.json`.
 *
 *  @example
 *  perfResultPath('c7g.medium', 677, 'scaling.json')
 *  // => 'c7g.medium/pr-677/scaling.json'
 */
// perfResultPath/perfResultDir keep their public (instanceType, prNumber, ...) API,
// now expressed via the slug primitives.
function perfResultPath(instanceType, prNumber, filename) {
  return perfResultPathForSlug(instanceType, `pr-${prNumber}`, filename);
}

/**
 *  The directory prefix (no trailing slash) for one (instance-type, PR) pair on
 *  the `perf_results` branch.  Used both to write into and to test existence
 *  against the branch's tree listing.
 *
 *  @example perfResultDir('c7g.medium', 677) // => 'c7g.medium/pr-677'
 */
function perfResultDir(instanceType, prNumber) {
  return perfResultDirForSlug(instanceType, `pr-${prNumber}`);
}

/**
 *  Decide whether to measure a (instanceType, slug) target or skip it as already
 *  measured: if any path under `<instanceType>/<slug>/` exists on perf_results,
 *  skip unless `force`. The slug is `pr-<n>` or `release-<v>`.
 *
 *  @param existingPaths The flat list of paths present on `perf_results` (e.g.
 *         from `git ls-tree -r origin/perf_results --name-only`).  An empty list
 *         (branch absent or empty) always measures.
 *  @param instanceType e.g. `c7g.medium`.
 *  @param slug e.g. `pr-677` or `release-5.1.0`.
 *  @param force When true, always measure regardless of existing results.
 *  @returns `{ measure, reason }` — `measure` is the boolean decision, `reason`
 *           is a human-readable explanation suitable for printing.
 */
function decideMeasureSlug(existingPaths, instanceType, slug, force) {
  const dir       = perfResultDirForSlug(instanceType, slug);
  const dirPrefix = dir + '/';
  const already   = existingPaths.some((p) => p === dir || p.startsWith(dirPrefix));

  if (already && !force) {
    return { measure: false, reason: `results already exist at ${dir}/ on perf_results (pass --force to re-measure)` };
  }
  if (already && force) {
    return { measure: true, reason: `--force: re-measuring despite existing ${dir}/` };
  }
  return { measure: true, reason: `no existing results for ${dir}/` };
}

/**
 *  Decide whether to measure a PR or skip it as already-measured.  A PR is
 *  measured at most once per machine type: if any path under
 *  `<instance-type>/pr-<num>/` already exists on the `perf_results` branch, skip
 *  — unless `force` overrides.
 *
 *  @param existingPaths The flat list of paths present on `perf_results` (e.g.
 *         from `git ls-tree -r origin/perf_results --name-only`).  An empty list
 *         (branch absent or empty) always measures.
 *  @param instanceType e.g. `c7g.medium`.
 *  @param prNumber The PR number.
 *  @param force When true, always measure regardless of existing results.
 *  @returns `{ measure, reason }` — `measure` is the boolean decision, `reason`
 *           is a human-readable explanation suitable for printing.
 *
 *  @example
 *  decideMeasure([], 'c7g.medium', 677, false).measure          // => true
 *  decideMeasure(['c7g.medium/pr-677/scaling.json'], 'c7g.medium', 677, false).measure // => false
 *  decideMeasure(['c7g.medium/pr-677/scaling.json'], 'c7g.medium', 677, true).measure  // => true (force)
 *
 *  @see decideMeasureSlug
 */
/** PR-keyed dedup decision (unchanged public API), expressed via the slug core. */
function decideMeasure(existingPaths, instanceType, prNumber, force) {
  return decideMeasureSlug(existingPaths, instanceType, `pr-${prNumber}`, force);
}

/**
 *  Shape the `meta.json` sidecar committed alongside each result, recording the
 *  provenance needed to keep ARM trajectories distinct and reproducible.
 *
 *  @param fields Provenance: `{ prNumber, instanceType, mode, commitSha,
 *         headRefName, region, timestamp }`.  `timestamp` is injectable for
 *         tests; it defaults to now (ISO) via {@link buildMeta}'s caller.
 *  @returns A plain object ready to `JSON.stringify`.
 *
 *  @example
 *  buildMeta({ prNumber: 677, instanceType: 'c7g.medium', mode: 'normal',
 *              commitSha: 'abc123', headRefName: 'feat_x', region: 'us-east-1',
 *              timestamp: '2026-06-02T00:00:00.000Z' }).arch
 *  // => 'arm64'
 */
function buildMeta(fields) {
  return {
    pr           : fields.prNumber,
    instanceType : fields.instanceType,
    arch         : 'arm64',
    mode         : fields.mode,
    commitSha    : fields.commitSha,
    headRefName  : fields.headRefName,
    region       : fields.region,
    timestamp    : fields.timestamp,
    runner       : 'graviton_perf.cjs'
  };
}

/**
 *  Build the AWS `--tag-specifications` value for a created resource, tagging it
 *  with the run id, the sweepable `jssm-perf=true` marker, and a Name.
 *
 *  @param resourceType e.g. `instance`, `security-group`.
 *  @param runId The run id (also used as the Name tag).
 *  @returns The literal string AWS CLI expects after `--tag-specifications`.
 *
 *  @example
 *  tagSpec('instance', 'jssm-perf-x')
 *  // => 'ResourceType=instance,Tags=[{Key=jssm-perf-run,Value=jssm-perf-x},{Key=jssm-perf,Value=true},{Key=Name,Value=jssm-perf-x}]'
 */
function tagSpec(resourceType, runId) {
  return `ResourceType=${resourceType},Tags=[` +
    `{Key=${BENCH_TAG_KEY}-run,Value=${runId}},` +
    `{Key=${BENCH_TAG_KEY},Value=true},` +
    `{Key=Name,Value=${runId}}]`;
}

/**
 *  Build the `--filters` argument that scopes a describe/sweep to this runner's
 *  resources, optionally narrowed to a single run id.
 *
 *  @param runId When provided, narrow to one run (`jssm-perf-run=<id>`);
 *         otherwise match every runner resource (`jssm-perf=true`).
 *  @returns The literal `Name=tag:...,Values=...` filter string.
 *
 *  @example
 *  tagFilter()              // => 'Name=tag:jssm-perf,Values=true'
 *  tagFilter('jssm-perf-x') // => 'Name=tag:jssm-perf-run,Values=jssm-perf-x'
 */
function tagFilter(runId) {
  return runId
    ? `Name=tag:${BENCH_TAG_KEY}-run,Values=${runId}`
    : `Name=tag:${BENCH_TAG_KEY},Values=true`;
}

/**
 *  Build the user-data script that arms the dead-man's-switch as the very first
 *  thing the instance does at boot — so a never-connected or crashed-orchestrator
 *  run still self-terminates.  Paired with
 *  `--instance-initiated-shutdown-behavior terminate` at launch, `shutdown -h`
 *  terminates (dropping the volume) rather than merely stopping.
 *
 *  @param shutdownMinutes Minutes until self-termination; must exceed the run
 *         budget so a healthy run is never guillotined mid-benchmark.
 *  @returns A `#!/bin/bash` script string.
 *
 *  @example buildUserData(15).includes('shutdown -h +15') // => true
 */
function buildUserData(shutdownMinutes) {
  return [
    '#!/bin/bash',
    '# graviton_perf dead-man\'s-switch: terminate this instance no matter what.',
    `shutdown -h +${shutdownMinutes}`,
    ''
  ].join('\n');
}

/**
 *  Build the remote provisioning script that installs Node, clones the PR's
 *  commit, builds `dist/`, runs the benchmark, and captures a bounded profiled
 *  construct pass.  Chains freely because it runs in the *instance's* shell, not
 *  the local dev shell.
 *
 *  @param params `{ repoUrl, headRefName, commitSha, deep, shutdownMinutes,
 *         prNumber, harnessFrom }`.  `commitSha` pins the exact PR commit;
 *         `refs/pull/<prNumber>/head` is fetched (with `headRefName` as fallback) so
 *         the SHA is reachable even for a deleted-branch PR.  `deep` toggles
 *         `BENNY_DEEP=1`.  `harnessFrom`, when set, overlays that ref's scaling
 *         harness onto the checkout and runs it directly instead of the PR's own
 *         `benny:scaling`, so a PR predating the suite can still be measured.
 *  @returns A `#!/bin/bash -e` script string with a `JSSM_PERF_DONE` sentinel on
 *           success.
 *  @throws Error if `commitSha` is not a 40/64-char hex SHA, `headRefName` or
 *          `harnessFrom` contains shell-unsafe characters, or `prNumber` is
 *          non-numeric (defense against ref/command injection).
 *
 *  @example
 *  buildRemoteScript({ repoUrl: 'https://h/r.git', headRefName: 'feat_x',
 *    commitSha: 'a'.repeat(40), deep: true, shutdownMinutes: 15, prNumber: 677 })
 *    .includes('BENNY_DEEP=1') // => true
 */
function buildRemoteScript(params) {
  const { repoUrl, headRefName, commitSha, deep, shutdownMinutes, prNumber, harnessFrom } = params;

  if (!/^[0-9a-f]{40}([0-9a-f]{24})?$/i.test(commitSha)) {
    throw new Error(`refusing to build remote script: unsafe commit SHA "${commitSha}"`);
  }
  if (!/^[\w./-]+$/.test(headRefName)) {
    throw new Error(`refusing to build remote script: unsafe head ref "${headRefName}"`);
  }
  if (!/^https?:\/\/[\w./:@-]+$/.test(repoUrl)) {
    throw new Error(`refusing to build remote script: unsafe repo url "${repoUrl}"`);
  }
  if (!/^\d+$/.test(String(prNumber))) {
    throw new Error(`refusing to build remote script: non-numeric PR number "${prNumber}"`);
  }
  if (harnessFrom !== undefined && !/^[\w./-]+$/.test(harnessFrom)) {
    throw new Error(`refusing to build remote script: unsafe harness ref "${harnessFrom}"`);
  }

  // Benchmark step: the PR's own `benny:scaling`, or — with --harness-from — today's
  // harness overlaid from that ref onto this (possibly pre-harness) checkout and run
  // directly against the freshly-built old dist/.  The old package.json still supplies
  // the recorded version string, and the current harness feature-detects ops the old
  // library may lack.
  const benchSteps = harnessFrom
    ? [
        `# 4. Overlay the current scaling harness from "${harnessFrom}" and run it directly.`,
        `git fetch origin "${harnessFrom}"`,
        'git checkout FETCH_HEAD -- src/buildjs/benchmark_scaling.cjs src/buildjs/benchmark_scaling_plan.cjs benchmark/fixtures',
        'npm install benny@^3.7.1 --no-save --no-audit --no-fund',
        `${deep ? 'BENNY_DEEP=1 ' : ''}node ./src/buildjs/benchmark_scaling.cjs`
      ]
    : [
        '# 4. Benchmark (mode-dependent).',
        deep ? 'BENNY_DEEP=1 npm run benny:scaling' : 'npm run benny:scaling'
      ];

  return [
    '#!/bin/bash',
    'set -euo pipefail',
    '',
    '# 1. Node 24 (NodeSource), git.  Floor is Node 20; assert it.',
    'curl -fsSL https://rpm.nodesource.com/setup_24.x | sudo bash -',
    'sudo dnf install -y nodejs git',
    'node -v',
    'NODE_MAJOR=$(node -v | sed -E "s/^v([0-9]+).*/\\1/")',
    'if [ "$NODE_MAJOR" -lt 20 ]; then echo "Node too old: $(node -v)"; exit 3; fi',
    '',
    '# 2. Clone, then pin the exact PR commit. Fetch refs/pull/<n>/head (kept by GitHub',
    '#    even after the head branch is deleted) so squash-merged / old PRs still',
    '#    resolve; fall back to the head branch name, then trust the pinned SHA.',
    `git clone ${repoUrl} jssm`,
    'cd jssm',
    `git fetch origin "refs/pull/${prNumber}/head" || git fetch origin "${headRefName}" || true`,
    `git checkout ${commitSha}`,
    '',
    '# 3. Build dist/ (make, not build: make is the minimum that yields the bundles).',
    'npm install --no-audit --no-fund',
    'npm run make',
    '',
    ...benchSteps,
    '',
    '# 5. Bounded profiled construct pass (separate from benny so --prof never',
    '#    pollutes the ops/sec numbers).  Non-min bundle for readable frames.',
    '# Probe lives in the repo cwd (not /tmp) so its require(\'./dist/...\') resolves.',
    'cat > perf_probe.cjs <<\'PROBE\'',
    'const jssm = require(\'./dist/jssm.es5.nonmin.cjs\');',
    'const sm = jssm.sm;',
    'function denseFSL(n){const l=[\'allows_override: true;\'];for(let i=0;i<n;++i)for(let j=0;j<n;++j)if(i!==j)l.push(`s${i} -> s${j};`);return l.join(\'\\n\');}',
    'const src = denseFSL(200);',
    'for (let k = 0; k < 5; ++k) { const m = sm([src]); if (!m) throw new Error(\'no machine\'); }',
    'PROBE',
    'node --prof perf_probe.cjs || echo "JSSM_PERF: profile run failed; continuing without it"',
    'node --prof-process isolate-*.log > construct.prof.txt || echo "prof-process failed" > construct.prof.txt',
    '',
    'echo JSSM_PERF_DONE',
    ''
  ].join('\n');
}

/**
 *  Build the self-contained user-data script for a `--detached` release run.
 *  Unlike {@link buildRemoteScript} (which the client uploads + drives over SSH),
 *  this script runs at instance boot via cloud-init and does the ENTIRE job with
 *  no client involvement: arm the dead-man's-switch, install Node+git, clone and
 *  check out the released commit, build `dist/`, run benny, capture a bounded
 *  profiled construct pass, fetch a push PAT from SSM (via the instance profile),
 *  publish artifacts to `perf_results` under `<instance-type>/release-<version>/`
 *  (orphan-creating + non-fast-forward-retrying, like {@link publishPerfResults} /
 *  {@link pushPerfResults}), and finally self-terminate.
 *
 *  @param params `{ repoUrl, commitSha, release, instanceType, region, deep,
 *         shutdownMinutes, ssmParam }`. `commitSha` pins the exact released commit;
 *         `release` is the version label used only for keying; `ssmParam` is the
 *         SecureString name holding the contents:write PAT.
 *  @returns A `#!/bin/bash` script string.
 *  @throws Error on an unsafe `commitSha`, `release`, `region`, `ssmParam`, or
 *          `repoUrl` (defense against command injection into the boot script).
 *
 *  @example
 *  buildDetachedUserData({ repoUrl: 'https://github.com/StoneCypher/jssm.git',
 *    commitSha: 'a'.repeat(40), release: '5.1.0', instanceType: 'c7g.medium',
 *    region: 'us-east-1', deep: false, shutdownMinutes: 30,
 *    ssmParam: '/jssm/perf-push-pat' }).includes('shutdown -h now') // => true
 */
function buildDetachedUserData(params) {
  const { repoUrl, commitSha, release, instanceType, region, deep, shutdownMinutes, ssmParam } = params;

  if (!/^[0-9a-f]{40}([0-9a-f]{24})?$/i.test(commitSha)) {
    throw new Error(`refusing to build user-data: unsafe commit SHA "${commitSha}"`);
  }
  if (!/^[\w.+-]+$/.test(String(release))) {
    throw new Error(`refusing to build user-data: unsafe release "${release}"`);
  }
  if (!/^[\w-]+$/.test(String(region))) {
    throw new Error(`refusing to build user-data: unsafe region "${region}"`);
  }
  if (!/^[\w./-]+$/.test(String(ssmParam))) {
    throw new Error(`refusing to build user-data: unsafe ssm param "${ssmParam}"`);
  }
  if (!/^https?:\/\/[\w./:@-]+$/.test(repoUrl)) {
    throw new Error(`refusing to build user-data: unsafe repo url "${repoUrl}"`);
  }

  const destDir   = perfResultDirForSlug(instanceType, releaseSlug(release)); // c7g.medium/release-5.1.0
  const authUrl   = repoUrl.replace('https://', 'https://x-access-token:${TOKEN}@');
  const benchLine = deep ? 'BENNY_DEEP=1 npm run benny:scaling' : 'npm run benny:scaling';

  return [
    '#!/bin/bash',
    '# graviton_perf detached release run — self-contained; no SSH, no client.',
    '',
    '# 0. Dead-man\'s-switch FIRST: even if everything below fails, the box dies.',
    `shutdown -h +${shutdownMinutes}`,
    '',
    'set -uo pipefail',
    'export HOME=/root',
    'cd /root',
    '',
    '# 1. Node 24 (NodeSource) + git. AL2023 already ships AWS CLI v2.',
    'curl -fsSL https://rpm.nodesource.com/setup_24.x | bash -',
    'dnf install -y nodejs git',
    '',
    '# 2. Clone + pin the released commit.',
    `git clone ${repoUrl} jssm`,
    'cd jssm',
    `git checkout ${commitSha}`,
    '',
    '# 3. Build dist/ (make, not build).',
    'npm install --no-audit --no-fund',
    'npm run make',
    '',
    '# 4. Benchmark (mode-dependent).',
    benchLine,
    '',
    '# 5. Bounded profiled construct pass (non-min bundle for readable frames).',
    'cat > perf_probe.cjs <<\'PROBE\'',
    'const jssm = require(\'./dist/jssm.es5.nonmin.cjs\');',
    'const sm = jssm.sm;',
    'function denseFSL(n){const l=[\'allows_override: true;\'];for(let i=0;i<n;++i)for(let j=0;j<n;++j)if(i!==j)l.push(`s${i} -> s${j};`);return l.join(\'\\n\');}',
    'const src = denseFSL(200);',
    'for (let k = 0; k < 5; ++k) { const m = sm([src]); if (!m) throw new Error(\'no machine\'); }',
    'PROBE',
    'node --prof perf_probe.cjs || echo "JSSM_PERF: profile run failed; continuing"',
    'node --prof-process isolate-*.log > construct.prof.txt || echo "prof-process failed" > construct.prof.txt',
    '',
    '# 6. meta.json sidecar.',
    'cat > meta.json <<META',
    '{',
    `  "release": "${release}",`,
    `  "instanceType": "${instanceType}",`,
    '  "arch": "arm64",',
    `  "mode": "${deep ? 'deep' : 'normal'}",`,
    `  "commitSha": "${commitSha}",`,
    `  "region": "${region}",`,
    '  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",',
    '  "runner": "graviton_perf.cjs --detached"',
    '}',
    'META',
    '',
    '# 7. Fetch the push PAT from SSM (via the instance profile) and publish results.',
    `TOKEN=$(aws ssm get-parameter --region ${region} --name "${ssmParam}" --with-decryption --query Parameter.Value --output text)`,
    'if [ -z "$TOKEN" ] || [ "$TOKEN" = "None" ]; then echo "JSSM_PERF: no PAT from SSM; cannot publish"; shutdown -h now; exit 4; fi',
    '',
    `AUTH_URL="${authUrl}"`,
    'RESULTS=$(mktemp -d)',
    'if ! git clone --depth 1 --branch perf_results "$AUTH_URL" "$RESULTS"; then',
    '  git clone --depth 1 "$AUTH_URL" "$RESULTS"',
    '  git -C "$RESULTS" checkout --orphan perf_results',
    '  git -C "$RESULTS" rm -rf --ignore-unmatch . || true',
    'fi',
    `mkdir -p "$RESULTS/${destDir}"`,
    `cp benchmark/results/scaling.json "$RESULTS/${destDir}/scaling.json" || true`,
    `cp construct.prof.txt           "$RESULTS/${destDir}/construct.prof.txt" || true`,
    `cp meta.json                    "$RESULTS/${destDir}/meta.json"`,
    'git -C "$RESULTS" config user.email "stonecypher@users.noreply.github.com"',
    'git -C "$RESULTS" config user.name  "jssm graviton perf bot"',
    'git -C "$RESULTS" add -A',
    `git -C "$RESULTS" commit -m "perf: ${instanceType} results for release ${release}"`,
    '',
    '# Push with non-fast-forward retry (a concurrent run may have advanced the branch).',
    'cd "$RESULTS"',
    'for i in 1 2 3 4 5 6; do',
    '  if git push origin perf_results; then break; fi',
    '  git fetch origin perf_results || true',
    '  git rebase origin/perf_results || { git rebase --abort; echo "JSSM_PERF: rebase conflict"; break; }',
    'done',
    'cd -',
    '',
    'echo JSSM_PERF_DONE',
    '',
    '# 8. Self-terminate (shutdown-behavior=terminate drops the volume).',
    'shutdown -h now',
    ''
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Executor seam (side effects live here; --dry-run swaps in a printer)
// ---------------------------------------------------------------------------

/**
 *  Build the executor used for every shell-out (aws, ssh, scp, git, gh).  In
 *  dry-run mode it prints the command and returns a benign canned value instead
 *  of executing — so the whole orchestration can be walked without touching AWS.
 *
 *  @param dryRun When true, print-and-return; when false, actually run.
 *  @returns `{ run, dryRun }` where `run(cmd, args, opts)` executes `cmd` with
 *           `args` (never via a shell, so no quoting pitfalls) and returns
 *           `{ stdout, stderr, status }`.  In dry-run it returns
 *           `{ stdout: '', stderr: '', status: 0, dryRun: true }`.
 *
 *  @example makeExecutor(true).run('aws', ['sts', 'get-caller-identity']).dryRun // => true
 */
function makeExecutor(dryRun) {
  const run = (cmd, args, opts = {}) => {
    const printable = `${cmd} ${args.map(quoteForDisplay).join(' ')}`;
    if (dryRun) {
      process.stdout.write(`[dry-run] ${printable}\n`);
      return { stdout: opts.dryRunStdout || '', stderr: '', status: 0, dryRun: true };
    }
    const res = cp.spawnSync(cmd, args, {
      encoding : 'utf8',
      stdio    : opts.inherit ? 'inherit' : 'pipe',
      ...opts.spawn
    });
    if (res.error) { throw res.error; }
    return { stdout: res.stdout || '', stderr: res.stderr || '', status: res.status };
  };
  return { run, dryRun };
}

/** Quote a single arg for readable dry-run display (display only, not execution). */
function quoteForDisplay(a) {
  return /[\s'"$]/.test(a) ? `'${a.replace(/'/g, `'\\''`)}'` : a;
}

// ---------------------------------------------------------------------------
// perf_results branch handling (temp clone — never touches the user's checkout)
// ---------------------------------------------------------------------------

/**
 *  List the files present on `origin/perf_results` after a fetch, for the dedup
 *  check.  Returns `[]` when the branch does not exist yet (first use).
 *
 *  @param exec An executor from {@link makeExecutor}.
 *  @param repoDir The local repo directory to run git from.
 *  @returns Array of POSIX-style paths on the branch (empty if branch absent).
 */
function listPerfResultsPaths(exec, repoDir) {
  exec.run('git', ['-C', repoDir, 'fetch', 'origin', 'perf_results'], { dryRunStdout: '' });
  const ls = exec.run('git', ['-C', repoDir, 'ls-tree', '-r', 'origin/perf_results', '--name-only']);
  if (ls.status !== 0 || exec.dryRun) { return []; }
  return ls.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
}

/**
 *  Publish the collected result artifacts to the `perf_results` branch via a
 *  throwaway clone, so the user's working tree is never disturbed and no
 *  `perf_results` checkout happens over it.  Creates the orphan branch on first
 *  use.  No-op (printing only) in dry-run.
 *
 *  @param exec An executor from {@link makeExecutor}.
 *  @param params `{ repoUrl, instanceType, prNumber, files, commitMessage }`.
 *         `files` is a map of on-branch path -> local absolute source path.
 *  @returns void; throws on a genuine git failure (non-dry-run only).
 */
function publishPerfResults(exec, params) {
  const { repoUrl, instanceType, prNumber, files, commitMessage } = params;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jssm-perf-results-'));

  try {
    // Clone just the perf_results branch if it exists; otherwise clone default
    // and create an orphan branch.
    const cloned = exec.run('git', ['clone', '--depth', '1', '--branch', 'perf_results', repoUrl, tmp]);
    if (cloned.status !== 0 && !exec.dryRun) {
      // perf_results doesn't exist yet — clone default, make an orphan branch.
      exec.run('git', ['clone', '--depth', '1', repoUrl, tmp]);
      exec.run('git', ['-C', tmp, 'checkout', '--orphan', 'perf_results']);
      exec.run('git', ['-C', tmp, 'rm', '-rf', '--ignore-unmatch', '.']);
    }

    const destDir = path.join(tmp, instanceType, `pr-${prNumber}`);
    if (!exec.dryRun) { fs.mkdirSync(destDir, { recursive: true }); }

    for (const [onBranch, localSrc] of Object.entries(files)) {
      const dest = path.join(tmp, onBranch);
      if (!exec.dryRun) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(localSrc, dest);
      } else {
        process.stdout.write(`[dry-run] copy ${localSrc} -> ${onBranch} (in temp clone)\n`);
      }
    }

    exec.run('git', ['-C', tmp, 'add', '-A']);
    exec.run('git', ['-C', tmp, 'commit', '-m', commitMessage]);
    pushPerfResults(exec, tmp);
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

/**
 *  Push the staged perf_results commit, retrying on a non-fast-forward reject —
 *  a concurrent run for a *different* PR may have advanced the branch between
 *  our clone and our push. Because every run only adds its own
 *  `<instance-type>/pr-<num>/` files, rebasing onto the advanced tip replays our
 *  commit cleanly; only the ref race is ever lost, never a file.
 *
 *  @param exec An executor from {@link makeExecutor}.
 *  @param repoDir The throwaway clone to push from (already committed).
 *  @returns void; returns on the first push in dry-run.
 *  @throws Error if the push is still rejected after the retry budget, or if a
 *          rebase hits a real conflict (which distinct-file runs never should).
 *
 *  @example
 *  pushPerfResults(exec, '/tmp/clone');   // succeeds first try -> one push, no rebase
 */
function pushPerfResults(exec, repoDir) {
  const MAX_ATTEMPTS = 6;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; ++attempt) {
    const pushed = exec.run('git', ['-C', repoDir, 'push', 'origin', 'perf_results']);
    if (exec.dryRun || pushed.status === 0) { return; }
    // Rejected (non-fast-forward): a concurrent run advanced the branch. Pull it
    // in and retry; distinct pr-<num>/ files rebase cleanly.
    exec.run('git', ['-C', repoDir, 'fetch', 'origin', 'perf_results']);
    const rebased = exec.run('git', ['-C', repoDir, 'rebase', 'origin/perf_results']);
    if (rebased.status !== 0) {
      exec.run('git', ['-C', repoDir, 'rebase', '--abort']);
      throw new Error('perf_results: unexpected rebase conflict (concurrent runs should touch distinct files)');
    }
  }
  throw new Error(`perf_results: push still rejected after ${MAX_ATTEMPTS} attempts (heavy concurrent contention?)`);
}

// ---------------------------------------------------------------------------
// PR resolution
// ---------------------------------------------------------------------------

/**
 *  Resolve a PR number to the head branch + commit to benchmark, via `gh`.
 *
 *  @param exec An executor from {@link makeExecutor}.
 *  @param ghRepo `owner/repo` for `gh pr view --repo`.
 *  @param prNumber The PR number.
 *  @returns `{ headRefName, headRefOid }`.  In dry-run, returns placeholders so
 *           the rest of the orchestration can be walked.
 *  @throws Error if `gh` fails or returns no head ref (non-dry-run).
 */
function resolvePr(exec, ghRepo, prNumber) {
  const res = exec.run('gh', [
    'pr', 'view', String(prNumber),
    '--repo', ghRepo,
    '--json', 'headRefName,headRefOid',
    '--jq', '.headRefName + " " + .headRefOid'
  ], { dryRunStdout: 'dry-run-branch ' + 'a'.repeat(40) });

  const out = (res.stdout || '').trim();
  const [headRefName, headRefOid] = out.split(/\s+/);
  if (!headRefName || !headRefOid) {
    throw new Error(`could not resolve PR #${prNumber} head ref via gh (output: "${out}")`);
  }
  return { headRefName, headRefOid };
}

// ---------------------------------------------------------------------------
// AWS orchestration (side-effecting; walked under --dry-run, never unit-tested
// against live AWS).  All AWS calls go through `exec`, take `--region`, and tag
// every resource so a partial failure is always tag-reapable.
// ---------------------------------------------------------------------------

/**
 *  Resolve the subnet to launch in.  Honors an explicit `--subnet-id`; otherwise
 *  auto-detects a default VPC and one of its public (map-public-ip-on-launch)
 *  subnets.  The account may lack a default VPC — in that case this throws,
 *  directing the caller to pass `--subnet-id`.
 *
 *  @param exec An executor from {@link makeExecutor}.
 *  @param region AWS region.
 *  @param explicitSubnetId A `--subnet-id` value, or undefined to auto-detect.
 *  @returns The chosen subnet id (a placeholder in dry-run).
 *  @throws Error when no default VPC / public subnet exists and none was given.
 */
function resolveSubnet(exec, region, explicitSubnetId) {
  if (explicitSubnetId) { return explicitSubnetId; }
  if (exec.dryRun) { return '<auto-detected-subnet>'; }

  const vpc = exec.run('aws', [
    'ec2', 'describe-vpcs', '--region', region,
    '--filters', 'Name=isDefault,Values=true',
    '--query', 'Vpcs[0].VpcId', '--output', 'text'
  ]);
  const vpcId = (vpc.stdout || '').trim();
  if (!vpcId || vpcId === 'None') {
    throw new Error(
      `no default VPC in ${region}; pass --subnet-id <id> for a public subnet ` +
      `(this account/region has no default VPC).`
    );
  }

  const subnet = exec.run('aws', [
    'ec2', 'describe-subnets', '--region', region,
    '--filters', `Name=vpc-id,Values=${vpcId}`, 'Name=map-public-ip-on-launch,Values=true',
    '--query', 'Subnets[0].SubnetId', '--output', 'text'
  ]);
  const subnetId = (subnet.stdout || '').trim();
  if (!subnetId || subnetId === 'None') {
    throw new Error(
      `default VPC ${vpcId} in ${region} has no public subnet; pass --subnet-id <id>.`
    );
  }
  return subnetId;
}

/**
 *  Resolve the caller's public IP as a `/32` CIDR for the SSH-ingress rule.
 *  Never falls back to `0.0.0.0/0` — open-to-the-world SSH is unacceptable.
 *
 *  @param exec An executor from {@link makeExecutor}.
 *  @param explicitCidr A `--my-ip` override (used as-is when present).
 *  @returns A CIDR like `203.0.113.7/32` (placeholder in dry-run).
 *  @throws Error if the IP cannot be resolved and none was given.
 */
function resolveMyIp(exec, explicitCidr) {
  if (explicitCidr) { return explicitCidr; }
  if (exec.dryRun) { return '<caller-ip>/32'; }
  const res = exec.run('curl', ['-fsS', 'https://checkip.amazonaws.com']);
  const ip = (res.stdout || '').trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    throw new Error(`could not resolve caller public IP (got "${ip}"); pass --my-ip <cidr>.`);
  }
  return `${ip}/32`;
}

/**
 *  Provision the tagged AWS resources for one run: resolve AMI + subnet + ingress
 *  CIDR, create a key pair (captured to a 0600 temp file), create a security
 *  group with a single SSH/22 ingress from the caller, and launch a tagged
 *  instance with a DeleteOnTermination root volume, IMDSv2, instance-initiated
 *  shutdown = terminate, and the dead-man's-switch armed in user-data.
 *
 *  @param exec An executor from {@link makeExecutor}.
 *  @param opts Parsed options from {@link parseArgs}.
 *  @param state Mutable run-state object; ids are recorded into it as created so
 *         teardown can reap even a half-provisioned run.
 *  @returns The same `state`, populated.
 */
function provision(exec, opts, state) {
  const { region, instanceType, runId } = state;

  const amiRes = exec.run('aws', [
    'ssm', 'get-parameter', '--region', region,
    '--name', AL2023_ARM64_SSM_PARAM,
    '--query', 'Parameter.Value', '--output', 'text'
  ], { dryRunStdout: 'ami-DRYRUN' });
  state.amiId = (amiRes.stdout || '').trim() || 'ami-DRYRUN';

  state.subnetId = resolveSubnet(exec, region, opts.subnetId);
  state.myIp     = resolveMyIp(exec, opts.myIp);

  // The security group must live in the same VPC as the subnet.
  const vpcRes = exec.run('aws', [
    'ec2', 'describe-subnets', '--region', region, '--subnet-ids', state.subnetId,
    '--query', 'Subnets[0].VpcId', '--output', 'text'
  ], { dryRunStdout: 'vpc-DRYRUN' });
  state.vpcId = (vpcRes.stdout || '').trim() || 'vpc-DRYRUN';

  // Key pair -> temp .pem (0600).
  const keyName = `${runId}-key`;
  state.keyName = keyName;
  const keyPath = path.join(state.tmpDir, `${keyName}.pem`);
  state.keyPath = keyPath;
  const keyRes = exec.run('aws', [
    'ec2', 'create-key-pair', '--region', region,
    '--key-name', keyName, '--query', 'KeyMaterial', '--output', 'text'
  ], { dryRunStdout: '-----DRYRUN KEY-----' });
  if (!exec.dryRun) {
    fs.writeFileSync(keyPath, keyRes.stdout, { mode: 0o600 });
    try { fs.chmodSync(keyPath, 0o600); } catch { /* Windows: ACLs govern */ }
  }

  // Security group + single SSH ingress from caller /32.
  const sgRes = exec.run('aws', [
    'ec2', 'create-security-group', '--region', region,
    '--group-name', `${runId}-sg`,
    '--description', `jssm perf transient ${runId}`,
    '--vpc-id', state.vpcId,
    '--tag-specifications', tagSpec('security-group', runId),
    '--query', 'GroupId', '--output', 'text'
  ], { dryRunStdout: 'sg-DRYRUN' });
  state.sgId = (sgRes.stdout || '').trim() || 'sg-DRYRUN';

  exec.run('aws', [
    'ec2', 'authorize-security-group-ingress', '--region', region,
    '--group-id', state.sgId, '--protocol', 'tcp', '--port', '22',
    '--cidr', state.myIp
  ]);

  // Dead-man's-switch user-data.
  const userDataPath = path.join(state.tmpDir, 'userdata.sh');
  if (!exec.dryRun) { fs.writeFileSync(userDataPath, buildUserData(opts.shutdownMinutes)); }

  const runInstanceArgs = [
    'ec2', 'run-instances', '--region', region,
    '--image-id', state.amiId,
    '--instance-type', instanceType,
    '--key-name', keyName,
    '--security-group-ids', state.sgId,
    '--subnet-id', state.subnetId,
    '--associate-public-ip-address',
    '--instance-initiated-shutdown-behavior', 'terminate',
    '--block-device-mappings',
      '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":10,"VolumeType":"gp3","DeleteOnTermination":true}}]',
    '--metadata-options', 'HttpTokens=required,HttpEndpoint=enabled',
    '--tag-specifications', tagSpec('instance', runId),
    '--user-data', `file://${userDataPath}`,
    '--count', '1',
    '--query', 'Instances[0].InstanceId', '--output', 'text'
  ];
  if (opts.spot) {
    runInstanceArgs.splice(runInstanceArgs.length - 2, 0,
      '--instance-market-options',
      'MarketType=spot,SpotOptions={SpotInstanceType=one-time,InstanceInterruptionBehavior=terminate}');
  }
  const instRes = exec.run('aws', runInstanceArgs, { dryRunStdout: 'i-DRYRUN' });
  state.instanceId = (instRes.stdout || '').trim() || 'i-DRYRUN';

  process.stdout.write(
    `provisioned: instance=${state.instanceId} sg=${state.sgId} key=${keyName} ` +
    `subnet=${state.subnetId} ami=${state.amiId}\n`
  );
  return state;
}

/**
 *  Configure + run the benchmark on the instance over SSH, then retrieve the
 *  artifacts.  Waits for the instance to pass status checks, polls SSH, uploads
 *  and runs the remote script ({@link buildRemoteScript}), and `scp`s back
 *  `scaling.json`, `scaling.md`, and `construct.prof.txt`.
 *
 *  @param exec An executor from {@link makeExecutor}.
 *  @param opts Parsed options.
 *  @param state Run-state with `instanceId`, `keyPath`, etc.
 *  @param refInfo `{ headRefName, headRefOid }` for the remote checkout.
 *  @returns `{ scalingJson, scalingMd, profTxt }` absolute local paths.
 *  @throws Error if the remote build/benchmark exits non-zero (surfaced eagerly,
 *          so a failed build can't masquerade as the repo's committed stale
 *          `scaling.json`), or if no non-empty `scaling.json` came back.
 */
function configureAndRun(exec, opts, state, refInfo) {
  const { region } = state;

  exec.run('aws', ['ec2', 'wait', 'instance-running', '--region', region, '--instance-ids', state.instanceId]);
  exec.run('aws', ['ec2', 'wait', 'instance-status-ok', '--region', region, '--instance-ids', state.instanceId]);

  const dnsRes = exec.run('aws', [
    'ec2', 'describe-instances', '--region', region, '--instance-ids', state.instanceId,
    '--query', 'Reservations[0].Instances[0].PublicDnsName', '--output', 'text'
  ], { dryRunStdout: 'ec2-DRYRUN.compute.amazonaws.com' });
  const dns = (dnsRes.stdout || '').trim();
  state.publicDns = dns;

  const knownHosts = path.join(state.tmpDir, 'known_hosts');
  const sshBase = [
    '-i', state.keyPath,
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', `UserKnownHostsFile=${knownHosts}`,
    '-o', 'ConnectTimeout=10'
  ];

  // SSH preflight (belt-and-suspenders after status-ok).
  exec.run('ssh', [...sshBase, `ec2-user@${dns}`, 'true']);

  // Upload + run the remote provisioning script.
  const remoteScript = buildRemoteScript({
    repoUrl         : DEFAULTS.repoUrl,
    headRefName     : refInfo.headRefName,
    commitSha       : refInfo.headRefOid,
    deep            : opts.deep,
    shutdownMinutes : opts.shutdownMinutes,
    prNumber        : opts.prNumber,
    harnessFrom     : opts.harnessFrom
  });
  const remoteScriptPath = path.join(state.tmpDir, 'remote_run.sh');
  if (!exec.dryRun) { fs.writeFileSync(remoteScriptPath, remoteScript); }
  exec.run('scp', [...sshBase, remoteScriptPath, `ec2-user@${dns}:remote_run.sh`]);
  const remoteRun = exec.run('ssh', [...sshBase, `ec2-user@${dns}`, 'bash', 'remote_run.sh'], { inherit: true });
  if (!exec.dryRun && remoteRun.status !== 0) {
    throw new Error(
      `remote build/benchmark failed (ssh exit ${remoteRun.status}); the run never reached ` +
      `JSSM_PERF_DONE. See the streamed remote output above for the failing step.`
    );
  }

  // Retrieve artifacts.
  const outDir = state.tmpDir;
  const scalingJson = path.join(outDir, 'scaling.json');
  const scalingMd   = path.join(outDir, 'scaling.md');
  const profTxt     = path.join(outDir, 'construct.prof.txt');
  exec.run('scp', [...sshBase, `ec2-user@${dns}:jssm/benchmark/results/scaling.json`, scalingJson]);
  exec.run('scp', [...sshBase, `ec2-user@${dns}:jssm/benchmark/results/scaling.md`,   scalingMd]);
  exec.run('scp', [...sshBase, `ec2-user@${dns}:jssm/construct.prof.txt`,              profTxt]);

  if (!exec.dryRun) {
    if (!fs.existsSync(scalingJson) || fs.statSync(scalingJson).size === 0) {
      throw new Error('remote run produced no scaling.json (benchmark failed)');
    }
  }
  return { scalingJson, scalingMd, profTxt };
}

/**
 *  Classify the post-teardown instance state(s) for the run log, so a reader can
 *  confirm the box ended up gone without opening the EC2 console — and so a
 *  *leaked* instance (anything not terminating) is surfaced loudly rather than
 *  hidden behind a bare "teardown complete".
 *
 *  `terminated` and `shutting-down` both count as cleaned up: a shutting-down
 *  instance always proceeds to terminated, and the dead-man's-switch guarantees
 *  it even if our own terminate call failed. An empty query result means no
 *  tagged instance survives — also clear.
 *
 *  @param stateText Raw `--output text` stdout of the proof-step query
 *         (`Reservations[].Instances[].State.Name`): whitespace-separated state
 *         names, or '' when nothing tagged survives.
 *  @returns `{ states, allClear, summary }` — `states` the parsed names,
 *           `allClear` whether every survivor is gone/terminating, and `summary`
 *           the one-line message written to the run log.
 *
 *  @example
 *  summarizeFinalInstanceState('terminated')
 *  // => { states: ['terminated'], allClear: true,
 *  //      summary: 'EC2 final state: terminated ✓' }
 *
 *  @example
 *  summarizeFinalInstanceState('')          // nothing survives
 *  // => { states: [], allClear: true,
 *  //      summary: 'EC2 final state: no tagged instance survives ✓' }
 *
 *  @example
 *  summarizeFinalInstanceState('running')   // a leak — surfaced, not swallowed
 *  // => { states: ['running'], allClear: false,
 *  //      summary: '⚠ EC2 NOT torn down: running — reclaim with --cleanup-only' }
 */
function summarizeFinalInstanceState(stateText) {
  const CLEARED  = new Set(['terminated', 'shutting-down']);
  const states   = (stateText || '').split(/\s+/).map((s) => s.trim()).filter(Boolean);
  const allClear = states.every((s) => CLEARED.has(s));

  let summary;
  if (states.length === 0) {
    summary = 'EC2 final state: no tagged instance survives ✓';
  } else if (allClear) {
    summary = `EC2 final state: ${states.join(', ')} ✓`;
  } else {
    summary = `⚠ EC2 NOT torn down: ${states.join(', ')} — reclaim with --cleanup-only`;
  }
  return { states, allClear, summary };
}

/**
 *  Teardown: terminate the instance and WAIT for it gone, delete the security
 *  group (now unreferenced), delete the key pair, and shred local secrets.
 *  Idempotent — "not found" / "already deleted" AWS errors are treated as
 *  success — and safe to call from `finally` and from signal handlers.
 *
 *  @param exec An executor from {@link makeExecutor}.
 *  @param state Run-state (uses whatever ids were recorded; missing ones are
 *         skipped, so a half-provisioned run still tears down cleanly).
 */
function teardown(exec, state) {
  const { region } = state;
  const swallow = (fn) => { try { fn(); } catch (e) { process.stderr.write(`cleanup warning: ${e.message}\n`); } };

  if (state.instanceId) {
    swallow(() => exec.run('aws', ['ec2', 'terminate-instances', '--region', region, '--instance-ids', state.instanceId]));
    swallow(() => exec.run('aws', ['ec2', 'wait', 'instance-terminated', '--region', region, '--instance-ids', state.instanceId]));
  }
  if (state.sgId) {
    swallow(() => exec.run('aws', ['ec2', 'delete-security-group', '--region', region, '--group-id', state.sgId]));
  }
  if (state.keyName) {
    swallow(() => exec.run('aws', ['ec2', 'delete-key-pair', '--region', region, '--key-name', state.keyName]));
  }
  if (state.tmpDir && !exec.dryRun) {
    swallow(() => fs.rmSync(state.tmpDir, { recursive: true, force: true }));
  }

  // Proof step: query the surviving instance state(s) for this run and report
  // them, so the run log records that the box ended up gone (terminated is ok)
  // and a leak is screamed about rather than hidden.
  let finalSummary = 'EC2 final state: unknown (post-teardown query did not run)';
  swallow(() => {
    const res = exec.run('aws', [
      'ec2', 'describe-instances', '--region', region,
      '--filters', tagFilter(state.runId),
      '--query', 'Reservations[].Instances[].State.Name', '--output', 'text'
    ], { dryRunStdout: 'terminated' });
    finalSummary = summarizeFinalInstanceState(res.stdout).summary;
  });
  state.finalInstanceSummary = finalSummary;
  process.stdout.write(`teardown complete for ${state.runId} — ${finalSummary}\n`);
}

/**
 *  Full measurement run: create per-run temp state, provision inside a try,
 *  configure/run/retrieve, publish results to `perf_results`, and ALWAYS tear
 *  down in finally (plus signal handlers + a process-exit safety net).  Honors
 *  `--keep` by skipping only the resource deletion (the dead-man's-switch still
 *  terminates the instance).
 *
 *  @param exec An executor from {@link makeExecutor}.
 *  @param opts Parsed options.
 *  @param ctx `{ headRefName, headRefOid, repoDir }`.
 *  @returns Process exit code (0 success).
 */
function runMeasurement(exec, opts, ctx) {
  const runId  = opts.runId || makeRunId();
  const tmpDir = exec.dryRun
    ? path.join(os.tmpdir(), `jssm-perf-${runId}`)
    : fs.mkdtempSync(path.join(os.tmpdir(), 'jssm-perf-'));

  const state = { runId, region: opts.region, instanceType: opts.instanceType, tmpDir };

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) { return; }
    cleaned = true;
    if (opts.keep) {
      process.stdout.write(
        `--keep: leaving resources up. Reclaim with:\n` +
        `  node src/scripts/graviton_perf.cjs --cleanup-only --run-id ${runId} --region ${opts.region}\n` +
        `(dead-man's-switch still terminates the instance within ${opts.shutdownMinutes} min.)\n`
      );
      return;
    }
    teardown(exec, state);
  };

  const onSignal = () => { cleanup(); process.exit(130); };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  try {
    provision(exec, opts, state);
    const artifacts = configureAndRun(exec, opts, state, ctx);

    const meta = buildMeta({
      prNumber     : opts.prNumber,
      instanceType : opts.instanceType,
      mode         : opts.mode,
      commitSha    : ctx.headRefOid,
      headRefName  : ctx.headRefName,
      region       : opts.region,
      timestamp    : new Date().toISOString()
    });
    const metaPath = path.join(tmpDir, 'meta.json');
    if (!exec.dryRun) { fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n'); }

    publishPerfResults(exec, {
      repoUrl       : DEFAULTS.repoUrl,
      instanceType  : opts.instanceType,
      prNumber      : opts.prNumber,
      files         : {
        [perfResultPath(opts.instanceType, opts.prNumber, 'scaling.json')]      : artifacts.scalingJson,
        [perfResultPath(opts.instanceType, opts.prNumber, 'construct.prof.txt')]: artifacts.profTxt,
        [perfResultPath(opts.instanceType, opts.prNumber, 'meta.json')]         : metaPath
      },
      commitMessage : `perf: ${opts.instanceType} results for PR #${opts.prNumber} (${opts.mode})`
    });

    process.stdout.write(
      `done: results published to perf_results at ` +
      `${perfResultDir(opts.instanceType, opts.prNumber)}/\n`
    );
    return 0;
  } catch (e) {
    process.stderr.write(`measurement failed: ${e.message}\n`);
    return 1;
  } finally {
    cleanup();
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
  }
}

/**
 *  `--cleanup-only` sweep: discover this runner's resources purely by tag
 *  (optionally narrowed to `--run-id`) and reap them.  The orphan-reaper for a
 *  prior run whose own cleanup died.
 *
 *  @param exec An executor from {@link makeExecutor}.
 *  @param opts Parsed options (uses `region` and optional `runId`).
 *  @returns Process exit code.
 */
function runCleanupOnly(exec, opts) {
  const region = opts.region;
  process.stdout.write(`cleanup-only sweep in ${region} (${opts.runId ? 'run ' + opts.runId : 'all jssm-perf'})\n`);

  const instRes = exec.run('aws', [
    'ec2', 'describe-instances', '--region', region,
    '--filters', tagFilter(opts.runId), 'Name=instance-state-name,Values=pending,running,stopping,stopped',
    '--query', 'Reservations[].Instances[].InstanceId', '--output', 'text'
  ], { dryRunStdout: '' });
  const instanceIds = (instRes.stdout || '').split(/\s+/).filter(Boolean);
  for (const id of instanceIds) {
    exec.run('aws', ['ec2', 'terminate-instances', '--region', region, '--instance-ids', id]);
    exec.run('aws', ['ec2', 'wait', 'instance-terminated', '--region', region, '--instance-ids', id]);
  }

  const sgRes = exec.run('aws', [
    'ec2', 'describe-security-groups', '--region', region,
    '--filters', tagFilter(opts.runId),
    '--query', 'SecurityGroups[].GroupId', '--output', 'text'
  ], { dryRunStdout: '' });
  for (const sg of (sgRes.stdout || '').split(/\s+/).filter(Boolean)) {
    exec.run('aws', ['ec2', 'delete-security-group', '--region', region, '--group-id', sg]);
  }

  // Key pairs aren't taggable via create-key-pair; match by the jssm-perf- name prefix.
  const keyRes = exec.run('aws', [
    'ec2', 'describe-key-pairs', '--region', region,
    '--query', 'KeyPairs[].KeyName', '--output', 'text'
  ], { dryRunStdout: '' });
  for (const name of (keyRes.stdout || '').split(/\s+/).filter(Boolean)) {
    if (name.startsWith(`${BENCH_TAG_KEY}-`) && (!opts.runId || name.startsWith(opts.runId))) {
      exec.run('aws', ['ec2', 'delete-key-pair', '--region', region, '--key-name', name]);
    }
  }

  process.stdout.write('cleanup-only sweep complete.\n');
  return 0;
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

/**
 *  Print the help/usage banner to stdout.
 */
function printUsage() {
  process.stdout.write([
    'graviton_perf — benchmark a PR on a clean AWS Graviton core, file results to perf_results.',
    '',
    'Usage:',
    '  node src/scripts/graviton_perf.cjs <pr-number> [flags]',
    '',
    'Flags:',
    `  --instance-type <type>   Graviton .medium (default ${DEFAULTS.instanceType}); allowed: ${ALLOWED_INSTANCE_TYPES.join(', ')}`,
    '  --mode normal|deep       deep sets BENNY_DEEP=1 on the remote run (default normal)',
    `  --region <region>        AWS region (default ${DEFAULTS.region})`,
    '  --subnet-id <id>         subnet to launch in (auto-detected if omitted)',
    '  --my-ip <cidr>           SSH-ingress CIDR (default: resolved /32)',
    '  --harness-from <ref>     overlay the current scaling harness from <ref> (e.g. main)',
    '                           onto the PR checkout (bench PRs predating the suite)',
    `  --shutdown-minutes <n>   dead-man's-switch timer (default ${DEFAULTS.shutdownMinutes})`,
    '  --spot                   launch as a Spot instance (default on-demand)',
    '  --force                  re-measure even if perf_results already has this (type, PR)',
    "  --keep                   skip teardown for debugging (dead-man's-switch still fires)",
    '  --cleanup-only           sweep+delete tagged resources; do not provision',
    '  --run-id <id>            override the generated run id (mainly with --cleanup-only)',
    '  --dry-run                print every aws/ssh/git/gh command; execute none',
    ''
  ].join('\n'));
}

/**
 *  CLI entry point.  Parses args, then (for a measurement run) resolves the PR,
 *  checks the dedup gate against `perf_results` and exits early if already
 *  measured, and otherwise hands off to the AWS orchestration.  `--cleanup-only`
 *  skips straight to the tag-based sweep.  This function only *prints* its plan
 *  under `--dry-run`; it spins up nothing.
 *
 *  The AWS-side provisioning/teardown is intentionally left as the live path
 *  this file documents but does not execute in tests; it is reached only with
 *  real credentials and no `--dry-run`.
 *
 *  @param argv Full `process.argv`.
 */
function main(argv) {
  const args = argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return 0;
  }

  let opts;
  try {
    opts = parseArgs(args);
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n\n`);
    printUsage();
    return 1;
  }

  const exec    = makeExecutor(opts.dryRun);
  const repoDir = process.cwd();

  if (opts.cleanupOnly) {
    return runCleanupOnly(exec, opts);
  }

  // Resolve the PR's head commit so we benchmark that PR's code, not main.
  const { headRefName, headRefOid } = resolvePr(exec, DEFAULTS.ghRepo, opts.prNumber);
  process.stdout.write(`PR #${opts.prNumber}: ${headRefName} @ ${headRefOid}\n`);

  // Dedup gate: measure a given (instance-type, PR) at most once.
  const existing = listPerfResultsPaths(exec, repoDir);
  const decision = decideMeasure(existing, opts.instanceType, opts.prNumber, opts.force);
  process.stdout.write(`dedup: ${decision.reason}\n`);
  if (!decision.measure) {
    process.stdout.write('exiting early without provisioning (already measured).\n');
    return 0;
  }

  return runMeasurement(exec, opts, { headRefName, headRefOid, repoDir });
}

module.exports = {
  // pure logic (unit-tested)
  parseArgs,
  validateInstanceType,
  makeRunId,
  perfResultPathForSlug,
  perfResultDirForSlug,
  releaseSlug,
  decideMeasureSlug,
  perfResultPath,
  perfResultDir,
  decideMeasure,
  buildMeta,
  tagSpec,
  tagFilter,
  buildUserData,
  buildRemoteScript,
  buildDetachedUserData,
  quoteForDisplay,
  summarizeFinalInstanceState,
  // seams / orchestration (exercised via --dry-run, not unit-tested against AWS)
  makeExecutor,
  listPerfResultsPaths,
  publishPerfResults,
  pushPerfResults,
  resolvePr,
  resolveSubnet,
  provision,
  teardown,
  runMeasurement,
  runCleanupOnly,
  main,
  // constants
  ALLOWED_INSTANCE_TYPES,
  DEFAULTS,
  AL2023_ARM64_SSM_PARAM,
  BENCH_TAG_KEY,
  PERF_PUSH_PAT_SSM_PARAM,
  PERF_INSTANCE_PROFILE
};

if (require.main === module) {
  process.exit(main(process.argv));
}
