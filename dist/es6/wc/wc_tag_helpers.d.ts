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
export declare function wc_suffix_matches(tag_name: string, suffix: string): boolean;
/**
 * Returns the nearest ancestor of `el` (or `el` itself) whose tag is
 * `fsl-<suffix>` or `jssm-<suffix>`, or `null` if none exists.
 * @param el     - The element to start the search from.
 * @param suffix - The suffix to match (e.g. `"instance"`).
 * @returns The closest matching ancestor element, or `null`.
 * @example
 * // <fsl-instance><div id="k"></div></fsl-instance>
 * closest_wc(document.getElementById('k'), 'instance'); // <fsl-instance>
 * @see wc_suffix_matches
 */
export declare function closest_wc(el: Element, suffix: string): Element | null;
/**
 * Registers a canonical custom-element tag and its synonym tag.
 *
 * `customElements.define` requires a distinct constructor per tag name, so
 * callers pass the canonical class and a thin subclass for the synonym.
 * The function is idempotent: if either tag is already registered it skips
 * that `define` call rather than throwing.
 * @param canonical_tag  - The primary tag name (e.g. `"fsl-instance"`).
 * @param synonym_tag    - The alias tag name (e.g. `"jssm-instance"`).
 * @param CanonicalClass - Constructor to register under `canonical_tag`.
 * @param SynonymClass   - Constructor to register under `synonym_tag`
 *                         (must be a distinct class from `CanonicalClass`).
 * @example
 * class FslInstance extends HTMLElement {}
 * class JssmInstance extends FslInstance {}
 * define_with_synonym('fsl-instance', 'jssm-instance', FslInstance, JssmInstance);
 * @see closest_wc
 */
export declare function define_with_synonym(canonical_tag: string, synonym_tag: string, CanonicalClass: CustomElementConstructor, SynonymClass: CustomElementConstructor): void;
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
export declare function define_canonical(canonical_tag: string, CanonicalClass: CustomElementConstructor): void;
