'use strict';

/**
 *  Detached EC2 launcher for the FSM shootout — fire-and-forget, manual-only.
 *
 *  Launches one Graviton instance that clones THIS branch (`shootout`), runs
 *  `suite.cjs`, publishes `shootout.json` + `meta.json` to the `perf_results`
 *  branch under `shootout/<run-id>/`, and self-terminates.  Adapted from the
 *  proven detached path in main's `src/scripts/graviton_perf.cjs`: same
 *  dead-man's-switch, same SSM PAT, same instance profile, same publish-only-
 *  on-results guard, same non-fast-forward push retry.
 *
 *  Credentials: ambient AWS credentials (the shim workflow's OIDC role, or
 *  whoever runs it from CloudShell).  Nothing here triggers automatically —
 *  the only callers are the `workflow_dispatch` shim and a human.
 *
 *  Usage:
 *      node launch.cjs [--dry-run] [--region us-east-1]
 *                      [--instance-type c7g.medium] [--run-id <id>]
 *                      [--shutdown-minutes 90]
 *
 *  @example
 *  node launch.cjs --dry-run   // prints every aws call + user-data, spends nothing
 */

const { execFileSync } = require('child_process');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

const REPO_URL  = 'https://github.com/StoneCypher/jssm.git';
const SSM_PARAM = '/jssm/perf-push-pat';
const PROFILE   = 'jssm-graviton-perf';
const BRANCH    = 'shootout';

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------

function argValue(flag, dflt) {
  const i = process.argv.indexOf(flag);
  return (i !== -1 && process.argv[i + 1]) ? process.argv[i + 1] : dflt;
}

const dryRun          = process.argv.includes('--dry-run');
const region          = argValue('--region', 'us-east-1');
const instanceType    = argValue('--instance-type', 'c7g.medium');
const shutdownMinutes = parseInt(argValue('--shutdown-minutes', '90'), 10);
const runId           = argValue('--run-id',
  new Date().toISOString().replace(/:/g, '-').replace(/\..*$/, 'Z'));

if (!/^[\w-]+$/.test(region))            { throw new Error(`unsafe region "${region}"`); }
if (!/^[\w.-]+$/.test(instanceType))     { throw new Error(`unsafe instance type "${instanceType}"`); }
if (!/^[\w.TZ-]+$/.test(runId))          { throw new Error(`unsafe run id "${runId}"`); }
if (!Number.isInteger(shutdownMinutes) || shutdownMinutes < 10 || shutdownMinutes > 600) {
  throw new Error(`shutdown minutes out of range: ${shutdownMinutes}`);
}

// ---------------------------------------------------------------------------
// executor seam (dry-run prints instead of executing; mirrors graviton_perf)
// ---------------------------------------------------------------------------

function run(cmd, args) {
  const printable = `${cmd} ${args.join(' ')}`;
  if (dryRun) {
    console.log('[dry-run]', printable.length > 300 ? printable.slice(0, 300) + ' …' : printable);
    return '';
  }
  return execFileSync(cmd, args, { encoding: 'utf8' });
}

// ---------------------------------------------------------------------------
// user-data
// ---------------------------------------------------------------------------

const destDir = `shootout/${runId}`;
const authUrl = REPO_URL.replace('https://', 'https://x-access-token:${TOKEN}@');

