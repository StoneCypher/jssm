import { FslInstance } from './fsl_instance_wc.js';
import { define_canonical } from './wc_tag_helpers.js';

// The retired synonym tag and its class alias were removed in 6.0; the
// only spelling is `<fsl-instance>` / {@link FslInstance}.
define_canonical('fsl-instance', FslInstance);

export { FslInstance } from './fsl_instance_wc.js';
