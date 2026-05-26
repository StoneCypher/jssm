# jssm Diagnostic Benchmark — Design

> **Status:** Design — ready for implementation planning
> **Date:** 2026-05-26
> **Author:** John Haugeland (with Claude collaboration)
> **Origin question:** "Would moving to operating on numbers internally, rather than strings, be a performance boost?"

---

## Summary

A scaling benchmark added alongside the existing `benny` suite to localize where time actually goes inside jssm's hot path. Generates synthetic machines at varying state counts and topologies, measures the suspect operations both inside `transition()` and in isolation, and writes machine-readable plus human-readable results to `benchmark/results/`.

The output is intended as evidence, not as a refactor. If the curves point at the linear `edges_between` filter as the dominant cost, an adjacency-index refactor becomes the obvious next step. If they point at per-op overhead, the string-vs-number representational question becomes worth prototyping. If they point at hooks, that's a third path. We measure first, choose second.

---

## Goals

- **Diagnose, don't prototype.** Locate the bottleneck before committing to a refactor branch.
- **Augment, don't replace.** Leave the existing 4-state `benchmark.cjs` and `benchmark/results/general.json` untouched, so the 2022 → present trend stays readable.
- **Isolate suspects.** Measure `edges_between` both indirectly (inside transition) and directly (called alone), so a collapse on dense graphs can be attributed cleanly.
- **Reproducible across time.** The structured shapes (`chain`/`dense`/`hub`/`hooked`) are deterministic from N — their *definition* is the topology, so the generator code can evolve without invalidating the meaning. The `messy` shape, where "messy" is a fuzzy idea, is frozen as a checked-in FSL fixture generated once during initial implementation; no generator runs at benchmark time. This protects the long-term comparability of `messy` numbers from drift in the generation recipe.
- **Cheap to read.** Emit a markdown table that groups results by operation across sizes, so the scaling curve is visible at a glance without opening JSON.

## Non-goals (v1)

- No prototype branch. No code changes to `jssm.ts`.
- No CPU profiler integration (`--prof`, 0x, clinic). Ops/sec across shapes is the signal.
- No memory measurement. Time only.
- No comparison against other FSM libraries (xstate, robot, etc.).
- No CI integration. Manual run only — `npm run benny:scaling`.
- No regression-detection automation. Numbers compared by eye against `general.json` and prior `scaling.json` runs.

---

## Machine shapes

All machines are generated synthetically as FSL source strings and constructed via `sm\`...\``. Seed is fixed (`42`) for any randomized shape.

| Shape | States | Edges | Topology |
|---|---|---|---|
| `chain-N` | 10, 50, 200, 1000 | N | Linear: `s0 -> s1 -> ... -> s_{N-1}`; wrap from last to first. Sparse baseline. |
| `dense-N` | 10, 50, 200 | ~N²−N | Every state to every other state (no self-loops). Stresses the `edges_between` linear filter. |
| `hub-N` | 50, 200 | ~2N | One hub state; every other state has an edge to the hub and from the hub. Realistic asymmetric topology with shared `from`. |
| `messy-1000` | 1000 | ~3000 | Pseudo-random topology with mix of forward, back, and cross edges. Defeats accidental locality the structured shapes might give to V8's inline caches. **Frozen fixture**: the FSL source is generated *once* during initial implementation and checked in as `benchmark/fixtures/messy-1000.fsl`. The benchmark reads this file at startup; no generator runs at benchmark time. This guarantees the shape stays bit-identical across years and refactors, so the ops/sec number for `messy-1000` remains directly comparable to its earliest recorded value. |
| `messy-5000` | 5000 | ~15000 | Same generation procedure as `messy-1000`, scaled to 5000 states (~3 edges/state). **Frozen fixture** at `benchmark/fixtures/messy-5000.fsl`, generated once alongside the 1000-state file, never regenerated. Surfaces any super-linear cost that doesn't yet show at 1000 states. |
| `hooked-200` | 200 | ~600 (hub-shaped) | `hub-200` with a per-edge `{ from, to, handler: () => true, kind: 'hook' }` registered for every edge, plus one `{ handler: () => true, kind: 'any transition' }` global hook. Isolates hook-dispatch scaling from topology. |

