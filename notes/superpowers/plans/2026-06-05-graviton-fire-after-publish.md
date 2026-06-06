# Fire-and-forget Graviton benchmark after publish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After `npm publish` in the `release` job, fire a Graviton benchmark of the just-released version that the EC2 instance runs entirely on its own (build → benny → profile → push results → self-terminate), letting the GitHub Actions run finish immediately.

**Architecture:** Add a `--detached --release <version> --commit <sha>` mode to `src/scripts/graviton_perf.cjs` that provisions one tagged EC2 instance with a self-contained user-data script and an IAM instance profile, then returns without SSH/wait/teardown. Results are keyed `release-<version>` on the `perf_results` branch. The `release` job gains an OIDC-creds step and a non-blocking fire step (both gated on a secret so they no-op until AWS is set up). All new logic is factored into pure, unit-tested builders behind the existing executor seam.

**Tech Stack:** Node `.cjs` (CommonJS), vitest (globals; `.spec.ts` loads the `.cjs` via `createRequire`), AWS CLI v2 (on the instance + the runner), GitHub Actions, `aws-actions/configure-aws-credentials@v4`.

**Spec:** `notes/superpowers/specs/2026-06-05-graviton-fire-after-publish-design.md`

---

## File structure

- **Modify** `src/scripts/graviton_perf.cjs` — add constants, CLI flags+validation, release-slug keying helpers, `buildDetachedUserData`, `buildDetachedRunInstancesArgs`, `provisionDetached`, `runDetached`, `main()` routing, docblocks/usage, exports.
- **Modify** `src/scripts/tests/graviton_perf.spec.ts` — add describe blocks for every new pure function.
- **Modify** `.github/workflows/nodejs.yml` — add the two `release`-job steps + job-level env. (The `bump-jssm-viz` removal is already in the working tree and stays.)
- **Create** `notes/superpowers/graviton-ci-aws-setup.md` — the user-owned AWS prerequisites (OIDC role, instance profile, SSM param, repo secret).

Conventions to follow (from the existing file): pure builders take a params object and `throw` on unsafe input (injection guards mirroring `buildRemoteScript`); side-effecting functions take `exec` from `makeExecutor`; tests assert on substrings/identifiers (no golden files); every exported entity gets a DocBlock.

---

## Task 1: CLI flags + validation for detached release mode

**Files:**
- Modify: `src/scripts/graviton_perf.cjs` (constants block ~L86; `parseArgs` ~L111-175; `module.exports` ~L1213)
- Test: `src/scripts/tests/graviton_perf.spec.ts`

- [ ] **Step 1: Write failing tests** — append to the spec file:

```ts
describe('parseArgs — detached release mode', () => {

  const sha = 'a'.repeat(40);

  test('accepts --detached with --release and --commit', () => {
    const o = gp.parseArgs(['--detached', '--release', '5.141.5', '--commit', sha]);
    expect(o.detached).toBe(true);
    expect(o.release).toBe('5.141.5');
    expect(o.commit).toBe(sha);
    expect(o.prNumber).toBeUndefined();
  });

  test('--detached + --mode deep still sets deep', () => {
    const o = gp.parseArgs(['--detached', '--release', '5.1.0', '--commit', sha, '--mode', 'deep']);
    expect(o.deep).toBe(true);
  });

  test('--detached rejects a PR positional', () => {
    expect(() => gp.parseArgs(['677', '--detached', '--release', '5.1.0', '--commit', sha]))
      .toThrow(/not a PR/);
  });

  test('--detached requires --release', () => {
    expect(() => gp.parseArgs(['--detached', '--commit', sha])).toThrow(/requires --release/);
  });

  test('--detached requires --commit', () => {
    expect(() => gp.parseArgs(['--detached', '--release', '5.1.0'])).toThrow(/requires --commit/);
  });

  test('--detached rejects a non-hex commit', () => {
    expect(() => gp.parseArgs(['--detached', '--release', '5.1.0', '--commit', 'nope']))
      .toThrow(/hex SHA/);
  });

  test('--detached rejects an unsafe release string', () => {
    expect(() => gp.parseArgs(['--detached', '--release', 'a b;c', '--commit', sha]))
      .toThrow(/version string/);
  });

  test('--release/--commit are rejected without --detached', () => {
    expect(() => gp.parseArgs(['677', '--release', '5.1.0'])).toThrow(/only valid with --detached/);
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/scripts/tests/graviton_perf.spec.ts`
Expected: FAIL (new tests; `o.detached` undefined / no validation messages).

- [ ] **Step 3: Add the two constants** after `BENCH_TAG_KEY` (~L86):

