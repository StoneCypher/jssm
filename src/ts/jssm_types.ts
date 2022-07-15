
import { circular_buffer } from 'circular_buffer_js';





type StateType = string;





type JssmSuccess        = { success: true };                          /** Composite type indicating success as part of a result */
type JssmFailure        = { success: false, error: any };             /** Composite type indicating an error, and why, as part of a result */
type JssmIncomplete     = { success: 'incomplete' };                  /** Composite type indicating that a result isn't finished */
type JssmResult         = JssmSuccess | JssmFailure | JssmIncomplete; /** Composite type composing whether or not a result was successful */

type JssmColor          = string;  // TODO FIXME constrain to #RRGGBBAA later // whargarbl



type JssmPermitted      = 'required' | 'disallowed';
type JssmPermittedOpt   = 'required' | 'disallowed' | 'optional';

type JssmArrow          = '->' | '<-' | '<->' | '<=->' | '<~->'
                        | '=>' | '<=' | '<=>' | '<-=>' | '<~=>'
                        | '~>' | '<~' | '<~>' | '<-~>' | '<=~>';
                        // | '⇒'  | '⇐'  | '⇔'  | '⇐→' | '↚→'
                        // | '→'  | '←'  | '↔'  | '←⇒' | '↚⇒'
                        // | '↛'  | '↚'  | '↮'  | '←↛' | '⇐↛';

// TODO finish the arrow types - unicode *and* mixed

/**
 * A type teaching Typescript the various supported shapes for nodes, mostly inherited from GraphViz
 */
type JssmShape          = "box" | "polygon" | "ellipse" | "oval" | "circle" | "point" | "egg" | "triangle"
                        | "plaintext" | "plain" | "diamond" | "trapezium" | "parallelogram" | "house" | "pentagon"
                        | "hexagon" | "septagon" | "octagon" | "doublecircle" | "doubleoctagon" | "tripleoctagon"
                        | "invtriangle" | "invtrapezium" | "invhouse" | "Mdiamond" | "Msquare" | "Mcircle" | "rect"
                        | "rectangle" | "square" | "star" | "none" | "underline" | "cylinder" | "note" | "tab"
                        | "folder" | "box3d" | "component" | "promoter" | "cds" | "terminator" | "utr" | "primersite"
                        | "restrictionsite" | "fivepoverhang" | "threepoverhang" | "noverhang" | "assembly"
                        | "signature" | "insulator" | "ribosite" | "rnastab" | "proteasesite" | "proteinstab"
                        | "rpromoter" | "rarrow" | "larrow" | "lpromoter" | "record";

type JssmArrowDirection = 'left' | 'right' | 'both';
type JssmArrowKind      = 'none' | 'legal' | 'main' | 'forced';

type JssmLayout         = 'dot' | 'circo' | 'twopi' | 'fdp';  // todo add the rest

type JssmCorner         = 'regular' | 'rounded' | 'lined';
type JssmLineStyle      = 'solid' | 'dashed' | 'dotted';





type FslDirection       = 'up' | 'right' | 'down' | 'left';
type FslTheme           = 'default' | 'ocean' | 'modern' | 'none';





type JssmSerialization<DataType> = {

  jssm_version     : string,
  timestamp        : number,
  comment?         : string | undefined,
  state            : StateType,
  history          : [string, DataType][],
  history_capacity : number,
  data             : DataType

};





type JssmPropertyDefinition = {
  name           : string,
  default_value? : any,
  required?      : boolean
};





type JssmTransitionPermitter<DataType> =
  (OldState: StateType, NewState: StateType, OldData: DataType, NewData: DataType) => boolean;

type JssmTransitionPermitterMaybeArray<DataType> =
    JssmTransitionPermitter<DataType>
  | Array< JssmTransitionPermitter<DataType> >;





type JssmTransition<DataType> = {

  from         : StateType,
  to           : StateType,
  name?        : string,
  action?      : StateType,
  check?       : JssmTransitionPermitterMaybeArray<DataType>,  // validate this edge's transition; usually about data
  probability? : number,                                       // for stoch modelling, would like to constrain to [0..1], dunno how // TODO FIXME
  kind         : JssmArrowKind,
  forced_only  : boolean,
  main_path    : boolean

};

type JssmTransitions<DataType> =
  JssmTransition<DataType>[];

type JssmTransitionList = {
  entrances : Array<StateType>,
  exits     : Array<StateType>
};

type JssmTransitionCycle = {
  key   : 'cycle',
  value : StateType
};

type JssmTransitionRule =
  StateType
| JssmTransitionCycle;





type JssmGenericState = {

  from     : Array< StateType > ,
  name     :        StateType   ,
  to       : Array< StateType > ,
  complete : boolean

};





