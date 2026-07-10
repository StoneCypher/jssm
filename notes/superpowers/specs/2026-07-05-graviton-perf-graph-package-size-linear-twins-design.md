# Graviton perf-chart — package-size panel + linear twins

**Date:** 2026-07-05
**Branch:** `feat_26-07-05_graviton-perf-graphing`
**Target:** `src/scripts/make_perf_chart.cjs` (+ its spec)
**Issue context:** perf-trend chart generator (#748), posts to tracking issue #636

## Motivation

Two problems with the current `perf_chart.svg`:

1. **The footprint panel is the wrong metric.** The 8th panel plots
   `footprintBytes` — the retained heap of one constructed machine — split into
   one line per machine shape (`chain-200`, `chain-10`, …). Package byte size is
   not a function of machine shape, so a per-shape breakdown is noise. The
   genuine "how heavy is the package" number is already measured and stored
   (`scaling.json`'s `bundles` block, written by `benchmark_scaling.cjs`
   `bundlesPass()`), but has never been charted.

2. **Log-only, full-history panels bury recent movement.** Every panel is
   log-scale, anchored at `10^0`, over the entire measured history. A 3% recent
   regression is invisible at that scale and window. A linear, tightly-bounded,
   recent-only companion makes small recent changes legible.

## Requirements (as agreed)

1. Replace the per-shape heap-footprint panel with a **single-line package-size
   panel**: the value is the **sum of raw bytes across all three dist bundles**
   (`jssm.es5.cjs`, `jssm.es6.mjs`, `jssm.es5.iife.js`) per version.
2. Beneath **each** panel, add a **linear-scale twin** at the same width, that:
   - uses a **linear** y-axis (not log),
   - bounds the y-axis to **10% of the data span** on each side
     (`pad = 0.1×(max−min)`; axis `min−pad … max+pad`), rather than anchoring to 0,
   - shows only the **most recent 30 versions** (last 30 x-keys),
3. Lay the twins out directly **beneath** each existing graph (same width), and
   **double** the vertical spacing **between the resulting pairs**.
4. Apply the same treatment in `--comment` (issue-publish) mode: each operation
   publishes both a log and a linear per-op SVG, and the comment embeds the
   linear image directly beneath its log image.

## Non-goals

- No change to the log panels' rendering, scale, or full-history window — they
  must regenerate **byte-identically** from unchanged data (existing
  determinism guarantee at `make_perf_chart.cjs:14-17`).
- No new measurement pipeline. The `bundles` data already exists in
  `scaling.json`; this only charts it. Runs whose `scaling.json` predates
  `bundlesPass()` simply have no package-size point (a gap), exactly as
  footprint gapped on runs benchmarked without `--expose-gc`.
- No change to the benchmark producer (`benchmark_scaling.cjs`,
  `benchmark_bundle_size.cjs`).

## Design

### A. Thread `bundles` through data collection

`collect_runs` currently extracts only `results` from each `scaling.json`,
dropping `bundles`. Add `bundles: data.bundles` to each run object. Carry it in
`build_data_json`'s per-run mapping so `perf_data.json` exposes it (parity with
how `results[]` already carries `footprintBytes`).

Run object gains: `bundles?: { [basename]: { raw:number, gzip:number, brotli:number } }`.

### B. Package-size series (replaces footprint series)

- **Delete** `footprint_series` (function, module export, and its unit tests).
  Verified sole consumer: only `make_perf_chart.cjs` used it.
- **Add** `bundle_size_series(runs) → Map<string, {key,ops}[]>`:
  - For each run with a `bundles` object, compute
    `totalRaw = Object.values(run.bundles).reduce((s,b) => s + b.raw, 0)`.
  - Push `{ key: key_of(run), ops: totalRaw }` under a single series label
    `"package (raw, all dist)"`.
  - Runs without `bundles` are skipped (gap).
  - Returns a one-entry map → `panel_svg` draws exactly one line + one legend row.
- In `render_chart`, the 8th cell is this panel, rendered with `unit = 'bytes'`,
  keyed `'packageBytes'`. Only added when the series is non-empty (mirrors the
  old footprint guard).

### C. Linear scale in `panel_svg`

`panel_svg` gains one parameter: `scale` (`'log'` default | `'linear'`).

