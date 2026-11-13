
import type * as JssmViz from '../jssm_viz';





// The Graphviz engine, `@viz-js/viz`, is a WebAssembly build that jssm_viz
// imports lazily on the first SVG render.  A browser page hits two different
// walls there — the bare specifier does not resolve without an import map,
// and a Content-Security-Policy without 'wasm-unsafe-eval' refuses to compile
// the WebAssembly — and both used to reach the caller as whatever the browser
// threw, with no hint of the cause or the fix.  StoneCypher/fsl#1990
//
// These tests replace only that external package, never jssm's own code, to
// reproduce each wall and check what the caller is told.  Every test loads a
// fresh jssm_viz (`vi.resetModules`), because the module keeps a started
// engine, and an injected one, for its whole lifetime.



/** What Chrome rejects `import('@viz-js/viz')` with when no import map covers it. */
const UNRESOLVED_SPECIFIER =
  'Failed to resolve module specifier "@viz-js/viz". Relative references must start with either "/", "./", or "../".';

/** What `@viz-js/viz` aborts with in Chrome when a Content-Security-Policy refuses its WebAssembly. */
const CSP_REFUSAL =
  'Aborted(CompileError: WebAssembly.instantiate(): Compiling or instantiating WebAssembly module violates '
  + `the following Content Security policy directive because 'unsafe-eval' is not an allowed source of script `
  + `in the following Content Security Policy directive: "script-src 'self' 'unsafe-inline'")`;

const DOT = 'digraph G { a -> b; }';



/**
 *  Loads a fresh copy of jssm_viz whose `import('@viz-js/viz')` is answered
 *  by `engine_module` instead of the real package.
 *  @param engine_module  Stands in for the package: returns its exports, or
 *                        throws to make the import itself fail.
 *  @returns              The freshly loaded jssm_viz module.
 */
async function viz_with_engine(engine_module: () => object): Promise<typeof JssmViz> {
  vi.doMock('@viz-js/viz', engine_module);
  return import('../jssm_viz');
}



/**
 *  Settles a promise that is expected to reject, and hands back what it
 *  rejected with so a test can make several assertions about one failure.
 *  @param doomed  The promise that should reject.
 *  @returns       The rejection value.
 */
async function rejection_of(doomed: Promise<unknown>): Promise<any> {
  try           { await doomed; }
  catch (error) { return error; }
  throw new Error('expected a rejection, but the promise resolved');
}



/**
 *  Every `cause` reachable from an error, nearest first.
 *  @param e  The error to walk.
 *  @returns  The chain of causes; empty when there is none.
 */
function cause_chain(e: any): unknown[] {
  const chain: unknown[] = [];
  let link: any = e?.cause;
  while (link !== undefined && link !== null && !chain.includes(link)) {
    chain.push(link);
    link = link.cause;
  }
  return chain;
}





beforeEach( () => { vi.resetModules(); } );
afterEach(  () => { vi.doUnmock('@viz-js/viz'); } );





describe('when @viz-js/viz cannot be imported', () => {

  test('the render rejects with an error naming the import map and the CSP directive', async () => {

    const jv  = await viz_with_engine( () => { throw new TypeError(UNRESOLVED_SPECIFIER); } );
    const err = await rejection_of( jv.fsl_to_svg_string('a -> b;') );

    expect(err.message).toContain('@viz-js/viz');
    expect(err.message).toContain('import map');
    expect(err.message).toContain('bundler');
    expect(err.message).toContain('Content-Security-Policy');
    expect(err.message).toContain(`'wasm-unsafe-eval'`);

  });

  test('the error is a VizEngineLoadError at the import stage', async () => {

    const jv     = await viz_with_engine( () => { throw new TypeError(UNRESOLVED_SPECIFIER); } );
    const { sm } = await import('../jssm');
    const err    = await rejection_of( jv.machine_to_svg_string(sm`a -> b;`) );

    expect(err).toBeInstanceOf(jv.VizEngineLoadError);
    expect(err.name).toBe('VizEngineLoadError');
    expect(err.stage).toBe('import');

  });

  test('the tonal provider, which loads the same engine for its layout pass, rejects the same way', async () => {

    const jv  = await viz_with_engine( () => { throw new TypeError(UNRESOLVED_SPECIFIER); } );
    const err = await rejection_of( jv.fsl_to_svg_string('graph_layout: tonal; a -> b;') );

    expect(err).toBeInstanceOf(jv.VizEngineLoadError);
    expect(err.stage).toBe('import');
    expect(err.message).toContain('import map');

  });

  test('it is still a JssmError, like every other jssm_viz failure', async () => {

    const jv            = await viz_with_engine( () => { throw new TypeError(UNRESOLVED_SPECIFIER); } );
    const { JssmError } = await import('../jssm_error');
    const err           = await rejection_of( jv.dot_to_svg(DOT) );

    expect(err).toBeInstanceOf(JssmError);

  });

  test('the original failure is kept as the cause, and quoted in the message', async () => {

    const unresolved = new TypeError(UNRESOLVED_SPECIFIER);
    const jv         = await viz_with_engine( () => { throw unresolved; } );
    const err        = await rejection_of( jv.dot_to_svg(DOT) );

    // the test runner wraps a throwing module stand-in in an error of its own,
    // so the original is one link further down the chain than in a browser
    expect(cause_chain(err)).toContain(unresolved);
    expect(err.cause).toBeInstanceOf(Error);
    expect(err.message).toContain(err.cause.message);

  });

});





