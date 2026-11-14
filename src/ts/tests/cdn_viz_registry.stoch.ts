/**
 * @vitest-environment jsdom
 */

import * as fc from 'fast-check';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { VizRenderProvider } from '../jssm_viz';

import { ring_plan_arb } from './stoch_helpers';





// Property-based coverage for the renderer registry that the self-contained
// CDN build (`jssm-viz/cdn/viz`) exports.  Each run registers a renderer under
// a random name through the BUILT CDN module's exports, then checks that an
// <fsl-viz> defined by that same module draws a random machine with it,
// selected either by FSL `graph_renderer` or by the `provider` attribute.
// The CDN file inlines its own copy of jssm-viz, so this holds only if the
// exported registry is the one its element reads.



const RUNS = 25;

/** The CDN module's registry exports this suite drives. */
type CdnVizModule = {
  register_renderer   : (provider: VizRenderProvider) => void,
  unregister_renderer : (name: string) => boolean
};

const cdn_path = resolve(__dirname, '../../../packages/jssm-viz/dist/cdn/viz.js');

/**
 * Loads the built CDN module.  ES modules are cached, so every call returns
 * the same module instance, and so the same registry and element.
 * @returns The CDN module's exports.
 * @throws {Error} when the bundle has not been built (run `npm run make`).
 */
async function load_cdn(): Promise<CdnVizModule> {
  if (!existsSync(cdn_path)) { throw new Error(`build ${cdn_path} first (npm run make)`); }
  return await import(cdn_path) as CdnVizModule;
}

/** A random renderer name and the FSL that spells it: bareword when it can be one, quoted otherwise. */
const name_and_spelling_arb: fc.Arbitrary<{ name: string, spelling: string }> = fc.oneof(
  fc.tuple(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'.split('')),
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), { maxLength: 10 })
  ).map(([first, rest]) => { const name = `c_${first}${rest.join('')}`; return { name, spelling: name }; }),
  fc.array(fc.constantFrom(...'abcxyz09 -.:'.split('')), { minLength: 1, maxLength: 12 })
    .map(chars => { const name = `cdn ${chars.join('')}`; return { name, spelling: `"${name}"` }; })
);

/**
 * Mounts an <fsl-viz> from the CDN module and waits for the stamp renderer's
 * output to appear in its shadow root.
 * @param fsl      The chart's FSL source.
 * @param provider The `provider` attribute to set, or `undefined` for none.
 * @returns The state names the renderer drew, in the order it listed them.
 */
async function drawn_states(fsl: string, provider: string | undefined): Promise<string[]> {
  const el = document.createElement('fsl-viz');
  if (provider !== undefined) { el.setAttribute('provider', provider); }
  el.setAttribute('fsl', fsl);
  document.body.append(el);
  const read = (): string | undefined => el.shadowRoot?.querySelector<SVGElement>('[data-cdn-states]')?.dataset.cdnStates;
  await vi.waitFor(() => { expect(read()).toBeTypeOf('string'); }, { timeout: 10_000 });
  const drawn = read() ?? '';
  el.remove();
  return drawn.split('|');
}



describe('jssm-viz/cdn/viz: a renderer registered through its exports draws its <fsl-viz>', () => {

  test('random names, selected by graph_renderer or by the provider attribute, draw random machines', async () => {

    const cdn = await load_cdn();

    await fc.assert(
      fc.asyncProperty(
        ring_plan_arb,
        name_and_spelling_arb,
        fc.boolean(),
        async ({ names, fsl }, { name, spelling }, by_attribute) => {

          cdn.register_renderer({
            name,
            render: context => `<svg data-cdn-states="${context.machine.states().join('|')}"></svg>`
          });

          try {
            const source = by_attribute ? `graph_renderer: tonal; ${fsl}` : `graph_renderer: ${spelling}; ${fsl}`;
            const drawn  = await drawn_states(source, by_attribute ? name : undefined);
            expect(drawn).toHaveLength(names.length);
            expect(new Set(drawn)).toEqual(new Set(names));
          } finally {
            expect(cdn.unregister_renderer(name)).toBe(true);
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});
