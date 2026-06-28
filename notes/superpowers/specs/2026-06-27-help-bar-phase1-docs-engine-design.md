# Help-bar Phase 1 — Docs engine + page contract (design)

| | |
|---|---|
| **Status** | Design — approved decisions folded in; awaiting spec review |
| **Branch** | `docs_26-06-27_help-sidebar-grammar-ref` |
| **Date** | 2026-06-27 |
| **Related** | `notes/superpowers/specs/2026-06-27-help-bar-teaching-surface.md` (the backbone); [jssm#822](https://github.com/StoneCypher/jssm/issues/822) |

## 1. Context and scope

The goal — "get the help sidebar done" — was defined as **grow the cm6-editor's `#docs`
panel into the language-docs IA, with a full curriculum**. That is several subsystems, so it
is decomposed into two phases (a hard dependency forces the cut: you cannot mass-author pages
until the page contract is locked, or you rewrite them all):

- **Phase 1 (this spec)** — the docs engine + the locked page contract + Index/Search +
  coverage checks #2–#4 + 2–3 exemplar pages per section that exercise the whole pipeline.
- **Phase 2 (separate spec/plan)** — author the ~40 teachable-feature curriculum pages against
  the locked contract; parallelizable, validated automatically.

This phase stays in the **prototype** (`sketch/cm6-editor`); productionizing into the shippable
`./cm6` package is explicitly out of scope (deferred).

### Locked decisions

- Help-page tree lives in a **durable** `src/help/` (not throwaway in the sketch).
- Markdown rendering uses a **minimal custom renderer** (no new dependency).
- Phase-1 content bar: **2–3 exemplar pages per section**, enough to exercise every section and
  every tier's treatment contract.
- Navigation is **drill-in** (section list → page list → page), suited to a narrow panel.

## 2. Starting point (the WIP to import)

The sidebar already exists as **uncommitted WIP in the main checkout** and is *not* in this
worktree. First implementation step (per user decision "copy it into the worktree"): copy the
cm6-editor files from `C:\Users\john\projects\jssm\sketch\cm6-editor` into the worktree and
commit as the sidebar baseline, leaving the main checkout untouched. Imported files:
`index.html`, `editor.js`, `diagnostics.mjs`, `completion.mjs`, `editor_theme.mjs`, `layout.mjs`,
`semantic_overlay.mjs`, `splitter.mjs`, `sample.fsl`, `README.md`.

The WIP's `#docs` panel is a real resizable third pane (toggled by the `?` toolbar button,
persisted open/ratio in localStorage, resized via `makeSplitter`). Its content today is **static
HTML** — six editor-help `<details>` sections in `index.html`. Phase 1 replaces that static
content with the IA browser; the *panel mechanics* (toggle, splitter, theme) are reused as-is.

## 3. Architecture

The panel becomes a manifest-driven IA browser with **no backend** — two repo data sources fetched
over the existing static origin (the sketch serves from repo root):

- `src/data/teaching-surface.json` — the backbone (52 features, tiers, `dependsOn`, `indexTerms`,
  `units`). Drives Tutorials ordering, the Index, and Search keywords.
- `src/help/` — the authored markdown page tree (new), plus a generated `src/help/pages.json`.

**Runtime pipeline:** fetch manifest + `pages.json` → build nav → on page-select, fetch the `.md`,
split front-matter, render markdown into the panel content area.

Components (each a focused module):

- `docs_panel.mjs` — the IA browser: nav state machine (drill-in), section rendering, page fetch,
  Index, Search. Replaces the static `#docs` body; reuses the existing toggle/splitter wiring.
- `markdown_mini.mjs` — the minimal markdown renderer (§6).
- `editor.js` — gains a few lines to mount `docs_panel` into `#docs` instead of relying on static
  HTML.

## 4. The page contract (lynchpin — Phase 2 depends on this)

- **File:** `src/help/<section>/<page-id>.md`
- **Front-matter (YAML-ish, parsed by a tiny reader):**
  ```yaml
  id: tut-transitions
  section: tutorials          # one of the 6 section ids
  title: "Transitions"
  order: 20                   # sort within section
  teaches: [transitions]      # feature ids → credits 'prose'
  mentions: [states]          # feature ids → credits 'mention'
  indexTerms: [arrow, edge]   # extra search terms (esp. for concept pages)
  ```
- **Tagged fences:** ` ```fsl {teaches: transitions, run: true} ` — a fenced FSL block that
  declares which feature it demonstrates. One tag does triple duty: it is extracted and parsed as
  a doctest, it credits `example`-level treatment for that feature, and (when `run: true`) the
  panel offers a **"load into editor"** action that drops the example into the live editor.
- **Generated `src/help/pages.json`:** a Node scan of all page front-matter + fences into one
  index `[{ id, section, title, order, source, teaches, mentions, indexTerms, fences:[{teaches,run}] }]`.
  Both the browser and the coverage checks read this — the browser never file-discovers at runtime.

## 5. Docs-browser UI — drill-in navigation

Three nav levels with a breadcrumb (`Docs / Section / Page`) and a back affordance:

1. **Sections** — the six IA top-level items: Getting Started, About State Machines, Tutorials,
   Example Machines, Index, Search.
2. **Pages in a section** — listed from `pages.json` by `order`; **Tutorials** is ordered by the
   manifest `dependsOn` topo-sort then tier (core→advanced).
3. **Page** — rendered markdown.

Section sourcing:

- **Getting Started** — authored pages, *including* the migrated editor-help (the six existing
  `<details>` become real md pages here; content preserved, reformatted).
- **About State Machines** — authored concept pages; **ungated** by coverage (theory, not features).
- **Tutorials** — authored, coverage-gated, manifest-ordered.
- **Example Machines** — Phase 1: a small set of runnable sample machines (e.g. `sample.fsl` and a
  couple more) each "load into editor"-able. Full cookbook/corpus integration is later.
- **Index** — generated (§7).
- **Search** — generated (§7).

## 6. Minimal markdown renderer (`markdown_mini.mjs`)

A small, dependency-free renderer for the subset the curriculum needs:

- Block: `#`/`##`/`###` headings, paragraphs, unordered (`-`/`*`) and ordered lists, fenced code
  blocks (with `{…}` attribute parsing), blockquotes, horizontal rules.
