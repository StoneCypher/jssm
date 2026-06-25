# Design: `<fsl-editor>` web component + editor foundations

- **Date:** 2026-06-24
- **Status:** Approved (design); pending spec review
- **Branch / worktree:** `feat_26-06-24_fsl-editor-component`
- **Tracking issues:** primarily fsl `#659` (`fsl-editor` slot); related suite issues `#660` (toolbar), `#662` (history), `#663` (data-inspector), `#664` (hook-log), `#667` (export), `#668` (simulation)

## 1. Context & goal

A throwaway CodeMirror 6 sketch (`sketch/cm6-editor/`) grew into a capable FSL editor: `jssm/cm6` syntax highlighting, parse+compile linting, a parser-driven semantic overlay (color swatches, state-name and shape-enum marks), grammar-driven autocomplete (keys *and* values), a live `fsl-viz` render pane, light/dark theming, layout modes, and a docs panel. The library already ships the `fsl-*` web-component suite (`fsl-instance`, `fsl-viz`, `fsl-info-panel`, `fsl-effective-properties`, `fsl-bind`) and reserves named `fsl-instance` slots — each with an issue — for the rest, including `fsl-editor` (#659).

**Goal:** promote that labor into a real, reusable `fsl-editor` web component (filling slot #659), built on foundations that serve more than CodeMirror — because the same FSL editing intelligence is also wanted in a **VS Code extension** (Monaco / native editor).

## 2. Scope

**In scope (this spec):**
1. An **editor-agnostic FSL service layer** (the intelligence: diagnostics, completions, semantic spans).
2. An **appearance contract** (design tokens + `::part()` exposure + brand slots + a text-surface theme hook) shared by the whole suite.
3. The **`fsl-editor`** web component (CodeMirror adapter + widget), batteries-included and dual-mode.
4. The **demo** graduating from `sketch/` to a permanent showcase that *uses* `fsl-editor`.

**Out of scope (separate spec → plan → build each):**
- The deferred widgets: `fsl-toolbar` (#660), **`fsl-footer`** (new — line/col, status, machine state), `fsl-history` (#662), `fsl-data-inspector` (#663), `fsl-hook-log` (#664), `fsl-export` (#667), `fsl-simulation` (#668).
- An **LSP language server** (see §10) — deferred; the service layer is shaped so it becomes a thin wrapper.

## 3. Architecture overview

Three layers, with strict isolation:

```
                ┌─────────────────────────────────────────┐
                │  FSL service layer  (editor-agnostic)    │
                │  diagnostics() · completions() ·         │
                │  semanticSpans()   — pure fns over text  │
                └───────────────┬─────────────┬───────────┘
        direct calls            │             │   (future) thin wrapper
        ┌───────────────────────┘             └────────────────┐
        ▼                                                       ▼
  ┌───────────────┐        ┌──────────────────────┐      ┌────────────┐
  │ CodeMirror    │        │ VS Code extension    │      │ LSP server │
  │ adapter =     │        │ adapter (Monaco /    │      │ (deferred) │
  │ <fsl-editor>  │        │ native providers)    │      │            │
  └───────────────┘        └──────────────────────┘      └────────────┘
```

- The **service layer** is the only shared code. The web widget and the VS Code extension reach it by **direct synchronous calls** — no protocol, no worker, no async. LSP, if/when built, is a separate optional wrapper over the same functions and **never touches the widget**.
- Base **highlighting** stays editor-specific (CodeMirror `StreamLanguage` via `jssm/cm6`; VS Code uses TextMate / semantic tokens). Only the parser-driven *semantic* layer is shared.
- The **appearance contract** is the second shared foundation: every component reads `--fsl-*` tokens, exposes `::part()`s, and (for chrome) provides brand slots.

## 4. Foundation A — editor-agnostic FSL service layer

Pure functions over FSL text, **shaped to align with LSP types** so a future LSP server is a near-mechanical mapping and each editor adapter is a thin conversion:

- `fslDiagnostics(text): Diagnostic[]` — parse then compile; each item `{ range: {from, to} (offsets), severity, message, code? }`. (Today's `diagnosticsFor` distilled and editor-neutral.)
- `fslCompletions(text, offset): CompletionItem[]` — context-aware keys vs values; items `{ label, kind, detail?, documentation? }` with color swatches carried as `documentation`/metadata, not CodeMirror DOM. (Today's `fslCompletions` source, minus CM specifics.)
- `fslSemanticSpans(text): SemanticSpan[]` — `{ from, to, kind: 'color'|'state'|'enum'|…, value? }`. The overlay's parser walk, returning neutral spans rather than CodeMirror `Decoration`s.

Vocabularies (`gviz_shapes`, `named_colors`, `FslDirections`) and `parse`/`compile` come from `jssm`. These functions live in the library (module name TBD in planning, e.g. `jssm/language-service`) and are exported.

**Adapters convert neutral → editor types:** the CodeMirror adapter maps `Diagnostic`→`@codemirror/lint` diagnostics, `CompletionItem`→`@codemirror/autocomplete` completions (re-attaching the swatch DOM), `SemanticSpan`→`Decoration`s. A few lines each.

## 5. Foundation B — appearance contract (white-label)

Three deliberate, per-component surfaces:

- **Design tokens** — a defined `--fsl-*` vocabulary every component reads and none hardcode: `--fsl-color-surface`, `--fsl-color-text`, `--fsl-color-accent`, `--fsl-color-border`, `--fsl-font`, `--fsl-font-mono`, `--fsl-radius`, `--fsl-space-*`, with light/dark defaults. Custom properties inherit through shadow DOM, so an embedder sets them on a container and they reach every component with zero JS.
- **`::part()` exposure** — internal structural elements are tagged (`part="toolbar"`, `"gutter"`, `"status"`, `"button"`, `"editor"`, …) so embedders apply arbitrary CSS to exposed parts; `exportparts` forwards child parts up (e.g. `fsl-instance::part(editor)`).
- **Brand slots** — `<slot name="brand">` / `"logo">` on the chrome components (`fsl-toolbar`, `fsl-footer`) for an embedder's mark. The editor itself carries no logo slot.
- **Text-surface theme hook** — CodeMirror's *deep* internals (`.cm-line`, gutters, selection) aren't `::part`-able; they're themed via a CodeMirror theme extension fed by the tokens (and a consumer may pass a theme). Honest boundary: tokens + theme for the text surface, parts for the chrome.

Components keep their **shadow DOM** (it isolates CodeMirror's heavy injected styles from the host page and vice-versa). Light DOM is rejected for that reason. A consumer-stylesheet escape hatch (adopt a sheet into the shadow root) is a known additive option, not built now.

## 6. The `fsl-editor` component

**Public API**
- Tag: `fsl-editor` (canonical only — no `jssm-editor` synonym, per the new-component policy; registered via `define_canonical`).
- Attributes/properties: `fsl` (document, get/set), `readonly`, `theme` (`light`/`dark`/`auto`), and opt-out toggles `no-lint`, `no-overlay`, `no-completion` (all features on by default).
- Events: `change` → `{ fsl }` (debounced) on edit; `fsl-error` → `{ message, location }` from the linter (mirrors `fsl-viz`'s `viz-error`).
- Theming: `--fsl-editor-*` vars derive from the shared `--fsl-*` tokens (e.g. `--fsl-editor-bg: var(--fsl-color-surface)`); `::part(editor)` exposed.

**Internals**
- A LitElement mounting a CodeMirror `EditorView` in its shadow root.
- Extensions = CodeMirror adapters over the **service layer**: `jssm/cm6` language (highlighting), a linter (`fslDiagnostics`), the semantic overlay (`fslSemanticSpans`→decorations), autocomplete (`fslCompletions`→completions). Each behind a `Compartment` so its toggle attribute flips it live; theme in its own compartment driven by `theme`.

**Composition — dual-mode (like `fsl-viz`)**
- Standalone: `fsl` in/out + `change` event.
- Nested in `<fsl-instance>` (slot #659): find host via `closest_wc(this,'instance')`, seed from its FSL, and write edits back to drive the machine so viz/panels update live.
- ⚠️ **Dependency:** two-way binding needs `fsl-instance` to rebuild its machine when its `fsl` changes. To verify in planning; if absent, this work includes a small targeted `fsl-instance` enhancement (rebuild-on-`fsl`-change).

## 7. Packaging (mirrors `fsl-viz`)

- `src/ts/wc/fsl_editor_wc.ts` (component) + `fsl_editor_wc.define.ts` (`define_canonical('fsl-editor', …)`).
- Service layer + CodeMirror adapters as focused modules (under `src/ts/` for the service layer, `src/ts/wc/editor/` for CM adapters).
- Rollup → self-contained `dist/cdn/editor.js` + es6 build; `package.json` exports `./wc/editor`, `./wc/editor/define`, `./cdn/editor`, and the service layer export.
- **Dependencies:** CodeMirror packages (`@codemirror/{view,state,commands,language,autocomplete,lint}`) + `lit` as **optional peer deps**, consistent with how `jssm/cm6` already treats `@codemirror/language` / `@lezer/highlight`.
- **Tests:** vitest (jsdom) specs — attribute reactivity, feature toggles, `change`/`fsl-error` events, dual-mode binding; service-layer unit tests (pure functions, easy to cover). DocBlocks + README per project convention.

## 8. The demo

`sketch/cm6-editor/` graduates to a permanent showcase that drops the hand-rolled CodeMirror wiring and *uses* `<fsl-editor>`, keeping the chrome (layout modes, docs panel, theme toggle, live `fsl-viz` pane) as demo-side. Permanent home: a top-level `demo/` (or the project's existing examples/site area — to confirm in planning).

## 9. Decisions made (during brainstorming)

- Target form: a reusable `fsl-editor` component (not just a demo app).
- Editing intelligence: batteries-included, each toggleable.
- Composition: dual-mode (standalone + `fsl-instance`-bound).
- Editor-agnosticism: a service layer consumed by direct calls; LSP deferred.
- Appearance: tokens + parts + brand slots + text-surface theme hook; shadow DOM retained.
- `#008` action-label color: set as the **library default** in `jssm_viz.ts` (edge `fontcolor`), overridable by FSL `text-color`. (Independent of this component; needs a `dist` rebuild to appear in any pre-built bundle.)

## 10. Roadmap (out of scope here)

- **Deferred widgets**, each its own spec → plan → build: `fsl-toolbar`, `fsl-footer`, `fsl-history`, `fsl-data-inspector`, `fsl-hook-log`, `fsl-export`, `fsl-simulation`. All consume the service layer (where relevant) and the appearance contract; all white-label via tokens/parts/brand slots.
- **LSP server** — a thin wrapper over the service layer, added when editors beyond web + VS Code are wanted. Never on the widget's critical path.
- **VS Code extension** — a separate consumer of the service layer via Monaco/native provider APIs (separate repo/effort).

## 11. Sequencing (this sub-project)

1. Service layer (extract + neutralize the sketch's diagnostics/completions/overlay logic; unit-test).
2. Appearance contract (token vocabulary + defaults; part/slot conventions).
3. `fsl-editor` component (CM adapters over the service layer; dual-mode; toggles; theming).
4. Verify/realize the `fsl-instance` rebuild-on-`fsl`-change dependency.
5. Demo refactor to use `<fsl-editor>`.
6. Build wiring, exports, tests, DocBlocks, README.
