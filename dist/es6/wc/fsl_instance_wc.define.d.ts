import { FslInstance } from './fsl_instance_wc.js';
/**
 * Thin subclass so `<jssm-instance>` registers under a distinct constructor.
 * @deprecated The `jssm-*` tag and the `JssmInstance` class alias are
 * deprecated since v5 in favor of the canonical `<fsl-instance>` /
 * {@link FslInstance}, for fsl.tools brand alignment. They remain functional
 * but are slated for removal in v6 (tracked in `v6_breaking_changes.json` on
 * the `v6` branch). New components are `fsl-*`-only.
 */
declare class JssmInstance extends FslInstance {
}
declare global {
    interface HTMLElementTagNameMap {
        /** @deprecated Use `'fsl-instance'`; the `jssm-instance` alias is removed in v6. */
        'jssm-instance': JssmInstance;
    }
}
export { JssmInstance };
export { FslInstance } from './fsl_instance_wc.js';