describe('when @viz-js/viz is imported but its WebAssembly will not start', () => {

  test('a rejected instance() becomes a VizEngineLoadError naming the CSP directive', async () => {

    const refusal = new WebAssembly.RuntimeError(CSP_REFUSAL);   // the class emscripten aborts with
    const jv      = await viz_with_engine( () => ({ instance: () => Promise.reject(refusal) }) );
    const err     = await rejection_of( jv.fsl_to_svg_string('a -> b;') );

    expect(err.message).toContain('@viz-js/viz');
    expect(err.message).toContain('Content-Security-Policy');
    expect(err.message).toContain(`'wasm-unsafe-eval'`);
    expect(err.message).toContain(CSP_REFUSAL);

    expect(err).toBeInstanceOf(jv.VizEngineLoadError);
    expect(err.stage).toBe('instantiate');
    expect(err.cause).toBe(refusal);

  });

  test('an instance() that throws synchronously is reported the same way', async () => {

    const boom = new Error('synchronous engine failure');
    const jv   = await viz_with_engine( () => ({ instance: () => { throw boom; } }) );
    const err  = await rejection_of( jv.dot_to_svg(DOT) );

    expect(err).toBeInstanceOf(jv.VizEngineLoadError);
    expect(err.stage).toBe('instantiate');
    expect(err.cause).toBe(boom);
    expect(err.message).toContain('synchronous engine failure');

  });

  test('a module with no instance() function is a failed start, not a failed import', async () => {

    // an import map that points at the wrong file resolves, but has no engine
    const jv  = await viz_with_engine( () => ({ instance: undefined }) );
    const err = await rejection_of( jv.dot_to_svg(DOT) );

    expect(err).toBeInstanceOf(jv.VizEngineLoadError);
    expect(err.stage).toBe('instantiate');
    expect(err.cause).toBeInstanceOf(TypeError);

  });

  test('a thrown value that is not an Error is kept as it is and quoted', async () => {

    const jv  = await viz_with_engine( () => ({ instance: () => Promise.reject('engine said no') }) );
    const err = await rejection_of( jv.dot_to_svg(DOT) );

    expect(err.cause).toBe('engine said no');
    expect(err.message).toContain('engine said no');

  });

  test('a thrown value that cannot be turned into text does not break the report', async () => {

    const untextable = Object.create(null);   // String() of this throws a TypeError
    const jv         = await viz_with_engine( () => ({ instance: () => Promise.reject(untextable) }) );
    const err        = await rejection_of( jv.dot_to_svg(DOT) );

    expect(err).toBeInstanceOf(jv.VizEngineLoadError);
    expect(err.cause).toBe(untextable);
    expect(err.message).toContain(`'wasm-unsafe-eval'`);

  });

});





describe('recovery and precedence', () => {

  test('a failed load is not remembered: the next render tries again, and a started engine is kept', async () => {

    const fake_engine = { renderString: () => '<svg data-fake="recovered"/>' };
    let   starts      = 0;

    const jv = await viz_with_engine( () => ({
      instance: () => {
        starts += 1;
        return (starts === 1) ? Promise.reject(new Error('first start fails')) : Promise.resolve(fake_engine);
      }
    }) );

    await expect(jv.dot_to_svg(DOT)).rejects.toBeInstanceOf(jv.VizEngineLoadError);
    await expect(jv.dot_to_svg(DOT)).resolves.toBe('<svg data-fake="recovered"/>');
    await expect(jv.dot_to_svg(DOT)).resolves.toBe('<svg data-fake="recovered"/>');

    expect(starts).toBe(2);

  });

  test('an injected engine is used without ever importing @viz-js/viz', async () => {

    let import_attempts = 0;

    const jv = await viz_with_engine( () => {
      import_attempts += 1;
      throw new TypeError(UNRESOLVED_SPECIFIER);
    } );

    jv.configure({ viz: { renderString: () => '<svg data-fake="injected"/>' } });

    await expect(jv.fsl_to_svg_string('a -> b;')).resolves.toBe('<svg data-fake="injected"/>');
    expect(import_attempts).toBe(0);

  });

});
