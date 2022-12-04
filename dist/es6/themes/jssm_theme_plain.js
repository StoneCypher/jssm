const base_state_style = {
    textColor: 'black',
    backgroundColor: 'transparent',
    shape: 'plaintext'
};
const base_active_state_style = {
    textColor: 'black',
    backgroundColor: 'transparent',
    shape: 'plaintext'
};
const base_hooked_state_style = {
    textColor: 'black',
    backgroundColor: 'transparent',
    shape: 'plaintext'
};
const base_terminal_state_style = {
    textColor: 'black',
    backgroundColor: 'transparent',
    shape: 'plaintext'
};
const base_active_terminal_state_style = {
    textColor: 'black',
    backgroundColor: 'transparent',
    shape: 'plaintext'
};
const base_start_state_style = {
    textColor: 'black',
    backgroundColor: 'transparent',
    shape: 'plaintext'
};
const base_active_start_state_style = {
    textColor: 'black',
    backgroundColor: 'transparent',
    shape: 'plaintext'
};
const base_active_hooked_state_style = {
    textColor: 'black',
    backgroundColor: 'transparent',
    shape: 'plaintext'
};
const base_end_state_style = {
    textColor: 'black',
    backgroundColor: 'transparent',
    shape: 'plaintext'
};
const base_active_end_state_style = {
    textColor: 'black',
    backgroundColor: 'transparent',
    shape: 'plaintext'
};
const plain_theme = {
    name: 'plain',
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
export { base_state_style, base_active_state_style, base_terminal_state_style, base_active_terminal_state_style, base_start_state_style, base_active_start_state_style, base_end_state_style, base_active_end_state_style, plain_theme, plain_theme as theme };
