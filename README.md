# jssm shootout

Cross-library FSM performance comparison. This is an **orphan branch** — it
shares no history with `main`, is never merged, and its dependencies
(competitor libraries) never touch the mainline tree.

**It only runs when a human asks.** The single entry point is the
`workflow_dispatch`-only shim on main (`.github/workflows/shootout.yml`) or a
direct `node launch.cjs` from any AWS-credentialed shell. There is no push
trigger, no schedule, and nothing on this branch executes on its own.

## Layout

| file | role |
|---|---|
| `shapes.cjs` | library-neutral topologies (chain / dense / hub / messy), mirroring main's scaling suite |
| `contract.md` | the adapter interface: capability flags + core/action/guard/hook/data/timer methods |
| `adapters/*.cjs` | one adapter per library, all implementing the contract; `adapters/index.cjs` is the registry (+ documented `EXCLUDED` list) |
| `conformance.cjs` | the gate — drives every adapter through known machines and asserts state sequences; the suite refuses to benchmark a non-conformant set |
| `suite.cjs` | capability-gated benny throughput: construct/transition across shapes + action/guard/hook/data per supporting library; writes `shootout.json` |
| `memory.cjs` | retained bytes/machine + allocation bytes/transition (`node --expose-gc memory.cjs`); writes `memory.json` |
| `launch.cjs` | fire-and-forget Graviton launcher (same SSM PAT / instance profile / dead-man pattern as main's `graviton_perf.cjs`); runs conformance → suite → memory; `--dry-run` supported |
| `fixtures/` | frozen messy FSL fixtures, copied from main's `benchmark/fixtures` |

## Coverage

15 conformant libraries: jssm, xstate, @xstate/fsm, javascript-state-machine,
robot3, machina, nanostate, statebot, finity, typestate, stately.js,
fn-machine, fseh, easy-fsm, pastafarian. Probed-but-excluded (recorded as data
in `index.cjs`, not silently dropped): `@edium/fsm` (broken CommonJS build),
`xsm` (reactive store, not an edge-transition FSM).

## Fairness rules

- Each library is measured through **its own idiomatic path**: jssm constructs
  from FSL text (parsing is its real entry price); XState constructs from a
  config object and transitions through its pure `transition()` core (no
  actors, so actor lifecycle isn't billed against it).
- Competitor versions are **pinned** in `package.json` + lockfile and recorded
  per run in the result envelope.
- Capabilities that don't exist in a library are skipped, not zero-scored.

## Results

Published by the instance to the `perf_results` branch under
`shootout/<run-id>/` (`shootout.json`, `memory.json`, `meta.json`) — same data
branch as the mainline trend, separate namespace.

## Running locally (smoke only — local numbers are not data)

```
npm ci
node conformance.cjs            # must pass before benchmarking
node suite.cjs --quick          # throughput
node --expose-gc memory.cjs --quick   # footprint + per-transition allocation
```
