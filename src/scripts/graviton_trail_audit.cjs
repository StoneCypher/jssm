/**
 * graviton_trail_audit — re-measure historical releases with proper interleaving
 * to characterize the perf trail's NOISE FLOOR.
 *
 * The canonical perf trail (`perf_results` branch, one point per release) is
 * built from ONE-SHOT spot-instance runs: each release is measured exactly once,
 * on its own freshly-provisioned Graviton core, at a different wall-clock moment
 * from every other release.  That is cheap and unbiased in expectation, but a
 * single sample carries the full run-to-run variance of the machine — so an
 * apparent regression between two adjacent releases can be measurement noise
 * rather than a real code change.  The lean A/B tool (`graviton_envelope.cjs`),
 * which interleaves two SHAs on ONE instance, has repeatedly disagreed with the
 * trail's one-shot deltas (fsl#1959), which is exactly the symptom of trail
 * noise.
 *
 * This tool quantifies that noise.  It:
 *
 *   - resolves N historical releases from the SAME trail source
 *     `make_perf_chart.cjs` reads (the `perf_results` branch's `release-<v>`
 *     runs), via `--versions` (explicit list, `lo..hi` range, `last:N`, or
 *     `all`);
 *   - partitions them ROUND-ROBIN across `--instances` instances, so each
 *     instance's slice spans the whole version range instead of a contiguous
 *     code era — that keeps instance identity from being confounded with code
 *     era (an era-contiguous slice would let "instance 3 is slow" masquerade as
 *     "the 5.161 era regressed");
 *   - has each instance clone once, check out its slice's release TAGS side by
 *     side as worktrees (skipping any whose committed tree lacks
 *     `dist/jssm.es5.cjs` — the same guard the envelope uses), then run the
 *     general benny suite in STRICT interleaved rotation
 *     (v1,v2,…,vk, v1,v2,…,vk, … repeated `--samples` times) so machine drift
 *     hits every version in the slice equally;
 *   - computes per-version per-case medians + sample spread on-instance and
 *     uploads `instance-<i>.json` to `s3://<bucket>/_trail_audit/<runId>/` — an
 *     underscore prefix, so the nightly `perf_results_sync` (which excludes
 *     `_*`) NEVER lands audit runs on the canonical trail (identical reasoning
 *     to the envelope's `_envelopes/` prefix);
 *   - with `--wait`, polls S3 until every instance file lands, reads each
 *     selected release's RECORDED value back from the trail (the same
 *     `general.json` schema, fetched with the same git machinery
 *     `make_perf_chart.cjs` uses), and emits `audit.md` + `audit.json`
 *     (worst-disagreement table first) to the same prefix, printing the
 *     markdown.
 *
 * WHAT IS MEASURED vs WHAT IS COMPARED.  Like the envelope, the audit runs the
 * GENERAL suite (`src/buildjs/benchmark.cjs` → `general.json`).  The comparison
 * baseline is therefore each release's RECORDED `general.json` on the trail,
 * read with the same fetch/parse/run-keying `make_perf_chart.cjs` uses.  The
 * chart itself plots `scaling.json`, but `general.json` shares the identical
 * `{version,date,results:[{name,ops}]}` schema and lives in the same run
 * directory; comparing audited general-suite medians against scaling-suite
 * values would be a category error (disjoint case-name sets).  So "the same
 * recorded values the chart plots" is honored at the level of machinery, schema,
 * and run-keying — reading the file that matches what the audit measures.
 *
 * Usage:
 *   node src/scripts/graviton_trail_audit.cjs --versions <spec> [--samples 5] \
 *     [--instances 10] [--instance-type c8g.medium] [--spot] [--wait]        \
 *     [--timeout-minutes 120] [--region us-east-1] [--subnet-id <id>]        \
 *     [--i-know] [--dry-run]
 *
 * `--versions` accepts: `5.162.7,5.162.33` (list), `5.160.0..5.162.33` (range),
 * `last:20` (the 20 newest trail releases), or `all`.
 *
 * Requires working `aws` credentials (CI/OIDC or CloudShell — never this
 * project's local box, where the aws CLI hangs).
 *
 * @see ./graviton_envelope.cjs
 * @see ./graviton_perf.cjs
 * @see ./make_perf_chart.cjs
 */

'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');

const {
  makeExecutor,
  makeRunId,
  resolveSubnet,
  buildDetachedRunInstancesArgs,
  validateInstanceType,
  AL2023_ARM64_SSM_PARAM,
  PERF_RESULTS_BUCKET,
  PERF_INSTANCE_PROFILE,
  DEFAULTS
} = require('./graviton_perf.cjs');

const { semver_compare, collect_runs, make_executor: makeChartExecutor } = require('./make_perf_chart.cjs');

/** S3 key prefix for audit runs; the underscore keeps it off the nightly sync. */
const TRAIL_AUDIT_PREFIX = '_trail_audit';

/**
 * The trail file whose recorded values the audit compares against.  The audit
 * measures the general benny suite, so the baseline is the release's recorded
 * `general.json` (same schema as the `scaling.json` the chart plots).
 */
const TRAIL_BASELINE_FILE = 'general.json';

/**
 * Guardrail ceiling: an audit is refused (absent `--i-know`) when any one
 * instance would run more than this many benny suite passes, since suite passes
 * dominate both runtime and spend.
 */
const MAX_SUITE_PASSES_PER_INSTANCE = 50;

// Rough per-phase minute costs for the upfront plan estimate.  Deliberately
// conservative and clearly-labeled estimates, NOT measurements — the real
// numbers come off the instances.
/** Fixed per-instance overhead: boot + Node/git install + one clone (minutes). */
const EST_INSTANCE_BASE_MINUTES     = 4;
/** Per-version worktree setup, dominated by `npm install` of the harness (minutes). */
const EST_PER_VERSION_SETUP_MINUTES = 2;
/** One general-suite pass over one checkout (minutes). */
const EST_SUITE_PASS_MINUTES        = 3;

