// Demo bundle entry: registers the real <fsl-instance> host plus the
// <fsl-editor> and <fsl-viz> panels it composes. We register here (rather than
// importing the *.define modules) because the package marks those side-effect
// free, so a bare import gets tree-shaken away.
import { FslEditor }   from '../../src/ts/wc/fsl_editor_wc.js';
import { FslViz }      from '../../src/ts/wc/fsl_viz_wc.js';
import { FslInstance } from '../../src/ts/wc/fsl_instance_wc.js';

if (!customElements.get('fsl-editor'))   { customElements.define('fsl-editor',   FslEditor); }
if (!customElements.get('fsl-viz'))      { customElements.define('fsl-viz',      FslViz); }
if (!customElements.get('fsl-instance')) { customElements.define('fsl-instance', FslInstance); }

// Re-export the language service so the demo can flag invalid edits in its
// status line (the host keeps the last good machine, so the editor is the
// source of truth for "is the current text valid").
export { fslDiagnostics } from '../../src/ts/language_service/index.js';
