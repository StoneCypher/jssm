
import { JssmStateConfig } from './jssm_types';





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





const base_end_state_style: JssmStateConfig = {
  textColor       : 'white',
  backgroundColor : 'darkolivegreen'
};





const base_active_end_state_style: JssmStateConfig = {
  textColor       : 'white',
  backgroundColor : 'darkgreen'
};





export {

  base_state_style,
  base_active_state_style,

  base_terminal_state_style,
  base_active_terminal_state_style,

  base_start_state_style,
  base_active_start_state_style,

  base_end_state_style,
  base_active_end_state_style

};
