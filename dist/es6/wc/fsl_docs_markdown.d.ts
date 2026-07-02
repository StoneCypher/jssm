/** Parse a fenced-code info string like `fsl {teaches: x, run: true}`. */
export declare function parseFenceInfo(info: string): {
    lang: string;
    attrs: Record<string, string | boolean>;
};
/** Structural / attribute keywords highlighted in fsl code fences. */
export declare const FSL_KEYWORDS: Set<string>;
/**
 * Attribute keys whose value is a color, mirroring the editor's `COLOR_KEYS`
 * (language_service). The value token following one of these (plus its `:`) is
 * tagged `color` and rendered with a swatch, matching the editor overlay.
 */
export declare const FSL_COLOR_KEYS: Set<string>;
/** A token's class is one of these, or `null` for uncategorized runs. */
export declare type FslTokenClass = 'comment' | 'string' | 'action' | 'arrow' | 'number' | 'keyword' | 'key' | 'color';
/** A single highlighted run: its class (or `null`) and the source text. */
export interface FslToken {
    cls: FslTokenClass | null;
    text: string;
}
/**
 * Tokenize FSL source into `{cls, text}` runs for syntax highlighting. A pure,
 * regex-driven scanner — never parses, so it cannot throw on malformed input.
 * `cls` is null for uncategorized text (punctuation, identifiers, whitespace).
 *
 * Beyond the lexical classes it tracks one bit of structural context: an
 * identifier immediately before a `:` is retro-tagged `key` (an attribute key,
 * unless it is already a `keyword`), and the value token after a color key's
 * colon — or any hex literal — is tagged `color`. The context never spans a
 * `;`, so a value can't leak past its statement.
 *
 * @example
 *   tokenizeFsl('s : { background-color: pink; }')
 *     .filter(t => t.cls).map(t => [t.cls, t.text]);
 *   // includes ['key','background-color'] and ['color','pink']
 */
export declare function tokenizeFsl(src: string): FslToken[];
/**
 * Highlight FSL source to an HTML string of `<span class="fsl-tok-…">` runs.
 * A `color` token is preceded by an inline `<span class="fsl-swatch">` whose
 * background is the literal color text (a CSS-valid named color or hex), giving
 * the docs the same swatch the editor overlay shows. Color text is a hex or
 * identifier run, so it is a safe `background:` value.
 */
export declare function highlightFsl(src: string): string;
/** Render the supported markdown subset to an HTML string. */
export declare function renderMarkdown(md: string): string;
