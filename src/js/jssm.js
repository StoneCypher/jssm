
// whargarbl lots of these return arrays could/should be sets

// @flow

import type {
  JssmGenericState, JssmGenericConfig,
  JssmTransition, JssmTransitionList,
  JssmMachineInternalState
} from './jssm-types';

const version : null = null; // replaced from package.js in build





import { seq, weighted_rand_select, weighted_sample_select, histograph, weighted_histo_key } from './jssm-util.js';

const parse : (string) => Array<any> = require('./jssm-dot.js').parse;  // todo burn out any





class machine<mNT, mDT> {


  _state                  : mNT;
  _states                 : Map<mNT, JssmGenericState<mNT>>;
  _edges                  : Array<JssmTransition<mNT, mDT>>;
  _edge_map               : Map<mNT, Map<mNT, number>>;
  _named_transitions      : Map<mNT, number>;
  _actions                : Map<mNT, Map<mNT, number>>;
  _reverse_actions        : Map<mNT, Map<mNT, number>>;
  _reverse_action_targets : Map<string, Map<string, number>>;

  // whargarbl this badly needs to be broken up, monolith master
  constructor({ initial_state, complete=[], transitions } : JssmGenericConfig<mNT, mDT>) {

    this._state                  = initial_state;
    this._states                 = new Map();
    this._edges                  = [];
    this._edge_map               = new Map();
    this._named_transitions      = new Map();
    this._actions                = new Map();
    this._reverse_actions        = new Map();
    this._reverse_action_targets = new Map();  // todo

    transitions.map( (tr:any) => { // whargarbl burn out any

      if (tr.from === undefined) { throw new Error(`transition must define 'from': ${JSON.stringify(tr)}`); }
      if (tr.to   === undefined) { throw new Error(`transition must define 'to': ${  JSON.stringify(tr)}`); }

      // get the cursors.  what a mess
      let cursor_from = this._states.get(tr.from);
      if (cursor_from === undefined) {
        this._new_state({name: tr.from, from: [], to: [], complete: complete.includes(tr.from) });
        cursor_from = (this._states.get(tr.from) : any);
      }

      let cursor_to = this._states.get(tr.to);
      if (cursor_to === undefined) {
        this._new_state({name: tr.to, from: [], to: [], complete: complete.includes(tr.to) });
        cursor_to = (this._states.get(tr.to) : any);
      }

      // guard against existing connections being re-added
      if (cursor_from.to.includes(tr.to)) {
        throw new Error(`already has ${tr.from} to ${tr.to}`);
      } else {
        cursor_from.to.push(tr.to);
        cursor_to.from.push(tr.from);
      }

      // add the edge; note its id
      this._edges.push(tr);
      const thisEdgeId = this._edges.length - 1;

      // guard against repeating a transition name
      if (tr.name) {
        if (this._named_transitions.has(tr.name)) { throw new Error(`named transition "${tr.name}" already created`); }
        else                                      { this._named_transitions.set(tr.name, thisEdgeId); }
      }

      // set up the mapping, so that edges can be looked up by endpoint pairs
      let from_mapping = this._edge_map.get(tr.from);
      if (from_mapping === undefined) {
        this._edge_map.set(tr.from, new Map());
        from_mapping = (this._edge_map.get(tr.from) : any);  // whargarbl burn out uses of any
      }

//    const to_mapping = from_mapping.get(tr.to);
      from_mapping.set(tr.to, thisEdgeId); // already checked that this mapping doesn't exist, above

      // set up the action mapping, so that actions can be looked up by origin
      if (tr.action) {


        // forward mapping first by action name
        let actionMap = this._actions.get(tr.action);
        if (!(actionMap)) {
          actionMap = new Map();
          this._actions.set(tr.action, actionMap);
        }

        if (actionMap.has(tr.from)) {
          throw new Error(`action ${tr.action} already attached to origin ${tr.from}`);
        } else {
          actionMap.set(tr.from, thisEdgeId);
        }


        // reverse mapping first by state origin name
        let rActionMap = this._reverse_actions.get(tr.from);
        if (!(rActionMap)) {
          rActionMap = new Map();
          this._reverse_actions.set(tr.from, rActionMap);
        }

        // no need to test for reverse mapping pre-presence;
        // forward mapping already covers collisions
        rActionMap.set(tr.action, thisEdgeId);


        // reverse mapping first by state target name
        if (!(this._reverse_action_targets.has(tr.to))) {
          this._reverse_action_targets.set(tr.to, new Map());
        }

/* todo comeback
   fundamental problem is roActionMap needs to be a multimap
        const roActionMap = this._reverse_action_targets.get(tr.to);  // wasteful - already did has - refactor
        if (roActionMap) {
          if (roActionMap.has(tr.action)) {
            throw new Error(`ro-action ${tr.to} already attached to action ${tr.action}`);
          } else {
            roActionMap.set(tr.action, thisEdgeId);
          }
        } else {
          throw new Error('should be impossible - flow doesn\'t know .set precedes .get yet again.  severe error?');
        }
*/
      }

    });

  }

