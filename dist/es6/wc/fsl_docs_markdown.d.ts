/** Parse a fenced-code info string like `fsl {teaches: x, run: true}`. */
export declare function parseFenceInfo(info: string): {
    lang: string;
    attrs: Record<string, string | boolean>;
};
/** Structural / attribute keywords highlighted in fsl code fences. */
export declare const FSL_KEYWORDS: Set<string>;
/**
 * Tokenize FSL source into `{cls, text}` runs for syntax highlighting. A pure,
 * regex-driven scanner — never parses, so it cannot throw on malformed input.
 * `cls` is null for uncategorized text (punctuation, identifiers, whitespace).
 */
export declare function tokenizeFsl(src: string): Array<{
    cls: string | null;
    text: string;
}>;
/** Highlight FSL source to an HTML string of `<span class="fsl-tok-…">` runs. */
export declare function highlightFsl(src: string): string;
/** Render the supported markdown subset to an HTML string. */
export declare function renderMarkdown(md: string): string;
