import { FslTheme, JssmBaseTheme } from './jssm_types.js';
/*******
 *
 *  Registry mapping theme names to their stylesheet definitions.  Each entry
 *  maps an {@link FslTheme} string (e.g. `'default'`, `'ocean'`) to a
 *  {@link JssmBaseTheme} object containing colors, shapes, and other visual
 *  defaults used by jssm-viz when rendering state machine diagrams.
 *
 *  Add new themes by importing their definition and calling
 *  `theme_mapping.set(name, theme)`.
 *
 */
declare const theme_mapping: Map<FslTheme, JssmBaseTheme>;
export { theme_mapping, };
export { base_theme } from './themes/jssm_base_stylesheet.js';
