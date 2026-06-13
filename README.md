# jssm shootout

A measured **performance + capability + packaging** comparison across 15 JavaScript
finite-state-machine libraries, rendered as a single self-contained "Borland-style"
checkbox grid.

This is an **orphan branch** — it shares no history with `main`, is never merged,
and its dependencies (competitor libraries) never touch the mainline tree.

**It only runs when a human asks.** The single CI entry point is the
`workflow_dispatch`-only shim on main (`.github/workflows/shootout.yml`) or a
direct `node launch.cjs` from any AWS-credentialed shell. There is no push
trigger, no schedule, and nothing on this branch executes on its own.

## The grid

`grid.cjs` renders `src/generated_docs/shootout.html`: ~100 capability / behavior /
notation / packaging / scaling rows × **jssm 5**, **jssm 6**, and every competitor.
Each row is an unfoldable `<details>` carrying a syntax-highlighted FSL demo and an
explainer; every demo is **executed as a test vector at render time** (parse + run +
assert), so a demo that stops being true fails the build and the documentation
cannot rot. `features.cjs` is the declared-feature catalog feeding the editorial
rows. The forward-looking jssm-6 features live in their natural sections (jssm 5 ✗ /
jssm 6 ◐), so each section shows **6 advancing over 5**.

## Evidence tiers (most → least authoritative)

Every cell is one of three tiers, and the grid never blurs them:

1. **Measured** — machine-verified *this run*: capability conformance, the behavior
   battery, scaling feasibility (timeouts included), packaging facts, and functional
   feature tests (serialize / observe / terminate). Pass green · fail red · beats
   jssm cyan · &gt;10× slower amber.
2. **Documented** (`data/docs/farm.json`) — read from each library's *own published
   documentation*, version-keyed. Same pass/fail verdict colours, marked with a `ᵈ`
   badge; the hover cites source + date + version. Used only for flagship / ecosystem
   features the runtime can't test (nesting, parallel, viz, CLI, framework bindings,
   live editor), where absence-by-omission in the docs is reliable.
3. **Unknown** — not assessed: a hatched `?`. Never fabricated, never copied from a
   stale grid.

jssm's own column is **first-party authoritative** (never farmed). Compact subscript
marks keep columns narrow: `✓F` rejects by returning false · `✗T` throws · `⚠N`
silent no-op · `✗C` CJS-only · `☢️` corrupts state.

## Caching & orchestration

`run.cjs` is the cached orchestrator, built to track *hundreds* of competitors over
time. Each library is measured independently and cached at `data/<host>/<lib>.json`,
keyed by installed version; a run re-measures **only** the libraries whose version
changed (or `--force`). Per stale library it spawns `measure_lib.cjs` in a child with
`--expose-gc` and a wall-clock timeout — the worker writes progressively, so a library
that hangs on a huge machine still contributes the shapes it finished (the rest read
as `timeout`) and one bad library can't break the run. It then assembles a combined
`report.json`, renders the grid, and **promotes** both into `src/generated_docs/`.

```
node run.cjs                 # measure stale libs, render, promote
node run.cjs --force         # re-measure everything
node run.cjs --only jssm,xstate
```

`SHOOTOUT_HOST` (default `local-<arch>`) namespaces the cache and report, since
throughput / memory are host-dependent — `local-*` numbers are a directional preview;
canonical numbers come from the `c7g.medium` Graviton runner. The documentation farm
is host-independent.

## Layout

| file | role |
|---|---|
| `run.cjs` | cached orchestrator: measure stale libs → combined `report.json` → render grid → promote to `src/generated_docs/` |
| `measure_lib.cjs` | per-library worker (child, `--expose-gc`, hard timeout); writes `data/<host>/<lib>.json` progressively |
| `grid.cjs` | the Borland grid renderer → `shootout.html`; validates every FSL demo as a test vector |
| `features.cjs` | declared-feature catalog (the editorial rows + jssm authoritative values) |
| `data/<host>/<lib>.json` | version-keyed per-library measurement cache |
| `data/docs/farm.json` | documentation-farmed feature claims (the `ᵈ` tier), version-keyed, with per-feature source + evidence |
| `shapes.cjs` | library-neutral topologies (chain / dense / hub / messy), mirroring main's scaling suite |
| `contract.md` | the adapter interface: capability flags + core/action/guard/hook/data/timer methods |
| `adapters/*.cjs` | one adapter per library; `adapters/index.cjs` is the registry (+ documented `EXCLUDED` list) |
| `conformance.cjs` | the gate — drives every adapter through known machines and asserts state sequences; refuses to benchmark a non-conformant set |
| `suite.cjs` | capability-gated benny throughput across shapes + action/guard/hook/data; writes `shootout.json` |
| `memory.cjs` | retained bytes/machine + allocation bytes/transition (`node --expose-gc`); writes `memory.json` |
| `probes.cjs` | behavior battery — categorical semantics (illegal move, self-loop, hostile state names, reentrancy) + differential conformance; records what each library *does*, never pass/fail |
| `static.cjs` | static / lifecycle facts: install size, direct deps, bundled types, ESM/CJS, postinstall, publish cadence, cold-start `require` |
| `launch.cjs` | fire-and-forget Graviton launcher (same SSM PAT / instance-profile / dead-man pattern as main's `graviton_perf.cjs`); `--dry-run` supported |
| `fixtures/` | frozen messy FSL fixtures, copied from main's `benchmark/fixtures` |
| `src/generated_docs/` | promoted artifacts: `shootout.report.json` + `shootout.html` (committed) |

## Coverage

15 conformant libraries: jssm, xstate, @xstate/fsm, javascript-state-machine,
robot3, machina, nanostate, statebot, finity, typestate, stately.js, fn-machine,
fseh, easy-fsm, pastafarian. Probed-but-excluded (recorded as data in `index.cjs`,
not silently dropped): `@edium/fsm` (broken CommonJS build), `xsm` (reactive store,
not an edge-transition FSM).

## Fairness rules

- Each library is measured through **its own idiomatic path**: jssm constructs from
  FSL text (parsing is its real entry price); XState constructs from a config object
  and transitions through its pure `transition()` core (no actors, so actor lifecycle
  isn't billed against it).
- Competitor versions are **pinned** in `package.json` + lockfile and recorded per
  run (and per farmed doc claim).
- Capabilities that don't exist in a library are skipped, not zero-scored; a
  documented absence is a real failure, an *unassessed* one stays `?`.

## Canonical results

Published by the Graviton instance to the `perf_results` branch under
`shootout/<run-id>/` — same data branch as the mainline trend, separate namespace.
Local runs are a smoke / preview only; their numbers are not canonical data.
