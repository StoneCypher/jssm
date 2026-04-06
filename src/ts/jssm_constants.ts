
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





export {

  gviz_shapes,
    shapes,

  named_colors,

};
