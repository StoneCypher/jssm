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
| `adapters/*.cjs` | one adapter per library: idiomatic definition + construct + transition, common interface |
| `suite.cjs` | benny suite over adapters × shapes × ops; writes `shootout.json` |
| `launch.cjs` | fire-and-forget Graviton launcher (same SSM PAT / instance profile / dead-man pattern as main's `graviton_perf.cjs`); `--dry-run` supported |
| `fixtures/` | frozen messy FSL fixtures, copied from main's `benchmark/fixtures` |

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
`shootout/<run-id>/` (`shootout.json`, `meta.json`) — same data branch as the
mainline trend, separate namespace.

## Running locally (smoke only — local numbers are not data)

```
npm ci
node suite.cjs --quick
```
