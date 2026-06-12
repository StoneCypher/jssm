import { FslViz } from './fsl_viz_wc.js';
import { define_with_synonym } from './wc_tag_helpers.js';
/** Thin subclass so `<jssm-viz>` registers under a distinct constructor. */
class JssmViz extends FslViz {
}
define_with_synonym('fsl-viz', 'jssm-viz', FslViz, JssmViz);
export { FslViz, JssmViz };
