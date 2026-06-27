# Override-free perf backfill — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax. Execute task-by-task with TDD. Worktree work runs from the main session (subagents cannot mutate sibling worktrees in this repo).

**Goal:** Make the perf harness benchmark without `machine.override()` so the graviton backfill can reach back to jssm 5.11.0, recovering ~130 minor-versions of history (especially the action ops, which start at 5.144.3 today).

**Architecture:** Extract the shape/FSL/walk logic out of `benchmark_scaling.cjs` (currently un-exported, runs-on-require) into a new testable sibling module `benchmark_scaling_shapes.cjs`, matching the existing sibling-module pattern. Replace the `override('s0')` per-iteration reset with **closed-walk laps** (sequences that return to their start state, so continuous replay stays legal), and report **per-transition throughput** so shapes with different lap lengths stay comparable. Drop `allows_override:` from all generated FSL and the feature-probe. Extend `graviton_perf.cjs` bundle-name normalization to cover the 5.11 and 5.50 eras.

**Tech Stack:** Node CommonJS build scripts; vitest (`vitest.spec.config.ts`); benny.

## Global Constraints

- Backfill floor is **5.11.0** (earliest git tag); below that is out of scope.
- Per-op method floors (feature-probe must degrade above these): `has_state` 5.30.1, `edges_between` 5.60.0; `transition`/`action`/`list_exit_actions`/`probable_action_exits`/`construct` reach 5.11.0.
- No `machine.override()` and no `allows_override:` anywhere in generated FSL or probes — that is the whole point.
- New continuity: old override-based c8g numbers are discarded, not spliced.
- Spec suite enforces 100% coverage over `src/ts/**`; `src/buildjs/**` is not in that gate, but new sibling modules get their own `src/buildjs/tests/*.spec.ts` (matching the existing siblings).
- Never hand-bump the version; `/sc-commit` does it at PR time.

---

### Task 1: Extract testable shape module (no behavior change yet)

**Files:**
- Create: `src/buildjs/benchmark_scaling_shapes.cjs`
- Modify: `src/buildjs/benchmark_scaling.cjs` (require the new module instead of inline defs)
- Test: `src/buildjs/tests/benchmark_scaling_shapes.spec.ts`

**Interfaces:**
- Produces: `buildChainFSL(n)`, `buildDenseFSL(n)`, `buildHubFSL(n)` → FSL strings; `module.exports` of each. (Behavior identical to current inline versions — still WITH `allows_override:` at this step, to prove pure extraction.)

- [ ] Step 1: Write failing tests asserting `buildChainFSL(3)` contains `s0 -> s1;`, `s2 -> s0;` and the others produce the expected edges (port current behavior).
- [ ] Step 2: Run `npx vitest run --config vitest.spec.config.ts src/buildjs/tests/benchmark_scaling_shapes.spec.ts --coverage.enabled=false`; expect FAIL (module missing).
- [ ] Step 3: Create `benchmark_scaling_shapes.cjs` with the three generators moved verbatim + `module.exports`.
- [ ] Step 4: Rewire `benchmark_scaling.cjs` to `require('./benchmark_scaling_shapes.cjs')`.
- [ ] Step 5: Run the new spec (pass) and a full `npm run vitest-spec` (no regressions).
- [ ] Step 6: Commit.

---

### Task 2: Drop `allows_override:` from fixtures and the feature-probe

**Files:**
- Modify: `src/buildjs/benchmark_scaling_shapes.cjs` (generators), `src/buildjs/benchmark_scaling.cjs:363` (probe), `:317` (`loadMessyFixture` prefix), `:202` (`attachActionSupport` labeled FSL)

**Interfaces:**
- Produces: generators emit bare FSL (no `allows_override:` first line). The probe becomes `sm(['s0 -> s1;'])`.

- [ ] Step 1: Failing tests: `buildChainFSL(3)` / `buildDenseFSL(3)` / `buildHubFSL(3)` must NOT contain `allows_override`.
- [ ] Step 2: Run; expect FAIL.
- [ ] Step 3: Remove the `'allows_override: true;'` lines from each generator, the probe, `loadMessyFixture`, and the action-overlay FSL builder.
- [ ] Step 4: Run new spec (pass).
- [ ] Step 5: Commit.

---

### Task 3: Closed-walk sequences (chain/dense/hub) returning to start

