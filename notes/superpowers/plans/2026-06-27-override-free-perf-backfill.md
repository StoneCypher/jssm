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

**Files:**
- Modify: `src/buildjs/benchmark_scaling.cjs` — `buildShapeChain/Dense/Hub` use `closedWalk`; `transitionCase` drops `override('s0')` and loops `for (k<stepCount) transition(targets[k])`; record `stepCount` on the shape; the results post-processing (`:76–101`) multiplies ops by `stepCount` (or divides msPerOp) to report **per-transition** throughput.
- Test: `src/buildjs/tests/benchmark_scaling_shapes.spec.ts` (normalization math as a pure helper `perTransition(opsPerSec, stepCount)`)

**Interfaces:**
- Consumes: `closedWalk`.
- Produces: `perTransition(opsPerSec, stepCount)` = `opsPerSec * stepCount`; exported and unit-tested.

- [ ] Step 1: Failing test for `perTransition(10, 200) === 2000`.
- [ ] Step 2: Run; FAIL.
- [ ] Step 3: Implement `perTransition`; wire `transitionCase` to closed walks (no override) and apply normalization in the results shaping.
- [ ] Step 4: Run spec; pass. Then smoke-run `node src/buildjs/benchmark_scaling.cjs` against the current dist and confirm it completes and writes `scaling.json` with `transition` rows.
- [ ] Step 5: Commit.

---

### Task 5: Override-free action machine + `action` case

**Files:**
- Modify: `src/buildjs/benchmark_scaling.cjs` — `attachActionSupport` integrity check (`:225–231`) validates via a closed action walk instead of `override('s0')`; `actionCase` drops override and loops the closed action sequence; `buildShapeMessy` (`:341`) drops its trailing `override('s0')` and uses a closed sub-walk (walk legal exits from `s0` until first return to `s0`; if none within a bound, the shape stays feature-gated out).
- Test: `src/buildjs/tests/benchmark_scaling_shapes.spec.ts`

**Interfaces:**
- Consumes: `closedWalk`.
- Produces: `closedActionWalk(machine, n)` → `{ labels, states, stepCount }` forming a closed legal action sequence.

- [ ] Step 1: Failing test — build an action machine (bare labeled FSL), drive `closedActionWalk`'s labels with `action()`, assert each returns `true` and the machine returns to start.
- [ ] Step 2: Run; FAIL.
- [ ] Step 3: Implement; rewire `attachActionSupport` + `actionCase` + messy.
- [ ] Step 4: Run spec; pass. Smoke-run the full harness; confirm `action`, `list_exit_actions`, `probable_action_exits` rows present and no `override` token remains in the file (`grep -c override src/buildjs/benchmark_scaling.cjs` → 0).
- [ ] Step 5: Commit.

---

### Task 6: Multi-era bundle-name normalization in graviton_perf.cjs

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
