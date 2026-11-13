/**
 * @vitest-environment jsdom
 */

import * as fc from 'fast-check';

import type { FslViz } from '../wc/fsl_viz_wc';





// Property-based coverage for <fsl-viz>'s report of a Graphviz engine that
// cannot be loaded: over any number of elements and any order of renders on
// one page, every failed render still fires `viz-error`, and the console
// hears about it exactly once.  StoneCypher/fsl#1990
//
// Only the external `@viz-js/viz` package is replaced.  "Once per page load"
// is module state, so every run starts a page of its own: a fresh module
// graph whose FslViz is registered under a tag no other run uses.



/** How many pages this file has started, so that each gets a tag name of its own. */
const pages = { started: 0 };



/**
 *  Starts a fresh "page load" whose Graphviz engine is refused when it tries
 *  to start, the way a Content-Security-Policy refuses WebAssembly.
 *  @returns  The tag name to create this page's viz elements with.
 */
async function load_page_with_refused_engine(): Promise<string> {

  vi.resetModules();
  vi.doMock('@viz-js/viz', () => ({
    instance: () => Promise.reject(new WebAssembly.RuntimeError('Aborted(CompileError: WebAssembly.instantiate(): refused)'))
  }));

  const { FslViz: PageFslViz } = await import('../wc/fsl_viz_wc');

  pages.started += 1;
  const tag = `fsl-viz-stoch-page-${pages.started}`;
  customElements.define(tag, class extends PageFslViz {});

  return tag;

}



/**
 *  Resolves with the next `viz-error` to reach the document, which it can
 *  only do by bubbling out of the element and its shadow root.
 *  @returns  The event.
 */
function next_viz_error_at_document(): Promise<CustomEvent> {
  return new Promise( resolve => {
    document.addEventListener('viz-error', e => resolve(e as CustomEvent), { once: true });
  });
}





describe('FslViz with an engine that cannot be loaded', () => {

  afterEach( () => {
    vi.doUnmock('@viz-js/viz');
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  test('any sequence of renders over any number of elements: one viz-error each, one console.error in all', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 4 }),
        fc.array(fc.nat(), { minLength: 1, maxLength: 8 }),
        async (element_count, raw_plan) => {

          const console_error = vi.spyOn(console, 'error').mockImplementation(() => {});

          try {

            const tag      = await load_page_with_refused_engine();
            const elements = Array.from({ length: element_count }, () => document.createElement(tag) as FslViz);
            document.body.append(...elements);

            // which element renders at each step; renders are kept in sequence
            // because the test runner's module stand-in is not honoured by two
            // overlapping `import()` calls
            const plan = raw_plan.map( n => n % element_count );

            for (const [step, which] of plan.entries()) {

              const heard = next_viz_error_at_document();
              elements[which]!.fsl = `a${step} -> b${step};`;   // a new source each step, so every step renders
              const evt = await heard;

              expect(evt.target).toBe(elements[which]);
              expect(evt.bubbles).toBe(true);
              expect(evt.composed).toBe(true);
              expect(evt.detail.message).toContain(`'wasm-unsafe-eval'`);

            }

            expect(console_error).toHaveBeenCalledTimes(1);
            expect((console_error.mock.calls[0]![0] as Error).name).toBe('VizEngineLoadError');

          } finally {
            console_error.mockRestore();
            document.body.replaceChildren();
          }

        }
      ),
      { numRuns: 8 }
    );

  });

});
