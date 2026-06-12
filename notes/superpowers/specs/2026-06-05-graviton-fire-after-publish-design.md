# Fire-and-forget Graviton benchmark after npm publish — Design

**Date:** 2026-06-05
**Branch:** `feat_26-06-05_graviton-fire-after-publish`
**Status:** approved design, pending implementation plan

## Goal

After the `release` job publishes to npm, **fire** a Graviton benchmark of the
just-released version and let the GitHub Actions run **finish immediately** —
without waiting for, or checking the result of, the benchmark. The publish
pipeline must not stay open spending GitHub minutes waiting on the EC2 box.

## Why

The release pipeline is the natural place to capture a trustworthy ops/sec
number for every shipped version, measured on a clean dedicated ARM core (the
existing `graviton_perf` rationale). But the benchmark takes ~10 minutes of
boot + build + benchmark, and the runner does its waiting **client-side** (SSH
in, `scp` back, push results). Holding a GitHub-hosted runner open for that is
pure idle billing. The fix is to push *all* of that work onto the EC2 instance
itself and have the GitHub step return the instant `run-instances` succeeds.

## Current state (already in the repo)

- `src/scripts/graviton_perf.cjs` — mature orchestrator. **PR-based** (`<pr-number>`
  positional). Provisions a tagged Graviton instance, SSHes in, builds +
  `benny:scaling` + profiles, `scp`s results back, **pushes to the `perf_results`
  branch client-side** (`publishPerfResults`), then tears the instance down.
  Has `--dry-run`, `--cleanup-only`, `--mode deep`, `--harness-from`, an executor
  seam, and unit-tested pure helpers.
- `src/scripts/graviton_perf_launch.cjs` — **local** background launcher
  (`npm run graviton_perf -- <pr>`); detaches the runner on the user's machine.
  *Not* a CI mechanism.
- `src/scripts/tests/graviton_perf.spec.ts` — unit tests for the pure helpers.
- `package.json`: `"graviton_perf": "node ./src/scripts/graviton_perf_launch.cjs"`.
- Workflow `release` job: npm publish via OIDC. (This PR also keeps the
  separately-made edit that removes the `bump-jssm-viz` job; `finish` →
  `needs: [release]`.)

**Decision:** scripts stay at `src/scripts/` (already wired + tested; matches the
"permanent scripts live in `src/scripts/`" convention). No move.

## What's new: a detached release-benchmark mode

A new mode on `graviton_perf.cjs` that, unlike the PR flow, **provisions and walks
away** — the instance does the entire job, including the result push and its own
termination.

### CLI surface

```
node src/scripts/graviton_perf.cjs --detached --release <version> --commit <sha> [--mode deep] [--instance-type ...] [--region ...] [--dry-run]
```

- `--detached` — select the fire-and-forget path.
- `--release <version>` — the published version string (e.g. `5.141.5`); used
  only for **keying** results on `perf_results`.
- `--commit <sha>` — the exact commit to benchmark. Using the SHA (not the tag)
  sidesteps tag-format ambiguity (bare `5.141.5` vs `v5.141.5`).
- Reuses existing `--mode`, `--instance-type`, `--region`, `--shutdown-minutes`,
  `--spot`, `--dry-run`, `--force`.
- A `--detached` run **requires** `--release` and `--commit`, and **rejects** a
  PR number (the two targeting modes are mutually exclusive).

### Behavior

1. **Cheap client-side dedup** (no AWS spend): if `<instance-type>/release-<version>/`
   already exists on `perf_results`, skip and exit 0 — unless `--force`.
2. **Provision only** (no SSH): `aws ec2 run-instances` with
   - the fat user-data script (below),
   - an **IAM instance profile** attached (`--iam-instance-profile Name=<profile>`),
   - **no key pair** and **no SSH ingress** — the default VPC security group
     (egress-only) is sufficient,
   - the existing safety set: tags, IMDSv2, `--instance-initiated-shutdown-behavior
     terminate`, 10 GB gp3 `DeleteOnTermination`, dead-man's-switch in user-data.
3. **Return immediately.** Print the instance id + run id, then exit 0. No
   `wait`, no `scp`, no client-side teardown.

### The fat user-data script (runs entirely on the instance)

A new `buildDetachedUserData(params)` pure function returns a bash script that:

1. Arms the dead-man's-switch first (`shutdown -h +<minutes>` — backstop).
2. Installs Node 24 (NodeSource) + git (AL2023 already ships AWS CLI v2).
3. `git clone` jssm, `git checkout <sha>`.
4. `npm ci`, `npm run make`.
5. `benny:scaling` (or `BENNY_DEEP=1 …` when `--mode deep`).
6. Bounded `--prof` construct pass → `construct.prof.txt` (as today).
7. Builds `meta.json` (version, commit, instance type, arch, region, timestamp).
8. **Fetches the push PAT from SSM**:
   `aws ssm get-parameter --name <PERF_PUSH_PAT_SSM_PARAM> --with-decryption …`
   (read via the instance profile — the token never touches the GitHub runner).
9. **Pushes results to `perf_results`** under `<instance-type>/release-<version>/`,
   creating the orphan branch on first use, with the same non-fast-forward
   retry/rebase loop as `publishPerfResults` — re-expressed in bash. Authenticated
   as `https://x-access-token:$TOKEN@github.com/StoneCypher/jssm.git`.
