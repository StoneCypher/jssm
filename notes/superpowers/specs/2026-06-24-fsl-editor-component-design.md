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

**Deferred widgets**, each its own spec → plan → build. All consume the service layer (where relevant) and the appearance contract; all white-label via tokens/`::part`/brand slots. Grouped by capability:

- **Interaction (input side — the rest of the suite is read-only):**
  - **`fsl-actions`** (new) — renders clickable buttons for the *current legal actions* (auto-enabled/disabled on transition, calling `instance.do(action)`), plus a step / reset / auto-advance transport. The missing companion to the `actions` slot, and the only widget that *drives* the machine — treat as near-foundational. Clearest gap.
- **Diagnostics:**
  - **`fsl-problems`** (new) — full list of parse/compile diagnostics, click-to-jump into the editor. Shares the service layer's `fslDiagnostics` with `fsl-footer` (same data at two altitudes: footer = compact status, problems = expanded list); design them together.
- **Structural overview:**
  - **`fsl-transitions`** / **`fsl-states`** (new) — scannable, navigable tables of all transitions (from · action · to) and all states (with kinds). Complements the visual graph and the *current*-state `fsl-info-panel`.
- **Authoring chrome:** `fsl-toolbar` (#660); **`fsl-footer`** (new — line/col, parse status, machine state).
- **Runtime views (exist or planned):** `fsl-info-panel` ✓, `fsl-effective-properties` ✓, `fsl-history` (#662), `fsl-data-inspector` (#663), `fsl-hook-log` (#664).
- **Output / sharing:** `fsl-export` (#667); **`fsl-output`** (new — view the generated DOT / compiled config / codegen: "what this compiles to").
- **Simulation:** `fsl-simulation` (#668).
- **Visual styling (source-editing — a big lift):**
  - **`fsl-style-inspector`** (new) — a per-state style panel in the spirit of a browser inspector's CSS pane or a Delphi properties grid: select a state, see/edit its style attributes (`color`, `background-color`, `text-color`, `border-color`, `shape`, `corners`, `line-style`, `label`, `image`, `url`, state `property`s). Two tiers:
    - **(a) live preview** — tweak and re-render without touching source (override the render, like an inspector's live edits). Lighter.
    - **(b) source-editing** — writes the change back into the `state X : { … }` declaration (creating one if absent). **Big lift:** requires an FSL *source-transformation* capability (located-AST → surgical edit/insert → format-preserving reprint), which is a separate, harder service than the read-only service layer.
- **Aids (candidates):** **`fsl-legend`** (new — explains the graph's colors/shapes/state-kinds); **`fsl-help`** (new — the docs panel prototyped in the sketch).

**Other deferred work:**
- **FSL source-transformation service** (new foundation, deferred) — a codemod-style capability (located AST → surgical edit → format-preserving reprint) that *any* source-editing widget needs: `fsl-style-inspector` tier (b), an "apply this fix" action on `fsl-problems`, future refactors. Distinct from and harder than the read-only service layer; deferred until the first source-editing widget is built.
- **LSP server** — a thin wrapper over the service layer, added when editors beyond web + VS Code are wanted. Never on the widget's critical path.
- **VS Code extension** — a separate consumer of the service layer via Monaco/native provider APIs (separate repo/effort).

## 11. Sequencing (this sub-project)

1. Service layer (extract + neutralize the sketch's diagnostics/completions/overlay logic; unit-test).
2. Appearance contract (token vocabulary + defaults; part/slot conventions).
3. `fsl-editor` component (CM adapters over the service layer; dual-mode; toggles; theming).
4. Verify/realize the `fsl-instance` rebuild-on-`fsl`-change dependency.
5. Demo refactor to use `<fsl-editor>`.
6. Build wiring, exports, tests, DocBlocks, README.

## 12. UX / interaction ideas (captured during build — for the appearance/chrome/decoration plans)

**Parser-driven inline decorations** (same pattern as the color chips — parse → neutral spans → decorations; most are cheap and editor-agnostic via `fslSemanticSpans` extensions):
- **Arrow-kind styling** — render/color the three arrow families distinctly (`->` normal, `=>` main, `~>` forced) so transition semantics are visible inline. FSL-unique; lexer-cheap.
- **State-kind badges** — small inline pills marking start / end / terminal states (from the compile pass).
- **Group rails** — colored left-margin brackets spanning the lines of states in a named group (`&Active : [...]`), visualizing group structure.
- **Unreachable-state dimming** — static reachability from start; fade states you can't reach, flag dead transitions. Useful + novel.
- **Bidirectional editor ↔ graph hover-link** — hover a state name → its `fsl-viz` node pulses, and vice-versa (linked views; needs editor+viz coordination).
- **Live current-state follow** — in `fsl-instance` mode, the active state's declaration line highlights as the machine steps.
- **Probability / `after` glyphs** — `25%` → a tiny inline bar; `after 30 minutes` → a clock glyph.
- **Color chip → picker** — click a color chip to open an inline color picker (ties to `fsl-style-inspector`; source-editing tier).

**Chrome / motion:**
- **Widget toggle button-range** — a range of Win32-style square toggle buttons in the toolbar (`fsl-toolbar`, #660), each showing/hiding a panel (viz, docs, info-panel, problems, …), à la an activity bar.
- **Panel ease-in/out** — animate panels (docs/help, side panels) open/closed with eased motion. For docked flex panes this is a transition on the flex-basis (0 ↔ size); respect `prefers-reduced-motion`.

### Decisions & additions (2026-06-24 review)

- **Approved:** arrow *coloring* (family tints — normal/main/forced; **no** glyph substitution); state-kind badges (**red** = stop / end / terminal, **green** = start); unreachable-state dimming **+ a grammar-checker squiggle** on unreachable states / dead transitions; editor ↔ graph hover-link extended to **transitions/edges** (not just states).
- **Arrow glyph display** (render ASCII arrows as Unicode/Nerd-Font glyphs, view-only, opt-in) split out as **`StoneCypher/fsl#1382`** — needs onboarding a Nerd Font; distinct from arrow coloring.
- **Group rails — deprioritized:** group members aren't necessarily contiguous in source, so a single gutter rail fragments. Revisit only as a subtler per-member margin tick if wanted.
- **Live state-follow — clarified:** highlight the *current* state's declaration line in whichever editor shows the FSL (web `fsl-editor`, or a VS Code line decoration), advancing as the machine steps. Only active in `fsl-instance` (live) mode.
- **More ideas:** action-usage stable coloring (same action → same color everywhere); nondeterminism / duplicate-edge conflict flags; selection-scoped focus sub-graph (dim all but the selection's neighborhood in the graph); hover → node style preview (swatch + shape chip); codelens-style per-state affordances (out/in counts, jump/filter).
- **Viewer pill (corner segmented control; folds in `fsl-output` + codegen + stochastic):** four segments — **Flowchart · Codegen · Stochastic · Compiled** — floated in a **corner** of the viewer pane (no header bar): one rounded-endcap capsule, vertical dividers, selected segment depressed (inset + accent fill). "Flowchart" (not "graph") anticipates other graph kinds later. Segments:
  - **Flowchart** — the rendered diagram.
  - **Codegen** — a pulldown; currently a single `todo` placeholder. Clustered-target-tree structure (family → language → direct + popular-library generators) tracked in **`StoneCypher/fsl#1383`**.
  - **Stochastic** — interactive statistical machine interaction (random walks, heatmaps, steady-state…); not built now, ideas in **`StoneCypher/fsl#1384`**.
  - **Compiled** — a pulldown of six derived views: **SVG** (rendered markup) · **DOT** (graphviz source) · **Analysis** (human-readable structural digest — counts, determinism, terminal/complete, reachability summary) · **JSON tree** (the raw compiled machine config) · **AST parse** (the located parse tree) · **Statistics** (results of randomness / search / reachability runs). *(Naming to confirm: "Analysis" = a derived readable summary, distinct from "JSON tree" = raw config and "Statistics" = dynamic run results.)*

  Orthogonal to arrangement (the View menu): same control in split / stacked / single / tabbed (tabbed keeps `[Code | Viewer]` tabs; the Viewer tab carries the pill). **Shape vocabulary:** rounded connected segmented-pill = mutually-exclusive single-select (radio); the toolbar's square flat separable buttons = independent toggles. The graphviz engine selector + copy/download ride as small contextual corner affordances (copy only on source representations).