type JssmMachineInternalState<DataType> = {

  internal_state_impl_version : 1,

  state                       : StateType,
  states                      : Map< StateType, JssmGenericState >,
  named_transitions           : Map< StateType, number >,
  edge_map                    : Map< StateType, Map<StateType, number> >,
  actions                     : Map< StateType, Map<StateType, number> >,
  reverse_actions             : Map< StateType, Map<StateType, number> >,
  edges                       : Array< JssmTransition<DataType> >

};





type JssmStatePermitter<DataType> =
  (OldState: StateType, NewState: StateType, OldData: DataType, NewData: DataType) => boolean;

type JssmStatePermitterMaybeArray<DataType> =
  JssmStatePermitter<DataType> | Array< JssmStatePermitter<DataType> >;

type JssmGenericMachine<DataType> = {

  name?            : string,
  state            : StateType,
  data?            : DataType,
  nodes?           : Array<StateType>,
  transitions      : JssmTransitions<DataType>,
  check?           : JssmStatePermitterMaybeArray<DataType>,

  min_transitions? : number,
  max_transitions? : number,

  allow_empty?     : boolean,
  allow_islands?   : boolean,
  allow_force?     : boolean,

  keep_history?    : boolean | number

};





type JssmStateDeclarationRule = {
  key       : string,
  value     : any,  // TODO FIXME COMEBACK enumerate types against concrete keys
  name?     : string
};

type JssmStateDeclaration = {

  declarations     : Array<JssmStateDeclarationRule>,

  shape?           : JssmShape,
  color?           : JssmColor,
  corners?         : JssmCorner,
  linestyle?       : JssmLineStyle,

  textColor?       : JssmColor,
  backgroundColor? : JssmColor,
  borderColor?     : JssmColor,

  state            : StateType,
  property?        : { name: string, value: unknown }

};





type JssmGenericConfig<DataType> = {

  graph_layout?              : JssmLayout,

  complete?                  : Array<StateType>,
  transitions                : JssmTransitions<DataType>,

  theme?                     : FslTheme,
  flow?                      : FslDirection,

  name?                      : string,
  data?                      : DataType,
  nodes?                     : Array<StateType>,  // uncommon
  check?                     : JssmStatePermitterMaybeArray<DataType>,
  history?                   : number,

//locked?                    : bool = true,
  min_exits?                 : number,
  max_exits?                 : number,
  allow_islands?             : false,
  allow_force?               : false,
  actions?                   : JssmPermittedOpt,

  simplify_bidi?             : boolean,

  dot_preamble?              : string,

  start_states               : Array<StateType>,
  end_states?                : Array<StateType>,

  state_declaration?         : Object[],
  property_definition?       : JssmPropertyDefinition[],
  state_property?            : JssmPropertyDefinition[]

  arrange_declaration?       : Array<Array<StateType>>,
  arrange_start_declaration? : Array<Array<StateType>>,
  arrange_end_declaration?   : Array<Array<StateType>>,

  machine_author?            : string | Array<string>,
  machine_comment?           : string,
  machine_contributor?       : string | Array<string>,
  machine_definition?        : string,
  machine_language?          : string,   // TODO FIXME COMEBACK
  machine_license?           : string,   // TODO FIXME COMEBACK
  machine_name?              : string,
  machine_version?           : string,   // TODO FIXME COMEBACK

  fsl_version?               : string,   // TODO FIXME COMEBACK

  auto_api?                  : boolean | string, // TODO FIXME COMEBACK // boolean false means don't; boolean true means do; string means do-with-this-prefix
  instance_name?             : string | undefined

};





type JssmCompileRule = {

  agg_as : string,
  val    : any      // TODO COMEBACK FIXME

};





type JssmCompileSe = {

  to            : StateType,
  se            : JssmCompileSe,
  kind          : JssmArrow,
  l_action?     : StateType,
  r_action?     : StateType,
  l_probability : number,
  r_probability : number

};





type JssmCompileSeStart<DataType> = {

  from           : DataType,
  se             : JssmCompileSe,
  key            : string,
  value?         : string | number,
  name?          : string,
  state?         : string,
  default_value? : any,     // for properties
  required?      : boolean  // for properties

};





type JssmParseTree =

  Array< JssmCompileSeStart<StateType> >;





type JssmParseFunctionType =

  (string) => JssmParseTree;





type BasicHookDescription<mDT> = {
  kind    : 'hook'
  from    : string,
  to      : string,
  handler : HookHandler<mDT>
};

type HookDescriptionWithAction<mDT> = {
  kind    : 'named',
  from    : string,
  to      : string,
  action  : string,
  handler : HookHandler<mDT>
};

type StandardTransitionHook<mDT> = {
  kind    : 'standard transition',
  handler : HookHandler<mDT>
};

type MainTransitionHook<mDT> = {
  kind    : 'main transition',
  handler : HookHandler<mDT>
};

