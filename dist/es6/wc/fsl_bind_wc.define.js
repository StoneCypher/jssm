import { FslBind } from './fsl_bind_wc.js';
import { define_with_synonym } from './wc_tag_helpers.js';
/**
 * Thin subclass so `<jssm-bind>` registers under a distinct constructor.
 *
 * @deprecated The `jssm-*` tag and the `JssmBind` class alias are deprecated
 * since v5 in favor of the canonical `<fsl-bind>` / {@link FslBind}, for
 * fsl.tools brand alignment. They remain functional but are slated for
 * removal in v6 (tracked in `v6_breaking_changes.json` on the `v6` branch).
 * New components are `fsl-*`-only.
 */
class JssmBind extends FslBind {
}
define_with_synonym('fsl-bind', 'jssm-bind', FslBind, JssmBind);
export { FslBind, JssmBind };
