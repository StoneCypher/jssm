import { FslBind } from './fsl_bind_wc.js';
import { define_canonical } from './wc_tag_helpers.js';

// The retired synonym tag and its class alias were removed in 6.0; the
// only spelling is `<fsl-bind>` / {@link FslBind}.
define_canonical('fsl-bind', FslBind);

export { FslBind } from './fsl_bind_wc.js';
