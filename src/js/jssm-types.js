
// @flow





type JssmSuccess        = { success: true };
type JssmFailure        = { success: false, error: mixed };
type JssmIncomplete     = { success: 'incomplete' };
type JssmResult         = JssmSuccess | JssmFailure | JssmIncomplete;

type JssmPermitted      = 'required' | 'disallowed';
type JssmPermittedOpt   = 'required' | 'disallowed' | 'optional';

type JssmArrow          = '->' | '<->' | '<=->' | '<~->'
                        | '=>' | '<=>' | '<-=>' | '<~=>'
                        | '~>' | '<~>' | '<-~>' | '<=~>';

type JssmArrowDirection = 'left' | 'right' | 'both';
type JssmArrowKind      = 'none' | 'legal' | 'main' | 'forced';

type JssmLayout         = 'dot' | 'circo' | 'twopi' | 'fdp';



type JssmMachineInternalState<NT, DT> = {

    internal_state_impl_version : 1,

    state                       : NT,
    states                      : Map< NT, JssmGenericState<NT> >,
    named_transitions           : Map< NT, number >,
    edge_map                    : Map< NT, Map<NT, number> >,
    actions                     : Map< NT, Map<NT, number> >,
    reverse_actions             : Map< NT, Map<NT, number> >,
    edges                       : Array< JssmTransition<NT, DT> >

};




type JssmGenericState<NT> = {
  from     : Array< NT > ,
  name     :        NT   ,
  to       : Array< NT > ,
  complete : boolean
};




type JssmTransitionPermitter<NT, DT>           = (OldState: NT, NewState: NT, OldData: DT, NewData: DT) => boolean;

type JssmTransitionPermitterMaybeArray<NT, DT> =        JssmTransitionPermitter<NT, DT>
                                               | Array< JssmTransitionPermitter<NT, DT> >;





type JssmStatePermitter<NT, DT>           = (OldState: NT, NewState: NT, OldData: DT, NewData: DT) => boolean;
type JssmStatePermitterMaybeArray<NT, DT> = JssmStatePermitter<NT, DT> | Array< JssmStatePermitter<NT, DT> >;

type JssmGenericMachine<NT, DT> = {

  name?            : string,
  state            : NT,
  data?            : DT,
  nodes?           : Array<NT>,
  transitions      : JssmTransitions<NT, DT>,
  check?           : JssmStatePermitterMaybeArray<NT, DT>,

  min_transitions? : number,
  max_transitions? : number,

  allow_empty?     : boolean,
  allow_islands?   : boolean,
  allow_force?     : boolean,

  keep_history?    : boolean | number

};





type JssmTransition<NT, DT> = {
    from         : NT,
    to           : NT,
    name?        : string,
    action?      : NT,
    check?       : JssmTransitionPermitterMaybeArray<NT, DT>,  // validate this edge's transition; usually about data
    probability? : number,                                     // for stoch modelling, would like to constrain to [0..1], dunno how
    kind         : JssmArrowKind,
    forced_only  : boolean,
    main_path    : boolean
};

type JssmTransitions<NT, DT> = Array< JssmTransition<NT, DT> >;

type JssmTransitionList<NT> = {
  entrances : Array<NT>,
  exits     : Array<NT>
};




type JssmGenericConfig<NT, DT> = {

  initial_state  : NT,

  layout?        : JssmLayout,

  complete?      : Array<NT>,
  transitions    : JssmTransitions<NT, DT>,

  name?          : string,
  data?          : mixed,
  nodes?         : Array<NT>,  // uncommon
  check?         : JssmStatePermitterMaybeArray<NT, DT>,

//locked?        : bool = true,
  min_exits?     : number,
  max_exits?     : number,
  allow_islands? : false,
  allow_force?   : false,
  actions?       : JssmPermittedOpt,

  simplify_bidi? : boolean,

  auto_api?      : boolean | string  // boolean false means don't; boolean true means do; string means do-with-this-prefix

};





type JssmCompileRule = {

  agg_as : string,
  val    : mixed

};





type JssmCompileSe<NT> = {

  to            : NT,
  se            : JssmCompileSe<NT>,
  kind          : JssmArrow,
  l_action?     : NT,
  r_action?     : NT,
  l_probability : number,
  r_probability : number

};





type JssmCompileSeStart<NT> = {

  from   : NT,
  se     : JssmCompileSe<NT>,
  key    : string,
  value? : string | mixed | number

};





type JssmParseTree<NT> = Array< JssmCompileSeStart<NT> >;





export type {

  JssmTransition,
    JssmTransitions,
    JssmTransitionList,

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
    JssmResult,

  JssmLayout,

  JssmMachineInternalState

};
