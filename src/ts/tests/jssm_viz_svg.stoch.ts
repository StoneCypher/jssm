
import * as fc from 'fast-check';

import { JSDOM } from 'jsdom';

import * as jssm from '../jssm';
import {
  configure, dot_to_svg, machine_to_dot,
  fsl_to_svg_string, machine_to_svg_string,
  fsl_to_svg_element, machine_to_svg_element
} from '../jssm_viz';

import { chain_plan_arb } from './stoch_helpers';





// Property-based coverage for the SVG render path of `jssm_viz.ts`: the
// real graphviz wasm engine renders constructed machines, and assertions
// are substring / structural checks on the SVG (per house rules, never
// golden-file comparisons).
//
// Render counts are kept low — each render is a wasm layout pass.



const RUNS = 10;





describe('SVG string rendering', () => {

  test('every constructed state name appears in the rendered SVG', async () => {

    await fc.assert(
      fc.asyncProperty(
        chain_plan_arb,
        async ({ names, fsl }) => {

          const svg = await fsl_to_svg_string(fsl);

          expect(svg).toContain('<svg');
          expect(svg).toContain('</svg>');

          for (const name of names) {
            expect(svg).toContain(name);
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('machine_to_svg_string agrees with rendering the dot by hand', async () => {

    await fc.assert(
      fc.asyncProperty(
        chain_plan_arb,
        async ({ fsl }) => {

          const machine = jssm.from(fsl);

          const direct  = await machine_to_svg_string(machine);
          const by_hand = await dot_to_svg(machine_to_dot(machine));

          expect(direct).toBe(by_hand);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('alternate layout engines render; unknown engines reject', async () => {

    const svg_neato = await dot_to_svg('digraph G { a -> b; }', { engine: 'neato' });
    expect(svg_neato).toContain('<svg');

    const svg_circo = await dot_to_svg('digraph G { a -> b; }', { engine: 'circo' });
    expect(svg_circo).toContain('<svg');

    await expect(dot_to_svg('digraph G { a -> b; }', { engine: 'not_an_engine' }))
      .rejects.toThrow();

  });

});





describe('SVG element rendering', () => {

  test('without a DOMParser, element rendering throws JssmError mentioning configure', async () => {

    // must run before configure() below injects one for the rest of the file
    await expect(fsl_to_svg_element('aa -> bb;')).rejects.toThrow(/configure/);

  });

  test('after configure({ DOMParser }), elements parse with svg as the document element', async () => {

    configure({ DOMParser: new JSDOM().window.DOMParser });

    await fc.assert(
      fc.asyncProperty(
        chain_plan_arb,
        async ({ fsl }) => {

          const element = await fsl_to_svg_element(fsl);
          expect(element.tagName.toLowerCase()).toBe('svg');

          const via_machine = await machine_to_svg_element(jssm.from(fsl));
          expect(via_machine.tagName.toLowerCase()).toBe('svg');

        }
      ),
      { numRuns: 5 }
    );

  });

});
