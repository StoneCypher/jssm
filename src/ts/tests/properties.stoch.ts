
import * as fc   from 'fast-check';
import * as jssm from '../jssm';





// Property-based coverage for §10 Properties (MachineProperty) of
// the FSL grammar reference (`notes/fsl-grammar-reference.md`).
// Top-level machine properties have four legal shapes — the 2×2
// matrix of "has default value" × "is required":
//
//   property <name> default <val> required ;
//   property <name>               required ;
//   property <name> default <val>          ;
//   property <name>                        ;
//
// All four emit an AST node with `key: 'property_definition'` and
// `name`.  The optional fields `default_value` and `required: true`
// appear only when present in the source.  PropertyVal accepts
// String, Boolean, JsNumericLiteral (full numeric vocabulary —
// hex/binary/octal/decimal/scientific/named constants), Null, and
// Undefined.
//
// The numeric vocabulary itself is exhaustively covered by
// `numeric.stoch.ts` (§3); this file confirms it threads through
// the `default_value` position of MachineProperty.  Note: the
// `:`-separator form `property : foo 42;` is a SdStateProperty
// (state-level), exercised in `state_declaration.stoch.ts` (§7).



const RUNS = 100;



/**
 *  Parse a top-level `property ...;` declaration and return the
 *  term at `tree[0]`.
 *
 *  @param  src  Full property declaration source, terminator included.
 *  @returns     The property_definition AST node.
 *
 *  @example
 *    parse_prop('property foo default 42 required;')
 *    // → { key:'property_definition', name:'foo', default_value:42, required:true }
 */
function parse_prop(src: string): {
  key:           string;
  name:          string;
  default_value?: unknown;
  required?:      boolean;
} {

  const tree = jssm.parse(src) as Array<{
    key:           string;
    name:          string;
    default_value?: unknown;
    required?:      boolean;
  }>;
  return tree[0];

}



/**
 *  Random atom-shaped property name.
 */
const ATOM_LIKE = fc.array(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 6 }
).map(arr => arr.join(''));





describe('§10 MachineProperty — the four legal shapes', () => {

  // The 2×2 matrix of (default? × required?) shapes.  Each emits a
  // property_definition node; the optional fields appear only when
  // their syntactic markers are present.

  test('Form 1: `property <name> default <val> required;` includes both optional fields', () => {
    const node = parse_prop('property foo default 42 required;');
    expect(node).toEqual({ key: 'property_definition', name: 'foo', default_value: 42, required: true });
  });

  test('Form 2: `property <name> required;` includes required but not default_value', () => {
    const node = parse_prop('property foo required;');
    expect(node).toEqual({ key: 'property_definition', name: 'foo', required: true });
    expect(node.default_value).toBeUndefined();
  });

  test('Form 3: `property <name> default <val>;` includes default_value but not required', () => {
    const node = parse_prop('property foo default 42;');
    expect(node).toEqual({ key: 'property_definition', name: 'foo', default_value: 42 });
    expect(node.required).toBeUndefined();
  });

  test('Form 4: `property <name>;` includes neither optional field', () => {
    const node = parse_prop('property foo;');
    expect(node).toEqual({ key: 'property_definition', name: 'foo' });
    expect(node.default_value).toBeUndefined();
    expect(node.required     ).toBeUndefined();
  });

});



describe('§10 MachineProperty — name accepts Label (atom or string)', () => {

  // The `name` position is a Label, so both atom and quoted-string
  // spellings are accepted and produce the same canonical name.

  test('Atom name and quoted-string name yield the same canonical name', () => {

    fc.assert(
      fc.property(ATOM_LIKE, (body) => {
        const atom_node   = parse_prop(`property ${body};`);
        const string_node = parse_prop(`property "${body}";`);
        expect(string_node.name).toBe(atom_node.name);
        expect(string_node.name).toBe(body);
      }),
      { numRuns: RUNS }
    );

  });

});





describe('§10 MachineProperty — PropertyVal vocabulary at the default position', () => {

  // PropertyVal accepts String, Boolean, JsNumericLiteral, Null,
  // and Undefined.  Numeric specifics are covered exhaustively in
  // `numeric.stoch.ts`; here we sample one literal from each
  // category to prove the union threads through the
  // `default_value` field.

  const VALUE_TABLE: ReadonlyArray<readonly [string, unknown]> = [
    // [source_literal,         expected_default_value]
    ['"hello"',                 'hello'                ],
    ['""',                      ''                     ],
    ['true',                    true                   ],
    ['false',                   false                  ],
    ['42',                      42                     ],
    ['3.14',                    3.14                   ],
    // No `-` prefix: JsNumericLiteral has no signed-literal
    // production.  Negatives appear only as named constants
    // (`NegativeInfinity`, etc.).  Documented in §3 of the
    // grammar reference.
    ['0xff',                    255                    ],
    ['0b101',                   5                      ],
    ['0o17',                    15                     ],
    ['1e3',                     1000                   ],
    ['null',                    null                   ],
    ['undefined',               undefined              ],
  ];

  for (const [literal, expected] of VALUE_TABLE) {
    test(`\`property foo default ${literal};\` parses default_value as ${JSON.stringify(expected)}`, () => {
      const node = parse_prop(`property foo default ${literal};`);
      expect(node.default_value).toEqual(expected);
    });
  }

});



describe('§10 MachineProperty — named numeric constants in default position', () => {

  // The numeric vocabulary in §3 includes a set of "word constants"
  // that PropertyVal must accept verbatim through the JsNumericLiteral
  // path.

  const CONSTANTS: ReadonlyArray<readonly [string, number]> = [
    ['Pi',        Math.PI                            ],
    ['Phi',       1.618033988749895                  ],
    ['EulerNumber',Math.E                            ],
    ['Epsilon',   Number.EPSILON                     ],
    ['Root2',     Math.SQRT2                         ],
    ['MaxSafeInt',Number.MAX_SAFE_INTEGER            ],
  ];

  for (const [name, expected] of CONSTANTS) {
    test(`\`property foo default ${name};\` parses to ${expected}`, () => {
      const node = parse_prop(`property foo default ${name};`);
      expect(node.default_value).toBe(expected);
    });
  }

});





describe('§10 MachineProperty — required works with every PropertyVal kind', () => {

  // The `required` keyword can combine with any default value, so
  // the 2×2 matrix is really a Cartesian product of (default × vocabulary)
  // × (required-or-not).  Sample to confirm `required: true` carries
  // through regardless of value kind.

  test('Random PropertyVal × required combination preserves both shape fields', () => {

    fc.assert(
      fc.property(
        fc.constantFrom('42', '"x"', 'true', 'false', '3.14', 'null', '0xff'),
        ATOM_LIKE,
        (literal, name) => {
          const node = parse_prop(`property ${name} default ${literal} required;`);
          expect(node.key  ).toBe('property_definition');
          expect(node.name ).toBe(name);
          expect(node.required).toBe(true);
          // We don't compare default_value here — see PropertyVal
          // vocabulary table for per-literal expectations.  This
          // property only confirms required-ness composes with
          // default values, not their canonical forms.
        }
      ),
      { numRuns: RUNS }
    );

  });

});
