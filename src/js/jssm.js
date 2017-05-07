
// @flow

import type { JssmMachine, JssmConfig, JssmTransitions } from './jssm-types';

const version = null; // replaced from package.js in build





const new_machine = (props:mixed) : JssmMachine => {
    return {state:'1', transitions: []}; // whargarbl this should not work
};





class jssm {


  constructor({ transitions } : JssmConfig) {

    transitions.map(tr => {
      console.log(`hook up ${JSON.stringify(tr)}`);
    });

  }



  state() : string {
    return ''; // todo whargarbl
  }

  machine_state() : mixed {
    return {}; // todo whargarbl
  }


  nodes() : Array<mixed> { // todo whargarbl
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


  transitions_for(whichNode : string) : Array<mixed> { // todo whargarbl
    return []; // todo whargarbl
  }

  entrances_for(whichNode : string) : Array<mixed> { // todo whargarbl
    return []; // todo whargarbl
  }

  exits_for(whichNode : string) : Array<mixed> { // todo whargarbl
    return []; // todo whargarbl
  }


  actions_for(whichNode : string) : Array<mixed> { // todo whargarbl
    return []; // todo whargarbl
  }

  action_entrances_for(whichNode : string) : Array<mixed> { // todo whargarbl
    return []; // todo whargarbl
  }

  action_exits_for(whichNode : string) : Array<mixed> { // todo whargarbl
    return []; // todo whargarbl
  }


  is_unenterable(whichNode : string) : boolean {
    return this.entrances_for(whichNode).length === 0;
  }

  has_unenterables() : boolean {
    return this.nodes.some(this.is_unenterable);
  }


  is_terminal(whichNode : string) : boolean {
    return this.exits_for(whichNode).length === 0;
  }

  has_terminals() : boolean {
    return this.nodes.some(this.is_terminal);
  }


  action(name : string, new_data? : mixed) : boolean {
    return false; // todo whargarbl
  }

  transition(newNode : string, new_data? : mixed) : boolean {
    return false; // todo whargarbl
  }

  force_transition(newNode : string, new_data? : mixed) : boolean {
    return false; // todo whargarbl
  }


  valid_action(action : string, new_data : mixed) : boolean {
    return false; // todo whargarbl
  }

  valid_transition(newNode : string, new_data : mixed) : boolean {
    return false; // todo whargarbl
  }

  valid_force_transition(newNode : string, new_data : mixed) : boolean {
    return false; // todo whargarbl
  }


}





export {

  new_machine,
  version

};
