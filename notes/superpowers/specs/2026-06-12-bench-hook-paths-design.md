# Benchmark instrument upgrade: hook-path visibility — design

Date: 2026-06-12
Branch: `test_26-06-12_bench-hook-paths`
Status: approved (design approved in-session; spec follows the approved design)

## Problem

The canonical perf instrument — the graviton runner (`src/scripts/graviton_perf.cjs`),
the only benchmark source treated as authoritative — runs **only**
`npm run benny:scaling`. Every hook-path microbenchmark (basic, named, entry,
exit, any-transition, global-action, …) lives in the *general* suite
(`src/buildjs/benchmark.cjs`), which runs only on noisy shared GitHub runners
(`benchmark` CI job) and on developer machines. Consequences:

- Interning lever 2 (#729 / PR #742) converted six **post-hook** stores and the
  named/entry/exit/global-action stores with **zero canonical benchmark
  visibility** — the graviton 3-point read (5.143.8 → .11 → .15) can only see
  lever 1 plus the basic-pair part of lever 2 (via the scaling suite's
  `hooked-N` shape).
- A prospective lever 3 (`_after_hooks` domain split: state-keyed and
  action-keyed maps interned separately) is **unmeasurable**: no suite anywhere
  exercises after-hooks.

Separately, the general suite contains instrument bugs that make several of its
existing trend lines measure the wrong thing (see Repairs).

## Goals

1. Every hook store that interning has touched or may touch has at least one
   benny case exercising its fire path, in the dispatch mode(s) that reach it.
2. The graviton runner runs and publishes the general suite, making those cases
   canonical.
3. Existing-but-broken cases are repaired, and the repair is visible in the
   case name so historical trend lines are not silently poisoned.

## Non-goals (YAGNI)

- `action()` cases in the scaling suite (its own deferral note at
  `benchmark_scaling.cjs:367` explains the topology-continuity concern).
- Walk machinery / `probable_exits_for` benches (cold introspection paths).
- Hook registration/removal cost benches (cold).
- Any change to the scaling suite's shapes or case kinds.

## Part 1 — Repairs to `src/buildjs/benchmark.cjs`

| # | Bug | Fix | Naming |
|---|-----|-----|--------|
| 1 | `KitchenSink100Times` cycles `Tl4GA`, not `Tl4KS` — the 15-hook machine is never exercised and the global-action machine is double-trafficked | Cycle `Tl4KS` (`transition('green')`, `action('next')`, `force_transition('red')` — its labels support this) | Rename: `Kitchen sink (15 hooks) 100 times v2` |
| 2 | `Tl4STA` / `Tl4MTA` / `Tl4FTA` define no `'next'` action labels, so `.action('next')` fails every call — these measure the rejection path, not ST/MT/FT hook firing | Add `'next'` labels to all three machine definitions | Rename each: append ` v2` |
| 3 | `'Blind cycle a traffic light 100 times by action'` registered twice (same name, same fn) | Drop the duplicate registration | n/a |
| 4 | Envelope saved with hardcoded `version: '1.2.0'` | `version: pkg.version` (require `../../package.json`), matching the scaling suite | n/a |

### Addendum (found during plan verification, probe-confirmed against dist)

| # | Bug | Fix | Naming |
|---|-----|-----|--------|
| 5 | Named-hook cases register with `name:` but `set_hook` reads `HookDesc.action` — the hook lands under an interned `undefined` and **never fires** (`Tl4WAHA`, `Tl4WAWHA`, `Tl4KS` ×2) | Use `action:` | Rename affected cases: append ` v2` |
| 6 | Global-action cases register with no `action:` field — **never fires** (`Tl4GA`, `Tl4KS`) | Add `action: 'next'` | Rename: append ` v2` |
| 7 | `transition()` cannot traverse `~>` edges (probe-confirmed), so the FT-by-transition case fails every call and its hook never fires | Exercise via `force_transition()` | Rename: ` v2` |

Named hooks fire only under `action()` dispatch (`jssm.ts` named fire site is
gated on `wasAction`), so the named-by-transition case is retained as an
explicit **carrying-cost** case (hook present, structurally cannot fire) and
renamed to say so.

Because five of these seven bugs are silent no-fire bugs, the suite gains
**registration-time fire verification**: every hooked case is declared through
a builder, and at startup the suite runs one exercise pass against a counting
handler and throws unless the observed fire count matches the case's declared
expectation (`expectFire: true|false`). A silently-broken case can then never
report a number again.

Renaming rule: a case whose measured semantics change gets a new name, because
benny envelopes are compared by case name across versions; keeping the old name
would splice a rejection-path trend into a hook-firing trend.

Because the old broken cases were (accidentally) measuring action rejection,
and rejection is a real input-validation path, one **deliberate** case keeps
that signal honestly: `Rejected action ('nope') 100 times by action` — a
labeled machine probed with an action name it doesn't have.

## Part 2 — New hook-path cases in the general suite

Same micro-pattern as existing cases: a 4-state traffic-light machine, one hook
registered, 100 iterations of a 3-step cycle per benny op. All handlers
`() => true` except the data-carrying case.

| Case name | Hook registration | Dispatch | Store exercised |
|---|---|---|---|
| `After hook keyed by state, 100 cycles by transition` | `kind:'after', from:'red'` | `transition()` | `_after_hooks` (state-name key) |
| `After hook keyed by action, 100 cycles by action` | `kind:'after', from:'next'` | `action()` | `_after_hooks` (action-name key) |
| `Post basic hook, 100 cycles by transition` | post basic, `from:'red', to:'green'` | `transition()` | `_post_hooks` |
| `Post basic hook, 100 cycles by action` | same | `action()` | `_post_hooks` |
| `Post named hook, 100 cycles by action` | post named, `name:'next'` | `action()` | `_post_named_hooks` |
| `Post entry hook, 100 cycles by transition` | post entry, `to:'red'` | `transition()` | `_post_entry_hooks` |
| `Post exit hook, 100 cycles by transition` | post exit, `from:'red'` | `transition()` | `_post_exit_hooks` |
| `Post global action hook, 100 cycles by action` | post global action | `action()` | `_post_global_action_hooks` |
| `Data-carrying basic hook, 100 cycles by transition` | basic hook whose handler returns `{ pass: true, data }` | `transition()` | data-update path (`_update_hook_fields` true branch) |
| `Rejected action ('nope') 100 times by action` | none | `action('nope')` | action-rejection path |

Exact `kind:` strings for the post variants are whatever `set_hook` accepts
(verify against `src/ts/jssm.ts`'s `set_hook` switch during implementation —
e.g. `'post hook'`, `'post named'`); the spec names stores, not kind strings.

After-hook semantics note: the fire probe at `jssm.ts` (`_after_hooks.get(newStateOrAction)`)
keys on the state name under `transition()` dispatch and the action name under
`action()` dispatch — the two cases above pin one probe in each key domain so a
future domain-split lever changes each case in isolation.

Runtime budget: ~10 new cases ≈ +50–60 s of benny time locally; acceptable for
the CI `benchmark` job and the graviton instance (see Part 3 dead-man check).

## Part 3 — Graviton wiring (`src/scripts/graviton_perf.cjs`)

1. Both user-data builders (the attached/PR path and the detached/release path)
   add `npm run benny` alongside the existing `npm run benny:scaling` line.
   `BENNY_DEEP` continues to apply only to the scaling run; the general suite
   has no sample-starved cases.
2. The publish step ships `benchmark/results/general.json` to `perf_results`
   alongside `scaling.json` (and the general chart HTML if charts are already
   shipped for scaling — match whatever the publish step does per-file today).
3. `--harness-from` resilience: the general suite gains the scaling suite's
   feature-probe pattern — probe a throwaway machine for `set_hook`, and wrap
   registration of newer hook kinds so an older overlaid library degrades to a
   partial suite instead of crashing. (Matches `benchmark_scaling.cjs`'s `HAS`
   probes in spirit; registration of post/after kinds is guarded.)
4. Dead-man timer: re-check the #725 value against the added general-suite
   minutes; raise if the margin is thin.
5. `src/scripts/tests/graviton_perf.spec.ts`: extend the user-data assertions —
   both modes contain `npm run benny`, publish step references `general.json`,
   and the existing scaling assertions still hold.

## Testing

- Graviton spec extensions as above (generated-shell substring assertions, the
  file's existing pattern; substring style also satisfies the no-golden-file
  rule).
- The benchmark `.cjs` suites keep the repo convention of being validated by
  execution (`npm run benny` locally before PR) rather than unit tests.
- Full `npm run build` (vet + test + artifacts) before merge, per repo policy.

## Rollout

Single PR from `test_26-06-12_bench-hook-paths`. Once merged and released, the
next release's graviton run publishes the first canonical `general.json`
envelope; hook-path levers (e.g. an `_after_hooks` split) become adjudicable
from the following release onward. Local benny runs remain directional only.
