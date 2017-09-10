'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.weighted_histo_key = exports.weighted_sample_select = exports.histograph = exports.weighted_rand_select = exports.seq = exports.arrow_right_kind = exports.arrow_left_kind = exports.arrow_direction = exports.sm = exports.compile = exports.parse = exports.make = exports.Machine = exports.version = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _jssmUtil = require('./jssm-util.js');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// whargarbl lots of these return arrays could/should be sets

var parse = require('./jssm-dot.js').parse; // eslint-disable-line flowtype/no-weak-types // todo whargarbl remove any

var version = '5.9.0'; // replaced from package.js in build


function arrow_direction(arrow) {

  switch (String(arrow)) {

    case '->':case '→':
    case '=>':case '⇒':
    case '~>':case '↛':
      return 'right';

    case '<-':case '←':
    case '<=':case '⇐':
    case '<~':case '↚':
      return 'left';

    case '<->':case '↔':
    case '<-=>':case '←⇒':
    case '<-~>':case '←↛':

    case '<=>':case '⇔':
    case '<=->':case '⇐→':
    case '<=~>':case '⇐↛':

    case '<~>':case '↮':
    case '<~->':case '↚→':
    case '<~=>':case '↚⇒':
      return 'both';

    default:
      throw new Error('arrow_direction: unknown arrow type ' + arrow);

  }
}

/* eslint-disable complexity */

function arrow_left_kind(arrow) {

  switch (String(arrow)) {

    case '->':case '→':
    case '=>':case '⇒':
    case '~>':case '↛':
      return 'none';

    case '<-':case '←':
    case '<->':case '↔':
    case '<-=>':case '←⇒':
    case '<-~>':case '←↛':
      return 'legal';

    case '<=':case '⇐':
    case '<=>':case '⇔':
    case '<=->':case '⇐→':
    case '<=~>':case '⇐↛':
      return 'main';

    case '<~':case '↚':
    case '<~>':case '↮':
    case '<~->':case '↚→':
    case '<~=>':case '↚⇒':
      return 'forced';

    default:
      throw new Error('arrow_direction: unknown arrow type ' + arrow);

  }
}

/* eslint-enable complexity */

/* eslint-disable complexity */

function arrow_right_kind(arrow) {

  switch (String(arrow)) {

    case '<-':case '←':
    case '<=':case '⇐':
    case '<~':case '↚':
      return 'none';

    case '->':case '→':
    case '<->':case '↔':
    case '<=->':case '⇐→':
    case '<~->':case '↚→':
      return 'legal';

    case '=>':case '⇒':
    case '<=>':case '⇔':
    case '<-=>':case '←⇒':
    case '<~=>':case '↚⇒':
      return 'main';

    case '~>':case '↛':
    case '<~>':case '↮':
    case '<-~>':case '←↛':
    case '<=~>':case '⇐↛':
      return 'forced';

    default:
      throw new Error('arrow_direction: unknown arrow type ' + arrow);

  }
}

/* eslint-enable complexity */

function compile_rule_transition_step(acc, from, to, this_se, next_se) {
  // todo flow describe the parser representation of a transition step extension

  var edges = [];

  var uFrom = Array.isArray(from) ? from : [from],
      uTo = Array.isArray(to) ? to : [to];

  uFrom.map(function (f) {
    uTo.map(function (t) {

      var rk = arrow_right_kind(this_se.kind),
          lk = arrow_left_kind(this_se.kind);

      var right = {
        from: f,
        to: t,
        kind: rk,
        forced_only: rk === 'forced',
        main_path: rk === 'main'
      };

      if (this_se.r_action) {
        right.action = this_se.r_action;
      }
      if (this_se.r_probability) {
        right.probability = this_se.r_probability;
      }
      if (right.kind !== 'none') {
        edges.push(right);
      }

      var left = {
        from: t,
        to: f,
        kind: lk,
        forced_only: lk === 'forced',
        main_path: lk === 'main'
      };

      if (this_se.l_action) {
        left.action = this_se.l_action;
      }
      if (this_se.l_probability) {
        left.probability = this_se.l_probability;
      }
      if (left.kind !== 'none') {
        edges.push(left);
      }
    });
  });

  var new_acc = acc.concat(edges);

  if (next_se) {
    return compile_rule_transition_step(new_acc, to, next_se.to, next_se, next_se.se);
  } else {
    return new_acc;
  }
}

function compile_rule_handle_transition(rule) {
  // todo flow describe the parser representation of a transition
  return compile_rule_transition_step([], rule.from, rule.se.to, rule.se, rule.se.se);
}

function compile_rule_handler(rule) {
  // todo flow describe the output of the parser

  if (rule.key === 'transition') {
    return { agg_as: 'transition', val: compile_rule_handle_transition(rule) };
  }

  var tautologies = ['graph_layout', 'start_states', 'end_states', 'machine_name', 'machine_version', 'machine_comment', 'machine_author', 'machine_contributor', 'machine_definition', 'machine_reference', 'machine_license', 'fsl_version'];

  if (tautologies.includes(rule.key)) {
    return { agg_as: rule.key, val: rule.value };
  }

  throw new Error('compile_rule_handler: Unknown rule: ' + JSON.stringify(rule));
}

function compile(tree) {
  var _ref;

  // todo flow describe the output of the parser

  var results = {
    graph_layout: [],
    transition: [],
    start_states: [],
    end_states: [],
    fsl_version: [],
    machine_author: [],
    machine_comment: [],
    machine_contributor: [],
    machine_definition: [],
    machine_license: [],
    machine_name: [],
    machine_reference: [],
    machine_version: []
  };

  tree.map(function (tr) {

    var rule = compile_rule_handler(tr),
        agg_as = rule.agg_as,
        val = rule.val; // todo better types

    results[agg_as] = results[agg_as].concat(val);
  });

  var assembled_transitions = (_ref = []).concat.apply(_ref, _toConsumableArray(results['transition']));

  var result_cfg = {
    start_states: results.start_states.length ? results.start_states : [assembled_transitions[0].from],
    transitions: assembled_transitions
  };

  var oneOnlyKeys = ['graph_layout', 'machine_name', 'machine_version', 'machine_comment', 'fsl_version', 'machine_license', 'machine_definition'];

  oneOnlyKeys.map(function (oneOnlyKey) {
    if (results[oneOnlyKey].length > 1) {
      throw new Error('May only have one ' + oneOnlyKey + ' statement maximum: ' + JSON.stringify(results[oneOnlyKey]));
    } else {
      if (results[oneOnlyKey].length) {
        result_cfg[oneOnlyKey] = results[oneOnlyKey][0];
      }
    }
  });

  ['machine_author', 'machine_contributor', 'machine_reference'].map(function (multiKey) {
    if (results[multiKey].length) {
      result_cfg[multiKey] = results[multiKey];
    }
  });

  return result_cfg;
}

function make(plan) {
  return compile(parse(plan));
}

