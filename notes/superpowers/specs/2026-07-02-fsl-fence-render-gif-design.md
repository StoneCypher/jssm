# FSL Fence Render Helpers + Animated GIF — Design (Phase B)

- **Date:** 2026-07-02
- **Status:** Approved design (pre-implementation)
- **Branch:** `feat_26-07-02_fsl-fence-render-gif`
- **Author:** John Haugeland (design via brainstorming session)
- **Parent spec:** `notes/superpowers/specs/2026-06-23-fsl-markdown-fence-convention-design.md` — this implements its §4.10 "render helpers" clause and the §4.5 `gif` format. The fence *parser* (`parse_fence_info` / `fsl_fence_lang`) shipped in 5.157.0 (PR #811) and is consumed here, not modified.

## 1. Summary

Phase B makes the fence convention *renderable* outside a live webview: a set of host-agnostic, DOM-free helpers that turn `(FSL source, fence info string)` into finished static output — an HTML parts stack, or a looping animated GIF that walks the machine — plus the pure GIF89a encoder that backs it. First consumers: the jssm cookbook/docs build (dogfood) and the CLI (`fsl render --target gif`). The SSG story (`transform_markdown`) falls out of the same machinery.

## 2. Consumers and scope (settled)

- **v1 consumers:** the repo's own cookbook/site build, and the existing `fsl render` CLI subcommand.
- **SSG-facing surface:** `transform_markdown` ships in v1 because it is ~40 lines over `render_fence_html`, but no host plugin packages (eleventy/VitePress adapters) are built — markdown-it renderers are synchronous and Graphviz is async, so static hosts integrate via async transform passes, which `transform_markdown` is.
- **Not consumed by the VS Code extension** — that is a separate repo rendering live components; it needs none of this.

## 3. Modules (all `src/ts/`, new subpath export `jssm/fence`)

### 3.1 `fsl_gif.ts` — pure GIF89a encoder (hand-rolled; settled choice)

- `encode_gif(frames: GifFrame[], opts?: GifOptions): Uint8Array`
  - `GifFrame = { rgba: Uint8Array, width: number, height: number }` (straight RGBA8888, length `= 4·w·h`; all frames must share dimensions — mismatch throws `JssmError`).
  - `GifOptions = { delay_cs?: number (default 70), loop?: number (default 0 = forever) }`.
- Internals: one **global color table** (median-cut quantization to ≤256 colors over the **union of all frames' pixels**, each frame mapped nearest-neighbor into it — amended 2026-07-02 by user adjudication: the original first-frame-only rule silently corrupts callers whose later frames introduce new colors, e.g. a red frame followed by a blue frame decodes as two red frames; exactness for every frame is guaranteed while the union stays ≤256 distinct colors), LZW compression with correct code-size resets and 255-byte sub-block packing, Graphics Control Extension per frame (delay, no transparency v1), Netscape 2.0 looping application extension, trailer.
- Pure function: no async, no platform APIs, Node- and browser-identical.
- **Why hand-rolled (settled):** `@resvg/resvg-wasm` establishes that bundled devDependencies don't violate #743's zero-runtime-dependency goal, so this is preference, not necessity — but GIF89a is frozen since 1989, the writer is ~300 well-bounded lines, and owning it puts palette logic next to the theme knowledge. Chosen over bundling `gifenc`.

### 3.2 `fsl_walk.ts` — walk planner

- `plan_walk(machine: Machine<unknown>): string[]` — the frame sequence as state names.
  - If any transition has `main_path === true`: start at the machine's start state, follow main-path edges, stop on first revisited state (the loop closes visually because the GIF loops).
  - Else: **edge tour** — every edge once, in declaration order; the sequence is each edge's `from` then final `to` (consecutive entries may not be connected; that is fine, frames are highlights, not legal transitions).
- Pure, synchronous. Throws `JssmError` on a machine with no states.
- Deliberately does NOT drive a real machine through `transition()`/`override()` — a tour is not a legal path, and the walk is presentation, not simulation.

### 3.3 `fsl_fence_render.ts` — the descriptor interpreter (the host-agnostic API)

- `render_fence_html(source: string, info: string, opts?: FenceRenderOptions): Promise<string>`
  - Parses `info` via `parse_fence_info`; renders the parts stack **in order, first = top** (parent spec §4.4), inside a sized wrapper div (`width`/`height` from the descriptor; unset dimension auto via natural aspect where applicable).
  - Part renderings: `image` → inline SVG for `svg` format, `<img src="data:...">` for `png`/`jpeg`, `<img>` with GIF data URI for `gif`; `code` → highlighted FSL (see §4); `dot` → escaped `<pre><code>` of the DOT source (no highlighter, v1 cut); interactive-only parts (`editor`, `actions`, `info-panel`, `toolbar`) render **nothing in static output** plus a note — static hosts can't fulfill them, and the parent spec's conflict rules (§4.8) already prefer graceful degradation over failure; `title`/`footer` → simple chrome divs.
  - Parser `notes[]` and render-time notes emit as HTML comments adjacent to the block (quiet, inspectable, invisible).
- `render_fence_gif(source: string, opts?: GifRenderOptions): Promise<Uint8Array>`
  - Pipeline: construct machine → `plan_walk` → render the machine's SVG **once** → per frame, patch the walk state's node fill/stroke in the SVG string (same post-layout SVG-surgery house pattern as `reorder_svg_layers` and `<fsl-viz>` highlighting; one Graphviz run total, zero layout jitter) → rasterize each variant via `@resvg/resvg-wasm` → `encode_gif`.
  - `GifRenderOptions = { delay_cs?: 70, loop?: 0, max_frames?: 64, scale?: 100 }` — `scale` follows the CLI raster convention (`100` = 3× natural size, per `render.ts`'s existing png/jpeg semantics). Walks longer than `max_frames` truncate with a note.
- `transform_markdown(markdown: string, opts?: FenceRenderOptions): Promise<string>`
  - Hand-rolled fenced-block scanner (backtick fences, info-string check via `fsl_fence_lang`; tilde fences and indented code blocks are out of scope v1, noted); replaces each FSL fence with its `render_fence_html` output; all other content byte-identical.
  - Per-fence error isolation: a broken fence becomes its error box; the document always renders.

### 3.4 Export surface

- New package export `"./fence"` → bundled dist entry (esbuild, like the wc entries) containing 3.1–3.3; types emitted alongside.
- `encode_gif`, `plan_walk` are exported individually (reusable primitives).
- Core barrel (`jssm`) unchanged. `jssm/viz` unchanged (this consumes it).
- **As shipped (recorded per final review, 2026-07-02):** the `jssm/fence` barrel (`src/ts/fence.ts`) re-exports the full 11-function primitive surface, plus their types:
  - `fsl_fence_render.ts` — `render_fence_html`, `render_fence_gif`, `transform_markdown`
  - `fsl_gif.ts` — `encode_gif`, `quantize`, `lzw_encode`
  - `fsl_walk.ts` — `plan_walk`
  - `fsl_fence_highlight.ts` — `highlight_fsl_runs`, `highlight_fsl_html`
  - `fsl_svg_patch.ts` — `extract_state_fills`, `patch_state_fill`

## 4. Static syntax highlighting (settled: full parity from v1)

**Requirement (user decision):** no quality tiers — static `code` output uses the *same* two layers as the editor, so highlighting can never differ across product surfaces:

1. **Token layer:** `fslLanguage.parser.parse(code)` (`src/ts/cm6/fsl_language.ts` StreamLanguage) walked via `@lezer/highlight`'s `highlightCode` with a tag→class highlighter. DOM-free.
2. **Semantic layer:** `fslSemanticSpans(text)` (`src/ts/language_service/semantic_spans.ts` — pure text→spans over the real parser with locations, already CM-independent). Overlay wins on overlap.

Output: nested `<span class="fsl-tok-… fsl-sem-…">` HTML. Semantic state-name spans additionally carry `data-state="Name"`; when the render resolves a theme (same resolution the viz used), state spans get inline `style="color: …"` matching their diagram color — the code block visually keys to the graph above it with zero host CSS. A stylesheet-only mode (`inline_colors: false`) is available for hosts that theme via CSS.

Cost accepted: `@codemirror/language` + `@lezer/highlight` bundle into the `jssm/fence` dist entry (already in-tree devDeps; zero runtime `dependencies` entries added — resvg precedent).

## 5. CLI integration

- `fsl render --target gif` on the existing subcommand (`src/ts/cli/subcommands/render/`), with `--delay <cs>` and `--max-frames <n>` flags mapping to `GifRenderOptions`. Output is the encoded bytes to the requested file, matching png/jpeg ergonomics.

## 6. Cookbook dogfood

- The cookbook/site build (`src/fsl.tools/site/scripts/build.cjs`) renders its FSL blocks through `render_fence_html` (block-level call; it already has a block model — it does not need `transform_markdown`). Its FSL highlighting thereby switches to the two-layer parity pipeline. This is the in-repo, CI-covered consumer.

## 7. Error handling

- `render_fence_html` / `transform_markdown`: never throw for bad FSL — emit the parent spec §4.9 visible error box (message + escaped source stays visible).
- `render_fence_gif`, `plan_walk`, `encode_gif`: throw `JssmError` (programmatic callers).
- Frame-dimension mismatch, >256-color pathological palettes (falls back to quantized nearest match, never throws), zero-frame input (throws): all specified in the plan's test cases.

## 8. Testing approach

- **Encoder:** byte-structure unit tests (magic `GIF89a`, LSD fields, Netscape block, GCE per frame, trailer `0x3B`); a **minimal independent GIF/LZW decoder in test helpers** enabling round-trip pixel-equality tests; **stochastic suite**: seeded random frame stacks (sizes, colors, frame counts) → encode → decode → exact pixel match after palette mapping (assert ≤256-color error bound: mapped pixel equals nearest palette entry). This is real verification (decoder written from the format spec, not from the encoder).
- **Walk planner:** main-path machines, no-main-path tours, cycles, single-state machines, declaration-order stability.
- **HTML renderer:** substring assertions (identifiers, class names, data attributes) — no golden files, per policy.
- **transform_markdown:** FSL fences replaced, non-FSL fences and prose byte-identical, broken-fence isolation.
- **Highlighting parity:** the static highlighter and semantic spans are asserted against the same fixtures the editor layers use.
- 100% spec-suite coverage gate applies (`src/ts/**`); DocBlocks + `@example` on every export; README regenerates via the full build.

## 9. Deliberate v1 cuts

- No `dot` highlighting (escaped pre only).
- No per-edge/tween animation frames (state highlights only).
- No transparency/disposal tricks in the GIF (full frames; simple and correct first).
- No tilde-fence/indented-block support in `transform_markdown`.
- No eleventy/VitePress adapter packages.

## 10. Open items

None — the parent spec's §10 open items that belonged to Phase B (encoder choice, frame timing, palette) are settled above. Remaining §10 items (VS Code static escape hatch, extension repo) belong to the extension project.
