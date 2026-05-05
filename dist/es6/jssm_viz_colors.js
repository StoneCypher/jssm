/**
 *  Default color palette for jssm/viz dot/svg output.  Used by the graphviz
 *  rendering helpers in jssm_viz.ts to colorize nodes and edges based on
 *  state type (terminal/final/complete/normal) and arrow kind
 *  (legal/main/forced).
 *
 *  Keys are flat strings of the form `<arrow_kind>_<modifier>_<position>`
 *  (e.g. `legal_final_solo`, `main_terminal_2`); also the special node fill
 *  colors (`fill_final`, `fill_terminal`, `fill_complete`) and the graph
 *  background.
 */
const default_viz_colors = {
    'graph_bg_color': '#eeeeee',
    'fill_final': '#ddddff',
    'fill_terminal': '#ffdddd',
    'fill_complete': '#ddffdd',
    'legal_1': '#888888',
    'legal_2': '#777777',
    'legal_solo': '#777777',
    'legal_final_1': '#7777aa',
    'legal_final_2': '#666699',
    'legal_final_solo': '#666699',
    'legal_terminal_1': '#aa7777',
    'legal_terminal_2': '#996666',
    'legal_terminal_solo': '#996666',
    'legal_complete_1': '#77aa77',
    'legal_complete_2': '#669966',
    'legal_complete_solo': '#669966',
    'main_1': '#444444',
    'main_2': '#333333',
    'main_solo': '#333333',
    'main_final_1': '#333366',
    'main_final_2': '#222255',
    'main_final_solo': '#222255',
    'main_terminal_1': '#663333',
    'main_terminal_2': '#552222',
    'main_terminal_solo': '#552222',
    'main_complete_1': '#336633',
    'main_complete_2': '#225522',
    'main_complete_solo': '#225522',
    'forced_1': '#cccccc',
    'forced_2': '#bbbbbb',
    'forced_solo': '#bbbbbb',
    'forced_final_1': '#bbbbee',
    'forced_final_2': '#aaaadd',
    'forced_final_solo': '#aaaadd',
    'forced_terminal_1': '#eebbbb',
    'forced_terminal_2': '#ddaaaa',
    'forced_terminal_solo': '#ddaaaa',
    'forced_complete_1': '#bbeebb',
    'forced_complete_2': '#aaddaa',
    'forced_complete_solo': '#aaddaa',
    'text_final_1': '#000088',
    'text_final_2': '#000088',
    'text_final_solo': '#000088',
    'text_terminal_1': '#880000',
    'text_terminal_2': '#880000',
    'text_terminal_solo': '#880000',
    'text_complete_1': '#007700',
    'text_complete_2': '#007700',
    'text_complete_solo': '#007700'
};
export { default_viz_colors };
