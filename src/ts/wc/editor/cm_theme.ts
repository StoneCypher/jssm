/**
 * Light and dark CodeMirror themes for `fsl-editor`, as extension bundles for a
 * `Compartment` swap. Chrome colors read the shared `--_fsl-*` appearance tokens
 * (so the editor white-labels with the rest of the suite); the dark highlight
 * style maps the FSL stream tokenizer's tags to a palette that reads on a dark
 * background. Ported from the verified sketch editor theme.
 */

import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { type Extension } from '@codemirror/state';

const lightChrome = EditorView.theme({
  '&':                       { backgroundColor: 'var(--_fsl-surface, #ffffff)', color: 'var(--_fsl-text, #222222)' },
  '.cm-gutters':             { background: 'var(--_fsl-surface, #fafafa)', color: 'var(--_fsl-muted, #9aa0a6)', borderRight: '1px solid var(--_fsl-border, #eee)' },
  '.cm-activeLine':          { backgroundColor: 'rgba(91,157,255,0.06)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--_fsl-text, #222)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'color-mix(in srgb, var(--_fsl-accent, #5b9dff) 28%, transparent)' },
}, { dark: false });

const darkChrome = EditorView.theme({
  '&':                       { backgroundColor: 'var(--_fsl-surface, #1e1e22)', color: 'var(--_fsl-text, #d6d6d6)' },
  '.cm-gutters':             { background: 'var(--_fsl-surface, #1a1a1e)', color: 'var(--_fsl-muted, #5a5f66)', borderRight: '1px solid var(--_fsl-border, #2a2a2e)' },
  '.cm-activeLine':          { backgroundColor: 'rgba(130,170,255,0.08)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--_fsl-text, #d6d6d6)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'color-mix(in srgb, var(--_fsl-accent, #82aaff) 32%, transparent)' },
}, { dark: true });

const darkHighlight = HighlightStyle.define([
  { tag: t.keyword,                       color: '#c792ea' },
  { tag: t.propertyName,                  color: '#82aaff' },
  { tag: [t.string, t.labelName],         color: '#c3e88d' },
  { tag: t.comment,                       color: '#5f7e97', fontStyle: 'italic' },
  { tag: [t.atom, t.bool],                color: '#f78c6c' },
  { tag: t.number,                        color: '#f78c6c' },
  { tag: t.operator,                      color: '#89ddff' },
  { tag: t.variableName,                  color: '#d6d6d6' },
  { tag: t.special(t.variableName),       color: '#addb67' },
  { tag: [t.punctuation, t.separator],    color: '#89ddff' },
  { tag: [t.bracket, t.squareBracket, t.brace, t.paren], color: '#c5c9d0' },
]);

/** Light editor theme bundle (token-fed chrome + default highlight style). */
export const lightEditorTheme: Extension = [
  lightChrome,
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
];

/** Dark editor theme bundle (token-fed chrome + dark highlight, default fallback). */
export const darkEditorTheme: Extension = [
  darkChrome,
  syntaxHighlighting(darkHighlight),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
];
