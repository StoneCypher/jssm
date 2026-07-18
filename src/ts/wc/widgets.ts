/**
 * Bundle entry: the light (CodeMirror-free) fsl-* widget suite as a single
 * module. Re-exports every chrome/panel widget class so a bundler consumer can
 * `import { FslToolbar, … } from 'jssm/wc/widgets'`. For tag registration use
 * the sibling `widgets.define` entry (or the per-widget `*.define` modules).
 * @see FslToolbar
 */
export { FslToolbar }       from './fsl_toolbar_wc.js';
export { FslActions }       from './fsl_actions_wc.js';
export { FslFooter }        from './fsl_footer_wc.js';
export { FslHelp }          from './fsl_help_wc.js';
export { FslHistory }       from './fsl_history_wc.js';
export { FslDataInspector } from './fsl_data_inspector_wc.js';
export { FslHookLog }       from './fsl_hook_log_wc.js';
export { FslSimulation }    from './fsl_simulation_wc.js';
export { FslExport }        from './fsl_export_wc.js';
export { FslStochastic }    from './fsl_stochastic_wc.js';
export { FslInfoPanel }     from './fsl_info_panel_wc.js';
