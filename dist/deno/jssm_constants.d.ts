/*******
 *
 *  Convenience aliases for common mathematical and numeric constants from
 *  `Number` and `Math`.  Re-exported so that FSL data expressions and tests
 *  can reference them without importing `Math` directly.
 *
 *  Includes: `NegInfinity`, `PosInfinity`, `Epsilon`, `Pi`, `E`, `Root2`,
 *  `RootHalf`, `Ln2`, `Ln10`, `Log2E`, `Log10E`, `MaxSafeInt`, `MinSafeInt`,
 *  `MaxPosNum`, `MinPosNum`, `Phi` (golden ratio), `EulerC` (Euler–Mascheroni).
 *
 */
export declare const NegInfinity: number, PosInfinity: number, Epsilon: number, Pi: number, E: number, Root2: number, RootHalf: number, Ln2: number, Ln10: number, Log2E: number, Log10E: number, MaxSafeInt: number, MinSafeInt: number, MaxPosNum: number, MinPosNum: number, Phi = 1.618033988749895, EulerC = 0.5772156649015329;
/*******
 *
 *  Complete list of node shapes supported by Graphviz.  Used by jssm-viz to
 *  validate and render state shapes in FSL `state ... : { shape: ... }` blocks.
 *
 *  `shapes` is an alias for `gviz_shapes`.
 *
 */
declare const gviz_shapes: string[];
/**
 *  Public alias for {@link gviz_shapes}.  The list of node shapes supported
 *  by Graphviz that jssm-viz accepts in FSL `state ... : { shape: ... }`
 *  declarations.
 */
declare const shapes: string[];
/*******
 *
 *  List of CSS/SVG named colors accepted by jssm-viz for state styling
 *  properties like `background-color` and `text-color`.  Case-insensitive
 *  matching is done at parse time; the canonical casing here follows the
 *  CSS specification.
 *
 */
declare const named_colors: string[];
/*******
 *
 *  Character ranges accepted by the FSL grammar for identifier and label
 *  tokens.  Each entry is an inclusive `{from, to}` range of single Unicode
 *  characters.  Single-character entries (e.g. `.`) appear with `from === to`.
 *
 *  These are intended for tooling, validators, and editors that need to know
 *  which characters are legal in a given FSL token position without re-parsing
 *  the PEG grammar.
 *
 */
/**
 *  Inclusive character ranges accepted by `AtomLetter` — i.e., the characters
 *  legal in any but the first position of an FSL state name (atom).
 *
 *  Includes ASCII digits/letters and the symbols
 *  `.`, `+`, `_`, `^`, `(`, `)`, `*`, `&`, `$`, `#`, `@`, `!`, `?`, `,`,
 *  plus the high-Unicode range `U+0080`–`U+FFFF`.
 *
 *  @example
 *  state_name_chars.some(r => 'A' >= r.from && 'A' <= r.to);  // true
 */
declare const state_name_chars: ReadonlyArray<{
    from: string;
    to: string;
}>;
/**
 *  Inclusive character ranges accepted by `AtomFirstLetter` — i.e., the
 *  characters legal in the first position of an FSL state name (atom).
 *
 *  Notably narrower than {@link state_name_chars}: omits `+`, `(`, `)`, `&`,
 *  `#`, `@`.  Includes ASCII digits/letters, `.`, `_`, `!`, `$`, `^`, `*`,
 *  `?`, `,`, and the high-Unicode range `U+0080`–`U+FFFF`.
 *
 *  @example
 *  state_name_first_chars.some(r => '+' >= r.from && '+' <= r.to);  // false
 */
declare const state_name_first_chars: ReadonlyArray<{
    from: string;
    to: string;
}>;
/**
 *  Inclusive character ranges accepted by `ActionLabelUnescaped` — i.e., the
 *  characters legal inside a single-quoted action label without escaping.
 *  Space (`U+0020`) is included; the apostrophe `'` (`U+0027`) is explicitly
 *  excluded since it terminates the label.
 *
 *  Three ranges: `U+0020`–`U+0026`, `U+0028`–`U+005B`, `U+005D`–`U+FFFF`.
 *
 *  @example
 *  action_label_chars.some(r => ' ' >= r.from && ' ' <= r.to);   // true
 *  action_label_chars.some(r => "'" >= r.from && "'" <= r.to);   // false
 */
declare const action_label_chars: ReadonlyArray<{
    from: string;
    to: string;
}>;
export { gviz_shapes, shapes, named_colors, state_name_chars, state_name_first_chars, action_label_chars, };