**Files:**
- Modify: `src/buildjs/benchmark_scaling_shapes.cjs` — add `closedWalk(shapeKind, n, minSteps)` returning `{ targets: string[], stepCount }` where `targets[i]` is a legal transition target from the state reached after `targets[i-1]`, and after `stepCount` steps the machine is back at the walk's start state.
- Test: `src/buildjs/tests/benchmark_scaling_shapes.spec.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `closedWalk(kind, n, minSteps)`. Rules — chain: walk the ring `s0→s1→…→s(n-1)→s0`, repeat to ≥ minSteps rounded up to a whole number of laps (lap length n). dense: `s0→s1→s0→s2→…` 2-cycles, or a Hamiltonian-ish lap; choose 2-cycles (`s_i→s_j→s_i`) so any even step count closes. hub: `s0→s_k→s0` 2-cycles. Each returns `stepCount` = actual steps (≥ minSteps, closing the walk).

- [ ] Step 1: Failing test — for each kind/n, build the machine (bare FSL) and assert: every `targets[i]` is a legal transition from the current state (drive the real machine with `transition()` and require each returns truthy), and after the full walk `machine.state()` equals the start state. Use `minSteps=100`.
- [ ] Step 2: Run; expect FAIL (`closedWalk` undefined).
- [ ] Step 3: Implement `closedWalk` per the rules above.
- [ ] Step 4: Run; pass.
- [ ] Step 5: Commit.

---

### Task 4: Override-free `transition` case + per-transition normalization

> **✅ DONE — commit `ef1cd8b1`.** 32/32 unit specs; smoke run normalized all transition rows (chain-10/200/1000 now comparable at 5–8M transitions/sec); full `vitest-spec` 6773 pass / 100% cov over `src/ts/**`.

> **Refinement (2026-06-27, during execution):** the original plan's line refs were stale and it under-counted the `override('s0')` sites. The live file has **six** override sites, not two: `attachActionSupport` (integrity, T5), `buildShapeMessy` (T5), `transitionCase` (T4), `actionCase` (T5), **`memoryPass`** (T4 — transition batch, plus T5 action batch), and **`warmupPass`** (T4 — 6 cold/warm batches). T5's `grep -c override → 0` gate covers all six, so the transition-side trio (`transitionCase`, `memoryPass` transition batch, `warmupPass`) all move here in T4.
>
> **Uniform-closure rule.** Every transition replay runs the **full** closed walk (`stepCount` steps), never a `K`-truncated prefix, because the only guarantee a closed walk gives is *return-to-start after a whole walk*. Partial replays would strand `shape.machine` off `s0` and the next replay site (benny's next iteration, then `memoryPass`, then `warmupPass` — they share the persistent `shape.machine`) would hit an illegal transition. So `shape.machine` lands back on `s0` after every batch, override-free.
>
> **Memory divisor consequence.** `collectMemory` divides alloc by a single `K` (`benchmark_scaling_memory.cjs:183`). A `stepCount`-length transition batch (e.g. `chain-200` → 200) would then report half the true bytes/op. Fix: `opBatches` yields `[name, fn, opCount]` triples and `collectMemory` divides each batch by its own `opCount` (default `K` when absent, preserving the read-only batches). This is a small, in-scope memory-module change.
>
> **Read-only ops stay per-100.** `has_state`, `edges_between`, `list_exit_actions`, `probable_action_exits` never read or mutate machine state across the batch (their args are explicit), so they keep the fixed `K=100` precomputed arrays (`transitionSeq`, `edgePairs`, `actionStates`) and need **no** closed walk and **no** normalization. Only `transition()` and `action()` rows are normalized.

**Files:**
- Modify: `src/buildjs/benchmark_scaling.cjs` — `buildShapeChain/Dense/Hub` attach `transitionWalk = closedWalk(kind, n, K)` to the shape; `transitionCase` drops `override('s0')` and loops `for (k<stepCount) transition(transitionWalk.targets[k])`; `memoryPass` transition batch and `warmupPass` likewise run the full closed walk (no override) and report their `opCount`; a new `normalizePass` (run first in the `setImmediate` chain, before `exponentsPass`) multiplies `ops` by `stepCount` and divides `msPerOp` by `stepCount` for `transition()` rows (and `action()` rows in T5), using a `name → stepCount` map built from the shapes.
- Modify: `src/buildjs/benchmark_scaling_memory.cjs` — `opBatches` triples `[name, fn, opCount]`; `collectMemory` divides each batch alloc by its own `opCount` (fallback `K`).
- Test: `src/buildjs/tests/benchmark_scaling_shapes.spec.ts` (pure `perTransition(opsPerSec, stepCount)`); `src/buildjs/tests/benchmark_scaling_memory.spec.ts` (per-batch divisor).

**Interfaces:**
- Consumes: `closedWalk`.
- Produces: `perTransition(opsPerSec, stepCount)` = `opsPerSec * stepCount`; exported and unit-tested. `collectMemory` honors per-batch `opCount`.

- [ ] Step 1: Failing test for `perTransition(10, 200) === 2000`; failing memory test that a 200-op batch divides by 200 (not `K`).
- [ ] Step 2: Run; FAIL.
- [ ] Step 3: Implement `perTransition`; attach `transitionWalk`; rewire `transitionCase` + `memoryPass` transition batch + `warmupPass` to full closed walks (no override); add `normalizePass`; make `collectMemory` per-batch.
- [ ] Step 4: Run spec; pass. Then smoke-run `node src/buildjs/benchmark_scaling.cjs` against the current dist; confirm it completes, writes `scaling.json` with `transition` rows, and `grep -c "override" benchmark_scaling.cjs` shows only the remaining action/messy sites (T5 drives it to 0).
- [ ] Step 5: Commit.

---

### Task 5: Override-free action machine + `action` case

> **✅ DONE — commit `0cfefb27`.** `grep -c '.override(' benchmark_scaling.cjs` = 0; no `allows_override` emitted. Smoke run: 10 normalized `action()` rows + 2 restored `messy-*` `transition()` rows (closedSubWalk found s0 cycles). `labelActionEdges` / `closedActionWalk` / `closedSubWalk` are pure + unit-tested in the shapes module.

> **Refinement (2026-06-27).** `attachActionSupport:178` still builds its labeled action FSL with a leading `allows_override: true;` line, and `loadMessyFixture:293` still prepends one — both must go (the spec's "drop `allows_override` everywhere"). `closedActionWalk` is implemented **pure** in the shapes module by mapping the closed *transition* walk's `(prev → target)` edges to their action labels (same topology ⇒ same closure), so it needs no live machine — it takes the transition walk, the start state, and a `labelsByPair` map. The edge-labeling logic is extracted from `attachActionSupport` into a reusable `labelActionEdges(machine)` → `{ fsl, labelsByPair }` so both the harness and the test build labels the same way. The action machine and its `actionWalk` end on `s0`, so `actionCase` and `memoryPass`'s action batch replay it override-free (full walk, normalized by `stepCount`). `messy` only needs a closed walk for its **mutating** `transition()` case; if BFS finds no `s0→…→s0` cycle within a bound, set `transitionWalk = null` and skip messy's `transition()`/memory/warmup transition batch (its read-only ops still run).

**Files:**
- Modify: `src/buildjs/benchmark_scaling.cjs` — drop `allows_override` from `attachActionSupport`'s action FSL (`:178`) and `loadMessyFixture` (`:293`); `attachActionSupport` builds labels via `labelActionEdges`, validates integrity via a closed action walk (no `override`), and stores `actionWalk`; `actionCase` + `memoryPass` action batch loop the full closed action walk (no override, normalized); `buildShapeMessy` drops its trailing `override('s0')` and uses a BFS closed sub-walk (or `transitionWalk = null` + feature-gate the transition case).
- Modify: `src/buildjs/benchmark_scaling_shapes.cjs` — add `labelActionEdges(machine)` and pure `closedActionWalk(transitionWalk, startState, labelsByPair)` → `{ labels, stepCount }`.
- Test: `src/buildjs/tests/benchmark_scaling_shapes.spec.ts`

**Interfaces:**
- Consumes: `closedWalk`, `labelActionEdges`.
- Produces: `closedActionWalk(transitionWalk, startState, labelsByPair)` → `{ labels, stepCount }` forming a closed legal action sequence.

- [ ] Step 1: Failing test — build a base machine + its labeled action machine via `labelActionEdges` (bare FSL), build `closedActionWalk` from `closedWalk` + the label map, drive `action()` over its labels, assert each returns `true` and the action machine returns to start.
- [ ] Step 2: Run; FAIL.
- [ ] Step 3: Implement `labelActionEdges` + `closedActionWalk`; rewire `attachActionSupport` + `actionCase` + `memoryPass` action batch + messy; extend `normalizePass` to `action()` rows.
- [ ] Step 4: Run spec; pass. Smoke-run the full harness; confirm `action`, `list_exit_actions`, `probable_action_exits` rows present and no `override` token remains (`grep -c override src/buildjs/benchmark_scaling.cjs` → 0).
- [ ] Step 5: Commit.

---

### Task 6: Multi-era bundle-name normalization in graviton_perf.cjs

> **✅ DONE — commit `cb1836be`.** The 5.50 mappings already existed; the only gap was the 5.11 nonmin fallback (5.11 ships no `.cjs.nonmin.js`, so `dist/jssm.es5.nonmin.cjs` now falls back to the unmin `.cjs.js`, guarded + ordered after the 5.50 mapping). `buildRemoteScript` needs no change (it uses the hard committed-dist guard, not normalization). 120/120 graviton specs.

**Files:**
- Modify: `src/scripts/graviton_perf.cjs` — `buildDetachedUserData` (and `buildRemoteScript` if it has the same block) normalization: map historical es5-cjs bundle names to `dist/jssm.es5.cjs` and `dist/jssm.es5.nonmin.cjs`. Cover: 5.11 (`jssm.es5.cjs.js` + `jssm.es5.cjs.min.js`), 5.50 (`jssm.es5.cjs.js` + `jssm.es5.cjs.nonmin.js`), 5.98+ (already correct).
- Test: `src/scripts/tests/graviton_perf.spec.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: user-data contains `cp` fallbacks: non-min target `dist/jssm.es5.cjs` from first existing of `jssm.es5.cjs.js`; nonmin target `dist/jssm.es5.nonmin.cjs` from first existing of `jssm.es5.cjs.nonmin.js`, then `jssm.es5.cjs.js` (5.11 had no separate nonmin — the unmin bundle is `.cjs.js`), guarded so it never overwrites an existing modern bundle.

- [ ] Step 1: Failing tests asserting the user-data contains the 5.11 mapping (`cp dist/jssm.es5.cjs.js dist/jssm.es5.cjs`) and a nonmin fallback chain.
- [ ] Step 2: Run `npx vitest run --config vitest.spec.config.ts src/scripts/tests/graviton_perf.spec.ts --coverage.enabled=false`; FAIL.
- [ ] Step 3: Extend the normalization block.
- [ ] Step 4: Run; pass.
- [ ] Step 5: Commit.

---

### Task 7: Local rig verification across the floor spread

**Files:** none (verification only; throwaway rig under `C:/tmp`)

- [ ] Step 1: For each of 5.11.0, 5.30.1, 5.60.0, 5.90.0, 5.130.0: `npm install jssm@<v>` into an isolated dir, lay the new harness + its siblings + `benchmark/fixtures` beside the installed `dist/`, and `node benchmark_scaling.cjs`.
- [ ] Step 2: Confirm each completes and writes `scaling.json`; confirm the op set matches the floors (5.11 has transition/action/list_exit_actions/probable_action_exits but not has_state/edges_between; 5.30.1 adds has_state; 5.60.0 adds edges_between).
- [ ] Step 3: Record the observed op sets in the PR body. No commit.

---

### Task 8: Release + re-baseline orchestration

**Files:**
- Modify: `.github/workflows/perf_backfill.yml` — add a `force` boolean input passed through as `--force` so already-measured releases (5.130–5.143) can be re-measured under the new methodology.
- Test: n/a (workflow YAML).

- [ ] Step 1: Add the `force` input + thread `--force` into the `graviton_perf.cjs` invocation.
- [ ] Step 2: `/sc-commit` on the branch (version bump + full build + commit).
- [ ] Step 3: Open PR; verify CI green; merge (with explicit permission — protected branch); verify npm publish.
- [ ] Step 4: Drop the existing `c8g.medium/` trail on `perf_results` (CloudShell `aws s3 rm --recursive` + a branch commit removing the dirs), so the new methodology starts clean.
- [ ] Step 5: Dispatch `perf_backfill` in batches across 5.11→latest (mind the EC2 concurrent-instance limit), `force=true` for 5.130–5.143; sync; confirm the chart redraws.

---

## Self-review notes

- Spec coverage: closed-walk reset (T3–T5), drop allows_override (T2), per-transition (T4), multi-era bundle names (T6), floors honored via existing feature-probe (unchanged; T7 verifies), re-baseline + `--force` (T8). All spec sections mapped.
- Messy shape: handled in T5 (closed sub-walk or feature-gate), matching the spec caveat.
- Downstream metric consumers: T4 changes the results shaping; the markdown pivot + chart read whatever values are emitted (no per-100 assumption to update beyond the shaping itself) — implementer confirms during T4 smoke run.
