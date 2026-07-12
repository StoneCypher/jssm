import { FslToolbar, FslActions, FslFooter, FslHelp, FslHistory, FslDataInspector, FslHookLog, FslSimulation, FslExport, FslStochastic } from './widgets.js';
export * from './widgets.js';

/**
 * Shared helpers for the dual-prefix (`fsl-` canonical, `jssm-` synonym)
 * web-component naming convention.  Centralizes the "match either prefix"
 * rule so it lives in exactly one place.
 */
/**
 * Returns true when `tag_name` is exactly `fsl-<suffix>` or `jssm-<suffix>`
 * (case-insensitive).
 * @param tag_name - The element tag name to test (e.g. `"FSL-VIZ"`, `"jssm-viz"`).
 * @param suffix   - The suffix to match after the prefix (e.g. `"viz"`).
 * @returns `true` when `tag_name` is `fsl-<suffix>` or `jssm-<suffix>`.
 * @example
 * wc_suffix_matches('FSL-VIZ', 'viz');   // true
 * wc_suffix_matches('jssm-viz', 'viz');  // true
 * wc_suffix_matches('div', 'viz');       // false
 * wc_suffix_matches('fsl-vizard', 'viz'); // false — suffix must match exactly
 */
/**
 * Registers a single canonical `fsl-*` custom-element tag, with no `jssm-*`
 * synonym.
 *
 * This is the registration path for **new** web components.  The `jssm-*`
 * prefix is a deprecated backward-compatibility alias retained only for the
 * components that shipped under that name (`<jssm-viz>`, `<jssm-instance>`,
 * `<jssm-bind>`); new components are `fsl-*`-only for fsl.tools brand
 * alignment, and the legacy synonyms are slated for removal in v6.  Use
 * {@link define_with_synonym} only when maintaining one of those pre-existing
 * dual-named components.
 *
 * Idempotent: skips the `define` call when the tag is already registered.
 * @param canonical_tag - The `fsl-*` tag name (e.g. `"fsl-info-panel"`).
 * @param CanonicalClass - Constructor to register under `canonical_tag`.
 * @example
 * class FslInfoPanel extends HTMLElement {}
 * define_canonical('fsl-info-panel', FslInfoPanel);
 * @see define_with_synonym
 */
function define_canonical(canonical_tag, CanonicalClass) {
    if (!customElements.get(canonical_tag))
        customElements.define(canonical_tag, CanonicalClass);
}

/**
 * Bundle entry: registers the entire light fsl-* widget suite (toolbar, actions,
 * footer, help, history, data-inspector, hook-log, simulation, export, stochastic) in one import.
 * Canonical `fsl-*` tags only — no deprecated `jssm-*` synonyms. Registration
 * is idempotent, so this composes safely with the per-widget `*.define` modules.
 */
define_canonical('fsl-toolbar', FslToolbar);
define_canonical('fsl-actions', FslActions);
define_canonical('fsl-footer', FslFooter);
define_canonical('fsl-help', FslHelp);
define_canonical('fsl-history', FslHistory);
define_canonical('fsl-data-inspector', FslDataInspector);
define_canonical('fsl-hook-log', FslHookLog);
define_canonical('fsl-simulation', FslSimulation);
define_canonical('fsl-export', FslExport);
define_canonical('fsl-stochastic', FslStochastic);
