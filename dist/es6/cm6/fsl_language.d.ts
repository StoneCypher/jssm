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
import { Tag } from '@lezer/highlight';
/**
 * Tag modifier marking FSL syntax that still parses but is deprecated (e.g.
 * the flat `graph_bg_color` key, superseded by the `graph: {}` block). Applied
 * to a base tag — `fslDeprecated(tags.propertyName)` — and rendered distinctly
 * by {@link fslHighlightStyle} (struck through) so editors can flag stale
 * syntax. StreamLanguage expresses this through its `tokenTable`; see
 * {@link fslStreamParser}.
 */
export declare const fslDeprecated: (tag: Tag) => Tag;
/**
 * Structural / declaration keywords — block openers and the `property`
 * declaration keyword. Highlighted as `keyword`.
 */
export declare const STRUCTURAL_KEYWORDS: ReadonlySet<string>;
/**
 * Configuration / property / style keys (the left side of a `key: value;`
 * config line). Highlighted as `propertyName`. Reconciled against the
 * `"<key>" WS? ":"` rules in `fsl_parser.peg` and guarded by the drift test.
 */
export declare const PROPERTY_KEYWORDS: ReadonlySet<string>;
/**
 * Keys that still parse but are deprecated. Highlighted with the
 * {@link fslDeprecated} modifier so editors can visibly flag them.
 */
export declare const DEPRECATED_KEYWORDS: ReadonlySet<string>;
/**
 * Enumerated literal values (layout engines, corner/line styles, directions,
 * booleans, theme names). Highlighted as `atom`.
 */
export declare const ENUM_KEYWORDS: ReadonlySet<string>;
interface FslStreamState {
    inBlockComment: boolean;
}
/**
 * The StreamLanguage tokenizer for FSL. Classifies each token into a standard
 * CodeMirror highlight name, or {@link DEPRECATED_TOKEN} (mapped through
 * `tokenTable` to `fslDeprecated(tags.propertyName)`).
 */
export declare const fslStreamParser: StreamParser<FslStreamState>;
/**
 * CodeMirror 6 `Language` for FSL. Most consumers use {@link fsl} instead.
 */
export declare const fslLanguage: StreamLanguage<FslStreamState>;
/**
 * Recommended highlight style. Beyond the editor theme's own keyword/string/etc.
 * rules, this renders {@link fslDeprecated} tokens struck-through and dimmed, so
 * deprecated FSL syntax is visible at a glance. Include it alongside your theme;
 * a bare theme without it simply won't distinguish deprecated keywords.
 */
export declare const fslHighlightStyle: HighlightStyle;
/**
 * CodeMirror 6 `LanguageSupport` for FSL. Drop into an editor's `extensions`.
 * @returns A `LanguageSupport` extension for FSL highlighting.
 * @example
 *   import { EditorView, basicSetup } from 'codemirror';
 *   import { fsl } from 'jssm/cm6';
 *   new EditorView({ doc: "a 'go' -> b;", parent: document.body,
 *                    extensions: [ basicSetup, fsl() ] });
 */
export declare function fsl(): LanguageSupport;
export {};
