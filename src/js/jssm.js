
// @flow

import type {
  JssmGenericState, JssmGenericConfig,
  JssmTransition, JssmTransitionList,
  JssmMachineInternalState
} from './jssm-types';

const version = null; // replaced from package.js in build





class machine<mNT, mDT> {


  _state                  : mNT;
  _states                 : Map<mNT, JssmGenericState<mNT>>;
  _edges                  : Array<JssmTransition<mNT, mDT>>;
  _edge_map               : Map<mNT, Map<mNT, number>>;
  _named_transitions      : Map<mNT, number>;
  _actions                : Map<mNT, Map<mNT, number>>;
  _reverse_actions        : Map<mNT, Map<mNT, number>>;
//_reverse_action_targets : Map<string, Map<string, mixed>>;  // todo    // remove mixed todo whargarbl

  _viz_colors             : mixed;

  // whargarbl this badly needs to be broken up, monolith master
  constructor({ initial_state, complete=[], transitions } : JssmGenericConfig<mNT, mDT>) {

    this.set_viz_colors();

    this._state                  = initial_state;
    this._states                 = new Map();
    this._edges                  = [];
    this._edge_map               = new Map();
    this._named_transitions      = new Map();
    this._actions                = new Map();
    this._reverse_actions        = new Map();
//  this._reverse_action_targets = new Map();  // todo

    transitions.map( (tr:any) => { // whargarbl burn out any

      if (tr.from === undefined) { throw new Error(`transition must define 'from': ${JSON.stringify(tr)}`); }
      if (tr.to   === undefined) { throw new Error(`transition must define 'to': ${  JSON.stringify(tr)}`); }

      // get the cursors.  what a mess
      var cursor_from = this._states.get(tr.from);
      if (cursor_from === undefined) {
        this._new_state({name: tr.from, from: [], to: [], complete: complete.includes(tr.from) });
        cursor_from = (this._states.get(tr.from) : any);
      }

      var cursor_to = this._states.get(tr.to);
      if (cursor_to === undefined) {
        this._new_state({name: tr.to, from: [], to: [], complete: complete.includes(tr.to) });
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
      var from_mapping = this._edge_map.get(tr.from);
      if (from_mapping === undefined) {
        this._edge_map.set(tr.from, new Map());
        from_mapping = (this._edge_map.get(tr.from) : any);  // whargarbl burn out uses of any
      }

      var to_mapping = from_mapping.get(tr.to);
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

        // reverse mapping first by state origin name
        if (!(this._reverse_actions.has(tr.from))) {
          this._reverse_actions.set(tr.from, new Map());
        }

        const rActionMap = this._reverse_actions.get(tr.from);
        if (rActionMap) {
          if (rActionMap.has(tr.action)) { throw new Error(`r-action ${tr.from} already attached to action ${tr.action}`); }
          else {
            rActionMap.set(tr.action, thisEdgeId);
          }
        } else {
          throw new Error('should be impossible, satisfying type checker that doesn\'t know .set precedes .get again.  severe error?')
        }
/*
todo comeback
        // reverse mapping first by state target name
        if (!(this._reverse_action_targets.has(tr.to))) {
          this._reverse_action_targets.set(tr.to, new Map());
        }

        const roActionMap = this._reverse_action_targets.get(tr.to);  // wasteful - already did has - refactor
        if (roActionMap) {
          if (roActionMap.has(tr.action)) { throw new Error(`ro-action ${tr.to} already attached to action ${tr.action}`); }
          else {
            roActionMap.set(tr.action, thisEdgeId);
          }
        } else {
          throw new Error('should be impossible, satisfying type checker that doesn\'t know .set precedes .get yet again.  severe error?')
        }
*/

      }
    });

  }

  _new_state(state_config : JssmGenericState<mNT>) : mNT { // whargarbl get that state_config any under control
    if (this._states.has(state_config.name)) { throw new Error(`state ${(state_config.name:any)} already exists`); }
    this._states.set(state_config.name, state_config);
    return state_config.name;
  }



  state() : mNT {
    return this._state;
  }

  is_changing() : boolean {
    return true; // todo whargarbl
  }



  state_is_final(whichState : mNT) : boolean {
    return ( (this.state_is_terminal(whichState)) && (this.state_is_complete(whichState)) );
  }

