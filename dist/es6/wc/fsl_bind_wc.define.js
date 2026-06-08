import { FslBind } from './fsl_bind_wc.js';
import { define_with_synonym } from './wc_tag_helpers.js';
/** Thin subclass so `<jssm-bind>` registers under a distinct constructor. */
class JssmBind extends FslBind {
}
define_with_synonym('fsl-bind', 'jssm-bind', FslBind, JssmBind);
export { FslBind, JssmBind };
