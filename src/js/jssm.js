
// @flow

import type { JssmMachine, JssmState, JssmConfig, JssmTransitions } from './jssm-types';

const version = null; // replaced from package.js in build





class machine {

  _state             : string;
  _states            : Map<string, JssmState>;           // todo whargarbl this really should't be string  // remove mixed todo whargarbl
  _edges             : Array<mixed>;                     // remove mixed todo whargarbl
  _edge_map          : Map<string, Map<string, mixed>>;  // remove mixed todo whargarbl
  _named_transitions : Map<string, mixed>;               // remove mixed todo whargarbl
  _actions           : Map<string, Map<string, mixed>>;  // remove mixed todo whargarbl
  _reverse_actions   : Map<string, Map<string, mixed>>;  // remove mixed todo whargarbl

  constructor({ initial_state, transitions } : JssmConfig) {

    this._state             = initial_state;
    this._states            = new Map();
    this._edges             = [];
    this._edge_map          = new Map();
    this._named_transitions = new Map();
    this._actions           = new Map();
    this._reverse_actions   = new Map();

    transitions.map( (tr:any) => { // whargarbl burn out any

      if (tr.from === undefined) { throw new Error(`transition must define 'from': ${JSON.stringify(tr)}`); }
      if (tr.to   === undefined) { throw new Error(`transition must define 'to': ${  JSON.stringify(tr)}`); }

      // get the cursors.  what a mess
      var cursor_from : any = (this._states.get(tr.from): any); // whargarbl burn out uses of any
      if (cursor_from === undefined) {
        this._new_state({name: tr.from, from: [], to: [] });
        cursor_from = (this._states.get(tr.from) : any);
      }

      var cursor_to : any = (this._states.get(tr.to): any); // whargarbl burn out uses of any
      if (cursor_to === undefined) {
        this._new_state({name: tr.to, from: [], to: [] });
        cursor_to = (this._states.get(tr.to) : any);
      }

      // guard against existing connections being re-added
      if (cursor_from.to.includes(tr.to)) { throw new Error(`already has ${tr.from} to ${tr.to}`); }
      else                                { cursor_from.to.push(tr.to); }

      if (cursor_to.from.includes(tr.from)) { throw new Error(`already has ${tr.to} from ${tr.from}`); }
      else                                  { cursor_to.from.push(tr.from); }

      // add the edge; note its id
      this._edges.push(tr);
      const thisEdgeId = this._edges.length - 1;

      // guard against repeating a transition name
      if (tr.name) {
        if (this._named_transitions.has(tr.name)) { throw new Error(`named transition "${tr.name}" already created`); }
        else                                      { this._named_transitions.set(tr.name, thisEdgeId); }
      }

      // set up the mapping, so that edges can be looked up by endpoint pairs
      var from_mapping:any = (this._edge_map.get(tr.from) : any);  // whargarbl burn out uses of any
      if (from_mapping === undefined) {
        this._edge_map.set(tr.from, new Map());
        from_mapping = (this._edge_map.get(tr.from) : any);  // whargarbl burn out uses of any
      }

      var to_mapping:any = (from_mapping.get(tr.to) : any);  // whargarbl burn out uses of any
      if (to_mapping) { throw new Error(`from -> to already exists ${tr.from} ${tr.to}`); }
      else            { from_mapping.set(tr.to, thisEdgeId); }

      // set up the action mapping, so that actions can be looked up by origin
      if (tr.action) {

        // forward mapping first by action name
        if (!(this._actions.has(tr.action))) {
          this._actions.set(tr.action, new Map());
        }

        const actionMap = this._actions.get(tr.action);
        if (actionMap) {
          if (actionMap.has(tr.from)) { throw new Error(`action ${tr.action} already attached to origin ${tr.from}`); }
          else {
            actionMap.set(tr.from, thisEdgeId);
          }
        } else {
          throw new Error('should be impossible, satisfying type checker that doesn\'t know .set precedes .get.  severe error?');
        }

        // reverse mapping first by state name
        if (!(this._reverse_actions.has(tr.from))) {
          this._reverse_actions.set(tr.from, new Map());
        }

        const rActionMap = this._reverse_actions.get(tr.from);
        if (rActionMap) {
          if (rActionMap.has(tr.action)) { throw new Error(`raction ${tr.from} already attached to action ${tr.action}`); }
          else {
            rActionMap.set(tr.action, thisEdgeId);
          }
        } else {
          throw new Error('should be impossible, satisfying type checker that doesn\'t know .set precedes .get again.  severe error?')
        }

      }

    });

  }