10. `shutdown -h now` (terminates; volume drops via DeleteOnTermination).

This consolidates, on the instance, what `buildRemoteScript` (build/bench/profile)
and `publishPerfResults` (the perf_results push) do today across the SSH boundary.

### perf_results keying

Today: `<instance-type>/pr-<num>/`. New: `<instance-type>/release-<version>/`.
A small generalization (a target "slug": `pr-<n>` or `release-<v>`) drives the
path/dir/dedup/meta helpers so both flows share one implementation. Existing PR
helpers and their tests keep working.

```
c7g.medium/
  pr-677/             (existing, manual PR runs)
  release-5.141.5/    (new, automatic per published release)
    scaling.json
    construct.prof.txt
    meta.json
```

## Workflow change (`.github/workflows/nodejs.yml`, `release` job)

After the existing **"Publish to npm"** step, add:

```yaml
- name: Configure AWS credentials (OIDC)
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_GRAVITON_OIDC_ROLE }}
    aws-region: us-east-1

- name: Fire Graviton benchmark of the released version (non-blocking)
  run: node src/scripts/graviton_perf.cjs --detached --release "${TAG}" --commit "${GITHUB_SHA}"
```

- `TAG` is already exported by the job's existing "Export tag to envvars" step.
- The job already grants `id-token: write` (for npm OIDC), which the AWS OIDC
  action also needs.
- The step returns in seconds → `finish` (now `needs: [release]`) proceeds, the
  run ends. `bump-jssm-viz` stays removed (kept from the working-tree edit).
- A failure to *launch* (bad creds, capacity) should be **non-fatal** to the
  release — wrap the fire step so a launch error logs a warning and the job still
  succeeds (the release already happened; the benchmark is best-effort).

## AWS prerequisites (user-owned, one-time)

Documented in a companion notes file. The user creates these; the design only
consumes them by name.

1. **OIDC role** (referenced by `secrets.AWS_GRAVITON_OIDC_ROLE`):
   - Trust: GitHub OIDC (`token.actions.githubusercontent.com`), scoped to
     `repo:StoneCypher/jssm:*` (optionally the `nodejs.yml` workflow).
   - Permissions: `ec2:RunInstances`, `ec2:CreateTags`,
     `ec2:DescribeSubnets`, `ec2:DescribeVpcs`, `ssm:GetParameter` (for the public
     AL2023 ARM64 AMI alias resolved by `provision`), and `iam:PassRole` on the
     instance-profile role (so `run-instances` may attach the profile).
2. **Instance profile** (`PERF_INSTANCE_PROFILE`, a script constant): an IAM role
   whose only permission is `ssm:GetParameter` (+ decrypt) on
   `PERF_PUSH_PAT_SSM_PARAM`.
3. **SSM SecureString** `PERF_PUSH_PAT_SSM_PARAM` (default `/jssm/perf-push-pat`):
   a fine-grained PAT with `contents:write` on `StoneCypher/jssm`, used only to
   push the `perf_results` branch.

New script constants (single source of truth, documented):
`PERF_PUSH_PAT_SSM_PARAM = '/jssm/perf-push-pat'`,
`PERF_INSTANCE_PROFILE = 'jssm-graviton-perf'`.

## Tests

Unit tests (no live AWS; substring assertions, no golden files) for the new pure
logic:
- `--detached` arg parsing: requires `--release` + `--commit`; rejects a PR
  number; `--mode deep` still maps to `BENNY_DEEP=1`.
- release slug / path / dir / dedup helpers (`release-<version>` keying;
  dedup skips when the dir exists, `--force` overrides).
- release `meta.json` shape (records version + commit + `arch: 'arm64'`).
- `buildDetachedUserData` includes: the commit checkout, the `BENNY_DEEP` gate,
  the SSM param name, the `release-<version>` destination, the
  `x-access-token` push form, and `shutdown`. Rejects an unsafe `<sha>` /
  `<version>` (injection defense, mirroring `buildRemoteScript`).
- `--detached --dry-run` walks the provision-and-exit path printing
  `run-instances` (with the instance profile, no key pair) and never SS/scp.

## Out of scope

- No change to the existing PR-based flow, the launcher, or `npm run graviton_perf`.
- No deletion of `build/graviton_perf.cjs` (stale untracked copy; gitignored).
- The unrelated working-tree edits (`CLAUDE.md`, the fold-jssm-viz notes
  deletion) are left untouched and are not part of this PR.

## Risks / open questions

1. **AWS prerequisites must exist before the first release after merge**, or the
   fire step warns and no-ops. Acceptable (non-fatal), but the first real
   benchmark won't appear until they're in place.
2. **PAT in SSM vs. instance-profile blast radius.** The instance profile is
   scoped to a single SSM parameter; the PAT is `contents:write`-only and
   fine-grained to one repo. Short-lived instance. Considered acceptable.
3. **Region** is hard-coded to `us-east-1` in the workflow step (script default).
   Parameterize later if multi-region is ever wanted.
4. **Tag vs. commit.** We benchmark by `--commit ${GITHUB_SHA}`; the version is
   only a label. This is deliberate and removes tag-format coupling.
