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

import { parse }          from "../../dist/es6/fsl_parser.js";
import { compile }        from "../../dist/es6/jssm_compiler.js";
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
