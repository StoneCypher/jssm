
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

export const NegInfinity = Number.NEGATIVE_INFINITY,
             PosInfinity = Number.POSITIVE_INFINITY,
             Epsilon     = Number.EPSILON,
             Pi          = Math.PI,
             E           = Math.E,
             Root2       = Math.SQRT2,
             RootHalf    = Math.SQRT1_2,
             Ln2         = Math.LN2,
             Ln10        = Math.LN10,
             Log2E       = Math.LOG2E,
             Log10E      = Math.LOG10E,
             MaxSafeInt  = Number.MAX_SAFE_INTEGER,
             MinSafeInt  = Number.MIN_SAFE_INTEGER,
             MaxPosNum   = Number.MAX_VALUE,
             MinPosNum   = Number.MIN_VALUE,
             Phi         = 1.61803398874989484820,
             EulerC      = 0.57721566490153286060;



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
  "Thistle", "Tomato", "Turquoise", "Violet", "Wheat", "White", "WhiteSmoke",
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
 *  Inclusive character ranges accepted by `AtomLetter` — i.e., the characters
 *  legal in any but the first position of an FSL state name (atom).
 *
 *  Includes ASCII digits/letters and the symbols
 *  `.`, `+`, `_`, `^`, `(`, `)`, `*`, `&`, `$`, `#`, `@`, `!`, `?`, `,`,
 *  plus the high-Unicode range `U+0080`–`U+FFFF`.
 *
 *  @example
 *  import { state_name_chars } from 'jssm';
 *  state_name_chars.some(r => 'A' >= r.from && 'A' <= r.to);  // => true
 */
// keep in sync with src/ts/fsl_parser.peg:267
const state_name_chars: ReadonlyArray<{ from: string, to: string }> = Object.freeze([
  { from: '0',      to: '9'      },
  { from: 'a',      to: 'z'      },
  { from: 'A',      to: 'Z'      },
  { from: '.',      to: '.'      },
  { from: '+',      to: '+'      },
  { from: '_',      to: '_'      },
  { from: '^',      to: '^'      },
  { from: '(',      to: '('      },
  { from: ')',      to: ')'      },
  { from: '*',      to: '*'      },
  { from: '&',      to: '&'      },
  { from: '$',      to: '$'      },
  { from: '#',      to: '#'      },
  { from: '@',      to: '@'      },
  { from: '!',      to: '!'      },
  { from: '?',      to: '?'      },
  { from: ',',      to: ','      },
  { from: '\u0080', to: '\uFFFF' },
]);

/**
 *  Inclusive character ranges accepted by `AtomFirstLetter` — i.e., the
 *  characters legal in the first position of an FSL state name (atom).
 *
 *  Notably narrower than {@link state_name_chars}: omits `+`, `(`, `)`, `&`,
 *  `#`, `@`.  Includes ASCII digits/letters, `.`, `_`, `!`, `$`, `^`, `*`,
 *  `?`, `,`, and the high-Unicode range `U+0080`–`U+FFFF`.
 *
 *  @example
 *  import { state_name_first_chars } from 'jssm';
 *  state_name_first_chars.some(r => '+' >= r.from && '+' <= r.to);  // => false
 */
// keep in sync with src/ts/fsl_parser.peg:264
const state_name_first_chars: ReadonlyArray<{ from: string, to: string }> = Object.freeze([
  { from: '0',      to: '9'      },
  { from: 'a',      to: 'z'      },
  { from: 'A',      to: 'Z'      },
  { from: '.',      to: '.'      },
  { from: '_',      to: '_'      },
  { from: '!',      to: '!'      },
  { from: '$',      to: '$'      },
  { from: '^',      to: '^'      },
  { from: '*',      to: '*'      },
  { from: '?',      to: '?'      },
  { from: ',',      to: ','      },
  { from: '\u0080', to: '\uFFFF' },
]);

/**
 *  Inclusive character ranges accepted by `ActionLabelUnescaped` — i.e., the
 *  characters legal inside a single-quoted action label without escaping.
 *  Space (`U+0020`) is included; the apostrophe `'` (`U+0027`) is explicitly
 *  excluded since it terminates the label.
 *
 *  Three ranges: `U+0020`–`U+0026`, `U+0028`–`U+005B`, `U+005D`–`U+FFFF`.
 *
 *  @example
 *  import { action_label_chars } from 'jssm';
 *  action_label_chars.some(r => ' ' >= r.from && ' ' <= r.to);   // => true
 *  action_label_chars.some(r => "'" >= r.from && "'" <= r.to);   // => false
 */
// keep in sync with src/ts/fsl_parser.peg:240
const action_label_chars: ReadonlyArray<{ from: string, to: string }> = Object.freeze([
  { from: ' ', to: '&' },
  { from: '(', to: '[' },
  { from: ']', to: '\uFFFF' },
]);





export {

  gviz_shapes,
    shapes,

  named_colors,

  state_name_chars,
  state_name_first_chars,
  action_label_chars,

};
