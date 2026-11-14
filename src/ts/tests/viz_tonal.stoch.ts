// @vitest-environment jsdom

import * as fc from 'fast-check';

import { fsl_to_svg_string, machine_to_svg_string } from '../jssm_viz';
import { from } from '../jssm';

import { chain_plan_arb, ring_plan_arb } from './stoch_helpers';





// Property-based coverage for the tonal state-card provider: constructed
// machines are laid out by the real Graphviz wasm engine and drawn by
// tonal, and the assertions check the SVG's structure against the plan the
// machine was built from (never golden files).  Ring plans can contain a
// transition each way between two states, which tonal must keep as two
// separate edges rather than Graphviz's merged `dir=both` edge.
//
// Render counts are kept low; each render is a wasm layout pass.



const RUNS = 10;



/**
 *  Parses a rendered SVG string into a document, failing the test on a
 *  parser error so a malformed export cannot pass structural checks.
 *  @param svg The SVG source the provider returned.
 *  @returns The parsed SVG document.
 */
function svg_document(svg: string): Document {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  expect(doc.querySelector('parsererror')).toBeNull();
  return doc;
}



/**
 *  Reads the `<title>` text of every element matching a selector, sorted, so
 *  node and edge sets can be compared to a plan regardless of paint order.
 *  @param doc      The parsed SVG document.
 *  @param selector Which groups to read (`.node` or `.edge`).
 *  @returns The sorted title texts.
 */
function sorted_titles(doc: Document, selector: string): string[] {
  return [...doc.querySelectorAll(selector)]
    .map(el => el.querySelector('title')?.textContent ?? '')
    .sort(by_text);
}



/**
 *  Orders strings by locale collation, for comparing title sets.
 *  @param a One string.
 *  @param b Another string.
 *  @returns Negative, zero or positive, as `localeCompare` defines.
 *  @example ['b', 'a'].sort(by_text)  // ['a', 'b']
 */
function by_text(a: string, b: string): number {
  return a.localeCompare(b);
}



/**
 *  The edge titles a plan's transitions should produce, sorted like {@link sorted_titles}.
 *  @param edges The plan's directed `[from, to]` pairs.
 *  @returns `from->to` for every pair, sorted.
 */
function expected_edge_titles(edges: [string, string][]): string[] {
  return edges.map(([f, t]) => `${f}->${t}`).sort(by_text);
}





describe('tonal provider over constructed machines', () => {

  test('a source-selected tonal render draws one card per state and one edge per transition', async () => {

    await fc.assert(
      fc.asyncProperty(
        ring_plan_arb,
        async ({ names, edges, fsl }) => {

          const doc = svg_document(await fsl_to_svg_string(`graph_renderer: tonal; ${fsl}`));

          expect((doc.documentElement as unknown as SVGSVGElement).dataset.renderProvider).toBe('tonal');
          expect(sorted_titles(doc, '.node')).toEqual([...names].sort(by_text));
          expect(sorted_titles(doc, '.edge')).toEqual(expected_edge_titles(edges));

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('an explicit graphviz provider overrides a source that selects tonal', async () => {

    await fc.assert(
      fc.asyncProperty(
        chain_plan_arb,
        async ({ names, fsl }) => {

          const svg = await machine_to_svg_string(from(`graph_renderer: tonal; ${fsl}`), { provider: 'graphviz' });

          expect(svg).not.toContain('data-render-provider="tonal"');
          for (const name of names) { expect(svg).toContain(name); }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('annotations add their text to the card without changing the edge set', async () => {

    await fc.assert(
      fc.asyncProperty(
        chain_plan_arb,
        fc.stringOf(fc.constantFrom(...'abcdefghij <>&'.split('')), { minLength: 1, maxLength: 12 }),
        async ({ names, edges, fsl }, description) => {

          const states = { [names[0]]: { description } };
          const doc    = svg_document(await fsl_to_svg_string(fsl, { provider: 'tonal', tonal: { states } }));

          const first_card = [...doc.querySelectorAll('.node')]
            .find(node => node.querySelector('title')?.textContent === names[0]);

          expect(first_card?.textContent).toContain(description.trim().replace(/\s+/g, ' '));
          expect(sorted_titles(doc, '.edge')).toEqual(expected_edge_titles(edges));

        }
      ),
      { numRuns: RUNS }
    );

  });

});
