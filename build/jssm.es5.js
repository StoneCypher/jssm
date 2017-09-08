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

var version = '5.7.0'; // replaced from package.js in build


function arrow_direction(arrow) {

  switch (String(arrow)) {

    case '->':case '=>':case '~>':
      return 'right';

    case '<-':case '<=':case '<~':
      return 'left';

    case '<->':case '<-=>':case '<-~>':
    case '<=>':case '<=->':case '<=~>':
    case '<~>':case '<~->':case '<~=>':
      return 'both';

    default:
      throw new Error('arrow_direction: unknown arrow type ' + arrow);

  }
}

function arrow_left_kind(arrow) {

  switch (String(arrow)) {

    case '->':case '=>':case '~>':
      return 'none';

    case '<-':case '<->':case '<-=>':case '<-~>':
      return 'legal';

    case '<=':case '<=>':case '<=->':case '<=~>':
      return 'main';

    case '<~':case '<~>':case '<~->':case '<~=>':
      return 'forced';

    default:
      throw new Error('arrow_direction: unknown arrow type ' + arrow);

  }
}

function arrow_right_kind(arrow) {

  switch (String(arrow)) {

    case '<-':case '<=':case '<~':
      return 'none';

    case '->':case '<->':case '<=->':case '<~->':
      return 'legal';

    case '=>':case '<=>':case '<-=>':case '<~=>':
      return 'main';

    case '~>':case '<~>':case '<-~>':case '<=~>':
      return 'forced';

    default:
      throw new Error('arrow_direction: unknown arrow type ' + arrow);

  }
}

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLmpzIl0sIm5hbWVzIjpbInBhcnNlIiwicmVxdWlyZSIsInZlcnNpb24iLCJhcnJvd19kaXJlY3Rpb24iLCJhcnJvdyIsIlN0cmluZyIsIkVycm9yIiwiYXJyb3dfbGVmdF9raW5kIiwiYXJyb3dfcmlnaHRfa2luZCIsImNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXAiLCJhY2MiLCJmcm9tIiwidG8iLCJ0aGlzX3NlIiwibmV4dF9zZSIsImVkZ2VzIiwidUZyb20iLCJBcnJheSIsImlzQXJyYXkiLCJ1VG8iLCJtYXAiLCJmIiwidCIsInJrIiwia2luZCIsImxrIiwicmlnaHQiLCJmb3JjZWRfb25seSIsIm1haW5fcGF0aCIsInJfYWN0aW9uIiwiYWN0aW9uIiwicl9wcm9iYWJpbGl0eSIsInByb2JhYmlsaXR5IiwicHVzaCIsImxlZnQiLCJsX2FjdGlvbiIsImxfcHJvYmFiaWxpdHkiLCJuZXdfYWNjIiwiY29uY2F0Iiwic2UiLCJjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb24iLCJydWxlIiwiY29tcGlsZV9ydWxlX2hhbmRsZXIiLCJrZXkiLCJhZ2dfYXMiLCJ2YWwiLCJ0YXV0b2xvZ2llcyIsImluY2x1ZGVzIiwidmFsdWUiLCJKU09OIiwic3RyaW5naWZ5IiwiY29tcGlsZSIsInRyZWUiLCJyZXN1bHRzIiwiZ3JhcGhfbGF5b3V0IiwidHJhbnNpdGlvbiIsInN0YXJ0X3N0YXRlcyIsImVuZF9zdGF0ZXMiLCJmc2xfdmVyc2lvbiIsIm1hY2hpbmVfYXV0aG9yIiwibWFjaGluZV9jb21tZW50IiwibWFjaGluZV9jb250cmlidXRvciIsIm1hY2hpbmVfZGVmaW5pdGlvbiIsIm1hY2hpbmVfbGljZW5zZSIsIm1hY2hpbmVfbmFtZSIsIm1hY2hpbmVfcmVmZXJlbmNlIiwibWFjaGluZV92ZXJzaW9uIiwidHIiLCJhc3NlbWJsZWRfdHJhbnNpdGlvbnMiLCJyZXN1bHRfY2ZnIiwibGVuZ3RoIiwidHJhbnNpdGlvbnMiLCJvbmVPbmx5S2V5cyIsIm9uZU9ubHlLZXkiLCJtdWx0aUtleSIsIm1ha2UiLCJwbGFuIiwiTWFjaGluZSIsImNvbXBsZXRlIiwiX3N0YXRlIiwiX3N0YXRlcyIsIk1hcCIsIl9lZGdlcyIsIl9lZGdlX21hcCIsIl9uYW1lZF90cmFuc2l0aW9ucyIsIl9hY3Rpb25zIiwiX3JldmVyc2VfYWN0aW9ucyIsIl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzIiwiX21hY2hpbmVfYXV0aG9yIiwiX21hY2hpbmVfY29tbWVudCIsIl9tYWNoaW5lX2NvbnRyaWJ1dG9yIiwiX21hY2hpbmVfZGVmaW5pdGlvbiIsIl9tYWNoaW5lX2xpY2Vuc2UiLCJfbWFjaGluZV9uYW1lIiwiX21hY2hpbmVfdmVyc2lvbiIsIl9mc2xfdmVyc2lvbiIsIl9ncmFwaF9sYXlvdXQiLCJ1bmRlZmluZWQiLCJjdXJzb3JfZnJvbSIsImdldCIsIm5hbWUiLCJoYXMiLCJfbmV3X3N0YXRlIiwiY3Vyc29yX3RvIiwidGhpc0VkZ2VJZCIsInNldCIsImZyb21fbWFwcGluZyIsImFjdGlvbk1hcCIsInJBY3Rpb25NYXAiLCJzdGF0ZV9jb25maWciLCJ3aGljaFN0YXRlIiwic3RhdGVfaXNfdGVybWluYWwiLCJzdGF0ZV9pc19jb21wbGV0ZSIsInN0YXRlX2lzX2ZpbmFsIiwic3RhdGUiLCJpbnRlcm5hbF9zdGF0ZV9pbXBsX3ZlcnNpb24iLCJhY3Rpb25zIiwiZWRnZV9tYXAiLCJuYW1lZF90cmFuc2l0aW9ucyIsInJldmVyc2VfYWN0aW9ucyIsInN0YXRlcyIsImtleXMiLCJlbWciLCJpZCIsImdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzIiwiZW50cmFuY2VzIiwibGlzdF9lbnRyYW5jZXMiLCJleGl0cyIsImxpc3RfZXhpdHMiLCJ3c3RhdGUiLCJ3c3RhdGVfdG8iLCJ3dGYiLCJ3cyIsImxvb2t1cF90cmFuc2l0aW9uX2ZvciIsImZpbHRlciIsIkJvb2xlYW4iLCJzZWxlY3RlZCIsInByb2JhYmxlX2V4aXRzX2ZvciIsIm4iLCJzdGF0ZV93YXMiLCJwcm9iYWJpbGlzdGljX3RyYW5zaXRpb24iLCJwcm9iYWJpbGlzdGljX3dhbGsiLCJyYV9iYXNlIiwidmFsdWVzIiwiZWRnZUlkIiwibyIsImZpbHRlcmVkIiwic29tZSIsIngiLCJpc191bmVudGVyYWJsZSIsIm5ld0RhdGEiLCJ2YWxpZF9hY3Rpb24iLCJlZGdlIiwiY3VycmVudF9hY3Rpb25fZWRnZV9mb3IiLCJuZXdTdGF0ZSIsInZhbGlkX3RyYW5zaXRpb24iLCJ2YWxpZF9mb3JjZV90cmFuc2l0aW9uIiwiYWN0aW9uX2Jhc2UiLCJpZHgiLCJjdXJyZW50X2FjdGlvbl9mb3IiLCJfbmV3RGF0YSIsInRyYW5zaXRpb25fZm9yIiwic20iLCJ0ZW1wbGF0ZV9zdHJpbmdzIiwicmVkdWNlIiwic2VxIiwid2VpZ2h0ZWRfcmFuZF9zZWxlY3QiLCJoaXN0b2dyYXBoIiwid2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCIsIndlaWdodGVkX2hpc3RvX2tleSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBcUJBOzs7Ozs7QUFwQkE7O0FBc0JBLElBQU1BLFFBQWdEQyxRQUFRLGVBQVIsRUFBeUJELEtBQS9FLEMsQ0FBdUY7O0FBRXZGLElBQU1FLFVBQWlCLElBQXZCLEMsQ0FBNkI7OztBQU03QixTQUFTQyxlQUFULENBQXlCQyxLQUF6QixFQUFpRTs7QUFFL0QsVUFBU0MsT0FBT0QsS0FBUCxDQUFUOztBQUVFLFNBQUssSUFBTCxDQUFhLEtBQUssSUFBTCxDQUFjLEtBQUssSUFBTDtBQUN6QixhQUFPLE9BQVA7O0FBRUYsU0FBSyxJQUFMLENBQWEsS0FBSyxJQUFMLENBQWMsS0FBSyxJQUFMO0FBQ3pCLGFBQU8sTUFBUDs7QUFFRixTQUFLLEtBQUwsQ0FBYSxLQUFLLE1BQUwsQ0FBYyxLQUFLLE1BQUw7QUFDM0IsU0FBSyxLQUFMLENBQWEsS0FBSyxNQUFMLENBQWMsS0FBSyxNQUFMO0FBQzNCLFNBQUssS0FBTCxDQUFhLEtBQUssTUFBTCxDQUFjLEtBQUssTUFBTDtBQUN6QixhQUFPLE1BQVA7O0FBRUY7QUFDRSxZQUFNLElBQUlFLEtBQUosMENBQWlERixLQUFqRCxDQUFOOztBQWRKO0FBa0JEOztBQU1ELFNBQVNHLGVBQVQsQ0FBeUJILEtBQXpCLEVBQTREOztBQUUxRCxVQUFTQyxPQUFPRCxLQUFQLENBQVQ7O0FBRUUsU0FBSyxJQUFMLENBQVksS0FBSyxJQUFMLENBQWEsS0FBSyxJQUFMO0FBQ3ZCLGFBQU8sTUFBUDs7QUFFRixTQUFLLElBQUwsQ0FBWSxLQUFLLEtBQUwsQ0FBYSxLQUFLLE1BQUwsQ0FBYyxLQUFLLE1BQUw7QUFDckMsYUFBTyxPQUFQOztBQUVGLFNBQUssSUFBTCxDQUFZLEtBQUssS0FBTCxDQUFhLEtBQUssTUFBTCxDQUFjLEtBQUssTUFBTDtBQUNyQyxhQUFPLE1BQVA7O0FBRUYsU0FBSyxJQUFMLENBQVksS0FBSyxLQUFMLENBQWEsS0FBSyxNQUFMLENBQWMsS0FBSyxNQUFMO0FBQ3JDLGFBQU8sUUFBUDs7QUFFRjtBQUNFLFlBQU0sSUFBSUUsS0FBSiwwQ0FBaURGLEtBQWpELENBQU47O0FBZko7QUFtQkQ7O0FBTUQsU0FBU0ksZ0JBQVQsQ0FBMEJKLEtBQTFCLEVBQTZEOztBQUUzRCxVQUFTQyxPQUFPRCxLQUFQLENBQVQ7O0FBRUUsU0FBSyxJQUFMLENBQVksS0FBSyxJQUFMLENBQWEsS0FBSyxJQUFMO0FBQ3ZCLGFBQU8sTUFBUDs7QUFFRixTQUFLLElBQUwsQ0FBWSxLQUFLLEtBQUwsQ0FBYSxLQUFLLE1BQUwsQ0FBYyxLQUFLLE1BQUw7QUFDckMsYUFBTyxPQUFQOztBQUVGLFNBQUssSUFBTCxDQUFZLEtBQUssS0FBTCxDQUFhLEtBQUssTUFBTCxDQUFjLEtBQUssTUFBTDtBQUNyQyxhQUFPLE1BQVA7O0FBRUYsU0FBSyxJQUFMLENBQVksS0FBSyxLQUFMLENBQWEsS0FBSyxNQUFMLENBQWMsS0FBSyxNQUFMO0FBQ3JDLGFBQU8sUUFBUDs7QUFFRjtBQUNFLFlBQU0sSUFBSUUsS0FBSiwwQ0FBaURGLEtBQWpELENBQU47O0FBZko7QUFtQkQ7O0FBTUQsU0FBU0ssNEJBQVQsQ0FDYUMsR0FEYixFQUVhQyxJQUZiLEVBR2FDLEVBSGIsRUFJYUMsT0FKYixFQUthQyxPQUxiLEVBTStDO0FBQUU7O0FBRS9DLE1BQU1DLFFBQTRDLEVBQWxEOztBQUVBLE1BQU1DLFFBQXdCQyxNQUFNQyxPQUFOLENBQWNQLElBQWQsSUFBcUJBLElBQXJCLEdBQTRCLENBQUNBLElBQUQsQ0FBMUQ7QUFBQSxNQUNNUSxNQUF3QkYsTUFBTUMsT0FBTixDQUFjTixFQUFkLElBQXFCQSxFQUFyQixHQUE0QixDQUFDQSxFQUFELENBRDFEOztBQUdBSSxRQUFNSSxHQUFOLENBQVcsVUFBQ0MsQ0FBRCxFQUFXO0FBQ3BCRixRQUFJQyxHQUFKLENBQVMsVUFBQ0UsQ0FBRCxFQUFXOztBQUVsQixVQUFNQyxLQUFxQmYsaUJBQWlCSyxRQUFRVyxJQUF6QixDQUEzQjtBQUFBLFVBQ01DLEtBQXFCbEIsZ0JBQWdCTSxRQUFRVyxJQUF4QixDQUQzQjs7QUFJQSxVQUFNRSxRQUFtQztBQUN2Q2YsY0FBY1UsQ0FEeUI7QUFFdkNULFlBQWNVLENBRnlCO0FBR3ZDRSxjQUFjRCxFQUh5QjtBQUl2Q0kscUJBQWNKLE9BQU8sUUFKa0I7QUFLdkNLLG1CQUFjTCxPQUFPO0FBTGtCLE9BQXpDOztBQVFBLFVBQUlWLFFBQVFnQixRQUFaLEVBQTJCO0FBQUVILGNBQU1JLE1BQU4sR0FBb0JqQixRQUFRZ0IsUUFBNUI7QUFBNEM7QUFDekUsVUFBSWhCLFFBQVFrQixhQUFaLEVBQTJCO0FBQUVMLGNBQU1NLFdBQU4sR0FBb0JuQixRQUFRa0IsYUFBNUI7QUFBNEM7QUFDekUsVUFBSUwsTUFBTUYsSUFBTixLQUFlLE1BQW5CLEVBQTJCO0FBQUVULGNBQU1rQixJQUFOLENBQVdQLEtBQVg7QUFBb0I7O0FBR2pELFVBQU1RLE9BQWtDO0FBQ3RDdkIsY0FBY1csQ0FEd0I7QUFFdENWLFlBQWNTLENBRndCO0FBR3RDRyxjQUFjQyxFQUh3QjtBQUl0Q0UscUJBQWNGLE9BQU8sUUFKaUI7QUFLdENHLG1CQUFjSCxPQUFPO0FBTGlCLE9BQXhDOztBQVFBLFVBQUlaLFFBQVFzQixRQUFaLEVBQTJCO0FBQUVELGFBQUtKLE1BQUwsR0FBbUJqQixRQUFRc0IsUUFBM0I7QUFBMkM7QUFDeEUsVUFBSXRCLFFBQVF1QixhQUFaLEVBQTJCO0FBQUVGLGFBQUtGLFdBQUwsR0FBbUJuQixRQUFRdUIsYUFBM0I7QUFBMkM7QUFDeEUsVUFBSUYsS0FBS1YsSUFBTCxLQUFjLE1BQWxCLEVBQTJCO0FBQUVULGNBQU1rQixJQUFOLENBQVdDLElBQVg7QUFBbUI7QUFFakQsS0EvQkQ7QUFnQ0QsR0FqQ0Q7O0FBbUNBLE1BQU1HLFVBQThDM0IsSUFBSTRCLE1BQUosQ0FBV3ZCLEtBQVgsQ0FBcEQ7O0FBRUEsTUFBSUQsT0FBSixFQUFhO0FBQ1gsV0FBT0wsNkJBQTZCNEIsT0FBN0IsRUFBc0N6QixFQUF0QyxFQUEwQ0UsUUFBUUYsRUFBbEQsRUFBc0RFLE9BQXRELEVBQStEQSxRQUFReUIsRUFBdkUsQ0FBUDtBQUNELEdBRkQsTUFFTztBQUNMLFdBQU9GLE9BQVA7QUFDRDtBQUVGOztBQUlELFNBQVNHLDhCQUFULENBQTZDQyxJQUE3QyxFQUFxRjtBQUFFO0FBQ3JGLFNBQU9oQyw2QkFBNkIsRUFBN0IsRUFBaUNnQyxLQUFLOUIsSUFBdEMsRUFBNEM4QixLQUFLRixFQUFMLENBQVEzQixFQUFwRCxFQUF3RDZCLEtBQUtGLEVBQTdELEVBQWlFRSxLQUFLRixFQUFMLENBQVFBLEVBQXpFLENBQVA7QUFDRDs7QUFJRCxTQUFTRyxvQkFBVCxDQUFtQ0QsSUFBbkMsRUFBcUY7QUFBRTs7QUFFckYsTUFBSUEsS0FBS0UsR0FBTCxLQUFhLFlBQWpCLEVBQStCO0FBQUUsV0FBTyxFQUFFQyxRQUFRLFlBQVYsRUFBd0JDLEtBQUtMLCtCQUErQkMsSUFBL0IsQ0FBN0IsRUFBUDtBQUE2RTs7QUFFOUcsTUFBTUssY0FBOEIsQ0FDbEMsY0FEa0MsRUFDbEIsY0FEa0IsRUFDRixZQURFLEVBQ1ksY0FEWixFQUM0QixpQkFENUIsRUFFbEMsaUJBRmtDLEVBRWYsZ0JBRmUsRUFFRyxxQkFGSCxFQUUwQixvQkFGMUIsRUFHbEMsbUJBSGtDLEVBR2IsaUJBSGEsRUFHTSxhQUhOLENBQXBDOztBQU1BLE1BQUlBLFlBQVlDLFFBQVosQ0FBcUJOLEtBQUtFLEdBQTFCLENBQUosRUFBb0M7QUFDbEMsV0FBTyxFQUFFQyxRQUFRSCxLQUFLRSxHQUFmLEVBQW9CRSxLQUFLSixLQUFLTyxLQUE5QixFQUFQO0FBQ0Q7O0FBRUQsUUFBTSxJQUFJMUMsS0FBSiwwQ0FBaUQyQyxLQUFLQyxTQUFMLENBQWVULElBQWYsQ0FBakQsQ0FBTjtBQUVEOztBQU1ELFNBQVNVLE9BQVQsQ0FBMkJDLElBQTNCLEVBQW9GO0FBQUE7O0FBQUc7O0FBRXJGLE1BQU1DLFVBY0Y7QUFDRkMsa0JBQXNCLEVBRHBCO0FBRUZDLGdCQUFzQixFQUZwQjtBQUdGQyxrQkFBc0IsRUFIcEI7QUFJRkMsZ0JBQXNCLEVBSnBCO0FBS0ZDLGlCQUFzQixFQUxwQjtBQU1GQyxvQkFBc0IsRUFOcEI7QUFPRkMscUJBQXNCLEVBUHBCO0FBUUZDLHlCQUFzQixFQVJwQjtBQVNGQyx3QkFBc0IsRUFUcEI7QUFVRkMscUJBQXNCLEVBVnBCO0FBV0ZDLGtCQUFzQixFQVhwQjtBQVlGQyx1QkFBc0IsRUFacEI7QUFhRkMscUJBQXNCO0FBYnBCLEdBZEo7O0FBOEJBZCxPQUFLaEMsR0FBTCxDQUFVLFVBQUMrQyxFQUFELEVBQWtDOztBQUUxQyxRQUFNMUIsT0FBMkJDLHFCQUFxQnlCLEVBQXJCLENBQWpDO0FBQUEsUUFDTXZCLFNBQTJCSCxLQUFLRyxNQUR0QztBQUFBLFFBRU1DLE1BQTJCSixLQUFLSSxHQUZ0QyxDQUYwQyxDQUlrQjs7QUFFNURRLFlBQVFULE1BQVIsSUFBa0JTLFFBQVFULE1BQVIsRUFBZ0JOLE1BQWhCLENBQXVCTyxHQUF2QixDQUFsQjtBQUVELEdBUkQ7O0FBVUEsTUFBTXVCLHdCQUE0RCxZQUFHOUIsTUFBSCxnQ0FBY2UsUUFBUSxZQUFSLENBQWQsRUFBbEU7O0FBRUEsTUFBTWdCLGFBQTJDO0FBQy9DYixrQkFBZUgsUUFBUUcsWUFBUixDQUFxQmMsTUFBckIsR0FBNkJqQixRQUFRRyxZQUFyQyxHQUFvRCxDQUFDWSxzQkFBc0IsQ0FBdEIsRUFBeUJ6RCxJQUExQixDQURwQjtBQUUvQzRELGlCQUFlSDtBQUZnQyxHQUFqRDs7QUFLQSxNQUFNSSxjQUE4QixDQUNsQyxjQURrQyxFQUNsQixjQURrQixFQUNGLGlCQURFLEVBQ2lCLGlCQURqQixFQUNvQyxhQURwQyxFQUNtRCxpQkFEbkQsRUFFbEMsb0JBRmtDLENBQXBDOztBQUtBQSxjQUFZcEQsR0FBWixDQUFpQixVQUFDcUQsVUFBRCxFQUF5QjtBQUN4QyxRQUFJcEIsUUFBUW9CLFVBQVIsRUFBb0JILE1BQXBCLEdBQTZCLENBQWpDLEVBQW9DO0FBQ2xDLFlBQU0sSUFBSWhFLEtBQUosd0JBQStCbUUsVUFBL0IsNEJBQWdFeEIsS0FBS0MsU0FBTCxDQUFlRyxRQUFRb0IsVUFBUixDQUFmLENBQWhFLENBQU47QUFDRCxLQUZELE1BRU87QUFDTCxVQUFJcEIsUUFBUW9CLFVBQVIsRUFBb0JILE1BQXhCLEVBQWdDO0FBQzlCRCxtQkFBV0ksVUFBWCxJQUF5QnBCLFFBQVFvQixVQUFSLEVBQW9CLENBQXBCLENBQXpCO0FBQ0Q7QUFDRjtBQUNGLEdBUkQ7O0FBVUEsR0FBQyxnQkFBRCxFQUFtQixxQkFBbkIsRUFBMEMsbUJBQTFDLEVBQStEckQsR0FBL0QsQ0FBb0UsVUFBQ3NELFFBQUQsRUFBdUI7QUFDekYsUUFBSXJCLFFBQVFxQixRQUFSLEVBQWtCSixNQUF0QixFQUE4QjtBQUM1QkQsaUJBQVdLLFFBQVgsSUFBdUJyQixRQUFRcUIsUUFBUixDQUF2QjtBQUNEO0FBQ0YsR0FKRDs7QUFNQSxTQUFPTCxVQUFQO0FBRUQ7O0FBTUQsU0FBU00sSUFBVCxDQUF3QkMsSUFBeEIsRUFBcUU7QUFDbkUsU0FBT3pCLFFBQVFuRCxNQUFNNEUsSUFBTixDQUFSLENBQVA7QUFDRDs7SUFNS0MsTzs7QUF3Qko7QUFDQSwwQkFhaUM7QUFBQTs7QUFBQSxRQVovQnJCLFlBWStCLFNBWi9CQSxZQVkrQjtBQUFBLCtCQVgvQnNCLFFBVytCO0FBQUEsUUFYL0JBLFFBVytCLGtDQVhiLEVBV2E7QUFBQSxRQVYvQlAsV0FVK0IsU0FWL0JBLFdBVStCO0FBQUEsUUFUL0JaLGNBUytCLFNBVC9CQSxjQVMrQjtBQUFBLFFBUi9CQyxlQVErQixTQVIvQkEsZUFRK0I7QUFBQSxRQVAvQkMsbUJBTytCLFNBUC9CQSxtQkFPK0I7QUFBQSxRQU4vQkMsa0JBTStCLFNBTi9CQSxrQkFNK0I7QUFBQSxRQUwvQkMsZUFLK0IsU0FML0JBLGVBSytCO0FBQUEsUUFKL0JDLFlBSStCLFNBSi9CQSxZQUkrQjtBQUFBLFFBSC9CRSxlQUcrQixTQUgvQkEsZUFHK0I7QUFBQSxRQUYvQlIsV0FFK0IsU0FGL0JBLFdBRStCO0FBQUEsbUNBRC9CSixZQUMrQjtBQUFBLFFBRC9CQSxZQUMrQixzQ0FEaEIsS0FDZ0I7O0FBQUE7O0FBRS9CLFNBQUt5QixNQUFMLEdBQStCdkIsYUFBYSxDQUFiLENBQS9CO0FBQ0EsU0FBS3dCLE9BQUwsR0FBK0IsSUFBSUMsR0FBSixFQUEvQjtBQUNBLFNBQUtDLE1BQUwsR0FBK0IsRUFBL0I7QUFDQSxTQUFLQyxTQUFMLEdBQStCLElBQUlGLEdBQUosRUFBL0I7QUFDQSxTQUFLRyxrQkFBTCxHQUErQixJQUFJSCxHQUFKLEVBQS9CO0FBQ0EsU0FBS0ksUUFBTCxHQUErQixJQUFJSixHQUFKLEVBQS9CO0FBQ0EsU0FBS0ssZ0JBQUwsR0FBK0IsSUFBSUwsR0FBSixFQUEvQjtBQUNBLFNBQUtNLHVCQUFMLEdBQStCLElBQUlOLEdBQUosRUFBL0IsQ0FUK0IsQ0FTYTs7QUFFNUMsU0FBS08sZUFBTCxHQUErQjdCLGNBQS9CO0FBQ0EsU0FBSzhCLGdCQUFMLEdBQStCN0IsZUFBL0I7QUFDQSxTQUFLOEIsb0JBQUwsR0FBK0I3QixtQkFBL0I7QUFDQSxTQUFLOEIsbUJBQUwsR0FBK0I3QixrQkFBL0I7QUFDQSxTQUFLOEIsZ0JBQUwsR0FBK0I3QixlQUEvQjtBQUNBLFNBQUs4QixhQUFMLEdBQStCN0IsWUFBL0I7QUFDQSxTQUFLOEIsZ0JBQUwsR0FBK0I1QixlQUEvQjtBQUNBLFNBQUs2QixZQUFMLEdBQStCckMsV0FBL0I7O0FBRUEsU0FBS3NDLGFBQUwsR0FBK0IxQyxZQUEvQjs7QUFFQWlCLGdCQUFZbkQsR0FBWixDQUFpQixVQUFDK0MsRUFBRCxFQUFpQzs7QUFFaEQsVUFBSUEsR0FBR3hELElBQUgsS0FBWXNGLFNBQWhCLEVBQTJCO0FBQUUsY0FBTSxJQUFJM0YsS0FBSix1Q0FBNEMyQyxLQUFLQyxTQUFMLENBQWVpQixFQUFmLENBQTVDLENBQU47QUFBMEU7QUFDdkcsVUFBSUEsR0FBR3ZELEVBQUgsS0FBWXFGLFNBQWhCLEVBQTJCO0FBQUUsY0FBTSxJQUFJM0YsS0FBSixxQ0FBNEMyQyxLQUFLQyxTQUFMLENBQWVpQixFQUFmLENBQTVDLENBQU47QUFBMEU7O0FBRXZHO0FBQ0EsVUFBTStCLGNBQ0EsTUFBS2xCLE9BQUwsQ0FBYW1CLEdBQWIsQ0FBaUJoQyxHQUFHeEQsSUFBcEIsS0FDQSxFQUFFeUYsTUFBTWpDLEdBQUd4RCxJQUFYLEVBQWlCQSxNQUFNLEVBQXZCLEVBQTJCQyxJQUFJLEVBQS9CLEVBQW1Da0UsVUFBVUEsU0FBUy9CLFFBQVQsQ0FBa0JvQixHQUFHeEQsSUFBckIsQ0FBN0MsRUFGTjs7QUFJQSxVQUFJLENBQUUsTUFBS3FFLE9BQUwsQ0FBYXFCLEdBQWIsQ0FBaUJsQyxHQUFHeEQsSUFBcEIsQ0FBTixFQUFrQztBQUNoQyxjQUFLMkYsVUFBTCxDQUFnQkosV0FBaEI7QUFDRDs7QUFFRCxVQUFNSyxZQUNBLE1BQUt2QixPQUFMLENBQWFtQixHQUFiLENBQWlCaEMsR0FBR3ZELEVBQXBCLEtBQ0EsRUFBQ3dGLE1BQU1qQyxHQUFHdkQsRUFBVixFQUFjRCxNQUFNLEVBQXBCLEVBQXdCQyxJQUFJLEVBQTVCLEVBQWdDa0UsVUFBVUEsU0FBUy9CLFFBQVQsQ0FBa0JvQixHQUFHdkQsRUFBckIsQ0FBMUMsRUFGTjs7QUFJQSxVQUFJLENBQUUsTUFBS29FLE9BQUwsQ0FBYXFCLEdBQWIsQ0FBaUJsQyxHQUFHdkQsRUFBcEIsQ0FBTixFQUFnQztBQUM5QixjQUFLMEYsVUFBTCxDQUFnQkMsU0FBaEI7QUFDRDs7QUFFRDtBQUNBLFVBQUlMLFlBQVl0RixFQUFaLENBQWVtQyxRQUFmLENBQXdCb0IsR0FBR3ZELEVBQTNCLENBQUosRUFBb0M7QUFDbEMsY0FBTSxJQUFJTixLQUFKLGtCQUF5QjJDLEtBQUtDLFNBQUwsQ0FBZWlCLEdBQUd4RCxJQUFsQixDQUF6QixZQUF1RHNDLEtBQUtDLFNBQUwsQ0FBZWlCLEdBQUd2RCxFQUFsQixDQUF2RCxDQUFOO0FBQ0QsT0FGRCxNQUVPO0FBQ0xzRixvQkFBWXRGLEVBQVosQ0FBZXFCLElBQWYsQ0FBb0JrQyxHQUFHdkQsRUFBdkI7QUFDQTJGLGtCQUFVNUYsSUFBVixDQUFlc0IsSUFBZixDQUFvQmtDLEdBQUd4RCxJQUF2QjtBQUNEOztBQUVEO0FBQ0EsWUFBS3VFLE1BQUwsQ0FBWWpELElBQVosQ0FBaUJrQyxFQUFqQjtBQUNBLFVBQU1xQyxhQUFzQixNQUFLdEIsTUFBTCxDQUFZWixNQUFaLEdBQXFCLENBQWpEOztBQUVBO0FBQ0EsVUFBSUgsR0FBR2lDLElBQVAsRUFBYTtBQUNYLFlBQUksTUFBS2hCLGtCQUFMLENBQXdCaUIsR0FBeEIsQ0FBNEJsQyxHQUFHaUMsSUFBL0IsQ0FBSixFQUEwQztBQUN4QyxnQkFBTSxJQUFJOUYsS0FBSix3QkFBK0IyQyxLQUFLQyxTQUFMLENBQWVpQixHQUFHaUMsSUFBbEIsQ0FBL0IsdUJBQU47QUFDRCxTQUZELE1BRU87QUFDTCxnQkFBS2hCLGtCQUFMLENBQXdCcUIsR0FBeEIsQ0FBNEJ0QyxHQUFHaUMsSUFBL0IsRUFBcUNJLFVBQXJDO0FBQ0Q7QUFDRjs7QUFFRDtBQUNBLFVBQU1FLGVBQWtDLE1BQUt2QixTQUFMLENBQWVnQixHQUFmLENBQW1CaEMsR0FBR3hELElBQXRCLEtBQStCLElBQUlzRSxHQUFKLEVBQXZFO0FBQ0EsVUFBSSxDQUFFLE1BQUtFLFNBQUwsQ0FBZWtCLEdBQWYsQ0FBbUJsQyxHQUFHeEQsSUFBdEIsQ0FBTixFQUFvQztBQUNsQyxjQUFLd0UsU0FBTCxDQUFlc0IsR0FBZixDQUFtQnRDLEdBQUd4RCxJQUF0QixFQUE0QitGLFlBQTVCO0FBQ0Q7O0FBRVA7QUFDTUEsbUJBQWFELEdBQWIsQ0FBaUJ0QyxHQUFHdkQsRUFBcEIsRUFBd0I0RixVQUF4QixFQWxEZ0QsQ0FrRFg7O0FBRXJDO0FBQ0EsVUFBSXJDLEdBQUdyQyxNQUFQLEVBQWU7O0FBR2I7QUFDQSxZQUFJNkUsWUFBZ0MsTUFBS3RCLFFBQUwsQ0FBY2MsR0FBZCxDQUFrQmhDLEdBQUdyQyxNQUFyQixDQUFwQztBQUNBLFlBQUksQ0FBRTZFLFNBQU4sRUFBa0I7QUFDaEJBLHNCQUFZLElBQUkxQixHQUFKLEVBQVo7QUFDQSxnQkFBS0ksUUFBTCxDQUFjb0IsR0FBZCxDQUFrQnRDLEdBQUdyQyxNQUFyQixFQUE2QjZFLFNBQTdCO0FBQ0Q7O0FBRUQsWUFBSUEsVUFBVU4sR0FBVixDQUFjbEMsR0FBR3hELElBQWpCLENBQUosRUFBNEI7QUFDMUIsZ0JBQU0sSUFBSUwsS0FBSixhQUFvQjJDLEtBQUtDLFNBQUwsQ0FBZWlCLEdBQUdyQyxNQUFsQixDQUFwQixvQ0FBNEVtQixLQUFLQyxTQUFMLENBQWVpQixHQUFHeEQsSUFBbEIsQ0FBNUUsQ0FBTjtBQUNELFNBRkQsTUFFTztBQUNMZ0csb0JBQVVGLEdBQVYsQ0FBY3RDLEdBQUd4RCxJQUFqQixFQUF1QjZGLFVBQXZCO0FBQ0Q7O0FBR0Q7QUFDQSxZQUFJSSxhQUFpQyxNQUFLdEIsZ0JBQUwsQ0FBc0JhLEdBQXRCLENBQTBCaEMsR0FBR3hELElBQTdCLENBQXJDO0FBQ0EsWUFBSSxDQUFFaUcsVUFBTixFQUFtQjtBQUNqQkEsdUJBQWEsSUFBSTNCLEdBQUosRUFBYjtBQUNBLGdCQUFLSyxnQkFBTCxDQUFzQm1CLEdBQXRCLENBQTBCdEMsR0FBR3hELElBQTdCLEVBQW1DaUcsVUFBbkM7QUFDRDs7QUFFRDtBQUNBO0FBQ0FBLG1CQUFXSCxHQUFYLENBQWV0QyxHQUFHckMsTUFBbEIsRUFBMEIwRSxVQUExQjs7QUFHQTtBQUNBLFlBQUksQ0FBRSxNQUFLakIsdUJBQUwsQ0FBNkJjLEdBQTdCLENBQWlDbEMsR0FBR3ZELEVBQXBDLENBQU4sRUFBZ0Q7QUFDOUMsZ0JBQUsyRSx1QkFBTCxDQUE2QmtCLEdBQTdCLENBQWlDdEMsR0FBR3ZELEVBQXBDLEVBQXdDLElBQUlxRSxHQUFKLEVBQXhDO0FBQ0Q7O0FBRVQ7Ozs7Ozs7Ozs7Ozs7QUFhTztBQUVGLEtBdEdEO0FBd0dEOzs7OytCQUVVNEIsWSxFQUE0QztBQUFFOztBQUV2RCxVQUFJLEtBQUs3QixPQUFMLENBQWFxQixHQUFiLENBQWlCUSxhQUFhVCxJQUE5QixDQUFKLEVBQXlDO0FBQ3ZDLGNBQU0sSUFBSTlGLEtBQUosWUFBbUIyQyxLQUFLQyxTQUFMLENBQWUyRCxhQUFhVCxJQUE1QixDQUFuQixxQkFBTjtBQUNEOztBQUVELFdBQUtwQixPQUFMLENBQWF5QixHQUFiLENBQWlCSSxhQUFhVCxJQUE5QixFQUFvQ1MsWUFBcEM7QUFDQSxhQUFPQSxhQUFhVCxJQUFwQjtBQUVEOzs7NEJBSWE7QUFDWixhQUFPLEtBQUtyQixNQUFaO0FBQ0Q7O0FBRUg7Ozs7Ozs7Ozs7bUNBU2lCK0IsVSxFQUE0QjtBQUN6QyxhQUFVLEtBQUtDLGlCQUFMLENBQXVCRCxVQUF2QixDQUFELElBQXlDLEtBQUtFLGlCQUFMLENBQXVCRixVQUF2QixDQUFsRDtBQUNEOzs7K0JBRW9CO0FBQ3ZCO0FBQ0ksYUFBTyxLQUFLRyxjQUFMLENBQW9CLEtBQUtDLEtBQUwsRUFBcEIsQ0FBUDtBQUNEOzs7bUNBRXVCO0FBQ3RCLGFBQU8sS0FBS2xCLGFBQVo7QUFDRDs7O3FDQUlpQztBQUNoQyxhQUFPLEtBQUtSLGVBQVo7QUFDRDs7O3NDQUUyQjtBQUMxQixhQUFPLEtBQUtDLGdCQUFaO0FBQ0Q7OzswQ0FFc0M7QUFDckMsYUFBTyxLQUFLQyxvQkFBWjtBQUNEOzs7eUNBRThCO0FBQzdCLGFBQU8sS0FBS0MsbUJBQVo7QUFDRDs7O3NDQUUyQjtBQUMxQixhQUFPLEtBQUtDLGdCQUFaO0FBQ0Q7OzttQ0FFd0I7QUFDdkIsYUFBTyxLQUFLQyxhQUFaO0FBQ0Q7OztzQ0FFMkI7QUFDMUIsYUFBTyxLQUFLQyxnQkFBWjtBQUNEOzs7a0NBRXVCO0FBQ3RCLGFBQU8sS0FBS0MsWUFBWjtBQUNEOzs7b0NBSW9EOztBQUVuRCxhQUFPO0FBQ0xvQixxQ0FBOEIsQ0FEekI7O0FBR0xDLGlCQUF5QixLQUFLL0IsUUFIekI7QUFJTGdDLGtCQUF5QixLQUFLbEMsU0FKekI7QUFLTHBFLGVBQXlCLEtBQUttRSxNQUx6QjtBQU1Mb0MsMkJBQXlCLEtBQUtsQyxrQkFOekI7QUFPTG1DLHlCQUF5QixLQUFLakMsZ0JBUHpCO0FBUVg7QUFDTTRCLGVBQXlCLEtBQUtuQyxNQVR6QjtBQVVMeUMsZ0JBQXlCLEtBQUt4QztBQVZ6QixPQUFQO0FBYUQ7O0FBRUg7Ozs7Ozs7OzZCQU93QjtBQUNwQiwwQ0FBWSxLQUFLQSxPQUFMLENBQWF5QyxJQUFiLEVBQVo7QUFDRDs7OzhCQUVTWCxVLEVBQTBDO0FBQ2xELFVBQU1JLFFBQWlDLEtBQUtsQyxPQUFMLENBQWFtQixHQUFiLENBQWlCVyxVQUFqQixDQUF2QztBQUNBLFVBQUlJLEtBQUosRUFBVztBQUFFLGVBQU9BLEtBQVA7QUFBZSxPQUE1QixNQUNXO0FBQUUsY0FBTSxJQUFJNUcsS0FBSixvQkFBMkIyQyxLQUFLQyxTQUFMLENBQWVnRSxLQUFmLENBQTNCLENBQU47QUFBNEQ7QUFDMUU7OztpQ0FJZ0Q7QUFDL0MsYUFBTyxLQUFLaEMsTUFBWjtBQUNEOzs7NkNBRTJDO0FBQzFDLGFBQU8sS0FBS0Usa0JBQVo7QUFDRDs7O21DQUUyQjtBQUMxQiwwQ0FBWSxLQUFLQyxRQUFMLENBQWNvQyxJQUFkLEVBQVo7QUFDRDs7O2tEQUk2QjlHLEksRUFBV0MsRSxFQUFtQjs7QUFFMUQsVUFBTThHLE1BQTBCLEtBQUt2QyxTQUFMLENBQWVnQixHQUFmLENBQW1CeEYsSUFBbkIsQ0FBaEM7O0FBRUEsVUFBSStHLEdBQUosRUFBUztBQUNQLGVBQU9BLElBQUl2QixHQUFKLENBQVF2RixFQUFSLENBQVA7QUFDRCxPQUZELE1BRU87QUFDTCxlQUFPcUYsU0FBUDtBQUNEO0FBRUY7OzswQ0FJcUJ0RixJLEVBQVdDLEUsRUFBcUM7QUFDcEUsVUFBTStHLEtBQWUsS0FBS0MsNkJBQUwsQ0FBbUNqSCxJQUFuQyxFQUF5Q0MsRUFBekMsQ0FBckI7QUFDQSxhQUFTK0csT0FBTzFCLFNBQVIsSUFBdUIwQixPQUFPLElBQS9CLEdBQXVDMUIsU0FBdkMsR0FBbUQsS0FBS2YsTUFBTCxDQUFZeUMsRUFBWixDQUExRDtBQUNEOzs7dUNBSTJFO0FBQUEsVUFBM0RiLFVBQTJELHVFQUF4QyxLQUFLSSxLQUFMLEVBQXdDOztBQUMxRSxhQUFPLEVBQUNXLFdBQVcsS0FBS0MsY0FBTCxDQUFvQmhCLFVBQXBCLENBQVosRUFBNkNpQixPQUFPLEtBQUtDLFVBQUwsQ0FBZ0JsQixVQUFoQixDQUFwRCxFQUFQO0FBQ0Q7OztxQ0FFNEQ7QUFBQSxVQUE5Q0EsVUFBOEMsdUVBQTNCLEtBQUtJLEtBQUwsRUFBMkI7O0FBQzNELGFBQU8sQ0FBQyxLQUFLbEMsT0FBTCxDQUFhbUIsR0FBYixDQUFpQlcsVUFBakIsS0FBZ0MsRUFBakMsRUFBcUNuRyxJQUFyQyxJQUE2QyxFQUFwRDtBQUNEOzs7aUNBRXdEO0FBQUEsVUFBOUNtRyxVQUE4Qyx1RUFBM0IsS0FBS0ksS0FBTCxFQUEyQjs7QUFDdkQsYUFBTyxDQUFDLEtBQUtsQyxPQUFMLENBQWFtQixHQUFiLENBQWlCVyxVQUFqQixLQUFnQyxFQUFqQyxFQUFxQ2xHLEVBQXJDLElBQTZDLEVBQXBEO0FBQ0Q7Ozt1Q0FJa0JrRyxVLEVBQXNEO0FBQUE7O0FBRXZFLFVBQU1tQixTQUFrQyxLQUFLakQsT0FBTCxDQUFhbUIsR0FBYixDQUFpQlcsVUFBakIsQ0FBeEM7QUFDQSxVQUFJLENBQUVtQixNQUFOLEVBQWU7QUFBRSxjQUFNLElBQUkzSCxLQUFKLG9CQUEyQjJDLEtBQUtDLFNBQUwsQ0FBZTRELFVBQWYsQ0FBM0IsNEJBQU47QUFBdUY7O0FBRXhHLFVBQU1vQixZQUEyQkQsT0FBT3JILEVBQXhDO0FBQUEsVUFFTXVILElBQThDO0FBQTlDLFFBQ1lELFVBQ0c5RyxHQURILENBQ1EsVUFBQ2dILEVBQUQ7QUFBQSxlQUFvQyxPQUFLQyxxQkFBTCxDQUEyQixPQUFLbkIsS0FBTCxFQUEzQixFQUF5Q2tCLEVBQXpDLENBQXBDO0FBQUEsT0FEUixFQUVHRSxNQUZILENBRVVDLE9BRlYsQ0FIbEI7O0FBT0EsYUFBT0osR0FBUDtBQUVEOzs7K0NBRW9DO0FBQ25DLFVBQU1LLFdBQXNDLG9DQUFxQixLQUFLQyxrQkFBTCxDQUF3QixLQUFLdkIsS0FBTCxFQUF4QixDQUFyQixDQUE1QztBQUNBLGFBQU8sS0FBSzNELFVBQUwsQ0FBaUJpRixTQUFTNUgsRUFBMUIsQ0FBUDtBQUNEOzs7dUNBRWtCOEgsQyxFQUF5QjtBQUFBOztBQUMxQyxhQUFPLG1CQUFJQSxDQUFKLEVBQ0F0SCxHQURBLENBQ0ksWUFBWTtBQUNkLFlBQU11SCxZQUFrQixPQUFLekIsS0FBTCxFQUF4QjtBQUNBLGVBQUswQix3QkFBTDtBQUNBLGVBQU9ELFNBQVA7QUFDRCxPQUxELEVBTUFyRyxNQU5BLENBTU8sQ0FBQyxLQUFLNEUsS0FBTCxFQUFELENBTlAsQ0FBUDtBQU9EOzs7NkNBRXdCd0IsQyxFQUErQjtBQUN0RCxhQUFPLDBCQUFXLEtBQUtHLGtCQUFMLENBQXdCSCxDQUF4QixDQUFYLENBQVA7QUFDRDs7OzhCQUlzRDtBQUFBLFVBQS9DNUIsVUFBK0MsdUVBQTVCLEtBQUtJLEtBQUwsRUFBNEI7O0FBQ3JELFVBQU1lLFNBQTZCLEtBQUszQyxnQkFBTCxDQUFzQmEsR0FBdEIsQ0FBMEJXLFVBQTFCLENBQW5DO0FBQ0EsVUFBSW1CLE1BQUosRUFBWTtBQUFFLDRDQUFZQSxPQUFPUixJQUFQLEVBQVo7QUFBNkIsT0FBM0MsTUFDWTtBQUFFLGNBQU0sSUFBSW5ILEtBQUosb0JBQTJCMkMsS0FBS0MsU0FBTCxDQUFlNEQsVUFBZixDQUEzQixDQUFOO0FBQWlFO0FBQ2hGOzs7OENBRXlCQSxVLEVBQStCO0FBQ3ZELFVBQU1tQixTQUE2QixLQUFLNUMsUUFBTCxDQUFjYyxHQUFkLENBQWtCVyxVQUFsQixDQUFuQztBQUNBLFVBQUltQixNQUFKLEVBQVk7QUFBRSw0Q0FBWUEsT0FBT1IsSUFBUCxFQUFaO0FBQTZCLE9BQTNDLE1BQ1k7QUFBRSxjQUFNLElBQUluSCxLQUFKLG9CQUEyQjJDLEtBQUtDLFNBQUwsQ0FBZTRELFVBQWYsQ0FBM0IsQ0FBTjtBQUFpRTtBQUNoRjs7QUFFSDtBQUNBOzs7Ozs7Ozs7Ozt3Q0FRb0U7QUFBQTs7QUFBQSxVQUFoREEsVUFBZ0QsdUVBQTdCLEtBQUtJLEtBQUwsRUFBNkI7QUFBRTtBQUNsRSxVQUFNNEIsVUFBOEIsS0FBS3hELGdCQUFMLENBQXNCYSxHQUF0QixDQUEwQlcsVUFBMUIsQ0FBcEM7QUFDQSxVQUFJLENBQUVnQyxPQUFOLEVBQWdCO0FBQUUsY0FBTSxJQUFJeEksS0FBSixvQkFBMkIyQyxLQUFLQyxTQUFMLENBQWU0RCxVQUFmLENBQTNCLENBQU47QUFBaUU7O0FBRW5GLGFBQU8sNkJBQUtnQyxRQUFRQyxNQUFSLEVBQUwsR0FDQzNILEdBREQsQ0FDVSxVQUFDNEgsTUFBRDtBQUFBLGVBQTJELE9BQUs5RCxNQUFMLENBQVk4RCxNQUFaLENBQTNEO0FBQUEsT0FEVixFQUVDVixNQUZELENBRVUsVUFBQ1csQ0FBRDtBQUFBLGVBQTJEQSxFQUFFdEksSUFBRixLQUFXbUcsVUFBdEU7QUFBQSxPQUZWLEVBR0MxRixHQUhELENBR1UsVUFBQzhILFFBQUQ7QUFBQSxlQUEyREEsU0FBU3BILE1BQXBFO0FBQUEsT0FIVixDQUFQO0FBSUQ7Ozs0Q0FFc0U7QUFBQTs7QUFBQSxVQUFqRGdGLFVBQWlELHVFQUE5QixLQUFLSSxLQUFMLEVBQThCO0FBQUU7QUFDdkUsVUFBTTRCLFVBQThCLEtBQUt4RCxnQkFBTCxDQUFzQmEsR0FBdEIsQ0FBMEJXLFVBQTFCLENBQXBDO0FBQ0EsVUFBSSxDQUFFZ0MsT0FBTixFQUFnQjtBQUFFLGNBQU0sSUFBSXhJLEtBQUosb0JBQTJCMkMsS0FBS0MsU0FBTCxDQUFlNEQsVUFBZixDQUEzQixDQUFOO0FBQWlFOztBQUVuRixhQUFPLDZCQUFLZ0MsUUFBUUMsTUFBUixFQUFMLEdBQ0MzSCxHQURELENBQ1UsVUFBQzRILE1BQUQ7QUFBQSxlQUE4QyxPQUFLOUQsTUFBTCxDQUFZOEQsTUFBWixDQUE5QztBQUFBLE9BRFYsRUFFQ1YsTUFGRCxDQUVVLFVBQUNXLENBQUQ7QUFBQSxlQUE4Q0EsRUFBRXRJLElBQUYsS0FBV21HLFVBQXpEO0FBQUEsT0FGVixFQUdDMUYsR0FIRCxDQUdVLFVBQUM4SCxRQUFEO0FBQUEsZUFBZ0QsRUFBRXBILFFBQWNvSCxTQUFTcEgsTUFBekI7QUFDRUUsdUJBQWNrSCxTQUFTbEgsV0FEekIsRUFBaEQ7QUFBQSxPQUhWLENBQVA7QUFNRDs7O21DQUljOEUsVSxFQUE0QjtBQUN6QztBQUNBLGFBQU8sS0FBS2dCLGNBQUwsQ0FBb0JoQixVQUFwQixFQUFnQ3hDLE1BQWhDLEtBQTJDLENBQWxEO0FBQ0Q7Ozt1Q0FFNEI7QUFBQTs7QUFDM0IsYUFBTyxLQUFLa0QsTUFBTCxHQUFjMkIsSUFBZCxDQUFvQixVQUFDQyxDQUFEO0FBQUEsZUFBaUIsT0FBS0MsY0FBTCxDQUFvQkQsQ0FBcEIsQ0FBakI7QUFBQSxPQUFwQixDQUFQO0FBQ0Q7OztrQ0FJdUI7QUFDdEIsYUFBTyxLQUFLckMsaUJBQUwsQ0FBdUIsS0FBS0csS0FBTCxFQUF2QixDQUFQO0FBQ0Q7OztzQ0FFaUJKLFUsRUFBNEI7QUFDNUM7QUFDQSxhQUFPLEtBQUtrQixVQUFMLENBQWdCbEIsVUFBaEIsRUFBNEJ4QyxNQUE1QixLQUF1QyxDQUE5QztBQUNEOzs7b0NBRXlCO0FBQUE7O0FBQ3hCLGFBQU8sS0FBS2tELE1BQUwsR0FBYzJCLElBQWQsQ0FBb0IsVUFBQ0MsQ0FBRDtBQUFBLGVBQWlCLE9BQUtyQyxpQkFBTCxDQUF1QnFDLENBQXZCLENBQWpCO0FBQUEsT0FBcEIsQ0FBUDtBQUNEOzs7a0NBSXVCO0FBQ3RCLGFBQU8sS0FBS3BDLGlCQUFMLENBQXVCLEtBQUtFLEtBQUwsRUFBdkIsQ0FBUDtBQUNEOzs7c0NBRWlCSixVLEVBQTRCO0FBQzVDLFVBQU1tQixTQUFrQyxLQUFLakQsT0FBTCxDQUFhbUIsR0FBYixDQUFpQlcsVUFBakIsQ0FBeEM7QUFDQSxVQUFJbUIsTUFBSixFQUFZO0FBQUUsZUFBT0EsT0FBT25ELFFBQWQ7QUFBeUIsT0FBdkMsTUFDWTtBQUFFLGNBQU0sSUFBSXhFLEtBQUosb0JBQTJCMkMsS0FBS0MsU0FBTCxDQUFlNEQsVUFBZixDQUEzQixDQUFOO0FBQWlFO0FBQ2hGOzs7b0NBRXlCO0FBQUE7O0FBQ3hCLGFBQU8sS0FBS1UsTUFBTCxHQUFjMkIsSUFBZCxDQUFvQixVQUFDQyxDQUFEO0FBQUEsZUFBaUIsT0FBS3BDLGlCQUFMLENBQXVCb0MsQ0FBdkIsQ0FBakI7QUFBQSxPQUFwQixDQUFQO0FBQ0Q7OzsyQkFJTWhELEksRUFBWWtELE8sRUFBMEI7QUFDM0M7QUFDQTtBQUNBO0FBQ0EsVUFBSSxLQUFLQyxZQUFMLENBQWtCbkQsSUFBbEIsRUFBd0JrRCxPQUF4QixDQUFKLEVBQXNDO0FBQ3BDLFlBQU1FLE9BQWtDLEtBQUtDLHVCQUFMLENBQTZCckQsSUFBN0IsQ0FBeEM7QUFDQSxhQUFLckIsTUFBTCxHQUFjeUUsS0FBSzVJLEVBQW5CO0FBQ0EsZUFBTyxJQUFQO0FBQ0QsT0FKRCxNQUlPO0FBQ0wsZUFBTyxLQUFQO0FBQ0Q7QUFDRjs7OytCQUVVOEksUSxFQUFnQkosTyxFQUEwQjtBQUNuRDtBQUNBO0FBQ0E7QUFDQSxVQUFJLEtBQUtLLGdCQUFMLENBQXNCRCxRQUF0QixFQUFnQ0osT0FBaEMsQ0FBSixFQUE4QztBQUM1QyxhQUFLdkUsTUFBTCxHQUFjMkUsUUFBZDtBQUNBLGVBQU8sSUFBUDtBQUNELE9BSEQsTUFHTztBQUNMLGVBQU8sS0FBUDtBQUNEO0FBQ0Y7O0FBRUQ7Ozs7cUNBQ2lCQSxRLEVBQWdCSixPLEVBQTBCO0FBQ3pEO0FBQ0E7QUFDQTtBQUNBLFVBQUksS0FBS00sc0JBQUwsQ0FBNEJGLFFBQTVCLEVBQXNDSixPQUF0QyxDQUFKLEVBQW9EO0FBQ2xELGFBQUt2RSxNQUFMLEdBQWMyRSxRQUFkO0FBQ0EsZUFBTyxJQUFQO0FBQ0QsT0FIRCxNQUdPO0FBQ0wsZUFBTyxLQUFQO0FBQ0Q7QUFDRjs7O3VDQUlrQjVILE0sRUFBOEI7QUFDL0MsVUFBTStILGNBQWtDLEtBQUt4RSxRQUFMLENBQWNjLEdBQWQsQ0FBa0JyRSxNQUFsQixDQUF4QztBQUNBLGFBQU8rSCxjQUFhQSxZQUFZMUQsR0FBWixDQUFnQixLQUFLZSxLQUFMLEVBQWhCLENBQWIsR0FBNkNqQixTQUFwRDtBQUNEOzs7NENBRXVCbkUsTSxFQUF5QztBQUMvRCxVQUFNZ0ksTUFBZ0IsS0FBS0Msa0JBQUwsQ0FBd0JqSSxNQUF4QixDQUF0QjtBQUNBLFVBQUtnSSxRQUFRN0QsU0FBVCxJQUF3QjZELFFBQVEsSUFBcEMsRUFBMkM7QUFBRSxjQUFNLElBQUl4SixLQUFKLHFCQUE0QjJDLEtBQUtDLFNBQUwsQ0FBZXBCLE1BQWYsQ0FBNUIsQ0FBTjtBQUE4RDtBQUMzRyxhQUFPLEtBQUtvRCxNQUFMLENBQVk0RSxHQUFaLENBQVA7QUFDRDs7O2lDQUVZaEksTSxFQUFja0ksUSxFQUEyQjtBQUFHO0FBQ3ZEO0FBQ0E7QUFDQTtBQUNBLGFBQU8sS0FBS0Qsa0JBQUwsQ0FBd0JqSSxNQUF4QixNQUFvQ21FLFNBQTNDO0FBQ0Q7OztxQ0FFZ0J5RCxRLEVBQWdCTSxRLEVBQTJCO0FBQUc7QUFDN0Q7QUFDQTtBQUVBLFVBQU1DLGlCQUE2QyxLQUFLNUIscUJBQUwsQ0FBMkIsS0FBS25CLEtBQUwsRUFBM0IsRUFBeUN3QyxRQUF6QyxDQUFuRDs7QUFFQSxVQUFJLENBQUVPLGNBQU4sRUFBZ0M7QUFBRSxlQUFPLEtBQVA7QUFBZTtBQUNqRCxVQUFJQSxlQUFldEksV0FBbkIsRUFBZ0M7QUFBRSxlQUFPLEtBQVA7QUFBZTs7QUFFakQsYUFBTyxJQUFQO0FBRUQ7OzsyQ0FFc0IrSCxRLEVBQWdCTSxRLEVBQTJCO0FBQUc7QUFDbkU7QUFDQTtBQUNBO0FBQ0EsYUFBUSxLQUFLM0IscUJBQUwsQ0FBMkIsS0FBS25CLEtBQUwsRUFBM0IsRUFBeUN3QyxRQUF6QyxNQUF1RHpELFNBQS9EO0FBQ0Q7Ozs7OztBQVNILFNBQVNpRSxFQUFULENBQXNCQyxnQkFBdEIsQ0FBdUQsaUJBQXZELEVBQThGO0FBQUE7OztBQUUxRjtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxTQUFPLElBQUl0RixPQUFKLENBQVlGLEtBQUt3RixpQkFBaUJDLE1BQWpCOztBQUV0QjtBQUNBOztBQUVBO0FBQ0E7QUFDQSxZQUFDMUosR0FBRCxFQUFNbUMsR0FBTixFQUFXaUgsR0FBWDtBQUFBLGdCQUErQnBKLEdBQS9CLEdBQXFDLFdBQVVvSixHQUFWLENBQXJDLEdBQXNEakgsR0FBdEQ7QUFBQSxHQVBzQixDQU91QztBQUM3RDtBQUNBOztBQVRzQixHQUFMLENBQVosQ0FBUDtBQWFIOztRQVFDM0MsTyxHQUFBQSxPO1FBRUEyRSxPLEdBQUFBLE87UUFFQUYsSSxHQUFBQSxJO1FBQ0UzRSxLLEdBQUFBLEs7UUFDQW1ELE8sR0FBQUEsTztRQUVGK0csRSxHQUFBQSxFO1FBRUEvSixlLEdBQUFBLGU7UUFDQUksZSxHQUFBQSxlO1FBQ0FDLGdCLEdBQUFBLGdCO1FBR0E2SixHO1FBQUtDLG9CO1FBQXNCQyxVO1FBQVlDLHNCO1FBQXdCQyxrQiIsImZpbGUiOiJqc3NtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vLyB3aGFyZ2FyYmwgbG90cyBvZiB0aGVzZSByZXR1cm4gYXJyYXlzIGNvdWxkL3Nob3VsZCBiZSBzZXRzXG5cbi8vIEBmbG93XG5cbmltcG9ydCB0eXBlIHtcblxuICBKc3NtR2VuZXJpY1N0YXRlLCBKc3NtR2VuZXJpY0NvbmZpZyxcbiAgSnNzbVRyYW5zaXRpb24sIEpzc21UcmFuc2l0aW9uTGlzdCxcbiAgSnNzbU1hY2hpbmVJbnRlcm5hbFN0YXRlLFxuICBKc3NtUGFyc2VUcmVlLFxuICBKc3NtQ29tcGlsZVNlLCBKc3NtQ29tcGlsZVNlU3RhcnQsIEpzc21Db21waWxlUnVsZSxcbiAgSnNzbUFycm93LCBKc3NtQXJyb3dEaXJlY3Rpb24sIEpzc21BcnJvd0tpbmQsXG4gIEpzc21MYXlvdXRcblxufSBmcm9tICcuL2pzc20tdHlwZXMnO1xuXG5cblxuXG5cbmltcG9ydCB7IHNlcSwgd2VpZ2h0ZWRfcmFuZF9zZWxlY3QsIHdlaWdodGVkX3NhbXBsZV9zZWxlY3QsIGhpc3RvZ3JhcGgsIHdlaWdodGVkX2hpc3RvX2tleSB9IGZyb20gJy4vanNzbS11dGlsLmpzJztcblxuY29uc3QgcGFyc2UgOiA8TlQsIERUPihzdHJpbmcpID0+IEpzc21QYXJzZVRyZWU8TlQ+ID0gcmVxdWlyZSgnLi9qc3NtLWRvdC5qcycpLnBhcnNlOyAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBmbG93dHlwZS9uby13ZWFrLXR5cGVzIC8vIHRvZG8gd2hhcmdhcmJsIHJlbW92ZSBhbnlcblxuY29uc3QgdmVyc2lvbiA6IG51bGwgPSBudWxsOyAvLyByZXBsYWNlZCBmcm9tIHBhY2thZ2UuanMgaW4gYnVpbGRcblxuXG5cblxuXG5mdW5jdGlvbiBhcnJvd19kaXJlY3Rpb24oYXJyb3cgOiBKc3NtQXJyb3cpIDogSnNzbUFycm93RGlyZWN0aW9uIHtcblxuICBzd2l0Y2ggKCBTdHJpbmcoYXJyb3cpICkge1xuXG4gICAgY2FzZSAnLT4nIDogIGNhc2UgJz0+JyAgOiAgY2FzZSAnfj4nICA6XG4gICAgICByZXR1cm4gJ3JpZ2h0JztcblxuICAgIGNhc2UgJzwtJyA6ICBjYXNlICc8PScgIDogIGNhc2UgJzx+JyAgOlxuICAgICAgcmV0dXJuICdsZWZ0JztcblxuICAgIGNhc2UgJzwtPic6ICBjYXNlICc8LT0+JzogIGNhc2UgJzwtfj4nOlxuICAgIGNhc2UgJzw9Pic6ICBjYXNlICc8PS0+JzogIGNhc2UgJzw9fj4nOlxuICAgIGNhc2UgJzx+Pic6ICBjYXNlICc8fi0+JzogIGNhc2UgJzx+PT4nOlxuICAgICAgcmV0dXJuICdib3RoJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGFycm93X2RpcmVjdGlvbjogdW5rbm93biBhcnJvdyB0eXBlICR7YXJyb3d9YCk7XG5cbiAgfVxuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gYXJyb3dfbGVmdF9raW5kKGFycm93IDogSnNzbUFycm93KSA6IEpzc21BcnJvd0tpbmQge1xuXG4gIHN3aXRjaCAoIFN0cmluZyhhcnJvdykgKSB7XG5cbiAgICBjYXNlICctPic6ICBjYXNlICc9PicgOiAgY2FzZSAnfj4nOlxuICAgICAgcmV0dXJuICdub25lJztcblxuICAgIGNhc2UgJzwtJzogIGNhc2UgJzwtPic6ICBjYXNlICc8LT0+JzogIGNhc2UgJzwtfj4nOlxuICAgICAgcmV0dXJuICdsZWdhbCc7XG5cbiAgICBjYXNlICc8PSc6ICBjYXNlICc8PT4nOiAgY2FzZSAnPD0tPic6ICBjYXNlICc8PX4+JzpcbiAgICAgIHJldHVybiAnbWFpbic7XG5cbiAgICBjYXNlICc8fic6ICBjYXNlICc8fj4nOiAgY2FzZSAnPH4tPic6ICBjYXNlICc8fj0+JzpcbiAgICAgIHJldHVybiAnZm9yY2VkJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGFycm93X2RpcmVjdGlvbjogdW5rbm93biBhcnJvdyB0eXBlICR7YXJyb3d9YCk7XG5cbiAgfVxuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gYXJyb3dfcmlnaHRfa2luZChhcnJvdyA6IEpzc21BcnJvdykgOiBKc3NtQXJyb3dLaW5kIHtcblxuICBzd2l0Y2ggKCBTdHJpbmcoYXJyb3cpICkge1xuXG4gICAgY2FzZSAnPC0nOiAgY2FzZSAnPD0nIDogIGNhc2UgJzx+JzpcbiAgICAgIHJldHVybiAnbm9uZSc7XG5cbiAgICBjYXNlICctPic6ICBjYXNlICc8LT4nOiAgY2FzZSAnPD0tPic6ICBjYXNlICc8fi0+JzpcbiAgICAgIHJldHVybiAnbGVnYWwnO1xuXG4gICAgY2FzZSAnPT4nOiAgY2FzZSAnPD0+JzogIGNhc2UgJzwtPT4nOiAgY2FzZSAnPH49Pic6XG4gICAgICByZXR1cm4gJ21haW4nO1xuXG4gICAgY2FzZSAnfj4nOiAgY2FzZSAnPH4+JzogIGNhc2UgJzwtfj4nOiAgY2FzZSAnPD1+Pic6XG4gICAgICByZXR1cm4gJ2ZvcmNlZCc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcnJvd19kaXJlY3Rpb246IHVua25vd24gYXJyb3cgdHlwZSAke2Fycm93fWApO1xuXG4gIH1cblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXA8bU5ULCBtRFQ+KFxuICAgICAgICAgICAgIGFjYyAgICAgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4sXG4gICAgICAgICAgICAgZnJvbSAgICA6IG1OVCxcbiAgICAgICAgICAgICB0byAgICAgIDogbU5ULFxuICAgICAgICAgICAgIHRoaXNfc2UgOiBKc3NtQ29tcGlsZVNlPG1OVD4sXG4gICAgICAgICAgICAgbmV4dF9zZSA6IEpzc21Db21waWxlU2U8bU5UPlxuICAgICAgICAgKSA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiB7IC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgcGFyc2VyIHJlcHJlc2VudGF0aW9uIG9mIGEgdHJhbnNpdGlvbiBzdGVwIGV4dGVuc2lvblxuXG4gIGNvbnN0IGVkZ2VzIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+ID0gW107XG5cbiAgY29uc3QgdUZyb20gOiBBcnJheTwgbU5UID4gPSAoQXJyYXkuaXNBcnJheShmcm9tKT8gZnJvbSA6IFtmcm9tXSksXG4gICAgICAgIHVUbyAgIDogQXJyYXk8IG1OVCA+ID0gKEFycmF5LmlzQXJyYXkodG8pPyAgIHRvICAgOiBbdG9dICApO1xuXG4gIHVGcm9tLm1hcCggKGY6bU5UKSA9PiB7XG4gICAgdVRvLm1hcCggKHQ6bU5UKSA9PiB7XG5cbiAgICAgIGNvbnN0IHJrIDogSnNzbUFycm93S2luZCA9IGFycm93X3JpZ2h0X2tpbmQodGhpc19zZS5raW5kKSxcbiAgICAgICAgICAgIGxrIDogSnNzbUFycm93S2luZCA9IGFycm93X2xlZnRfa2luZCh0aGlzX3NlLmtpbmQpO1xuXG5cbiAgICAgIGNvbnN0IHJpZ2h0IDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0ge1xuICAgICAgICBmcm9tICAgICAgICA6IGYsXG4gICAgICAgIHRvICAgICAgICAgIDogdCxcbiAgICAgICAga2luZCAgICAgICAgOiByayxcbiAgICAgICAgZm9yY2VkX29ubHkgOiByayA9PT0gJ2ZvcmNlZCcsXG4gICAgICAgIG1haW5fcGF0aCAgIDogcmsgPT09ICdtYWluJ1xuICAgICAgfTtcblxuICAgICAgaWYgKHRoaXNfc2Uucl9hY3Rpb24pICAgICAgeyByaWdodC5hY3Rpb24gICAgICA9IHRoaXNfc2Uucl9hY3Rpb247ICAgICAgfVxuICAgICAgaWYgKHRoaXNfc2Uucl9wcm9iYWJpbGl0eSkgeyByaWdodC5wcm9iYWJpbGl0eSA9IHRoaXNfc2Uucl9wcm9iYWJpbGl0eTsgfVxuICAgICAgaWYgKHJpZ2h0LmtpbmQgIT09ICdub25lJykgeyBlZGdlcy5wdXNoKHJpZ2h0KTsgfVxuXG5cbiAgICAgIGNvbnN0IGxlZnQgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB7XG4gICAgICAgIGZyb20gICAgICAgIDogdCxcbiAgICAgICAgdG8gICAgICAgICAgOiBmLFxuICAgICAgICBraW5kICAgICAgICA6IGxrLFxuICAgICAgICBmb3JjZWRfb25seSA6IGxrID09PSAnZm9yY2VkJyxcbiAgICAgICAgbWFpbl9wYXRoICAgOiBsayA9PT0gJ21haW4nXG4gICAgICB9O1xuXG4gICAgICBpZiAodGhpc19zZS5sX2FjdGlvbikgICAgICB7IGxlZnQuYWN0aW9uICAgICAgPSB0aGlzX3NlLmxfYWN0aW9uOyAgICAgIH1cbiAgICAgIGlmICh0aGlzX3NlLmxfcHJvYmFiaWxpdHkpIHsgbGVmdC5wcm9iYWJpbGl0eSA9IHRoaXNfc2UubF9wcm9iYWJpbGl0eTsgfVxuICAgICAgaWYgKGxlZnQua2luZCAhPT0gJ25vbmUnKSAgeyBlZGdlcy5wdXNoKGxlZnQpOyB9XG5cbiAgICB9KTtcbiAgfSk7XG5cbiAgY29uc3QgbmV3X2FjYyA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiA9IGFjYy5jb25jYXQoZWRnZXMpO1xuXG4gIGlmIChuZXh0X3NlKSB7XG4gICAgcmV0dXJuIGNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXAobmV3X2FjYywgdG8sIG5leHRfc2UudG8sIG5leHRfc2UsIG5leHRfc2Uuc2UpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXdfYWNjO1xuICB9XG5cbn1cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVfcnVsZV9oYW5kbGVfdHJhbnNpdGlvbjxtTlQ+KHJ1bGUgOiBKc3NtQ29tcGlsZVNlU3RhcnQ8bU5UPikgOiBtaXhlZCB7IC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgcGFyc2VyIHJlcHJlc2VudGF0aW9uIG9mIGEgdHJhbnNpdGlvblxuICByZXR1cm4gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcChbXSwgcnVsZS5mcm9tLCBydWxlLnNlLnRvLCBydWxlLnNlLCBydWxlLnNlLnNlKTtcbn1cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVfcnVsZV9oYW5kbGVyPG1OVD4ocnVsZSA6IEpzc21Db21waWxlU2VTdGFydDxtTlQ+KSA6IEpzc21Db21waWxlUnVsZSB7IC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgb3V0cHV0IG9mIHRoZSBwYXJzZXJcblxuICBpZiAocnVsZS5rZXkgPT09ICd0cmFuc2l0aW9uJykgeyByZXR1cm4geyBhZ2dfYXM6ICd0cmFuc2l0aW9uJywgdmFsOiBjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb24ocnVsZSkgfTsgfVxuXG4gIGNvbnN0IHRhdXRvbG9naWVzIDogQXJyYXk8c3RyaW5nPiA9IFtcbiAgICAnZ3JhcGhfbGF5b3V0JywgJ3N0YXJ0X3N0YXRlcycsICdlbmRfc3RhdGVzJywgJ21hY2hpbmVfbmFtZScsICdtYWNoaW5lX3ZlcnNpb24nLFxuICAgICdtYWNoaW5lX2NvbW1lbnQnLCAnbWFjaGluZV9hdXRob3InLCAnbWFjaGluZV9jb250cmlidXRvcicsICdtYWNoaW5lX2RlZmluaXRpb24nLFxuICAgICdtYWNoaW5lX3JlZmVyZW5jZScsICdtYWNoaW5lX2xpY2Vuc2UnLCAnZnNsX3ZlcnNpb24nXG4gIF07XG5cbiAgaWYgKHRhdXRvbG9naWVzLmluY2x1ZGVzKHJ1bGUua2V5KSkge1xuICAgIHJldHVybiB7IGFnZ19hczogcnVsZS5rZXksIHZhbDogcnVsZS52YWx1ZSB9O1xuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKGBjb21waWxlX3J1bGVfaGFuZGxlcjogVW5rbm93biBydWxlOiAke0pTT04uc3RyaW5naWZ5KHJ1bGUpfWApO1xuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gY29tcGlsZTxtTlQsIG1EVD4odHJlZSA6IEpzc21QYXJzZVRyZWU8bU5UPikgOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4geyAgLy8gdG9kbyBmbG93IGRlc2NyaWJlIHRoZSBvdXRwdXQgb2YgdGhlIHBhcnNlclxuXG4gIGNvbnN0IHJlc3VsdHMgOiB7XG4gICAgZ3JhcGhfbGF5b3V0ICAgICAgICA6IEFycmF5PCBKc3NtTGF5b3V0ID4sXG4gICAgdHJhbnNpdGlvbiAgICAgICAgICA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPixcbiAgICBzdGFydF9zdGF0ZXMgICAgICAgIDogQXJyYXk8IG1OVCA+LFxuICAgIGVuZF9zdGF0ZXMgICAgICAgICAgOiBBcnJheTwgbU5UID4sXG4gICAgZnNsX3ZlcnNpb24gICAgICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2F1dGhvciAgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfY29tbWVudCAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9jb250cmlidXRvciA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2RlZmluaXRpb24gIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfbGljZW5zZSAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9uYW1lICAgICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX3JlZmVyZW5jZSAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfdmVyc2lvbiAgICAgOiBBcnJheTwgc3RyaW5nID4gLy8gc2VtdmVyXG4gIH0gPSB7XG4gICAgZ3JhcGhfbGF5b3V0ICAgICAgICA6IFtdLFxuICAgIHRyYW5zaXRpb24gICAgICAgICAgOiBbXSxcbiAgICBzdGFydF9zdGF0ZXMgICAgICAgIDogW10sXG4gICAgZW5kX3N0YXRlcyAgICAgICAgICA6IFtdLFxuICAgIGZzbF92ZXJzaW9uICAgICAgICAgOiBbXSxcbiAgICBtYWNoaW5lX2F1dGhvciAgICAgIDogW10sXG4gICAgbWFjaGluZV9jb21tZW50ICAgICA6IFtdLFxuICAgIG1hY2hpbmVfY29udHJpYnV0b3IgOiBbXSxcbiAgICBtYWNoaW5lX2RlZmluaXRpb24gIDogW10sXG4gICAgbWFjaGluZV9saWNlbnNlICAgICA6IFtdLFxuICAgIG1hY2hpbmVfbmFtZSAgICAgICAgOiBbXSxcbiAgICBtYWNoaW5lX3JlZmVyZW5jZSAgIDogW10sXG4gICAgbWFjaGluZV92ZXJzaW9uICAgICA6IFtdXG4gIH07XG5cbiAgdHJlZS5tYXAoICh0ciA6IEpzc21Db21waWxlU2VTdGFydDxtTlQ+KSA9PiB7XG5cbiAgICBjb25zdCBydWxlICAgOiBKc3NtQ29tcGlsZVJ1bGUgPSBjb21waWxlX3J1bGVfaGFuZGxlcih0ciksXG4gICAgICAgICAgYWdnX2FzIDogc3RyaW5nICAgICAgICAgID0gcnVsZS5hZ2dfYXMsXG4gICAgICAgICAgdmFsICAgIDogbWl4ZWQgICAgICAgICAgID0gcnVsZS52YWw7ICAgICAgICAgICAgICAgICAgLy8gdG9kbyBiZXR0ZXIgdHlwZXNcblxuICAgIHJlc3VsdHNbYWdnX2FzXSA9IHJlc3VsdHNbYWdnX2FzXS5jb25jYXQodmFsKTtcblxuICB9KTtcblxuICBjb25zdCBhc3NlbWJsZWRfdHJhbnNpdGlvbnMgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBbXS5jb25jYXQoLi4uIHJlc3VsdHNbJ3RyYW5zaXRpb24nXSk7XG5cbiAgY29uc3QgcmVzdWx0X2NmZyA6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPiA9IHtcbiAgICBzdGFydF9zdGF0ZXMgOiByZXN1bHRzLnN0YXJ0X3N0YXRlcy5sZW5ndGg/IHJlc3VsdHMuc3RhcnRfc3RhdGVzIDogW2Fzc2VtYmxlZF90cmFuc2l0aW9uc1swXS5mcm9tXSxcbiAgICB0cmFuc2l0aW9ucyAgOiBhc3NlbWJsZWRfdHJhbnNpdGlvbnNcbiAgfTtcblxuICBjb25zdCBvbmVPbmx5S2V5cyA6IEFycmF5PHN0cmluZz4gPSBbXG4gICAgJ2dyYXBoX2xheW91dCcsICdtYWNoaW5lX25hbWUnLCAnbWFjaGluZV92ZXJzaW9uJywgJ21hY2hpbmVfY29tbWVudCcsICdmc2xfdmVyc2lvbicsICdtYWNoaW5lX2xpY2Vuc2UnLFxuICAgICdtYWNoaW5lX2RlZmluaXRpb24nXG4gIF07XG5cbiAgb25lT25seUtleXMubWFwKCAob25lT25seUtleSA6IHN0cmluZykgPT4ge1xuICAgIGlmIChyZXN1bHRzW29uZU9ubHlLZXldLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWF5IG9ubHkgaGF2ZSBvbmUgJHtvbmVPbmx5S2V5fSBzdGF0ZW1lbnQgbWF4aW11bTogJHtKU09OLnN0cmluZ2lmeShyZXN1bHRzW29uZU9ubHlLZXldKX1gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHJlc3VsdHNbb25lT25seUtleV0ubGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdF9jZmdbb25lT25seUtleV0gPSByZXN1bHRzW29uZU9ubHlLZXldWzBdO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgWydtYWNoaW5lX2F1dGhvcicsICdtYWNoaW5lX2NvbnRyaWJ1dG9yJywgJ21hY2hpbmVfcmVmZXJlbmNlJ10ubWFwKCAobXVsdGlLZXkgOiBzdHJpbmcpID0+IHtcbiAgICBpZiAocmVzdWx0c1ttdWx0aUtleV0ubGVuZ3RoKSB7XG4gICAgICByZXN1bHRfY2ZnW211bHRpS2V5XSA9IHJlc3VsdHNbbXVsdGlLZXldO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHJlc3VsdF9jZmc7XG5cbn1cblxuXG5cblxuXG5mdW5jdGlvbiBtYWtlPG1OVCwgbURUPihwbGFuIDogc3RyaW5nKSA6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPiB7XG4gIHJldHVybiBjb21waWxlKHBhcnNlKHBsYW4pKTtcbn1cblxuXG5cblxuXG5jbGFzcyBNYWNoaW5lPG1OVCwgbURUPiB7XG5cblxuICBfc3RhdGUgICAgICAgICAgICAgICAgICA6IG1OVDtcbiAgX3N0YXRlcyAgICAgICAgICAgICAgICAgOiBNYXA8bU5ULCBKc3NtR2VuZXJpY1N0YXRlPG1OVD4+O1xuICBfZWRnZXMgICAgICAgICAgICAgICAgICA6IEFycmF5PEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPj47XG4gIF9lZGdlX21hcCAgICAgICAgICAgICAgIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG4gIF9uYW1lZF90cmFuc2l0aW9ucyAgICAgIDogTWFwPG1OVCwgbnVtYmVyPjtcbiAgX2FjdGlvbnMgICAgICAgICAgICAgICAgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcbiAgX3JldmVyc2VfYWN0aW9ucyAgICAgICAgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcbiAgX3JldmVyc2VfYWN0aW9uX3RhcmdldHMgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcblxuICBfbWFjaGluZV9hdXRob3IgICAgICAgICA6ID9BcnJheTxzdHJpbmc+O1xuICBfbWFjaGluZV9jb21tZW50ICAgICAgICA6ID9zdHJpbmc7XG4gIF9tYWNoaW5lX2NvbnRyaWJ1dG9yICAgIDogP0FycmF5PHN0cmluZz47XG4gIF9tYWNoaW5lX2RlZmluaXRpb24gICAgIDogP3N0cmluZztcbiAgX21hY2hpbmVfbGljZW5zZSAgICAgICAgOiA/c3RyaW5nO1xuICBfbWFjaGluZV9uYW1lICAgICAgICAgICA6ID9zdHJpbmc7XG4gIF9tYWNoaW5lX3ZlcnNpb24gICAgICAgIDogP3N0cmluZztcbiAgX2ZzbF92ZXJzaW9uICAgICAgICAgICAgOiA/c3RyaW5nO1xuXG4gIF9ncmFwaF9sYXlvdXQgICAgICAgICAgIDogSnNzbUxheW91dDtcblxuXG4gIC8vIHdoYXJnYXJibCB0aGlzIGJhZGx5IG5lZWRzIHRvIGJlIGJyb2tlbiB1cCwgbW9ub2xpdGggbWFzdGVyXG4gIGNvbnN0cnVjdG9yKHtcbiAgICBzdGFydF9zdGF0ZXMsXG4gICAgY29tcGxldGUgICAgICAgID0gW10sXG4gICAgdHJhbnNpdGlvbnMsXG4gICAgbWFjaGluZV9hdXRob3IsXG4gICAgbWFjaGluZV9jb21tZW50LFxuICAgIG1hY2hpbmVfY29udHJpYnV0b3IsXG4gICAgbWFjaGluZV9kZWZpbml0aW9uLFxuICAgIG1hY2hpbmVfbGljZW5zZSxcbiAgICBtYWNoaW5lX25hbWUsXG4gICAgbWFjaGluZV92ZXJzaW9uLFxuICAgIGZzbF92ZXJzaW9uLFxuICAgIGdyYXBoX2xheW91dCA9ICdkb3QnXG4gIH0gOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4pIHtcblxuICAgIHRoaXMuX3N0YXRlICAgICAgICAgICAgICAgICAgPSBzdGFydF9zdGF0ZXNbMF07XG4gICAgdGhpcy5fc3RhdGVzICAgICAgICAgICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9lZGdlcyAgICAgICAgICAgICAgICAgID0gW107XG4gICAgdGhpcy5fZWRnZV9tYXAgICAgICAgICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucyAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX2FjdGlvbnMgICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25zICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzID0gbmV3IE1hcCgpOyAgIC8vIHRvZG9cblxuICAgIHRoaXMuX21hY2hpbmVfYXV0aG9yICAgICAgICAgPSBtYWNoaW5lX2F1dGhvcjtcbiAgICB0aGlzLl9tYWNoaW5lX2NvbW1lbnQgICAgICAgID0gbWFjaGluZV9jb21tZW50O1xuICAgIHRoaXMuX21hY2hpbmVfY29udHJpYnV0b3IgICAgPSBtYWNoaW5lX2NvbnRyaWJ1dG9yO1xuICAgIHRoaXMuX21hY2hpbmVfZGVmaW5pdGlvbiAgICAgPSBtYWNoaW5lX2RlZmluaXRpb247XG4gICAgdGhpcy5fbWFjaGluZV9saWNlbnNlICAgICAgICA9IG1hY2hpbmVfbGljZW5zZTtcbiAgICB0aGlzLl9tYWNoaW5lX25hbWUgICAgICAgICAgID0gbWFjaGluZV9uYW1lO1xuICAgIHRoaXMuX21hY2hpbmVfdmVyc2lvbiAgICAgICAgPSBtYWNoaW5lX3ZlcnNpb247XG4gICAgdGhpcy5fZnNsX3ZlcnNpb24gICAgICAgICAgICA9IGZzbF92ZXJzaW9uO1xuXG4gICAgdGhpcy5fZ3JhcGhfbGF5b3V0ICAgICAgICAgICA9IGdyYXBoX2xheW91dDtcblxuICAgIHRyYW5zaXRpb25zLm1hcCggKHRyOkpzc21UcmFuc2l0aW9uPG1OVCwgbURUPikgPT4ge1xuXG4gICAgICBpZiAodHIuZnJvbSA9PT0gdW5kZWZpbmVkKSB7IHRocm93IG5ldyBFcnJvcihgdHJhbnNpdGlvbiBtdXN0IGRlZmluZSAnZnJvbSc6ICR7SlNPTi5zdHJpbmdpZnkodHIpfWApOyB9XG4gICAgICBpZiAodHIudG8gICA9PT0gdW5kZWZpbmVkKSB7IHRocm93IG5ldyBFcnJvcihgdHJhbnNpdGlvbiBtdXN0IGRlZmluZSAndG8nOiAkeyAgSlNPTi5zdHJpbmdpZnkodHIpfWApOyB9XG5cbiAgICAgIC8vIGdldCB0aGUgY3Vyc29ycy4gIHdoYXQgYSBtZXNzXG4gICAgICBjb25zdCBjdXJzb3JfZnJvbSA6IEpzc21HZW5lcmljU3RhdGU8bU5UPlxuICAgICAgICAgID0gdGhpcy5fc3RhdGVzLmdldCh0ci5mcm9tKVxuICAgICAgICAgfHwgeyBuYW1lOiB0ci5mcm9tLCBmcm9tOiBbXSwgdG86IFtdLCBjb21wbGV0ZTogY29tcGxldGUuaW5jbHVkZXModHIuZnJvbSkgfTtcblxuICAgICAgaWYgKCEodGhpcy5fc3RhdGVzLmhhcyh0ci5mcm9tKSkpIHtcbiAgICAgICAgdGhpcy5fbmV3X3N0YXRlKGN1cnNvcl9mcm9tKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY3Vyc29yX3RvIDogSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+XG4gICAgICAgICAgPSB0aGlzLl9zdGF0ZXMuZ2V0KHRyLnRvKVxuICAgICAgICAgfHwge25hbWU6IHRyLnRvLCBmcm9tOiBbXSwgdG86IFtdLCBjb21wbGV0ZTogY29tcGxldGUuaW5jbHVkZXModHIudG8pIH07XG5cbiAgICAgIGlmICghKHRoaXMuX3N0YXRlcy5oYXModHIudG8pKSkge1xuICAgICAgICB0aGlzLl9uZXdfc3RhdGUoY3Vyc29yX3RvKTtcbiAgICAgIH1cblxuICAgICAgLy8gZ3VhcmQgYWdhaW5zdCBleGlzdGluZyBjb25uZWN0aW9ucyBiZWluZyByZS1hZGRlZFxuICAgICAgaWYgKGN1cnNvcl9mcm9tLnRvLmluY2x1ZGVzKHRyLnRvKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGFscmVhZHkgaGFzICR7SlNPTi5zdHJpbmdpZnkodHIuZnJvbSl9IHRvICR7SlNPTi5zdHJpbmdpZnkodHIudG8pfWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3Vyc29yX2Zyb20udG8ucHVzaCh0ci50byk7XG4gICAgICAgIGN1cnNvcl90by5mcm9tLnB1c2godHIuZnJvbSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGFkZCB0aGUgZWRnZTsgbm90ZSBpdHMgaWRcbiAgICAgIHRoaXMuX2VkZ2VzLnB1c2godHIpO1xuICAgICAgY29uc3QgdGhpc0VkZ2VJZCA6IG51bWJlciA9IHRoaXMuX2VkZ2VzLmxlbmd0aCAtIDE7XG5cbiAgICAgIC8vIGd1YXJkIGFnYWluc3QgcmVwZWF0aW5nIGEgdHJhbnNpdGlvbiBuYW1lXG4gICAgICBpZiAodHIubmFtZSkge1xuICAgICAgICBpZiAodGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMuaGFzKHRyLm5hbWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBuYW1lZCB0cmFuc2l0aW9uIFwiJHtKU09OLnN0cmluZ2lmeSh0ci5uYW1lKX1cIiBhbHJlYWR5IGNyZWF0ZWRgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucy5zZXQodHIubmFtZSwgdGhpc0VkZ2VJZCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gc2V0IHVwIHRoZSBtYXBwaW5nLCBzbyB0aGF0IGVkZ2VzIGNhbiBiZSBsb29rZWQgdXAgYnkgZW5kcG9pbnQgcGFpcnNcbiAgICAgIGNvbnN0IGZyb21fbWFwcGluZyA6IE1hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9lZGdlX21hcC5nZXQodHIuZnJvbSkgfHwgbmV3IE1hcCgpO1xuICAgICAgaWYgKCEodGhpcy5fZWRnZV9tYXAuaGFzKHRyLmZyb20pKSkge1xuICAgICAgICB0aGlzLl9lZGdlX21hcC5zZXQodHIuZnJvbSwgZnJvbV9tYXBwaW5nKTtcbiAgICAgIH1cblxuLy8gICAgY29uc3QgdG9fbWFwcGluZyA9IGZyb21fbWFwcGluZy5nZXQodHIudG8pO1xuICAgICAgZnJvbV9tYXBwaW5nLnNldCh0ci50bywgdGhpc0VkZ2VJZCk7IC8vIGFscmVhZHkgY2hlY2tlZCB0aGF0IHRoaXMgbWFwcGluZyBkb2Vzbid0IGV4aXN0LCBhYm92ZVxuXG4gICAgICAvLyBzZXQgdXAgdGhlIGFjdGlvbiBtYXBwaW5nLCBzbyB0aGF0IGFjdGlvbnMgY2FuIGJlIGxvb2tlZCB1cCBieSBvcmlnaW5cbiAgICAgIGlmICh0ci5hY3Rpb24pIHtcblxuXG4gICAgICAgIC8vIGZvcndhcmQgbWFwcGluZyBmaXJzdCBieSBhY3Rpb24gbmFtZVxuICAgICAgICBsZXQgYWN0aW9uTWFwIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9hY3Rpb25zLmdldCh0ci5hY3Rpb24pO1xuICAgICAgICBpZiAoIShhY3Rpb25NYXApKSB7XG4gICAgICAgICAgYWN0aW9uTWFwID0gbmV3IE1hcCgpO1xuICAgICAgICAgIHRoaXMuX2FjdGlvbnMuc2V0KHRyLmFjdGlvbiwgYWN0aW9uTWFwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhY3Rpb25NYXAuaGFzKHRyLmZyb20pKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBhY3Rpb24gJHtKU09OLnN0cmluZ2lmeSh0ci5hY3Rpb24pfSBhbHJlYWR5IGF0dGFjaGVkIHRvIG9yaWdpbiAke0pTT04uc3RyaW5naWZ5KHRyLmZyb20pfWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFjdGlvbk1hcC5zZXQodHIuZnJvbSwgdGhpc0VkZ2VJZCk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8vIHJldmVyc2UgbWFwcGluZyBmaXJzdCBieSBzdGF0ZSBvcmlnaW4gbmFtZVxuICAgICAgICBsZXQgckFjdGlvbk1hcCA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh0ci5mcm9tKTtcbiAgICAgICAgaWYgKCEockFjdGlvbk1hcCkpIHtcbiAgICAgICAgICByQWN0aW9uTWFwID0gbmV3IE1hcCgpO1xuICAgICAgICAgIHRoaXMuX3JldmVyc2VfYWN0aW9ucy5zZXQodHIuZnJvbSwgckFjdGlvbk1hcCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBubyBuZWVkIHRvIHRlc3QgZm9yIHJldmVyc2UgbWFwcGluZyBwcmUtcHJlc2VuY2U7XG4gICAgICAgIC8vIGZvcndhcmQgbWFwcGluZyBhbHJlYWR5IGNvdmVycyBjb2xsaXNpb25zXG4gICAgICAgIHJBY3Rpb25NYXAuc2V0KHRyLmFjdGlvbiwgdGhpc0VkZ2VJZCk7XG5cblxuICAgICAgICAvLyByZXZlcnNlIG1hcHBpbmcgZmlyc3QgYnkgc3RhdGUgdGFyZ2V0IG5hbWVcbiAgICAgICAgaWYgKCEodGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5oYXModHIudG8pKSkge1xuICAgICAgICAgIHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuc2V0KHRyLnRvLCBuZXcgTWFwKCkpO1xuICAgICAgICB9XG5cbi8qIHRvZG8gY29tZWJhY2tcbiAgIGZ1bmRhbWVudGFsIHByb2JsZW0gaXMgcm9BY3Rpb25NYXAgbmVlZHMgdG8gYmUgYSBtdWx0aW1hcFxuICAgICAgICBjb25zdCByb0FjdGlvbk1hcCA9IHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuZ2V0KHRyLnRvKTsgIC8vIHdhc3RlZnVsIC0gYWxyZWFkeSBkaWQgaGFzIC0gcmVmYWN0b3JcbiAgICAgICAgaWYgKHJvQWN0aW9uTWFwKSB7XG4gICAgICAgICAgaWYgKHJvQWN0aW9uTWFwLmhhcyh0ci5hY3Rpb24pKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHJvLWFjdGlvbiAke3RyLnRvfSBhbHJlYWR5IGF0dGFjaGVkIHRvIGFjdGlvbiAke3RyLmFjdGlvbn1gKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcm9BY3Rpb25NYXAuc2V0KHRyLmFjdGlvbiwgdGhpc0VkZ2VJZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc2hvdWxkIGJlIGltcG9zc2libGUgLSBmbG93IGRvZXNuXFwndCBrbm93IC5zZXQgcHJlY2VkZXMgLmdldCB5ZXQgYWdhaW4uICBzZXZlcmUgZXJyb3I/Jyk7XG4gICAgICAgIH1cbiovXG4gICAgICB9XG5cbiAgICB9KTtcblxuICB9XG5cbiAgX25ld19zdGF0ZShzdGF0ZV9jb25maWcgOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD4pIDogbU5UIHsgLy8gd2hhcmdhcmJsIGdldCB0aGF0IHN0YXRlX2NvbmZpZyBhbnkgdW5kZXIgY29udHJvbFxuXG4gICAgaWYgKHRoaXMuX3N0YXRlcy5oYXMoc3RhdGVfY29uZmlnLm5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHN0YXRlICR7SlNPTi5zdHJpbmdpZnkoc3RhdGVfY29uZmlnLm5hbWUpfSBhbHJlYWR5IGV4aXN0c2ApO1xuICAgIH1cblxuICAgIHRoaXMuX3N0YXRlcy5zZXQoc3RhdGVfY29uZmlnLm5hbWUsIHN0YXRlX2NvbmZpZyk7XG4gICAgcmV0dXJuIHN0YXRlX2NvbmZpZy5uYW1lO1xuXG4gIH1cblxuXG5cbiAgc3RhdGUoKSA6IG1OVCB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlO1xuICB9XG5cbi8qIHdoYXJnYXJibCB0b2RvIG1ham9yXG4gICB3aGVuIHdlIHJlaW1wbGVtZW50IHRoaXMsIHJlaW50cm9kdWNlIHRoaXMgY2hhbmdlIHRvIHRoZSBpc19maW5hbCBjYWxsXG5cbiAgaXNfY2hhbmdpbmcoKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlOyAvLyB0b2RvIHdoYXJnYXJibFxuICB9XG4qL1xuXG5cbiAgc3RhdGVfaXNfZmluYWwod2hpY2hTdGF0ZSA6IG1OVCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gKCAodGhpcy5zdGF0ZV9pc190ZXJtaW5hbCh3aGljaFN0YXRlKSkgJiYgKHRoaXMuc3RhdGVfaXNfY29tcGxldGUod2hpY2hTdGF0ZSkpICk7XG4gIH1cblxuICBpc19maW5hbCgpIDogYm9vbGVhbiB7XG4vLyAgcmV0dXJuICgoIXRoaXMuaXNfY2hhbmdpbmcoKSkgJiYgdGhpcy5zdGF0ZV9pc19maW5hbCh0aGlzLnN0YXRlKCkpKTtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZV9pc19maW5hbCh0aGlzLnN0YXRlKCkpO1xuICB9XG5cbiAgZ3JhcGhfbGF5b3V0KCkgOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9ncmFwaF9sYXlvdXQ7XG4gIH1cblxuXG5cbiAgbWFjaGluZV9hdXRob3IoKSA6ID9BcnJheTxzdHJpbmc+IHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9hdXRob3I7XG4gIH1cblxuICBtYWNoaW5lX2NvbW1lbnQoKSA6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2NvbW1lbnQ7XG4gIH1cblxuICBtYWNoaW5lX2NvbnRyaWJ1dG9yKCkgOiA/QXJyYXk8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfY29udHJpYnV0b3I7XG4gIH1cblxuICBtYWNoaW5lX2RlZmluaXRpb24oKSA6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2RlZmluaXRpb247XG4gIH1cblxuICBtYWNoaW5lX2xpY2Vuc2UoKSA6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2xpY2Vuc2U7XG4gIH1cblxuICBtYWNoaW5lX25hbWUoKSA6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX25hbWU7XG4gIH1cblxuICBtYWNoaW5lX3ZlcnNpb24oKSA6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX3ZlcnNpb247XG4gIH1cblxuICBmc2xfdmVyc2lvbigpIDogP3N0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX2ZzbF92ZXJzaW9uO1xuICB9XG5cblxuXG4gIG1hY2hpbmVfc3RhdGUoKSA6IEpzc21NYWNoaW5lSW50ZXJuYWxTdGF0ZTxtTlQsIG1EVD4ge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGludGVybmFsX3N0YXRlX2ltcGxfdmVyc2lvbiA6IDEsXG5cbiAgICAgIGFjdGlvbnMgICAgICAgICAgICAgICAgOiB0aGlzLl9hY3Rpb25zLFxuICAgICAgZWRnZV9tYXAgICAgICAgICAgICAgICA6IHRoaXMuX2VkZ2VfbWFwLFxuICAgICAgZWRnZXMgICAgICAgICAgICAgICAgICA6IHRoaXMuX2VkZ2VzLFxuICAgICAgbmFtZWRfdHJhbnNpdGlvbnMgICAgICA6IHRoaXMuX25hbWVkX3RyYW5zaXRpb25zLFxuICAgICAgcmV2ZXJzZV9hY3Rpb25zICAgICAgICA6IHRoaXMuX3JldmVyc2VfYWN0aW9ucyxcbi8vICAgIHJldmVyc2VfYWN0aW9uX3RhcmdldHMgOiB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLFxuICAgICAgc3RhdGUgICAgICAgICAgICAgICAgICA6IHRoaXMuX3N0YXRlLFxuICAgICAgc3RhdGVzICAgICAgICAgICAgICAgICA6IHRoaXMuX3N0YXRlc1xuICAgIH07XG5cbiAgfVxuXG4vKlxuICBsb2FkX21hY2hpbmVfc3RhdGUoKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmYWxzZTsgLy8gdG9kbyB3aGFyZ2FyYmxcbiAgfVxuKi9cblxuXG4gIHN0YXRlcygpIDogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuIFsuLi4gdGhpcy5fc3RhdGVzLmtleXMoKV07XG4gIH1cblxuICBzdGF0ZV9mb3Iod2hpY2hTdGF0ZSA6IG1OVCkgOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD4ge1xuICAgIGNvbnN0IHN0YXRlIDogP0pzc21HZW5lcmljU3RhdGU8bU5UPiA9IHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHN0YXRlKSB7IHJldHVybiBzdGF0ZTsgfVxuICAgIGVsc2UgICAgICAgeyB0aHJvdyBuZXcgRXJyb3IoYG5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeShzdGF0ZSl9YCk7IH1cbiAgfVxuXG5cblxuICBsaXN0X2VkZ2VzKCkgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4ge1xuICAgIHJldHVybiB0aGlzLl9lZGdlcztcbiAgfVxuXG4gIGxpc3RfbmFtZWRfdHJhbnNpdGlvbnMoKSA6IE1hcDxtTlQsIG51bWJlcj4ge1xuICAgIHJldHVybiB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucztcbiAgfVxuXG4gIGxpc3RfYWN0aW9ucygpIDogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuIFsuLi4gdGhpcy5fYWN0aW9ucy5rZXlzKCldO1xuICB9XG5cblxuXG4gIGdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzKGZyb206IG1OVCwgdG86IG1OVCkgOiA/bnVtYmVyIHtcblxuICAgIGNvbnN0IGVtZyA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fZWRnZV9tYXAuZ2V0KGZyb20pO1xuXG4gICAgaWYgKGVtZykge1xuICAgICAgcmV0dXJuIGVtZy5nZXQodG8pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICB9XG5cblxuXG4gIGxvb2t1cF90cmFuc2l0aW9uX2Zvcihmcm9tOiBtTlQsIHRvOiBtTlQpIDogP0pzc21UcmFuc2l0aW9uPG1OVCwgbURUPiB7XG4gICAgY29uc3QgaWQgOiA/bnVtYmVyID0gdGhpcy5nZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyhmcm9tLCB0byk7XG4gICAgcmV0dXJuICgoaWQgPT09IHVuZGVmaW5lZCkgfHwgKGlkID09PSBudWxsKSk/IHVuZGVmaW5lZCA6IHRoaXMuX2VkZ2VzW2lkXTtcbiAgfVxuXG5cblxuICBsaXN0X3RyYW5zaXRpb25zKHdoaWNoU3RhdGUgOiBtTlQgPSB0aGlzLnN0YXRlKCkpIDogSnNzbVRyYW5zaXRpb25MaXN0PG1OVD4ge1xuICAgIHJldHVybiB7ZW50cmFuY2VzOiB0aGlzLmxpc3RfZW50cmFuY2VzKHdoaWNoU3RhdGUpLCBleGl0czogdGhpcy5saXN0X2V4aXRzKHdoaWNoU3RhdGUpfTtcbiAgfVxuXG4gIGxpc3RfZW50cmFuY2VzKHdoaWNoU3RhdGUgOiBtTlQgPSB0aGlzLnN0YXRlKCkpIDogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuICh0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpIHx8IHt9KS5mcm9tIHx8IFtdO1xuICB9XG5cbiAgbGlzdF9leGl0cyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiAodGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKSB8fCB7fSkudG8gICB8fCBbXTtcbiAgfVxuXG5cblxuICBwcm9iYWJsZV9leGl0c19mb3Iod2hpY2hTdGF0ZSA6IG1OVCkgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4ge1xuXG4gICAgY29uc3Qgd3N0YXRlIDogP0pzc21HZW5lcmljU3RhdGU8bU5UPiA9IHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKCEod3N0YXRlKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX0gaW4gcHJvYmFibGVfZXhpdHNfZm9yYCk7IH1cblxuICAgIGNvbnN0IHdzdGF0ZV90byA6IEFycmF5PCBtTlQgPiA9IHdzdGF0ZS50byxcblxuICAgICAgICAgIHd0ZiAgICAgICA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiAvLyB3c3RhdGVfdG9fZmlsdGVyZWQgLT4gd3RmXG4gICAgICAgICAgICAgICAgICAgID0gd3N0YXRlX3RvXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKCAod3MpIDogP0pzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9PiB0aGlzLmxvb2t1cF90cmFuc2l0aW9uX2Zvcih0aGlzLnN0YXRlKCksIHdzKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbik7XG5cbiAgICByZXR1cm4gd3RmO1xuXG4gIH1cblxuICBwcm9iYWJpbGlzdGljX3RyYW5zaXRpb24oKSA6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHNlbGVjdGVkIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gd2VpZ2h0ZWRfcmFuZF9zZWxlY3QodGhpcy5wcm9iYWJsZV9leGl0c19mb3IodGhpcy5zdGF0ZSgpKSk7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNpdGlvbiggc2VsZWN0ZWQudG8gKTtcbiAgfVxuXG4gIHByb2JhYmlsaXN0aWNfd2FsayhuIDogbnVtYmVyKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBzZXEobilcbiAgICAgICAgICAubWFwKCgpIDogbU5UID0+IHtcbiAgICAgICAgICAgICBjb25zdCBzdGF0ZV93YXMgOiBtTlQgPSB0aGlzLnN0YXRlKCk7XG4gICAgICAgICAgICAgdGhpcy5wcm9iYWJpbGlzdGljX3RyYW5zaXRpb24oKTtcbiAgICAgICAgICAgICByZXR1cm4gc3RhdGVfd2FzO1xuICAgICAgICAgICB9KVxuICAgICAgICAgIC5jb25jYXQoW3RoaXMuc3RhdGUoKV0pO1xuICB9XG5cbiAgcHJvYmFiaWxpc3RpY19oaXN0b193YWxrKG4gOiBudW1iZXIpIDogTWFwPG1OVCwgbnVtYmVyPiB7XG4gICAgcmV0dXJuIGhpc3RvZ3JhcGgodGhpcy5wcm9iYWJpbGlzdGljX3dhbGsobikpO1xuICB9XG5cblxuXG4gIGFjdGlvbnMod2hpY2hTdGF0ZSA6IG1OVCA9IHRoaXMuc3RhdGUoKSApIDogQXJyYXk8bU5UPiB7XG4gICAgY29uc3Qgd3N0YXRlIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICh3c3RhdGUpIHsgcmV0dXJuIFsuLi4gd3N0YXRlLmtleXMoKV07IH1cbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG4gIH1cblxuICBsaXN0X3N0YXRlc19oYXZpbmdfYWN0aW9uKHdoaWNoU3RhdGUgOiBtTlQpIDogQXJyYXk8bU5UPiB7XG4gICAgY29uc3Qgd3N0YXRlIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9hY3Rpb25zLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAod3N0YXRlKSB7IHJldHVybiBbLi4uIHdzdGF0ZS5rZXlzKCldOyB9XG4gICAgZWxzZSAgICAgICAgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuICB9XG5cbi8vIGNvbWViYWNrXG4vKlxuICBsaXN0X2VudHJhbmNlX2FjdGlvbnMod2hpY2hTdGF0ZSA6IG1OVCA9IHRoaXMuc3RhdGUoKSApIDogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuIFsuLi4gKHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuZ2V0KHdoaWNoU3RhdGUpIHx8IG5ldyBNYXAoKSkudmFsdWVzKCldIC8vIHdhc3RlZnVsXG4gICAgICAgICAgIC5tYXAoIChlZGdlSWQ6YW55KSA9PiAodGhpcy5fZWRnZXNbZWRnZUlkXSA6IGFueSkpIC8vIHdoYXJnYXJibCBidXJuIG91dCBhbnlcbiAgICAgICAgICAgLmZpbHRlciggKG86YW55KSA9PiBvLnRvID09PSB3aGljaFN0YXRlKVxuICAgICAgICAgICAubWFwKCBmaWx0ZXJlZCA9PiBmaWx0ZXJlZC5mcm9tICk7XG4gIH1cbiovXG4gIGxpc3RfZXhpdF9hY3Rpb25zKHdoaWNoU3RhdGUgOiBtTlQgPSB0aGlzLnN0YXRlKCkgKSA6IEFycmF5PD9tTlQ+IHsgLy8gdGhlc2UgYXJlIG1OVCwgbm90ID9tTlRcbiAgICBjb25zdCByYV9iYXNlIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICghKHJhX2Jhc2UpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG5cbiAgICByZXR1cm4gWy4uLiByYV9iYXNlLnZhbHVlcygpXVxuICAgICAgICAgICAubWFwICAgICggKGVkZ2VJZDpudW1iZXIpICAgICAgICAgICAgICA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9PiB0aGlzLl9lZGdlc1tlZGdlSWRdICAgKVxuICAgICAgICAgICAuZmlsdGVyICggKG86SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+KSA6IGJvb2xlYW4gICAgICAgICAgICAgICAgICA9PiBvLmZyb20gPT09IHdoaWNoU3RhdGUgKVxuICAgICAgICAgICAubWFwICAgICggKGZpbHRlcmVkIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+KSA6ID9tTlQgICAgICAgICAgICA9PiBmaWx0ZXJlZC5hY3Rpb24gICAgICAgKTtcbiAgfVxuXG4gIHByb2JhYmxlX2FjdGlvbl9leGl0cyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpICkgOiBBcnJheTxtaXhlZD4geyAvLyB0aGVzZSBhcmUgbU5UXG4gICAgY29uc3QgcmFfYmFzZSA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAoIShyYV9iYXNlKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuXG4gICAgcmV0dXJuIFsuLi4gcmFfYmFzZS52YWx1ZXMoKV1cbiAgICAgICAgICAgLm1hcCAgICAoIChlZGdlSWQ6bnVtYmVyKSA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9PiB0aGlzLl9lZGdlc1tlZGdlSWRdICAgKVxuICAgICAgICAgICAuZmlsdGVyICggKG86SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+KSA6IGJvb2xlYW4gICAgID0+IG8uZnJvbSA9PT0gd2hpY2hTdGF0ZSApXG4gICAgICAgICAgIC5tYXAgICAgKCAoZmlsdGVyZWQpIDogbWl4ZWQgICAgICAgICAgICAgICAgICAgICAgICAgPT4gKCB7IGFjdGlvbiAgICAgIDogZmlsdGVyZWQuYWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9iYWJpbGl0eSA6IGZpbHRlcmVkLnByb2JhYmlsaXR5IH0gKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gIH1cblxuXG5cbiAgaXNfdW5lbnRlcmFibGUod2hpY2hTdGF0ZSA6IG1OVCkgOiBib29sZWFuIHtcbiAgICAvLyB3aGFyZ2FyYmwgc2hvdWxkIHRocm93IG9uIHVua25vd24gc3RhdGVcbiAgICByZXR1cm4gdGhpcy5saXN0X2VudHJhbmNlcyh3aGljaFN0YXRlKS5sZW5ndGggPT09IDA7XG4gIH1cblxuICBoYXNfdW5lbnRlcmFibGVzKCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZXMoKS5zb21lKCAoeCkgOiBib29sZWFuID0+IHRoaXMuaXNfdW5lbnRlcmFibGUoeCkpO1xuICB9XG5cblxuXG4gIGlzX3Rlcm1pbmFsKCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZV9pc190ZXJtaW5hbCh0aGlzLnN0YXRlKCkpO1xuICB9XG5cbiAgc3RhdGVfaXNfdGVybWluYWwod2hpY2hTdGF0ZSA6IG1OVCkgOiBib29sZWFuIHtcbiAgICAvLyB3aGFyZ2FyYmwgc2hvdWxkIHRocm93IG9uIHVua25vd24gc3RhdGVcbiAgICByZXR1cm4gdGhpcy5saXN0X2V4aXRzKHdoaWNoU3RhdGUpLmxlbmd0aCA9PT0gMDtcbiAgfVxuXG4gIGhhc190ZXJtaW5hbHMoKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlcygpLnNvbWUoICh4KSA6IGJvb2xlYW4gPT4gdGhpcy5zdGF0ZV9pc190ZXJtaW5hbCh4KSk7XG4gIH1cblxuXG5cbiAgaXNfY29tcGxldGUoKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHRoaXMuc3RhdGUoKSk7XG4gIH1cblxuICBzdGF0ZV9pc19jb21wbGV0ZSh3aGljaFN0YXRlIDogbU5UKSA6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHdzdGF0ZSA6ID9Kc3NtR2VuZXJpY1N0YXRlPG1OVD4gPSB0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICh3c3RhdGUpIHsgcmV0dXJuIHdzdGF0ZS5jb21wbGV0ZTsgfVxuICAgIGVsc2UgICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cbiAgfVxuXG4gIGhhc19jb21wbGV0ZXMoKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlcygpLnNvbWUoICh4KSA6IGJvb2xlYW4gPT4gdGhpcy5zdGF0ZV9pc19jb21wbGV0ZSh4KSApO1xuICB9XG5cblxuXG4gIGFjdGlvbihuYW1lIDogbU5ULCBuZXdEYXRhPyA6IG1EVCkgOiBib29sZWFuIHtcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBpZiAodGhpcy52YWxpZF9hY3Rpb24obmFtZSwgbmV3RGF0YSkpIHtcbiAgICAgIGNvbnN0IGVkZ2UgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB0aGlzLmN1cnJlbnRfYWN0aW9uX2VkZ2VfZm9yKG5hbWUpO1xuICAgICAgdGhpcy5fc3RhdGUgPSBlZGdlLnRvO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICB0cmFuc2l0aW9uKG5ld1N0YXRlIDogbU5ULCBuZXdEYXRhPyA6IG1EVCkgOiBib29sZWFuIHtcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBpZiAodGhpcy52YWxpZF90cmFuc2l0aW9uKG5ld1N0YXRlLCBuZXdEYXRhKSkge1xuICAgICAgdGhpcy5fc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgLy8gY2FuIGxlYXZlIG1hY2hpbmUgaW4gaW5jb25zaXN0ZW50IHN0YXRlLiAgZ2VuZXJhbGx5IGRvIG5vdCB1c2VcbiAgZm9yY2VfdHJhbnNpdGlvbihuZXdTdGF0ZSA6IG1OVCwgbmV3RGF0YT8gOiBtRFQpIDogYm9vbGVhbiB7XG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgaWYgKHRoaXMudmFsaWRfZm9yY2VfdHJhbnNpdGlvbihuZXdTdGF0ZSwgbmV3RGF0YSkpIHtcbiAgICAgIHRoaXMuX3N0YXRlID0gbmV3U3RhdGU7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG5cblxuICBjdXJyZW50X2FjdGlvbl9mb3IoYWN0aW9uIDogbU5UKSA6IG51bWJlciB8IHZvaWQge1xuICAgIGNvbnN0IGFjdGlvbl9iYXNlIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9hY3Rpb25zLmdldChhY3Rpb24pO1xuICAgIHJldHVybiBhY3Rpb25fYmFzZT8gYWN0aW9uX2Jhc2UuZ2V0KHRoaXMuc3RhdGUoKSkgOiB1bmRlZmluZWQ7XG4gIH1cblxuICBjdXJyZW50X2FjdGlvbl9lZGdlX2ZvcihhY3Rpb24gOiBtTlQpIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+IHtcbiAgICBjb25zdCBpZHggOiA/bnVtYmVyID0gdGhpcy5jdXJyZW50X2FjdGlvbl9mb3IoYWN0aW9uKTtcbiAgICBpZiAoKGlkeCA9PT0gdW5kZWZpbmVkKSB8fCAoaWR4ID09PSBudWxsKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggYWN0aW9uICR7SlNPTi5zdHJpbmdpZnkoYWN0aW9uKX1gKTsgfVxuICAgIHJldHVybiB0aGlzLl9lZGdlc1tpZHhdO1xuICB9XG5cbiAgdmFsaWRfYWN0aW9uKGFjdGlvbiA6IG1OVCwgX25ld0RhdGE/IDogbURUKSA6IGJvb2xlYW4geyAgLy8gdG9kbyBjb21lYmFjayB1bmlnbm9yZSBuZXdEYXRhXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgcmV0dXJuIHRoaXMuY3VycmVudF9hY3Rpb25fZm9yKGFjdGlvbikgIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHZhbGlkX3RyYW5zaXRpb24obmV3U3RhdGUgOiBtTlQsIF9uZXdEYXRhPyA6IG1EVCkgOiBib29sZWFuIHsgIC8vIHRvZG8gY29tZWJhY2sgdW5pZ25vcmUgbmV3RGF0YVxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGNvbnN0IHRyYW5zaXRpb25fZm9yIDogP0pzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHRoaXMubG9va3VwX3RyYW5zaXRpb25fZm9yKHRoaXMuc3RhdGUoKSwgbmV3U3RhdGUpO1xuXG4gICAgaWYgKCEodHJhbnNpdGlvbl9mb3IpKSAgICAgICAgICB7IHJldHVybiBmYWxzZTsgfVxuICAgIGlmICh0cmFuc2l0aW9uX2Zvci5mb3JjZWRfb25seSkgeyByZXR1cm4gZmFsc2U7IH1cblxuICAgIHJldHVybiB0cnVlO1xuXG4gIH1cblxuICB2YWxpZF9mb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlIDogbU5ULCBfbmV3RGF0YT8gOiBtRFQpIDogYm9vbGVhbiB7ICAvLyB0b2RvIGNvbWViYWNrIHVuaWdub3JlIG5ld0RhdGFcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICByZXR1cm4gKHRoaXMubG9va3VwX3RyYW5zaXRpb25fZm9yKHRoaXMuc3RhdGUoKSwgbmV3U3RhdGUpICE9PSB1bmRlZmluZWQpO1xuICB9XG5cblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIHNtPG1OVCwgbURUPih0ZW1wbGF0ZV9zdHJpbmdzIDogQXJyYXk8c3RyaW5nPiAvKiAsIGFyZ3VtZW50cyAqLykgOiBNYWNoaW5lPG1OVCwgbURUPiB7XG5cbiAgICAvLyBmb29gYSR7MX1iJHsyfWNgIHdpbGwgY29tZSBpbiBhcyAoWydhJywnYicsJ2MnXSwxLDIpXG4gICAgLy8gdGhpcyBpbmNsdWRlcyB3aGVuIGEgYW5kIGMgYXJlIGVtcHR5IHN0cmluZ3NcbiAgICAvLyB0aGVyZWZvcmUgdGVtcGxhdGVfc3RyaW5ncyB3aWxsIGFsd2F5cyBoYXZlIG9uZSBtb3JlIGVsIHRoYW4gdGVtcGxhdGVfYXJnc1xuICAgIC8vIHRoZXJlZm9yZSBtYXAgdGhlIHNtYWxsZXIgY29udGFpbmVyIGFuZCB0b3NzIHRoZSBsYXN0IG9uZSBvbiBvbiB0aGUgd2F5IG91dFxuXG4gICAgcmV0dXJuIG5ldyBNYWNoaW5lKG1ha2UodGVtcGxhdGVfc3RyaW5ncy5yZWR1Y2UoXG5cbiAgICAgIC8vIGluIGdlbmVyYWwgYXZvaWRpbmcgYGFyZ3VtZW50c2AgaXMgc21hcnQuICBob3dldmVyIHdpdGggdGhlIHRlbXBsYXRlXG4gICAgICAvLyBzdHJpbmcgbm90YXRpb24sIGFzIGRlc2lnbmVkLCBpdCdzIG5vdCByZWFsbHkgd29ydGggdGhlIGhhc3NsZVxuXG4gICAgICAvKiBlc2xpbnQtZGlzYWJsZSBmcC9uby1hcmd1bWVudHMgKi9cbiAgICAgIC8qIGVzbGludC1kaXNhYmxlIHByZWZlci1yZXN0LXBhcmFtcyAqL1xuICAgICAgKGFjYywgdmFsLCBpZHgpIDogc3RyaW5nID0+IGAke2FjY30ke2FyZ3VtZW50c1tpZHhdfSR7dmFsfWAgIC8vIGFyZ3VtZW50c1swXSBpcyBuZXZlciBsb2FkZWQsIHNvIGFyZ3MgZG9lc24ndCBuZWVkIHRvIGJlIGdhdGVkXG4gICAgICAvKiBlc2xpbnQtZW5hYmxlICBwcmVmZXItcmVzdC1wYXJhbXMgKi9cbiAgICAgIC8qIGVzbGludC1lbmFibGUgIGZwL25vLWFyZ3VtZW50cyAqL1xuXG4gICAgKSkpO1xuXG59XG5cblxuXG5cblxuZXhwb3J0IHtcblxuICB2ZXJzaW9uLFxuXG4gIE1hY2hpbmUsXG5cbiAgbWFrZSxcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuXG4gIHNtLFxuXG4gIGFycm93X2RpcmVjdGlvbixcbiAgYXJyb3dfbGVmdF9raW5kLFxuICBhcnJvd19yaWdodF9raW5kLFxuXG4gIC8vIHRvZG8gd2hhcmdhcmJsIHRoZXNlIHNob3VsZCBiZSBleHBvcnRlZCB0byBhIHV0aWxpdHkgbGlicmFyeVxuICBzZXEsIHdlaWdodGVkX3JhbmRfc2VsZWN0LCBoaXN0b2dyYXBoLCB3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0LCB3ZWlnaHRlZF9oaXN0b19rZXlcblxufTtcbiJdfQ==