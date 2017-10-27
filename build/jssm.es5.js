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

var version = '5.12.0'; // replaced from package.js in build


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

  if (rule.key === 'state_declaration') {
    if (!rule.name) {
      throw new Error('State declarations must have a name');
    }
    return { agg_as: 'state_declaration', val: { state: rule.name, declarations: rule.value } };
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLmpzIl0sIm5hbWVzIjpbInJlZHVjZV90b182MzkiLCJyZXF1aXJlIiwicmVkdWNlIiwicGFyc2UiLCJ2ZXJzaW9uIiwiYXJyb3dfZGlyZWN0aW9uIiwiYXJyb3ciLCJTdHJpbmciLCJFcnJvciIsImFycm93X2xlZnRfa2luZCIsImFycm93X3JpZ2h0X2tpbmQiLCJjb21waWxlX3J1bGVfdHJhbnNpdGlvbl9zdGVwIiwiYWNjIiwiZnJvbSIsInRvIiwidGhpc19zZSIsIm5leHRfc2UiLCJlZGdlcyIsInVGcm9tIiwiQXJyYXkiLCJpc0FycmF5IiwidVRvIiwibWFwIiwiZiIsInQiLCJyayIsImtpbmQiLCJsayIsInJpZ2h0IiwiZm9yY2VkX29ubHkiLCJtYWluX3BhdGgiLCJyX2FjdGlvbiIsImFjdGlvbiIsInJfcHJvYmFiaWxpdHkiLCJwcm9iYWJpbGl0eSIsInB1c2giLCJsZWZ0IiwibF9hY3Rpb24iLCJsX3Byb2JhYmlsaXR5IiwibmV3X2FjYyIsImNvbmNhdCIsInNlIiwiY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uIiwicnVsZSIsImNvbXBpbGVfcnVsZV9oYW5kbGVyIiwia2V5IiwiYWdnX2FzIiwidmFsIiwidmFsdWUiLCJuYW1lIiwic3RhdGUiLCJkZWNsYXJhdGlvbnMiLCJ0YXV0b2xvZ2llcyIsImluY2x1ZGVzIiwiSlNPTiIsInN0cmluZ2lmeSIsImNvbXBpbGUiLCJ0cmVlIiwicmVzdWx0cyIsImdyYXBoX2xheW91dCIsInRyYW5zaXRpb24iLCJzdGFydF9zdGF0ZXMiLCJlbmRfc3RhdGVzIiwic3RhdGVfZGVjbGFyYXRpb24iLCJmc2xfdmVyc2lvbiIsIm1hY2hpbmVfYXV0aG9yIiwibWFjaGluZV9jb21tZW50IiwibWFjaGluZV9jb250cmlidXRvciIsIm1hY2hpbmVfZGVmaW5pdGlvbiIsIm1hY2hpbmVfbGFuZ3VhZ2UiLCJtYWNoaW5lX2xpY2Vuc2UiLCJtYWNoaW5lX25hbWUiLCJtYWNoaW5lX3JlZmVyZW5jZSIsIm1hY2hpbmVfdmVyc2lvbiIsInRyIiwiYXNzZW1ibGVkX3RyYW5zaXRpb25zIiwicmVzdWx0X2NmZyIsImxlbmd0aCIsInRyYW5zaXRpb25zIiwib25lT25seUtleXMiLCJvbmVPbmx5S2V5IiwibXVsdGlLZXkiLCJtYWtlIiwicGxhbiIsIk1hY2hpbmUiLCJjb21wbGV0ZSIsIl9zdGF0ZSIsIl9zdGF0ZXMiLCJNYXAiLCJfc3RhdGVfZGVjbGFyYXRpb25zIiwiX2VkZ2VzIiwiX2VkZ2VfbWFwIiwiX25hbWVkX3RyYW5zaXRpb25zIiwiX2FjdGlvbnMiLCJfcmV2ZXJzZV9hY3Rpb25zIiwiX3JldmVyc2VfYWN0aW9uX3RhcmdldHMiLCJfbWFjaGluZV9hdXRob3IiLCJfbWFjaGluZV9jb21tZW50IiwiX21hY2hpbmVfY29udHJpYnV0b3IiLCJfbWFjaGluZV9kZWZpbml0aW9uIiwiX21hY2hpbmVfbGFuZ3VhZ2UiLCJfbWFjaGluZV9saWNlbnNlIiwiX21hY2hpbmVfbmFtZSIsIl9tYWNoaW5lX3ZlcnNpb24iLCJfcmF3X3N0YXRlX2RlY2xhcmF0aW9uIiwiX2ZzbF92ZXJzaW9uIiwiX2dyYXBoX2xheW91dCIsInVuZGVmaW5lZCIsImN1cnNvcl9mcm9tIiwiZ2V0IiwiaGFzIiwiX25ld19zdGF0ZSIsImN1cnNvcl90byIsInRoaXNFZGdlSWQiLCJzZXQiLCJmcm9tX21hcHBpbmciLCJhY3Rpb25NYXAiLCJyQWN0aW9uTWFwIiwic3RhdGVfY29uZmlnIiwid2hpY2hTdGF0ZSIsInN0YXRlX2lzX3Rlcm1pbmFsIiwic3RhdGVfaXNfY29tcGxldGUiLCJzdGF0ZV9pc19maW5hbCIsIndoaWNoIiwiaW50ZXJuYWxfc3RhdGVfaW1wbF92ZXJzaW9uIiwiYWN0aW9ucyIsImVkZ2VfbWFwIiwibmFtZWRfdHJhbnNpdGlvbnMiLCJyZXZlcnNlX2FjdGlvbnMiLCJzdGF0ZXMiLCJrZXlzIiwiZW1nIiwiaWQiLCJnZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyIsImVudHJhbmNlcyIsImxpc3RfZW50cmFuY2VzIiwiZXhpdHMiLCJsaXN0X2V4aXRzIiwid3N0YXRlIiwid3N0YXRlX3RvIiwid3RmIiwid3MiLCJsb29rdXBfdHJhbnNpdGlvbl9mb3IiLCJmaWx0ZXIiLCJCb29sZWFuIiwic2VsZWN0ZWQiLCJwcm9iYWJsZV9leGl0c19mb3IiLCJuIiwic3RhdGVfd2FzIiwicHJvYmFiaWxpc3RpY190cmFuc2l0aW9uIiwicHJvYmFiaWxpc3RpY193YWxrIiwicmFfYmFzZSIsInZhbHVlcyIsImVkZ2VJZCIsIm8iLCJmaWx0ZXJlZCIsInNvbWUiLCJ4IiwiaXNfdW5lbnRlcmFibGUiLCJuZXdEYXRhIiwidmFsaWRfYWN0aW9uIiwiZWRnZSIsImN1cnJlbnRfYWN0aW9uX2VkZ2VfZm9yIiwibmV3U3RhdGUiLCJ2YWxpZF90cmFuc2l0aW9uIiwidmFsaWRfZm9yY2VfdHJhbnNpdGlvbiIsImFjdGlvbl9iYXNlIiwiaWR4IiwiY3VycmVudF9hY3Rpb25fZm9yIiwiX25ld0RhdGEiLCJ0cmFuc2l0aW9uX2ZvciIsInNtIiwidGVtcGxhdGVfc3RyaW5ncyIsInNlcSIsIndlaWdodGVkX3JhbmRfc2VsZWN0IiwiaGlzdG9ncmFwaCIsIndlaWdodGVkX3NhbXBsZV9zZWxlY3QiLCJ3ZWlnaHRlZF9oaXN0b19rZXkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQTJCQTs7Ozs7O0FBMUJBOztBQUlBLElBQU1BLGdCQUEyQkMsUUFBUSxpQkFBUixFQUEyQkMsTUFBNUQ7O0FBd0JBLElBQU1DLFFBQStDRixRQUFRLGVBQVIsRUFBeUJFLEtBQTlFLEMsQ0FBc0Y7O0FBRXRGLElBQU1DLFVBQWdCLElBQXRCLEMsQ0FBNEI7OztBQU01Qjs7QUFFQSxTQUFTQyxlQUFULENBQXlCQyxLQUF6QixFQUErRDs7QUFFN0QsVUFBU0MsT0FBT0QsS0FBUCxDQUFUOztBQUVFLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNiLGFBQU8sT0FBUDs7QUFFRixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDYixhQUFPLE1BQVA7O0FBRUYsU0FBSyxLQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMOztBQUVmLFNBQUssS0FBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDs7QUFFZixTQUFLLEtBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDYixhQUFPLE1BQVA7O0FBRUY7QUFDRSxZQUFNLElBQUlFLEtBQUosMENBQWlERixLQUFqRCxDQUFOOztBQTFCSjtBQThCRDs7QUFFRDs7QUFNQTs7QUFFQSxTQUFTRyxlQUFULENBQXlCSCxLQUF6QixFQUEwRDs7QUFFeEQsVUFBU0MsT0FBT0QsS0FBUCxDQUFUOztBQUVFLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNiLGFBQU8sTUFBUDs7QUFFRixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLEtBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDYixhQUFPLE9BQVA7O0FBRUYsU0FBSyxJQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxLQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMO0FBQ2IsYUFBTyxNQUFQOztBQUVGLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssS0FBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDtBQUNiLGFBQU8sUUFBUDs7QUFFRjtBQUNFLFlBQU0sSUFBSUUsS0FBSiwwQ0FBaURGLEtBQWpELENBQU47O0FBMUJKO0FBOEJEOztBQUVEOztBQU1BOztBQUVBLFNBQVNJLGdCQUFULENBQTBCSixLQUExQixFQUEyRDs7QUFFekQsVUFBU0MsT0FBT0QsS0FBUCxDQUFUOztBQUVFLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNiLGFBQU8sTUFBUDs7QUFFRixTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLEtBQUwsQ0FBZSxLQUFLLEdBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDZixTQUFLLE1BQUwsQ0FBZSxLQUFLLElBQUw7QUFDYixhQUFPLE9BQVA7O0FBRUYsU0FBSyxJQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxLQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMO0FBQ2YsU0FBSyxNQUFMLENBQWUsS0FBSyxJQUFMO0FBQ2IsYUFBTyxNQUFQOztBQUVGLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssS0FBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDtBQUNmLFNBQUssTUFBTCxDQUFlLEtBQUssSUFBTDtBQUNiLGFBQU8sUUFBUDs7QUFFRjtBQUNFLFlBQU0sSUFBSUUsS0FBSiwwQ0FBaURGLEtBQWpELENBQU47O0FBMUJKO0FBOEJEOztBQUVEOztBQU1BLFNBQVNLLDRCQUFULENBQ2FDLEdBRGIsRUFFYUMsSUFGYixFQUdhQyxFQUhiLEVBSWFDLE9BSmIsRUFLYUMsT0FMYixFQU0rQztBQUFFOztBQUUvQyxNQUFNQyxRQUE0QyxFQUFsRDs7QUFFQSxNQUFNQyxRQUF3QkMsTUFBTUMsT0FBTixDQUFjUCxJQUFkLElBQXFCQSxJQUFyQixHQUE0QixDQUFDQSxJQUFELENBQTFEO0FBQUEsTUFDTVEsTUFBd0JGLE1BQU1DLE9BQU4sQ0FBY04sRUFBZCxJQUFxQkEsRUFBckIsR0FBNEIsQ0FBQ0EsRUFBRCxDQUQxRDs7QUFHQUksUUFBTUksR0FBTixDQUFXLFVBQUNDLENBQUQsRUFBWTtBQUNyQkYsUUFBSUMsR0FBSixDQUFTLFVBQUNFLENBQUQsRUFBWTs7QUFFbkIsVUFBTUMsS0FBb0JmLGlCQUFpQkssUUFBUVcsSUFBekIsQ0FBMUI7QUFBQSxVQUNNQyxLQUFvQmxCLGdCQUFnQk0sUUFBUVcsSUFBeEIsQ0FEMUI7O0FBSUEsVUFBTUUsUUFBa0M7QUFDdENmLGNBQWNVLENBRHdCO0FBRXRDVCxZQUFjVSxDQUZ3QjtBQUd0Q0UsY0FBY0QsRUFId0I7QUFJdENJLHFCQUFjSixPQUFPLFFBSmlCO0FBS3RDSyxtQkFBY0wsT0FBTztBQUxpQixPQUF4Qzs7QUFRQSxVQUFJVixRQUFRZ0IsUUFBWixFQUEyQjtBQUFFSCxjQUFNSSxNQUFOLEdBQW9CakIsUUFBUWdCLFFBQTVCO0FBQTRDO0FBQ3pFLFVBQUloQixRQUFRa0IsYUFBWixFQUEyQjtBQUFFTCxjQUFNTSxXQUFOLEdBQW9CbkIsUUFBUWtCLGFBQTVCO0FBQTRDO0FBQ3pFLFVBQUlMLE1BQU1GLElBQU4sS0FBZSxNQUFuQixFQUEyQjtBQUFFVCxjQUFNa0IsSUFBTixDQUFXUCxLQUFYO0FBQW9COztBQUdqRCxVQUFNUSxPQUFpQztBQUNyQ3ZCLGNBQWNXLENBRHVCO0FBRXJDVixZQUFjUyxDQUZ1QjtBQUdyQ0csY0FBY0MsRUFIdUI7QUFJckNFLHFCQUFjRixPQUFPLFFBSmdCO0FBS3JDRyxtQkFBY0gsT0FBTztBQUxnQixPQUF2Qzs7QUFRQSxVQUFJWixRQUFRc0IsUUFBWixFQUEyQjtBQUFFRCxhQUFLSixNQUFMLEdBQW1CakIsUUFBUXNCLFFBQTNCO0FBQTJDO0FBQ3hFLFVBQUl0QixRQUFRdUIsYUFBWixFQUEyQjtBQUFFRixhQUFLRixXQUFMLEdBQW1CbkIsUUFBUXVCLGFBQTNCO0FBQTJDO0FBQ3hFLFVBQUlGLEtBQUtWLElBQUwsS0FBYyxNQUFsQixFQUEyQjtBQUFFVCxjQUFNa0IsSUFBTixDQUFXQyxJQUFYO0FBQW1CO0FBRWpELEtBL0JEO0FBZ0NELEdBakNEOztBQW1DQSxNQUFNRyxVQUE2QzNCLElBQUk0QixNQUFKLENBQVd2QixLQUFYLENBQW5EOztBQUVBLE1BQUlELE9BQUosRUFBYTtBQUNYLFdBQU9MLDZCQUE2QjRCLE9BQTdCLEVBQXNDekIsRUFBdEMsRUFBMENFLFFBQVFGLEVBQWxELEVBQXNERSxPQUF0RCxFQUErREEsUUFBUXlCLEVBQXZFLENBQVA7QUFDRCxHQUZELE1BRU87QUFDTCxXQUFPRixPQUFQO0FBQ0Q7QUFFRjs7QUFJRCxTQUFTRyw4QkFBVCxDQUE2Q0MsSUFBN0MsRUFBbUY7QUFBRTtBQUNuRixTQUFPaEMsNkJBQTZCLEVBQTdCLEVBQWlDZ0MsS0FBSzlCLElBQXRDLEVBQTRDOEIsS0FBS0YsRUFBTCxDQUFRM0IsRUFBcEQsRUFBd0Q2QixLQUFLRixFQUE3RCxFQUFpRUUsS0FBS0YsRUFBTCxDQUFRQSxFQUF6RSxDQUFQO0FBQ0Q7O0FBSUQsU0FBU0csb0JBQVQsQ0FBbUNELElBQW5DLEVBQW1GO0FBQUU7O0FBRW5GLE1BQUlBLEtBQUtFLEdBQUwsS0FBYSxZQUFqQixFQUErQjtBQUM3QixXQUFPLEVBQUVDLFFBQVEsWUFBVixFQUF3QkMsS0FBS0wsK0JBQStCQyxJQUEvQixDQUE3QixFQUFQO0FBQ0Q7O0FBRUQsTUFBSUEsS0FBS0UsR0FBTCxLQUFhLGtCQUFqQixFQUFxQztBQUNuQyxXQUFPLEVBQUVDLFFBQVEsa0JBQVYsRUFBOEJDLEtBQUsvQyxjQUFjMkMsS0FBS0ssS0FBbkIsQ0FBbkMsRUFBUDtBQUNEOztBQUVELE1BQUlMLEtBQUtFLEdBQUwsS0FBYSxtQkFBakIsRUFBc0M7QUFDcEMsUUFBSSxDQUFDRixLQUFLTSxJQUFWLEVBQWdCO0FBQUUsWUFBTSxJQUFJekMsS0FBSixDQUFVLHFDQUFWLENBQU47QUFBeUQ7QUFDM0UsV0FBTyxFQUFFc0MsUUFBUSxtQkFBVixFQUErQkMsS0FBSyxFQUFFRyxPQUFPUCxLQUFLTSxJQUFkLEVBQW9CRSxjQUFjUixLQUFLSyxLQUF2QyxFQUFwQyxFQUFQO0FBQ0Q7O0FBRUQsTUFBTUksY0FBOEIsQ0FDbEMsY0FEa0MsRUFDbEIsY0FEa0IsRUFDRixZQURFLEVBQ1ksY0FEWixFQUM0QixpQkFENUIsRUFFbEMsaUJBRmtDLEVBRWYsZ0JBRmUsRUFFRyxxQkFGSCxFQUUwQixvQkFGMUIsRUFHbEMsbUJBSGtDLEVBR2IsaUJBSGEsRUFHTSxhQUhOLENBQXBDOztBQU1BLE1BQUlBLFlBQVlDLFFBQVosQ0FBcUJWLEtBQUtFLEdBQTFCLENBQUosRUFBb0M7QUFDbEMsV0FBTyxFQUFFQyxRQUFRSCxLQUFLRSxHQUFmLEVBQW9CRSxLQUFLSixLQUFLSyxLQUE5QixFQUFQO0FBQ0Q7O0FBRUQsUUFBTSxJQUFJeEMsS0FBSiwwQ0FBaUQ4QyxLQUFLQyxTQUFMLENBQWVaLElBQWYsQ0FBakQsQ0FBTjtBQUVEOztBQU1ELFNBQVNhLE9BQVQsQ0FBMkJDLElBQTNCLEVBQWtGO0FBQUE7O0FBQUc7O0FBRW5GLE1BQU1DLFVBZ0JGO0FBQ0ZDLGtCQUFzQixFQURwQjtBQUVGQyxnQkFBc0IsRUFGcEI7QUFHRkMsa0JBQXNCLEVBSHBCO0FBSUZDLGdCQUFzQixFQUpwQjtBQUtGQyx1QkFBc0IsRUFMcEI7QUFNRkMsaUJBQXNCLEVBTnBCO0FBT0ZDLG9CQUFzQixFQVBwQjtBQVFGQyxxQkFBc0IsRUFScEI7QUFTRkMseUJBQXNCLEVBVHBCO0FBVUZDLHdCQUFzQixFQVZwQjtBQVdGQyxzQkFBc0IsRUFYcEI7QUFZRkMscUJBQXNCLEVBWnBCO0FBYUZDLGtCQUFzQixFQWJwQjtBQWNGQyx1QkFBc0IsRUFkcEI7QUFlRkMscUJBQXNCO0FBZnBCLEdBaEJKOztBQWtDQWhCLE9BQUtuQyxHQUFMLENBQVUsVUFBQ29ELEVBQUQsRUFBa0M7O0FBRTFDLFFBQU0vQixPQUEyQkMscUJBQXFCOEIsRUFBckIsQ0FBakM7QUFBQSxRQUNNNUIsU0FBMkJILEtBQUtHLE1BRHRDO0FBQUEsUUFFTUMsTUFBMkJKLEtBQUtJLEdBRnRDLENBRjBDLENBSWtCOztBQUU1RFcsWUFBUVosTUFBUixJQUFrQlksUUFBUVosTUFBUixFQUFnQk4sTUFBaEIsQ0FBdUJPLEdBQXZCLENBQWxCO0FBRUQsR0FSRDs7QUFVQSxNQUFNNEIsd0JBQTRELFlBQUduQyxNQUFILGdDQUFja0IsUUFBUSxZQUFSLENBQWQsRUFBbEU7O0FBRUEsTUFBTWtCLGFBQTJDO0FBQy9DZixrQkFBZUgsUUFBUUcsWUFBUixDQUFxQmdCLE1BQXJCLEdBQTZCbkIsUUFBUUcsWUFBckMsR0FBb0QsQ0FBQ2Msc0JBQXNCLENBQXRCLEVBQXlCOUQsSUFBMUIsQ0FEcEI7QUFFL0NpRSxpQkFBZUg7QUFGZ0MsR0FBakQ7O0FBS0EsTUFBTUksY0FBOEIsQ0FDbEMsY0FEa0MsRUFDbEIsY0FEa0IsRUFDRixpQkFERSxFQUNpQixpQkFEakIsRUFDb0MsYUFEcEMsRUFDbUQsaUJBRG5ELEVBRWxDLG9CQUZrQyxFQUVaLGtCQUZZLENBQXBDOztBQUtBQSxjQUFZekQsR0FBWixDQUFpQixVQUFDMEQsVUFBRCxFQUF5QjtBQUN4QyxRQUFJdEIsUUFBUXNCLFVBQVIsRUFBb0JILE1BQXBCLEdBQTZCLENBQWpDLEVBQW9DO0FBQ2xDLFlBQU0sSUFBSXJFLEtBQUosd0JBQStCd0UsVUFBL0IsNEJBQWdFMUIsS0FBS0MsU0FBTCxDQUFlRyxRQUFRc0IsVUFBUixDQUFmLENBQWhFLENBQU47QUFDRCxLQUZELE1BRU87QUFDTCxVQUFJdEIsUUFBUXNCLFVBQVIsRUFBb0JILE1BQXhCLEVBQWdDO0FBQzlCRCxtQkFBV0ksVUFBWCxJQUF5QnRCLFFBQVFzQixVQUFSLEVBQW9CLENBQXBCLENBQXpCO0FBQ0Q7QUFDRjtBQUNGLEdBUkQ7O0FBVUEsR0FBQyxnQkFBRCxFQUFtQixxQkFBbkIsRUFBMEMsbUJBQTFDLEVBQStELG1CQUEvRCxFQUFvRjFELEdBQXBGLENBQXlGLFVBQUMyRCxRQUFELEVBQXVCO0FBQzlHLFFBQUl2QixRQUFRdUIsUUFBUixFQUFrQkosTUFBdEIsRUFBOEI7QUFDNUJELGlCQUFXSyxRQUFYLElBQXVCdkIsUUFBUXVCLFFBQVIsQ0FBdkI7QUFDRDtBQUNGLEdBSkQ7O0FBTUEsU0FBT0wsVUFBUDtBQUVEOztBQU1ELFNBQVNNLElBQVQsQ0FBd0JDLElBQXhCLEVBQW1FO0FBQ2pFLFNBQU8zQixRQUFRckQsTUFBTWdGLElBQU4sQ0FBUixDQUFQO0FBQ0Q7O0lBTUtDLE87O0FBMkJKO0FBTjZDO0FBTzdDLDBCQWVpQztBQUFBOztBQUFBLFFBZC9CdkIsWUFjK0IsU0FkL0JBLFlBYytCO0FBQUEsK0JBYi9Cd0IsUUFhK0I7QUFBQSxRQWIvQkEsUUFhK0Isa0NBYmIsRUFhYTtBQUFBLFFBWi9CUCxXQVkrQixTQVovQkEsV0FZK0I7QUFBQSxRQVgvQmIsY0FXK0IsU0FYL0JBLGNBVytCO0FBQUEsUUFWL0JDLGVBVStCLFNBVi9CQSxlQVUrQjtBQUFBLFFBVC9CQyxtQkFTK0IsU0FUL0JBLG1CQVMrQjtBQUFBLFFBUi9CQyxrQkFRK0IsU0FSL0JBLGtCQVErQjtBQUFBLFFBUC9CQyxnQkFPK0IsU0FQL0JBLGdCQU8rQjtBQUFBLFFBTi9CQyxlQU0rQixTQU4vQkEsZUFNK0I7QUFBQSxRQUwvQkMsWUFLK0IsU0FML0JBLFlBSytCO0FBQUEsUUFKL0JFLGVBSStCLFNBSi9CQSxlQUkrQjtBQUFBLFFBSC9CVixpQkFHK0IsU0FIL0JBLGlCQUcrQjtBQUFBLFFBRi9CQyxXQUUrQixTQUYvQkEsV0FFK0I7QUFBQSxtQ0FEL0JMLFlBQytCO0FBQUEsUUFEL0JBLFlBQytCLHNDQURoQixLQUNnQjs7QUFBQTs7QUFFL0IsU0FBSzJCLE1BQUwsR0FBK0J6QixhQUFhLENBQWIsQ0FBL0I7QUFDQSxTQUFLMEIsT0FBTCxHQUErQixJQUFJQyxHQUFKLEVBQS9CO0FBQ0EsU0FBS0MsbUJBQUwsR0FBK0IsSUFBSUQsR0FBSixFQUEvQjtBQUNBLFNBQUtFLE1BQUwsR0FBK0IsRUFBL0I7QUFDQSxTQUFLQyxTQUFMLEdBQStCLElBQUlILEdBQUosRUFBL0I7QUFDQSxTQUFLSSxrQkFBTCxHQUErQixJQUFJSixHQUFKLEVBQS9CO0FBQ0EsU0FBS0ssUUFBTCxHQUErQixJQUFJTCxHQUFKLEVBQS9CO0FBQ0EsU0FBS00sZ0JBQUwsR0FBK0IsSUFBSU4sR0FBSixFQUEvQjtBQUNBLFNBQUtPLHVCQUFMLEdBQStCLElBQUlQLEdBQUosRUFBL0IsQ0FWK0IsQ0FVYTs7QUFFNUMsU0FBS1EsZUFBTCxHQUErQi9CLGNBQS9CO0FBQ0EsU0FBS2dDLGdCQUFMLEdBQStCL0IsZUFBL0I7QUFDQSxTQUFLZ0Msb0JBQUwsR0FBK0IvQixtQkFBL0I7QUFDQSxTQUFLZ0MsbUJBQUwsR0FBK0IvQixrQkFBL0I7QUFDQSxTQUFLZ0MsaUJBQUwsR0FBK0IvQixnQkFBL0I7QUFDQSxTQUFLZ0MsZ0JBQUwsR0FBK0IvQixlQUEvQjtBQUNBLFNBQUtnQyxhQUFMLEdBQStCL0IsWUFBL0I7QUFDQSxTQUFLZ0MsZ0JBQUwsR0FBK0I5QixlQUEvQjtBQUNBLFNBQUsrQixzQkFBTCxHQUErQnpDLHFCQUFxQixFQUFwRDtBQUNBLFNBQUswQyxZQUFMLEdBQStCekMsV0FBL0I7O0FBRUEsU0FBSzBDLGFBQUwsR0FBK0IvQyxZQUEvQjs7QUFFQW1CLGdCQUFZeEQsR0FBWixDQUFpQixVQUFDb0QsRUFBRCxFQUFpQzs7QUFFaEQsVUFBSUEsR0FBRzdELElBQUgsS0FBWThGLFNBQWhCLEVBQTJCO0FBQUUsY0FBTSxJQUFJbkcsS0FBSix1Q0FBNEM4QyxLQUFLQyxTQUFMLENBQWVtQixFQUFmLENBQTVDLENBQU47QUFBMEU7QUFDdkcsVUFBSUEsR0FBRzVELEVBQUgsS0FBWTZGLFNBQWhCLEVBQTJCO0FBQUUsY0FBTSxJQUFJbkcsS0FBSixxQ0FBNEM4QyxLQUFLQyxTQUFMLENBQWVtQixFQUFmLENBQTVDLENBQU47QUFBMEU7O0FBRXZHO0FBQ0EsVUFBTWtDLGNBQ0EsTUFBS3JCLE9BQUwsQ0FBYXNCLEdBQWIsQ0FBaUJuQyxHQUFHN0QsSUFBcEIsS0FDQSxFQUFFb0MsTUFBTXlCLEdBQUc3RCxJQUFYLEVBQWlCQSxNQUFNLEVBQXZCLEVBQTJCQyxJQUFJLEVBQS9CLEVBQW1DdUUsVUFBVUEsU0FBU2hDLFFBQVQsQ0FBa0JxQixHQUFHN0QsSUFBckIsQ0FBN0MsRUFGTjs7QUFJQSxVQUFJLENBQUUsTUFBSzBFLE9BQUwsQ0FBYXVCLEdBQWIsQ0FBaUJwQyxHQUFHN0QsSUFBcEIsQ0FBTixFQUFrQztBQUNoQyxjQUFLa0csVUFBTCxDQUFnQkgsV0FBaEI7QUFDRDs7QUFFRCxVQUFNSSxZQUNBLE1BQUt6QixPQUFMLENBQWFzQixHQUFiLENBQWlCbkMsR0FBRzVELEVBQXBCLEtBQ0EsRUFBQ21DLE1BQU15QixHQUFHNUQsRUFBVixFQUFjRCxNQUFNLEVBQXBCLEVBQXdCQyxJQUFJLEVBQTVCLEVBQWdDdUUsVUFBVUEsU0FBU2hDLFFBQVQsQ0FBa0JxQixHQUFHNUQsRUFBckIsQ0FBMUMsRUFGTjs7QUFJQSxVQUFJLENBQUUsTUFBS3lFLE9BQUwsQ0FBYXVCLEdBQWIsQ0FBaUJwQyxHQUFHNUQsRUFBcEIsQ0FBTixFQUFnQztBQUM5QixjQUFLaUcsVUFBTCxDQUFnQkMsU0FBaEI7QUFDRDs7QUFFRDtBQUNBLFVBQUlKLFlBQVk5RixFQUFaLENBQWV1QyxRQUFmLENBQXdCcUIsR0FBRzVELEVBQTNCLENBQUosRUFBb0M7QUFDbEMsY0FBTSxJQUFJTixLQUFKLGtCQUF5QjhDLEtBQUtDLFNBQUwsQ0FBZW1CLEdBQUc3RCxJQUFsQixDQUF6QixZQUF1RHlDLEtBQUtDLFNBQUwsQ0FBZW1CLEdBQUc1RCxFQUFsQixDQUF2RCxDQUFOO0FBQ0QsT0FGRCxNQUVPO0FBQ0w4RixvQkFBWTlGLEVBQVosQ0FBZXFCLElBQWYsQ0FBb0J1QyxHQUFHNUQsRUFBdkI7QUFDQWtHLGtCQUFVbkcsSUFBVixDQUFlc0IsSUFBZixDQUFvQnVDLEdBQUc3RCxJQUF2QjtBQUNEOztBQUVEO0FBQ0EsWUFBSzZFLE1BQUwsQ0FBWXZELElBQVosQ0FBaUJ1QyxFQUFqQjtBQUNBLFVBQU11QyxhQUFxQixNQUFLdkIsTUFBTCxDQUFZYixNQUFaLEdBQXFCLENBQWhEOztBQUVBO0FBQ0EsVUFBSUgsR0FBR3pCLElBQVAsRUFBYTtBQUNYLFlBQUksTUFBSzJDLGtCQUFMLENBQXdCa0IsR0FBeEIsQ0FBNEJwQyxHQUFHekIsSUFBL0IsQ0FBSixFQUEwQztBQUN4QyxnQkFBTSxJQUFJekMsS0FBSix3QkFBK0I4QyxLQUFLQyxTQUFMLENBQWVtQixHQUFHekIsSUFBbEIsQ0FBL0IsdUJBQU47QUFDRCxTQUZELE1BRU87QUFDTCxnQkFBSzJDLGtCQUFMLENBQXdCc0IsR0FBeEIsQ0FBNEJ4QyxHQUFHekIsSUFBL0IsRUFBcUNnRSxVQUFyQztBQUNEO0FBQ0Y7O0FBRUQ7QUFDQSxVQUFNRSxlQUFpQyxNQUFLeEIsU0FBTCxDQUFla0IsR0FBZixDQUFtQm5DLEdBQUc3RCxJQUF0QixLQUErQixJQUFJMkUsR0FBSixFQUF0RTtBQUNBLFVBQUksQ0FBRSxNQUFLRyxTQUFMLENBQWVtQixHQUFmLENBQW1CcEMsR0FBRzdELElBQXRCLENBQU4sRUFBb0M7QUFDbEMsY0FBSzhFLFNBQUwsQ0FBZXVCLEdBQWYsQ0FBbUJ4QyxHQUFHN0QsSUFBdEIsRUFBNEJzRyxZQUE1QjtBQUNEOztBQUVQO0FBQ01BLG1CQUFhRCxHQUFiLENBQWlCeEMsR0FBRzVELEVBQXBCLEVBQXdCbUcsVUFBeEIsRUFsRGdELENBa0RYOztBQUVyQztBQUNBLFVBQUl2QyxHQUFHMUMsTUFBUCxFQUFlOztBQUdiO0FBQ0EsWUFBSW9GLFlBQStCLE1BQUt2QixRQUFMLENBQWNnQixHQUFkLENBQWtCbkMsR0FBRzFDLE1BQXJCLENBQW5DO0FBQ0EsWUFBSSxDQUFFb0YsU0FBTixFQUFrQjtBQUNoQkEsc0JBQVksSUFBSTVCLEdBQUosRUFBWjtBQUNBLGdCQUFLSyxRQUFMLENBQWNxQixHQUFkLENBQWtCeEMsR0FBRzFDLE1BQXJCLEVBQTZCb0YsU0FBN0I7QUFDRDs7QUFFRCxZQUFJQSxVQUFVTixHQUFWLENBQWNwQyxHQUFHN0QsSUFBakIsQ0FBSixFQUE0QjtBQUMxQixnQkFBTSxJQUFJTCxLQUFKLGFBQW9COEMsS0FBS0MsU0FBTCxDQUFlbUIsR0FBRzFDLE1BQWxCLENBQXBCLG9DQUE0RXNCLEtBQUtDLFNBQUwsQ0FBZW1CLEdBQUc3RCxJQUFsQixDQUE1RSxDQUFOO0FBQ0QsU0FGRCxNQUVPO0FBQ0x1RyxvQkFBVUYsR0FBVixDQUFjeEMsR0FBRzdELElBQWpCLEVBQXVCb0csVUFBdkI7QUFDRDs7QUFHRDtBQUNBLFlBQUlJLGFBQWdDLE1BQUt2QixnQkFBTCxDQUFzQmUsR0FBdEIsQ0FBMEJuQyxHQUFHN0QsSUFBN0IsQ0FBcEM7QUFDQSxZQUFJLENBQUV3RyxVQUFOLEVBQW1CO0FBQ2pCQSx1QkFBYSxJQUFJN0IsR0FBSixFQUFiO0FBQ0EsZ0JBQUtNLGdCQUFMLENBQXNCb0IsR0FBdEIsQ0FBMEJ4QyxHQUFHN0QsSUFBN0IsRUFBbUN3RyxVQUFuQztBQUNEOztBQUVEO0FBQ0E7QUFDQUEsbUJBQVdILEdBQVgsQ0FBZXhDLEdBQUcxQyxNQUFsQixFQUEwQmlGLFVBQTFCOztBQUdBO0FBQ0EsWUFBSSxDQUFFLE1BQUtsQix1QkFBTCxDQUE2QmUsR0FBN0IsQ0FBaUNwQyxHQUFHNUQsRUFBcEMsQ0FBTixFQUFnRDtBQUM5QyxnQkFBS2lGLHVCQUFMLENBQTZCbUIsR0FBN0IsQ0FBaUN4QyxHQUFHNUQsRUFBcEMsRUFBd0MsSUFBSTBFLEdBQUosRUFBeEM7QUFDRDs7QUFFVDs7Ozs7Ozs7Ozs7OztBQWFPO0FBRUYsS0F0R0Q7QUF3R0QsRyxDQXRKNEM7Ozs7K0JBd0psQzhCLFksRUFBMEM7QUFBRTs7QUFFckQsVUFBSSxLQUFLL0IsT0FBTCxDQUFhdUIsR0FBYixDQUFpQlEsYUFBYXJFLElBQTlCLENBQUosRUFBeUM7QUFDdkMsY0FBTSxJQUFJekMsS0FBSixZQUFtQjhDLEtBQUtDLFNBQUwsQ0FBZStELGFBQWFyRSxJQUE1QixDQUFuQixxQkFBTjtBQUNEOztBQUVELFdBQUtzQyxPQUFMLENBQWEyQixHQUFiLENBQWlCSSxhQUFhckUsSUFBOUIsRUFBb0NxRSxZQUFwQztBQUNBLGFBQU9BLGFBQWFyRSxJQUFwQjtBQUVEOzs7NEJBSVk7QUFDWCxhQUFPLEtBQUtxQyxNQUFaO0FBQ0Q7O0FBRUg7Ozs7Ozs7Ozs7bUNBU2lCaUMsVSxFQUEwQjtBQUN2QyxhQUFVLEtBQUtDLGlCQUFMLENBQXVCRCxVQUF2QixDQUFELElBQXlDLEtBQUtFLGlCQUFMLENBQXVCRixVQUF2QixDQUFsRDtBQUNEOzs7K0JBRW1CO0FBQ3RCO0FBQ0ksYUFBTyxLQUFLRyxjQUFMLENBQW9CLEtBQUt4RSxLQUFMLEVBQXBCLENBQVA7QUFDRDs7O21DQUVzQjtBQUNyQixhQUFPLEtBQUt3RCxhQUFaO0FBQ0Q7OztxQ0FJZ0M7QUFDL0IsYUFBTyxLQUFLVixlQUFaO0FBQ0Q7OztzQ0FFMEI7QUFDekIsYUFBTyxLQUFLQyxnQkFBWjtBQUNEOzs7MENBRXFDO0FBQ3BDLGFBQU8sS0FBS0Msb0JBQVo7QUFDRDs7O3lDQUU2QjtBQUM1QixhQUFPLEtBQUtDLG1CQUFaO0FBQ0Q7Ozt1Q0FFMkI7QUFDMUIsYUFBTyxLQUFLQyxpQkFBWjtBQUNEOzs7c0NBRTBCO0FBQ3pCLGFBQU8sS0FBS0MsZ0JBQVo7QUFDRDs7O21DQUV1QjtBQUN0QixhQUFPLEtBQUtDLGFBQVo7QUFDRDs7O3NDQUUwQjtBQUN6QixhQUFPLEtBQUtDLGdCQUFaO0FBQ0Q7Ozs2Q0FFd0M7QUFBSztBQUM1QyxhQUFPLEtBQUtDLHNCQUFaO0FBQ0Q7OztzQ0FFaUJtQixLLEVBQXFCO0FBQUs7QUFDMUMsYUFBTyxLQUFLbEMsbUJBQUwsQ0FBeUJvQixHQUF6QixDQUE2QmMsS0FBN0IsQ0FBUDtBQUNEOzs7eUNBRXNDO0FBQUs7QUFDMUMsYUFBTyxLQUFLbEMsbUJBQVo7QUFDRDs7O2tDQUVzQjtBQUNyQixhQUFPLEtBQUtnQixZQUFaO0FBQ0Q7OztvQ0FJbUQ7O0FBRWxELGFBQU87QUFDTG1CLHFDQUE4QixDQUR6Qjs7QUFHTEMsaUJBQXlCLEtBQUtoQyxRQUh6QjtBQUlMaUMsa0JBQXlCLEtBQUtuQyxTQUp6QjtBQUtMMUUsZUFBeUIsS0FBS3lFLE1BTHpCO0FBTUxxQywyQkFBeUIsS0FBS25DLGtCQU56QjtBQU9Mb0MseUJBQXlCLEtBQUtsQyxnQkFQekI7QUFRWDtBQUNNNUMsZUFBeUIsS0FBS29DLE1BVHpCO0FBVUwyQyxnQkFBeUIsS0FBSzFDO0FBVnpCLE9BQVA7QUFhRDs7QUFFSDs7Ozs7Ozs7NkJBT3VCO0FBQ25CLDBDQUFZLEtBQUtBLE9BQUwsQ0FBYTJDLElBQWIsRUFBWjtBQUNEOzs7OEJBRVNYLFUsRUFBd0M7QUFDaEQsVUFBTXJFLFFBQWdDLEtBQUtxQyxPQUFMLENBQWFzQixHQUFiLENBQWlCVSxVQUFqQixDQUF0QztBQUNBLFVBQUlyRSxLQUFKLEVBQVc7QUFBRSxlQUFPQSxLQUFQO0FBQWUsT0FBNUIsTUFDVztBQUFFLGNBQU0sSUFBSTFDLEtBQUosb0JBQTJCOEMsS0FBS0MsU0FBTCxDQUFlTCxLQUFmLENBQTNCLENBQU47QUFBNEQ7QUFDMUU7OztpQ0FJK0M7QUFDOUMsYUFBTyxLQUFLd0MsTUFBWjtBQUNEOzs7NkNBRTBDO0FBQ3pDLGFBQU8sS0FBS0Usa0JBQVo7QUFDRDs7O21DQUUwQjtBQUN6QiwwQ0FBWSxLQUFLQyxRQUFMLENBQWNxQyxJQUFkLEVBQVo7QUFDRDs7O2tEQUk2QnJILEksRUFBV0MsRSxFQUFrQjs7QUFFekQsVUFBTXFILE1BQTBCLEtBQUt4QyxTQUFMLENBQWVrQixHQUFmLENBQW1CaEcsSUFBbkIsQ0FBaEM7O0FBRUEsVUFBSXNILEdBQUosRUFBUztBQUNQLGVBQU9BLElBQUl0QixHQUFKLENBQVEvRixFQUFSLENBQVA7QUFDRCxPQUZELE1BRU87QUFDTCxlQUFPNkYsU0FBUDtBQUNEO0FBRUY7OzswQ0FJcUI5RixJLEVBQVdDLEUsRUFBb0M7QUFDbkUsVUFBTXNILEtBQWUsS0FBS0MsNkJBQUwsQ0FBbUN4SCxJQUFuQyxFQUF5Q0MsRUFBekMsQ0FBckI7QUFDQSxhQUFTc0gsT0FBT3pCLFNBQVIsSUFBdUJ5QixPQUFPLElBQS9CLEdBQXVDekIsU0FBdkMsR0FBbUQsS0FBS2pCLE1BQUwsQ0FBWTBDLEVBQVosQ0FBMUQ7QUFDRDs7O3VDQUl5RTtBQUFBLFVBQXpEYixVQUF5RCx1RUFBdkMsS0FBS3JFLEtBQUwsRUFBdUM7O0FBQ3hFLGFBQU8sRUFBQ29GLFdBQVcsS0FBS0MsY0FBTCxDQUFvQmhCLFVBQXBCLENBQVosRUFBNkNpQixPQUFPLEtBQUtDLFVBQUwsQ0FBZ0JsQixVQUFoQixDQUFwRCxFQUFQO0FBQ0Q7OztxQ0FFMEQ7QUFBQSxVQUE1Q0EsVUFBNEMsdUVBQTFCLEtBQUtyRSxLQUFMLEVBQTBCOztBQUN6RCxhQUFPLENBQUMsS0FBS3FDLE9BQUwsQ0FBYXNCLEdBQWIsQ0FBaUJVLFVBQWpCLEtBQWdDLEVBQWpDLEVBQXFDMUcsSUFBckMsSUFBNkMsRUFBcEQ7QUFDRDs7O2lDQUVzRDtBQUFBLFVBQTVDMEcsVUFBNEMsdUVBQTFCLEtBQUtyRSxLQUFMLEVBQTBCOztBQUNyRCxhQUFPLENBQUMsS0FBS3FDLE9BQUwsQ0FBYXNCLEdBQWIsQ0FBaUJVLFVBQWpCLEtBQWdDLEVBQWpDLEVBQXFDekcsRUFBckMsSUFBNkMsRUFBcEQ7QUFDRDs7O3VDQUlrQnlHLFUsRUFBb0Q7QUFBQTs7QUFFckUsVUFBTW1CLFNBQWlDLEtBQUtuRCxPQUFMLENBQWFzQixHQUFiLENBQWlCVSxVQUFqQixDQUF2QztBQUNBLFVBQUksQ0FBRW1CLE1BQU4sRUFBZTtBQUFFLGNBQU0sSUFBSWxJLEtBQUosb0JBQTJCOEMsS0FBS0MsU0FBTCxDQUFlZ0UsVUFBZixDQUEzQiw0QkFBTjtBQUF1Rjs7QUFFeEcsVUFBTW9CLFlBQTJCRCxPQUFPNUgsRUFBeEM7QUFBQSxVQUVNOEgsSUFBOEM7QUFBOUMsUUFDWUQsVUFDR3JILEdBREgsQ0FDUSxVQUFDdUgsRUFBRDtBQUFBLGVBQW9DLE9BQUtDLHFCQUFMLENBQTJCLE9BQUs1RixLQUFMLEVBQTNCLEVBQXlDMkYsRUFBekMsQ0FBcEM7QUFBQSxPQURSLEVBRUdFLE1BRkgsQ0FFVUMsT0FGVixDQUhsQjs7QUFPQSxhQUFPSixHQUFQO0FBRUQ7OzsrQ0FFbUM7QUFDbEMsVUFBTUssV0FBc0Msb0NBQXFCLEtBQUtDLGtCQUFMLENBQXdCLEtBQUtoRyxLQUFMLEVBQXhCLENBQXJCLENBQTVDO0FBQ0EsYUFBTyxLQUFLVSxVQUFMLENBQWlCcUYsU0FBU25JLEVBQTFCLENBQVA7QUFDRDs7O3VDQUVrQnFJLEMsRUFBdUI7QUFBQTs7QUFDeEMsYUFBTyxtQkFBSUEsQ0FBSixFQUNBN0gsR0FEQSxDQUNJLFlBQVk7QUFDZCxZQUFNOEgsWUFBaUIsT0FBS2xHLEtBQUwsRUFBdkI7QUFDQSxlQUFLbUcsd0JBQUw7QUFDQSxlQUFPRCxTQUFQO0FBQ0QsT0FMRCxFQU1BNUcsTUFOQSxDQU1PLENBQUMsS0FBS1UsS0FBTCxFQUFELENBTlAsQ0FBUDtBQU9EOzs7NkNBRXdCaUcsQyxFQUE2QjtBQUNwRCxhQUFPLDBCQUFXLEtBQUtHLGtCQUFMLENBQXdCSCxDQUF4QixDQUFYLENBQVA7QUFDRDs7OzhCQUlvRDtBQUFBLFVBQTdDNUIsVUFBNkMsdUVBQTNCLEtBQUtyRSxLQUFMLEVBQTJCOztBQUNuRCxVQUFNd0YsU0FBNkIsS0FBSzVDLGdCQUFMLENBQXNCZSxHQUF0QixDQUEwQlUsVUFBMUIsQ0FBbkM7QUFDQSxVQUFJbUIsTUFBSixFQUFZO0FBQUUsNENBQVlBLE9BQU9SLElBQVAsRUFBWjtBQUE2QixPQUEzQyxNQUNZO0FBQUUsY0FBTSxJQUFJMUgsS0FBSixvQkFBMkI4QyxLQUFLQyxTQUFMLENBQWVnRSxVQUFmLENBQTNCLENBQU47QUFBaUU7QUFDaEY7Ozs4Q0FFeUJBLFUsRUFBNkI7QUFDckQsVUFBTW1CLFNBQTZCLEtBQUs3QyxRQUFMLENBQWNnQixHQUFkLENBQWtCVSxVQUFsQixDQUFuQztBQUNBLFVBQUltQixNQUFKLEVBQVk7QUFBRSw0Q0FBWUEsT0FBT1IsSUFBUCxFQUFaO0FBQTZCLE9BQTNDLE1BQ1k7QUFBRSxjQUFNLElBQUkxSCxLQUFKLG9CQUEyQjhDLEtBQUtDLFNBQUwsQ0FBZWdFLFVBQWYsQ0FBM0IsQ0FBTjtBQUFpRTtBQUNoRjs7QUFFSDtBQUNBOzs7Ozs7Ozs7Ozt3Q0FRa0U7QUFBQTs7QUFBQSxVQUE5Q0EsVUFBOEMsdUVBQTVCLEtBQUtyRSxLQUFMLEVBQTRCO0FBQUU7QUFDaEUsVUFBTXFHLFVBQTZCLEtBQUt6RCxnQkFBTCxDQUFzQmUsR0FBdEIsQ0FBMEJVLFVBQTFCLENBQW5DO0FBQ0EsVUFBSSxDQUFFZ0MsT0FBTixFQUFnQjtBQUFFLGNBQU0sSUFBSS9JLEtBQUosb0JBQTJCOEMsS0FBS0MsU0FBTCxDQUFlZ0UsVUFBZixDQUEzQixDQUFOO0FBQWlFOztBQUVuRixhQUFPLDZCQUFLZ0MsUUFBUUMsTUFBUixFQUFMLEdBQ0NsSSxHQURELENBQ1UsVUFBQ21JLE1BQUQ7QUFBQSxlQUE0RCxPQUFLL0QsTUFBTCxDQUFZK0QsTUFBWixDQUE1RDtBQUFBLE9BRFYsRUFFQ1YsTUFGRCxDQUVVLFVBQUNXLENBQUQ7QUFBQSxlQUE0REEsRUFBRTdJLElBQUYsS0FBVzBHLFVBQXZFO0FBQUEsT0FGVixFQUdDakcsR0FIRCxDQUdVLFVBQUNxSSxRQUFEO0FBQUEsZUFBNERBLFNBQVMzSCxNQUFyRTtBQUFBLE9BSFYsQ0FBUDtBQUlEOzs7NENBRXFFO0FBQUE7O0FBQUEsVUFBaER1RixVQUFnRCx1RUFBOUIsS0FBS3JFLEtBQUwsRUFBOEI7QUFBRTtBQUN0RSxVQUFNcUcsVUFBNkIsS0FBS3pELGdCQUFMLENBQXNCZSxHQUF0QixDQUEwQlUsVUFBMUIsQ0FBbkM7QUFDQSxVQUFJLENBQUVnQyxPQUFOLEVBQWdCO0FBQUUsY0FBTSxJQUFJL0ksS0FBSixvQkFBMkI4QyxLQUFLQyxTQUFMLENBQWVnRSxVQUFmLENBQTNCLENBQU47QUFBaUU7O0FBRW5GLGFBQU8sNkJBQUtnQyxRQUFRQyxNQUFSLEVBQUwsR0FDQ2xJLEdBREQsQ0FDVSxVQUFDbUksTUFBRDtBQUFBLGVBQThDLE9BQUsvRCxNQUFMLENBQVkrRCxNQUFaLENBQTlDO0FBQUEsT0FEVixFQUVDVixNQUZELENBRVUsVUFBQ1csQ0FBRDtBQUFBLGVBQThDQSxFQUFFN0ksSUFBRixLQUFXMEcsVUFBekQ7QUFBQSxPQUZWLEVBR0NqRyxHQUhELENBR1UsVUFBQ3FJLFFBQUQ7QUFBQSxlQUFnRCxFQUFFM0gsUUFBYzJILFNBQVMzSCxNQUF6QjtBQUNFRSx1QkFBY3lILFNBQVN6SCxXQUR6QixFQUFoRDtBQUFBLE9BSFYsQ0FBUDtBQU1EOzs7bUNBSWNxRixVLEVBQTBCO0FBQ3ZDO0FBQ0EsYUFBTyxLQUFLZ0IsY0FBTCxDQUFvQmhCLFVBQXBCLEVBQWdDMUMsTUFBaEMsS0FBMkMsQ0FBbEQ7QUFDRDs7O3VDQUUyQjtBQUFBOztBQUMxQixhQUFPLEtBQUtvRCxNQUFMLEdBQWMyQixJQUFkLENBQW9CLFVBQUNDLENBQUQ7QUFBQSxlQUFnQixPQUFLQyxjQUFMLENBQW9CRCxDQUFwQixDQUFoQjtBQUFBLE9BQXBCLENBQVA7QUFDRDs7O2tDQUlzQjtBQUNyQixhQUFPLEtBQUtyQyxpQkFBTCxDQUF1QixLQUFLdEUsS0FBTCxFQUF2QixDQUFQO0FBQ0Q7OztzQ0FFaUJxRSxVLEVBQTBCO0FBQzFDO0FBQ0EsYUFBTyxLQUFLa0IsVUFBTCxDQUFnQmxCLFVBQWhCLEVBQTRCMUMsTUFBNUIsS0FBdUMsQ0FBOUM7QUFDRDs7O29DQUV3QjtBQUFBOztBQUN2QixhQUFPLEtBQUtvRCxNQUFMLEdBQWMyQixJQUFkLENBQW9CLFVBQUNDLENBQUQ7QUFBQSxlQUFnQixPQUFLckMsaUJBQUwsQ0FBdUJxQyxDQUF2QixDQUFoQjtBQUFBLE9BQXBCLENBQVA7QUFDRDs7O2tDQUlzQjtBQUNyQixhQUFPLEtBQUtwQyxpQkFBTCxDQUF1QixLQUFLdkUsS0FBTCxFQUF2QixDQUFQO0FBQ0Q7OztzQ0FFaUJxRSxVLEVBQTJCO0FBQzNDLFVBQU1tQixTQUFpQyxLQUFLbkQsT0FBTCxDQUFhc0IsR0FBYixDQUFpQlUsVUFBakIsQ0FBdkM7QUFDQSxVQUFJbUIsTUFBSixFQUFZO0FBQUUsZUFBT0EsT0FBT3JELFFBQWQ7QUFBeUIsT0FBdkMsTUFDWTtBQUFFLGNBQU0sSUFBSTdFLEtBQUosb0JBQTJCOEMsS0FBS0MsU0FBTCxDQUFlZ0UsVUFBZixDQUEzQixDQUFOO0FBQWlFO0FBQ2hGOzs7b0NBRXdCO0FBQUE7O0FBQ3ZCLGFBQU8sS0FBS1UsTUFBTCxHQUFjMkIsSUFBZCxDQUFvQixVQUFDQyxDQUFEO0FBQUEsZUFBZ0IsT0FBS3BDLGlCQUFMLENBQXVCb0MsQ0FBdkIsQ0FBaEI7QUFBQSxPQUFwQixDQUFQO0FBQ0Q7OzsyQkFJTTVHLEksRUFBVzhHLE8sRUFBd0I7QUFDeEM7QUFDQTtBQUNBO0FBQ0EsVUFBSSxLQUFLQyxZQUFMLENBQWtCL0csSUFBbEIsRUFBd0I4RyxPQUF4QixDQUFKLEVBQXNDO0FBQ3BDLFlBQU1FLE9BQWlDLEtBQUtDLHVCQUFMLENBQTZCakgsSUFBN0IsQ0FBdkM7QUFDQSxhQUFLcUMsTUFBTCxHQUFjMkUsS0FBS25KLEVBQW5CO0FBQ0EsZUFBTyxJQUFQO0FBQ0QsT0FKRCxNQUlPO0FBQ0wsZUFBTyxLQUFQO0FBQ0Q7QUFDRjs7OytCQUVVcUosUSxFQUFlSixPLEVBQXdCO0FBQ2hEO0FBQ0E7QUFDQTtBQUNBLFVBQUksS0FBS0ssZ0JBQUwsQ0FBc0JELFFBQXRCLEVBQWdDSixPQUFoQyxDQUFKLEVBQThDO0FBQzVDLGFBQUt6RSxNQUFMLEdBQWM2RSxRQUFkO0FBQ0EsZUFBTyxJQUFQO0FBQ0QsT0FIRCxNQUdPO0FBQ0wsZUFBTyxLQUFQO0FBQ0Q7QUFDRjs7QUFFRDs7OztxQ0FDaUJBLFEsRUFBZUosTyxFQUF3QjtBQUN0RDtBQUNBO0FBQ0E7QUFDQSxVQUFJLEtBQUtNLHNCQUFMLENBQTRCRixRQUE1QixFQUFzQ0osT0FBdEMsQ0FBSixFQUFvRDtBQUNsRCxhQUFLekUsTUFBTCxHQUFjNkUsUUFBZDtBQUNBLGVBQU8sSUFBUDtBQUNELE9BSEQsTUFHTztBQUNMLGVBQU8sS0FBUDtBQUNEO0FBQ0Y7Ozt1Q0FJa0JuSSxNLEVBQTRCO0FBQzdDLFVBQU1zSSxjQUFpQyxLQUFLekUsUUFBTCxDQUFjZ0IsR0FBZCxDQUFrQjdFLE1BQWxCLENBQXZDO0FBQ0EsYUFBT3NJLGNBQWFBLFlBQVl6RCxHQUFaLENBQWdCLEtBQUszRCxLQUFMLEVBQWhCLENBQWIsR0FBNEN5RCxTQUFuRDtBQUNEOzs7NENBRXVCM0UsTSxFQUF1QztBQUM3RCxVQUFNdUksTUFBZSxLQUFLQyxrQkFBTCxDQUF3QnhJLE1BQXhCLENBQXJCO0FBQ0EsVUFBS3VJLFFBQVE1RCxTQUFULElBQXdCNEQsUUFBUSxJQUFwQyxFQUEyQztBQUFFLGNBQU0sSUFBSS9KLEtBQUoscUJBQTRCOEMsS0FBS0MsU0FBTCxDQUFldkIsTUFBZixDQUE1QixDQUFOO0FBQThEO0FBQzNHLGFBQU8sS0FBSzBELE1BQUwsQ0FBWTZFLEdBQVosQ0FBUDtBQUNEOzs7aUNBRVl2SSxNLEVBQWF5SSxRLEVBQXlCO0FBQUc7QUFDcEQ7QUFDQTtBQUNBO0FBQ0EsYUFBTyxLQUFLRCxrQkFBTCxDQUF3QnhJLE1BQXhCLE1BQW9DMkUsU0FBM0M7QUFDRDs7O3FDQUVnQndELFEsRUFBZU0sUSxFQUF5QjtBQUFHO0FBQzFEO0FBQ0E7QUFFQSxVQUFNQyxpQkFBNEMsS0FBSzVCLHFCQUFMLENBQTJCLEtBQUs1RixLQUFMLEVBQTNCLEVBQXlDaUgsUUFBekMsQ0FBbEQ7O0FBRUEsVUFBSSxDQUFFTyxjQUFOLEVBQWdDO0FBQUUsZUFBTyxLQUFQO0FBQWU7QUFDakQsVUFBSUEsZUFBZTdJLFdBQW5CLEVBQWdDO0FBQUUsZUFBTyxLQUFQO0FBQWU7O0FBRWpELGFBQU8sSUFBUDtBQUVEOzs7MkNBRXNCc0ksUSxFQUFlTSxRLEVBQXlCO0FBQUc7QUFDaEU7QUFDQTtBQUNBO0FBQ0EsYUFBUSxLQUFLM0IscUJBQUwsQ0FBMkIsS0FBSzVGLEtBQUwsRUFBM0IsRUFBeUNpSCxRQUF6QyxNQUF1RHhELFNBQS9EO0FBQ0Q7Ozs7OztBQVNILFNBQVNnRSxFQUFULENBQXNCQyxnQkFBdEIsQ0FBc0QsaUJBQXRELEVBQTRGO0FBQUE7OztBQUV4RjtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxTQUFPLElBQUl4RixPQUFKLENBQVlGLEtBQUswRixpQkFBaUIxSyxNQUFqQjs7QUFFdEI7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsWUFBQ1UsR0FBRCxFQUFNbUMsR0FBTixFQUFXd0gsR0FBWDtBQUFBLGdCQUE4QjNKLEdBQTlCLEdBQW9DLFdBQVUySixHQUFWLENBQXBDLEdBQXFEeEgsR0FBckQ7QUFBQSxHQVBzQixDQU9zQztBQUM1RDtBQUNBOztBQVRzQixHQUFMLENBQVosQ0FBUDtBQWFIOztRQVFDM0MsTyxHQUFBQSxPO1FBRUFnRixPLEdBQUFBLE87UUFFQUYsSSxHQUFBQSxJO1FBQ0UvRSxLLEdBQUFBLEs7UUFDQXFELE8sR0FBQUEsTztRQUVGbUgsRSxHQUFBQSxFO1FBRUF0SyxlLEdBQUFBLGU7UUFDQUksZSxHQUFBQSxlO1FBQ0FDLGdCLEdBQUFBLGdCO1FBR0FtSyxHO1FBQUtDLG9CO1FBQXNCQyxVO1FBQVlDLHNCO1FBQXdCQyxrQiIsImZpbGUiOiJqc3NtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vLyB3aGFyZ2FyYmwgbG90cyBvZiB0aGVzZSByZXR1cm4gYXJyYXlzIGNvdWxkL3Nob3VsZCBiZSBzZXRzXG5cbi8vIEBmbG93XG5cbmNvbnN0IHJlZHVjZV90b182MzkgOiBGdW5jdGlvbiA9IHJlcXVpcmUoJ3JlZHVjZS10by02MzktMScpLnJlZHVjZTtcblxuXG5cblxuXG5pbXBvcnQgdHlwZSB7XG5cbiAgSnNzbUdlbmVyaWNTdGF0ZSwgSnNzbUdlbmVyaWNDb25maWcsXG4gIEpzc21UcmFuc2l0aW9uLCBKc3NtVHJhbnNpdGlvbkxpc3QsXG4gIEpzc21NYWNoaW5lSW50ZXJuYWxTdGF0ZSxcbiAgSnNzbVBhcnNlVHJlZSxcbiAgSnNzbUNvbXBpbGVTZSwgSnNzbUNvbXBpbGVTZVN0YXJ0LCBKc3NtQ29tcGlsZVJ1bGUsXG4gIEpzc21BcnJvdywgSnNzbUFycm93RGlyZWN0aW9uLCBKc3NtQXJyb3dLaW5kLFxuICBKc3NtTGF5b3V0XG5cbn0gZnJvbSAnLi9qc3NtLXR5cGVzJztcblxuXG5cblxuXG5pbXBvcnQgeyBzZXEsIHdlaWdodGVkX3JhbmRfc2VsZWN0LCB3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0LCBoaXN0b2dyYXBoLCB3ZWlnaHRlZF9oaXN0b19rZXkgfSBmcm9tICcuL2pzc20tdXRpbC5qcyc7XG5cbmNvbnN0IHBhcnNlOiA8TlQsIERUPihzdHJpbmcpID0+IEpzc21QYXJzZVRyZWU8TlQ+ID0gcmVxdWlyZSgnLi9qc3NtLWRvdC5qcycpLnBhcnNlOyAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBmbG93dHlwZS9uby13ZWFrLXR5cGVzIC8vIHRvZG8gd2hhcmdhcmJsIHJlbW92ZSBhbnlcblxuY29uc3QgdmVyc2lvbjogbnVsbCA9IG51bGw7IC8vIHJlcGxhY2VkIGZyb20gcGFja2FnZS5qcyBpbiBidWlsZFxuXG5cblxuXG5cbi8qIGVzbGludC1kaXNhYmxlIGNvbXBsZXhpdHkgKi9cblxuZnVuY3Rpb24gYXJyb3dfZGlyZWN0aW9uKGFycm93OiBKc3NtQXJyb3cpOiBKc3NtQXJyb3dEaXJlY3Rpb24ge1xuXG4gIHN3aXRjaCAoIFN0cmluZyhhcnJvdykgKSB7XG5cbiAgICBjYXNlICctPicgOiAgICBjYXNlICfihpInIDpcbiAgICBjYXNlICc9PicgOiAgICBjYXNlICfih5InIDpcbiAgICBjYXNlICd+PicgOiAgICBjYXNlICfihpsnIDpcbiAgICAgIHJldHVybiAncmlnaHQnO1xuXG4gICAgY2FzZSAnPC0nIDogICAgY2FzZSAn4oaQJyA6XG4gICAgY2FzZSAnPD0nIDogICAgY2FzZSAn4oeQJyA6XG4gICAgY2FzZSAnPH4nIDogICAgY2FzZSAn4oaaJyA6XG4gICAgICByZXR1cm4gJ2xlZnQnO1xuXG4gICAgY2FzZSAnPC0+JzogICAgY2FzZSAn4oaUJyA6XG4gICAgY2FzZSAnPC09Pic6ICAgY2FzZSAn4oaQ4oeSJyA6XG4gICAgY2FzZSAnPC1+Pic6ICAgY2FzZSAn4oaQ4oabJyA6XG5cbiAgICBjYXNlICc8PT4nOiAgICBjYXNlICfih5QnIDpcbiAgICBjYXNlICc8PS0+JzogICBjYXNlICfih5DihpInIDpcbiAgICBjYXNlICc8PX4+JzogICBjYXNlICfih5DihpsnIDpcblxuICAgIGNhc2UgJzx+Pic6ICAgIGNhc2UgJ+KGricgOlxuICAgIGNhc2UgJzx+LT4nOiAgIGNhc2UgJ+KGmuKGkicgOlxuICAgIGNhc2UgJzx+PT4nOiAgIGNhc2UgJ+KGmuKHkicgOlxuICAgICAgcmV0dXJuICdib3RoJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGFycm93X2RpcmVjdGlvbjogdW5rbm93biBhcnJvdyB0eXBlICR7YXJyb3d9YCk7XG5cbiAgfVxuXG59XG5cbi8qIGVzbGludC1lbmFibGUgY29tcGxleGl0eSAqL1xuXG5cblxuXG5cbi8qIGVzbGludC1kaXNhYmxlIGNvbXBsZXhpdHkgKi9cblxuZnVuY3Rpb24gYXJyb3dfbGVmdF9raW5kKGFycm93OiBKc3NtQXJyb3cpOiBKc3NtQXJyb3dLaW5kIHtcblxuICBzd2l0Y2ggKCBTdHJpbmcoYXJyb3cpICkge1xuXG4gICAgY2FzZSAnLT4nIDogICAgY2FzZSAn4oaSJyA6XG4gICAgY2FzZSAnPT4nIDogICAgY2FzZSAn4oeSJyA6XG4gICAgY2FzZSAnfj4nIDogICAgY2FzZSAn4oabJyA6XG4gICAgICByZXR1cm4gJ25vbmUnO1xuXG4gICAgY2FzZSAnPC0nOiAgICAgY2FzZSAn4oaQJyA6XG4gICAgY2FzZSAnPC0+JzogICAgY2FzZSAn4oaUJyA6XG4gICAgY2FzZSAnPC09Pic6ICAgY2FzZSAn4oaQ4oeSJyA6XG4gICAgY2FzZSAnPC1+Pic6ICAgY2FzZSAn4oaQ4oabJyA6XG4gICAgICByZXR1cm4gJ2xlZ2FsJztcblxuICAgIGNhc2UgJzw9JzogICAgIGNhc2UgJ+KHkCcgOlxuICAgIGNhc2UgJzw9Pic6ICAgIGNhc2UgJ+KHlCcgOlxuICAgIGNhc2UgJzw9LT4nOiAgIGNhc2UgJ+KHkOKGkicgOlxuICAgIGNhc2UgJzw9fj4nOiAgIGNhc2UgJ+KHkOKGmycgOlxuICAgICAgcmV0dXJuICdtYWluJztcblxuICAgIGNhc2UgJzx+JzogICAgIGNhc2UgJ+KGmicgOlxuICAgIGNhc2UgJzx+Pic6ICAgIGNhc2UgJ+KGricgOlxuICAgIGNhc2UgJzx+LT4nOiAgIGNhc2UgJ+KGmuKGkicgOlxuICAgIGNhc2UgJzx+PT4nOiAgIGNhc2UgJ+KGmuKHkicgOlxuICAgICAgcmV0dXJuICdmb3JjZWQnO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXJyb3dfZGlyZWN0aW9uOiB1bmtub3duIGFycm93IHR5cGUgJHthcnJvd31gKTtcblxuICB9XG5cbn1cblxuLyogZXNsaW50LWVuYWJsZSBjb21wbGV4aXR5ICovXG5cblxuXG5cblxuLyogZXNsaW50LWRpc2FibGUgY29tcGxleGl0eSAqL1xuXG5mdW5jdGlvbiBhcnJvd19yaWdodF9raW5kKGFycm93OiBKc3NtQXJyb3cpOiBKc3NtQXJyb3dLaW5kIHtcblxuICBzd2l0Y2ggKCBTdHJpbmcoYXJyb3cpICkge1xuXG4gICAgY2FzZSAnPC0nIDogICAgY2FzZSAn4oaQJyA6XG4gICAgY2FzZSAnPD0nIDogICAgY2FzZSAn4oeQJyA6XG4gICAgY2FzZSAnPH4nIDogICAgY2FzZSAn4oaaJyA6XG4gICAgICByZXR1cm4gJ25vbmUnO1xuXG4gICAgY2FzZSAnLT4nIDogICAgY2FzZSAn4oaSJyA6XG4gICAgY2FzZSAnPC0+JzogICAgY2FzZSAn4oaUJyA6XG4gICAgY2FzZSAnPD0tPic6ICAgY2FzZSAn4oeQ4oaSJyA6XG4gICAgY2FzZSAnPH4tPic6ICAgY2FzZSAn4oaa4oaSJyA6XG4gICAgICByZXR1cm4gJ2xlZ2FsJztcblxuICAgIGNhc2UgJz0+JyA6ICAgIGNhc2UgJ+KHkicgOlxuICAgIGNhc2UgJzw9Pic6ICAgIGNhc2UgJ+KHlCcgOlxuICAgIGNhc2UgJzwtPT4nOiAgIGNhc2UgJ+KGkOKHkicgOlxuICAgIGNhc2UgJzx+PT4nOiAgIGNhc2UgJ+KGmuKHkicgOlxuICAgICAgcmV0dXJuICdtYWluJztcblxuICAgIGNhc2UgJ34+JyA6ICAgIGNhc2UgJ+KGmycgOlxuICAgIGNhc2UgJzx+Pic6ICAgIGNhc2UgJ+KGricgOlxuICAgIGNhc2UgJzwtfj4nOiAgIGNhc2UgJ+KGkOKGmycgOlxuICAgIGNhc2UgJzw9fj4nOiAgIGNhc2UgJ+KHkOKGmycgOlxuICAgICAgcmV0dXJuICdmb3JjZWQnO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXJyb3dfZGlyZWN0aW9uOiB1bmtub3duIGFycm93IHR5cGUgJHthcnJvd31gKTtcblxuICB9XG5cbn1cblxuLyogZXNsaW50LWVuYWJsZSBjb21wbGV4aXR5ICovXG5cblxuXG5cblxuZnVuY3Rpb24gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcDxtTlQsIG1EVD4oXG4gICAgICAgICAgICAgYWNjICAgICA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPixcbiAgICAgICAgICAgICBmcm9tICAgIDogbU5ULFxuICAgICAgICAgICAgIHRvICAgICAgOiBtTlQsXG4gICAgICAgICAgICAgdGhpc19zZSA6IEpzc21Db21waWxlU2U8bU5UPixcbiAgICAgICAgICAgICBuZXh0X3NlIDogSnNzbUNvbXBpbGVTZTxtTlQ+XG4gICAgICAgICApIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHsgLy8gdG9kbyBmbG93IGRlc2NyaWJlIHRoZSBwYXJzZXIgcmVwcmVzZW50YXRpb24gb2YgYSB0cmFuc2l0aW9uIHN0ZXAgZXh0ZW5zaW9uXG5cbiAgY29uc3QgZWRnZXMgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBbXTtcblxuICBjb25zdCB1RnJvbSA6IEFycmF5PCBtTlQgPiA9IChBcnJheS5pc0FycmF5KGZyb20pPyBmcm9tIDogW2Zyb21dKSxcbiAgICAgICAgdVRvICAgOiBBcnJheTwgbU5UID4gPSAoQXJyYXkuaXNBcnJheSh0byk/ICAgdG8gICA6IFt0b10gICk7XG5cbiAgdUZyb20ubWFwKCAoZjogbU5UKSA9PiB7XG4gICAgdVRvLm1hcCggKHQ6IG1OVCkgPT4ge1xuXG4gICAgICBjb25zdCByazogSnNzbUFycm93S2luZCA9IGFycm93X3JpZ2h0X2tpbmQodGhpc19zZS5raW5kKSxcbiAgICAgICAgICAgIGxrOiBKc3NtQXJyb3dLaW5kID0gYXJyb3dfbGVmdF9raW5kKHRoaXNfc2Uua2luZCk7XG5cblxuICAgICAgY29uc3QgcmlnaHQ6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHtcbiAgICAgICAgZnJvbSAgICAgICAgOiBmLFxuICAgICAgICB0byAgICAgICAgICA6IHQsXG4gICAgICAgIGtpbmQgICAgICAgIDogcmssXG4gICAgICAgIGZvcmNlZF9vbmx5IDogcmsgPT09ICdmb3JjZWQnLFxuICAgICAgICBtYWluX3BhdGggICA6IHJrID09PSAnbWFpbidcbiAgICAgIH07XG5cbiAgICAgIGlmICh0aGlzX3NlLnJfYWN0aW9uKSAgICAgIHsgcmlnaHQuYWN0aW9uICAgICAgPSB0aGlzX3NlLnJfYWN0aW9uOyAgICAgIH1cbiAgICAgIGlmICh0aGlzX3NlLnJfcHJvYmFiaWxpdHkpIHsgcmlnaHQucHJvYmFiaWxpdHkgPSB0aGlzX3NlLnJfcHJvYmFiaWxpdHk7IH1cbiAgICAgIGlmIChyaWdodC5raW5kICE9PSAnbm9uZScpIHsgZWRnZXMucHVzaChyaWdodCk7IH1cblxuXG4gICAgICBjb25zdCBsZWZ0OiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB7XG4gICAgICAgIGZyb20gICAgICAgIDogdCxcbiAgICAgICAgdG8gICAgICAgICAgOiBmLFxuICAgICAgICBraW5kICAgICAgICA6IGxrLFxuICAgICAgICBmb3JjZWRfb25seSA6IGxrID09PSAnZm9yY2VkJyxcbiAgICAgICAgbWFpbl9wYXRoICAgOiBsayA9PT0gJ21haW4nXG4gICAgICB9O1xuXG4gICAgICBpZiAodGhpc19zZS5sX2FjdGlvbikgICAgICB7IGxlZnQuYWN0aW9uICAgICAgPSB0aGlzX3NlLmxfYWN0aW9uOyAgICAgIH1cbiAgICAgIGlmICh0aGlzX3NlLmxfcHJvYmFiaWxpdHkpIHsgbGVmdC5wcm9iYWJpbGl0eSA9IHRoaXNfc2UubF9wcm9iYWJpbGl0eTsgfVxuICAgICAgaWYgKGxlZnQua2luZCAhPT0gJ25vbmUnKSAgeyBlZGdlcy5wdXNoKGxlZnQpOyB9XG5cbiAgICB9KTtcbiAgfSk7XG5cbiAgY29uc3QgbmV3X2FjYzogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+ID0gYWNjLmNvbmNhdChlZGdlcyk7XG5cbiAgaWYgKG5leHRfc2UpIHtcbiAgICByZXR1cm4gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcChuZXdfYWNjLCB0bywgbmV4dF9zZS50bywgbmV4dF9zZSwgbmV4dF9zZS5zZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ld19hY2M7XG4gIH1cblxufVxuXG5cblxuZnVuY3Rpb24gY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uPG1OVD4ocnVsZTogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pOiBtaXhlZCB7IC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgcGFyc2VyIHJlcHJlc2VudGF0aW9uIG9mIGEgdHJhbnNpdGlvblxuICByZXR1cm4gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcChbXSwgcnVsZS5mcm9tLCBydWxlLnNlLnRvLCBydWxlLnNlLCBydWxlLnNlLnNlKTtcbn1cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVfcnVsZV9oYW5kbGVyPG1OVD4ocnVsZTogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pOiBKc3NtQ29tcGlsZVJ1bGUgeyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIG91dHB1dCBvZiB0aGUgcGFyc2VyXG5cbiAgaWYgKHJ1bGUua2V5ID09PSAndHJhbnNpdGlvbicpIHtcbiAgICByZXR1cm4geyBhZ2dfYXM6ICd0cmFuc2l0aW9uJywgdmFsOiBjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb24ocnVsZSkgfTtcbiAgfVxuXG4gIGlmIChydWxlLmtleSA9PT0gJ21hY2hpbmVfbGFuZ3VhZ2UnKSB7XG4gICAgcmV0dXJuIHsgYWdnX2FzOiAnbWFjaGluZV9sYW5ndWFnZScsIHZhbDogcmVkdWNlX3RvXzYzOShydWxlLnZhbHVlKSB9O1xuICB9XG5cbiAgaWYgKHJ1bGUua2V5ID09PSAnc3RhdGVfZGVjbGFyYXRpb24nKSB7XG4gICAgaWYgKCFydWxlLm5hbWUpIHsgdGhyb3cgbmV3IEVycm9yKCdTdGF0ZSBkZWNsYXJhdGlvbnMgbXVzdCBoYXZlIGEgbmFtZScpOyB9XG4gICAgcmV0dXJuIHsgYWdnX2FzOiAnc3RhdGVfZGVjbGFyYXRpb24nLCB2YWw6IHsgc3RhdGU6IHJ1bGUubmFtZSwgZGVjbGFyYXRpb25zOiBydWxlLnZhbHVlIH0gfTtcbiAgfVxuXG4gIGNvbnN0IHRhdXRvbG9naWVzIDogQXJyYXk8c3RyaW5nPiA9IFtcbiAgICAnZ3JhcGhfbGF5b3V0JywgJ3N0YXJ0X3N0YXRlcycsICdlbmRfc3RhdGVzJywgJ21hY2hpbmVfbmFtZScsICdtYWNoaW5lX3ZlcnNpb24nLFxuICAgICdtYWNoaW5lX2NvbW1lbnQnLCAnbWFjaGluZV9hdXRob3InLCAnbWFjaGluZV9jb250cmlidXRvcicsICdtYWNoaW5lX2RlZmluaXRpb24nLFxuICAgICdtYWNoaW5lX3JlZmVyZW5jZScsICdtYWNoaW5lX2xpY2Vuc2UnLCAnZnNsX3ZlcnNpb24nXG4gIF07XG5cbiAgaWYgKHRhdXRvbG9naWVzLmluY2x1ZGVzKHJ1bGUua2V5KSkge1xuICAgIHJldHVybiB7IGFnZ19hczogcnVsZS5rZXksIHZhbDogcnVsZS52YWx1ZSB9O1xuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKGBjb21waWxlX3J1bGVfaGFuZGxlcjogVW5rbm93biBydWxlOiAke0pTT04uc3RyaW5naWZ5KHJ1bGUpfWApO1xuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gY29tcGlsZTxtTlQsIG1EVD4odHJlZTogSnNzbVBhcnNlVHJlZTxtTlQ+KTogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+IHsgIC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgb3V0cHV0IG9mIHRoZSBwYXJzZXJcblxuICBjb25zdCByZXN1bHRzIDoge1xuICAgIGdyYXBoX2xheW91dCAgICAgICAgOiBBcnJheTwgSnNzbUxheW91dCA+LFxuICAgIHRyYW5zaXRpb24gICAgICAgICAgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4sXG4gICAgc3RhcnRfc3RhdGVzICAgICAgICA6IEFycmF5PCBtTlQgPixcbiAgICBlbmRfc3RhdGVzICAgICAgICAgIDogQXJyYXk8IG1OVCA+LFxuICAgIHN0YXRlX2RlY2xhcmF0aW9uICAgOiBBcnJheTwgbU5UID4sXG4gICAgZnNsX3ZlcnNpb24gICAgICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2F1dGhvciAgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfY29tbWVudCAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9jb250cmlidXRvciA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2RlZmluaXRpb24gIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfbGFuZ3VhZ2UgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9saWNlbnNlICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX25hbWUgICAgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfcmVmZXJlbmNlICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV92ZXJzaW9uICAgICA6IEFycmF5PCBzdHJpbmcgPiAvLyBzZW12ZXJcbiAgfSA9IHtcbiAgICBncmFwaF9sYXlvdXQgICAgICAgIDogW10sXG4gICAgdHJhbnNpdGlvbiAgICAgICAgICA6IFtdLFxuICAgIHN0YXJ0X3N0YXRlcyAgICAgICAgOiBbXSxcbiAgICBlbmRfc3RhdGVzICAgICAgICAgIDogW10sXG4gICAgc3RhdGVfZGVjbGFyYXRpb24gICA6IFtdLFxuICAgIGZzbF92ZXJzaW9uICAgICAgICAgOiBbXSxcbiAgICBtYWNoaW5lX2F1dGhvciAgICAgIDogW10sXG4gICAgbWFjaGluZV9jb21tZW50ICAgICA6IFtdLFxuICAgIG1hY2hpbmVfY29udHJpYnV0b3IgOiBbXSxcbiAgICBtYWNoaW5lX2RlZmluaXRpb24gIDogW10sXG4gICAgbWFjaGluZV9sYW5ndWFnZSAgICA6IFtdLFxuICAgIG1hY2hpbmVfbGljZW5zZSAgICAgOiBbXSxcbiAgICBtYWNoaW5lX25hbWUgICAgICAgIDogW10sXG4gICAgbWFjaGluZV9yZWZlcmVuY2UgICA6IFtdLFxuICAgIG1hY2hpbmVfdmVyc2lvbiAgICAgOiBbXVxuICB9O1xuXG4gIHRyZWUubWFwKCAodHIgOiBKc3NtQ29tcGlsZVNlU3RhcnQ8bU5UPikgPT4ge1xuXG4gICAgY29uc3QgcnVsZSAgIDogSnNzbUNvbXBpbGVSdWxlID0gY29tcGlsZV9ydWxlX2hhbmRsZXIodHIpLFxuICAgICAgICAgIGFnZ19hcyA6IHN0cmluZyAgICAgICAgICA9IHJ1bGUuYWdnX2FzLFxuICAgICAgICAgIHZhbCAgICA6IG1peGVkICAgICAgICAgICA9IHJ1bGUudmFsOyAgICAgICAgICAgICAgICAgIC8vIHRvZG8gYmV0dGVyIHR5cGVzXG5cbiAgICByZXN1bHRzW2FnZ19hc10gPSByZXN1bHRzW2FnZ19hc10uY29uY2F0KHZhbCk7XG5cbiAgfSk7XG5cbiAgY29uc3QgYXNzZW1ibGVkX3RyYW5zaXRpb25zIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+ID0gW10uY29uY2F0KC4uLiByZXN1bHRzWyd0cmFuc2l0aW9uJ10pO1xuXG4gIGNvbnN0IHJlc3VsdF9jZmcgOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4gPSB7XG4gICAgc3RhcnRfc3RhdGVzIDogcmVzdWx0cy5zdGFydF9zdGF0ZXMubGVuZ3RoPyByZXN1bHRzLnN0YXJ0X3N0YXRlcyA6IFthc3NlbWJsZWRfdHJhbnNpdGlvbnNbMF0uZnJvbV0sXG4gICAgdHJhbnNpdGlvbnMgIDogYXNzZW1ibGVkX3RyYW5zaXRpb25zXG4gIH07XG5cbiAgY29uc3Qgb25lT25seUtleXMgOiBBcnJheTxzdHJpbmc+ID0gW1xuICAgICdncmFwaF9sYXlvdXQnLCAnbWFjaGluZV9uYW1lJywgJ21hY2hpbmVfdmVyc2lvbicsICdtYWNoaW5lX2NvbW1lbnQnLCAnZnNsX3ZlcnNpb24nLCAnbWFjaGluZV9saWNlbnNlJyxcbiAgICAnbWFjaGluZV9kZWZpbml0aW9uJywgJ21hY2hpbmVfbGFuZ3VhZ2UnXG4gIF07XG5cbiAgb25lT25seUtleXMubWFwKCAob25lT25seUtleSA6IHN0cmluZykgPT4ge1xuICAgIGlmIChyZXN1bHRzW29uZU9ubHlLZXldLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWF5IG9ubHkgaGF2ZSBvbmUgJHtvbmVPbmx5S2V5fSBzdGF0ZW1lbnQgbWF4aW11bTogJHtKU09OLnN0cmluZ2lmeShyZXN1bHRzW29uZU9ubHlLZXldKX1gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHJlc3VsdHNbb25lT25seUtleV0ubGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdF9jZmdbb25lT25seUtleV0gPSByZXN1bHRzW29uZU9ubHlLZXldWzBdO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgWydtYWNoaW5lX2F1dGhvcicsICdtYWNoaW5lX2NvbnRyaWJ1dG9yJywgJ21hY2hpbmVfcmVmZXJlbmNlJywgJ3N0YXRlX2RlY2xhcmF0aW9uJ10ubWFwKCAobXVsdGlLZXkgOiBzdHJpbmcpID0+IHtcbiAgICBpZiAocmVzdWx0c1ttdWx0aUtleV0ubGVuZ3RoKSB7XG4gICAgICByZXN1bHRfY2ZnW211bHRpS2V5XSA9IHJlc3VsdHNbbXVsdGlLZXldO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHJlc3VsdF9jZmc7XG5cbn1cblxuXG5cblxuXG5mdW5jdGlvbiBtYWtlPG1OVCwgbURUPihwbGFuOiBzdHJpbmcpOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4ge1xuICByZXR1cm4gY29tcGlsZShwYXJzZShwbGFuKSk7XG59XG5cblxuXG5cblxuY2xhc3MgTWFjaGluZTxtTlQsIG1EVD4ge1xuXG5cbiAgX3N0YXRlICAgICAgICAgICAgICAgICAgOiBtTlQ7XG4gIF9zdGF0ZXMgICAgICAgICAgICAgICAgIDogTWFwPG1OVCwgSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+PjtcbiAgX2VkZ2VzICAgICAgICAgICAgICAgICAgOiBBcnJheTxKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4+O1xuICBfZWRnZV9tYXAgICAgICAgICAgICAgICA6IE1hcDxtTlQsIE1hcDxtTlQsIG51bWJlcj4+O1xuICBfbmFtZWRfdHJhbnNpdGlvbnMgICAgICA6IE1hcDxtTlQsIG51bWJlcj47XG4gIF9hY3Rpb25zICAgICAgICAgICAgICAgIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG4gIF9yZXZlcnNlX2FjdGlvbnMgICAgICAgIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG4gIF9yZXZlcnNlX2FjdGlvbl90YXJnZXRzIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG5cbiAgX21hY2hpbmVfYXV0aG9yICAgICAgICAgOiA/QXJyYXk8c3RyaW5nPjtcbiAgX21hY2hpbmVfY29tbWVudCAgICAgICAgOiA/c3RyaW5nO1xuICBfbWFjaGluZV9jb250cmlidXRvciAgICA6ID9BcnJheTxzdHJpbmc+O1xuICBfbWFjaGluZV9kZWZpbml0aW9uICAgICA6ID9zdHJpbmc7XG4gIF9tYWNoaW5lX2xhbmd1YWdlICAgICAgIDogP3N0cmluZztcbiAgX21hY2hpbmVfbGljZW5zZSAgICAgICAgOiA/c3RyaW5nO1xuICBfbWFjaGluZV9uYW1lICAgICAgICAgICA6ID9zdHJpbmc7XG4gIF9tYWNoaW5lX3ZlcnNpb24gICAgICAgIDogP3N0cmluZztcbiAgX2ZzbF92ZXJzaW9uICAgICAgICAgICAgOiA/c3RyaW5nO1xuICBfcmF3X3N0YXRlX2RlY2xhcmF0aW9uICA6ID9BcnJheTxPYmplY3Q+OyAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXNcbiAgX3N0YXRlX2RlY2xhcmF0aW9ucyAgICAgOiBNYXA8bU5ULCBPYmplY3Q+OyAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBmbG93dHlwZS9uby13ZWFrLXR5cGVzXG5cbiAgX2dyYXBoX2xheW91dCAgICAgICAgICAgOiBKc3NtTGF5b3V0O1xuXG5cbiAgLy8gd2hhcmdhcmJsIHRoaXMgYmFkbHkgbmVlZHMgdG8gYmUgYnJva2VuIHVwLCBtb25vbGl0aCBtYXN0ZXJcbiAgY29uc3RydWN0b3Ioe1xuICAgIHN0YXJ0X3N0YXRlcyxcbiAgICBjb21wbGV0ZSAgICAgICAgPSBbXSxcbiAgICB0cmFuc2l0aW9ucyxcbiAgICBtYWNoaW5lX2F1dGhvcixcbiAgICBtYWNoaW5lX2NvbW1lbnQsXG4gICAgbWFjaGluZV9jb250cmlidXRvcixcbiAgICBtYWNoaW5lX2RlZmluaXRpb24sXG4gICAgbWFjaGluZV9sYW5ndWFnZSxcbiAgICBtYWNoaW5lX2xpY2Vuc2UsXG4gICAgbWFjaGluZV9uYW1lLFxuICAgIG1hY2hpbmVfdmVyc2lvbixcbiAgICBzdGF0ZV9kZWNsYXJhdGlvbixcbiAgICBmc2xfdmVyc2lvbixcbiAgICBncmFwaF9sYXlvdXQgPSAnZG90J1xuICB9IDogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+KSB7XG5cbiAgICB0aGlzLl9zdGF0ZSAgICAgICAgICAgICAgICAgID0gc3RhcnRfc3RhdGVzWzBdO1xuICAgIHRoaXMuX3N0YXRlcyAgICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fc3RhdGVfZGVjbGFyYXRpb25zICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9lZGdlcyAgICAgICAgICAgICAgICAgID0gW107XG4gICAgdGhpcy5fZWRnZV9tYXAgICAgICAgICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucyAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX2FjdGlvbnMgICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25zICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzID0gbmV3IE1hcCgpOyAgIC8vIHRvZG9cblxuICAgIHRoaXMuX21hY2hpbmVfYXV0aG9yICAgICAgICAgPSBtYWNoaW5lX2F1dGhvcjtcbiAgICB0aGlzLl9tYWNoaW5lX2NvbW1lbnQgICAgICAgID0gbWFjaGluZV9jb21tZW50O1xuICAgIHRoaXMuX21hY2hpbmVfY29udHJpYnV0b3IgICAgPSBtYWNoaW5lX2NvbnRyaWJ1dG9yO1xuICAgIHRoaXMuX21hY2hpbmVfZGVmaW5pdGlvbiAgICAgPSBtYWNoaW5lX2RlZmluaXRpb247XG4gICAgdGhpcy5fbWFjaGluZV9sYW5ndWFnZSAgICAgICA9IG1hY2hpbmVfbGFuZ3VhZ2U7XG4gICAgdGhpcy5fbWFjaGluZV9saWNlbnNlICAgICAgICA9IG1hY2hpbmVfbGljZW5zZTtcbiAgICB0aGlzLl9tYWNoaW5lX25hbWUgICAgICAgICAgID0gbWFjaGluZV9uYW1lO1xuICAgIHRoaXMuX21hY2hpbmVfdmVyc2lvbiAgICAgICAgPSBtYWNoaW5lX3ZlcnNpb247XG4gICAgdGhpcy5fcmF3X3N0YXRlX2RlY2xhcmF0aW9uICA9IHN0YXRlX2RlY2xhcmF0aW9uIHx8IFtdO1xuICAgIHRoaXMuX2ZzbF92ZXJzaW9uICAgICAgICAgICAgPSBmc2xfdmVyc2lvbjtcblxuICAgIHRoaXMuX2dyYXBoX2xheW91dCAgICAgICAgICAgPSBncmFwaF9sYXlvdXQ7XG5cbiAgICB0cmFuc2l0aW9ucy5tYXAoICh0cjpKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pID0+IHtcblxuICAgICAgaWYgKHRyLmZyb20gPT09IHVuZGVmaW5lZCkgeyB0aHJvdyBuZXcgRXJyb3IoYHRyYW5zaXRpb24gbXVzdCBkZWZpbmUgJ2Zyb20nOiAke0pTT04uc3RyaW5naWZ5KHRyKX1gKTsgfVxuICAgICAgaWYgKHRyLnRvICAgPT09IHVuZGVmaW5lZCkgeyB0aHJvdyBuZXcgRXJyb3IoYHRyYW5zaXRpb24gbXVzdCBkZWZpbmUgJ3RvJzogJHsgIEpTT04uc3RyaW5naWZ5KHRyKX1gKTsgfVxuXG4gICAgICAvLyBnZXQgdGhlIGN1cnNvcnMuICB3aGF0IGEgbWVzc1xuICAgICAgY29uc3QgY3Vyc29yX2Zyb206IEpzc21HZW5lcmljU3RhdGU8bU5UPlxuICAgICAgICAgID0gdGhpcy5fc3RhdGVzLmdldCh0ci5mcm9tKVxuICAgICAgICAgfHwgeyBuYW1lOiB0ci5mcm9tLCBmcm9tOiBbXSwgdG86IFtdLCBjb21wbGV0ZTogY29tcGxldGUuaW5jbHVkZXModHIuZnJvbSkgfTtcblxuICAgICAgaWYgKCEodGhpcy5fc3RhdGVzLmhhcyh0ci5mcm9tKSkpIHtcbiAgICAgICAgdGhpcy5fbmV3X3N0YXRlKGN1cnNvcl9mcm9tKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY3Vyc29yX3RvOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD5cbiAgICAgICAgICA9IHRoaXMuX3N0YXRlcy5nZXQodHIudG8pXG4gICAgICAgICB8fCB7bmFtZTogdHIudG8sIGZyb206IFtdLCB0bzogW10sIGNvbXBsZXRlOiBjb21wbGV0ZS5pbmNsdWRlcyh0ci50bykgfTtcblxuICAgICAgaWYgKCEodGhpcy5fc3RhdGVzLmhhcyh0ci50bykpKSB7XG4gICAgICAgIHRoaXMuX25ld19zdGF0ZShjdXJzb3JfdG8pO1xuICAgICAgfVxuXG4gICAgICAvLyBndWFyZCBhZ2FpbnN0IGV4aXN0aW5nIGNvbm5lY3Rpb25zIGJlaW5nIHJlLWFkZGVkXG4gICAgICBpZiAoY3Vyc29yX2Zyb20udG8uaW5jbHVkZXModHIudG8pKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgYWxyZWFkeSBoYXMgJHtKU09OLnN0cmluZ2lmeSh0ci5mcm9tKX0gdG8gJHtKU09OLnN0cmluZ2lmeSh0ci50byl9YCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjdXJzb3JfZnJvbS50by5wdXNoKHRyLnRvKTtcbiAgICAgICAgY3Vyc29yX3RvLmZyb20ucHVzaCh0ci5mcm9tKTtcbiAgICAgIH1cblxuICAgICAgLy8gYWRkIHRoZSBlZGdlOyBub3RlIGl0cyBpZFxuICAgICAgdGhpcy5fZWRnZXMucHVzaCh0cik7XG4gICAgICBjb25zdCB0aGlzRWRnZUlkOiBudW1iZXIgPSB0aGlzLl9lZGdlcy5sZW5ndGggLSAxO1xuXG4gICAgICAvLyBndWFyZCBhZ2FpbnN0IHJlcGVhdGluZyBhIHRyYW5zaXRpb24gbmFtZVxuICAgICAgaWYgKHRyLm5hbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuX25hbWVkX3RyYW5zaXRpb25zLmhhcyh0ci5uYW1lKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgbmFtZWQgdHJhbnNpdGlvbiBcIiR7SlNPTi5zdHJpbmdpZnkodHIubmFtZSl9XCIgYWxyZWFkeSBjcmVhdGVkYCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMuc2V0KHRyLm5hbWUsIHRoaXNFZGdlSWQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHNldCB1cCB0aGUgbWFwcGluZywgc28gdGhhdCBlZGdlcyBjYW4gYmUgbG9va2VkIHVwIGJ5IGVuZHBvaW50IHBhaXJzXG4gICAgICBjb25zdCBmcm9tX21hcHBpbmc6IE1hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9lZGdlX21hcC5nZXQodHIuZnJvbSkgfHwgbmV3IE1hcCgpO1xuICAgICAgaWYgKCEodGhpcy5fZWRnZV9tYXAuaGFzKHRyLmZyb20pKSkge1xuICAgICAgICB0aGlzLl9lZGdlX21hcC5zZXQodHIuZnJvbSwgZnJvbV9tYXBwaW5nKTtcbiAgICAgIH1cblxuLy8gICAgY29uc3QgdG9fbWFwcGluZyA9IGZyb21fbWFwcGluZy5nZXQodHIudG8pO1xuICAgICAgZnJvbV9tYXBwaW5nLnNldCh0ci50bywgdGhpc0VkZ2VJZCk7IC8vIGFscmVhZHkgY2hlY2tlZCB0aGF0IHRoaXMgbWFwcGluZyBkb2Vzbid0IGV4aXN0LCBhYm92ZVxuXG4gICAgICAvLyBzZXQgdXAgdGhlIGFjdGlvbiBtYXBwaW5nLCBzbyB0aGF0IGFjdGlvbnMgY2FuIGJlIGxvb2tlZCB1cCBieSBvcmlnaW5cbiAgICAgIGlmICh0ci5hY3Rpb24pIHtcblxuXG4gICAgICAgIC8vIGZvcndhcmQgbWFwcGluZyBmaXJzdCBieSBhY3Rpb24gbmFtZVxuICAgICAgICBsZXQgYWN0aW9uTWFwOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KHRyLmFjdGlvbik7XG4gICAgICAgIGlmICghKGFjdGlvbk1hcCkpIHtcbiAgICAgICAgICBhY3Rpb25NYXAgPSBuZXcgTWFwKCk7XG4gICAgICAgICAgdGhpcy5fYWN0aW9ucy5zZXQodHIuYWN0aW9uLCBhY3Rpb25NYXApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFjdGlvbk1hcC5oYXModHIuZnJvbSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGFjdGlvbiAke0pTT04uc3RyaW5naWZ5KHRyLmFjdGlvbil9IGFscmVhZHkgYXR0YWNoZWQgdG8gb3JpZ2luICR7SlNPTi5zdHJpbmdpZnkodHIuZnJvbSl9YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYWN0aW9uTWFwLnNldCh0ci5mcm9tLCB0aGlzRWRnZUlkKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgLy8gcmV2ZXJzZSBtYXBwaW5nIGZpcnN0IGJ5IHN0YXRlIG9yaWdpbiBuYW1lXG4gICAgICAgIGxldCByQWN0aW9uTWFwOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQodHIuZnJvbSk7XG4gICAgICAgIGlmICghKHJBY3Rpb25NYXApKSB7XG4gICAgICAgICAgckFjdGlvbk1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuc2V0KHRyLmZyb20sIHJBY3Rpb25NYXApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbm8gbmVlZCB0byB0ZXN0IGZvciByZXZlcnNlIG1hcHBpbmcgcHJlLXByZXNlbmNlO1xuICAgICAgICAvLyBmb3J3YXJkIG1hcHBpbmcgYWxyZWFkeSBjb3ZlcnMgY29sbGlzaW9uc1xuICAgICAgICByQWN0aW9uTWFwLnNldCh0ci5hY3Rpb24sIHRoaXNFZGdlSWQpO1xuXG5cbiAgICAgICAgLy8gcmV2ZXJzZSBtYXBwaW5nIGZpcnN0IGJ5IHN0YXRlIHRhcmdldCBuYW1lXG4gICAgICAgIGlmICghKHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuaGFzKHRyLnRvKSkpIHtcbiAgICAgICAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLnNldCh0ci50bywgbmV3IE1hcCgpKTtcbiAgICAgICAgfVxuXG4vKiB0b2RvIGNvbWViYWNrXG4gICBmdW5kYW1lbnRhbCBwcm9ibGVtIGlzIHJvQWN0aW9uTWFwIG5lZWRzIHRvIGJlIGEgbXVsdGltYXBcbiAgICAgICAgY29uc3Qgcm9BY3Rpb25NYXAgPSB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLmdldCh0ci50byk7ICAvLyB3YXN0ZWZ1bCAtIGFscmVhZHkgZGlkIGhhcyAtIHJlZmFjdG9yXG4gICAgICAgIGlmIChyb0FjdGlvbk1hcCkge1xuICAgICAgICAgIGlmIChyb0FjdGlvbk1hcC5oYXModHIuYWN0aW9uKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGByby1hY3Rpb24gJHt0ci50b30gYWxyZWFkeSBhdHRhY2hlZCB0byBhY3Rpb24gJHt0ci5hY3Rpb259YCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJvQWN0aW9uTWFwLnNldCh0ci5hY3Rpb24sIHRoaXNFZGdlSWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Nob3VsZCBiZSBpbXBvc3NpYmxlIC0gZmxvdyBkb2VzblxcJ3Qga25vdyAuc2V0IHByZWNlZGVzIC5nZXQgeWV0IGFnYWluLiAgc2V2ZXJlIGVycm9yPycpO1xuICAgICAgICB9XG4qL1xuICAgICAgfVxuXG4gICAgfSk7XG5cbiAgfVxuXG4gIF9uZXdfc3RhdGUoc3RhdGVfY29uZmlnOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD4pOiBtTlQgeyAvLyB3aGFyZ2FyYmwgZ2V0IHRoYXQgc3RhdGVfY29uZmlnIGFueSB1bmRlciBjb250cm9sXG5cbiAgICBpZiAodGhpcy5fc3RhdGVzLmhhcyhzdGF0ZV9jb25maWcubmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgc3RhdGUgJHtKU09OLnN0cmluZ2lmeShzdGF0ZV9jb25maWcubmFtZSl9IGFscmVhZHkgZXhpc3RzYCk7XG4gICAgfVxuXG4gICAgdGhpcy5fc3RhdGVzLnNldChzdGF0ZV9jb25maWcubmFtZSwgc3RhdGVfY29uZmlnKTtcbiAgICByZXR1cm4gc3RhdGVfY29uZmlnLm5hbWU7XG5cbiAgfVxuXG5cblxuICBzdGF0ZSgpOiBtTlQge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZTtcbiAgfVxuXG4vKiB3aGFyZ2FyYmwgdG9kbyBtYWpvclxuICAgd2hlbiB3ZSByZWltcGxlbWVudCB0aGlzLCByZWludHJvZHVjZSB0aGlzIGNoYW5nZSB0byB0aGUgaXNfZmluYWwgY2FsbFxuXG4gIGlzX2NoYW5naW5nKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlOyAvLyB0b2RvIHdoYXJnYXJibFxuICB9XG4qL1xuXG5cbiAgc3RhdGVfaXNfZmluYWwod2hpY2hTdGF0ZTogbU5UKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICggKHRoaXMuc3RhdGVfaXNfdGVybWluYWwod2hpY2hTdGF0ZSkpICYmICh0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHdoaWNoU3RhdGUpKSApO1xuICB9XG5cbiAgaXNfZmluYWwoKTogYm9vbGVhbiB7XG4vLyAgcmV0dXJuICgoIXRoaXMuaXNfY2hhbmdpbmcoKSkgJiYgdGhpcy5zdGF0ZV9pc19maW5hbCh0aGlzLnN0YXRlKCkpKTtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZV9pc19maW5hbCh0aGlzLnN0YXRlKCkpO1xuICB9XG5cbiAgZ3JhcGhfbGF5b3V0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX2dyYXBoX2xheW91dDtcbiAgfVxuXG5cblxuICBtYWNoaW5lX2F1dGhvcigpOiA/QXJyYXk8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfYXV0aG9yO1xuICB9XG5cbiAgbWFjaGluZV9jb21tZW50KCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2NvbW1lbnQ7XG4gIH1cblxuICBtYWNoaW5lX2NvbnRyaWJ1dG9yKCk6ID9BcnJheTxzdHJpbmc+IHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9jb250cmlidXRvcjtcbiAgfVxuXG4gIG1hY2hpbmVfZGVmaW5pdGlvbigpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9kZWZpbml0aW9uO1xuICB9XG5cbiAgbWFjaGluZV9sYW5ndWFnZSgpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9sYW5ndWFnZTtcbiAgfVxuXG4gIG1hY2hpbmVfbGljZW5zZSgpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9saWNlbnNlO1xuICB9XG5cbiAgbWFjaGluZV9uYW1lKCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX25hbWU7XG4gIH1cblxuICBtYWNoaW5lX3ZlcnNpb24oKTogP3N0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfdmVyc2lvbjtcbiAgfVxuXG4gIHJhd19zdGF0ZV9kZWNsYXJhdGlvbnMoKTogP0FycmF5PE9iamVjdD4geyAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXNcbiAgICByZXR1cm4gdGhpcy5fcmF3X3N0YXRlX2RlY2xhcmF0aW9uO1xuICB9XG5cbiAgc3RhdGVfZGVjbGFyYXRpb24od2hpY2g6IG1OVCk6ID9PYmplY3QgeyAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXNcbiAgICByZXR1cm4gdGhpcy5fc3RhdGVfZGVjbGFyYXRpb25zLmdldCh3aGljaCk7XG4gIH1cblxuICBzdGF0ZV9kZWNsYXJhdGlvbnMoKTogTWFwPG1OVCwgT2JqZWN0PiB7ICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZmxvd3R5cGUvbm8td2Vhay10eXBlc1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZV9kZWNsYXJhdGlvbnM7XG4gIH1cblxuICBmc2xfdmVyc2lvbigpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fZnNsX3ZlcnNpb247XG4gIH1cblxuXG5cbiAgbWFjaGluZV9zdGF0ZSgpOiBKc3NtTWFjaGluZUludGVybmFsU3RhdGU8bU5ULCBtRFQ+IHtcblxuICAgIHJldHVybiB7XG4gICAgICBpbnRlcm5hbF9zdGF0ZV9pbXBsX3ZlcnNpb24gOiAxLFxuXG4gICAgICBhY3Rpb25zICAgICAgICAgICAgICAgIDogdGhpcy5fYWN0aW9ucyxcbiAgICAgIGVkZ2VfbWFwICAgICAgICAgICAgICAgOiB0aGlzLl9lZGdlX21hcCxcbiAgICAgIGVkZ2VzICAgICAgICAgICAgICAgICAgOiB0aGlzLl9lZGdlcyxcbiAgICAgIG5hbWVkX3RyYW5zaXRpb25zICAgICAgOiB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucyxcbiAgICAgIHJldmVyc2VfYWN0aW9ucyAgICAgICAgOiB0aGlzLl9yZXZlcnNlX2FjdGlvbnMsXG4vLyAgICByZXZlcnNlX2FjdGlvbl90YXJnZXRzIDogdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyxcbiAgICAgIHN0YXRlICAgICAgICAgICAgICAgICAgOiB0aGlzLl9zdGF0ZSxcbiAgICAgIHN0YXRlcyAgICAgICAgICAgICAgICAgOiB0aGlzLl9zdGF0ZXNcbiAgICB9O1xuXG4gIH1cblxuLypcbiAgbG9hZF9tYWNoaW5lX3N0YXRlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmYWxzZTsgLy8gdG9kbyB3aGFyZ2FyYmxcbiAgfVxuKi9cblxuXG4gIHN0YXRlcygpOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gWy4uLiB0aGlzLl9zdGF0ZXMua2V5cygpXTtcbiAgfVxuXG4gIHN0YXRlX2Zvcih3aGljaFN0YXRlOiBtTlQpOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD4ge1xuICAgIGNvbnN0IHN0YXRlOiA/SnNzbUdlbmVyaWNTdGF0ZTxtTlQ+ID0gdGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAoc3RhdGUpIHsgcmV0dXJuIHN0YXRlOyB9XG4gICAgZWxzZSAgICAgICB7IHRocm93IG5ldyBFcnJvcihgbm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHN0YXRlKX1gKTsgfVxuICB9XG5cblxuXG4gIGxpc3RfZWRnZXMoKTogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHtcbiAgICByZXR1cm4gdGhpcy5fZWRnZXM7XG4gIH1cblxuICBsaXN0X25hbWVkX3RyYW5zaXRpb25zKCk6IE1hcDxtTlQsIG51bWJlcj4ge1xuICAgIHJldHVybiB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucztcbiAgfVxuXG4gIGxpc3RfYWN0aW9ucygpOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gWy4uLiB0aGlzLl9hY3Rpb25zLmtleXMoKV07XG4gIH1cblxuXG5cbiAgZ2V0X3RyYW5zaXRpb25fYnlfc3RhdGVfbmFtZXMoZnJvbTogbU5ULCB0bzogbU5UKTogP251bWJlciB7XG5cbiAgICBjb25zdCBlbWcgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2VkZ2VfbWFwLmdldChmcm9tKTtcblxuICAgIGlmIChlbWcpIHtcbiAgICAgIHJldHVybiBlbWcuZ2V0KHRvKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgfVxuXG5cblxuICBsb29rdXBfdHJhbnNpdGlvbl9mb3IoZnJvbTogbU5ULCB0bzogbU5UKTogP0pzc21UcmFuc2l0aW9uPG1OVCwgbURUPiB7XG4gICAgY29uc3QgaWQgOiA/bnVtYmVyID0gdGhpcy5nZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyhmcm9tLCB0byk7XG4gICAgcmV0dXJuICgoaWQgPT09IHVuZGVmaW5lZCkgfHwgKGlkID09PSBudWxsKSk/IHVuZGVmaW5lZCA6IHRoaXMuX2VkZ2VzW2lkXTtcbiAgfVxuXG5cblxuICBsaXN0X3RyYW5zaXRpb25zKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSk6IEpzc21UcmFuc2l0aW9uTGlzdDxtTlQ+IHtcbiAgICByZXR1cm4ge2VudHJhbmNlczogdGhpcy5saXN0X2VudHJhbmNlcyh3aGljaFN0YXRlKSwgZXhpdHM6IHRoaXMubGlzdF9leGl0cyh3aGljaFN0YXRlKX07XG4gIH1cblxuICBsaXN0X2VudHJhbmNlcyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkpOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gKHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSkgfHwge30pLmZyb20gfHwgW107XG4gIH1cblxuICBsaXN0X2V4aXRzKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSk6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiAodGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKSB8fCB7fSkudG8gICB8fCBbXTtcbiAgfVxuXG5cblxuICBwcm9iYWJsZV9leGl0c19mb3Iod2hpY2hTdGF0ZTogbU5UKTogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHtcblxuICAgIGNvbnN0IHdzdGF0ZTogP0pzc21HZW5lcmljU3RhdGU8bU5UPiA9IHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKCEod3N0YXRlKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX0gaW4gcHJvYmFibGVfZXhpdHNfZm9yYCk7IH1cblxuICAgIGNvbnN0IHdzdGF0ZV90byA6IEFycmF5PCBtTlQgPiA9IHdzdGF0ZS50byxcblxuICAgICAgICAgIHd0ZiAgICAgICA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiAvLyB3c3RhdGVfdG9fZmlsdGVyZWQgLT4gd3RmXG4gICAgICAgICAgICAgICAgICAgID0gd3N0YXRlX3RvXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKCAod3MpIDogP0pzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9PiB0aGlzLmxvb2t1cF90cmFuc2l0aW9uX2Zvcih0aGlzLnN0YXRlKCksIHdzKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbik7XG5cbiAgICByZXR1cm4gd3RmO1xuXG4gIH1cblxuICBwcm9iYWJpbGlzdGljX3RyYW5zaXRpb24oKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc2VsZWN0ZWQgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB3ZWlnaHRlZF9yYW5kX3NlbGVjdCh0aGlzLnByb2JhYmxlX2V4aXRzX2Zvcih0aGlzLnN0YXRlKCkpKTtcbiAgICByZXR1cm4gdGhpcy50cmFuc2l0aW9uKCBzZWxlY3RlZC50byApO1xuICB9XG5cbiAgcHJvYmFiaWxpc3RpY193YWxrKG46IG51bWJlcik6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBzZXEobilcbiAgICAgICAgICAubWFwKCgpIDogbU5UID0+IHtcbiAgICAgICAgICAgICBjb25zdCBzdGF0ZV93YXM6IG1OVCA9IHRoaXMuc3RhdGUoKTtcbiAgICAgICAgICAgICB0aGlzLnByb2JhYmlsaXN0aWNfdHJhbnNpdGlvbigpO1xuICAgICAgICAgICAgIHJldHVybiBzdGF0ZV93YXM7XG4gICAgICAgICAgIH0pXG4gICAgICAgICAgLmNvbmNhdChbdGhpcy5zdGF0ZSgpXSk7XG4gIH1cblxuICBwcm9iYWJpbGlzdGljX2hpc3RvX3dhbGsobjogbnVtYmVyKTogTWFwPG1OVCwgbnVtYmVyPiB7XG4gICAgcmV0dXJuIGhpc3RvZ3JhcGgodGhpcy5wcm9iYWJpbGlzdGljX3dhbGsobikpO1xuICB9XG5cblxuXG4gIGFjdGlvbnMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpICk6IEFycmF5PG1OVD4ge1xuICAgIGNvbnN0IHdzdGF0ZSA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAod3N0YXRlKSB7IHJldHVybiBbLi4uIHdzdGF0ZS5rZXlzKCldOyB9XG4gICAgZWxzZSAgICAgICAgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuICB9XG5cbiAgbGlzdF9zdGF0ZXNfaGF2aW5nX2FjdGlvbih3aGljaFN0YXRlOiBtTlQpOiBBcnJheTxtTlQ+IHtcbiAgICBjb25zdCB3c3RhdGUgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICh3c3RhdGUpIHsgcmV0dXJuIFsuLi4gd3N0YXRlLmtleXMoKV07IH1cbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG4gIH1cblxuLy8gY29tZWJhY2tcbi8qXG4gIGxpc3RfZW50cmFuY2VfYWN0aW9ucyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkgKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uICh0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLmdldCh3aGljaFN0YXRlKSB8fCBuZXcgTWFwKCkpLnZhbHVlcygpXSAvLyB3YXN0ZWZ1bFxuICAgICAgICAgICAubWFwKCAoZWRnZUlkOmFueSkgPT4gKHRoaXMuX2VkZ2VzW2VkZ2VJZF0gOiBhbnkpKSAvLyB3aGFyZ2FyYmwgYnVybiBvdXQgYW55XG4gICAgICAgICAgIC5maWx0ZXIoIChvOmFueSkgPT4gby50byA9PT0gd2hpY2hTdGF0ZSlcbiAgICAgICAgICAgLm1hcCggZmlsdGVyZWQgPT4gZmlsdGVyZWQuZnJvbSApO1xuICB9XG4qL1xuICBsaXN0X2V4aXRfYWN0aW9ucyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkgKTogQXJyYXk8P21OVD4geyAvLyB0aGVzZSBhcmUgbU5ULCBub3QgP21OVFxuICAgIGNvbnN0IHJhX2Jhc2U6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAoIShyYV9iYXNlKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuXG4gICAgcmV0dXJuIFsuLi4gcmFfYmFzZS52YWx1ZXMoKV1cbiAgICAgICAgICAgLm1hcCAgICAoIChlZGdlSWQ6IG51bWJlcikgICAgICAgICAgICAgIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMuX2VkZ2VzW2VkZ2VJZF0gICApXG4gICAgICAgICAgIC5maWx0ZXIgKCAobzogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+KSA6IGJvb2xlYW4gICAgICAgICAgICAgICAgICA9PiBvLmZyb20gPT09IHdoaWNoU3RhdGUgKVxuICAgICAgICAgICAubWFwICAgICggKGZpbHRlcmVkOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pIDogP21OVCAgICAgICAgICAgICAgPT4gZmlsdGVyZWQuYWN0aW9uICAgICAgICk7XG4gIH1cblxuICBwcm9iYWJsZV9hY3Rpb25fZXhpdHMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpICkgOiBBcnJheTxtaXhlZD4geyAvLyB0aGVzZSBhcmUgbU5UXG4gICAgY29uc3QgcmFfYmFzZTogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICghKHJhX2Jhc2UpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG5cbiAgICByZXR1cm4gWy4uLiByYV9iYXNlLnZhbHVlcygpXVxuICAgICAgICAgICAubWFwICAgICggKGVkZ2VJZDogbnVtYmVyKTogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMuX2VkZ2VzW2VkZ2VJZF0gICApXG4gICAgICAgICAgIC5maWx0ZXIgKCAobzogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+KTogYm9vbGVhbiAgICAgPT4gby5mcm9tID09PSB3aGljaFN0YXRlIClcbiAgICAgICAgICAgLm1hcCAgICAoIChmaWx0ZXJlZCk6IG1peGVkICAgICAgICAgICAgICAgICAgICAgICAgICA9PiAoIHsgYWN0aW9uICAgICAgOiBmaWx0ZXJlZC5hY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2JhYmlsaXR5IDogZmlsdGVyZWQucHJvYmFiaWxpdHkgfSApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgfVxuXG5cblxuICBpc191bmVudGVyYWJsZSh3aGljaFN0YXRlOiBtTlQpOiBib29sZWFuIHtcbiAgICAvLyB3aGFyZ2FyYmwgc2hvdWxkIHRocm93IG9uIHVua25vd24gc3RhdGVcbiAgICByZXR1cm4gdGhpcy5saXN0X2VudHJhbmNlcyh3aGljaFN0YXRlKS5sZW5ndGggPT09IDA7XG4gIH1cblxuICBoYXNfdW5lbnRlcmFibGVzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlcygpLnNvbWUoICh4KTogYm9vbGVhbiA9PiB0aGlzLmlzX3VuZW50ZXJhYmxlKHgpKTtcbiAgfVxuXG5cblxuICBpc190ZXJtaW5hbCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZV9pc190ZXJtaW5hbCh0aGlzLnN0YXRlKCkpO1xuICB9XG5cbiAgc3RhdGVfaXNfdGVybWluYWwod2hpY2hTdGF0ZTogbU5UKTogYm9vbGVhbiB7XG4gICAgLy8gd2hhcmdhcmJsIHNob3VsZCB0aHJvdyBvbiB1bmtub3duIHN0YXRlXG4gICAgcmV0dXJuIHRoaXMubGlzdF9leGl0cyh3aGljaFN0YXRlKS5sZW5ndGggPT09IDA7XG4gIH1cblxuICBoYXNfdGVybWluYWxzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlcygpLnNvbWUoICh4KTogYm9vbGVhbiA9PiB0aGlzLnN0YXRlX2lzX3Rlcm1pbmFsKHgpKTtcbiAgfVxuXG5cblxuICBpc19jb21wbGV0ZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZV9pc19jb21wbGV0ZSh0aGlzLnN0YXRlKCkpO1xuICB9XG5cbiAgc3RhdGVfaXNfY29tcGxldGUod2hpY2hTdGF0ZTogbU5UKSA6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHdzdGF0ZTogP0pzc21HZW5lcmljU3RhdGU8bU5UPiA9IHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHdzdGF0ZSkgeyByZXR1cm4gd3N0YXRlLmNvbXBsZXRlOyB9XG4gICAgZWxzZSAgICAgICAgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuICB9XG5cbiAgaGFzX2NvbXBsZXRlcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZXMoKS5zb21lKCAoeCk6IGJvb2xlYW4gPT4gdGhpcy5zdGF0ZV9pc19jb21wbGV0ZSh4KSApO1xuICB9XG5cblxuXG4gIGFjdGlvbihuYW1lOiBtTlQsIG5ld0RhdGE/OiBtRFQpOiBib29sZWFuIHtcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBpZiAodGhpcy52YWxpZF9hY3Rpb24obmFtZSwgbmV3RGF0YSkpIHtcbiAgICAgIGNvbnN0IGVkZ2U6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHRoaXMuY3VycmVudF9hY3Rpb25fZWRnZV9mb3IobmFtZSk7XG4gICAgICB0aGlzLl9zdGF0ZSA9IGVkZ2UudG87XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHRyYW5zaXRpb24obmV3U3RhdGU6IG1OVCwgbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX3RyYW5zaXRpb24obmV3U3RhdGUsIG5ld0RhdGEpKSB7XG4gICAgICB0aGlzLl9zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvLyBjYW4gbGVhdmUgbWFjaGluZSBpbiBpbmNvbnNpc3RlbnQgc3RhdGUuICBnZW5lcmFsbHkgZG8gbm90IHVzZVxuICBmb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlOiBtTlQsIG5ld0RhdGE/OiBtRFQpOiBib29sZWFuIHtcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBpZiAodGhpcy52YWxpZF9mb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlLCBuZXdEYXRhKSkge1xuICAgICAgdGhpcy5fc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cblxuXG4gIGN1cnJlbnRfYWN0aW9uX2ZvcihhY3Rpb246IG1OVCk6IG51bWJlciB8IHZvaWQge1xuICAgIGNvbnN0IGFjdGlvbl9iYXNlOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KGFjdGlvbik7XG4gICAgcmV0dXJuIGFjdGlvbl9iYXNlPyBhY3Rpb25fYmFzZS5nZXQodGhpcy5zdGF0ZSgpKTogdW5kZWZpbmVkO1xuICB9XG5cbiAgY3VycmVudF9hY3Rpb25fZWRnZV9mb3IoYWN0aW9uOiBtTlQpOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4ge1xuICAgIGNvbnN0IGlkeDogP251bWJlciA9IHRoaXMuY3VycmVudF9hY3Rpb25fZm9yKGFjdGlvbik7XG4gICAgaWYgKChpZHggPT09IHVuZGVmaW5lZCkgfHwgKGlkeCA9PT0gbnVsbCkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIGFjdGlvbiAke0pTT04uc3RyaW5naWZ5KGFjdGlvbil9YCk7IH1cbiAgICByZXR1cm4gdGhpcy5fZWRnZXNbaWR4XTtcbiAgfVxuXG4gIHZhbGlkX2FjdGlvbihhY3Rpb246IG1OVCwgX25ld0RhdGE/OiBtRFQpOiBib29sZWFuIHsgIC8vIHRvZG8gY29tZWJhY2sgdW5pZ25vcmUgbmV3RGF0YVxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRfYWN0aW9uX2ZvcihhY3Rpb24pICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICB2YWxpZF90cmFuc2l0aW9uKG5ld1N0YXRlOiBtTlQsIF9uZXdEYXRhPzogbURUKTogYm9vbGVhbiB7ICAvLyB0b2RvIGNvbWViYWNrIHVuaWdub3JlIG5ld0RhdGFcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBjb25zdCB0cmFuc2l0aW9uX2ZvcjogP0pzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHRoaXMubG9va3VwX3RyYW5zaXRpb25fZm9yKHRoaXMuc3RhdGUoKSwgbmV3U3RhdGUpO1xuXG4gICAgaWYgKCEodHJhbnNpdGlvbl9mb3IpKSAgICAgICAgICB7IHJldHVybiBmYWxzZTsgfVxuICAgIGlmICh0cmFuc2l0aW9uX2Zvci5mb3JjZWRfb25seSkgeyByZXR1cm4gZmFsc2U7IH1cblxuICAgIHJldHVybiB0cnVlO1xuXG4gIH1cblxuICB2YWxpZF9mb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlOiBtTlQsIF9uZXdEYXRhPzogbURUKTogYm9vbGVhbiB7ICAvLyB0b2RvIGNvbWViYWNrIHVuaWdub3JlIG5ld0RhdGFcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICByZXR1cm4gKHRoaXMubG9va3VwX3RyYW5zaXRpb25fZm9yKHRoaXMuc3RhdGUoKSwgbmV3U3RhdGUpICE9PSB1bmRlZmluZWQpO1xuICB9XG5cblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIHNtPG1OVCwgbURUPih0ZW1wbGF0ZV9zdHJpbmdzOiBBcnJheTxzdHJpbmc+IC8qICwgYXJndW1lbnRzICovKTogTWFjaGluZTxtTlQsIG1EVD4ge1xuXG4gICAgLy8gZm9vYGEkezF9YiR7Mn1jYCB3aWxsIGNvbWUgaW4gYXMgKFsnYScsJ2InLCdjJ10sMSwyKVxuICAgIC8vIHRoaXMgaW5jbHVkZXMgd2hlbiBhIGFuZCBjIGFyZSBlbXB0eSBzdHJpbmdzXG4gICAgLy8gdGhlcmVmb3JlIHRlbXBsYXRlX3N0cmluZ3Mgd2lsbCBhbHdheXMgaGF2ZSBvbmUgbW9yZSBlbCB0aGFuIHRlbXBsYXRlX2FyZ3NcbiAgICAvLyB0aGVyZWZvcmUgbWFwIHRoZSBzbWFsbGVyIGNvbnRhaW5lciBhbmQgdG9zcyB0aGUgbGFzdCBvbmUgb24gb24gdGhlIHdheSBvdXRcblxuICAgIHJldHVybiBuZXcgTWFjaGluZShtYWtlKHRlbXBsYXRlX3N0cmluZ3MucmVkdWNlKFxuXG4gICAgICAvLyBpbiBnZW5lcmFsIGF2b2lkaW5nIGBhcmd1bWVudHNgIGlzIHNtYXJ0LiAgaG93ZXZlciB3aXRoIHRoZSB0ZW1wbGF0ZVxuICAgICAgLy8gc3RyaW5nIG5vdGF0aW9uLCBhcyBkZXNpZ25lZCwgaXQncyBub3QgcmVhbGx5IHdvcnRoIHRoZSBoYXNzbGVcblxuICAgICAgLyogZXNsaW50LWRpc2FibGUgZnAvbm8tYXJndW1lbnRzICovXG4gICAgICAvKiBlc2xpbnQtZGlzYWJsZSBwcmVmZXItcmVzdC1wYXJhbXMgKi9cbiAgICAgIChhY2MsIHZhbCwgaWR4KTogc3RyaW5nID0+IGAke2FjY30ke2FyZ3VtZW50c1tpZHhdfSR7dmFsfWAgIC8vIGFyZ3VtZW50c1swXSBpcyBuZXZlciBsb2FkZWQsIHNvIGFyZ3MgZG9lc24ndCBuZWVkIHRvIGJlIGdhdGVkXG4gICAgICAvKiBlc2xpbnQtZW5hYmxlICBwcmVmZXItcmVzdC1wYXJhbXMgKi9cbiAgICAgIC8qIGVzbGludC1lbmFibGUgIGZwL25vLWFyZ3VtZW50cyAqL1xuXG4gICAgKSkpO1xuXG59XG5cblxuXG5cblxuZXhwb3J0IHtcblxuICB2ZXJzaW9uLFxuXG4gIE1hY2hpbmUsXG5cbiAgbWFrZSxcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuXG4gIHNtLFxuXG4gIGFycm93X2RpcmVjdGlvbixcbiAgYXJyb3dfbGVmdF9raW5kLFxuICBhcnJvd19yaWdodF9raW5kLFxuXG4gIC8vIHRvZG8gd2hhcmdhcmJsIHRoZXNlIHNob3VsZCBiZSBleHBvcnRlZCB0byBhIHV0aWxpdHkgbGlicmFyeVxuICBzZXEsIHdlaWdodGVkX3JhbmRfc2VsZWN0LCBoaXN0b2dyYXBoLCB3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0LCB3ZWlnaHRlZF9oaXN0b19rZXlcblxufTtcbiJdfQ==