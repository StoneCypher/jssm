import { JssmInstance } from './instance.js';
export { JssmInstance } from './instance.js';

if (!customElements.get('jssm-instance')) {
    customElements.define('jssm-instance', JssmInstance);
}
