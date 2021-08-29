
/* In general, this shouldn't import anything, because this is both run and
   partially imported by other things. */

/* We make an exception for arr_uniq_p() from util */

import { arr_uniq_p } from '../jssm_util';





/* constant lists for tests */

test.todo('These constants should be derived from the source and compared');

const Shapes = ["box", "polygon", "ellipse", "oval", "circle", "point", "egg", "triangle", "plaintext", "plain",
  "diamond", "trapezium", "parallelogram", "house", "pentagon", "hexagon", "septagon", "octagon", "doublecircle",
  "doubleoctagon", "tripleoctagon", "invtriangle", "invtrapezium", "invhouse", "Mdiamond", "Msquare", "Mcircle", "rect",
  "rectangle", "square", "star", "none", "underline", "cylinder", "note", "tab", "folder", "box3d", "component",
  "promoter", "cds", "terminator", "utr", "primersite", "restrictionsite", "fivepoverhang", "threepoverhang",
  "noverhang", "assembly", "signature", "insulator", "ribosite", "rnastab", "proteasesite", "proteinstab", "rpromoter",
  "rarrow", "larrow", "lpromoter", "record"];





const NamedColors = ["AliceBlue", "AntiqueWhite", "Aqua", "Aquamarine", "Azure", "Beige", "Bisque", "Black",
  "BlanchedAlmond", "Blue", "BlueViolet", "Brown", "BurlyWood", "CadetBlue", "Chartreuse", "Chocolate", "Coral",
  "CornflowerBlue", "Cornsilk", "Crimson", "Cyan", "DarkBlue", "DarkCyan", "DarkGoldenRod", "DarkGray", "DarkGrey",
  "DarkGreen", "DarkKhaki", "DarkMagenta", "DarkOliveGreen", "Darkorange", "DarkOrchid", "DarkRed", "DarkSalmon",
  "DarkSeaGreen", "DarkSlateBlue", "DarkSlateGray", "DarkSlateGrey", "DarkTurquoise", "DarkViolet", "DeepPink",
  "DeepSkyBlue", "DimGray", "DimGrey", "DodgerBlue", "FireBrick", "FloralWhite", "ForestGreen", "Fuchsia", "Gainsboro",
  "GhostWhite", "Gold", "GoldenRod", "Gray", "Grey", "Green", "GreenYellow", "HoneyDew", "HotPink", "IndianRed",
  "Indigo", "Ivory", "Khaki", "Lavender", "LavenderBlush", "LawnGreen", "LemonChiffon", "LightBlue", "LightCoral",
  "LightCyan", "LightGoldenRodYellow", "LightGray", "LightGrey", "LightGreen", "LightPink", "LightSalmon",
  "LightSeaGreen", "LightSkyBlue", "LightSlateGray", "LightSlateGrey", "LightSteelBlue", "LightYellow", "Lime",
  "LimeGreen", "Linen", "Magenta", "Maroon", "MediumAquaMarine", "MediumBlue", "MediumOrchid", "MediumPurple",
  "MediumSeaGreen", "MediumSlateBlue", "MediumSpringGreen", "MediumTurquoise", "MediumVioletRed", "MidnightBlue",
  "MintCream", "MistyRose", "Moccasin", "NavajoWhite", "Navy", "OldLace", "Olive", "OliveDrab", "Orange", "OrangeRed",
  "Orchid", "PaleGoldenRod", "PaleGreen", "PaleTurquoise", "PaleVioletRed", "PapayaWhip", "PeachPuff", "Peru", "Pink",
  "Plum", "PowderBlue", "Purple", "Red", "RosyBrown", "RoyalBlue", "SaddleBrown", "Salmon", "SandyBrown", "SeaGreen",
  "SeaShell", "Sienna", "Silver", "SkyBlue", "SlateBlue", "SlateGray", "SlateGrey", "Snow", "SpringGreen", "SteelBlue",
  "Tan", "Teal", "Thistle", "Tomato", "Turquoise", "Violet", "Wheat", "White", "WhiteSmoke", "Yellow", "YellowGreen"];





const Themes         = ['default', 'ocean', 'none', 'modern'],
      FlowDirections = ['up','down','left','right'],
      LineStyles     = ['solid', 'dotted', 'dashed'];





// for coverage, and because ava throws on no-test files in its test directory

describe('Constants test lists', () => {

  const testdata: [ string, string[] ][] = [
    [ 'Shapes',         Shapes         ],
    [ 'NamedColors',    NamedColors    ],
    [ 'Themes',         Themes         ],
    [ 'FlowDirections', FlowDirections ]
  ];

  testdata.map(datum => {

    test(`List "${datum[0]}" is an array`, () =>
      expect( Array.isArray(datum[1]) ).toBe(true) );

    test(`List "${datum[0]}" isn't empty`, () =>
      expect( datum[1].length > 1 ).toBe(true) );

    test(`List "${datum[0]}" contains no null, undefined, or holes`, () =>
      // eslint-disable-next-line no-eq-null, eqeqeq
      expect( datum[1].length == null ).toBe(false) );  // LEAVE THIS DOUBLE-EQUALS

    test(`List "${datum[0]}" contains no empty strings`, () =>
      expect( datum[1].every(s => s !== '') ).toBe(true) );

    test(`List "${datum[0]}" contains no repetitions`, () => {
      const deduped = datum[1].filter(arr_uniq_p);
      expect( datum[1].length ).toBe(deduped.length);
    });

  });

});





export { NamedColors, Shapes, Themes, FlowDirections, LineStyles };
