
import * as fc   from 'fast-check';
import * as jssm from '../jssm';





// Property-based coverage for §7 State declarations of the FSL
// grammar reference (`notes/fsl-grammar-reference.md`).  Shape:
//
//   state <Label> : { <StateDeclarationItem>* };
//
// StateDeclarationItem has eleven distinct forms (label / color /
// text-color / background-color / border-color / shape / corners /
// line-style / image / property / property-required).  Each
// canonicalises to a documented AST `key` at
// `tree[0].value[i].key`.  This suite enumerates the item kinds,
// pins the AST-key contract, exercises the full 60-name GvizShape
// vocabulary, and confirms the small enumerated vocabularies for
// `corners` and `line-style` are exactly what the grammar
// reference promises.
//
// Note: the colour vocabulary the colour items accept is exercised
// in `colors.stoch.ts` (§4); here we only verify that each colour
// item's AST `key` is what the grammar reference declares.



const RUNS = 100;



/**
 *  Parse a `state <name> : { <body> };` declaration and return the
 *  state-declaration AST node at `tree[0]`.
 *  @param  name  Source for the state's name label (atom or quoted).
 *  @param  body  Source for the body items (sequence of `key : value ;`).
 *  @returns      The state_declaration node, with `name` and a `value` array.
 *  @example
 *    parse_state_decl('F', 'color: red;')
 *    // → { key:'state_declaration', name:'F', value:[{key:'color', value:'#ff0000ff'}] }
 */
function parse_state_decl(name: string, body: string): {
  key:   'state_declaration';
  name:  string;
  value: Array<{ key: string; value: unknown; required?: boolean; name?: string }>;
} {

  const tree = jssm.parse(`state ${name} : { ${body} };`) as Array<{
    key:   'state_declaration';
    name:  string;
    value: Array<{ key: string; value: unknown; required?: boolean; name?: string }>;
  }>;
  return tree[0];

}



/**
 *  Complete inventory of GvizShape names from the §7 cheat sheet
 *  and the PEG grammar (lines 37–97).  Each shape parses verbatim
 *  to itself at the shape-item's `value` position.
 */
const GVIZ_SHAPES: ReadonlyArray<string> = [
  // Geometric
  'box', 'box3d', 'rect', 'rectangle', 'square', 'polygon',
  'ellipse', 'oval', 'circle', 'point', 'egg',
  'triangle', 'invtriangle',
  'diamond', 'trapezium', 'invtrapezium', 'parallelogram',
  'house', 'invhouse',
  'pentagon', 'hexagon', 'septagon', 'octagon',
  'doublecircle', 'doubleoctagon', 'tripleoctagon',
  'star', 'cylinder',
  // Specialty
  'Mdiamond', 'Msquare', 'Mcircle',
  'none', 'underline', 'plain', 'plaintext',
  'note', 'tab', 'folder', 'component', 'record',
  // Bio/circuit
  'promoter', 'cds', 'terminator', 'utr',
  'primersite', 'restrictionsite',
  'fivepoverhang', 'threepoverhang', 'noverhang',
  'assembly', 'signature', 'insulator',
  'ribosite', 'rnastab', 'proteasesite', 'proteinstab',
  'rpromoter', 'rarrow', 'larrow', 'lpromoter',
] as const;





