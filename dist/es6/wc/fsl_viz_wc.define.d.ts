import { FslViz } from './fsl_viz_wc.js';
/** Thin subclass so `<jssm-viz>` registers under a distinct constructor. */
declare class JssmViz extends FslViz {
}
declare global {
    interface HTMLElementTagNameMap {
        'jssm-viz': JssmViz;
    }
}
export { FslViz, JssmViz };