  is_final() : boolean {
    return ((!this.is_changing()) && this.state_is_final(this.state()));
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

  load_machine_state() : boolean {
    return false; // todo whargarbl
  }



  states() : Array<mNT> {
    return [... this._states.keys()];
  }

  state_for(whichState : mNT) : JssmGenericState<mNT> {
    const state = this._states.get(whichState);
    if (state) { return state; }
    else       { throw new Error(`no such state ${JSON.stringify(state)}`); }
  }



  transitions() : Array< JssmTransition<mNT, mDT> > {
    return this._edges;
  }

  named_transitions() : Map<mNT, number> {
    return this._named_transitions;
  }

  actions() : Array<mNT> {
    return [... this._actions.keys()];
  }



  transition_id(from: mNT, to: mNT) {
    return this._edge_map.has(from)? (this._edge_map.get(from) : any).get(to) : undefined;
  }

  transition_for(from: mNT, to: mNT) : ?JssmTransition<mNT, mDT> {
    const id = this.transition_id(from, to);
    return (id === undefined)? undefined : this._edges[id];
  }



  transitions_for(whichState : mNT) : JssmTransitionList<mNT> {
    return {entrances: this.entrances_for(whichState), exits: this.exits_for(whichState)};
  }

  entrances_for(whichState : mNT) : Array<mNT> {
    return (this._states.get(whichState) || {}).from; // return undefined if it doesn't exist by asking for a member of an empty obj
  }

  exits_for(whichState : mNT) : Array<mNT> {
    return (this._states.get(whichState) || {}).to;
  }

  probable_exits_for(whichState : mNT) : Array< JssmTransition<mNT, mDT> > {

    const wstate_to : Array<mNT> = ((this._states.get(whichState) || {to: []}).to),
          wtf                    = wstate_to.map(ws => this.transition_for(this.state(), ws)).filter(defined => defined);

    return (wtf:any) || [];  // :any because .transition_for can return `undefined`, which doesn't match this return spec

//  const wstate_a = ((this._states.get(whichState) || {to: []}).to).map(ws => this.transition_for(this.state(), ws));
//  if (wstate_a) { return wstate_a.map(ex => this.transition_for(this.state(), ex) ); }

  }

  probabilistic_transition() : boolean {
    const selected = this.rand_select(this.probable_exits_for(this.state()));
    return this.transition( selected.to );
  }

  probabilistic_walk(n : number) : Array<mNT> {
    return this.seq(n-1)
               .map(i => {
                 const state_was = this.state();
                 this.probabilistic_transition();
                 return state_was;
               })
               .concat([this.state()]);
  }

  probabilistic_histo_walk(n : number) : Map<any, number> {
    return this.histograph(this.probabilistic_walk(n));
  }



  rand_select(options : Array<any>, probability_property : string = 'probability') {

    if (!Array.isArray(options))           { throw new TypeError('options must be a non-empty array of objects'); }
    if (!(typeof options[0] === 'object')) { throw new TypeError('options must be a non-empty array of objects'); }

    const frand      = cap => Math.random() * cap,
          prob_sum   = options.reduce( (acc, val:any) => acc + val[probability_property], 0 ),
          rnd        = frand(prob_sum);

    var   cursor     = 0,
          cursor_sum = 0;

    while ((cursor_sum += (options:any)[cursor++][probability_property]) <= rnd) { }
    return options[cursor-1];

  }

  seq(n : number) { return (new Array(n)).fill(true).map( (_,i) => i ); }

  histograph(a : Array<any>) {
    return a.sort().reduce( (m,v) => ( m.set(v, (m.has(v)? m.get(v)+1 : 1)) , m), new Map() );
  }

  sample_select(n : number, options : Array<mixed>, probability_property : string) {
    return this.seq(n).map(i => this.rand_select(options, probability_property));
  }

  histo_key(n : number, options : Array<mixed>, probability_property : string, extract : string) {
    return this.histograph(this.sample_select(n, options, probability_property).map( (s:any) => s[extract]));
  }


  actions_for(whichState : mNT) : Array<mNT> {
    const wstate = this._reverse_actions.get(whichState);
    if (wstate) { return [... (wstate || new Map()).keys()]; }
    else        { throw new Error(`No such state ${JSON.stringify(whichState)}`); }
  }

  action_found_on_states(whichState : mNT) : Array<mNT> {
    return [... ((this._actions.get(whichState) || new Map()).keys() || [])]; // wasteful
  }
/*
todo comeback
  action_entrances_at(whichState : string) : Array<mixed> { // whargarbl remove mixed
    return [... (this._reverse_action_targets.get(whichState) || new Map()).values()] // wasteful
           .map( (edgeId:any) => (this._edges[edgeId] : any)) // whargarbl burn out any
           .filter( (o:any) => o.to === whichState)
           .map( filtered => filtered.from );
  }
*/

  action_exits_for(whichState : mNT) : Array<mNT> {
    return [... (this._reverse_actions.get(whichState) || new Map()).values()] // wasteful
           .map    ( (edgeId:number)              => this._edges[edgeId]   )
           .filter ( (o:JssmTransition<mNT, mDT>) => o.from === whichState )
           .map    ( filtered                     => filtered.action       );
  }

  probable_action_exits_for(whichState : mNT) : Array<mNT> {
    return [... (this._reverse_actions.get(whichState) || new Map()).values()] // wasteful
           .map    ( (edgeId:number)              => this._edges[edgeId]   )
           .filter ( (o:JssmTransition<mNT, mDT>) => o.from === whichState )
           .map    ( filtered                     => ( { action      : filtered.action,
                                                         probability : filtered.probability } )
                                                     );
  }



  is_unenterable(whichState : mNT) : boolean {
    return this.entrances_for(whichState).length === 0;
  }

  has_unenterables() : boolean {
    return this.states.some(this.is_unenterable);
  }



  is_terminal() : boolean {
    return this.state_is_terminal(this.state());
  }

  state_is_terminal(whichState : mNT) : boolean {
    return this.exits_for(whichState).length === 0;
  }

  has_terminals() : boolean {
    return this.states.some(this.state_is_terminal);
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
    return this.states.some(this.state_is_complete);
  }



  action(name : mNT, newData? : mDT) : boolean {
    // todo whargarbl implement hooks
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    if (this.valid_action(name, newData)) {
      const edge = this.current_action_edge_for(name);
      if (edge) { this._state = edge.to; }
      else      { throw new Error(`Should be impossible - valid_action true, no edge in current_action_edge_for, in action(${JSON.stringify(name)}...)`); }
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



  current_action_for(action : mNT) : number | void {
    const action_base = this._actions.get(action);
    return action_base? action_base.get(this.state()) : undefined;
  }

  current_action_edge_for(action : mNT) : JssmTransition<mNT, mDT> | void {
    const idx = this.current_action_for(action);
    return (idx !== undefined)? this._edges[idx] : undefined;
  }

  valid_action(action : mNT, newData? : mDT) : boolean {
    // todo whargarbl implement hooks
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    return this.current_action_for(action) !== undefined;
  }

  valid_transition(newState : mNT, newData? : mDT) : boolean {
    // todo whargarbl implement hooks
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    return (this.transition_for(this.state(), newState) !== undefined);
  }

  valid_force_transition(newState : mNT, newData? : mDT) : boolean {
    return false; // major todo whargarbl
  }



  set_viz_colors() : void {

    this._viz_colors = {

      'fill_final'         : '#eeeeff',
      'fill_terminal'      : '#ffeeee',
      'fill_complete'      : '#eeffee',

      'normal_line_1'      : '#999999',
      'normal_line_2'      : '#888888',
      'normal_line_solo'   : '#888888',

      'line_final_1'       : '#8888bb',
      'line_final_2'       : '#7777aa',
      'line_final_solo'    : '#7777aa',

      'line_terminal_1'    : '#bb8888',
      'line_terminal_2'    : '#aa7777',
      'line_terminal_solo' : '#aa7777',

      'line_complete_1'    : '#88bb88',
      'line_complete_2'    : '#77aa77',
      'line_complete_solo' : '#77aa77',

      'text_final_1'       : '#000088',
      'text_final_2'       : '#000088',
      'text_final_solo'    : '#000088',

      'text_terminal_1'    : '#880000',
      'text_terminal_2'    : '#880000',
      'text_terminal_solo' : '#880000',

      'text_complete_1'    : '#007700',
      'text_complete_2'    : '#007700',
      'text_complete_solo' : '#007700'

    };

  }



  viz() {

    const l_states = this.states();

    const node_of  = state => `n${l_states.indexOf(state)}`,
          vc       = col   => (this._viz_colors:any)[col] || '';

    const nodes : string = l_states.map( (s:any) => {

      const this_state = this.state_for(s),
            terminal   = this.state_is_terminal(s),
            final      = this.state_is_final(s),
            complete   = this.state_is_complete(s),
            features   = [
                          ['label',       s],
                          ['peripheries', complete? 2 : 1  ],
                          ['fillcolor',   final   ? vc('fill_final')    :
                                         (complete? vc('fill_complete') :
                                         (terminal? vc('fill_terminal') :
                                                    '')) ]
                         ]
                          .filter(r => r[1])
                          .map(   r => `${r[0]}="${r[1]}"`)
                          .join(' ');
      return `${node_of(s)} [${features}];`;

    }).join(' ');

    const strike = [];
    const edges  = this.states().map( (s:any) =>

      this.exits_for(s).map( (ex:any) => {

        if ( strike.find(row => (row[0] === s) && (row[1] == ex) ) ) {
            return '';  // already did the pair
        }

        const edge         = this.transition_for(s, ex),
              pair         = this.transition_for(ex, s),
              double       = pair && (s !== ex),

              head_state   = this.state_for(s),
              tail_state   = this.state_for(ex),

//            label        = edge  ? ([edge.name?`${(edge.name:any)}`:undefined,`${(edge.probability:any)}`]
//                                   .filter(not_undef => !!not_undef)
//                                     .join('\n') || undefined
//                                    ) : undefined,

              if_obj_field = (obj:any, field) => obj? (obj[field] || '') : '',

              h_final      = this.state_is_final(s),
              h_complete   = this.state_is_complete(s),
              h_terminal   = this.state_is_terminal(s),

              t_final      = this.state_is_final(ex),
              t_complete   = this.state_is_complete(ex),
              t_terminal   = this.state_is_terminal(ex),

              lineColor    = (final, complete, terminal, _solo_1_2 = '_solo') =>
                               final   ? (vc('line_final'    + _solo_1_2)) :
                              (complete? (vc('line_complete' + _solo_1_2)) :
                              (terminal? (vc('line_terminal' + _solo_1_2)) :
                                          vc('normal_line'   + _solo_1_2))),

              textColor    = (final, complete, terminal, _solo_1_2 = '_solo') : string =>
                               final   ? (vc('text_final'    + _solo_1_2)) :
                              (complete? (vc('text_complete' + _solo_1_2)) :
                              (terminal? (vc('text_terminal' + _solo_1_2)) :
                                         '')),

              headColor    = textColor(h_final, h_complete, h_terminal, double? '_1' : '_solo'),
              tailColor    = textColor(t_final, t_complete, t_terminal, double? '_2' : '_solo'),

              labelInline  = [
//                             [edge, 'name',        'label',     true],
                               [pair, 'probability', 'headlabel', 'name', 'action', double, headColor],
                               [edge, 'probability', 'taillabel', 'name', 'action', true,   tailColor]
                             ]
                             .map(    r       => ({ which: r[2], whether: (r[5]? ([(if_obj_field(r[0], r[5]):any), (if_obj_field(r[0], r[1]):any), (if_obj_field(r[0], r[3]):any)].filter(q=>q).join('<br/>') || '') : ''), color: r[6] }) )
                             .filter( present => present.whether )
                             .map(    r       => `${r.which}=${(r.color)? `<<font color="${(r.color:any)}">${(r.whether : any)}</font>>` : `"${(r.whether : any)}"`};`)
                             .join(' '),

              tc1          = lineColor(t_final, t_complete, t_terminal, '_1'),
              tc2          = lineColor(h_final, h_complete, h_terminal, '_2'),
              tcd          = lineColor(t_final, t_complete, t_terminal, '_solo'),

              edgeInline   = edge  ? (double? `dir=both;color="${tc1}:${tc2}"` : `color="${tcd}"`) : '';

        if (pair) { strike.push([ex, s]); }

        return `${node_of(s)}->${node_of(ex)} [${labelInline}${edgeInline}];`;

      }).join(' ')

    ).join(' ');

    return `digraph G {\n  fontname="helvetica neue";\n  style=filled;\n  bgcolor=lightgrey;\n  node [fontsize=14; shape=box; style=filled; fillcolor=white; fontname="helvetica neue"];\n  edge [fontsize=6;fontname="helvetica neue"];\n\n  ${nodes}\n\n  ${edges}\n}`;

  }


}





export {

  machine,

  version

};
