import { FslViz } from './viz.js';
export { FslViz } from './viz.js';

/**
 * Shared helpers for the dual-prefix (`fsl-` canonical, `jssm-` synonym)
 * web-component naming convention.  Centralizes the "match either prefix"
 * rule so it lives in exactly one place.
 */
/**
 * Returns true when `tag_name` is exactly `fsl-<suffix>` or `jssm-<suffix>`
 * (case-insensitive).
 *
 * @param tag_name - The element tag name to test (e.g. `"FSL-VIZ"`, `"jssm-viz"`).
 * @param suffix   - The suffix to match after the prefix (e.g. `"viz"`).
 * @returns `true` when `tag_name` is `fsl-<suffix>` or `jssm-<suffix>`.
 *
 * @example
 * wc_suffix_matches('FSL-VIZ', 'viz');   // true
 * wc_suffix_matches('jssm-viz', 'viz');  // true
 * wc_suffix_matches('div', 'viz');       // false
 * wc_suffix_matches('fsl-vizard', 'viz'); // false — suffix must match exactly
 */
/**
 * Registers a canonical custom-element tag and its synonym tag.
 *
 * `customElements.define` requires a distinct constructor per tag name, so
 * callers pass the canonical class and a thin subclass for the synonym.
 * The function is idempotent: if either tag is already registered it skips
 * that `define` call rather than throwing.
 *
 * @param canonical_tag  - The primary tag name (e.g. `"fsl-instance"`).
 * @param synonym_tag    - The alias tag name (e.g. `"jssm-instance"`).
 * @param CanonicalClass - Constructor to register under `canonical_tag`.
 * @param SynonymClass   - Constructor to register under `synonym_tag`
 *                         (must be a distinct class from `CanonicalClass`).
 *
 * @example
 * class FslInstance extends HTMLElement {}
 * class JssmInstance extends FslInstance {}
 * define_with_synonym('fsl-instance', 'jssm-instance', FslInstance, JssmInstance);
 *
 * @see closest_wc
 */
function define_with_synonym(canonical_tag, synonym_tag, CanonicalClass, SynonymClass) {
    if (!customElements.get(canonical_tag))
        customElements.define(canonical_tag, CanonicalClass);
    if (!customElements.get(synonym_tag))
        customElements.define(synonym_tag, SynonymClass);
}

/**
 * Thin subclass so `<jssm-viz>` registers under a distinct constructor.
 *
 * @deprecated The `jssm-*` tag and the `JssmViz` class alias are deprecated
 * since v5 in favor of the canonical `<fsl-viz>` / {@link FslViz}, for
 * fsl.tools brand alignment. They remain functional but are slated for
 * removal in v6 (tracked in `v6_breaking_changes.json` on the `v6` branch).
 * New components are `fsl-*`-only.
 */
class JssmViz extends FslViz {
}
define_with_synonym('fsl-viz', 'jssm-viz', FslViz, JssmViz);

export { JssmViz };
