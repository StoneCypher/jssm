
// todo remove me, suppressing an empty bundle warning
function hi() { return 'hiya'; }

// todo remove me, suppressing an empty bundle warning
export { hi };





type JssmSuccess        = { success: true };
type JssmFailure        = { success: false, error: any };
type JssmIncomplete     = { success: 'incomplete' };
type JssmResult         = JssmSuccess | JssmFailure | JssmIncomplete;

type JssmColor          = string;  // TODO FIXME constrain to #RRGGBBAA later // whargarbl



type JssmPermitted      = 'required' | 'disallowed';
type JssmPermittedOpt   = 'required' | 'disallowed' | 'optional';

type JssmArrow          = '->' | '<->' | '<=->' | '<~->'
                        | '=>' | '<=>' | '<-=>' | '<~=>'
                        | '~>' | '<~>' | '<-~>' | '<=~>';

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





type State = string;





type JssmTransitionPermitter<StateType, DataType> =
  (OldState: StateType, NewState: StateType, OldData: DataType, NewData: DataType) => boolean;

type JssmTransitionPermitterMaybeArray<StateType, DataType> =
    JssmTransitionPermitter<StateType, DataType>
  | Array< JssmTransitionPermitter<StateType, DataType> >;





type JssmTransition<StateType, DataType> = {

  from         : StateType,
  to           : StateType,
  name?        : string,
  action?      : StateType,
  check?       : JssmTransitionPermitterMaybeArray<StateType, DataType>,  // validate this edge's transition; usually about data
  probability? : number,                                                  // for stoch modelling, would like to constrain to [0..1], dunno how // TODO FIXME
  kind         : JssmArrowKind,
  forced_only  : boolean,
  main_path    : boolean

};

type JssmTransitions<StateType, DataType> =
  Array< JssmTransition<StateType, DataType> >;

type JssmTransitionList<StateType> = {
  entrances : Array<StateType>,
  exits     : Array<StateType>
};

type JssmTransitionCycle<StateType> = {
  key   : 'cycle',
  value : StateType
};

type JssmTransitionRule<StateType> =
  StateType
| JssmTransitionCycle<StateType>;





type JssmGenericState<StateType> = {

  from     : Array< StateType > ,
  name     :        StateType   ,
  to       : Array< StateType > ,
  complete : boolean

};





type JssmMachineInternalState<StateType, DataType> = {

  internal_state_impl_version : 1,

  state                       : StateType,
  states                      : Map< StateType, JssmGenericState<StateType> >,
  named_transitions           : Map< StateType, number >,
  edge_map                    : Map< StateType, Map<StateType, number> >,
  actions                     : Map< StateType, Map<StateType, number> >,
  reverse_actions             : Map< StateType, Map<StateType, number> >,
  edges                       : Array< JssmTransition<StateType, DataType> >

};





type JssmStatePermitter<StateType, DataType> =
  (OldState: StateType, NewState: StateType, OldData: DataType, NewData: DataType) => boolean;

type JssmStatePermitterMaybeArray<StateType, DataType> =
  JssmStatePermitter<StateType, DataType> | Array< JssmStatePermitter<StateType, DataType> >;

type JssmGenericMachine<StateType, DataType> = {

  name?            : string,
  state            : StateType,
  data?            : DataType,
  nodes?           : Array<StateType>,
  transitions      : JssmTransitions<StateType, DataType>,
  check?           : JssmStatePermitterMaybeArray<StateType, DataType>,

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

type JssmStateDeclaration<StateType> = {
  declarations : Array<JssmStateDeclarationRule>,
  node_shape?  : JssmShape,
  node_color?  : JssmColor,
  state        : StateType
};





type JssmGenericConfig<StateType, DataType> = {

  graph_layout?        : JssmLayout,

  complete?            : Array<StateType>,
  transitions          : JssmTransitions<StateType, DataType>,

  name?                : string,
  data?                : DataType,
  nodes?               : Array<StateType>,  // uncommon
  check?               : JssmStatePermitterMaybeArray<StateType, DataType>,

//locked?              : bool = true,
  min_exits?           : number,
  max_exits?           : number,
  allow_islands?       : false,
  allow_force?         : false,
  actions?             : JssmPermittedOpt,

  simplify_bidi?       : boolean,

  start_states         : Array<StateType>,
  end_states?          : Array<StateType>,

  state_declaration?   : Array<Object>,    // eslint-disable-line flowtype/no-weak-types // TODO FIXME COMEBACK

  machine_author?      : string | Array<string>,
  machine_comment?     : string,
  machine_contributor? : string | Array<string>,
  machine_definition?  : string,
  machine_language?    : string,   // TODO FIXME COMEBACK
  machine_license?     : string,   // TODO FIXME COMEBACK
  machine_name?        : string,
  machine_version?     : string,   // TODO FIXME COMEBACK

  fsl_version?         : string,   // TODO FIXME COMEBACK

  auto_api?            : boolean | string  // boolean false means don't; boolean true means do; string means do-with-this-prefix

};





type JssmCompileRule = {

  agg_as : string,
  val    : any      // TODO COMEBACK FIXME

};





type JssmCompileSe<StateType> = {

  to            : StateType,
  se            : JssmCompileSe<StateType>,
  kind          : JssmArrow,
  l_action?     : StateType,
  r_action?     : StateType,
  l_probability : number,
  r_probability : number

};





type JssmCompileSeStart<StateType> = {

  from   : StateType,
  se     : JssmCompileSe<StateType>,
  key    : string,
  value? : string | number,
  name?  : string

};





type JssmParseTree<StateType> =

  Array< JssmCompileSeStart<StateType> >;





type JssmParseFunctionType<StateType> =

  (string) => JssmParseTree<StateType>;





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

  JssmMachineInternalState

};
