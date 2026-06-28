import { FslDataInspector } from './fsl_data_inspector_wc.js';
import { define_canonical } from './wc_tag_helpers.js';

// New component: canonical `fsl-*` only, no deprecated `jssm-*` synonym.
define_canonical('fsl-data-inspector', FslDataInspector);

export { FslDataInspector };
