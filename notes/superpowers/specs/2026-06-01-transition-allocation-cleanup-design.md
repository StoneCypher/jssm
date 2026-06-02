# Transition Allocation Cleanup + Benchmark Comparison Generator — Design

> **Status:** Design — approved, ready for implementation planning
> **Date:** 2026-06-01
> **Author:** John Haugeland (with Claude collaboration)
> **Umbrella:** [#636 — perf: ongoing performance tracking](https://github.com/StoneCypher/jssm/issues/636)
> **Prior steps:** #637 (adjacency index, 5.131.0), #649 (hook dispatch, 5.132.0)

---

## Summary

Two coupled deliverables, shipped in **one PR**:

1. **A benchmark comparison-table generator** (`src/scripts/benchmark_compare.cjs`) that reads
   two or three historic benchmark JSON files and emits the markdown delta tables the #636
   workflow currently writes by hand. Removes transcription risk from the per-step writeup.

2. **The next perf lever** from #636's open-items list: **reduce per-transition allocations**
   in `transition_impl` (`src/ts/jssm.ts`). Two changes — guard the unconditional `hook_args`
   literal, and gate the observation-event block on a live listener count — so the machine
   stops allocating objects nobody reads on the hot path. Broad (lifts the whole `transition()`
   column across all 12 benchmark shapes), near-zero behavior risk.

The generator is built first because it is independent, low-risk, and it produces the writeup
for the perf step.

---

## Context — what the open-items list actually said vs. what the code shows

The last #636 comment listed three follow-up levers. Reading the hot path
(`transition_impl` at `src/ts/jssm.ts:3423`, `_fire` at `:2443`) reshaped the menu:

- **Lever #1 ("`_any_hooks_registered` counter to short-circuit the cascade when zero") is
  largely already implemented.** The entire ~9-guard pre-hook cascade is wrapped in
  `if (this._has_hooks)` (line 3488) with a clean `else` branch, so a hookless machine already
  skips all nine guards.
- **The genuinely-wasted allocations the list under-weighted:**
  1. `hook_args` (a 7-field object literal, line 3458) is built on **every** transition but read
     only inside `if (this._has_hooks)` / `if (this._has_post_hooks)`. Non-hooked machines
     allocate and discard it every call.
  2. The observation events (`_fire('exit'|'transition'|'entry'|…)`, lines ~3764–3801) each
     build their detail object **at the call site, before `_fire` can early-return** — so 3–5
     literal allocations per transition on **all 12 shapes**, even with zero subscribers. This
     was not on the open-items list and is the broadest lever.

This design targets those two allocations. The closure-hoisting idea (`update_fields` /
`fire_rejection`) is deferred (see Out of Scope).

---

## Deliverable 1 — Benchmark comparison generator

### File

`src/scripts/benchmark_compare.cjs` — a self-contained Node script. `.cjs` to match the existing
`src/buildjs/benchmark*.cjs` style. Pure functions are exported for unit testing; the CLI body
runs only under `if (require.main === module)`.

`src/scripts/` does not exist yet and is created by this work (permanent scripts live there per
project convention).

### Invocation

Explicit positional file paths, accepting **two or three**:

```
node src/scripts/benchmark_compare.cjs <original.json> <current.json>
node src/scripts/benchmark_compare.cjs <original.json> <previous.json> <current.json>
```

- **Two files** → `original` and `current`; output carries an `original`, `current`, and
  `vs orig` column.
- **Three files** → `original`, `previous`, `current`; output carries `original`, `previous`,
  `current`, `vs prev`, and `vs orig` columns (the full #636 comment shape).

Any other argument count exits non-zero with a usage message. No flags, no auto-discovery.

### Input format

Each file is the envelope written by `benchmark_scaling.cjs`:
`{ name, date, version, results: [{ name, ops, margin, percentSlower }], … }`, where each
`results[].name` is `"<shape> <operation>"`, e.g. `"chain-200 transition()"`.

### Pure pieces (each independently testable)

- `loadBenchmark(path)` → `{ version, date, opsByName: Map<string, number> }`.
- `pivot(opsByName)` → `Map<operation, Map<shape, ops>>` by splitting each name at its last space.
- `compare(files)` → an ordered structure of `{ operation, rows: [{ shape, original, previous?,
  current, vsPrev?, vsOrig }] }`. Factor = `current / reference`; `null` when either side is
  missing or the reference is `0`.
- `renderMarkdown(comparison, { files })` → the final string.

### Output

Markdown to **stdout**. A header block naming each file's `version` and `date`, then one table
per operation in a fixed order (`transition()`, `edges_between()`, `has_state()`, `construct()`):

```markdown
### transition() ops/sec

| shape       | original | previous | current | vs prev | vs orig |
|-------------|---------:|---------:|--------:|--------:|--------:|
| chain-10    |  137,705 |  165,885 | 172,001 |   1.04× |   1.25× |
```

- Ops printed with thousands separators.
- Factors as `X.XX×` (two decimals).
- A shape present in one file but absent in another renders `—` in its cell and omits the
  affected factor.
- No automatic bolding — the editorial bold on a standout row stays a human choice.

### Tests

In the project's vitest suite:

- factor math, including the missing-reference / zero-reference `null` cases;
- the two-arg vs three-arg column shapes;
- number formatting (thousands separators) and factor formatting (`X.XX×`);
- a shape present in one file but missing in another renders `—` and drops the factor.

---

## Deliverable 2 — Perf lever: reduce per-transition allocations

All changes in `src/ts/jssm.ts`. No public API change.

### B1 — Guard the `hook_args` allocation

`hook_args` (line 3458) is built unconditionally but read only inside the two blocks already
guarded by `if (this._has_hooks)` (line 3488) and `if (this._has_post_hooks)` (line 3678). Build
it only when at least one of those is true:

```ts
const hook_args = (this._has_hooks || this._has_post_hooks)
  ? { data: this._data, action: fromAction, from: this._state, to: newState,
      next_data: newData, forced: wasForced, trans_type }
  : undefined;
```

Its type becomes `HookContext<mDT> | undefined`; it is dereferenced only inside the existing
guarded blocks (narrow with a local or `!` as the surrounding guard already proves it defined).
The observation events do **not** read `hook_args` — they build their own literals from locals
(`fromState`, `newState`, `fromAction`, `newData_after`, `oldData`, `trans_type`, `wasForced`),
so guarding `hook_args` cannot affect them.

### B2 — Listener-count gate on the observation-event block

The trailing block (lines ~3764–3801) fires `exit`, `transition`, `entry`, and conditionally
`data-change`, `terminal`, `complete` on every successful transition. Each call builds its detail
literal before `_fire` can early-return on an empty subscriber set. Add a live count and gate the
whole block:

- New field `_event_listener_count: number`, initialized to `0` in the constructor.
- Increment in `_subscribe` after `set.add(entry)` (the single add site).
- A private `_unsubscribe_entry(set, entry)` that does
  `if (set.delete(entry)) { this._event_listener_count--; }` — decrements only on a real removal,
  so double-unsubscribe is idempotent and the count cannot over-decrement.
- Route **all three** removal paths through it:
  - `off(name, handler)` (line 2373),
  - the unsubscribe closure returned by `_subscribe` (line 2425),
  - the `once` auto-removal inside `_fire` (line 2468).
- Wrap the observation block:

  ```ts
  if (this._event_listener_count !== 0) {
    this._fire('exit', { … });
    this._fire('transition', { … });
    this._fire('entry', { … });
    if (oldData !== newData_after) { this._fire('data-change', { … }); }
    if (this.state_is_terminal(newState)) { this._fire('terminal', { … }); }
    if (this.state_is_complete(newState)) { this._fire('complete', { … }); }
  }
  ```

`auto_set_state_timeout()` (line 3804) stays **outside** the gate — it must always run. The gate
is read at the end of the transition, after pre-hooks have run, so a listener that a pre-hook
installs mid-transition is still observed. The per-name early-return inside `_fire` continues to
handle the mixed case (some event names subscribed, others not) once any listener exists.

### Behavior invariants

- No change to any public method signature, event name, event payload, or firing order.
- With listeners present, every observation event fires exactly as before.
- With hooks present, hook dispatch and `hook_args` contents are unchanged.
- A pre-hook that subscribes a listener mid-transition still receives that transition's events.

### Tests

- Existing event suite (#638) and hook suites are the primary safety net — run unchanged.
- **New targeted test:** a listener installed *by a pre-hook* during a transition still receives
  the `transition` event, locking the "gate read after pre-hooks" guarantee.
- **New targeted test:** `off()` / unsubscribe-closure / `once` auto-removal each drive
  `_event_listener_count` back to `0`, and re-subscribing fires events again — locks the count
  bookkeeping across all three removal paths.

### Out of scope (documented follow-up)

Hoisting the `update_fields` / `fire_rejection` closures out of the `_has_hooks` block. They are
allocated per hooked transition, but they close over transition locals (`hook_args`,
`data_changed`, `fromState`, `this`), so removing them is a real refactor for a hooked-only gain.
Left for a later sub-issue.

---

## Measurement & #636 workflow

1. **Baseline on current `main`:** run `npm run benny:scaling`, copy
   `benchmark/results/scaling.json` → `src/historic_benchmarks/benchmark_2026-06-01_pre-alloc-cleanup.json`
   (the "previous" point). The original baseline stays `benchmark_2026-05-26.json` (5.128.0).
2. **Implement B1 + B2**, re-run `npm run benny:scaling`, copy →
   `src/historic_benchmarks/benchmark_2026-06-01_alloc-cleanup.json` (the "current" point).
3. **Run the generator** on the three files; paste its output into a **new #636 comment** (new
   numbers, vs-previous, vs-original), following the established comment format.
4. **Open a sub-issue under #636** for this lever (mirrors #635 / #642). The PR closes it with a
   `Closes #N` comment rather than a direct close.

### Expectation setting

This is a **polish-tier** lever, not an algorithmic one. V8's generational scavenger makes
short-lived object allocations cheap, so eliding them typically yields single-digit to
low-double-digit percent on `transition()` — not the multiples the adjacency index gave. The
value is breadth (the whole `transition()` column) at near-zero risk. If the measured win is
marginal, the #636 comment documents it plainly (the way #642 documented its 38% gap) rather
than overclaiming. `has_state()` and `construct()` columns are noise sanity checks; benny
variance is roughly ±10–30%.

---

## Build order

1. Generator (`src/scripts/benchmark_compare.cjs`) + its tests.
2. Capture the current-`main` baseline snapshot.
3. Perf change (B1 + B2) + targeted tests.
4. `npm run build` (full artifact regen — not `make`).
5. Re-run `benny:scaling`, snapshot, run generator, draft the #636 comment.
6. Open the sub-issue; `/sc-commit` on the feature branch (version bump + full build + commit);
   open the PR with `Closes #N`.

---

## Out of scope (deliberately)

- Closure hoisting (above).
- CI integration of the generator — it is a manual writeup aid, like `benny:scaling` itself.
- Any change to `benchmark_scaling.cjs`, the frozen `messy-*.fsl` fixtures, or the legacy
  `benchmark.cjs` / `general.json` suite.
- Auto-discovery or flag parsing in the generator — explicit positional paths only.
