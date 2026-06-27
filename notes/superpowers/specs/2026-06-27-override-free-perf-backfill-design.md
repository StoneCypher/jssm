# Override-free perf backfill — design

**Date:** 2026-06-27
**Status:** approved (design), pending spec review
**Branch:** `feat_26-06-27_override-free-backfill`

## Problem

The graviton perf backfill (`--harness-from main`) can now reach back to **5.86.1**
(after PRs #812, #814), but no further. The wall is the benchmark harness's
per-iteration reset: `transitionCase`/`actionCase` call `machine.override('s0')`
between iterations, and `attachActionSupport` uses it during setup. `override()`:

- requires `allows_override: true;` in the FSL — a config-statement syntax the
  parser only gained in **5.86.1**; older parsers throw at construct; and
- is itself a method that arrived in the same 5.86 cluster.

Every fixture generator and the feature-probe (`benchmark_scaling.cjs:363`) also
hard-code `allows_override: true;`, so on a pre-5.86 engine the harness dies at
parse — before the existing graceful-degradation framework can even trigger
(the probe that drives degradation is itself built with `allows_override:`).

The goal: drive the perf trail far below 5.86, recovering deep history —
especially the action ops (`action`, `list_exit_actions`, `probable_action_exits`)
which only start at **5.144.3** today.

## Decision: one uniform override-free methodology + re-baseline

The graphs have not been published; **dropping the old continuity is acceptable**
(user decision, 2026-06-27). So rather than a dual methodology (override ≥5.86,
something else below — which would splice incompatible measurements, against
project practice), adopt **one override-free methodology for all engines** and
re-baseline the c8g trail.

## Core change: closed-walk laps instead of `override()` reset

`override('s0')` exists only to reset state so a fixed precomputed sequence stays
legal on replay. Remove it by making each shape's sequence a **closed walk** — a
whole number of laps around the shape's natural cycle that returns to its start —
so continuous replay across benny iterations is always a legal transition with no
reset.

**Ring wrinkle + normalization.** A ring (`chain-N`) has no short cycle; its only
closed walk is a full lap of length N, so a fixed `K=100` cannot close
`chain-200`/`chain-1000`. Resolution: each shape walks a whole number of laps
(step count varies by shape) and the harness reports **per-transition throughput**
(total transitions ÷ total time) instead of iterations-of-100/sec. Shapes stay
comparable, rings close cleanly, and per-transition is a cleaner metric than a
per-100-op batch. The re-baseline absorbs the scale change.

**Irregular shapes (`messy-N`).** No clean cycle exists. Strategy: walk legal
exits from `s0` until the walk first returns to `s0` (a closed sub-walk), and
repeat that sub-walk; if no return to `s0` is found within a bound, keep `messy`
feature-gated out for that engine rather than resorting to `override()`. The
per-transition metric counts the actual transitions taken.

## Supporting changes

1. **Drop `allows_override: true;`** from every fixture generator
   (`buildChainFSL`, `buildDenseFSL`, `buildHubFSL`, `loadMessyFixture`,
   `attachActionSupport`) and from the feature-probe (`:363`). Bare FSL parses on
   ancient engines. (This also fixes the latent probe-crash bug.)
2. **Rework `attachActionSupport`'s integrity check** (`:225–231`), which uses
   `override()`, to validate via a closed action walk.
3. **Feature-probe still gates** per op (the `HAS` map + `plan`), so each op runs
   only where the engine supports it (floors below).
4. **Multi-era bundle-name normalization** in `graviton_perf.cjs` — the es5-cjs
   bundle was named differently over time; map all historical names to what the
   harness requires:
   - 5.11 era: `jssm.es5.cjs.js` (non-min) + `jssm.es5.cjs.min.js` (min)
   - 5.50 era: `jssm.es5.cjs.js` + `jssm.es5.cjs.nonmin.js`
   - 5.98+:    `jssm.es5.cjs` + `jssm.es5.nonmin.cjs`
   Current normalization only handles the 5.50 scheme; extend to cover 5.11 and
   any others, mapping to `dist/jssm.es5.cjs` (used by the harness) and
   `dist/jssm.es5.nonmin.cjs` (used by the construct probe).
5. **`graviton_perf.cjs` overlay** is otherwise unchanged — #814's whole-`src/buildjs`
   overlay already delivers the new harness to old engines.

## Reach (empirically pinned, 2026-06-27)

Probed against real published bundles:

| op(s) | floor |
|---|---|
| `construct`, `transition`, `action`, `list_exit_actions`, `probable_action_exits` | **5.11.0** (earliest git tag) |
| `has_state` | **5.30.1** (absent 5.30.0) |
| `edges_between` | **5.60.0** (absent 5.59.0) |

**5.11.0 is the hard floor:** no git tags below it, and old npm tarballs (0.x–5.10)
ship no prebuilt `dist/` (they built at install time, which fails on modern
toolchains). Out of scope.

## Re-baseline

Existing override-based c8g numbers are not comparable to the new per-transition
numbers. Drop the existing `c8g.medium/` trail data on `perf_results` and
regenerate from 5.11.0 up via the `perf_backfill` workflow (the new continuity).
5.130–5.143 already have c8g data, so re-measuring them needs `--force`; add a
`--force` input to `perf_backfill` (or run them explicitly) so the whole trail is
one methodology.

## Testing

- `benchmark_scaling.cjs` reset/sequence/normalization changes: unit tests for the
  closed-walk generators (each produces a legal closed walk that returns to start)
  and the per-transition metric.
- `graviton_perf.cjs`: extend the bundle-name-normalization tests to cover the 5.11
  and 5.50 schemes mapping to the harness names.
- Empirical: a local rig run (`npm install jssm@<v>` + overlaid harness) against a
  spread (5.11, 5.30, 5.60, 5.90, 5.130) confirming each op runs at/above its floor
  and is skipped below it — before firing graviton.

## Out of scope

- Versions below 5.11.0 (no tags / no prebuilt dist).
- Dual-methodology (override ≥5.86 + override-free below) — rejected; we re-baseline.
- The five deferred new-metric panels (bytes/edge, exponent, gzip, pause-ms,
  load-ms) — separate work.
