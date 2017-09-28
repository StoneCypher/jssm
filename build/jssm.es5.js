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

var version = '5.10.0'; // replaced from package.js in build


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

  var tautologies = ['graph_layout', 'start_states', 'end_states', 'machine_name', 'machine_version', 'machine_comment', 'machine_author', 'machine_contributor', 'machine_definition', 'machine_reference', 'machine_license', 'fsl_version', 'state_declaration'];

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
    state_declaration: [],
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

  ['machine_author', 'machine_contributor', 'machine_reference', 'state_declaration'].map(function (multiKey) {
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
  // eslint-disable-line flowtype/no-weak-types
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
        state_declaration = _ref2.state_declaration,
        fsl_version = _ref2.fsl_version,
        _ref2$graph_layout = _ref2.graph_layout,
        graph_layout = _ref2$graph_layout === undefined ? 'dot' : _ref2$graph_layout;

    _classCallCheck(this, Machine);

    this._state = start_states[0];
    this._states = new Map();
    this._state_declarations = new Map();
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
    this._raw_state_declaration = state_declaration || [];
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
  } // eslint-disable-line flowtype/no-weak-types

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
    key: 'raw_state_declarations',
    value: function raw_state_declarations() {
      // eslint-disable-line flowtype/no-weak-types
      return this._raw_state_declaration;
    }
  }, {
    key: 'state_declaration',
    value: function state_declaration(which) {
      // eslint-disable-line flowtype/no-weak-types
      return this._state_declarations.get(which);
    }
  }, {
    key: 'state_declarations',
    value: function state_declarations() {
      // eslint-disable-line flowtype/no-weak-types
      return this._state_declarations;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLmpzIl0sIm5hbWVzIjpbInJlZHVjZV90b182MzkiLCJyZXF1aXJlIiwicmVkdWNlIiwicGFyc2UiLCJ2ZXJzaW9uIiwiYXJyb3dfZGlyZWN0aW9uIiwiYXJyb3ciLCJTdHJpbmciLCJFcnJvciIsImFycm93X2xlZnRfa2luZCIsImFycm93X3JpZ2h0X2tpbmQiLCJjb21waWxlX3J1bGVfdHJhbnNpdGlvbl9zdGVwIiwiYWNjIiwiZnJvbSIsInRvIiwidGhpc19zZSIsIm5leHRfc2UiLCJlZGdlcyIsInVGcm9tIiwiQXJyYXkiLCJpc0FycmF5IiwidVRvIiwibWFwIiwiZiIsInQiLCJyayIsImtpbmQiLCJsayIsInJpZ2h0IiwiZm9yY2VkX29ubHkiLCJtYWluX3BhdGgiLCJyX2FjdGlvbiIsImFjdGlvbiIsInJfcHJvYmFiaWxpdHkiLCJwcm9iYWJpbGl0eSIsInB1c2giLCJsZWZ0IiwibF9hY3Rpb24iLCJsX3Byb2JhYmlsaXR5IiwibmV3X2FjYyIsImNvbmNhdCIsInNlIiwiY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uIiwicnVsZSIsImNvbXBpbGVfcnVsZV9oYW5kbGVyIiwia2V5IiwiYWdnX2FzIiwidmFsIiwidmFsdWUiLCJ0YXV0b2xvZ2llcyIsImluY2x1ZGVzIiwiSlNPTiIsInN0cmluZ2lmeSIsImNvbXBpbGUiLCJ0cmVlIiwicmVzdWx0cyIsImdyYXBoX2xheW91dCIsInRyYW5zaXRpb24iLCJzdGFydF9zdGF0ZXMiLCJlbmRfc3RhdGVzIiwic3RhdGVfZGVjbGFyYXRpb24iLCJmc2xfdmVyc2lvbiIsIm1hY2hpbmVfYXV0aG9yIiwibWFjaGluZV9jb21tZW50IiwibWFjaGluZV9jb250cmlidXRvciIsIm1hY2hpbmVfZGVmaW5pdGlvbiIsIm1hY2hpbmVfbGFuZ3VhZ2UiLCJtYWNoaW5lX2xpY2Vuc2UiLCJtYWNoaW5lX25hbWUiLCJtYWNoaW5lX3JlZmVyZW5jZSIsIm1hY2hpbmVfdmVyc2lvbiIsInRyIiwiYXNzZW1ibGVkX3RyYW5zaXRpb25zIiwicmVzdWx0X2NmZyIsImxlbmd0aCIsInRyYW5zaXRpb25zIiwib25lT25seUtleXMiLCJvbmVPbmx5S2V5IiwibXVsdGlLZXkiLCJtYWtlIiwicGxhbiIsIk1hY2hpbmUiLCJjb21wbGV0ZSIsIl9zdGF0ZSIsIl9zdGF0ZXMiLCJNYXAiLCJfc3RhdGVfZGVjbGFyYXRpb25zIiwiX2VkZ2VzIiwiX2VkZ2VfbWFwIiwiX25hbWVkX3RyYW5zaXRpb25zIiwiX2FjdGlvbnMiLCJfcmV2ZXJzZV9hY3Rpb25zIiwiX3JldmVyc2VfYWN0aW9uX3RhcmdldHMiLCJfbWFjaGluZV9hdXRob3IiLCJfbWFjaGluZV9jb21tZW50IiwiX21hY2hpbmVfY29udHJpYnV0b3IiLCJfbWFjaGluZV9kZWZpbml0aW9uIiwiX21hY2hpbmVfbGFuZ3VhZ2UiLCJfbWFjaGluZV9saWNlbnNlIiwiX21hY2hpbmVfbmFtZSIsIl9tYWNoaW5lX3ZlcnNpb24iLCJfcmF3X3N0YXRlX2RlY2xhcmF0aW9uIiwiX2ZzbF92ZXJzaW9uIiwiX2dyYXBoX2xheW91dCIsInVuZGVmaW5lZCIsImN1cnNvcl9mcm9tIiwiZ2V0IiwibmFtZSIsImhhcyIsIl9uZXdfc3RhdGUiLCJjdXJzb3JfdG8iLCJ0aGlzRWRnZUlkIiwic2V0IiwiZnJvbV9tYXBwaW5nIiwiYWN0aW9uTWFwIiwickFjdGlvbk1hcCIsInN0YXRlX2NvbmZpZyIsIndoaWNoU3RhdGUiLCJzdGF0ZV9pc190ZXJtaW5hbCIsInN0YXRlX2lzX2NvbXBsZXRlIiwic3RhdGVfaXNfZmluYWwiLCJzdGF0ZSIsIndoaWNoIiwiaW50ZXJuYWxfc3RhdGVfaW1wbF92ZXJzaW9uIiwiYWN0aW9ucyIsImVkZ2VfbWFwIiwibmFtZWRfdHJhbnNpdGlvbnMiLCJyZXZlcnNlX2FjdGlvbnMiLCJzdGF0ZXMiLCJrZXlzIiwiZW1nIiwiaWQiLCJnZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyIsImVudHJhbmNlcyIsImxpc3RfZW50cmFuY2VzIiwiZXhpdHMiLCJsaXN0X2V4aXRzIiwid3N0YXRlIiwid3N0YXRlX3RvIiwid3RmIiwid3MiLCJsb29rdXBfdHJhbnNpdGlvbl9mb3IiLCJmaWx0ZXIiLCJCb29sZWFuIiwic2VsZWN0ZWQiLCJwcm9iYWJsZV9leGl0c19mb3IiLCJuIiwic3RhdGVfd2FzIiwicHJvYmFiaWxpc3RpY190cmFuc2l0aW9uIiwicHJvYmFiaWxpc3RpY193YWxrIiwicmFfYmFzZSIsInZhbHVlcyIsImVkZ2VJZCIsIm8iLCJmaWx0ZXJlZCIsInNvbWUiLCJ4IiwiaXNfdW5lbnRlcmFibGUiLCJuZXdEYXRhIiwidmFsaWRfYWN0aW9uIiwiZWRnZSIsImN1cnJlbnRfYWN0aW9uX2VkZ2VfZm9yIiwibmV3U3RhdGUiLCJ2YWxpZF90cmFuc2l0aW9uIiwidmFsaWRfZm9yY2VfdHJhbnNpdGlvbiIsImFjdGlvbl9iYXNlIiwiaWR4IiwiY3VycmVudF9hY3Rpb25fZm9yIiwiX25ld0RhdGEiLCJ0cmFuc2l0aW9uX2ZvciIsInNtIiwidGVtcGxhdGVfc3RyaW5ncyIsInNlcSIsIndlaWdodGVkX3JhbmRfc2VsZWN0IiwiaGlzdG9ncmFwaCIsIndlaWdodGVkX3NhbXBsZV9zZWxlY3QiLCJ3ZWlnaHRlZF9oaXN0b19rZXkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQTJCQTs7Ozs7O0FBMUJBOztBQUlBLElBQU1BLGdCQUEyQkMsUUFBUSxpQkFBUixFQUEyQkMsTUFBNUQ7O0FBd0JBLElBQU1DLFFBQStDRixRQUFRLGVBQVIsRUFBeUJFLEtBQTlFLEMsQ0FBc0Y7O0FBRXRGLElBQU1DLFVBQWdCLElBQXRCLEMsQ0FBNEI7OztBQU01Qjs7QUFFQSxTQUFTQyxlQUFULENBQXlCQyxLQUF6QixFQUErRDs7QUFFN0QsVUFBU0MsT0FBT0QsS0FBUCxDQUFUOztBQUVFLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNiLGFBQU8sT0FB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QXFEdkgsR0FBckQ7QUFBQSxHQVBzQixDQU9zQztBQUM1RDtBQUNBOztBQVRzQixHQUFMLENBQVosQ0FBUDtBQWFIOztRQVFDM0MsTyxHQUFBQSxPO1FBRUE2RSxPLEdBQUFBLE87UUFFQUYsSSxHQUFBQSxJO1FBQ0U1RSxLLEdBQUFBLEs7UUFDQWtELE8sR0FBQUEsTztRQUVGcUgsRSxHQUFBQSxFO1FBRUFySyxlLEdBQUFBLGU7UUFDQUksZSxHQUFBQSxlO1FBQ0FDLGdCLEdBQUFBLGdCO1FBR0FrSyxHO1FBQUtDLG9CO1FBQXNCQyxVO1FBQVlDLHNCO1FBQXdCQyxrQiIsImZpbGUiOiJqc3NtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vLyB3aGFyZ2FyYmwgbG90cyBvZiB0aGVzZSByZXR1cm4gYXJyYXlzIGNvdWxkL3Nob3VsZCBiZSBzZXRzXG5cbi8vIEBmbG93XG5cbmNvbnN0IHJlZHVjZV90b182MzkgOiBGdW5jdGlvbiA9IHJlcXVpcmUoJ3JlZHVjZS10by02MzktMScpLnJlZHVjZTtcblxuXG5cblxuXG5pbXBvcnQgdHlwZSB7XG5cbiAgSnNzbUdlbmVyaWNTdGF0ZSwgSnNzbUdlbmVyaWNDb25maWcsXG4gIEpzc21UcmFuc2l0aW9uLCBKc3NtVHJhbnNpdGlvbkxpc3QsXG4gIEpzc21NYWNoaW5lSW50ZXJuYWxTdGF0ZSxcbiAgSnNzbVBhcnNlVHJlZSxcbiAgSnNzbUNvbXBpbGVTZSwgSnNzbUNvbXBpbGVTZVN0YXJ0LCBKc3NtQ29tcGlsZVJ1bGUsXG4gIEpzc21BcnJvdywgSnNzbUFycm93RGlyZWN0aW9uLCBKc3NtQXJyb3dLaW5kLFxuICBKc3NtTGF5b3V0XG5cbn0gZnJvbSAnLi9qc3NtLXR5cGVzJztcblxuXG5cblxuXG5pbXBvcnQgeyBzZXEsIHdlaWdodGVkX3JhbmRfc2VsZWN0LCB3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0LCBoaXN0b2dyYXBoLCB3ZWlnaHRlZF9oaXN0b19rZXkgfSBmcm9tICcuL2pzc20tdXRpbC5qcyc7XG5cbmNvbnN0IHBhcnNlOiA8TlQsIERUPihzdHJpbmcpID0+IEpzc21QYXJzZVRyZWU8TlQ+ID0gcmVxdWlyZSgnLi9qc3NtLWRvdC5qcycpLnBhcnNlOyAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBmbG93dHlwZS9uby13ZWFrLXR5cGVzIC8vIHRvZG8gd2hhcmdhcmJsIHJlbW92ZSBhbnlcblxuY29uc3QgdmVyc2lvbjogbnVsbCA9IG51bGw7IC8vIHJlcGxhY2VkIGZyb20gcGFja2FnZS5qcyBpbiBidWlsZFxuXG5cblxuXG5cbi8qIGVzbGludC1kaXNhYmxlIGNvbXBsZXhpdHkgKi9cblxuZnVuY3Rpb24gYXJyb3dfZGlyZWN0aW9uKGFycm93OiBKc3NtQXJyb3cpOiBKc3NtQXJyb3dEaXJlY3Rpb24ge1xuXG4gIHN3aXRjaCAoIFN0cmluZyhhcnJvdykgKSB7XG5cbiAgICBjYXNlICctPicgOiAgICBjYXNlICfihpInIDpcbiAgICBjYXNlICc9PicgOiAgICBjYXNlICfih5InIDpcbiAgICBjYXNlICd+PicgOiAgICBjYXNlICfihpsnIDpcbiAgICAgIHJldHVybiAncmlnaHQnO1xuXG4gICAgY2FzZSAnPC0nIDogICAgY2FzZSAn4oaQJyA6XG4gICAgY2FzZSAnPD0nIDogICAgY2FzZSAn4oeQJyA6XG4gICAgY2FzZSAnPH4nIDogICAgY2FzZSAn4oaaJyA6XG4gICAgICByZXR1cm4gJ2xlZnQnO1xuXG4gICAgY2FzZSAnPC0+JzogICAgY2FzZSAn4oaUJyA6XG4gICAgY2FzZSAnPC09Pic6ICAgY2FzZSAn4oaQ4oeSJyA6XG4gICAgY2FzZSAnPC1+Pic6ICAgY2FzZSAn4oaQ4oabJyA6XG5cbiAgICBjYXNlICc8PT4nOiAgICBjYXNlICfih5QnIDpcbiAgICBjYXNlICc8PS0+JzogICBjYXNlICfih5DihpInIDpcbiAgICBjYXNlICc8PX4+JzogICBjYXNlICfih5DihpsnIDpcblxuICAgIGNhc2UgJzx+Pic6ICAgIGNhc2UgJ+KGricgOlxuICAgIGNhc2UgJzx+LT4nOiAgIGNhc2UgJ+KGmuKGkicgOlxuICAgIGNhc2UgJzx+PT4nOiAgIGNhc2UgJ+KGmuKHkicgOlxuICAgICAgcmV0dXJuICdib3RoJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGFycm93X2RpcmVjdGlvbjogdW5rbm93biBhcnJvdyB0eXBlICR7YXJyb3d9YCk7XG5cbiAgfVxuXG59XG5cbi8qIGVzbGludC1lbmFibGUgY29tcGxleGl0eSAqL1xuXG5cblxuXG5cbi8qIGVzbGludC1kaXNhYmxlIGNvbXBsZXhpdHkgKi9cblxuZnVuY3Rpb24gYXJyb3dfbGVmdF9raW5kKGFycm93OiBKc3NtQXJyb3cpOiBKc3NtQXJyb3dLaW5kIHtcblxuICBzd2l0Y2ggKCBTdHJpbmcoYXJyb3cpICkge1xuXG4gICAgY2FzZSAnLT4nIDogICAgY2FzZSAn4oaSJyA6XG4gICAgY2FzZSAnPT4nIDogICAgY2FzZSAn4oeSJyA6XG4gICAgY2FzZSAnfj4nIDogICAgY2FzZSAn4oabJyA6XG4gICAgICByZXR1cm4gJ25vbmUnO1xuXG4gICAgY2FzZSAnPC0nOiAgICAgY2FzZSAn4oaQJyA6XG4gICAgY2FzZSAnPC0+JzogICAgY2FzZSAn4oaUJyA6XG4gICAgY2FzZSAnPC09Pic6ICAgY2FzZSAn4oaQ4oeSJyA6XG4gICAgY2FzZSAnPC1+Pic6ICAgY2FzZSAn4oaQ4oabJyA6XG4gICAgICByZXR1cm4gJ2xlZ2FsJztcblxuICAgIGNhc2UgJzw9JzogICAgIGNhc2UgJ+KHkCcgOlxuICAgIGNhc2UgJzw9Pic6ICAgIGNhc2UgJ+KHlCcgOlxuICAgIGNhc2UgJzw9LT4nOiAgIGNhc2UgJ+KHkOKGkicgOlxuICAgIGNhc2UgJzw9fj4nOiAgIGNhc2UgJ+KHkOKGmycgOlxuICAgICAgcmV0dXJuICdtYWluJztcblxuICAgIGNhc2UgJzx+JzogICAgIGNhc2UgJ+KGmicgOlxuICAgIGNhc2UgJzx+Pic6ICAgIGNhc2UgJ+KGricgOlxuICAgIGNhc2UgJzx+LT4nOiAgIGNhc2UgJ+KGmuKGkicgOlxuICAgIGNhc2UgJzx+PT4nOiAgIGNhc2UgJ+KGmuKHkicgOlxuICAgICAgcmV0dXJuICdmb3JjZWQnO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXJyb3dfZGlyZWN0aW9uOiB1bmtub3duIGFycm93IHR5cGUgJHthcnJvd31gKTtcblxuICB9XG5cbn1cblxuLyogZXNsaW50LWVuYWJsZSBjb21wbGV4aXR5ICovXG5cblxuXG5cblxuLyogZXNsaW50LWRpc2FibGUgY29tcGxleGl0eSAqL1xuXG5mdW5jdGlvbiBhcnJvd19yaWdodF9raW5kKGFycm93OiBKc3NtQXJyb3cpOiBKc3NtQXJyb3dLaW5kIHtcblxuICBzd2l0Y2ggKCBTdHJpbmcoYXJyb3cpICkge1xuXG4gICAgY2FzZSAnPC0nIDogICAgY2FzZSAn4oaQJyA6XG4gICAgY2FzZSAnPD0nIDogICAgY2FzZSAn4oeQJyA6XG4gICAgY2FzZSAnPH4nIDogICAgY2FzZSAn4oaaJyA6XG4gICAgICByZXR1cm4gJ25vbmUnO1xuXG4gICAgY2FzZSAnLT4nIDogICAgY2FzZSAn4oaSJyA6XG4gICAgY2FzZSAnPC0+JzogICAgY2FzZSAn4oaUJyA6XG4gICAgY2FzZSAnPD0tPic6ICAgY2FzZSAn4oeQ4oaSJyA6XG4gICAgY2FzZSAnPH4tPic6ICAgY2FzZSAn4oaa4oaSJyA6XG4gICAgICByZXR1cm4gJ2xlZ2FsJztcblxuICAgIGNhc2UgJz0+JyA6ICAgIGNhc2UgJ+KHkicgOlxuICAgIGNhc2UgJzw9Pic6ICAgIGNhc2UgJ+KHlCcgOlxuICAgIGNhc2UgJzwtPT4nOiAgIGNhc2UgJ+KGkOKHkicgOlxuICAgIGNhc2UgJzx+PT4nOiAgIGNhc2UgJ+KGmuKHkicgOlxuICAgICAgcmV0dXJuICdtYWluJztcblxuICAgIGNhc2UgJ34+JyA6ICAgIGNhc2UgJ+KGmycgOlxuICAgIGNhc2UgJzx+Pic6ICAgIGNhc2UgJ+KGricgOlxuICAgIGNhc2UgJzwtfj4nOiAgIGNhc2UgJ+KGkOKGmycgOlxuICAgIGNhc2UgJzw9fj4nOiAgIGNhc2UgJ+KHkOKGmycgOlxuICAgICAgcmV0dXJuICdmb3JjZWQnO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXJyb3dfZGlyZWN0aW9uOiB1bmtub3duIGFycm93IHR5cGUgJHthcnJvd31gKTtcblxuICB9XG5cbn1cblxuLyogZXNsaW50LWVuYWJsZSBjb21wbGV4aXR5ICovXG5cblxuXG5cblxuZnVuY3Rpb24gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcDxtTlQsIG1EVD4oXG4gICAgICAgICAgICAgYWNjICAgICA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPixcbiAgICAgICAgICAgICBmcm9tICAgIDogbU5ULFxuICAgICAgICAgICAgIHRvICAgICAgOiBtTlQsXG4gICAgICAgICAgICAgdGhpc19zZSA6IEpzc21Db21waWxlU2U8bU5UPixcbiAgICAgICAgICAgICBuZXh0X3NlIDogSnNzbUNvbXBpbGVTZTxtTlQ+XG4gICAgICAgICApIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHsgLy8gdG9kbyBmbG93IGRlc2NyaWJlIHRoZSBwYXJzZXIgcmVwcmVzZW50YXRpb24gb2YgYSB0cmFuc2l0aW9uIHN0ZXAgZXh0ZW5zaW9uXG5cbiAgY29uc3QgZWRnZXMgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBbXTtcblxuICBjb25zdCB1RnJvbSA6IEFycmF5PCBtTlQgPiA9IChBcnJheS5pc0FycmF5KGZyb20pPyBmcm9tIDogW2Zyb21dKSxcbiAgICAgICAgdVRvICAgOiBBcnJheTwgbU5UID4gPSAoQXJyYXkuaXNBcnJheSh0byk/ICAgdG8gICA6IFt0b10gICk7XG5cbiAgdUZyb20ubWFwKCAoZjogbU5UKSA9PiB7XG4gICAgdVRvLm1hcCggKHQ6IG1OVCkgPT4ge1xuXG4gICAgICBjb25zdCByazogSnNzbUFycm93S2luZCA9IGFycm93X3JpZ2h0X2tpbmQodGhpc19zZS5raW5kKSxcbiAgICAgICAgICAgIGxrOiBKc3NtQXJyb3dLaW5kID0gYXJyb3dfbGVmdF9raW5kKHRoaXNfc2Uua2luZCk7XG5cblxuICAgICAgY29uc3QgcmlnaHQ6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHtcbiAgICAgICAgZnJvbSAgICAgICAgOiBmLFxuICAgICAgICB0byAgICAgICAgICA6IHQsXG4gICAgICAgIGtpbmQgICAgICAgIDogcmssXG4gICAgICAgIGZvcmNlZF9vbmx5IDogcmsgPT09ICdmb3JjZWQnLFxuICAgICAgICBtYWluX3BhdGggICA6IHJrID09PSAnbWFpbidcbiAgICAgIH07XG5cbiAgICAgIGlmICh0aGlzX3NlLnJfYWN0aW9uKSAgICAgIHsgcmlnaHQuYWN0aW9uICAgICAgPSB0aGlzX3NlLnJfYWN0aW9uOyAgICAgIH1cbiAgICAgIGlmICh0aGlzX3NlLnJfcHJvYmFiaWxpdHkpIHsgcmlnaHQucHJvYmFiaWxpdHkgPSB0aGlzX3NlLnJfcHJvYmFiaWxpdHk7IH1cbiAgICAgIGlmIChyaWdodC5raW5kICE9PSAnbm9uZScpIHsgZWRnZXMucHVzaChyaWdodCk7IH1cblxuXG4gICAgICBjb25zdCBsZWZ0OiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB7XG4gICAgICAgIGZyb20gICAgICAgIDogdCxcbiAgICAgICAgdG8gICAgICAgICAgOiBmLFxuICAgICAgICBraW5kICAgICAgICA6IGxrLFxuICAgICAgICBmb3JjZWRfb25seSA6IGxrID09PSAnZm9yY2VkJyxcbiAgICAgICAgbWFpbl9wYXRoICAgOiBsayA9PT0gJ21haW4nXG4gICAgICB9O1xuXG4gICAgICBpZiAodGhpc19zZS5sX2FjdGlvbikgICAgICB7IGxlZnQuYWN0aW9uICAgICAgPSB0aGlzX3NlLmxfYWN0aW9uOyAgICAgIH1cbiAgICAgIGlmICh0aGlzX3NlLmxfcHJvYmFiaWxpdHkpIHsgbGVmdC5wcm9iYWJpbGl0eSA9IHRoaXNfc2UubF9wcm9iYWJpbGl0eTsgfVxuICAgICAgaWYgKGxlZnQua2luZCAhPT0gJ25vbmUnKSAgeyBlZGdlcy5wdXNoKGxlZnQpOyB9XG5cbiAgICB9KTtcbiAgfSk7XG5cbiAgY29uc3QgbmV3X2FjYzogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+ID0gYWNjLmNvbmNhdChlZGdlcyk7XG5cbiAgaWYgKG5leHRfc2UpIHtcbiAgICByZXR1cm4gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcChuZXdfYWNjLCB0bywgbmV4dF9zZS50bywgbmV4dF9zZSwgbmV4dF9zZS5zZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ld19hY2M7XG4gIH1cblxufVxuXG5cblxuZnVuY3Rpb24gY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uPG1OVD4ocnVsZTogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pOiBtaXhlZCB7IC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgcGFyc2VyIHJlcHJlc2VudGF0aW9uIG9mIGEgdHJhbnNpdGlvblxuICByZXR1cm4gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcChbXSwgcnVsZS5mcm9tLCBydWxlLnNlLnRvLCBydWxlLnNlLCBydWxlLnNlLnNlKTtcbn1cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVfcnVsZV9oYW5kbGVyPG1OVD4ocnVsZTogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pOiBKc3NtQ29tcGlsZVJ1bGUgeyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIG91dHB1dCBvZiB0aGUgcGFyc2VyXG5cbiAgaWYgKHJ1bGUua2V5ID09PSAndHJhbnNpdGlvbicpIHtcbiAgICByZXR1cm4geyBhZ2dfYXM6ICd0cmFuc2l0aW9uJywgdmFsOiBjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb24ocnVsZSkgfTtcbiAgfVxuXG4gIGlmIChydWxlLmtleSA9PT0gJ21hY2hpbmVfbGFuZ3VhZ2UnKSB7XG4gICAgcmV0dXJuIHsgYWdnX2FzOiAnbWFjaGluZV9sYW5ndWFnZScsIHZhbDogcmVkdWNlX3RvXzYzOShydWxlLnZhbHVlKSB9O1xuICB9XG5cbiAgY29uc3QgdGF1dG9sb2dpZXMgOiBBcnJheTxzdHJpbmc+ID0gW1xuICAgICdncmFwaF9sYXlvdXQnLCAnc3RhcnRfc3RhdGVzJywgJ2VuZF9zdGF0ZXMnLCAnbWFjaGluZV9uYW1lJywgJ21hY2hpbmVfdmVyc2lvbicsXG4gICAgJ21hY2hpbmVfY29tbWVudCcsICdtYWNoaW5lX2F1dGhvcicsICdtYWNoaW5lX2NvbnRyaWJ1dG9yJywgJ21hY2hpbmVfZGVmaW5pdGlvbicsXG4gICAgJ21hY2hpbmVfcmVmZXJlbmNlJywgJ21hY2hpbmVfbGljZW5zZScsICdmc2xfdmVyc2lvbicsICdzdGF0ZV9kZWNsYXJhdGlvbidcbiAgXTtcblxuICBpZiAodGF1dG9sb2dpZXMuaW5jbHVkZXMocnVsZS5rZXkpKSB7XG4gICAgcmV0dXJuIHsgYWdnX2FzOiBydWxlLmtleSwgdmFsOiBydWxlLnZhbHVlIH07XG4gIH1cblxuICB0aHJvdyBuZXcgRXJyb3IoYGNvbXBpbGVfcnVsZV9oYW5kbGVyOiBVbmtub3duIHJ1bGU6ICR7SlNPTi5zdHJpbmdpZnkocnVsZSl9YCk7XG5cbn1cblxuXG5cblxuXG5mdW5jdGlvbiBjb21waWxlPG1OVCwgbURUPih0cmVlOiBKc3NtUGFyc2VUcmVlPG1OVD4pOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4geyAgLy8gdG9kbyBmbG93IGRlc2NyaWJlIHRoZSBvdXRwdXQgb2YgdGhlIHBhcnNlclxuXG4gIGNvbnN0IHJlc3VsdHMgOiB7XG4gICAgZ3JhcGhfbGF5b3V0ICAgICAgICA6IEFycmF5PCBKc3NtTGF5b3V0ID4sXG4gICAgdHJhbnNpdGlvbiAgICAgICAgICA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPixcbiAgICBzdGFydF9zdGF0ZXMgICAgICAgIDogQXJyYXk8IG1OVCA+LFxuICAgIGVuZF9zdGF0ZXMgICAgICAgICAgOiBBcnJheTwgbU5UID4sXG4gICAgc3RhdGVfZGVjbGFyYXRpb24gICA6IEFycmF5PCBtTlQgPixcbiAgICBmc2xfdmVyc2lvbiAgICAgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfYXV0aG9yICAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9jb21tZW50ICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2NvbnRyaWJ1dG9yIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfZGVmaW5pdGlvbiAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9sYW5ndWFnZSAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2xpY2Vuc2UgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfbmFtZSAgICAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9yZWZlcmVuY2UgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX3ZlcnNpb24gICAgIDogQXJyYXk8IHN0cmluZyA+IC8vIHNlbXZlclxuICB9ID0ge1xuICAgIGdyYXBoX2xheW91dCAgICAgICAgOiBbXSxcbiAgICB0cmFuc2l0aW9uICAgICAgICAgIDogW10sXG4gICAgc3RhcnRfc3RhdGVzICAgICAgICA6IFtdLFxuICAgIGVuZF9zdGF0ZXMgICAgICAgICAgOiBbXSxcbiAgICBzdGF0ZV9kZWNsYXJhdGlvbiAgIDogW10sXG4gICAgZnNsX3ZlcnNpb24gICAgICAgICA6IFtdLFxuICAgIG1hY2hpbmVfYXV0aG9yICAgICAgOiBbXSxcbiAgICBtYWNoaW5lX2NvbW1lbnQgICAgIDogW10sXG4gICAgbWFjaGluZV9jb250cmlidXRvciA6IFtdLFxuICAgIG1hY2hpbmVfZGVmaW5pdGlvbiAgOiBbXSxcbiAgICBtYWNoaW5lX2xhbmd1YWdlICAgIDogW10sXG4gICAgbWFjaGluZV9saWNlbnNlICAgICA6IFtdLFxuICAgIG1hY2hpbmVfbmFtZSAgICAgICAgOiBbXSxcbiAgICBtYWNoaW5lX3JlZmVyZW5jZSAgIDogW10sXG4gICAgbWFjaGluZV92ZXJzaW9uICAgICA6IFtdXG4gIH07XG5cbiAgdHJlZS5tYXAoICh0ciA6IEpzc21Db21waWxlU2VTdGFydDxtTlQ+KSA9PiB7XG5cbiAgICBjb25zdCBydWxlICAgOiBKc3NtQ29tcGlsZVJ1bGUgPSBjb21waWxlX3J1bGVfaGFuZGxlcih0ciksXG4gICAgICAgICAgYWdnX2FzIDogc3RyaW5nICAgICAgICAgID0gcnVsZS5hZ2dfYXMsXG4gICAgICAgICAgdmFsICAgIDogbWl4ZWQgICAgICAgICAgID0gcnVsZS52YWw7ICAgICAgICAgICAgICAgICAgLy8gdG9kbyBiZXR0ZXIgdHlwZXNcblxuICAgIHJlc3VsdHNbYWdnX2FzXSA9IHJlc3VsdHNbYWdnX2FzXS5jb25jYXQodmFsKTtcblxuICB9KTtcblxuICBjb25zdCBhc3NlbWJsZWRfdHJhbnNpdGlvbnMgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBbXS5jb25jYXQoLi4uIHJlc3VsdHNbJ3RyYW5zaXRpb24nXSk7XG5cbiAgY29uc3QgcmVzdWx0X2NmZyA6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPiA9IHtcbiAgICBzdGFydF9zdGF0ZXMgOiByZXN1bHRzLnN0YXJ0X3N0YXRlcy5sZW5ndGg/IHJlc3VsdHMuc3RhcnRfc3RhdGVzIDogW2Fzc2VtYmxlZF90cmFuc2l0aW9uc1swXS5mcm9tXSxcbiAgICB0cmFuc2l0aW9ucyAgOiBhc3NlbWJsZWRfdHJhbnNpdGlvbnNcbiAgfTtcblxuICBjb25zdCBvbmVPbmx5S2V5cyA6IEFycmF5PHN0cmluZz4gPSBbXG4gICAgJ2dyYXBoX2xheW91dCcsICdtYWNoaW5lX25hbWUnLCAnbWFjaGluZV92ZXJzaW9uJywgJ21hY2hpbmVfY29tbWVudCcsICdmc2xfdmVyc2lvbicsICdtYWNoaW5lX2xpY2Vuc2UnLFxuICAgICdtYWNoaW5lX2RlZmluaXRpb24nLCAnbWFjaGluZV9sYW5ndWFnZSdcbiAgXTtcblxuICBvbmVPbmx5S2V5cy5tYXAoIChvbmVPbmx5S2V5IDogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHJlc3VsdHNbb25lT25seUtleV0ubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNYXkgb25seSBoYXZlIG9uZSAke29uZU9ubHlLZXl9IHN0YXRlbWVudCBtYXhpbXVtOiAke0pTT04uc3RyaW5naWZ5KHJlc3VsdHNbb25lT25seUtleV0pfWApO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAocmVzdWx0c1tvbmVPbmx5S2V5XS5sZW5ndGgpIHtcbiAgICAgICAgcmVzdWx0X2NmZ1tvbmVPbmx5S2V5XSA9IHJlc3VsdHNbb25lT25seUtleV1bMF07XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBbJ21hY2hpbmVfYXV0aG9yJywgJ21hY2hpbmVfY29udHJpYnV0b3InLCAnbWFjaGluZV9yZWZlcmVuY2UnLCAnc3RhdGVfZGVjbGFyYXRpb24nXS5tYXAoIChtdWx0aUtleSA6IHN0cmluZykgPT4ge1xuICAgIGlmIChyZXN1bHRzW211bHRpS2V5XS5sZW5ndGgpIHtcbiAgICAgIHJlc3VsdF9jZmdbbXVsdGlLZXldID0gcmVzdWx0c1ttdWx0aUtleV07XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcmVzdWx0X2NmZztcblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIG1ha2U8bU5ULCBtRFQ+KHBsYW46IHN0cmluZyk6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPiB7XG4gIHJldHVybiBjb21waWxlKHBhcnNlKHBsYW4pKTtcbn1cblxuXG5cblxuXG5jbGFzcyBNYWNoaW5lPG1OVCwgbURUPiB7XG5cblxuICBfc3RhdGUgICAgICAgICAgICAgICAgICA6IG1OVDtcbiAgX3N0YXRlcyAgICAgICAgICAgICAgICAgOiBNYXA8bU5ULCBKc3NtR2VuZXJpY1N0YXRlPG1OVD4+O1xuICBfZWRnZXMgICAgICAgICAgICAgICAgICA6IEFycmF5PEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPj47XG4gIF9lZGdlX21hcCAgICAgICAgICAgICAgIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG4gIF9uYW1lZF90cmFuc2l0aW9ucyAgICAgIDogTWFwPG1OVCwgbnVtYmVyPjtcbiAgX2FjdGlvbnMgICAgICAgICAgICAgICAgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcbiAgX3JldmVyc2VfYWN0aW9ucyAgICAgICAgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcbiAgX3JldmVyc2VfYWN0aW9uX3RhcmdldHMgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcblxuICBfbWFjaGluZV9hdXRob3IgICAgICAgICA6ID9BcnJheTxzdHJpbmc+O1xuICBfbWFjaGluZV9jb21tZW50ICAgICAgICA6ID9zdHJpbmc7XG4gIF9tYWNoaW5lX2NvbnRyaWJ1dG9yICAgIDogP0FycmF5PHN0cmluZz47XG4gIF9tYWNoaW5lX2RlZmluaXRpb24gICAgIDogP3N0cmluZztcbiAgX21hY2hpbmVfbGFuZ3VhZ2UgICAgICAgOiA/c3RyaW5nO1xuICBfbWFjaGluZV9saWNlbnNlICAgICAgICA6ID9zdHJpbmc7XG4gIF9tYWNoaW5lX25hbWUgICAgICAgICAgIDogP3N0cmluZztcbiAgX21hY2hpbmVfdmVyc2lvbiAgICAgICAgOiA/c3RyaW5nO1xuICBfZnNsX3ZlcnNpb24gICAgICAgICAgICA6ID9zdHJpbmc7XG4gIF9yYXdfc3RhdGVfZGVjbGFyYXRpb24gIDogP0FycmF5PE9iamVjdD47ICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZmxvd3R5cGUvbm8td2Vhay10eXBlc1xuICBfc3RhdGVfZGVjbGFyYXRpb25zICAgICA6IE1hcDxtTlQsIE9iamVjdD47ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXNcblxuICBfZ3JhcGhfbGF5b3V0ICAgICAgICAgICA6IEpzc21MYXlvdXQ7XG5cblxuICAvLyB3aGFyZ2FyYmwgdGhpcyBiYWRseSBuZWVkcyB0byBiZSBicm9rZW4gdXAsIG1vbm9saXRoIG1hc3RlclxuICBjb25zdHJ1Y3Rvcih7XG4gICAgc3RhcnRfc3RhdGVzLFxuICAgIGNvbXBsZXRlICAgICAgICA9IFtdLFxuICAgIHRyYW5zaXRpb25zLFxuICAgIG1hY2hpbmVfYXV0aG9yLFxuICAgIG1hY2hpbmVfY29tbWVudCxcbiAgICBtYWNoaW5lX2NvbnRyaWJ1dG9yLFxuICAgIG1hY2hpbmVfZGVmaW5pdGlvbixcbiAgICBtYWNoaW5lX2xhbmd1YWdlLFxuICAgIG1hY2hpbmVfbGljZW5zZSxcbiAgICBtYWNoaW5lX25hbWUsXG4gICAgbWFjaGluZV92ZXJzaW9uLFxuICAgIHN0YXRlX2RlY2xhcmF0aW9uLFxuICAgIGZzbF92ZXJzaW9uLFxuICAgIGdyYXBoX2xheW91dCA9ICdkb3QnXG4gIH0gOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4pIHtcblxuICAgIHRoaXMuX3N0YXRlICAgICAgICAgICAgICAgICAgPSBzdGFydF9zdGF0ZXNbMF07XG4gICAgdGhpcy5fc3RhdGVzICAgICAgICAgICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9zdGF0ZV9kZWNsYXJhdGlvbnMgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX2VkZ2VzICAgICAgICAgICAgICAgICAgPSBbXTtcbiAgICB0aGlzLl9lZGdlX21hcCAgICAgICAgICAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX25hbWVkX3RyYW5zaXRpb25zICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fYWN0aW9ucyAgICAgICAgICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbnMgICAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMgPSBuZXcgTWFwKCk7ICAgLy8gdG9kb1xuXG4gICAgdGhpcy5fbWFjaGluZV9hdXRob3IgICAgICAgICA9IG1hY2hpbmVfYXV0aG9yO1xuICAgIHRoaXMuX21hY2hpbmVfY29tbWVudCAgICAgICAgPSBtYWNoaW5lX2NvbW1lbnQ7XG4gICAgdGhpcy5fbWFjaGluZV9jb250cmlidXRvciAgICA9IG1hY2hpbmVfY29udHJpYnV0b3I7XG4gICAgdGhpcy5fbWFjaGluZV9kZWZpbml0aW9uICAgICA9IG1hY2hpbmVfZGVmaW5pdGlvbjtcbiAgICB0aGlzLl9tYWNoaW5lX2xhbmd1YWdlICAgICAgID0gbWFjaGluZV9sYW5ndWFnZTtcbiAgICB0aGlzLl9tYWNoaW5lX2xpY2Vuc2UgICAgICAgID0gbWFjaGluZV9saWNlbnNlO1xuICAgIHRoaXMuX21hY2hpbmVfbmFtZSAgICAgICAgICAgPSBtYWNoaW5lX25hbWU7XG4gICAgdGhpcy5fbWFjaGluZV92ZXJzaW9uICAgICAgICA9IG1hY2hpbmVfdmVyc2lvbjtcbiAgICB0aGlzLl9yYXdfc3RhdGVfZGVjbGFyYXRpb24gID0gc3RhdGVfZGVjbGFyYXRpb24gfHwgW107XG4gICAgdGhpcy5fZnNsX3ZlcnNpb24gICAgICAgICAgICA9IGZzbF92ZXJzaW9uO1xuXG4gICAgdGhpcy5fZ3JhcGhfbGF5b3V0ICAgICAgICAgICA9IGdyYXBoX2xheW91dDtcblxuICAgIHRyYW5zaXRpb25zLm1hcCggKHRyOkpzc21UcmFuc2l0aW9uPG1OVCwgbURUPikgPT4ge1xuXG4gICAgICBpZiAodHIuZnJvbSA9PT0gdW5kZWZpbmVkKSB7IHRocm93IG5ldyBFcnJvcihgdHJhbnNpdGlvbiBtdXN0IGRlZmluZSAnZnJvbSc6ICR7SlNPTi5zdHJpbmdpZnkodHIpfWApOyB9XG4gICAgICBpZiAodHIudG8gICA9PT0gdW5kZWZpbmVkKSB7IHRocm93IG5ldyBFcnJvcihgdHJhbnNpdGlvbiBtdXN0IGRlZmluZSAndG8nOiAkeyAgSlNPTi5zdHJpbmdpZnkodHIpfWApOyB9XG5cbiAgICAgIC8vIGdldCB0aGUgY3Vyc29ycy4gIHdoYXQgYSBtZXNzXG4gICAgICBjb25zdCBjdXJzb3JfZnJvbTogSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+XG4gICAgICAgICAgPSB0aGlzLl9zdGF0ZXMuZ2V0KHRyLmZyb20pXG4gICAgICAgICB8fCB7IG5hbWU6IHRyLmZyb20sIGZyb206IFtdLCB0bzogW10sIGNvbXBsZXRlOiBjb21wbGV0ZS5pbmNsdWRlcyh0ci5mcm9tKSB9O1xuXG4gICAgICBpZiAoISh0aGlzLl9zdGF0ZXMuaGFzKHRyLmZyb20pKSkge1xuICAgICAgICB0aGlzLl9uZXdfc3RhdGUoY3Vyc29yX2Zyb20pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjdXJzb3JfdG86IEpzc21HZW5lcmljU3RhdGU8bU5UPlxuICAgICAgICAgID0gdGhpcy5fc3RhdGVzLmdldCh0ci50bylcbiAgICAgICAgIHx8IHtuYW1lOiB0ci50bywgZnJvbTogW10sIHRvOiBbXSwgY29tcGxldGU6IGNvbXBsZXRlLmluY2x1ZGVzKHRyLnRvKSB9O1xuXG4gICAgICBpZiAoISh0aGlzLl9zdGF0ZXMuaGFzKHRyLnRvKSkpIHtcbiAgICAgICAgdGhpcy5fbmV3X3N0YXRlKGN1cnNvcl90byk7XG4gICAgICB9XG5cbiAgICAgIC8vIGd1YXJkIGFnYWluc3QgZXhpc3RpbmcgY29ubmVjdGlvbnMgYmVpbmcgcmUtYWRkZWRcbiAgICAgIGlmIChjdXJzb3JfZnJvbS50by5pbmNsdWRlcyh0ci50bykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBhbHJlYWR5IGhhcyAke0pTT04uc3RyaW5naWZ5KHRyLmZyb20pfSB0byAke0pTT04uc3RyaW5naWZ5KHRyLnRvKX1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGN1cnNvcl9mcm9tLnRvLnB1c2godHIudG8pO1xuICAgICAgICBjdXJzb3JfdG8uZnJvbS5wdXNoKHRyLmZyb20pO1xuICAgICAgfVxuXG4gICAgICAvLyBhZGQgdGhlIGVkZ2U7IG5vdGUgaXRzIGlkXG4gICAgICB0aGlzLl9lZGdlcy5wdXNoKHRyKTtcbiAgICAgIGNvbnN0IHRoaXNFZGdlSWQ6IG51bWJlciA9IHRoaXMuX2VkZ2VzLmxlbmd0aCAtIDE7XG5cbiAgICAgIC8vIGd1YXJkIGFnYWluc3QgcmVwZWF0aW5nIGEgdHJhbnNpdGlvbiBuYW1lXG4gICAgICBpZiAodHIubmFtZSkge1xuICAgICAgICBpZiAodGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMuaGFzKHRyLm5hbWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBuYW1lZCB0cmFuc2l0aW9uIFwiJHtKU09OLnN0cmluZ2lmeSh0ci5uYW1lKX1cIiBhbHJlYWR5IGNyZWF0ZWRgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucy5zZXQodHIubmFtZSwgdGhpc0VkZ2VJZCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gc2V0IHVwIHRoZSBtYXBwaW5nLCBzbyB0aGF0IGVkZ2VzIGNhbiBiZSBsb29rZWQgdXAgYnkgZW5kcG9pbnQgcGFpcnNcbiAgICAgIGNvbnN0IGZyb21fbWFwcGluZzogTWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2VkZ2VfbWFwLmdldCh0ci5mcm9tKSB8fCBuZXcgTWFwKCk7XG4gICAgICBpZiAoISh0aGlzLl9lZGdlX21hcC5oYXModHIuZnJvbSkpKSB7XG4gICAgICAgIHRoaXMuX2VkZ2VfbWFwLnNldCh0ci5mcm9tLCBmcm9tX21hcHBpbmcpO1xuICAgICAgfVxuXG4vLyAgICBjb25zdCB0b19tYXBwaW5nID0gZnJvbV9tYXBwaW5nLmdldCh0ci50byk7XG4gICAgICBmcm9tX21hcHBpbmcuc2V0KHRyLnRvLCB0aGlzRWRnZUlkKTsgLy8gYWxyZWFkeSBjaGVja2VkIHRoYXQgdGhpcyBtYXBwaW5nIGRvZXNuJ3QgZXhpc3QsIGFib3ZlXG5cbiAgICAgIC8vIHNldCB1cCB0aGUgYWN0aW9uIG1hcHBpbmcsIHNvIHRoYXQgYWN0aW9ucyBjYW4gYmUgbG9va2VkIHVwIGJ5IG9yaWdpblxuICAgICAgaWYgKHRyLmFjdGlvbikge1xuXG5cbiAgICAgICAgLy8gZm9yd2FyZCBtYXBwaW5nIGZpcnN0IGJ5IGFjdGlvbiBuYW1lXG4gICAgICAgIGxldCBhY3Rpb25NYXA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fYWN0aW9ucy5nZXQodHIuYWN0aW9uKTtcbiAgICAgICAgaWYgKCEoYWN0aW9uTWFwKSkge1xuICAgICAgICAgIGFjdGlvbk1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgICB0aGlzLl9hY3Rpb25zLnNldCh0ci5hY3Rpb24sIGFjdGlvbk1hcCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYWN0aW9uTWFwLmhhcyh0ci5mcm9tKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgYWN0aW9uICR7SlNPTi5zdHJpbmdpZnkodHIuYWN0aW9uKX0gYWxyZWFkeSBhdHRhY2hlZCB0byBvcmlnaW4gJHtKU09OLnN0cmluZ2lmeSh0ci5mcm9tKX1gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhY3Rpb25NYXAuc2V0KHRyLmZyb20sIHRoaXNFZGdlSWQpO1xuICAgICAgICB9XG5cblxuICAgICAgICAvLyByZXZlcnNlIG1hcHBpbmcgZmlyc3QgYnkgc3RhdGUgb3JpZ2luIG5hbWVcbiAgICAgICAgbGV0IHJBY3Rpb25NYXA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh0ci5mcm9tKTtcbiAgICAgICAgaWYgKCEockFjdGlvbk1hcCkpIHtcbiAgICAgICAgICByQWN0aW9uTWFwID0gbmV3IE1hcCgpO1xuICAgICAgICAgIHRoaXMuX3JldmVyc2VfYWN0aW9ucy5zZXQodHIuZnJvbSwgckFjdGlvbk1hcCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBubyBuZWVkIHRvIHRlc3QgZm9yIHJldmVyc2UgbWFwcGluZyBwcmUtcHJlc2VuY2U7XG4gICAgICAgIC8vIGZvcndhcmQgbWFwcGluZyBhbHJlYWR5IGNvdmVycyBjb2xsaXNpb25zXG4gICAgICAgIHJBY3Rpb25NYXAuc2V0KHRyLmFjdGlvbiwgdGhpc0VkZ2VJZCk7XG5cblxuICAgICAgICAvLyByZXZlcnNlIG1hcHBpbmcgZmlyc3QgYnkgc3RhdGUgdGFyZ2V0IG5hbWVcbiAgICAgICAgaWYgKCEodGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5oYXModHIudG8pKSkge1xuICAgICAgICAgIHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuc2V0KHRyLnRvLCBuZXcgTWFwKCkpO1xuICAgICAgICB9XG5cbi8qIHRvZG8gY29tZWJhY2tcbiAgIGZ1bmRhbWVudGFsIHByb2JsZW0gaXMgcm9BY3Rpb25NYXAgbmVlZHMgdG8gYmUgYSBtdWx0aW1hcFxuICAgICAgICBjb25zdCByb0FjdGlvbk1hcCA9IHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuZ2V0KHRyLnRvKTsgIC8vIHdhc3RlZnVsIC0gYWxyZWFkeSBkaWQgaGFzIC0gcmVmYWN0b3JcbiAgICAgICAgaWYgKHJvQWN0aW9uTWFwKSB7XG4gICAgICAgICAgaWYgKHJvQWN0aW9uTWFwLmhhcyh0ci5hY3Rpb24pKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHJvLWFjdGlvbiAke3RyLnRvfSBhbHJlYWR5IGF0dGFjaGVkIHRvIGFjdGlvbiAke3RyLmFjdGlvbn1gKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcm9BY3Rpb25NYXAuc2V0KHRyLmFjdGlvbiwgdGhpc0VkZ2VJZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc2hvdWxkIGJlIGltcG9zc2libGUgLSBmbG93IGRvZXNuXFwndCBrbm93IC5zZXQgcHJlY2VkZXMgLmdldCB5ZXQgYWdhaW4uICBzZXZlcmUgZXJyb3I/Jyk7XG4gICAgICAgIH1cbiovXG4gICAgICB9XG5cbiAgICB9KTtcblxuICB9XG5cbiAgX25ld19zdGF0ZShzdGF0ZV9jb25maWc6IEpzc21HZW5lcmljU3RhdGU8bU5UPik6IG1OVCB7IC8vIHdoYXJnYXJibCBnZXQgdGhhdCBzdGF0ZV9jb25maWcgYW55IHVuZGVyIGNvbnRyb2xcblxuICAgIGlmICh0aGlzLl9zdGF0ZXMuaGFzKHN0YXRlX2NvbmZpZy5uYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHN0YXRlX2NvbmZpZy5uYW1lKX0gYWxyZWFkeSBleGlzdHNgKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zdGF0ZXMuc2V0KHN0YXRlX2NvbmZpZy5uYW1lLCBzdGF0ZV9jb25maWcpO1xuICAgIHJldHVybiBzdGF0ZV9jb25maWcubmFtZTtcblxuICB9XG5cblxuXG4gIHN0YXRlKCk6IG1OVCB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlO1xuICB9XG5cbi8qIHdoYXJnYXJibCB0b2RvIG1ham9yXG4gICB3aGVuIHdlIHJlaW1wbGVtZW50IHRoaXMsIHJlaW50cm9kdWNlIHRoaXMgY2hhbmdlIHRvIHRoZSBpc19maW5hbCBjYWxsXG5cbiAgaXNfY2hhbmdpbmcoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRvZG8gd2hhcmdhcmJsXG4gIH1cbiovXG5cblxuICBzdGF0ZV9pc19maW5hbCh3aGljaFN0YXRlOiBtTlQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKCAodGhpcy5zdGF0ZV9pc190ZXJtaW5hbCh3aGljaFN0YXRlKSkgJiYgKHRoaXMuc3RhdGVfaXNfY29tcGxldGUod2hpY2hTdGF0ZSkpICk7XG4gIH1cblxuICBpc19maW5hbCgpOiBib29sZWFuIHtcbi8vICByZXR1cm4gKCghdGhpcy5pc19jaGFuZ2luZygpKSAmJiB0aGlzLnN0YXRlX2lzX2ZpbmFsKHRoaXMuc3RhdGUoKSkpO1xuICAgIHJldHVybiB0aGlzLnN0YXRlX2lzX2ZpbmFsKHRoaXMuc3RhdGUoKSk7XG4gIH1cblxuICBncmFwaF9sYXlvdXQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fZ3JhcGhfbGF5b3V0O1xuICB9XG5cblxuXG4gIG1hY2hpbmVfYXV0aG9yKCk6ID9BcnJheTxzdHJpbmc+IHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9hdXRob3I7XG4gIH1cblxuICBtYWNoaW5lX2NvbW1lbnQoKTogP3N0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfY29tbWVudDtcbiAgfVxuXG4gIG1hY2hpbmVfY29udHJpYnV0b3IoKTogP0FycmF5PHN0cmluZz4ge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2NvbnRyaWJ1dG9yO1xuICB9XG5cbiAgbWFjaGluZV9kZWZpbml0aW9uKCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2RlZmluaXRpb247XG4gIH1cblxuICBtYWNoaW5lX2xhbmd1YWdlKCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2xhbmd1YWdlO1xuICB9XG5cbiAgbWFjaGluZV9saWNlbnNlKCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2xpY2Vuc2U7XG4gIH1cblxuICBtYWNoaW5lX25hbWUoKTogP3N0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfbmFtZTtcbiAgfVxuXG4gIG1hY2hpbmVfdmVyc2lvbigpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV92ZXJzaW9uO1xuICB9XG5cbiAgcmF3X3N0YXRlX2RlY2xhcmF0aW9ucygpOiA/QXJyYXk8T2JqZWN0PiB7ICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZmxvd3R5cGUvbm8td2Vhay10eXBlc1xuICAgIHJldHVybiB0aGlzLl9yYXdfc3RhdGVfZGVjbGFyYXRpb247XG4gIH1cblxuICBzdGF0ZV9kZWNsYXJhdGlvbih3aGljaDogbU5UKTogP09iamVjdCB7ICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZmxvd3R5cGUvbm8td2Vhay10eXBlc1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZV9kZWNsYXJhdGlvbnMuZ2V0KHdoaWNoKTtcbiAgfVxuXG4gIHN0YXRlX2RlY2xhcmF0aW9ucygpOiBNYXA8bU5ULCBPYmplY3Q+IHsgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBmbG93dHlwZS9uby13ZWFrLXR5cGVzXG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlX2RlY2xhcmF0aW9ucztcbiAgfVxuXG4gIGZzbF92ZXJzaW9uKCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9mc2xfdmVyc2lvbjtcbiAgfVxuXG5cblxuICBtYWNoaW5lX3N0YXRlKCk6IEpzc21NYWNoaW5lSW50ZXJuYWxTdGF0ZTxtTlQsIG1EVD4ge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGludGVybmFsX3N0YXRlX2ltcGxfdmVyc2lvbiA6IDEsXG5cbiAgICAgIGFjdGlvbnMgICAgICAgICAgICAgICAgOiB0aGlzLl9hY3Rpb25zLFxuICAgICAgZWRnZV9tYXAgICAgICAgICAgICAgICA6IHRoaXMuX2VkZ2VfbWFwLFxuICAgICAgZWRnZXMgICAgICAgICAgICAgICAgICA6IHRoaXMuX2VkZ2VzLFxuICAgICAgbmFtZWRfdHJhbnNpdGlvbnMgICAgICA6IHRoaXMuX25hbWVkX3RyYW5zaXRpb25zLFxuICAgICAgcmV2ZXJzZV9hY3Rpb25zICAgICAgICA6IHRoaXMuX3JldmVyc2VfYWN0aW9ucyxcbi8vICAgIHJldmVyc2VfYWN0aW9uX3RhcmdldHMgOiB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLFxuICAgICAgc3RhdGUgICAgICAgICAgICAgICAgICA6IHRoaXMuX3N0YXRlLFxuICAgICAgc3RhdGVzICAgICAgICAgICAgICAgICA6IHRoaXMuX3N0YXRlc1xuICAgIH07XG5cbiAgfVxuXG4vKlxuICBsb2FkX21hY2hpbmVfc3RhdGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlOyAvLyB0b2RvIHdoYXJnYXJibFxuICB9XG4qL1xuXG5cbiAgc3RhdGVzKCk6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uIHRoaXMuX3N0YXRlcy5rZXlzKCldO1xuICB9XG5cbiAgc3RhdGVfZm9yKHdoaWNoU3RhdGU6IG1OVCk6IEpzc21HZW5lcmljU3RhdGU8bU5UPiB7XG4gICAgY29uc3Qgc3RhdGU6ID9Kc3NtR2VuZXJpY1N0YXRlPG1OVD4gPSB0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmIChzdGF0ZSkgeyByZXR1cm4gc3RhdGU7IH1cbiAgICBlbHNlICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBubyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkoc3RhdGUpfWApOyB9XG4gIH1cblxuXG5cbiAgbGlzdF9lZGdlcygpOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4ge1xuICAgIHJldHVybiB0aGlzLl9lZGdlcztcbiAgfVxuXG4gIGxpc3RfbmFtZWRfdHJhbnNpdGlvbnMoKTogTWFwPG1OVCwgbnVtYmVyPiB7XG4gICAgcmV0dXJuIHRoaXMuX25hbWVkX3RyYW5zaXRpb25zO1xuICB9XG5cbiAgbGlzdF9hY3Rpb25zKCk6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uIHRoaXMuX2FjdGlvbnMua2V5cygpXTtcbiAgfVxuXG5cblxuICBnZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyhmcm9tOiBtTlQsIHRvOiBtTlQpOiA/bnVtYmVyIHtcblxuICAgIGNvbnN0IGVtZyA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fZWRnZV9tYXAuZ2V0KGZyb20pO1xuXG4gICAgaWYgKGVtZykge1xuICAgICAgcmV0dXJuIGVtZy5nZXQodG8pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICB9XG5cblxuXG4gIGxvb2t1cF90cmFuc2l0aW9uX2Zvcihmcm9tOiBtTlQsIHRvOiBtTlQpOiA/SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+IHtcbiAgICBjb25zdCBpZCA6ID9udW1iZXIgPSB0aGlzLmdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzKGZyb20sIHRvKTtcbiAgICByZXR1cm4gKChpZCA9PT0gdW5kZWZpbmVkKSB8fCAoaWQgPT09IG51bGwpKT8gdW5kZWZpbmVkIDogdGhpcy5fZWRnZXNbaWRdO1xuICB9XG5cblxuXG4gIGxpc3RfdHJhbnNpdGlvbnMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpKTogSnNzbVRyYW5zaXRpb25MaXN0PG1OVD4ge1xuICAgIHJldHVybiB7ZW50cmFuY2VzOiB0aGlzLmxpc3RfZW50cmFuY2VzKHdoaWNoU3RhdGUpLCBleGl0czogdGhpcy5saXN0X2V4aXRzKHdoaWNoU3RhdGUpfTtcbiAgfVxuXG4gIGxpc3RfZW50cmFuY2VzKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSk6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiAodGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKSB8fCB7fSkuZnJvbSB8fCBbXTtcbiAgfVxuXG4gIGxpc3RfZXhpdHMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpKTogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuICh0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpIHx8IHt9KS50byAgIHx8IFtdO1xuICB9XG5cblxuXG4gIHByb2JhYmxlX2V4aXRzX2Zvcih3aGljaFN0YXRlOiBtTlQpOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4ge1xuXG4gICAgY29uc3Qgd3N0YXRlOiA/SnNzbUdlbmVyaWNTdGF0ZTxtTlQ+ID0gdGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAoISh3c3RhdGUpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfSBpbiBwcm9iYWJsZV9leGl0c19mb3JgKTsgfVxuXG4gICAgY29uc3Qgd3N0YXRlX3RvIDogQXJyYXk8IG1OVCA+ID0gd3N0YXRlLnRvLFxuXG4gICAgICAgICAgd3RmICAgICAgIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IC8vIHdzdGF0ZV90b19maWx0ZXJlZCAtPiB3dGZcbiAgICAgICAgICAgICAgICAgICAgPSB3c3RhdGVfdG9cbiAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoICh3cykgOiA/SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMubG9va3VwX3RyYW5zaXRpb25fZm9yKHRoaXMuc3RhdGUoKSwgd3MpKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKTtcblxuICAgIHJldHVybiB3dGY7XG5cbiAgfVxuXG4gIHByb2JhYmlsaXN0aWNfdHJhbnNpdGlvbigpOiBib29sZWFuIHtcbiAgICBjb25zdCBzZWxlY3RlZCA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHdlaWdodGVkX3JhbmRfc2VsZWN0KHRoaXMucHJvYmFibGVfZXhpdHNfZm9yKHRoaXMuc3RhdGUoKSkpO1xuICAgIHJldHVybiB0aGlzLnRyYW5zaXRpb24oIHNlbGVjdGVkLnRvICk7XG4gIH1cblxuICBwcm9iYWJpbGlzdGljX3dhbGsobjogbnVtYmVyKTogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuIHNlcShuKVxuICAgICAgICAgIC5tYXAoKCkgOiBtTlQgPT4ge1xuICAgICAgICAgICAgIGNvbnN0IHN0YXRlX3dhczogbU5UID0gdGhpcy5zdGF0ZSgpO1xuICAgICAgICAgICAgIHRoaXMucHJvYmFiaWxpc3RpY190cmFuc2l0aW9uKCk7XG4gICAgICAgICAgICAgcmV0dXJuIHN0YXRlX3dhcztcbiAgICAgICAgICAgfSlcbiAgICAgICAgICAuY29uY2F0KFt0aGlzLnN0YXRlKCldKTtcbiAgfVxuXG4gIHByb2JhYmlsaXN0aWNfaGlzdG9fd2FsayhuOiBudW1iZXIpOiBNYXA8bU5ULCBudW1iZXI+IHtcbiAgICByZXR1cm4gaGlzdG9ncmFwaCh0aGlzLnByb2JhYmlsaXN0aWNfd2FsayhuKSk7XG4gIH1cblxuXG5cbiAgYWN0aW9ucyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkgKTogQXJyYXk8bU5UPiB7XG4gICAgY29uc3Qgd3N0YXRlIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICh3c3RhdGUpIHsgcmV0dXJuIFsuLi4gd3N0YXRlLmtleXMoKV07IH1cbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG4gIH1cblxuICBsaXN0X3N0YXRlc19oYXZpbmdfYWN0aW9uKHdoaWNoU3RhdGU6IG1OVCk6IEFycmF5PG1OVD4ge1xuICAgIGNvbnN0IHdzdGF0ZSA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHdzdGF0ZSkgeyByZXR1cm4gWy4uLiB3c3RhdGUua2V5cygpXTsgfVxuICAgIGVsc2UgICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cbiAgfVxuXG4vLyBjb21lYmFja1xuLypcbiAgbGlzdF9lbnRyYW5jZV9hY3Rpb25zKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSApIDogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuIFsuLi4gKHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuZ2V0KHdoaWNoU3RhdGUpIHx8IG5ldyBNYXAoKSkudmFsdWVzKCldIC8vIHdhc3RlZnVsXG4gICAgICAgICAgIC5tYXAoIChlZGdlSWQ6YW55KSA9PiAodGhpcy5fZWRnZXNbZWRnZUlkXSA6IGFueSkpIC8vIHdoYXJnYXJibCBidXJuIG91dCBhbnlcbiAgICAgICAgICAgLmZpbHRlciggKG86YW55KSA9PiBvLnRvID09PSB3aGljaFN0YXRlKVxuICAgICAgICAgICAubWFwKCBmaWx0ZXJlZCA9PiBmaWx0ZXJlZC5mcm9tICk7XG4gIH1cbiovXG4gIGxpc3RfZXhpdF9hY3Rpb25zKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSApOiBBcnJheTw/bU5UPiB7IC8vIHRoZXNlIGFyZSBtTlQsIG5vdCA/bU5UXG4gICAgY29uc3QgcmFfYmFzZTogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICghKHJhX2Jhc2UpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG5cbiAgICByZXR1cm4gWy4uLiByYV9iYXNlLnZhbHVlcygpXVxuICAgICAgICAgICAubWFwICAgICggKGVkZ2VJZDogbnVtYmVyKSAgICAgICAgICAgICAgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPT4gdGhpcy5fZWRnZXNbZWRnZUlkXSAgIClcbiAgICAgICAgICAgLmZpbHRlciAoIChvOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pIDogYm9vbGVhbiAgICAgICAgICAgICAgICAgID0+IG8uZnJvbSA9PT0gd2hpY2hTdGF0ZSApXG4gICAgICAgICAgIC5tYXAgICAgKCAoZmlsdGVyZWQ6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPikgOiA/bU5UICAgICAgICAgICAgICA9PiBmaWx0ZXJlZC5hY3Rpb24gICAgICAgKTtcbiAgfVxuXG4gIHByb2JhYmxlX2FjdGlvbl9leGl0cyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkgKSA6IEFycmF5PG1peGVkPiB7IC8vIHRoZXNlIGFyZSBtTlRcbiAgICBjb25zdCByYV9iYXNlOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKCEocmFfYmFzZSkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cblxuICAgIHJldHVybiBbLi4uIHJhX2Jhc2UudmFsdWVzKCldXG4gICAgICAgICAgIC5tYXAgICAgKCAoZWRnZUlkOiBudW1iZXIpOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPT4gdGhpcy5fZWRnZXNbZWRnZUlkXSAgIClcbiAgICAgICAgICAgLmZpbHRlciAoIChvOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pOiBib29sZWFuICAgICA9PiBvLmZyb20gPT09IHdoaWNoU3RhdGUgKVxuICAgICAgICAgICAubWFwICAgICggKGZpbHRlcmVkKTogbWl4ZWQgICAgICAgICAgICAgICAgICAgICAgICAgID0+ICggeyBhY3Rpb24gICAgICA6IGZpbHRlcmVkLmFjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvYmFiaWxpdHkgOiBmaWx0ZXJlZC5wcm9iYWJpbGl0eSB9IClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICB9XG5cblxuXG4gIGlzX3VuZW50ZXJhYmxlKHdoaWNoU3RhdGU6IG1OVCk6IGJvb2xlYW4ge1xuICAgIC8vIHdoYXJnYXJibCBzaG91bGQgdGhyb3cgb24gdW5rbm93biBzdGF0ZVxuICAgIHJldHVybiB0aGlzLmxpc3RfZW50cmFuY2VzKHdoaWNoU3RhdGUpLmxlbmd0aCA9PT0gMDtcbiAgfVxuXG4gIGhhc191bmVudGVyYWJsZXMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpOiBib29sZWFuID0+IHRoaXMuaXNfdW5lbnRlcmFibGUoeCkpO1xuICB9XG5cblxuXG4gIGlzX3Rlcm1pbmFsKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlX2lzX3Rlcm1pbmFsKHRoaXMuc3RhdGUoKSk7XG4gIH1cblxuICBzdGF0ZV9pc190ZXJtaW5hbCh3aGljaFN0YXRlOiBtTlQpOiBib29sZWFuIHtcbiAgICAvLyB3aGFyZ2FyYmwgc2hvdWxkIHRocm93IG9uIHVua25vd24gc3RhdGVcbiAgICByZXR1cm4gdGhpcy5saXN0X2V4aXRzKHdoaWNoU3RhdGUpLmxlbmd0aCA9PT0gMDtcbiAgfVxuXG4gIGhhc190ZXJtaW5hbHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpOiBib29sZWFuID0+IHRoaXMuc3RhdGVfaXNfdGVybWluYWwoeCkpO1xuICB9XG5cblxuXG4gIGlzX2NvbXBsZXRlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHRoaXMuc3RhdGUoKSk7XG4gIH1cblxuICBzdGF0ZV9pc19jb21wbGV0ZSh3aGljaFN0YXRlOiBtTlQpIDogYm9vbGVhbiB7XG4gICAgY29uc3Qgd3N0YXRlOiA/SnNzbUdlbmVyaWNTdGF0ZTxtTlQ+ID0gdGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAod3N0YXRlKSB7IHJldHVybiB3c3RhdGUuY29tcGxldGU7IH1cbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG4gIH1cblxuICBoYXNfY29tcGxldGVzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlcygpLnNvbWUoICh4KTogYm9vbGVhbiA9PiB0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHgpICk7XG4gIH1cblxuXG5cbiAgYWN0aW9uKG5hbWU6IG1OVCwgbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX2FjdGlvbihuYW1lLCBuZXdEYXRhKSkge1xuICAgICAgY29uc3QgZWRnZTogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gdGhpcy5jdXJyZW50X2FjdGlvbl9lZGdlX2ZvcihuYW1lKTtcbiAgICAgIHRoaXMuX3N0YXRlID0gZWRnZS50bztcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgdHJhbnNpdGlvbihuZXdTdGF0ZTogbU5ULCBuZXdEYXRhPzogbURUKTogYm9vbGVhbiB7XG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgaWYgKHRoaXMudmFsaWRfdHJhbnNpdGlvbihuZXdTdGF0ZSwgbmV3RGF0YSkpIHtcbiAgICAgIHRoaXMuX3N0YXRlID0gbmV3U3RhdGU7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8vIGNhbiBsZWF2ZSBtYWNoaW5lIGluIGluY29uc2lzdGVudCBzdGF0ZS4gIGdlbmVyYWxseSBkbyBub3QgdXNlXG4gIGZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGU6IG1OVCwgbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX2ZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGUsIG5ld0RhdGEpKSB7XG4gICAgICB0aGlzLl9zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuXG5cbiAgY3VycmVudF9hY3Rpb25fZm9yKGFjdGlvbjogbU5UKTogbnVtYmVyIHwgdm9pZCB7XG4gICAgY29uc3QgYWN0aW9uX2Jhc2U6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fYWN0aW9ucy5nZXQoYWN0aW9uKTtcbiAgICByZXR1cm4gYWN0aW9uX2Jhc2U/IGFjdGlvbl9iYXNlLmdldCh0aGlzLnN0YXRlKCkpOiB1bmRlZmluZWQ7XG4gIH1cblxuICBjdXJyZW50X2FjdGlvbl9lZGdlX2ZvcihhY3Rpb246IG1OVCk6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiB7XG4gICAgY29uc3QgaWR4OiA/bnVtYmVyID0gdGhpcy5jdXJyZW50X2FjdGlvbl9mb3IoYWN0aW9uKTtcbiAgICBpZiAoKGlkeCA9PT0gdW5kZWZpbmVkKSB8fCAoaWR4ID09PSBudWxsKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggYWN0aW9uICR7SlNPTi5zdHJpbmdpZnkoYWN0aW9uKX1gKTsgfVxuICAgIHJldHVybiB0aGlzLl9lZGdlc1tpZHhdO1xuICB9XG5cbiAgdmFsaWRfYWN0aW9uKGFjdGlvbjogbU5ULCBfbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4geyAgLy8gdG9kbyBjb21lYmFjayB1bmlnbm9yZSBuZXdEYXRhXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgcmV0dXJuIHRoaXMuY3VycmVudF9hY3Rpb25fZm9yKGFjdGlvbikgIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHZhbGlkX3RyYW5zaXRpb24obmV3U3RhdGU6IG1OVCwgX25ld0RhdGE/OiBtRFQpOiBib29sZWFuIHsgIC8vIHRvZG8gY29tZWJhY2sgdW5pZ25vcmUgbmV3RGF0YVxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGNvbnN0IHRyYW5zaXRpb25fZm9yOiA/SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gdGhpcy5sb29rdXBfdHJhbnNpdGlvbl9mb3IodGhpcy5zdGF0ZSgpLCBuZXdTdGF0ZSk7XG5cbiAgICBpZiAoISh0cmFuc2l0aW9uX2ZvcikpICAgICAgICAgIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgaWYgKHRyYW5zaXRpb25fZm9yLmZvcmNlZF9vbmx5KSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfVxuXG4gIHZhbGlkX2ZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGU6IG1OVCwgX25ld0RhdGE/OiBtRFQpOiBib29sZWFuIHsgIC8vIHRvZG8gY29tZWJhY2sgdW5pZ25vcmUgbmV3RGF0YVxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIHJldHVybiAodGhpcy5sb29rdXBfdHJhbnNpdGlvbl9mb3IodGhpcy5zdGF0ZSgpLCBuZXdTdGF0ZSkgIT09IHVuZGVmaW5lZCk7XG4gIH1cblxuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gc208bU5ULCBtRFQ+KHRlbXBsYXRlX3N0cmluZ3M6IEFycmF5PHN0cmluZz4gLyogLCBhcmd1bWVudHMgKi8pOiBNYWNoaW5lPG1OVCwgbURUPiB7XG5cbiAgICAvLyBmb29gYSR7MX1iJHsyfWNgIHdpbGwgY29tZSBpbiBhcyAoWydhJywnYicsJ2MnXSwxLDIpXG4gICAgLy8gdGhpcyBpbmNsdWRlcyB3aGVuIGEgYW5kIGMgYXJlIGVtcHR5IHN0cmluZ3NcbiAgICAvLyB0aGVyZWZvcmUgdGVtcGxhdGVfc3RyaW5ncyB3aWxsIGFsd2F5cyBoYXZlIG9uZSBtb3JlIGVsIHRoYW4gdGVtcGxhdGVfYXJnc1xuICAgIC8vIHRoZXJlZm9yZSBtYXAgdGhlIHNtYWxsZXIgY29udGFpbmVyIGFuZCB0b3NzIHRoZSBsYXN0IG9uZSBvbiBvbiB0aGUgd2F5IG91dFxuXG4gICAgcmV0dXJuIG5ldyBNYWNoaW5lKG1ha2UodGVtcGxhdGVfc3RyaW5ncy5yZWR1Y2UoXG5cbiAgICAgIC8vIGluIGdlbmVyYWwgYXZvaWRpbmcgYGFyZ3VtZW50c2AgaXMgc21hcnQuICBob3dldmVyIHdpdGggdGhlIHRlbXBsYXRlXG4gICAgICAvLyBzdHJpbmcgbm90YXRpb24sIGFzIGRlc2lnbmVkLCBpdCdzIG5vdCByZWFsbHkgd29ydGggdGhlIGhhc3NsZVxuXG4gICAgICAvKiBlc2xpbnQtZGlzYWJsZSBmcC9uby1hcmd1bWVudHMgKi9cbiAgICAgIC8qIGVzbGludC1kaXNhYmxlIHByZWZlci1yZXN0LXBhcmFtcyAqL1xuICAgICAgKGFjYywgdmFsLCBpZHgpOiBzdHJpbmcgPT4gYCR7YWNjfSR7YXJndW1lbnRzW2lkeF19JHt2YWx9YCAgLy8gYXJndW1lbnRzWzBdIGlzIG5ldmVyIGxvYWRlZCwgc28gYXJncyBkb2Vzbid0IG5lZWQgdG8gYmUgZ2F0ZWRcbiAgICAgIC8qIGVzbGludC1lbmFibGUgIHByZWZlci1yZXN0LXBhcmFtcyAqL1xuICAgICAgLyogZXNsaW50LWVuYWJsZSAgZnAvbm8tYXJndW1lbnRzICovXG5cbiAgICApKSk7XG5cbn1cblxuXG5cblxuXG5leHBvcnQge1xuXG4gIHZlcnNpb24sXG5cbiAgTWFjaGluZSxcblxuICBtYWtlLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG5cbiAgc20sXG5cbiAgYXJyb3dfZGlyZWN0aW9uLFxuICBhcnJvd19sZWZ0X2tpbmQsXG4gIGFycm93X3JpZ2h0X2tpbmQsXG5cbiAgLy8gdG9kbyB3aGFyZ2FyYmwgdGhlc2Ugc2hvdWxkIGJlIGV4cG9ydGVkIHRvIGEgdXRpbGl0eSBsaWJyYXJ5XG4gIHNlcSwgd2VpZ2h0ZWRfcmFuZF9zZWxlY3QsIGhpc3RvZ3JhcGgsIHdlaWdodGVkX3NhbXBsZV9zZWxlY3QsIHdlaWdodGVkX2hpc3RvX2tleVxuXG59O1xuIl19