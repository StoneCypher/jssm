# Graviton Benchmark Runner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a one-command script that runs the jssm scaling benchmark on a clean, dedicated AWS Graviton EC2 instance — so ops/sec numbers come from an isolated whole physical core instead of the user's contended laptop — and then deletes **every** AWS resource it created, leaving no idle assets that can accrue charges.

**Why this exists:** The author's laptop is under heavy, variable load, which contaminates `npm run benny:scaling` ops/sec measurements (variance, and outright `0 ops/sec` reports for slow cases like `dense-200 construct()`). A dedicated, non-burstable, non-SMT core gives stable, comparable numbers. AWS Graviton `.medium` instances are ARM, single-vCPU = one whole physical core, non-burstable — ideal for this, at single-digit cents per run.

**Tech stack:** Node `.cjs` orchestrator (matches the project's "Node over Python" preference and the existing `src/buildjs/*.cjs` / `src/scripts/*.cjs` convention), shelling out to the **AWS CLI v2** for all AWS operations and to **OpenSSH** (`ssh`/`scp`) for the remote session. No new npm dependency.

**Branch:** create `feat_26-06-02_graviton-benchmark-runner_<issuenum>` (or without the issue suffix if none) before any commit. `main` is protected (PR-only).

---

## Critical project constraints (read before starting)

- **The benchmark requires a built `dist/`.** `src/buildjs/benchmark_scaling.cjs` does `require('../../dist/jssm.es5.cjs')`. On the instance the order is **`npm ci` → `npm run make` → `npm run benny:scaling`**. `npm run make` is the heavy step (clean + peg + tsc + many rollup passes + terser); budget the bulk of the time for it.
- **Hard cap: a full run (provision → build → benchmark → retrieve) must stay under ~10 minutes.** This drives the instance choice (a fast single core), the use of `npm run make` rather than the full `npm run build`, and the deep-mode design (see Deep Mode).
- **Deep mode is impossible from the AWS script alone.** Iteration/sample counts live inside `benchmark_scaling.cjs`. Deep mode therefore has a **benchmark-side prerequisite**: teach the benchmark to read an env var (`BENNY_DEEP`) and raise sample counts / reporting precision accordingly. The AWS script only sets the env var over SSH.
- **No compound shell commands** in the dev workflow (`&&`, `||`, `;`, `|`) — run each as its own call. (This applies to *our* local dev commands; the remote commands the script sends over SSH are a different shell on the instance and may chain, but prefer a single uploaded provisioning script there too — see Task 4.)
- **`git` verb comes first** — never `git -C ...`. `cd` as a standalone step if needed.
- **Permanent scripts live in `src/scripts/`** (per project convention); temporary/throwaway artifacts go in `build/`. This script is permanent → `src/scripts/`.
- Check IDE diagnostics after writing the script before declaring done.

---

## File structure

**Created:**

- `src/scripts/graviton_perf.cjs` — the orchestrator. Self-contained: arg parsing, AWS lifecycle (provision → configure → run → retrieve → teardown), tag-based sweep/cleanup, and a guaranteed-cleanup wrapper.
- `src/scripts/tests/graviton_perf.spec.ts` — unit tests for the *pure* pieces (arg parser, tag-filter builder, remote-command-string builder, run-id generator, deep-vs-normal env selection). The AWS/SSH side-effecting parts are not unit-tested against live AWS; they are factored behind a thin "executor" seam so the pure logic is testable without spending money. (Optionally a `--dry-run` flag that prints every AWS CLI command instead of running it, for manual verification.)

**Modified (benchmark-side prerequisite — see Task 1):**

- `src/buildjs/benchmark_scaling.cjs` — read `BENNY_DEEP` and adjust benny per-case options + reporting precision.

**Outputs produced at run time (not committed):**

- `build/scaling.json`, `build/scaling.md` (default `--out` target), copied back from the instance. (Or a path given via `--out`.)

---

## Argument / flag design

`node src/scripts/graviton_perf.cjs [flags]`

| Flag | Default | Meaning |
|------|---------|---------|
| `--mode normal\|deep` | `normal` | `normal` = stock `npm run benny:scaling`. `deep` = sets `BENNY_DEEP=1` on the remote run for higher samples + finer reporting (see Deep Mode). |
| `--region <aws-region>` | `us-east-1` | AWS region. Parameterized because AMI/instance availability and price vary by region. |
| `--instance-type <type>` | `c7g.medium` | Graviton instance type. Allow override to `c6g.medium` etc. Validated against an allowlist of known-Graviton `.medium` types; reject burstable `t*` types with an explanatory error. |
| `--ref <git-ref>` | `main` | Branch / tag / SHA of `StoneCypher/jssm` to clone and benchmark. |
| `--out <path>` | `build/` | Local directory (or file prefix) to copy `scaling.json` / `scaling.md` into. |
| `--spot` | off (on-demand) | Launch as a Spot instance (cheaper, small interruption risk). See On-Demand vs Spot. |
| `--cleanup-only` | off | Skip provisioning/benchmark; **sweep** all resources tagged by this script (optionally filter to a specific `--run-id`) and delete them. The orphan-reaper. |
| `--run-id <id>` | auto | Override the generated run id. Mainly used with `--cleanup-only` to target one run. |
| `--keep` | off | (Escape hatch, default OFF) Skip teardown and print SSH instructions, for manual debugging. Prints a loud warning + the exact `--cleanup-only` command to reclaim the resources. The dead-man's-switch (Task 6) still terminates the instance even with `--keep`. |
| `--shutdown-minutes <n>` | `30` | Dead-man's-switch timer length on the instance (`shutdown -h +n`). Must exceed the expected run time; default 30 leaves margin over the 10-minute target. |
| `--dry-run` | off | Print every AWS CLI / ssh command that would run, execute none. For review. |

**Run id:** `jssm-perf-<yyyymmdd-hhmmss>-<6-char-random>` (e.g. `jssm-perf-20260602-143012-a1b9f2`). Used as the value of the `jssm-perf-run` tag on every resource, and embedded in the key-pair name and security-group name so even an untagged stray is greppable.

---

## Resource lifecycle (overview)

```
provision ─► configure ─► run ─► retrieve ─► teardown
   │            │          │        │            │
 key pair    install     ssh:     scp back    terminate instance (wait)
 sec group   Node 24     npm ci   scaling.*    delete sec group
 instance    clone repo  make                  delete key pair
 (tagged)    dead-man    benny                 verify: no volumes /
                         scaling               snapshots / EIPs / instances
```

Everything from **provision** onward runs inside a guaranteed-cleanup wrapper (Task 5). Cleanup is **idempotent** and tag-driven, so a partial failure mid-provision still gets reaped.

---

## Deep Mode — benchmark-side prerequisite (Task 1)

### The problem deep mode solves

benny measures ops/sec and, in this suite, writes integer-rounded `ops` to `scaling.json`. Cases slower than ~1 op/sec round to **0** (observed: `dense-200 construct()` → `"ops": 0`, ~1–2 s per call). Several construct() cases are already in the single digits (`messy-5000 construct()` = 5, `dense-50 construct()` = 66). "Getting past the zeroes" means (a) running enough samples that the slow cases produce a stable mean, and (b) reporting with enough precision that sub-1-ops/sec values are not lost.

### Required change to `src/buildjs/benchmark_scaling.cjs`

Have the benchmark read `process.env.BENNY_DEEP`. When set (truthy), apply, **per benny case**, options that raise statistical confidence on the slow cases, and emit finer-grained numbers:

1. **Per-case benny options.** benny's `b.add(name, fn, options)` accepts an options object forwarded to benchmark.js. In deep mode pass, at minimum:
   - `minSamples: 50` (default is 5) — forces more samples so slow cases get a real distribution.
   - `maxTime: <larger>` — benny/benchmark.js caps per-case wall time; raise it (e.g. 8 s) so slow cases actually collect samples instead of bailing after the default window. **This is the lever most directly tied to the 10-minute cap — see the timing budget below.**
   Wrap the option object in a helper `bennyOpts()` that returns `{}` in normal mode and the deep object in deep mode, and thread it through `transitionCase` / `edgesBetweenCase` / `hasStateCase` / `constructionCase`.
2. **Finer reporting / surface sub-1 values.** The suite currently writes `r.ops` (rounded) into `scaling.json` via `b.save`. The pivot writer (`writeMarkdownPivot`) prints `String(row.ops)`. In deep mode, additionally record a higher-precision figure so `0` becomes (e.g.) `0.62 ops/sec` / `1.6 s/op`. Two acceptable approaches — pick one and document it in the benchmark's header comment:
   - **(preferred) Add a `msPerOp` column** computed from benny's per-case stats (benny exposes mean seconds per op in the cycle event / summary). Write it alongside `ops` in the JSON envelope and add a `ms/op` column to the markdown pivot. This never rounds slow cases to nothing and is the natural unit for construction-cliff analysis.
   - Or **emit `ops` as a float** (e.g. 3 significant figures) instead of an integer in deep mode.
   Whichever is chosen, do **not** change the *normal*-mode envelope shape — `benchmark_compare.cjs` and committed `scaling.json` snapshots depend on the existing fields. Deep mode should be **additive** (extra field/column), gated on `BENNY_DEEP`.

3. **Do not change which cases run.** Deep mode changes *how thoroughly* each case is measured, not the shape registry. Trend continuity depends on the same 12 shapes × 4 ops = 48 cases.

### Timing budget vs the 10-minute cap

The 48 cases must all complete inside the run budget. The dominant cost is the construct() row for the largest shapes. Reason about it before fixing numbers:

- In **normal** mode benny's default per-case window is short (~a few seconds incl. warmup), so 48 cases land in roughly 2–4 min of benchmarking. Combined with `npm ci` + `npm run make`, normal mode comfortably fits 10 min on a fast core (see budget table in Task 4).
- In **deep** mode, `minSamples: 50` on a 1–2 s/call case (`dense-200 construct()`) is, by itself, 50–100 s for that single case — and there are several slow construct() cases. Naively deepening **all 48 cases** will blow the 10-minute cap.
- **Mitigation — deepen selectively.** Add a predicate so deep mode only raises samples on cases that are *slow but starved* (the ones near/at zero), and leaves the fast cases (`has_state()` at ~18M ops/sec; most `transition()`/`edges_between()`) on normal settings where 5 samples already give tight margins. Concretely: in deep mode apply the heavy `minSamples`/`maxTime` only to `construct()` cases (and any case whose normal-mode `ops` was < ~100), and keep `minSamples` modest (e.g. 20) with a bounded `maxTime` (e.g. 6 s) so even the worst case (`dense-200 construct()`, ~1.5 s/call → ~9 samples in 6 s, ~13 in deep) stays bounded. This is the single most important design decision for keeping deep mode under budget; the implementer should **measure the deep run's wall time once locally** (or on a first instance run) and tune `minSamples`/`maxTime` so the *total* benchmark phase is ≤ ~5 min, leaving ≥ ~4–5 min for `npm ci` + `npm run make`.
- If deep mode still can't fit, the fallback is to raise `--shutdown-minutes` and the orchestrator's SSH timeout above 10 and **document that deep mode is the explicit exception to the 10-minute target** — but only after the selective-deepening tuning above has been tried. Flag this to the user (Open Questions).

> **This task (Task 1) is a hard prerequisite for `--mode deep`.** Until it lands, `--mode deep` should error out with a message pointing at this benchmark-side change. `--mode normal` works without it.

---

## Task 2: Prerequisites & preflight checks

The script must fail fast, *before* creating anything, if the environment isn't ready.

- [ ] **Local prerequisites (documented in the script header and checked at startup):**
  - AWS CLI v2 on `PATH` (`aws --version`), with credentials configured (`aws sts get-caller-identity` — verifies creds resolve and prints the account, region, ARN actually in use). Abort with a clear message if it fails.
  - OpenSSH client (`ssh`, `scp`) on `PATH`.
  - Node ≥ 18 locally (to run the orchestrator itself).
  - Outbound internet / ability to reach the EC2 endpoints in `--region`.
- [ ] **Resolve the caller's public IP** for the security-group ingress rule. Query a stable IP-echo service (e.g. `https://checkip.amazonaws.com`) and use `<ip>/32`. If it can't be resolved, abort (do **not** fall back to `0.0.0.0/0` — open-to-the-world SSH is unacceptable). Allow `--my-ip <cidr>` override for users behind changing NAT.
- [ ] **Validate `--instance-type`** is a Graviton `.medium` (allowlist `c7g.medium`, `c6g.medium`, plus optionally `m7g.medium`/`r7g.medium` if the user wants more RAM); **reject `t*` burstable types** with an explanatory error (credit throttling + shared core reintroduces exactly the contamination we're escaping).

---

## Task 3: Provision (create AWS resources, all tagged)

All `aws` calls take `--region <region>`. Every created resource gets the tag set:
`{ Key: jssm-perf-run, Value: <run-id> }`, `{ Key: jssm-perf, Value: "true" }`, `{ Key: Name, Value: <run-id> }`.

- [ ] **3a. Resolve a current ARM64 AMI at runtime via SSM Parameter Store** (never hardcode an AMI id — they're region-specific and rotate):

  **Chosen AMI: Amazon Linux 2023, ARM64.**
  ```
  aws ssm get-parameter --region <region> \
    --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64 \
    --query Parameter.Value --output text
  ```
  **Justification:** AL2023 is the AWS-maintained default, has the SSM "latest" alias in every region (so AMI-availability caveats are minimal), boots fast, has reliable status checks, and `dnf` makes Node install trivial. We do **not** need anything Ubuntu-specific. (Ubuntu ARM equivalent for reference, if a future maintainer prefers it: `aws ssm get-parameter --name /aws/service/canonical/ubuntu/server/24.04/stable/current/arm64/hvm/ebs-gp3/ami-id` — but its default SSH user is `ubuntu`, not `ec2-user`, and the Node-install commands differ.)

- [ ] **3b. Create a temporary key pair**, name `<run-id>-key`. Have AWS generate it and capture the private key locally to a `0600`-permission temp file in the OS temp dir (or `build/`), used only for this run's SSH and deleted at teardown:
  ```
  aws ec2 create-key-pair --region <region> --key-name <run-id>-key \
    --query KeyMaterial --output text > <tmp>/<run-id>-key.pem
  ```
  (chmod 600 the file; on Windows, rely on the user profile ACLs / use the file path directly with `ssh -i`.)

- [ ] **3c. Create a temporary security group** in the default VPC, name `<run-id>-sg`, description noting the run id:
  ```
  aws ec2 create-security-group --region <region> --group-name <run-id>-sg \
    --description "jssm perf transient <run-id>" \
    --tag-specifications 'ResourceType=security-group,Tags=[{Key=jssm-perf-run,Value=<run-id>},{Key=jssm-perf,Value=true}]'
  ```
  Then **one** ingress rule — SSH/22 from the caller IP only:
  ```
  aws ec2 authorize-security-group-ingress --region <region> --group-id <sg-id> \
    --protocol tcp --port 22 --cidr <caller-ip>/32
  ```
  (Egress: leave the default allow-all-outbound — the instance needs it to `git clone` and `npm ci`.)

- [ ] **3d. Launch the instance** with a small DeleteOnTermination root volume, the dead-man's-switch baked into user-data, instance-initiated-shutdown = terminate, and full tagging:
  ```
  aws ec2 run-instances --region <region> \
    --image-id <ami-id> \
    --instance-type <instance-type> \
    --key-name <run-id>-key \
    --security-group-ids <sg-id> \
    --instance-initiated-shutdown-behavior terminate \
    --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":10,"VolumeType":"gp3","DeleteOnTermination":true}}]' \
    --metadata-options 'HttpTokens=required,HttpEndpoint=enabled' \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=jssm-perf-run,Value=<run-id>},{Key=jssm-perf,Value=true},{Key=Name,Value=<run-id>}]' \
    --user-data file://<tmp>/userdata.sh \
    --count 1 \
    --query 'Instances[0].InstanceId' --output text
  ```
  - `--block-device-mappings` pins **10 GB gp3** with **`DeleteOnTermination: true`** so no orphan volume survives the instance.
  - `--instance-initiated-shutdown-behavior terminate` is half of the dead-man's-switch: when the in-instance timer fires `shutdown -h`, the instance **terminates** (not just stops), taking its volume with it.
  - For `--spot`, add `--instance-market-options 'MarketType=spot,SpotOptions={SpotInstanceType=one-time,InstanceInterruptionBehavior=terminate}'`. (Spot + `one-time` + terminate keeps the no-orphans guarantee.)
  - `--metadata-options HttpTokens=required` enforces IMDSv2 (good hygiene; harmless here).
  - **user-data** (`userdata.sh`, see Task 6) arms the dead-man's-switch as the very first thing the instance does.

- [ ] **3e. Record provisioned ids** (instance id, sg id, key name, key file path) into an in-memory run-state object **and** echo them to stdout immediately, so that even if the process is killed the user can see what exists.

---

## Task 4: Configure & run (on the instance, over SSH)

- [ ] **4a. Wait for the instance to be reachable.** Two-phase wait:
  1. `aws ec2 wait instance-running --region <region> --instance-ids <id>`
  2. `aws ec2 wait instance-status-ok --region <region> --instance-ids <id>` (both system + instance status checks pass — SSH is reliably up by then).
  Then resolve the public IP/DNS:
  ```
  aws ec2 describe-instances --region <region> --instance-ids <id> \
    --query 'Reservations[0].Instances[0].PublicDnsName' --output text
  ```
  Each `aws ... wait` has its own AWS-side timeout; wrap the whole wait in our own ceiling so a stuck instance still hits teardown well inside the budget.

- [ ] **4b. SSH preflight.** Poll `ssh -i <key.pem> -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5 ec2-user@<dns> true` until it succeeds or a deadline passes (status-ok usually means SSH is already up; this is belt-and-suspenders). Use `-o StrictHostKeyChecking=accept-new` and a per-run `-o UserKnownHostsFile=<tmp>/known_hosts` so we don't pollute the user's `~/.ssh/known_hosts` with a soon-deleted host.

- [ ] **4c. Drive the remote build+benchmark via a single uploaded provisioning script** (cleaner than many `ssh` round-trips and lets the remote side chain freely in its own shell). `scp` a `remote_run.sh` to the instance, then run it once over SSH, streaming output back. The script does, in order:
  1. Install **Node 24** (target). On AL2023:
     - `curl -fsSL https://rpm.nodesource.com/setup_24.x | sudo bash -` then `sudo dnf install -y nodejs git`, **or**
     - install via the official binary tarball for `linux-arm64` (NodeSource is simplest and pins major 24). Verify with `node -v` (assert it starts `v24.` or at least `>= v20`; abort the remote script otherwise — a too-old Node is a silent benchmark contaminant).
  2. `git clone --depth 1 --branch <ref> https://github.com/StoneCypher/jssm.git` (fall back to full clone + `git checkout <ref>` if `<ref>` is a SHA, since `--branch` only takes branch/tag names).
  3. `cd jssm`
  4. `npm ci`
  5. `npm run make` (builds `dist/` — **required** before the benchmark).
  6. The benchmark, mode-dependent:
     - normal: `npm run benny:scaling`
     - deep: `BENNY_DEEP=1 npm run benny:scaling`
  7. Print a sentinel line on success (e.g. `JSSM_BENCH_DONE`) so the orchestrator can distinguish "benchmark finished" from "SSH dropped".

  **Timing budget (single fast core, rough):**
  | Phase | Normal | Deep |
  |-------|--------|------|
  | boot + status-ok + SSH up | ~1–2 min | ~1–2 min |
  | Node install | ~20–40 s | ~20–40 s |
  | `git clone --depth 1` | ~5–15 s | ~5–15 s |
  | `npm ci` | ~1–2 min | ~1–2 min |
  | `npm run make` | ~2–3 min | ~2–3 min |
  | benchmark | ~2–4 min | tuned to ≤ ~4 min (Task 1) |
  | profiled construct pass (4d) | ~0.5–1.5 min | ~0.5–1.5 min |
  | **total** | **~8–10 min** | **tune benchmark + profile to ≤ 10 min** |

  This is why **`npm run make`, not `npm run build`** — `build` additionally runs vet + test + site + cookbook + changelog + docs + cloc + readme, which would blow the budget and is irrelevant to producing `dist/`. `make` is the minimum that yields the `dist/jssm.es5.cjs` the benchmark requires.

- [ ] **4d. Profile a bounded construct pass (bring back optimization notes).** Each run should return not just ops/sec but concrete "what to optimize next" notes from the clean, dedicated core — so the next perf lever is chosen from trustworthy data, not laptop noise. After the benchmark (never around it — `--prof` overhead must not pollute the benny numbers), the remote script runs a *separate, bounded* profiled pass:
  1. Write a tiny probe that constructs the heaviest shape(s) a **fixed, small** number of times under the V8 profiler — e.g. `node --prof` over ~5 constructs of `dense-200` (optionally `messy-5000`), built exactly as `benchmark_scaling.cjs` builds them. A fixed bounded count (not benny's adaptive sampling) keeps this ~30–90 s even at ~1–8 s/construct.
  2. `require('./dist/jssm.es5.nonmin.cjs')` (also produced by `npm run make`) — the **non-minified** bundle, so the tick log has readable function names instead of mangled ones.
  3. Process the log on the instance: `node --prof-process isolate-*.log > construct.prof.txt`.
  This is the step that localizes the cost: on the current build it fingers PEG.js parse (`peg$parseWS`, `peg$parseSubexp`, `peg$parseNonNegNumber`) plus ~20% GC as the `construct()` cliff, with the build loop a rounding error — exactly the signal that should drive the whitespace-rule and memoization branches. Capturing it per run keeps it current as those land.

- [ ] **4e. Retrieve results.** `scp` the artifacts back into `--out`:
  ```
  scp -i <key.pem> ec2-user@<dns>:jssm/benchmark/results/scaling.json <out>/scaling.json
  scp -i <key.pem> ec2-user@<dns>:jssm/benchmark/results/scaling.md   <out>/scaling.md
  scp -i <key.pem> ec2-user@<dns>:jssm/construct.prof.txt             <out>/construct.prof.txt
  ```
  (Optionally `scaling.chart.html` too.) Verify the local files exist and are non-empty before declaring success; a missing/empty `scaling.json` means the remote run failed and should be surfaced as an error (but teardown still runs). The profile report (`construct.prof.txt`) is a secondary artifact — a missing one is a warning, not a hard failure.

---

## Task 5: Teardown & guaranteed cleanup (the central concern)

> **Design rule:** *Nothing the script creates may outlive the script.* Cleanup is idempotent, tag-driven, runs on success, on error, and on Ctrl-C, and finishes by **proving** nothing is left.

- [ ] **5a. Guaranteed-cleanup wrapper.** Structure `main()` so provisioning happens inside a `try`, and cleanup happens in a `finally`. Additionally register signal handlers for `SIGINT`/`SIGTERM` (and `process.on('uncaughtException')`/`'unhandledRejection'`) that invoke the same cleanup and then exit non-zero. Cleanup keys off the in-memory run-state when available, and **falls back to tag-based discovery** so even a partially-recorded run is reaped. Cleanup must be safe to run twice (idempotent): treat "not found" / "already deleted" AWS errors as success.

- [ ] **5b. Teardown sequence (by run id):**
  1. **Terminate the instance and WAIT for it to be gone:**
     ```
     aws ec2 terminate-instances --region <region> --instance-ids <id>
     aws ec2 wait instance-terminated --region <region> --instance-ids <id>
     ```
     Waiting matters: you cannot delete the security group while an instance still references it, and the root volume (DeleteOnTermination) only disappears once the instance is fully terminated.
  2. **Delete the security group** (now unreferenced):
     ```
     aws ec2 delete-security-group --region <region> --group-id <sg-id>
     ```
     If it still reports `DependencyViolation`, re-poll instance state and retry a few times with backoff before giving up loudly.
  3. **Delete the key pair** and shred the local `.pem`:
     ```
     aws ec2 delete-key-pair --region <region> --key-name <run-id>-key
     ```
     then remove `<tmp>/<run-id>-key.pem` and `<tmp>/known_hosts`.

- [ ] **5c. Verify no leftovers** (the proof step). Query by the run tag and assert empty (or, for the instance, only `terminated`). The instance query's `State.Name` is parsed by `summarizeFinalInstanceState` and the outcome reported in the run log (`EC2 final state: terminated ✓`, or a loud `⚠ EC2 NOT torn down: …` naming any lingering state), so the box's end state is recorded in the output the user reads — not merely asserted:
  ```
  aws ec2 describe-instances --region <region> \
    --filters Name=tag:jssm-perf-run,Values=<run-id> \
    --query 'Reservations[].Instances[].{Id:InstanceId,State:State.Name}'
  aws ec2 describe-security-groups --region <region> \
    --filters Name=tag:jssm-perf-run,Values=<run-id> --query 'SecurityGroups[].GroupId'
  aws ec2 describe-volumes --region <region> \
    --filters Name=tag:jssm-perf-run,Values=<run-id> --query 'Volumes[].VolumeId'
  aws ec2 describe-snapshots --region <region> --owner-ids self \
    --filters Name=tag:jssm-perf-run,Values=<run-id> --query 'Snapshots[].SnapshotId'
  aws ec2 describe-addresses --region <region> \
    --filters Name=tag:jssm-perf-run,Values=<run-id> --query 'Addresses[].AllocationId'
  aws ec2 describe-key-pairs --region <region> --key-names <run-id>-key   # expect "not found"
  ```
  (We never allocate Elastic IPs or create snapshots, and the volume is DeleteOnTermination — so these should always be empty; checking anyway is the safety net the user explicitly asked for.)

- [ ] **5d. `--cleanup-only` sweep mode.** Same teardown, but discovery is purely tag-based and scoped to `jssm-perf=true` (optionally `--run-id` to target one run): list all instances/SGs/keys/volumes carrying the tag and reap them. This is the orphan-reaper for the case where a previous run's cleanup itself died. Key pairs aren't taggable via the simple `create-key-pair` path, so the sweep also matches key-pair **names** with the `jssm-perf-` prefix.

- [ ] **5e. Final confirmation output.** Print an explicit, human-readable summary of exactly what was deleted (instance id, sg id, key name, volume confirmed gone) **and** paste the two or three `aws ec2 describe-...` filter commands above so the user can independently verify zero residue. On any cleanup failure, print a red, unmissable warning naming the surviving resource and the exact `--cleanup-only --run-id <id>` command to finish the job.

---

## Task 6: Dead-man's-switch (defense in depth against runaway charges)

Two independent mechanisms, so a dead orchestrator can never leave a billable instance:

- [ ] **6a. Instance-initiated-shutdown = terminate** (set at launch, Task 3d). When the in-instance timer triggers `shutdown -h`, the instance *terminates* rather than stops.
- [ ] **6b. In-instance self-termination timer**, armed in **user-data** as the first action at boot (so it's set even if the build/benchmark never starts or SSH never connects):
  ```sh
  #!/bin/bash
  # userdata.sh — runs as root at first boot, BEFORE anything else.
  shutdown -h +<shutdown-minutes>   # default +30
  ```
  (A systemd transient timer — `systemd-run --on-active=30min /sbin/shutdown -h now` — is an equally good alternative and survives a `shutdown -c`; either is acceptable. Document the choice in the script.) Because shutdown-behavior is `terminate`, this self-terminates and drops the volume.
- [ ] **6c. Margin.** `--shutdown-minutes` (default 30) must exceed the expected wall time (≤10 min target) so a healthy run is never guillotined mid-benchmark, while a hung/abandoned run still dies within 30 minutes max → worst-case waste ≈ 30 min × instance rate ≈ **under two cents**.

---

## Task 7: Tests & verification

- [ ] **7a. Unit tests** (`src/scripts/tests/graviton_perf.spec.ts`) for the pure logic, factored behind an executor seam:
  - arg parser (defaults; `--mode deep` selects `BENNY_DEEP=1`; bad `--instance-type` / a `t*` type is rejected; `--cleanup-only` skips provision).
  - run-id generator format.
  - tag-filter / describe-command string builders.
  - remote-command builder (normal vs deep produces the right `BENNY_DEEP` prefix; `<ref>` is interpolated safely / shell-escaped).
  - cleanup idempotency: feed a fake executor that returns "not found" and assert cleanup treats it as success.
  No live-AWS calls in tests. (No golden-file/snapshot tests; assert on substrings/identifiers per project rules.)
- [ ] **7b. `--dry-run` manual verification:** run `node src/scripts/graviton_perf.cjs --dry-run` and eyeball that the printed AWS CLI sequence is correct (correct tags, `/32` ingress, DeleteOnTermination, shutdown-behavior terminate). Run `--cleanup-only --dry-run` and confirm it prints only describe/delete-by-tag commands.
- [ ] **7c. One real end-to-end run** (costs ~$0.01) in `--mode normal`, confirm `build/scaling.json` returns populated and that the post-run `describe` checks show zero residue. Then one `--mode deep` run to confirm the zeroes are gone (e.g. `dense-200 construct()` now shows a non-zero `ms/op`) and that total wall time stayed under budget; tune Task-1 `minSamples`/`maxTime` if not.
- [ ] **7d. Failure-injection check:** Ctrl-C the orchestrator mid-build and confirm the `finally`/signal handler tears everything down; separately, kill the orchestrator with `-9` (simulating a crashed laptop) and confirm the **dead-man's-switch** terminates the instance within `--shutdown-minutes`.
- [ ] **7e. IDE diagnostics** clean on the new files before declaring done.

---

## Instance choice — recommendation & justification

- **Recommended: `c7g.medium`** (Graviton3, ARM64). 1 vCPU = **one whole physical core** (Graviton has no SMT, so no hyperthread sibling stealing cycles), **non-burstable** (no CPU-credit throttling), compute-optimized. ~**$0.036/hr** on-demand (us-east-1, approximate). A clean, dedicated, steady core is exactly what removes the laptop-contention variance.
- **Cheaper alternative: `c6g.medium`** (Graviton2). ~**$0.034/hr**. Same single-whole-core, non-burstable properties; slightly older/slower core. Fine if Graviton3 isn't available in the chosen region, but **absolute numbers differ from c7g** — see continuity note.
- **Explicitly OUT: burstable `t3`/`t4g` (`t*`).** Shared physical core + CPU-credit throttling reintroduces the exact contamination we're paying to escape. The script rejects `t*` types.
- **Bare metal (`*.metal`)** is overkill and far more expensive for a sub-10-minute single-threaded run; not used.

**On-demand vs Spot (`--spot`):** For a <10-minute job, on-demand's predictability is worth the pennies — default to on-demand. Spot is ~60–70% cheaper but can be interrupted; with `SpotInstanceType=one-time` + `InstanceInterruptionBehavior=terminate` an interruption just means "re-run", and the no-orphans guarantee holds. Offer `--spot` for cost-sensitive batches; keep on-demand the default.

**Continuity caveat:** ARM (Graviton) ops/sec are **not comparable to x86** numbers, and even `c7g` vs `c6g` differ. The benchmark's vs-baseline comparison assumes a consistent host. **Pick one instance type (recommend `c7g.medium`) and keep using it** so trend lines stay meaningful; record the instance type in the result (e.g. stamp `--instance-type` into the `--out` filename or a sidecar note).

---

## Cost & safety summary

- **Per run:** `c7g.medium` at ~$0.036/hr × ~10 min ≈ **$0.006**, plus a few hundredths of a cent of gp3 storage for the brief life of a 10 GB volume → **well under a cent and a half per run.** Spot is cheaper still.
- **What protects against runaway charges:** (1) `try/finally` + signal-handler cleanup that *waits for terminated* and *verifies by tag*; (2) the **dead-man's-switch** (instance-initiated-shutdown=terminate **and** an in-instance `shutdown -h +15` armed in user-data) so even a crashed laptop can't leave a billable instance past ~15 min; (3) DeleteOnTermination on the only volume; (4) the `--cleanup-only` tag sweep as a manual backstop. We never allocate Elastic IPs or take snapshots, so the only billable assets are the instance + its ephemeral volume, both of which die with the instance.
- **Region/AZ & AMI caveats:** instance-type availability varies by region and AZ; if `run-instances` fails with an insufficient-capacity / unsupported-type error, surface it and suggest another `--region` or `--instance-type` (and on-demand if `--spot` had no capacity). AMI is resolved fresh from SSM each run, so it never goes stale.

---

## Open questions / risks

1. **Deep-mode fit under 10 min (highest-risk item).** The selective-deepening design (Task 1) is a plan, not a measurement. The implementer must run a deep build once and tune `minSamples`/`maxTime` so the benchmark phase stays ≤ ~5 min. If even selective deepening can't fit, do we (a) accept deep mode as the explicit exception to the 10-minute cap (raising `--shutdown-minutes` and SSH timeouts), or (b) split deep mode into a "slow-cases-only" sub-run? **Needs the user's call.**
2. **Deep-mode reporting shape.** Preferred: additive `ms/op` field/column gated on `BENNY_DEEP`, leaving the normal envelope untouched (so `benchmark_compare.cjs` and committed snapshots keep working). Confirm the user wants `ms/op` rather than float-`ops`.
3. **AWS account assumptions.** Plan assumes a **default VPC with a public subnet** exists in `--region` (so the instance gets a public IP for SSH). Accounts without a default VPC need a `--subnet-id` flag + auto-assign-public-IP handling. Confirm the target account has a default VPC, or add the flag.
4. **SSH from Windows.** The author's box is Windows; the plan uses OpenSSH (`ssh`/`scp`) which ships with modern Windows, and a per-run known-hosts file to avoid polluting `~/.ssh`. `.pem` file permissions are enforced by user-profile ACLs rather than `chmod`; confirm `ssh -i` accepts the key without an "unprotected private key" refusal on the user's setup (may need an `icacls` step).
5. **Node version on the instance.** Targeting Node **24** via NodeSource. If NodeSource lags 24 for arm64 at run time, fall back to the official Node binary tarball for `linux-arm64`. Acceptable floor is Node ≥ 20. Confirm 24 is the desired target (CI uses 24.x).
6. **Where results land / continuity.** Default `--out build/`. Should a successful run also stamp the instance type + git ref + ARM marker into the result file name (or a sidecar) so historical Graviton results are never confused with laptop/x86 ones? Recommend yes.
7. **Issue number.** This plan has no associated GitHub issue number in hand; if one is opened, use it in the branch name and `Closes #N` on the PR.
