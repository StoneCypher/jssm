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
export const NegInfinity = -Infinity, PosInfinity = Infinity, Epsilon = Number.EPSILON, Pi = Math.PI, E = Math.E, Root2 = Math.SQRT2, RootHalf = Math.SQRT1_2, Ln2 = Math.LN2, Ln10 = Math.LN10, Log2E = Math.LOG2E, Log10E = Math.LOG10E, MaxSafeInt = Number.MAX_SAFE_INTEGER, MinSafeInt = Number.MIN_SAFE_INTEGER, MaxPosNum = Number.MAX_VALUE, MinPosNum = Number.MIN_VALUE, 
// written as the exact double each historic longer literal
// already rounded to — same bits at runtime
Phi = 1.618033988749895, EulerC = 0.5772156649015329;
/*******
 *
 *  Complete list of node shapes supported by Graphviz.  Used by jssm-viz to
 *  validate and render state shapes in FSL `state ... : { shape: ... }` blocks.
 *
 *  `shapes` is an alias for `gviz_shapes`.
 *
 */
const gviz_shapes = [
    "box3d",
    "polygon",
    "ellipse",
    "oval",
    "circle",
    "point",
    "egg",
    "triangle",
    "plaintext",
    "plain",
    "diamond",
    "trapezium",
    "parallelogram",
    "house",
    "pentagon",
    "hexagon",
    "septagon",
    "octagon",
    "doublecircle",
    "doubleoctagon",
    "tripleoctagon",
    "invtriangle",
    "invtrapezium",
    "invhouse",
    "Mdiamond",
    "Msquare",
    "Mcircle",
    "rectangle",
    "rect",
    "square",
    "star",
    "none",
    "underline",
    "cylinder",
    "note",
    "tab",
    "folder",
    "box",
    "component",
    "promoter",
    "cds",
    "terminator",
    "utr",
    "primersite",
    "restrictionsite",
    "fivepoverhang",
    "threepoverhang",
    "noverhang",
    "assembly",
    "signature",
    "insulator",
    "ribosite",
    "rnastab",
    "proteasesite",
    "proteinstab",
    "rpromoter",
    "rarrow",
    "larrow",
    "lpromoter",
    "record"
];
/**
 *  Public alias for {@link gviz_shapes}.  The list of node shapes supported
 *  by Graphviz that jssm-viz accepts in FSL `state ... : { shape: ... }`
 *  declarations.
 */
const shapes = gviz_shapes;
/*******
 *
 *  List of CSS/SVG named colors accepted by jssm-viz for state styling
 *  properties like `background-color` and `text-color`.  Case-insensitive
 *  matching is done at parse time; the canonical casing here follows the
 *  CSS specification.
 *
 */