type ForcedTransitionHook<mDT> = {
  kind    : 'forced transition',
  handler : HookHandler<mDT>
};

type AnyTransitionHook<mDT> = {
  kind    : 'any transition',
  handler : HookHandler<mDT>
};

type GlobalActionHook<mDT> = {
  kind    : 'global action',
  action  : string,
  handler : HookHandler<mDT>
};

type AnyActionHook<mDT> = {
  kind    : 'any action',
  handler : HookHandler<mDT>
};

type EntryHook<mDT> = {
  kind    : 'entry',
  to      : string,
  handler : HookHandler<mDT>
};

type ExitHook<mDT> = {
  kind    : 'exit',
  from    : string,
  handler : HookHandler<mDT>
};



type PostBasicHookDescription<mDT> = {
  kind    : 'post hook'
  from    : string,
  to      : string,
  handler : PostHookHandler<mDT>
};

type PostHookDescriptionWithAction<mDT> = {
  kind    : 'post named',
  from    : string,
  to      : string,
  action  : string,
  handler : PostHookHandler<mDT>
};

type PostStandardTransitionHook<mDT> = {
  kind    : 'post standard transition',
  handler : PostHookHandler<mDT>
};

type PostMainTransitionHook<mDT> = {
  kind    : 'post main transition',
  handler : PostHookHandler<mDT>
};

type PostForcedTransitionHook<mDT> = {
  kind    : 'post forced transition',
  handler : PostHookHandler<mDT>
};

type PostAnyTransitionHook<mDT> = {
  kind    : 'post any transition',
  handler : PostHookHandler<mDT>
};

type PostGlobalActionHook<mDT> = {
  kind    : 'post global action',
  action  : string,
  handler : PostHookHandler<mDT>
};

type PostAnyActionHook<mDT> = {
  kind    : 'post any action',
  handler : PostHookHandler<mDT>
};

type PostEntryHook<mDT> = {
  kind    : 'post entry',
  to      : string,
  handler : PostHookHandler<mDT>
};

type PostExitHook<mDT> = {
  kind    : 'post exit',
  from    : string,
  handler : PostHookHandler<mDT>
};





type HookDescription<mDT>
  = BasicHookDescription<mDT>
  | HookDescriptionWithAction<mDT>
  | GlobalActionHook<mDT>
  | AnyActionHook<mDT>
  | StandardTransitionHook<mDT>
  | MainTransitionHook<mDT>
  | ForcedTransitionHook<mDT>
  | AnyTransitionHook<mDT>
  | EntryHook<mDT>
  | ExitHook<mDT>
  | PostBasicHookDescription<mDT>
  | PostHookDescriptionWithAction<mDT>
  | PostGlobalActionHook<mDT>
  | PostAnyActionHook<mDT>
  | PostStandardTransitionHook<mDT>
  | PostMainTransitionHook<mDT>
  | PostForcedTransitionHook<mDT>
  | PostAnyTransitionHook<mDT>
  | PostEntryHook<mDT>
  | PostExitHook<mDT>;





/* Governs the return value from a hook when non-trivial; potentially carries final state, data; definitely carries whether passed */
type HookComplexResult<mDT> = {
  pass   : boolean,    // DO NOT MAKE OPTIONAL, prevents accidental other objects
  state? : StateType,
  data?  : mDT,
};

type HookResult<mDT> = true | false | undefined | void | HookComplexResult<mDT>;  /** Documents whether a hook succeeded, either with a primitive or a reference to the hook complex object */





type HookContext<mDT> = {
  data: mDT
};





type HookHandler<mDT> = (hook_context: HookContext<mDT>) =>
  HookResult<mDT>;

type PostHookHandler<mDT> = (hook_context: HookContext<mDT>) =>
  void;





type JssmErrorExtendedInfo = {
  requested_state? : StateType | undefined
};





type JssmHistory<mDT> = circular_buffer<[StateType, mDT]>;





export {

  JssmColor,
    JssmShape,

  JssmTransition,
    JssmTransitions,
    JssmTransitionList,
    JssmTransitionRule,

  JssmArrow,
    JssmArrowKind,
    JssmArrowDirection,

  JssmGenericConfig,
    JssmGenericState,
    JssmGenericMachine,

  JssmParseTree,
    JssmCompileSe,
    JssmCompileSeStart,
    JssmCompileRule,

  JssmPermitted,
    JssmPermittedOpt,
    JssmResult,

  JssmStateDeclaration,
    JssmStateDeclarationRule,

  JssmLayout,

  JssmHistory,
  JssmSerialization,
  JssmPropertyDefinition,

  JssmParseFunctionType,

  JssmMachineInternalState,

  JssmErrorExtendedInfo,

  FslDirection,
    FslTheme,

  HookDescription,
    HookHandler,
    HookContext,
    HookResult,
    HookComplexResult

};
