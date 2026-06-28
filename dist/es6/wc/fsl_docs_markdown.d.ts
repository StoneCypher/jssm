/** Parse a fenced-code info string like `fsl {teaches: x, run: true}`. */
export declare function parseFenceInfo(info: string): {
    lang: string;
    attrs: Record<string, string | boolean>;
};
/** Render the supported markdown subset to an HTML string. */
export declare function renderMarkdown(md: string): string;
