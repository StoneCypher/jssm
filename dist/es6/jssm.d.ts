/*******
 *
 *  The default `jssm` entry: bare functions over a machine value, plus the
 *  factories that build one.  The `Machine` class itself is available from
 *  `jssm/compat`; from here it is reachable as a type only, so a 5.x
 *  `new Machine(...)` through this entry is a compile-time error rather than
 *  a runtime surprise (v6 breaking change `bare-functions-default-api`).
 *
 *  This file is a barrel: every export is an explicit re-export, never
 *  `export *`, so the surface is enumerable by reading it.  As the family
 *  files under `./machine/` come into being they append their own explicit
 *  `export { ... } from './machine/<family>.js'` lines here.
 *
 */
export { create, sm, fsl, from, deserialize, compareVersions, shapes, gviz_shapes, named_colors, state_name_chars, state_name_first_chars, action_label_chars, is_state_name_first_char, is_state_name_char, } from './machine/machine.js';
export type { Machine, JssmMachine } from './machine/machine.js';
export { on, once, off } from './machine/events.js';
export { history, history_inclusive, history_length, set_history_length } from './machine/history.js';
export { set_state_timeout, clear_state_timeout, state_timeout_for, current_state_timeout, auto_set_state_timeout } from './machine/timers.js';
export { transition, go, force_transition, act, action, override, valid_action, valid_transition, valid_force_transition } from './machine/transition.js';
export { set_hook, remove_hook, hook, hook_action, hook_global_action, hook_any_action, hook_standard_transition, hook_main_transition, hook_forced_transition, hook_any_transition, hook_entry, hook_exit, hook_after, hook_after_any, post_hook, post_hook_action, post_hook_global_action, post_hook_any_action, post_hook_standard_transition, post_hook_main_transition, post_hook_forced_transition, post_hook_any_transition, post_hook_entry, post_hook_exit, hook_pre_everything, hook_everything, hook_post_everything, hook_pre_post_everything, hook_registry, hooks_on, has_hook, state_has_hooks, is_hook_rejection, is_hook_complex_result, abstract_hook_step, abstract_everything_hook_step } from './machine/hooks.js';
export { data, set_data, prop, strict_prop, props, known_prop, known_props, val, set_val, vals, known_val, known_vals, val_type } from './machine/data.js';
export { state, label_for, display_text, is_start_state, is_end_state, failed_outputs, is_failed_output, is_failed, state_is_final, is_final, canonical, machine_author, machine_comment, machine_contributor, machine_definition, machine_language, machine_license, machine_name, editor_config, npm_name, default_size, machine_version, raw_state_declarations, state_declaration, state_declarations, fsl_version, machine_state, states, state_for, has_state, list_edges, list_named_transitions, list_actions, uses_actions, uses_forced_transitions, code_allows_override, config_allows_override, allows_override, allow_islands, all_state_name_chars, all_state_name_first_chars, all_action_label_chars, get_transition_by_state_names, lookup_transition_for, list_transitions, list_entrances, list_exits, actions, list_states_having_action, list_exit_actions, probable_action_exits, is_unenterable, has_unenterables, is_terminal, state_is_terminal, has_terminals, is_complete, state_is_complete, has_completes, edges_between, current_action_for, current_action_edge_for } from './machine/query.js';
export { start_state_weights, sample_start_state, probable_exits_for, probabilistic_transition, probabilistic_walk, probabilistic_histo_walk, stochastic_runs, stochastic_summary, rng_seed, set_rng_seed, STOCHASTIC_DEFAULT_RUNS, STOCHASTIC_DEFAULT_MAX_STEPS } from './machine/stochastic.js';
export { isIn, groupsOf, groups, statesIn } from './machine/groups.js';
export { graph_layout, dot_preamble, default_transition_config, default_graph_config, all_themes, themes, set_themes, flow, standard_state_style, hooked_state_style, start_state_style, end_state_style, terminal_state_style, active_state_style, resolve_state_config, style_for, transfer_state_properties, state_style_condense } from './machine/style.js';
export { serialize, instance_name, creation_date, creation_timestamp, create_start_time } from './machine/create.js';
export { fslDiagnostics, fslCompletions, fslSemanticSpans } from './language_service/index.js';
export { fsl_fence_lang, parse_fence_info } from './fsl_markdown_fence';
export type { FencePart, FenceImageFormat, FenceDimensionUnit, FenceDimension, FenceDescriptor } from './fsl_markdown_fence';
export { FslDirections } from './jssm_types.js';
export type { JssmParseOptions } from './jssm_types.js';
export { JssmError } from './jssm_error.js';
export { arrow_direction, arrow_left_kind, arrow_right_kind } from './jssm_arrow.js';
export { compile, wrap_parse as parse, make, membership_distance, list_shares } from './jssm_compiler.js';
export { unique, find_repeated, weighted_sample_select, weighted_histo_key, sleep, seq, weighted_rand_select, histograph, gen_splitmix32, name_bind_prop_and_state } from './jssm_util.js';
export { replay } from './fsl_replay.js';
export type { ReplayResult, ReplayStep } from './fsl_replay.js';
export { parse_tape, serialize_tape, ReplayError, SUPPORTED_TAPE_VERSION } from './fsl_stimulus_tape.js';
export type { Stimulus, TapeHeader, StimulusTape, ReplayErrorKind } from './fsl_stimulus_tape.js';
export { build_time, version } from './version.js';
export * as constants from './jssm_constants.js';
