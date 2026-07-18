/**
 * graviton_envelope — a LEAN branch-vs-main timing verdict on real hardware.
 *
 * The full pipeline (`graviton_perf.cjs`) exists to feed the canonical perf
 * trail: deep scaling metrics, profile capture, nightly sync to the
 * `perf_results` branch — thorough, and correspondingly slow to answer the
 * one question a perf PR asks: "is HEAD faster than BASE?"  This script
 * answers exactly that, quickly:
 *
 *   - fires ONE detached self-terminating Graviton instance (reusing the big
 *     launcher's provisioning seams: executor, AMI/subnet resolution,
 *     run-instances args, instance profile, bucket);
 *   - the instance clones the repo once, checks BASE and HEAD out side by
 *     side, and benchmarks the COMMITTED dist of each (no rebuild — the
 *     /sc-commit + verify-version-bump policy makes committed dist
 *     release-state), running the general benny suite in strict A/B/A/B
 *     alternation so drift hits both sides equally;
 *   - computes per-case medians and deltas on-instance and uploads a compact
 *     `envelope.json` + `envelope.md` verdict to
 *     `s3://<bucket>/_envelopes/<runId>/` — an underscore prefix, so the
 *     nightly `perf_results_sync` (which excludes `_*`) NEVER lands envelope
 *     runs on the canonical trail;
 *   - with `--wait`, polls S3 for the verdict and prints the markdown, so a
 *     CI job (or a patient human) gets the answer in one command.
 *
 * Usage:
 *   node src/scripts/graviton_envelope.cjs --base <sha> --head <sha> \
 *     [--samples 3] [--instance-type c8g.medium] [--spot] [--wait]  \
 *     [--timeout-minutes 45] [--region us-east-1] [--subnet-id <id>] [--dry-run]
 *
 * Requires working `aws` credentials (CI/OIDC or CloudShell — never this
 * project's local box, where the aws CLI hangs).
 *
 * @see ./graviton_perf.cjs
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

/** S3 key prefix for envelope runs; underscore keeps it off the nightly sync. */
const ENVELOPE_PREFIX = '_envelopes';

/**
 * Dependency-free synchronous sleep: Atomics.wait on a throwaway buffer.
 * Injectable in {@link waitForVerdict} via `opts._sleep` for tests.
 *
 * @param ms Milliseconds to block.
 *
 * @example sync_sleep(1)  // blocks ~1ms, returns undefined
 */
function sync_sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * The S3 directory (bucket-relative) for one envelope run.
 *
 * @param runId The run id from {@link makeRunId} (or `--run-id`).
 * @returns A POSIX-style relative key prefix.
 *
 * @example envelopeDir('jssm-perf-x')  // => '_envelopes/jssm-perf-x'
 */
function envelopeDir(runId) {
  return `${ENVELOPE_PREFIX}/${runId}`;
}

/**
 * Parse CLI args for the envelope runner.
 *
 * @param argv Full process argv (`node script ...` — sliced internally).
 * @returns Options: `base`, `head` (40-hex SHAs, required), `samples`
 *   (default 3), `instanceType`, `region`, `spot`, `wait`, `timeoutMinutes`,
 *   `subnetId`, `runId`, `repoUrl`, `dryRun`.
 * @throws Error on unknown flags, missing/malformed SHAs, or a bad sample count.
 *
 * @example
 * parseEnvelopeArgs(['node','s','--base',a40,'--head',b40,'--spot']).spot  // => true
 */
