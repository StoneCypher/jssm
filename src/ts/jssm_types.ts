
type StateType = string;





type JssmSuccess        = { success: true };
type JssmFailure        = { success: false, error: any };
type JssmIncomplete     = { success: 'incomplete' };
type JssmResult         = JssmSuccess | JssmFailure | JssmIncomplete;

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





type State = string;





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
  Array< JssmTransition<DataType> >;

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
  key   : string,
  value : any  // TODO FIXME COMEBACK enumerate types against concrete keys
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

  state            : StateType

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

  state_declaration?         : Array<Object>,

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

  from   : DataType,
  se     : JssmCompileSe,
  key    : string,
  value? : string | number,
  name?  : string

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
  | ExitHook<mDT>;





// type HookComplexResult = {};

type HookResult = true | false | undefined | void;





type HookContext<mDT> = {
  data: mDT
};





type HookHandler<mDT> = (hook_context: HookContext<mDT>) =>
  HookResult;





type JssmErrorExtendedInfo = {
  requested_state? : StateType | undefined
};





export {

  JssmColor,

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

  JssmParseFunctionType,

  JssmMachineInternalState,

  JssmErrorExtendedInfo,

  FslDirection,
    FslTheme,

  HookDescription,
    HookHandler,
    HookResult

};
