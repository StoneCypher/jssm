# FSL Markdown Fence Convention + VS Code Live-Preview Plugin — Design

- **Date:** 2026-06-23
- **Status:** Approved design (pre-implementation)
- **Branch:** `feat_26-06-23_fsl-markdown-fence`
- **Author:** John Haugeland (design via brainstorming session)

## 1. Summary

Define a **portable convention** for embedding FSL / jssm state machines in Markdown
fenced code blocks, and build a **VS Code plugin** that renders them live in the
Markdown preview — analogous to Matt Bierner's *"Markdown Preview Mermaid Support"*,
which hooks the preview's `markdown-it` instance and renders client-side in the
preview webview.

The work splits into two layers with deliberately different lifetimes:

1. **The fence convention** — a context-independent grammar (tokens, formats,
   sizing, stacking, error rules) plus a reference parser. This is the durable
   artifact; it lives in `jssm` and is reused by every future host.
2. **The VS Code plugin** — the first, deliberately *maximalist* interpreter of
   that convention. It ignores most of the grammar and always renders the full
   live IDE, because it can.

The key realization driving the architecture: **the configurability is for the
other places the same Markdown travels** (static-site generators, GitHub, future
editors), not for VS Code. Each host interprets the convention according to its
capabilities.

## 2. Motivation

- FSL has no Markdown-embedding story; Mermaid's whole value is diagrams-in-docs.
- jssm already ships nearly every rendering primitive needed (see §7), so this is
  mostly *glue + convention*, not new rendering technology.
- A portable convention means one grammar serves VS Code now and arbitrary hosts
  later, matching the stated goal of "do this for other environments too."

## 3. Non-goals

- **Inline-in-editor rendering** (diagrams between source lines as you type) is
  explicitly out of scope. VS Code's plain Markdown text editor has no supported
  API for hosting rendered HTML/SVG inline: text decorations can't size or host
  interactivity; the one good API (`createWebviewTextEditorInset`) is permanently
  *proposed-only* and cannot ship to the Marketplace; the only alternative is a
  full custom editor that *replaces* the Markdown editor — a separate product with
  real UX costs. If true live-preview-while-editing is ever wanted, it is a
  distinct future effort and must not gate or entangle this work.
- **A static escape hatch in the VS Code plugin** (a setting to preview the
  static/published interpretation) is deferred to a possible later release.

## 4. Layer 1 — The FSL Markdown Fence Convention (portable, lives in `jssm`)

A renderer in *any* host reads this; each honors what it can. On a host with no
plugin (e.g. GitHub) the block degrades to a plain, readable code block showing
the FSL source.

### 4.1 Fence language token

- Primary: `fsl`. Synonym: `jssm`. Case-insensitive.
- Example: ` ```fsl `, ` ```jssm `, ` ```FSL `.

### 4.2 Info string

- Everything after the language token is a **space-separated** list of tokens.
- Example: ` ```fsl image code width=300 svg `.

### 4.3 Element tokens

`image` · `code` · `editor` · `actions` · `info-panel` · `toolbar` · `title` ·
`footer` · `ide`. Names mirror the existing `<fsl-instance>` slots so each maps
1:1 onto something jssm already renders.

- `image` — the rendered diagram.
- `code` — read-only, syntax-highlighted FSL source.
- `editor` — editable FSL source.
- `actions` — the legal-action buttons ("go / do" buttons).
- `info-panel` — the data viewer (current state, legal actions, machine data).
- `toolbar` — machine controls (reset, step, play, …).
- `title` / `footer` — chrome.
- `ide` — macro for the full set.

### 4.4 Layout / stacking

- À-la-carte tokens **stack vertically; the first listed sits on top** (higher in
  the block). "On top" means render order / vertical position, never z-layering.
- `ide` is the **one curated 2-D app layout** (viz dominant, data in a sidebar,
  controls + editor framed around it) — not a plain stack. It is the only
  non-stacking arrangement.

### 4.5 Formats

- `svg` — default; vector; the **only** format that supports a live/interactive viz.
- `png`, `jpeg` — raster snapshots (static only).
- `dot` — the Graphviz **DOT source**, rendered as a code-view (a sibling of
  `code`/`editor`), not an image.
- `gif` — a **looping** animation that walks the machine's **main-path** transitions
  (FSL `=>`, i.e. transitions with `main_path === true`) if any exist; otherwise a
  **tour** of every edge once. Highlights each state as it goes. No interactivity.