function parseEnvelopeArgs(argv) {
  const opts = {
    base           : undefined,
    head           : undefined,
    samples        : 3,
    instanceType   : 'c8g.medium',
    region         : DEFAULTS.region || 'us-east-1',
    spot           : false,
    wait           : false,
    timeoutMinutes : 45,
    subnetId       : undefined,
    runId          : undefined,
    repoUrl        : 'https://github.com/StoneCypher/jssm.git',
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
    if      (a === '--base')            { opts.base = next(); }
    else if (a === '--head')            { opts.head = next(); }
    else if (a === '--samples')         { opts.samples = parseInt(next(), 10); }
    else if (a === '--instance-type')   { opts.instanceType = next(); }
    else if (a === '--region')          { opts.region = next(); }
    else if (a === '--spot')            { opts.spot = true; }
    else if (a === '--wait')            { opts.wait = true; }
    else if (a === '--timeout-minutes') { opts.timeoutMinutes = parseInt(next(), 10); }
    else if (a === '--subnet-id')       { opts.subnetId = next(); }
    else if (a === '--run-id')          { opts.runId = next(); }
    else if (a === '--repo-url')        { opts.repoUrl = next(); }
    else if (a === '--dry-run')         { opts.dryRun = true; }
    else { throw new Error(`unknown flag: ${a}`); }
  }

  for (const [label, sha] of [['--base', opts.base], ['--head', opts.head]]) {
    if (!sha || !/^[0-9a-f]{40}$/i.test(sha)) {
      throw new Error(`${label} requires a full 40-hex commit SHA; got "${sha}"`);
    }
  }
  if (!Number.isInteger(opts.samples) || opts.samples < 1 || opts.samples > 9) {
    throw new Error(`--samples must be an integer 1-9; got "${opts.samples}"`);
  }
  if (!Number.isInteger(opts.timeoutMinutes) || opts.timeoutMinutes < 1) {
    throw new Error(`--timeout-minutes must be a positive integer`);
  }
  validateInstanceType(opts.instanceType);
  return opts;
}

/**
 * The on-instance verdict computer, shipped inside the user-data as a
 * heredoc.  Exposed at module scope so its math is unit-testable without an
 * instance: given arrays of benny `general.json` payloads for each side,
 * returns per-case medians and head-vs-base deltas.
 *
 * @param baseRuns Array of parsed benny save files for the BASE side.
 * @param headRuns Same for the HEAD side.
 * @returns `{ cases: [{ name, base_ops, head_ops, delta_pct }], counts }`,
 *   cases sorted by delta ascending (regressions first); cases missing from
 *   either side are listed under `counts.only_base` / `counts.only_head`.
 *
 * @example
 * computeVerdict([{results:[{name:'t',ops:100}]}], [{results:[{name:'t',ops:110}]}])
 *   .cases[0].delta_pct  // => 10
 */
function computeVerdict(baseRuns, headRuns) {
  const median = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return (s.length % 2 === 1) ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };
  const collect = (runs) => {
    const by = new Map();
    for (const run of runs) {
      for (const r of run.results) {
        const arr = by.get(r.name);
        if (arr === undefined) { by.set(r.name, [r.ops]); } else { arr.push(r.ops); }
      }
    }
    return by;
  };

  const base = collect(baseRuns);
  const head = collect(headRuns);

  const cases = [];
  const only_base = [];
  const only_head = [];

  for (const [name, ops] of base) {
    const h = head.get(name);
    if (h === undefined) { only_base.push(name); continue; }
    const base_ops = median(ops);
    const head_ops = median(h);
    cases.push({ name, base_ops, head_ops, delta_pct: (head_ops - base_ops) / base_ops * 100 });
  }
  for (const name of head.keys()) {
    if (!base.has(name)) { only_head.push(name); }
  }

  cases.sort((a, b) => a.delta_pct - b.delta_pct);
  return { cases, counts: { compared: cases.length, only_base, only_head } };
}

/**
 * Render a {@link computeVerdict} result as the markdown the run uploads.
 *
 * @param verdict The verdict object.
 * @param meta `{ base, head, samples, instanceType }` provenance fields.
 * @returns A markdown table, regressions first.
 *
 * @example
 * renderVerdictMarkdown(v, {base:'a', head:'b', samples:3, instanceType:'c8g.medium'})
 *   // => '# jssm envelope: head b vs base a\n...'
 */
