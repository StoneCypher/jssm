// Demo bundle entry: registers <fsl-editor> and the live renderer <fsl-viz>.
// We register here (rather than importing the *.define modules) because the
// package marks those as side-effect-free, so a bare import gets tree-shaken.
import { FslEditor } from '../../src/ts/wc/fsl_editor_wc.js';
import { FslViz }    from '../../src/ts/wc/fsl_viz_wc.js';

if (!customElements.get('fsl-editor')) { customElements.define('fsl-editor', FslEditor); }
if (!customElements.get('fsl-viz'))    { customElements.define('fsl-viz',    FslViz); }
