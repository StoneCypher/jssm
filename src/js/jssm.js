
// @flow

const version = null; // replaced from package.js in build



type JssmEdgePermitter<NT, DT>    = (OldState: NT, NewState: NT, OldData: DT, NewData: DT) => boolean;
type JssmEdgePermitterDef<NT, DT> = JssmEdgePermitter<NT, DT> | Array< JssmEdgePermitter<NT, DT> >;

type JssmEdge<NT, DT> = {
  from        : NT,
  to          : NT,
  name?       : string,
  valid?      : JssmEdgePermitterDef<NT, DT>, // validate this edge's transition; usually about data
  likelihood? : number,                       // for stoch modelling
  usual?      : NT                            // most common exit, for graphing; likelihood overrides
};

type JssmEdges<NT, DT> = Array< JssmEdge<NT, DT> >;



type JssmStatePermitter<NT, DT>    = (OldState: NT, NewState: NT, OldData: DT, NewData: DT) => boolean;
type JssmStatePermitterDef<NT, DT> = JssmStatePermitter<NT, DT> | Array< JssmStatePermitter<NT, DT> >;

type JssmGenericMachine<NT, DT> = {

  name?          : string,
  state          : NT,
  data?          : DT,
  nodes?         : Array<NT>,
  edges          : JssmEdges<NT, DT>,
  valid?         : JssmStatePermitterDef<NT, DT>,

  min_edges?     : number,
  max_edges?     : number,

  allow_empty?   : boolean,
  allow_islands? : boolean,
  allow_force?   : boolean

};



type JssmMachine = JssmGenericMachine<string, mixed>;

const new_machine = (props:mixed) : JssmMachine => {
    return {state:'1', edges: []}; // whargarbl this should not work
};





export {

  new_machine,
  version

};