  _new_state(state_config : any) : string { // whargarbl get that state_config any under control
    if (this._states.has(state_config.name)) { throw new Error(`state ${state_config.name} already exists`); }
    this._states.set(state_config.name, state_config);
    return state_config.name;
  }



  state() : string {
    return this._state;
  }

  machine_state() : mixed {
    return {}; // todo whargarbl
  }

  load_machine_state() : boolean {
    return false; // todo whargarbl
  }


  states() : Array<string> {
    return [... this._states.keys()];
  }

  transitions() : Array<mixed> {
    return this._edges;
  }

  named_transitions() : Map<string, mixed> {
    return this._named_transitions;
  }

  actions() : Array<mixed> {
    return [... this._actions.keys()];
  }


  edge_id(from:string, to:string) {
    return this._edge_map.has(from)? (this._edge_map.get(from) : any).get(to) : undefined;
  }

  edge(from:string, to:string) {
    const id = this.edge_id(from, to);
    return (id === undefined)? undefined : this._edges[id];
  }


  transitions_for(whichState : string) : mixed { // whargarbl remove mixed
    return {entrances: this.entrances_for(whichState), exits: this.exits_for(whichState)};
  }

  entrances_for(whichState : string) : Array<string> {
    return (this._states.get(whichState) || {}).from; // return undefined if it doesn't exist by asking for a member of an empty obj
  }

  exits_for(whichState : string) : Array<mixed> { // whargarbl remove mixed
    return (this._states.get(whichState) : any).to; // whargarbl burn out any
  }


  actions_for(whichState : string) : Array<mixed> {
    return [... ((this._reverse_actions.get(whichState) || new Map()).keys() || [])]; // wasteful
  }

  action_on_states(whichState : string) : Array<mixed> {
    return [... ((this._actions.get(whichState) || new Map()).keys() || [])]; // wasteful
  }

  action_entrances_at(whichState : string) : Array<mixed> { // whargarbl remove mixed
    return [... (this._reverse_actions.get(whichState) || new Map()).values()] // wasteful
           .filter( (o:any) => o.to === whichState) // whargarbl burn out any
           .map( (edgeId:any) => (this._edges[edgeId] : any).to); // whargarbl burn out any
  }

  action_exits_at(whichState : string) : Array<mixed> { // whargarbl defeat mixed
    return [... (this._reverse_actions.get('red') || new Map()).values()] // wasteful
           .filter( (o:any) => o.from === whichState) // whargarbl burn out any
           .map( (edgeId:any) => (this._edges[edgeId] : any).to); // whargarbl burn out any
  }


  is_unenterable(whichState : string) : boolean {
    return this.entrances_for(whichState).length === 0;
  }

  has_unenterables() : boolean {
    return this.states.some(this.is_unenterable);
  }


  is_terminal(whichState : string) : boolean {
    return this.exits_for(whichState).length === 0;
  }

  has_terminals() : boolean {
    return this.states.some(this.is_terminal);
  }


  action(name : string, new_data? : mixed) : boolean {
    return false; // major todo whargarbl
  }

  transition(newState : string, new_data? : mixed) : boolean {
    return false; // major todo whargarbl
  }

  force_transition(newState : string, new_data? : mixed) : boolean {
    return false; // major todo whargarbl
  }


  valid_action(action : string, new_data : mixed) : boolean {
    return false; // major todo whargarbl
  }

  valid_transition(newState : string, new_data : mixed) : boolean {
    return false; // major todo whargarbl
  }

  valid_force_transition(newState : string, new_data : mixed) : boolean {
    return false; // major todo whargarbl
  }


  viz() {
    const l_states = this.states();
    const node_of = (state) => `n${l_states.indexOf(state)}`;

    const nodes = l_states.map( (s:any) => `${node_of(s)} [label="${s}"];`).join(' ');

    const edges = this.states().map( (s:any) =>

      this.exits_for(s).map( (ex:any) => {
        const edge  = this.edge(s, ex),
              label = edge? (edge.name || undefined) : undefined;
        return `${node_of(s)}->${node_of(ex)} [${label? `label="${(label:any)}"`:''} len=2];`;
      }).join(' ')

    ).join(' ');

    return `digraph G {\n  fontname="helvetica neue";\n  style=filled;\n  bgcolor=lightgrey;\n  node [shape=box; style=filled; fillcolor=white; fontname="helvetica neue"];\n  edge [len=2; fontname="helvetica neue"];\n\n  ${nodes}\n\n  ${edges}\n}`;

  }


}





export {

  machine,

  version

};