var Machine = function () {

  // whargarbl this badly needs to be broken up, monolith master
  function Machine(_ref2) {
    var _this = this;

    var start_states = _ref2.start_states,
        _ref2$complete = _ref2.complete,
        complete = _ref2$complete === undefined ? [] : _ref2$complete,
        transitions = _ref2.transitions,
        machine_author = _ref2.machine_author,
        machine_comment = _ref2.machine_comment,
        machine_contributor = _ref2.machine_contributor,
        machine_definition = _ref2.machine_definition,
        machine_license = _ref2.machine_license,
        machine_name = _ref2.machine_name,
        machine_version = _ref2.machine_version,
        fsl_version = _ref2.fsl_version,
        _ref2$graph_layout = _ref2.graph_layout,
        graph_layout = _ref2$graph_layout === undefined ? 'dot' : _ref2$graph_layout;

    _classCallCheck(this, Machine);

    this._state = start_states[0];
    this._states = new Map();
    this._edges = [];
    this._edge_map = new Map();
    this._named_transitions = new Map();
    this._actions = new Map();
    this._reverse_actions = new Map();
    this._reverse_action_targets = new Map(); // todo

    this._machine_author = machine_author;
    this._machine_comment = machine_comment;
    this._machine_contributor = machine_contributor;
    this._machine_definition = machine_definition;
    this._machine_license = machine_license;
    this._machine_name = machine_name;
    this._machine_version = machine_version;
    this._fsl_version = fsl_version;

    this._graph_layout = graph_layout;

    transitions.map(function (tr) {

      if (tr.from === undefined) {
        throw new Error('transition must define \'from\': ' + JSON.stringify(tr));
      }
      if (tr.to === undefined) {
        throw new Error('transition must define \'to\': ' + JSON.stringify(tr));
      }

      // get the cursors.  what a mess
      var cursor_from = _this._states.get(tr.from) || { name: tr.from, from: [], to: [], complete: complete.includes(tr.from) };

      if (!_this._states.has(tr.from)) {
        _this._new_state(cursor_from);
      }

      var cursor_to = _this._states.get(tr.to) || { name: tr.to, from: [], to: [], complete: complete.includes(tr.to) };

      if (!_this._states.has(tr.to)) {
        _this._new_state(cursor_to);
      }

      // guard against existing connections being re-added
      if (cursor_from.to.includes(tr.to)) {
        throw new Error('already has ' + JSON.stringify(tr.from) + ' to ' + JSON.stringify(tr.to));
      } else {
        cursor_from.to.push(tr.to);
        cursor_to.from.push(tr.from);
      }

      // add the edge; note its id
      _this._edges.push(tr);
      var thisEdgeId = _this._edges.length - 1;

      // guard against repeating a transition name
      if (tr.name) {
        if (_this._named_transitions.has(tr.name)) {
          throw new Error('named transition "' + JSON.stringify(tr.name) + '" already created');
        } else {
          _this._named_transitions.set(tr.name, thisEdgeId);
        }
      }

      // set up the mapping, so that edges can be looked up by endpoint pairs
      var from_mapping = _this._edge_map.get(tr.from) || new Map();
      if (!_this._edge_map.has(tr.from)) {
        _this._edge_map.set(tr.from, from_mapping);
      }

      //    const to_mapping = from_mapping.get(tr.to);
      from_mapping.set(tr.to, thisEdgeId); // already checked that this mapping doesn't exist, above

      // set up the action mapping, so that actions can be looked up by origin
      if (tr.action) {

        // forward mapping first by action name
        var actionMap = _this._actions.get(tr.action);
        if (!actionMap) {
          actionMap = new Map();
          _this._actions.set(tr.action, actionMap);
        }

        if (actionMap.has(tr.from)) {
          throw new Error('action ' + JSON.stringify(tr.action) + ' already attached to origin ' + JSON.stringify(tr.from));
        } else {
          actionMap.set(tr.from, thisEdgeId);
        }

        // reverse mapping first by state origin name
        var rActionMap = _this._reverse_actions.get(tr.from);
        if (!rActionMap) {
          rActionMap = new Map();
          _this._reverse_actions.set(tr.from, rActionMap);
        }

        // no need to test for reverse mapping pre-presence;
        // forward mapping already covers collisions
        rActionMap.set(tr.action, thisEdgeId);

        // reverse mapping first by state target name
        if (!_this._reverse_action_targets.has(tr.to)) {
          _this._reverse_action_targets.set(tr.to, new Map());
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

  _createClass(Machine, [{
    key: '_new_state',
    value: function _new_state(state_config) {
      // whargarbl get that state_config any under control

      if (this._states.has(state_config.name)) {
        throw new Error('state ' + JSON.stringify(state_config.name) + ' already exists');
      }

      this._states.set(state_config.name, state_config);
      return state_config.name;
    }
  }, {
    key: 'state',
    value: function state() {
      return this._state;
    }

    /* whargarbl todo major
       when we reimplement this, reintroduce this change to the is_final call
    
      is_changing() : boolean {
        return true; // todo whargarbl
      }
    */

  }, {
    key: 'state_is_final',
    value: function state_is_final(whichState) {
      return this.state_is_terminal(whichState) && this.state_is_complete(whichState);
    }
  }, {
    key: 'is_final',
    value: function is_final() {
      //  return ((!this.is_changing()) && this.state_is_final(this.state()));
      return this.state_is_final(this.state());
    }
  }, {
    key: 'graph_layout',
    value: function graph_layout() {
      return this._graph_layout;
    }
  }, {
    key: 'machine_author',
    value: function machine_author() {
      return this._machine_author;
    }
  }, {
    key: 'machine_comment',
    value: function machine_comment() {
      return this._machine_comment;
    }
  }, {
    key: 'machine_contributor',
    value: function machine_contributor() {
      return this._machine_contributor;
    }
  }, {
    key: 'machine_definition',
    value: function machine_definition() {
      return this._machine_definition;
    }
  }, {
    key: 'machine_license',
    value: function machine_license() {
      return this._machine_license;
    }
  }, {
    key: 'machine_name',
    value: function machine_name() {
      return this._machine_name;
    }
  }, {
    key: 'machine_version',
    value: function machine_version() {
      return this._machine_version;
    }
  }, {
    key: 'fsl_version',
    value: function fsl_version() {
      return this._fsl_version;
    }
  }, {
    key: 'machine_state',
    value: function machine_state() {

      return {
        internal_state_impl_version: 1,

        actions: this._actions,
        edge_map: this._edge_map,
        edges: this._edges,
        named_transitions: this._named_transitions,
        reverse_actions: this._reverse_actions,
        //    reverse_action_targets : this._reverse_action_targets,
        state: this._state,
        states: this._states
      };
    }

    /*
      load_machine_state() : boolean {
        return false; // todo whargarbl
      }
    */

  }, {
    key: 'states',
    value: function states() {
      return [].concat(_toConsumableArray(this._states.keys()));
    }
  }, {
    key: 'state_for',
    value: function state_for(whichState) {
      var state = this._states.get(whichState);
      if (state) {
        return state;
      } else {
        throw new Error('no such state ' + JSON.stringify(state));
      }
    }
  }, {
    key: 'list_edges',
    value: function list_edges() {
      return this._edges;
    }
  }, {
    key: 'list_named_transitions',
    value: function list_named_transitions() {
      return this._named_transitions;
    }
  }, {
    key: 'list_actions',
    value: function list_actions() {
      return [].concat(_toConsumableArray(this._actions.keys()));
    }
  }, {
    key: 'get_transition_by_state_names',
    value: function get_transition_by_state_names(from, to) {

      var emg = this._edge_map.get(from);

      if (emg) {
        return emg.get(to);
      } else {
        return undefined;
      }
    }
  }, {
    key: 'lookup_transition_for',
    value: function lookup_transition_for(from, to) {
      var id = this.get_transition_by_state_names(from, to);
      return id === undefined || id === null ? undefined : this._edges[id];
    }
  }, {
    key: 'list_transitions',
    value: function list_transitions() {
      var whichState = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.state();

      return { entrances: this.list_entrances(whichState), exits: this.list_exits(whichState) };
    }
  }, {
    key: 'list_entrances',
    value: function list_entrances() {
      var whichState = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.state();

      return (this._states.get(whichState) || {}).from || [];
    }
  }, {
    key: 'list_exits',
    value: function list_exits() {
      var whichState = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.state();

      return (this._states.get(whichState) || {}).to || [];
    }
  }, {
    key: 'probable_exits_for',
    value: function probable_exits_for(whichState) {
      var _this2 = this;

      var wstate = this._states.get(whichState);
      if (!wstate) {
        throw new Error('No such state ' + JSON.stringify(whichState) + ' in probable_exits_for');
      }

      var wstate_to = wstate.to,
          wtf // wstate_to_filtered -> wtf
      = wstate_to.map(function (ws) {
        return _this2.lookup_transition_for(_this2.state(), ws);
      }).filter(Boolean);

      return wtf;
    }
  }, {
    key: 'probabilistic_transition',
    value: function probabilistic_transition() {
      var selected = (0, _jssmUtil.weighted_rand_select)(this.probable_exits_for(this.state()));
      return this.transition(selected.to);
    }
  }, {
    key: 'probabilistic_walk',
    value: function probabilistic_walk(n) {
      var _this3 = this;

      return (0, _jssmUtil.seq)(n).map(function () {
        var state_was = _this3.state();
        _this3.probabilistic_transition();
        return state_was;
      }).concat([this.state()]);
    }
  }, {
    key: 'probabilistic_histo_walk',
    value: function probabilistic_histo_walk(n) {
      return (0, _jssmUtil.histograph)(this.probabilistic_walk(n));
    }
  }, {
    key: 'actions',
    value: function actions() {
      var whichState = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.state();

      var wstate = this._reverse_actions.get(whichState);
      if (wstate) {
        return [].concat(_toConsumableArray(wstate.keys()));
      } else {
        throw new Error('No such state ' + JSON.stringify(whichState));
      }
    }
  }, {
    key: 'list_states_having_action',
    value: function list_states_having_action(whichState) {
      var wstate = this._actions.get(whichState);
      if (wstate) {
        return [].concat(_toConsumableArray(wstate.keys()));
      } else {
        throw new Error('No such state ' + JSON.stringify(whichState));
      }
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

  }, {
    key: 'list_exit_actions',
    value: function list_exit_actions() {
      var _this4 = this;

      var whichState = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.state();
      // these are mNT, not ?mNT
      var ra_base = this._reverse_actions.get(whichState);
      if (!ra_base) {
        throw new Error('No such state ' + JSON.stringify(whichState));
      }

      return [].concat(_toConsumableArray(ra_base.values())).map(function (edgeId) {
        return _this4._edges[edgeId];
      }).filter(function (o) {
        return o.from === whichState;
      }).map(function (filtered) {
        return filtered.action;
      });
    }
  }, {
    key: 'probable_action_exits',
    value: function probable_action_exits() {
      var _this5 = this;

      var whichState = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.state();
      // these are mNT
      var ra_base = this._reverse_actions.get(whichState);
      if (!ra_base) {
        throw new Error('No such state ' + JSON.stringify(whichState));
      }

      return [].concat(_toConsumableArray(ra_base.values())).map(function (edgeId) {
        return _this5._edges[edgeId];
      }).filter(function (o) {
        return o.from === whichState;
      }).map(function (filtered) {
        return { action: filtered.action,
          probability: filtered.probability };
      });
    }
  }, {
    key: 'is_unenterable',
    value: function is_unenterable(whichState) {
      // whargarbl should throw on unknown state
      return this.list_entrances(whichState).length === 0;
    }
  }, {
    key: 'has_unenterables',
    value: function has_unenterables() {
      var _this6 = this;

      return this.states().some(function (x) {
        return _this6.is_unenterable(x);
      });
    }
  }, {
    key: 'is_terminal',
    value: function is_terminal() {
      return this.state_is_terminal(this.state());
    }
  }, {
    key: 'state_is_terminal',
    value: function state_is_terminal(whichState) {
      // whargarbl should throw on unknown state
      return this.list_exits(whichState).length === 0;
    }
  }, {
    key: 'has_terminals',
    value: function has_terminals() {
      var _this7 = this;

      return this.states().some(function (x) {
        return _this7.state_is_terminal(x);
      });
    }
  }, {
    key: 'is_complete',
    value: function is_complete() {
      return this.state_is_complete(this.state());
    }
  }, {
    key: 'state_is_complete',
    value: function state_is_complete(whichState) {
      var wstate = this._states.get(whichState);
      if (wstate) {
        return wstate.complete;
      } else {
        throw new Error('No such state ' + JSON.stringify(whichState));
      }
    }
  }, {
    key: 'has_completes',
    value: function has_completes() {
      var _this8 = this;

      return this.states().some(function (x) {
        return _this8.state_is_complete(x);
      });
    }
  }, {
    key: 'action',
    value: function action(name, newData) {
      // todo whargarbl implement hooks
      // todo whargarbl implement data stuff
      // todo major incomplete whargarbl comeback
      if (this.valid_action(name, newData)) {
        var edge = this.current_action_edge_for(name);
        this._state = edge.to;
        return true;
      } else {
        return false;
      }
    }
  }, {
    key: 'transition',
    value: function transition(newState, newData) {
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

  }, {
    key: 'force_transition',
    value: function force_transition(newState, newData) {
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
  }, {
    key: 'current_action_for',
    value: function current_action_for(action) {
      var action_base = this._actions.get(action);
      return action_base ? action_base.get(this.state()) : undefined;
    }
  }, {
    key: 'current_action_edge_for',
    value: function current_action_edge_for(action) {
      var idx = this.current_action_for(action);
      if (idx === undefined || idx === null) {
        throw new Error('No such action ' + JSON.stringify(action));
      }
      return this._edges[idx];
    }
  }, {
    key: 'valid_action',
    value: function valid_action(action, _newData) {
      // todo comeback unignore newData
      // todo whargarbl implement hooks
      // todo whargarbl implement data stuff
      // todo major incomplete whargarbl comeback
      return this.current_action_for(action) !== undefined;
    }
  }, {
    key: 'valid_transition',
    value: function valid_transition(newState, _newData) {
      // todo comeback unignore newData
      // todo whargarbl implement hooks
      // todo whargarbl implement data stuff
      var transition_for = this.lookup_transition_for(this.state(), newState);

      if (!transition_for) {
        return false;
      }
      if (transition_for.forced_only) {
        return false;
      }

      return true;
    }
  }, {
    key: 'valid_force_transition',
    value: function valid_force_transition(newState, _newData) {
      // todo comeback unignore newData
      // todo whargarbl implement hooks
      // todo whargarbl implement data stuff
      // todo major incomplete whargarbl comeback
      return this.lookup_transition_for(this.state(), newState) !== undefined;
    }
  }]);

  return Machine;
}();

function sm(template_strings /* , arguments */) {
  var _arguments = arguments;


  // foo`a${1}b${2}c` will come in as (['a','b','c'],1,2)
  // this includes when a and c are empty strings
  // therefore template_strings will always have one more el than template_args
  // therefore map the smaller container and toss the last one on on the way out

  return new Machine(make(template_strings.reduce(

  // in general avoiding `arguments` is smart.  however with the template
  // string notation, as designed, it's not really worth the hassle

  /* eslint-disable fp/no-arguments */
  /* eslint-disable prefer-rest-params */
  function (acc, val, idx) {
    return '' + acc + _arguments[idx] + val;
  } // arguments[0] is never loaded, so args doesn't need to be gated
  /* eslint-enable  prefer-rest-params */
  /* eslint-enable  fp/no-arguments */

  )));
}

exports.version = version;
exports.Machine = Machine;
exports.make = make;
exports.parse = parse;
exports.compile = compile;
exports.sm = sm;
exports.arrow_direction = arrow_direction;
exports.arrow_left_kind = arrow_left_kind;
exports.arrow_right_kind = arrow_right_kind;
exports.seq = _jssmUtil.seq;
exports.weighted_rand_select = _jssmUtil.weighted_rand_select;
exports.histograph = _jssmUtil.histograph;
exports.weighted_sample_select = _jssmUtil.weighted_sample_select;
exports.weighted_histo_key = _jssmUtil.weighted_histo_key;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLmpzIl0sIm5hbWVzIjpbInBhcnNlIiwicmVxdWlyZSIsInZlcnNpb24iLCJhcnJvd19kaXJlY3Rpb24iLCJhcnJvdyIsIlN0cmluZyIsIkVycm9yIiwiYXJyb3dfbGVmdF9raW5kIiwiYXJyb3dfcmlnaHRfa2luZCIsImNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXAiLCJhY2MiLCJmcm9tIiwidG8iLCJ0aGlzX3NlIiwibmV4dF9zZSIsImVkZ2VzIiwidUZyb20iLCJBcnJheSIsImlzQXJyYXkiLCJ1VG8iLCJtYXAiLCJmIiwidCIsInJrIiwia2luZCIsImxrIiwicmlnaHQiLCJmb3JjZWRfb25seSIsIm1haW5fcGF0aCIsInJfYWN0aW9uIiwiYWN0aW9uIiwicl9wcm9iYWJpbGl0eSIsInByb2JhYmlsaXR5IiwicHVzaCIsImxlZnQiLCJsX2FjdGlvbiIsImxfcHJvYmFiaWxpdHkiLCJuZXdfYWNjIiwiY29uY2F0Iiwic2UiLCJjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb24iLCJydWxlIiwiY29tcGlsZV9ydWxlX2hhbmRsZXIiLCJrZXkiLCJhZ2dfYXMiLCJ2YWwiLCJ0YXV0b2xvZ2llcyIsImluY2x1ZGVzIiwidmFsdWUiLCJKU09OIiwic3RyaW5naWZ5IiwiY29tcGlsZSIsInRyZWUiLCJyZXN1bHRzIiwiZ3JhcGhfbGF5b3V0IiwidHJhbnNpdGlvbiIsInN0YXJ0X3N0YXRlcyIsImVuZF9zdGF0ZXMiLCJmc2xfdmVyc2lvbiIsIm1hY2hpbmVfYXV0aG9yIiwibWFjaGluZV9jb21tZW50IiwibWFjaGluZV9jb250cmlidXRvciIsIm1hY2hpbmVfZGVmaW5pdGlvbiIsIm1hY2hpbmVfbGljZW5zZSIsIm1hY2hpbmVfbmFtZSIsIm1hY2hpbmVfcmVmZXJlbmNlIiwibWFjaGluZV92ZXJzaW9uIiwidHIiLCJhc3NlbWJsZWRfdHJhbnNpdGlvbnMiLCJyZXN1bHRfY2ZnIiwibGVuZ3RoIiwidHJhbnNpdGlvbnMiLCJvbmVPbmx5S2V5cyIsIm9uZU9ubHlLZXkiLCJtdWx0aUtleSIsIm1ha2UiLCJwbGFuIiwiTWFjaGluZSIsImNvbXBsZXRlIiwiX3N0YXRlIiwiX3N0YXRlcyIsIk1hcCIsIl9lZGdlcyIsIl9lZGdlX21hcCIsIl9uYW1lZF90cmFuc2l0aW9ucyIsIl9hY3Rpb25zIiwiX3JldmVyc2VfYWN0aW9ucyIsIl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzIiwiX21hY2hpbmVfYXV0aG9yIiwiX21hY2hpbmVfY29tbWVudCIsIl9tYWNoaW5lX2NvbnRyaWJ1dG9yIiwiX21hY2hpbmVfZGVmaW5pdGlvbiIsIl9tYWNoaW5lX2xpY2Vuc2UiLCJfbWFjaGluZV9uYW1lIiwiX21hY2hpbmVfdmVyc2lvbiIsIl9mc2xfdmVyc2lvbiIsIl9ncmFwaF9sYXlvdXQiLCJ1bmRlZmluZWQiLCJjdXJzb3JfZnJvbSIsImdldCIsIm5hbWUiLCJoYXMiLCJfbmV3X3N0YXRlIiwiY3Vyc29yX3RvIiwidGhpc0VkZ2VJZCIsInNldCIsImZyb21fbWFwcGluZyIsImFjdGlvbk1hcCIsInJBY3Rpb25NYXAiLCJzdGF0ZV9jb25maWciLCJ3aGljaFN0YXRlIiwic3RhdGVfaXNfdGVybWluYWwiLCJzdGF0ZV9pc19jb21wbGV0ZSIsInN0YXRlX2lzX2ZpbmFsIiwic3RhdGUiLCJpbnRlcm5hbF9zdGF0ZV9pbXBsX3ZlcnNpb24iLCJhY3Rpb25zIiwiZWRnZV9tYXAiLCJuYW1lZF90cmFuc2l0aW9ucyIsInJldmVyc2VfYWN0aW9ucyIsInN0YXRlcyIsImtleXMiLCJlbWciLCJpZCIsImdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzIiwiZW50cmFuY2VzIiwibGlzdF9lbnRyYW5jZXMiLCJleGl0cyIsImxpc3RfZXhpdHMiLCJ3c3RhdGUiLCJ3c3RhdGVfdG8iLCJ3dGYiLCJ3cyIsImxvb2t1cF90cmFuc2l0aW9uX2ZvciIsImZpbHRlciIsIkJvb2xlYW4iLCJzZWxlY3RlZCIsInByb2JhYmxlX2V4aXRzX2ZvciIsIm4iLCJzdGF0ZV93YXMiLCJwcm9iYWJpbGlzdGljX3RyYW5zaXRpb24iLCJwcm9iYWJpbGlzdGljX3dhbGsiLCJyYV9iYXNlIiwidmFsdWVzIiwiZWRnZUlkIiwibyIsImZpbHRlcmVkIiwic29tZSIsIngiLCJpc191bmVudGVyYWJsZSIsIm5ld0RhdGEiLCJ2YWxpZF9hY3Rpb24iLCJlZGdlIiwiY3VycmVudF9hY3Rpb25fZWRnZV9mb3IiLCJuZXdTdGF0ZSIsInZhbGlkX3RyYW5zaXRpb24iLCJ2YWxpZF9mb3JjZV90cmFuc2l0aW9uIiwiYWN0aW9uX2Jhc2UiLCJpZHgiLCJjdXJyZW50X2FjdGlvbl9mb3IiLCJfbmV3RGF0YSIsInRyYW5zaXRpb25fZm9yIiwic20iLCJ0ZW1wbGF0ZV9zdHJpbmdzIiwicmVkdWNlIiwic2VxIiwid2VpZ2h0ZWRfcmFuZF9zZWxlY3QiLCJoaXN0b2dyYXBoIiwid2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCIsIndlaWdodGVkX2hpc3RvX2tleSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBcUJBOzs7Ozs7QUFwQkE7O0FBc0JBLElBQU1BLFFBQWdEQyxRQUFRLGVBQVIsRUFBeUJELEtBQS9FLEMsQ0FBdUY7O0FBRXZGLElBQU1FLFVBQWlCLElBQXZCLEMsQ0FBNkI7OztBQU03QixTQUFTQyxlQUFULENBQXlCQyxLQUF6QixFQUFpRTs7QUFFL0QsVUFBU0MsT0FBT0QsS0FBUCxDQUFUOztBQUVFLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNiLGFBQU8sT0FBUDs7QUFFRixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDYixhQUFPLE1BQVA7O0FBRUYsU0FBSyxLQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMOztBQUVmLFNBQUssS0FBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDs7QUFFZixTQUFLLEtBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDYixhQUFPLE1BQVA7O0FBRUY7QUFDRSxZQUFNLElBQUlFLEtBQUosMENBQWlERixLQUFqRCxDQUFOOztBQTFCSjtBQThCRDs7QUFNRDs7QUFFQSxTQUFTRyxlQUFULENBQXlCSCxLQUF6QixFQUE0RDs7QUFFMUQsVUFBU0MsT0FBT0QsS0FBUCxDQUFUOztBQUVFLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNiLGFBQU8sTUFBUDs7QUFFRixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLEtBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDYixhQUFPLE9BQVA7O0FBRUYsU0FBSyxJQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxLQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMO0FBQ2IsYUFBTyxNQUFQOztBQUVGLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssS0FBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDtBQUNiLGFBQU8sUUFBUDs7QUFFRjtBQUNFLFlBQU0sSUFBSUUsS0FBSiwwQ0FBaURGLEtBQWpELENBQU47O0FBMUJKO0FBOEJEOztBQUVEOztBQU1BOztBQUVBLFNBQVNJLGdCQUFULENBQTBCSixLQUExQixFQUE2RDs7QUFFM0QsVUFBU0MsT0FBT0QsS0FBUCxDQUFUOztBQUVFLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNiLGFBQU8sTUFBUDs7QUFFRixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLEtBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDYixhQUFPLE9BQVA7O0FBRUYsU0FBSyxJQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxLQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMO0FBQ2IsYUFBTyxNQUFQOztBQUVGLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssS0FBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDtBQUNiLGFBQU8sUUFBUDs7QUFFRjtBQUNFLFlBQU0sSUFBSUUsS0FBSiwwQ0FBaURGLEtBQWpELENBQU47O0FBMUJKO0FBOEJEOztBQUVEOztBQU1BLFNBQVNLLDRCQUFULENBQ2FDLEdBRGIsRUFFYUMsSUFGYixFQUdhQyxFQUhiLEVBSWFDLE9BSmIsRUFLYUMsT0FMYixFQU0rQztBQUFFOztBQUUvQyxNQUFNQyxRQUE0QyxFQUFsRDs7QUFFQSxNQUFNQyxRQUF3QkMsTUFBTUMsT0FBTixDQUFjUCxJQUFkLElBQXFCQSxJQUFyQixHQUE0QixDQUFDQSxJQUFELENBQTFEO0FBQUEsTUFDTVEsTUFBd0JGLE1BQU1DLE9BQU4sQ0FBY04sRUFBZCxJQUFxQkEsRUFBckIsR0FBNEIsQ0FBQ0EsRUFBRCxDQUQxRDs7QUFHQUksUUFBTUksR0FBTixDQUFXLFVBQUNDLENBQUQsRUFBVztBQUNwQkYsUUFBSUMsR0FBSixDQUFTLFVBQUNFLENBQUQsRUFBVzs7QUFFbEIsVUFBTUMsS0FBcUJmLGlCQUFpQkssUUFBUVcsSUFBekIsQ0FBM0I7QUFBQSxVQUNNQyxLQUFxQmxCLGdCQUFnQk0sUUFBUVcsSUFBeEIsQ0FEM0I7O0FBSUEsVUFBTUUsUUFBbUM7QUFDdkNmLGNBQWNVLENBRHlCO0FBRXZDVCxZQUFjVSxDQUZ5QjtBQUd2Q0UsY0FBY0QsRUFIeUI7QUFJdkNJLHFCQUFjSixPQUFPLFFBSmtCO0FBS3ZDSyxtQkFBY0wsT0FBTztBQUxrQixPQUF6Qzs7QUFRQSxVQUFJVixRQUFRZ0IsUUFBWixFQUEyQjtBQUFFSCxjQUFNSSxNQUFOLEdBQW9CakIsUUFBUWdCLFFBQTVCO0FBQTRDO0FBQ3pFLFVBQUloQixRQUFRa0IsYUFBWixFQUEyQjtBQUFFTCxjQUFNTSxXQUFOLEdBQW9CbkIsUUFBUWtCLGFBQTVCO0FBQTRDO0FBQ3pFLFVBQUlMLE1BQU1GLElBQU4sS0FBZSxNQUFuQixFQUEyQjtBQUFFVCxjQUFNa0IsSUFBTixDQUFXUCxLQUFYO0FBQW9COztBQUdqRCxVQUFNUSxPQUFrQztBQUN0Q3ZCLGNBQWNXLENBRHdCO0FBRXRDVixZQUFjUyxDQUZ3QjtBQUd0Q0csY0FBY0MsRUFId0I7QUFJdENFLHFCQUFjRixPQUFPLFFBSmlCO0FBS3RDRyxtQkFBY0gsT0FBTztBQUxpQixPQUF4Qzs7QUFRQSxVQUFJWixRQUFRc0IsUUFBWixFQUEyQjtBQUFFRCxhQUFLSixNQUFMLEdBQW1CakIsUUFBUXNCLFFBQTNCO0FBQTJDO0FBQ3hFLFVBQUl0QixRQUFRdUIsYUFBWixFQUEyQjtBQUFFRixhQUFLRixXQUFMLEdBQW1CbkIsUUFBUXVCLGFBQTNCO0FBQTJDO0FBQ3hFLFVBQUlGLEtBQUtWLElBQUwsS0FBYyxNQUFsQixFQUEyQjtBQUFFVCxjQUFNa0IsSUFBTixDQUFXQyxJQUFYO0FBQW1CO0FBRWpELEtBL0JEO0FBZ0NELEdBakNEOztBQW1DQSxNQUFNRyxVQUE4QzNCLElBQUk0QixNQUFKLENBQVd2QixLQUFYLENBQXBEOztBQUVBLE1BQUlELE9BQUosRUFBYTtBQUNYLFdBQU9MLDZCQUE2QjRCLE9BQTdCLEVBQXNDekIsRUFBdEMsRUFBMENFLFFBQVFGLEVBQWxELEVBQXNERSxPQUF0RCxFQUErREEsUUFBUXlCLEVBQXZFLENBQVA7QUFDRCxHQUZELE1BRU87QUFDTCxXQUFPRixPQUFQO0FBQ0Q7QUFFRjs7QUFJRCxTQUFTRyw4QkFBVCxDQUE2Q0MsSUFBN0MsRUFBcUY7QUFBRTtBQUNyRixTQUFPaEMsNkJBQTZCLEVBQTdCLEVBQWlDZ0MsS0FBSzlCLElBQXRDLEVBQTRDOEIsS0FBS0YsRUFBTCxDQUFRM0IsRUFBcEQsRUFBd0Q2QixLQUFLRixFQUE3RCxFQUFpRUUsS0FBS0YsRUFBTCxDQUFRQSxFQUF6RSxDQUFQO0FBQ0Q7O0FBSUQsU0FBU0csb0JBQVQsQ0FBbUNELElBQW5DLEVBQXFGO0FBQUU7O0FBRXJGLE1BQUlBLEtBQUtFLEdBQUwsS0FBYSxZQUFqQixFQUErQjtBQUFFLFdBQU8sRUFBRUMsUUFBUSxZQUFWLEVBQXdCQyxLQUFLTCwrQkFBK0JDLElBQS9CLENBQTdCLEVBQVA7QUFBNkU7O0FBRTlHLE1BQU1LLGNBQThCLENBQ2xDLGNBRGtDLEVBQ2xCLGNBRGtCLEVBQ0YsWUFERSxFQUNZLGNBRFosRUFDNEIsaUJBRDVCLEVBRWxDLGlCQUZrQyxFQUVmLGdCQUZlLEVBRUcscUJBRkgsRUFFMEIsb0JBRjFCLEVBR2xDLG1CQUhrQyxFQUdiLGlCQUhhLEVBR00sYUFITixDQUFwQzs7QUFNQSxNQUFJQSxZQUFZQyxRQUFaLENBQXFCTixLQUFLRSxHQUExQixDQUFKLEVBQW9DO0FBQ2xDLFdBQU8sRUFBRUMsUUFBUUgsS0FBS0UsR0FBZixFQUFvQkUsS0FBS0osS0FBS08sS0FBOUIsRUFBUDtBQUNEOztBQUVELFFBQU0sSUFBSTFDLEtBQUosMENBQWlEMkMsS0FBS0MsU0FBTCxDQUFlVCxJQUFmLENBQWpELENBQU47QUFFRDs7QUFNRCxTQUFTVSxPQUFULENBQTJCQyxJQUEzQixFQUFvRjtBQUFBOztBQUFHOztBQUVyRixNQUFNQyxVQWNGO0FBQ0ZDLGtCQUFzQixFQURwQjtBQUVGQyxnQkFBc0IsRUFGcEI7QUFHRkMsa0JBQXNCLEVBSHBCO0FBSUZDLGdCQUFzQixFQUpwQjtBQUtGQyxpQkFBc0IsRUFMcEI7QUFNRkMsb0JBQXNCLEVBTnBCO0FBT0ZDLHFCQUFzQixFQVBwQjtBQVFGQyx5QkFBc0IsRUFScEI7QUFTRkMsd0JBQXNCLEVBVHBCO0FBVUZDLHFCQUFzQixFQVZwQjtBQVdGQyxrQkFBc0IsRUFYcEI7QUFZRkMsdUJBQXNCLEVBWnBCO0FBYUZDLHFCQUFzQjtBQWJwQixHQWRKOztBQThCQWQsT0FBS2hDLEdBQUwsQ0FBVSxVQUFDK0MsRUFBRCxFQUFrQzs7QUFFMUMsUUFBTTFCLE9BQTJCQyxxQkFBcUJ5QixFQUFyQixDQUFqQztBQUFBLFFBQ012QixTQUEyQkgsS0FBS0csTUFEdEM7QUFBQSxRQUVNQyxNQUEyQkosS0FBS0ksR0FGdEMsQ0FGMEMsQ0FJa0I7O0FBRTVEUSxZQUFRVCxNQUFSLElBQWtCUyxRQUFRVCxNQUFSLEVBQWdCTixNQUFoQixDQUF1Qk8sR0FBdkIsQ0FBbEI7QUFFRCxHQVJEOztBQVVBLE1BQU11Qix3QkFBNEQsWUFBRzlCLE1BQUgsZ0NBQWNlLFFBQVEsWUFBUixDQUFkLEVBQWxFOztBQUVBLE1BQU1nQixhQUEyQztBQUMvQ2Isa0JBQWVILFFBQVFHLFlBQVIsQ0FBcUJjLE1BQXJCLEdBQTZCakIsUUFBUUcsWUFBckMsR0FBb0QsQ0FBQ1ksc0JBQXNCLENBQXRCLEVBQXlCekQsSUFBMUIsQ0FEcEI7QUFFL0M0RCxpQkFBZUg7QUFGZ0MsR0FBakQ7O0FBS0EsTUFBTUksY0FBOEIsQ0FDbEMsY0FEa0MsRUFDbEIsY0FEa0IsRUFDRixpQkFERSxFQUNpQixpQkFEakIsRUFDb0MsYUFEcEMsRUFDbUQsaUJBRG5ELEVBRWxDLG9CQUZrQyxDQUFwQzs7QUFLQUEsY0FBWXBELEdBQVosQ0FBaUIsVUFBQ3FELFVBQUQsRUFBeUI7QUFDeEMsUUFBSXBCLFFBQVFvQixVQUFSLEVBQW9CSCxNQUFwQixHQUE2QixDQUFqQyxFQUFvQztBQUNsQyxZQUFNLElBQUloRSxLQUFKLHdCQUErQm1FLFVBQS9CLDRCQUFnRXhCLEtBQUtDLFNBQUwsQ0FBZUcsUUFBUW9CLFVBQVIsQ0FBZixDQUFoRSxDQUFOO0FBQ0QsS0FGRCxNQUVPO0FBQ0wsVUFBSXBCLFFBQVFvQixVQUFSLEVBQW9CSCxNQUF4QixFQUFnQztBQUM5QkQsbUJBQVdJLFVBQVgsSUFBeUJwQixRQUFRb0IsVUFBUixFQUFvQixDQUFwQixDQUF6QjtBQUNEO0FBQ0Y7QUFDRixHQVJEOztBQVVBLEdBQUMsZ0JBQUQsRUFBbUIscUJBQW5CLEVBQTBDLG1CQUExQyxFQUErRHJELEdBQS9ELENBQW9FLFVBQUNzRCxRQUFELEVBQXVCO0FBQ3pGLFFBQUlyQixRQUFRcUIsUUFBUixFQUFrQkosTUFBdEIsRUFBOEI7QUFDNUJELGlCQUFXSyxRQUFYLElBQXVCckIsUUFBUXFCLFFBQVIsQ0FBdkI7QUFDRDtBQUNGLEdBSkQ7O0FBTUEsU0FBT0wsVUFBUDtBQUVEOztBQU1ELFNBQVNNLElBQVQsQ0FBd0JDLElBQXhCLEVBQXFFO0FBQ25FLFNBQU96QixRQUFRbkQsTUFBTTRFLElBQU4sQ0FBUixDQUFQO0FBQ0Q7O0lBTUtDLE87O0FBd0JKO0FBQ0EsMEJBYWlDO0FBQUE7O0FBQUEsUUFaL0JyQixZQVkrQixTQVovQkEsWUFZK0I7QUFBQSwrQkFYL0JzQixRQVcrQjtBQUFBLFFBWC9CQSxRQVcrQixrQ0FYYixFQVdhO0FBQUEsUUFWL0JQLFdBVStCLFNBVi9CQSxXQVUrQjtBQUFBLFFBVC9CWixjQVMrQixTQVQvQkEsY0FTK0I7QUFBQSxRQVIvQkMsZUFRK0IsU0FSL0JBLGVBUStCO0FBQUEsUUFQL0JDLG1CQU8rQixTQVAvQkEsbUJBTytCO0FBQUEsUUFOL0JDLGtCQU0rQixTQU4vQkEsa0JBTStCO0FBQUEsUUFML0JDLGVBSytCLFNBTC9CQSxlQUsrQjtBQUFBLFFBSi9CQyxZQUkrQixTQUovQkEsWUFJK0I7QUFBQSxRQUgvQkUsZUFHK0IsU0FIL0JBLGVBRytCO0FBQUEsUUFGL0JSLFdBRStCLFNBRi9CQSxXQUUrQjtBQUFBLG1DQUQvQkosWUFDK0I7QUFBQSxRQUQvQkEsWUFDK0Isc0NBRGhCLEtBQ2dCOztBQUFBOztBQUUvQixTQUFLeUIsTUFBTCxHQUErQnZCLGFBQWEsQ0FBYixDQUEvQjtBQUNBLFNBQUt3QixPQUFMLEdBQStCLElBQUlDLEdBQUosRUFBL0I7QUFDQSxTQUFLQyxNQUFMLEdBQStCLEVBQS9CO0FBQ0EsU0FBS0MsU0FBTCxHQUErQixJQUFJRixHQUFKLEVBQS9CO0FBQ0EsU0FBS0csa0JBQUwsR0FBK0IsSUFBSUgsR0FBSixFQUEvQjtBQUNBLFNBQUtJLFFBQUwsR0FBK0IsSUFBSUosR0FBSixFQUEvQjtBQUNBLFNBQUtLLGdCQUFMLEdBQStCLElBQUlMLEdBQUosRUFBL0I7QUFDQSxTQUFLTSx1QkFBTCxHQUErQixJQUFJTixHQUFKLEVBQS9CLENBVCtCLENBU2E7O0FBRTVDLFNBQUtPLGVBQUwsR0FBK0I3QixjQUEvQjtBQUNBLFNBQUs4QixnQkFBTCxHQUErQjdCLGVBQS9CO0FBQ0EsU0FBSzhCLG9CQUFMLEdBQStCN0IsbUJBQS9CO0FBQ0EsU0FBSzhCLG1CQUFMLEdBQStCN0Isa0JBQS9CO0FBQ0EsU0FBSzhCLGdCQUFMLEdBQStCN0IsZUFBL0I7QUFDQSxTQUFLOEIsYUFBTCxHQUErQjdCLFlBQS9CO0FBQ0EsU0FBSzhCLGdCQUFMLEdBQStCNUIsZUFBL0I7QUFDQSxTQUFLNkIsWUFBTCxHQUErQnJDLFdBQS9COztBQUVBLFNBQUtzQyxhQUFMLEdBQStCMUMsWUFBL0I7O0FBRUFpQixnQkFBWW5ELEdBQVosQ0FBaUIsVUFBQytDLEVBQUQsRUFBaUM7O0FBRWhELFVBQUlBLEdBQUd4RCxJQUFILEtBQVlzRixTQUFoQixFQUEyQjtBQUFFLGNBQU0sSUFBSTNGLEtBQUosdUNBQTRDMkMsS0FBS0MsU0FBTCxDQUFlaUIsRUFBZixDQUE1QyxDQUFOO0FBQTBFO0FBQ3ZHLFVBQUlBLEdBQUd2RCxFQUFILEtBQVlxRixTQUFoQixFQUEyQjtBQUFFLGNBQU0sSUFBSTNGLEtBQUoscUNBQTRDMkMsS0FBS0MsU0FBTCxDQUFlaUIsRUFBZixDQUE1QyxDQUFOO0FBQTBFOztBQUV2RztBQUNBLFVBQU0rQixjQUNBLE1BQUtsQixPQUFMLENBQWFtQixHQUFiLENBQWlCaEMsR0FBR3hELElBQXBCLEtBQ0EsRUFBRXlGLE1BQU1qQyxHQUFHeEQsSUFBWCxFQUFpQkEsTUFBTSxFQUF2QixFQUEyQkMsSUFBSSxFQUEvQixFQUFtQ2tFLFVBQVVBLFNBQVMvQixRQUFULENBQWtCb0IsR0FBR3hELElBQXJCLENBQTdDLEVBRk47O0FBSUEsVUFBSSxDQUFFLE1BQUtxRSxPQUFMLENBQWFxQixHQUFiLENBQWlCbEMsR0FBR3hELElBQXBCLENBQU4sRUFBa0M7QUFDaEMsY0FBSzJGLFVBQUwsQ0FBZ0JKLFdBQWhCO0FBQ0Q7O0FBRUQsVUFBTUssWUFDQSxNQUFLdkIsT0FBTCxDQUFhbUIsR0FBYixDQUFpQmhDLEdBQUd2RCxFQUFwQixLQUNBLEVBQUN3RixNQUFNakMsR0FBR3ZELEVBQVYsRUFBY0QsTUFBTSxFQUFwQixFQUF3QkMsSUFBSSxFQUE1QixFQUFnQ2tFLFVBQVVBLFNBQVMvQixRQUFULENBQWtCb0IsR0FBR3ZELEVBQXJCLENBQTFDLEVBRk47O0FBSUEsVUFBSSxDQUFFLE1BQUtvRSxPQUFMLENBQWFxQixHQUFiLENBQWlCbEMsR0FBR3ZELEVBQXBCLENBQU4sRUFBZ0M7QUFDOUIsY0FBSzBGLFVBQUwsQ0FBZ0JDLFNBQWhCO0FBQ0Q7O0FBRUQ7QUFDQSxVQUFJTCxZQUFZdEYsRUFBWixDQUFlbUMsUUFBZixDQUF3Qm9CLEdBQUd2RCxFQUEzQixDQUFKLEVBQW9DO0FBQ2xDLGNBQU0sSUFBSU4sS0FBSixrQkFBeUIyQyxLQUFLQyxTQUFMLENBQWVpQixHQUFHeEQsSUFBbEIsQ0FBekIsWUFBdURzQyxLQUFLQyxTQUFMLENBQWVpQixHQUFHdkQsRUFBbEIsQ0FBdkQsQ0FBTjtBQUNELE9BRkQsTUFFTztBQUNMc0Ysb0JBQVl0RixFQUFaLENBQWVxQixJQUFmLENBQW9Ca0MsR0FBR3ZELEVBQXZCO0FBQ0EyRixrQkFBVTVGLElBQVYsQ0FBZXNCLElBQWYsQ0FBb0JrQyxHQUFHeEQsSUFBdkI7QUFDRDs7QUFFRDtBQUNBLFlBQUt1RSxNQUFMLENBQVlqRCxJQUFaLENBQWlCa0MsRUFBakI7QUFDQSxVQUFNcUMsYUFBc0IsTUFBS3RCLE1BQUwsQ0FBWVosTUFBWixHQUFxQixDQUFqRDs7QUFFQTtBQUNBLFVBQUlILEdBQUdpQyxJQUFQLEVBQWE7QUFDWCxZQUFJLE1BQUtoQixrQkFBTCxDQUF3QmlCLEdBQXhCLENBQTRCbEMsR0FBR2lDLElBQS9CLENBQUosRUFBMEM7QUFDeEMsZ0JBQU0sSUFBSTlGLEtBQUosd0JBQStCMkMsS0FBS0MsU0FBTCxDQUFlaUIsR0FBR2lDLElBQWxCLENBQS9CLHVCQUFOO0FBQ0QsU0FGRCxNQUVPO0FBQ0wsZ0JBQUtoQixrQkFBTCxDQUF3QnFCLEdBQXhCLENBQTRCdEMsR0FBR2lDLElBQS9CLEVBQXFDSSxVQUFyQztBQUNEO0FBQ0Y7O0FBRUQ7QUFDQSxVQUFNRSxlQUFrQyxNQUFLdkIsU0FBTCxDQUFlZ0IsR0FBZixDQUFtQmhDLEdBQUd4RCxJQUF0QixLQUErQixJQUFJc0UsR0FBSixFQUF2RTtBQUNBLFVBQUksQ0FBRSxNQUFLRSxTQUFMLENBQWVrQixHQUFmLENBQW1CbEMsR0FBR3hELElBQXRCLENBQU4sRUFBb0M7QUFDbEMsY0FBS3dFLFNBQUwsQ0FBZXNCLEdBQWYsQ0FBbUJ0QyxHQUFHeEQsSUFBdEIsRUFBNEIrRixZQUE1QjtBQUNEOztBQUVQO0FBQ01BLG1CQUFhRCxHQUFiLENBQWlCdEMsR0FBR3ZELEVBQXBCLEVBQXdCNEYsVUFBeEIsRUFsRGdELENBa0RYOztBQUVyQztBQUNBLFVBQUlyQyxHQUFHckMsTUFBUCxFQUFlOztBQUdiO0FBQ0EsWUFBSTZFLFlBQWdDLE1BQUt0QixRQUFMLENBQWNjLEdBQWQsQ0FBa0JoQyxHQUFHckMsTUFBckIsQ0FBcEM7QUFDQSxZQUFJLENBQUU2RSxTQUFOLEVBQWtCO0FBQ2hCQSxzQkFBWSxJQUFJMUIsR0FBSixFQUFaO0FBQ0EsZ0JBQUtJLFFBQUwsQ0FBY29CLEdBQWQsQ0FBa0J0QyxHQUFHckMsTUFBckIsRUFBNkI2RSxTQUE3QjtBQUNEOztBQUVELFlBQUlBLFVBQVVOLEdBQVYsQ0FBY2xDLEdBQUd4RCxJQUFqQixDQUFKLEVBQTRCO0FBQzFCLGdCQUFNLElBQUlMLEtBQUosYUFBb0IyQyxLQUFLQyxTQUFMLENBQWVpQixHQUFHckMsTUFBbEIsQ0FBcEIsb0NBQTRFbUIsS0FBS0MsU0FBTCxDQUFlaUIsR0FBR3hELElBQWxCLENBQTVFLENBQU47QUFDRCxTQUZELE1BRU87QUFDTGdHLG9CQUFVRixHQUFWLENBQWN0QyxHQUFHeEQsSUFBakIsRUFBdUI2RixVQUF2QjtBQUNEOztBQUdEO0FBQ0EsWUFBSUksYUFBaUMsTUFBS3RCLGdCQUFMLENBQXNCYSxHQUF0QixDQUEwQmhDLEdBQUd4RCxJQUE3QixDQUFyQztBQUNBLFlBQUksQ0FBRWlHLFVBQU4sRUFBbUI7QUFDakJBLHVCQUFhLElBQUkzQixHQUFKLEVBQWI7QUFDQSxnQkFBS0ssZ0JBQUwsQ0FBc0JtQixHQUF0QixDQUEwQnRDLEdBQUd4RCxJQUE3QixFQUFtQ2lHLFVBQW5DO0FBQ0Q7O0FBRUQ7QUFDQTtBQUNBQSxtQkFBV0gsR0FBWCxDQUFldEMsR0FBR3JDLE1BQWxCLEVBQTBCMEUsVUFBMUI7O0FBR0E7QUFDQSxZQUFJLENBQUUsTUFBS2pCLHVCQUFMLENBQTZCYyxHQUE3QixDQUFpQ2xDLEdBQUd2RCxFQUFwQyxDQUFOLEVBQWdEO0FBQzlDLGdCQUFLMkUsdUJBQUwsQ0FBNkJrQixHQUE3QixDQUFpQ3RDLEdBQUd2RCxFQUFwQyxFQUF3QyxJQUFJcUUsR0FBSixFQUF4QztBQUNEOztBQUVUOzs7Ozs7Ozs7Ozs7O0FBYU87QUFFRixLQXRHRDtBQXdHRDs7OzsrQkFFVTRCLFksRUFBNEM7QUFBRTs7QUFFdkQsVUFBSSxLQUFLN0IsT0FBTCxDQUFhcUIsR0FBYixDQUFpQlEsYUFBYVQsSUFBOUIsQ0FBSixFQUF5QztBQUN2QyxjQUFNLElBQUk5RixLQUFKLFlBQW1CMkMsS0FBS0MsU0FBTCxDQUFlMkQsYUFBYVQsSUFBNUIsQ0FBbkIscUJBQU47QUFDRDs7QUFFRCxXQUFLcEIsT0FBTCxDQUFheUIsR0FBYixDQUFpQkksYUFBYVQsSUFBOUIsRUFBb0NTLFlBQXBDO0FBQ0EsYUFBT0EsYUFBYVQsSUFBcEI7QUFFRDs7OzRCQUlhO0FBQ1osYUFBTyxLQUFLckIsTUFBWjtBQUNEOztBQUVIOzs7Ozs7Ozs7O21DQVNpQitCLFUsRUFBNEI7QUFDekMsYUFBVSxLQUFLQyxpQkFBTCxDQUF1QkQsVUFBdkIsQ0FBRCxJQUF5QyxLQUFLRSxpQkFBTCxDQUF1QkYsVUFBdkIsQ0FBbEQ7QUFDRDs7OytCQUVvQjtBQUN2QjtBQUNJLGFBQU8sS0FBS0csY0FBTCxDQUFvQixLQUFLQyxLQUFMLEVBQXBCLENBQVA7QUFDRDs7O21DQUV1QjtBQUN0QixhQUFPLEtBQUtsQixhQUFaO0FBQ0Q7OztxQ0FJaUM7QUFDaEMsYUFBTyxLQUFLUixlQUFaO0FBQ0Q7OztzQ0FFMkI7QUFDMUIsYUFBTyxLQUFLQyxnQkFBWjtBQUNEOzs7MENBRXNDO0FBQ3JDLGFBQU8sS0FBS0Msb0JBQVo7QUFDRDs7O3lDQUU4QjtBQUM3QixhQUFPLEtBQUtDLG1CQUFaO0FBQ0Q7OztzQ0FFMkI7QUFDMUIsYUFBTyxLQUFLQyxnQkFBWjtBQUNEOzs7bUNBRXdCO0FBQ3ZCLGFBQU8sS0FBS0MsYUFBWjtBQUNEOzs7c0NBRTJCO0FBQzFCLGFBQU8sS0FBS0MsZ0JBQVo7QUFDRDs7O2tDQUV1QjtBQUN0QixhQUFPLEtBQUtDLFlBQVo7QUFDRDs7O29DQUlvRDs7QUFFbkQsYUFBTztBQUNMb0IscUNBQThCLENBRHpCOztBQUdMQyxpQkFBeUIsS0FBSy9CLFFBSHpCO0FBSUxnQyxrQkFBeUIsS0FBS2xDLFNBSnpCO0FBS0xwRSxlQUF5QixLQUFLbUUsTUFMekI7QUFNTG9DLDJCQUF5QixLQUFLbEMsa0JBTnpCO0FBT0xtQyx5QkFBeUIsS0FBS2pDLGdCQVB6QjtBQVFYO0FBQ000QixlQUF5QixLQUFLbkMsTUFUekI7QUFVTHlDLGdCQUF5QixLQUFLeEM7QUFWekIsT0FBUDtBQWFEOztBQUVIOzs7Ozs7Ozs2QkFPd0I7QUFDcEIsMENBQVksS0FBS0EsT0FBTCxDQUFheUMsSUFBYixFQUFaO0FBQ0Q7Ozs4QkFFU1gsVSxFQUEwQztBQUNsRCxVQUFNSSxRQUFpQyxLQUFLbEMsT0FBTCxDQUFhbUIsR0FBYixDQUFpQlcsVUFBakIsQ0FBdkM7QUFDQSxVQUFJSSxLQUFKLEVBQVc7QUFBRSxlQUFPQSxLQUFQO0FBQWUsT0FBNUIsTUFDVztBQUFFLGNBQU0sSUFBSTVHLEtBQUosb0JBQTJCMkMsS0FBS0MsU0FBTCxDQUFlZ0UsS0FBZixDQUEzQixDQUFOO0FBQTREO0FBQzFFOzs7aUNBSWdEO0FBQy9DLGFBQU8sS0FBS2hDLE1BQVo7QUFDRDs7OzZDQUUyQztBQUMxQyxhQUFPLEtBQUtFLGtCQUFaO0FBQ0Q7OzttQ0FFMkI7QUFDMUIsMENBQVksS0FBS0MsUUFBTCxDQUFjb0MsSUFBZCxFQUFaO0FBQ0Q7OztrREFJNkI5RyxJLEVBQVdDLEUsRUFBbUI7O0FBRTFELFVBQU04RyxNQUEwQixLQUFLdkMsU0FBTCxDQUFlZ0IsR0FBZixDQUFtQnhGLElBQW5CLENBQWhDOztBQUVBLFVBQUkrRyxHQUFKLEVBQVM7QUFDUCxlQUFPQSxJQUFJdkIsR0FBSixDQUFRdkYsRUFBUixDQUFQO0FBQ0QsT0FGRCxNQUVPO0FBQ0wsZUFBT3FGLFNBQVA7QUFDRDtBQUVGOzs7MENBSXFCdEYsSSxFQUFXQyxFLEVBQXFDO0FBQ3BFLFVBQU0rRyxLQUFlLEtBQUtDLDZCQUFMLENBQW1DakgsSUFBbkMsRUFBeUNDLEVBQXpDLENBQXJCO0FBQ0EsYUFBUytHLE9BQU8xQixTQUFSLElBQXVCMEIsT0FBTyxJQUEvQixHQUF1QzFCLFNBQXZDLEdBQW1ELEtBQUtmLE1BQUwsQ0FBWXlDLEVBQVosQ0FBMUQ7QUFDRDs7O3VDQUkyRTtBQUFBLFVBQTNEYixVQUEyRCx1RUFBeEMsS0FBS0ksS0FBTCxFQUF3Qzs7QUFDMUUsYUFBTyxFQUFDVyxXQUFXLEtBQUtDLGNBQUwsQ0FBb0JoQixVQUFwQixDQUFaLEVBQTZDaUIsT0FBTyxLQUFLQyxVQUFMLENBQWdCbEIsVUFBaEIsQ0FBcEQsRUFBUDtBQUNEOzs7cUNBRTREO0FBQUEsVUFBOUNBLFVBQThDLHVFQUEzQixLQUFLSSxLQUFMLEVBQTJCOztBQUMzRCxhQUFPLENBQUMsS0FBS2xDLE9BQUwsQ0FBYW1CLEdBQWIsQ0FBaUJXLFVBQWpCLEtBQWdDLEVBQWpDLEVBQXFDbkcsSUFBckMsSUFBNkMsRUFBcEQ7QUFDRDs7O2lDQUV3RDtBQUFBLFVBQTlDbUcsVUFBOEMsdUVBQTNCLEtBQUtJLEtBQUwsRUFBMkI7O0FBQ3ZELGFBQU8sQ0FBQyxLQUFLbEMsT0FBTCxDQUFhbUIsR0FBYixDQUFpQlcsVUFBakIsS0FBZ0MsRUFBakMsRUFBcUNsRyxFQUFyQyxJQUE2QyxFQUFwRDtBQUNEOzs7dUNBSWtCa0csVSxFQUFzRDtBQUFBOztBQUV2RSxVQUFNbUIsU0FBa0MsS0FBS2pELE9BQUwsQ0FBYW1CLEdBQWIsQ0FBaUJXLFVBQWpCLENBQXhDO0FBQ0EsVUFBSSxDQUFFbUIsTUFBTixFQUFlO0FBQUUsY0FBTSxJQUFJM0gsS0FBSixvQkFBMkIyQyxLQUFLQyxTQUFMLENBQWU0RCxVQUFmLENBQTNCLDRCQUFOO0FBQXVGOztBQUV4RyxVQUFNb0IsWUFBMkJELE9BQU9ySCxFQUF4QztBQUFBLFVBRU11SCxJQUE4QztBQUE5QyxRQUNZRCxVQUNHOUcsR0FESCxDQUNRLFVBQUNnSCxFQUFEO0FBQUEsZUFBb0MsT0FBS0MscUJBQUwsQ0FBMkIsT0FBS25CLEtBQUwsRUFBM0IsRUFBeUNrQixFQUF6QyxDQUFwQztBQUFBLE9BRFIsRUFFR0UsTUFGSCxDQUVVQyxPQUZWLENBSGxCOztBQU9BLGFBQU9KLEdBQVA7QUFFRDs7OytDQUVvQztBQUNuQyxVQUFNSyxXQUFzQyxvQ0FBcUIsS0FBS0Msa0JBQUwsQ0FBd0IsS0FBS3ZCLEtBQUwsRUFBeEIsQ0FBckIsQ0FBNUM7QUFDQSxhQUFPLEtBQUszRCxVQUFMLENBQWlCaUYsU0FBUzVILEVBQTFCLENBQVA7QUFDRDs7O3VDQUVrQjhILEMsRUFBeUI7QUFBQTs7QUFDMUMsYUFBTyxtQkFBSUEsQ0FBSixFQUNBdEgsR0FEQSxDQUNJLFlBQVk7QUFDZCxZQUFNdUgsWUFBa0IsT0FBS3pCLEtBQUwsRUFBeEI7QUFDQSxlQUFLMEIsd0JBQUw7QUFDQSxlQUFPRCxTQUFQO0FBQ0QsT0FMRCxFQU1BckcsTUFOQSxDQU1PLENBQUMsS0FBSzRFLEtBQUwsRUFBRCxDQU5QLENBQVA7QUFPRDs7OzZDQUV3QndCLEMsRUFBK0I7QUFDdEQsYUFBTywwQkFBVyxLQUFLRyxrQkFBTCxDQUF3QkgsQ0FBeEIsQ0FBWCxDQUFQO0FBQ0Q7Ozs4QkFJc0Q7QUFBQSxVQUEvQzVCLFVBQStDLHVFQUE1QixLQUFLSSxLQUFMLEVBQTRCOztBQUNyRCxVQUFNZSxTQUE2QixLQUFLM0MsZ0JBQUwsQ0FBc0JhLEdBQXRCLENBQTBCVyxVQUExQixDQUFuQztBQUNBLFVBQUltQixNQUFKLEVBQVk7QUFBRSw0Q0FBWUEsT0FBT1IsSUFBUCxFQUFaO0FBQTZCLE9BQTNDLE1BQ1k7QUFBRSxjQUFNLElBQUluSCxLQUFKLG9CQUEyQjJDLEtBQUtDLFNBQUwsQ0FBZTRELFVBQWYsQ0FBM0IsQ0FBTjtBQUFpRTtBQUNoRjs7OzhDQUV5QkEsVSxFQUErQjtBQUN2RCxVQUFNbUIsU0FBNkIsS0FBSzVDLFFBQUwsQ0FBY2MsR0FBZCxDQUFrQlcsVUFBbEIsQ0FBbkM7QUFDQSxVQUFJbUIsTUFBSixFQUFZO0FBQUUsNENBQVlBLE9BQU9SLElBQVAsRUFBWjtBQUE2QixPQUEzQyxNQUNZO0FBQUUsY0FBTSxJQUFJbkgsS0FBSixvQkFBMkIyQyxLQUFLQyxTQUFMLENBQWU0RCxVQUFmLENBQTNCLENBQU47QUFBaUU7QUFDaEY7O0FBRUg7QUFDQTs7Ozs7Ozs7Ozs7d0NBUW9FO0FBQUE7O0FBQUEsVUFBaERBLFVBQWdELHVFQUE3QixLQUFLSSxLQUFMLEVBQTZCO0FBQUU7QUFDbEUsVUFBTTRCLFVBQThCLEtBQUt4RCxnQkFBTCxDQUFzQmEsR0FBdEIsQ0FBMEJXLFVBQTFCLENBQXBDO0FBQ0EsVUFBSSxDQUFFZ0MsT0FBTixFQUFnQjtBQUFFLGNBQU0sSUFBSXhJLEtBQUosb0JBQTJCMkMsS0FBS0MsU0FBTCxDQUFlNEQsVUFBZixDQUEzQixDQUFOO0FBQWlFOztBQUVuRixhQUFPLDZCQUFLZ0MsUUFBUUMsTUFBUixFQUFMLEdBQ0MzSCxHQURELENBQ1UsVUFBQzRILE1BQUQ7QUFBQSxlQUEyRCxPQUFLOUQsTUFBTCxDQUFZOEQsTUFBWixDQUEzRDtBQUFBLE9BRFYsRUFFQ1YsTUFGRCxDQUVVLFVBQUNXLENBQUQ7QUFBQSxlQUEyREEsRUFBRXRJLElBQUYsS0FBV21HLFVBQXRFO0FBQUEsT0FGVixFQUdDMUYsR0FIRCxDQUdVLFVBQUM4SCxRQUFEO0FBQUEsZUFBMkRBLFNBQVNwSCxNQUFwRTtBQUFBLE9BSFYsQ0FBUDtBQUlEOzs7NENBRXNFO0FBQUE7O0FBQUEsVUFBakRnRixVQUFpRCx1RUFBOUIsS0FBS0ksS0FBTCxFQUE4QjtBQUFFO0FBQ3ZFLFVBQU00QixVQUE4QixLQUFLeEQsZ0JBQUwsQ0FBc0JhLEdBQXRCLENBQTBCVyxVQUExQixDQUFwQztBQUNBLFVBQUksQ0FBRWdDLE9BQU4sRUFBZ0I7QUFBRSxjQUFNLElBQUl4SSxLQUFKLG9CQUEyQjJDLEtBQUtDLFNBQUwsQ0FBZTRELFVBQWYsQ0FBM0IsQ0FBTjtBQUFpRTs7QUFFbkYsYUFBTyw2QkFBS2dDLFFBQVFDLE1BQVIsRUFBTCxHQUNDM0gsR0FERCxDQUNVLFVBQUM0SCxNQUFEO0FBQUEsZUFBOEMsT0FBSzlELE1BQUwsQ0FBWThELE1BQVosQ0FBOUM7QUFBQSxPQURWLEVBRUNWLE1BRkQsQ0FFVSxVQUFDVyxDQUFEO0FBQUEsZUFBOENBLEVBQUV0SSxJQUFGLEtBQVdtRyxVQUF6RDtBQUFBLE9BRlYsRUFHQzFGLEdBSEQsQ0FHVSxVQUFDOEgsUUFBRDtBQUFBLGVBQWdELEVBQUVwSCxRQUFjb0gsU0FBU3BILE1BQXpCO0FBQ0VFLHVCQUFja0gsU0FBU2xILFdBRHpCLEVBQWhEO0FBQUEsT0FIVixDQUFQO0FBTUQ7OzttQ0FJYzhFLFUsRUFBNEI7QUFDekM7QUFDQSxhQUFPLEtBQUtnQixjQUFMLENBQW9CaEIsVUFBcEIsRUFBZ0N4QyxNQUFoQyxLQUEyQyxDQUFsRDtBQUNEOzs7dUNBRTRCO0FBQUE7O0FBQzNCLGFBQU8sS0FBS2tELE1BQUwsR0FBYzJCLElBQWQsQ0FBb0IsVUFBQ0MsQ0FBRDtBQUFBLGVBQWlCLE9BQUtDLGNBQUwsQ0FBb0JELENBQXBCLENBQWpCO0FBQUEsT0FBcEIsQ0FBUDtBQUNEOzs7a0NBSXVCO0FBQ3RCLGFBQU8sS0FBS3JDLGlCQUFMLENBQXVCLEtBQUtHLEtBQUwsRUFBdkIsQ0FBUDtBQUNEOzs7c0NBRWlCSixVLEVBQTRCO0FBQzVDO0FBQ0EsYUFBTyxLQUFLa0IsVUFBTCxDQUFnQmxCLFVBQWhCLEVBQTRCeEMsTUFBNUIsS0FBdUMsQ0FBOUM7QUFDRDs7O29DQUV5QjtBQUFBOztBQUN4QixhQUFPLEtBQUtrRCxNQUFMLEdBQWMyQixJQUFkLENBQW9CLFVBQUNDLENBQUQ7QUFBQSxlQUFpQixPQUFLckMsaUJBQUwsQ0FBdUJxQyxDQUF2QixDQUFqQjtBQUFBLE9BQXBCLENBQVA7QUFDRDs7O2tDQUl1QjtBQUN0QixhQUFPLEtBQUtwQyxpQkFBTCxDQUF1QixLQUFLRSxLQUFMLEVBQXZCLENBQVA7QUFDRDs7O3NDQUVpQkosVSxFQUE0QjtBQUM1QyxVQUFNbUIsU0FBa0MsS0FBS2pELE9BQUwsQ0FBYW1CLEdBQWIsQ0FBaUJXLFVBQWpCLENBQXhDO0FBQ0EsVUFBSW1CLE1BQUosRUFBWTtBQUFFLGVBQU9BLE9BQU9uRCxRQUFkO0FBQXlCLE9BQXZDLE1BQ1k7QUFBRSxjQUFNLElBQUl4RSxLQUFKLG9CQUEyQjJDLEtBQUtDLFNBQUwsQ0FBZTRELFVBQWYsQ0FBM0IsQ0FBTjtBQUFpRTtBQUNoRjs7O29DQUV5QjtBQUFBOztBQUN4QixhQUFPLEtBQUtVLE1BQUwsR0FBYzJCLElBQWQsQ0FBb0IsVUFBQ0MsQ0FBRDtBQUFBLGVBQWlCLE9BQUtwQyxpQkFBTCxDQUF1Qm9DLENBQXZCLENBQWpCO0FBQUEsT0FBcEIsQ0FBUDtBQUNEOzs7MkJBSU1oRCxJLEVBQVlrRCxPLEVBQTBCO0FBQzNDO0FBQ0E7QUFDQTtBQUNBLFVBQUksS0FBS0MsWUFBTCxDQUFrQm5ELElBQWxCLEVBQXdCa0QsT0FBeEIsQ0FBSixFQUFzQztBQUNwQyxZQUFNRSxPQUFrQyxLQUFLQyx1QkFBTCxDQUE2QnJELElBQTdCLENBQXhDO0FBQ0EsYUFBS3JCLE1BQUwsR0FBY3lFLEtBQUs1SSxFQUFuQjtBQUNBLGVBQU8sSUFBUDtBQUNELE9BSkQsTUFJTztBQUNMLGVBQU8sS0FBUDtBQUNEO0FBQ0Y7OzsrQkFFVThJLFEsRUFBZ0JKLE8sRUFBMEI7QUFDbkQ7QUFDQTtBQUNBO0FBQ0EsVUFBSSxLQUFLSyxnQkFBTCxDQUFzQkQsUUFBdEIsRUFBZ0NKLE9BQWhDLENBQUosRUFBOEM7QUFDNUMsYUFBS3ZFLE1BQUwsR0FBYzJFLFFBQWQ7QUFDQSxlQUFPLElBQVA7QUFDRCxPQUhELE1BR087QUFDTCxlQUFPLEtBQVA7QUFDRDtBQUNGOztBQUVEOzs7O3FDQUNpQkEsUSxFQUFnQkosTyxFQUEwQjtBQUN6RDtBQUNBO0FBQ0E7QUFDQSxVQUFJLEtBQUtNLHNCQUFMLENBQTRCRixRQUE1QixFQUFzQ0osT0FBdEMsQ0FBSixFQUFvRDtBQUNsRCxhQUFLdkUsTUFBTCxHQUFjMkUsUUFBZDtBQUNBLGVBQU8sSUFBUDtBQUNELE9BSEQsTUFHTztBQUNMLGVBQU8sS0FBUDtBQUNEO0FBQ0Y7Ozt1Q0FJa0I1SCxNLEVBQThCO0FBQy9DLFVBQU0rSCxjQUFrQyxLQUFLeEUsUUFBTCxDQUFjYyxHQUFkLENBQWtCckUsTUFBbEIsQ0FBeEM7QUFDQSxhQUFPK0gsY0FBYUEsWUFBWTFELEdBQVosQ0FBZ0IsS0FBS2UsS0FBTCxFQUFoQixDQUFiLEdBQTZDakIsU0FBcEQ7QUFDRDs7OzRDQUV1Qm5FLE0sRUFBeUM7QUFDL0QsVUFBTWdJLE1BQWdCLEtBQUtDLGtCQUFMLENBQXdCakksTUFBeEIsQ0FBdEI7QUFDQSxVQUFLZ0ksUUFBUTdELFNBQVQsSUFBd0I2RCxRQUFRLElBQXBDLEVBQTJDO0FBQUUsY0FBTSxJQUFJeEosS0FBSixxQkFBNEIyQyxLQUFLQyxTQUFMLENBQWVwQixNQUFmLENBQTVCLENBQU47QUFBOEQ7QUFDM0csYUFBTyxLQUFLb0QsTUFBTCxDQUFZNEUsR0FBWixDQUFQO0FBQ0Q7OztpQ0FFWWhJLE0sRUFBY2tJLFEsRUFBMkI7QUFBRztBQUN2RDtBQUNBO0FBQ0E7QUFDQSxhQUFPLEtBQUtELGtCQUFMLENBQXdCakksTUFBeEIsTUFBb0NtRSxTQUEzQztBQUNEOzs7cUNBRWdCeUQsUSxFQUFnQk0sUSxFQUEyQjtBQUFHO0FBQzdEO0FBQ0E7QUFFQSxVQUFNQyxpQkFBNkMsS0FBSzVCLHFCQUFMLENBQTJCLEtBQUtuQixLQUFMLEVBQTNCLEVBQXlDd0MsUUFBekMsQ0FBbkQ7O0FBRUEsVUFBSSxDQUFFTyxjQUFOLEVBQWdDO0FBQUUsZUFBTyxLQUFQO0FBQWU7QUFDakQsVUFBSUEsZUFBZXRJLFdBQW5CLEVBQWdDO0FBQUUsZUFBTyxLQUFQO0FBQWU7O0FBRWpELGFBQU8sSUFBUDtBQUVEOzs7MkNBRXNCK0gsUSxFQUFnQk0sUSxFQUEyQjtBQUFHO0FBQ25FO0FBQ0E7QUFDQTtBQUNBLGFBQVEsS0FBSzNCLHFCQUFMLENBQTJCLEtBQUtuQixLQUFMLEVBQTNCLEVBQXlDd0MsUUFBekMsTUFBdUR6RCxTQUEvRDtBQUNEOzs7Ozs7QUFTSCxTQUFTaUUsRUFBVCxDQUFzQkMsZ0JBQXRCLENBQXVELGlCQUF2RCxFQUE4RjtBQUFBOzs7QUFFMUY7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsU0FBTyxJQUFJdEYsT0FBSixDQUFZRixLQUFLd0YsaUJBQWlCQyxNQUFqQjs7QUFFdEI7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsWUFBQzFKLEdBQUQsRUFBTW1DLEdBQU4sRUFBV2lILEdBQVg7QUFBQSxnQkFBK0JwSixHQUEvQixHQUFxQyxXQUFVb0osR0FBVixDQUFyQyxHQUFzRGpILEdBQXREO0FBQUEsR0FQc0IsQ0FPdUM7QUFDN0Q7QUFDQTs7QUFUc0IsR0FBTCxDQUFaLENBQVA7QUFhSDs7UUFRQzNDLE8sR0FBQUEsTztRQUVBMkUsTyxHQUFBQSxPO1FBRUFGLEksR0FBQUEsSTtRQUNFM0UsSyxHQUFBQSxLO1FBQ0FtRCxPLEdBQUFBLE87UUFFRitHLEUsR0FBQUEsRTtRQUVBL0osZSxHQUFBQSxlO1FBQ0FJLGUsR0FBQUEsZTtRQUNBQyxnQixHQUFBQSxnQjtRQUdBNkosRztRQUFLQyxvQjtRQUFzQkMsVTtRQUFZQyxzQjtRQUF3QkMsa0IiLCJmaWxlIjoianNzbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLy8gd2hhcmdhcmJsIGxvdHMgb2YgdGhlc2UgcmV0dXJuIGFycmF5cyBjb3VsZC9zaG91bGQgYmUgc2V0c1xuXG4vLyBAZmxvd1xuXG5pbXBvcnQgdHlwZSB7XG5cbiAgSnNzbUdlbmVyaWNTdGF0ZSwgSnNzbUdlbmVyaWNDb25maWcsXG4gIEpzc21UcmFuc2l0aW9uLCBKc3NtVHJhbnNpdGlvbkxpc3QsXG4gIEpzc21NYWNoaW5lSW50ZXJuYWxTdGF0ZSxcbiAgSnNzbVBhcnNlVHJlZSxcbiAgSnNzbUNvbXBpbGVTZSwgSnNzbUNvbXBpbGVTZVN0YXJ0LCBKc3NtQ29tcGlsZVJ1bGUsXG4gIEpzc21BcnJvdywgSnNzbUFycm93RGlyZWN0aW9uLCBKc3NtQXJyb3dLaW5kLFxuICBKc3NtTGF5b3V0XG5cbn0gZnJvbSAnLi9qc3NtLXR5cGVzJztcblxuXG5cblxuXG5pbXBvcnQgeyBzZXEsIHdlaWdodGVkX3JhbmRfc2VsZWN0LCB3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0LCBoaXN0b2dyYXBoLCB3ZWlnaHRlZF9oaXN0b19rZXkgfSBmcm9tICcuL2pzc20tdXRpbC5qcyc7XG5cbmNvbnN0IHBhcnNlIDogPE5ULCBEVD4oc3RyaW5nKSA9PiBKc3NtUGFyc2VUcmVlPE5UPiA9IHJlcXVpcmUoJy4vanNzbS1kb3QuanMnKS5wYXJzZTsgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZmxvd3R5cGUvbm8td2Vhay10eXBlcyAvLyB0b2RvIHdoYXJnYXJibCByZW1vdmUgYW55XG5cbmNvbnN0IHZlcnNpb24gOiBudWxsID0gbnVsbDsgLy8gcmVwbGFjZWQgZnJvbSBwYWNrYWdlLmpzIGluIGJ1aWxkXG5cblxuXG5cblxuZnVuY3Rpb24gYXJyb3dfZGlyZWN0aW9uKGFycm93IDogSnNzbUFycm93KSA6IEpzc21BcnJvd0RpcmVjdGlvbiB7XG5cbiAgc3dpdGNoICggU3RyaW5nKGFycm93KSApIHtcblxuICAgIGNhc2UgJy0+JyA6ICAgIGNhc2UgJ+KGkicgOlxuICAgIGNhc2UgJz0+JyA6ICAgIGNhc2UgJ+KHkicgOlxuICAgIGNhc2UgJ34+JyA6ICAgIGNhc2UgJ+KGmycgOlxuICAgICAgcmV0dXJuICdyaWdodCc7XG5cbiAgICBjYXNlICc8LScgOiAgICBjYXNlICfihpAnIDpcbiAgICBjYXNlICc8PScgOiAgICBjYXNlICfih5AnIDpcbiAgICBjYXNlICc8ficgOiAgICBjYXNlICfihponIDpcbiAgICAgIHJldHVybiAnbGVmdCc7XG5cbiAgICBjYXNlICc8LT4nOiAgICBjYXNlICfihpQnIDpcbiAgICBjYXNlICc8LT0+JzogICBjYXNlICfihpDih5InIDpcbiAgICBjYXNlICc8LX4+JzogICBjYXNlICfihpDihpsnIDpcblxuICAgIGNhc2UgJzw9Pic6ICAgIGNhc2UgJ+KHlCcgOlxuICAgIGNhc2UgJzw9LT4nOiAgIGNhc2UgJ+KHkOKGkicgOlxuICAgIGNhc2UgJzw9fj4nOiAgIGNhc2UgJ+KHkOKGmycgOlxuXG4gICAgY2FzZSAnPH4+JzogICAgY2FzZSAn4oauJyA6XG4gICAgY2FzZSAnPH4tPic6ICAgY2FzZSAn4oaa4oaSJyA6XG4gICAgY2FzZSAnPH49Pic6ICAgY2FzZSAn4oaa4oeSJyA6XG4gICAgICByZXR1cm4gJ2JvdGgnO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXJyb3dfZGlyZWN0aW9uOiB1bmtub3duIGFycm93IHR5cGUgJHthcnJvd31gKTtcblxuICB9XG5cbn1cblxuXG5cblxuXG4vKiBlc2xpbnQtZGlzYWJsZSBjb21wbGV4aXR5ICovXG5cbmZ1bmN0aW9uIGFycm93X2xlZnRfa2luZChhcnJvdyA6IEpzc21BcnJvdykgOiBKc3NtQXJyb3dLaW5kIHtcblxuICBzd2l0Y2ggKCBTdHJpbmcoYXJyb3cpICkge1xuXG4gICAgY2FzZSAnLT4nIDogICAgY2FzZSAn4oaSJyA6XG4gICAgY2FzZSAnPT4nIDogICAgY2FzZSAn4oeSJyA6XG4gICAgY2FzZSAnfj4nIDogICAgY2FzZSAn4oabJyA6XG4gICAgICByZXR1cm4gJ25vbmUnO1xuXG4gICAgY2FzZSAnPC0nOiAgICAgY2FzZSAn4oaQJyA6XG4gICAgY2FzZSAnPC0+JzogICAgY2FzZSAn4oaUJyA6XG4gICAgY2FzZSAnPC09Pic6ICAgY2FzZSAn4oaQ4oeSJyA6XG4gICAgY2FzZSAnPC1+Pic6ICAgY2FzZSAn4oaQ4oabJyA6XG4gICAgICByZXR1cm4gJ2xlZ2FsJztcblxuICAgIGNhc2UgJzw9JzogICAgIGNhc2UgJ+KHkCcgOlxuICAgIGNhc2UgJzw9Pic6ICAgIGNhc2UgJ+KHlCcgOlxuICAgIGNhc2UgJzw9LT4nOiAgIGNhc2UgJ+KHkOKGkicgOlxuICAgIGNhc2UgJzw9fj4nOiAgIGNhc2UgJ+KHkOKGmycgOlxuICAgICAgcmV0dXJuICdtYWluJztcblxuICAgIGNhc2UgJzx+JzogICAgIGNhc2UgJ+KGmicgOlxuICAgIGNhc2UgJzx+Pic6ICAgIGNhc2UgJ+KGricgOlxuICAgIGNhc2UgJzx+LT4nOiAgIGNhc2UgJ+KGmuKGkicgOlxuICAgIGNhc2UgJzx+PT4nOiAgIGNhc2UgJ+KGmuKHkicgOlxuICAgICAgcmV0dXJuICdmb3JjZWQnO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXJyb3dfZGlyZWN0aW9uOiB1bmtub3duIGFycm93IHR5cGUgJHthcnJvd31gKTtcblxuICB9XG5cbn1cblxuLyogZXNsaW50LWVuYWJsZSBjb21wbGV4aXR5ICovXG5cblxuXG5cblxuLyogZXNsaW50LWRpc2FibGUgY29tcGxleGl0eSAqL1xuXG5mdW5jdGlvbiBhcnJvd19yaWdodF9raW5kKGFycm93IDogSnNzbUFycm93KSA6IEpzc21BcnJvd0tpbmQge1xuXG4gIHN3aXRjaCAoIFN0cmluZyhhcnJvdykgKSB7XG5cbiAgICBjYXNlICc8LScgOiAgICBjYXNlICfihpAnIDpcbiAgICBjYXNlICc8PScgOiAgICBjYXNlICfih5AnIDpcbiAgICBjYXNlICc8ficgOiAgICBjYXNlICfihponIDpcbiAgICAgIHJldHVybiAnbm9uZSc7XG5cbiAgICBjYXNlICctPicgOiAgICBjYXNlICfihpInIDpcbiAgICBjYXNlICc8LT4nOiAgICBjYXNlICfihpQnIDpcbiAgICBjYXNlICc8PS0+JzogICBjYXNlICfih5DihpInIDpcbiAgICBjYXNlICc8fi0+JzogICBjYXNlICfihprihpInIDpcbiAgICAgIHJldHVybiAnbGVnYWwnO1xuXG4gICAgY2FzZSAnPT4nIDogICAgY2FzZSAn4oeSJyA6XG4gICAgY2FzZSAnPD0+JzogICAgY2FzZSAn4oeUJyA6XG4gICAgY2FzZSAnPC09Pic6ICAgY2FzZSAn4oaQ4oeSJyA6XG4gICAgY2FzZSAnPH49Pic6ICAgY2FzZSAn4oaa4oeSJyA6XG4gICAgICByZXR1cm4gJ21haW4nO1xuXG4gICAgY2FzZSAnfj4nIDogICAgY2FzZSAn4oabJyA6XG4gICAgY2FzZSAnPH4+JzogICAgY2FzZSAn4oauJyA6XG4gICAgY2FzZSAnPC1+Pic6ICAgY2FzZSAn4oaQ4oabJyA6XG4gICAgY2FzZSAnPD1+Pic6ICAgY2FzZSAn4oeQ4oabJyA6XG4gICAgICByZXR1cm4gJ2ZvcmNlZCc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcnJvd19kaXJlY3Rpb246IHVua25vd24gYXJyb3cgdHlwZSAke2Fycm93fWApO1xuXG4gIH1cblxufVxuXG4vKiBlc2xpbnQtZW5hYmxlIGNvbXBsZXhpdHkgKi9cblxuXG5cblxuXG5mdW5jdGlvbiBjb21waWxlX3J1bGVfdHJhbnNpdGlvbl9zdGVwPG1OVCwgbURUPihcbiAgICAgICAgICAgICBhY2MgICAgIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+LFxuICAgICAgICAgICAgIGZyb20gICAgOiBtTlQsXG4gICAgICAgICAgICAgdG8gICAgICA6IG1OVCxcbiAgICAgICAgICAgICB0aGlzX3NlIDogSnNzbUNvbXBpbGVTZTxtTlQ+LFxuICAgICAgICAgICAgIG5leHRfc2UgOiBKc3NtQ29tcGlsZVNlPG1OVD5cbiAgICAgICAgICkgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4geyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIHBhcnNlciByZXByZXNlbnRhdGlvbiBvZiBhIHRyYW5zaXRpb24gc3RlcCBleHRlbnNpb25cblxuICBjb25zdCBlZGdlcyA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiA9IFtdO1xuXG4gIGNvbnN0IHVGcm9tIDogQXJyYXk8IG1OVCA+ID0gKEFycmF5LmlzQXJyYXkoZnJvbSk/IGZyb20gOiBbZnJvbV0pLFxuICAgICAgICB1VG8gICA6IEFycmF5PCBtTlQgPiA9IChBcnJheS5pc0FycmF5KHRvKT8gICB0byAgIDogW3RvXSAgKTtcblxuICB1RnJvbS5tYXAoIChmOm1OVCkgPT4ge1xuICAgIHVUby5tYXAoICh0Om1OVCkgPT4ge1xuXG4gICAgICBjb25zdCByayA6IEpzc21BcnJvd0tpbmQgPSBhcnJvd19yaWdodF9raW5kKHRoaXNfc2Uua2luZCksXG4gICAgICAgICAgICBsayA6IEpzc21BcnJvd0tpbmQgPSBhcnJvd19sZWZ0X2tpbmQodGhpc19zZS5raW5kKTtcblxuXG4gICAgICBjb25zdCByaWdodCA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHtcbiAgICAgICAgZnJvbSAgICAgICAgOiBmLFxuICAgICAgICB0byAgICAgICAgICA6IHQsXG4gICAgICAgIGtpbmQgICAgICAgIDogcmssXG4gICAgICAgIGZvcmNlZF9vbmx5IDogcmsgPT09ICdmb3JjZWQnLFxuICAgICAgICBtYWluX3BhdGggICA6IHJrID09PSAnbWFpbidcbiAgICAgIH07XG5cbiAgICAgIGlmICh0aGlzX3NlLnJfYWN0aW9uKSAgICAgIHsgcmlnaHQuYWN0aW9uICAgICAgPSB0aGlzX3NlLnJfYWN0aW9uOyAgICAgIH1cbiAgICAgIGlmICh0aGlzX3NlLnJfcHJvYmFiaWxpdHkpIHsgcmlnaHQucHJvYmFiaWxpdHkgPSB0aGlzX3NlLnJfcHJvYmFiaWxpdHk7IH1cbiAgICAgIGlmIChyaWdodC5raW5kICE9PSAnbm9uZScpIHsgZWRnZXMucHVzaChyaWdodCk7IH1cblxuXG4gICAgICBjb25zdCBsZWZ0IDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0ge1xuICAgICAgICBmcm9tICAgICAgICA6IHQsXG4gICAgICAgIHRvICAgICAgICAgIDogZixcbiAgICAgICAga2luZCAgICAgICAgOiBsayxcbiAgICAgICAgZm9yY2VkX29ubHkgOiBsayA9PT0gJ2ZvcmNlZCcsXG4gICAgICAgIG1haW5fcGF0aCAgIDogbGsgPT09ICdtYWluJ1xuICAgICAgfTtcblxuICAgICAgaWYgKHRoaXNfc2UubF9hY3Rpb24pICAgICAgeyBsZWZ0LmFjdGlvbiAgICAgID0gdGhpc19zZS5sX2FjdGlvbjsgICAgICB9XG4gICAgICBpZiAodGhpc19zZS5sX3Byb2JhYmlsaXR5KSB7IGxlZnQucHJvYmFiaWxpdHkgPSB0aGlzX3NlLmxfcHJvYmFiaWxpdHk7IH1cbiAgICAgIGlmIChsZWZ0LmtpbmQgIT09ICdub25lJykgIHsgZWRnZXMucHVzaChsZWZ0KTsgfVxuXG4gICAgfSk7XG4gIH0pO1xuXG4gIGNvbnN0IG5ld19hY2MgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBhY2MuY29uY2F0KGVkZ2VzKTtcblxuICBpZiAobmV4dF9zZSkge1xuICAgIHJldHVybiBjb21waWxlX3J1bGVfdHJhbnNpdGlvbl9zdGVwKG5ld19hY2MsIHRvLCBuZXh0X3NlLnRvLCBuZXh0X3NlLCBuZXh0X3NlLnNlKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3X2FjYztcbiAgfVxuXG59XG5cblxuXG5mdW5jdGlvbiBjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb248bU5UPihydWxlIDogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pIDogbWl4ZWQgeyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIHBhcnNlciByZXByZXNlbnRhdGlvbiBvZiBhIHRyYW5zaXRpb25cbiAgcmV0dXJuIGNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXAoW10sIHJ1bGUuZnJvbSwgcnVsZS5zZS50bywgcnVsZS5zZSwgcnVsZS5zZS5zZSk7XG59XG5cblxuXG5mdW5jdGlvbiBjb21waWxlX3J1bGVfaGFuZGxlcjxtTlQ+KHJ1bGUgOiBKc3NtQ29tcGlsZVNlU3RhcnQ8bU5UPikgOiBKc3NtQ29tcGlsZVJ1bGUgeyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIG91dHB1dCBvZiB0aGUgcGFyc2VyXG5cbiAgaWYgKHJ1bGUua2V5ID09PSAndHJhbnNpdGlvbicpIHsgcmV0dXJuIHsgYWdnX2FzOiAndHJhbnNpdGlvbicsIHZhbDogY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uKHJ1bGUpIH07IH1cblxuICBjb25zdCB0YXV0b2xvZ2llcyA6IEFycmF5PHN0cmluZz4gPSBbXG4gICAgJ2dyYXBoX2xheW91dCcsICdzdGFydF9zdGF0ZXMnLCAnZW5kX3N0YXRlcycsICdtYWNoaW5lX25hbWUnLCAnbWFjaGluZV92ZXJzaW9uJyxcbiAgICAnbWFjaGluZV9jb21tZW50JywgJ21hY2hpbmVfYXV0aG9yJywgJ21hY2hpbmVfY29udHJpYnV0b3InLCAnbWFjaGluZV9kZWZpbml0aW9uJyxcbiAgICAnbWFjaGluZV9yZWZlcmVuY2UnLCAnbWFjaGluZV9saWNlbnNlJywgJ2ZzbF92ZXJzaW9uJ1xuICBdO1xuXG4gIGlmICh0YXV0b2xvZ2llcy5pbmNsdWRlcyhydWxlLmtleSkpIHtcbiAgICByZXR1cm4geyBhZ2dfYXM6IHJ1bGUua2V5LCB2YWw6IHJ1bGUudmFsdWUgfTtcbiAgfVxuXG4gIHRocm93IG5ldyBFcnJvcihgY29tcGlsZV9ydWxlX2hhbmRsZXI6IFVua25vd24gcnVsZTogJHtKU09OLnN0cmluZ2lmeShydWxlKX1gKTtcblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGU8bU5ULCBtRFQ+KHRyZWUgOiBKc3NtUGFyc2VUcmVlPG1OVD4pIDogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+IHsgIC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgb3V0cHV0IG9mIHRoZSBwYXJzZXJcblxuICBjb25zdCByZXN1bHRzIDoge1xuICAgIGdyYXBoX2xheW91dCAgICAgICAgOiBBcnJheTwgSnNzbUxheW91dCA+LFxuICAgIHRyYW5zaXRpb24gICAgICAgICAgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4sXG4gICAgc3RhcnRfc3RhdGVzICAgICAgICA6IEFycmF5PCBtTlQgPixcbiAgICBlbmRfc3RhdGVzICAgICAgICAgIDogQXJyYXk8IG1OVCA+LFxuICAgIGZzbF92ZXJzaW9uICAgICAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9hdXRob3IgICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2NvbW1lbnQgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfY29udHJpYnV0b3IgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9kZWZpbml0aW9uICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2xpY2Vuc2UgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfbmFtZSAgICAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9yZWZlcmVuY2UgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX3ZlcnNpb24gICAgIDogQXJyYXk8IHN0cmluZyA+IC8vIHNlbXZlclxuICB9ID0ge1xuICAgIGdyYXBoX2xheW91dCAgICAgICAgOiBbXSxcbiAgICB0cmFuc2l0aW9uICAgICAgICAgIDogW10sXG4gICAgc3RhcnRfc3RhdGVzICAgICAgICA6IFtdLFxuICAgIGVuZF9zdGF0ZXMgICAgICAgICAgOiBbXSxcbiAgICBmc2xfdmVyc2lvbiAgICAgICAgIDogW10sXG4gICAgbWFjaGluZV9hdXRob3IgICAgICA6IFtdLFxuICAgIG1hY2hpbmVfY29tbWVudCAgICAgOiBbXSxcbiAgICBtYWNoaW5lX2NvbnRyaWJ1dG9yIDogW10sXG4gICAgbWFjaGluZV9kZWZpbml0aW9uICA6IFtdLFxuICAgIG1hY2hpbmVfbGljZW5zZSAgICAgOiBbXSxcbiAgICBtYWNoaW5lX25hbWUgICAgICAgIDogW10sXG4gICAgbWFjaGluZV9yZWZlcmVuY2UgICA6IFtdLFxuICAgIG1hY2hpbmVfdmVyc2lvbiAgICAgOiBbXVxuICB9O1xuXG4gIHRyZWUubWFwKCAodHIgOiBKc3NtQ29tcGlsZVNlU3RhcnQ8bU5UPikgPT4ge1xuXG4gICAgY29uc3QgcnVsZSAgIDogSnNzbUNvbXBpbGVSdWxlID0gY29tcGlsZV9ydWxlX2hhbmRsZXIodHIpLFxuICAgICAgICAgIGFnZ19hcyA6IHN0cmluZyAgICAgICAgICA9IHJ1bGUuYWdnX2FzLFxuICAgICAgICAgIHZhbCAgICA6IG1peGVkICAgICAgICAgICA9IHJ1bGUudmFsOyAgICAgICAgICAgICAgICAgIC8vIHRvZG8gYmV0dGVyIHR5cGVzXG5cbiAgICByZXN1bHRzW2FnZ19hc10gPSByZXN1bHRzW2FnZ19hc10uY29uY2F0KHZhbCk7XG5cbiAgfSk7XG5cbiAgY29uc3QgYXNzZW1ibGVkX3RyYW5zaXRpb25zIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+ID0gW10uY29uY2F0KC4uLiByZXN1bHRzWyd0cmFuc2l0aW9uJ10pO1xuXG4gIGNvbnN0IHJlc3VsdF9jZmcgOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4gPSB7XG4gICAgc3RhcnRfc3RhdGVzIDogcmVzdWx0cy5zdGFydF9zdGF0ZXMubGVuZ3RoPyByZXN1bHRzLnN0YXJ0X3N0YXRlcyA6IFthc3NlbWJsZWRfdHJhbnNpdGlvbnNbMF0uZnJvbV0sXG4gICAgdHJhbnNpdGlvbnMgIDogYXNzZW1ibGVkX3RyYW5zaXRpb25zXG4gIH07XG5cbiAgY29uc3Qgb25lT25seUtleXMgOiBBcnJheTxzdHJpbmc+ID0gW1xuICAgICdncmFwaF9sYXlvdXQnLCAnbWFjaGluZV9uYW1lJywgJ21hY2hpbmVfdmVyc2lvbicsICdtYWNoaW5lX2NvbW1lbnQnLCAnZnNsX3ZlcnNpb24nLCAnbWFjaGluZV9saWNlbnNlJyxcbiAgICAnbWFjaGluZV9kZWZpbml0aW9uJ1xuICBdO1xuXG4gIG9uZU9ubHlLZXlzLm1hcCggKG9uZU9ubHlLZXkgOiBzdHJpbmcpID0+IHtcbiAgICBpZiAocmVzdWx0c1tvbmVPbmx5S2V5XS5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1heSBvbmx5IGhhdmUgb25lICR7b25lT25seUtleX0gc3RhdGVtZW50IG1heGltdW06ICR7SlNPTi5zdHJpbmdpZnkocmVzdWx0c1tvbmVPbmx5S2V5XSl9YCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChyZXN1bHRzW29uZU9ubHlLZXldLmxlbmd0aCkge1xuICAgICAgICByZXN1bHRfY2ZnW29uZU9ubHlLZXldID0gcmVzdWx0c1tvbmVPbmx5S2V5XVswXTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIFsnbWFjaGluZV9hdXRob3InLCAnbWFjaGluZV9jb250cmlidXRvcicsICdtYWNoaW5lX3JlZmVyZW5jZSddLm1hcCggKG11bHRpS2V5IDogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHJlc3VsdHNbbXVsdGlLZXldLmxlbmd0aCkge1xuICAgICAgcmVzdWx0X2NmZ1ttdWx0aUtleV0gPSByZXN1bHRzW211bHRpS2V5XTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiByZXN1bHRfY2ZnO1xuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gbWFrZTxtTlQsIG1EVD4ocGxhbiA6IHN0cmluZykgOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4ge1xuICByZXR1cm4gY29tcGlsZShwYXJzZShwbGFuKSk7XG59XG5cblxuXG5cblxuY2xhc3MgTWFjaGluZTxtTlQsIG1EVD4ge1xuXG5cbiAgX3N0YXRlICAgICAgICAgICAgICAgICAgOiBtTlQ7XG4gIF9zdGF0ZXMgICAgICAgICAgICAgICAgIDogTWFwPG1OVCwgSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+PjtcbiAgX2VkZ2VzICAgICAgICAgICAgICAgICAgOiBBcnJheTxKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4+O1xuICBfZWRnZV9tYXAgICAgICAgICAgICAgICA6IE1hcDxtTlQsIE1hcDxtTlQsIG51bWJlcj4+O1xuICBfbmFtZWRfdHJhbnNpdGlvbnMgICAgICA6IE1hcDxtTlQsIG51bWJlcj47XG4gIF9hY3Rpb25zICAgICAgICAgICAgICAgIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG4gIF9yZXZlcnNlX2FjdGlvbnMgICAgICAgIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG4gIF9yZXZlcnNlX2FjdGlvbl90YXJnZXRzIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG5cbiAgX21hY2hpbmVfYXV0aG9yICAgICAgICAgOiA/QXJyYXk8c3RyaW5nPjtcbiAgX21hY2hpbmVfY29tbWVudCAgICAgICAgOiA/c3RyaW5nO1xuICBfbWFjaGluZV9jb250cmlidXRvciAgICA6ID9BcnJheTxzdHJpbmc+O1xuICBfbWFjaGluZV9kZWZpbml0aW9uICAgICA6ID9zdHJpbmc7XG4gIF9tYWNoaW5lX2xpY2Vuc2UgICAgICAgIDogP3N0cmluZztcbiAgX21hY2hpbmVfbmFtZSAgICAgICAgICAgOiA/c3RyaW5nO1xuICBfbWFjaGluZV92ZXJzaW9uICAgICAgICA6ID9zdHJpbmc7XG4gIF9mc2xfdmVyc2lvbiAgICAgICAgICAgIDogP3N0cmluZztcblxuICBfZ3JhcGhfbGF5b3V0ICAgICAgICAgICA6IEpzc21MYXlvdXQ7XG5cblxuICAvLyB3aGFyZ2FyYmwgdGhpcyBiYWRseSBuZWVkcyB0byBiZSBicm9rZW4gdXAsIG1vbm9saXRoIG1hc3RlclxuICBjb25zdHJ1Y3Rvcih7XG4gICAgc3RhcnRfc3RhdGVzLFxuICAgIGNvbXBsZXRlICAgICAgICA9IFtdLFxuICAgIHRyYW5zaXRpb25zLFxuICAgIG1hY2hpbmVfYXV0aG9yLFxuICAgIG1hY2hpbmVfY29tbWVudCxcbiAgICBtYWNoaW5lX2NvbnRyaWJ1dG9yLFxuICAgIG1hY2hpbmVfZGVmaW5pdGlvbixcbiAgICBtYWNoaW5lX2xpY2Vuc2UsXG4gICAgbWFjaGluZV9uYW1lLFxuICAgIG1hY2hpbmVfdmVyc2lvbixcbiAgICBmc2xfdmVyc2lvbixcbiAgICBncmFwaF9sYXlvdXQgPSAnZG90J1xuICB9IDogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+KSB7XG5cbiAgICB0aGlzLl9zdGF0ZSAgICAgICAgICAgICAgICAgID0gc3RhcnRfc3RhdGVzWzBdO1xuICAgIHRoaXMuX3N0YXRlcyAgICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fZWRnZXMgICAgICAgICAgICAgICAgICA9IFtdO1xuICAgIHRoaXMuX2VkZ2VfbWFwICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9hY3Rpb25zICAgICAgICAgICAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX3JldmVyc2VfYWN0aW9ucyAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyA9IG5ldyBNYXAoKTsgICAvLyB0b2RvXG5cbiAgICB0aGlzLl9tYWNoaW5lX2F1dGhvciAgICAgICAgID0gbWFjaGluZV9hdXRob3I7XG4gICAgdGhpcy5fbWFjaGluZV9jb21tZW50ICAgICAgICA9IG1hY2hpbmVfY29tbWVudDtcbiAgICB0aGlzLl9tYWNoaW5lX2NvbnRyaWJ1dG9yICAgID0gbWFjaGluZV9jb250cmlidXRvcjtcbiAgICB0aGlzLl9tYWNoaW5lX2RlZmluaXRpb24gICAgID0gbWFjaGluZV9kZWZpbml0aW9uO1xuICAgIHRoaXMuX21hY2hpbmVfbGljZW5zZSAgICAgICAgPSBtYWNoaW5lX2xpY2Vuc2U7XG4gICAgdGhpcy5fbWFjaGluZV9uYW1lICAgICAgICAgICA9IG1hY2hpbmVfbmFtZTtcbiAgICB0aGlzLl9tYWNoaW5lX3ZlcnNpb24gICAgICAgID0gbWFjaGluZV92ZXJzaW9uO1xuICAgIHRoaXMuX2ZzbF92ZXJzaW9uICAgICAgICAgICAgPSBmc2xfdmVyc2lvbjtcblxuICAgIHRoaXMuX2dyYXBoX2xheW91dCAgICAgICAgICAgPSBncmFwaF9sYXlvdXQ7XG5cbiAgICB0cmFuc2l0aW9ucy5tYXAoICh0cjpKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pID0+IHtcblxuICAgICAgaWYgKHRyLmZyb20gPT09IHVuZGVmaW5lZCkgeyB0aHJvdyBuZXcgRXJyb3IoYHRyYW5zaXRpb24gbXVzdCBkZWZpbmUgJ2Zyb20nOiAke0pTT04uc3RyaW5naWZ5KHRyKX1gKTsgfVxuICAgICAgaWYgKHRyLnRvICAgPT09IHVuZGVmaW5lZCkgeyB0aHJvdyBuZXcgRXJyb3IoYHRyYW5zaXRpb24gbXVzdCBkZWZpbmUgJ3RvJzogJHsgIEpTT04uc3RyaW5naWZ5KHRyKX1gKTsgfVxuXG4gICAgICAvLyBnZXQgdGhlIGN1cnNvcnMuICB3aGF0IGEgbWVzc1xuICAgICAgY29uc3QgY3Vyc29yX2Zyb20gOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD5cbiAgICAgICAgICA9IHRoaXMuX3N0YXRlcy5nZXQodHIuZnJvbSlcbiAgICAgICAgIHx8IHsgbmFtZTogdHIuZnJvbSwgZnJvbTogW10sIHRvOiBbXSwgY29tcGxldGU6IGNvbXBsZXRlLmluY2x1ZGVzKHRyLmZyb20pIH07XG5cbiAgICAgIGlmICghKHRoaXMuX3N0YXRlcy5oYXModHIuZnJvbSkpKSB7XG4gICAgICAgIHRoaXMuX25ld19zdGF0ZShjdXJzb3JfZnJvbSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGN1cnNvcl90byA6IEpzc21HZW5lcmljU3RhdGU8bU5UPlxuICAgICAgICAgID0gdGhpcy5fc3RhdGVzLmdldCh0ci50bylcbiAgICAgICAgIHx8IHtuYW1lOiB0ci50bywgZnJvbTogW10sIHRvOiBbXSwgY29tcGxldGU6IGNvbXBsZXRlLmluY2x1ZGVzKHRyLnRvKSB9O1xuXG4gICAgICBpZiAoISh0aGlzLl9zdGF0ZXMuaGFzKHRyLnRvKSkpIHtcbiAgICAgICAgdGhpcy5fbmV3X3N0YXRlKGN1cnNvcl90byk7XG4gICAgICB9XG5cbiAgICAgIC8vIGd1YXJkIGFnYWluc3QgZXhpc3RpbmcgY29ubmVjdGlvbnMgYmVpbmcgcmUtYWRkZWRcbiAgICAgIGlmIChjdXJzb3JfZnJvbS50by5pbmNsdWRlcyh0ci50bykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBhbHJlYWR5IGhhcyAke0pTT04uc3RyaW5naWZ5KHRyLmZyb20pfSB0byAke0pTT04uc3RyaW5naWZ5KHRyLnRvKX1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGN1cnNvcl9mcm9tLnRvLnB1c2godHIudG8pO1xuICAgICAgICBjdXJzb3JfdG8uZnJvbS5wdXNoKHRyLmZyb20pO1xuICAgICAgfVxuXG4gICAgICAvLyBhZGQgdGhlIGVkZ2U7IG5vdGUgaXRzIGlkXG4gICAgICB0aGlzLl9lZGdlcy5wdXNoKHRyKTtcbiAgICAgIGNvbnN0IHRoaXNFZGdlSWQgOiBudW1iZXIgPSB0aGlzLl9lZGdlcy5sZW5ndGggLSAxO1xuXG4gICAgICAvLyBndWFyZCBhZ2FpbnN0IHJlcGVhdGluZyBhIHRyYW5zaXRpb24gbmFtZVxuICAgICAgaWYgKHRyLm5hbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuX25hbWVkX3RyYW5zaXRpb25zLmhhcyh0ci5uYW1lKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgbmFtZWQgdHJhbnNpdGlvbiBcIiR7SlNPTi5zdHJpbmdpZnkodHIubmFtZSl9XCIgYWxyZWFkeSBjcmVhdGVkYCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMuc2V0KHRyLm5hbWUsIHRoaXNFZGdlSWQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHNldCB1cCB0aGUgbWFwcGluZywgc28gdGhhdCBlZGdlcyBjYW4gYmUgbG9va2VkIHVwIGJ5IGVuZHBvaW50IHBhaXJzXG4gICAgICBjb25zdCBmcm9tX21hcHBpbmcgOiBNYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fZWRnZV9tYXAuZ2V0KHRyLmZyb20pIHx8IG5ldyBNYXAoKTtcbiAgICAgIGlmICghKHRoaXMuX2VkZ2VfbWFwLmhhcyh0ci5mcm9tKSkpIHtcbiAgICAgICAgdGhpcy5fZWRnZV9tYXAuc2V0KHRyLmZyb20sIGZyb21fbWFwcGluZyk7XG4gICAgICB9XG5cbi8vICAgIGNvbnN0IHRvX21hcHBpbmcgPSBmcm9tX21hcHBpbmcuZ2V0KHRyLnRvKTtcbiAgICAgIGZyb21fbWFwcGluZy5zZXQodHIudG8sIHRoaXNFZGdlSWQpOyAvLyBhbHJlYWR5IGNoZWNrZWQgdGhhdCB0aGlzIG1hcHBpbmcgZG9lc24ndCBleGlzdCwgYWJvdmVcblxuICAgICAgLy8gc2V0IHVwIHRoZSBhY3Rpb24gbWFwcGluZywgc28gdGhhdCBhY3Rpb25zIGNhbiBiZSBsb29rZWQgdXAgYnkgb3JpZ2luXG4gICAgICBpZiAodHIuYWN0aW9uKSB7XG5cblxuICAgICAgICAvLyBmb3J3YXJkIG1hcHBpbmcgZmlyc3QgYnkgYWN0aW9uIG5hbWVcbiAgICAgICAgbGV0IGFjdGlvbk1hcCA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fYWN0aW9ucy5nZXQodHIuYWN0aW9uKTtcbiAgICAgICAgaWYgKCEoYWN0aW9uTWFwKSkge1xuICAgICAgICAgIGFjdGlvbk1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgICB0aGlzLl9hY3Rpb25zLnNldCh0ci5hY3Rpb24sIGFjdGlvbk1hcCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYWN0aW9uTWFwLmhhcyh0ci5mcm9tKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgYWN0aW9uICR7SlNPTi5zdHJpbmdpZnkodHIuYWN0aW9uKX0gYWxyZWFkeSBhdHRhY2hlZCB0byBvcmlnaW4gJHtKU09OLnN0cmluZ2lmeSh0ci5mcm9tKX1gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhY3Rpb25NYXAuc2V0KHRyLmZyb20sIHRoaXNFZGdlSWQpO1xuICAgICAgICB9XG5cblxuICAgICAgICAvLyByZXZlcnNlIG1hcHBpbmcgZmlyc3QgYnkgc3RhdGUgb3JpZ2luIG5hbWVcbiAgICAgICAgbGV0IHJBY3Rpb25NYXAgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQodHIuZnJvbSk7XG4gICAgICAgIGlmICghKHJBY3Rpb25NYXApKSB7XG4gICAgICAgICAgckFjdGlvbk1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuc2V0KHRyLmZyb20sIHJBY3Rpb25NYXApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbm8gbmVlZCB0byB0ZXN0IGZvciByZXZlcnNlIG1hcHBpbmcgcHJlLXByZXNlbmNlO1xuICAgICAgICAvLyBmb3J3YXJkIG1hcHBpbmcgYWxyZWFkeSBjb3ZlcnMgY29sbGlzaW9uc1xuICAgICAgICByQWN0aW9uTWFwLnNldCh0ci5hY3Rpb24sIHRoaXNFZGdlSWQpO1xuXG5cbiAgICAgICAgLy8gcmV2ZXJzZSBtYXBwaW5nIGZpcnN0IGJ5IHN0YXRlIHRhcmdldCBuYW1lXG4gICAgICAgIGlmICghKHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuaGFzKHRyLnRvKSkpIHtcbiAgICAgICAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLnNldCh0ci50bywgbmV3IE1hcCgpKTtcbiAgICAgICAgfVxuXG4vKiB0b2RvIGNvbWViYWNrXG4gICBmdW5kYW1lbnRhbCBwcm9ibGVtIGlzIHJvQWN0aW9uTWFwIG5lZWRzIHRvIGJlIGEgbXVsdGltYXBcbiAgICAgICAgY29uc3Qgcm9BY3Rpb25NYXAgPSB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLmdldCh0ci50byk7ICAvLyB3YXN0ZWZ1bCAtIGFscmVhZHkgZGlkIGhhcyAtIHJlZmFjdG9yXG4gICAgICAgIGlmIChyb0FjdGlvbk1hcCkge1xuICAgICAgICAgIGlmIChyb0FjdGlvbk1hcC5oYXModHIuYWN0aW9uKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGByby1hY3Rpb24gJHt0ci50b30gYWxyZWFkeSBhdHRhY2hlZCB0byBhY3Rpb24gJHt0ci5hY3Rpb259YCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJvQWN0aW9uTWFwLnNldCh0ci5hY3Rpb24sIHRoaXNFZGdlSWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Nob3VsZCBiZSBpbXBvc3NpYmxlIC0gZmxvdyBkb2VzblxcJ3Qga25vdyAuc2V0IHByZWNlZGVzIC5nZXQgeWV0IGFnYWluLiAgc2V2ZXJlIGVycm9yPycpO1xuICAgICAgICB9XG4qL1xuICAgICAgfVxuXG4gICAgfSk7XG5cbiAgfVxuXG4gIF9uZXdfc3RhdGUoc3RhdGVfY29uZmlnIDogSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+KSA6IG1OVCB7IC8vIHdoYXJnYXJibCBnZXQgdGhhdCBzdGF0ZV9jb25maWcgYW55IHVuZGVyIGNvbnRyb2xcblxuICAgIGlmICh0aGlzLl9zdGF0ZXMuaGFzKHN0YXRlX2NvbmZpZy5uYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHN0YXRlX2NvbmZpZy5uYW1lKX0gYWxyZWFkeSBleGlzdHNgKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zdGF0ZXMuc2V0KHN0YXRlX2NvbmZpZy5uYW1lLCBzdGF0ZV9jb25maWcpO1xuICAgIHJldHVybiBzdGF0ZV9jb25maWcubmFtZTtcblxuICB9XG5cblxuXG4gIHN0YXRlKCkgOiBtTlQge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZTtcbiAgfVxuXG4vKiB3aGFyZ2FyYmwgdG9kbyBtYWpvclxuICAgd2hlbiB3ZSByZWltcGxlbWVudCB0aGlzLCByZWludHJvZHVjZSB0aGlzIGNoYW5nZSB0byB0aGUgaXNfZmluYWwgY2FsbFxuXG4gIGlzX2NoYW5naW5nKCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTsgLy8gdG9kbyB3aGFyZ2FyYmxcbiAgfVxuKi9cblxuXG4gIHN0YXRlX2lzX2ZpbmFsKHdoaWNoU3RhdGUgOiBtTlQpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuICggKHRoaXMuc3RhdGVfaXNfdGVybWluYWwod2hpY2hTdGF0ZSkpICYmICh0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHdoaWNoU3RhdGUpKSApO1xuICB9XG5cbiAgaXNfZmluYWwoKSA6IGJvb2xlYW4ge1xuLy8gIHJldHVybiAoKCF0aGlzLmlzX2NoYW5naW5nKCkpICYmIHRoaXMuc3RhdGVfaXNfZmluYWwodGhpcy5zdGF0ZSgpKSk7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVfaXNfZmluYWwodGhpcy5zdGF0ZSgpKTtcbiAgfVxuXG4gIGdyYXBoX2xheW91dCgpIDogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fZ3JhcGhfbGF5b3V0O1xuICB9XG5cblxuXG4gIG1hY2hpbmVfYXV0aG9yKCkgOiA/QXJyYXk8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfYXV0aG9yO1xuICB9XG5cbiAgbWFjaGluZV9jb21tZW50KCkgOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9jb21tZW50O1xuICB9XG5cbiAgbWFjaGluZV9jb250cmlidXRvcigpIDogP0FycmF5PHN0cmluZz4ge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2NvbnRyaWJ1dG9yO1xuICB9XG5cbiAgbWFjaGluZV9kZWZpbml0aW9uKCkgOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9kZWZpbml0aW9uO1xuICB9XG5cbiAgbWFjaGluZV9saWNlbnNlKCkgOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9saWNlbnNlO1xuICB9XG5cbiAgbWFjaGluZV9uYW1lKCkgOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9uYW1lO1xuICB9XG5cbiAgbWFjaGluZV92ZXJzaW9uKCkgOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV92ZXJzaW9uO1xuICB9XG5cbiAgZnNsX3ZlcnNpb24oKSA6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9mc2xfdmVyc2lvbjtcbiAgfVxuXG5cblxuICBtYWNoaW5lX3N0YXRlKCkgOiBKc3NtTWFjaGluZUludGVybmFsU3RhdGU8bU5ULCBtRFQ+IHtcblxuICAgIHJldHVybiB7XG4gICAgICBpbnRlcm5hbF9zdGF0ZV9pbXBsX3ZlcnNpb24gOiAxLFxuXG4gICAgICBhY3Rpb25zICAgICAgICAgICAgICAgIDogdGhpcy5fYWN0aW9ucyxcbiAgICAgIGVkZ2VfbWFwICAgICAgICAgICAgICAgOiB0aGlzLl9lZGdlX21hcCxcbiAgICAgIGVkZ2VzICAgICAgICAgICAgICAgICAgOiB0aGlzLl9lZGdlcyxcbiAgICAgIG5hbWVkX3RyYW5zaXRpb25zICAgICAgOiB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucyxcbiAgICAgIHJldmVyc2VfYWN0aW9ucyAgICAgICAgOiB0aGlzLl9yZXZlcnNlX2FjdGlvbnMsXG4vLyAgICByZXZlcnNlX2FjdGlvbl90YXJnZXRzIDogdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyxcbiAgICAgIHN0YXRlICAgICAgICAgICAgICAgICAgOiB0aGlzLl9zdGF0ZSxcbiAgICAgIHN0YXRlcyAgICAgICAgICAgICAgICAgOiB0aGlzLl9zdGF0ZXNcbiAgICB9O1xuXG4gIH1cblxuLypcbiAgbG9hZF9tYWNoaW5lX3N0YXRlKCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7IC8vIHRvZG8gd2hhcmdhcmJsXG4gIH1cbiovXG5cblxuICBzdGF0ZXMoKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uIHRoaXMuX3N0YXRlcy5rZXlzKCldO1xuICB9XG5cbiAgc3RhdGVfZm9yKHdoaWNoU3RhdGUgOiBtTlQpIDogSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+IHtcbiAgICBjb25zdCBzdGF0ZSA6ID9Kc3NtR2VuZXJpY1N0YXRlPG1OVD4gPSB0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmIChzdGF0ZSkgeyByZXR1cm4gc3RhdGU7IH1cbiAgICBlbHNlICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBubyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkoc3RhdGUpfWApOyB9XG4gIH1cblxuXG5cbiAgbGlzdF9lZGdlcygpIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHtcbiAgICByZXR1cm4gdGhpcy5fZWRnZXM7XG4gIH1cblxuICBsaXN0X25hbWVkX3RyYW5zaXRpb25zKCkgOiBNYXA8bU5ULCBudW1iZXI+IHtcbiAgICByZXR1cm4gdGhpcy5fbmFtZWRfdHJhbnNpdGlvbnM7XG4gIH1cblxuICBsaXN0X2FjdGlvbnMoKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uIHRoaXMuX2FjdGlvbnMua2V5cygpXTtcbiAgfVxuXG5cblxuICBnZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyhmcm9tOiBtTlQsIHRvOiBtTlQpIDogP251bWJlciB7XG5cbiAgICBjb25zdCBlbWcgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2VkZ2VfbWFwLmdldChmcm9tKTtcblxuICAgIGlmIChlbWcpIHtcbiAgICAgIHJldHVybiBlbWcuZ2V0KHRvKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgfVxuXG5cblxuICBsb29rdXBfdHJhbnNpdGlvbl9mb3IoZnJvbTogbU5ULCB0bzogbU5UKSA6ID9Kc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4ge1xuICAgIGNvbnN0IGlkIDogP251bWJlciA9IHRoaXMuZ2V0X3RyYW5zaXRpb25fYnlfc3RhdGVfbmFtZXMoZnJvbSwgdG8pO1xuICAgIHJldHVybiAoKGlkID09PSB1bmRlZmluZWQpIHx8IChpZCA9PT0gbnVsbCkpPyB1bmRlZmluZWQgOiB0aGlzLl9lZGdlc1tpZF07XG4gIH1cblxuXG5cbiAgbGlzdF90cmFuc2l0aW9ucyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpKSA6IEpzc21UcmFuc2l0aW9uTGlzdDxtTlQ+IHtcbiAgICByZXR1cm4ge2VudHJhbmNlczogdGhpcy5saXN0X2VudHJhbmNlcyh3aGljaFN0YXRlKSwgZXhpdHM6IHRoaXMubGlzdF9leGl0cyh3aGljaFN0YXRlKX07XG4gIH1cblxuICBsaXN0X2VudHJhbmNlcyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiAodGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKSB8fCB7fSkuZnJvbSB8fCBbXTtcbiAgfVxuXG4gIGxpc3RfZXhpdHMod2hpY2hTdGF0ZSA6IG1OVCA9IHRoaXMuc3RhdGUoKSkgOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gKHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSkgfHwge30pLnRvICAgfHwgW107XG4gIH1cblxuXG5cbiAgcHJvYmFibGVfZXhpdHNfZm9yKHdoaWNoU3RhdGUgOiBtTlQpIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHtcblxuICAgIGNvbnN0IHdzdGF0ZSA6ID9Kc3NtR2VuZXJpY1N0YXRlPG1OVD4gPSB0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICghKHdzdGF0ZSkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9IGluIHByb2JhYmxlX2V4aXRzX2ZvcmApOyB9XG5cbiAgICBjb25zdCB3c3RhdGVfdG8gOiBBcnJheTwgbU5UID4gPSB3c3RhdGUudG8sXG5cbiAgICAgICAgICB3dGYgICAgICAgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gLy8gd3N0YXRlX3RvX2ZpbHRlcmVkIC0+IHd0ZlxuICAgICAgICAgICAgICAgICAgICA9IHdzdGF0ZV90b1xuICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCggKHdzKSA6ID9Kc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPT4gdGhpcy5sb29rdXBfdHJhbnNpdGlvbl9mb3IodGhpcy5zdGF0ZSgpLCB3cykpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pO1xuXG4gICAgcmV0dXJuIHd0ZjtcblxuICB9XG5cbiAgcHJvYmFiaWxpc3RpY190cmFuc2l0aW9uKCkgOiBib29sZWFuIHtcbiAgICBjb25zdCBzZWxlY3RlZCA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHdlaWdodGVkX3JhbmRfc2VsZWN0KHRoaXMucHJvYmFibGVfZXhpdHNfZm9yKHRoaXMuc3RhdGUoKSkpO1xuICAgIHJldHVybiB0aGlzLnRyYW5zaXRpb24oIHNlbGVjdGVkLnRvICk7XG4gIH1cblxuICBwcm9iYWJpbGlzdGljX3dhbGsobiA6IG51bWJlcikgOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gc2VxKG4pXG4gICAgICAgICAgLm1hcCgoKSA6IG1OVCA9PiB7XG4gICAgICAgICAgICAgY29uc3Qgc3RhdGVfd2FzIDogbU5UID0gdGhpcy5zdGF0ZSgpO1xuICAgICAgICAgICAgIHRoaXMucHJvYmFiaWxpc3RpY190cmFuc2l0aW9uKCk7XG4gICAgICAgICAgICAgcmV0dXJuIHN0YXRlX3dhcztcbiAgICAgICAgICAgfSlcbiAgICAgICAgICAuY29uY2F0KFt0aGlzLnN0YXRlKCldKTtcbiAgfVxuXG4gIHByb2JhYmlsaXN0aWNfaGlzdG9fd2FsayhuIDogbnVtYmVyKSA6IE1hcDxtTlQsIG51bWJlcj4ge1xuICAgIHJldHVybiBoaXN0b2dyYXBoKHRoaXMucHJvYmFiaWxpc3RpY193YWxrKG4pKTtcbiAgfVxuXG5cblxuICBhY3Rpb25zKHdoaWNoU3RhdGUgOiBtTlQgPSB0aGlzLnN0YXRlKCkgKSA6IEFycmF5PG1OVD4ge1xuICAgIGNvbnN0IHdzdGF0ZSA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAod3N0YXRlKSB7IHJldHVybiBbLi4uIHdzdGF0ZS5rZXlzKCldOyB9XG4gICAgZWxzZSAgICAgICAgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuICB9XG5cbiAgbGlzdF9zdGF0ZXNfaGF2aW5nX2FjdGlvbih3aGljaFN0YXRlIDogbU5UKSA6IEFycmF5PG1OVD4ge1xuICAgIGNvbnN0IHdzdGF0ZSA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHdzdGF0ZSkgeyByZXR1cm4gWy4uLiB3c3RhdGUua2V5cygpXTsgfVxuICAgIGVsc2UgICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cbiAgfVxuXG4vLyBjb21lYmFja1xuLypcbiAgbGlzdF9lbnRyYW5jZV9hY3Rpb25zKHdoaWNoU3RhdGUgOiBtTlQgPSB0aGlzLnN0YXRlKCkgKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uICh0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLmdldCh3aGljaFN0YXRlKSB8fCBuZXcgTWFwKCkpLnZhbHVlcygpXSAvLyB3YXN0ZWZ1bFxuICAgICAgICAgICAubWFwKCAoZWRnZUlkOmFueSkgPT4gKHRoaXMuX2VkZ2VzW2VkZ2VJZF0gOiBhbnkpKSAvLyB3aGFyZ2FyYmwgYnVybiBvdXQgYW55XG4gICAgICAgICAgIC5maWx0ZXIoIChvOmFueSkgPT4gby50byA9PT0gd2hpY2hTdGF0ZSlcbiAgICAgICAgICAgLm1hcCggZmlsdGVyZWQgPT4gZmlsdGVyZWQuZnJvbSApO1xuICB9XG4qL1xuICBsaXN0X2V4aXRfYWN0aW9ucyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpICkgOiBBcnJheTw/bU5UPiB7IC8vIHRoZXNlIGFyZSBtTlQsIG5vdCA/bU5UXG4gICAgY29uc3QgcmFfYmFzZSA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAoIShyYV9iYXNlKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuXG4gICAgcmV0dXJuIFsuLi4gcmFfYmFzZS52YWx1ZXMoKV1cbiAgICAgICAgICAgLm1hcCAgICAoIChlZGdlSWQ6bnVtYmVyKSAgICAgICAgICAgICAgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPT4gdGhpcy5fZWRnZXNbZWRnZUlkXSAgIClcbiAgICAgICAgICAgLmZpbHRlciAoIChvOkpzc21UcmFuc2l0aW9uPG1OVCwgbURUPikgOiBib29sZWFuICAgICAgICAgICAgICAgICAgPT4gby5mcm9tID09PSB3aGljaFN0YXRlIClcbiAgICAgICAgICAgLm1hcCAgICAoIChmaWx0ZXJlZCA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPikgOiA/bU5UICAgICAgICAgICAgPT4gZmlsdGVyZWQuYWN0aW9uICAgICAgICk7XG4gIH1cblxuICBwcm9iYWJsZV9hY3Rpb25fZXhpdHMod2hpY2hTdGF0ZSA6IG1OVCA9IHRoaXMuc3RhdGUoKSApIDogQXJyYXk8bWl4ZWQ+IHsgLy8gdGhlc2UgYXJlIG1OVFxuICAgIGNvbnN0IHJhX2Jhc2UgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKCEocmFfYmFzZSkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cblxuICAgIHJldHVybiBbLi4uIHJhX2Jhc2UudmFsdWVzKCldXG4gICAgICAgICAgIC5tYXAgICAgKCAoZWRnZUlkOm51bWJlcikgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPT4gdGhpcy5fZWRnZXNbZWRnZUlkXSAgIClcbiAgICAgICAgICAgLmZpbHRlciAoIChvOkpzc21UcmFuc2l0aW9uPG1OVCwgbURUPikgOiBib29sZWFuICAgICA9PiBvLmZyb20gPT09IHdoaWNoU3RhdGUgKVxuICAgICAgICAgICAubWFwICAgICggKGZpbHRlcmVkKSA6IG1peGVkICAgICAgICAgICAgICAgICAgICAgICAgID0+ICggeyBhY3Rpb24gICAgICA6IGZpbHRlcmVkLmFjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvYmFiaWxpdHkgOiBmaWx0ZXJlZC5wcm9iYWJpbGl0eSB9IClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICB9XG5cblxuXG4gIGlzX3VuZW50ZXJhYmxlKHdoaWNoU3RhdGUgOiBtTlQpIDogYm9vbGVhbiB7XG4gICAgLy8gd2hhcmdhcmJsIHNob3VsZCB0aHJvdyBvbiB1bmtub3duIHN0YXRlXG4gICAgcmV0dXJuIHRoaXMubGlzdF9lbnRyYW5jZXMod2hpY2hTdGF0ZSkubGVuZ3RoID09PSAwO1xuICB9XG5cbiAgaGFzX3VuZW50ZXJhYmxlcygpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpIDogYm9vbGVhbiA9PiB0aGlzLmlzX3VuZW50ZXJhYmxlKHgpKTtcbiAgfVxuXG5cblxuICBpc190ZXJtaW5hbCgpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVfaXNfdGVybWluYWwodGhpcy5zdGF0ZSgpKTtcbiAgfVxuXG4gIHN0YXRlX2lzX3Rlcm1pbmFsKHdoaWNoU3RhdGUgOiBtTlQpIDogYm9vbGVhbiB7XG4gICAgLy8gd2hhcmdhcmJsIHNob3VsZCB0aHJvdyBvbiB1bmtub3duIHN0YXRlXG4gICAgcmV0dXJuIHRoaXMubGlzdF9leGl0cyh3aGljaFN0YXRlKS5sZW5ndGggPT09IDA7XG4gIH1cblxuICBoYXNfdGVybWluYWxzKCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZXMoKS5zb21lKCAoeCkgOiBib29sZWFuID0+IHRoaXMuc3RhdGVfaXNfdGVybWluYWwoeCkpO1xuICB9XG5cblxuXG4gIGlzX2NvbXBsZXRlKCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZV9pc19jb21wbGV0ZSh0aGlzLnN0YXRlKCkpO1xuICB9XG5cbiAgc3RhdGVfaXNfY29tcGxldGUod2hpY2hTdGF0ZSA6IG1OVCkgOiBib29sZWFuIHtcbiAgICBjb25zdCB3c3RhdGUgOiA/SnNzbUdlbmVyaWNTdGF0ZTxtTlQ+ID0gdGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAod3N0YXRlKSB7IHJldHVybiB3c3RhdGUuY29tcGxldGU7IH1cbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG4gIH1cblxuICBoYXNfY29tcGxldGVzKCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZXMoKS5zb21lKCAoeCkgOiBib29sZWFuID0+IHRoaXMuc3RhdGVfaXNfY29tcGxldGUoeCkgKTtcbiAgfVxuXG5cblxuICBhY3Rpb24obmFtZSA6IG1OVCwgbmV3RGF0YT8gOiBtRFQpIDogYm9vbGVhbiB7XG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgaWYgKHRoaXMudmFsaWRfYWN0aW9uKG5hbWUsIG5ld0RhdGEpKSB7XG4gICAgICBjb25zdCBlZGdlIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gdGhpcy5jdXJyZW50X2FjdGlvbl9lZGdlX2ZvcihuYW1lKTtcbiAgICAgIHRoaXMuX3N0YXRlID0gZWRnZS50bztcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgdHJhbnNpdGlvbihuZXdTdGF0ZSA6IG1OVCwgbmV3RGF0YT8gOiBtRFQpIDogYm9vbGVhbiB7XG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgaWYgKHRoaXMudmFsaWRfdHJhbnNpdGlvbihuZXdTdGF0ZSwgbmV3RGF0YSkpIHtcbiAgICAgIHRoaXMuX3N0YXRlID0gbmV3U3RhdGU7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8vIGNhbiBsZWF2ZSBtYWNoaW5lIGluIGluY29uc2lzdGVudCBzdGF0ZS4gIGdlbmVyYWxseSBkbyBub3QgdXNlXG4gIGZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGUgOiBtTlQsIG5ld0RhdGE/IDogbURUKSA6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX2ZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGUsIG5ld0RhdGEpKSB7XG4gICAgICB0aGlzLl9zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuXG5cbiAgY3VycmVudF9hY3Rpb25fZm9yKGFjdGlvbiA6IG1OVCkgOiBudW1iZXIgfCB2b2lkIHtcbiAgICBjb25zdCBhY3Rpb25fYmFzZSA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fYWN0aW9ucy5nZXQoYWN0aW9uKTtcbiAgICByZXR1cm4gYWN0aW9uX2Jhc2U/IGFjdGlvbl9iYXNlLmdldCh0aGlzLnN0YXRlKCkpIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgY3VycmVudF9hY3Rpb25fZWRnZV9mb3IoYWN0aW9uIDogbU5UKSA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiB7XG4gICAgY29uc3QgaWR4IDogP251bWJlciA9IHRoaXMuY3VycmVudF9hY3Rpb25fZm9yKGFjdGlvbik7XG4gICAgaWYgKChpZHggPT09IHVuZGVmaW5lZCkgfHwgKGlkeCA9PT0gbnVsbCkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIGFjdGlvbiAke0pTT04uc3RyaW5naWZ5KGFjdGlvbil9YCk7IH1cbiAgICByZXR1cm4gdGhpcy5fZWRnZXNbaWR4XTtcbiAgfVxuXG4gIHZhbGlkX2FjdGlvbihhY3Rpb24gOiBtTlQsIF9uZXdEYXRhPyA6IG1EVCkgOiBib29sZWFuIHsgIC8vIHRvZG8gY29tZWJhY2sgdW5pZ25vcmUgbmV3RGF0YVxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRfYWN0aW9uX2ZvcihhY3Rpb24pICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICB2YWxpZF90cmFuc2l0aW9uKG5ld1N0YXRlIDogbU5ULCBfbmV3RGF0YT8gOiBtRFQpIDogYm9vbGVhbiB7ICAvLyB0b2RvIGNvbWViYWNrIHVuaWdub3JlIG5ld0RhdGFcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBjb25zdCB0cmFuc2l0aW9uX2ZvciA6ID9Kc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB0aGlzLmxvb2t1cF90cmFuc2l0aW9uX2Zvcih0aGlzLnN0YXRlKCksIG5ld1N0YXRlKTtcblxuICAgIGlmICghKHRyYW5zaXRpb25fZm9yKSkgICAgICAgICAgeyByZXR1cm4gZmFsc2U7IH1cbiAgICBpZiAodHJhbnNpdGlvbl9mb3IuZm9yY2VkX29ubHkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcblxuICB9XG5cbiAgdmFsaWRfZm9yY2VfdHJhbnNpdGlvbihuZXdTdGF0ZSA6IG1OVCwgX25ld0RhdGE/IDogbURUKSA6IGJvb2xlYW4geyAgLy8gdG9kbyBjb21lYmFjayB1bmlnbm9yZSBuZXdEYXRhXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgcmV0dXJuICh0aGlzLmxvb2t1cF90cmFuc2l0aW9uX2Zvcih0aGlzLnN0YXRlKCksIG5ld1N0YXRlKSAhPT0gdW5kZWZpbmVkKTtcbiAgfVxuXG5cbn1cblxuXG5cblxuXG5mdW5jdGlvbiBzbTxtTlQsIG1EVD4odGVtcGxhdGVfc3RyaW5ncyA6IEFycmF5PHN0cmluZz4gLyogLCBhcmd1bWVudHMgKi8pIDogTWFjaGluZTxtTlQsIG1EVD4ge1xuXG4gICAgLy8gZm9vYGEkezF9YiR7Mn1jYCB3aWxsIGNvbWUgaW4gYXMgKFsnYScsJ2InLCdjJ10sMSwyKVxuICAgIC8vIHRoaXMgaW5jbHVkZXMgd2hlbiBhIGFuZCBjIGFyZSBlbXB0eSBzdHJpbmdzXG4gICAgLy8gdGhlcmVmb3JlIHRlbXBsYXRlX3N0cmluZ3Mgd2lsbCBhbHdheXMgaGF2ZSBvbmUgbW9yZSBlbCB0aGFuIHRlbXBsYXRlX2FyZ3NcbiAgICAvLyB0aGVyZWZvcmUgbWFwIHRoZSBzbWFsbGVyIGNvbnRhaW5lciBhbmQgdG9zcyB0aGUgbGFzdCBvbmUgb24gb24gdGhlIHdheSBvdXRcblxuICAgIHJldHVybiBuZXcgTWFjaGluZShtYWtlKHRlbXBsYXRlX3N0cmluZ3MucmVkdWNlKFxuXG4gICAgICAvLyBpbiBnZW5lcmFsIGF2b2lkaW5nIGBhcmd1bWVudHNgIGlzIHNtYXJ0LiAgaG93ZXZlciB3aXRoIHRoZSB0ZW1wbGF0ZVxuICAgICAgLy8gc3RyaW5nIG5vdGF0aW9uLCBhcyBkZXNpZ25lZCwgaXQncyBub3QgcmVhbGx5IHdvcnRoIHRoZSBoYXNzbGVcblxuICAgICAgLyogZXNsaW50LWRpc2FibGUgZnAvbm8tYXJndW1lbnRzICovXG4gICAgICAvKiBlc2xpbnQtZGlzYWJsZSBwcmVmZXItcmVzdC1wYXJhbXMgKi9cbiAgICAgIChhY2MsIHZhbCwgaWR4KSA6IHN0cmluZyA9PiBgJHthY2N9JHthcmd1bWVudHNbaWR4XX0ke3ZhbH1gICAvLyBhcmd1bWVudHNbMF0gaXMgbmV2ZXIgbG9hZGVkLCBzbyBhcmdzIGRvZXNuJ3QgbmVlZCB0byBiZSBnYXRlZFxuICAgICAgLyogZXNsaW50LWVuYWJsZSAgcHJlZmVyLXJlc3QtcGFyYW1zICovXG4gICAgICAvKiBlc2xpbnQtZW5hYmxlICBmcC9uby1hcmd1bWVudHMgKi9cblxuICAgICkpKTtcblxufVxuXG5cblxuXG5cbmV4cG9ydCB7XG5cbiAgdmVyc2lvbixcblxuICBNYWNoaW5lLFxuXG4gIG1ha2UsXG4gICAgcGFyc2UsXG4gICAgY29tcGlsZSxcblxuICBzbSxcblxuICBhcnJvd19kaXJlY3Rpb24sXG4gIGFycm93X2xlZnRfa2luZCxcbiAgYXJyb3dfcmlnaHRfa2luZCxcblxuICAvLyB0b2RvIHdoYXJnYXJibCB0aGVzZSBzaG91bGQgYmUgZXhwb3J0ZWQgdG8gYSB1dGlsaXR5IGxpYnJhcnlcbiAgc2VxLCB3ZWlnaHRlZF9yYW5kX3NlbGVjdCwgaGlzdG9ncmFwaCwgd2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCwgd2VpZ2h0ZWRfaGlzdG9fa2V5XG5cbn07XG4iXX0=