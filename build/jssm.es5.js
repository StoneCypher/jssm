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

var version = '5.11.0'; // replaced from package.js in build


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLmpzIl0sIm5hbWVzIjpbInJlZHVjZV90b182MzkiLCJyZXF1aXJlIiwicmVkdWNlIiwicGFyc2UiLCJ2ZXJzaW9uIiwiYXJyb3dfZGlyZWN0aW9uIiwiYXJyb3ciLCJTdHJpbmciLCJFcnJvciIsImFycm93X2xlZnRfa2luZCIsImFycm93X3JpZ2h0X2tpbmQiLCJjb21waWxlX3J1bGVfdHJhbnNpdGlvbl9zdGVwIiwiYWNjIiwiZnJvbSIsInRvIiwidGhpc19zZSIsIm5leHRfc2UiLCJlZGdlcyIsInVGcm9tIiwiQXJyYXkiLCJpc0FycmF5IiwidVRvIiwibWFwIiwiZiIsInQiLCJyayIsImtpbmQiLCJsayIsInJpZ2h0IiwiZm9yY2VkX29ubHkiLCJtYWluX3BhdGgiLCJyX2FjdGlvbiIsImFjdGlvbiIsInJfcHJvYmFiaWxpdHkiLCJwcm9iYWJpbGl0eSIsInB1c2giLCJsZWZ0IiwibF9hY3Rpb24iLCJsX3Byb2JhYmlsaXR5IiwibmV3X2FjYyIsImNvbmNhdCIsInNlIiwiY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uIiwicnVsZSIsImNvbXBpbGVfcnVsZV9oYW5kbGVyIiwia2V5IiwiYWdnX2FzIiwidmFsIiwidmFsdWUiLCJ0YXV0b2xvZ2llcyIsImluY2x1ZGVzIiwiSlNPTiIsInN0cmluZ2lmeSIsImNvbXBpbGUiLCJ0cmVlIiwicmVzdWx0cyIsImdyYXBoX2xheW91dCIsInRyYW5zaXRpb24iLCJzdGFydF9zdGF0ZXMiLCJlbmRfc3RhdGVzIiwiZnNsX3ZlcnNpb24iLCJtYWNoaW5lX2F1dGhvciIsIm1hY2hpbmVfY29tbWVudCIsIm1hY2hpbmVfY29udHJpYnV0b3IiLCJtYWNoaW5lX2RlZmluaXRpb24iLCJtYWNoaW5lX2xhbmd1YWdlIiwibWFjaGluZV9saWNlbnNlIiwibWFjaGluZV9uYW1lIiwibWFjaGluZV9yZWZlcmVuY2UiLCJtYWNoaW5lX3ZlcnNpb24iLCJ0ciIsImFzc2VtYmxlZF90cmFuc2l0aW9ucyIsInJlc3VsdF9jZmciLCJsZW5ndGgiLCJ0cmFuc2l0aW9ucyIsIm9uZU9ubHlLZXlzIiwib25lT25seUtleSIsIm11bHRpS2V5IiwibWFrZSIsInBsYW4iLCJNYWNoaW5lIiwiY29tcGxldGUiLCJfc3RhdGUiLCJfc3RhdGVzIiwiTWFwIiwiX2VkZ2VzIiwiX2VkZ2VfbWFwIiwiX25hbWVkX3RyYW5zaXRpb25zIiwiX2FjdGlvbnMiLCJfcmV2ZXJzZV9hY3Rpb25zIiwiX3JldmVyc2VfYWN0aW9uX3RhcmdldHMiLCJfbWFjaGluZV9hdXRob3IiLCJfbWFjaGluZV9jb21tZW50IiwiX21hY2hpbmVfY29udHJpYnV0b3IiLCJfbWFjaGluZV9kZWZpbml0aW9uIiwiX21hY2hpbmVfbGFuZ3VhZ2UiLCJfbWFjaGluZV9saWNlbnNlIiwiX21hY2hpbmVfbmFtZSIsIl9tYWNoaW5lX3ZlcnNpb24iLCJfZnNsX3ZlcnNpb24iLCJfZ3JhcGhfbGF5b3V0IiwidW5kZWZpbmVkIiwiY3Vyc29yX2Zyb20iLCJnZXQiLCJuYW1lIiwiaGFzIiwiX25ld19zdGF0ZSIsImN1cnNvcl90byIsInRoaXNFZGdlSWQiLCJzZXQiLCJmcm9tX21hcHBpbmciLCJhY3Rpb25NYXAiLCJyQWN0aW9uTWFwIiwic3RhdGVfY29uZmlnIiwid2hpY2hTdGF0ZSIsInN0YXRlX2lzX3Rlcm1pbmFsIiwic3RhdGVfaXNfY29tcGxldGUiLCJzdGF0ZV9pc19maW5hbCIsInN0YXRlIiwiaW50ZXJuYWxfc3RhdGVfaW1wbF92ZXJzaW9uIiwiYWN0aW9ucyIsImVkZ2VfbWFwIiwibmFtZWRfdHJhbnNpdGlvbnMiLCJyZXZlcnNlX2FjdGlvbnMiLCJzdGF0ZXMiLCJrZXlzIiwiZW1nIiwiaWQiLCJnZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyIsImVudHJhbmNlcyIsImxpc3RfZW50cmFuY2VzIiwiZXhpdHMiLCJsaXN0X2V4aXRzIiwid3N0YXRlIiwid3N0YXRlX3RvIiwid3RmIiwid3MiLCJsb29rdXBfdHJhbnNpdGlvbl9mb3IiLCJmaWx0ZXIiLCJCb29sZWFuIiwic2VsZWN0ZWQiLCJwcm9iYWJsZV9leGl0c19mb3IiLCJuIiwic3RhdGVfd2FzIiwicHJvYmFiaWxpc3RpY190cmFuc2l0aW9uIiwicHJvYmFiaWxpc3RpY193YWxrIiwicmFfYmFzZSIsInZhbHVlcyIsImVkZ2VJZCIsIm8iLCJmaWx0ZXJlZCIsInNvbWUiLCJ4IiwiaXNfdW5lbnRlcmFibGUiLCJuZXdEYXRhIiwidmFsaWRfYWN0aW9uIiwiZWRnZSIsImN1cnJlbnRfYWN0aW9uX2VkZ2VfZm9yIiwibmV3U3RhdGUiLCJ2YWxpZF90cmFuc2l0aW9uIiwidmFsaWRfZm9yY2VfdHJhbnNpdGlvbiIsImFjdGlvbl9iYXNlIiwiaWR4IiwiY3VycmVudF9hY3Rpb25fZm9yIiwiX25ld0RhdGEiLCJ0cmFuc2l0aW9uX2ZvciIsInNtIiwidGVtcGxhdGVfc3RyaW5ncyIsInNlcSIsIndlaWdodGVkX3JhbmRfc2VsZWN0IiwiaGlzdG9ncmFwaCIsIndlaWdodGVkX3NhbXBsZV9zZWxlY3QiLCJ3ZWlnaHRlZF9oaXN0b19rZXkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQTJCQTs7Ozs7O0FBMUJBOztBQUlBLElBQU1BLGdCQUEyQkMsUUFBUSxpQkFBUixFQUEyQkMsTUFBNUQ7O0FBd0JBLElBQU1DLFFBQStDRixRQUFRLGVBQVIsRUFBeUJFLEtBQTlFLEMsQ0FBc0Y7O0FBRXRGLElBQU1DLFVBQWdCLElBQXRCLEMsQ0FBNEI7OztBQU01Qjs7QUFFQSxTQUFTQyxlQUFULENBQXlCQyxLQUF6QixFQUErRDs7QUFFN0QsVUFBU0MsT0FBT0QsS0FBUCxDQUFUOztBQUVFLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNiLGFBQU8sT0FBUDs7QUFFRixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDYixhQUFPLE1BQVA7O0FBRUYsU0FBSyxLQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMOztBQUVmLFNBQUssS0FBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDs7QUFFZixTQUFLLEtBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDYixhQUFPLE1BQVA7O0FBRUY7QUFDRSxZQUFNLElBQUlFLEtBQUosMENBQWlERixLQUFqRCxDQUFOOztBQTFCSjtBQThCRDs7QUFFRDs7QUFNQTs7QUFFQSxTQUFTRyxlQUFULENBQXlCSCxLQUF6QixFQUEwRDs7QUFFeEQsVUFBU0MsT0FBT0QsS0FBUCxDQUFUOztBQUVFLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNiLGFBQU8sTUFBUDs7QUFFRixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLEtBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDYixhQUFPLE9BQVA7O0FBRUYsU0FBSyxJQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxLQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMO0FBQ2IsYUFBTyxNQUFQOztBQUVGLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssS0FBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDtBQUNiLGFBQU8sUUFBUDs7QUFFRjtBQUNFLFlBQU0sSUFBSUUsS0FBSiwwQ0FBaURGLEtBQWpELENBQU47O0FBMUJKO0FBOEJEOztBQUVEOztBQU1BOztBQUVBLFNBQVNJLGdCQUFULENBQTBCSixLQUExQixFQUEyRDs7QUFFekQsVUFBU0MsT0FBT0QsS0FBUCxDQUFUOztBQUVFLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNiLGFBQU8sTUFBUDs7QUFFRixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLEtBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDYixhQUFPLE9BQVA7O0FBRUYsU0FBSyxJQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxLQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMO0FBQ2IsYUFBTyxNQUFQOztBQUVGLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssS0FBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDtBQUNiLGFBQU8sUUFBUDs7QUFFRjtBQUNFLFlBQU0sSUFBSUUsS0FBSiwwQ0FBaURGLEtBQWpELENBQU47O0FBMUJKO0FBOEJEOztBQUVEOztBQU1BLFNBQVNLLDRCQUFULENBQ2FDLEdBRGIsRUFFYUMsSUFGYixFQUdhQyxFQUhiLEVBSWFDLE9BSmIsRUFLYUMsT0FMYixFQU0rQztBQUFFOztBQUUvQyxNQUFNQyxRQUE0QyxFQUFsRDs7QUFFQSxNQUFNQyxRQUF3QkMsTUFBTUMsT0FBTixDQUFjUCxJQUFkLElBQXFCQSxJQUFyQixHQUE0QixDQUFDQSxJQUFELENBQTFEO0FBQUEsTUFDTVEsTUFBd0JGLE1BQU1DLE9BQU4sQ0FBY04sRUFBZCxJQUFxQkEsRUFBckIsR0FBNEIsQ0FBQ0EsRUFBRCxDQUQxRDs7QUFHQUksUUFBTUksR0FBTixDQUFXLFVBQUNDLENBQUQsRUFBWTtBQUNyQkYsUUFBSUMsR0FBSixDQUFTLFVBQUNFLENBQUQsRUFBWTs7QUFFbkIsVUFBTUMsS0FBb0JmLGlCQUFpQkssUUFBUVcsSUFBekIsQ0FBMUI7QUFBQSxVQUNNQyxLQUFvQmxCLGdCQUFnQk0sUUFBUVcsSUFBeEIsQ0FEMUI7O0FBSUEsVUFBTUUsUUFBa0M7QUFDdENmLGNBQWNVLENBRHdCO0FBRXRDVCxZQUFjVSxDQUZ3QjtBQUd0Q0UsY0FBY0QsRUFId0I7QUFJdENJLHFCQUFjSixPQUFPLFFBSmlCO0FBS3RDSyxtQkFBY0wsT0FBTztBQUxpQixPQUF4Qzs7QUFRQSxVQUFJVixRQUFRZ0IsUUFBWixFQUEyQjtBQUFFSCxjQUFNSSxNQUFOLEdBQW9CakIsUUFBUWdCLFFBQTVCO0FBQTRDO0FBQ3pFLFVBQUloQixRQUFRa0IsYUFBWixFQUEyQjtBQUFFTCxjQUFNTSxXQUFOLEdBQW9CbkIsUUFBUWtCLGFBQTVCO0FBQTRDO0FBQ3pFLFVBQUlMLE1BQU1GLElBQU4sS0FBZSxNQUFuQixFQUEyQjtBQUFFVCxjQUFNa0IsSUFBTixDQUFXUCxLQUFYO0FBQW9COztBQUdqRCxVQUFNUSxPQUFpQztBQUNyQ3ZCLGNBQWNXLENBRHVCO0FBRXJDVixZQUFjUyxDQUZ1QjtBQUdyQ0csY0FBY0MsRUFIdUI7QUFJckNFLHFCQUFjRixPQUFPLFFBSmdCO0FBS3JDRyxtQkFBY0gsT0FBTztBQUxnQixPQUF2Qzs7QUFRQSxVQUFJWixRQUFRc0IsUUFBWixFQUEyQjtBQUFFRCxhQUFLSixNQUFMLEdBQW1CakIsUUFBUXNCLFFBQTNCO0FBQTJDO0FBQ3hFLFVBQUl0QixRQUFRdUIsYUFBWixFQUEyQjtBQUFFRixhQUFLRixXQUFMLEdBQW1CbkIsUUFBUXVCLGFBQTNCO0FBQTJDO0FBQ3hFLFVBQUlGLEtBQUtWLElBQUwsS0FBYyxNQUFsQixFQUEyQjtBQUFFVCxjQUFNa0IsSUFBTixDQUFXQyxJQUFYO0FBQW1CO0FBRWpELEtBL0JEO0FBZ0NELEdBakNEOztBQW1DQSxNQUFNRyxVQUE2QzNCLElBQUk0QixNQUFKLENBQVd2QixLQUFYLENBQW5EOztBQUVBLE1BQUlELE9BQUosRUFBYTtBQUNYLFdBQU9MLDZCQUE2QjRCLE9BQTdCLEVBQXNDekIsRUFBdEMsRUFBMENFLFFBQVFGLEVBQWxELEVBQXNERSxPQUF0RCxFQUErREEsUUFBUXlCLEVBQXZFLENBQVA7QUFDRCxHQUZELE1BRU87QUFDTCxXQUFPRixPQUFQO0FBQ0Q7QUFFRjs7QUFJRCxTQUFTRyw4QkFBVCxDQUE2Q0MsSUFBN0MsRUFBbUY7QUFBRTtBQUNuRixTQUFPaEMsNkJBQTZCLEVBQTdCLEVBQWlDZ0MsS0FBSzlCLElBQXRDLEVBQTRDOEIsS0FBS0YsRUFBTCxDQUFRM0IsRUFBcEQsRUFBd0Q2QixLQUFLRixFQUE3RCxFQUFpRUUsS0FBS0YsRUFBTCxDQUFRQSxFQUF6RSxDQUFQO0FBQ0Q7O0FBSUQsU0FBU0csb0JBQVQsQ0FBbUNELElBQW5DLEVBQW1GO0FBQUU7O0FBRW5GLE1BQUlBLEtBQUtFLEdBQUwsS0FBYSxZQUFqQixFQUErQjtBQUM3QixXQUFPLEVBQUVDLFFBQVEsWUFBVixFQUF3QkMsS0FBS0wsK0JBQStCQyxJQUEvQixDQUE3QixFQUFQO0FBQ0Q7O0FBRUQsTUFBSUEsS0FBS0UsR0FBTCxLQUFhLGtCQUFqQixFQUFxQztBQUNuQyxXQUFPLEVBQUVDLFFBQVEsa0JBQVYsRUFBOEJDLEtBQUsvQyxjQUFjMkMsS0FBS0ssS0FBbkIsQ0FBbkMsRUFBUDtBQUNEOztBQUVELE1BQU1DLGNBQThCLENBQ2xDLGNBRGtDLEVBQ2xCLGNBRGtCLEVBQ0YsWUFERSxFQUNZLGNBRFosRUFDNEIsaUJBRDVCLEVBRWxDLGlCQUZrQyxFQUVmLGdCQUZlLEVBRUcscUJBRkgsRUFFMEIsb0JBRjFCLEVBR2xDLG1CQUhrQyxFQUdiLGlCQUhhLEVBR00sYUFITixDQUFwQzs7QUFNQSxNQUFJQSxZQUFZQyxRQUFaLENBQXFCUCxLQUFLRSxHQUExQixDQUFKLEVBQW9DO0FBQ2xDLFdBQU8sRUFBRUMsUUFBUUgsS0FBS0UsR0FBZixFQUFvQkUsS0FBS0osS0FBS0ssS0FBOUIsRUFBUDtBQUNEOztBQUVELFFBQU0sSUFBSXhDLEtBQUosMENBQWlEMkMsS0FBS0MsU0FBTCxDQUFlVCxJQUFmLENBQWpELENBQU47QUFFRDs7QUFNRCxTQUFTVSxPQUFULENBQTJCQyxJQUEzQixFQUFrRjtBQUFBOztBQUFHOztBQUVuRixNQUFNQyxVQWVGO0FBQ0ZDLGtCQUFzQixFQURwQjtBQUVGQyxnQkFBc0IsRUFGcEI7QUFHRkMsa0JBQXNCLEVBSHBCO0FBSUZDLGdCQUFzQixFQUpwQjtBQUtGQyxpQkFBc0IsRUFMcEI7QUFNRkMsb0JBQXNCLEVBTnBCO0FBT0ZDLHFCQUFzQixFQVBwQjtBQVFGQyx5QkFBc0IsRUFScEI7QUFTRkMsd0JBQXNCLEVBVHBCO0FBVUZDLHNCQUFzQixFQVZwQjtBQVdGQyxxQkFBc0IsRUFYcEI7QUFZRkMsa0JBQXNCLEVBWnBCO0FBYUZDLHVCQUFzQixFQWJwQjtBQWNGQyxxQkFBc0I7QUFkcEIsR0FmSjs7QUFnQ0FmLE9BQUtoQyxHQUFMLENBQVUsVUFBQ2dELEVBQUQsRUFBa0M7O0FBRTFDLFFBQU0zQixPQUEyQkMscUJBQXFCMEIsRUFBckIsQ0FBakM7QUFBQSxRQUNNeEIsU0FBMkJILEtBQUtHLE1BRHRDO0FBQUEsUUFFTUMsTUFBMkJKLEtBQUtJLEdBRnRDLENBRjBDLENBSWtCOztBQUU1RFEsWUFBUVQsTUFBUixJQUFrQlMsUUFBUVQsTUFBUixFQUFnQk4sTUFBaEIsQ0FBdUJPLEdBQXZCLENBQWxCO0FBRUQsR0FSRDs7QUFVQSxNQUFNd0Isd0JBQTRELFlBQUcvQixNQUFILGdDQUFjZSxRQUFRLFlBQVIsQ0FBZCxFQUFsRTs7QUFFQSxNQUFNaUIsYUFBMkM7QUFDL0NkLGtCQUFlSCxRQUFRRyxZQUFSLENBQXFCZSxNQUFyQixHQUE2QmxCLFFBQVFHLFlBQXJDLEdBQW9ELENBQUNhLHNCQUFzQixDQUF0QixFQUF5QjFELElBQTFCLENBRHBCO0FBRS9DNkQsaUJBQWVIO0FBRmdDLEdBQWpEOztBQUtBLE1BQU1JLGNBQThCLENBQ2xDLGNBRGtDLEVBQ2xCLGNBRGtCLEVBQ0YsaUJBREUsRUFDaUIsaUJBRGpCLEVBQ29DLGFBRHBDLEVBQ21ELGlCQURuRCxFQUVsQyxvQkFGa0MsRUFFWixrQkFGWSxDQUFwQzs7QUFLQUEsY0FBWXJELEdBQVosQ0FBaUIsVUFBQ3NELFVBQUQsRUFBeUI7QUFDeEMsUUFBSXJCLFFBQVFxQixVQUFSLEVBQW9CSCxNQUFwQixHQUE2QixDQUFqQyxFQUFvQztBQUNsQyxZQUFNLElBQUlqRSxLQUFKLHdCQUErQm9FLFVBQS9CLDRCQUFnRXpCLEtBQUtDLFNBQUwsQ0FBZUcsUUFBUXFCLFVBQVIsQ0FBZixDQUFoRSxDQUFOO0FBQ0QsS0FGRCxNQUVPO0FBQ0wsVUFBSXJCLFFBQVFxQixVQUFSLEVBQW9CSCxNQUF4QixFQUFnQztBQUM5QkQsbUJBQVdJLFVBQVgsSUFBeUJyQixRQUFRcUIsVUFBUixFQUFvQixDQUFwQixDQUF6QjtBQUNEO0FBQ0Y7QUFDRixHQVJEOztBQVVBLEdBQUMsZ0JBQUQsRUFBbUIscUJBQW5CLEVBQTBDLG1CQUExQyxFQUErRHRELEdBQS9ELENBQW9FLFVBQUN1RCxRQUFELEVBQXVCO0FBQ3pGLFFBQUl0QixRQUFRc0IsUUFBUixFQUFrQkosTUFBdEIsRUFBOEI7QUFDNUJELGlCQUFXSyxRQUFYLElBQXVCdEIsUUFBUXNCLFFBQVIsQ0FBdkI7QUFDRDtBQUNGLEdBSkQ7O0FBTUEsU0FBT0wsVUFBUDtBQUVEOztBQU1ELFNBQVNNLElBQVQsQ0FBd0JDLElBQXhCLEVBQW1FO0FBQ2pFLFNBQU8xQixRQUFRbEQsTUFBTTRFLElBQU4sQ0FBUixDQUFQO0FBQ0Q7O0lBTUtDLE87O0FBeUJKO0FBQ0EsMEJBY2lDO0FBQUE7O0FBQUEsUUFiL0J0QixZQWErQixTQWIvQkEsWUFhK0I7QUFBQSwrQkFaL0J1QixRQVkrQjtBQUFBLFFBWi9CQSxRQVkrQixrQ0FaYixFQVlhO0FBQUEsUUFYL0JQLFdBVytCLFNBWC9CQSxXQVcrQjtBQUFBLFFBVi9CYixjQVUrQixTQVYvQkEsY0FVK0I7QUFBQSxRQVQvQkMsZUFTK0IsU0FUL0JBLGVBUytCO0FBQUEsUUFSL0JDLG1CQVErQixTQVIvQkEsbUJBUStCO0FBQUEsUUFQL0JDLGtCQU8rQixTQVAvQkEsa0JBTytCO0FBQUEsUUFOL0JDLGdCQU0rQixTQU4vQkEsZ0JBTStCO0FBQUEsUUFML0JDLGVBSytCLFNBTC9CQSxlQUsrQjtBQUFBLFFBSi9CQyxZQUkrQixTQUovQkEsWUFJK0I7QUFBQSxRQUgvQkUsZUFHK0IsU0FIL0JBLGVBRytCO0FBQUEsUUFGL0JULFdBRStCLFNBRi9CQSxXQUUrQjtBQUFBLG1DQUQvQkosWUFDK0I7QUFBQSxRQUQvQkEsWUFDK0Isc0NBRGhCLEtBQ2dCOztBQUFBOztBQUUvQixTQUFLMEIsTUFBTCxHQUErQnhCLGFBQWEsQ0FBYixDQUEvQjtBQUNBLFNBQUt5QixPQUFMLEdBQStCLElBQUlDLEdBQUosRUFBL0I7QUFDQSxTQUFLQyxNQUFMLEdBQStCLEVBQS9CO0FBQ0EsU0FBS0MsU0FBTCxHQUErQixJQUFJRixHQUFKLEVBQS9CO0FBQ0EsU0FBS0csa0JBQUwsR0FBK0IsSUFBSUgsR0FBSixFQUEvQjtBQUNBLFNBQUtJLFFBQUwsR0FBK0IsSUFBSUosR0FBSixFQUEvQjtBQUNBLFNBQUtLLGdCQUFMLEdBQStCLElBQUlMLEdBQUosRUFBL0I7QUFDQSxTQUFLTSx1QkFBTCxHQUErQixJQUFJTixHQUFKLEVBQS9CLENBVCtCLENBU2E7O0FBRTVDLFNBQUtPLGVBQUwsR0FBK0I5QixjQUEvQjtBQUNBLFNBQUsrQixnQkFBTCxHQUErQjlCLGVBQS9CO0FBQ0EsU0FBSytCLG9CQUFMLEdBQStCOUIsbUJBQS9CO0FBQ0EsU0FBSytCLG1CQUFMLEdBQStCOUIsa0JBQS9CO0FBQ0EsU0FBSytCLGlCQUFMLEdBQStCOUIsZ0JBQS9CO0FBQ0EsU0FBSytCLGdCQUFMLEdBQStCOUIsZUFBL0I7QUFDQSxTQUFLK0IsYUFBTCxHQUErQjlCLFlBQS9CO0FBQ0EsU0FBSytCLGdCQUFMLEdBQStCN0IsZUFBL0I7QUFDQSxTQUFLOEIsWUFBTCxHQUErQnZDLFdBQS9COztBQUVBLFNBQUt3QyxhQUFMLEdBQStCNUMsWUFBL0I7O0FBRUFrQixnQkFBWXBELEdBQVosQ0FBaUIsVUFBQ2dELEVBQUQsRUFBaUM7O0FBRWhELFVBQUlBLEdBQUd6RCxJQUFILEtBQVl3RixTQUFoQixFQUEyQjtBQUFFLGNBQU0sSUFBSTdGLEtBQUosdUNBQTRDMkMsS0FBS0MsU0FBTCxDQUFla0IsRUFBZixDQUE1QyxDQUFOO0FBQTBFO0FBQ3ZHLFVBQUlBLEdBQUd4RCxFQUFILEtBQVl1RixTQUFoQixFQUEyQjtBQUFFLGNBQU0sSUFBSTdGLEtBQUoscUNBQTRDMkMsS0FBS0MsU0FBTCxDQUFla0IsRUFBZixDQUE1QyxDQUFOO0FBQTBFOztBQUV2RztBQUNBLFVBQU1nQyxjQUNBLE1BQUtuQixPQUFMLENBQWFvQixHQUFiLENBQWlCakMsR0FBR3pELElBQXBCLEtBQ0EsRUFBRTJGLE1BQU1sQyxHQUFHekQsSUFBWCxFQUFpQkEsTUFBTSxFQUF2QixFQUEyQkMsSUFBSSxFQUEvQixFQUFtQ21FLFVBQVVBLFNBQVMvQixRQUFULENBQWtCb0IsR0FBR3pELElBQXJCLENBQTdDLEVBRk47O0FBSUEsVUFBSSxDQUFFLE1BQUtzRSxPQUFMLENBQWFzQixHQUFiLENBQWlCbkMsR0FBR3pELElBQXBCLENBQU4sRUFBa0M7QUFDaEMsY0FBSzZGLFVBQUwsQ0FBZ0JKLFdBQWhCO0FBQ0Q7O0FBRUQsVUFBTUssWUFDQSxNQUFLeEIsT0FBTCxDQUFhb0IsR0FBYixDQUFpQmpDLEdBQUd4RCxFQUFwQixLQUNBLEVBQUMwRixNQUFNbEMsR0FBR3hELEVBQVYsRUFBY0QsTUFBTSxFQUFwQixFQUF3QkMsSUFBSSxFQUE1QixFQUFnQ21FLFVBQVVBLFNBQVMvQixRQUFULENBQWtCb0IsR0FBR3hELEVBQXJCLENBQTFDLEVBRk47O0FBSUEsVUFBSSxDQUFFLE1BQUtxRSxPQUFMLENBQWFzQixHQUFiLENBQWlCbkMsR0FBR3hELEVBQXBCLENBQU4sRUFBZ0M7QUFDOUIsY0FBSzRGLFVBQUwsQ0FBZ0JDLFNBQWhCO0FBQ0Q7O0FBRUQ7QUFDQSxVQUFJTCxZQUFZeEYsRUFBWixDQUFlb0MsUUFBZixDQUF3Qm9CLEdBQUd4RCxFQUEzQixDQUFKLEVBQW9DO0FBQ2xDLGNBQU0sSUFBSU4sS0FBSixrQkFBeUIyQyxLQUFLQyxTQUFMLENBQWVrQixHQUFHekQsSUFBbEIsQ0FBekIsWUFBdURzQyxLQUFLQyxTQUFMLENBQWVrQixHQUFHeEQsRUFBbEIsQ0FBdkQsQ0FBTjtBQUNELE9BRkQsTUFFTztBQUNMd0Ysb0JBQVl4RixFQUFaLENBQWVxQixJQUFmLENBQW9CbUMsR0FBR3hELEVBQXZCO0FBQ0E2RixrQkFBVTlGLElBQVYsQ0FBZXNCLElBQWYsQ0FBb0JtQyxHQUFHekQsSUFBdkI7QUFDRDs7QUFFRDtBQUNBLFlBQUt3RSxNQUFMLENBQVlsRCxJQUFaLENBQWlCbUMsRUFBakI7QUFDQSxVQUFNc0MsYUFBcUIsTUFBS3ZCLE1BQUwsQ0FBWVosTUFBWixHQUFxQixDQUFoRDs7QUFFQTtBQUNBLFVBQUlILEdBQUdrQyxJQUFQLEVBQWE7QUFDWCxZQUFJLE1BQUtqQixrQkFBTCxDQUF3QmtCLEdBQXhCLENBQTRCbkMsR0FBR2tDLElBQS9CLENBQUosRUFBMEM7QUFDeEMsZ0JBQU0sSUFBSWhHLEtBQUosd0JBQStCMkMsS0FBS0MsU0FBTCxDQUFla0IsR0FBR2tDLElBQWxCLENBQS9CLHVCQUFOO0FBQ0QsU0FGRCxNQUVPO0FBQ0wsZ0JBQUtqQixrQkFBTCxDQUF3QnNCLEdBQXhCLENBQTRCdkMsR0FBR2tDLElBQS9CLEVBQXFDSSxVQUFyQztBQUNEO0FBQ0Y7O0FBRUQ7QUFDQSxVQUFNRSxlQUFpQyxNQUFLeEIsU0FBTCxDQUFlaUIsR0FBZixDQUFtQmpDLEdBQUd6RCxJQUF0QixLQUErQixJQUFJdUUsR0FBSixFQUF0RTtBQUNBLFVBQUksQ0FBRSxNQUFLRSxTQUFMLENBQWVtQixHQUFmLENBQW1CbkMsR0FBR3pELElBQXRCLENBQU4sRUFBb0M7QUFDbEMsY0FBS3lFLFNBQUwsQ0FBZXVCLEdBQWYsQ0FBbUJ2QyxHQUFHekQsSUFBdEIsRUFBNEJpRyxZQUE1QjtBQUNEOztBQUVQO0FBQ01BLG1CQUFhRCxHQUFiLENBQWlCdkMsR0FBR3hELEVBQXBCLEVBQXdCOEYsVUFBeEIsRUFsRGdELENBa0RYOztBQUVyQztBQUNBLFVBQUl0QyxHQUFHdEMsTUFBUCxFQUFlOztBQUdiO0FBQ0EsWUFBSStFLFlBQStCLE1BQUt2QixRQUFMLENBQWNlLEdBQWQsQ0FBa0JqQyxHQUFHdEMsTUFBckIsQ0FBbkM7QUFDQSxZQUFJLENBQUUrRSxTQUFOLEVBQWtCO0FBQ2hCQSxzQkFBWSxJQUFJM0IsR0FBSixFQUFaO0FBQ0EsZ0JBQUtJLFFBQUwsQ0FBY3FCLEdBQWQsQ0FBa0J2QyxHQUFHdEMsTUFBckIsRUFBNkIrRSxTQUE3QjtBQUNEOztBQUVELFlBQUlBLFVBQVVOLEdBQVYsQ0FBY25DLEdBQUd6RCxJQUFqQixDQUFKLEVBQTRCO0FBQzFCLGdCQUFNLElBQUlMLEtBQUosYUFBb0IyQyxLQUFLQyxTQUFMLENBQWVrQixHQUFHdEMsTUFBbEIsQ0FBcEIsb0NBQTRFbUIsS0FBS0MsU0FBTCxDQUFla0IsR0FBR3pELElBQWxCLENBQTVFLENBQU47QUFDRCxTQUZELE1BRU87QUFDTGtHLG9CQUFVRixHQUFWLENBQWN2QyxHQUFHekQsSUFBakIsRUFBdUIrRixVQUF2QjtBQUNEOztBQUdEO0FBQ0EsWUFBSUksYUFBZ0MsTUFBS3ZCLGdCQUFMLENBQXNCYyxHQUF0QixDQUEwQmpDLEdBQUd6RCxJQUE3QixDQUFwQztBQUNBLFlBQUksQ0FBRW1HLFVBQU4sRUFBbUI7QUFDakJBLHVCQUFhLElBQUk1QixHQUFKLEVBQWI7QUFDQSxnQkFBS0ssZ0JBQUwsQ0FBc0JvQixHQUF0QixDQUEwQnZDLEdBQUd6RCxJQUE3QixFQUFtQ21HLFVBQW5DO0FBQ0Q7O0FBRUQ7QUFDQTtBQUNBQSxtQkFBV0gsR0FBWCxDQUFldkMsR0FBR3RDLE1BQWxCLEVBQTBCNEUsVUFBMUI7O0FBR0E7QUFDQSxZQUFJLENBQUUsTUFBS2xCLHVCQUFMLENBQTZCZSxHQUE3QixDQUFpQ25DLEdBQUd4RCxFQUFwQyxDQUFOLEVBQWdEO0FBQzlDLGdCQUFLNEUsdUJBQUwsQ0FBNkJtQixHQUE3QixDQUFpQ3ZDLEdBQUd4RCxFQUFwQyxFQUF3QyxJQUFJc0UsR0FBSixFQUF4QztBQUNEOztBQUVUOzs7Ozs7Ozs7Ozs7O0FBYU87QUFFRixLQXRHRDtBQXdHRDs7OzsrQkFFVTZCLFksRUFBMEM7QUFBRTs7QUFFckQsVUFBSSxLQUFLOUIsT0FBTCxDQUFhc0IsR0FBYixDQUFpQlEsYUFBYVQsSUFBOUIsQ0FBSixFQUF5QztBQUN2QyxjQUFNLElBQUloRyxLQUFKLFlBQW1CMkMsS0FBS0MsU0FBTCxDQUFlNkQsYUFBYVQsSUFBNUIsQ0FBbkIscUJBQU47QUFDRDs7QUFFRCxXQUFLckIsT0FBTCxDQUFhMEIsR0FBYixDQUFpQkksYUFBYVQsSUFBOUIsRUFBb0NTLFlBQXBDO0FBQ0EsYUFBT0EsYUFBYVQsSUFBcEI7QUFFRDs7OzRCQUlZO0FBQ1gsYUFBTyxLQUFLdEIsTUFBWjtBQUNEOztBQUVIOzs7Ozs7Ozs7O21DQVNpQmdDLFUsRUFBMEI7QUFDdkMsYUFBVSxLQUFLQyxpQkFBTCxDQUF1QkQsVUFBdkIsQ0FBRCxJQUF5QyxLQUFLRSxpQkFBTCxDQUF1QkYsVUFBdkIsQ0FBbEQ7QUFDRDs7OytCQUVtQjtBQUN0QjtBQUNJLGFBQU8sS0FBS0csY0FBTCxDQUFvQixLQUFLQyxLQUFMLEVBQXBCLENBQVA7QUFDRDs7O21DQUVzQjtBQUNyQixhQUFPLEtBQUtsQixhQUFaO0FBQ0Q7OztxQ0FJZ0M7QUFDL0IsYUFBTyxLQUFLVCxlQUFaO0FBQ0Q7OztzQ0FFMEI7QUFDekIsYUFBTyxLQUFLQyxnQkFBWjtBQUNEOzs7MENBRXFDO0FBQ3BDLGFBQU8sS0FBS0Msb0JBQVo7QUFDRDs7O3lDQUU2QjtBQUM1QixhQUFPLEtBQUtDLG1CQUFaO0FBQ0Q7Ozt1Q0FFMkI7QUFDMUIsYUFBTyxLQUFLQyxpQkFBWjtBQUNEOzs7c0NBRTBCO0FBQ3pCLGFBQU8sS0FBS0MsZ0JBQVo7QUFDRDs7O21DQUV1QjtBQUN0QixhQUFPLEtBQUtDLGFBQVo7QUFDRDs7O3NDQUUwQjtBQUN6QixhQUFPLEtBQUtDLGdCQUFaO0FBQ0Q7OztrQ0FFc0I7QUFDckIsYUFBTyxLQUFLQyxZQUFaO0FBQ0Q7OztvQ0FJbUQ7O0FBRWxELGFBQU87QUFDTG9CLHFDQUE4QixDQUR6Qjs7QUFHTEMsaUJBQXlCLEtBQUtoQyxRQUh6QjtBQUlMaUMsa0JBQXlCLEtBQUtuQyxTQUp6QjtBQUtMckUsZUFBeUIsS0FBS29FLE1BTHpCO0FBTUxxQywyQkFBeUIsS0FBS25DLGtCQU56QjtBQU9Mb0MseUJBQXlCLEtBQUtsQyxnQkFQekI7QUFRWDtBQUNNNkIsZUFBeUIsS0FBS3BDLE1BVHpCO0FBVUwwQyxnQkFBeUIsS0FBS3pDO0FBVnpCLE9BQVA7QUFhRDs7QUFFSDs7Ozs7Ozs7NkJBT3VCO0FBQ25CLDBDQUFZLEtBQUtBLE9BQUwsQ0FBYTBDLElBQWIsRUFBWjtBQUNEOzs7OEJBRVNYLFUsRUFBd0M7QUFDaEQsVUFBTUksUUFBZ0MsS0FBS25DLE9BQUwsQ0FBYW9CLEdBQWIsQ0FBaUJXLFVBQWpCLENBQXRDO0FBQ0EsVUFBSUksS0FBSixFQUFXO0FBQUUsZUFBT0EsS0FBUDtBQUFlLE9BQTVCLE1BQ1c7QUFBRSxjQUFNLElBQUk5RyxLQUFKLG9CQUEyQjJDLEtBQUtDLFNBQUwsQ0FBZWtFLEtBQWYsQ0FBM0IsQ0FBTjtBQUE0RDtBQUMxRTs7O2lDQUkrQztBQUM5QyxhQUFPLEtBQUtqQyxNQUFaO0FBQ0Q7Ozs2Q0FFMEM7QUFDekMsYUFBTyxLQUFLRSxrQkFBWjtBQUNEOzs7bUNBRTBCO0FBQ3pCLDBDQUFZLEtBQUtDLFFBQUwsQ0FBY3FDLElBQWQsRUFBWjtBQUNEOzs7a0RBSTZCaEgsSSxFQUFXQyxFLEVBQWtCOztBQUV6RCxVQUFNZ0gsTUFBMEIsS0FBS3hDLFNBQUwsQ0FBZWlCLEdBQWYsQ0FBbUIxRixJQUFuQixDQUFoQzs7QUFFQSxVQUFJaUgsR0FBSixFQUFTO0FBQ1AsZUFBT0EsSUFBSXZCLEdBQUosQ0FBUXpGLEVBQVIsQ0FBUDtBQUNELE9BRkQsTUFFTztBQUNMLGVBQU91RixTQUFQO0FBQ0Q7QUFFRjs7OzBDQUlxQnhGLEksRUFBV0MsRSxFQUFvQztBQUNuRSxVQUFNaUgsS0FBZSxLQUFLQyw2QkFBTCxDQUFtQ25ILElBQW5DLEVBQXlDQyxFQUF6QyxDQUFyQjtBQUNBLGFBQVNpSCxPQUFPMUIsU0FBUixJQUF1QjBCLE9BQU8sSUFBL0IsR0FBdUMxQixTQUF2QyxHQUFtRCxLQUFLaEIsTUFBTCxDQUFZMEMsRUFBWixDQUExRDtBQUNEOzs7dUNBSXlFO0FBQUEsVUFBekRiLFVBQXlELHVFQUF2QyxLQUFLSSxLQUFMLEVBQXVDOztBQUN4RSxhQUFPLEVBQUNXLFdBQVcsS0FBS0MsY0FBTCxDQUFvQmhCLFVBQXBCLENBQVosRUFBNkNpQixPQUFPLEtBQUtDLFVBQUwsQ0FBZ0JsQixVQUFoQixDQUFwRCxFQUFQO0FBQ0Q7OztxQ0FFMEQ7QUFBQSxVQUE1Q0EsVUFBNEMsdUVBQTFCLEtBQUtJLEtBQUwsRUFBMEI7O0FBQ3pELGFBQU8sQ0FBQyxLQUFLbkMsT0FBTCxDQUFhb0IsR0FBYixDQUFpQlcsVUFBakIsS0FBZ0MsRUFBakMsRUFBcUNyRyxJQUFyQyxJQUE2QyxFQUFwRDtBQUNEOzs7aUNBRXNEO0FBQUEsVUFBNUNxRyxVQUE0Qyx1RUFBMUIsS0FBS0ksS0FBTCxFQUEwQjs7QUFDckQsYUFBTyxDQUFDLEtBQUtuQyxPQUFMLENBQWFvQixHQUFiLENBQWlCVyxVQUFqQixLQUFnQyxFQUFqQyxFQUFxQ3BHLEVBQXJDLElBQTZDLEVBQXBEO0FBQ0Q7Ozt1Q0FJa0JvRyxVLEVBQW9EO0FBQUE7O0FBRXJFLFVBQU1tQixTQUFpQyxLQUFLbEQsT0FBTCxDQUFhb0IsR0FBYixDQUFpQlcsVUFBakIsQ0FBdkM7QUFDQSxVQUFJLENBQUVtQixNQUFOLEVBQWU7QUFBRSxjQUFNLElBQUk3SCxLQUFKLG9CQUEyQjJDLEtBQUtDLFNBQUwsQ0FBZThELFVBQWYsQ0FBM0IsNEJBQU47QUFBdUY7O0FBRXhHLFVBQU1vQixZQUEyQkQsT0FBT3ZILEVBQXhDO0FBQUEsVUFFTXlILElBQThDO0FBQTlDLFFBQ1lELFVBQ0doSCxHQURILENBQ1EsVUFBQ2tILEVBQUQ7QUFBQSxlQUFvQyxPQUFLQyxxQkFBTCxDQUEyQixPQUFLbkIsS0FBTCxFQUEzQixFQUF5Q2tCLEVBQXpDLENBQXBDO0FBQUEsT0FEUixFQUVHRSxNQUZILENBRVVDLE9BRlYsQ0FIbEI7O0FBT0EsYUFBT0osR0FBUDtBQUVEOzs7K0NBRW1DO0FBQ2xDLFVBQU1LLFdBQXNDLG9DQUFxQixLQUFLQyxrQkFBTCxDQUF3QixLQUFLdkIsS0FBTCxFQUF4QixDQUFyQixDQUE1QztBQUNBLGFBQU8sS0FBSzdELFVBQUwsQ0FBaUJtRixTQUFTOUgsRUFBMUIsQ0FBUDtBQUNEOzs7dUNBRWtCZ0ksQyxFQUF1QjtBQUFBOztBQUN4QyxhQUFPLG1CQUFJQSxDQUFKLEVBQ0F4SCxHQURBLENBQ0ksWUFBWTtBQUNkLFlBQU15SCxZQUFpQixPQUFLekIsS0FBTCxFQUF2QjtBQUNBLGVBQUswQix3QkFBTDtBQUNBLGVBQU9ELFNBQVA7QUFDRCxPQUxELEVBTUF2RyxNQU5BLENBTU8sQ0FBQyxLQUFLOEUsS0FBTCxFQUFELENBTlAsQ0FBUDtBQU9EOzs7NkNBRXdCd0IsQyxFQUE2QjtBQUNwRCxhQUFPLDBCQUFXLEtBQUtHLGtCQUFMLENBQXdCSCxDQUF4QixDQUFYLENBQVA7QUFDRDs7OzhCQUlvRDtBQUFBLFVBQTdDNUIsVUFBNkMsdUVBQTNCLEtBQUtJLEtBQUwsRUFBMkI7O0FBQ25ELFVBQU1lLFNBQTZCLEtBQUs1QyxnQkFBTCxDQUFzQmMsR0FBdEIsQ0FBMEJXLFVBQTFCLENBQW5DO0FBQ0EsVUFBSW1CLE1BQUosRUFBWTtBQUFFLDRDQUFZQSxPQUFPUixJQUFQLEVBQVo7QUFBNkIsT0FBM0MsTUFDWTtBQUFFLGNBQU0sSUFBSXJILEtBQUosb0JBQTJCMkMsS0FBS0MsU0FBTCxDQUFlOEQsVUFBZixDQUEzQixDQUFOO0FBQWlFO0FBQ2hGOzs7OENBRXlCQSxVLEVBQTZCO0FBQ3JELFVBQU1tQixTQUE2QixLQUFLN0MsUUFBTCxDQUFjZSxHQUFkLENBQWtCVyxVQUFsQixDQUFuQztBQUNBLFVBQUltQixNQUFKLEVBQVk7QUFBRSw0Q0FBWUEsT0FBT1IsSUFBUCxFQUFaO0FBQTZCLE9BQTNDLE1BQ1k7QUFBRSxjQUFNLElBQUlySCxLQUFKLG9CQUEyQjJDLEtBQUtDLFNBQUwsQ0FBZThELFVBQWYsQ0FBM0IsQ0FBTjtBQUFpRTtBQUNoRjs7QUFFSDtBQUNBOzs7Ozs7Ozs7Ozt3Q0FRa0U7QUFBQTs7QUFBQSxVQUE5Q0EsVUFBOEMsdUVBQTVCLEtBQUtJLEtBQUwsRUFBNEI7QUFBRTtBQUNoRSxVQUFNNEIsVUFBNkIsS0FBS3pELGdCQUFMLENBQXNCYyxHQUF0QixDQUEwQlcsVUFBMUIsQ0FBbkM7QUFDQSxVQUFJLENBQUVnQyxPQUFOLEVBQWdCO0FBQUUsY0FBTSxJQUFJMUksS0FBSixvQkFBMkIyQyxLQUFLQyxTQUFMLENBQWU4RCxVQUFmLENBQTNCLENBQU47QUFBaUU7O0FBRW5GLGFBQU8sNkJBQUtnQyxRQUFRQyxNQUFSLEVBQUwsR0FDQzdILEdBREQsQ0FDVSxVQUFDOEgsTUFBRDtBQUFBLGVBQTRELE9BQUsvRCxNQUFMLENBQVkrRCxNQUFaLENBQTVEO0FBQUEsT0FEVixFQUVDVixNQUZELENBRVUsVUFBQ1csQ0FBRDtBQUFBLGVBQTREQSxFQUFFeEksSUFBRixLQUFXcUcsVUFBdkU7QUFBQSxPQUZWLEVBR0M1RixHQUhELENBR1UsVUFBQ2dJLFFBQUQ7QUFBQSxlQUE0REEsU0FBU3RILE1BQXJFO0FBQUEsT0FIVixDQUFQO0FBSUQ7Ozs0Q0FFcUU7QUFBQTs7QUFBQSxVQUFoRGtGLFVBQWdELHVFQUE5QixLQUFLSSxLQUFMLEVBQThCO0FBQUU7QUFDdEUsVUFBTTRCLFVBQTZCLEtBQUt6RCxnQkFBTCxDQUFzQmMsR0FBdEIsQ0FBMEJXLFVBQTFCLENBQW5DO0FBQ0EsVUFBSSxDQUFFZ0MsT0FBTixFQUFnQjtBQUFFLGNBQU0sSUFBSTFJLEtBQUosb0JBQTJCMkMsS0FBS0MsU0FBTCxDQUFlOEQsVUFBZixDQUEzQixDQUFOO0FBQWlFOztBQUVuRixhQUFPLDZCQUFLZ0MsUUFBUUMsTUFBUixFQUFMLEdBQ0M3SCxHQURELENBQ1UsVUFBQzhILE1BQUQ7QUFBQSxlQUE4QyxPQUFLL0QsTUFBTCxDQUFZK0QsTUFBWixDQUE5QztBQUFBLE9BRFYsRUFFQ1YsTUFGRCxDQUVVLFVBQUNXLENBQUQ7QUFBQSxlQUE4Q0EsRUFBRXhJLElBQUYsS0FBV3FHLFVBQXpEO0FBQUEsT0FGVixFQUdDNUYsR0FIRCxDQUdVLFVBQUNnSSxRQUFEO0FBQUEsZUFBZ0QsRUFBRXRILFFBQWNzSCxTQUFTdEgsTUFBekI7QUFDRUUsdUJBQWNvSCxTQUFTcEgsV0FEekIsRUFBaEQ7QUFBQSxPQUhWLENBQVA7QUFNRDs7O21DQUljZ0YsVSxFQUEwQjtBQUN2QztBQUNBLGFBQU8sS0FBS2dCLGNBQUwsQ0FBb0JoQixVQUFwQixFQUFnQ3pDLE1BQWhDLEtBQTJDLENBQWxEO0FBQ0Q7Ozt1Q0FFMkI7QUFBQTs7QUFDMUIsYUFBTyxLQUFLbUQsTUFBTCxHQUFjMkIsSUFBZCxDQUFvQixVQUFDQyxDQUFEO0FBQUEsZUFBZ0IsT0FBS0MsY0FBTCxDQUFvQkQsQ0FBcEIsQ0FBaEI7QUFBQSxPQUFwQixDQUFQO0FBQ0Q7OztrQ0FJc0I7QUFDckIsYUFBTyxLQUFLckMsaUJBQUwsQ0FBdUIsS0FBS0csS0FBTCxFQUF2QixDQUFQO0FBQ0Q7OztzQ0FFaUJKLFUsRUFBMEI7QUFDMUM7QUFDQSxhQUFPLEtBQUtrQixVQUFMLENBQWdCbEIsVUFBaEIsRUFBNEJ6QyxNQUE1QixLQUF1QyxDQUE5QztBQUNEOzs7b0NBRXdCO0FBQUE7O0FBQ3ZCLGFBQU8sS0FBS21ELE1BQUwsR0FBYzJCLElBQWQsQ0FBb0IsVUFBQ0MsQ0FBRDtBQUFBLGVBQWdCLE9BQUtyQyxpQkFBTCxDQUF1QnFDLENBQXZCLENBQWhCO0FBQUEsT0FBcEIsQ0FBUDtBQUNEOzs7a0NBSXNCO0FBQ3JCLGFBQU8sS0FBS3BDLGlCQUFMLENBQXVCLEtBQUtFLEtBQUwsRUFBdkIsQ0FBUDtBQUNEOzs7c0NBRWlCSixVLEVBQTJCO0FBQzNDLFVBQU1tQixTQUFpQyxLQUFLbEQsT0FBTCxDQUFhb0IsR0FBYixDQUFpQlcsVUFBakIsQ0FBdkM7QUFDQSxVQUFJbUIsTUFBSixFQUFZO0FBQUUsZUFBT0EsT0FBT3BELFFBQWQ7QUFBeUIsT0FBdkMsTUFDWTtBQUFFLGNBQU0sSUFBSXpFLEtBQUosb0JBQTJCMkMsS0FBS0MsU0FBTCxDQUFlOEQsVUFBZixDQUEzQixDQUFOO0FBQWlFO0FBQ2hGOzs7b0NBRXdCO0FBQUE7O0FBQ3ZCLGFBQU8sS0FBS1UsTUFBTCxHQUFjMkIsSUFBZCxDQUFvQixVQUFDQyxDQUFEO0FBQUEsZUFBZ0IsT0FBS3BDLGlCQUFMLENBQXVCb0MsQ0FBdkIsQ0FBaEI7QUFBQSxPQUFwQixDQUFQO0FBQ0Q7OzsyQkFJTWhELEksRUFBV2tELE8sRUFBd0I7QUFDeEM7QUFDQTtBQUNBO0FBQ0EsVUFBSSxLQUFLQyxZQUFMLENBQWtCbkQsSUFBbEIsRUFBd0JrRCxPQUF4QixDQUFKLEVBQXNDO0FBQ3BDLFlBQU1FLE9BQWlDLEtBQUtDLHVCQUFMLENBQTZCckQsSUFBN0IsQ0FBdkM7QUFDQSxhQUFLdEIsTUFBTCxHQUFjMEUsS0FBSzlJLEVBQW5CO0FBQ0EsZUFBTyxJQUFQO0FBQ0QsT0FKRCxNQUlPO0FBQ0wsZUFBTyxLQUFQO0FBQ0Q7QUFDRjs7OytCQUVVZ0osUSxFQUFlSixPLEVBQXdCO0FBQ2hEO0FBQ0E7QUFDQTtBQUNBLFVBQUksS0FBS0ssZ0JBQUwsQ0FBc0JELFFBQXRCLEVBQWdDSixPQUFoQyxDQUFKLEVBQThDO0FBQzVDLGFBQUt4RSxNQUFMLEdBQWM0RSxRQUFkO0FBQ0EsZUFBTyxJQUFQO0FBQ0QsT0FIRCxNQUdPO0FBQ0wsZUFBTyxLQUFQO0FBQ0Q7QUFDRjs7QUFFRDs7OztxQ0FDaUJBLFEsRUFBZUosTyxFQUF3QjtBQUN0RDtBQUNBO0FBQ0E7QUFDQSxVQUFJLEtBQUtNLHNCQUFMLENBQTRCRixRQUE1QixFQUFzQ0osT0FBdEMsQ0FBSixFQUFvRDtBQUNsRCxhQUFLeEUsTUFBTCxHQUFjNEUsUUFBZDtBQUNBLGVBQU8sSUFBUDtBQUNELE9BSEQsTUFHTztBQUNMLGVBQU8sS0FBUDtBQUNEO0FBQ0Y7Ozt1Q0FJa0I5SCxNLEVBQTRCO0FBQzdDLFVBQU1pSSxjQUFpQyxLQUFLekUsUUFBTCxDQUFjZSxHQUFkLENBQWtCdkUsTUFBbEIsQ0FBdkM7QUFDQSxhQUFPaUksY0FBYUEsWUFBWTFELEdBQVosQ0FBZ0IsS0FBS2UsS0FBTCxFQUFoQixDQUFiLEdBQTRDakIsU0FBbkQ7QUFDRDs7OzRDQUV1QnJFLE0sRUFBdUM7QUFDN0QsVUFBTWtJLE1BQWUsS0FBS0Msa0JBQUwsQ0FBd0JuSSxNQUF4QixDQUFyQjtBQUNBLFVBQUtrSSxRQUFRN0QsU0FBVCxJQUF3QjZELFFBQVEsSUFBcEMsRUFBMkM7QUFBRSxjQUFNLElBQUkxSixLQUFKLHFCQUE0QjJDLEtBQUtDLFNBQUwsQ0FBZXBCLE1BQWYsQ0FBNUIsQ0FBTjtBQUE4RDtBQUMzRyxhQUFPLEtBQUtxRCxNQUFMLENBQVk2RSxHQUFaLENBQVA7QUFDRDs7O2lDQUVZbEksTSxFQUFhb0ksUSxFQUF5QjtBQUFHO0FBQ3BEO0FBQ0E7QUFDQTtBQUNBLGFBQU8sS0FBS0Qsa0JBQUwsQ0FBd0JuSSxNQUF4QixNQUFvQ3FFLFNBQTNDO0FBQ0Q7OztxQ0FFZ0J5RCxRLEVBQWVNLFEsRUFBeUI7QUFBRztBQUMxRDtBQUNBO0FBRUEsVUFBTUMsaUJBQTRDLEtBQUs1QixxQkFBTCxDQUEyQixLQUFLbkIsS0FBTCxFQUEzQixFQUF5Q3dDLFFBQXpDLENBQWxEOztBQUVBLFVBQUksQ0FBRU8sY0FBTixFQUFnQztBQUFFLGVBQU8sS0FBUDtBQUFlO0FBQ2pELFVBQUlBLGVBQWV4SSxXQUFuQixFQUFnQztBQUFFLGVBQU8sS0FBUDtBQUFlOztBQUVqRCxhQUFPLElBQVA7QUFFRDs7OzJDQUVzQmlJLFEsRUFBZU0sUSxFQUF5QjtBQUFHO0FBQ2hFO0FBQ0E7QUFDQTtBQUNBLGFBQVEsS0FBSzNCLHFCQUFMLENBQTJCLEtBQUtuQixLQUFMLEVBQTNCLEVBQXlDd0MsUUFBekMsTUFBdUR6RCxTQUEvRDtBQUNEOzs7Ozs7QUFTSCxTQUFTaUUsRUFBVCxDQUFzQkMsZ0JBQXRCLENBQXNELGlCQUF0RCxFQUE0RjtBQUFBOzs7QUFFeEY7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsU0FBTyxJQUFJdkYsT0FBSixDQUFZRixLQUFLeUYsaUJBQWlCckssTUFBakI7O0FBRXRCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFlBQUNVLEdBQUQsRUFBTW1DLEdBQU4sRUFBV21ILEdBQVg7QUFBQSxnQkFBOEJ0SixHQUE5QixHQUFvQyxXQUFVc0osR0FBVixDQUFwQyxHQUFxRG5ILEdBQXJEO0FBQUEsR0FQc0IsQ0FPc0M7QUFDNUQ7QUFDQTs7QUFUc0IsR0FBTCxDQUFaLENBQVA7QUFhSDs7UUFRQzNDLE8sR0FBQUEsTztRQUVBNEUsTyxHQUFBQSxPO1FBRUFGLEksR0FBQUEsSTtRQUNFM0UsSyxHQUFBQSxLO1FBQ0FrRCxPLEdBQUFBLE87UUFFRmlILEUsR0FBQUEsRTtRQUVBakssZSxHQUFBQSxlO1FBQ0FJLGUsR0FBQUEsZTtRQUNBQyxnQixHQUFBQSxnQjtRQUdBOEosRztRQUFLQyxvQjtRQUFzQkMsVTtRQUFZQyxzQjtRQUF3QkMsa0IiLCJmaWxlIjoianNzbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxyXG4vLyB3aGFyZ2FyYmwgbG90cyBvZiB0aGVzZSByZXR1cm4gYXJyYXlzIGNvdWxkL3Nob3VsZCBiZSBzZXRzXHJcblxyXG4vLyBAZmxvd1xyXG5cclxuY29uc3QgcmVkdWNlX3RvXzYzOSA6IEZ1bmN0aW9uID0gcmVxdWlyZSgncmVkdWNlLXRvLTYzOS0xJykucmVkdWNlO1xyXG5cclxuXHJcblxyXG5cclxuXHJcbmltcG9ydCB0eXBlIHtcclxuXHJcbiAgSnNzbUdlbmVyaWNTdGF0ZSwgSnNzbUdlbmVyaWNDb25maWcsXHJcbiAgSnNzbVRyYW5zaXRpb24sIEpzc21UcmFuc2l0aW9uTGlzdCxcclxuICBKc3NtTWFjaGluZUludGVybmFsU3RhdGUsXHJcbiAgSnNzbVBhcnNlVHJlZSxcclxuICBKc3NtQ29tcGlsZVNlLCBKc3NtQ29tcGlsZVNlU3RhcnQsIEpzc21Db21waWxlUnVsZSxcclxuICBKc3NtQXJyb3csIEpzc21BcnJvd0RpcmVjdGlvbiwgSnNzbUFycm93S2luZCxcclxuICBKc3NtTGF5b3V0XHJcblxyXG59IGZyb20gJy4vanNzbS10eXBlcyc7XHJcblxyXG5cclxuXHJcblxyXG5cclxuaW1wb3J0IHsgc2VxLCB3ZWlnaHRlZF9yYW5kX3NlbGVjdCwgd2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCwgaGlzdG9ncmFwaCwgd2VpZ2h0ZWRfaGlzdG9fa2V5IH0gZnJvbSAnLi9qc3NtLXV0aWwuanMnO1xyXG5cclxuY29uc3QgcGFyc2U6IDxOVCwgRFQ+KHN0cmluZykgPT4gSnNzbVBhcnNlVHJlZTxOVD4gPSByZXF1aXJlKCcuL2pzc20tZG90LmpzJykucGFyc2U7ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXMgLy8gdG9kbyB3aGFyZ2FyYmwgcmVtb3ZlIGFueVxyXG5cclxuY29uc3QgdmVyc2lvbjogbnVsbCA9IG51bGw7IC8vIHJlcGxhY2VkIGZyb20gcGFja2FnZS5qcyBpbiBidWlsZFxyXG5cclxuXHJcblxyXG5cclxuXHJcbi8qIGVzbGludC1kaXNhYmxlIGNvbXBsZXhpdHkgKi9cclxuXHJcbmZ1bmN0aW9uIGFycm93X2RpcmVjdGlvbihhcnJvdzogSnNzbUFycm93KTogSnNzbUFycm93RGlyZWN0aW9uIHtcclxuXHJcbiAgc3dpdGNoICggU3RyaW5nKGFycm93KSApIHtcclxuXHJcbiAgICBjYXNlICctPicgOiAgICBjYXNlICfihpInIDpcclxuICAgIGNhc2UgJz0+JyA6ICAgIGNhc2UgJ+KHkicgOlxyXG4gICAgY2FzZSAnfj4nIDogICAgY2FzZSAn4oabJyA6XHJcbiAgICAgIHJldHVybiAncmlnaHQnO1xyXG5cclxuICAgIGNhc2UgJzwtJyA6ICAgIGNhc2UgJ+KGkCcgOlxyXG4gICAgY2FzZSAnPD0nIDogICAgY2FzZSAn4oeQJyA6XHJcbiAgICBjYXNlICc8ficgOiAgICBjYXNlICfihponIDpcclxuICAgICAgcmV0dXJuICdsZWZ0JztcclxuXHJcbiAgICBjYXNlICc8LT4nOiAgICBjYXNlICfihpQnIDpcclxuICAgIGNhc2UgJzwtPT4nOiAgIGNhc2UgJ+KGkOKHkicgOlxyXG4gICAgY2FzZSAnPC1+Pic6ICAgY2FzZSAn4oaQ4oabJyA6XHJcblxyXG4gICAgY2FzZSAnPD0+JzogICAgY2FzZSAn4oeUJyA6XHJcbiAgICBjYXNlICc8PS0+JzogICBjYXNlICfih5DihpInIDpcclxuICAgIGNhc2UgJzw9fj4nOiAgIGNhc2UgJ+KHkOKGmycgOlxyXG5cclxuICAgIGNhc2UgJzx+Pic6ICAgIGNhc2UgJ+KGricgOlxyXG4gICAgY2FzZSAnPH4tPic6ICAgY2FzZSAn4oaa4oaSJyA6XHJcbiAgICBjYXNlICc8fj0+JzogICBjYXNlICfihprih5InIDpcclxuICAgICAgcmV0dXJuICdib3RoJztcclxuXHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGFycm93X2RpcmVjdGlvbjogdW5rbm93biBhcnJvdyB0eXBlICR7YXJyb3d9YCk7XHJcblxyXG4gIH1cclxuXHJcbn1cclxuXHJcbi8qIGVzbGludC1lbmFibGUgY29tcGxleGl0eSAqL1xyXG5cclxuXHJcblxyXG5cclxuXHJcbi8qIGVzbGludC1kaXNhYmxlIGNvbXBsZXhpdHkgKi9cclxuXHJcbmZ1bmN0aW9uIGFycm93X2xlZnRfa2luZChhcnJvdzogSnNzbUFycm93KTogSnNzbUFycm93S2luZCB7XHJcblxyXG4gIHN3aXRjaCAoIFN0cmluZyhhcnJvdykgKSB7XHJcblxyXG4gICAgY2FzZSAnLT4nIDogICAgY2FzZSAn4oaSJyA6XHJcbiAgICBjYXNlICc9PicgOiAgICBjYXNlICfih5InIDpcclxuICAgIGNhc2UgJ34+JyA6ICAgIGNhc2UgJ+KGmycgOlxyXG4gICAgICByZXR1cm4gJ25vbmUnO1xyXG5cclxuICAgIGNhc2UgJzwtJzogICAgIGNhc2UgJ+KGkCcgOlxyXG4gICAgY2FzZSAnPC0+JzogICAgY2FzZSAn4oaUJyA6XHJcbiAgICBjYXNlICc8LT0+JzogICBjYXNlICfihpDih5InIDpcclxuICAgIGNhc2UgJzwtfj4nOiAgIGNhc2UgJ+KGkOKGmycgOlxyXG4gICAgICByZXR1cm4gJ2xlZ2FsJztcclxuXHJcbiAgICBjYXNlICc8PSc6ICAgICBjYXNlICfih5AnIDpcclxuICAgIGNhc2UgJzw9Pic6ICAgIGNhc2UgJ+KHlCcgOlxyXG4gICAgY2FzZSAnPD0tPic6ICAgY2FzZSAn4oeQ4oaSJyA6XHJcbiAgICBjYXNlICc8PX4+JzogICBjYXNlICfih5DihpsnIDpcclxuICAgICAgcmV0dXJuICdtYWluJztcclxuXHJcbiAgICBjYXNlICc8fic6ICAgICBjYXNlICfihponIDpcclxuICAgIGNhc2UgJzx+Pic6ICAgIGNhc2UgJ+KGricgOlxyXG4gICAgY2FzZSAnPH4tPic6ICAgY2FzZSAn4oaa4oaSJyA6XHJcbiAgICBjYXNlICc8fj0+JzogICBjYXNlICfihprih5InIDpcclxuICAgICAgcmV0dXJuICdmb3JjZWQnO1xyXG5cclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXJyb3dfZGlyZWN0aW9uOiB1bmtub3duIGFycm93IHR5cGUgJHthcnJvd31gKTtcclxuXHJcbiAgfVxyXG5cclxufVxyXG5cclxuLyogZXNsaW50LWVuYWJsZSBjb21wbGV4aXR5ICovXHJcblxyXG5cclxuXHJcblxyXG5cclxuLyogZXNsaW50LWRpc2FibGUgY29tcGxleGl0eSAqL1xyXG5cclxuZnVuY3Rpb24gYXJyb3dfcmlnaHRfa2luZChhcnJvdzogSnNzbUFycm93KTogSnNzbUFycm93S2luZCB7XHJcblxyXG4gIHN3aXRjaCAoIFN0cmluZyhhcnJvdykgKSB7XHJcblxyXG4gICAgY2FzZSAnPC0nIDogICAgY2FzZSAn4oaQJyA6XHJcbiAgICBjYXNlICc8PScgOiAgICBjYXNlICfih5AnIDpcclxuICAgIGNhc2UgJzx+JyA6ICAgIGNhc2UgJ+KGmicgOlxyXG4gICAgICByZXR1cm4gJ25vbmUnO1xyXG5cclxuICAgIGNhc2UgJy0+JyA6ICAgIGNhc2UgJ+KGkicgOlxyXG4gICAgY2FzZSAnPC0+JzogICAgY2FzZSAn4oaUJyA6XHJcbiAgICBjYXNlICc8PS0+JzogICBjYXNlICfih5DihpInIDpcclxuICAgIGNhc2UgJzx+LT4nOiAgIGNhc2UgJ+KGmuKGkicgOlxyXG4gICAgICByZXR1cm4gJ2xlZ2FsJztcclxuXHJcbiAgICBjYXNlICc9PicgOiAgICBjYXNlICfih5InIDpcclxuICAgIGNhc2UgJzw9Pic6ICAgIGNhc2UgJ+KHlCcgOlxyXG4gICAgY2FzZSAnPC09Pic6ICAgY2FzZSAn4oaQ4oeSJyA6XHJcbiAgICBjYXNlICc8fj0+JzogICBjYXNlICfihprih5InIDpcclxuICAgICAgcmV0dXJuICdtYWluJztcclxuXHJcbiAgICBjYXNlICd+PicgOiAgICBjYXNlICfihpsnIDpcclxuICAgIGNhc2UgJzx+Pic6ICAgIGNhc2UgJ+KGricgOlxyXG4gICAgY2FzZSAnPC1+Pic6ICAgY2FzZSAn4oaQ4oabJyA6XHJcbiAgICBjYXNlICc8PX4+JzogICBjYXNlICfih5DihpsnIDpcclxuICAgICAgcmV0dXJuICdmb3JjZWQnO1xyXG5cclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXJyb3dfZGlyZWN0aW9uOiB1bmtub3duIGFycm93IHR5cGUgJHthcnJvd31gKTtcclxuXHJcbiAgfVxyXG5cclxufVxyXG5cclxuLyogZXNsaW50LWVuYWJsZSBjb21wbGV4aXR5ICovXHJcblxyXG5cclxuXHJcblxyXG5cclxuZnVuY3Rpb24gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcDxtTlQsIG1EVD4oXHJcbiAgICAgICAgICAgICBhY2MgICAgIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+LFxyXG4gICAgICAgICAgICAgZnJvbSAgICA6IG1OVCxcclxuICAgICAgICAgICAgIHRvICAgICAgOiBtTlQsXHJcbiAgICAgICAgICAgICB0aGlzX3NlIDogSnNzbUNvbXBpbGVTZTxtTlQ+LFxyXG4gICAgICAgICAgICAgbmV4dF9zZSA6IEpzc21Db21waWxlU2U8bU5UPlxyXG4gICAgICAgICApIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHsgLy8gdG9kbyBmbG93IGRlc2NyaWJlIHRoZSBwYXJzZXIgcmVwcmVzZW50YXRpb24gb2YgYSB0cmFuc2l0aW9uIHN0ZXAgZXh0ZW5zaW9uXHJcblxyXG4gIGNvbnN0IGVkZ2VzIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+ID0gW107XHJcblxyXG4gIGNvbnN0IHVGcm9tIDogQXJyYXk8IG1OVCA+ID0gKEFycmF5LmlzQXJyYXkoZnJvbSk/IGZyb20gOiBbZnJvbV0pLFxyXG4gICAgICAgIHVUbyAgIDogQXJyYXk8IG1OVCA+ID0gKEFycmF5LmlzQXJyYXkodG8pPyAgIHRvICAgOiBbdG9dICApO1xyXG5cclxuICB1RnJvbS5tYXAoIChmOiBtTlQpID0+IHtcclxuICAgIHVUby5tYXAoICh0OiBtTlQpID0+IHtcclxuXHJcbiAgICAgIGNvbnN0IHJrOiBKc3NtQXJyb3dLaW5kID0gYXJyb3dfcmlnaHRfa2luZCh0aGlzX3NlLmtpbmQpLFxyXG4gICAgICAgICAgICBsazogSnNzbUFycm93S2luZCA9IGFycm93X2xlZnRfa2luZCh0aGlzX3NlLmtpbmQpO1xyXG5cclxuXHJcbiAgICAgIGNvbnN0IHJpZ2h0OiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB7XHJcbiAgICAgICAgZnJvbSAgICAgICAgOiBmLFxyXG4gICAgICAgIHRvICAgICAgICAgIDogdCxcclxuICAgICAgICBraW5kICAgICAgICA6IHJrLFxyXG4gICAgICAgIGZvcmNlZF9vbmx5IDogcmsgPT09ICdmb3JjZWQnLFxyXG4gICAgICAgIG1haW5fcGF0aCAgIDogcmsgPT09ICdtYWluJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgaWYgKHRoaXNfc2Uucl9hY3Rpb24pICAgICAgeyByaWdodC5hY3Rpb24gICAgICA9IHRoaXNfc2Uucl9hY3Rpb247ICAgICAgfVxyXG4gICAgICBpZiAodGhpc19zZS5yX3Byb2JhYmlsaXR5KSB7IHJpZ2h0LnByb2JhYmlsaXR5ID0gdGhpc19zZS5yX3Byb2JhYmlsaXR5OyB9XHJcbiAgICAgIGlmIChyaWdodC5raW5kICE9PSAnbm9uZScpIHsgZWRnZXMucHVzaChyaWdodCk7IH1cclxuXHJcblxyXG4gICAgICBjb25zdCBsZWZ0OiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB7XHJcbiAgICAgICAgZnJvbSAgICAgICAgOiB0LFxyXG4gICAgICAgIHRvICAgICAgICAgIDogZixcclxuICAgICAgICBraW5kICAgICAgICA6IGxrLFxyXG4gICAgICAgIGZvcmNlZF9vbmx5IDogbGsgPT09ICdmb3JjZWQnLFxyXG4gICAgICAgIG1haW5fcGF0aCAgIDogbGsgPT09ICdtYWluJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgaWYgKHRoaXNfc2UubF9hY3Rpb24pICAgICAgeyBsZWZ0LmFjdGlvbiAgICAgID0gdGhpc19zZS5sX2FjdGlvbjsgICAgICB9XHJcbiAgICAgIGlmICh0aGlzX3NlLmxfcHJvYmFiaWxpdHkpIHsgbGVmdC5wcm9iYWJpbGl0eSA9IHRoaXNfc2UubF9wcm9iYWJpbGl0eTsgfVxyXG4gICAgICBpZiAobGVmdC5raW5kICE9PSAnbm9uZScpICB7IGVkZ2VzLnB1c2gobGVmdCk7IH1cclxuXHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgY29uc3QgbmV3X2FjYzogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+ID0gYWNjLmNvbmNhdChlZGdlcyk7XHJcblxyXG4gIGlmIChuZXh0X3NlKSB7XHJcbiAgICByZXR1cm4gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcChuZXdfYWNjLCB0bywgbmV4dF9zZS50bywgbmV4dF9zZSwgbmV4dF9zZS5zZSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiBuZXdfYWNjO1xyXG4gIH1cclxuXHJcbn1cclxuXHJcblxyXG5cclxuZnVuY3Rpb24gY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uPG1OVD4ocnVsZTogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pOiBtaXhlZCB7IC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgcGFyc2VyIHJlcHJlc2VudGF0aW9uIG9mIGEgdHJhbnNpdGlvblxyXG4gIHJldHVybiBjb21waWxlX3J1bGVfdHJhbnNpdGlvbl9zdGVwKFtdLCBydWxlLmZyb20sIHJ1bGUuc2UudG8sIHJ1bGUuc2UsIHJ1bGUuc2Uuc2UpO1xyXG59XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIGNvbXBpbGVfcnVsZV9oYW5kbGVyPG1OVD4ocnVsZTogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pOiBKc3NtQ29tcGlsZVJ1bGUgeyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIG91dHB1dCBvZiB0aGUgcGFyc2VyXHJcblxyXG4gIGlmIChydWxlLmtleSA9PT0gJ3RyYW5zaXRpb24nKSB7XHJcbiAgICByZXR1cm4geyBhZ2dfYXM6ICd0cmFuc2l0aW9uJywgdmFsOiBjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb24ocnVsZSkgfTtcclxuICB9XHJcblxyXG4gIGlmIChydWxlLmtleSA9PT0gJ21hY2hpbmVfbGFuZ3VhZ2UnKSB7XHJcbiAgICByZXR1cm4geyBhZ2dfYXM6ICdtYWNoaW5lX2xhbmd1YWdlJywgdmFsOiByZWR1Y2VfdG9fNjM5KHJ1bGUudmFsdWUpIH07XHJcbiAgfVxyXG5cclxuICBjb25zdCB0YXV0b2xvZ2llcyA6IEFycmF5PHN0cmluZz4gPSBbXHJcbiAgICAnZ3JhcGhfbGF5b3V0JywgJ3N0YXJ0X3N0YXRlcycsICdlbmRfc3RhdGVzJywgJ21hY2hpbmVfbmFtZScsICdtYWNoaW5lX3ZlcnNpb24nLFxyXG4gICAgJ21hY2hpbmVfY29tbWVudCcsICdtYWNoaW5lX2F1dGhvcicsICdtYWNoaW5lX2NvbnRyaWJ1dG9yJywgJ21hY2hpbmVfZGVmaW5pdGlvbicsXHJcbiAgICAnbWFjaGluZV9yZWZlcmVuY2UnLCAnbWFjaGluZV9saWNlbnNlJywgJ2ZzbF92ZXJzaW9uJ1xyXG4gIF07XHJcblxyXG4gIGlmICh0YXV0b2xvZ2llcy5pbmNsdWRlcyhydWxlLmtleSkpIHtcclxuICAgIHJldHVybiB7IGFnZ19hczogcnVsZS5rZXksIHZhbDogcnVsZS52YWx1ZSB9O1xyXG4gIH1cclxuXHJcbiAgdGhyb3cgbmV3IEVycm9yKGBjb21waWxlX3J1bGVfaGFuZGxlcjogVW5rbm93biBydWxlOiAke0pTT04uc3RyaW5naWZ5KHJ1bGUpfWApO1xyXG5cclxufVxyXG5cclxuXHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIGNvbXBpbGU8bU5ULCBtRFQ+KHRyZWU6IEpzc21QYXJzZVRyZWU8bU5UPik6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPiB7ICAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIG91dHB1dCBvZiB0aGUgcGFyc2VyXHJcblxyXG4gIGNvbnN0IHJlc3VsdHMgOiB7XHJcbiAgICBncmFwaF9sYXlvdXQgICAgICAgIDogQXJyYXk8IEpzc21MYXlvdXQgPixcclxuICAgIHRyYW5zaXRpb24gICAgICAgICAgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4sXHJcbiAgICBzdGFydF9zdGF0ZXMgICAgICAgIDogQXJyYXk8IG1OVCA+LFxyXG4gICAgZW5kX3N0YXRlcyAgICAgICAgICA6IEFycmF5PCBtTlQgPixcclxuICAgIGZzbF92ZXJzaW9uICAgICAgICAgOiBBcnJheTwgc3RyaW5nID4sXHJcbiAgICBtYWNoaW5lX2F1dGhvciAgICAgIDogQXJyYXk8IHN0cmluZyA+LFxyXG4gICAgbWFjaGluZV9jb21tZW50ICAgICA6IEFycmF5PCBzdHJpbmcgPixcclxuICAgIG1hY2hpbmVfY29udHJpYnV0b3IgOiBBcnJheTwgc3RyaW5nID4sXHJcbiAgICBtYWNoaW5lX2RlZmluaXRpb24gIDogQXJyYXk8IHN0cmluZyA+LFxyXG4gICAgbWFjaGluZV9sYW5ndWFnZSAgICA6IEFycmF5PCBzdHJpbmcgPixcclxuICAgIG1hY2hpbmVfbGljZW5zZSAgICAgOiBBcnJheTwgc3RyaW5nID4sXHJcbiAgICBtYWNoaW5lX25hbWUgICAgICAgIDogQXJyYXk8IHN0cmluZyA+LFxyXG4gICAgbWFjaGluZV9yZWZlcmVuY2UgICA6IEFycmF5PCBzdHJpbmcgPixcclxuICAgIG1hY2hpbmVfdmVyc2lvbiAgICAgOiBBcnJheTwgc3RyaW5nID4gLy8gc2VtdmVyXHJcbiAgfSA9IHtcclxuICAgIGdyYXBoX2xheW91dCAgICAgICAgOiBbXSxcclxuICAgIHRyYW5zaXRpb24gICAgICAgICAgOiBbXSxcclxuICAgIHN0YXJ0X3N0YXRlcyAgICAgICAgOiBbXSxcclxuICAgIGVuZF9zdGF0ZXMgICAgICAgICAgOiBbXSxcclxuICAgIGZzbF92ZXJzaW9uICAgICAgICAgOiBbXSxcclxuICAgIG1hY2hpbmVfYXV0aG9yICAgICAgOiBbXSxcclxuICAgIG1hY2hpbmVfY29tbWVudCAgICAgOiBbXSxcclxuICAgIG1hY2hpbmVfY29udHJpYnV0b3IgOiBbXSxcclxuICAgIG1hY2hpbmVfZGVmaW5pdGlvbiAgOiBbXSxcclxuICAgIG1hY2hpbmVfbGFuZ3VhZ2UgICAgOiBbXSxcclxuICAgIG1hY2hpbmVfbGljZW5zZSAgICAgOiBbXSxcclxuICAgIG1hY2hpbmVfbmFtZSAgICAgICAgOiBbXSxcclxuICAgIG1hY2hpbmVfcmVmZXJlbmNlICAgOiBbXSxcclxuICAgIG1hY2hpbmVfdmVyc2lvbiAgICAgOiBbXVxyXG4gIH07XHJcblxyXG4gIHRyZWUubWFwKCAodHIgOiBKc3NtQ29tcGlsZVNlU3RhcnQ8bU5UPikgPT4ge1xyXG5cclxuICAgIGNvbnN0IHJ1bGUgICA6IEpzc21Db21waWxlUnVsZSA9IGNvbXBpbGVfcnVsZV9oYW5kbGVyKHRyKSxcclxuICAgICAgICAgIGFnZ19hcyA6IHN0cmluZyAgICAgICAgICA9IHJ1bGUuYWdnX2FzLFxyXG4gICAgICAgICAgdmFsICAgIDogbWl4ZWQgICAgICAgICAgID0gcnVsZS52YWw7ICAgICAgICAgICAgICAgICAgLy8gdG9kbyBiZXR0ZXIgdHlwZXNcclxuXHJcbiAgICByZXN1bHRzW2FnZ19hc10gPSByZXN1bHRzW2FnZ19hc10uY29uY2F0KHZhbCk7XHJcblxyXG4gIH0pO1xyXG5cclxuICBjb25zdCBhc3NlbWJsZWRfdHJhbnNpdGlvbnMgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBbXS5jb25jYXQoLi4uIHJlc3VsdHNbJ3RyYW5zaXRpb24nXSk7XHJcblxyXG4gIGNvbnN0IHJlc3VsdF9jZmcgOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4gPSB7XHJcbiAgICBzdGFydF9zdGF0ZXMgOiByZXN1bHRzLnN0YXJ0X3N0YXRlcy5sZW5ndGg/IHJlc3VsdHMuc3RhcnRfc3RhdGVzIDogW2Fzc2VtYmxlZF90cmFuc2l0aW9uc1swXS5mcm9tXSxcclxuICAgIHRyYW5zaXRpb25zICA6IGFzc2VtYmxlZF90cmFuc2l0aW9uc1xyXG4gIH07XHJcblxyXG4gIGNvbnN0IG9uZU9ubHlLZXlzIDogQXJyYXk8c3RyaW5nPiA9IFtcclxuICAgICdncmFwaF9sYXlvdXQnLCAnbWFjaGluZV9uYW1lJywgJ21hY2hpbmVfdmVyc2lvbicsICdtYWNoaW5lX2NvbW1lbnQnLCAnZnNsX3ZlcnNpb24nLCAnbWFjaGluZV9saWNlbnNlJyxcclxuICAgICdtYWNoaW5lX2RlZmluaXRpb24nLCAnbWFjaGluZV9sYW5ndWFnZSdcclxuICBdO1xyXG5cclxuICBvbmVPbmx5S2V5cy5tYXAoIChvbmVPbmx5S2V5IDogc3RyaW5nKSA9PiB7XHJcbiAgICBpZiAocmVzdWx0c1tvbmVPbmx5S2V5XS5sZW5ndGggPiAxKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWF5IG9ubHkgaGF2ZSBvbmUgJHtvbmVPbmx5S2V5fSBzdGF0ZW1lbnQgbWF4aW11bTogJHtKU09OLnN0cmluZ2lmeShyZXN1bHRzW29uZU9ubHlLZXldKX1gKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlmIChyZXN1bHRzW29uZU9ubHlLZXldLmxlbmd0aCkge1xyXG4gICAgICAgIHJlc3VsdF9jZmdbb25lT25seUtleV0gPSByZXN1bHRzW29uZU9ubHlLZXldWzBdO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIFsnbWFjaGluZV9hdXRob3InLCAnbWFjaGluZV9jb250cmlidXRvcicsICdtYWNoaW5lX3JlZmVyZW5jZSddLm1hcCggKG11bHRpS2V5IDogc3RyaW5nKSA9PiB7XHJcbiAgICBpZiAocmVzdWx0c1ttdWx0aUtleV0ubGVuZ3RoKSB7XHJcbiAgICAgIHJlc3VsdF9jZmdbbXVsdGlLZXldID0gcmVzdWx0c1ttdWx0aUtleV07XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiByZXN1bHRfY2ZnO1xyXG5cclxufVxyXG5cclxuXHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIG1ha2U8bU5ULCBtRFQ+KHBsYW46IHN0cmluZyk6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPiB7XHJcbiAgcmV0dXJuIGNvbXBpbGUocGFyc2UocGxhbikpO1xyXG59XHJcblxyXG5cclxuXHJcblxyXG5cclxuY2xhc3MgTWFjaGluZTxtTlQsIG1EVD4ge1xyXG5cclxuXHJcbiAgX3N0YXRlICAgICAgICAgICAgICAgICAgOiBtTlQ7XHJcbiAgX3N0YXRlcyAgICAgICAgICAgICAgICAgOiBNYXA8bU5ULCBKc3NtR2VuZXJpY1N0YXRlPG1OVD4+O1xyXG4gIF9lZGdlcyAgICAgICAgICAgICAgICAgIDogQXJyYXk8SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+PjtcclxuICBfZWRnZV9tYXAgICAgICAgICAgICAgICA6IE1hcDxtTlQsIE1hcDxtTlQsIG51bWJlcj4+O1xyXG4gIF9uYW1lZF90cmFuc2l0aW9ucyAgICAgIDogTWFwPG1OVCwgbnVtYmVyPjtcclxuICBfYWN0aW9ucyAgICAgICAgICAgICAgICA6IE1hcDxtTlQsIE1hcDxtTlQsIG51bWJlcj4+O1xyXG4gIF9yZXZlcnNlX2FjdGlvbnMgICAgICAgIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XHJcbiAgX3JldmVyc2VfYWN0aW9uX3RhcmdldHMgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcclxuXHJcbiAgX21hY2hpbmVfYXV0aG9yICAgICAgICAgOiA/QXJyYXk8c3RyaW5nPjtcclxuICBfbWFjaGluZV9jb21tZW50ICAgICAgICA6ID9zdHJpbmc7XHJcbiAgX21hY2hpbmVfY29udHJpYnV0b3IgICAgOiA/QXJyYXk8c3RyaW5nPjtcclxuICBfbWFjaGluZV9kZWZpbml0aW9uICAgICA6ID9zdHJpbmc7XHJcbiAgX21hY2hpbmVfbGFuZ3VhZ2UgICAgICAgOiA/c3RyaW5nO1xyXG4gIF9tYWNoaW5lX2xpY2Vuc2UgICAgICAgIDogP3N0cmluZztcclxuICBfbWFjaGluZV9uYW1lICAgICAgICAgICA6ID9zdHJpbmc7XHJcbiAgX21hY2hpbmVfdmVyc2lvbiAgICAgICAgOiA/c3RyaW5nO1xyXG4gIF9mc2xfdmVyc2lvbiAgICAgICAgICAgIDogP3N0cmluZztcclxuXHJcbiAgX2dyYXBoX2xheW91dCAgICAgICAgICAgOiBKc3NtTGF5b3V0O1xyXG5cclxuXHJcbiAgLy8gd2hhcmdhcmJsIHRoaXMgYmFkbHkgbmVlZHMgdG8gYmUgYnJva2VuIHVwLCBtb25vbGl0aCBtYXN0ZXJcclxuICBjb25zdHJ1Y3Rvcih7XHJcbiAgICBzdGFydF9zdGF0ZXMsXHJcbiAgICBjb21wbGV0ZSAgICAgICAgPSBbXSxcclxuICAgIHRyYW5zaXRpb25zLFxyXG4gICAgbWFjaGluZV9hdXRob3IsXHJcbiAgICBtYWNoaW5lX2NvbW1lbnQsXHJcbiAgICBtYWNoaW5lX2NvbnRyaWJ1dG9yLFxyXG4gICAgbWFjaGluZV9kZWZpbml0aW9uLFxyXG4gICAgbWFjaGluZV9sYW5ndWFnZSxcclxuICAgIG1hY2hpbmVfbGljZW5zZSxcclxuICAgIG1hY2hpbmVfbmFtZSxcclxuICAgIG1hY2hpbmVfdmVyc2lvbixcclxuICAgIGZzbF92ZXJzaW9uLFxyXG4gICAgZ3JhcGhfbGF5b3V0ID0gJ2RvdCdcclxuICB9IDogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+KSB7XHJcblxyXG4gICAgdGhpcy5fc3RhdGUgICAgICAgICAgICAgICAgICA9IHN0YXJ0X3N0YXRlc1swXTtcclxuICAgIHRoaXMuX3N0YXRlcyAgICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XHJcbiAgICB0aGlzLl9lZGdlcyAgICAgICAgICAgICAgICAgID0gW107XHJcbiAgICB0aGlzLl9lZGdlX21hcCAgICAgICAgICAgICAgID0gbmV3IE1hcCgpO1xyXG4gICAgdGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMgICAgICA9IG5ldyBNYXAoKTtcclxuICAgIHRoaXMuX2FjdGlvbnMgICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XHJcbiAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbnMgICAgICAgID0gbmV3IE1hcCgpO1xyXG4gICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyA9IG5ldyBNYXAoKTsgICAvLyB0b2RvXHJcblxyXG4gICAgdGhpcy5fbWFjaGluZV9hdXRob3IgICAgICAgICA9IG1hY2hpbmVfYXV0aG9yO1xyXG4gICAgdGhpcy5fbWFjaGluZV9jb21tZW50ICAgICAgICA9IG1hY2hpbmVfY29tbWVudDtcclxuICAgIHRoaXMuX21hY2hpbmVfY29udHJpYnV0b3IgICAgPSBtYWNoaW5lX2NvbnRyaWJ1dG9yO1xyXG4gICAgdGhpcy5fbWFjaGluZV9kZWZpbml0aW9uICAgICA9IG1hY2hpbmVfZGVmaW5pdGlvbjtcclxuICAgIHRoaXMuX21hY2hpbmVfbGFuZ3VhZ2UgICAgICAgPSBtYWNoaW5lX2xhbmd1YWdlO1xyXG4gICAgdGhpcy5fbWFjaGluZV9saWNlbnNlICAgICAgICA9IG1hY2hpbmVfbGljZW5zZTtcclxuICAgIHRoaXMuX21hY2hpbmVfbmFtZSAgICAgICAgICAgPSBtYWNoaW5lX25hbWU7XHJcbiAgICB0aGlzLl9tYWNoaW5lX3ZlcnNpb24gICAgICAgID0gbWFjaGluZV92ZXJzaW9uO1xyXG4gICAgdGhpcy5fZnNsX3ZlcnNpb24gICAgICAgICAgICA9IGZzbF92ZXJzaW9uO1xyXG5cclxuICAgIHRoaXMuX2dyYXBoX2xheW91dCAgICAgICAgICAgPSBncmFwaF9sYXlvdXQ7XHJcblxyXG4gICAgdHJhbnNpdGlvbnMubWFwKCAodHI6SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+KSA9PiB7XHJcblxyXG4gICAgICBpZiAodHIuZnJvbSA9PT0gdW5kZWZpbmVkKSB7IHRocm93IG5ldyBFcnJvcihgdHJhbnNpdGlvbiBtdXN0IGRlZmluZSAnZnJvbSc6ICR7SlNPTi5zdHJpbmdpZnkodHIpfWApOyB9XHJcbiAgICAgIGlmICh0ci50byAgID09PSB1bmRlZmluZWQpIHsgdGhyb3cgbmV3IEVycm9yKGB0cmFuc2l0aW9uIG11c3QgZGVmaW5lICd0byc6ICR7ICBKU09OLnN0cmluZ2lmeSh0cil9YCk7IH1cclxuXHJcbiAgICAgIC8vIGdldCB0aGUgY3Vyc29ycy4gIHdoYXQgYSBtZXNzXHJcbiAgICAgIGNvbnN0IGN1cnNvcl9mcm9tOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD5cclxuICAgICAgICAgID0gdGhpcy5fc3RhdGVzLmdldCh0ci5mcm9tKVxyXG4gICAgICAgICB8fCB7IG5hbWU6IHRyLmZyb20sIGZyb206IFtdLCB0bzogW10sIGNvbXBsZXRlOiBjb21wbGV0ZS5pbmNsdWRlcyh0ci5mcm9tKSB9O1xyXG5cclxuICAgICAgaWYgKCEodGhpcy5fc3RhdGVzLmhhcyh0ci5mcm9tKSkpIHtcclxuICAgICAgICB0aGlzLl9uZXdfc3RhdGUoY3Vyc29yX2Zyb20pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBjdXJzb3JfdG86IEpzc21HZW5lcmljU3RhdGU8bU5UPlxyXG4gICAgICAgICAgPSB0aGlzLl9zdGF0ZXMuZ2V0KHRyLnRvKVxyXG4gICAgICAgICB8fCB7bmFtZTogdHIudG8sIGZyb206IFtdLCB0bzogW10sIGNvbXBsZXRlOiBjb21wbGV0ZS5pbmNsdWRlcyh0ci50bykgfTtcclxuXHJcbiAgICAgIGlmICghKHRoaXMuX3N0YXRlcy5oYXModHIudG8pKSkge1xyXG4gICAgICAgIHRoaXMuX25ld19zdGF0ZShjdXJzb3JfdG8pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBndWFyZCBhZ2FpbnN0IGV4aXN0aW5nIGNvbm5lY3Rpb25zIGJlaW5nIHJlLWFkZGVkXHJcbiAgICAgIGlmIChjdXJzb3JfZnJvbS50by5pbmNsdWRlcyh0ci50bykpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGFscmVhZHkgaGFzICR7SlNPTi5zdHJpbmdpZnkodHIuZnJvbSl9IHRvICR7SlNPTi5zdHJpbmdpZnkodHIudG8pfWApO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGN1cnNvcl9mcm9tLnRvLnB1c2godHIudG8pO1xyXG4gICAgICAgIGN1cnNvcl90by5mcm9tLnB1c2godHIuZnJvbSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGFkZCB0aGUgZWRnZTsgbm90ZSBpdHMgaWRcclxuICAgICAgdGhpcy5fZWRnZXMucHVzaCh0cik7XHJcbiAgICAgIGNvbnN0IHRoaXNFZGdlSWQ6IG51bWJlciA9IHRoaXMuX2VkZ2VzLmxlbmd0aCAtIDE7XHJcblxyXG4gICAgICAvLyBndWFyZCBhZ2FpbnN0IHJlcGVhdGluZyBhIHRyYW5zaXRpb24gbmFtZVxyXG4gICAgICBpZiAodHIubmFtZSkge1xyXG4gICAgICAgIGlmICh0aGlzLl9uYW1lZF90cmFuc2l0aW9ucy5oYXModHIubmFtZSkpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgbmFtZWQgdHJhbnNpdGlvbiBcIiR7SlNPTi5zdHJpbmdpZnkodHIubmFtZSl9XCIgYWxyZWFkeSBjcmVhdGVkYCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoaXMuX25hbWVkX3RyYW5zaXRpb25zLnNldCh0ci5uYW1lLCB0aGlzRWRnZUlkKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIHNldCB1cCB0aGUgbWFwcGluZywgc28gdGhhdCBlZGdlcyBjYW4gYmUgbG9va2VkIHVwIGJ5IGVuZHBvaW50IHBhaXJzXHJcbiAgICAgIGNvbnN0IGZyb21fbWFwcGluZzogTWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2VkZ2VfbWFwLmdldCh0ci5mcm9tKSB8fCBuZXcgTWFwKCk7XHJcbiAgICAgIGlmICghKHRoaXMuX2VkZ2VfbWFwLmhhcyh0ci5mcm9tKSkpIHtcclxuICAgICAgICB0aGlzLl9lZGdlX21hcC5zZXQodHIuZnJvbSwgZnJvbV9tYXBwaW5nKTtcclxuICAgICAgfVxyXG5cclxuLy8gICAgY29uc3QgdG9fbWFwcGluZyA9IGZyb21fbWFwcGluZy5nZXQodHIudG8pO1xyXG4gICAgICBmcm9tX21hcHBpbmcuc2V0KHRyLnRvLCB0aGlzRWRnZUlkKTsgLy8gYWxyZWFkeSBjaGVja2VkIHRoYXQgdGhpcyBtYXBwaW5nIGRvZXNuJ3QgZXhpc3QsIGFib3ZlXHJcblxyXG4gICAgICAvLyBzZXQgdXAgdGhlIGFjdGlvbiBtYXBwaW5nLCBzbyB0aGF0IGFjdGlvbnMgY2FuIGJlIGxvb2tlZCB1cCBieSBvcmlnaW5cclxuICAgICAgaWYgKHRyLmFjdGlvbikge1xyXG5cclxuXHJcbiAgICAgICAgLy8gZm9yd2FyZCBtYXBwaW5nIGZpcnN0IGJ5IGFjdGlvbiBuYW1lXHJcbiAgICAgICAgbGV0IGFjdGlvbk1hcDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9hY3Rpb25zLmdldCh0ci5hY3Rpb24pO1xyXG4gICAgICAgIGlmICghKGFjdGlvbk1hcCkpIHtcclxuICAgICAgICAgIGFjdGlvbk1hcCA9IG5ldyBNYXAoKTtcclxuICAgICAgICAgIHRoaXMuX2FjdGlvbnMuc2V0KHRyLmFjdGlvbiwgYWN0aW9uTWFwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChhY3Rpb25NYXAuaGFzKHRyLmZyb20pKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGFjdGlvbiAke0pTT04uc3RyaW5naWZ5KHRyLmFjdGlvbil9IGFscmVhZHkgYXR0YWNoZWQgdG8gb3JpZ2luICR7SlNPTi5zdHJpbmdpZnkodHIuZnJvbSl9YCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGFjdGlvbk1hcC5zZXQodHIuZnJvbSwgdGhpc0VkZ2VJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgLy8gcmV2ZXJzZSBtYXBwaW5nIGZpcnN0IGJ5IHN0YXRlIG9yaWdpbiBuYW1lXHJcbiAgICAgICAgbGV0IHJBY3Rpb25NYXA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh0ci5mcm9tKTtcclxuICAgICAgICBpZiAoIShyQWN0aW9uTWFwKSkge1xyXG4gICAgICAgICAgckFjdGlvbk1hcCA9IG5ldyBNYXAoKTtcclxuICAgICAgICAgIHRoaXMuX3JldmVyc2VfYWN0aW9ucy5zZXQodHIuZnJvbSwgckFjdGlvbk1hcCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBubyBuZWVkIHRvIHRlc3QgZm9yIHJldmVyc2UgbWFwcGluZyBwcmUtcHJlc2VuY2U7XHJcbiAgICAgICAgLy8gZm9yd2FyZCBtYXBwaW5nIGFscmVhZHkgY292ZXJzIGNvbGxpc2lvbnNcclxuICAgICAgICByQWN0aW9uTWFwLnNldCh0ci5hY3Rpb24sIHRoaXNFZGdlSWQpO1xyXG5cclxuXHJcbiAgICAgICAgLy8gcmV2ZXJzZSBtYXBwaW5nIGZpcnN0IGJ5IHN0YXRlIHRhcmdldCBuYW1lXHJcbiAgICAgICAgaWYgKCEodGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5oYXModHIudG8pKSkge1xyXG4gICAgICAgICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5zZXQodHIudG8sIG5ldyBNYXAoKSk7XHJcbiAgICAgICAgfVxyXG5cclxuLyogdG9kbyBjb21lYmFja1xyXG4gICBmdW5kYW1lbnRhbCBwcm9ibGVtIGlzIHJvQWN0aW9uTWFwIG5lZWRzIHRvIGJlIGEgbXVsdGltYXBcclxuICAgICAgICBjb25zdCByb0FjdGlvbk1hcCA9IHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuZ2V0KHRyLnRvKTsgIC8vIHdhc3RlZnVsIC0gYWxyZWFkeSBkaWQgaGFzIC0gcmVmYWN0b3JcclxuICAgICAgICBpZiAocm9BY3Rpb25NYXApIHtcclxuICAgICAgICAgIGlmIChyb0FjdGlvbk1hcC5oYXModHIuYWN0aW9uKSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHJvLWFjdGlvbiAke3RyLnRvfSBhbHJlYWR5IGF0dGFjaGVkIHRvIGFjdGlvbiAke3RyLmFjdGlvbn1gKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJvQWN0aW9uTWFwLnNldCh0ci5hY3Rpb24sIHRoaXNFZGdlSWQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Nob3VsZCBiZSBpbXBvc3NpYmxlIC0gZmxvdyBkb2VzblxcJ3Qga25vdyAuc2V0IHByZWNlZGVzIC5nZXQgeWV0IGFnYWluLiAgc2V2ZXJlIGVycm9yPycpO1xyXG4gICAgICAgIH1cclxuKi9cclxuICAgICAgfVxyXG5cclxuICAgIH0pO1xyXG5cclxuICB9XHJcblxyXG4gIF9uZXdfc3RhdGUoc3RhdGVfY29uZmlnOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD4pOiBtTlQgeyAvLyB3aGFyZ2FyYmwgZ2V0IHRoYXQgc3RhdGVfY29uZmlnIGFueSB1bmRlciBjb250cm9sXHJcblxyXG4gICAgaWYgKHRoaXMuX3N0YXRlcy5oYXMoc3RhdGVfY29uZmlnLm5hbWUpKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgc3RhdGUgJHtKU09OLnN0cmluZ2lmeShzdGF0ZV9jb25maWcubmFtZSl9IGFscmVhZHkgZXhpc3RzYCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5fc3RhdGVzLnNldChzdGF0ZV9jb25maWcubmFtZSwgc3RhdGVfY29uZmlnKTtcclxuICAgIHJldHVybiBzdGF0ZV9jb25maWcubmFtZTtcclxuXHJcbiAgfVxyXG5cclxuXHJcblxyXG4gIHN0YXRlKCk6IG1OVCB7XHJcbiAgICByZXR1cm4gdGhpcy5fc3RhdGU7XHJcbiAgfVxyXG5cclxuLyogd2hhcmdhcmJsIHRvZG8gbWFqb3JcclxuICAgd2hlbiB3ZSByZWltcGxlbWVudCB0aGlzLCByZWludHJvZHVjZSB0aGlzIGNoYW5nZSB0byB0aGUgaXNfZmluYWwgY2FsbFxyXG5cclxuICBpc19jaGFuZ2luZygpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB0cnVlOyAvLyB0b2RvIHdoYXJnYXJibFxyXG4gIH1cclxuKi9cclxuXHJcblxyXG4gIHN0YXRlX2lzX2ZpbmFsKHdoaWNoU3RhdGU6IG1OVCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuICggKHRoaXMuc3RhdGVfaXNfdGVybWluYWwod2hpY2hTdGF0ZSkpICYmICh0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHdoaWNoU3RhdGUpKSApO1xyXG4gIH1cclxuXHJcbiAgaXNfZmluYWwoKTogYm9vbGVhbiB7XHJcbi8vICByZXR1cm4gKCghdGhpcy5pc19jaGFuZ2luZygpKSAmJiB0aGlzLnN0YXRlX2lzX2ZpbmFsKHRoaXMuc3RhdGUoKSkpO1xyXG4gICAgcmV0dXJuIHRoaXMuc3RhdGVfaXNfZmluYWwodGhpcy5zdGF0ZSgpKTtcclxuICB9XHJcblxyXG4gIGdyYXBoX2xheW91dCgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHRoaXMuX2dyYXBoX2xheW91dDtcclxuICB9XHJcblxyXG5cclxuXHJcbiAgbWFjaGluZV9hdXRob3IoKTogP0FycmF5PHN0cmluZz4ge1xyXG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfYXV0aG9yO1xyXG4gIH1cclxuXHJcbiAgbWFjaGluZV9jb21tZW50KCk6ID9zdHJpbmcge1xyXG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfY29tbWVudDtcclxuICB9XHJcblxyXG4gIG1hY2hpbmVfY29udHJpYnV0b3IoKTogP0FycmF5PHN0cmluZz4ge1xyXG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfY29udHJpYnV0b3I7XHJcbiAgfVxyXG5cclxuICBtYWNoaW5lX2RlZmluaXRpb24oKTogP3N0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9kZWZpbml0aW9uO1xyXG4gIH1cclxuXHJcbiAgbWFjaGluZV9sYW5ndWFnZSgpOiA/c3RyaW5nIHtcclxuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2xhbmd1YWdlO1xyXG4gIH1cclxuXHJcbiAgbWFjaGluZV9saWNlbnNlKCk6ID9zdHJpbmcge1xyXG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfbGljZW5zZTtcclxuICB9XHJcblxyXG4gIG1hY2hpbmVfbmFtZSgpOiA/c3RyaW5nIHtcclxuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX25hbWU7XHJcbiAgfVxyXG5cclxuICBtYWNoaW5lX3ZlcnNpb24oKTogP3N0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV92ZXJzaW9uO1xyXG4gIH1cclxuXHJcbiAgZnNsX3ZlcnNpb24oKTogP3N0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5fZnNsX3ZlcnNpb247XHJcbiAgfVxyXG5cclxuXHJcblxyXG4gIG1hY2hpbmVfc3RhdGUoKTogSnNzbU1hY2hpbmVJbnRlcm5hbFN0YXRlPG1OVCwgbURUPiB7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaW50ZXJuYWxfc3RhdGVfaW1wbF92ZXJzaW9uIDogMSxcclxuXHJcbiAgICAgIGFjdGlvbnMgICAgICAgICAgICAgICAgOiB0aGlzLl9hY3Rpb25zLFxyXG4gICAgICBlZGdlX21hcCAgICAgICAgICAgICAgIDogdGhpcy5fZWRnZV9tYXAsXHJcbiAgICAgIGVkZ2VzICAgICAgICAgICAgICAgICAgOiB0aGlzLl9lZGdlcyxcclxuICAgICAgbmFtZWRfdHJhbnNpdGlvbnMgICAgICA6IHRoaXMuX25hbWVkX3RyYW5zaXRpb25zLFxyXG4gICAgICByZXZlcnNlX2FjdGlvbnMgICAgICAgIDogdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLFxyXG4vLyAgICByZXZlcnNlX2FjdGlvbl90YXJnZXRzIDogdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyxcclxuICAgICAgc3RhdGUgICAgICAgICAgICAgICAgICA6IHRoaXMuX3N0YXRlLFxyXG4gICAgICBzdGF0ZXMgICAgICAgICAgICAgICAgIDogdGhpcy5fc3RhdGVzXHJcbiAgICB9O1xyXG5cclxuICB9XHJcblxyXG4vKlxyXG4gIGxvYWRfbWFjaGluZV9zdGF0ZSgpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBmYWxzZTsgLy8gdG9kbyB3aGFyZ2FyYmxcclxuICB9XHJcbiovXHJcblxyXG5cclxuICBzdGF0ZXMoKTogQXJyYXk8bU5UPiB7XHJcbiAgICByZXR1cm4gWy4uLiB0aGlzLl9zdGF0ZXMua2V5cygpXTtcclxuICB9XHJcblxyXG4gIHN0YXRlX2Zvcih3aGljaFN0YXRlOiBtTlQpOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD4ge1xyXG4gICAgY29uc3Qgc3RhdGU6ID9Kc3NtR2VuZXJpY1N0YXRlPG1OVD4gPSB0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpO1xyXG4gICAgaWYgKHN0YXRlKSB7IHJldHVybiBzdGF0ZTsgfVxyXG4gICAgZWxzZSAgICAgICB7IHRocm93IG5ldyBFcnJvcihgbm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHN0YXRlKX1gKTsgfVxyXG4gIH1cclxuXHJcblxyXG5cclxuICBsaXN0X2VkZ2VzKCk6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiB7XHJcbiAgICByZXR1cm4gdGhpcy5fZWRnZXM7XHJcbiAgfVxyXG5cclxuICBsaXN0X25hbWVkX3RyYW5zaXRpb25zKCk6IE1hcDxtTlQsIG51bWJlcj4ge1xyXG4gICAgcmV0dXJuIHRoaXMuX25hbWVkX3RyYW5zaXRpb25zO1xyXG4gIH1cclxuXHJcbiAgbGlzdF9hY3Rpb25zKCk6IEFycmF5PG1OVD4ge1xyXG4gICAgcmV0dXJuIFsuLi4gdGhpcy5fYWN0aW9ucy5rZXlzKCldO1xyXG4gIH1cclxuXHJcblxyXG5cclxuICBnZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyhmcm9tOiBtTlQsIHRvOiBtTlQpOiA/bnVtYmVyIHtcclxuXHJcbiAgICBjb25zdCBlbWcgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2VkZ2VfbWFwLmdldChmcm9tKTtcclxuXHJcbiAgICBpZiAoZW1nKSB7XHJcbiAgICAgIHJldHVybiBlbWcuZ2V0KHRvKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gIH1cclxuXHJcblxyXG5cclxuICBsb29rdXBfdHJhbnNpdGlvbl9mb3IoZnJvbTogbU5ULCB0bzogbU5UKTogP0pzc21UcmFuc2l0aW9uPG1OVCwgbURUPiB7XHJcbiAgICBjb25zdCBpZCA6ID9udW1iZXIgPSB0aGlzLmdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzKGZyb20sIHRvKTtcclxuICAgIHJldHVybiAoKGlkID09PSB1bmRlZmluZWQpIHx8IChpZCA9PT0gbnVsbCkpPyB1bmRlZmluZWQgOiB0aGlzLl9lZGdlc1tpZF07XHJcbiAgfVxyXG5cclxuXHJcblxyXG4gIGxpc3RfdHJhbnNpdGlvbnMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpKTogSnNzbVRyYW5zaXRpb25MaXN0PG1OVD4ge1xyXG4gICAgcmV0dXJuIHtlbnRyYW5jZXM6IHRoaXMubGlzdF9lbnRyYW5jZXMod2hpY2hTdGF0ZSksIGV4aXRzOiB0aGlzLmxpc3RfZXhpdHMod2hpY2hTdGF0ZSl9O1xyXG4gIH1cclxuXHJcbiAgbGlzdF9lbnRyYW5jZXMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpKTogQXJyYXk8bU5UPiB7XHJcbiAgICByZXR1cm4gKHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSkgfHwge30pLmZyb20gfHwgW107XHJcbiAgfVxyXG5cclxuICBsaXN0X2V4aXRzKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSk6IEFycmF5PG1OVD4ge1xyXG4gICAgcmV0dXJuICh0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpIHx8IHt9KS50byAgIHx8IFtdO1xyXG4gIH1cclxuXHJcblxyXG5cclxuICBwcm9iYWJsZV9leGl0c19mb3Iod2hpY2hTdGF0ZTogbU5UKTogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHtcclxuXHJcbiAgICBjb25zdCB3c3RhdGU6ID9Kc3NtR2VuZXJpY1N0YXRlPG1OVD4gPSB0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpO1xyXG4gICAgaWYgKCEod3N0YXRlKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX0gaW4gcHJvYmFibGVfZXhpdHNfZm9yYCk7IH1cclxuXHJcbiAgICBjb25zdCB3c3RhdGVfdG8gOiBBcnJheTwgbU5UID4gPSB3c3RhdGUudG8sXHJcblxyXG4gICAgICAgICAgd3RmICAgICAgIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IC8vIHdzdGF0ZV90b19maWx0ZXJlZCAtPiB3dGZcclxuICAgICAgICAgICAgICAgICAgICA9IHdzdGF0ZV90b1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKCAod3MpIDogP0pzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9PiB0aGlzLmxvb2t1cF90cmFuc2l0aW9uX2Zvcih0aGlzLnN0YXRlKCksIHdzKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKTtcclxuXHJcbiAgICByZXR1cm4gd3RmO1xyXG5cclxuICB9XHJcblxyXG4gIHByb2JhYmlsaXN0aWNfdHJhbnNpdGlvbigpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IHNlbGVjdGVkIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gd2VpZ2h0ZWRfcmFuZF9zZWxlY3QodGhpcy5wcm9iYWJsZV9leGl0c19mb3IodGhpcy5zdGF0ZSgpKSk7XHJcbiAgICByZXR1cm4gdGhpcy50cmFuc2l0aW9uKCBzZWxlY3RlZC50byApO1xyXG4gIH1cclxuXHJcbiAgcHJvYmFiaWxpc3RpY193YWxrKG46IG51bWJlcik6IEFycmF5PG1OVD4ge1xyXG4gICAgcmV0dXJuIHNlcShuKVxyXG4gICAgICAgICAgLm1hcCgoKSA6IG1OVCA9PiB7XHJcbiAgICAgICAgICAgICBjb25zdCBzdGF0ZV93YXM6IG1OVCA9IHRoaXMuc3RhdGUoKTtcclxuICAgICAgICAgICAgIHRoaXMucHJvYmFiaWxpc3RpY190cmFuc2l0aW9uKCk7XHJcbiAgICAgICAgICAgICByZXR1cm4gc3RhdGVfd2FzO1xyXG4gICAgICAgICAgIH0pXHJcbiAgICAgICAgICAuY29uY2F0KFt0aGlzLnN0YXRlKCldKTtcclxuICB9XHJcblxyXG4gIHByb2JhYmlsaXN0aWNfaGlzdG9fd2FsayhuOiBudW1iZXIpOiBNYXA8bU5ULCBudW1iZXI+IHtcclxuICAgIHJldHVybiBoaXN0b2dyYXBoKHRoaXMucHJvYmFiaWxpc3RpY193YWxrKG4pKTtcclxuICB9XHJcblxyXG5cclxuXHJcbiAgYWN0aW9ucyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkgKTogQXJyYXk8bU5UPiB7XHJcbiAgICBjb25zdCB3c3RhdGUgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XHJcbiAgICBpZiAod3N0YXRlKSB7IHJldHVybiBbLi4uIHdzdGF0ZS5rZXlzKCldOyB9XHJcbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XHJcbiAgfVxyXG5cclxuICBsaXN0X3N0YXRlc19oYXZpbmdfYWN0aW9uKHdoaWNoU3RhdGU6IG1OVCk6IEFycmF5PG1OVD4ge1xyXG4gICAgY29uc3Qgd3N0YXRlIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9hY3Rpb25zLmdldCh3aGljaFN0YXRlKTtcclxuICAgIGlmICh3c3RhdGUpIHsgcmV0dXJuIFsuLi4gd3N0YXRlLmtleXMoKV07IH1cclxuICAgIGVsc2UgICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cclxuICB9XHJcblxyXG4vLyBjb21lYmFja1xyXG4vKlxyXG4gIGxpc3RfZW50cmFuY2VfYWN0aW9ucyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkgKSA6IEFycmF5PG1OVD4ge1xyXG4gICAgcmV0dXJuIFsuLi4gKHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuZ2V0KHdoaWNoU3RhdGUpIHx8IG5ldyBNYXAoKSkudmFsdWVzKCldIC8vIHdhc3RlZnVsXHJcbiAgICAgICAgICAgLm1hcCggKGVkZ2VJZDphbnkpID0+ICh0aGlzLl9lZGdlc1tlZGdlSWRdIDogYW55KSkgLy8gd2hhcmdhcmJsIGJ1cm4gb3V0IGFueVxyXG4gICAgICAgICAgIC5maWx0ZXIoIChvOmFueSkgPT4gby50byA9PT0gd2hpY2hTdGF0ZSlcclxuICAgICAgICAgICAubWFwKCBmaWx0ZXJlZCA9PiBmaWx0ZXJlZC5mcm9tICk7XHJcbiAgfVxyXG4qL1xyXG4gIGxpc3RfZXhpdF9hY3Rpb25zKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSApOiBBcnJheTw/bU5UPiB7IC8vIHRoZXNlIGFyZSBtTlQsIG5vdCA/bU5UXHJcbiAgICBjb25zdCByYV9iYXNlOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XHJcbiAgICBpZiAoIShyYV9iYXNlKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxyXG5cclxuICAgIHJldHVybiBbLi4uIHJhX2Jhc2UudmFsdWVzKCldXHJcbiAgICAgICAgICAgLm1hcCAgICAoIChlZGdlSWQ6IG51bWJlcikgICAgICAgICAgICAgIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMuX2VkZ2VzW2VkZ2VJZF0gICApXHJcbiAgICAgICAgICAgLmZpbHRlciAoIChvOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pIDogYm9vbGVhbiAgICAgICAgICAgICAgICAgID0+IG8uZnJvbSA9PT0gd2hpY2hTdGF0ZSApXHJcbiAgICAgICAgICAgLm1hcCAgICAoIChmaWx0ZXJlZDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+KSA6ID9tTlQgICAgICAgICAgICAgID0+IGZpbHRlcmVkLmFjdGlvbiAgICAgICApO1xyXG4gIH1cclxuXHJcbiAgcHJvYmFibGVfYWN0aW9uX2V4aXRzKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSApIDogQXJyYXk8bWl4ZWQ+IHsgLy8gdGhlc2UgYXJlIG1OVFxyXG4gICAgY29uc3QgcmFfYmFzZTogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xyXG4gICAgaWYgKCEocmFfYmFzZSkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cclxuXHJcbiAgICByZXR1cm4gWy4uLiByYV9iYXNlLnZhbHVlcygpXVxyXG4gICAgICAgICAgIC5tYXAgICAgKCAoZWRnZUlkOiBudW1iZXIpOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPT4gdGhpcy5fZWRnZXNbZWRnZUlkXSAgIClcclxuICAgICAgICAgICAuZmlsdGVyICggKG86IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPik6IGJvb2xlYW4gICAgID0+IG8uZnJvbSA9PT0gd2hpY2hTdGF0ZSApXHJcbiAgICAgICAgICAgLm1hcCAgICAoIChmaWx0ZXJlZCk6IG1peGVkICAgICAgICAgICAgICAgICAgICAgICAgICA9PiAoIHsgYWN0aW9uICAgICAgOiBmaWx0ZXJlZC5hY3Rpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvYmFiaWxpdHkgOiBmaWx0ZXJlZC5wcm9iYWJpbGl0eSB9IClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgfVxyXG5cclxuXHJcblxyXG4gIGlzX3VuZW50ZXJhYmxlKHdoaWNoU3RhdGU6IG1OVCk6IGJvb2xlYW4ge1xyXG4gICAgLy8gd2hhcmdhcmJsIHNob3VsZCB0aHJvdyBvbiB1bmtub3duIHN0YXRlXHJcbiAgICByZXR1cm4gdGhpcy5saXN0X2VudHJhbmNlcyh3aGljaFN0YXRlKS5sZW5ndGggPT09IDA7XHJcbiAgfVxyXG5cclxuICBoYXNfdW5lbnRlcmFibGVzKCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpOiBib29sZWFuID0+IHRoaXMuaXNfdW5lbnRlcmFibGUoeCkpO1xyXG4gIH1cclxuXHJcblxyXG5cclxuICBpc190ZXJtaW5hbCgpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB0aGlzLnN0YXRlX2lzX3Rlcm1pbmFsKHRoaXMuc3RhdGUoKSk7XHJcbiAgfVxyXG5cclxuICBzdGF0ZV9pc190ZXJtaW5hbCh3aGljaFN0YXRlOiBtTlQpOiBib29sZWFuIHtcclxuICAgIC8vIHdoYXJnYXJibCBzaG91bGQgdGhyb3cgb24gdW5rbm93biBzdGF0ZVxyXG4gICAgcmV0dXJuIHRoaXMubGlzdF9leGl0cyh3aGljaFN0YXRlKS5sZW5ndGggPT09IDA7XHJcbiAgfVxyXG5cclxuICBoYXNfdGVybWluYWxzKCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpOiBib29sZWFuID0+IHRoaXMuc3RhdGVfaXNfdGVybWluYWwoeCkpO1xyXG4gIH1cclxuXHJcblxyXG5cclxuICBpc19jb21wbGV0ZSgpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHRoaXMuc3RhdGUoKSk7XHJcbiAgfVxyXG5cclxuICBzdGF0ZV9pc19jb21wbGV0ZSh3aGljaFN0YXRlOiBtTlQpIDogYm9vbGVhbiB7XHJcbiAgICBjb25zdCB3c3RhdGU6ID9Kc3NtR2VuZXJpY1N0YXRlPG1OVD4gPSB0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpO1xyXG4gICAgaWYgKHdzdGF0ZSkgeyByZXR1cm4gd3N0YXRlLmNvbXBsZXRlOyB9XHJcbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XHJcbiAgfVxyXG5cclxuICBoYXNfY29tcGxldGVzKCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpOiBib29sZWFuID0+IHRoaXMuc3RhdGVfaXNfY29tcGxldGUoeCkgKTtcclxuICB9XHJcblxyXG5cclxuXHJcbiAgYWN0aW9uKG5hbWU6IG1OVCwgbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4ge1xyXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXHJcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxyXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xyXG4gICAgaWYgKHRoaXMudmFsaWRfYWN0aW9uKG5hbWUsIG5ld0RhdGEpKSB7XHJcbiAgICAgIGNvbnN0IGVkZ2U6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHRoaXMuY3VycmVudF9hY3Rpb25fZWRnZV9mb3IobmFtZSk7XHJcbiAgICAgIHRoaXMuX3N0YXRlID0gZWRnZS50bztcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB0cmFuc2l0aW9uKG5ld1N0YXRlOiBtTlQsIG5ld0RhdGE/OiBtRFQpOiBib29sZWFuIHtcclxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xyXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcclxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcclxuICAgIGlmICh0aGlzLnZhbGlkX3RyYW5zaXRpb24obmV3U3RhdGUsIG5ld0RhdGEpKSB7XHJcbiAgICAgIHRoaXMuX3N0YXRlID0gbmV3U3RhdGU7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gY2FuIGxlYXZlIG1hY2hpbmUgaW4gaW5jb25zaXN0ZW50IHN0YXRlLiAgZ2VuZXJhbGx5IGRvIG5vdCB1c2VcclxuICBmb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlOiBtTlQsIG5ld0RhdGE/OiBtRFQpOiBib29sZWFuIHtcclxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xyXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcclxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcclxuICAgIGlmICh0aGlzLnZhbGlkX2ZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGUsIG5ld0RhdGEpKSB7XHJcbiAgICAgIHRoaXMuX3N0YXRlID0gbmV3U3RhdGU7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcblxyXG5cclxuICBjdXJyZW50X2FjdGlvbl9mb3IoYWN0aW9uOiBtTlQpOiBudW1iZXIgfCB2b2lkIHtcclxuICAgIGNvbnN0IGFjdGlvbl9iYXNlOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KGFjdGlvbik7XHJcbiAgICByZXR1cm4gYWN0aW9uX2Jhc2U/IGFjdGlvbl9iYXNlLmdldCh0aGlzLnN0YXRlKCkpOiB1bmRlZmluZWQ7XHJcbiAgfVxyXG5cclxuICBjdXJyZW50X2FjdGlvbl9lZGdlX2ZvcihhY3Rpb246IG1OVCk6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiB7XHJcbiAgICBjb25zdCBpZHg6ID9udW1iZXIgPSB0aGlzLmN1cnJlbnRfYWN0aW9uX2ZvcihhY3Rpb24pO1xyXG4gICAgaWYgKChpZHggPT09IHVuZGVmaW5lZCkgfHwgKGlkeCA9PT0gbnVsbCkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIGFjdGlvbiAke0pTT04uc3RyaW5naWZ5KGFjdGlvbil9YCk7IH1cclxuICAgIHJldHVybiB0aGlzLl9lZGdlc1tpZHhdO1xyXG4gIH1cclxuXHJcbiAgdmFsaWRfYWN0aW9uKGFjdGlvbjogbU5ULCBfbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4geyAgLy8gdG9kbyBjb21lYmFjayB1bmlnbm9yZSBuZXdEYXRhXHJcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcclxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXHJcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXHJcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50X2FjdGlvbl9mb3IoYWN0aW9uKSAhPT0gdW5kZWZpbmVkO1xyXG4gIH1cclxuXHJcbiAgdmFsaWRfdHJhbnNpdGlvbihuZXdTdGF0ZTogbU5ULCBfbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4geyAgLy8gdG9kbyBjb21lYmFjayB1bmlnbm9yZSBuZXdEYXRhXHJcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcclxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXHJcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXHJcbiAgICBjb25zdCB0cmFuc2l0aW9uX2ZvcjogP0pzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHRoaXMubG9va3VwX3RyYW5zaXRpb25fZm9yKHRoaXMuc3RhdGUoKSwgbmV3U3RhdGUpO1xyXG5cclxuICAgIGlmICghKHRyYW5zaXRpb25fZm9yKSkgICAgICAgICAgeyByZXR1cm4gZmFsc2U7IH1cclxuICAgIGlmICh0cmFuc2l0aW9uX2Zvci5mb3JjZWRfb25seSkgeyByZXR1cm4gZmFsc2U7IH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgfVxyXG5cclxuICB2YWxpZF9mb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlOiBtTlQsIF9uZXdEYXRhPzogbURUKTogYm9vbGVhbiB7ICAvLyB0b2RvIGNvbWViYWNrIHVuaWdub3JlIG5ld0RhdGFcclxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xyXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcclxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcclxuICAgIHJldHVybiAodGhpcy5sb29rdXBfdHJhbnNpdGlvbl9mb3IodGhpcy5zdGF0ZSgpLCBuZXdTdGF0ZSkgIT09IHVuZGVmaW5lZCk7XHJcbiAgfVxyXG5cclxuXHJcbn1cclxuXHJcblxyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBzbTxtTlQsIG1EVD4odGVtcGxhdGVfc3RyaW5nczogQXJyYXk8c3RyaW5nPiAvKiAsIGFyZ3VtZW50cyAqLyk6IE1hY2hpbmU8bU5ULCBtRFQ+IHtcclxuXHJcbiAgICAvLyBmb29gYSR7MX1iJHsyfWNgIHdpbGwgY29tZSBpbiBhcyAoWydhJywnYicsJ2MnXSwxLDIpXHJcbiAgICAvLyB0aGlzIGluY2x1ZGVzIHdoZW4gYSBhbmQgYyBhcmUgZW1wdHkgc3RyaW5nc1xyXG4gICAgLy8gdGhlcmVmb3JlIHRlbXBsYXRlX3N0cmluZ3Mgd2lsbCBhbHdheXMgaGF2ZSBvbmUgbW9yZSBlbCB0aGFuIHRlbXBsYXRlX2FyZ3NcclxuICAgIC8vIHRoZXJlZm9yZSBtYXAgdGhlIHNtYWxsZXIgY29udGFpbmVyIGFuZCB0b3NzIHRoZSBsYXN0IG9uZSBvbiBvbiB0aGUgd2F5IG91dFxyXG5cclxuICAgIHJldHVybiBuZXcgTWFjaGluZShtYWtlKHRlbXBsYXRlX3N0cmluZ3MucmVkdWNlKFxyXG5cclxuICAgICAgLy8gaW4gZ2VuZXJhbCBhdm9pZGluZyBgYXJndW1lbnRzYCBpcyBzbWFydC4gIGhvd2V2ZXIgd2l0aCB0aGUgdGVtcGxhdGVcclxuICAgICAgLy8gc3RyaW5nIG5vdGF0aW9uLCBhcyBkZXNpZ25lZCwgaXQncyBub3QgcmVhbGx5IHdvcnRoIHRoZSBoYXNzbGVcclxuXHJcbiAgICAgIC8qIGVzbGludC1kaXNhYmxlIGZwL25vLWFyZ3VtZW50cyAqL1xyXG4gICAgICAvKiBlc2xpbnQtZGlzYWJsZSBwcmVmZXItcmVzdC1wYXJhbXMgKi9cclxuICAgICAgKGFjYywgdmFsLCBpZHgpOiBzdHJpbmcgPT4gYCR7YWNjfSR7YXJndW1lbnRzW2lkeF19JHt2YWx9YCAgLy8gYXJndW1lbnRzWzBdIGlzIG5ldmVyIGxvYWRlZCwgc28gYXJncyBkb2Vzbid0IG5lZWQgdG8gYmUgZ2F0ZWRcclxuICAgICAgLyogZXNsaW50LWVuYWJsZSAgcHJlZmVyLXJlc3QtcGFyYW1zICovXHJcbiAgICAgIC8qIGVzbGludC1lbmFibGUgIGZwL25vLWFyZ3VtZW50cyAqL1xyXG5cclxuICAgICkpKTtcclxuXHJcbn1cclxuXHJcblxyXG5cclxuXHJcblxyXG5leHBvcnQge1xyXG5cclxuICB2ZXJzaW9uLFxyXG5cclxuICBNYWNoaW5lLFxyXG5cclxuICBtYWtlLFxyXG4gICAgcGFyc2UsXHJcbiAgICBjb21waWxlLFxyXG5cclxuICBzbSxcclxuXHJcbiAgYXJyb3dfZGlyZWN0aW9uLFxyXG4gIGFycm93X2xlZnRfa2luZCxcclxuICBhcnJvd19yaWdodF9raW5kLFxyXG5cclxuICAvLyB0b2RvIHdoYXJnYXJibCB0aGVzZSBzaG91bGQgYmUgZXhwb3J0ZWQgdG8gYSB1dGlsaXR5IGxpYnJhcnlcclxuICBzZXEsIHdlaWdodGVkX3JhbmRfc2VsZWN0LCBoaXN0b2dyYXBoLCB3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0LCB3ZWlnaHRlZF9oaXN0b19rZXlcclxuXHJcbn07XHJcbiJdfQ==