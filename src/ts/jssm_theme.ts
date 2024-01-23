
import { FslTheme, JssmBaseTheme } from './jssm_types.js';





import { base_theme }    from './themes/jssm_base_stylesheet.js';

import { default_theme } from './themes/jssm_theme_default.js';
import { modern_theme }  from './themes/jssm_theme_modern.js';
import { ocean_theme }   from './themes/jssm_theme_ocean.js';
import { plain_theme }   from './themes/jssm_theme_plain.js';
import { bold_theme }    from './themes/jssm_theme_bold.js';





const theme_mapping: Map<FslTheme, JssmBaseTheme> = new Map();

theme_mapping.set('default', default_theme);
theme_mapping.set('modern',  modern_theme);
theme_mapping.set('ocean',   ocean_theme);
theme_mapping.set('plain',   plain_theme);
theme_mapping.set('bold',    bold_theme);





export { theme_mapping, base_theme };
