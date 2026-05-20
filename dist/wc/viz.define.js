import { JssmViz } from './viz.js';
export { JssmViz } from './viz.js';

if (!customElements.get('jssm-viz')) {
    customElements.define('jssm-viz', JssmViz);
}
