import { FslViz } from './fsl_viz_wc.js';
/**
 * Thin subclass so `<jssm-viz>` registers under a distinct constructor.
 *
 * @deprecated The `jssm-*` tag and the `JssmViz` class alias are deprecated
 * since v5 in favor of the canonical `<fsl-viz>` / {@link FslViz}, for
 * fsl.tools brand alignment. They remain functional but are slated for
 * removal in v6 (tracked in `v6_breaking_changes.json` on the `v6` branch).
 * New components are `fsl-*`-only.
 */
declare class JssmViz extends FslViz {
}
declare global {
    interface HTMLElementTagNameMap {
        /** @deprecated Use `'fsl-viz'`; the `jssm-viz` alias is removed in v6. */
        'jssm-viz': JssmViz;
    }
}
export { FslViz, JssmViz };
