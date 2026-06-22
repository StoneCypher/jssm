# Perf instrumentation expansion + graviton gap-fill

**Date:** 2026-06-22
**Status:** design agreed, execution not yet started
**Origin:** a transition/`edges_between` regression hunt that the existing ops-only,
gap-ridden graviton trail could not localize. This spec captures the agreed remediation.

---

## 1. What prompted this

While reading the graviton perf trail (`perf_results` branch, `c7g.medium`), a real,
persisting regression was found:

- **`transition()` −~20%** and **`edges_between()` −~40% (dense-200 −~60%)**, both
  landing in the window **`5.141.4` → `5.143.30`** and holding through `5.144.0`.

Diff-bisection over that window (for the record):

- **Ruled out** `7353ed49` (after-timer clear moved onto every transition — but
  `clear_state_timeout()` early-returns when no timer is armed, so it is a no-op on the
  timer-free benchmark machines) and `f87e0624` / #735 (it *optimizes* the hooked path).
- The genuine cost sits in the **5.142 machine-attribute work + 5.143 state/action
  interning + the overlapping-state-groups feature** (groups shipped in **`5.143.29`**:
  unified config cascade `55014184`, boundary-hook firing `e7640fed`).
- **`edges_between()` itself is unchanged** across the window — its method and the
  `_outbound_edge_ids` index are identical. So its slowdown is **second-order**: heavier
  per-edge / per-machine objects (interning + groups added many Maps/fields) degrade the
  tight deref loop and construction. An ops-only benchmark cannot see this; a memory/alloc
  metric would have caught it immediately.

Two systemic gaps made this hard to localize:

1. **The trail is ops-only** — no memory/allocation signal, so an object-weight regression
   reads as an unexplained ops drop.
2. **The trail has holes** — only ~30 of the 82 in-band release tags are benchmarked, and
   there are **zero points across `5.142.0`–`5.143.29`** (an 8-day blackout = the entire
   regression window). Earliest point ≈ `5.113.0`; coverage is sparse and irregular.

A local "swap each tag's committed `dist` into the harness" proxy bisect was attempted and
**abandoned** — too noisy on a busy dev machine, and contaminated by concurrent branch
switching racing the in-place `dist` swap. The canonical fix (below) supersedes it.

---

## 2. Decisions

### 2.1 New instrumentation (metrics to add)

From a 7-item menu; the calls made:

- **#1 — per-machine memory / object footprint.** Retained `heapUsed` (or object/Map count)
  for a constructed machine per shape/size. *The metric that would have caught this.* **Add.**
- **#4 — allocations per operation.** Allocation count per `transition()` / `edges_between()`.
  A method with unchanged source but rising allocations is exactly this failure mode. **Add.**
- **#5 — carrying cost, generalized.** Already pinned for after-hooks; extend to **groups**
  and **interning** — what a plain machine pays for features it does not use. **Add.**
- **#6 — cold vs warm** (first-call vs steady-state). Captures JIT / megamorphic effects, e.g.
  interning swapping string keys for numeric. **Add.**
- **#7 — dist bundle size + load time.** Package-level echo of "the machine got heavier." **Add.**
- **#2 — no-gap alarm.** **Dropped.** Alarms just nag when CI minutes are scarce. Replaced by
  the gap-fill tooling in §2.2.
- **#3 — automated regression-delta alarm** (per-case %-delta vs previous release, flag drops
  > ~8% in the perf comment). **Add — but only after the fill lands**, since it needs a clean,
  contiguous baseline trail.

### 2.2 Easy gap-fill tooling (replaces the #2 alarm)

The infra already supports benchmarking historical commits via the harness overlay (this is
how the `pr-*` backfill points exist):

```
node src/scripts/graviton_perf.cjs --detached --release <tag> --commit <sha> --harness-from main
```

`--release/--commit` benchmark a specific historical commit; `--harness-from main` overlays
today's scaling cases (degrading gracefully for ops the old lib lacks). It uploads to S3; the
nightly `perf_results_sync` lands it on `perf_results`; `make_perf_chart` redraws.

The only missing piece is an **easy trigger**, since the scaling bench currently only auto-fires
for the commit being pushed. Build:

