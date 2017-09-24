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

function makeTransition(this_se, from, to, isRight) {

  var kind = isRight ? arrow_right_kind(this_se.kind) : arrow_left_kind(this_se.kind),
      edge = {
    from: from,
    to: to,
    kind: kind,
    forced_only: kind === 'forced',
    main_path: kind === 'main'
  };

  var action = isRight ? 'r_action' : 'l_action',
      probability = isRight ? 'r_probability' : 'l_probability';

  if (this_se[action]) {
    edge.action = this_se[action];
  }
  if (this_se[probability]) {
    edge.probability = this_se[probability];
  }

  return edge;
}

function compile_rule_transition_step(acc, from, to, this_se, next_se) {
  // todo flow describe the parser representation of a transition step extension

  var edges = [];

  var uFrom = Array.isArray(from) ? from : [from],
      uTo = Array.isArray(to) ? to : [to];

  uFrom.map(function (f) {
    uTo.map(function (t) {

      var right = makeTransition(this_se, f, t, true);
      if (right.kind !== 'none') {
        edges.push(right);
      }

      var left = makeTransition(this_se, t, f, false);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLmpzIl0sIm5hbWVzIjpbInJlZHVjZV90b182MzkiLCJyZXF1aXJlIiwicmVkdWNlIiwicGFyc2UiLCJ2ZXJzaW9uIiwiYXJyb3dfZGlyZWN0aW9uIiwiYXJyb3ciLCJTdHJpbmciLCJFcnJvciIsImFycm93X2xlZnRfa2luZCIsImFycm93X3JpZ2h0X2tpbmQiLCJtYWtlVHJhbnNpdGlvbiIsInRoaXNfc2UiLCJmcm9tIiwidG8iLCJpc1JpZ2h0Iiwia2luZCIsImVkZ2UiLCJmb3JjZWRfb25seSIsIm1haW5fcGF0aCIsImFjdGlvbiIsInByb2JhYmlsaXR5IiwiY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcCIsImFjYyIsIm5leHRfc2UiLCJlZGdlcyIsInVGcm9tIiwiQXJyYXkiLCJpc0FycmF5IiwidVRvIiwibWFwIiwiZiIsInQiLCJyaWdodCIsInB1c2giLCJsZWZ0IiwibmV3X2FjYyIsImNvbmNhdCIsInNlIiwiY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uIiwicnVsZSIsImNvbXBpbGVfcnVsZV9oYW5kbGVyIiwia2V5IiwiYWdnX2FzIiwidmFsIiwidmFsdWUiLCJ0YXV0b2xvZ2llcyIsImluY2x1ZGVzIiwiSlNPTiIsInN0cmluZ2lmeSIsImNvbXBpbGUiLCJ0cmVlIiwicmVzdWx0cyIsImdyYXBoX2xheW91dCIsInRyYW5zaXRpb24iLCJzdGFydF9zdGF0ZXMiLCJlbmRfc3RhdGVzIiwiZnNsX3ZlcnNpb24iLCJtYWNoaW5lX2F1dGhvciIsIm1hY2hpbmVfY29tbWVudCIsIm1hY2hpbmVfY29udHJpYnV0b3IiLCJtYWNoaW5lX2RlZmluaXRpb24iLCJtYWNoaW5lX2xhbmd1YWdlIiwibWFjaGluZV9saWNlbnNlIiwibWFjaGluZV9uYW1lIiwibWFjaGluZV9yZWZlcmVuY2UiLCJtYWNoaW5lX3ZlcnNpb24iLCJ0ciIsImFzc2VtYmxlZF90cmFuc2l0aW9ucyIsInJlc3VsdF9jZmciLCJsZW5ndGgiLCJ0cmFuc2l0aW9ucyIsIm9uZU9ubHlLZXlzIiwib25lT25seUtleSIsIm11bHRpS2V5IiwibWFrZSIsInBsYW4iLCJNYWNoaW5lIiwiY29tcGxldGUiLCJfc3RhdGUiLCJfc3RhdGVzIiwiTWFwIiwiX2VkZ2VzIiwiX2VkZ2VfbWFwIiwiX25hbWVkX3RyYW5zaXRpb25zIiwiX2FjdGlvbnMiLCJfcmV2ZXJzZV9hY3Rpb25zIiwiX3JldmVyc2VfYWN0aW9uX3RhcmdldHMiLCJfbWFjaGluZV9hdXRob3IiLCJfbWFjaGluZV9jb21tZW50IiwiX21hY2hpbmVfY29udHJpYnV0b3IiLCJfbWFjaGluZV9kZWZpbml0aW9uIiwiX21hY2hpbmVfbGFuZ3VhZ2UiLCJfbWFjaGluZV9saWNlbnNlIiwiX21hY2hpbmVfbmFtZSIsIl9tYWNoaW5lX3ZlcnNpb24iLCJfZnNsX3ZlcnNpb24iLCJfZ3JhcGhfbGF5b3V0IiwidW5kZWZpbmVkIiwiY3Vyc29yX2Zyb20iLCJnZXQiLCJuYW1lIiwiaGFzIiwiX25ld19zdGF0ZSIsImN1cnNvcl90byIsInRoaXNFZGdlSWQiLCJzZXQiLCJmcm9tX21hcHBpbmciLCJhY3Rpb25NYXAiLCJyQWN0aW9uTWFwIiwic3RhdGVfY29uZmlnIiwid2hpY2hTdGF0ZSIsInN0YXRlX2lzX3Rlcm1pbmFsIiwic3RhdGVfaXNfY29tcGxldGUiLCJzdGF0ZV9pc19maW5hbCIsInN0YXRlIiwiaW50ZXJuYWxfc3RhdGVfaW1wbF92ZXJzaW9uIiwiYWN0aW9ucyIsImVkZ2VfbWFwIiwibmFtZWRfdHJhbnNpdGlvbnMiLCJyZXZlcnNlX2FjdGlvbnMiLCJzdGF0ZXMiLCJrZXlzIiwiZW1nIiwiaWQiLCJnZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyIsImVudHJhbmNlcyIsImxpc3RfZW50cmFuY2VzIiwiZXhpdHMiLCJsaXN0X2V4aXRzIiwid3N0YXRlIiwid3N0YXRlX3RvIiwid3RmIiwid3MiLCJsb29rdXBfdHJhbnNpdGlvbl9mb3IiLCJmaWx0ZXIiLCJCb29sZWFuIiwic2VsZWN0ZWQiLCJwcm9iYWJsZV9leGl0c19mb3IiLCJuIiwic3RhdGVfd2FzIiwicHJvYmFiaWxpc3RpY190cmFuc2l0aW9uIiwicHJvYmFiaWxpc3RpY193YWxrIiwicmFfYmFzZSIsInZhbHVlcyIsImVkZ2VJZCIsIm8iLCJmaWx0ZXJlZCIsInNvbWUiLCJ4IiwiaXNfdW5lbnRlcmFibGUiLCJuZXdEYXRhIiwidmFsaWRfYWN0aW9uIiwiY3VycmVudF9hY3Rpb25fZWRnZV9mb3IiLCJuZXdTdGF0ZSIsInZhbGlkX3RyYW5zaXRpb24iLCJ2YWxpZF9mb3JjZV90cmFuc2l0aW9uIiwiYWN0aW9uX2Jhc2UiLCJpZHgiLCJjdXJyZW50X2FjdGlvbl9mb3IiLCJfbmV3RGF0YSIsInRyYW5zaXRpb25fZm9yIiwic20iLCJ0ZW1wbGF0ZV9zdHJpbmdzIiwic2VxIiwid2VpZ2h0ZWRfcmFuZF9zZWxlY3QiLCJoaXN0b2dyYXBoIiwid2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCIsIndlaWdodGVkX2hpc3RvX2tleSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBMkJBOzs7Ozs7QUExQkE7O0FBSUEsSUFBTUEsZ0JBQTJCQyxRQUFRLGlCQUFSLEVBQTJCQyxNQUE1RDs7QUF3QkEsSUFBTUMsUUFBa0JGLFFBQVEsZUFBUixFQUF5QkUsS0FBakQsQyxDQUF5RDs7QUFFekQsSUFBTUMsVUFBZ0IsSUFBdEIsQyxDQUE0Qjs7O0FBTTVCOztBQUVBLFNBQVNDLGVBQVQsQ0FBeUJDLEtBQXpCLEVBQStEOztBQUU3RCxVQUFTQyxPQUFPRCxLQUFQLENBQVQ7O0FBRUUsU0FBSyxJQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxJQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2YsU0FBSyxJQUFMLENBQWUsS0FBSyxHQUFMO0FBQ2IsYUFBTyxPQUFQOztBQUVGLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNmLFNBQUssSUFBTCxDQUFlLEtBQUssR0FBTDtBQUNiLGFBQU8sTUFBUDs7QUFF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O0FBQWU7QUFDakQsVUFBSUEsZUFBZS9JLFdBQW5CLEVBQWdDO0FBQUUsZUFBTyxLQUFQO0FBQWU7O0FBRWpELGFBQU8sSUFBUDtBQUVEOzs7MkNBRXNCd0ksUSxFQUFlTSxRLEVBQXlCO0FBQUc7QUFDaEU7QUFDQTtBQUNBO0FBQ0EsYUFBUSxLQUFLMUIscUJBQUwsQ0FBMkIsS0FBS25CLEtBQUwsRUFBM0IsRUFBeUN1QyxRQUF6QyxNQUF1RHhELFNBQS9EO0FBQ0Q7Ozs7OztBQVNILFNBQVNnRSxFQUFULENBQXNCQyxnQkFBdEIsQ0FBc0QsaUJBQXRELEVBQTRGO0FBQUE7OztBQUV4RjtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxTQUFPLElBQUl0RixPQUFKLENBQVlGLEtBQUt3RixpQkFBaUJqSyxNQUFqQjs7QUFFdEI7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsWUFBQ3FCLEdBQUQsRUFBTXFCLEdBQU4sRUFBV2tILEdBQVg7QUFBQSxnQkFBOEJ2SSxHQUE5QixHQUFvQyxXQUFVdUksR0FBVixDQUFwQyxHQUFxRGxILEdBQXJEO0FBQUEsR0FQc0IsQ0FPc0M7QUFDNUQ7QUFDQTs7QUFUc0IsR0FBTCxDQUFaLENBQVA7QUFhSDs7UUFRQ3hDLE8sR0FBQUEsTztRQUVBeUUsTyxHQUFBQSxPO1FBRUFGLEksR0FBQUEsSTtRQUNFeEUsSyxHQUFBQSxLO1FBQ0ErQyxPLEdBQUFBLE87UUFFRmdILEUsR0FBQUEsRTtRQUVBN0osZSxHQUFBQSxlO1FBQ0FJLGUsR0FBQUEsZTtRQUNBQyxnQixHQUFBQSxnQjtRQUdBMEosRztRQUFLQyxvQjtRQUFzQkMsVTtRQUFZQyxzQjtRQUF3QkMsa0IiLCJmaWxlIjoianNzbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLy8gd2hhcmdhcmJsIGxvdHMgb2YgdGhlc2UgcmV0dXJuIGFycmF5cyBjb3VsZC9zaG91bGQgYmUgc2V0c1xuXG4vLyBAZmxvd1xuXG5jb25zdCByZWR1Y2VfdG9fNjM5IDogRnVuY3Rpb24gPSByZXF1aXJlKCdyZWR1Y2UtdG8tNjM5LTEnKS5yZWR1Y2U7XG5cblxuXG5cblxuaW1wb3J0IHR5cGUge1xuXG4gIEpzc21HZW5lcmljU3RhdGUsIEpzc21HZW5lcmljQ29uZmlnLFxuICBKc3NtVHJhbnNpdGlvbiwgSnNzbVRyYW5zaXRpb25MaXN0LFxuICBKc3NtTWFjaGluZUludGVybmFsU3RhdGUsXG4gIEpzc21QYXJzZVRyZWUsXG4gIEpzc21Db21waWxlU2UsIEpzc21Db21waWxlU2VTdGFydCwgSnNzbUNvbXBpbGVSdWxlLFxuICBKc3NtQXJyb3csIEpzc21BcnJvd0RpcmVjdGlvbiwgSnNzbUFycm93S2luZCxcbiAgSnNzbUxheW91dFxuXG59IGZyb20gJy4vanNzbS10eXBlcyc7XG5cblxuXG5cblxuaW1wb3J0IHsgc2VxLCB3ZWlnaHRlZF9yYW5kX3NlbGVjdCwgd2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCwgaGlzdG9ncmFwaCwgd2VpZ2h0ZWRfaGlzdG9fa2V5IH0gZnJvbSAnLi9qc3NtLXV0aWwuanMnO1xuXG5jb25zdCBwYXJzZTogRnVuY3Rpb24gPSByZXF1aXJlKCcuL2pzc20tZG90LmpzJykucGFyc2U7ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXMgLy8gdG9kbyB3aGFyZ2FyYmwgcmVtb3ZlIGFueVxuXG5jb25zdCB2ZXJzaW9uOiBudWxsID0gbnVsbDsgLy8gcmVwbGFjZWQgZnJvbSBwYWNrYWdlLmpzIGluIGJ1aWxkXG5cblxuXG5cblxuLyogZXNsaW50LWRpc2FibGUgY29tcGxleGl0eSAqL1xuXG5mdW5jdGlvbiBhcnJvd19kaXJlY3Rpb24oYXJyb3c6IEpzc21BcnJvdyk6IEpzc21BcnJvd0RpcmVjdGlvbiB7XG5cbiAgc3dpdGNoICggU3RyaW5nKGFycm93KSApIHtcblxuICAgIGNhc2UgJy0+JyA6ICAgIGNhc2UgJ+KGkicgOlxuICAgIGNhc2UgJz0+JyA6ICAgIGNhc2UgJ+KHkicgOlxuICAgIGNhc2UgJ34+JyA6ICAgIGNhc2UgJ+KGmycgOlxuICAgICAgcmV0dXJuICdyaWdodCc7XG5cbiAgICBjYXNlICc8LScgOiAgICBjYXNlICfihpAnIDpcbiAgICBjYXNlICc8PScgOiAgICBjYXNlICfih5AnIDpcbiAgICBjYXNlICc8ficgOiAgICBjYXNlICfihponIDpcbiAgICAgIHJldHVybiAnbGVmdCc7XG5cbiAgICBjYXNlICc8LT4nOiAgICBjYXNlICfihpQnIDpcbiAgICBjYXNlICc8LT0+JzogICBjYXNlICfihpDih5InIDpcbiAgICBjYXNlICc8LX4+JzogICBjYXNlICfihpDihpsnIDpcblxuICAgIGNhc2UgJzw9Pic6ICAgIGNhc2UgJ+KHlCcgOlxuICAgIGNhc2UgJzw9LT4nOiAgIGNhc2UgJ+KHkOKGkicgOlxuICAgIGNhc2UgJzw9fj4nOiAgIGNhc2UgJ+KHkOKGmycgOlxuXG4gICAgY2FzZSAnPH4+JzogICAgY2FzZSAn4oauJyA6XG4gICAgY2FzZSAnPH4tPic6ICAgY2FzZSAn4oaa4oaSJyA6XG4gICAgY2FzZSAnPH49Pic6ICAgY2FzZSAn4oaa4oeSJyA6XG4gICAgICByZXR1cm4gJ2JvdGgnO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXJyb3dfZGlyZWN0aW9uOiB1bmtub3duIGFycm93IHR5cGUgJHthcnJvd31gKTtcblxuICB9XG5cbn1cblxuLyogZXNsaW50LWVuYWJsZSBjb21wbGV4aXR5ICovXG5cblxuXG5cblxuLyogZXNsaW50LWRpc2FibGUgY29tcGxleGl0eSAqL1xuXG5mdW5jdGlvbiBhcnJvd19sZWZ0X2tpbmQoYXJyb3c6IEpzc21BcnJvdyk6IEpzc21BcnJvd0tpbmQge1xuXG4gIHN3aXRjaCAoIFN0cmluZyhhcnJvdykgKSB7XG5cbiAgICBjYXNlICctPicgOiAgICBjYXNlICfihpInIDpcbiAgICBjYXNlICc9PicgOiAgICBjYXNlICfih5InIDpcbiAgICBjYXNlICd+PicgOiAgICBjYXNlICfihpsnIDpcbiAgICAgIHJldHVybiAnbm9uZSc7XG5cbiAgICBjYXNlICc8LSc6ICAgICBjYXNlICfihpAnIDpcbiAgICBjYXNlICc8LT4nOiAgICBjYXNlICfihpQnIDpcbiAgICBjYXNlICc8LT0+JzogICBjYXNlICfihpDih5InIDpcbiAgICBjYXNlICc8LX4+JzogICBjYXNlICfihpDihpsnIDpcbiAgICAgIHJldHVybiAnbGVnYWwnO1xuXG4gICAgY2FzZSAnPD0nOiAgICAgY2FzZSAn4oeQJyA6XG4gICAgY2FzZSAnPD0+JzogICAgY2FzZSAn4oeUJyA6XG4gICAgY2FzZSAnPD0tPic6ICAgY2FzZSAn4oeQ4oaSJyA6XG4gICAgY2FzZSAnPD1+Pic6ICAgY2FzZSAn4oeQ4oabJyA6XG4gICAgICByZXR1cm4gJ21haW4nO1xuXG4gICAgY2FzZSAnPH4nOiAgICAgY2FzZSAn4oaaJyA6XG4gICAgY2FzZSAnPH4+JzogICAgY2FzZSAn4oauJyA6XG4gICAgY2FzZSAnPH4tPic6ICAgY2FzZSAn4oaa4oaSJyA6XG4gICAgY2FzZSAnPH49Pic6ICAgY2FzZSAn4oaa4oeSJyA6XG4gICAgICByZXR1cm4gJ2ZvcmNlZCc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcnJvd19kaXJlY3Rpb246IHVua25vd24gYXJyb3cgdHlwZSAke2Fycm93fWApO1xuXG4gIH1cblxufVxuXG4vKiBlc2xpbnQtZW5hYmxlIGNvbXBsZXhpdHkgKi9cblxuXG5cblxuXG4vKiBlc2xpbnQtZGlzYWJsZSBjb21wbGV4aXR5ICovXG5cbmZ1bmN0aW9uIGFycm93X3JpZ2h0X2tpbmQoYXJyb3c6IEpzc21BcnJvdyk6IEpzc21BcnJvd0tpbmQge1xuXG4gIHN3aXRjaCAoIFN0cmluZyhhcnJvdykgKSB7XG5cbiAgICBjYXNlICc8LScgOiAgICBjYXNlICfihpAnIDpcbiAgICBjYXNlICc8PScgOiAgICBjYXNlICfih5AnIDpcbiAgICBjYXNlICc8ficgOiAgICBjYXNlICfihponIDpcbiAgICAgIHJldHVybiAnbm9uZSc7XG5cbiAgICBjYXNlICctPicgOiAgICBjYXNlICfihpInIDpcbiAgICBjYXNlICc8LT4nOiAgICBjYXNlICfihpQnIDpcbiAgICBjYXNlICc8PS0+JzogICBjYXNlICfih5DihpInIDpcbiAgICBjYXNlICc8fi0+JzogICBjYXNlICfihprihpInIDpcbiAgICAgIHJldHVybiAnbGVnYWwnO1xuXG4gICAgY2FzZSAnPT4nIDogICAgY2FzZSAn4oeSJyA6XG4gICAgY2FzZSAnPD0+JzogICAgY2FzZSAn4oeUJyA6XG4gICAgY2FzZSAnPC09Pic6ICAgY2FzZSAn4oaQ4oeSJyA6XG4gICAgY2FzZSAnPH49Pic6ICAgY2FzZSAn4oaa4oeSJyA6XG4gICAgICByZXR1cm4gJ21haW4nO1xuXG4gICAgY2FzZSAnfj4nIDogICAgY2FzZSAn4oabJyA6XG4gICAgY2FzZSAnPH4+JzogICAgY2FzZSAn4oauJyA6XG4gICAgY2FzZSAnPC1+Pic6ICAgY2FzZSAn4oaQ4oabJyA6XG4gICAgY2FzZSAnPD1+Pic6ICAgY2FzZSAn4oeQ4oabJyA6XG4gICAgICByZXR1cm4gJ2ZvcmNlZCc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcnJvd19kaXJlY3Rpb246IHVua25vd24gYXJyb3cgdHlwZSAke2Fycm93fWApO1xuXG4gIH1cblxufVxuXG4vKiBlc2xpbnQtZW5hYmxlIGNvbXBsZXhpdHkgKi9cblxuXG5cblxuXG5mdW5jdGlvbiBtYWtlVHJhbnNpdGlvbjxtTlQsIG1EVD4oXG4gIHRoaXNfc2UgOiBKc3NtQ29tcGlsZVNlPG1OVD4sXG4gIGZyb20gICAgOiBtTlQsXG4gIHRvICAgICAgOiBtTlQsXG4gIGlzUmlnaHQgOiBib29sZWFuXG4pIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+IHtcblxuICBjb25zdCBraW5kIDogSnNzbUFycm93S2luZCAgICAgICAgICAgID0gaXNSaWdodD8gYXJyb3dfcmlnaHRfa2luZCh0aGlzX3NlLmtpbmQpIDogYXJyb3dfbGVmdF9raW5kKHRoaXNfc2Uua2luZCksXG4gICAgICAgIGVkZ2UgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB7XG4gICAgICAgICAgZnJvbSxcbiAgICAgICAgICB0byxcbiAgICAgICAgICBraW5kLFxuICAgICAgICAgIGZvcmNlZF9vbmx5IDoga2luZCA9PT0gJ2ZvcmNlZCcsXG4gICAgICAgICAgbWFpbl9wYXRoICAgOiBraW5kID09PSAnbWFpbidcbiAgICAgICAgfTtcblxuICBjb25zdCBhY3Rpb24gICAgICA6IHN0cmluZyA9IGlzUmlnaHQ/ICdyX2FjdGlvbicgICAgICA6ICdsX2FjdGlvbicsXG4gICAgICAgIHByb2JhYmlsaXR5IDogc3RyaW5nID0gaXNSaWdodD8gJ3JfcHJvYmFiaWxpdHknIDogJ2xfcHJvYmFiaWxpdHknO1xuXG4gIGlmICh0aGlzX3NlW2FjdGlvbl0pICAgICAgeyBlZGdlLmFjdGlvbiAgICAgID0gdGhpc19zZVthY3Rpb25dOyAgICAgIH1cbiAgaWYgKHRoaXNfc2VbcHJvYmFiaWxpdHldKSB7IGVkZ2UucHJvYmFiaWxpdHkgPSB0aGlzX3NlW3Byb2JhYmlsaXR5XTsgfVxuXG4gIHJldHVybiBlZGdlO1xuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcDxtTlQsIG1EVD4oXG4gICAgICAgICAgICAgYWNjICAgICA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPixcbiAgICAgICAgICAgICBmcm9tICAgIDogbU5ULFxuICAgICAgICAgICAgIHRvICAgICAgOiBtTlQsXG4gICAgICAgICAgICAgdGhpc19zZSA6IEpzc21Db21waWxlU2U8bU5UPixcbiAgICAgICAgICAgICBuZXh0X3NlIDogSnNzbUNvbXBpbGVTZTxtTlQ+XG4gICAgICAgICApIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHsgLy8gdG9kbyBmbG93IGRlc2NyaWJlIHRoZSBwYXJzZXIgcmVwcmVzZW50YXRpb24gb2YgYSB0cmFuc2l0aW9uIHN0ZXAgZXh0ZW5zaW9uXG5cbiAgY29uc3QgZWRnZXMgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBbXTtcblxuICBjb25zdCB1RnJvbSA6IEFycmF5PCBtTlQgPiA9IChBcnJheS5pc0FycmF5KGZyb20pPyBmcm9tIDogW2Zyb21dKSxcbiAgICAgICAgdVRvICAgOiBBcnJheTwgbU5UID4gPSAoQXJyYXkuaXNBcnJheSh0byk/ICAgdG8gICA6IFt0b10gICk7XG5cbiAgdUZyb20ubWFwKCAoZjogbU5UKSA9PiB7XG4gICAgdVRvLm1hcCggKHQ6IG1OVCkgPT4ge1xuXG4gICAgICBjb25zdCByaWdodDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gbWFrZVRyYW5zaXRpb24odGhpc19zZSwgZiwgdCwgdHJ1ZSk7XG4gICAgICBpZiAocmlnaHQua2luZCAhPT0gJ25vbmUnKSB7IGVkZ2VzLnB1c2gocmlnaHQpOyB9XG5cbiAgICAgIGNvbnN0IGxlZnQ6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IG1ha2VUcmFuc2l0aW9uKHRoaXNfc2UsIHQsIGYsIGZhbHNlKTtcbiAgICAgIGlmIChsZWZ0LmtpbmQgIT09ICdub25lJykgeyBlZGdlcy5wdXNoKGxlZnQpOyB9XG5cbiAgICB9KTtcbiAgfSk7XG5cbiAgY29uc3QgbmV3X2FjYzogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+ID0gYWNjLmNvbmNhdChlZGdlcyk7XG5cbiAgaWYgKG5leHRfc2UpIHtcbiAgICByZXR1cm4gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcChuZXdfYWNjLCB0bywgbmV4dF9zZS50bywgbmV4dF9zZSwgbmV4dF9zZS5zZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ld19hY2M7XG4gIH1cblxufVxuXG5cblxuZnVuY3Rpb24gY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uPG1OVD4ocnVsZTogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pOiBtaXhlZCB7IC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgcGFyc2VyIHJlcHJlc2VudGF0aW9uIG9mIGEgdHJhbnNpdGlvblxuICByZXR1cm4gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcChbXSwgcnVsZS5mcm9tLCBydWxlLnNlLnRvLCBydWxlLnNlLCBydWxlLnNlLnNlKTtcbn1cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVfcnVsZV9oYW5kbGVyPG1OVD4ocnVsZTogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pOiBKc3NtQ29tcGlsZVJ1bGUgeyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIG91dHB1dCBvZiB0aGUgcGFyc2VyXG5cbiAgaWYgKHJ1bGUua2V5ID09PSAndHJhbnNpdGlvbicpIHtcbiAgICByZXR1cm4geyBhZ2dfYXM6ICd0cmFuc2l0aW9uJywgdmFsOiBjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb24ocnVsZSkgfTtcbiAgfVxuXG4gIGlmIChydWxlLmtleSA9PT0gJ21hY2hpbmVfbGFuZ3VhZ2UnKSB7XG4gICAgcmV0dXJuIHsgYWdnX2FzOiAnbWFjaGluZV9sYW5ndWFnZScsIHZhbDogcmVkdWNlX3RvXzYzOShydWxlLnZhbHVlKSB9O1xuICB9XG5cbiAgY29uc3QgdGF1dG9sb2dpZXMgOiBBcnJheTxzdHJpbmc+ID0gW1xuICAgICdncmFwaF9sYXlvdXQnLCAnc3RhcnRfc3RhdGVzJywgJ2VuZF9zdGF0ZXMnLCAnbWFjaGluZV9uYW1lJywgJ21hY2hpbmVfdmVyc2lvbicsXG4gICAgJ21hY2hpbmVfY29tbWVudCcsICdtYWNoaW5lX2F1dGhvcicsICdtYWNoaW5lX2NvbnRyaWJ1dG9yJywgJ21hY2hpbmVfZGVmaW5pdGlvbicsXG4gICAgJ21hY2hpbmVfcmVmZXJlbmNlJywgJ21hY2hpbmVfbGljZW5zZScsICdmc2xfdmVyc2lvbidcbiAgXTtcblxuICBpZiAodGF1dG9sb2dpZXMuaW5jbHVkZXMocnVsZS5rZXkpKSB7XG4gICAgcmV0dXJuIHsgYWdnX2FzOiBydWxlLmtleSwgdmFsOiBydWxlLnZhbHVlIH07XG4gIH1cblxuICB0aHJvdyBuZXcgRXJyb3IoYGNvbXBpbGVfcnVsZV9oYW5kbGVyOiBVbmtub3duIHJ1bGU6ICR7SlNPTi5zdHJpbmdpZnkocnVsZSl9YCk7XG5cbn1cblxuXG5cblxuXG5mdW5jdGlvbiBjb21waWxlPG1OVCwgbURUPih0cmVlOiBKc3NtUGFyc2VUcmVlPG1OVD4pOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4geyAgLy8gdG9kbyBmbG93IGRlc2NyaWJlIHRoZSBvdXRwdXQgb2YgdGhlIHBhcnNlclxuXG4gIGNvbnN0IHJlc3VsdHMgOiB7XG4gICAgZ3JhcGhfbGF5b3V0ICAgICAgICA6IEFycmF5PCBKc3NtTGF5b3V0ID4sXG4gICAgdHJhbnNpdGlvbiAgICAgICAgICA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPixcbiAgICBzdGFydF9zdGF0ZXMgICAgICAgIDogQXJyYXk8IG1OVCA+LFxuICAgIGVuZF9zdGF0ZXMgICAgICAgICAgOiBBcnJheTwgbU5UID4sXG4gICAgZnNsX3ZlcnNpb24gICAgICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2F1dGhvciAgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfY29tbWVudCAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9jb250cmlidXRvciA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2RlZmluaXRpb24gIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfbGFuZ3VhZ2UgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9saWNlbnNlICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX25hbWUgICAgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfcmVmZXJlbmNlICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV92ZXJzaW9uICAgICA6IEFycmF5PCBzdHJpbmcgPiAvLyBzZW12ZXJcbiAgfSA9IHtcbiAgICBncmFwaF9sYXlvdXQgICAgICAgIDogW10sXG4gICAgdHJhbnNpdGlvbiAgICAgICAgICA6IFtdLFxuICAgIHN0YXJ0X3N0YXRlcyAgICAgICAgOiBbXSxcbiAgICBlbmRfc3RhdGVzICAgICAgICAgIDogW10sXG4gICAgZnNsX3ZlcnNpb24gICAgICAgICA6IFtdLFxuICAgIG1hY2hpbmVfYXV0aG9yICAgICAgOiBbXSxcbiAgICBtYWNoaW5lX2NvbW1lbnQgICAgIDogW10sXG4gICAgbWFjaGluZV9jb250cmlidXRvciA6IFtdLFxuICAgIG1hY2hpbmVfZGVmaW5pdGlvbiAgOiBbXSxcbiAgICBtYWNoaW5lX2xhbmd1YWdlICAgIDogW10sXG4gICAgbWFjaGluZV9saWNlbnNlICAgICA6IFtdLFxuICAgIG1hY2hpbmVfbmFtZSAgICAgICAgOiBbXSxcbiAgICBtYWNoaW5lX3JlZmVyZW5jZSAgIDogW10sXG4gICAgbWFjaGluZV92ZXJzaW9uICAgICA6IFtdXG4gIH07XG5cbiAgdHJlZS5tYXAoICh0ciA6IEpzc21Db21waWxlU2VTdGFydDxtTlQ+KSA9PiB7XG5cbiAgICBjb25zdCBydWxlICAgOiBKc3NtQ29tcGlsZVJ1bGUgPSBjb21waWxlX3J1bGVfaGFuZGxlcih0ciksXG4gICAgICAgICAgYWdnX2FzIDogc3RyaW5nICAgICAgICAgID0gcnVsZS5hZ2dfYXMsXG4gICAgICAgICAgdmFsICAgIDogbWl4ZWQgICAgICAgICAgID0gcnVsZS52YWw7ICAgICAgICAgICAgICAgICAgLy8gdG9kbyBiZXR0ZXIgdHlwZXNcblxuICAgIHJlc3VsdHNbYWdnX2FzXSA9IHJlc3VsdHNbYWdnX2FzXS5jb25jYXQodmFsKTtcblxuICB9KTtcblxuICBjb25zdCBhc3NlbWJsZWRfdHJhbnNpdGlvbnMgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBbXS5jb25jYXQoLi4uIHJlc3VsdHNbJ3RyYW5zaXRpb24nXSk7XG5cbiAgY29uc3QgcmVzdWx0X2NmZyA6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPiA9IHtcbiAgICBzdGFydF9zdGF0ZXMgOiByZXN1bHRzLnN0YXJ0X3N0YXRlcy5sZW5ndGg/IHJlc3VsdHMuc3RhcnRfc3RhdGVzIDogW2Fzc2VtYmxlZF90cmFuc2l0aW9uc1swXS5mcm9tXSxcbiAgICB0cmFuc2l0aW9ucyAgOiBhc3NlbWJsZWRfdHJhbnNpdGlvbnNcbiAgfTtcblxuICBjb25zdCBvbmVPbmx5S2V5cyA6IEFycmF5PHN0cmluZz4gPSBbXG4gICAgJ2dyYXBoX2xheW91dCcsICdtYWNoaW5lX25hbWUnLCAnbWFjaGluZV92ZXJzaW9uJywgJ21hY2hpbmVfY29tbWVudCcsICdmc2xfdmVyc2lvbicsICdtYWNoaW5lX2xpY2Vuc2UnLFxuICAgICdtYWNoaW5lX2RlZmluaXRpb24nLCAnbWFjaGluZV9sYW5ndWFnZSdcbiAgXTtcblxuICBvbmVPbmx5S2V5cy5tYXAoIChvbmVPbmx5S2V5IDogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHJlc3VsdHNbb25lT25seUtleV0ubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNYXkgb25seSBoYXZlIG9uZSAke29uZU9ubHlLZXl9IHN0YXRlbWVudCBtYXhpbXVtOiAke0pTT04uc3RyaW5naWZ5KHJlc3VsdHNbb25lT25seUtleV0pfWApO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAocmVzdWx0c1tvbmVPbmx5S2V5XS5sZW5ndGgpIHtcbiAgICAgICAgcmVzdWx0X2NmZ1tvbmVPbmx5S2V5XSA9IHJlc3VsdHNbb25lT25seUtleV1bMF07XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBbJ21hY2hpbmVfYXV0aG9yJywgJ21hY2hpbmVfY29udHJpYnV0b3InLCAnbWFjaGluZV9yZWZlcmVuY2UnXS5tYXAoIChtdWx0aUtleSA6IHN0cmluZykgPT4ge1xuICAgIGlmIChyZXN1bHRzW211bHRpS2V5XS5sZW5ndGgpIHtcbiAgICAgIHJlc3VsdF9jZmdbbXVsdGlLZXldID0gcmVzdWx0c1ttdWx0aUtleV07XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcmVzdWx0X2NmZztcblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIG1ha2U8bU5ULCBtRFQ+KHBsYW46IHN0cmluZyk6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPiB7XG4gIHJldHVybiBjb21waWxlKHBhcnNlKHBsYW4pKTtcbn1cblxuXG5cblxuXG5jbGFzcyBNYWNoaW5lPG1OVCwgbURUPiB7XG5cblxuICBfc3RhdGUgICAgICAgICAgICAgICAgICA6IG1OVDtcbiAgX3N0YXRlcyAgICAgICAgICAgICAgICAgOiBNYXA8bU5ULCBKc3NtR2VuZXJpY1N0YXRlPG1OVD4+O1xuICBfZWRnZXMgICAgICAgICAgICAgICAgICA6IEFycmF5PEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPj47XG4gIF9lZGdlX21hcCAgICAgICAgICAgICAgIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG4gIF9uYW1lZF90cmFuc2l0aW9ucyAgICAgIDogTWFwPG1OVCwgbnVtYmVyPjtcbiAgX2FjdGlvbnMgICAgICAgICAgICAgICAgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcbiAgX3JldmVyc2VfYWN0aW9ucyAgICAgICAgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcbiAgX3JldmVyc2VfYWN0aW9uX3RhcmdldHMgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcblxuICBfbWFjaGluZV9hdXRob3IgICAgICAgICA6ID9BcnJheTxzdHJpbmc+O1xuICBfbWFjaGluZV9jb21tZW50ICAgICAgICA6ID9zdHJpbmc7XG4gIF9tYWNoaW5lX2NvbnRyaWJ1dG9yICAgIDogP0FycmF5PHN0cmluZz47XG4gIF9tYWNoaW5lX2RlZmluaXRpb24gICAgIDogP3N0cmluZztcbiAgX21hY2hpbmVfbGFuZ3VhZ2UgICAgICAgOiA/c3RyaW5nO1xuICBfbWFjaGluZV9saWNlbnNlICAgICAgICA6ID9zdHJpbmc7XG4gIF9tYWNoaW5lX25hbWUgICAgICAgICAgIDogP3N0cmluZztcbiAgX21hY2hpbmVfdmVyc2lvbiAgICAgICAgOiA/c3RyaW5nO1xuICBfZnNsX3ZlcnNpb24gICAgICAgICAgICA6ID9zdHJpbmc7XG5cbiAgX2dyYXBoX2xheW91dCAgICAgICAgICAgOiBKc3NtTGF5b3V0O1xuXG5cbiAgLy8gd2hhcmdhcmJsIHRoaXMgYmFkbHkgbmVlZHMgdG8gYmUgYnJva2VuIHVwLCBtb25vbGl0aCBtYXN0ZXJcbiAgY29uc3RydWN0b3Ioe1xuICAgIHN0YXJ0X3N0YXRlcyxcbiAgICBjb21wbGV0ZSAgICAgICAgPSBbXSxcbiAgICB0cmFuc2l0aW9ucyxcbiAgICBtYWNoaW5lX2F1dGhvcixcbiAgICBtYWNoaW5lX2NvbW1lbnQsXG4gICAgbWFjaGluZV9jb250cmlidXRvcixcbiAgICBtYWNoaW5lX2RlZmluaXRpb24sXG4gICAgbWFjaGluZV9sYW5ndWFnZSxcbiAgICBtYWNoaW5lX2xpY2Vuc2UsXG4gICAgbWFjaGluZV9uYW1lLFxuICAgIG1hY2hpbmVfdmVyc2lvbixcbiAgICBmc2xfdmVyc2lvbixcbiAgICBncmFwaF9sYXlvdXQgPSAnZG90J1xuICB9IDogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+KSB7XG5cbiAgICB0aGlzLl9zdGF0ZSAgICAgICAgICAgICAgICAgID0gc3RhcnRfc3RhdGVzWzBdO1xuICAgIHRoaXMuX3N0YXRlcyAgICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fZWRnZXMgICAgICAgICAgICAgICAgICA9IFtdO1xuICAgIHRoaXMuX2VkZ2VfbWFwICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9hY3Rpb25zICAgICAgICAgICAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX3JldmVyc2VfYWN0aW9ucyAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyA9IG5ldyBNYXAoKTsgICAvLyB0b2RvXG5cbiAgICB0aGlzLl9tYWNoaW5lX2F1dGhvciAgICAgICAgID0gbWFjaGluZV9hdXRob3I7XG4gICAgdGhpcy5fbWFjaGluZV9jb21tZW50ICAgICAgICA9IG1hY2hpbmVfY29tbWVudDtcbiAgICB0aGlzLl9tYWNoaW5lX2NvbnRyaWJ1dG9yICAgID0gbWFjaGluZV9jb250cmlidXRvcjtcbiAgICB0aGlzLl9tYWNoaW5lX2RlZmluaXRpb24gICAgID0gbWFjaGluZV9kZWZpbml0aW9uO1xuICAgIHRoaXMuX21hY2hpbmVfbGFuZ3VhZ2UgICAgICAgPSBtYWNoaW5lX2xhbmd1YWdlO1xuICAgIHRoaXMuX21hY2hpbmVfbGljZW5zZSAgICAgICAgPSBtYWNoaW5lX2xpY2Vuc2U7XG4gICAgdGhpcy5fbWFjaGluZV9uYW1lICAgICAgICAgICA9IG1hY2hpbmVfbmFtZTtcbiAgICB0aGlzLl9tYWNoaW5lX3ZlcnNpb24gICAgICAgID0gbWFjaGluZV92ZXJzaW9uO1xuICAgIHRoaXMuX2ZzbF92ZXJzaW9uICAgICAgICAgICAgPSBmc2xfdmVyc2lvbjtcblxuICAgIHRoaXMuX2dyYXBoX2xheW91dCAgICAgICAgICAgPSBncmFwaF9sYXlvdXQ7XG5cbiAgICB0cmFuc2l0aW9ucy5tYXAoICh0cjpKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pID0+IHtcblxuICAgICAgaWYgKHRyLmZyb20gPT09IHVuZGVmaW5lZCkgeyB0aHJvdyBuZXcgRXJyb3IoYHRyYW5zaXRpb24gbXVzdCBkZWZpbmUgJ2Zyb20nOiAke0pTT04uc3RyaW5naWZ5KHRyKX1gKTsgfVxuICAgICAgaWYgKHRyLnRvICAgPT09IHVuZGVmaW5lZCkgeyB0aHJvdyBuZXcgRXJyb3IoYHRyYW5zaXRpb24gbXVzdCBkZWZpbmUgJ3RvJzogJHsgIEpTT04uc3RyaW5naWZ5KHRyKX1gKTsgfVxuXG4gICAgICAvLyBnZXQgdGhlIGN1cnNvcnMuICB3aGF0IGEgbWVzc1xuICAgICAgY29uc3QgY3Vyc29yX2Zyb206IEpzc21HZW5lcmljU3RhdGU8bU5UPlxuICAgICAgICAgID0gdGhpcy5fc3RhdGVzLmdldCh0ci5mcm9tKVxuICAgICAgICAgfHwgeyBuYW1lOiB0ci5mcm9tLCBmcm9tOiBbXSwgdG86IFtdLCBjb21wbGV0ZTogY29tcGxldGUuaW5jbHVkZXModHIuZnJvbSkgfTtcblxuICAgICAgaWYgKCEodGhpcy5fc3RhdGVzLmhhcyh0ci5mcm9tKSkpIHtcbiAgICAgICAgdGhpcy5fbmV3X3N0YXRlKGN1cnNvcl9mcm9tKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY3Vyc29yX3RvOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD5cbiAgICAgICAgICA9IHRoaXMuX3N0YXRlcy5nZXQodHIudG8pXG4gICAgICAgICB8fCB7bmFtZTogdHIudG8sIGZyb206IFtdLCB0bzogW10sIGNvbXBsZXRlOiBjb21wbGV0ZS5pbmNsdWRlcyh0ci50bykgfTtcblxuICAgICAgaWYgKCEodGhpcy5fc3RhdGVzLmhhcyh0ci50bykpKSB7XG4gICAgICAgIHRoaXMuX25ld19zdGF0ZShjdXJzb3JfdG8pO1xuICAgICAgfVxuXG4gICAgICAvLyBndWFyZCBhZ2FpbnN0IGV4aXN0aW5nIGNvbm5lY3Rpb25zIGJlaW5nIHJlLWFkZGVkXG4gICAgICBpZiAoY3Vyc29yX2Zyb20udG8uaW5jbHVkZXModHIudG8pKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgYWxyZWFkeSBoYXMgJHtKU09OLnN0cmluZ2lmeSh0ci5mcm9tKX0gdG8gJHtKU09OLnN0cmluZ2lmeSh0ci50byl9YCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjdXJzb3JfZnJvbS50by5wdXNoKHRyLnRvKTtcbiAgICAgICAgY3Vyc29yX3RvLmZyb20ucHVzaCh0ci5mcm9tKTtcbiAgICAgIH1cblxuICAgICAgLy8gYWRkIHRoZSBlZGdlOyBub3RlIGl0cyBpZFxuICAgICAgdGhpcy5fZWRnZXMucHVzaCh0cik7XG4gICAgICBjb25zdCB0aGlzRWRnZUlkOiBudW1iZXIgPSB0aGlzLl9lZGdlcy5sZW5ndGggLSAxO1xuXG4gICAgICAvLyBndWFyZCBhZ2FpbnN0IHJlcGVhdGluZyBhIHRyYW5zaXRpb24gbmFtZVxuICAgICAgaWYgKHRyLm5hbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuX25hbWVkX3RyYW5zaXRpb25zLmhhcyh0ci5uYW1lKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgbmFtZWQgdHJhbnNpdGlvbiBcIiR7SlNPTi5zdHJpbmdpZnkodHIubmFtZSl9XCIgYWxyZWFkeSBjcmVhdGVkYCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMuc2V0KHRyLm5hbWUsIHRoaXNFZGdlSWQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHNldCB1cCB0aGUgbWFwcGluZywgc28gdGhhdCBlZGdlcyBjYW4gYmUgbG9va2VkIHVwIGJ5IGVuZHBvaW50IHBhaXJzXG4gICAgICBjb25zdCBmcm9tX21hcHBpbmc6IE1hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9lZGdlX21hcC5nZXQodHIuZnJvbSkgfHwgbmV3IE1hcCgpO1xuICAgICAgaWYgKCEodGhpcy5fZWRnZV9tYXAuaGFzKHRyLmZyb20pKSkge1xuICAgICAgICB0aGlzLl9lZGdlX21hcC5zZXQodHIuZnJvbSwgZnJvbV9tYXBwaW5nKTtcbiAgICAgIH1cblxuLy8gICAgY29uc3QgdG9fbWFwcGluZyA9IGZyb21fbWFwcGluZy5nZXQodHIudG8pO1xuICAgICAgZnJvbV9tYXBwaW5nLnNldCh0ci50bywgdGhpc0VkZ2VJZCk7IC8vIGFscmVhZHkgY2hlY2tlZCB0aGF0IHRoaXMgbWFwcGluZyBkb2Vzbid0IGV4aXN0LCBhYm92ZVxuXG4gICAgICAvLyBzZXQgdXAgdGhlIGFjdGlvbiBtYXBwaW5nLCBzbyB0aGF0IGFjdGlvbnMgY2FuIGJlIGxvb2tlZCB1cCBieSBvcmlnaW5cbiAgICAgIGlmICh0ci5hY3Rpb24pIHtcblxuXG4gICAgICAgIC8vIGZvcndhcmQgbWFwcGluZyBmaXJzdCBieSBhY3Rpb24gbmFtZVxuICAgICAgICBsZXQgYWN0aW9uTWFwOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KHRyLmFjdGlvbik7XG4gICAgICAgIGlmICghKGFjdGlvbk1hcCkpIHtcbiAgICAgICAgICBhY3Rpb25NYXAgPSBuZXcgTWFwKCk7XG4gICAgICAgICAgdGhpcy5fYWN0aW9ucy5zZXQodHIuYWN0aW9uLCBhY3Rpb25NYXApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFjdGlvbk1hcC5oYXModHIuZnJvbSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGFjdGlvbiAke0pTT04uc3RyaW5naWZ5KHRyLmFjdGlvbil9IGFscmVhZHkgYXR0YWNoZWQgdG8gb3JpZ2luICR7SlNPTi5zdHJpbmdpZnkodHIuZnJvbSl9YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYWN0aW9uTWFwLnNldCh0ci5mcm9tLCB0aGlzRWRnZUlkKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgLy8gcmV2ZXJzZSBtYXBwaW5nIGZpcnN0IGJ5IHN0YXRlIG9yaWdpbiBuYW1lXG4gICAgICAgIGxldCByQWN0aW9uTWFwOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQodHIuZnJvbSk7XG4gICAgICAgIGlmICghKHJBY3Rpb25NYXApKSB7XG4gICAgICAgICAgckFjdGlvbk1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuc2V0KHRyLmZyb20sIHJBY3Rpb25NYXApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbm8gbmVlZCB0byB0ZXN0IGZvciByZXZlcnNlIG1hcHBpbmcgcHJlLXByZXNlbmNlO1xuICAgICAgICAvLyBmb3J3YXJkIG1hcHBpbmcgYWxyZWFkeSBjb3ZlcnMgY29sbGlzaW9uc1xuICAgICAgICByQWN0aW9uTWFwLnNldCh0ci5hY3Rpb24sIHRoaXNFZGdlSWQpO1xuXG5cbiAgICAgICAgLy8gcmV2ZXJzZSBtYXBwaW5nIGZpcnN0IGJ5IHN0YXRlIHRhcmdldCBuYW1lXG4gICAgICAgIGlmICghKHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuaGFzKHRyLnRvKSkpIHtcbiAgICAgICAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLnNldCh0ci50bywgbmV3IE1hcCgpKTtcbiAgICAgICAgfVxuXG4vKiB0b2RvIGNvbWViYWNrXG4gICBmdW5kYW1lbnRhbCBwcm9ibGVtIGlzIHJvQWN0aW9uTWFwIG5lZWRzIHRvIGJlIGEgbXVsdGltYXBcbiAgICAgICAgY29uc3Qgcm9BY3Rpb25NYXAgPSB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLmdldCh0ci50byk7ICAvLyB3YXN0ZWZ1bCAtIGFscmVhZHkgZGlkIGhhcyAtIHJlZmFjdG9yXG4gICAgICAgIGlmIChyb0FjdGlvbk1hcCkge1xuICAgICAgICAgIGlmIChyb0FjdGlvbk1hcC5oYXModHIuYWN0aW9uKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGByby1hY3Rpb24gJHt0ci50b30gYWxyZWFkeSBhdHRhY2hlZCB0byBhY3Rpb24gJHt0ci5hY3Rpb259YCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJvQWN0aW9uTWFwLnNldCh0ci5hY3Rpb24sIHRoaXNFZGdlSWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Nob3VsZCBiZSBpbXBvc3NpYmxlIC0gZmxvdyBkb2VzblxcJ3Qga25vdyAuc2V0IHByZWNlZGVzIC5nZXQgeWV0IGFnYWluLiAgc2V2ZXJlIGVycm9yPycpO1xuICAgICAgICB9XG4qL1xuICAgICAgfVxuXG4gICAgfSk7XG5cbiAgfVxuXG4gIF9uZXdfc3RhdGUoc3RhdGVfY29uZmlnOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD4pOiBtTlQgeyAvLyB3aGFyZ2FyYmwgZ2V0IHRoYXQgc3RhdGVfY29uZmlnIGFueSB1bmRlciBjb250cm9sXG5cbiAgICBpZiAodGhpcy5fc3RhdGVzLmhhcyhzdGF0ZV9jb25maWcubmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgc3RhdGUgJHtKU09OLnN0cmluZ2lmeShzdGF0ZV9jb25maWcubmFtZSl9IGFscmVhZHkgZXhpc3RzYCk7XG4gICAgfVxuXG4gICAgdGhpcy5fc3RhdGVzLnNldChzdGF0ZV9jb25maWcubmFtZSwgc3RhdGVfY29uZmlnKTtcbiAgICByZXR1cm4gc3RhdGVfY29uZmlnLm5hbWU7XG5cbiAgfVxuXG5cblxuICBzdGF0ZSgpOiBtTlQge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZTtcbiAgfVxuXG4vKiB3aGFyZ2FyYmwgdG9kbyBtYWpvclxuICAgd2hlbiB3ZSByZWltcGxlbWVudCB0aGlzLCByZWludHJvZHVjZSB0aGlzIGNoYW5nZSB0byB0aGUgaXNfZmluYWwgY2FsbFxuXG4gIGlzX2NoYW5naW5nKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlOyAvLyB0b2RvIHdoYXJnYXJibFxuICB9XG4qL1xuXG5cbiAgc3RhdGVfaXNfZmluYWwod2hpY2hTdGF0ZTogbU5UKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICggKHRoaXMuc3RhdGVfaXNfdGVybWluYWwod2hpY2hTdGF0ZSkpICYmICh0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHdoaWNoU3RhdGUpKSApO1xuICB9XG5cbiAgaXNfZmluYWwoKTogYm9vbGVhbiB7XG4vLyAgcmV0dXJuICgoIXRoaXMuaXNfY2hhbmdpbmcoKSkgJiYgdGhpcy5zdGF0ZV9pc19maW5hbCh0aGlzLnN0YXRlKCkpKTtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZV9pc19maW5hbCh0aGlzLnN0YXRlKCkpO1xuICB9XG5cbiAgZ3JhcGhfbGF5b3V0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX2dyYXBoX2xheW91dDtcbiAgfVxuXG5cblxuICBtYWNoaW5lX2F1dGhvcigpOiA/QXJyYXk8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfYXV0aG9yO1xuICB9XG5cbiAgbWFjaGluZV9jb21tZW50KCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2NvbW1lbnQ7XG4gIH1cblxuICBtYWNoaW5lX2NvbnRyaWJ1dG9yKCk6ID9BcnJheTxzdHJpbmc+IHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9jb250cmlidXRvcjtcbiAgfVxuXG4gIG1hY2hpbmVfZGVmaW5pdGlvbigpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9kZWZpbml0aW9uO1xuICB9XG5cbiAgbWFjaGluZV9sYW5ndWFnZSgpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9sYW5ndWFnZTtcbiAgfVxuXG4gIG1hY2hpbmVfbGljZW5zZSgpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9saWNlbnNlO1xuICB9XG5cbiAgbWFjaGluZV9uYW1lKCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX25hbWU7XG4gIH1cblxuICBtYWNoaW5lX3ZlcnNpb24oKTogP3N0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfdmVyc2lvbjtcbiAgfVxuXG4gIGZzbF92ZXJzaW9uKCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9mc2xfdmVyc2lvbjtcbiAgfVxuXG5cblxuICBtYWNoaW5lX3N0YXRlKCk6IEpzc21NYWNoaW5lSW50ZXJuYWxTdGF0ZTxtTlQsIG1EVD4ge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGludGVybmFsX3N0YXRlX2ltcGxfdmVyc2lvbiA6IDEsXG5cbiAgICAgIGFjdGlvbnMgICAgICAgICAgICAgICAgOiB0aGlzLl9hY3Rpb25zLFxuICAgICAgZWRnZV9tYXAgICAgICAgICAgICAgICA6IHRoaXMuX2VkZ2VfbWFwLFxuICAgICAgZWRnZXMgICAgICAgICAgICAgICAgICA6IHRoaXMuX2VkZ2VzLFxuICAgICAgbmFtZWRfdHJhbnNpdGlvbnMgICAgICA6IHRoaXMuX25hbWVkX3RyYW5zaXRpb25zLFxuICAgICAgcmV2ZXJzZV9hY3Rpb25zICAgICAgICA6IHRoaXMuX3JldmVyc2VfYWN0aW9ucyxcbi8vICAgIHJldmVyc2VfYWN0aW9uX3RhcmdldHMgOiB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLFxuICAgICAgc3RhdGUgICAgICAgICAgICAgICAgICA6IHRoaXMuX3N0YXRlLFxuICAgICAgc3RhdGVzICAgICAgICAgICAgICAgICA6IHRoaXMuX3N0YXRlc1xuICAgIH07XG5cbiAgfVxuXG4vKlxuICBsb2FkX21hY2hpbmVfc3RhdGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlOyAvLyB0b2RvIHdoYXJnYXJibFxuICB9XG4qL1xuXG5cbiAgc3RhdGVzKCk6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uIHRoaXMuX3N0YXRlcy5rZXlzKCldO1xuICB9XG5cbiAgc3RhdGVfZm9yKHdoaWNoU3RhdGU6IG1OVCk6IEpzc21HZW5lcmljU3RhdGU8bU5UPiB7XG4gICAgY29uc3Qgc3RhdGU6ID9Kc3NtR2VuZXJpY1N0YXRlPG1OVD4gPSB0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmIChzdGF0ZSkgeyByZXR1cm4gc3RhdGU7IH1cbiAgICBlbHNlICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBubyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkoc3RhdGUpfWApOyB9XG4gIH1cblxuXG5cbiAgbGlzdF9lZGdlcygpOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4ge1xuICAgIHJldHVybiB0aGlzLl9lZGdlcztcbiAgfVxuXG4gIGxpc3RfbmFtZWRfdHJhbnNpdGlvbnMoKTogTWFwPG1OVCwgbnVtYmVyPiB7XG4gICAgcmV0dXJuIHRoaXMuX25hbWVkX3RyYW5zaXRpb25zO1xuICB9XG5cbiAgbGlzdF9hY3Rpb25zKCk6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uIHRoaXMuX2FjdGlvbnMua2V5cygpXTtcbiAgfVxuXG5cblxuICBnZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyhmcm9tOiBtTlQsIHRvOiBtTlQpOiA/bnVtYmVyIHtcblxuICAgIGNvbnN0IGVtZyA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fZWRnZV9tYXAuZ2V0KGZyb20pO1xuXG4gICAgaWYgKGVtZykge1xuICAgICAgcmV0dXJuIGVtZy5nZXQodG8pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICB9XG5cblxuXG4gIGxvb2t1cF90cmFuc2l0aW9uX2Zvcihmcm9tOiBtTlQsIHRvOiBtTlQpOiA/SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+IHtcbiAgICBjb25zdCBpZCA6ID9udW1iZXIgPSB0aGlzLmdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzKGZyb20sIHRvKTtcbiAgICByZXR1cm4gKChpZCA9PT0gdW5kZWZpbmVkKSB8fCAoaWQgPT09IG51bGwpKT8gdW5kZWZpbmVkIDogdGhpcy5fZWRnZXNbaWRdO1xuICB9XG5cblxuXG4gIGxpc3RfdHJhbnNpdGlvbnMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpKTogSnNzbVRyYW5zaXRpb25MaXN0PG1OVD4ge1xuICAgIHJldHVybiB7ZW50cmFuY2VzOiB0aGlzLmxpc3RfZW50cmFuY2VzKHdoaWNoU3RhdGUpLCBleGl0czogdGhpcy5saXN0X2V4aXRzKHdoaWNoU3RhdGUpfTtcbiAgfVxuXG4gIGxpc3RfZW50cmFuY2VzKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSk6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiAodGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKSB8fCB7fSkuZnJvbSB8fCBbXTtcbiAgfVxuXG4gIGxpc3RfZXhpdHMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpKTogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuICh0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpIHx8IHt9KS50byAgIHx8IFtdO1xuICB9XG5cblxuXG4gIHByb2JhYmxlX2V4aXRzX2Zvcih3aGljaFN0YXRlOiBtTlQpOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4ge1xuXG4gICAgY29uc3Qgd3N0YXRlOiA/SnNzbUdlbmVyaWNTdGF0ZTxtTlQ+ID0gdGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAoISh3c3RhdGUpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfSBpbiBwcm9iYWJsZV9leGl0c19mb3JgKTsgfVxuXG4gICAgY29uc3Qgd3N0YXRlX3RvIDogQXJyYXk8IG1OVCA+ID0gd3N0YXRlLnRvLFxuXG4gICAgICAgICAgd3RmICAgICAgIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IC8vIHdzdGF0ZV90b19maWx0ZXJlZCAtPiB3dGZcbiAgICAgICAgICAgICAgICAgICAgPSB3c3RhdGVfdG9cbiAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoICh3cykgOiA/SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMubG9va3VwX3RyYW5zaXRpb25fZm9yKHRoaXMuc3RhdGUoKSwgd3MpKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKTtcblxuICAgIHJldHVybiB3dGY7XG5cbiAgfVxuXG4gIHByb2JhYmlsaXN0aWNfdHJhbnNpdGlvbigpOiBib29sZWFuIHtcbiAgICBjb25zdCBzZWxlY3RlZCA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHdlaWdodGVkX3JhbmRfc2VsZWN0KHRoaXMucHJvYmFibGVfZXhpdHNfZm9yKHRoaXMuc3RhdGUoKSkpO1xuICAgIHJldHVybiB0aGlzLnRyYW5zaXRpb24oIHNlbGVjdGVkLnRvICk7XG4gIH1cblxuICBwcm9iYWJpbGlzdGljX3dhbGsobjogbnVtYmVyKTogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuIHNlcShuKVxuICAgICAgICAgIC5tYXAoKCkgOiBtTlQgPT4ge1xuICAgICAgICAgICAgIGNvbnN0IHN0YXRlX3dhczogbU5UID0gdGhpcy5zdGF0ZSgpO1xuICAgICAgICAgICAgIHRoaXMucHJvYmFiaWxpc3RpY190cmFuc2l0aW9uKCk7XG4gICAgICAgICAgICAgcmV0dXJuIHN0YXRlX3dhcztcbiAgICAgICAgICAgfSlcbiAgICAgICAgICAuY29uY2F0KFt0aGlzLnN0YXRlKCldKTtcbiAgfVxuXG4gIHByb2JhYmlsaXN0aWNfaGlzdG9fd2FsayhuOiBudW1iZXIpOiBNYXA8bU5ULCBudW1iZXI+IHtcbiAgICByZXR1cm4gaGlzdG9ncmFwaCh0aGlzLnByb2JhYmlsaXN0aWNfd2FsayhuKSk7XG4gIH1cblxuXG5cbiAgYWN0aW9ucyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkgKTogQXJyYXk8bU5UPiB7XG4gICAgY29uc3Qgd3N0YXRlIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICh3c3RhdGUpIHsgcmV0dXJuIFsuLi4gd3N0YXRlLmtleXMoKV07IH1cbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG4gIH1cblxuICBsaXN0X3N0YXRlc19oYXZpbmdfYWN0aW9uKHdoaWNoU3RhdGU6IG1OVCk6IEFycmF5PG1OVD4ge1xuICAgIGNvbnN0IHdzdGF0ZSA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHdzdGF0ZSkgeyByZXR1cm4gWy4uLiB3c3RhdGUua2V5cygpXTsgfVxuICAgIGVsc2UgICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cbiAgfVxuXG4vLyBjb21lYmFja1xuLypcbiAgbGlzdF9lbnRyYW5jZV9hY3Rpb25zKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSApIDogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuIFsuLi4gKHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuZ2V0KHdoaWNoU3RhdGUpIHx8IG5ldyBNYXAoKSkudmFsdWVzKCldIC8vIHdhc3RlZnVsXG4gICAgICAgICAgIC5tYXAoIChlZGdlSWQ6YW55KSA9PiAodGhpcy5fZWRnZXNbZWRnZUlkXSA6IGFueSkpIC8vIHdoYXJnYXJibCBidXJuIG91dCBhbnlcbiAgICAgICAgICAgLmZpbHRlciggKG86YW55KSA9PiBvLnRvID09PSB3aGljaFN0YXRlKVxuICAgICAgICAgICAubWFwKCBmaWx0ZXJlZCA9PiBmaWx0ZXJlZC5mcm9tICk7XG4gIH1cbiovXG4gIGxpc3RfZXhpdF9hY3Rpb25zKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSApOiBBcnJheTw/bU5UPiB7IC8vIHRoZXNlIGFyZSBtTlQsIG5vdCA/bU5UXG4gICAgY29uc3QgcmFfYmFzZTogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICghKHJhX2Jhc2UpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG5cbiAgICByZXR1cm4gWy4uLiByYV9iYXNlLnZhbHVlcygpXVxuICAgICAgICAgICAubWFwICAgICggKGVkZ2VJZDogbnVtYmVyKSAgICAgICAgICAgICAgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPT4gdGhpcy5fZWRnZXNbZWRnZUlkXSAgIClcbiAgICAgICAgICAgLmZpbHRlciAoIChvOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pIDogYm9vbGVhbiAgICAgICAgICAgICAgICAgID0+IG8uZnJvbSA9PT0gd2hpY2hTdGF0ZSApXG4gICAgICAgICAgIC5tYXAgICAgKCAoZmlsdGVyZWQ6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPikgOiA/bU5UICAgICAgICAgICAgICA9PiBmaWx0ZXJlZC5hY3Rpb24gICAgICAgKTtcbiAgfVxuXG4gIHByb2JhYmxlX2FjdGlvbl9leGl0cyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkgKSA6IEFycmF5PG1peGVkPiB7IC8vIHRoZXNlIGFyZSBtTlRcbiAgICBjb25zdCByYV9iYXNlOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKCEocmFfYmFzZSkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cblxuICAgIHJldHVybiBbLi4uIHJhX2Jhc2UudmFsdWVzKCldXG4gICAgICAgICAgIC5tYXAgICAgKCAoZWRnZUlkOiBudW1iZXIpOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPT4gdGhpcy5fZWRnZXNbZWRnZUlkXSAgIClcbiAgICAgICAgICAgLmZpbHRlciAoIChvOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pOiBib29sZWFuICAgICA9PiBvLmZyb20gPT09IHdoaWNoU3RhdGUgKVxuICAgICAgICAgICAubWFwICAgICggKGZpbHRlcmVkKTogbWl4ZWQgICAgICAgICAgICAgICAgICAgICAgICAgID0+ICggeyBhY3Rpb24gICAgICA6IGZpbHRlcmVkLmFjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvYmFiaWxpdHkgOiBmaWx0ZXJlZC5wcm9iYWJpbGl0eSB9IClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICB9XG5cblxuXG4gIGlzX3VuZW50ZXJhYmxlKHdoaWNoU3RhdGU6IG1OVCk6IGJvb2xlYW4ge1xuICAgIC8vIHdoYXJnYXJibCBzaG91bGQgdGhyb3cgb24gdW5rbm93biBzdGF0ZVxuICAgIHJldHVybiB0aGlzLmxpc3RfZW50cmFuY2VzKHdoaWNoU3RhdGUpLmxlbmd0aCA9PT0gMDtcbiAgfVxuXG4gIGhhc191bmVudGVyYWJsZXMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpOiBib29sZWFuID0+IHRoaXMuaXNfdW5lbnRlcmFibGUoeCkpO1xuICB9XG5cblxuXG4gIGlzX3Rlcm1pbmFsKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlX2lzX3Rlcm1pbmFsKHRoaXMuc3RhdGUoKSk7XG4gIH1cblxuICBzdGF0ZV9pc190ZXJtaW5hbCh3aGljaFN0YXRlOiBtTlQpOiBib29sZWFuIHtcbiAgICAvLyB3aGFyZ2FyYmwgc2hvdWxkIHRocm93IG9uIHVua25vd24gc3RhdGVcbiAgICByZXR1cm4gdGhpcy5saXN0X2V4aXRzKHdoaWNoU3RhdGUpLmxlbmd0aCA9PT0gMDtcbiAgfVxuXG4gIGhhc190ZXJtaW5hbHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpOiBib29sZWFuID0+IHRoaXMuc3RhdGVfaXNfdGVybWluYWwoeCkpO1xuICB9XG5cblxuXG4gIGlzX2NvbXBsZXRlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHRoaXMuc3RhdGUoKSk7XG4gIH1cblxuICBzdGF0ZV9pc19jb21wbGV0ZSh3aGljaFN0YXRlOiBtTlQpIDogYm9vbGVhbiB7XG4gICAgY29uc3Qgd3N0YXRlOiA/SnNzbUdlbmVyaWNTdGF0ZTxtTlQ+ID0gdGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAod3N0YXRlKSB7IHJldHVybiB3c3RhdGUuY29tcGxldGU7IH1cbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG4gIH1cblxuICBoYXNfY29tcGxldGVzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlcygpLnNvbWUoICh4KTogYm9vbGVhbiA9PiB0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHgpICk7XG4gIH1cblxuXG5cbiAgYWN0aW9uKG5hbWU6IG1OVCwgbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX2FjdGlvbihuYW1lLCBuZXdEYXRhKSkge1xuICAgICAgY29uc3QgZWRnZTogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gdGhpcy5jdXJyZW50X2FjdGlvbl9lZGdlX2ZvcihuYW1lKTtcbiAgICAgIHRoaXMuX3N0YXRlID0gZWRnZS50bztcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgdHJhbnNpdGlvbihuZXdTdGF0ZTogbU5ULCBuZXdEYXRhPzogbURUKTogYm9vbGVhbiB7XG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgaWYgKHRoaXMudmFsaWRfdHJhbnNpdGlvbihuZXdTdGF0ZSwgbmV3RGF0YSkpIHtcbiAgICAgIHRoaXMuX3N0YXRlID0gbmV3U3RhdGU7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8vIGNhbiBsZWF2ZSBtYWNoaW5lIGluIGluY29uc2lzdGVudCBzdGF0ZS4gIGdlbmVyYWxseSBkbyBub3QgdXNlXG4gIGZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGU6IG1OVCwgbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX2ZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGUsIG5ld0RhdGEpKSB7XG4gICAgICB0aGlzLl9zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuXG5cbiAgY3VycmVudF9hY3Rpb25fZm9yKGFjdGlvbjogbU5UKTogbnVtYmVyIHwgdm9pZCB7XG4gICAgY29uc3QgYWN0aW9uX2Jhc2U6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fYWN0aW9ucy5nZXQoYWN0aW9uKTtcbiAgICByZXR1cm4gYWN0aW9uX2Jhc2U/IGFjdGlvbl9iYXNlLmdldCh0aGlzLnN0YXRlKCkpOiB1bmRlZmluZWQ7XG4gIH1cblxuICBjdXJyZW50X2FjdGlvbl9lZGdlX2ZvcihhY3Rpb246IG1OVCk6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiB7XG4gICAgY29uc3QgaWR4OiA/bnVtYmVyID0gdGhpcy5jdXJyZW50X2FjdGlvbl9mb3IoYWN0aW9uKTtcbiAgICBpZiAoKGlkeCA9PT0gdW5kZWZpbmVkKSB8fCAoaWR4ID09PSBudWxsKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggYWN0aW9uICR7SlNPTi5zdHJpbmdpZnkoYWN0aW9uKX1gKTsgfVxuICAgIHJldHVybiB0aGlzLl9lZGdlc1tpZHhdO1xuICB9XG5cbiAgdmFsaWRfYWN0aW9uKGFjdGlvbjogbU5ULCBfbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4geyAgLy8gdG9kbyBjb21lYmFjayB1bmlnbm9yZSBuZXdEYXRhXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgcmV0dXJuIHRoaXMuY3VycmVudF9hY3Rpb25fZm9yKGFjdGlvbikgIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHZhbGlkX3RyYW5zaXRpb24obmV3U3RhdGU6IG1OVCwgX25ld0RhdGE/OiBtRFQpOiBib29sZWFuIHsgIC8vIHRvZG8gY29tZWJhY2sgdW5pZ25vcmUgbmV3RGF0YVxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGNvbnN0IHRyYW5zaXRpb25fZm9yOiA/SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gdGhpcy5sb29rdXBfdHJhbnNpdGlvbl9mb3IodGhpcy5zdGF0ZSgpLCBuZXdTdGF0ZSk7XG5cbiAgICBpZiAoISh0cmFuc2l0aW9uX2ZvcikpICAgICAgICAgIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgaWYgKHRyYW5zaXRpb25fZm9yLmZvcmNlZF9vbmx5KSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfVxuXG4gIHZhbGlkX2ZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGU6IG1OVCwgX25ld0RhdGE/OiBtRFQpOiBib29sZWFuIHsgIC8vIHRvZG8gY29tZWJhY2sgdW5pZ25vcmUgbmV3RGF0YVxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIHJldHVybiAodGhpcy5sb29rdXBfdHJhbnNpdGlvbl9mb3IodGhpcy5zdGF0ZSgpLCBuZXdTdGF0ZSkgIT09IHVuZGVmaW5lZCk7XG4gIH1cblxuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gc208bU5ULCBtRFQ+KHRlbXBsYXRlX3N0cmluZ3M6IEFycmF5PHN0cmluZz4gLyogLCBhcmd1bWVudHMgKi8pOiBNYWNoaW5lPG1OVCwgbURUPiB7XG5cbiAgICAvLyBmb29gYSR7MX1iJHsyfWNgIHdpbGwgY29tZSBpbiBhcyAoWydhJywnYicsJ2MnXSwxLDIpXG4gICAgLy8gdGhpcyBpbmNsdWRlcyB3aGVuIGEgYW5kIGMgYXJlIGVtcHR5IHN0cmluZ3NcbiAgICAvLyB0aGVyZWZvcmUgdGVtcGxhdGVfc3RyaW5ncyB3aWxsIGFsd2F5cyBoYXZlIG9uZSBtb3JlIGVsIHRoYW4gdGVtcGxhdGVfYXJnc1xuICAgIC8vIHRoZXJlZm9yZSBtYXAgdGhlIHNtYWxsZXIgY29udGFpbmVyIGFuZCB0b3NzIHRoZSBsYXN0IG9uZSBvbiBvbiB0aGUgd2F5IG91dFxuXG4gICAgcmV0dXJuIG5ldyBNYWNoaW5lKG1ha2UodGVtcGxhdGVfc3RyaW5ncy5yZWR1Y2UoXG5cbiAgICAgIC8vIGluIGdlbmVyYWwgYXZvaWRpbmcgYGFyZ3VtZW50c2AgaXMgc21hcnQuICBob3dldmVyIHdpdGggdGhlIHRlbXBsYXRlXG4gICAgICAvLyBzdHJpbmcgbm90YXRpb24sIGFzIGRlc2lnbmVkLCBpdCdzIG5vdCByZWFsbHkgd29ydGggdGhlIGhhc3NsZVxuXG4gICAgICAvKiBlc2xpbnQtZGlzYWJsZSBmcC9uby1hcmd1bWVudHMgKi9cbiAgICAgIC8qIGVzbGludC1kaXNhYmxlIHByZWZlci1yZXN0LXBhcmFtcyAqL1xuICAgICAgKGFjYywgdmFsLCBpZHgpOiBzdHJpbmcgPT4gYCR7YWNjfSR7YXJndW1lbnRzW2lkeF19JHt2YWx9YCAgLy8gYXJndW1lbnRzWzBdIGlzIG5ldmVyIGxvYWRlZCwgc28gYXJncyBkb2Vzbid0IG5lZWQgdG8gYmUgZ2F0ZWRcbiAgICAgIC8qIGVzbGludC1lbmFibGUgIHByZWZlci1yZXN0LXBhcmFtcyAqL1xuICAgICAgLyogZXNsaW50LWVuYWJsZSAgZnAvbm8tYXJndW1lbnRzICovXG5cbiAgICApKSk7XG5cbn1cblxuXG5cblxuXG5leHBvcnQge1xuXG4gIHZlcnNpb24sXG5cbiAgTWFjaGluZSxcblxuICBtYWtlLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG5cbiAgc20sXG5cbiAgYXJyb3dfZGlyZWN0aW9uLFxuICBhcnJvd19sZWZ0X2tpbmQsXG4gIGFycm93X3JpZ2h0X2tpbmQsXG5cbiAgLy8gdG9kbyB3aGFyZ2FyYmwgdGhlc2Ugc2hvdWxkIGJlIGV4cG9ydGVkIHRvIGEgdXRpbGl0eSBsaWJyYXJ5XG4gIHNlcSwgd2VpZ2h0ZWRfcmFuZF9zZWxlY3QsIGhpc3RvZ3JhcGgsIHdlaWdodGVkX3NhbXBsZV9zZWxlY3QsIHdlaWdodGVkX2hpc3RvX2tleVxuXG59O1xuIl19