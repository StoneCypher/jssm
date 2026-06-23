# `<fsl-*>` web-component panel suite — execution plan

**Date:** 2026-06-22
**Status:** Approved — execution started (Track A / PR A1 underway)
**Branch:** `feat_26-06-22_fsl-wc-panel-suite`
**Authoritative design:** `notes/superpowers/specs/2026-05-12-editor-widget-packaging-design.md`
**Umbrella base ticket:** #648 (`<fsl-instance>`, closed/merged)
**Tracking issue:** #793

## Goal

Land the deferred sub-component suite that hangs off the already-shipped `<fsl-instance>`
composition root — **excluding** the framework-wrapper generator pipeline (#684), the Angular
shim (#685), and SSR (#686, which is gated by #684/#685).

Target issues (all StoneCypher/jssm): **#639, #659, #660, #661, #662, #663, #664, #665, #667, #668.**

## Naming convention + synonym policy (settled 2026-06-22)

Canonical tag is **`<fsl-*>`**. Driver: **fsl.tools brand alignment**. The four-part policy:

1. **Keep** the existing `jssm-*` aliases — `<jssm-viz>`, `<jssm-instance>`, `<jssm-bind>` (and the
   `Jssm*` class exports). `<jssm-viz>` in particular is shipped public API (its own package pre-5.105)
   with real users; removing it now would be an undisciplined breaking change on a continuously-
   releasing `main`.
2. **Don't mint new ones.** Components introduced after the rename are **`fsl-*`-only**, registered via
   `define_canonical('fsl-x', FslX)` (no synonym). `closest_wc` already matches both prefixes, so an
   `fsl-*`-only panel still binds correctly inside a `<jssm-instance>` host — no mixed-prefix footgun.
3. **Deprecate** the existing aliases — `@deprecated` JSDoc on the `Jssm*` thin subclasses + the
   `jssm-*` `HTMLElementTagNameMap` entries, and a deprecation notice in `WebComponents.md`. (No runtime
   `console.warn` for now — it would spam every existing `<jssm-viz>` page; available if a louder nudge
   is wanted later.)
4. **Remove in v6.** The actual `v6_breaking_changes.json` entry belongs on the **`v6` branch** (the
   manifest does not exist on `main`); to be added there. Removal covers the `jssm-*` registered tags,
   the `Jssm*` class exports, and the `jssm-` branch of `wc_suffix_matches` / `closest_wc` /
   the instance's `:scope > jssm-*` discovery selectors.

`define_with_synonym` is retained **only** for maintaining the three pre-existing dual-named
components. Issue titles were retitled to `<fsl-*>` on 2026-06-22; the `<jssm-*>` prose in #647/#648
predates the flip.

## Foundation (already shipped on `origin/main` — do not rebuild)

- `<fsl-instance>` base (#648) — owns the machine, FSL resolution (attr / `<script type=text/fsl>` /
  textContent), host-attribute reflection (mechanism 1), CSS custom props (mechanism 3),
  declarative-child wiring, `host.machine` (mechanism 5). `src/ts/wc/fsl_instance_wc.ts`.
- `machine.on(...)` event API (#638) — the reactive substrate.
- `<fsl-viz>` (#647) — **the copy-paste template**: `closest('fsl-instance')` +
  `host.machine.on('transition', rerender)` + disconnect cleanup. `src/ts/wc/fsl_viz_wc.ts:171`.
- Declarative tags `<fsl-hook>` / `<fsl-bind>` / `<fsl-action>` / `<fsl-on>`.
- `define_with_synonym` helper; CEM manifest test (`cem.spec.ts`); bundle-shape test
  (`bundle_shape.spec.ts`).
- CM6 highlighter draft in `sketch/cm6-lang-fsl/` + linter in `sketch/cm6-editor/`.

## Settled investigation outcomes (2026-06-22)

1. **No FSL formatter exists.** Grammar is one-directional (FSL → AST → Machine); `serialize()` emits a
   runtime state snapshot, not source. The `<fsl-toolbar>` "format" button is **descoped to #792**
   (standalone formatter issue). #660 ships lint/validate/export only.
2. **Rewind is composable, not native.** `override(newState, newData?)` exists
   (`src/ts/jssm.ts:4142`), force-sets state, fires `override`, throws if target missing or override
   not permitted. `<fsl-history>` (#662) self-accumulates `[state, data]` from `transition` events and
   rewinds via `override(state, data)`; `allows_override: true` is a real precondition (guard it). v1
   = jump-via-override, not undo/branching.
3. **CM6 grammar already drafted.** `sketch/cm6-lang-fsl/index.js` is a ~120-line `StreamLanguage`
   tokenizer (keywords, full arrow set incl. unicode, strings, labels, `&`-vars, comments). The
   editor's (#659) long pole is **CM6 bundling/CDN dedup**, not the highlighter. Full Lezer grammar
   stays out of scope.

## Dependency reality

The graph is flat: every panel is unblocked *today* because `<fsl-viz>` already shipped the
parent-walk + subscribe pattern. Panels subscribe to `host.machine` directly and do not depend on
each other. The only ordering constraints:

- **toolbar (#660) after export (#667)** — toolbar reuses the export action.
- **editor language-package (B1) before editor component (B2).**

The real constraint is **release batching**: every push to `main` publishes an npm version, so group
independent panels per PR to avoid functionally-tiny releases.

## Shared base tasks (small; early)

- **S1 — finish #639 mechanism 4.** Wire `machine.on('transition'|'entry'|'exit'|'terminal'|…)` →
  `dispatchEvent(new CustomEvent('fsl-…', { detail, bubbles: true, composed: true }))` in
  `fsl_instance_wc.ts` (the stale `// TODO #638` at ~lines 480/586, now unblocked). Dispatch *after*
  the Lit render commits. Catch per-handler exceptions and re-emit as `fsl-error` with the offender in
  `detail.source`. Document re-entrancy (recommend `queueMicrotask` for deferral). Ship the
  "Customizing fsl-instance" decision-tree doc.
- **S2 — extend `<fsl-instance>` default-template slots.** Current named slots:
  `title/viz/editor/toolbar/actions/info-panel/footer`. Add slots for the new panels
  (`history`, `data-inspector`, `hook-log`, `effective-properties`, `simulation`, `export`) so they
  have a layout home. Folds into PR A1.

## PR batching

### Track A — panels (copy `<fsl-viz>`; parallelizable in worktrees)

Each panel = `fsl_<name>_wc.ts` + `fsl_<name>_wc.define.ts`
(`define_with_synonym('fsl-<name>', 'jssm-<name>', …)`) + jsdom spec at 100% coverage. CEM regen auto.

| PR | Issues | Shape | Est. |
|----|--------|-------|------|
| **A1** | S1 (#639) + S2 | event re-emit + slots + customizing doc | ~1 day |
| **A2** | #661 info-panel, #665 effective-properties, #664 hook-log | pure read: subscribe + render machine state | ~1.5 days |
| **A3** | #663 data-inspector, #662 history | tree-view UI; history self-accumulate + `override` rewind | ~2 days |
| **A4** | #667 export, then #668 simulation | permalink/download/clipboard; histogram over `probabilistic_histo_walk(n)` | ~2 days |
| **A5** | #660 toolbar | buttons firing `data-jssm-action`; **after A4**; no format button (→ #792) | ~1 day |

### Track B — editor (critical path; concurrent with Track A)

| PR | Scope | Est. |
|----|-------|------|
| **B1** | Promote `sketch/cm6-lang-fsl` + linter → `src/` (`jssm/cm6` subpath); CM6 optional peer deps; bundled CDN Rollup target; `?external=` importmap dedup (see `notes/superpowers/cm6-editor-handoff.md`); tests | ~2–3 days |
| **B2** | `<fsl-editor>` Lit component on B1 — StreamLanguage + linter in lifecycle, edit→machine reconstruction | ~1.5–2 days |

### Side track (non-blocking)

**#792 FSL formatter** — independent; only gates re-adding the toolbar format button later.

## Critical path

```
Track A:  A1 → A2 → A3 → A4 → A5      (~7.5 days serial; less with parallel worktrees)
Track B:  B1 → B2                      (~4–5 days)   ← long pole
                   (A and B run concurrently)
```

Serial single-dev ≈ 2–2.5 weeks. Parallelized (Track B isolated + Track-A panels fanned out) ≈
Track B's ~1 week plus merge/release overhead.

## Per-PR discipline (repo gates)

- `/sc-commit` on this branch (version bump) before opening each PR — never hand-bump.
- `npm run build` (not `npm run make`) before merge — regenerates site/docs/changelog/readme/cloc.
- 100% spec coverage on each new `src/ts/wc/**` file (jsdom env via `// @vitest-environment jsdom`).
- Batch panels per PR to avoid trivial releases; verify `npm view jssm version` after each merge
  (releases can silently skip on a flaky matrix leg).
- Worktree lives outside the repo tree (nested worktrees break the typedoc docs build).

## Issue cross-reference

| Issue | Title | PR |
|-------|-------|----|
| #639 | five-mechanism customization surface for `<fsl-instance>` | A1 |
| #661 | `<fsl-info-panel>` (state inspector) | A2 |
| #665 | `<fsl-effective-properties>` (resolved-properties panel) | A2 |
| #664 | `<fsl-hook-log>` (hook-firing log) | A2 |
| #663 | `<fsl-data-inspector>` (typed-data tree view) | A3 |
| #662 | `<fsl-history>` (visited-state timeline, click-to-rewind) | A3 |
| #667 | `<fsl-export>` (download / permalink / embed-snippet) | A4 |
| #668 | `<fsl-simulation>` (random-walk runner + histogram) | A4 |
| #660 | `<fsl-toolbar>` (lint, validate, export buttons) | A5 |
| #659 | `<fsl-editor>` (FSL code editor) | B1 + B2 |
| #792 | FSL source formatter / pretty-printer | side |
| #684, #685, #686 | wrapper pipeline / Angular / SSR | **excluded** |
