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

import { parse } from "../../dist/es6/fsl_parser.js";
import { fsl }   from "../cm6-lang-fsl/index.js";

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

function offsetFromLineCol(doc, line, column) {
  const safeLine = Math.min(Math.max(line, 1), doc.lines);
  return doc.line(safeLine).from + Math.max(column - 1, 0);
}

const fslLinter = linter((view) => {
  const text = view.state.doc.toString();
  try {
    parse(text, {});
    statusEl.textContent = "parses cleanly";
    statusEl.dataset.state = "ok";
    return [];
  } catch (err) {
    statusEl.textContent = err.message || String(err);
    statusEl.dataset.state = "err";

    const loc = err.location;
    if (!loc) return [];

    const from = offsetFromLineCol(view.state.doc, loc.start.line, loc.start.column);
    const to   = offsetFromLineCol(view.state.doc, loc.end.line,   loc.end.column);

    return [{
      from,
      to: Math.max(to, from + 1),
      severity: "error",
      message: err.message,
    }];
  }
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
