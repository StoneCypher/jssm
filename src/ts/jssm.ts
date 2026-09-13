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

export {

  create,
  sm,
  fsl,
  from,
  deserialize,
  compareVersions,

  transfer_state_properties,
  state_style_condense,

  is_hook_rejection,
  is_hook_complex_result,
  abstract_hook_step,
  abstract_everything_hook_step,

  shapes,
  gviz_shapes,
  named_colors,

  state_name_chars,
  state_name_first_chars,
  action_label_chars,

  is_state_name_first_char,
  is_state_name_char,

  STOCHASTIC_DEFAULT_RUNS,
  STOCHASTIC_DEFAULT_MAX_STEPS,

} from './machine/machine.js';

export type { Machine, JssmMachine } from './machine/machine.js';

// The bare-function families (plan: notes/superpowers/plans/2026-09-13-bare-functions-api.md).
export { on, once, off } from './machine/events.js';
export { history, history_inclusive, history_length, set_history_length } from './machine/history.js';
export { set_state_timeout, clear_state_timeout, state_timeout_for, current_state_timeout, auto_set_state_timeout } from './machine/timers.js';
export { transition, go, force_transition, act, action, override, valid_action, valid_transition, valid_force_transition } from './machine/transition.js';

// Editor-agnostic FSL language service (diagnostics / completions / semantic spans).
export { fslDiagnostics, fslCompletions, fslSemanticSpans } from './language_service/index.js';

export {
  fsl_fence_lang,
  parse_fence_info
} from './fsl_markdown_fence';

export type {
  FencePart,
  FenceImageFormat,
  FenceDimensionUnit,
  FenceDimension,
  FenceDescriptor
} from './fsl_markdown_fence';

export {FslDirections} from './jssm_types.js';
export type {JssmParseOptions} from './jssm_types.js';
export {JssmError} from './jssm_error.js';
export {arrow_direction, arrow_left_kind, arrow_right_kind} from './jssm_arrow.js';
export {compile, wrap_parse as parse, make, membership_distance, list_shares} from './jssm_compiler.js';
export {unique, find_repeated, weighted_sample_select, weighted_histo_key, sleep, seq, weighted_rand_select, histograph, gen_splitmix32, name_bind_prop_and_state} from './jssm_util.js';
export {replay} from './fsl_replay.js';
export type {ReplayResult, ReplayStep} from './fsl_replay.js';
export {parse_tape, serialize_tape, ReplayError, SUPPORTED_TAPE_VERSION} from './fsl_stimulus_tape.js';
export type {Stimulus, TapeHeader, StimulusTape, ReplayErrorKind} from './fsl_stimulus_tape.js';
export {build_time, version} from './version.js';
export * as constants from './jssm_constants.js';
