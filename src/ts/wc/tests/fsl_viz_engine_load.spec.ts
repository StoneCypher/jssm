/**
 * @vitest-environment jsdom
 */

import '../fsl_instance_wc.define';
import type { FslViz } from '../fsl_viz_wc';
import type { FslInstance } from '../fsl_instance_wc';

// When the Graphviz engine (`@viz-js/viz`) cannot be loaded, <fsl-viz> used to
// show an empty element and say so only through a `viz-error` event, so a page
// that was not listening saw nothing at all.  StoneCypher/fsl#1990
//
// These tests replace only that external package and drive real elements
// through real renders.  "Once per page load" is module state, so every test
// starts a page of its own: a fresh module graph (`vi.resetModules`) whose
// FslViz is registered under a tag of its own.

/** What Chrome rejects `import('@viz-js/viz')` with when no import map covers it. */
const UNRESOLVED_SPECIFIER =
  'Failed to resolve module specifier "@viz-js/viz". Relative references must start with either "/", "./", or "../".';

/** What `@viz-js/viz` aborts with in Chrome when a Content-Security-Policy refuses its WebAssembly. */
const CSP_REFUSAL =
  'Aborted(CompileError: WebAssembly.instantiate(): Compiling or instantiating WebAssembly module violates '
  + `the following Content Security policy directive because 'unsafe-eval' is not an allowed source of script `
  + `in the following Content Security Policy directive: "script-src 'self' 'unsafe-inline'")`;

/** How many pages this file has started, so that each gets a tag name of its own. */
const pages = { started: 0 };

/**
 * Starts a fresh "page load": a new module graph whose `import('@viz-js/viz')`
 * is answered by `engine_module`, with that graph's FslViz registered under a
 * tag used by no other test.
 * @param engine_module - Stands in for the package: returns its exports, or
 *   throws to make the import itself fail.
 * @returns The tag name to create this page's viz elements with.
 */
async function load_page_with_engine(engine_module: () => object): Promise<string> {
  vi.resetModules();
  vi.doMock('@viz-js/viz', engine_module);
  const { FslViz: PageFslViz } = await import('../fsl_viz_wc');
  pages.started += 1;
  const tag = `fsl-viz-page-${pages.started}`;
  customElements.define(tag, class extends PageFslViz {});
  return tag;
}

/**
 * Resolves with the next `viz-error` an element dispatches.
 * @param el - The element to listen on.
 * @returns The event.
 */
function next_viz_error(el: Element): Promise<CustomEvent> {
  return new Promise(resolve => {
    el.addEventListener('viz-error', e => resolve(e as CustomEvent), { once: true });
  });
}

/**
 * Records what `console.error` is called with for the rest of the test, and
 * keeps it out of the test output.  `afterEach` puts the real one back.
 * @returns The spy standing in for `console.error`.
 */
function watch_console_error() {
  return vi.spyOn(console, 'error').mockImplementation(() => {});
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock('@viz-js/viz');
  document.body.replaceChildren();
});

describe('<fsl-viz> when the Graphviz engine cannot be imported', () => {

  it('reports it to the console once, however many elements and renders hit it', async () => {
    const console_error = watch_console_error();
    const tag           = await load_page_with_engine(() => { throw new TypeError(UNRESOLVED_SPECIFIER); });
    const first         = document.createElement(tag) as FslViz;
    const second        = document.createElement(tag) as FslViz;
    document.body.append(first, second);

    // One render at a time: the test runner's module stand-in is not honoured
    // by two overlapping `import()` calls, so the renders are kept in sequence.
    const events: CustomEvent[] = [];

    const first_failure = next_viz_error(first);
    first.fsl = 'Off -> On;';
    events.push(await first_failure);

    const second_failure = next_viz_error(second);
    second.fsl = 'Red -> Green;';
    events.push(await second_failure);

    // a later render of an element that has already failed
    const third_failure = next_viz_error(first);
    first.fsl = 'Off -> On -> Off;';
    events.push(await third_failure);

    expect(events.map(evt => evt.target)).toEqual([first, second, first]);
    expect(console_error).toHaveBeenCalledTimes(1);

    const reported = console_error.mock.calls[0]![0] as Error;
    expect(reported).toBeInstanceOf(Error);
    expect(reported.name).toBe('VizEngineLoadError');
    expect(reported.message).toContain('@viz-js/viz');
    expect(reported.message).toContain('import map');
    expect(reported.message).toContain(`'wasm-unsafe-eval'`);
  });

  it('still fires a bubbling, composed viz-error for every failed render, now naming the fix', async () => {
    watch_console_error();
    const tag = await load_page_with_engine(() => { throw new TypeError(UNRESOLVED_SPECIFIER); });
    const el  = document.createElement(tag) as FslViz;
    document.body.append(el);

    // heard at the document, so the event really does bubble out of the element
    const heard: Promise<CustomEvent> = new Promise(resolve => {
      document.addEventListener('viz-error', e => resolve(e as CustomEvent), { once: true });
    });
    el.fsl = 'Off -> On;';
    const evt = await heard;

    expect(evt.type).toBe('viz-error');
    expect(evt.target).toBe(el);
    expect(evt.bubbles).toBe(true);
    expect(evt.composed).toBe(true);
    expect(evt.detail.message).toContain('import map');
    expect(evt.detail.message).toContain(`'wasm-unsafe-eval'`);
    expect(evt.detail).toHaveProperty('location');
    expect(el.shadowRoot!.innerHTML).not.toContain('<svg');
  });

});

