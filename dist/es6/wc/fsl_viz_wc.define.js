import { FslViz } from './fsl_viz_wc.js';
import { define_with_synonym } from './wc_tag_helpers.js';
/**
 * Thin subclass so `<jssm-viz>` registers under a distinct constructor.
 *
 * @deprecated The `jssm-*` tag and the `JssmViz` class alias are deprecated
 * since v5 in favor of the canonical `<fsl-viz>` / {@link FslViz}, for
 * fsl.tools brand alignment. They remain functional but are slated for
 * removal in v6 (tracked in `v6_breaking_changes.json` on the `v6` branch).
 * New components are `fsl-*`-only.
 */
class JssmViz extends FslViz {
}
define_with_synonym('fsl-viz', 'jssm-viz', FslViz, JssmViz);
export { FslViz, JssmViz };
