const base_state_style = {
    shape: 'rectangle',
    backgroundColor: 'khaki',
    textColor: 'black',
    borderColor: 'black'
};
const base_active_state_style = {
    textColor: 'white',
    backgroundColor: 'dodgerblue4'
};
const base_hooked_state_style = {
    shape: 'component'
};
const base_terminal_state_style = {
    textColor: 'white',
    backgroundColor: 'crimson'
};
const base_active_terminal_state_style = {
    textColor: 'white',
    backgroundColor: 'indigo'
};
const base_start_state_style = {
    backgroundColor: 'yellow'
};
const base_active_start_state_style = {
    backgroundColor: 'yellowgreen'
};
const base_active_hooked_state_style = {
    backgroundColor: 'yellowgreen'
};
const base_end_state_style = {
    textColor: 'white',
    backgroundColor: 'darkolivegreen'
};
const base_active_end_state_style = {
    textColor: 'white',
    backgroundColor: 'darkgreen'
};
const bold_theme = {
    name: 'bold',
    state: base_state_style,
    start: base_start_state_style,
    end: base_end_state_style,
    terminal: base_terminal_state_style,
    hooked: base_hooked_state_style,
    active: base_active_state_style,
    active_start: base_active_start_state_style,
    active_end: base_active_end_state_style,
    active_terminal: base_active_terminal_state_style,
    active_hooked: base_active_hooked_state_style,
    legal: undefined,
    main: undefined,
    forced: undefined,
    action: undefined,
    graph: undefined,
    title: undefined // TODO FIXME
};
export { base_state_style, base_active_state_style, base_terminal_state_style, base_active_terminal_state_style, base_start_state_style, base_active_start_state_style, base_end_state_style, base_active_end_state_style, bold_theme, bold_theme as theme };
