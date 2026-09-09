/**
 * Shared helpers for the `fsl-*` web-component tag convention.  The `jssm-*`
 * synonym prefix was removed in 6.0; every registration and lookup now
 * matches exactly one spelling, so the rule lives in one place.
 */

/**
 * Returns true when `tag_name` is exactly `fsl-<suffix>` (case-insensitive).
 * @param tag_name - The element tag name to test (e.g. `"FSL-VIZ"`).
 * @param suffix   - The suffix to match after the prefix (e.g. `"viz"`).
 * @returns `true` when `tag_name` is `fsl-<suffix>`.
 * @example
 * wc_suffix_matches('FSL-VIZ', 'viz');    // true
 * wc_suffix_matches('jssm-viz', 'viz');   // false — the jssm- prefix was removed in 6.0
 * wc_suffix_matches('fsl-vizard', 'viz'); // false — suffix must match exactly
 */
export function wc_suffix_matches(tag_name: string, suffix: string): boolean {
  return tag_name.toLowerCase() === `fsl-${suffix}`;
}

/**
 * Returns the nearest ancestor of `el` (or `el` itself) whose tag is
 * `fsl-<suffix>`, or `null` if none exists.
 * @param el     - The element to start the search from.
 * @param suffix - The suffix to match (e.g. `"instance"`).
 * @returns The closest matching ancestor element, or `null`.
 * @example
 * // <fsl-instance><div id="k"></div></fsl-instance>
 * closest_wc(document.getElementById('k'), 'instance'); // <fsl-instance>
 * @see wc_suffix_matches
 */
export function closest_wc(el: Element, suffix: string): Element | null {
  return el.closest(`fsl-${suffix}`);
}

/**
 * Registers a canonical `fsl-*` custom-element tag.  Idempotent: skips the
 * `define` call when the tag is already registered.
 * @param canonical_tag - The `fsl-*` tag name (e.g. `"fsl-info-panel"`).
 * @param CanonicalClass - Constructor to register under `canonical_tag`.
 * @example
 * class FslInfoPanel extends HTMLElement {}
 * define_canonical('fsl-info-panel', FslInfoPanel);
 */
export function define_canonical(
  canonical_tag : string,
  CanonicalClass: CustomElementConstructor,
): void {
  if (!customElements.get(canonical_tag)) customElements.define(canonical_tag, CanonicalClass);
}