- **`'log'` path is untouched** — same code, same output, byte-identical.
- **`'linear'` branch:**
  - y-bounds over finite point values: `lo = min`, `hi = max`;
    `span = hi − lo`; `pad = span > 0 ? span*0.1 : (Math.abs(hi)*0.1 || 1)`;
    `ylo = lo − pad`, `yhi = hi + pad`.
  - `y(v) = m.t + ih − ((v − ylo)/(yhi − ylo)) × ih`.
  - Horizontal gridlines: ~5 evenly-spaced lines between `ylo` and `yhi`, each
    labelled with `format_tick(value)`.
  - Title: `${op} — ${unit} (linear scale, last 30) by PR / release, ${instance}`.
  - Vertical run-guides, x-labels (release tinting), legend, data paths/circles:
    unchanged logic; they consume the new `y()` and the (windowed) `keys`.
  - Point filter: finite values (not the log-only `>0` filter), so a legitimate
    zero/negative could plot; package-size data is always positive in practice.

New pure helper `format_tick(v) → string`: humanize a magnitude with k/M/G
suffix and limited precision (e.g. `1200000 → "1.2M"`), deterministic.

### D. Windowing (last 30) — in `render_chart`, not `panel_svg`

For each operation/series, `render_chart`:
1. Renders the **log** panel from the full `keys` (unchanged).
2. Computes `keys30 = keys.slice(-30)`, filters each shape's points to keys in
   `keys30`, and renders the **linear** panel (`scale:'linear'`) from those.

Keeping windowing in the caller leaves `panel_svg`'s only new concept = `scale`.

### E. Layout — pairs in a 2-wide grid

- Grid stays 2 columns; each **cell is a pair**: log on top, linear beneath.
- `intra_pair_gap = 32` (log→linear, = the current inter-panel gap).
- `inter_pair_gap = 64` (**doubled** from the current `panel_gap = 32`).
- `pair_height = 2×panel_height + intra_pair_gap`.
- `rows = ceil(panelCount / cols)`.
- `total_h = header_h + rows×pair_height + max(0, rows−1)×inter_pair_gap`.
- Per cell at grid position (col,row): log at
  `oy = header_h + row×(pair_height + inter_pair_gap)`, linear at
  `oy + panel_height + intra_pair_gap`; both at `ox = col×(panel_width + col_gap)`.
- `render_chart` returns `{ svg, panels }` where `panels` now maps each op to a
  `{ log, linear }` pair of SVG strings (was a single SVG), for the comment flow.

### F. Comment / publish mode

- `publish_charts` writes two files per op: `charts/<stamp>/<slug>.svg` (log)
  and `charts/<stamp>/<slug>.linear.svg` (linear); returns pinned URLs for both.
- `build_comment_body` embeds, per op, the log image then the linear image
  immediately beneath it.

## Testing

`make_perf_chart.spec.ts`:
- Remove footprint tests.
- `bundle_size_series`: sums raw across bundles; one series/line; skips runs
  without `bundles`; correct point values.
- `collect_runs`: threads `bundles` onto run objects (via the executor seam with
  a canned `scaling.json` carrying a `bundles` block).
- `panel_svg` linear branch: y-bounds equal `min−0.1·span … max+0.1·span`;
  flat-data fallback; title contains `"linear scale, last 30"`; gridline count.
- `render_chart`: last-30 windowing (linear panel references only the last 30
  keys); composite contains 2 panels per op; `total_h` matches the pair-layout
  formula; inter-pair gap 64, intra-pair gap 32.
- `format_tick`: representative magnitudes.
- Assertions are **substring / numeric**, never golden-file/snapshot
  (house rule), and never pin a known-wrong value.

## Artifacts & determinism

- Regenerate `src/generated_docs/perf_chart.svg` and `perf_data.json` via
  `npm run build`. That step fetches `origin/perf_results`; if unreachable from
  this host it degrades gracefully (keeps stale files, exit 0), and real regen
  happens in CI on push. Attempt local regen; fall back to CI.
- Log panels must remain byte-identical for unchanged data; verified by leaving
  the `'log'` code path untouched and by the existing spec.

## Docs

- Update `make_perf_chart.cjs` module docblock: it currently describes "one
  log-scale SVG panel per operation" and an "8th panel: machine footprint".
  Revise to describe log+linear pairs and the package-size panel.
- Update `panel_svg` / `render_chart` docblocks for the new `scale` param and
  pair layout.
- The chart script is an internal build artifact, not public API → no README
  entry. `CHANGELOG` is build-generated.
