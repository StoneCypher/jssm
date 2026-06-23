import { FslBind } from './fsl_bind_wc.js';
/**
 * Thin subclass so `<jssm-bind>` registers under a distinct constructor.
 *
 * @deprecated The `jssm-*` tag and the `JssmBind` class alias are deprecated
 * since v5 in favor of the canonical `<fsl-bind>` / {@link FslBind}, for
 * fsl.tools brand alignment. They remain functional but are slated for
 * removal in v6 (tracked in `v6_breaking_changes.json` on the `v6` branch).
 * New components are `fsl-*`-only.
 */
declare class JssmBind extends FslBind {
}
declare global {
    interface HTMLElementTagNameMap {
        /** @deprecated Use `'fsl-bind'`; the `jssm-bind` alias is removed in v6. */
        'jssm-bind': JssmBind;
    }
}
export { FslBind, JssmBind };
