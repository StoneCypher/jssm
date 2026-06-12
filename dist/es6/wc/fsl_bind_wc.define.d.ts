import { FslBind } from './fsl_bind_wc.js';
/** Thin subclass so `<jssm-bind>` registers under a distinct constructor. */
declare class JssmBind extends FslBind {
}
declare global {
    interface HTMLElementTagNameMap {
        'jssm-bind': JssmBind;
    }
}
export { FslBind, JssmBind };
