
// @flow





type JssmSuccess    = { success: true };
type JssmFailure    = { success: false, error: mixed };
type JssmIncomplete = { success: 'incomplete' };
type JssmResult     = JssmSuccess | JssmFailure | JssmIncomplete;




type JssmGenericState<NT> = {
  from: Array<NT>,
  name: NT,
  to: Array<NT>
};




type ARD = 'allow' | 'require' | 'disallow';





type JssmTransitionPermitter<NT, DT>           = (OldState: NT, NewState: NT, OldData: DT, NewData: DT) => boolean;
type JssmTransitionPermitterMaybeArray<NT, DT> = JssmTransitionPermitter<NT, DT> | Array< JssmTransitionPermitter<NT, DT> >;





type JssmStatePermitter<NT, DT>           = (OldState: NT, NewState: NT, OldData: DT, NewData: DT) => boolean;
type JssmStatePermitterMaybeArray<NT, DT> = JssmStatePermitter<NT, DT> | Array< JssmStatePermitter<NT, DT> >;

type JssmGenericMachine<NT, DT> = {

  name?            : string,
  state            : NT,
  data?            : DT,
  nodes?           : Array<NT>,
  transitions      : JssmTransitions<NT, DT>,
  valid?           : JssmStatePermitterMaybeArray<NT, DT>,

  min_transitions? : number,
  max_transitions? : number,

  allow_empty?     : boolean,
  allow_islands?   : boolean,
  allow_force?     : boolean,

  keep_history?    : boolean | number

};





type JssmTransition<NT, DT> = {
    from        : NT,
    to          : NT,
    name?       : string,
    action?     : string,
    valid?      : JssmTransitionPermitterMaybeArray<NT, DT>,  // validate this edge's transition; usually about data
    likelihood? : number,                                     // for stoch modelling, would like to constrain to [0..1], dunno how
    usual?      : ''                                          // most common exit, for graphing; likelihood overrides
};

type JssmTransitions<NT, DT> = Array< JssmTransition<NT, DT> >;

type JssmTransitionList<NT> = {
	entrances : Array<NT>,
	exits     : Array<NT>
};




type JssmGenericConfig<NT, DT> = {

  initial_state  : NT,

  transitions    : JssmTransitions<NT, DT>,

  name?          : string,
  data?          : mixed,
  nodes?         : Array<NT>,  // uncommon
  valid?         : JssmStatePermitterMaybeArray<NT, DT>,

//locked?        : bool = true,
  min_exits?     : number,
  max_exits?     : number,
  allow_islands? : false,
  allow_force?   : false,
  actions?       : ARD

};





type JssmState   = JssmGenericState<string>;
type JssmMachine = JssmGenericMachine<string, JssmState>;
type JssmConfig  = JssmGenericConfig<string, JssmState>;





export type {

  JssmResult,
    JssmSuccess,
    JssmFailure,
    JssmIncomplete,

  ARD,

  JssmTransitionPermitter,
    JssmTransitionPermitterMaybeArray,

  JssmTransition,
    JssmTransitions,

  JssmTransitionList,

  JssmStatePermitter,
    JssmStatePermitterMaybeArray,

  JssmGenericMachine,

  JssmMachine,
    JssmState,

  JssmConfig

};
