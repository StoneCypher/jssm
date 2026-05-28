import { JssmBind } from './jssm_bind_wc.js';

if (!customElements.get('jssm-bind')) {
  customElements.define('jssm-bind', JssmBind);
}

export { JssmBind };
