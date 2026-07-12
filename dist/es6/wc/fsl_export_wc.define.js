import { FslExport } from './fsl_export_wc.js';
import { define_canonical } from './wc_tag_helpers.js';
// New component: canonical `fsl-*` only, no deprecated `jssm-*` synonym.
define_canonical('fsl-export', FslExport);
export { FslExport } from './fsl_export_wc.js';
