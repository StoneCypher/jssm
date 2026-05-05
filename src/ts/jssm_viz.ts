
import * as jssm                 from './jssm';
import { JssmError }              from './jssm_error';
import { version, build_time }    from './version';

import type { Viz }               from '@viz-js/viz';

// default_viz_colors will be imported by Task 4-6 when rendering functions are added.




/**
 *  Cached resolved viz.js instance.  Populated on first call to
 *  {@link get_viz}; later calls reuse it directly.  Internal.
 */
let viz_instance: Viz | null = null;

/**
 *  DOM parser injected via {@link configure} for environments without a
 *  global `DOMParser` (e.g. Node).  Internal.
 */
let injected_dom_parser: typeof globalThis.DOMParser | null = null;




/**
 *  Returns a cached @viz-js/viz instance, lazily instantiated on first call.
 *  Internal helper for the rendering functions.
 *
 *  @internal
 */
async function get_viz(): Promise<Viz> {

  if (viz_instance === null) {
    const mod = await import('@viz-js/viz');
    viz_instance = await mod.instance();
  }

  return viz_instance;

}




/**
 *  Inject runtime configuration for jssm/viz.  Currently only accepts a
 *  custom `DOMParser` constructor for use by `*_svg_element` functions in
 *  environments that do not provide one globally (e.g. Node + jsdom).
 *
 *  Idempotent — last call wins.  No-op if called with no recognized keys.
 *
 *  ```typescript
 *  // Node, with jsdom:
 *  import { JSDOM } from 'jsdom';
 *  import { configure, fsl_to_svg_element } from 'jssm/viz';
 *
 *  configure({ DOMParser: new JSDOM().window.DOMParser });
 *  const el = await fsl_to_svg_element('a -> b;');
 *  ```
 *
 *  @param opts Configuration overrides.
 *  @param opts.DOMParser Constructor compatible with the WHATWG `DOMParser`
 *  interface.  Used as a fallback when `globalThis.DOMParser` is undefined.
 *
 *  @throws {JssmError} if `DOMParser` is provided and is not a constructor.
 */
function configure(opts: { DOMParser?: typeof globalThis.DOMParser }): void {

  if (opts.DOMParser !== undefined) {
    if (typeof opts.DOMParser !== 'function') {
      throw new JssmError(undefined,
        'jssm/viz: configure({ DOMParser }) — value must be a constructor');
    }
    injected_dom_parser = opts.DOMParser;
  }

}




export {
  configure,
  version, build_time
};
