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
declare const default_viz_colors: {
    graph_bg_color: string;
    fill_final: string;
    fill_terminal: string;
    fill_complete: string;
    legal_1: string;
    legal_2: string;
    legal_solo: string;
    legal_final_1: string;
    legal_final_2: string;
    legal_final_solo: string;
    legal_terminal_1: string;
    legal_terminal_2: string;
    legal_terminal_solo: string;
    legal_complete_1: string;
    legal_complete_2: string;
    legal_complete_solo: string;
    main_1: string;
    main_2: string;
    main_solo: string;
    main_final_1: string;
    main_final_2: string;
    main_final_solo: string;
    main_terminal_1: string;
    main_terminal_2: string;
    main_terminal_solo: string;
    main_complete_1: string;
    main_complete_2: string;
    main_complete_solo: string;
    forced_1: string;
    forced_2: string;
    forced_solo: string;
    forced_final_1: string;
    forced_final_2: string;
    forced_final_solo: string;
    forced_terminal_1: string;
    forced_terminal_2: string;
    forced_terminal_solo: string;
    forced_complete_1: string;
    forced_complete_2: string;
    forced_complete_solo: string;
    text_final_1: string;
    text_final_2: string;
    text_final_solo: string;
    text_terminal_1: string;
    text_terminal_2: string;
    text_terminal_solo: string;
    text_complete_1: string;
    text_complete_2: string;
    text_complete_solo: string;
};
export { default_viz_colors };
