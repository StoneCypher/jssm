import { JssmViz } from './jssm_viz_wc.js';
/**
 * Empty subclass that allows the same class to be registered under a
 * second tag name. `customElements.define` requires a distinct constructor
 * per tag, so the only portable way to publish `<fsl-viz>` as a synonym
 * for `<jssm-viz>` is to register a no-op subclass.
 *
 * Both tags render identically; `<fsl-viz>` is provided as an alternative
 * spelling for users whose mental model is "FSL viz" rather than "jssm
 * viz".
 *
 * TODO: parent-context binding from #647 Stage 2 lands once #648 exists.
 */
declare class FslViz extends JssmViz {
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-viz': FslViz;
    }
}
export { JssmViz, FslViz };