function renderVerdictMarkdown(verdict, meta) {
  const lines = [
    `# jssm envelope: head ${meta.head} vs base ${meta.base}`,
    '',
    `${meta.samples} interleaved samples/side on ${meta.instanceType} (medians).`,
    '',
    '| delta | base ops/s | head ops/s | case |',
    '|---:|---:|---:|---|'
  ];
  for (const c of verdict.cases) {
    const sign = c.delta_pct >= 0 ? '+' : '';
    lines.push(`| ${sign}${c.delta_pct.toFixed(1)}% | ${Math.round(c.base_ops)} | ${Math.round(c.head_ops)} | ${c.name} |`);
  }
  if (verdict.counts.only_base.length) { lines.push('', `only in base: ${verdict.counts.only_base.join(', ')}`); }
  if (verdict.counts.only_head.length) { lines.push('', `only in head: ${verdict.counts.only_head.join(', ')}`); }
  lines.push('');
  return lines.join('\n');
}

/**
 * Build the self-contained user-data script for one envelope run.  Mirrors
 * the hardened conventions of the big launcher's detached payload: dead-man
 * shutdown first, committed-dist guard (never rebuild-and-measure a
 * different artifact), loud `_envelopes/<runId>/FAILED.txt` marker on
 * failure, self-terminate last.
 *
 * @param params `{ repoUrl, baseSha, headSha, samples, region, bucket,
 *   runId, instanceType, shutdownMinutes }`.
 * @returns The bash user-data as one string.
 * @throws Error when any interpolated field fails its charset guard.
 *
 * @example
 * buildEnvelopeUserData({ repoUrl:'https://github.com/StoneCypher/jssm.git',
 *   baseSha:a40, headSha:b40, samples:3, region:'us-east-1',
 *   bucket:'jssm-perf-results-x', runId:'jssm-perf-1', instanceType:'c8g.medium',
 *   shutdownMinutes:90 })  // => '#!/bin/bash\n...'
 */