const userData = [
  '#!/bin/bash',
  '# fsm shootout detached run — self-contained; no SSH, no client.',
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
  '# 2. Clone the shootout branch (self-contained project).',
  `git clone --depth 1 --branch ${BRANCH} ${REPO_URL} shootout`,
  'cd shootout',
  '',
  '# 3. Install pinned deps, gate on conformance, then run both measurements.',
  'npm ci --no-audit --no-fund',
  '#    Conformance gate: refuse to publish numbers for a broken adapter set.',
  'node conformance.cjs',
  '#    Throughput (benny) and memory (retained B/machine + alloc B/transition).',
  'node suite.cjs',
  'node --expose-gc memory.cjs',
  '#    Behavior battery (categorical semantics + differential conformance).',
  'node probes.cjs',
  '',
  '# 4. meta.json sidecar.',
  'cat > meta.json <<META',
  '{',
  `  "runId": "${runId}",`,
  `  "instanceType": "${instanceType}",`,
  '  "arch": "arm64",',
  `  "branch": "${BRANCH}",`,
  `  "region": "${region}",`,
  '  "commitSha": "$(git rev-parse HEAD)",',
  '  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",',
  '  "runner": "shootout/launch.cjs --detached"',
  '}',
  'META',
  '',
  '# 5. Publish — ONLY if the suite actually produced shootout.json.',
  'if [ -s shootout.json ]; then',
  `  TOKEN=$(aws ssm get-parameter --region ${region} --name "${SSM_PARAM}" --with-decryption --query Parameter.Value --output text)`,
  '  if [ -z "$TOKEN" ] || [ "$TOKEN" = "None" ]; then',
  '    echo "SHOOTOUT: no PAT from SSM; cannot publish"',
  '  else',
  `    AUTH_URL="${authUrl}"`,
  '    RESULTS=$(mktemp -d)',
  '    if ! git clone --depth 1 --branch perf_results "$AUTH_URL" "$RESULTS"; then',
  '      git clone --depth 1 "$AUTH_URL" "$RESULTS"',
  '      git -C "$RESULTS" checkout --orphan perf_results',
  '      git -C "$RESULTS" rm -rf --ignore-unmatch . || true',
  '    fi',
  `    mkdir -p "$RESULTS/${destDir}"`,
  `    cp shootout.json "$RESULTS/${destDir}/shootout.json"`,
  `    cp memory.json   "$RESULTS/${destDir}/memory.json"   || true`,
  `    cp behavior.json "$RESULTS/${destDir}/behavior.json" || true`,
  `    cp meta.json     "$RESULTS/${destDir}/meta.json"`,
  '    git -C "$RESULTS" config user.email "stonecypher@users.noreply.github.com"',
  '    git -C "$RESULTS" config user.name  "jssm shootout bot"',
  '    git -C "$RESULTS" add -A',
  `    git -C "$RESULTS" commit -m "shootout: ${instanceType} results for run ${runId}"`,
  '    cd "$RESULTS"',
  '    for i in 1 2 3 4 5 6; do',
  '      if git push origin perf_results; then break; fi',
  '      git fetch origin perf_results || true',
  '      git rebase origin/perf_results || { git rebase --abort; echo "SHOOTOUT: rebase conflict"; break; }',
  '    done',
  '    cd -',
  '  fi',
  'else',
  '  echo "SHOOTOUT: no shootout.json (suite failed); skipping publish"',
  'fi',
  '',
  'echo SHOOTOUT_DONE',
  '',
  '# 6. Self-terminate (shutdown-behavior=terminate drops the volume).',
  'shutdown -h now',
  '',
].join('\n');

// ---------------------------------------------------------------------------
// launch
// ---------------------------------------------------------------------------

console.log(`shootout launch — run ${runId} on ${instanceType} in ${region}${dryRun ? ' (dry run)' : ''}`);

// AL2023 ARM64 AMI via the public SSM alias (same alias the release runner uses).
const amiRaw = run('aws', ['ssm', 'get-parameter', '--region', region,
  '--name', '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64',
  '--query', 'Parameter.Value', '--output', 'text']);
const ami = dryRun ? 'ami-DRYRUN' : amiRaw.trim();

// Default VPC -> first subnet (same auto-detect the release runner performs).
const vpcRaw = run('aws', ['ec2', 'describe-vpcs', '--region', region,
  '--filters', 'Name=is-default,Values=true', '--query', 'Vpcs[0].VpcId', '--output', 'text']);
const vpc = dryRun ? 'vpc-DRYRUN' : vpcRaw.trim();

const subnetRaw = run('aws', ['ec2', 'describe-subnets', '--region', region,
  '--filters', `Name=vpc-id,Values=${vpc}`, '--query', 'Subnets[0].SubnetId', '--output', 'text']);
const subnet = dryRun ? 'subnet-DRYRUN' : subnetRaw.trim();

const udFile = path.join(os.tmpdir(), `shootout-userdata-${runId}.sh`);
fs.writeFileSync(udFile, userData);
console.log(`user-data written to ${udFile} (${userData.length} bytes)`);

const launched = run('aws', ['ec2', 'run-instances', '--region', region,
  '--image-id', ami,
  '--count', '1',
  '--instance-type', instanceType,
  '--iam-instance-profile', `Name=${PROFILE}`,
  '--instance-initiated-shutdown-behavior', 'terminate',
  '--subnet-id', subnet,
  '--user-data', `file://${udFile}`,
  '--tag-specifications',
  `ResourceType=instance,Tags=[{Key=Name,Value=jssm-shootout-${runId}},{Key=jssm-perf,Value=shootout}]`,
  '--query', 'Instances[0].InstanceId', '--output', 'text']);

if (dryRun) {
  console.log('[dry-run] no instance launched.  user-data preview:');
  console.log(userData.split('\n').slice(0, 18).join('\n'));
} else {
  console.log(`launched ${launched.trim()} — it will publish to perf_results:${destDir}/ and self-terminate.`);
}
