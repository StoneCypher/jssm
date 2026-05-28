import { JssmViz } from './jssm_viz_wc.js';

/**
 * Empty subclass that allows the same class to be registered under a
 * second tag name. `customElements.define` requires a distinct constructor
 * per tag, so the only portable way to publish `<fsl-viz>` as a synonym
 * for `<jssm-viz>` is to register a no-op subclass.
 *
 * Both tags render identically; `<fsl-viz>` is provided as an alternative
 * spelling for users whose mental model is "FSL viz" rather than "jssm
 * viz".  Parent-context binding for both tags lives on the shared
 * `JssmViz` base class (see {@link JssmViz}); the synonym inherits it
 * automatically.
 */
class FslViz extends JssmViz {}

if (!customElements.get('jssm-viz')) {
  customElements.define('jssm-viz', JssmViz);
}

if (!customElements.get('fsl-viz')) {
  customElements.define('fsl-viz', FslViz);
}

declare global {
  interface HTMLElementTagNameMap {
    'fsl-viz': FslViz;
  }
}

export { JssmViz, FslViz };