function buildEnvelopeUserData(params) {
  const { repoUrl, baseSha, headSha, samples, region, bucket, runId, instanceType, shutdownMinutes } = params;

  for (const [label, sha] of [['baseSha', baseSha], ['headSha', headSha]]) {
    if (!/^[0-9a-f]{40}$/i.test(String(sha))) {
      throw new Error(`refusing to build user-data: unsafe ${label} "${sha}"`);
    }
  }
  if (!/^[\w-]+$/.test(String(region)))         { throw new Error(`refusing to build user-data: unsafe region "${region}"`); }
  if (!/^[a-z0-9.-]{3,63}$/.test(String(bucket))) { throw new Error(`refusing to build user-data: unsafe bucket "${bucket}"`); }
  if (!/^https?:\/\/[\w./:@-]+$/.test(repoUrl))  { throw new Error(`refusing to build user-data: unsafe repo url "${repoUrl}"`); }
  if (!/^[\w-]+$/.test(String(runId)))           { throw new Error(`refusing to build user-data: unsafe run id "${runId}"`); }
  if (!Number.isInteger(samples) || samples < 1 || samples > 9) {
    throw new Error(`refusing to build user-data: unsafe samples "${samples}"`);
  }

  const dest = `s3://${bucket}/${envelopeDir(runId)}`;

  return [
    '#!/bin/bash',
    '# graviton_envelope detached A/B run — self-contained; no SSH, no client.',
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
    'fail () {',
    `  echo "$1" > FAILED.txt`,
    `  aws s3 cp FAILED.txt "${dest}/FAILED.txt" --region ${region} || echo "JSSM_ENVELOPE: FAILED marker upload also failed"`,
    '  shutdown -h now',
    '}',
    '',
    '# 2. One clone, two side-by-side checkouts of the COMMITTED trees.',
    `git clone ${repoUrl} jssm || fail "clone failed"`,
    'cd jssm',
    `git worktree add ../base ${baseSha} || fail "base checkout failed"`,
    `git worktree add ../head ${headSha} || fail "head checkout failed"`,
    'cd /root',
    '',
    '# 3. Harness deps per side (benny is a devDependency); never rebuild —',
    '#    the committed dist is release-state by the /sc-commit policy, so we',
    '#    measure the shipped bytes, exactly like the canonical runner.',
    'for side in base head; do',
    '  cd /root/$side',
    '  npm install --no-audit --no-fund || fail "$side npm install failed"',
    '  if [ ! -s dist/jssm.es5.cjs ]; then fail "$side has no committed dist; refusing to rebuild-and-measure"; fi',
    'done',
    '',
    '# 4. Strict A/B/A/B alternation so machine drift hits both sides equally.',
    `for i in $(seq 1 ${samples}); do`,
    '  for side in base head; do',
    '    cd /root/$side',
    '    node ./src/buildjs/benchmark.cjs || fail "$side benchmark sample $i failed"',
    '    mv benchmark/results/general.json /root/${side}_${i}.json || fail "$side sample $i produced no general.json"',
    '  done',
    'done',
    'cd /root',
    '',
    '# 5. Verdict: per-case medians + deltas, computed on-instance.',
    'cat > envelope_verdict.cjs <<\'VERDICT\'',
    'const fs = require("fs");',
    `const S = ${samples};`,
    'const load = (side) => { const out = []; for (let i = 1; i <= S; ++i) { out.push(JSON.parse(fs.readFileSync(`/root/${side}_${i}.json`, "utf8"))); } return out; };',
    `const { computeVerdict, renderVerdictMarkdown } = require("/root/head/src/scripts/graviton_envelope.cjs");`,
    'const verdict = computeVerdict(load("base"), load("head"));',
    `const meta = { base: "${baseSha}", head: "${headSha}", samples: S, instanceType: "${instanceType}" };`,
    'fs.writeFileSync("/root/envelope.json", JSON.stringify({ meta, verdict }, null, 2));',
    'fs.writeFileSync("/root/envelope.md", renderVerdictMarkdown(verdict, meta));',
    'VERDICT',
    'node envelope_verdict.cjs || fail "verdict computation failed"',
    '',
    '# 6. Publish the verdict; raw samples ride along for reanalysis.',
    'UPLOADED=yes',
    `aws s3 cp envelope.md   "${dest}/envelope.md"   --region ${region} || UPLOADED=no`,
    `aws s3 cp envelope.json "${dest}/envelope.json" --region ${region} || UPLOADED=no`,
    'for f in /root/base_*.json /root/head_*.json; do',
    `  aws s3 cp "$f" "${dest}/samples/$(basename $f)" --region ${region} || echo "JSSM_ENVELOPE: sample upload failed; continuing"`,
    'done',
    'if [ "$UPLOADED" = "yes" ]; then',
    `  echo "JSSM_ENVELOPE: uploaded to ${dest}"`,
    'else',
    '  fail "verdict upload failed (check the instance profile s3:PutObject grant)"',
    'fi',
    '',
    'echo JSSM_ENVELOPE_DONE',
    '',
    '# 7. Self-terminate (shutdown-behavior=terminate drops the volume).',
    'shutdown -h now',
    ''
  ].join('\n');
}

/**
 * Fire the detached envelope instance.  Provisioning mirrors the big
 * launcher: AMI via SSM parameter, subnet auto-detect, spot optional.
 *
 * @param exec Executor from {@link makeExecutor}.
 * @param opts Parsed {@link parseEnvelopeArgs} options.
 * @returns `{ runId, instanceId, dest }`.
 * @throws Error when any aws step fails (surfaced by the executor).
 */
