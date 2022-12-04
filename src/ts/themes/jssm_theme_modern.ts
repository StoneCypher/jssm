
import {
  JssmStateConfig,
  JssmBaseTheme
} from '../jssm_types';





const base_state_style: JssmStateConfig = {
  shape           : 'rectangle',
  backgroundColor : 'khaki',
  textColor       : 'black',
  borderColor     : 'black'
};





const base_active_state_style: JssmStateConfig = {
  textColor       : 'white',
  backgroundColor : 'dodgerblue4'
};





const base_hooked_state_style: JssmStateConfig = {
  shape : 'component'
};





const base_terminal_state_style: JssmStateConfig = {
  textColor       : 'white',
  backgroundColor : 'crimson'
};





const base_active_terminal_state_style: JssmStateConfig = {
  textColor       : 'white',
  backgroundColor : 'indigo'
};





const base_start_state_style: JssmStateConfig = {
  backgroundColor : 'yellow'
};





const base_active_start_state_style: JssmStateConfig = {
  backgroundColor : 'yellowgreen'
};





const base_active_hooked_state_style: JssmStateConfig = {
  backgroundColor : 'yellowgreen'
};





const base_end_state_style: JssmStateConfig = {
  textColor       : 'white',
  backgroundColor : 'darkolivegreen'
};





const base_active_end_state_style: JssmStateConfig = {
  textColor       : 'white',
  backgroundColor : 'darkgreen'
};





const modern_theme: JssmBaseTheme = {

  name            : 'modern',

  state           : base_state_style,
  start           : base_start_state_style,
  end             : base_end_state_style,
  terminal        : base_terminal_state_style,
  hooked          : base_hooked_state_style,

  active          : base_active_state_style,
  active_start    : base_active_start_state_style,
  active_end      : base_active_end_state_style,
  active_terminal : base_active_terminal_state_style,
  active_hooked   : base_active_hooked_state_style,

  legal           : undefined,                  // TODO FIXME
  main            : undefined,                  // TODO FIXME
  forced          : undefined,                  // TODO FIXME

  action          : undefined,                  // TODO FIXME
  graph           : undefined,                  // TODO FIXME
  title           : undefined                   // TODO FIXME

};





export {

  base_state_style,
  base_active_state_style,

  base_terminal_state_style,
  base_active_terminal_state_style,

  base_start_state_style,
  base_active_start_state_style,

  base_end_state_style,
  base_active_end_state_style,

  modern_theme,
    modern_theme as theme

};
