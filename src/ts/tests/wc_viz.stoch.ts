/**
 * @vitest-environment jsdom
 */

import * as fc from 'fast-check';

import '../wc/fsl_viz_wc.define';
import type { FslViz } from '../wc/fsl_viz_wc';

import { chain_plan_arb } from './stoch_helpers';





// Property-based coverage for the <fsl-viz> standalone render path: real
// wasm SVG renders into the shadow root over random machines, and the
// viz-error event contract on malformed source.
//
// Renders are asynchronous; rather than fixed sleeps, tests poll the
// shadow root (or await the error event) with a hard timeout.



/**
 *  Polls until `predicate` returns true or the timeout elapses.
 *
 *  @param predicate   Checked every 25ms.
 *  @param timeout_ms  Hard cap before returning false.
 *  @returns           Whether the predicate turned true in time.
 */
async function eventually(predicate: () => boolean, timeout_ms = 10_000): Promise<boolean> {

  const deadline = Date.now() + timeout_ms;

  while (Date.now() < deadline) {
    if (predicate()) { return true; }
    await new Promise( resolve => setTimeout(resolve, 25) );
  }

  return predicate();

}





describe('FslViz standalone rendering', () => {

  test('random machines render an SVG naming every constructed state', async () => {

    await fc.assert(
      fc.asyncProperty(
        chain_plan_arb,
        async ({ names, fsl }) => {

          const el = document.createElement('fsl-viz') as FslViz;
          document.body.appendChild(el);

          try {

            el.fsl = fsl;

            const rendered = await eventually( () =>
              (el.shadowRoot?.innerHTML ?? '').includes('<svg') );

            expect(rendered).toBe(true);

            const tree_html = el.shadowRoot!.innerHTML;
            for (const name of names) {
              expect(tree_html).toContain(name);
            }

          } finally {
            document.body.removeChild(el);
          }

        }
      ),
      { numRuns: 6 }
    );

  });

  test('malformed source fires a bubbling, composed viz-error with a message', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.stringOf(fc.constantFrom(...'!%()[]{}'.split('')), { minLength: 3, maxLength: 10 }),
        async (junk) => {

          const el = document.createElement('fsl-viz') as FslViz;
          document.body.appendChild(el);

          try {

            const error_event = new Promise<CustomEvent>( resolve => {
              el.addEventListener('viz-error', e => resolve(e as CustomEvent), { once: true });
            });

            el.fsl = `machine ${junk} machine`;

            const evt = await error_event;

            expect(evt.bubbles).toBe(true);
            expect(evt.composed).toBe(true);
            expect(typeof evt.detail.message).toBe('string');
            expect(evt.detail.message.length).toBeGreaterThan(0);

          } finally {
            document.body.removeChild(el);
          }

        }
      ),
      { numRuns: 8 }
    );

  });

});