function fireEnvelope(exec, opts) {
  const runId  = opts.runId || makeRunId();
  const tmpDir = exec.dryRun
    ? path.join(os.tmpdir(), `jssm-envelope-${runId}`)
    : fs.mkdtempSync(path.join(os.tmpdir(), 'jssm-envelope-'));

  const amiRes = exec.run('aws', [
    'ssm', 'get-parameter', '--region', opts.region,
    '--name', AL2023_ARM64_SSM_PARAM, '--query', 'Parameter.Value', '--output', 'text'
  ], { dryRunStdout: 'ami-DRYRUN' });
  const amiId = (amiRes.stdout || '').trim() || 'ami-DRYRUN';

  const subnetId = resolveSubnet(exec, opts.region, opts.subnetId);

  const userDataPath = path.join(tmpDir, 'userdata-envelope.sh');
  if (!exec.dryRun) {
    fs.writeFileSync(userDataPath, buildEnvelopeUserData({
      repoUrl         : opts.repoUrl,
      baseSha         : opts.base,
      headSha         : opts.head,
      samples         : opts.samples,
      region          : opts.region,
      bucket          : PERF_RESULTS_BUCKET,
      runId,
      instanceType    : opts.instanceType,
      shutdownMinutes : Math.max(opts.timeoutMinutes + 15, 60)
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

  const instanceId = (runRes.stdout || '').trim();
  const dest = `s3://${PERF_RESULTS_BUCKET}/${envelopeDir(runId)}`;
  process.stdout.write(`fired envelope run ${runId} (instance ${instanceId}); verdict lands at ${dest}/envelope.md\n`);
  return { runId, instanceId, dest };
}

/**
 * Poll S3 until the run's `envelope.md` (or `FAILED.txt`) appears, then print
 * the verdict to stdout.
 *
 * @param exec Executor from {@link makeExecutor}.
 * @param opts Parsed options (`region`, `timeoutMinutes`).
 * @param dest The run's `s3://...` directory from {@link fireEnvelope}.
 * @returns 0 when the verdict arrived, 1 on failure marker, 2 on timeout.
 */
function waitForVerdict(exec, opts, dest) {
  const deadline = Date.now() + opts.timeoutMinutes * 60_000;
  const POLL_MS  = 30_000;
  const sleep    = opts._sleep ?? sync_sleep;

  for (;;) {
    const ok = exec.run('aws', ['s3', 'cp', `${dest}/envelope.md`, '-', '--region', opts.region],
                        { dryRunStdout: '# dry-run verdict' });
    if (ok.status === 0) {
      process.stdout.write(`${ok.stdout}\n`);
      return 0;
    }
    const failed = exec.run('aws', ['s3', 'cp', `${dest}/FAILED.txt`, '-', '--region', opts.region], {});
    if (failed.status === 0) {
      process.stdout.write(`envelope run FAILED: ${failed.stdout}\n`);
      return 1;
    }
    if (exec.dryRun) { return 0; }
    if (Date.now() >= deadline) {
      process.stdout.write(`envelope verdict did not arrive within ${opts.timeoutMinutes} minutes; ` +
                           `check ${dest} later or the instance console\n`);
      return 2;
    }
    sleep(POLL_MS);
  }
}

/**
 * CLI entry point.
 *
 * @param argv Full process argv.
 * @returns Process exit code.
 */
function main(argv) {
  let opts;
  try {
    opts = parseEnvelopeArgs(argv);
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.stderr.write('usage: node graviton_envelope.cjs --base <sha> --head <sha> [--samples 3] ' +
                         '[--instance-type c8g.medium] [--spot] [--wait] [--timeout-minutes 45] ' +
                         '[--region r] [--subnet-id s] [--run-id id] [--repo-url u] [--dry-run]\n');
    return 1;
  }

  const exec = makeExecutor(opts.dryRun);
  const { dest } = fireEnvelope(exec, opts);
  if (opts.wait) { return waitForVerdict(exec, opts, dest); }
  return 0;
}

module.exports = {
  ENVELOPE_PREFIX,
  envelopeDir,
  sync_sleep,
  parseEnvelopeArgs,
  computeVerdict,
  renderVerdictMarkdown,
  buildEnvelopeUserData,
  fireEnvelope,
  waitForVerdict,
  main
};

if (require.main === module) {
  process.exit(main(process.argv));
}
