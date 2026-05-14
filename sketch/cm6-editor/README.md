# JSSM CodeMirror 6 editor sketch

A minimal prototype to evaluate the look and feel of a CodeMirror 6-based FSL editor
before committing to a final architecture.

## What it demonstrates

- A CodeMirror 6 editor instance with the FSL grammar wired up for syntax highlighting.
- Highlighting is provided by the sibling **`codemirror-lang-fsl`** package
  (see `../cm6-lang-fsl/`), which is structured to be redistributable on its own.
- Live diagnostics powered by the existing `fsl_parser.parse()` exposed through
  CodeMirror's `linter` API. Parse errors render as inline squiggles plus a gutter
  marker, with the message echoed in the status bar.

## What it does NOT do (yet)

- AST-driven highlighting. The current PEG parser does not annotate its output with
  source locations, so highlighting has to be done by a separate tokenizer rather
  than by walking the AST. Adding locations would require either editing the `.peg`
  action blocks or rebuilding the parser with PEG.js's `--trace` flag and using the
  tracer hook to recover token spans.
- A web component wrapper. The sketch mounts directly into a `<div>`; production
  packaging (web component / factory function / framework component) is the next
  decision.
- Live integration with `jssm_viz`. The editor is standalone for now.

## Running the sketch

The HTML page imports CodeMirror via an importmap (pinned versions, esm.sh-served
with externalized dependencies to keep `@codemirror/state` a singleton). The FSL
parser is loaded from the repo's `dist/es6/`. ES modules require an HTTP
origin (not `file://`), and the parser import (`../../dist/es6/fsl_parser.js`)
must be reachable, so **serve from the repo root**, not from this directory:

```
cd C:\Users\john\projects\jssm
npx serve .
```

Then visit `http://localhost:3000/sketch/cm6-editor/` (or whatever port `serve`
prints).

## Files

- `index.html`    Entry point. Importmap pins CodeMirror packages and dedupes
                  shared deps. Loads `editor.js` as a module.
- `editor.js`    CodeMirror setup (composed `basicSetup`), parser-driven linter,
                  status reporting.
- `sample.fsl`    A small traffic-light state machine loaded as the default
                  document.

The syntax-highlighting plugin itself lives in `../cm6-lang-fsl/` so it can be
copied or published independently.
