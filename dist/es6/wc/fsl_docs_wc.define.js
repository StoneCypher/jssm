import { FslDocs } from './fsl_docs_wc.js';
import { define_canonical } from './wc_tag_helpers.js';
// New component: canonical `fsl-*` only, no deprecated `jssm-*` synonym.
define_canonical('fsl-docs', FslDocs);
export { FslDocs };
