import {
  EditorView, keymap, lineNumbers, highlightActiveLineGutter,
  highlightActiveLine, drawSelection,
} from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput,
} from "@codemirror/language";
import { linter, lintGutter } from "@codemirror/lint";

// The bundled es6 build is self-contained (deps like reduce-to-639-1 are
// inlined), so the browser can load parse + compile without importmap
// entries for jssm's node dependencies.  The per-module dist/es6/*.js files
// carry bare imports and are NOT browser-loadable on their own.
import { parse, compile }  from "../../dist/jssm.es6.mjs";
import { diagnosticsFor } from "./diagnostics.mjs";
import { fsl }            from "../cm6-lang-fsl/index.js";

const basicSetup = [
  lineNumbers(),
  highlightActiveLineGutter(),
  history(),
  drawSelection(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  highlightActiveLine(),
  keymap.of([
    ...defaultKeymap,
    ...historyKeymap,
  ]),
];

const statusEl = document.getElementById("status");

const fslLinter = linter((view) => {
  const text = view.state.doc.toString();
  const { ok, status, diagnostics } = diagnosticsFor(text, parse, compile);

  statusEl.textContent   = status;
  statusEl.dataset.state = ok ? "ok" : "err";

  return diagnostics.map(d => ({
    from     : Math.min(d.from, text.length),
    to       : Math.min(Math.max(d.to, d.from + 1), text.length),
    severity : d.severity,
    message  : d.message,
  }));
});

const theme = EditorView.theme({
  "&":             { height: "100%", fontSize: "14px" },
  ".cm-scroller":  { fontFamily: "ui-monospace, Consolas, monospace" },
  ".cm-gutters":   { background: "#fafafa", borderRight: "1px solid #eee" },
});

const sample = await fetch("./sample.fsl").then((r) => r.text());

new EditorView({
  doc: sample,
  parent: document.getElementById("editor"),
  extensions: [
    basicSetup,
    fsl(),
    fslLinter,
    lintGutter(),
    theme,
  ],
});