/** A safe release/version token for interpolation into the boot script. */
const SAFE_VERSION_RE = /^[\w.+-]+$/;

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested; no side effects)
// ---------------------------------------------------------------------------

/**
 * Dependency-free synchronous sleep via `Atomics.wait` on a throwaway buffer.
 * Injectable in {@link waitForAudit} through `opts._sleep` for tests.
 *
 * @param ms Milliseconds to block.
 *
 * @example sync_sleep(1)  // blocks ~1ms, returns undefined
 */
function sync_sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * The bucket-relative S3 directory for one audit run.
 *
 * @param runId The run id from {@link makeRunId} (or `--run-id`).
 * @returns A POSIX-style relative key prefix under the underscore prefix.
 *
 * @example auditDir('jssm-perf-x')  // => '_trail_audit/jssm-perf-x'
 */
function auditDir(runId) {
  return `${TRAIL_AUDIT_PREFIX}/${runId}`;
}

/**
 * Parse a `--versions` spec into a resolution descriptor, WITHOUT consulting the
 * trail (so it is unit-testable in isolation).  {@link selectVersions} then
 * applies the descriptor to a concrete trail version list.
 *
 * Accepted forms:
 *   - `all`                      → `{ kind: 'all' }`
 *   - `last:N` (N ≥ 1)           → `{ kind: 'last', n: N }`
 *   - `lo..hi` (two versions)    → `{ kind: 'range', lo, hi }`
 *   - `v1,v2,…` (comma list)     → `{ kind: 'list', versions: [...] }`
 *
 * @param spec The raw `--versions` value.
 * @returns The descriptor described above.
 * @throws Error on an empty spec, a non-positive/`NaN` `last:N`, a range whose
 *   endpoints are not both versions, or a list holding a non-version token.
 *
 * @example parseVersionSpec('last:20')            // => { kind: 'last', n: 20 }
 * @example parseVersionSpec('5.1.0..5.2.0').kind  // => 'range'
 * @example parseVersionSpec('5.1.0,5.2.0').versions.length // => 2
 */
function parseVersionSpec(spec) {
  const s = String(spec || '').trim();
  if (s === '') { throw new Error('--versions requires a value (list, lo..hi, last:N, or all)'); }

  if (s === 'all') { return { kind: 'all' }; }

  const lastMatch = s.match(/^last:(\d+)$/);
  if (lastMatch) {
    const n = parseInt(lastMatch[1], 10);
    if (!Number.isInteger(n) || n < 1) { throw new Error(`last:N requires a positive integer; got "${s}"`); }
    return { kind: 'last', n };
  }

  if (s.includes('..')) {
    const parts = s.split('..');
    if (parts.length !== 2 || !isVersion(parts[0]) || !isVersion(parts[1])) {
      throw new Error(`--versions range must be "lo..hi" with two versions; got "${s}"`);
    }
    const [lo, hi] = semver_compare(parts[0], parts[1]) <= 0 ? parts : [parts[1], parts[0]];
    return { kind: 'range', lo, hi };
  }

  const versions = s.split(',').map((v) => v.trim()).filter(Boolean);
  if (versions.length === 0) { throw new Error(`--versions list is empty; got "${s}"`); }
  for (const v of versions) {
    if (!isVersion(v)) { throw new Error(`--versions list holds a non-version token "${v}"`); }
  }
  return { kind: 'list', versions };
}

/** Whether a token is a dotted numeric version like `5.162.7`. */
function isVersion(v) {
  return /^\d+(\.\d+)+$/.test(String(v).trim());
}

/**
 * Apply a {@link parseVersionSpec} descriptor to the concrete trail version
 * list, yielding the versions to audit (ascending by semver) plus any requested
 * list-versions absent from the trail.
 *
 * Slicing is newest-first: `last:N` takes the N greatest versions.  Ranges are
 * inclusive on both ends.  A `list` is intersected with the trail when the trail
 * is known; when the trail list is empty (e.g. `--dry-run`, where no fetch runs)
 * a `list` is used as-is so the command plan can still be walked, and nothing is
 * reported missing.
 *
 * @param descriptor A descriptor from {@link parseVersionSpec}.
 * @param trailVersions Every release version present on the trail (any order).
 * @returns `{ selected, missing }` — `selected` ascending by semver, `missing`
 *   the requested list-versions not found on the trail (always `[]` for
 *   range/last/all, which are derived from the trail).
 *
 * @example
 * selectVersions({ kind: 'last', n: 2 }, ['5.1.0','5.2.0','5.3.0']).selected
 *   // => ['5.2.0', '5.3.0']
 */
function selectVersions(descriptor, trailVersions) {
  const trail    = [...(trailVersions || [])];
  const trailSet = new Set(trail);
  const asc      = (xs) => [...xs].sort(semver_compare);

  switch (descriptor.kind) {
    case 'all':
      return { selected: asc(trail), missing: [] };

    case 'last': {
      const newestFirst = [...trail].sort((a, b) => semver_compare(b, a));
      return { selected: asc(newestFirst.slice(0, descriptor.n)), missing: [] };
    }

    case 'range': {
      const inRange = trail.filter((v) =>
        semver_compare(v, descriptor.lo) >= 0 && semver_compare(v, descriptor.hi) <= 0);
      return { selected: asc(inRange), missing: [] };
    }

    case 'list': {
      if (trail.length === 0) {
        return { selected: asc(descriptor.versions), missing: [] };
      }
      const selected = descriptor.versions.filter((v) => trailSet.has(v));
      const missing  = descriptor.versions.filter((v) => !trailSet.has(v));
      return { selected: asc(selected), missing };
    }

    default:
      throw new Error(`unknown version-spec kind "${descriptor.kind}"`);
  }
}

