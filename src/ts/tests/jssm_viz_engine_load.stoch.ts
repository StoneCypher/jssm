
import * as fc from 'fast-check';

import type * as JssmViz from '../jssm_viz';





// Property-based coverage for what jssm_viz tells its caller when the
// Graphviz engine (`@viz-js/viz`) cannot be loaded.  StoneCypher/fsl#1990
//
// The engine can abort with anything at all, so the properties throw
// arbitrary values at the failure path: the caller must always get a
// VizEngineLoadError that still names the fix and still carries, untouched,
// whatever was thrown.  Only the external package is replaced; the error is
// built by jssm_viz's own code.



/** Every thrown value fast-check can think of, including ones with no string form. */
const thrown_arb = fc.anything({ withNullPrototype: true, withBigInt: true, withMap: true, withSet: true });

const DOT = 'digraph G { a -> b; }';



/**
 *  Settles a promise that is expected to reject, and hands back what it
 *  rejected with so a property can make several assertions about it.
 *  @param doomed  The promise that should reject.
 *  @returns       The rejection value.
 */
async function rejection_of(doomed: Promise<unknown>): Promise<any> {
  try           { await doomed; }
  catch (error) { return error; }
  throw new Error('expected a rejection, but the promise resolved');
}





describe('VizEngineLoadError', () => {

  let jv     : typeof JssmViz;
  let thrown : unknown;

  beforeAll( async () => {

    // one fresh jssm_viz for the file: its engine never starts, because the
    // stand-in's instance() rejects with whatever the current run chose
    vi.resetModules();
    vi.doMock('@viz-js/viz', () => ({ instance: () => Promise.reject(thrown) }));
    jv = await import('../jssm_viz');

  });

  afterAll( () => { vi.doUnmock('@viz-js/viz'); } );

  test('whatever the engine start rejects with is kept as the cause, under a message that still names the fix', async () => {

    await fc.assert(
      fc.asyncProperty(
        thrown_arb,
        async (value) => {

          thrown = value;

          const err = await rejection_of( jv.dot_to_svg(DOT) );

          expect(err).toBeInstanceOf(jv.VizEngineLoadError);
          expect(err.name).toBe('VizEngineLoadError');
          expect(err.stage).toBe('instantiate');
          expect(Object.is(err.cause, value)).toBe(true);

          expect(err.message).toContain('@viz-js/viz');
          expect(err.message).toContain('Content-Security-Policy');
          expect(err.message).toContain(`'wasm-unsafe-eval'`);

        }
      ),
      { numRuns: 100 }
    );

  });

  test('a thrown Error or string is quoted in the message at either stage, after the remedy', () => {

    fc.assert(
      fc.property(
        fc.constantFrom('import' as const, 'instantiate' as const),
        fc.string({ minLength: 1 }),
        fc.boolean(),
        (stage, text, as_error) => {

          const cause = as_error ? new Error(text) : text;
          const err   = new jv.VizEngineLoadError(stage, cause);

          expect(err.stage).toBe(stage);
          expect(err.cause).toBe(cause);

          // both stages name the package, the import map, and the directive
          expect(err.message).toContain('@viz-js/viz');
          expect(err.message).toContain('import map');
          expect(err.message).toContain(`'wasm-unsafe-eval'`);

          // the thrown text comes last, so a long browser error cannot bury the remedy
          expect(err.message.endsWith(text)).toBe(true);
          expect(err.message.indexOf(`'wasm-unsafe-eval'`)).toBeLessThan(err.message.length - text.length);

        }
      ),
      { numRuns: 200 }
    );

  });

});
