
import { FslTheme, JssmBaseTheme } from './jssm_types';





import { base_theme }    from './themes/jssm_base_stylesheet';

import { default_theme } from './themes/jssm_theme_default';
import { modern_theme }  from './themes/jssm_theme_modern';
import { ocean_theme }   from './themes/jssm_theme_ocean';
import { plain_theme }   from './themes/jssm_theme_plain';
import { bold_theme }    from './themes/jssm_theme_bold';





const theme_mapping: Map<FslTheme, JssmBaseTheme> = new Map();

theme_mapping.set('default', default_theme);
theme_mapping.set('modern',  modern_theme);
theme_mapping.set('ocean',   ocean_theme);
theme_mapping.set('plain',   plain_theme);
theme_mapping.set('bold',    bold_theme);





export { theme_mapping, base_theme };