`dense-1000` is deliberately omitted (~10⁶ edges blows out construction and is past the interesting regime).

## Operations measured

For each shape:

1. **`transition()`** — main hot path. Each shape's setup precomputes a length-K array of valid target states (K=100 to match the existing benny suite's per-call work); the timed callable just iterates that array and calls `transition()` on each entry, then resets state. K is constant across shapes so per-transition cost is directly comparable.
2. **`action()`** — alternative dispatch path. Only on shapes where actions are defined (the structured shapes get a small set of named actions assigned during generation; `messy-1000` does not).
3. **`edges_between(from, to)`** — called directly with valid `(from, to)` pairs, in isolation from transition overhead.
4. **`has_state()`** — pure `Map.has`. The cheapest representational case; serves as the floor.
5. **Construction time** — `sm\`...\`` end-to-end, including FSL parse. Measured in a separate suite (not in the ops/sec loop) since construction is one-shot and dominated by parser cost.

## How to read the output

- **`transition` on `chain-N` roughly flat as N grows** → per-op overhead dominates. The `Map<string>` lookups, hook dispatch, and bookkeeping aren't sensitive to graph size. String→number internals or hook restructuring become the candidates.
- **`transition` on `dense-N` collapses much faster than on `chain-N` at the same N** → the linear edge filter is the bottleneck. Adjacency-index refactor is the lever.
- **`edges_between` (direct) scales roughly with total edges** → confirms filter cost cleanly without transition noise.
- **`hooked-200` significantly slower than `hub-200`** → hook dispatch is its own cost center, worth investigating independently.
- **`has_state` flat across all sizes** → V8's `Map<string>` is doing its job for interned keys; representational change won't help the cheap path much.
- **`messy-1000` notably worse per-op than `chain-1000`** → V8 inline-cache locality was helping the structured shapes; the real-world number is closer to `messy-1000`.

## Architecture

### Files

```
src/buildjs/
├── benchmark.cjs              # existing — UNCHANGED
└── benchmark_scaling.cjs      # new — generates structured shapes, loads messy fixture,
                               #       runs benny suite, writes results

benchmark/
├── fixtures/
│   ├── messy-1000.fsl         # new — frozen FSL source for the messy-1000 machine;
│   │                          #       generated once during initial implementation
│   │                          #       (header comment records date, commit, and a
│   │                          #       short prose description of the procedure used,
│   │                          #       for audit only — there is no regenerator script)
│   └── messy-5000.fsl         # new — same as above, scaled to 5000 states / ~15000
│                              #       edges; generated in the same one-shot pass
└── results/
    ├── general.json           # existing — UNCHANGED (legacy 4-state suite output)
    ├── scaling.json           # new — machine-readable results (same shape as general.json)
    └── scaling.md             # new — human-readable table grouped by operation
```

### Structured-shape generators

A small inline section of `benchmark_scaling.cjs` builds FSL source strings for the deterministic shapes. No new exported module — this is benchmark scaffolding, not library code.

```js
function buildChainFSL(n)  { /* "s0 -> s1; s1 -> s2; ...; s_{n-1} -> s0;" */ }
function buildDenseFSL(n)  { /* every-to-every */ }
function buildHubFSL(n)    { /* hub-and-spokes */ }
function buildHookedHub(n) { /* hub + set_hook calls applied after construction */ }
```

These are safe to evolve over time because their meaning is defined by N alone — a `chain-1000` is unambiguously "1000 states in a wrap-around line" regardless of how the generator spells it.

### Messy fixtures

