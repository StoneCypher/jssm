
import * as fc from 'fast-check';

import * as jssm from '../jssm';
import { machine_to_dot, fsl_to_dot, dot } from '../jssm_viz';

import { chain_plan_arb } from './stoch_helpers';





// Property-based coverage for the dot-source renderer (`jssm_viz.ts`).
//
// Per house rules these are substring assertions over the rendered dot —
// never golden-file comparisons.  State names are constructed lowercase
// alphanumerics, so each state's viz slug is the state name itself and a
// node/edge can be located in the output by its quoted name.



const RUNS = 50;





describe('machine_to_dot over random chain machines', () => {

  test('output is a digraph containing every state and every declared edge', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, edges, fsl }) => {

          const rendered = machine_to_dot(jssm.from(fsl));

          expect(rendered.startsWith('digraph G {')).toBe(true);
          expect(rendered.endsWith('}')).toBe(true);

          for (const name of names) {
            expect(rendered).toContain(`"${name}"`);
          }

          for (const [from, to] of edges) {
            expect(rendered).toContain(`"${from}"->"${to}"`);
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('no edges are rendered that were not declared', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, edges, fsl }) => {

          const rendered = machine_to_dot(jssm.from(fsl));
          const declared = new Set( edges.map( ([f, t]) => `${f}|${t}` ) );

          for (const from of names) {
            for (const to of names) {
              if (!declared.has(`${from}|${to}`)) {
                expect(rendered).not.toContain(`"${from}"->"${to}"`);
              }
            }
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('the deprecated dot() wrapper and fsl_to_dot agree with machine_to_dot', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ fsl }) => {

          const machine = jssm.from(fsl);

          expect(dot(machine)).toBe(machine_to_dot(machine));
          expect(fsl_to_dot(fsl)).toBe(machine_to_dot(machine));

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('flow directives map to graphviz rankdir', () => {

  test('each FSL flow direction lands as the documented rankdir', () => {

    const expected_rankdir = {
      up    : 'rankdir=BT;',
      right : 'rankdir=LR;',
      down  : 'rankdir=TB;',
      left  : 'rankdir=RL;'
    } as const;

    fc.assert(
      fc.property(
        chain_plan_arb,
        fc.constantFrom('up', 'right', 'down', 'left'),
        ({ fsl }, flow) => {
          const rendered = fsl_to_dot(`flow: ${flow};  ${fsl}`);
          expect(rendered).toContain(expected_rankdir[flow]);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('machines with no flow directive default to down (TB)', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ fsl }) => {
          expect(fsl_to_dot(fsl)).toContain('rankdir=TB;');
        }
      ),
      { numRuns: RUNS }
    );

  });

});





/**
 *  Extracts the node entry (`"name" [features];`) for one state from
 *  rendered dot source.  Node entries have a space before the bracket;
 *  edge entries (`"a"->"b" [...]`) never match because of the `->`.
 *  @param rendered  Complete dot source.
 *  @param name      The state whose node entry to find.
 *  @returns         The features text inside the brackets, or undefined.
 *  @example
 *    node_features_for('... "aa" [label="aa" shape="box"]; ...', 'aa')
 *    // 'label="aa" shape="box"'
 */
function node_features_for(rendered: string, name: string): string | undefined {
  const m = rendered.match( new RegExp(String.raw`"${name}" \[([^\]]*)\];`) );
  return m === null ? undefined : m[1];
}



describe('state declarations surface in the render', () => {

  test('a declared shape appears in the node entry for that state', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        fc.constantFrom('circle', 'doublecircle', 'hexagon', 'diamond', 'egg', 'octagon'),
        ({ names, fsl }, shape) => {

          const rendered = fsl_to_dot(`state ${names[0]}: { shape: ${shape}; };  ${fsl}`);
          const features = node_features_for(rendered, names[0]);

          expect(features).toBeDefined();
          expect(features).toContain(`shape="${shape}"`);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('dot_preamble and footer are emitted verbatim', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 3, maxLength: 12 }),
        ({ fsl }, marker) => {

          const with_preamble = fsl_to_dot(`dot_preamble: "${marker}";  ${fsl}`);
          expect(with_preamble).toContain(marker);

          const with_footer = fsl_to_dot(fsl, { footer: `label="${marker}";` });
          expect(with_footer).toContain(`label="${marker}";`);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('default render labels every node with its state name; hide_state_labels removes them all', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, fsl }) => {

          const labelled = fsl_to_dot(fsl);
          const hidden   = fsl_to_dot(fsl, { hide_state_labels: true });

          for (const name of names) {

            expect(node_features_for(labelled, name)).toContain(`label="${name}"`);

            const hidden_features = node_features_for(hidden, name);
            expect(hidden_features).toBeDefined();
            expect(hidden_features).not.toContain('label=');

          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('transition annotations surface in the render', () => {

  test('action names appear as edge tail labels', () => {

    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 2, maxLength: 10 }),
        (action) => {
          const rendered = fsl_to_dot(`aa '${action}' -> bb;`);
          expect(rendered).toContain(`taillabel="${action}"`);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('probability annotations appear as numeric edge labels', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99 }),
        (p) => {
          const rendered = fsl_to_dot(`aa ${p}% -> bb;  aa ${100 - p}% -> cc;`);
          expect(rendered).toContain(`taillabel="${p}"`);
          expect(rendered).toContain(`taillabel="${100 - p}"`);
        }
      ),
      { numRuns: RUNS }
    );

  });

});
