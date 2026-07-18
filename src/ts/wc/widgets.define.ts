/**
 * Bundle entry: registers the entire light fsl-* widget suite (toolbar, actions,
 * footer, help, history, data-inspector, hook-log, simulation, export, stochastic,
 * info-panel) in one import.
 * Canonical `fsl-*` tags only — no deprecated `jssm-*` synonyms. Registration
 * is idempotent, so this composes safely with the per-widget `*.define` modules.
 */
import { define_canonical } from './wc_tag_helpers.js';
import {
  FslToolbar, FslActions, FslFooter, FslHelp, FslHistory,
  FslDataInspector, FslHookLog, FslSimulation, FslExport, FslStochastic,
  FslInfoPanel,
} from './widgets.js';

define_canonical('fsl-toolbar',        FslToolbar);
define_canonical('fsl-actions',        FslActions);
define_canonical('fsl-footer',         FslFooter);
define_canonical('fsl-help',           FslHelp);
define_canonical('fsl-history',        FslHistory);
define_canonical('fsl-data-inspector', FslDataInspector);
define_canonical('fsl-hook-log',       FslHookLog);
define_canonical('fsl-simulation',     FslSimulation);
define_canonical('fsl-export',         FslExport);
define_canonical('fsl-stochastic',     FslStochastic);
define_canonical('fsl-info-panel',     FslInfoPanel);

export * from './widgets.js';