/**
 * Partition versions ROUND-ROBIN across a fixed instance count: version at index
 * `j` (in the given order) is dealt to instance `j % instanceCount`.  Dealing
 * (rather than contiguous chunking) is the whole point — each instance's slice
 * then spans the full version range, so per-instance machine bias cannot be
 * mistaken for a per-era code effect.
 *
 * @param versions Versions to partition (pre-sorted ascending by the caller, so
 *   consecutive versions land on different instances).
 * @param instanceCount How many instances to deal across (≥ 1).
 * @returns An array of `instanceCount` slices; trailing slices may be empty when
 *   there are fewer versions than instances.
 * @throws Error when `instanceCount` is not a positive integer.
 *
 * @example
 * roundRobinPartition(['a','b','c','d','e'], 2)  // => [['a','c','e'], ['b','d']]
 */
function roundRobinPartition(versions, instanceCount) {
  if (!Number.isInteger(instanceCount) || instanceCount < 1) {
    throw new Error(`instanceCount must be a positive integer; got "${instanceCount}"`);
  }
  const slices = Array.from({ length: instanceCount }, () => []);
  versions.forEach((v, j) => { slices[j % instanceCount].push(v); });
  return slices;
}

/**
 * The strict interleaved rotation for one instance's slice: the slice repeated
 * `samples` times in order (v1,v2,…,vk, v1,v2,…,vk, …).  This is the sequence
 * the on-instance loop realizes; exposed so its ordering property is testable
 * without an instance.
 *
 * @param sliceVersions One instance's versions, in the order they will rotate.
 * @param samples How many full rotations to perform (≥ 1).
 * @returns The flat sequence of length `sliceVersions.length * samples`.
 *
 * @example
 * interleaveOrder(['a','b'], 3)  // => ['a','b','a','b','a','b']
 */
function interleaveOrder(sliceVersions, samples) {
  const order = [];
  for (let s = 0; s < samples; ++s) {
    for (const v of sliceVersions) { order.push(v); }
  }
  return order;
}

/**
 * Summary statistics over a list of per-sample ops values for one case.
 *
 * @param xs The ops values (one per interleaved sample); length ≥ 1.
 * @returns `{ n, median, min, max, mean, stdev }` — `stdev` is the SAMPLE
 *   standard deviation (n−1 denominator), `0` when `n` is 1.
 *
 * @example sampleStats([100, 110, 120]).median  // => 110
 */
function sampleStats(xs) {
  const sorted = [...xs].sort((a, b) => a - b);
  const n      = sorted.length;
  const mid    = Math.floor(n / 2);
  const median = (n % 2 === 1) ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const mean   = sorted.reduce((a, b) => a + b, 0) / n;
  const varN1  = n > 1 ? sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  return { n, median, min: sorted[0], max: sorted[n - 1], mean, stdev: Math.sqrt(varN1) };
}

/**
 * Reduce one instance's raw interleaved samples to per-version per-case stats.
 * Runs ON the instance (shipped inside the user-data), so it takes already-parsed
 * benny `general.json` payloads and returns a compact JSON-ready shape.
 *
 * @param perVersionSamples `{ [version]: generalJson[] }` — for each measured
 *   version, the array of that version's `samples` benny save files (each
 *   `{ results: [{ name, ops }] }`).
 * @returns `{ [version]: { cases: { [caseName]: { median, min, max, stdev, mean,
 *   n } } } }`.
 *
 * @example
 * aggregateInstanceSamples({ '5.1.0': [
 *   { results: [{ name: 't', ops: 100 }] },
 *   { results: [{ name: 't', ops: 120 }] } ] }).['5.1.0'].cases.t.median  // => 110
 */
function aggregateInstanceSamples(perVersionSamples) {
  const out = {};
  for (const [version, runs] of Object.entries(perVersionSamples)) {
    const byCase = new Map();
    for (const run of runs) {
      for (const r of (run.results || [])) {
        const arr = byCase.get(r.name);
        if (arr === undefined) { byCase.set(r.name, [r.ops]); } else { arr.push(r.ops); }
      }
    }
    const cases = {};
    for (const [name, ops] of byCase) { cases[name] = sampleStats(ops); }
    out[version] = { cases };
  }
  return out;
}

/**
 * Join every instance's per-version case stats against the trail's recorded
 * values into a single audit: one row per (version, case) that has a trail
 * baseline, sorted worst-disagreement first, plus the cases lacking a baseline
 * and the versions that were skipped.
 *
 * Disagreement is measured as `|ln(ratio)|` so a 2× and a ½× read as equally
 * bad; `ratio` is `audited_median / trail_value`.
 *
 * @param instanceResults Parsed `instance-<i>.json` objects, each
 *   `{ instance, versions: { [v]: { cases } }, skipped: [v] }`.
 * @param trailValues `{ [version]: { [caseName]: recordedOps } }` from the
 *   trail's `general.json` files.
 * @param meta Provenance `{ samples, instances, instanceType, runId }` echoed
 *   into the result and the rendered markdown.
 * @returns `{ rows, noBaseline, skipped, versionsAudited, summary, meta }`.
 *
 * @example
 * buildAudit(
 *   [{ instance: 0, versions: { '5.1.0': { cases: { t: { median: 120, stdev: 0, n: 1 } } } }, skipped: [] }],
 *   { '5.1.0': { t: 100 } },
 *   { samples: 1, instances: 1, instanceType: 'c8g.medium', runId: 'r' }
 * ).rows[0].ratio  // => 1.2
 */
