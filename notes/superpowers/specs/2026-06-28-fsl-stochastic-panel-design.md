# fsl-stochastic panel + `stochastic_summary()` — Design

- **Issue:** StoneCypher/fsl#1384 — *fsl-editor: Stochastic tab — interact with a machine on a statistical basis*
- **Date:** 2026-06-28
- **Branch:** `feat_26-06-28_fsl-stochastic-panel` (worktree off `origin/main`)
- **Status:** approved (brainstorming → spec)

## Summary

Add a statistical/Monte-Carlo view to the `fsl-editor` panel suite, plus the
library primitive that powers it. A machine declares `editor: { stochastic_run_count: N; }`
today (shipped 5.149.0, fsl#1334) but nothing consumes it — this is its consumer.

Two deliverables, cleanly separated:

1. **`Machine.stochastic_summary()`** — a new public library method (`src/ts/jssm.ts`)
   that runs many weighted-random walks and returns aggregate statistics. Reusable
   by the CLI, library users, and the VS Code extension — not editor-private.
2. **`<fsl-stochastic>`** — a thin Lit web component (sibling of `fsl-simulation`)
   that consumes the primitive and renders the results in-panel.

## Decisions (locked during brainstorming)

| Question | Decision |
| --- | --- |
| Run model | **Both** Monte Carlo (N independent runs) **and** steady-state (one long walk), via a mode toggle |
| Render surface | **In-panel only** (flowchart heatmap overlay = named follow-on) |
| Execution model | **Both** instant and animated playback supported; **default = instant + bars** |
| Run termination (MC) | **Terminal or step-cap** — each run stops at a terminal state OR a `max_steps` cap; the cap-vs-terminal split is retained as reachability signal |
| Engine placement | **Library-core primitive** (`stochastic_summary()`); the panel is a thin consumer |
| `%` probabilities | Honored (free — the library already weights transitions) |
| `after` / timing decorations | **Out of scope** this cut (named follow-on) |
| v6 breaking-changes manifest | **No entry** — adding a method is additive, not a 5→6 break |

## Core primitive

Location: `src/ts/jssm.ts` (method on `Machine`), with types in `src/ts/jssm_types.ts`.

```ts
type JssmStochasticMode = 'montecarlo' | 'steady_state';

interface JssmStochasticOptions {
  mode?       : JssmStochasticMode;  // default 'montecarlo'
  runs?       : number;              // MC: # independent runs; default = editor_config().stochastic_run_count ?? DEFAULT_RUNS
  max_steps?  : number;              // MC: per-run step cap; steady_state: walk length; default DEFAULT_MAX_STEPS
  seed?       : number;              // default: current rng_seed (pass a fixed value for reproducibility)
}

interface JssmStochasticSummary {
  mode                 : JssmStochasticMode;
  runs                 : number;
  seed                 : number;                    // effective seed actually used
  state_visits         : Map<StateType, number>;    // aggregate visit counts
  state_visit_fraction : Map<StateType, number>;    // normalized 0..1, sums to 1
  edge_traversals      : Map<string, number>;       // keyed "from→to" (action-labeled where unambiguous)
  // montecarlo-only:
  path_lengths?        : number[];                  // per-run length, terminating runs
  terminal_reached?    : number;                    // count of runs that hit a terminal
  capped?              : number;                     // count of runs that hit max_steps
}
```

### Semantics

- **`montecarlo`**: from the initial state, take weighted-random steps (honoring
  `%` via the existing `probabilistic_transition`) until a terminal state (no legal
  exit actions) **or** `max_steps` is reached. Repeat `runs` times. Aggregate state
  visits and edge traversals across all runs; record each run's length and whether
  it terminated or was capped.
- **`steady_state`**: a single walk of `max_steps` steps. `state_visit_fraction`
  approximates the stationary distribution by sampling (not a linear-algebra solve).
  `path_lengths` / `terminal_reached` / `capped` are omitted (`undefined`).

### Isolation (non-destructive)

`stochastic_summary()` **snapshots and restores** the machine's current `state`
and `rng_seed` around the batch, so calling it never disturbs the caller's live
machine. This matters now that it is a general library primitive.

### Lazy generator

A companion generator yields one run-result at a time:

```ts
*stochastic_runs(opts?: JssmStochasticOptions): Generator<JssmStochasticRun>
```

`stochastic_summary()` is the eager aggregate built on `stochastic_runs()`. The
panel's **animated** mode drives the generator across animation frames; **instant**
mode calls `stochastic_summary()` directly. One engine, both execution modes.

> Implementation note (for the plan): building one machine and resetting state +
> reseeding between runs is preferred over rebuilding from source per run (1000×
> `sm` compiles is wasteful). Edge-traversal keys derive from consecutive state
> pairs; where multiple edges join the same pair, action-label disambiguation is a
> refinement tracked for the follow-on, not a blocker.

## The `<fsl-stochastic>` panel

Mirrors `fsl-simulation`: `LitElement`, `fslTokens` theming, `closest_wc(this, 'instance')`
to find the host, disabled/idle when standalone.

Files:
- `src/ts/wc/fsl_stochastic_wc.ts` — the class
- `src/ts/wc/fsl_stochastic_wc.define.ts` — canonical `fsl-stochastic` registration
  via `define_canonical` (**`fsl-*` only, no `jssm-*` synonym**, per the WC synonym policy)
- export added to `src/ts/wc/widgets.ts` and `src/ts/wc/widgets.define.ts`
- registered as a panel/pill in the editor/instance panel registry

### Data flow (isolation)

Reads `host.fsl` (source string), builds its **own** throwaway machine via
`jssm_from`/`sm` (never `host.machine`), calls `stochastic_summary()` /
`stochastic_runs()`. The user's live simulation state is untouched.

### Controls

```
[ (•) Monte Carlo  ( ) Steady-state ]   runs [1000]   max steps [1000]   seed [ 42 ]   [ Run ] [ ▷ Play ]
```

- **runs** defaults from `machine.editor_config().stochastic_run_count`, falling
  back to a constant when undeclared; editable.
- **max steps** editable; **seed** editable (blank = time-based; filled = reproducible).
- **mode toggle**: Steady-state hides the runs field and the MC-only output panes.
- **Run** = instant compute + render (default). **Play** = animated accumulation via
  the generator; toggles to Pause; auto-stops at completion.

### Output panes (in-panel)

- **State-visit bars** — one bar per state, width = visit fraction, with %.
- **Edge-traversal list** — `from → to : count`, sorted desc.
- **Path-length histogram** (MC only) — bucketed bars over terminating runs.
- **Terminal vs capped** (MC only) — `Reached terminal: 87% · Hit cap: 13%`.
- **Empty/idle**: standalone (no host) → controls disabled + hint; invalid FSL → a
  short "can't run on invalid source" message (engine not called).

### Events

Emits `fsl-stochastic-complete` (`CustomEvent<JssmStochasticSummary>`) so embedders
and the future flowchart-overlay follow-on can subscribe without reaching into the panel.

## Testing

Respects the split-suite + 100%-coverage conventions. No fake tests, no golden/snapshot
files — substring / exact-value assertions.

### Core engine — spec suite (`src/ts/tests/`), deterministic & seeded

- terminal-reaching machine: all runs terminate, sane path lengths, `capped === 0`
- cyclic machine (traffic-light): some/all runs capped, `capped > 0`
- single-state / no-exit machine: every run length 0, `terminal_reached === runs`
- steady-state mode: shape correct, MC-only fields `undefined`
- `%`-weighted machine: at a fixed seed, assert the **exact** resulting counts (not a
  fuzzy range — deterministic, not flaky)
- same seed + same FSL ⇒ identical summary (maps/arrays equal)
- isolation: machine `state` and `rng_seed` unchanged after the call

### Core engine — stoch suite (`*.stoch.ts`), property-based across seeds

- `state_visit_fraction` sums to 1
- every reachable state appears
- `terminal_reached + capped === runs` (MC)
- on an ergodic machine, MC visit distribution converges toward steady-state

### Panel — spec suite (jsdom, `*_wc.spec.ts` + `.define.spec.ts`)

- renders bars from a summary
- mode toggle hides MC-only panes
- standalone disables controls
- `runs` defaults from `editor_config()`
- emits `fsl-stochastic-complete`
- `.define.spec.ts` registration test (suite gate)

## Docs, wiring & release

- **Docblock + `@example`** on `stochastic_summary()` (the `@example` is the doctest
  source; `jssm.ts` is a doctested entry point), `@throws` if applicable,
  `@see probabilistic_walk`, `@see editor_config`.
- **README** regenerated via `npm run build` (generated artifact).
- **Issue wiring**: PR `closes StoneCypher/fsl#1384`.
- **Release**: feature branch off current `origin/main`; `/sc-commit` for the version
  bump + full `npm run build` before opening the PR.

## Out of scope (named follow-ons)

- Flowchart heatmap overlay (state shading + edge-weight) driven by this panel
- `after` / timing decoration support
- Steady-state stationary distribution via linear-algebra solve (we sample)
- Action-label edge disambiguation when multiple edges join the same state pair