  _new_state(state_config : JssmGenericState<mNT>) : mNT { // whargarbl get that state_config any under control

    if (this._states.has(state_config.name)) {
      throw new Error(`state ${(state_config.name:any)} already exists`);
    }

    this._states.set(state_config.name, state_config);
    return state_config.name;

  }



  state() : mNT {
    return this._state;
  }

/* whargarbl todo major
   when we reimplement this, reintroduce this change to the is_final call

  is_changing() : boolean {
    return true; // todo whargarbl
  }
*/


  state_is_final(whichState : mNT) : boolean {
    return ( (this.state_is_terminal(whichState)) && (this.state_is_complete(whichState)) );
  }

  is_final() : boolean {
//  return ((!this.is_changing()) && this.state_is_final(this.state()));
    return this.state_is_final(this.state());
  }



  machine_state() : JssmMachineInternalState<mNT, mDT> {

    return {
      internal_state_impl_version : 1,

      actions                : this._actions,
      edge_map               : this._edge_map,
      edges                  : this._edges,
      named_transitions      : this._named_transitions,
      reverse_actions        : this._reverse_actions,
//    reverse_action_targets : this._reverse_action_targets,
      state                  : this._state,
      states                 : this._states
    };

  }

/*
  load_machine_state() : boolean {
    return false; // todo whargarbl
  }
*/


  states() : Array<mNT> {
    return [... this._states.keys()];
  }

  state_for(whichState : mNT) : JssmGenericState<mNT> {
    const state = this._states.get(whichState);
    if (state) { return state; }
    else       { throw new Error(`no such state ${JSON.stringify(state)}`); }
  }



  list_edges() : Array< JssmTransition<mNT, mDT> > {
    return this._edges;
  }

  list_named_transitions() : Map<mNT, number> {
    return this._named_transitions;
  }

  list_actions() : Array<mNT> {
    return [... this._actions.keys()];
  }



  get_transition_by_state_names(from: mNT, to: mNT) {
    return this._edge_map.has(from)? (this._edge_map.get(from) : any).get(to) : undefined;
  }

  lookup_transition_for(from: mNT, to: mNT) : ?JssmTransition<mNT, mDT> {
    const id = this.get_transition_by_state_names(from, to);
    return (id === undefined)? undefined : this._edges[id];
  }



  list_transitions(whichState : mNT = this.state()) : JssmTransitionList<mNT> {
    return {entrances: this.list_entrances(whichState), exits: this.list_exits(whichState)};
  }

  list_entrances(whichState : mNT = this.state()) : Array<mNT> {
    return (this._states.get(whichState) || {}).from || [];
  }

  list_exits(whichState : mNT = this.state()) : Array<mNT> {
    return (this._states.get(whichState) || {}).to   || [];
  }



  probable_exits_for(whichState : mNT) : Array< JssmTransition<mNT, mDT> > {

    const wstate = this._states.get(whichState);
    if (!(wstate)) { throw new Error(`No such state ${JSON.stringify(whichState)} in probable_exits_for`); }

    const wstate_to = wstate.to,
          wtf       = wstate_to.map(ws => this.lookup_transition_for(this.state(), ws)).filter(defined => defined);

    return (wtf:any);  // :any because it can't see that .filter(d => d) removes
                       // the undefineds, and l_t_f returns ?jt, but this returns jt

  }

  probabilistic_transition() : boolean {
    const selected = weighted_rand_select(this.probable_exits_for(this.state()));
    return this.transition( selected.to );
  }

  probabilistic_walk(n : number) : Array<mNT> {
    return seq(n)
          .map(() : mNT => {
             const state_was : mNT = this.state();
             this.probabilistic_transition();
             return state_was;
           })
          .concat([this.state()]);
  }

  probabilistic_histo_walk(n : number) : Map<any, number> {
    return histograph(this.probabilistic_walk(n));
  }



  actions(whichState : mNT = this.state() ) : Array<mNT> {
    const wstate = this._reverse_actions.get(whichState);
    if (wstate) { return [... wstate.keys()]; }
    else        { throw new Error(`No such state ${JSON.stringify(whichState)}`); }
  }