function buildAudit(instanceResults, trailValues, meta) {
  const rows            = [];
  const noBaseline      = [];
  const skippedSet      = new Set();
  const versionsSet     = new Set();

  for (const ir of instanceResults) {
    for (const v of (ir.skipped || [])) { skippedSet.add(v); }
    for (const [version, vdata] of Object.entries(ir.versions || {})) {
      versionsSet.add(version);
      const baseline = (trailValues || {})[version] || {};
      for (const [caseName, st] of Object.entries(vdata.cases || {})) {
        const trailVal   = baseline[caseName];
        const spread_pct = st.median > 0 ? (st.stdev / st.median) * 100 : 0;
        const base = {
          version, case: caseName, instance: ir.instance,
          audited_median: st.median, min: st.min, max: st.max,
          stdev: st.stdev, spread_pct, n: st.n
        };
        if (typeof trailVal === 'number' && trailVal > 0) {
          const ratio = st.median / trailVal;
          rows.push({ ...base, trail_value: trailVal, ratio, disagreement: Math.abs(Math.log(ratio)) });
        } else {
          noBaseline.push(base);
        }
      }
    }
  }

  rows.sort((a, b) => b.disagreement - a.disagreement);

  const deviations = rows.map((r) => Math.abs(r.ratio - 1));
  const summary = {
    compared        : rows.length,
    no_baseline     : noBaseline.length,
    skipped         : skippedSet.size,
    versions        : versionsSet.size,
    worst_ratio     : rows.length ? rows[0].ratio : null,
    worst_case      : rows.length ? `${rows[0].case} @ ${rows[0].version}` : null,
    median_abs_dev  : deviations.length ? median_of(deviations) : 0,
    max_abs_dev     : deviations.length ? Math.max(...deviations) : 0
  };

  return {
    rows, noBaseline,
    skipped         : [...skippedSet].sort(semver_compare),
    versionsAudited : [...versionsSet].sort(semver_compare),
    summary, meta
  };
}

