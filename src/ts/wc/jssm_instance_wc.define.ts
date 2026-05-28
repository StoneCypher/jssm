import { JssmInstance } from './jssm_instance_wc.js';

if (!customElements.get('jssm-instance')) {
  customElements.define('jssm-instance', JssmInstance);
}

export { JssmInstance };