describe('<fsl-viz> when the Graphviz engine is refused by a Content-Security-Policy', () => {

  it('reports the refusal once, with the original error as its cause', async () => {
    const console_error = watch_console_error();
    const refusal       = new WebAssembly.RuntimeError(CSP_REFUSAL);   // the class emscripten aborts with
    const tag           = await load_page_with_engine(() => ({ instance: () => Promise.reject(refusal) }));
    const el            = document.createElement(tag) as FslViz;
    document.body.append(el);

    const failure = next_viz_error(el);
    el.fsl = 'Off -> On;';
    const evt = await failure;

    expect(evt.detail.message).toContain('Content-Security-Policy');
    expect(evt.detail.message).toContain(`'wasm-unsafe-eval'`);
    expect(evt.detail.message).toContain(CSP_REFUSAL);

    expect(console_error).toHaveBeenCalledTimes(1);
    const reported = console_error.mock.calls[0]![0] as Error & { cause?: unknown };
    expect(reported.name).toBe('VizEngineLoadError');
    expect(reported.cause).toBe(refusal);
    expect(reported.message).toBe(evt.detail.message);
  });

  it('reports a nested viz that renders its <fsl-instance> parent the same way, once', async () => {
    const console_error = watch_console_error();
    const refusal       = new WebAssembly.RuntimeError(CSP_REFUSAL);
    const tag           = await load_page_with_engine(() => ({ instance: () => Promise.reject(refusal) }));

    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', "Off 'flip' -> On 'flip' -> Off;");
    const viz = document.createElement(tag) as FslViz;
    host.append(viz);

    const first_failure = next_viz_error(viz);
    document.body.append(host);
    const evt = await first_failure;

    expect(evt.bubbles).toBe(true);
    expect(evt.composed).toBe(true);
    expect(evt.detail.message).toContain(`'wasm-unsafe-eval'`);

    // a transition re-renders the nested viz, which fails again
    const second_failure = next_viz_error(viz);
    host.do('flip');
    await second_failure;

    expect(console_error).toHaveBeenCalledTimes(1);
    expect((console_error.mock.calls[0]![0] as Error).name).toBe('VizEngineLoadError');
  });

});

describe('<fsl-viz> failures that are not the engine', () => {

  it('keeps an FSL syntax error event-only, so a live editor does not flood the console', async () => {
    const console_error = watch_console_error();
    const tag           = await load_page_with_engine(() => { throw new TypeError(UNRESOLVED_SPECIFIER); });
    const el            = document.createElement(tag) as FslViz;
    document.body.append(el);

    const failure = next_viz_error(el);
    el.fsl = 'this is not valid fsl !!!';
    const evt = await failure;

    expect(evt.detail.message.length).toBeGreaterThan(0);
    expect(evt.detail.message).not.toContain('@viz-js/viz');
    expect(console_error).not.toHaveBeenCalled();
  });

  it('still reports the engine after earlier syntax errors went unreported', async () => {
    const console_error = watch_console_error();
    const tag           = await load_page_with_engine(() => { throw new TypeError(UNRESOLVED_SPECIFIER); });
    const el            = document.createElement(tag) as FslViz;
    document.body.append(el);

    const syntax_failure = next_viz_error(el);
    el.fsl = 'this is not valid fsl !!!';
    await syntax_failure;
    expect(console_error).not.toHaveBeenCalled();

    const engine_failure = next_viz_error(el);
    el.fsl = 'Off -> On;';
    await engine_failure;
    expect(console_error).toHaveBeenCalledTimes(1);
  });

});
