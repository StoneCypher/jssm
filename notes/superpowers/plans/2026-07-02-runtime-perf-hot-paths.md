# Runtime Perf Hot-Path Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline in the main session. Subagent-driven execution is NOT usable for this plan: this repo's background agents cannot mutate sibling worktrees (their cwd resets to the main checkout), and this work lives in the worktree named below. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove per-call object dereference scans, redundant map probes, and per-call closure allocations from the jssm transition, edges_between, and walk hot paths — the code-level fixes for the diagnosed 5.142–5.143 "object weight" regression (transition −20%, edges_between −40%/−60% dense).

**Architecture:** All changes are behavior-preserving micro-restructurings of existing hot functions in `src/ts/jssm.ts` and `src/ts/jssm_util.ts`. No public API, signature, or contract changes. Each task adds *pinning tests first* (they must pass on the OLD code — these fixes preserve semantics; a failing pinning test means the rewrite is wrong), then applies the rewrite, then re-runs.

**Tech Stack:** TypeScript (non-strict), vitest (spec suite has a **100% coverage gate over src/ts/**), eslint with `fp/no-loops` (use `// eslint-disable-line` comments matching existing file idiom).

## Global Constraints

- Work in worktree `C:\Users\john\projects\worktrees\stonecypher_jssm_perf_26-07-02_runtime-hot-paths`, branch `perf_26-07-02_runtime-hot-paths`. Never touch `main`.
- NO compound shell commands (no `&&`, `||`, `;`, pipes). One command per invocation.
- npm commands run from the Bash tool (Git Bash), never PowerShell — npm scripts need Git usr/bin on PATH.
- `git add <explicit paths>` then `git commit` as separate commands; Conventional Commits messages.
- Never hand-bump the package version; `/sc-commit` at the end handles bump + full build.
- Single-test-file iteration MUST use `--coverage.enabled=false` (a lone spec file always trips the 100% global coverage gate). Full `npm run vitest-spec` only at the end.
- Any new branch you introduce in src must be reachable by a test, or the 100% spec-coverage gate fails the build. Unreachable defensive guards keep the existing `/* v8 ignore next */` idiom.
- No characterization/pinning of wrong behavior; no golden-file tests; assert real semantics.
- Local benchmark output goes under `build/` only — never committed; benchmark tables go in the PR body with a local-host caveat.

---

### Task 1: `edges_between()` — numeric-id scan instead of edge-object deref loop

**Files:**
- Modify: `src/ts/jssm.ts:4320-4333` (`edges_between`)
- Test: `src/ts/tests/edges_between.spec.ts`

**Interfaces:**
- Consumes: `this._state_interner.id_of(name): number | undefined` (existing, see usage at `jssm.ts:4646`); `this._edge_to_ids: Array<number>` (edge id → interned to-state id, written unconditionally for every edge at `jssm.ts:1090`); `this._outbound_edge_ids: Map<string, Array<number>>`.
- Produces: no interface change; `edges_between(from, to)` keeps its exact signature and return semantics.

- [ ] **Step 1: Add pinning tests (must pass on the OLD code)**

Append inside the existing `describe('edges_between', ...)` block in `src/ts/tests/edges_between.spec.ts`:

```typescript
  test('returns empty array when to does not exist in the machine', () => {
    const m = sm`a -> b;`;
    expect(m.edges_between('a', 'nonexistent')).toEqual([]);
  });

  test('returns every parallel action edge between the same pair, in declaration order', () => {
    const m  = sm`a 'go' -> b; a 'run' -> b;`,
          ab = m.edges_between('a', 'b');
    expect(ab.length).toBe(2);
    expect(ab[0].action).toBe('go');
    expect(ab[1].action).toBe('run');
  });
```

- [ ] **Step 2: Run the file; verify both new tests pass against the old implementation**

Run: `npx vitest run "src/ts/tests/edges_between.spec.ts" --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS (6 tests). If the parallel-edge test fails here, STOP — the pinning assumption is wrong; report instead of proceeding.

- [ ] **Step 3: Rewrite the method**

Replace the body of `edges_between` (`src/ts/jssm.ts:4320-4333`) with:

```typescript
  edges_between(from: string, to: string): JssmTransition<StateType, mDT>[] {
    // Filter only this state's outbound edges instead of the full _edges array.
    // For machines with E total edges and average out-degree d, this is O(d)
    // instead of O(E) — a large win on dense graphs where d << E.  The `?? []`
    // covers from-states that have no outgoing edges (terminal states) and
    // states that don't exist at all, both of which return [] without iterating.
    //
    // The match itself compares interned numeric state ids against the packed
    // _edge_to_ids array rather than dereferencing each edge object for a
    // string compare: non-matching edges never touch an edge object, which is
    // most of the cost on dense shapes (heavier edge objects degrade the deref
    // loop — the 5.142/5.143 regression mechanism).  Every state named by any
    // edge is interned at construction, so an unknown `to` provably has no
    // edges and returns [] immediately.
    const to_id = this._state_interner.id_of(to);
    if (to_id === undefined) { return []; }
    const outbound: Array<number> = this._outbound_edge_ids.get(from) ?? [];
    const result: JssmTransition<StateType, mDT>[] = [];
    for (const edgeId of outbound) {
      if (this._edge_to_ids[edgeId] === to_id) { result.push(this._edges[edgeId]); }
    }
    return result;
  }
```

- [ ] **Step 4: Re-run the test file; verify all pass**

Run: `npx vitest run "src/ts/tests/edges_between.spec.ts" --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS (6 tests). The `to_id === undefined` early return is covered by Step 1's first test.

- [ ] **Step 5: Commit**

```bash
git add src/ts/jssm.ts src/ts/tests/edges_between.spec.ts
git commit -m "perf: edges_between compares interned numeric ids, not edge-object strings"
```

---

### Task 2: `auto_set_state_timeout()` — skip the map probe on after-free machines

**Files:**
- Modify: `src/ts/jssm.ts:5052-5060` (`auto_set_state_timeout`)
- Test: `src/ts/tests/after_mapping.spec.ts`

**Interfaces:**
- Consumes: `this._after_mapping: Map<string, [string, number]>` (populated only by `after` clauses, `jssm.ts:1061-1063`).
- Produces: no interface change.

- [ ] **Step 1: Confirm existing coverage of the after path**

Run: `npx vitest run "src/ts/tests/after_mapping.spec.ts" --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS. This suite exercises machines WITH `after` clauses (covers the non-empty branch); every non-`after` machine in the rest of the suite covers the new early return. No new test needed unless this file turns out not to drive a real transition on an `after` machine — if so, add one there that transitions and asserts the timer state.

- [ ] **Step 2: Add the size gate**

Replace the body of `auto_set_state_timeout` (`src/ts/jssm.ts:5052-5060`) with:

```typescript
  auto_set_state_timeout(): void {

    // called on every successful transition-commit.  Machines with no `after`
    // clauses at all (the overwhelmingly common case) previously still paid a
    // string hash + map probe here per transition; one integer size read
    // short-circuits that.
    if (this._after_mapping.size === 0) { return; }

    const after_res = this._after_mapping.get(this._state);
    if (after_res !== undefined) {
      const [ next_state, after_time ] = after_res;
      this.set_state_timeout(next_state, after_time);
    }

  }
```

- [ ] **Step 3: Re-run after_mapping tests**

Run: `npx vitest run "src/ts/tests/after_mapping.spec.ts" --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ts/jssm.ts
git commit -m "perf: gate auto_set_state_timeout on _after_mapping.size before probing"
```

---

### Task 3: `_update_hook_fields()` — pointer-compare short-circuit for `HOOK_PASSED`

**Files:**
- Modify: `src/ts/jssm.ts:6616-6623` (`_update_hook_fields`)
- Test: `src/ts/tests/hook_complex_result.spec.ts` (existing coverage; add a data-carrying pin if absent)

**Interfaces:**
- Consumes: module-level frozen singleton `HOOK_PASSED` (`jssm.ts:6696`). It is declared *after* `_update_hook_fields` in the file — legal, both are module scope and only touched at call time.
- Produces: no interface change; still returns `true` iff `res` carried an own `data` property.

- [ ] **Step 1: Verify hook data-mutation coverage passes before the change**

Coverage already exists: `src/ts/tests/data.spec.ts:92-221` pins ~10 hook kinds returning `{ pass: true, data: ... }` and asserts the machine's data changed — exactly the non-`HOOK_PASSED` complex-result path. No new test needed.

Run: `npx vitest run "src/ts/tests/data.spec.ts" "src/ts/tests/hook_complex_result.spec.ts" --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS.

- [ ] **Step 2: Add the short-circuit**

Replace `_update_hook_fields` (`src/ts/jssm.ts:6616-6623`) with:

```typescript
function _update_hook_fields<mDT>(hook_args: HookContext<mDT>, res: HookComplexResult<mDT>): boolean {
  // HOOK_PASSED is the shared frozen outcome for "no hook installed" and for
  // hooks returning true/undefined — the overwhelming majority of the up-to-
  // ~10 steps per hooked transition.  It can never carry `data` (frozen, built
  // without one), so one pointer compare replaces the hasOwnProperty
  // reflection call for the common case.
  if (res === HOOK_PASSED) { return false; }
  if (Object.prototype.hasOwnProperty.call(res, 'data')) {
    hook_args.data      = res.data;
    hook_args.next_data = res.next_data;
    return true;
  }
  return false;
}
```

Also update the `HOOK_PASSED` doc comment at `jssm.ts:6677-6694` — append to the end of the paragraph: `_update_hook_fields additionally identity-checks HOOK_PASSED to skip its own-property probe.`

- [ ] **Step 3: Run the hook suites**

Run: `npx vitest run "src/ts/tests/hooks.spec.ts" "src/ts/tests/hook_complex_result.spec.ts" "src/ts/tests/posthooks.spec.ts" --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ts/jssm.ts
git commit -m "perf: identity short-circuit HOOK_PASSED in _update_hook_fields"
```

---

### Task 4: hooked-transition `trans_type` — replace the stale O(out-degree) scan

**Files:**
- Modify: `src/ts/jssm.ts:4649-4660` (inside `transition_impl`, plain-transition branch)
- Test: `src/ts/tests/parallel_action_edges.spec.ts`

**Interfaces:**
- Consumes: `edgeId` already resolved two lines above from `this._edge_id_by_pair` (`jssm.ts:4647`); first-declared-wins construction of both `_edge_map` (`jssm.ts:1072-1077`) and `_edge_id_by_pair` (`jssm.ts:1084-1089`).
- Produces: no interface change.

**Why this is safe:** the scan's justifying comment says `_edge_map` is *last-wins* (#735). That is stale — the constructor now guards both maps with `if (!has)` making them **first-declared-wins**, and `_outbound_edge_ids` fills in declaration order, so the scan's "first outbound edge with `.to === target`" is by construction the same edge as `edgeId`.

- [ ] **Step 1: Add a pinning test for first-declared kind under transition-kind hooks (must pass on OLD code)**

Append to `src/ts/tests/parallel_action_edges.spec.ts` (mirror its existing imports — `sm` from `'../jssm'`):

```typescript
describe('parallel edges: transition-kind hooks see the first-declared kind', () => {

  test('main-then-legal parallel pair dispatches the main-transition hook', () => {
    // a=>b declared first (kind 'main'), a->b second (kind 'legal').
    const m = sm`a 'go' => b; a 'walk' -> b;`;
    let main_fired = false, standard_fired = false;
    m.hook_main_transition( () => { main_fired = true; } );
    m.hook_standard_transition( () => { standard_fired = true; } );
    expect(m.transition('b')).toBe(true);
    expect(main_fired).toBe(true);       // first-declared edge kind is 'main'
    expect(standard_fired).toBe(false);  // 'legal' hook must not fire
  });

});
```

- [ ] **Step 2: Run it; verify it passes against the OLD scan**

Run: `npx vitest run "src/ts/tests/parallel_action_edges.spec.ts" --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS. If FAIL, stop and report — the first-declared equivalence claim would be wrong and this task must be abandoned, not forced.

- [ ] **Step 3: Replace the scan**

Replace `src/ts/jssm.ts:4649-4660`:

```typescript
        if (this._has_transition_hooks || this._has_post_transition_hooks) {
          // kind of the dispatched edge.  _edge_id_by_pair and _edge_map are
          // both first-declared-wins for parallel (from, to) pairs (see the
          // constructor around _edge_map / _edge_id_by_pair), and
          // _outbound_edge_ids fills in declaration order — so the old
          // first-match outbound scan always resolved to this same edgeId.
          // Direct read replaces the O(out-degree) object-deref scan.  #735
          trans_type = this._edges[edgeId].kind;
        }
```

(The old `TODO this won't do the right thing if various edges have different types` comment is superseded: Step 1 pins the actual semantics — first-declared kind — which is unchanged.)

- [ ] **Step 4: Re-run parallel-edge + hook suites**

Run: `npx vitest run "src/ts/tests/parallel_action_edges.spec.ts" "src/ts/tests/hooks.spec.ts" --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ts/jssm.ts src/ts/tests/parallel_action_edges.spec.ts
git commit -m "perf: hooked transitions read trans_type from the dispatched edge, dropping the stale outbound scan"
```

---

### Task 5: `probable_exits_for()` — hoist the per-exit `_edge_map` probe

**Files:**
- Modify: `src/ts/jssm.ts:2561-2595` (`probable_exits_for`)
- Test: `src/ts/tests/probability.spec.ts` (existing coverage)

**Interfaces:**
- Consumes: `this._edge_map: Map<StateType, Map<StateType, number>>`; `wstate.to` (adjacency recorded once per distinct target, `jssm.ts:1027`).
- Produces: no interface change. `lookup_transition_for` / `get_transition_by_state_names` remain untouched for other callers.

- [ ] **Step 1: Confirm existing coverage**

Run: `npx vitest run "src/ts/tests/probability.spec.ts" --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS (drives `probable_exits_for` through probability-bearing and plain machines).

- [ ] **Step 2: Hoist the map probe**

In `probable_exits_for`, replace the loop body region (`jssm.ts:2569-2591`) with:

```typescript
    const legal_exits          : Array<JssmTransition<StateType, mDT>> = [],
          probability_bearing  : Array<JssmTransition<StateType, mDT>> = [];

    // hoisted: every exit shares whichState, so probe _edge_map for the
    // from-side once instead of re-hashing the same key per exit inside
    // lookup_transition_for.  wstate.to is non-empty only when at least one
    // outbound edge exists, and every outbound edge creates the from-side
    // mapping at construction — so emg is defined whenever the loop runs.
    const emg: Map<StateType, number> = this._edge_map.get(whichState);

    for (const ws of wstate.to) {

      // wstate.to is built from the same edge set _edge_map indexes, so the
      // per-target get cannot miss; the guard mirrors the old defensive
      // .filter(Boolean) and is equally unreachable.
      const edge: JssmTransition<StateType, mDT> = this._edges[ emg.get(ws) ];
      /* v8 ignore next */
      if (!edge) { continue; }

      // forced-only exits cannot be reached by transition(), so they are
      // never legal probabilistic outcomes
      if (edge.forced_only) { continue; }

      legal_exits.push(edge);

      // if any legal exit declares a probability, only those are returned, so
      // that probability-bearing edges are not diluted by their peers
      if (edge.probability !== undefined) { probability_bearing.push(edge); }

    }
```

Note: `this._edges[ emg.get(ws) ]` with a hypothetical `undefined` index yields `undefined`, caught by the existing ignored guard — same defensive shape as before, no new uncovered branch.

- [ ] **Step 3: Re-run probability + walk-adjacent suites**

Run: `npx vitest run "src/ts/tests/probability.spec.ts" "src/ts/tests/stochastic_summary.spec.ts" --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ts/jssm.ts
git commit -m "perf: probable_exits_for probes _edge_map once per call, not once per exit"
```

---

### Task 6: `weighted_rand_select()` — no per-call closures

**Files:**
- Modify: `src/ts/jssm_util.ts:93-121` (`weighted_rand_select`)
- Test: `src/ts/tests/weighted_rand_select.spec.ts` (existing distribution pins)

**Interfaces:**
- Consumes/Produces: exported signature unchanged — `(options, probability_property = 'probability', rng) => selected element`; `undefined` weights still count as 1; throws `TypeError` on non-array / empty / non-object-first inputs exactly as before.

- [ ] **Step 1: Confirm existing pins pass**

Run: `npx vitest run "src/ts/tests/weighted_rand_select.spec.ts" --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS.

- [ ] **Step 2: Rewrite as plain loops**

Replace `src/ts/jssm_util.ts:93-121` (keep the surrounding eslint enable/disable block comments exactly as they are):

```typescript
const weighted_rand_select: Function = (options: Array<any>, probability_property: string = 'probability', rng: JssmRng): any => {

  if (!Array.isArray(options)) {
    throw new TypeError('options must be a non-empty array of objects');
  }

  if (options.length === 0) {
    throw new TypeError('options must be a non-empty array of objects');
  }

  if (!(typeof options[0] === 'object')) {
    throw new TypeError('options must be a non-empty array of objects');
  }

  // called once per probabilistic walk step: plain loops, no per-call closure
  // allocations (previously frand, or_one, and a reduce callback each call).
  // undefined weights count as 1, as before.
  let prob_sum: number = 0;
  for (const opt of options) {                       // eslint-disable-line fp/no-loops
    const p = opt[probability_property];
    prob_sum += (p === undefined) ? 1 : p;
  }

  const rnd: number = (rng ? rng() : Math.random()) * prob_sum;

  let cursor     : number = 0,
      cursor_sum : number = 0;

  while (cursor < options.length) {                  // eslint-disable-line fp/no-loops
    const p = options[cursor][probability_property];
    cursor_sum += (p === undefined) ? 1 : p;
    ++cursor;
    if (cursor_sum > rnd) { break; }
  }

  return options[cursor - 1];

};
```

Semantics check against the old one-liner `while (cursor < options.length && (cursor_sum += or_one(...)) <= rnd) {}`: both advance `cursor` past each element whose running sum is `<= rnd` and stop on the first element pushing the sum over `rnd`, returning `options[cursor-1]`. Boundary `cursor_sum === rnd` continues in both (old: `<= rnd` loops; new: `> rnd` breaks — complementary conditions).

- [ ] **Step 3: Re-run selection + probability suites**

Run: `npx vitest run "src/ts/tests/weighted_rand_select.spec.ts" "src/ts/tests/util.spec.ts" "src/ts/tests/probability.spec.ts" --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS. Also run the stoch selection file if present: `npx vitest run "src/ts/tests/jssm_util.stoch.ts" --config vitest.stoch.config.ts --coverage.enabled=false` — expected PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ts/jssm_util.ts
git commit -m "perf: weighted_rand_select drops three per-call closures for plain loops"
```

---

### Task 7: constructor cheap wins — `complete` Set + BFS index queue

**Files:**
- Modify: `src/ts/jssm.ts:997-1013` (complete lookup), `src/ts/jssm.ts:443-455` (`find_connected_components` BFS)
- Test: existing construction + islands suites (`shapes.spec.ts`, `cycles.spec.ts`, plus whichever spec drives `allow_islands` — locate with grep in Step 3)

**Interfaces:** none change.

- [ ] **Step 1: `complete` Set**

Immediately before the `for (const tr of transitions) {` loop at `src/ts/jssm.ts:997`, add:

```typescript
    // complete.includes was an O(|complete|) array scan per newly-created
    // state — O(V·C) overall; one Set turns it into O(V)
    const complete_set: Set<StateType> = new Set(complete);
```

Then change line 1005 `complete: complete.includes(tr.from)` → `complete: complete_set.has(tr.from)` and line 1011 `complete: complete.includes(tr.to)` → `complete: complete_set.has(tr.to)`.

- [ ] **Step 2: BFS index-pointer queue**

In `find_connected_components`, replace the BFS block (`src/ts/jssm.ts:443-455`):

```typescript
    const component : Array<StateType> = [];
    const queue     : Array<StateType> = [start];
    visited.add(start);

    // index-pointer pop: Array.shift is O(n) per pop, making the BFS O(V²)
    // worst case; reading by cursor keeps it O(V + E)
    let head = 0;
    while (head < queue.length) {
      const node = queue[head++];
      component.push(node);
      for (const neighbor of adj.get(node)!) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
```

(Match the surrounding function's existing eslint-comment idiom if the file disables `fp/no-loops` per-line there; it already contains these loops, so likely no new directives are needed.)

- [ ] **Step 3: Run construction/completes/islands suites**

Find the drivers: `grep -l "complete" src/ts/tests` and `grep -rl "allow_islands" src/ts/tests` — run those files plus `shapes.spec.ts` and `cycles.spec.ts` with `--coverage.enabled=false`.
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ts/jssm.ts
git commit -m "perf: Set-based complete lookup and O(V+E) BFS queue in construction paths"
```

---

### Task 8: full verification + local benchmark envelope

**Files:**
- No source changes. Benchmark output under `build/` only (never committed).

- [ ] **Step 1: Full spec suite WITH coverage (the 100% gate)**

Run: `npm run vitest-spec`
Expected: PASS, coverage gate green. If a new branch is uncovered, add the missing test in the task that introduced it — do not weaken the gate, do not add ignore pragmas for reachable code.

- [ ] **Step 2: Stoch + docs suites**

Run: `npm run vitest-stoch` then `npm run vitest-docs` (separate invocations).
Expected: PASS each.

- [ ] **Step 3: Build**

Run: `npm run make`
Expected: completes cleanly. (The full `npm run build` happens inside `/sc-commit` at the end — do not run it twice.)

- [ ] **Step 4: Local before/after benchmark envelope (sanity only, non-canonical)**

The benchmark harness requires committed-style dist: after Step 3's `make`, run the repo benchmark runner (see `benchmark/` — it requires `dist/jssm.es5.cjs`) once on this branch and once on a `origin/main` worktree that has also had `npm install` + `npm run make` (the existing `stonecypher_jssm_chore_26-07-02_opt-sweep` worktree can serve after an install+make). Save both outputs under `build/perf_envelope/`. Compare `transition`, `edges_between`, and walk-family cases.
Expected: no case regresses; `edges_between` dense cases improve. Numbers are local-host-caveated sanity data for the PR body only — canonical numbers come from the graviton runner post-merge.

- [ ] **Step 5: IDE diagnostics**

Check `mcp__ide__getDiagnostics` for the modified files; resolve any new lint/deprecation warnings.

- [ ] **Step 6: `/sc-commit` on this branch, then PR**

Run the `/sc-commit` skill (version bump + full build + commit) on `perf_26-07-02_runtime-hot-paths`, then open a PR to `main` with the findings table + local envelope (host caveat) in the body. Do NOT merge without explicit user permission (`main` is protected; every merge releases).

---

## Explicitly deferred (documented so nobody "helpfully" adds them)

- **Lazy-init of the ~30 always-allocated hook/property/group tables** (`jssm.ts:751-946`): biggest win, medium risk (~every dispatch guard needs auditing; the post-side `_post_global_action_hooks.get` probe at `jssm.ts:4909` is currently ungated). The notes spec (2026-06-22) plans to *measure* this carrying cost first — do that measurement, then plan this as its own branch.
- **Required-properties key fabrication** (`jssm.ts:1246-1256` + `name_bind_prop_and_state`): LOW impact (construction-only, only for machines using required properties) and hand-rolled JSON key fabrication risks subtle escaping mismatches. Skipped deliberately.
- **`edges_between` tier-2 pair index** (`from → (to_id → edgeId[])`): adds per-machine Maps — more of the exact object weight that caused the regression. Do not add unless tier 1 proves insufficient on canonical benchmarks.
- **Everything-hook `{ ...hook_args, hook_name }` spreads**: contractual (pinned by the simultaneous-everything-hook specs; see the in-source NOTE at `jssm.ts:4675-4679`). Never "optimize" these away.
- **PEG `--cache`**: banned; proven 3–17× construct regression (#682/#683).