/** Median of a numeric list (used for the noise summary). */
function median_of(xs) {
  const s   = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return (s.length % 2 === 1) ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Render a {@link buildAudit} result as the markdown the run uploads: a noise
 * verdict, the worst-disagreement table first, then skipped versions and the
 * no-baseline case count.
 *
 * @param audit The audit object from {@link buildAudit}.
 * @param topN How many worst rows to table (default 40); the rest are summarized.
 * @returns The markdown string.
 *
 * @example
 * renderAuditMarkdown(buildAudit([], {}, { samples: 5, instances: 10,
 *   instanceType: 'c8g.medium', runId: 'r' })).startsWith('# jssm trail audit')  // => true
 */
function renderAuditMarkdown(audit, topN = 40) {
  const { summary, meta } = audit;
  const pct = (r) => `${((r - 1) * 100 >= 0 ? '+' : '')}${((r - 1) * 100).toFixed(1)}%`;

  const lines = [
    `# jssm trail audit: ${summary.versions} releases re-measured on ${meta.instanceType}`,
    '',
    `${meta.samples} interleaved samples/version across ${meta.instances} instances ` +
      `(run ${meta.runId}).`,
    '',
    `Noise floor: median |audited−trail| = ${(summary.median_abs_dev * 100).toFixed(1)}%, ` +
      `worst = ${(summary.max_abs_dev * 100).toFixed(1)}%` +
      (summary.worst_case ? ` on ${summary.worst_case}` : '') + '.',
    `${summary.compared} (version, case) pairs had a trail baseline; ` +
      `${summary.no_baseline} did not; ${summary.skipped} versions were skipped (no committed dist / no tag).`,
    '',
    '## Worst disagreements (audited median vs trail-recorded value)',
    '',
    '| audited/trail | audited ops/s | trail ops/s | sample spread | version | case |',
    '|---:|---:|---:|---:|---|---|'
  ];

  for (const r of audit.rows.slice(0, topN)) {
    lines.push(
      `| ${r.ratio.toFixed(3)} (${pct(r.ratio)}) | ${Math.round(r.audited_median)} | ` +
      `${Math.round(r.trail_value)} | ±${r.spread_pct.toFixed(1)}% (n=${r.n}) | ${r.version} | ${r.case} |`
    );
  }
  if (audit.rows.length > topN) {
    lines.push('', `…and ${audit.rows.length - topN} more compared pairs (see audit.json).`);
  }

  if (audit.skipped.length) {
    lines.push('', `Skipped versions: ${audit.skipped.join(', ')}`);
  }
  if (audit.noBaseline.length) {
    lines.push('', `${audit.noBaseline.length} audited (version, case) pairs had no trail baseline (release lacked general.json).`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Compute the upfront plan + guardrail decision for an audit.
 *
 * @param params `{ versionCount, samples, instances }`.
 * @returns `{ versionsPerInstance, suitePassesPerInstance, estInstanceMinutes,
 *   estWallClockMinutes, planLine, absurd }` — `versionsPerInstance` is the
 *   LARGEST slice (ceil), which bounds cost; `absurd` is set when
 *   `suitePassesPerInstance` exceeds {@link MAX_SUITE_PASSES_PER_INSTANCE}.
 *   Instances run in parallel, so `estWallClockMinutes ≈ estInstanceMinutes`.
 *
 * @example
 * buildPlan({ versionCount: 20, samples: 5, instances: 10 }).suitePassesPerInstance  // => 10
 */
function buildPlan(params) {
  const { versionCount, samples, instances } = params;
  const effInstances         = Math.max(1, Math.min(instances, versionCount || 1));
  const versionsPerInstance  = Math.ceil((versionCount || 0) / effInstances);
  const suitePassesPerInstance = versionsPerInstance * samples;
  const estInstanceMinutes   = EST_INSTANCE_BASE_MINUTES +
    versionsPerInstance * EST_PER_VERSION_SETUP_MINUTES +
    suitePassesPerInstance * EST_SUITE_PASS_MINUTES;

  const planLine =
    `plan: ${versionCount} versions × ${samples} samples across ${effInstances} instances ` +
    `(≤${versionsPerInstance} versions/instance, ≤${suitePassesPerInstance} suite passes/instance, ` +
    `~${estInstanceMinutes} min/instance est., instances run in parallel)`;

  return {
    versionsPerInstance,
    suitePassesPerInstance,
    estInstanceMinutes,
    estWallClockMinutes : estInstanceMinutes,
    planLine,
    absurd              : suitePassesPerInstance > MAX_SUITE_PASSES_PER_INSTANCE
  };
}

/**
 * Parse CLI args for the trail-audit runner.
 *
 * @param argv Full process argv (`node script …` — sliced internally).
 * @returns Options: `versionsSpec` (required), `samples` (default 5),
 *   `instances` (default 10), `instanceType`, `region`, `spot`, `wait`,
 *   `timeoutMinutes` (default 120), `subnetId`, `runId`, `repoUrl`, `iKnow`,
 *   `dryRun`, and the parsed `descriptor` from {@link parseVersionSpec}.
 * @throws Error on unknown flags, a missing/invalid `--versions`, a bad
 *   `--samples`/`--instances`/`--timeout-minutes`, or a rejected instance type.
 *
 * @example
 * parseAuditArgs(['node','s','--versions','last:20','--spot']).spot  // => true
 */
function parseAuditArgs(argv) {
  const opts = {
    versionsSpec   : undefined,
    samples        : 5,
    instances      : 10,
    instanceType   : 'c8g.medium',
    region         : DEFAULTS.region || 'us-east-1',
    spot           : false,
    wait           : false,
    timeoutMinutes : 120,
    subnetId       : undefined,
    runId          : undefined,
    repoUrl        : 'https://github.com/StoneCypher/jssm.git',
    iKnow          : false,
    dryRun         : false
  };

  const args = argv.slice(2);
  for (let i = 0; i < args.length; ++i) {
    const a = args[i];
    const next = () => {
      const v = args[++i];
      if (v === undefined) { throw new Error(`${a} requires a value`); }
      return v;
    };
    if      (a === '--versions')        { opts.versionsSpec = next(); }
    else if (a === '--samples')         { opts.samples = parseInt(next(), 10); }
    else if (a === '--instances')       { opts.instances = parseInt(next(), 10); }
    else if (a === '--instance-type')   { opts.instanceType = next(); }
    else if (a === '--region')          { opts.region = next(); }
    else if (a === '--spot')            { opts.spot = true; }
    else if (a === '--wait')            { opts.wait = true; }
    else if (a === '--timeout-minutes') { opts.timeoutMinutes = parseInt(next(), 10); }
    else if (a === '--subnet-id')       { opts.subnetId = next(); }
    else if (a === '--run-id')          { opts.runId = next(); }
    else if (a === '--repo-url')        { opts.repoUrl = next(); }
    else if (a === '--i-know')          { opts.iKnow = true; }
    else if (a === '--dry-run')         { opts.dryRun = true; }
    else { throw new Error(`unknown flag: ${a}`); }
  }

  if (!opts.versionsSpec) { throw new Error('--versions is required (list, lo..hi, last:N, or all)'); }
  opts.descriptor = parseVersionSpec(opts.versionsSpec);   // throws on a bad spec

  if (!Number.isInteger(opts.samples) || opts.samples < 1 || opts.samples > 9) {
    throw new Error(`--samples must be an integer 1-9; got "${opts.samples}"`);
  }
  if (!Number.isInteger(opts.instances) || opts.instances < 1 || opts.instances > 50) {
    throw new Error(`--instances must be an integer 1-50; got "${opts.instances}"`);
  }
  if (!Number.isInteger(opts.timeoutMinutes) || opts.timeoutMinutes < 1) {
    throw new Error('--timeout-minutes must be a positive integer');
  }
  validateInstanceType(opts.instanceType);
  return opts;
}

/**
 * Build the self-contained user-data for ONE audit instance: check out its slice
 * of release tags side by side, skip any without a committed `dist/jssm.es5.cjs`
 * (or a resolvable tag), run the general suite in strict interleaved rotation
 * `samples` times, compute per-version per-case stats on-instance, and upload
 * `instance-<i>.json` to `_trail_audit/<runId>/`.  Mirrors the envelope's
 * hardened conventions: dead-man shutdown first, committed-dist guard, loud
 * FAILED marker, self-terminate last.
 *
 * The on-instance stats step `require()`s {@link aggregateInstanceSamples} from
 * the CLONE's default-branch checkout (`/root/jssm`), never from a version
 * worktree — the historical releases predate this script.
 *
 * @param params `{ repoUrl, versions, samples, region, bucket, runId,
 *   instanceIndex, instanceType, shutdownMinutes }`.  `versions` is this
 *   instance's slice (each a release tag like `5.162.7`).
 * @returns The bash user-data as one string.
 * @throws Error when any interpolated field fails its charset guard, `versions`
 *   is empty, or `samples`/`instanceIndex` are out of range.
 *
 * @example
 * buildAuditUserData({ repoUrl: 'https://github.com/StoneCypher/jssm.git',
 *   versions: ['5.1.0','5.2.0'], samples: 5, region: 'us-east-1',
 *   bucket: 'jssm-perf-results-x', runId: 'jssm-perf-1', instanceIndex: 0,
 *   instanceType: 'c8g.medium', shutdownMinutes: 120 }).includes('shutdown -h now')  // => true
 */
function buildAuditUserData(params) {
  const { repoUrl, versions, samples, region, bucket, runId, instanceIndex, instanceType, shutdownMinutes } = params;

  if (!Array.isArray(versions) || versions.length === 0) {
    throw new Error('refusing to build user-data: empty version slice');
  }
  for (const v of versions) {
    if (!SAFE_VERSION_RE.test(String(v))) { throw new Error(`refusing to build user-data: unsafe version "${v}"`); }
  }
  if (!/^[\w-]+$/.test(String(region)))            { throw new Error(`refusing to build user-data: unsafe region "${region}"`); }
  if (!/^[a-z0-9.-]{3,63}$/.test(String(bucket)))  { throw new Error(`refusing to build user-data: unsafe bucket "${bucket}"`); }
  if (!/^https?:\/\/[\w./:@-]+$/.test(repoUrl))    { throw new Error(`refusing to build user-data: unsafe repo url "${repoUrl}"`); }
  if (!/^[\w-]+$/.test(String(runId)))             { throw new Error(`refusing to build user-data: unsafe run id "${runId}"`); }
  if (!Number.isInteger(samples) || samples < 1 || samples > 9) {
    throw new Error(`refusing to build user-data: unsafe samples "${samples}"`);
  }
  if (!Number.isInteger(instanceIndex) || instanceIndex < 0) {
    throw new Error(`refusing to build user-data: unsafe instanceIndex "${instanceIndex}"`);
  }

  const dest       = `s3://${bucket}/${auditDir(runId)}`;
  const instFile   = `instance-${instanceIndex}.json`;
  const versionStr = versions.join(' ');

  return [
    '#!/bin/bash',
    '# graviton_trail_audit detached interleaved re-measure — self-contained; no SSH, no client.',
    '',
    "# 0. Dead-man's-switch FIRST: even if everything below fails, the box dies.",
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
    `DEST="${dest}"`,
    'fail () {',
    '  echo "$1" > FAILED.txt',
    `  aws s3 cp FAILED.txt "$DEST/instance-${instanceIndex}.FAILED.txt" --region ${region} || echo "JSSM_TRAIL_AUDIT: FAILED marker upload also failed"`,
    '  shutdown -h now',
    '}',
    '',
    '# 2. One clone; the audit stats helper is required from THIS default-branch',
    '#    checkout (the historical releases predate the script).',
    `git clone ${repoUrl} jssm || fail "clone failed"`,
    '',
    `VERSIONS="${versionStr}"`,
    'rm -f /root/present.txt /root/skipped.txt',
    'touch /root/present.txt /root/skipped.txt',
    '',
    '# 3. Check out each release TAG as a worktree side by side. Skip (not fail)',
    '#    a version with no resolvable tag or no committed dist/jssm.es5.cjs —',
    '#    the same committed-dist guard the envelope uses; never rebuild-and-measure.',
    'cd /root/jssm',
    'for v in $VERSIONS; do',
    '  if git worktree add "/root/v-$v" "$v" 2>/dev/null || git worktree add "/root/v-$v" "v$v" 2>/dev/null; then',
    '    ( cd "/root/v-$v" && npm install --no-audit --no-fund ) || { echo "$v" >> /root/skipped.txt; git worktree remove --force "/root/v-$v" 2>/dev/null; continue; }',
    '    if [ ! -s "/root/v-$v/dist/jssm.es5.cjs" ]; then echo "$v" >> /root/skipped.txt; git worktree remove --force "/root/v-$v" 2>/dev/null; continue; fi',
    '    echo "$v" >> /root/present.txt',
    '  else',
    '    echo "$v" >> /root/skipped.txt',
    '  fi',
    'done',
    'cd /root',
    '',
    '# 4. STRICT interleaved rotation: the whole present slice, repeated --samples',
    '#    times (v1,v2,…,vk, v1,v2,…,vk, …), so machine drift hits every version equally.',
    `for i in $(seq 1 ${samples}); do`,
    '  while read -r v; do',
    '    [ -z "$v" ] && continue',
    '    cd "/root/v-$v"',
    '    node ./src/buildjs/benchmark.cjs || fail "benchmark of $v sample $i failed"',
    '    mv benchmark/results/general.json "/root/${v}__${i}.json" || fail "$v sample $i produced no general.json"',
    '    cd /root',
    '  done < /root/present.txt',
    'done',
    '',
    '# 5. Per-version per-case medians + spread, computed on-instance.',
    'cat > /root/audit_compute.cjs <<\'COMPUTE\'',
    'const fs = require("fs");',
    `const S = ${samples};`,
    'const read = (f) => fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\\n").map(s => s.trim()).filter(Boolean) : [];',
    'const present = read("/root/present.txt");',
    'const skipped = read("/root/skipped.txt");',
    'const { aggregateInstanceSamples } = require("/root/jssm/src/scripts/graviton_trail_audit.cjs");',
    'const perVersionSamples = {};',
    'for (const v of present) { const arr = []; for (let i = 1; i <= S; ++i) { arr.push(JSON.parse(fs.readFileSync(`/root/${v}__${i}.json`, "utf8"))); } perVersionSamples[v] = arr; }',
    'const versions = aggregateInstanceSamples(perVersionSamples);',
    `const out = { instance: ${instanceIndex}, samples: S, instanceType: "${instanceType}", versions, skipped };`,
    'fs.writeFileSync("/root/instance.json", JSON.stringify(out, null, 2));',
    'COMPUTE',
    'node /root/audit_compute.cjs || fail "instance aggregation failed"',
    '',
    '# 6. Publish this instance\'s verdict; raw samples ride along for reanalysis.',
    `aws s3 cp /root/instance.json "$DEST/${instFile}" --region ${region} || fail "instance upload failed"`,
    'for f in /root/*__*.json; do',
    `  aws s3 cp "$f" "$DEST/samples/instance-${instanceIndex}/$(basename "$f")" --region ${region} || echo "JSSM_TRAIL_AUDIT: sample upload failed; continuing"`,
    'done',
    '',
    'echo JSSM_TRAIL_AUDIT_DONE',
    '',
    '# 7. Self-terminate (shutdown-behavior=terminate drops the volume).',
    'shutdown -h now',
    ''
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Trail data collection (seamed; reuses make_perf_chart's fetch/parse)
// ---------------------------------------------------------------------------

/**
 * Enumerate the trail's RELEASE versions using the exact source
 * `make_perf_chart.cjs` reads (its {@link collect_runs} over `perf_results`).
 *
 * @param exec A CHART executor from `make_perf_chart`'s `make_executor` (the
 *   string-returning convention `collect_runs` expects — NOT graviton_perf's
 *   object-returning {@link makeExecutor}, which reads `opts.cwd` differently and
 *   whose `.run` returns `{stdout,status}` rather than a trimmed string).
 * @param repoDir Local repo directory to run git from.
 * @returns Release version strings (ascending by semver), or `[]` when the trail
 *   is unreachable/empty (e.g. `--dry-run`).
 */
function collectTrailVersions(exec, repoDir) {
  const runs = collect_runs(exec, repoDir);
  if (!runs) { return []; }
  return runs
    .filter((r) => r.kind === 'release' && r.release)
    .map((r) => r.release)
    .sort(semver_compare);
}

/**
 * Read each selected release's recorded baseline case values from the trail's
 * `general.json`, via the same git machinery `collect_runs` uses (`git show
 * FETCH_HEAD:<path>`).  A release lacking `general.json` (older backfills may) is
 * simply absent from the result — its cases then show as "no baseline".
 *
 * @param exec A CHART executor from `make_perf_chart`'s `make_executor` (the
 *   string-returning convention this reader expects; see
 *   {@link collectTrailVersions}).
 * @param repoDir Local repo directory to run git from.
 * @param versions The release versions to read.
 * @param instanceType Trail namespace, e.g. `c8g.medium`.
 * @returns `{ [version]: { [caseName]: ops } }` for versions whose
 *   `general.json` was found and parsed.
 */
function collectTrailValues(exec, repoDir, versions, instanceType) {
  exec.run('git', ['fetch', 'origin', 'perf_results'], { cwd: repoDir, allowFail: true, dryRunStdout: '' });

  const out = {};
  for (const v of versions) {
    const p   = `${instanceType}/release-${v}/${TRAIL_BASELINE_FILE}`;
    const raw = exec.run('git', ['show', `FETCH_HEAD:${p}`],
                         { cwd: repoDir, allowFail: true, dryRunStdout: '' });
    if (raw === null || raw === undefined || raw === '') { continue; }
    let data;
    try { data = JSON.parse(raw); } catch { continue; }
    const cases = {};
    for (const r of (data.results || [])) {
      if (r && typeof r.ops === 'number') { cases[r.name] = r.ops; }
    }
    out[v] = cases;
  }
  return out;
}

// ---------------------------------------------------------------------------
// AWS orchestration (side-effecting; walked under --dry-run, never live-tested)
// ---------------------------------------------------------------------------

/**
 * Fire the detached audit instances: resolve AMI + subnet once, then launch one
 * instance per NON-EMPTY round-robin slice (each self-runs and self-terminates).
 * Empty slices (fewer versions than instances) launch nothing.
 *
 * @param exec Executor from {@link makeExecutor}.
 * @param opts Parsed {@link parseAuditArgs} options.
 * @param selected The resolved versions to audit (ascending).
 * @returns `{ runId, dest, instances: [{ index, instanceId, versions }] }`.
 * @throws Error when an aws step fails (surfaced by the executor).
 */
function fireAudit(exec, opts, selected) {
  const runId  = opts.runId || makeRunId();
  const tmpDir = exec.dryRun
    ? path.join(os.tmpdir(), `jssm-trail-audit-${runId}`)
    : fs.mkdtempSync(path.join(os.tmpdir(), 'jssm-trail-audit-'));

  const slices = roundRobinPartition(selected, opts.instances).filter((s) => s.length > 0);

  const amiRes = exec.run('aws', [
    'ssm', 'get-parameter', '--region', opts.region,
    '--name', AL2023_ARM64_SSM_PARAM, '--query', 'Parameter.Value', '--output', 'text'
  ], { dryRunStdout: 'ami-DRYRUN' });
  const amiId = (amiRes.stdout || '').trim() || 'ami-DRYRUN';

  const subnetId = resolveSubnet(exec, opts.region, opts.subnetId);

  const plan            = buildPlan({ versionCount: selected.length, samples: opts.samples, instances: opts.instances });
  const shutdownMinutes = Math.max(opts.timeoutMinutes + 15, plan.estInstanceMinutes + 30, 60);

  const instances = [];
  slices.forEach((sliceVersions, index) => {
    const userDataPath = path.join(tmpDir, `userdata-audit-${index}.sh`);
    if (!exec.dryRun) {
      fs.writeFileSync(userDataPath, buildAuditUserData({
        repoUrl         : opts.repoUrl,
        versions        : sliceVersions,
        samples         : opts.samples,
        region          : opts.region,
        bucket          : PERF_RESULTS_BUCKET,
        runId,
        instanceIndex   : index,
        instanceType    : opts.instanceType,
        shutdownMinutes
      }));
    }

    const runRes = exec.run('aws', buildDetachedRunInstancesArgs({
      region          : opts.region,
      amiId,
      instanceType    : opts.instanceType,
      subnetId,
      instanceProfile : PERF_INSTANCE_PROFILE,
      runId,
      userDataPath,
      spot            : opts.spot
    }), { dryRunStdout: 'i-DRYRUN' });

    instances.push({ index, instanceId: (runRes.stdout || '').trim(), versions: sliceVersions });
  });

  const dest = `s3://${PERF_RESULTS_BUCKET}/${auditDir(runId)}`;
  process.stdout.write(
    `fired trail audit ${runId}: ${instances.length} instances, ${selected.length} versions; ` +
    `verdict lands at ${dest}/audit.md\n`
  );
  return { runId, dest, instances };
}

/**
 * Poll S3 until every instance's `instance-<i>.json` lands (or a FAILED marker
 * appears, or timeout), then aggregate against the trail baseline, upload
 * `audit.md` + `audit.json`, and print the markdown.
 *
 * @param exec AWS executor from {@link makeExecutor} (object-returning) for the
 *   S3 polling + artifact upload.
 * @param opts Parsed options (`region`, `timeoutMinutes`, `instanceType`,
 *   `samples`, `instances`).
 * @param ctx `{ dest, runId, instanceIndices, selected, repoDir, chartExec }` —
 *   `chartExec` is the string-returning `make_perf_chart` executor used to read
 *   the trail baseline (distinct from `exec`; the two conventions differ).
 * @returns 0 when the audit was assembled, 1 on a failure marker, 2 on timeout.
 */
function waitForAudit(exec, opts, ctx) {
  const { dest, runId, instanceIndices, selected, repoDir, chartExec } = ctx;
  const deadline = Date.now() + opts.timeoutMinutes * 60_000;
  const POLL_MS  = 30_000;
  const sleep    = opts._sleep ?? sync_sleep;

  const readJson = (key) => {
    const res = exec.run('aws', ['s3', 'cp', `${dest}/${key}`, '-', '--region', opts.region],
                         { dryRunStdout: '{}' });
    return res.status === 0 ? res.stdout : null;
  };

  for (;;) {
    const bodies = instanceIndices.map((i) => readJson(`instance-${i}.json`));
    if (bodies.every((b) => b !== null)) {
      const instanceResults = exec.dryRun
        ? []
        : bodies.map((b) => JSON.parse(b));
      const trailValues = collectTrailValues(chartExec, repoDir, selected, opts.instanceType);
      const audit = buildAudit(instanceResults, trailValues, {
        samples: opts.samples, instances: opts.instances, instanceType: opts.instanceType, runId
      });
      const md   = renderAuditMarkdown(audit);
      uploadAuditArtifacts(exec, opts, dest, md, audit);
      process.stdout.write(`${md}\n`);
      return 0;
    }

    for (const i of instanceIndices) {
      const failed = exec.run('aws', ['s3', 'cp', `${dest}/instance-${i}.FAILED.txt`, '-', '--region', opts.region], {});
      if (failed.status === 0) {
        process.stdout.write(`trail audit instance ${i} FAILED: ${failed.stdout}\n`);
        return 1;
      }
    }

    if (exec.dryRun) { return 0; }
    if (Date.now() >= deadline) {
      process.stdout.write(
        `trail audit did not complete within ${opts.timeoutMinutes} minutes; ` +
        `check ${dest} later or the instance consoles\n`);
      return 2;
    }
    sleep(POLL_MS);
  }
}

/**
 * Write `audit.md` + `audit.json` to a temp dir and upload both to the run's S3
 * prefix.  A no-op printer under `--dry-run`.
 *
 * @param exec Executor from {@link makeExecutor}.
 * @param opts Parsed options (`region`).
 * @param dest The run's `s3://…` directory.
 * @param md The rendered markdown.
 * @param audit The audit object (serialized to `audit.json`).
 */
function uploadAuditArtifacts(exec, opts, dest, md, audit) {
  if (exec.dryRun) {
    exec.run('aws', ['s3', 'cp', 'audit.md', `${dest}/audit.md`, '--region', opts.region]);
    exec.run('aws', ['s3', 'cp', 'audit.json', `${dest}/audit.json`, '--region', opts.region]);
    return;
  }
  const tmp    = fs.mkdtempSync(path.join(os.tmpdir(), 'jssm-trail-audit-out-'));
  const mdPath = path.join(tmp, 'audit.md');
  const jsPath = path.join(tmp, 'audit.json');
  try {
    fs.writeFileSync(mdPath, md);
    fs.writeFileSync(jsPath, JSON.stringify(audit, null, 2));
    exec.run('aws', ['s3', 'cp', mdPath, `${dest}/audit.md`,   '--region', opts.region], { allowFail: true });
    exec.run('aws', ['s3', 'cp', jsPath, `${dest}/audit.json`, '--region', opts.region], { allowFail: true });
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

/**
 * CLI entry point: parse args, resolve versions against the trail, print the
 * plan + guardrail, fire the instances, and (with `--wait`) assemble the audit.
 *
 * @param argv Full process argv.
 * @returns Process exit code (0 success; 1 on bad args, an empty selection, or a
 *   refused absurd plan; 1/2 propagated from {@link waitForAudit}).
 */
function main(argv) {
  let opts;
  try {
    opts = parseAuditArgs(argv);
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.stderr.write(
      'usage: node graviton_trail_audit.cjs --versions <list|lo..hi|last:N|all> ' +
      '[--samples 5] [--instances 10] [--instance-type c8g.medium] [--spot] [--wait] ' +
      '[--timeout-minutes 120] [--region r] [--subnet-id s] [--i-know] [--dry-run]\n');
    return 1;
  }

  // Two executors, one per convention: the AWS/orchestration seam uses
  // graviton_perf's object-returning executor; the trail reader reuses
  // make_perf_chart's string-returning executor (what collect_runs expects).
  const exec      = makeExecutor(opts.dryRun);
  const chartExec = makeChartExecutor(opts.dryRun);
  const repoDir   = path.join(__dirname, '..', '..');

  const trailVersions      = collectTrailVersions(chartExec, repoDir);
  const { selected, missing } = selectVersions(opts.descriptor, trailVersions);

  if (missing.length) {
    process.stderr.write(`not on the trail (skipped): ${missing.join(', ')}\n`);
  }
  if (selected.length === 0) {
    process.stderr.write('no versions to audit after resolving --versions against the trail\n');
    return 1;
  }

  const plan = buildPlan({ versionCount: selected.length, samples: opts.samples, instances: opts.instances });
  process.stdout.write(`${plan.planLine}\n`);
  if (plan.absurd && !opts.iKnow) {
    process.stderr.write(
      `refusing: ${plan.suitePassesPerInstance} suite passes/instance exceeds the ` +
      `${MAX_SUITE_PASSES_PER_INSTANCE} ceiling. Add more --instances, fewer --samples, ` +
      `a smaller --versions, or pass --i-know to proceed anyway.\n`);
    return 1;
  }

  const { dest, instances } = fireAudit(exec, opts, selected);
  if (opts.wait) {
    return waitForAudit(exec, opts, {
      dest, runId: dest.split('/').pop(),
      instanceIndices: instances.map((x) => x.index),
      selected, repoDir, chartExec
    });
  }
  return 0;
}

module.exports = {
  TRAIL_AUDIT_PREFIX,
  TRAIL_BASELINE_FILE,
  MAX_SUITE_PASSES_PER_INSTANCE,
  sync_sleep,
  auditDir,
  isVersion,
  parseVersionSpec,
  selectVersions,
  roundRobinPartition,
  interleaveOrder,
  sampleStats,
  aggregateInstanceSamples,
  buildAudit,
  renderAuditMarkdown,
  buildPlan,
  parseAuditArgs,
  buildAuditUserData,
  collectTrailVersions,
  collectTrailValues,
  fireAudit,
  waitForAudit,
  uploadAuditArtifacts,
  main
};

if (require.main === module) {
  process.exit(main(process.argv));
}
