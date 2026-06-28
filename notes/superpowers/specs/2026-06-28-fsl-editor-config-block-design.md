# FSL `editor: {}` config block — design (fsl#1334)

**Goal:** Let an FSL machine declare editor/panel defaults inline in its source, so the
all-widgets web control configures itself per-machine without the embedder hand-wiring
each one. This is the *declaration* side that `request` panel mode (fsl#1333) consumes.

**Status:** Brainstormed + approved 2026-06-28. Additive → v5 (no breaking change).

## Syntax

A single config block, `editor: { … };`, mirroring the existing `graph: {}` /
`transition: {}` blocks. Keys are **whitelisted** (a typo'd key is a parse error,
preserving FSL's strict-whitelist invariant). Two keys initially:

```fsl
editor: {
  stochastic_run_count : 100000;              // positive integer
  panels               : [simulation history]; // name list (reuses LabelList)
};
```

Chosen over flat top-level keywords (`stochastic_run_count: …;`) because the block groups
editor config in one place and extends "without churn" (a new default = one new
whitelisted key rule inside the block, not a new top-level keyword). Chosen over an
open-keys block because that would drop the typo-catching the whole grammar relies on.

## Layers

1. **Grammar** (`src/ts/fsl_parser.peg`): new `ConfigEditor` block rule modeled on
   `ConfigGraph`, registered in the `Config` alternation. Inside: `EditorConfigItem =
   StochasticRunCount / Panels`. `StochasticRunCount` parses a positive integer;
   `Panels` reuses the existing `LabelList` rule (same `[a b c]` parser as
   `start_states`). Emits `{ key: "editor_config", value: [{key,value}, …] }`. Regen the
   tracked `fsl_parser.ts` via `npm run peg`.

2. **Compiler** (`src/ts/jssm_compiler.ts`): fold `editor_config` items into
   `result_cfg.editor_config` as a `{ stochastic_run_count?: number; panels?: string[] }`
   object. One `editor:{}` block max (added to `oneOnlyKeys`).

3. **Machine API** (`src/ts/jssm.ts`): `editor_config()` returns that object (or
   `undefined`). One extensible accessor rather than getter-per-key.

4. **Web control** (`src/ts/wc/fsl_instance_wc.ts`): on build/rebuild the host populates
   its `requestedPanels` from `machine.editor_config()?.panels`. That's the seam — the
   `request` panel mode now lights up from the FSL itself. The embedder may still override
   the property. `stochastic_run_count` is parsed + exposed only (its consumer, the
   stochastic panel fsl#1384, doesn't exist yet).

## Testing

One layer at a time: a grammar parse test (block → value), a compiler config test, a
`machine.editor_config()` test, and a wc test that `editor:{panels:[…]}` FSL makes those
panels visible under `request` mode.

## Out of scope

- A consumer for `stochastic_run_count` (waits on fsl#1384).
- Other future editor defaults (theme, engine) — the block extends to them later.
- Open/arbitrary keys (deliberately rejected — keeps typo-catching).
