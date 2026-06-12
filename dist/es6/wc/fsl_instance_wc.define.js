import { FslInstance } from './fsl_instance_wc.js';
import { define_with_synonym } from './wc_tag_helpers.js';
/** Thin subclass so `<jssm-instance>` registers under a distinct constructor. */
class JssmInstance extends FslInstance {
}
define_with_synonym('fsl-instance', 'jssm-instance', FslInstance, JssmInstance);
export { FslInstance, JssmInstance };
