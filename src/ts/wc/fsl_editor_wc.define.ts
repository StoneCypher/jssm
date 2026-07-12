import { FslEditor } from './fsl_editor_wc.js';
import { define_canonical } from './wc_tag_helpers.js';

// New component: canonical `fsl-*` only, no deprecated `jssm-*` synonym.
define_canonical('fsl-editor', FslEditor);



export {FslEditor} from './fsl_editor_wc.js';