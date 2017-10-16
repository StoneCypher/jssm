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

var reduce_to_639 = require('reduce-to-639-1').reduce;

var parse = require('./jssm-dot.js').parse; // eslint-disable-line flowtype/no-weak-types // todo whargarbl remove any

var version = '5.11.1'; // replaced from package.js in build


/* eslint-disable complexity */

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

/* eslint-enable complexity */

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

  if (rule.key === 'machine_language') {
    return { agg_as: 'machine_language', val: reduce_to_639(rule.value) };
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
    machine_language: [],
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

  var oneOnlyKeys = ['graph_layout', 'machine_name', 'machine_version', 'machine_comment', 'fsl_version', 'machine_license', 'machine_definition', 'machine_language'];

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
        machine_language = _ref2.machine_language,
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
    this._machine_language = machine_language;
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
    
      is_changing(): boolean {
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
    key: 'machine_language',
    value: function machine_language() {
      return this._machine_language;
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
      load_machine_state(): boolean {
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
      list_entrance_actions(whichState: mNT = this.state() ) : Array<mNT> {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLmpzIl0sIm5hbWVzIjpbInJlZHVjZV90b182MzkiLCJyZXF1aXJlIiwicmVkdWNlIiwicGFyc2UiLCJ2ZXJzaW9uIiwiYXJyb3dfZGlyZWN0aW9uIiwiYXJyb3ciLCJTdHJpbmciLCJFcnJvciIsImFycm93X2xlZnRfa2luZCIsImFycm93X3JpZ2h0X2tpbmQiLCJjb21waWxlX3J1bGVfdHJhbnNpdGlvbl9zdGVwIiwiYWNjIiwiZnJvbSIsInRvIiwidGhpc19zZSIsIm5leHRfc2UiLCJlZGdlcyIsInVGcm9tIiwiQXJyYXkiLCJpc0FycmF5IiwidVRvIiwibWFwIiwiZiIsInQiLCJyayIsImtpbmQiLCJsayIsInJpZ2h0IiwiZm9yY2VkX29ubHkiLCJtYWluX3BhdGgiLCJyX2FjdGlvbiIsImFjdGlvbiIsInJfcHJvYmFiaWxpdHkiLCJwcm9iYWJpbGl0eSIsInB1c2giLCJsZWZ0IiwibF9hY3Rpb24iLCJsX3Byb2JhYmlsaXR5IiwibmV3X2FjYyIsImNvbmNhdCIsInNlIiwiY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uIiwicnVsZSIsImNvbXBpbGVfcnVsZV9oYW5kbGVyIiwia2V5IiwiYWdnX2FzIiwidmFsIiwidmFsdWUiLCJ0YXV0b2xvZ2llcyIsImluY2x1ZGVzIiwiSlNPTiIsInN0cmluZ2lmeSIsImNvbXBpbGUiLCJ0cmVlIiwicmVzdWx0cyIsImdyYXBoX2xheW91dCIsInRyYW5zaXRpb24iLCJzdGFydF9zdGF0ZXMiLCJlbmRfc3RhdGVzIiwiZnNsX3ZlcnNpb24iLCJtYWNoaW5lX2F1dGhvciIsIm1hY2hpbmVfY29tbWVudCIsIm1hY2hpbmVfY29udHJpYnV0b3IiLCJtYWNoaW5lX2RlZmluaXRpb24iLCJtYWNoaW5lX2xhbmd1YWdlIiwibWFjaGluZV9saWNlbnNlIiwibWFjaGluZV9uYW1lIiwibWFjaGluZV9yZWZlcmVuY2UiLCJtYWNoaW5lX3ZlcnNpb24iLCJ0ciIsImFzc2VtYmxlZF90cmFuc2l0aW9ucyIsInJlc3VsdF9jZmciLCJsZW5ndGgiLCJ0cmFuc2l0aW9ucyIsIm9uZU9ubHlLZXlzIiwib25lT25seUtleSIsIm11bHRpS2V5IiwibWFrZSIsInBsYW4iLCJNYWNoaW5lIiwiY29tcGxldGUiLCJfc3RhdGUiLCJfc3RhdGVzIiwiTWFwIiwiX2VkZ2VzIiwiX2VkZ2VfbWFwIiwiX25hbWVkX3RyYW5zaXRpb25zIiwiX2FjdGlvbnMiLCJfcmV2ZXJzZV9hY3Rpb25zIiwiX3JldmVyc2VfYWN0aW9uX3RhcmdldHMiLCJfbWFjaGluZV9hdXRob3IiLCJfbWFjaGluZV9jb21tZW50IiwiX21hY2hpbmVfY29udHJpYnV0b3IiLCJfbWFjaGluZV9kZWZpbml0aW9uIiwiX21hY2hpbmVfbGFuZ3VhZ2UiLCJfbWFjaGluZV9saWNlbnNlIiwiX21hY2hpbmVfbmFtZSIsIl9tYWNoaW5lX3ZlcnNpb24iLCJfZnNsX3ZlcnNpb24iLCJfZ3JhcGhfbGF5b3V0IiwidW5kZWZpbmVkIiwiY3Vyc29yX2Zyb20iLCJnZXQiLCJuYW1lIiwiaGFzIiwiX25ld19zdGF0ZSIsImN1cnNvcl90byIsInRoaXNFZGdlSWQiLCJzZXQiLCJmcm9tX21hcHBpbmciLCJhY3Rpb25NYXAiLCJyQWN0aW9uTWFwIiwic3RhdGVfY29uZmlnIiwid2hpY2hTdGF0ZSIsInN0YXRlX2lzX3Rlcm1pbmFsIiwic3RhdGVfaXNfY29tcGxldGUiLCJzdGF0ZV9pc19maW5hbCIsInN0YXRlIiwiaW50ZXJuYWxfc3RhdGVfaW1wbF92ZXJzaW9uIiwiYWN0aW9ucyIsImVkZ2VfbWFwIiwibmFtZWRfdHJhbnNpdGlvbnMiLCJyZXZlcnNlX2FjdGlvbnMiLCJzdGF0ZXMiLCJrZXlzIiwiZW1nIiwiaWQiLCJnZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyIsImVudHJhbmNlcyIsImxpc3RfZW50cmFuY2VzIiwiZXhpdHMiLCJsaXN0X2V4aXRzIiwid3N0YXRlIiwid3N0YXRlX3RvIiwid3RmIiwid3MiLCJsb29rdXBfdHJhbnNpdGlvbl9mb3IiLCJmaWx0ZXIiLCJCb29sZWFuIiwic2VsZWN0ZWQiLCJwcm9iYWJsZV9leGl0c19mb3IiLCJuIiwic3RhdGVfd2FzIiwicHJvYmFiaWxpc3RpY190cmFuc2l0aW9uIiwicHJvYmFiaWxpc3RpY193YWxrIiwicmFfYmFzZSIsInZhbHVlcyIsImVkZ2VJZCIsIm8iLCJmaWx0ZXJlZCIsInNvbWUiLCJ4IiwiaXNfdW5lbnRlcmFibGUiLCJuZXdEYXRhIiwidmFsaWRfYWN0aW9uIiwiZWRnZSIsImN1cnJlbnRfYWN0aW9uX2VkZ2VfZm9yIiwibmV3U3RhdGUiLCJ2YWxpZF90cmFuc2l0aW9uIiwidmFsaWRfZm9yY2VfdHJhbnNpdGlvbiIsImFjdGlvbl9iYXNlIiwiaWR4IiwiY3VycmVudF9hY3Rpb25fZm9yIiwiX25ld0RhdGEiLCJ0cmFuc2l0aW9uX2ZvciIsInNtIiwidGVtcGxhdGVfc3RyaW5ncyIsInNlcSIsIndlaWdodGVkX3JhbmRfc2VsZWN0IiwiaGlzdG9ncmFwaCIsIndlaWdodGVkX3NhbXBsZV9zZWxlY3QiLCJ3ZWlnaHRlZF9oaXN0b19rZXkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQTJCQTs7Ozs7O0FBMUJBOztBQUlBLElBQU1BLGdCQUEyQkMsUUFBUSxpQkFBUixFQUEyQkMsTUFBNUQ7O0FBd0JBLElBQU1DLFFBQStDRixRQUFRLGVBQVIsRUFBeUJFLEtBQTlFLEMsQ0FBc0Y7O0FBRXRGLElBQU1DLFVBQWdCLElBQXRCLEMsQ0FBNEI7OztBQU01Qjs7QUFFQSxTQUFTQyxlQUFULENBQXlCQyxLQUF6QixFQUErRDs7QUFFN0QsVUFBU0MsT0FBT0QsS0FBUCxDQUFUOztBQUVFLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNiLGFBQU8sT0FBUDs7QUFFRixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLElB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QUFnQztBQUFFLGVBQU8sS0FBUDtBQUFlO0FBQ2pELFVBQUlBLGVBQWV4SSxXQUFuQixFQUFnQztBQUFFLGVBQU8sS0FBUDtBQUFlOztBQUVqRCxhQUFPLElBQVA7QUFFRDs7OzJDQUVzQmlJLFEsRUFBZU0sUSxFQUF5QjtBQUFHO0FBQ2hFO0FBQ0E7QUFDQTtBQUNBLGFBQVEsS0FBSzNCLHFCQUFMLENBQTJCLEtBQUtuQixLQUFMLEVBQTNCLEVBQXlDd0MsUUFBekMsTUFBdUR6RCxTQUEvRDtBQUNEOzs7Ozs7QUFTSCxTQUFTaUUsRUFBVCxDQUFzQkMsZ0JBQXRCLENBQXNELGlCQUF0RCxFQUE0RjtBQUFBOzs7QUFFeEY7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsU0FBTyxJQUFJdkYsT0FBSixDQUFZRixLQUFLeUYsaUJBQWlCckssTUFBakI7O0FBRXRCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFlBQUNVLEdBQUQsRUFBTW1DLEdBQU4sRUFBV21ILEdBQVg7QUFBQSxnQkFBOEJ0SixHQUE5QixHQUFvQyxXQUFVc0osR0FBVixDQUFwQyxHQUFxRG5ILEdBQXJEO0FBQUEsR0FQc0IsQ0FPc0M7QUFDNUQ7QUFDQTs7QUFUc0IsR0FBTCxDQUFaLENBQVA7QUFhSDs7UUFRQzNDLE8sR0FBQUEsTztRQUVBNEUsTyxHQUFBQSxPO1FBRUFGLEksR0FBQUEsSTtRQUNFM0UsSyxHQUFBQSxLO1FBQ0FrRCxPLEdBQUFBLE87UUFFRmlILEUsR0FBQUEsRTtRQUVBakssZSxHQUFBQSxlO1FBQ0FJLGUsR0FBQUEsZTtRQUNBQyxnQixHQUFBQSxnQjtRQUdBOEosRztRQUFLQyxvQjtRQUFzQkMsVTtRQUFZQyxzQjtRQUF3QkMsa0IiLCJmaWxlIjoianNzbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLy8gd2hhcmdhcmJsIGxvdHMgb2YgdGhlc2UgcmV0dXJuIGFycmF5cyBjb3VsZC9zaG91bGQgYmUgc2V0c1xuXG4vLyBAZmxvd1xuXG5jb25zdCByZWR1Y2VfdG9fNjM5IDogRnVuY3Rpb24gPSByZXF1aXJlKCdyZWR1Y2UtdG8tNjM5LTEnKS5yZWR1Y2U7XG5cblxuXG5cblxuaW1wb3J0IHR5cGUge1xuXG4gIEpzc21HZW5lcmljU3RhdGUsIEpzc21HZW5lcmljQ29uZmlnLFxuICBKc3NtVHJhbnNpdGlvbiwgSnNzbVRyYW5zaXRpb25MaXN0LFxuICBKc3NtTWFjaGluZUludGVybmFsU3RhdGUsXG4gIEpzc21QYXJzZVRyZWUsXG4gIEpzc21Db21waWxlU2UsIEpzc21Db21waWxlU2VTdGFydCwgSnNzbUNvbXBpbGVSdWxlLFxuICBKc3NtQXJyb3csIEpzc21BcnJvd0RpcmVjdGlvbiwgSnNzbUFycm93S2luZCxcbiAgSnNzbUxheW91dFxuXG59IGZyb20gJy4vanNzbS10eXBlcyc7XG5cblxuXG5cblxuaW1wb3J0IHsgc2VxLCB3ZWlnaHRlZF9yYW5kX3NlbGVjdCwgd2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCwgaGlzdG9ncmFwaCwgd2VpZ2h0ZWRfaGlzdG9fa2V5IH0gZnJvbSAnLi9qc3NtLXV0aWwuanMnO1xuXG5jb25zdCBwYXJzZTogPE5ULCBEVD4oc3RyaW5nKSA9PiBKc3NtUGFyc2VUcmVlPE5UPiA9IHJlcXVpcmUoJy4vanNzbS1kb3QuanMnKS5wYXJzZTsgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZmxvd3R5cGUvbm8td2Vhay10eXBlcyAvLyB0b2RvIHdoYXJnYXJibCByZW1vdmUgYW55XG5cbmNvbnN0IHZlcnNpb246IG51bGwgPSBudWxsOyAvLyByZXBsYWNlZCBmcm9tIHBhY2thZ2UuanMgaW4gYnVpbGRcblxuXG5cblxuXG4vKiBlc2xpbnQtZGlzYWJsZSBjb21wbGV4aXR5ICovXG5cbmZ1bmN0aW9uIGFycm93X2RpcmVjdGlvbihhcnJvdzogSnNzbUFycm93KTogSnNzbUFycm93RGlyZWN0aW9uIHtcblxuICBzd2l0Y2ggKCBTdHJpbmcoYXJyb3cpICkge1xuXG4gICAgY2FzZSAnLT4nIDogICAgY2FzZSAn4oaSJyA6XG4gICAgY2FzZSAnPT4nIDogICAgY2FzZSAn4oeSJyA6XG4gICAgY2FzZSAnfj4nIDogICAgY2FzZSAn4oabJyA6XG4gICAgICByZXR1cm4gJ3JpZ2h0JztcblxuICAgIGNhc2UgJzwtJyA6ICAgIGNhc2UgJ+KGkCcgOlxuICAgIGNhc2UgJzw9JyA6ICAgIGNhc2UgJ+KHkCcgOlxuICAgIGNhc2UgJzx+JyA6ICAgIGNhc2UgJ+KGmicgOlxuICAgICAgcmV0dXJuICdsZWZ0JztcblxuICAgIGNhc2UgJzwtPic6ICAgIGNhc2UgJ+KGlCcgOlxuICAgIGNhc2UgJzwtPT4nOiAgIGNhc2UgJ+KGkOKHkicgOlxuICAgIGNhc2UgJzwtfj4nOiAgIGNhc2UgJ+KGkOKGmycgOlxuXG4gICAgY2FzZSAnPD0+JzogICAgY2FzZSAn4oeUJyA6XG4gICAgY2FzZSAnPD0tPic6ICAgY2FzZSAn4oeQ4oaSJyA6XG4gICAgY2FzZSAnPD1+Pic6ICAgY2FzZSAn4oeQ4oabJyA6XG5cbiAgICBjYXNlICc8fj4nOiAgICBjYXNlICfihq4nIDpcbiAgICBjYXNlICc8fi0+JzogICBjYXNlICfihprihpInIDpcbiAgICBjYXNlICc8fj0+JzogICBjYXNlICfihprih5InIDpcbiAgICAgIHJldHVybiAnYm90aCc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcnJvd19kaXJlY3Rpb246IHVua25vd24gYXJyb3cgdHlwZSAke2Fycm93fWApO1xuXG4gIH1cblxufVxuXG4vKiBlc2xpbnQtZW5hYmxlIGNvbXBsZXhpdHkgKi9cblxuXG5cblxuXG4vKiBlc2xpbnQtZGlzYWJsZSBjb21wbGV4aXR5ICovXG5cbmZ1bmN0aW9uIGFycm93X2xlZnRfa2luZChhcnJvdzogSnNzbUFycm93KTogSnNzbUFycm93S2luZCB7XG5cbiAgc3dpdGNoICggU3RyaW5nKGFycm93KSApIHtcblxuICAgIGNhc2UgJy0+JyA6ICAgIGNhc2UgJ+KGkicgOlxuICAgIGNhc2UgJz0+JyA6ICAgIGNhc2UgJ+KHkicgOlxuICAgIGNhc2UgJ34+JyA6ICAgIGNhc2UgJ+KGmycgOlxuICAgICAgcmV0dXJuICdub25lJztcblxuICAgIGNhc2UgJzwtJzogICAgIGNhc2UgJ+KGkCcgOlxuICAgIGNhc2UgJzwtPic6ICAgIGNhc2UgJ+KGlCcgOlxuICAgIGNhc2UgJzwtPT4nOiAgIGNhc2UgJ+KGkOKHkicgOlxuICAgIGNhc2UgJzwtfj4nOiAgIGNhc2UgJ+KGkOKGmycgOlxuICAgICAgcmV0dXJuICdsZWdhbCc7XG5cbiAgICBjYXNlICc8PSc6ICAgICBjYXNlICfih5AnIDpcbiAgICBjYXNlICc8PT4nOiAgICBjYXNlICfih5QnIDpcbiAgICBjYXNlICc8PS0+JzogICBjYXNlICfih5DihpInIDpcbiAgICBjYXNlICc8PX4+JzogICBjYXNlICfih5DihpsnIDpcbiAgICAgIHJldHVybiAnbWFpbic7XG5cbiAgICBjYXNlICc8fic6ICAgICBjYXNlICfihponIDpcbiAgICBjYXNlICc8fj4nOiAgICBjYXNlICfihq4nIDpcbiAgICBjYXNlICc8fi0+JzogICBjYXNlICfihprihpInIDpcbiAgICBjYXNlICc8fj0+JzogICBjYXNlICfihprih5InIDpcbiAgICAgIHJldHVybiAnZm9yY2VkJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGFycm93X2RpcmVjdGlvbjogdW5rbm93biBhcnJvdyB0eXBlICR7YXJyb3d9YCk7XG5cbiAgfVxuXG59XG5cbi8qIGVzbGludC1lbmFibGUgY29tcGxleGl0eSAqL1xuXG5cblxuXG5cbi8qIGVzbGludC1kaXNhYmxlIGNvbXBsZXhpdHkgKi9cblxuZnVuY3Rpb24gYXJyb3dfcmlnaHRfa2luZChhcnJvdzogSnNzbUFycm93KTogSnNzbUFycm93S2luZCB7XG5cbiAgc3dpdGNoICggU3RyaW5nKGFycm93KSApIHtcblxuICAgIGNhc2UgJzwtJyA6ICAgIGNhc2UgJ+KGkCcgOlxuICAgIGNhc2UgJzw9JyA6ICAgIGNhc2UgJ+KHkCcgOlxuICAgIGNhc2UgJzx+JyA6ICAgIGNhc2UgJ+KGmicgOlxuICAgICAgcmV0dXJuICdub25lJztcblxuICAgIGNhc2UgJy0+JyA6ICAgIGNhc2UgJ+KGkicgOlxuICAgIGNhc2UgJzwtPic6ICAgIGNhc2UgJ+KGlCcgOlxuICAgIGNhc2UgJzw9LT4nOiAgIGNhc2UgJ+KHkOKGkicgOlxuICAgIGNhc2UgJzx+LT4nOiAgIGNhc2UgJ+KGmuKGkicgOlxuICAgICAgcmV0dXJuICdsZWdhbCc7XG5cbiAgICBjYXNlICc9PicgOiAgICBjYXNlICfih5InIDpcbiAgICBjYXNlICc8PT4nOiAgICBjYXNlICfih5QnIDpcbiAgICBjYXNlICc8LT0+JzogICBjYXNlICfihpDih5InIDpcbiAgICBjYXNlICc8fj0+JzogICBjYXNlICfihprih5InIDpcbiAgICAgIHJldHVybiAnbWFpbic7XG5cbiAgICBjYXNlICd+PicgOiAgICBjYXNlICfihpsnIDpcbiAgICBjYXNlICc8fj4nOiAgICBjYXNlICfihq4nIDpcbiAgICBjYXNlICc8LX4+JzogICBjYXNlICfihpDihpsnIDpcbiAgICBjYXNlICc8PX4+JzogICBjYXNlICfih5DihpsnIDpcbiAgICAgIHJldHVybiAnZm9yY2VkJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGFycm93X2RpcmVjdGlvbjogdW5rbm93biBhcnJvdyB0eXBlICR7YXJyb3d9YCk7XG5cbiAgfVxuXG59XG5cbi8qIGVzbGludC1lbmFibGUgY29tcGxleGl0eSAqL1xuXG5cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXA8bU5ULCBtRFQ+KFxuICAgICAgICAgICAgIGFjYyAgICAgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4sXG4gICAgICAgICAgICAgZnJvbSAgICA6IG1OVCxcbiAgICAgICAgICAgICB0byAgICAgIDogbU5ULFxuICAgICAgICAgICAgIHRoaXNfc2UgOiBKc3NtQ29tcGlsZVNlPG1OVD4sXG4gICAgICAgICAgICAgbmV4dF9zZSA6IEpzc21Db21waWxlU2U8bU5UPlxuICAgICAgICAgKSA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiB7IC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgcGFyc2VyIHJlcHJlc2VudGF0aW9uIG9mIGEgdHJhbnNpdGlvbiBzdGVwIGV4dGVuc2lvblxuXG4gIGNvbnN0IGVkZ2VzIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+ID0gW107XG5cbiAgY29uc3QgdUZyb20gOiBBcnJheTwgbU5UID4gPSAoQXJyYXkuaXNBcnJheShmcm9tKT8gZnJvbSA6IFtmcm9tXSksXG4gICAgICAgIHVUbyAgIDogQXJyYXk8IG1OVCA+ID0gKEFycmF5LmlzQXJyYXkodG8pPyAgIHRvICAgOiBbdG9dICApO1xuXG4gIHVGcm9tLm1hcCggKGY6IG1OVCkgPT4ge1xuICAgIHVUby5tYXAoICh0OiBtTlQpID0+IHtcblxuICAgICAgY29uc3Qgcms6IEpzc21BcnJvd0tpbmQgPSBhcnJvd19yaWdodF9raW5kKHRoaXNfc2Uua2luZCksXG4gICAgICAgICAgICBsazogSnNzbUFycm93S2luZCA9IGFycm93X2xlZnRfa2luZCh0aGlzX3NlLmtpbmQpO1xuXG5cbiAgICAgIGNvbnN0IHJpZ2h0OiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB7XG4gICAgICAgIGZyb20gICAgICAgIDogZixcbiAgICAgICAgdG8gICAgICAgICAgOiB0LFxuICAgICAgICBraW5kICAgICAgICA6IHJrLFxuICAgICAgICBmb3JjZWRfb25seSA6IHJrID09PSAnZm9yY2VkJyxcbiAgICAgICAgbWFpbl9wYXRoICAgOiByayA9PT0gJ21haW4nXG4gICAgICB9O1xuXG4gICAgICBpZiAodGhpc19zZS5yX2FjdGlvbikgICAgICB7IHJpZ2h0LmFjdGlvbiAgICAgID0gdGhpc19zZS5yX2FjdGlvbjsgICAgICB9XG4gICAgICBpZiAodGhpc19zZS5yX3Byb2JhYmlsaXR5KSB7IHJpZ2h0LnByb2JhYmlsaXR5ID0gdGhpc19zZS5yX3Byb2JhYmlsaXR5OyB9XG4gICAgICBpZiAocmlnaHQua2luZCAhPT0gJ25vbmUnKSB7IGVkZ2VzLnB1c2gocmlnaHQpOyB9XG5cblxuICAgICAgY29uc3QgbGVmdDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0ge1xuICAgICAgICBmcm9tICAgICAgICA6IHQsXG4gICAgICAgIHRvICAgICAgICAgIDogZixcbiAgICAgICAga2luZCAgICAgICAgOiBsayxcbiAgICAgICAgZm9yY2VkX29ubHkgOiBsayA9PT0gJ2ZvcmNlZCcsXG4gICAgICAgIG1haW5fcGF0aCAgIDogbGsgPT09ICdtYWluJ1xuICAgICAgfTtcblxuICAgICAgaWYgKHRoaXNfc2UubF9hY3Rpb24pICAgICAgeyBsZWZ0LmFjdGlvbiAgICAgID0gdGhpc19zZS5sX2FjdGlvbjsgICAgICB9XG4gICAgICBpZiAodGhpc19zZS5sX3Byb2JhYmlsaXR5KSB7IGxlZnQucHJvYmFiaWxpdHkgPSB0aGlzX3NlLmxfcHJvYmFiaWxpdHk7IH1cbiAgICAgIGlmIChsZWZ0LmtpbmQgIT09ICdub25lJykgIHsgZWRnZXMucHVzaChsZWZ0KTsgfVxuXG4gICAgfSk7XG4gIH0pO1xuXG4gIGNvbnN0IG5ld19hY2M6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiA9IGFjYy5jb25jYXQoZWRnZXMpO1xuXG4gIGlmIChuZXh0X3NlKSB7XG4gICAgcmV0dXJuIGNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXAobmV3X2FjYywgdG8sIG5leHRfc2UudG8sIG5leHRfc2UsIG5leHRfc2Uuc2UpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXdfYWNjO1xuICB9XG5cbn1cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVfcnVsZV9oYW5kbGVfdHJhbnNpdGlvbjxtTlQ+KHJ1bGU6IEpzc21Db21waWxlU2VTdGFydDxtTlQ+KTogbWl4ZWQgeyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIHBhcnNlciByZXByZXNlbnRhdGlvbiBvZiBhIHRyYW5zaXRpb25cbiAgcmV0dXJuIGNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXAoW10sIHJ1bGUuZnJvbSwgcnVsZS5zZS50bywgcnVsZS5zZSwgcnVsZS5zZS5zZSk7XG59XG5cblxuXG5mdW5jdGlvbiBjb21waWxlX3J1bGVfaGFuZGxlcjxtTlQ+KHJ1bGU6IEpzc21Db21waWxlU2VTdGFydDxtTlQ+KTogSnNzbUNvbXBpbGVSdWxlIHsgLy8gdG9kbyBmbG93IGRlc2NyaWJlIHRoZSBvdXRwdXQgb2YgdGhlIHBhcnNlclxuXG4gIGlmIChydWxlLmtleSA9PT0gJ3RyYW5zaXRpb24nKSB7XG4gICAgcmV0dXJuIHsgYWdnX2FzOiAndHJhbnNpdGlvbicsIHZhbDogY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uKHJ1bGUpIH07XG4gIH1cblxuICBpZiAocnVsZS5rZXkgPT09ICdtYWNoaW5lX2xhbmd1YWdlJykge1xuICAgIHJldHVybiB7IGFnZ19hczogJ21hY2hpbmVfbGFuZ3VhZ2UnLCB2YWw6IHJlZHVjZV90b182MzkocnVsZS52YWx1ZSkgfTtcbiAgfVxuXG4gIGNvbnN0IHRhdXRvbG9naWVzIDogQXJyYXk8c3RyaW5nPiA9IFtcbiAgICAnZ3JhcGhfbGF5b3V0JywgJ3N0YXJ0X3N0YXRlcycsICdlbmRfc3RhdGVzJywgJ21hY2hpbmVfbmFtZScsICdtYWNoaW5lX3ZlcnNpb24nLFxuICAgICdtYWNoaW5lX2NvbW1lbnQnLCAnbWFjaGluZV9hdXRob3InLCAnbWFjaGluZV9jb250cmlidXRvcicsICdtYWNoaW5lX2RlZmluaXRpb24nLFxuICAgICdtYWNoaW5lX3JlZmVyZW5jZScsICdtYWNoaW5lX2xpY2Vuc2UnLCAnZnNsX3ZlcnNpb24nXG4gIF07XG5cbiAgaWYgKHRhdXRvbG9naWVzLmluY2x1ZGVzKHJ1bGUua2V5KSkge1xuICAgIHJldHVybiB7IGFnZ19hczogcnVsZS5rZXksIHZhbDogcnVsZS52YWx1ZSB9O1xuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKGBjb21waWxlX3J1bGVfaGFuZGxlcjogVW5rbm93biBydWxlOiAke0pTT04uc3RyaW5naWZ5KHJ1bGUpfWApO1xuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gY29tcGlsZTxtTlQsIG1EVD4odHJlZTogSnNzbVBhcnNlVHJlZTxtTlQ+KTogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+IHsgIC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgb3V0cHV0IG9mIHRoZSBwYXJzZXJcblxuICBjb25zdCByZXN1bHRzIDoge1xuICAgIGdyYXBoX2xheW91dCAgICAgICAgOiBBcnJheTwgSnNzbUxheW91dCA+LFxuICAgIHRyYW5zaXRpb24gICAgICAgICAgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4sXG4gICAgc3RhcnRfc3RhdGVzICAgICAgICA6IEFycmF5PCBtTlQgPixcbiAgICBlbmRfc3RhdGVzICAgICAgICAgIDogQXJyYXk8IG1OVCA+LFxuICAgIGZzbF92ZXJzaW9uICAgICAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9hdXRob3IgICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2NvbW1lbnQgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfY29udHJpYnV0b3IgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9kZWZpbml0aW9uICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2xhbmd1YWdlICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfbGljZW5zZSAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9uYW1lICAgICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX3JlZmVyZW5jZSAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfdmVyc2lvbiAgICAgOiBBcnJheTwgc3RyaW5nID4gLy8gc2VtdmVyXG4gIH0gPSB7XG4gICAgZ3JhcGhfbGF5b3V0ICAgICAgICA6IFtdLFxuICAgIHRyYW5zaXRpb24gICAgICAgICAgOiBbXSxcbiAgICBzdGFydF9zdGF0ZXMgICAgICAgIDogW10sXG4gICAgZW5kX3N0YXRlcyAgICAgICAgICA6IFtdLFxuICAgIGZzbF92ZXJzaW9uICAgICAgICAgOiBbXSxcbiAgICBtYWNoaW5lX2F1dGhvciAgICAgIDogW10sXG4gICAgbWFjaGluZV9jb21tZW50ICAgICA6IFtdLFxuICAgIG1hY2hpbmVfY29udHJpYnV0b3IgOiBbXSxcbiAgICBtYWNoaW5lX2RlZmluaXRpb24gIDogW10sXG4gICAgbWFjaGluZV9sYW5ndWFnZSAgICA6IFtdLFxuICAgIG1hY2hpbmVfbGljZW5zZSAgICAgOiBbXSxcbiAgICBtYWNoaW5lX25hbWUgICAgICAgIDogW10sXG4gICAgbWFjaGluZV9yZWZlcmVuY2UgICA6IFtdLFxuICAgIG1hY2hpbmVfdmVyc2lvbiAgICAgOiBbXVxuICB9O1xuXG4gIHRyZWUubWFwKCAodHIgOiBKc3NtQ29tcGlsZVNlU3RhcnQ8bU5UPikgPT4ge1xuXG4gICAgY29uc3QgcnVsZSAgIDogSnNzbUNvbXBpbGVSdWxlID0gY29tcGlsZV9ydWxlX2hhbmRsZXIodHIpLFxuICAgICAgICAgIGFnZ19hcyA6IHN0cmluZyAgICAgICAgICA9IHJ1bGUuYWdnX2FzLFxuICAgICAgICAgIHZhbCAgICA6IG1peGVkICAgICAgICAgICA9IHJ1bGUudmFsOyAgICAgICAgICAgICAgICAgIC8vIHRvZG8gYmV0dGVyIHR5cGVzXG5cbiAgICByZXN1bHRzW2FnZ19hc10gPSByZXN1bHRzW2FnZ19hc10uY29uY2F0KHZhbCk7XG5cbiAgfSk7XG5cbiAgY29uc3QgYXNzZW1ibGVkX3RyYW5zaXRpb25zIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+ID0gW10uY29uY2F0KC4uLiByZXN1bHRzWyd0cmFuc2l0aW9uJ10pO1xuXG4gIGNvbnN0IHJlc3VsdF9jZmcgOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4gPSB7XG4gICAgc3RhcnRfc3RhdGVzIDogcmVzdWx0cy5zdGFydF9zdGF0ZXMubGVuZ3RoPyByZXN1bHRzLnN0YXJ0X3N0YXRlcyA6IFthc3NlbWJsZWRfdHJhbnNpdGlvbnNbMF0uZnJvbV0sXG4gICAgdHJhbnNpdGlvbnMgIDogYXNzZW1ibGVkX3RyYW5zaXRpb25zXG4gIH07XG5cbiAgY29uc3Qgb25lT25seUtleXMgOiBBcnJheTxzdHJpbmc+ID0gW1xuICAgICdncmFwaF9sYXlvdXQnLCAnbWFjaGluZV9uYW1lJywgJ21hY2hpbmVfdmVyc2lvbicsICdtYWNoaW5lX2NvbW1lbnQnLCAnZnNsX3ZlcnNpb24nLCAnbWFjaGluZV9saWNlbnNlJyxcbiAgICAnbWFjaGluZV9kZWZpbml0aW9uJywgJ21hY2hpbmVfbGFuZ3VhZ2UnXG4gIF07XG5cbiAgb25lT25seUtleXMubWFwKCAob25lT25seUtleSA6IHN0cmluZykgPT4ge1xuICAgIGlmIChyZXN1bHRzW29uZU9ubHlLZXldLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWF5IG9ubHkgaGF2ZSBvbmUgJHtvbmVPbmx5S2V5fSBzdGF0ZW1lbnQgbWF4aW11bTogJHtKU09OLnN0cmluZ2lmeShyZXN1bHRzW29uZU9ubHlLZXldKX1gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHJlc3VsdHNbb25lT25seUtleV0ubGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdF9jZmdbb25lT25seUtleV0gPSByZXN1bHRzW29uZU9ubHlLZXldWzBdO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgWydtYWNoaW5lX2F1dGhvcicsICdtYWNoaW5lX2NvbnRyaWJ1dG9yJywgJ21hY2hpbmVfcmVmZXJlbmNlJ10ubWFwKCAobXVsdGlLZXkgOiBzdHJpbmcpID0+IHtcbiAgICBpZiAocmVzdWx0c1ttdWx0aUtleV0ubGVuZ3RoKSB7XG4gICAgICByZXN1bHRfY2ZnW211bHRpS2V5XSA9IHJlc3VsdHNbbXVsdGlLZXldO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHJlc3VsdF9jZmc7XG5cbn1cblxuXG5cblxuXG5mdW5jdGlvbiBtYWtlPG1OVCwgbURUPihwbGFuOiBzdHJpbmcpOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4ge1xuICByZXR1cm4gY29tcGlsZShwYXJzZShwbGFuKSk7XG59XG5cblxuXG5cblxuY2xhc3MgTWFjaGluZTxtTlQsIG1EVD4ge1xuXG5cbiAgX3N0YXRlICAgICAgICAgICAgICAgICAgOiBtTlQ7XG4gIF9zdGF0ZXMgICAgICAgICAgICAgICAgIDogTWFwPG1OVCwgSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+PjtcbiAgX2VkZ2VzICAgICAgICAgICAgICAgICAgOiBBcnJheTxKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4+O1xuICBfZWRnZV9tYXAgICAgICAgICAgICAgICA6IE1hcDxtTlQsIE1hcDxtTlQsIG51bWJlcj4+O1xuICBfbmFtZWRfdHJhbnNpdGlvbnMgICAgICA6IE1hcDxtTlQsIG51bWJlcj47XG4gIF9hY3Rpb25zICAgICAgICAgICAgICAgIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG4gIF9yZXZlcnNlX2FjdGlvbnMgICAgICAgIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG4gIF9yZXZlcnNlX2FjdGlvbl90YXJnZXRzIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG5cbiAgX21hY2hpbmVfYXV0aG9yICAgICAgICAgOiA/QXJyYXk8c3RyaW5nPjtcbiAgX21hY2hpbmVfY29tbWVudCAgICAgICAgOiA/c3RyaW5nO1xuICBfbWFjaGluZV9jb250cmlidXRvciAgICA6ID9BcnJheTxzdHJpbmc+O1xuICBfbWFjaGluZV9kZWZpbml0aW9uICAgICA6ID9zdHJpbmc7XG4gIF9tYWNoaW5lX2xhbmd1YWdlICAgICAgIDogP3N0cmluZztcbiAgX21hY2hpbmVfbGljZW5zZSAgICAgICAgOiA/c3RyaW5nO1xuICBfbWFjaGluZV9uYW1lICAgICAgICAgICA6ID9zdHJpbmc7XG4gIF9tYWNoaW5lX3ZlcnNpb24gICAgICAgIDogP3N0cmluZztcbiAgX2ZzbF92ZXJzaW9uICAgICAgICAgICAgOiA/c3RyaW5nO1xuXG4gIF9ncmFwaF9sYXlvdXQgICAgICAgICAgIDogSnNzbUxheW91dDtcblxuXG4gIC8vIHdoYXJnYXJibCB0aGlzIGJhZGx5IG5lZWRzIHRvIGJlIGJyb2tlbiB1cCwgbW9ub2xpdGggbWFzdGVyXG4gIGNvbnN0cnVjdG9yKHtcbiAgICBzdGFydF9zdGF0ZXMsXG4gICAgY29tcGxldGUgICAgICAgID0gW10sXG4gICAgdHJhbnNpdGlvbnMsXG4gICAgbWFjaGluZV9hdXRob3IsXG4gICAgbWFjaGluZV9jb21tZW50LFxuICAgIG1hY2hpbmVfY29udHJpYnV0b3IsXG4gICAgbWFjaGluZV9kZWZpbml0aW9uLFxuICAgIG1hY2hpbmVfbGFuZ3VhZ2UsXG4gICAgbWFjaGluZV9saWNlbnNlLFxuICAgIG1hY2hpbmVfbmFtZSxcbiAgICBtYWNoaW5lX3ZlcnNpb24sXG4gICAgZnNsX3ZlcnNpb24sXG4gICAgZ3JhcGhfbGF5b3V0ID0gJ2RvdCdcbiAgfSA6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPikge1xuXG4gICAgdGhpcy5fc3RhdGUgICAgICAgICAgICAgICAgICA9IHN0YXJ0X3N0YXRlc1swXTtcbiAgICB0aGlzLl9zdGF0ZXMgICAgICAgICAgICAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX2VkZ2VzICAgICAgICAgICAgICAgICAgPSBbXTtcbiAgICB0aGlzLl9lZGdlX21hcCAgICAgICAgICAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX25hbWVkX3RyYW5zaXRpb25zICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fYWN0aW9ucyAgICAgICAgICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbnMgICAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMgPSBuZXcgTWFwKCk7ICAgLy8gdG9kb1xuXG4gICAgdGhpcy5fbWFjaGluZV9hdXRob3IgICAgICAgICA9IG1hY2hpbmVfYXV0aG9yO1xuICAgIHRoaXMuX21hY2hpbmVfY29tbWVudCAgICAgICAgPSBtYWNoaW5lX2NvbW1lbnQ7XG4gICAgdGhpcy5fbWFjaGluZV9jb250cmlidXRvciAgICA9IG1hY2hpbmVfY29udHJpYnV0b3I7XG4gICAgdGhpcy5fbWFjaGluZV9kZWZpbml0aW9uICAgICA9IG1hY2hpbmVfZGVmaW5pdGlvbjtcbiAgICB0aGlzLl9tYWNoaW5lX2xhbmd1YWdlICAgICAgID0gbWFjaGluZV9sYW5ndWFnZTtcbiAgICB0aGlzLl9tYWNoaW5lX2xpY2Vuc2UgICAgICAgID0gbWFjaGluZV9saWNlbnNlO1xuICAgIHRoaXMuX21hY2hpbmVfbmFtZSAgICAgICAgICAgPSBtYWNoaW5lX25hbWU7XG4gICAgdGhpcy5fbWFjaGluZV92ZXJzaW9uICAgICAgICA9IG1hY2hpbmVfdmVyc2lvbjtcbiAgICB0aGlzLl9mc2xfdmVyc2lvbiAgICAgICAgICAgID0gZnNsX3ZlcnNpb247XG5cbiAgICB0aGlzLl9ncmFwaF9sYXlvdXQgICAgICAgICAgID0gZ3JhcGhfbGF5b3V0O1xuXG4gICAgdHJhbnNpdGlvbnMubWFwKCAodHI6SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+KSA9PiB7XG5cbiAgICAgIGlmICh0ci5mcm9tID09PSB1bmRlZmluZWQpIHsgdGhyb3cgbmV3IEVycm9yKGB0cmFuc2l0aW9uIG11c3QgZGVmaW5lICdmcm9tJzogJHtKU09OLnN0cmluZ2lmeSh0cil9YCk7IH1cbiAgICAgIGlmICh0ci50byAgID09PSB1bmRlZmluZWQpIHsgdGhyb3cgbmV3IEVycm9yKGB0cmFuc2l0aW9uIG11c3QgZGVmaW5lICd0byc6ICR7ICBKU09OLnN0cmluZ2lmeSh0cil9YCk7IH1cblxuICAgICAgLy8gZ2V0IHRoZSBjdXJzb3JzLiAgd2hhdCBhIG1lc3NcbiAgICAgIGNvbnN0IGN1cnNvcl9mcm9tOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD5cbiAgICAgICAgICA9IHRoaXMuX3N0YXRlcy5nZXQodHIuZnJvbSlcbiAgICAgICAgIHx8IHsgbmFtZTogdHIuZnJvbSwgZnJvbTogW10sIHRvOiBbXSwgY29tcGxldGU6IGNvbXBsZXRlLmluY2x1ZGVzKHRyLmZyb20pIH07XG5cbiAgICAgIGlmICghKHRoaXMuX3N0YXRlcy5oYXModHIuZnJvbSkpKSB7XG4gICAgICAgIHRoaXMuX25ld19zdGF0ZShjdXJzb3JfZnJvbSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGN1cnNvcl90bzogSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+XG4gICAgICAgICAgPSB0aGlzLl9zdGF0ZXMuZ2V0KHRyLnRvKVxuICAgICAgICAgfHwge25hbWU6IHRyLnRvLCBmcm9tOiBbXSwgdG86IFtdLCBjb21wbGV0ZTogY29tcGxldGUuaW5jbHVkZXModHIudG8pIH07XG5cbiAgICAgIGlmICghKHRoaXMuX3N0YXRlcy5oYXModHIudG8pKSkge1xuICAgICAgICB0aGlzLl9uZXdfc3RhdGUoY3Vyc29yX3RvKTtcbiAgICAgIH1cblxuICAgICAgLy8gZ3VhcmQgYWdhaW5zdCBleGlzdGluZyBjb25uZWN0aW9ucyBiZWluZyByZS1hZGRlZFxuICAgICAgaWYgKGN1cnNvcl9mcm9tLnRvLmluY2x1ZGVzKHRyLnRvKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGFscmVhZHkgaGFzICR7SlNPTi5zdHJpbmdpZnkodHIuZnJvbSl9IHRvICR7SlNPTi5zdHJpbmdpZnkodHIudG8pfWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3Vyc29yX2Zyb20udG8ucHVzaCh0ci50byk7XG4gICAgICAgIGN1cnNvcl90by5mcm9tLnB1c2godHIuZnJvbSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGFkZCB0aGUgZWRnZTsgbm90ZSBpdHMgaWRcbiAgICAgIHRoaXMuX2VkZ2VzLnB1c2godHIpO1xuICAgICAgY29uc3QgdGhpc0VkZ2VJZDogbnVtYmVyID0gdGhpcy5fZWRnZXMubGVuZ3RoIC0gMTtcblxuICAgICAgLy8gZ3VhcmQgYWdhaW5zdCByZXBlYXRpbmcgYSB0cmFuc2l0aW9uIG5hbWVcbiAgICAgIGlmICh0ci5uYW1lKSB7XG4gICAgICAgIGlmICh0aGlzLl9uYW1lZF90cmFuc2l0aW9ucy5oYXModHIubmFtZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG5hbWVkIHRyYW5zaXRpb24gXCIke0pTT04uc3RyaW5naWZ5KHRyLm5hbWUpfVwiIGFscmVhZHkgY3JlYXRlZGApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX25hbWVkX3RyYW5zaXRpb25zLnNldCh0ci5uYW1lLCB0aGlzRWRnZUlkKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBzZXQgdXAgdGhlIG1hcHBpbmcsIHNvIHRoYXQgZWRnZXMgY2FuIGJlIGxvb2tlZCB1cCBieSBlbmRwb2ludCBwYWlyc1xuICAgICAgY29uc3QgZnJvbV9tYXBwaW5nOiBNYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fZWRnZV9tYXAuZ2V0KHRyLmZyb20pIHx8IG5ldyBNYXAoKTtcbiAgICAgIGlmICghKHRoaXMuX2VkZ2VfbWFwLmhhcyh0ci5mcm9tKSkpIHtcbiAgICAgICAgdGhpcy5fZWRnZV9tYXAuc2V0KHRyLmZyb20sIGZyb21fbWFwcGluZyk7XG4gICAgICB9XG5cbi8vICAgIGNvbnN0IHRvX21hcHBpbmcgPSBmcm9tX21hcHBpbmcuZ2V0KHRyLnRvKTtcbiAgICAgIGZyb21fbWFwcGluZy5zZXQodHIudG8sIHRoaXNFZGdlSWQpOyAvLyBhbHJlYWR5IGNoZWNrZWQgdGhhdCB0aGlzIG1hcHBpbmcgZG9lc24ndCBleGlzdCwgYWJvdmVcblxuICAgICAgLy8gc2V0IHVwIHRoZSBhY3Rpb24gbWFwcGluZywgc28gdGhhdCBhY3Rpb25zIGNhbiBiZSBsb29rZWQgdXAgYnkgb3JpZ2luXG4gICAgICBpZiAodHIuYWN0aW9uKSB7XG5cblxuICAgICAgICAvLyBmb3J3YXJkIG1hcHBpbmcgZmlyc3QgYnkgYWN0aW9uIG5hbWVcbiAgICAgICAgbGV0IGFjdGlvbk1hcDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9hY3Rpb25zLmdldCh0ci5hY3Rpb24pO1xuICAgICAgICBpZiAoIShhY3Rpb25NYXApKSB7XG4gICAgICAgICAgYWN0aW9uTWFwID0gbmV3IE1hcCgpO1xuICAgICAgICAgIHRoaXMuX2FjdGlvbnMuc2V0KHRyLmFjdGlvbiwgYWN0aW9uTWFwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhY3Rpb25NYXAuaGFzKHRyLmZyb20pKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBhY3Rpb24gJHtKU09OLnN0cmluZ2lmeSh0ci5hY3Rpb24pfSBhbHJlYWR5IGF0dGFjaGVkIHRvIG9yaWdpbiAke0pTT04uc3RyaW5naWZ5KHRyLmZyb20pfWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFjdGlvbk1hcC5zZXQodHIuZnJvbSwgdGhpc0VkZ2VJZCk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8vIHJldmVyc2UgbWFwcGluZyBmaXJzdCBieSBzdGF0ZSBvcmlnaW4gbmFtZVxuICAgICAgICBsZXQgckFjdGlvbk1hcDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHRyLmZyb20pO1xuICAgICAgICBpZiAoIShyQWN0aW9uTWFwKSkge1xuICAgICAgICAgIHJBY3Rpb25NYXAgPSBuZXcgTWFwKCk7XG4gICAgICAgICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLnNldCh0ci5mcm9tLCByQWN0aW9uTWFwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG5vIG5lZWQgdG8gdGVzdCBmb3IgcmV2ZXJzZSBtYXBwaW5nIHByZS1wcmVzZW5jZTtcbiAgICAgICAgLy8gZm9yd2FyZCBtYXBwaW5nIGFscmVhZHkgY292ZXJzIGNvbGxpc2lvbnNcbiAgICAgICAgckFjdGlvbk1hcC5zZXQodHIuYWN0aW9uLCB0aGlzRWRnZUlkKTtcblxuXG4gICAgICAgIC8vIHJldmVyc2UgbWFwcGluZyBmaXJzdCBieSBzdGF0ZSB0YXJnZXQgbmFtZVxuICAgICAgICBpZiAoISh0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLmhhcyh0ci50bykpKSB7XG4gICAgICAgICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5zZXQodHIudG8sIG5ldyBNYXAoKSk7XG4gICAgICAgIH1cblxuLyogdG9kbyBjb21lYmFja1xuICAgZnVuZGFtZW50YWwgcHJvYmxlbSBpcyByb0FjdGlvbk1hcCBuZWVkcyB0byBiZSBhIG11bHRpbWFwXG4gICAgICAgIGNvbnN0IHJvQWN0aW9uTWFwID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5nZXQodHIudG8pOyAgLy8gd2FzdGVmdWwgLSBhbHJlYWR5IGRpZCBoYXMgLSByZWZhY3RvclxuICAgICAgICBpZiAocm9BY3Rpb25NYXApIHtcbiAgICAgICAgICBpZiAocm9BY3Rpb25NYXAuaGFzKHRyLmFjdGlvbikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcm8tYWN0aW9uICR7dHIudG99IGFscmVhZHkgYXR0YWNoZWQgdG8gYWN0aW9uICR7dHIuYWN0aW9ufWApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByb0FjdGlvbk1hcC5zZXQodHIuYWN0aW9uLCB0aGlzRWRnZUlkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzaG91bGQgYmUgaW1wb3NzaWJsZSAtIGZsb3cgZG9lc25cXCd0IGtub3cgLnNldCBwcmVjZWRlcyAuZ2V0IHlldCBhZ2Fpbi4gIHNldmVyZSBlcnJvcj8nKTtcbiAgICAgICAgfVxuKi9cbiAgICAgIH1cblxuICAgIH0pO1xuXG4gIH1cblxuICBfbmV3X3N0YXRlKHN0YXRlX2NvbmZpZzogSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+KTogbU5UIHsgLy8gd2hhcmdhcmJsIGdldCB0aGF0IHN0YXRlX2NvbmZpZyBhbnkgdW5kZXIgY29udHJvbFxuXG4gICAgaWYgKHRoaXMuX3N0YXRlcy5oYXMoc3RhdGVfY29uZmlnLm5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHN0YXRlICR7SlNPTi5zdHJpbmdpZnkoc3RhdGVfY29uZmlnLm5hbWUpfSBhbHJlYWR5IGV4aXN0c2ApO1xuICAgIH1cblxuICAgIHRoaXMuX3N0YXRlcy5zZXQoc3RhdGVfY29uZmlnLm5hbWUsIHN0YXRlX2NvbmZpZyk7XG4gICAgcmV0dXJuIHN0YXRlX2NvbmZpZy5uYW1lO1xuXG4gIH1cblxuXG5cbiAgc3RhdGUoKTogbU5UIHtcbiAgICByZXR1cm4gdGhpcy5fc3RhdGU7XG4gIH1cblxuLyogd2hhcmdhcmJsIHRvZG8gbWFqb3JcbiAgIHdoZW4gd2UgcmVpbXBsZW1lbnQgdGhpcywgcmVpbnRyb2R1Y2UgdGhpcyBjaGFuZ2UgdG8gdGhlIGlzX2ZpbmFsIGNhbGxcblxuICBpc19jaGFuZ2luZygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTsgLy8gdG9kbyB3aGFyZ2FyYmxcbiAgfVxuKi9cblxuXG4gIHN0YXRlX2lzX2ZpbmFsKHdoaWNoU3RhdGU6IG1OVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAoICh0aGlzLnN0YXRlX2lzX3Rlcm1pbmFsKHdoaWNoU3RhdGUpKSAmJiAodGhpcy5zdGF0ZV9pc19jb21wbGV0ZSh3aGljaFN0YXRlKSkgKTtcbiAgfVxuXG4gIGlzX2ZpbmFsKCk6IGJvb2xlYW4ge1xuLy8gIHJldHVybiAoKCF0aGlzLmlzX2NoYW5naW5nKCkpICYmIHRoaXMuc3RhdGVfaXNfZmluYWwodGhpcy5zdGF0ZSgpKSk7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVfaXNfZmluYWwodGhpcy5zdGF0ZSgpKTtcbiAgfVxuXG4gIGdyYXBoX2xheW91dCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9ncmFwaF9sYXlvdXQ7XG4gIH1cblxuXG5cbiAgbWFjaGluZV9hdXRob3IoKTogP0FycmF5PHN0cmluZz4ge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2F1dGhvcjtcbiAgfVxuXG4gIG1hY2hpbmVfY29tbWVudCgpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9jb21tZW50O1xuICB9XG5cbiAgbWFjaGluZV9jb250cmlidXRvcigpOiA/QXJyYXk8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfY29udHJpYnV0b3I7XG4gIH1cblxuICBtYWNoaW5lX2RlZmluaXRpb24oKTogP3N0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfZGVmaW5pdGlvbjtcbiAgfVxuXG4gIG1hY2hpbmVfbGFuZ3VhZ2UoKTogP3N0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfbGFuZ3VhZ2U7XG4gIH1cblxuICBtYWNoaW5lX2xpY2Vuc2UoKTogP3N0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfbGljZW5zZTtcbiAgfVxuXG4gIG1hY2hpbmVfbmFtZSgpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9uYW1lO1xuICB9XG5cbiAgbWFjaGluZV92ZXJzaW9uKCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX3ZlcnNpb247XG4gIH1cblxuICBmc2xfdmVyc2lvbigpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fZnNsX3ZlcnNpb247XG4gIH1cblxuXG5cbiAgbWFjaGluZV9zdGF0ZSgpOiBKc3NtTWFjaGluZUludGVybmFsU3RhdGU8bU5ULCBtRFQ+IHtcblxuICAgIHJldHVybiB7XG4gICAgICBpbnRlcm5hbF9zdGF0ZV9pbXBsX3ZlcnNpb24gOiAxLFxuXG4gICAgICBhY3Rpb25zICAgICAgICAgICAgICAgIDogdGhpcy5fYWN0aW9ucyxcbiAgICAgIGVkZ2VfbWFwICAgICAgICAgICAgICAgOiB0aGlzLl9lZGdlX21hcCxcbiAgICAgIGVkZ2VzICAgICAgICAgICAgICAgICAgOiB0aGlzLl9lZGdlcyxcbiAgICAgIG5hbWVkX3RyYW5zaXRpb25zICAgICAgOiB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucyxcbiAgICAgIHJldmVyc2VfYWN0aW9ucyAgICAgICAgOiB0aGlzLl9yZXZlcnNlX2FjdGlvbnMsXG4vLyAgICByZXZlcnNlX2FjdGlvbl90YXJnZXRzIDogdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyxcbiAgICAgIHN0YXRlICAgICAgICAgICAgICAgICAgOiB0aGlzLl9zdGF0ZSxcbiAgICAgIHN0YXRlcyAgICAgICAgICAgICAgICAgOiB0aGlzLl9zdGF0ZXNcbiAgICB9O1xuXG4gIH1cblxuLypcbiAgbG9hZF9tYWNoaW5lX3N0YXRlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmYWxzZTsgLy8gdG9kbyB3aGFyZ2FyYmxcbiAgfVxuKi9cblxuXG4gIHN0YXRlcygpOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gWy4uLiB0aGlzLl9zdGF0ZXMua2V5cygpXTtcbiAgfVxuXG4gIHN0YXRlX2Zvcih3aGljaFN0YXRlOiBtTlQpOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD4ge1xuICAgIGNvbnN0IHN0YXRlOiA/SnNzbUdlbmVyaWNTdGF0ZTxtTlQ+ID0gdGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAoc3RhdGUpIHsgcmV0dXJuIHN0YXRlOyB9XG4gICAgZWxzZSAgICAgICB7IHRocm93IG5ldyBFcnJvcihgbm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHN0YXRlKX1gKTsgfVxuICB9XG5cblxuXG4gIGxpc3RfZWRnZXMoKTogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHtcbiAgICByZXR1cm4gdGhpcy5fZWRnZXM7XG4gIH1cblxuICBsaXN0X25hbWVkX3RyYW5zaXRpb25zKCk6IE1hcDxtTlQsIG51bWJlcj4ge1xuICAgIHJldHVybiB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucztcbiAgfVxuXG4gIGxpc3RfYWN0aW9ucygpOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gWy4uLiB0aGlzLl9hY3Rpb25zLmtleXMoKV07XG4gIH1cblxuXG5cbiAgZ2V0X3RyYW5zaXRpb25fYnlfc3RhdGVfbmFtZXMoZnJvbTogbU5ULCB0bzogbU5UKTogP251bWJlciB7XG5cbiAgICBjb25zdCBlbWcgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2VkZ2VfbWFwLmdldChmcm9tKTtcblxuICAgIGlmIChlbWcpIHtcbiAgICAgIHJldHVybiBlbWcuZ2V0KHRvKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgfVxuXG5cblxuICBsb29rdXBfdHJhbnNpdGlvbl9mb3IoZnJvbTogbU5ULCB0bzogbU5UKTogP0pzc21UcmFuc2l0aW9uPG1OVCwgbURUPiB7XG4gICAgY29uc3QgaWQgOiA/bnVtYmVyID0gdGhpcy5nZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyhmcm9tLCB0byk7XG4gICAgcmV0dXJuICgoaWQgPT09IHVuZGVmaW5lZCkgfHwgKGlkID09PSBudWxsKSk/IHVuZGVmaW5lZCA6IHRoaXMuX2VkZ2VzW2lkXTtcbiAgfVxuXG5cblxuICBsaXN0X3RyYW5zaXRpb25zKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSk6IEpzc21UcmFuc2l0aW9uTGlzdDxtTlQ+IHtcbiAgICByZXR1cm4ge2VudHJhbmNlczogdGhpcy5saXN0X2VudHJhbmNlcyh3aGljaFN0YXRlKSwgZXhpdHM6IHRoaXMubGlzdF9leGl0cyh3aGljaFN0YXRlKX07XG4gIH1cblxuICBsaXN0X2VudHJhbmNlcyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkpOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gKHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSkgfHwge30pLmZyb20gfHwgW107XG4gIH1cblxuICBsaXN0X2V4aXRzKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSk6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiAodGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKSB8fCB7fSkudG8gICB8fCBbXTtcbiAgfVxuXG5cblxuICBwcm9iYWJsZV9leGl0c19mb3Iod2hpY2hTdGF0ZTogbU5UKTogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHtcblxuICAgIGNvbnN0IHdzdGF0ZTogP0pzc21HZW5lcmljU3RhdGU8bU5UPiA9IHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKCEod3N0YXRlKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX0gaW4gcHJvYmFibGVfZXhpdHNfZm9yYCk7IH1cblxuICAgIGNvbnN0IHdzdGF0ZV90byA6IEFycmF5PCBtTlQgPiA9IHdzdGF0ZS50byxcblxuICAgICAgICAgIHd0ZiAgICAgICA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiAvLyB3c3RhdGVfdG9fZmlsdGVyZWQgLT4gd3RmXG4gICAgICAgICAgICAgICAgICAgID0gd3N0YXRlX3RvXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKCAod3MpIDogP0pzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9PiB0aGlzLmxvb2t1cF90cmFuc2l0aW9uX2Zvcih0aGlzLnN0YXRlKCksIHdzKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbik7XG5cbiAgICByZXR1cm4gd3RmO1xuXG4gIH1cblxuICBwcm9iYWJpbGlzdGljX3RyYW5zaXRpb24oKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc2VsZWN0ZWQgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB3ZWlnaHRlZF9yYW5kX3NlbGVjdCh0aGlzLnByb2JhYmxlX2V4aXRzX2Zvcih0aGlzLnN0YXRlKCkpKTtcbiAgICByZXR1cm4gdGhpcy50cmFuc2l0aW9uKCBzZWxlY3RlZC50byApO1xuICB9XG5cbiAgcHJvYmFiaWxpc3RpY193YWxrKG46IG51bWJlcik6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBzZXEobilcbiAgICAgICAgICAubWFwKCgpIDogbU5UID0+IHtcbiAgICAgICAgICAgICBjb25zdCBzdGF0ZV93YXM6IG1OVCA9IHRoaXMuc3RhdGUoKTtcbiAgICAgICAgICAgICB0aGlzLnByb2JhYmlsaXN0aWNfdHJhbnNpdGlvbigpO1xuICAgICAgICAgICAgIHJldHVybiBzdGF0ZV93YXM7XG4gICAgICAgICAgIH0pXG4gICAgICAgICAgLmNvbmNhdChbdGhpcy5zdGF0ZSgpXSk7XG4gIH1cblxuICBwcm9iYWJpbGlzdGljX2hpc3RvX3dhbGsobjogbnVtYmVyKTogTWFwPG1OVCwgbnVtYmVyPiB7XG4gICAgcmV0dXJuIGhpc3RvZ3JhcGgodGhpcy5wcm9iYWJpbGlzdGljX3dhbGsobikpO1xuICB9XG5cblxuXG4gIGFjdGlvbnMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpICk6IEFycmF5PG1OVD4ge1xuICAgIGNvbnN0IHdzdGF0ZSA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAod3N0YXRlKSB7IHJldHVybiBbLi4uIHdzdGF0ZS5rZXlzKCldOyB9XG4gICAgZWxzZSAgICAgICAgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuICB9XG5cbiAgbGlzdF9zdGF0ZXNfaGF2aW5nX2FjdGlvbih3aGljaFN0YXRlOiBtTlQpOiBBcnJheTxtTlQ+IHtcbiAgICBjb25zdCB3c3RhdGUgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICh3c3RhdGUpIHsgcmV0dXJuIFsuLi4gd3N0YXRlLmtleXMoKV07IH1cbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG4gIH1cblxuLy8gY29tZWJhY2tcbi8qXG4gIGxpc3RfZW50cmFuY2VfYWN0aW9ucyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkgKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uICh0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLmdldCh3aGljaFN0YXRlKSB8fCBuZXcgTWFwKCkpLnZhbHVlcygpXSAvLyB3YXN0ZWZ1bFxuICAgICAgICAgICAubWFwKCAoZWRnZUlkOmFueSkgPT4gKHRoaXMuX2VkZ2VzW2VkZ2VJZF0gOiBhbnkpKSAvLyB3aGFyZ2FyYmwgYnVybiBvdXQgYW55XG4gICAgICAgICAgIC5maWx0ZXIoIChvOmFueSkgPT4gby50byA9PT0gd2hpY2hTdGF0ZSlcbiAgICAgICAgICAgLm1hcCggZmlsdGVyZWQgPT4gZmlsdGVyZWQuZnJvbSApO1xuICB9XG4qL1xuICBsaXN0X2V4aXRfYWN0aW9ucyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkgKTogQXJyYXk8P21OVD4geyAvLyB0aGVzZSBhcmUgbU5ULCBub3QgP21OVFxuICAgIGNvbnN0IHJhX2Jhc2U6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAoIShyYV9iYXNlKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuXG4gICAgcmV0dXJuIFsuLi4gcmFfYmFzZS52YWx1ZXMoKV1cbiAgICAgICAgICAgLm1hcCAgICAoIChlZGdlSWQ6IG51bWJlcikgICAgICAgICAgICAgIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMuX2VkZ2VzW2VkZ2VJZF0gICApXG4gICAgICAgICAgIC5maWx0ZXIgKCAobzogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+KSA6IGJvb2xlYW4gICAgICAgICAgICAgICAgICA9PiBvLmZyb20gPT09IHdoaWNoU3RhdGUgKVxuICAgICAgICAgICAubWFwICAgICggKGZpbHRlcmVkOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pIDogP21OVCAgICAgICAgICAgICAgPT4gZmlsdGVyZWQuYWN0aW9uICAgICAgICk7XG4gIH1cblxuICBwcm9iYWJsZV9hY3Rpb25fZXhpdHMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpICkgOiBBcnJheTxtaXhlZD4geyAvLyB0aGVzZSBhcmUgbU5UXG4gICAgY29uc3QgcmFfYmFzZTogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICghKHJhX2Jhc2UpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG5cbiAgICByZXR1cm4gWy4uLiByYV9iYXNlLnZhbHVlcygpXVxuICAgICAgICAgICAubWFwICAgICggKGVkZ2VJZDogbnVtYmVyKTogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMuX2VkZ2VzW2VkZ2VJZF0gICApXG4gICAgICAgICAgIC5maWx0ZXIgKCAobzogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+KTogYm9vbGVhbiAgICAgPT4gby5mcm9tID09PSB3aGljaFN0YXRlIClcbiAgICAgICAgICAgLm1hcCAgICAoIChmaWx0ZXJlZCk6IG1peGVkICAgICAgICAgICAgICAgICAgICAgICAgICA9PiAoIHsgYWN0aW9uICAgICAgOiBmaWx0ZXJlZC5hY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2JhYmlsaXR5IDogZmlsdGVyZWQucHJvYmFiaWxpdHkgfSApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgfVxuXG5cblxuICBpc191bmVudGVyYWJsZSh3aGljaFN0YXRlOiBtTlQpOiBib29sZWFuIHtcbiAgICAvLyB3aGFyZ2FyYmwgc2hvdWxkIHRocm93IG9uIHVua25vd24gc3RhdGVcbiAgICByZXR1cm4gdGhpcy5saXN0X2VudHJhbmNlcyh3aGljaFN0YXRlKS5sZW5ndGggPT09IDA7XG4gIH1cblxuICBoYXNfdW5lbnRlcmFibGVzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlcygpLnNvbWUoICh4KTogYm9vbGVhbiA9PiB0aGlzLmlzX3VuZW50ZXJhYmxlKHgpKTtcbiAgfVxuXG5cblxuICBpc190ZXJtaW5hbCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZV9pc190ZXJtaW5hbCh0aGlzLnN0YXRlKCkpO1xuICB9XG5cbiAgc3RhdGVfaXNfdGVybWluYWwod2hpY2hTdGF0ZTogbU5UKTogYm9vbGVhbiB7XG4gICAgLy8gd2hhcmdhcmJsIHNob3VsZCB0aHJvdyBvbiB1bmtub3duIHN0YXRlXG4gICAgcmV0dXJuIHRoaXMubGlzdF9leGl0cyh3aGljaFN0YXRlKS5sZW5ndGggPT09IDA7XG4gIH1cblxuICBoYXNfdGVybWluYWxzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlcygpLnNvbWUoICh4KTogYm9vbGVhbiA9PiB0aGlzLnN0YXRlX2lzX3Rlcm1pbmFsKHgpKTtcbiAgfVxuXG5cblxuICBpc19jb21wbGV0ZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZV9pc19jb21wbGV0ZSh0aGlzLnN0YXRlKCkpO1xuICB9XG5cbiAgc3RhdGVfaXNfY29tcGxldGUod2hpY2hTdGF0ZTogbU5UKSA6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHdzdGF0ZTogP0pzc21HZW5lcmljU3RhdGU8bU5UPiA9IHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHdzdGF0ZSkgeyByZXR1cm4gd3N0YXRlLmNvbXBsZXRlOyB9XG4gICAgZWxzZSAgICAgICAgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuICB9XG5cbiAgaGFzX2NvbXBsZXRlcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZXMoKS5zb21lKCAoeCk6IGJvb2xlYW4gPT4gdGhpcy5zdGF0ZV9pc19jb21wbGV0ZSh4KSApO1xuICB9XG5cblxuXG4gIGFjdGlvbihuYW1lOiBtTlQsIG5ld0RhdGE/OiBtRFQpOiBib29sZWFuIHtcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBpZiAodGhpcy52YWxpZF9hY3Rpb24obmFtZSwgbmV3RGF0YSkpIHtcbiAgICAgIGNvbnN0IGVkZ2U6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHRoaXMuY3VycmVudF9hY3Rpb25fZWRnZV9mb3IobmFtZSk7XG4gICAgICB0aGlzLl9zdGF0ZSA9IGVkZ2UudG87XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHRyYW5zaXRpb24obmV3U3RhdGU6IG1OVCwgbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX3RyYW5zaXRpb24obmV3U3RhdGUsIG5ld0RhdGEpKSB7XG4gICAgICB0aGlzLl9zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvLyBjYW4gbGVhdmUgbWFjaGluZSBpbiBpbmNvbnNpc3RlbnQgc3RhdGUuICBnZW5lcmFsbHkgZG8gbm90IHVzZVxuICBmb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlOiBtTlQsIG5ld0RhdGE/OiBtRFQpOiBib29sZWFuIHtcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBpZiAodGhpcy52YWxpZF9mb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlLCBuZXdEYXRhKSkge1xuICAgICAgdGhpcy5fc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cblxuXG4gIGN1cnJlbnRfYWN0aW9uX2ZvcihhY3Rpb246IG1OVCk6IG51bWJlciB8IHZvaWQge1xuICAgIGNvbnN0IGFjdGlvbl9iYXNlOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KGFjdGlvbik7XG4gICAgcmV0dXJuIGFjdGlvbl9iYXNlPyBhY3Rpb25fYmFzZS5nZXQodGhpcy5zdGF0ZSgpKTogdW5kZWZpbmVkO1xuICB9XG5cbiAgY3VycmVudF9hY3Rpb25fZWRnZV9mb3IoYWN0aW9uOiBtTlQpOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4ge1xuICAgIGNvbnN0IGlkeDogP251bWJlciA9IHRoaXMuY3VycmVudF9hY3Rpb25fZm9yKGFjdGlvbik7XG4gICAgaWYgKChpZHggPT09IHVuZGVmaW5lZCkgfHwgKGlkeCA9PT0gbnVsbCkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIGFjdGlvbiAke0pTT04uc3RyaW5naWZ5KGFjdGlvbil9YCk7IH1cbiAgICByZXR1cm4gdGhpcy5fZWRnZXNbaWR4XTtcbiAgfVxuXG4gIHZhbGlkX2FjdGlvbihhY3Rpb246IG1OVCwgX25ld0RhdGE/OiBtRFQpOiBib29sZWFuIHsgIC8vIHRvZG8gY29tZWJhY2sgdW5pZ25vcmUgbmV3RGF0YVxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRfYWN0aW9uX2ZvcihhY3Rpb24pICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICB2YWxpZF90cmFuc2l0aW9uKG5ld1N0YXRlOiBtTlQsIF9uZXdEYXRhPzogbURUKTogYm9vbGVhbiB7ICAvLyB0b2RvIGNvbWViYWNrIHVuaWdub3JlIG5ld0RhdGFcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBjb25zdCB0cmFuc2l0aW9uX2ZvcjogP0pzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHRoaXMubG9va3VwX3RyYW5zaXRpb25fZm9yKHRoaXMuc3RhdGUoKSwgbmV3U3RhdGUpO1xuXG4gICAgaWYgKCEodHJhbnNpdGlvbl9mb3IpKSAgICAgICAgICB7IHJldHVybiBmYWxzZTsgfVxuICAgIGlmICh0cmFuc2l0aW9uX2Zvci5mb3JjZWRfb25seSkgeyByZXR1cm4gZmFsc2U7IH1cblxuICAgIHJldHVybiB0cnVlO1xuXG4gIH1cblxuICB2YWxpZF9mb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlOiBtTlQsIF9uZXdEYXRhPzogbURUKTogYm9vbGVhbiB7ICAvLyB0b2RvIGNvbWViYWNrIHVuaWdub3JlIG5ld0RhdGFcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICByZXR1cm4gKHRoaXMubG9va3VwX3RyYW5zaXRpb25fZm9yKHRoaXMuc3RhdGUoKSwgbmV3U3RhdGUpICE9PSB1bmRlZmluZWQpO1xuICB9XG5cblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIHNtPG1OVCwgbURUPih0ZW1wbGF0ZV9zdHJpbmdzOiBBcnJheTxzdHJpbmc+IC8qICwgYXJndW1lbnRzICovKTogTWFjaGluZTxtTlQsIG1EVD4ge1xuXG4gICAgLy8gZm9vYGEkezF9YiR7Mn1jYCB3aWxsIGNvbWUgaW4gYXMgKFsnYScsJ2InLCdjJ10sMSwyKVxuICAgIC8vIHRoaXMgaW5jbHVkZXMgd2hlbiBhIGFuZCBjIGFyZSBlbXB0eSBzdHJpbmdzXG4gICAgLy8gdGhlcmVmb3JlIHRlbXBsYXRlX3N0cmluZ3Mgd2lsbCBhbHdheXMgaGF2ZSBvbmUgbW9yZSBlbCB0aGFuIHRlbXBsYXRlX2FyZ3NcbiAgICAvLyB0aGVyZWZvcmUgbWFwIHRoZSBzbWFsbGVyIGNvbnRhaW5lciBhbmQgdG9zcyB0aGUgbGFzdCBvbmUgb24gb24gdGhlIHdheSBvdXRcblxuICAgIHJldHVybiBuZXcgTWFjaGluZShtYWtlKHRlbXBsYXRlX3N0cmluZ3MucmVkdWNlKFxuXG4gICAgICAvLyBpbiBnZW5lcmFsIGF2b2lkaW5nIGBhcmd1bWVudHNgIGlzIHNtYXJ0LiAgaG93ZXZlciB3aXRoIHRoZSB0ZW1wbGF0ZVxuICAgICAgLy8gc3RyaW5nIG5vdGF0aW9uLCBhcyBkZXNpZ25lZCwgaXQncyBub3QgcmVhbGx5IHdvcnRoIHRoZSBoYXNzbGVcblxuICAgICAgLyogZXNsaW50LWRpc2FibGUgZnAvbm8tYXJndW1lbnRzICovXG4gICAgICAvKiBlc2xpbnQtZGlzYWJsZSBwcmVmZXItcmVzdC1wYXJhbXMgKi9cbiAgICAgIChhY2MsIHZhbCwgaWR4KTogc3RyaW5nID0+IGAke2FjY30ke2FyZ3VtZW50c1tpZHhdfSR7dmFsfWAgIC8vIGFyZ3VtZW50c1swXSBpcyBuZXZlciBsb2FkZWQsIHNvIGFyZ3MgZG9lc24ndCBuZWVkIHRvIGJlIGdhdGVkXG4gICAgICAvKiBlc2xpbnQtZW5hYmxlICBwcmVmZXItcmVzdC1wYXJhbXMgKi9cbiAgICAgIC8qIGVzbGludC1lbmFibGUgIGZwL25vLWFyZ3VtZW50cyAqL1xuXG4gICAgKSkpO1xuXG59XG5cblxuXG5cblxuZXhwb3J0IHtcblxuICB2ZXJzaW9uLFxuXG4gIE1hY2hpbmUsXG5cbiAgbWFrZSxcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuXG4gIHNtLFxuXG4gIGFycm93X2RpcmVjdGlvbixcbiAgYXJyb3dfbGVmdF9raW5kLFxuICBhcnJvd19yaWdodF9raW5kLFxuXG4gIC8vIHRvZG8gd2hhcmdhcmJsIHRoZXNlIHNob3VsZCBiZSBleHBvcnRlZCB0byBhIHV0aWxpdHkgbGlicmFyeVxuICBzZXEsIHdlaWdodGVkX3JhbmRfc2VsZWN0LCBoaXN0b2dyYXBoLCB3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0LCB3ZWlnaHRlZF9oaXN0b19rZXlcblxufTtcbiJdfQ==