```js
/** SSM SecureString holding the contents:write PAT the instance uses to push perf_results. */
const PERF_PUSH_PAT_SSM_PARAM = '/jssm/perf-push-pat';

/** IAM instance profile attached to the detached instance so it can read PERF_PUSH_PAT_SSM_PARAM. */
const PERF_INSTANCE_PROFILE = 'jssm-graviton-perf';
```

- [ ] **Step 4: Extend `parseArgs`** — add to the `opts` initializer (after `dryRun : false`):

```js
    dryRun          : false,
    detached        : false,
    release         : undefined,
    commit          : undefined
```

Add these cases to the `switch` (next to `--dry-run`):

```js
      case '--detached'         : opts.detached = true; break;
      case '--release'          : opts.release  = needsValue(a, argv[++i]); break;
      case '--commit'           : opts.commit   = needsValue(a, argv[++i]); break;
```

Replace the final PR-required check (currently L169-172) with detached-aware validation:

```js
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
```

- [ ] **Step 5: Export the constants** — add `PERF_PUSH_PAT_SSM_PARAM` and `PERF_INSTANCE_PROFILE` to the `// constants` group in `module.exports`.

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run src/scripts/tests/graviton_perf.spec.ts`
Expected: PASS (all, including the pre-existing tests).

- [ ] **Step 7: Commit**

```
git add src/scripts/graviton_perf.cjs src/scripts/tests/graviton_perf.spec.ts
git commit -m "feat(graviton_perf): add --detached release-mode CLI flags + validation"
```

---

## Task 2: release-slug keying helpers (DRY with the PR path)

**Files:**
- Modify: `src/scripts/graviton_perf.cjs` (`perfResultPath`/`perfResultDir` ~L245-258; `decideMeasure` ~L280-295; exports)
- Test: `src/scripts/tests/graviton_perf.spec.ts`

- [ ] **Step 1: Write failing tests** — append:

```ts
describe('release-slug keying', () => {

  test('releaseSlug builds release-<version>', () => {
    expect(gp.releaseSlug('5.141.5')).toBe('release-5.141.5');
  });

  test('slug path/dir builders', () => {
    expect(gp.perfResultPathForSlug('c7g.medium', 'release-5.1.0', 'scaling.json'))
      .toBe('c7g.medium/release-5.1.0/scaling.json');
    expect(gp.perfResultDirForSlug('c7g.medium', 'release-5.1.0'))
      .toBe('c7g.medium/release-5.1.0');
  });

  test('PR helpers still build pr-<num> (unchanged API)', () => {
    expect(gp.perfResultPath('c7g.medium', 677, 'scaling.json')).toBe('c7g.medium/pr-677/scaling.json');
    expect(gp.perfResultDir('c7g.medium', 677)).toBe('c7g.medium/pr-677');
  });

  test('decideMeasureSlug skips an already-present release, force overrides', () => {
    const existing = ['c7g.medium/release-5.1.0/scaling.json'];
    expect(gp.decideMeasureSlug(existing, 'c7g.medium', 'release-5.1.0', false).measure).toBe(false);
    expect(gp.decideMeasureSlug(existing, 'c7g.medium', 'release-5.1.0', true).measure).toBe(true);
    expect(gp.decideMeasureSlug(existing, 'c7g.medium', 'release-5.2.0', false).measure).toBe(true);
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/scripts/tests/graviton_perf.spec.ts`
Expected: FAIL (`releaseSlug` etc. undefined).

- [ ] **Step 3: Refactor the keying helpers** — replace the bodies of `perfResultPath`/`perfResultDir` and add the slug primitives + `releaseSlug` (keep each function's existing DocBlock; add DocBlocks for the new ones):

```js
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

// perfResultPath/perfResultDir keep their public (instanceType, prNumber, ...) API,
// now expressed via the slug primitives.
function perfResultPath(instanceType, prNumber, filename) {
  return perfResultPathForSlug(instanceType, `pr-${prNumber}`, filename);
}

function perfResultDir(instanceType, prNumber) {
  return perfResultDirForSlug(instanceType, `pr-${prNumber}`);
}
```

- [ ] **Step 4: Generalize the dedup decision** — replace `decideMeasure` with a slug-based core plus the PR wrapper:

```js
/**
 *  Decide whether to measure a (instanceType, slug) target or skip it as already
 *  measured: if any path under `<instanceType>/<slug>/` exists on perf_results,
 *  skip unless `force`. The slug is `pr-<n>` or `release-<v>`.
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

/** PR-keyed dedup decision (unchanged public API), expressed via the slug core. */
function decideMeasure(existingPaths, instanceType, prNumber, force) {
  return decideMeasureSlug(existingPaths, instanceType, `pr-${prNumber}`, force);
}
```

- [ ] **Step 5: Export the new helpers** — add `perfResultPathForSlug`, `perfResultDirForSlug`, `releaseSlug`, `decideMeasureSlug` to the pure-logic export group.

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run src/scripts/tests/graviton_perf.spec.ts`
Expected: PASS (including the unchanged `perfResultPath`/`decideMeasure` tests).

- [ ] **Step 7: Commit**

```
git add src/scripts/graviton_perf.cjs src/scripts/tests/graviton_perf.spec.ts
git commit -m "refactor(graviton_perf): slug-based perf_results keying with release-<version> support"
```

---

## Task 3: `buildDetachedUserData` — the self-contained instance script

**Files:**
- Modify: `src/scripts/graviton_perf.cjs` (add after `buildRemoteScript`, ~L487; exports)
- Test: `src/scripts/tests/graviton_perf.spec.ts`

- [ ] **Step 1: Write failing tests** — append:

```ts
describe('buildDetachedUserData — self-contained release run', () => {

  const ok = {
    repoUrl: 'https://github.com/StoneCypher/jssm.git',
    commitSha: 'a'.repeat(40),
    release: '5.141.5',
    instanceType: 'c7g.medium',
    region: 'us-east-1',
    shutdownMinutes: 30,
    ssmParam: '/jssm/perf-push-pat'
  };

  test('arms the dead-man\'s-switch and ends by self-terminating', () => {
    const s = gp.buildDetachedUserData({ ...ok, deep: false });
    expect(s.startsWith('#!/bin/bash')).toBe(true);
    expect(s).toContain('shutdown -h +30');   // backstop
    expect(s).toContain('shutdown -h now');    // explicit self-terminate at the end
  });

  test('checks out the exact commit and builds dist via make', () => {
    const s = gp.buildDetachedUserData({ ...ok, deep: false });
    expect(s).toContain(`git checkout ${'a'.repeat(40)}`);
    expect(s).toContain('npm run make');
  });

  test('normal vs deep benny gate', () => {
    expect(gp.buildDetachedUserData({ ...ok, deep: false })).toContain('npm run benny:scaling');
    expect(gp.buildDetachedUserData({ ...ok, deep: false })).not.toContain('BENNY_DEEP=1');
    expect(gp.buildDetachedUserData({ ...ok, deep: true })).toContain('BENNY_DEEP=1 npm run benny:scaling');
  });

  test('includes the bounded profiled construct pass', () => {
    const s = gp.buildDetachedUserData({ ...ok, deep: false });
    expect(s).toContain('node --prof');
    expect(s).toContain('--prof-process');
    expect(s).toContain('jssm.es5.nonmin.cjs');
  });

  test('fetches the PAT from SSM and pushes with the token, to the release dir', () => {
    const s = gp.buildDetachedUserData({ ...ok, deep: false });
    expect(s).toContain('aws ssm get-parameter');
    expect(s).toContain('/jssm/perf-push-pat');
    expect(s).toContain('x-access-token:${TOKEN}@github.com/StoneCypher/jssm.git');
    expect(s).toContain('c7g.medium/release-5.141.5');
  });

  test('writes a meta.json stamped arm64 + release', () => {
    const s = gp.buildDetachedUserData({ ...ok, deep: false });
    expect(s).toContain('"arch": "arm64"');
    expect(s).toContain('"release": "5.141.5"');
  });

  test('retries the perf_results push on non-fast-forward', () => {
    const s = gp.buildDetachedUserData({ ...ok, deep: false });
    expect(s).toContain('git rebase origin/perf_results');
  });

  test('rejects an unsafe commit SHA', () => {
    expect(() => gp.buildDetachedUserData({ ...ok, commitSha: 'a; rm -rf /', deep: false }))
      .toThrow(/unsafe commit/);
  });

  test('rejects an unsafe release string', () => {
    expect(() => gp.buildDetachedUserData({ ...ok, release: 'a;b', deep: false }))
      .toThrow(/unsafe release/);
  });

  test('rejects an unsafe region', () => {
    expect(() => gp.buildDetachedUserData({ ...ok, region: 'us east 1', deep: false }))
      .toThrow(/unsafe region/);
  });

  test('rejects an unsafe ssm param name', () => {
    expect(() => gp.buildDetachedUserData({ ...ok, ssmParam: 'a;b', deep: false }))
      .toThrow(/unsafe ssm/);
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/scripts/tests/graviton_perf.spec.ts`
Expected: FAIL (`buildDetachedUserData` undefined).

- [ ] **Step 3: Implement `buildDetachedUserData`** — add after `buildRemoteScript`:

```js
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
    'for i in 1 2 3 4 5 6; do',
    '  if git -C "$RESULTS" push origin perf_results; then break; fi',
    '  git -C "$RESULTS" fetch origin perf_results || true',
    '  git -C "$RESULTS" rebase origin/perf_results || { git -C "$RESULTS" rebase --abort; echo "JSSM_PERF: rebase conflict"; break; }',
    'done',
    '',
    'echo JSSM_PERF_DONE',
    '',
    '# 8. Self-terminate (shutdown-behavior=terminate drops the volume).',
    'shutdown -h now',
    ''
  ].join('\n');
}
```

- [ ] **Step 4: Export it** — add `buildDetachedUserData` to the pure-logic export group.

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/scripts/tests/graviton_perf.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```
git add src/scripts/graviton_perf.cjs src/scripts/tests/graviton_perf.spec.ts
git commit -m "feat(graviton_perf): buildDetachedUserData self-contained instance script"
```

---

## Task 4: `buildDetachedRunInstancesArgs` — the launch arg builder

**Files:**
- Modify: `src/scripts/graviton_perf.cjs` (add near `provision`, ~L825; exports)
- Test: `src/scripts/tests/graviton_perf.spec.ts`

- [ ] **Step 1: Write failing tests** — append:

```ts
describe('buildDetachedRunInstancesArgs — no key, no SG ingress, instance profile', () => {

  const base = {
    region: 'us-east-1', amiId: 'ami-123', instanceType: 'c7g.medium',
    subnetId: 'subnet-abc', userDataPath: '/tmp/ud.sh', runId: 'jssm-perf-x',
    instanceProfile: 'jssm-graviton-perf', spot: false
  };

  test('attaches the instance profile and self-terminates on shutdown', () => {
    const a = gp.buildDetachedRunInstancesArgs(base);
    const joined = a.join(' ');
    expect(joined).toContain('--iam-instance-profile');
    expect(joined).toContain('Name=jssm-graviton-perf');
    expect(joined).toContain('--instance-initiated-shutdown-behavior terminate');
    expect(joined).toContain('file:///tmp/ud.sh');
  });

  test('uses no key pair and no security-group ingress (SSH-less)', () => {
    const joined = gp.buildDetachedRunInstancesArgs(base).join(' ');
    expect(joined).not.toContain('--key-name');
    expect(joined).not.toContain('--security-group-ids');
  });

  test('tags the instance for sweepability', () => {
    const joined = gp.buildDetachedRunInstancesArgs(base).join(' ');
    expect(joined).toContain('jssm-perf-run');
    expect(joined).toContain('Value=jssm-perf-x');
  });

  test('--spot injects one-time terminate market options', () => {
    const joined = gp.buildDetachedRunInstancesArgs({ ...base, spot: true }).join(' ');
    expect(joined).toContain('--instance-market-options');
    expect(joined).toContain('SpotInstanceType=one-time');
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/scripts/tests/graviton_perf.spec.ts`
Expected: FAIL (`buildDetachedRunInstancesArgs` undefined).

- [ ] **Step 3: Implement it** — add before `provision`:

```js
/**
 *  Build the `aws ec2 run-instances` argv for a detached release run. Differs
 *  from the PR-path launch: an IAM instance profile is attached (so the box can
 *  read the SSM PAT), and there is NO key pair and NO security group — the run is
 *  SSH-less, so the subnet's default (egress-only) security group suffices.
 *
 *  @param p `{ region, amiId, instanceType, subnetId, userDataPath, runId,
 *         instanceProfile, spot }`.
 *  @returns The argv array for `exec.run('aws', argv)`.
 *
 *  @example
 *  buildDetachedRunInstancesArgs({ region:'us-east-1', amiId:'ami-1',
 *    instanceType:'c7g.medium', subnetId:'subnet-1', userDataPath:'/tmp/ud.sh',
 *    runId:'jssm-perf-x', instanceProfile:'jssm-graviton-perf', spot:false })
 *    .includes('--iam-instance-profile') // => true
 */
function buildDetachedRunInstancesArgs(p) {
  const args = [
    'ec2', 'run-instances', '--region', p.region,
    '--image-id', p.amiId,
    '--instance-type', p.instanceType,
    '--subnet-id', p.subnetId,
    '--associate-public-ip-address',
    '--iam-instance-profile', `Name=${p.instanceProfile}`,
    '--instance-initiated-shutdown-behavior', 'terminate',
    '--block-device-mappings',
      '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":10,"VolumeType":"gp3","DeleteOnTermination":true}}]',
    '--metadata-options', 'HttpTokens=required,HttpEndpoint=enabled',
    '--tag-specifications', tagSpec('instance', p.runId),
    '--user-data', `file://${p.userDataPath}`,
    '--count', '1',
    '--query', 'Instances[0].InstanceId', '--output', 'text'
  ];
  if (p.spot) {
    args.splice(args.length - 2, 0,
      '--instance-market-options',
      'MarketType=spot,SpotOptions={SpotInstanceType=one-time,InstanceInterruptionBehavior=terminate}');
  }
  return args;
}
```

- [ ] **Step 4: Export** `buildDetachedRunInstancesArgs` (pure-logic group).

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/scripts/tests/graviton_perf.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```
git add src/scripts/graviton_perf.cjs src/scripts/tests/graviton_perf.spec.ts
git commit -m "feat(graviton_perf): buildDetachedRunInstancesArgs launch builder"
```

---

## Task 5: `provisionDetached` + `runDetached` + `main()` routing

**Files:**
- Modify: `src/scripts/graviton_perf.cjs` (add functions near `runMeasurement` ~L1077; `main` ~L1173-1211; exports)
- Test: `src/scripts/tests/graviton_perf.spec.ts`

These are side-effecting (they call `exec`); per the file's convention they are exercised via a fake/dry-run `exec`, never against live AWS.

- [ ] **Step 1: Write failing tests** — append:

```ts
describe('provisionDetached / runDetached — fire and walk away', () => {

  // Fake exec that records calls and returns canned stdout per aws subcommand.
  const fakeExec = () => {
    const calls: string[] = [];
    const run = (cmd: string, args: string[]) => {
      calls.push([cmd, ...args].join(' '));
      const a = args.join(' ');
      if (a.includes('ssm get-parameter')) { return { status: 0, stdout: 'ami-abc', stderr: '' }; }
      if (a.includes('describe-vpcs'))      { return { status: 0, stdout: 'vpc-abc', stderr: '' }; }
      if (a.includes('describe-subnets'))   { return { status: 0, stdout: 'subnet-abc', stderr: '' }; }
      if (a.includes('run-instances'))      { return { status: 0, stdout: 'i-abc', stderr: '' }; }
      return { status: 0, stdout: '', stderr: '' };
    };
    return { exec: { run, dryRun: false }, calls };
  };

  const opts = {
    detached: true, release: '5.1.0', commit: 'a'.repeat(40),
    instanceType: 'c7g.medium', region: 'us-east-1', mode: 'normal', deep: false,
    shutdownMinutes: 30, spot: false, force: false
  };

  test('provisionDetached launches one tagged instance and records its id', () => {
    const h = fakeExec();
    const state = { runId: 'jssm-perf-x', region: 'us-east-1', instanceType: 'c7g.medium',
                    tmpDir: require('os').tmpdir() };
    gp.provisionDetached(h.exec, opts, state);
    expect(state.instanceId).toBe('i-abc');
    expect(h.calls.some((c) => c.includes('run-instances'))).toBe(true);
    expect(h.calls.some((c) => c.includes('--iam-instance-profile'))).toBe(true);
  });

  test('runDetached never tears down (no terminate / no wait)', () => {
    const h = fakeExec();
    const code = gp.runDetached(h.exec, opts);
    expect(code).toBe(0);
    expect(h.calls.some((c) => c.includes('terminate-instances'))).toBe(false);
    expect(h.calls.some((c) => c.includes('wait instance-terminated'))).toBe(false);
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/scripts/tests/graviton_perf.spec.ts`
Expected: FAIL (`provisionDetached`/`runDetached` undefined).

- [ ] **Step 3: Implement the two functions** — add after `runMeasurement`:

```js
/**
 *  Provision exactly one detached instance: resolve AMI + subnet, write the
 *  self-contained user-data, and launch it with an instance profile, no key pair,
 *  and no security group. No SSH, no waiting. Records `instanceId` into `state`.
 *
 *  @param exec An executor from {@link makeExecutor}.
 *  @param opts Parsed options (detached release run).
 *  @param state Mutable run-state `{ runId, region, instanceType, tmpDir }`.
 *  @returns The same `state`, populated with `amiId`, `subnetId`, `instanceId`.
 */
function provisionDetached(exec, opts, state) {
  const { region, instanceType, runId, tmpDir } = state;

  const amiRes = exec.run('aws', [
    'ssm', 'get-parameter', '--region', region,
    '--name', AL2023_ARM64_SSM_PARAM, '--query', 'Parameter.Value', '--output', 'text'
  ], { dryRunStdout: 'ami-DRYRUN' });
  state.amiId = (amiRes.stdout || '').trim() || 'ami-DRYRUN';

  state.subnetId = resolveSubnet(exec, region, opts.subnetId);

  const userDataPath = path.join(tmpDir, 'userdata-detached.sh');
  if (!exec.dryRun) {
    fs.writeFileSync(userDataPath, buildDetachedUserData({
      repoUrl         : DEFAULTS.repoUrl,
      commitSha       : opts.commit,
      release         : opts.release,
      instanceType    : instanceType,
      region          : region,
      deep            : opts.deep,
      shutdownMinutes : opts.shutdownMinutes,
      ssmParam        : PERF_PUSH_PAT_SSM_PARAM
    }));
  }

  const instRes = exec.run('aws', buildDetachedRunInstancesArgs({
    region, amiId: state.amiId, instanceType, subnetId: state.subnetId,
    userDataPath, runId, instanceProfile: PERF_INSTANCE_PROFILE, spot: opts.spot
  }), { dryRunStdout: 'i-DRYRUN' });
  state.instanceId = (instRes.stdout || '').trim() || 'i-DRYRUN';

  process.stdout.write(
    `fired detached graviton bench: instance=${state.instanceId} release=${opts.release} ` +
    `commit=${opts.commit} subnet=${state.subnetId} ami=${state.amiId}\n`
  );
  return state;
}

/**
 *  Fire-and-forget release run: provision one instance that does the whole job and
 *  self-terminates, then return immediately. Deliberately registers NO signal
 *  handlers and runs NO teardown — the instance must outlive this process; its
 *  dead-man's-switch + `shutdown -h now` reclaim it.
 *
 *  @param exec An executor from {@link makeExecutor}.
 *  @param opts Parsed options (detached release run).
 *  @returns Process exit code (0 once the instance is launched).
 */
function runDetached(exec, opts) {
  const runId  = opts.runId || makeRunId();
  const tmpDir = exec.dryRun
    ? path.join(os.tmpdir(), `jssm-perf-${runId}`)
    : fs.mkdtempSync(path.join(os.tmpdir(), 'jssm-perf-detached-'));
  const state = { runId, region: opts.region, instanceType: opts.instanceType, tmpDir };

  try {
    provisionDetached(exec, opts, state);
    process.stdout.write(
      `not waiting on the runner; the instance publishes results to perf_results at ` +
      `${perfResultDirForSlug(opts.instanceType, releaseSlug(opts.release))}/ and self-terminates.\n` +
      `(reclaim a stuck run with: node src/scripts/graviton_perf.cjs --cleanup-only --run-id ${runId} --region ${opts.region})\n`
    );
    return 0;
  } catch (e) {
    process.stderr.write(`detached launch failed: ${e.message}\n`);
    return 1;
  }
}
```

- [ ] **Step 4: Route `main()`** — add the detached branch right after the `cleanupOnly` branch (~L1193):

```js
  if (opts.cleanupOnly) {
    return runCleanupOnly(exec, opts);
  }

  if (opts.detached) {
    // Cheap dedup against perf_results by release slug (no AWS spend).
    const existing = listPerfResultsPaths(exec, repoDir);
    const decision = decideMeasureSlug(existing, opts.instanceType, releaseSlug(opts.release), opts.force);
    process.stdout.write(`dedup: ${decision.reason}\n`);
    if (!decision.measure) {
      process.stdout.write('exiting early without provisioning (already measured).\n');
      return 0;
    }
    return runDetached(exec, opts);
  }
```

- [ ] **Step 5: Export** `provisionDetached` and `runDetached` (seam/orchestration group).

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run src/scripts/tests/graviton_perf.spec.ts`
Expected: PASS.

- [ ] **Step 7: Verify the dry-run walk by hand**

Run: `node src/scripts/graviton_perf.cjs --detached --release 5.1.0 --commit aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa --dry-run`
Expected: prints `[dry-run] aws ... run-instances ... --iam-instance-profile Name=jssm-graviton-perf ...`, a `dedup:` line, the "not waiting" message, and exits 0. No `terminate-instances` line appears.

- [ ] **Step 8: Commit**

```
git add src/scripts/graviton_perf.cjs src/scripts/tests/graviton_perf.spec.ts
git commit -m "feat(graviton_perf): detached fire-and-forget release run + main routing"
```

---

## Task 6: Docblocks, usage banner, header

**Files:**
- Modify: `src/scripts/graviton_perf.cjs` (header ~L3-42; `printUsage` ~L1134-1158; `parseArgs` DocBlock ~L92-110)

- [ ] **Step 1: Update the file header DocBlock** — add a second usage line and a note under the existing PR usage:

```js
 *  Usage:
 *
 *      node src/scripts/graviton_perf.cjs <pr-number> [flags]        # benchmark a PR
 *      node src/scripts/graviton_perf.cjs --detached --release <v> --commit <sha>  # fire-and-forget release run (CI)
 *
 *  The PR form drives the run from this machine over SSH. The `--detached` form
 *  launches one instance that runs the whole job itself (build, benchmark, push to
 *  perf_results under `<type>/release-<v>/`, self-terminate) and returns at once —
 *  used by the release workflow after npm publish. It needs an AWS instance profile
 *  ({@link PERF_INSTANCE_PROFILE}) and an SSM PAT ({@link PERF_PUSH_PAT_SSM_PARAM});
 *  see notes/superpowers/graviton-ci-aws-setup.md.
```

- [ ] **Step 2: Update `printUsage`** — add the detached flags to the banner:

```js
    '  --detached               fire-and-forget release run: launch an instance that',
    '                           self-runs/publishes/terminates, then return immediately',
    '  --release <version>      (with --detached) version label for release-<v> keying',
    '  --commit <sha>           (with --detached) exact commit to benchmark',
```

(Insert these right after the `--dry-run` line, before the closing `''`.)

- [ ] **Step 3: Update the `parseArgs` DocBlock** — note the detached targeting in `@throws` / add an `@example`:

```js
 *  parseArgs(['--detached','--release','5.1.0','--commit','a...']).detached // => true
```

- [ ] **Step 4: Sanity run** (docs-only, but confirm nothing broke)

Run: `npx vitest run src/scripts/tests/graviton_perf.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```
git add src/scripts/graviton_perf.cjs
git commit -m "docs(graviton_perf): document --detached release mode in header + usage"
```

---

## Task 7: Wire the release workflow

**Files:**
- Modify: `.github/workflows/nodejs.yml` (`release` job, ~L237-290)

The working tree already removed `bump-jssm-viz` and points `finish` at `needs: [release]`; leave that. Add a job-level env + two steps after "Publish to npm".

- [ ] **Step 1: Add a job-level `env` to the `release` job** — directly under `runs-on: ubuntu-latest` (and above the `permissions:` block):

```yaml
    runs-on: ubuntu-latest

    env:
      AWS_GRAVITON_OIDC_ROLE: ${{ secrets.AWS_GRAVITON_OIDC_ROLE }}
```

- [ ] **Step 2: Append two steps after the "Publish to npm" step** (after its `run: |` block, before the commented-out "Tweet notice"):

```yaml
    - name: Configure AWS credentials (OIDC)
      if: env.AWS_GRAVITON_OIDC_ROLE != ''
      continue-on-error: true
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: ${{ env.AWS_GRAVITON_OIDC_ROLE }}
        aws-region: us-east-1

    - name: Fire Graviton benchmark of the released version (non-blocking)
      if: env.AWS_GRAVITON_OIDC_ROLE != ''
      continue-on-error: true
      run: |
        node src/scripts/graviton_perf.cjs --detached --release "${TAG}" --commit "${GITHUB_SHA}"
```

Notes for the implementer:
- `TAG` is already exported into `$GITHUB_ENV` by the job's earlier "Export tag to envvars" step; `GITHUB_SHA` is a default GitHub env var (the released commit).
- The `release` job already declares `permissions: id-token: write` (npm OIDC), which `configure-aws-credentials` also requires — no permissions change needed.
- Both steps are gated on the secret existing and are `continue-on-error`, so until AWS is set up (or if a launch hiccups) the publish run still succeeds; it just skips/no-ops the benchmark.

- [ ] **Step 3: Validate YAML** — confirm the file still parses (indentation is the usual landmine):

Run: `node -e "require('js-yaml')" 2>$null; npx --yes js-yaml .github/workflows/nodejs.yml > $null`
Expected: no error (prints nothing). If `js-yaml` isn't available, instead run `node -e "const fs=require('fs');const s=fs.readFileSync('.github/workflows/nodejs.yml','utf8');if(!/Fire Graviton benchmark/.test(s))process.exit(1)"` to confirm the step landed.

- [ ] **Step 4: Commit**

```
git add .github/workflows/nodejs.yml
git commit -m "ci: fire detached graviton benchmark after npm publish (non-blocking)"
```

---

## Task 8: AWS setup notes doc

**Files:**
- Create: `notes/superpowers/graviton-ci-aws-setup.md`

- [ ] **Step 1: Write the doc** with the exact identities the script consumes:

````markdown
# Graviton CI benchmark — AWS setup (one-time)

The release workflow fires `graviton_perf.cjs --detached` after npm publish. It
needs three AWS objects + one GitHub secret. The script consumes them by name:

- SSM SecureString: `/jssm/perf-push-pat`  (constant `PERF_PUSH_PAT_SSM_PARAM`)
- IAM instance profile: `jssm-graviton-perf`  (constant `PERF_INSTANCE_PROFILE`)
- GitHub repo secret: `AWS_GRAVITON_OIDC_ROLE` = the OIDC role ARN

Until `AWS_GRAVITON_OIDC_ROLE` is set, the workflow steps are skipped (no-op).

## 1. SSM SecureString PAT

A fine-grained GitHub PAT with **Contents: read/write** on `StoneCypher/jssm`
only (used to push the `perf_results` branch):

```
aws ssm put-parameter --name /jssm/perf-push-pat --type SecureString \
  --value "<github-pat>" --region us-east-1
```

## 2. Instance profile (what the EC2 box becomes)

Role `jssm-graviton-perf-role` trusted by `ec2.amazonaws.com`, with one policy:

```json
{ "Version": "2012-10-17", "Statement": [
  { "Effect": "Allow", "Action": "ssm:GetParameter",
    "Resource": "arn:aws:ssm:us-east-1:<acct>:parameter/jssm/perf-push-pat" } ] }
```

Then an instance profile `jssm-graviton-perf` containing that role.

## 3. OIDC role (what the GitHub runner becomes)

Role assumed via GitHub OIDC; trust policy:

```json
{ "Version": "2012-10-17", "Statement": [
  { "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::<acct>:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike":   { "token.actions.githubusercontent.com:sub": "repo:StoneCypher/jssm:*" } } } ] }
```

Permissions policy:

```json
{ "Version": "2012-10-17", "Statement": [
  { "Effect": "Allow",
    "Action": ["ec2:RunInstances","ec2:CreateTags","ec2:DescribeSubnets","ec2:DescribeVpcs","ssm:GetParameter"],
    "Resource": "*" },
  { "Effect": "Allow", "Action": "iam:PassRole",
    "Resource": "arn:aws:iam::<acct>:role/jssm-graviton-perf-role" } ] }
```

Set the repo secret: `AWS_GRAVITON_OIDC_ROLE = arn:aws:iam::<acct>:role/<oidc-role>`.

## Notes

- The instance is SSH-less (no key pair, no ingress); it uses the subnet's
  default egress-only SG. It self-terminates via `shutdown -h now` + a
  `shutdown -h +<minutes>` dead-man's-switch, with `DeleteOnTermination` on its
  only volume — so a launch is the only billable action and it reaps itself.
- Results land on `perf_results` at `c7g.medium/release-<version>/`.
- Reclaim a stuck run: `node src/scripts/graviton_perf.cjs --cleanup-only --region us-east-1`.
````

- [ ] **Step 2: Commit**

```
git add notes/superpowers/graviton-ci-aws-setup.md
git commit -m "docs: AWS setup for the CI graviton benchmark (OIDC role, instance profile, SSM PAT)"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run the full graviton spec**

Run: `npx vitest run src/scripts/tests/graviton_perf.spec.ts`
Expected: PASS, all describe blocks (old + new).

- [ ] **Step 2: Lint / IDE diagnostics** on the modified `.cjs` and `.spec.ts` (per project rule: check `mcp__ide__getDiagnostics` before declaring done). Fix any warnings.

- [ ] **Step 3: Confirm the detached dry-run end to end**

Run: `node src/scripts/graviton_perf.cjs --detached --release 9.9.9 --commit aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa --dry-run`
Expected: `dedup:` line, `[dry-run] aws ... run-instances ... Name=jssm-graviton-perf ... file://...userdata-detached.sh`, the "not waiting" message, exit 0; no key/SG/terminate lines.

- [ ] **Step 4: Hand back for review.** Do NOT bump the version or run the full `npm run build` here — that happens once at PR time via `/sc-commit` on this branch (which also regenerates site/docs/changelog/readme).

---

## Self-review (author checklist — completed)

- **Spec coverage:** detached CLI (T1) ✓; release keying (T2) ✓; user-data build→benny→profile→SSM-PAT push→self-terminate (T3) ✓; SSH-less launch w/ instance profile (T4) ✓; fire-and-forget orchestration + dedup + routing (T5) ✓; docs (T6) ✓; workflow OIDC + non-blocking fire, bump-jssm-viz stays removed (T7) ✓; AWS prerequisites doc (T8) ✓; tests throughout + final verify (T9) ✓.
- **Placeholders:** none — every step carries real code/commands.
- **Type/name consistency:** `releaseSlug`, `perfResultDirForSlug`, `perfResultPathForSlug`, `decideMeasureSlug`, `buildDetachedUserData`, `buildDetachedRunInstancesArgs`, `provisionDetached`, `runDetached`, constants `PERF_PUSH_PAT_SSM_PARAM` / `PERF_INSTANCE_PROFILE` — names used identically across tasks and exports.
- **Out of scope:** PR flow, launcher, `npm run graviton_perf`, `build/graviton_perf.cjs` (stale copy) untouched; version bump + full build deferred to `/sc-commit`.
