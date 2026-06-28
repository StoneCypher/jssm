// Demo bundle entry: registers the whole fsl-* widget suite. We register here
// (rather than importing the *.define modules) because the package marks those
// side-effect free, so a bare import gets tree-shaken away.
import { FslInstance }      from '../../src/ts/wc/fsl_instance_wc.js';
import { FslViz }           from '../../src/ts/wc/fsl_viz_wc.js';
import { FslEditor }        from '../../src/ts/wc/fsl_editor_wc.js';
import { FslToolbar }       from '../../src/ts/wc/fsl_toolbar_wc.js';
import { FslActions }       from '../../src/ts/wc/fsl_actions_wc.js';
import { FslFooter }        from '../../src/ts/wc/fsl_footer_wc.js';
import { FslHelp }          from '../../src/ts/wc/fsl_help_wc.js';
import { FslHistory }       from '../../src/ts/wc/fsl_history_wc.js';
import { FslDataInspector } from '../../src/ts/wc/fsl_data_inspector_wc.js';
import { FslHookLog }       from '../../src/ts/wc/fsl_hook_log_wc.js';
import { FslSimulation }    from '../../src/ts/wc/fsl_simulation_wc.js';
import { FslExport }        from '../../src/ts/wc/fsl_export_wc.js';

const REGISTRY: ReadonlyArray<readonly [string, CustomElementConstructor]> = [
  ['fsl-instance',       FslInstance],
  ['fsl-viz',            FslViz],
  ['fsl-editor',         FslEditor],
  ['fsl-toolbar',        FslToolbar],
  ['fsl-actions',        FslActions],
  ['fsl-footer',         FslFooter],
  ['fsl-help',           FslHelp],
  ['fsl-history',        FslHistory],
  ['fsl-data-inspector', FslDataInspector],
  ['fsl-hook-log',       FslHookLog],
  ['fsl-simulation',     FslSimulation],
  ['fsl-export',         FslExport],
];
for (const [tag, ctor] of REGISTRY) {
  if (!customElements.get(tag)) { customElements.define(tag, ctor); }
}

// Re-export the language service so the demo can flag invalid edits in its
// status line (the host keeps the last good machine, so the editor is the
// source of truth for "is the current text valid").
export { fslDiagnostics } from '../../src/ts/language_service/index.js';
