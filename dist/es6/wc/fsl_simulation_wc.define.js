import { FslSimulation } from './fsl_simulation_wc.js';
import { define_canonical } from './wc_tag_helpers.js';
// New component: canonical `fsl-*` only, no deprecated `jssm-*` synonym.
define_canonical('fsl-simulation', FslSimulation);
export { FslSimulation } from './fsl_simulation_wc.js';
