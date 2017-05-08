
// @flow

import type { JssmMachine, JssmConfig, JssmTransitions } from './jssm-types';

const version = null; // replaced from package.js in build





const new_machine = (props:mixed) : JssmMachine => {
    return {state:'1', transitions: []}; // whargarbl this should not work
};






class machine {

  _state       : string;
  _states      : Map<string, mixed>;  // todo whargarbl this really should't be string  // remove mixed todo whargarbl
  _edges       : Array<mixed>;        // remove mixed todo whargarbl
  _named_edges : Map<string, mixed>;  // remove mixed todo whargarbl
  _actions     : Array<mixed>;        // remove mixed todo whargarbl

  constructor({ initial_state, transitions } : JssmConfig) {

    this._state       = initial_state;
    this._states      = new Map();
    this._edges       = [];
    this._named_edges = new Map();
    this._actions     = [];

    transitions.map( (tr:any) => { // todo whargarbl burn out any

      if (tr.from === undefined) { throw `transition must define 'from': ${JSON.stringify(tr)}`; }
      if (tr.to   === undefined) { throw `transition must define 'to': ${  JSON.stringify(tr)}`; }

      var cursor_from : any = (this._states.get(tr.from): any); // todo whargarbl burn out uses of any
      if (cursor_from === undefined) {
        this._new_state({name: tr.from, from: [], to: [] });
        cursor_from = (this._states.get(tr.from) : any);
      }

      var cursor_to : any = (this._states.get(tr.to): any); // todo whargarbl burn out uses of any
      if (cursor_to === undefined) {
        this._new_state({name: tr.to, from: [], to: [] });
        cursor_to = (this._states.get(tr.to) : any);
      }

      if (cursor_from.to.includes(tr.to)) { throw `already has ${tr.from} to ${tr.to}`; }
      else                                { cursor_from.to.push(tr.to); }

      if (cursor_to.from.includes(tr.from)) { throw `already has ${tr.to} from ${tr.from}`; }
      else                                  { cursor_to.from.push(tr.from); }

      this._edges.push(tr);
      const thisEdgeId = this._edges.length - 1;

      if (tr.name) {
        if (this._named_edges.has(tr.name)) { throw `name ${tr.name} already created ${tr}`; }
        else                                { this._named_edges.set(tr.name, thisEdgeId); }
      }



    });

  }


  _new_state(state_config : any) : string { // todo whargarbl get that state_config under control
    if (this._states.has(state_config.name)) { throw 'state already exists'; }
    this._states.set(state_config.name, state_config);
    return state_config.name;
  }



  state() : string {
    return this._state; // todo whargarbl
  }

  machine_state() : mixed {
    return {}; // todo whargarbl
  }

  load_machine_state() : boolean {
    return false; // todo whargarbl
  }


  states() : Array<mixed> { // todo whargarbl
    return [... this._states.keys()]; // todo whargarbl
  }

  transitions() : Array<mixed> { // todo whargarbl
    return []; // todo whargarbl
  }

  named_transitions() : Array<mixed> { // todo whargarbl
    return []; // todo whargarbl
  }

  actions() : Array<mixed> { // todo whargarbl
    return []; // todo whargarbl
  }


  transitions_for(whichState : string) : Array<mixed> { // todo whargarbl
    return []; // todo whargarbl
  }

  entrances_for(whichState : string) : Array<mixed> { // todo whargarbl
    return []; // todo whargarbl
  }

  exits_for(whichState : string) : Array<mixed> { // todo whargarbl
    return []; // todo whargarbl
  }


  actions_for(whichState : string) : Array<mixed> { // todo whargarbl
    return []; // todo whargarbl
  }

  action_entrances_for(whichState : string) : Array<mixed> { // todo whargarbl
    return []; // todo whargarbl
  }

  action_exits_for(whichState : string) : Array<mixed> { // todo whargarbl
    return []; // todo whargarbl
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
    return false; // todo whargarbl
  }

  transition(newState : string, new_data? : mixed) : boolean {
    return false; // todo whargarbl
  }

  force_transition(newState : string, new_data? : mixed) : boolean {
    return false; // todo whargarbl
  }


  valid_action(action : string, new_data : mixed) : boolean {
    return false; // todo whargarbl
  }

  valid_transition(newState : string, new_data : mixed) : boolean {
    return false; // todo whargarbl
  }

  valid_force_transition(newState : string, new_data : mixed) : boolean {
    return false; // todo whargarbl
  }


}





export {

  machine,

  new_machine,
  version

};