describe('§7 StateDeclaration — outer shape', () => {

  test('Empty body `state F : {};` yields an empty `value` array', () => {
    const node = parse_state_decl('F', '');
    expect(node.key  ).toBe('state_declaration');
    expect(node.name ).toBe('F');
    expect(node.value).toEqual([]);
  });

  test('Name accepts atom and quoted-string forms equivalently', () => {

    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
          { minLength: 1, maxLength: 6 }
        ).map(arr => arr.join('')),
        (body) => {
          const atom_node   = parse_state_decl(body,        '');
          const string_node = parse_state_decl(`"${body}"`, '');
          expect(string_node.name).toBe(atom_node.name);
          expect(string_node.name).toBe(body);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('Item order in source is preserved in `value`', () => {
    const node = parse_state_decl('F', 'color: red; shape: box; corners: rounded;');
    const keys = node.value.map(item => item.key);
    expect(keys).toEqual(['color', 'shape', 'corners']);
  });

});





describe('§7 StateDeclarationItem — AST keys per item kind', () => {

  // Each item kind canonicalises to a documented AST key.  Some
  // surprises (and the rationale they teach):
  //   - `label : X;`         → key `state-label` (avoids collision with
  //                            the bare Label production)
  //   - `linestyle : X;`     → key `line-style` (alias collapses to the
  //                            hyphenated canonical form)
  //   - `property : ...`     → key `state_property`
  //   - all colour items use their source name as the key

  const ITEM_KEY_TABLE: ReadonlyArray<readonly [string, string]> = [
    // [body_item_src, expected_ast_key]
    ['label: hello;',                  'state-label'      ],
    ['color: red;',                    'color'            ],
    ['text-color: blue;',              'text-color'       ],
    ['background-color: green;',       'background-color' ],
    ['border-color: white;',           'border-color'     ],
    ['shape: box;',                    'shape'            ],
    ['corners: regular;',              'corners'          ],
    ['line-style: solid;',             'line-style'       ],
    ['linestyle: solid;',              'line-style'       ],
    ['image: "foo.png";',              'image'            ],
    ['property: p 42;',                'state_property'   ],
    ['property: p 42 required;',       'state_property'   ],
  ];

  for (const [item_src, expected_key] of ITEM_KEY_TABLE) {
    test(`\`${item_src}\` produces AST key \`${expected_key}\``, () => {
      const node = parse_state_decl('F', item_src);
      expect(node.value).toHaveLength(1);
      expect(node.value[0].key).toBe(expected_key);
    });
  }

});





describe('§7 GvizShape — all 60 documented shape names parse to themselves', () => {

  // Every name in `GVIZ_SHAPES` is one of the documented shape
  // values, and each canonicalises to itself at the shape item's
  // `value`.  The inventory size of 60 matches the count documented
  // in §7 of the grammar reference.

  test('Inventory size matches the documented 60 shapes', () => {
    expect(GVIZ_SHAPES.length).toBe(60);
  });

  for (const shape of GVIZ_SHAPES) {
    test(`\`${shape}\` parses as shape value \`${shape}\``, () => {
      const node = parse_state_decl('F', `shape: ${shape};`);
      expect(node.value).toHaveLength(1);
      expect(node.value[0].key  ).toBe('shape');
      expect(node.value[0].value).toBe(shape);
    });
  }

  test('Random shape from the inventory round-trips', () => {

    fc.assert(
      fc.property(fc.constantFrom(...GVIZ_SHAPES), (shape) => {
        const node = parse_state_decl('F', `shape: ${shape};`);
        expect(node.value[0].value).toBe(shape);
      }),
      { numRuns: RUNS }
    );

  });

});



describe('§7 GvizShape — prefix-pair longer-match precedence', () => {

  // Several shape names share prefixes with shorter shape names.
  // PEG is first-match, so the grammar lists the longer name first
  // in every prefix-pair to keep the longer match from being
  // short-circuited.  These spot-checks pin that ordering.

  const PREFIX_PAIRS: ReadonlyArray<readonly [string, string]> = [
    // [longer, shorter]
    ['box3d',      'box'      ],
    ['plaintext',  'plain'    ],
    ['rectangle',  'rect'     ],
    ['invtriangle','triangle' ],   // shares "triangle"
    ['invtrapezium','trapezium'],  // shares "trapezium"
    ['invhouse',   'house'    ],   // shares "house"
  ];

  for (const [longer, shorter] of PREFIX_PAIRS) {
    test(`\`${longer}\` parses as itself, not as \`${shorter}\` + leftover`, () => {
      const node = parse_state_decl('F', `shape: ${longer};`);
      expect(node.value[0].value).toBe(longer);
      expect(node.value[0].value).not.toBe(shorter);
    });
  }

});





describe('§7 corners — enumerated vocabulary', () => {

  // The grammar accepts exactly three corner styles.  Anything else
  // must fail to parse (the value position is a fixed-alternative
  // production, not a free Label).

  const CORNERS = ['regular', 'rounded', 'lined'] as const;

  for (const corner of CORNERS) {
    test(`\`${corner}\` parses as corners value`, () => {
      const node = parse_state_decl('F', `corners: ${corner};`);
      expect(node.value[0]).toEqual({ key: 'corners', value: corner });
    });
  }

  test('Unknown corner style throws', () => {
    expect(() => parse_state_decl('F', 'corners: sharp;')).toThrow();
  });

});



describe('§7 line-style — enumerated vocabulary and alias', () => {

  // Three line styles, plus the `linestyle` (no-hyphen) alias that
  // canonicalises to the hyphenated `line-style` AST key.

  const STYLES = ['solid', 'dotted', 'dashed'] as const;

  for (const style of STYLES) {
    test(`\`line-style: ${style};\` parses as line-style value`, () => {
      const node = parse_state_decl('F', `line-style: ${style};`);
      expect(node.value[0]).toEqual({ key: 'line-style', value: style });
    });

    test(`\`linestyle: ${style};\` (alias) parses to the same AST as the hyphenated form`, () => {
      const node = parse_state_decl('F', `linestyle: ${style};`);
      expect(node.value[0]).toEqual({ key: 'line-style', value: style });
    });
  }

  test('Unknown line style throws', () => {
    expect(() => parse_state_decl('F', 'line-style: wavy;')).toThrow();
  });

});





describe('§7 property item — with and without `required`', () => {

  // The `property` item carries a name and a value; the optional
  // `required` keyword sets a flag on the AST node.  Confirms both
  // forms parse and that the flag's presence is the only difference.

  test('Property without required has no `required` field', () => {
    const node = parse_state_decl('F', 'property: foo 42;');
    expect(node.value[0]).toMatchObject({ key: 'state_property', name: 'foo', value: 42 });
    expect(node.value[0].required).toBeUndefined();
  });

  test('Property with required has `required: true`', () => {
    const node = parse_state_decl('F', 'property: foo 42 required;');
    expect(node.value[0]).toMatchObject({ key: 'state_property', name: 'foo', value: 42, required: true });
  });

  test('Required property accepts a quoted string value', () => {
    const node = parse_state_decl('F', 'property: bar "hello" required;');
    expect(node.value[0]).toMatchObject({ key: 'state_property', name: 'bar', value: 'hello', required: true });
  });

  test('Property name can be any atom-like identifier', () => {

    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
          { minLength: 1, maxLength: 8 }
        ).map(arr => arr.join('')),
        (prop_name) => {
          const node = parse_state_decl('F', `property: ${prop_name} 1;`);
          expect((node.value[0] as { name: string }).name).toBe(prop_name);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('§7 StateDeclaration — combined random body', () => {

  // Random subset of item kinds combined into one body, each item
  // contributing its known AST key.  Confirms the parser's item
  // sequencing is order-faithful regardless of which mix appears.

  const FIXED_ITEMS: ReadonlyArray<readonly [string, string]> = [
    ['label: x;',                  'state-label'      ],
    ['color: red;',                'color'            ],
    ['text-color: blue;',          'text-color'       ],
    ['background-color: white;',   'background-color' ],
    ['shape: box;',                'shape'            ],
    ['corners: rounded;',          'corners'          ],
    ['line-style: dashed;',        'line-style'       ],
    ['image: "x.png";',            'image'            ],
  ];

  test('Random shuffles of the fixed-item table preserve order and keys', () => {

    fc.assert(
      fc.property(
        fc.shuffledSubarray(FIXED_ITEMS as unknown as Array<readonly [string, string]>),
        (subset) => {
          if (subset.length === 0) return;
          const body         = subset.map(([src]) => src).join(' ');
          const expected_keys = subset.map(([, key]) => key);
          const node          = parse_state_decl('F', body);
          expect(node.value.map(i => i.key)).toEqual(expected_keys);
        }
      ),
      { numRuns: RUNS }
    );

  });

});
