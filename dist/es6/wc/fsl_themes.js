/**
 * Theme registry for the fsl-* suite. A **theme** is a named pair of light/dark
 * palettes; a **mode** (`system` | `light` | `dark`) picks which variant applies,
 * with `system` following the OS `prefers-color-scheme`. The host resolves
 * (theme name × mode) to a palette and writes it as `--fsl-color-*` custom
 * properties, which cascade to every slotted widget.
 * @see resolve_theme_mode
 */
/**
 * The built-in themes: `Default` (the suite's house palette) and `Solarized`
 * (Ethan Schoonover's palette). Consumers can extend the host's `themes`
 * registry with their own; every entry shows up in the toolbar's theme list.
 */
export const BUILTIN_THEMES = {
    Default: {
        light: {
            surface: '#ffffff', text: '#222222', accent: '#5b9dff', border: '#e5e5e5', muted: '#9aa0a6',
            'json-key': '#5b3da8', 'json-string': '#2e7d32', 'json-number': '#b8860b', 'json-atom': '#c2185b',
        },
        dark: {
            surface: '#1e1e22', text: '#d6d6d6', accent: '#82aaff', border: '#2a2a2e', muted: '#5a5f66',
            'json-key': '#82aaff', 'json-string': '#c3e88d', 'json-number': '#f78c6c', 'json-atom': '#c792ea',
        },
    },
    Solarized: {
        light: {
            surface: '#fdf6e3', text: '#657b83', accent: '#268bd2', border: '#eee8d5', muted: '#93a1a1',
            'json-key': '#6c71c4', 'json-string': '#859900', 'json-number': '#b58900', 'json-atom': '#d33682',
        },
        dark: {
            surface: '#002b36', text: '#839496', accent: '#268bd2', border: '#073642', muted: '#586e75',
            'json-key': '#6c71c4', 'json-string': '#859900', 'json-number': '#b58900', 'json-atom': '#d33682',
        },
    },
};
/**
 * Resolve a `(registry, theme name, variant)` triple to a concrete palette,
 * falling back to the built-in `Default` theme when the name is unknown.
 * @param themes - The registry to look in.
 * @param name - The selected theme name.
 * @param variant - `light` or `dark`.
 * @returns The palette to apply.
 */
export function resolve_palette(themes, name, variant) {
    var _a;
    return ((_a = themes[name]) !== null && _a !== void 0 ? _a : BUILTIN_THEMES['Default'])[variant];
}
/**
 * Resolve a theme mode to a concrete `light`/`dark`. `system` consults the OS
 * preference; `light`/`dark` are returned as-is.
 * @param mode - The selected mode.
 * @param prefers_dark - Whether the OS prefers a dark color scheme.
 * @returns The concrete variant to apply.
 * @example
 * resolve_theme_mode('system', true);  // 'dark'
 * resolve_theme_mode('light', true);   // 'light'
 */
export function resolve_theme_mode(mode, prefers_dark) {
    return mode === 'system' ? (prefers_dark ? 'dark' : 'light') : mode;
}
/**
 * Map a palette to its `--fsl-color-*` custom-property entries, ready to set on
 * an element's style.
 * @param palette - The resolved palette.
 * @returns `[propertyName, value]` pairs, e.g. `['--fsl-color-surface', '#fff']`.
 */
export function palette_to_vars(palette) {
    return Object.entries(palette).map(([k, v]) => [`--fsl-color-${k}`, v]);
}
export function register_palette_properties() {
    if (typeof CSS === 'undefined' || typeof CSS.registerProperty !== 'function') {
        return;
    }
    const default_light_vars = palette_to_vars(BUILTIN_THEMES['Default'].light);
    for (const [prop, value] of default_light_vars) {
        try {
            CSS.registerProperty({ name: prop, syntax: '<color>', inherits: true, initialValue: value });
        }
        catch (_a) {
            // already registered by another host or a prior call
        }
    }
}
