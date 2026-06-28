/**
 * CodeMirror 6 language support for FSL (the source language of jssm
 * finite-state machines), exposed at the `jssm/cm6` subpath.
 *
 * Built on `StreamLanguage` (token-stream based, not a Lezer tree grammar) —
 * a deliberate v1 choice (see `notes/superpowers/specs/2026-05-12-editor-widget-packaging-design.md`):
 * the tokenizer never blocks on the parser, so a failing parse never kills
 * highlighting. The companion linter (driven by `fsl_parser.parse()`) supplies
 * error squiggles separately.
 *
 * The keyword vocabulary is reconciled against the live grammar
 * (`src/ts/fsl_parser.peg`) and guarded by `fsl_language.spec.ts`, which
 * extracts the grammar's config keys and fails if any is not recognized here —
 * so the highlighter cannot silently drift out of date the way the original
 * `sketch/cm6-lang-fsl` did.
 */

import { StreamLanguage, LanguageSupport, HighlightStyle, type StreamParser } from '@codemirror/language';
import { Tag, tags } from '@lezer/highlight';

/**
 * Tag modifier marking FSL syntax that still parses but is deprecated (e.g.
 * the flat `graph_bg_color` key, superseded by the `graph: {}` block). Applied
 * to a base tag — `fslDeprecated(tags.propertyName)` — and rendered distinctly
 * by {@link fslHighlightStyle} (struck through) so editors can flag stale
 * syntax. StreamLanguage expresses this through its `tokenTable`; see
 * {@link fslStreamParser}.
 */
export const fslDeprecated: (tag: Tag) => Tag = Tag.defineModifier('fslDeprecated');

/**
 * Structural / declaration keywords — block openers and the `property`
 * declaration keyword. Highlighted as `keyword`.
 */
export const STRUCTURAL_KEYWORDS: ReadonlySet<string> = new Set([
  'state', 'start_state', 'end_state', 'active_state', 'terminal_state', 'hooked_state',
  'action', 'transition', 'validation', 'configuration', 'graph', 'hooks',
  'property', 'required', 'default',
]);

/**
 * Configuration / property / style keys (the left side of a `key: value;`
 * config line). Highlighted as `propertyName`. Reconciled against the
 * `"<key>" WS? ":"` rules in `fsl_parser.peg` and guarded by the drift test.
 */
export const PROPERTY_KEYWORDS: ReadonlySet<string> = new Set([
  // machine metadata
  'machine_name', 'machine_version', 'machine_author', 'machine_license',
  'machine_comment', 'machine_contributor', 'machine_definition',
  'machine_language', 'machine_reference', 'npm_name', 'fsl_version',
  // graph / layout
  'graph_layout', 'start_states', 'end_states', 'failed_outputs',
  'allows_override', 'allow_islands', 'edge_color', 'theme', 'flow',
  'dot_preamble', 'default_size',
  // per-element style keys
  'label', 'color', 'shape', 'corners', 'linestyle', 'image', 'url',
  // hyphenated style keys (read as a single compound token by the tokenizer)
  'background-color', 'text-color', 'border-color', 'edge-color', 'line-style',
]);

/**
 * Keys that still parse but are deprecated. Highlighted with the
 * {@link fslDeprecated} modifier so editors can visibly flag them.
 */
export const DEPRECATED_KEYWORDS: ReadonlySet<string> = new Set([
  'graph_bg_color',   // superseded by the `graph: {}` block
]);

/**
 * Enumerated literal values (layout engines, corner/line styles, directions,
 * booleans, theme names). Highlighted as `atom`.
 */
export const ENUM_KEYWORDS: ReadonlySet<string> = new Set([
  'true', 'false', 'none', 'default', 'modern', 'ocean', 'bold',
  'dot', 'circo', 'fdp', 'neato', 'twopi',
  'up', 'right', 'down', 'left',
  'solid', 'dotted', 'dashed',
  'regular', 'rounded', 'lined',
  'MIT',
]);

/** Custom token-type string emitted for deprecated keywords; mapped in `tokenTable`. */
const DEPRECATED_TOKEN = 'fslDeprecatedKeyword';

const ARROWS = /^(?:<-=>|<-~>|<=->|<=~>|<~->|<~=>|<->|<=>|<~>|->|<-|=>|<=|~>|<~|↔|←|→|⇔|⇐|⇒|↮|↚|↛)/;
const COMPARATORS = /^(?:>=|<=|>|<)/;

