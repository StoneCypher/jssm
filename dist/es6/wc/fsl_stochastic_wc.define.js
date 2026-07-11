import { FslStochastic } from './fsl_stochastic_wc.js';
import { define_canonical } from './wc_tag_helpers.js';
// New component: canonical `fsl-*` only, no deprecated `jssm-*` synonym.
define_canonical('fsl-stochastic', FslStochastic);
export { FslStochastic } from './fsl_stochastic_wc.js';
