import { FslDocs } from './docs.js';
export { FslDocs } from './docs.js';

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
 * The retired jssm- prefix (e.g. what was jssm-viz) never matches — 6.0
 * dropped that spelling entirely.
 * @example
 * wc_suffix_matches('FSL-VIZ', 'viz');    // true
 * wc_suffix_matches('fsl-vizard', 'viz'); // false — suffix must match exactly
 */
/**
 * Registers `canonical_tag` as a custom element under `CanonicalClass`.
 * Idempotent: skips the `define` call when the tag is already registered.
 * Does not validate that `canonical_tag` carries the `fsl-` prefix — callers
 * are responsible for passing a spelling that belongs in the registry.
 * @param canonical_tag - The tag name to register (e.g. `"fsl-info-panel"`).
 * @param CanonicalClass - Constructor to register under `canonical_tag`.
 * @example
 * class FslInfoPanel extends HTMLElement {}
 * define_canonical('fsl-info-panel', FslInfoPanel);
 */
function define_canonical(canonical_tag, CanonicalClass) {
    if (!customElements.get(canonical_tag))
        customElements.define(canonical_tag, CanonicalClass);
}

// Canonical `fsl-*` tag only.
define_canonical('fsl-docs', FslDocs);