// Mirrors the grammar's AtomFirstLetter / AtomLetter rules (fsl_parser.peg:263-267).
// The high-unicode tail is the range U+0080..U+FFFF (escaped below). The
// original sketch anchored the range at the comma, wrongly swallowing { } ; : |.
const ATOM_START = /[0-9a-zA-Z._!$^*?,\u0080-\uFFFF]/;
const ATOM_BODY  = /[0-9a-zA-Z.+_^()*&$#@!?,\u0080-\uFFFF]/;

interface FslStreamState {
  inBlockComment: boolean;
}

/**
 * The StreamLanguage tokenizer for FSL. Classifies each token into a standard
 * CodeMirror highlight name, or {@link DEPRECATED_TOKEN} (mapped through
 * `tokenTable` to `fslDeprecated(tags.propertyName)`).
 */
export const fslStreamParser: StreamParser<FslStreamState> = {

  name: 'fsl',

  startState: () => ({ inBlockComment: false }),

  token(stream, state) {
    if (state.inBlockComment) {
      while (!stream.eol()) {
        if (stream.match('*/')) { state.inBlockComment = false; return 'comment'; }
        stream.next();
      }
      return 'comment';
    }

    if (stream.eatSpace()) { return null; }

    if (stream.match('//')) { stream.skipToEnd(); return 'comment'; }
    if (stream.match('/*')) { state.inBlockComment = true; return 'comment'; }

    if (stream.match(/^"(?:\\.|[^"\\])*"?/)) { return 'string'; }
    if (stream.match(/^'(?:\\.|[^'\\])*'?/)) { return 'labelName'; }

    if (stream.match(ARROWS))      { return 'operator'; }
    if (stream.match(COMPARATORS)) { return 'operator'; }

    if (stream.match(/^\d+(?:\.\d+)*/)) { return 'number'; }

    if (stream.match(/^&[A-Za-z_]\w*/)) { return 'variableName.special'; }

    // Invariant: the loop guards `!eol` and `eatSpace()` returned false above,
    // so a non-space character is present and `peek()` is defined here.
    const ch = stream.peek() as string;
    if (ATOM_START.test(ch)) {
      let tok = '';
      let next = stream.peek();
      while (next !== undefined) {
        if (ATOM_BODY.test(next)) {
          tok += stream.next();
        } else if (next === '-' && ATOM_BODY.test(stream.string.slice(stream.pos + 1, stream.pos + 2))) {
          // An interior hyphen (between word chars) joins a compound key like
          // `background-color`; a trailing one (before `>` of `->`, or at EOL)
          // does not. `slice` yields '' past the end, so no nullish branch.
          tok += stream.next();
        } else {
          break;
        }
        next = stream.peek();
      }
      if (DEPRECATED_KEYWORDS.has(tok)) { return DEPRECATED_TOKEN; }
      if (STRUCTURAL_KEYWORDS.has(tok)) { return 'keyword'; }
      if (PROPERTY_KEYWORDS.has(tok))   { return 'propertyName'; }
      if (ENUM_KEYWORDS.has(tok))       { return 'atom'; }
      return 'variableName';
    }

    if (stream.match(/^[\[\]{}()]/)) { return 'bracket'; }
    if (stream.match(/^[;:,|]/))     { return 'punctuation'; }

    stream.next();
    return null;
  },

  tokenTable: {
    [DEPRECATED_TOKEN]: fslDeprecated(tags.propertyName),
  },

  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
  },

};

/**
 * CodeMirror 6 `Language` for FSL. Most consumers use {@link fsl} instead.
 */
export const fslLanguage = StreamLanguage.define(fslStreamParser);

/**
 * Recommended highlight style. Beyond the editor theme's own keyword/string/etc.
 * rules, this renders {@link fslDeprecated} tokens struck-through and dimmed, so
 * deprecated FSL syntax is visible at a glance. Include it alongside your theme;
 * a bare theme without it simply won't distinguish deprecated keywords.
 */
export const fslHighlightStyle: HighlightStyle = HighlightStyle.define([
  { tag: fslDeprecated(tags.propertyName), textDecoration: 'line-through', opacity: '0.6' },
]);

/**
 * CodeMirror 6 `LanguageSupport` for FSL. Drop into an editor's `extensions`.
 *
 * @returns A `LanguageSupport` extension for FSL highlighting.
 *
 * @example
 *   import { EditorView, basicSetup } from 'codemirror';
 *   import { fsl } from 'jssm/cm6';
 *   new EditorView({ doc: "a 'go' -> b;", parent: document.body,
 *                    extensions: [ basicSetup, fsl() ] });
 */
export function fsl(): LanguageSupport {
  return new LanguageSupport(fslLanguage);
}