`benchmark/fixtures/messy-1000.fsl` (~50–100KB) and `benchmark/fixtures/messy-5000.fsl` (~300–500KB) are plain FSL source files checked into the repo. The benchmark reads each once at startup via `fs.readFileSync` and passes it to `sm\`${contents}\``. There is no regenerator script; the files are the artifacts. Their header comments are the only audit trail. (FSL accepts `//` and `/* */` comments; `#` is not a comment marker in the grammar, so the header uses `//`.)

```
// messy-1000.fsl - frozen benchmark fixture
// Generated: 2026-05-26 against jssm 5.128.0
// Procedure: 1000 states (s0..s999), 3000 edges placed by a one-shot
// mulberry32(seed=0xC0FFEE ^ N) run rolling 3 candidate edges per state:
//   roll < 0.50 -> forward (target = src + rand(1..5) mod N)
//   roll < 0.75 -> back    (target = src - rand(1..50) mod N)
//   else        -> cross   (target = rand(0..999))
// Self-loops skipped; (from, to) deduped (up to 8 re-rolls then drop).
// DO NOT REGENERATE - long-term comparability of messy-1000 ops/sec numbers
// depends on this file being bit-identical across years.
```

`messy-5000.fsl` uses the same procedure scaled to 5000 states / 15000 edges, with an analogous header comment.

No PRNG code ships with the benchmark.

### npm scripts

```json
"benny:scaling": "node ./src/buildjs/benchmark_scaling.cjs",
"benny:all":     "npm run benny && npm run benny:scaling"
```

Both added to `package.json`. Existing `benny` script untouched.

### Result format

`scaling.json` mirrors `general.json` exactly: a `{name, date, version, results: [{name, ops, margin, percentSlower}]}` envelope. Names are prefixed by shape and operation, e.g. `"chain-200 transition()"`, `"dense-50 edges_between()"`, `"hooked-200 transition()"`. That keeps any downstream tooling that already reads `general.json` immediately compatible.

`scaling.md` is generated in the same run by re-reading the just-written `scaling.json` and pivoting it into one markdown table per operation, with shape on rows and a single `ops/sec` column. Example:

```markdown
## transition()

| shape         | ops/sec |
|---------------|--------:|
| chain-10      |  X      |
| chain-50      |  X      |
| chain-200     |  X      |
| chain-1000    |  X      |
| dense-10      |  X      |
| dense-50      |  X      |
| dense-200     |  X      |
| hub-50        |  X      |
| hub-200       |  X      |
| hooked-200    |  X      |
| messy-1000    |  X      |
```

## Out of scope (deliberately, reiterated)

- Any change to `src/ts/jssm.ts`.
- Any change to `benchmark.cjs` or `general.json`.
- Any new runtime dependency. `benny` is already a dev dep; the seeded PRNG is inlined.
- Test coverage for `benchmark_scaling.cjs` itself — it's a one-shot diagnostic tool, not library code. The FSL it generates is validated by the fact that `sm\`...\`` accepts it and transitions succeed.

## Open questions resolved during brainstorming

- **Replace or augment existing suite?** Augment. Keeps 2022 trend readable.
- **Sizes for chain?** 10, 50, 200, 1000.
- **Sizes for dense?** 10, 50, 200 (1000 omitted as past interesting regime).
- **Include hub topology?** Yes, at 50 and 200.
- **Include hooks at scale?** Yes, one variant: `hooked-200` (hub-shaped, hook per edge, plus an `any transition` global hook).
- **Include a messy 1000-state machine?** Yes — frozen FSL fixture at `benchmark/fixtures/messy-1000.fsl`, generated once during initial implementation, never regenerated. No PRNG ships with the benchmark; the file is the artifact.
- **Include a messy 5000-state machine?** Yes — same treatment as messy-1000, frozen fixture at `benchmark/fixtures/messy-5000.fsl`, ~15000 edges. Surfaces super-linear costs that may not appear at 1000 states.
- **Where do results live?** `benchmark/results/scaling.{json,md}` alongside existing `general.json`.