const named_colors = [
    "AliceBlue", "AntiqueWhite", "Aqua", "Aquamarine", "Azure", "Beige",
    "Bisque", "Black", "BlanchedAlmond", "Blue", "BlueViolet", "Brown",
    "BurlyWood", "CadetBlue", "Chartreuse", "Chocolate", "Coral",
    "CornflowerBlue", "Cornsilk", "Crimson", "Cyan", "DarkBlue", "DarkCyan",
    "DarkGoldenRod", "DarkGray", "DarkGrey", "DarkGreen", "DarkKhaki",
    "DarkMagenta", "DarkOliveGreen", "Darkorange", "DarkOrchid", "DarkRed",
    "DarkSalmon", "DarkSeaGreen", "DarkSlateBlue", "DarkSlateGray",
    "DarkSlateGrey", "DarkTurquoise", "DarkViolet", "DeepPink", "DeepSkyBlue",
    "DimGray", "DimGrey", "DodgerBlue", "FireBrick", "FloralWhite", "ForestGreen",
    "Fuchsia", "Gainsboro", "GhostWhite", "Gold", "GoldenRod", "Gray", "Grey",
    "Green", "GreenYellow", "HoneyDew", "HotPink", "IndianRed", "Indigo", "Ivory",
    "Khaki", "Lavender", "LavenderBlush", "LawnGreen", "LemonChiffon",
    "LightBlue", "LightCoral", "LightCyan", "LightGoldenRodYellow", "LightGray",
    "LightGrey", "LightGreen", "LightPink", "LightSalmon", "LightSeaGreen",
    "LightSkyBlue", "LightSlateGray", "LightSlateGrey", "LightSteelBlue",
    "LightYellow", "Lime", "LimeGreen", "Linen", "Magenta", "Maroon",
    "MediumAquaMarine", "MediumBlue", "MediumOrchid", "MediumPurple",
    "MediumSeaGreen", "MediumSlateBlue", "MediumSpringGreen", "MediumTurquoise",
    "MediumVioletRed", "MidnightBlue", "MintCream", "MistyRose", "Moccasin",
    "NavajoWhite", "Navy", "OldLace", "Olive", "OliveDrab", "Orange", "OrangeRed",
    "Orchid", "PaleGoldenRod", "PaleGreen", "PaleTurquoise", "PaleVioletRed",
    "PapayaWhip", "PeachPuff", "Peru", "Pink", "Plum", "PowderBlue", "Purple",
    "Red", "RosyBrown", "RoyalBlue", "SaddleBrown", "Salmon", "SandyBrown",
    "SeaGreen", "SeaShell", "Sienna", "Silver", "SkyBlue", "SlateBlue",
    "SlateGray", "SlateGrey", "Snow", "SpringGreen", "SteelBlue", "Tan", "Teal",
    "Thistle", "Tomato", "Transparent", "Turquoise", "Violet", "Wheat", "White", "WhiteSmoke",
    "Yellow", "YellowGreen"
];
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
// keep in sync with AtomLetter in src/ts/fsl_parser.peg (#754)
const state_name_chars = Object.freeze([
    { from: '0', to: '9' },
    { from: 'a', to: 'z' },
    { from: 'A', to: 'Z' },
    { from: '_', to: '_' },
]);
/**
 *  Inclusive ASCII character ranges accepted in the first position of an FSL
 *  bareword: letters and underscore (never a digit).  Non-ASCII characters
 *  are classified by {@link is_state_name_first_char}.
 *  @example
 *  import { state_name_first_chars } from 'jssm';
 *  state_name_first_chars.some(r => '7' >= r.from && '7' <= r.to);  // => false
 *  @see is_state_name_first_char
 */
// keep in sync with AtomFirstLetter in src/ts/fsl_parser.peg (#754)
const state_name_first_chars = Object.freeze([
    { from: 'a', to: 'z' },
    { from: 'A', to: 'Z' },
    { from: '_', to: '_' },
]);
// #754: this pair is hand-copied in three other places — keep all four in
// sync: src/ts/fsl_parser.peg's BAREWORD_FIRST/BAREWORD_REST initializer
// constants, src/buildjs/fixparser.cjs's FAST_ATOM_RE, and
// src/ts/tests/bareword_charset.stoch.ts's FIRST/REST, which is the drift
// guard for all of them.
const BAREWORD_FIRST_RE = /^[\p{L}\p{Nl}_]$/u;
// note: no trailing `_` here — \p{Pc} (Connector_Punctuation) already
// includes U+005F LOW LINE, so an explicit `_` would just duplicate it
const BAREWORD_REST_RE = /^[\p{L}\p{Nl}\p{Mn}\p{Mc}\p{Nd}\p{Pc}]$/u;
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
const is_state_name_first_char = (ch) => BAREWORD_FIRST_RE.test(ch);
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
const is_state_name_char = (ch) => BAREWORD_REST_RE.test(ch);
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
// keep in sync with src/ts/fsl_parser.peg:240
const action_label_chars = Object.freeze([
    { from: ' ', to: '&' },
    { from: '(', to: '[' },
    { from: ']', to: '\u{FFFF}' },
]);
export { gviz_shapes, shapes, named_colors, state_name_chars, state_name_first_chars, action_label_chars, is_state_name_first_char, is_state_name_char, };
