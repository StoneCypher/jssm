# `<fsl-editor>` showcase

A live demo of the `<fsl-editor>` web component (fsl #659) paired with the
`<fsl-viz>` live renderer: edit FSL on the right, the graph follows on the left.
Shows highlighting, the semantic overlay (color chips, state/enum marks),
linting, context-aware completion, light/dark theming, the feature toggles,
a draggable splitter, and an easing help panel.

## Build

The demo loads a single self-contained ESM bundle of the real components
(CodeMirror, lit, jssm core, and `@viz-js/viz` all inlined). It's a generated
artifact (~4.7 MB) and is git-ignored — build it from the repo root with:

```bash
node_modules/.bin/esbuild examples/fsl-editor/_demo_entry.ts \
  --bundle --format=esm \
  --outfile=examples/fsl-editor/fsl-editor.bundle.js
```

`_demo_entry.ts` registers `<fsl-editor>` and `<fsl-viz>` (it defines the tags
directly rather than importing the `*.define` modules, which the package marks
side-effect-free and would otherwise be tree-shaken away).

## Run

Serve this directory with any static file server and open `index.html`:

```bash
cd examples/fsl-editor
../../node_modules/.bin/servehere      # → http://localhost:4400/
```

## Notes

- The live-graph update is debounced (250 ms) so mid-keystroke invalid FSL
  doesn't thrash the renderer; invalid input briefly blanks the graph (status
  dot turns red) and recovers when the FSL parses again.
- Two-way binding to a parent `<fsl-instance>` (so the editor drives a live
  machine rather than just the viz) is tracked in `StoneCypher/fsl#1387`.
