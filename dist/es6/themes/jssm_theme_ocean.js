const base_state_style = {
    backgroundColor: 'cadetblue1',
};
const base_active_state_style = {
    textColor: 'white',
    backgroundColor: 'deepskyblue'
};
const base_hooked_state_style = {
    shape: 'component',
    backgroundColor: 'mediumaquamarine'
};
const base_terminal_state_style = {
    textColor: 'white',
    backgroundColor: 'darkviolet'
};
const base_active_terminal_state_style = {
    textColor: 'white',
    backgroundColor: 'deeppink'
};
const base_start_state_style = {
    backgroundColor: 'darkseagreen1'
};
const base_active_start_state_style = {
    backgroundColor: 'aquamarine'
};
const base_active_hooked_state_style = {
    backgroundColor: 'aquamarine'
};
const base_end_state_style = {
    textColor: 'white',
    backgroundColor: 'chartreuse1'
};
const base_active_end_state_style = {
    textColor: 'white',
    backgroundColor: 'darkgreen'
};
const ocean_theme = {
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
export { base_state_style, base_active_state_style, base_terminal_state_style, base_active_terminal_state_style, base_start_state_style, base_active_start_state_style, base_end_state_style, base_active_end_state_style, ocean_theme, ocean_theme as theme };
