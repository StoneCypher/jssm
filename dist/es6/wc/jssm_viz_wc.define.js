import { JssmViz } from './jssm_viz_wc.js';
if (!customElements.get('jssm-viz')) {
    customElements.define('jssm-viz', JssmViz);
}
export { JssmViz };
