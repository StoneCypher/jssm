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
 *  Inclusive ASCII character ranges accepted in any but the first position of
 *  an FSL bareword (state / property / val / enum-member name): digits,
 *  letters, and underscore.  Non-ASCII characters are classified by
 *  {@link is_state_name_char}, which is the complete rule; this table exists
 *  for tooling that wants the ASCII portion as ranges.
 *  @example
 *  import { state_name_chars } from 'jssm';
 *  state_name_chars.some(r => 'A' >= r.from && 'A' <= r.to);  // => true
 *  state_name_chars.some(r => '+' >= r.from && '+' <= r.to);  // => false
 *  @see is_state_name_char
 */
declare const state_name_chars: ReadonlyArray<{
    from: string;
    to: string;
}>;
/**
 *  Inclusive ASCII character ranges accepted in the first position of an FSL
 *  bareword: letters and underscore (never a digit).  Non-ASCII characters
 *  are classified by {@link is_state_name_first_char}.
 *  @example
 *  import { state_name_first_chars } from 'jssm';
 *  state_name_first_chars.some(r => '7' >= r.from && '7' <= r.to);  // => false
 *  @see is_state_name_first_char
 */
declare const state_name_first_chars: ReadonlyArray<{
    from: string;
    to: string;
}>;
/**
 *  Whether one code point may begin an FSL bareword (#754): a Unicode letter,
 *  a letter-number, or underscore.  Mirrors the grammar's `AtomFirstLetter`.
 *  @param ch - Exactly one code point (a surrogate pair counts as one).
 *  @example
 *  import { is_state_name_first_char } from 'jssm';
 *  is_state_name_first_char('é');  // => true
 *  is_state_name_first_char('7');  // => false
 *  @see is_state_name_char
 */
declare const is_state_name_first_char: (ch: string) => boolean;
/**
 *  Whether one code point may continue an FSL bareword (#754): anything
 *  {@link is_state_name_first_char} accepts, plus combining marks, decimal
 *  digits, and connector punctuation.  Mirrors the grammar's `AtomLetter`.
 *  @param ch - Exactly one code point (a surrogate pair counts as one).
 *  @example
 *  import { is_state_name_char } from 'jssm';
 *  is_state_name_char('7');  // => true
 *  is_state_name_char('.');  // => false
 *  @see is_state_name_first_char
 */
declare const is_state_name_char: (ch: string) => boolean;
/**
 *  Inclusive character ranges accepted by `ActionLabelUnescaped` — i.e., the
 *  characters legal inside a single-quoted action label without escaping.
 *  Space (`U+0020`) is included; the apostrophe `'` (`U+0027`) is explicitly
 *  excluded since it terminates the label.
 *
 *  Three ranges: `U+0020`–`U+0026`, `U+0028`–`U+005B`, `U+005D`–`U+FFFF`.
 *  @example
 *  import { action_label_chars } from 'jssm';
 *  action_label_chars.some(r => ' ' >= r.from && ' ' <= r.to);   // => true
 *  action_label_chars.some(r => "'" >= r.from && "'" <= r.to);   // => false
 */
declare const action_label_chars: ReadonlyArray<{
    from: string;
    to: string;
}>;
export { gviz_shapes, shapes, named_colors, state_name_chars, state_name_first_chars, action_label_chars, is_state_name_first_char, is_state_name_char, };
