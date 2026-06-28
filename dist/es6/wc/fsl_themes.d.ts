/**
 * Theme registry for the fsl-* suite. A **theme** is a named pair of light/dark
 * palettes; a **mode** (`system` | `light` | `dark`) picks which variant applies,
 * with `system` following the OS `prefers-color-scheme`. The host resolves
 * (theme name × mode) to a palette and writes it as `--fsl-color-*` custom
 * properties, which cascade to every slotted widget.
 *
 * @see resolve_theme_mode
 */
/** How a theme's light/dark variant is chosen. `system` follows the OS. */
export declare type ThemeMode = 'system' | 'light' | 'dark';
/**
 * One palette: the public `--fsl-color-*` tokens (minus the `--fsl-color-`
 * prefix). Every slotted widget derives its internal `--_fsl-*` from these.
 */
export interface ThemePalette {
    surface: string;
    text: string;
    accent: string;
    border: string;
    muted: string;
    'json-key': string;
    'json-string': string;
    'json-number': string;
    'json-atom': string;
}
/** A named theme: its light and dark palettes. */
export interface ThemeVariants {
    light: ThemePalette;
    dark: ThemePalette;
}
/** A set of named themes, keyed by display name. */
export declare type ThemeRegistry = Record<string, ThemeVariants>;
/**
 * The built-in themes: `Default` (the suite's house palette) and `Solarized`
 * (Ethan Schoonover's palette). Consumers can extend the host's `themes`
 * registry with their own; every entry shows up in the toolbar's theme list.
 */
export declare const BUILTIN_THEMES: ThemeRegistry;
/**
 * Resolve a `(registry, theme name, variant)` triple to a concrete palette,
 * falling back to the built-in `Default` theme when the name is unknown.
 *
 * @param themes - The registry to look in.
 * @param name - The selected theme name.
 * @param variant - `light` or `dark`.
 * @returns The palette to apply.
 */
export declare function resolve_palette(themes: ThemeRegistry, name: string, variant: 'light' | 'dark'): ThemePalette;
/**
 * Resolve a theme mode to a concrete `light`/`dark`. `system` consults the OS
 * preference; `light`/`dark` are returned as-is.
 *
 * @param mode - The selected mode.
 * @param prefers_dark - Whether the OS prefers a dark color scheme.
 * @returns The concrete variant to apply.
 *
 * @example
 * resolve_theme_mode('system', true);  // 'dark'
 * resolve_theme_mode('light', true);   // 'light'
 */
export declare function resolve_theme_mode(mode: ThemeMode, prefers_dark: boolean): 'light' | 'dark';
/**
 * Map a palette to its `--fsl-color-*` custom-property entries, ready to set on
 * an element's style.
 *
 * @param palette - The resolved palette.
 * @returns `[propertyName, value]` pairs, e.g. `['--fsl-color-surface', '#fff']`.
 */
export declare function palette_to_vars(palette: ThemePalette): Array<[string, string]>;
export declare function register_palette_properties(): void;
