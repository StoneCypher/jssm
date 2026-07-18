/**
 * Light and dark CodeMirror themes for the FSL sketch, as Compartment-swappable
 * extension bundles.
 *
 * Each bundle pairs an EditorView chrome theme (background, gutters, selection,
 * cursor) with a syntax highlight style tuned for that background. Page chrome
 * (header, panes, graph backdrop, toolbar) is themed separately via CSS
 * variables in index.html; this module only covers the editor view itself.
 *
 * The dark highlight style maps the tags the FSL stream tokenizer emits to a
 * palette that reads on a dark background — the default highlight style's
 * colors are tuned for light backgrounds and wash out otherwise.
 */

import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const lightChrome = EditorView.theme({
  "&":                       { backgroundColor: "#ffffff", color: "#222" },
  ".cm-gutters":             { background: "#fafafa", color: "#9aa0a6", borderRight: "1px solid #eee" },
  ".cm-activeLine":          { backgroundColor: "#f3f7ff" },
  ".cm-activeLineGutter":    { backgroundColor: "#eaf1ff" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#222" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "#cfe0ff" },
}, { dark: false });

const darkChrome = EditorView.theme({
  "&":                       { backgroundColor: "#1e1e22", color: "#d6d6d6" },
  ".cm-gutters":             { background: "#1a1a1e", color: "#5a5f66", borderRight: "1px solid #2a2a2e" },
  ".cm-activeLine":          { backgroundColor: "#26262d" },
  ".cm-activeLineGutter":    { backgroundColor: "#2c2c36" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#d6d6d6" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "#33415e" },
}, { dark: true });

const darkHighlight = HighlightStyle.define([
  { tag: t.keyword,                       color: "#c792ea" },
  { tag: t.propertyName,                  color: "#82aaff" },
  { tag: [t.string, t.labelName],         color: "#c3e88d" },
  { tag: t.comment,                       color: "#5f7e97", fontStyle: "italic" },
  { tag: [t.atom, t.bool],                color: "#f78c6c" },
  { tag: t.number,                        color: "#f78c6c" },
  { tag: t.operator,                      color: "#89ddff" },
  { tag: t.variableName,                  color: "#d6d6d6" },
  { tag: t.special(t.variableName),       color: "#addb67" },
  { tag: [t.punctuation, t.separator],    color: "#89ddff" },
  { tag: [t.bracket, t.squareBracket, t.brace, t.paren], color: "#a7abb1" },
]);

/** Light editor theme bundle (chrome + default highlight style). */
export const lightEditorTheme = [
  lightChrome,
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
];

/** Dark editor theme bundle (chrome + dark highlight style, default as fallback). */
export const darkEditorTheme = [
  darkChrome,
  syntaxHighlighting(darkHighlight),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
];
