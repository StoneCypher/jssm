# Perf metrics — detailed design

**Date:** 2026-06-22
**Status:** design agreed (brainstormed), ready for implementation plan
**Umbrella:** see `2026-06-22-perf-instrumentation-and-gapfill.md` for the wider project
(gap-fill tooling, uniform re-run, regression alarm). This doc is the **metric catalog**:
what to measure, in which tier, where it lives.

---

## 1. Why

The 5.142–5.143 regression (transition −20%, `edges_between` −40%) was both **undetected
and unexplained** by an ops-only trail: `edges_between()`'s method was unchanged, so its
slowdown was a second-order *object-weight* effect invisible to throughput. The metric set
below is chosen so that an incident of that class is **caught** (a number moves) and
**explained** (the number says *why*). Two teachers drive it: memory weight, and the *shape*
of the curve.

Design constraints for every metric:

- **Additive & feature-gated.** Each is a new field on the per-run JSON (like the existing
  DEEP-mode `msPerOp` augment), so an old library benchmarked via `--harness-from` degrades to
  a partial-but-valid suite and the schema stays backward-compatible.
- **Determinism boundary.** Measurements are inherently non-deterministic and live in the
  per-run JSON (which already varies per run). The byte-identical-artifact rule only governs
  `perf_chart.svg` / `perf_data.json` regeneration over *unchanged* data — still true.
- **Isolation.** Each family is computed by its own helper with a clear input (the built
  library + a shape/size) and output (numbers), unit-testable without provisioning anything.

---

## 2. Metric families

### Library metrics (emitted into `scaling.json`, per op × shape × size)

1. **Throughput** *(have)* — ops/sec. Keep as-is.
2. **Memory & allocation** — per-machine retained footprint (heapUsed delta per construct);
   **bytes-per-state** and **bytes-per-edge** (footprint normalized by graph size — the number
   that would have screamed on `edges_between`); **object/Map count per machine** (directly
   exposes "interning + groups added N maps"); **allocations per op**; peak RSS *(park)*.
3. **Latency shape** — p50 / p95 / p99 / max per op (tail); within-run variance;
   **run-to-run variance / stability** across releases (signal-vs-noise — the thing that made
   the local proxy bisect untrustworthy).
4. **Algorithmic scaling** — empirical **big-O exponent per op** fit from the size sweep, plus
   **R²** so a noisy fit never false-alarms. Auto-flags superlinear regressions (the
   `jssm_compiler` O(n²)-concat class) that only surface at large sizes.
5. **Runtime / GC** — GC pause total + count during a run; major/minor split *(park)*; V8 deopt
   count *(park)*.
6. **Warmup** — cold first-call latency, time-to-steady-state, the warmup curve. Captures JIT /
   megamorphic effects (e.g. interning swapping string keys for numeric).
7. **Package / load** — per-artifact size **raw + gzip + brotli** (what users actually download),
   cold `require`/`import` time, V8 script-compile time.
8. **Carrying cost** — per-feature cost-when-unused: hooks, groups, interning, data. Generalizes
   the existing after-hook carrying-cost pin.
9. **Operation coverage (new ops to benchmark)** — **parse/compile split out of `construct`**
   (isolate FSL parsing from machine assembly); `go` / `force_transition`; hook *firing*;
   introspection (`states` / `actions` / `list_*`); `override`; data get/set.
10. **Composite / efficiency** — ops-per-byte, ops-per-allocation (one-glance health ratios).

### Runner-lifecycle metrics (emitted into `meta.json`, per graviton run)

11. **Run-step timing.** Wall-time of each phase of a graviton run: instance provision/boot,
    repo checkout, dependency install, build (if any), harness overlay, benchmark (benny),
    profiled construct pass, result upload, total. **Two uses:** (a) set the EC2
    `--shutdown-minutes` (machine lifetime) with a safe margin over observed p95 total —
    enough not to strand a run, not so long it wastes spend; (b) reveal whether **setup**
    (install/build, parallelizable → a multi-core box could help) or the **single-threaded
    benchmark** dominates, settling the instance-type question empirically rather than by
    first principles.

### Trail meta-health (project-level, mostly elsewhere in the umbrella spec)

12. Per-release **delta alarm** (#3 — after the fill lands); coverage / contiguity (the
    gap-fill tooling); benchmark wall-time; library build time.

---

## 3. Tiering (YAGNI applied)

- **Core — first instrumentation PR** (catches + explains the incident class):
  footprint + **bytes/edge** + object count · allocs/op · **scaling exponent + R²** ·
  p95/p99 + run-to-run variance · carrying cost.
- **Core — runner workstream** (ships with the gap-fill tooling, since it instruments the
  runner): **run-step timing** (#11).
- **Extended — follow-up PR**: GC pause · warmup curve · bundle gzip/brotli + import/compile
  time · **parse-vs-construct split** · new-op coverage (#9).
- **Park — only if a need appears**: deopt counts, major/minor GC split, peak RSS, efficiency
  composites, render perf.

---

## 4. Where it lives

- **Library metrics (families 1–10):** `src/buildjs/benchmark_scaling.cjs` (+ its
  `benchmark_scaling_plan.cjs` feature-gating), emitting additive fields into `scaling.json`.
  Each family is a separate measurement helper, feature-detected so `--harness-from` on an old
  lib degrades gracefully.
- **Run-step timing (family 11):** `src/scripts/graviton_perf.cjs`, emitting a `steps` block
  into the run's `meta.json`.
- **Chart/consumption:** `make_perf_chart.cjs` gains panels/columns for the new series as they
  land; the regression-delta alarm (#3) reads them once the trail is filled.

---

## 5. Open questions

- Exact allocation-measurement mechanism (heap sampling vs `--expose-gc` deltas vs
  `performance.measureUserAgentSpecificMemory`-style) — pick one that is cheap and stable.
- Big-O fit method (log-log least-squares slope) and the R² threshold below which the exponent
  is reported but not alarmed.
- Whether parse-vs-construct needs a public API seam or can reuse existing compile entry points.
- `--shutdown-minutes` formula once run-step timing data exists (e.g. p95 total × safety factor).
