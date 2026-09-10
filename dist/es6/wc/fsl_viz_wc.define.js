import { FslViz } from './fsl_viz_wc.js';
import { define_canonical } from './wc_tag_helpers.js';
// The retired synonym tag and its class alias were removed in 6.0; the
// only spelling is `<fsl-viz>` / {@link FslViz}.
define_canonical('fsl-viz', FslViz);
export { FslViz } from './fsl_viz_wc.js';
