import { default_theme } from './themes/jssm_theme_default.js';
import { modern_theme } from './themes/jssm_theme_modern.js';
import { ocean_theme } from './themes/jssm_theme_ocean.js';
import { plain_theme } from './themes/jssm_theme_plain.js';
import { bold_theme } from './themes/jssm_theme_bold.js';
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
const theme_mapping = new Map([['default', default_theme], ['modern', modern_theme], ['ocean', ocean_theme], ['plain', plain_theme], ['bold', bold_theme]]);
export { theme_mapping, };
export { base_theme } from './themes/jssm_base_stylesheet.js';