- Inline: `` `code` ``, `**bold**`, `*italic*`, `[text](url)`.
- **FSL fences** render specially: the FSL source shown with the sketch's existing highlighter,
  plus a "load into editor" button when `run: true`.
- Out of scope for the subset: tables, nested blockquotes, HTML passthrough. (Curriculum authored
  to the supported subset; the fence-doctest + a render smoke test catch misuse.)

The renderer is a pure function `render(markdown) → HTMLElement|string` so it is testable in
isolation.

## 7. Index and Search

- **Index** — generated from the manifest: every non-`exclude` feature, grouped by surface, each
  linking to the page that `teaches` it (via the computed coverage join) and to its
  `referenceAnchor` ("look it up" in the grammar reference). Footguns flatten in as their own
  searchable entries.
- **Search** — client-side over rendered page text + page `indexTerms` + manifest
  `indexTerms`/footgun terms; substring/token match. Results link to the owning page (and anchor).

## 8. Coverage checks #2–#4 + fence doctests (connect the UI to the backbone)

Node tooling beside the existing `check_partition.cjs`, all plain-node (no `node_modules`):

- `scan_pages.cjs` — scan `src/help/**/*.md` → write `src/help/pages.json`; compute the coverage
  join (`taughtAt`: `teaches`→prose, tagged-fence→example, `mentions`→mention).
- **check #2 (tier↔treatment)** — every feature that a page *claims to teach* meets its tier's
  treatment contract (core ⇒ prose+example; intermediate ⇒ example; advanced ⇒ mention).
- **check #3 (no-stale)** — no page `teaches`/`mentions`/tags a `forbidInTutorial` feature, nor uses
  a forbidden terminal (e.g. `edge_color`).
- **check #4 (dependency order)** — `dependsOn` is a DAG and, among the pages present, every
  prerequisite's page precedes its dependents' in the Tutorials order.
- **fence doctest** — extract every ` ```fsl{run} ` block, parse via `fsl_parser`; a parse error
  fails the build (the "examples must currently work" guard).

**Phase 1 mode (validate-present, report-gaps).** Because only exemplar pages exist, the checks
*enforce* the contracts for every feature a page claims (teaches/mentions/tags must resolve; treatment
must match tier; no stale; DAG valid for present pages) and *report* — do not fail on — features that
have no page yet. The "every teachable feature must be covered" gate is a **Phase 2** exit criterion,
not Phase 1's. So a green Phase-1 run means "what exists is correct," not "everything is covered."

A single `check_teaching_surface.cjs` runner invokes check #1 (existing) + #2–#4 + fences and
reports per-surface/per-check, suitable for an `npm run check:teaching-surface` script and a build
gate (gate wiring itself is a follow-up, not Phase 1).

## 9. File layout

```
src/help/<section>/<page-id>.md        authored pages (durable)
src/help/pages.json                    generated index
src/scripts/teaching_surface/
  scan_pages.cjs                       front-matter/fence scan → pages.json + coverage join
  check_teaching_surface.cjs           unified runner (checks #1–#4 + fences)
  (extends existing extract_*/check_partition)
sketch/cm6-editor/
  docs_panel.mjs                       IA browser (new)
  markdown_mini.mjs                    minimal renderer (new)
  index.html / editor.js               imported WIP + wiring edits
```

## 10. Testing

- **Node:** coverage checks #1–#4 green on the exemplar pages; every `fsl{run}` fence parses;
  `markdown_mini` unit-tested on the supported subset (incl. fence attribute parsing).
- **UI smoke (Playwright, browsers already machine-wide):** panel opens, drill-in works, a page
  renders, "load into editor" populates the editor, Index lists features, Search returns hits.

## 11. Phase 1 exit criteria

- WIP imported into the worktree and committed.
- `src/help/` populated with 2–3 pages per section (including the migrated editor-help), each
  page satisfying its features' tier/treatment contract.
- `pages.json` generated; `#docs` renders the IA browser with drill-in nav, page rendering,
  working Index and Search, and "load into editor" for `run` fences.
- Checks #1–#4 + fence doctests green in validate-present mode (what exists is correct; gaps
  reported, not failed); `markdown_mini` tests green; Playwright smoke green.

## 12. Out of scope (later phases)

- Phase 2: the ~40-page curriculum (this spec ships only exemplars).
- Productionizing the panel into the shippable `./cm6` package / a web-component wrapper.
- Full cookbook/proof-corpus integration for Example Machines.
- Wiring the coverage runner into the `run_build` CI gate.
