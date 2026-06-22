import { FslInstance } from './fsl_instance_wc.js';
/** Thin subclass so `<jssm-instance>` registers under a distinct constructor. */
declare class JssmInstance extends FslInstance {
}
declare global {
    interface HTMLElementTagNameMap {
        'jssm-instance': JssmInstance;
    }
}
export { FslInstance, JssmInstance };