  list_states_having_action(whichState : mNT) : Array<mNT> {
    const wstate = this._actions.get(whichState);
    if (wstate) { return [... wstate.keys()]; }
    else        { throw new Error(`No such state ${JSON.stringify(whichState)}`); }
  }

// comeback
/*
  list_entrance_actions(whichState : mNT = this.state() ) : Array<mNT> {
    return [... (this._reverse_action_targets.get(whichState) || new Map()).values()] // wasteful
           .map( (edgeId:any) => (this._edges[edgeId] : any)) // whargarbl burn out any
           .filter( (o:any) => o.to === whichState)
           .map( filtered => filtered.from );
  }
*/
  list_exit_actions(whichState : mNT = this.state() ) : Array<any> { // these are mNT
    const ra_base = this._reverse_actions.get(whichState);
    if (!(ra_base)) { throw new Error(`No such state ${JSON.stringify(whichState)}`); }

    return [... ra_base.values()]
           .map    ( (edgeId:number)              => this._edges[edgeId]   )
           .filter ( (o:JssmTransition<mNT, mDT>) => o.from === whichState )
           .map    ( filtered                     => filtered.action       );
  }

  probable_action_exits(whichState : mNT = this.state() ) : Array<any> { // these are mNT
    const ra_base = this._reverse_actions.get(whichState);
    if (!(ra_base)) { throw new Error(`No such state ${JSON.stringify(whichState)}`); }

    return [... ra_base.values()]
           .map    ( (edgeId:number)              => this._edges[edgeId]   )
           .filter ( (o:JssmTransition<mNT, mDT>) => o.from === whichState )
           .map    ( filtered                     => ( { action      : filtered.action,
                                                         probability : filtered.probability } )
                                                     );
  }



  is_unenterable(whichState : mNT) : boolean {
    // whargarbl should throw on unknown state
    return this.list_entrances(whichState).length === 0;
  }

  has_unenterables() : boolean {
    return this.states().some(x => this.is_unenterable(x));
  }



  is_terminal() : boolean {
    return this.state_is_terminal(this.state());
  }

  state_is_terminal(whichState : mNT) : boolean {
    // whargarbl should throw on unknown state
    return this.list_exits(whichState).length === 0;
  }

  has_terminals() : boolean {
    return this.states().some(x => this.state_is_terminal(x));
  }



  is_complete() : boolean {
    return this.state_is_complete(this.state());
  }

  state_is_complete(whichState : mNT) : boolean {
    const wstate = this._states.get(whichState);
    if (wstate) { return wstate.complete; }
    else        { throw new Error(`No such state ${JSON.stringify(whichState)}`); }
  }

  has_completes() : boolean {
    return this.states().some(x => this.state_is_complete(x));
  }



  action(name : mNT, newData? : mDT) : boolean {
    // todo whargarbl implement hooks
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    if (this.valid_action(name, newData)) {
      const edge = this.current_action_edge_for(name);
      this._state = edge.to;
      return true;
    } else {
      return false;
    }
  }

  transition(newState : mNT, newData? : mDT) : boolean {
    // todo whargarbl implement hooks
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    if (this.valid_transition(newState, newData)) {
      this._state = newState;
      return true;
    } else {
      return false;
    }
  }

/* whargarbl reintroduce after valid_force_transition is re-enabled
  // can leave machine in inconsistent state.  generally do not use
  force_transition(newState : mNT, newData? : mDT) : boolean {
    // todo whargarbl implement hooks
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    if (this.valid_force_transition(newState, newData)) {
      this._state = newState;
      return true;
    } else {
      return false;
    }
  }
*/



  current_action_for(action : mNT) : number | void {
    const action_base = this._actions.get(action);
    return action_base? action_base.get(this.state()) : undefined;
  }

  current_action_edge_for(action : mNT) : JssmTransition<mNT, mDT> {
    const idx = this.current_action_for(action);
    if (idx === undefined) { throw new Error(`No such action ${JSON.stringify(action)}`); }
    return this._edges[idx];
  }

  valid_action(action : mNT, _newData? : mDT) : boolean {  // todo comeback unignore newData
    // todo whargarbl implement hooks
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    return this.current_action_for(action) !== undefined;
  }

  valid_transition(newState : mNT, _newData? : mDT) : boolean {  // todo comeback unignore newData
    // todo whargarbl implement hooks
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    return (this.lookup_transition_for(this.state(), newState) !== undefined);
  }

/* todo whargarbl re-enable force_transition/1 after implementing this
  valid_force_transition(newState : mNT, newData? : mDT) : boolean {
    return false; // major todo whargarbl
  }
*/


}





export {

  version,

  machine,
  parse,

  // todo whargarbl these should be exported to a utility library
  seq, weighted_rand_select, histograph, weighted_sample_select, weighted_histo_key

};
