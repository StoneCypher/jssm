
import * as fc   from 'fast-check';
import * as jssm from '../jssm';




// Property-based coverage for `transfer_state_properties`
// (`src/ts/jssm.ts` roughly lines 156-197), part of the fsl#651
// literal-100% stochastic coverage drive.
//
// `transfer_state_properties` folds a state declaration's raw
// `{ key, value }` rule list into named fields on the declaration object
// during `Machine` construction.  Coverage here drives it two ways:
//
//   - through real machines (`jssm.from` with `state X : { ... };`
//     declarations), which exercises every parser-expressible key kind
//     (color family, shape, corners, line-style, image, label);
//   - directly through the exported function for the `url` key (which the
//     state-declaration grammar surface does not emit) and for the
//     unknown-key rejection arm.



const RUNS = 60;



/**
 * Arbitrary for an 8-digit lowercase rgba hex literal, e.g. `#0af3c218`.
 *  Rgba8 literals canonicalise to themselves through the parser, so they
 *  round-trip exactly.
 */
const rgba8_arb = fc.array(
  fc.constantFrom(...'0123456789abcdef'.split('')),
  { minLength: 8, maxLength: 8 }
).map(arr => '#' + arr.join(''));

/** Arbitrary for a short lowercase atom. */
const atom_arb = fc.array(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 8 }
).map(arr => arr.join(''));



/**
 *  One parser-expressible state-declaration item kind: how to render it as
 *  FSL source, which declaration field it lands on, and an arbitrary for
 *  its value.  Rendered values equal stored values for every kind here
 *  (colors round-trip because they are generated as canonical Rgba8).
 */
type DeclKind = {
  field : string;
  arb   : fc.Arbitrary<string>;
  src   : (value: string) => string;
};

const DECL_KINDS: ReadonlyArray<DeclKind> = [
  { field: 'color',           arb: rgba8_arb, src: v => `color: ${v};`            },
  { field: 'textColor',       arb: rgba8_arb, src: v => `text-color: ${v};`       },
  { field: 'backgroundColor', arb: rgba8_arb, src: v => `background-color: ${v};` },
  { field: 'borderColor',     arb: rgba8_arb, src: v => `border-color: ${v};`     },
  { field: 'shape',           arb: fc.constantFrom('box', 'oval', 'circle', 'diamond', 'octagon'),
                              src: v => `shape: ${v};`                            },
  { field: 'corners',         arb: fc.constantFrom('regular', 'rounded', 'lined'),
                              src: v => `corners: ${v};`                          },
  { field: 'lineStyle',       arb: fc.constantFrom('solid', 'dotted', 'dashed'),
                              src: v => `line-style: ${v};`                       },
  { field: 'image',           arb: atom_arb.map(a => `${a}.png`),
                              src: v => `image: "${v}";`                          },
  { field: 'stateLabel',      arb: atom_arb, src: v => `label: ${v};`             },
] as const;





describe('state declarations transfer onto machine declaration fields', () => {

  test('any non-empty subset of declaration item kinds lands on exactly the matching fields', () => {

    fc.assert(
      fc.property(
        fc.shuffledSubarray([...DECL_KINDS.keys()], { minLength: 1 }),
        fc.tuple(...DECL_KINDS.map( k => k.arb )),
        (indices, values) => {

          const chosen = indices.map( i => ({ kind: DECL_KINDS[i], value: values[i] }) );

          const body = chosen.map( ({ kind, value }) => kind.src(value) ).join(' ');
          const machine = jssm.from(`a -> b;  state a : { ${body} };`);

          const decl = machine.state_declaration('a') as unknown as Record<string, unknown>;

          for (const { kind, value } of chosen) {
            expect(decl[kind.field]).toBe(value);
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('all nine item kinds together in one declaration each land on their field', () => {

    fc.assert(
      fc.property(
        fc.tuple(...DECL_KINDS.map( k => k.arb )),
        (values) => {

          const body = DECL_KINDS.map( (kind, i) => kind.src(values[i]) ).join(' ');
          const machine = jssm.from(`a -> b;  state a : { ${body} };`);

          const decl = machine.state_declaration('a') as unknown as Record<string, unknown>;

          for (const [i, kind] of DECL_KINDS.entries()) {
            expect(decl[kind.field]).toBe(values[i]);
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('transfer_state_properties — direct arms the grammar cannot reach', () => {

  test('a `url` declaration rule lands on the `url` field', () => {

    fc.assert(
      fc.property(atom_arb, (u) => {
        const url  = `https://example.com/${u}`;
        const decl = jssm.transfer_state_properties(
          { state: 'x', declarations: [ { key: 'url', value: url } ] } as any
        ) as unknown as Record<string, unknown>;
        expect(decl.url).toBe(url);
      }),
      { numRuns: RUNS }
    );

  });

  test('an unrecognized declaration rule key throws "Unknown state property"', () => {

    const known = new Set(['shape', 'color', 'corners', 'line-style', 'text-color', 'background-color',
                   'state-label', 'border-color', 'image', 'url', 'state_property']);

    fc.assert(
      fc.property(
        atom_arb.filter( k => !known.has(k) ),
        atom_arb,
        (bad_key, value) => {
          expect(
            () => jssm.transfer_state_properties(
              { state: 'x', declarations: [ { key: bad_key, value } ] } as any
            )
          ).toThrow(/Unknown state property/);
        }
      ),
      { numRuns: RUNS }
    );

  });

});
