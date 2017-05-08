
// @flow

import type { JssmMachine, JssmConfig, JssmTransitions } from './jssm-types';

const version = null; // replaced from package.js in build





const new_machine = (props:mixed) : JssmMachine => {
    return {state:'1', transitions: []}; // whargarbl this should not work
};






class machine {

  _state  : string;
  _states : Map<string, mixed>;  // todo whargarbl this really should't be string
  _edges  : Array<mixed>;

  constructor({ initial_state, transitions } : JssmConfig) {

    this._state  = initial_state;
    this._states = new Map();
    this._edges  = [];

    transitions.map( (tr:any) => { // drive out uses of any todo whargarbl
      if (tr.from === undefined) { throw `transition must define 'from': ${JSON.stringify(tr)}`; }
      if (tr.to   === undefined) { throw `transition must define 'to': ${  JSON.stringify(tr)}`; }

      const upmap = (origin, target) => {
        const cursor : any = this._states.get(tr[origin]); // todo whargarbl remove any use of any
        if (cursor === undefined) {
          console.log(`this._new_state({name: ${tr[target]}, [origin]: [${tr[origin]}] })`);
          this._new_state({name: tr[target], [origin]: [tr[origin]] });
        } else {
          if (cursor[target].includes(tr[target])) {
            throw `transition already exists ${tr[origin]} - ${tr[target]} in ${JSON.stringify(tr)}`;
          }
          cursor[target].push(tr[target]);
        }
      }

      upmap('from', 'to');
      upmap('to',   'from');

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


  states() : Array<mixed> { // todo whargarbl
    return []; // todo whargarbl
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