- A **bare format token implies `image`** (e.g. ` ```fsl png ` ≡ `image png`).

### 4.6 Sizing

- `width=` / `height=` size the **whole block** (panel or image alike); the
  diagram fits within.
- If only one is given, the other is **auto-filled by aspect ratio** (Graphviz
  gives the SVG a natural width:height).
- Units: bare number = **px** (`width=300`); `%` allowed (`width=100%`). Other
  units deferred.

### 4.7 Defaults

- Empty info string → `image code` (diagram on top, source beneath).

### 4.8 Conflict & precedence rules

- **Raster + interactive** (e.g. `png actions`) → **SVG wins**, raster request
  overridden, with a quiet inline/console note (a raster can't be a live viz).
- **Unknown token** → ignored with a quiet inline note (forward-compatible).
- **Duplicate element token** → first wins, dupes ignored.
- **Two image formats** (e.g. `png jpeg`) → last wins.
- **`code` + `editor`** together → allowed; they are distinct parts and stack.

### 4.9 Errors

- Invalid FSL renders a **visible error box** in place of the block (message and,
  where available, location). Never a silent blank.

### 4.10 Reference parser (the shipped artifact)

- A pure function `parse_fence_info(info: string): FenceDescriptor` turning the
  info string into a validated, structured descriptor (ordered elements, format,
  dimensions, notes/warnings for ignored/overridden tokens).
- Plus host-agnostic render helpers built on the existing viz API (§7).
- Lives as a new `jssm` module/export; unit-tested independently of any host.

## 5. Layer 2 — The VS Code Plugin (first interpreter)

### 5.1 Mechanism

- Contributes to VS Code's Markdown preview via the `extendMarkdownIt` extension
  API (a `markdown-it` rule for `fsl`/`jssm` fences) plus an injected webview
  script — the exact mechanism Bierner's Mermaid plugin uses.

### 5.2 Interpretation policy

- Recognizes `fsl` / `jssm` fences.
- **Ignores all element and format tokens.** Always renders the **full live IDE
  _less the `editor`_** — because VS Code *is* the editor; an editable FSL pane in
  the preview is redundant. The live IDE = viz + actions + info-panel + toolbar +
  title + footer.
- **Honors `width` / `height`** (sizes the live panel); sizing is
  environment-neutral and useful.
- The author writes tokens for the **publish target**; the VS Code preview is a
  dev convenience that always shows the richest live version.

### 5.3 Live rendering

- Mounts a live `<fsl-instance>` (canonical tag; jssm web component) in the preview
  webview, loading jssm's web-component bundle.
- Runs a real machine: clicking `actions` drives transitions and the viz highlights
  the current state live.
- Multiple fences per document each get an independent instance.

### 5.4 Theming

- Rendered SVG and chrome adapt to VS Code's light/dark theme (CSS variables /
  theme-kind detection). Treated as implementation polish, not a design decision.

### 5.5 Errors

- Invalid FSL → visible error box in place (per §4.9).

### 5.6 Known implementation concerns (for the plan, not decisions)

- Webview **Content-Security-Policy** (script/style nonces; jssm bundle loading).
- Web-component bundle delivery into the sandboxed webview.
- Message-passing / instance lifecycle across preview reloads and edits.
- Performance with many machines in one document (live web components + viz.js
  WASM per block). No throttling/virtualization in v1; revisit if it bites.

## 6. Layer 3 — Where the code lives

- **Convention + reference parser + render helpers → `jssm`** (this worktree). It
  is library surface, reused by every future host.
- **VS Code extension → its own repo** (e.g. `StoneCypher/vscode-fsl`) depending on
  the published `jssm`. Rationale: jssm **publishes to npm on every push to
  `main`**; a VS Code extension publishes to the Marketplace on a different
  cadence. Keeping them in separate repos keeps the two release pipelines fully
  independent.
- **This worktree's deliverable** is therefore the Layer-1 jssm core (convention +
  parser + helpers + tests + docs). The extension repo is separate, later work that
  consumes it.

## 7. Existing jssm surface this builds on

- `fsl_to_svg_string(fsl): Promise<string>` — SVG string, runs in plain Node, no
  DOM (viz.js/Graphviz WASM). `fsl_to_dot(fsl): string` — synchronous DOT source.
  Entry point: `jssm/viz` (`src/ts/jssm_viz.ts`).
- CLI/programmatic `render(fsl, { target, width, height, scale, quality })` →
  `svg | dot | png | jpeg | html` (`src/ts/cli/subcommands/render/render.ts`).
  PNG/JPEG via `@resvg/resvg-wasm`.
- Web components: `<fsl-viz>` (image; synonym `<jssm-viz>`), `<fsl-instance>`
  (full IDE with slots `title`/`viz`/`editor`/`actions`/`toolbar`/`info-panel`/
  `footer`; synonym `<jssm-instance>`), `<fsl-bind>`. CDN IIFE bundles
  (`dist/cdn/viz.js`, `dist/cdn/instance.js`) auto-register the elements.
- Arrow kinds: `JssmArrowKind = 'none' | 'legal' | 'main' | 'forced'`; transitions
  carry `main_path: boolean` (`src/ts/jssm_types.ts`) — the basis for the `gif`
  main-path walk.
- **New capability required:** an animated-GIF encoder (frame sequencer + GIF
  assembly). No jssm primitive exists today; `svg`/`png`/`jpeg`/`dot` all already
  fall out of the surface above.

## 8. Portability story (why the convention earns its keep)

- **Static-site generators** honor `image`→SVG, `gif`→animated walk, `code`/`dot`→
  source views, `png`/`jpeg`→raster export, with full stacking.
- **GitHub** and any plain Markdown renderer → inert code block (graceful).
- **Future editors** get their own interpreter; the grammar and parser are reused.

## 9. Testing approach

- **Parser:** unit tests over `parse_fence_info` — every token, format, sizing
  case, default, and each conflict/precedence rule; malformed info strings.
- **Render helpers:** assert substrings/identifiers in produced SVG/DOT (per repo
  convention: no golden-file/snapshot tests).
- **gif:** main-path-present vs tour fallback path selection; loop flag; frame
  count bounds. Stochastic walks where a random path is involved.
- **VS Code plugin** (separate repo): integration tests for fence detection,
  always-live-IDE mounting, width/height application, and error-box rendering.
- New/changed entities get DocBlocks, tests, and README updates per repo policy.

## 10. Open items / deferred

- GIF encoder dependency choice (frame duration, max frames, palette).
- Theming polish specifics (light/dark token mapping).
- Static escape-hatch setting in VS Code (deferred; §3).
- The separate VS Code extension repo scaffolding (later effort).