- **`workflow_dispatch` "Benchmark a tag"** — input a version (or list); resolve the SHA; fire
  the command above under the existing OIDC role. The run is **detached** (the EC2 does the work,
  the GitHub runner just launches and exits), so it costs **near-zero GitHub minutes** — directly
  addressing the "I run out of minutes" constraint.
- **`fill_perf_gaps` helper** — diff released tags against what is on `perf_results`, print the
  missing release points down to a **`--since` floor** (default ~`5.100`/`5.113`), and **dedup by
  `src/ts/**` source diff** (skip releases with no runtime change). Fill newest-gaps-first as
  budget allows.

This makes the floor a **policy knob**, not a one-time decision, and makes filling cheap rather
than nagging.

### 2.3 Uniform re-run baseline

Comparability with the existing `c7g.medium` data is **moot** — re-running everything for the new
metrics anyway, so the fresh run gets its own internal comparability.

- **Instance: `c8g.medium`** (Graviton4): ~25–30% faster single-thread than `c7g.medium` for
  ~10% more $/hr → slightly faster *and* cheaper per run. Non-burstable (avoid `t`-family CPU-credit
  throttling). **Pin it for the on-release runs too**, or the comparability break recurs going forward.
- **Instance *size* buys nothing** — the benchmark is single-threaded; extra vCPUs idle. Do not
  scale up. (Open question: how much of a run is single-threaded *benchmark* vs parallelizable
  *setup*/install/build — read `graviton_perf.cjs`'s run script to know if more cores would cut
  wall-time of setup. If setup dominates, a multi-core box could help *that* part only.)
- **Spot** (`--spot` flag exists) → ~70% cheaper. The real cost lever, not instance type.
- **Parallelism** → per-second billing makes N instances-at-once cost the same total as serial but
  finish in one run's wall-clock. The real *speed* lever. Mind EC2 concurrent-instance limits.
- **Scope:** ~**104** tags ≥ `5.100.0` (82 ≥ `5.113`, 63 ≥ `5.130`). All 104 `dist` bundles differ
  (version string baked in), so dedup must key on **`src/ts/**` diff**, not bundle hash — likely
  cutting 104 to a few dozen meaningful runs.
- Absolute AWS cost is trivial (~$1 for all 104 on `c7g.medium`); optimize for wall-time and GitHub
  minutes, not dollars.

### 2.4 How far back

Reach is already fine (~`5.113`, which predates the `5.130` adjacency-index jump). **Density, not
depth, is the problem.** Fill to contiguity from ~`5.100`/`5.113` forward (regression window first);
do not chase below ~`5.100` unless hunting a specific old regression.

---

## 3. Execution plan (discrete PRs)

1. **Chart guides + panel gap** — DONE: `dc5b8b8a` on `chore_26-06-22_perf-chart-guides`
   (faint `#f4f4f4` per-run vertical guides, configurable `panel_gap` ≈ 2em, tests, rebuild).
   PR-ready.
2. **Gap-fill tooling** — `workflow_dispatch` "Benchmark a tag" + `fill_perf_gaps` helper
   (`--since` floor, `src/ts/**` dedup). *First, because it unblocks the fill that #3 waits on.*
3. **Instrumentation metrics** — add #1, #4, #5, #6, #7 to `benchmark_scaling.cjs` /
   `benchmark_scaling_plan.cjs`; keep emitted JSON deterministic (the byte-identical-artifact rule);
   feature-gate so `--harness-from` on old libs degrades gracefully.
4. **Uniform backfill run** — `c8g.medium`, spot, parallel; tags ≥ `5.100` deduped by `src/ts/**`.
   Establishes the new metric-rich, contiguous baseline.
5. **Regression-delta alarm (#3)** — once the trail is filled.

## 4. Parked cleanup (separate, needs go)

- Switch to `main`, pull (it has been running behind), **delete the merged
  `perf_26-06-22_v5-action-listers`**, **force-remove the obsolete
  `perf_26-06-18_v5-performance` worktree** (its WIP rescued+landed via #787; it still holds the
  now-redundant uncommitted edits, so removal needs `--force`).

## 5. Open questions

- Exact `--since` floor: `5.100` vs `5.113`.
- Run-time breakdown (single-threaded benchmark vs parallelizable setup) — decides whether a
  multi-core instance would cut setup wall-time.
- Regression-alarm thresholds and where it posts (perf issue #636 vs PR comment).
