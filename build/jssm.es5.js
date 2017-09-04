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

var version = '5.6.0'; // replaced from package.js in build


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

  var oneOnlyKeys = ['graph_layout', 'machine_name', 'machine_version', 'machine_comment', 'fsl_version', 'machine_license'];

  oneOnlyKeys.map(function (oneOnlyKey) {
    if (results[oneOnlyKey].length > 1) {
      throw new Error('May only have one ' + oneOnlyKey + ' statement maximum: ' + JSON.stringify(results[oneOnlyKey]));
    } else {
      if (results[oneOnlyKey].length) {
        result_cfg[oneOnlyKey] = results[oneOnlyKey][0];
      }
    }
  });

  ['machine_author'].map(function (multiKey) {
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
      return String(this._graph_layout);
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
          wtf = wstate_to.map(function (ws) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLmpzIl0sIm5hbWVzIjpbInBhcnNlIiwicmVxdWlyZSIsInZlcnNpb24iLCJhcnJvd19kaXJlY3Rpb24iLCJhcnJvdyIsIlN0cmluZyIsIkVycm9yIiwiYXJyb3dfbGVmdF9raW5kIiwiYXJyb3dfcmlnaHRfa2luZCIsImNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXAiLCJhY2MiLCJmcm9tIiwidG8iLCJ0aGlzX3NlIiwibmV4dF9zZSIsImVkZ2VzIiwidUZyb20iLCJBcnJheSIsImlzQXJyYXkiLCJ1VG8iLCJtYXAiLCJmIiwidCIsInJrIiwia2luZCIsImxrIiwicmlnaHQiLCJmb3JjZWRfb25seSIsIm1haW5fcGF0aCIsInJfYWN0aW9uIiwiYWN0aW9uIiwicl9wcm9iYWJpbGl0eSIsInByb2JhYmlsaXR5IiwicHVzaCIsImxlZnQiLCJsX2FjdGlvbiIsImxfcHJvYmFiaWxpdHkiLCJuZXdfYWNjIiwiY29uY2F0Iiwic2UiLCJjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb24iLCJydWxlIiwiY29tcGlsZV9ydWxlX2hhbmRsZXIiLCJrZXkiLCJhZ2dfYXMiLCJ2YWwiLCJ0YXV0b2xvZ2llcyIsImluY2x1ZGVzIiwidmFsdWUiLCJKU09OIiwic3RyaW5naWZ5IiwiY29tcGlsZSIsInRyZWUiLCJyZXN1bHRzIiwiZ3JhcGhfbGF5b3V0IiwidHJhbnNpdGlvbiIsInN0YXJ0X3N0YXRlcyIsImVuZF9zdGF0ZXMiLCJmc2xfdmVyc2lvbiIsIm1hY2hpbmVfYXV0aG9yIiwibWFjaGluZV9jb21tZW50IiwibWFjaGluZV9jb250cmlidXRvciIsIm1hY2hpbmVfZGVmaW5pdGlvbiIsIm1hY2hpbmVfbGljZW5zZSIsIm1hY2hpbmVfbmFtZSIsIm1hY2hpbmVfdmVyc2lvbiIsInRyIiwiYXNzZW1ibGVkX3RyYW5zaXRpb25zIiwicmVzdWx0X2NmZyIsImxlbmd0aCIsInRyYW5zaXRpb25zIiwib25lT25seUtleXMiLCJvbmVPbmx5S2V5IiwibXVsdGlLZXkiLCJtYWtlIiwicGxhbiIsIk1hY2hpbmUiLCJjb21wbGV0ZSIsIl9zdGF0ZSIsIl9zdGF0ZXMiLCJNYXAiLCJfZWRnZXMiLCJfZWRnZV9tYXAiLCJfbmFtZWRfdHJhbnNpdGlvbnMiLCJfYWN0aW9ucyIsIl9yZXZlcnNlX2FjdGlvbnMiLCJfcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyIsIl9ncmFwaF9sYXlvdXQiLCJ1bmRlZmluZWQiLCJjdXJzb3JfZnJvbSIsImdldCIsIm5hbWUiLCJoYXMiLCJfbmV3X3N0YXRlIiwiY3Vyc29yX3RvIiwidGhpc0VkZ2VJZCIsInNldCIsImZyb21fbWFwcGluZyIsImFjdGlvbk1hcCIsInJBY3Rpb25NYXAiLCJzdGF0ZV9jb25maWciLCJ3aGljaFN0YXRlIiwic3RhdGVfaXNfdGVybWluYWwiLCJzdGF0ZV9pc19jb21wbGV0ZSIsInN0YXRlX2lzX2ZpbmFsIiwic3RhdGUiLCJpbnRlcm5hbF9zdGF0ZV9pbXBsX3ZlcnNpb24iLCJhY3Rpb25zIiwiZWRnZV9tYXAiLCJuYW1lZF90cmFuc2l0aW9ucyIsInJldmVyc2VfYWN0aW9ucyIsInN0YXRlcyIsImtleXMiLCJlbWciLCJpZCIsImdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzIiwiZW50cmFuY2VzIiwibGlzdF9lbnRyYW5jZXMiLCJleGl0cyIsImxpc3RfZXhpdHMiLCJ3c3RhdGUiLCJ3c3RhdGVfdG8iLCJ3dGYiLCJ3cyIsImxvb2t1cF90cmFuc2l0aW9uX2ZvciIsImZpbHRlciIsIkJvb2xlYW4iLCJzZWxlY3RlZCIsInByb2JhYmxlX2V4aXRzX2ZvciIsIm4iLCJzdGF0ZV93YXMiLCJwcm9iYWJpbGlzdGljX3RyYW5zaXRpb24iLCJwcm9iYWJpbGlzdGljX3dhbGsiLCJyYV9iYXNlIiwidmFsdWVzIiwiZWRnZUlkIiwibyIsImZpbHRlcmVkIiwic29tZSIsIngiLCJpc191bmVudGVyYWJsZSIsIm5ld0RhdGEiLCJ2YWxpZF9hY3Rpb24iLCJlZGdlIiwiY3VycmVudF9hY3Rpb25fZWRnZV9mb3IiLCJuZXdTdGF0ZSIsInZhbGlkX3RyYW5zaXRpb24iLCJ2YWxpZF9mb3JjZV90cmFuc2l0aW9uIiwiYWN0aW9uX2Jhc2UiLCJpZHgiLCJjdXJyZW50X2FjdGlvbl9mb3IiLCJfbmV3RGF0YSIsInRyYW5zaXRpb25fZm9yIiwic20iLCJ0ZW1wbGF0ZV9zdHJpbmdzIiwicmVkdWNlIiwic2VxIiwid2VpZ2h0ZWRfcmFuZF9zZWxlY3QiLCJoaXN0b2dyYXBoIiwid2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCIsIndlaWdodGVkX2hpc3RvX2tleSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBcUJBOzs7Ozs7QUFwQkE7O0FBc0JBLElBQU1BLFFBQWdEQyxRQUFRLGVBQVIsRUFBeUJELEtBQS9FLEMsQ0FBdUY7O0FBRXZGLElBQU1FLFVBQWlCLElBQXZCLEMsQ0FBNkI7OztBQU03QixTQUFTQyxlQUFULENBQXlCQyxLQUF6QixFQUFpRTs7QUFFL0QsVUFBU0MsT0FBT0QsS0FBUCxDQUFUOztBQUVFLFNBQUssSUFBTCxDQUFhLEtBQUssSUFBTCxDQUFjLEtBQUssSUFBTDtBQUN6QixhQUFPLE9BQVA7O0FBRUYsU0FBSyxJQUFMLENBQWEsS0FBSyxJQUFMLENBQWMsS0FBSyxJQUFMO0FBQ3pCLGFBQU8sTUFBUDs7QUFFRixTQUFLLEtBQUwsQ0FBYSxLQUFLLE1BQUwsQ0FBYyxLQUFLLE1BQUw7QUFDM0IsU0FBSyxLQUFMLENBQWEsS0FBSyxNQUFMLENBQWMsS0FBSyxNQUFMO0FBQzNCLFNBQUssS0FBTCxDQUFhLEtBQUssTUFBTCxDQUFjLEtBQUssTUFBTDtBQUN6QixhQUFPLE1BQVA7O0FBRUY7QUFDRSxZQUFNLElBQUlFLEtBQUosMENBQWlERixLQUFqRCxDQUFOOztBQWRKO0FBa0JEOztBQU1ELFNBQVNHLGVBQVQsQ0FBeUJILEtBQXpCLEVBQTREOztBQUUxRCxVQUFTQyxPQUFPRCxLQUFQLENBQVQ7O0FBRUUsU0FBSyxJQUFMLENBQVksS0FBSyxJQUFMLENBQWEsS0FBSyxJQUFMO0FBQ3ZCLGFB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QTs7QUFFQSxTQUFPLElBQUk5RSxPQUFKLENBQVlGLEtBQUtnRixpQkFBaUJDLE1BQWpCOztBQUV0QjtBQUNBOztBQUVBO0FBQ0E7QUFDQSxZQUFDakosR0FBRCxFQUFNbUMsR0FBTixFQUFXd0csR0FBWDtBQUFBLGdCQUErQjNJLEdBQS9CLEdBQXFDLFdBQVUySSxHQUFWLENBQXJDLEdBQXNEeEcsR0FBdEQ7QUFBQSxHQVBzQixDQU91QztBQUM3RDtBQUNBOztBQVRzQixHQUFMLENBQVosQ0FBUDtBQWFIOztRQVFDM0MsTyxHQUFBQSxPO1FBRUEwRSxPLEdBQUFBLE87UUFFQUYsSSxHQUFBQSxJO1FBQ0UxRSxLLEdBQUFBLEs7UUFDQW1ELE8sR0FBQUEsTztRQUVGc0csRSxHQUFBQSxFO1FBRUF0SixlLEdBQUFBLGU7UUFDQUksZSxHQUFBQSxlO1FBQ0FDLGdCLEdBQUFBLGdCO1FBR0FvSixHO1FBQUtDLG9CO1FBQXNCQyxVO1FBQVlDLHNCO1FBQXdCQyxrQiIsImZpbGUiOiJqc3NtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vLyB3aGFyZ2FyYmwgbG90cyBvZiB0aGVzZSByZXR1cm4gYXJyYXlzIGNvdWxkL3Nob3VsZCBiZSBzZXRzXG5cbi8vIEBmbG93XG5cbmltcG9ydCB0eXBlIHtcblxuICBKc3NtR2VuZXJpY1N0YXRlLCBKc3NtR2VuZXJpY0NvbmZpZyxcbiAgSnNzbVRyYW5zaXRpb24sIEpzc21UcmFuc2l0aW9uTGlzdCxcbiAgSnNzbU1hY2hpbmVJbnRlcm5hbFN0YXRlLFxuICBKc3NtUGFyc2VUcmVlLFxuICBKc3NtQ29tcGlsZVNlLCBKc3NtQ29tcGlsZVNlU3RhcnQsIEpzc21Db21waWxlUnVsZSxcbiAgSnNzbUFycm93LCBKc3NtQXJyb3dEaXJlY3Rpb24sIEpzc21BcnJvd0tpbmQsXG4gIEpzc21MYXlvdXRcblxufSBmcm9tICcuL2pzc20tdHlwZXMnO1xuXG5cblxuXG5cbmltcG9ydCB7IHNlcSwgd2VpZ2h0ZWRfcmFuZF9zZWxlY3QsIHdlaWdodGVkX3NhbXBsZV9zZWxlY3QsIGhpc3RvZ3JhcGgsIHdlaWdodGVkX2hpc3RvX2tleSB9IGZyb20gJy4vanNzbS11dGlsLmpzJztcblxuY29uc3QgcGFyc2UgOiA8TlQsIERUPihzdHJpbmcpID0+IEpzc21QYXJzZVRyZWU8TlQ+ID0gcmVxdWlyZSgnLi9qc3NtLWRvdC5qcycpLnBhcnNlOyAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBmbG93dHlwZS9uby13ZWFrLXR5cGVzIC8vIHRvZG8gd2hhcmdhcmJsIHJlbW92ZSBhbnlcblxuY29uc3QgdmVyc2lvbiA6IG51bGwgPSBudWxsOyAvLyByZXBsYWNlZCBmcm9tIHBhY2thZ2UuanMgaW4gYnVpbGRcblxuXG5cblxuXG5mdW5jdGlvbiBhcnJvd19kaXJlY3Rpb24oYXJyb3cgOiBKc3NtQXJyb3cpIDogSnNzbUFycm93RGlyZWN0aW9uIHtcblxuICBzd2l0Y2ggKCBTdHJpbmcoYXJyb3cpICkge1xuXG4gICAgY2FzZSAnLT4nIDogIGNhc2UgJz0+JyAgOiAgY2FzZSAnfj4nICA6XG4gICAgICByZXR1cm4gJ3JpZ2h0JztcblxuICAgIGNhc2UgJzwtJyA6ICBjYXNlICc8PScgIDogIGNhc2UgJzx+JyAgOlxuICAgICAgcmV0dXJuICdsZWZ0JztcblxuICAgIGNhc2UgJzwtPic6ICBjYXNlICc8LT0+JzogIGNhc2UgJzwtfj4nOlxuICAgIGNhc2UgJzw9Pic6ICBjYXNlICc8PS0+JzogIGNhc2UgJzw9fj4nOlxuICAgIGNhc2UgJzx+Pic6ICBjYXNlICc8fi0+JzogIGNhc2UgJzx+PT4nOlxuICAgICAgcmV0dXJuICdib3RoJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGFycm93X2RpcmVjdGlvbjogdW5rbm93biBhcnJvdyB0eXBlICR7YXJyb3d9YCk7XG5cbiAgfVxuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gYXJyb3dfbGVmdF9raW5kKGFycm93IDogSnNzbUFycm93KSA6IEpzc21BcnJvd0tpbmQge1xuXG4gIHN3aXRjaCAoIFN0cmluZyhhcnJvdykgKSB7XG5cbiAgICBjYXNlICctPic6ICBjYXNlICc9PicgOiAgY2FzZSAnfj4nOlxuICAgICAgcmV0dXJuICdub25lJztcblxuICAgIGNhc2UgJzwtJzogIGNhc2UgJzwtPic6ICBjYXNlICc8LT0+JzogIGNhc2UgJzwtfj4nOlxuICAgICAgcmV0dXJuICdsZWdhbCc7XG5cbiAgICBjYXNlICc8PSc6ICBjYXNlICc8PT4nOiAgY2FzZSAnPD0tPic6ICBjYXNlICc8PX4+JzpcbiAgICAgIHJldHVybiAnbWFpbic7XG5cbiAgICBjYXNlICc8fic6ICBjYXNlICc8fj4nOiAgY2FzZSAnPH4tPic6ICBjYXNlICc8fj0+JzpcbiAgICAgIHJldHVybiAnZm9yY2VkJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGFycm93X2RpcmVjdGlvbjogdW5rbm93biBhcnJvdyB0eXBlICR7YXJyb3d9YCk7XG5cbiAgfVxuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gYXJyb3dfcmlnaHRfa2luZChhcnJvdyA6IEpzc21BcnJvdykgOiBKc3NtQXJyb3dLaW5kIHtcblxuICBzd2l0Y2ggKCBTdHJpbmcoYXJyb3cpICkge1xuXG4gICAgY2FzZSAnPC0nOiAgY2FzZSAnPD0nIDogIGNhc2UgJzx+JzpcbiAgICAgIHJldHVybiAnbm9uZSc7XG5cbiAgICBjYXNlICctPic6ICBjYXNlICc8LT4nOiAgY2FzZSAnPD0tPic6ICBjYXNlICc8fi0+JzpcbiAgICAgIHJldHVybiAnbGVnYWwnO1xuXG4gICAgY2FzZSAnPT4nOiAgY2FzZSAnPD0+JzogIGNhc2UgJzwtPT4nOiAgY2FzZSAnPH49Pic6XG4gICAgICByZXR1cm4gJ21haW4nO1xuXG4gICAgY2FzZSAnfj4nOiAgY2FzZSAnPH4+JzogIGNhc2UgJzwtfj4nOiAgY2FzZSAnPD1+Pic6XG4gICAgICByZXR1cm4gJ2ZvcmNlZCc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcnJvd19kaXJlY3Rpb246IHVua25vd24gYXJyb3cgdHlwZSAke2Fycm93fWApO1xuXG4gIH1cblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXA8bU5ULCBtRFQ+KFxuICAgICAgICAgICAgIGFjYyAgICAgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4sXG4gICAgICAgICAgICAgZnJvbSAgICA6IG1OVCxcbiAgICAgICAgICAgICB0byAgICAgIDogbU5ULFxuICAgICAgICAgICAgIHRoaXNfc2UgOiBKc3NtQ29tcGlsZVNlPG1OVD4sXG4gICAgICAgICAgICAgbmV4dF9zZSA6IEpzc21Db21waWxlU2U8bU5UPlxuICAgICAgICAgKSA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiB7IC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgcGFyc2VyIHJlcHJlc2VudGF0aW9uIG9mIGEgdHJhbnNpdGlvbiBzdGVwIGV4dGVuc2lvblxuXG4gIGNvbnN0IGVkZ2VzIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+ID0gW107XG5cbiAgY29uc3QgdUZyb20gOiBBcnJheTwgbU5UID4gPSAoQXJyYXkuaXNBcnJheShmcm9tKT8gZnJvbSA6IFtmcm9tXSksXG4gICAgICAgIHVUbyAgIDogQXJyYXk8IG1OVCA+ID0gKEFycmF5LmlzQXJyYXkodG8pPyAgIHRvICAgOiBbdG9dICApO1xuXG4gIHVGcm9tLm1hcCggKGY6bU5UKSA9PiB7XG4gICAgdVRvLm1hcCggKHQ6bU5UKSA9PiB7XG5cbiAgICAgIGNvbnN0IHJrIDogSnNzbUFycm93S2luZCA9IGFycm93X3JpZ2h0X2tpbmQodGhpc19zZS5raW5kKSxcbiAgICAgICAgICAgIGxrIDogSnNzbUFycm93S2luZCA9IGFycm93X2xlZnRfa2luZCh0aGlzX3NlLmtpbmQpO1xuXG5cbiAgICAgIGNvbnN0IHJpZ2h0IDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0ge1xuICAgICAgICBmcm9tICAgICAgICA6IGYsXG4gICAgICAgIHRvICAgICAgICAgIDogdCxcbiAgICAgICAga2luZCAgICAgICAgOiByayxcbiAgICAgICAgZm9yY2VkX29ubHkgOiByayA9PT0gJ2ZvcmNlZCcsXG4gICAgICAgIG1haW5fcGF0aCAgIDogcmsgPT09ICdtYWluJ1xuICAgICAgfTtcblxuICAgICAgaWYgKHRoaXNfc2Uucl9hY3Rpb24pICAgICAgeyByaWdodC5hY3Rpb24gICAgICA9IHRoaXNfc2Uucl9hY3Rpb247ICAgICAgfVxuICAgICAgaWYgKHRoaXNfc2Uucl9wcm9iYWJpbGl0eSkgeyByaWdodC5wcm9iYWJpbGl0eSA9IHRoaXNfc2Uucl9wcm9iYWJpbGl0eTsgfVxuICAgICAgaWYgKHJpZ2h0LmtpbmQgIT09ICdub25lJykgeyBlZGdlcy5wdXNoKHJpZ2h0KTsgfVxuXG5cbiAgICAgIGNvbnN0IGxlZnQgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB7XG4gICAgICAgIGZyb20gICAgICAgIDogdCxcbiAgICAgICAgdG8gICAgICAgICAgOiBmLFxuICAgICAgICBraW5kICAgICAgICA6IGxrLFxuICAgICAgICBmb3JjZWRfb25seSA6IGxrID09PSAnZm9yY2VkJyxcbiAgICAgICAgbWFpbl9wYXRoICAgOiBsayA9PT0gJ21haW4nXG4gICAgICB9O1xuXG4gICAgICBpZiAodGhpc19zZS5sX2FjdGlvbikgICAgICB7IGxlZnQuYWN0aW9uICAgICAgPSB0aGlzX3NlLmxfYWN0aW9uOyAgICAgIH1cbiAgICAgIGlmICh0aGlzX3NlLmxfcHJvYmFiaWxpdHkpIHsgbGVmdC5wcm9iYWJpbGl0eSA9IHRoaXNfc2UubF9wcm9iYWJpbGl0eTsgfVxuICAgICAgaWYgKGxlZnQua2luZCAhPT0gJ25vbmUnKSAgeyBlZGdlcy5wdXNoKGxlZnQpOyB9XG5cbiAgICB9KTtcbiAgfSk7XG5cbiAgY29uc3QgbmV3X2FjYyA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiA9IGFjYy5jb25jYXQoZWRnZXMpO1xuXG4gIGlmIChuZXh0X3NlKSB7XG4gICAgcmV0dXJuIGNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXAobmV3X2FjYywgdG8sIG5leHRfc2UudG8sIG5leHRfc2UsIG5leHRfc2Uuc2UpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXdfYWNjO1xuICB9XG5cbn1cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVfcnVsZV9oYW5kbGVfdHJhbnNpdGlvbjxtTlQ+KHJ1bGUgOiBKc3NtQ29tcGlsZVNlU3RhcnQ8bU5UPikgOiBtaXhlZCB7IC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgcGFyc2VyIHJlcHJlc2VudGF0aW9uIG9mIGEgdHJhbnNpdGlvblxuICByZXR1cm4gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcChbXSwgcnVsZS5mcm9tLCBydWxlLnNlLnRvLCBydWxlLnNlLCBydWxlLnNlLnNlKTtcbn1cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVfcnVsZV9oYW5kbGVyPG1OVD4ocnVsZSA6IEpzc21Db21waWxlU2VTdGFydDxtTlQ+KSA6IEpzc21Db21waWxlUnVsZSB7IC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgb3V0cHV0IG9mIHRoZSBwYXJzZXJcblxuICBpZiAocnVsZS5rZXkgPT09ICd0cmFuc2l0aW9uJykgeyByZXR1cm4geyBhZ2dfYXM6ICd0cmFuc2l0aW9uJywgdmFsOiBjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb24ocnVsZSkgfTsgfVxuXG4gIGNvbnN0IHRhdXRvbG9naWVzIDogQXJyYXk8c3RyaW5nPiA9IFtcbiAgICAnZ3JhcGhfbGF5b3V0JywgJ3N0YXJ0X3N0YXRlcycsICdlbmRfc3RhdGVzJywgJ21hY2hpbmVfbmFtZScsICdtYWNoaW5lX3ZlcnNpb24nLFxuICAgICdtYWNoaW5lX2NvbW1lbnQnLCAnbWFjaGluZV9hdXRob3InLCAnbWFjaGluZV9jb250cmlidXRvcicsICdtYWNoaW5lX2RlZmluaXRpb24nLFxuICAgICdtYWNoaW5lX3JlZmVyZW5jZScsICdtYWNoaW5lX2xpY2Vuc2UnLCAnZnNsX3ZlcnNpb24nXG4gIF07XG5cbiAgaWYgKHRhdXRvbG9naWVzLmluY2x1ZGVzKHJ1bGUua2V5KSkge1xuICAgIHJldHVybiB7IGFnZ19hczogcnVsZS5rZXksIHZhbDogcnVsZS52YWx1ZSB9O1xuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKGBjb21waWxlX3J1bGVfaGFuZGxlcjogVW5rbm93biBydWxlOiAke0pTT04uc3RyaW5naWZ5KHJ1bGUpfWApO1xuXG59XG5cblxuXG5mdW5jdGlvbiBjb21waWxlPG1OVCwgbURUPih0cmVlIDogSnNzbVBhcnNlVHJlZTxtTlQ+KSA6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPiB7ICAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIG91dHB1dCBvZiB0aGUgcGFyc2VyXG5cbiAgY29uc3QgcmVzdWx0cyA6IHtcbiAgICBncmFwaF9sYXlvdXQgICAgICAgIDogQXJyYXk8IEpzc21MYXlvdXQgPixcbiAgICB0cmFuc2l0aW9uICAgICAgICAgIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+LFxuICAgIHN0YXJ0X3N0YXRlcyAgICAgICAgOiBBcnJheTwgbU5UID4sXG4gICAgZW5kX3N0YXRlcyAgICAgICAgICA6IEFycmF5PCBtTlQgPixcbiAgICBmc2xfdmVyc2lvbiAgICAgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfYXV0aG9yICAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9jb21tZW50ICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2NvbnRyaWJ1dG9yIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfZGVmaW5pdGlvbiAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9saWNlbnNlICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX25hbWUgICAgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfdmVyc2lvbiAgICAgOiBBcnJheTwgc3RyaW5nID4gLy8gc2VtdmVyXG4gIH0gPSB7XG4gICAgZ3JhcGhfbGF5b3V0ICAgICAgICA6IFtdLFxuICAgIHRyYW5zaXRpb24gICAgICAgICAgOiBbXSxcbiAgICBzdGFydF9zdGF0ZXMgICAgICAgIDogW10sXG4gICAgZW5kX3N0YXRlcyAgICAgICAgICA6IFtdLFxuICAgIGZzbF92ZXJzaW9uICAgICAgICAgOiBbXSxcbiAgICBtYWNoaW5lX2F1dGhvciAgICAgIDogW10sXG4gICAgbWFjaGluZV9jb21tZW50ICAgICA6IFtdLFxuICAgIG1hY2hpbmVfY29udHJpYnV0b3IgOiBbXSxcbiAgICBtYWNoaW5lX2RlZmluaXRpb24gIDogW10sXG4gICAgbWFjaGluZV9saWNlbnNlICAgICA6IFtdLFxuICAgIG1hY2hpbmVfbmFtZSAgICAgICAgOiBbXSxcbiAgICBtYWNoaW5lX3ZlcnNpb24gICAgIDogW11cbiAgfTtcblxuICB0cmVlLm1hcCggKHRyIDogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pID0+IHtcblxuICAgIGNvbnN0IHJ1bGUgICA6IEpzc21Db21waWxlUnVsZSA9IGNvbXBpbGVfcnVsZV9oYW5kbGVyKHRyKSxcbiAgICAgICAgICBhZ2dfYXMgOiBzdHJpbmcgICAgICAgICAgPSBydWxlLmFnZ19hcyxcbiAgICAgICAgICB2YWwgICAgOiBtaXhlZCAgICAgICAgICAgPSBydWxlLnZhbDsgICAgICAgICAgICAgICAgICAvLyB0b2RvIGJldHRlciB0eXBlc1xuXG4gICAgcmVzdWx0c1thZ2dfYXNdID0gcmVzdWx0c1thZ2dfYXNdLmNvbmNhdCh2YWwpO1xuXG4gIH0pO1xuXG4gIGNvbnN0IGFzc2VtYmxlZF90cmFuc2l0aW9ucyA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiA9IFtdLmNvbmNhdCguLi4gcmVzdWx0c1sndHJhbnNpdGlvbiddKTtcblxuICBjb25zdCByZXN1bHRfY2ZnIDogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+ID0ge1xuICAgIHN0YXJ0X3N0YXRlcyA6IHJlc3VsdHMuc3RhcnRfc3RhdGVzLmxlbmd0aD8gcmVzdWx0cy5zdGFydF9zdGF0ZXMgOiBbYXNzZW1ibGVkX3RyYW5zaXRpb25zWzBdLmZyb21dLFxuICAgIHRyYW5zaXRpb25zICA6IGFzc2VtYmxlZF90cmFuc2l0aW9uc1xuICB9O1xuXG4gIGNvbnN0IG9uZU9ubHlLZXlzIDogQXJyYXk8c3RyaW5nPiA9IFtcbiAgICAnZ3JhcGhfbGF5b3V0JywgJ21hY2hpbmVfbmFtZScsICdtYWNoaW5lX3ZlcnNpb24nLCAnbWFjaGluZV9jb21tZW50JywgJ2ZzbF92ZXJzaW9uJywgJ21hY2hpbmVfbGljZW5zZSdcbiAgXTtcblxuICBvbmVPbmx5S2V5cy5tYXAoIChvbmVPbmx5S2V5IDogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHJlc3VsdHNbb25lT25seUtleV0ubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNYXkgb25seSBoYXZlIG9uZSAke29uZU9ubHlLZXl9IHN0YXRlbWVudCBtYXhpbXVtOiAke0pTT04uc3RyaW5naWZ5KHJlc3VsdHNbb25lT25seUtleV0pfWApO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAocmVzdWx0c1tvbmVPbmx5S2V5XS5sZW5ndGgpIHtcbiAgICAgICAgcmVzdWx0X2NmZ1tvbmVPbmx5S2V5XSA9IHJlc3VsdHNbb25lT25seUtleV1bMF07XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBbJ21hY2hpbmVfYXV0aG9yJ10ubWFwKCAobXVsdGlLZXkgOiBzdHJpbmcpID0+IHtcbiAgICBpZiAocmVzdWx0c1ttdWx0aUtleV0ubGVuZ3RoKSB7XG4gICAgICByZXN1bHRfY2ZnW211bHRpS2V5XSA9IHJlc3VsdHNbbXVsdGlLZXldO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHJlc3VsdF9jZmc7XG5cbn1cblxuXG5cbmZ1bmN0aW9uIG1ha2U8bU5ULCBtRFQ+KHBsYW4gOiBzdHJpbmcpIDogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+IHtcbiAgcmV0dXJuIGNvbXBpbGUocGFyc2UocGxhbikpO1xufVxuXG5cblxuXG5cbmNsYXNzIE1hY2hpbmU8bU5ULCBtRFQ+IHtcblxuXG4gIF9zdGF0ZSAgICAgICAgICAgICAgICAgIDogbU5UO1xuICBfc3RhdGVzICAgICAgICAgICAgICAgICA6IE1hcDxtTlQsIEpzc21HZW5lcmljU3RhdGU8bU5UPj47XG4gIF9lZGdlcyAgICAgICAgICAgICAgICAgIDogQXJyYXk8SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+PjtcbiAgX2VkZ2VfbWFwICAgICAgICAgICAgICAgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcbiAgX25hbWVkX3RyYW5zaXRpb25zICAgICAgOiBNYXA8bU5ULCBudW1iZXI+O1xuICBfYWN0aW9ucyAgICAgICAgICAgICAgICA6IE1hcDxtTlQsIE1hcDxtTlQsIG51bWJlcj4+O1xuICBfcmV2ZXJzZV9hY3Rpb25zICAgICAgICA6IE1hcDxtTlQsIE1hcDxtTlQsIG51bWJlcj4+O1xuICBfcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyA6IE1hcDxtTlQsIE1hcDxtTlQsIG51bWJlcj4+O1xuXG4gIF9ncmFwaF9sYXlvdXQgICAgICAgICAgIDogSnNzbUxheW91dDtcblxuICAvLyB3aGFyZ2FyYmwgdGhpcyBiYWRseSBuZWVkcyB0byBiZSBicm9rZW4gdXAsIG1vbm9saXRoIG1hc3RlclxuICBjb25zdHJ1Y3Rvcih7IHN0YXJ0X3N0YXRlcywgY29tcGxldGU9W10sIHRyYW5zaXRpb25zLCBncmFwaF9sYXlvdXQgPSAnZG90JyB9IDogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+KSB7XG5cbiAgICB0aGlzLl9zdGF0ZSAgICAgICAgICAgICAgICAgID0gc3RhcnRfc3RhdGVzWzBdO1xuICAgIHRoaXMuX3N0YXRlcyAgICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fZWRnZXMgICAgICAgICAgICAgICAgICA9IFtdO1xuICAgIHRoaXMuX2VkZ2VfbWFwICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9hY3Rpb25zICAgICAgICAgICAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX3JldmVyc2VfYWN0aW9ucyAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyA9IG5ldyBNYXAoKTsgICAvLyB0b2RvXG5cbiAgICB0aGlzLl9ncmFwaF9sYXlvdXQgICAgICAgICAgID0gZ3JhcGhfbGF5b3V0O1xuXG4gICAgdHJhbnNpdGlvbnMubWFwKCAodHI6SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+KSA9PiB7XG5cbiAgICAgIGlmICh0ci5mcm9tID09PSB1bmRlZmluZWQpIHsgdGhyb3cgbmV3IEVycm9yKGB0cmFuc2l0aW9uIG11c3QgZGVmaW5lICdmcm9tJzogJHtKU09OLnN0cmluZ2lmeSh0cil9YCk7IH1cbiAgICAgIGlmICh0ci50byAgID09PSB1bmRlZmluZWQpIHsgdGhyb3cgbmV3IEVycm9yKGB0cmFuc2l0aW9uIG11c3QgZGVmaW5lICd0byc6ICR7ICBKU09OLnN0cmluZ2lmeSh0cil9YCk7IH1cblxuICAgICAgLy8gZ2V0IHRoZSBjdXJzb3JzLiAgd2hhdCBhIG1lc3NcbiAgICAgIGNvbnN0IGN1cnNvcl9mcm9tIDogSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+XG4gICAgICAgICAgPSB0aGlzLl9zdGF0ZXMuZ2V0KHRyLmZyb20pXG4gICAgICAgICB8fCB7IG5hbWU6IHRyLmZyb20sIGZyb206IFtdLCB0bzogW10sIGNvbXBsZXRlOiBjb21wbGV0ZS5pbmNsdWRlcyh0ci5mcm9tKSB9O1xuXG4gICAgICBpZiAoISh0aGlzLl9zdGF0ZXMuaGFzKHRyLmZyb20pKSkge1xuICAgICAgICB0aGlzLl9uZXdfc3RhdGUoY3Vyc29yX2Zyb20pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjdXJzb3JfdG8gOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD5cbiAgICAgICAgICA9IHRoaXMuX3N0YXRlcy5nZXQodHIudG8pXG4gICAgICAgICB8fCB7bmFtZTogdHIudG8sIGZyb206IFtdLCB0bzogW10sIGNvbXBsZXRlOiBjb21wbGV0ZS5pbmNsdWRlcyh0ci50bykgfTtcblxuICAgICAgaWYgKCEodGhpcy5fc3RhdGVzLmhhcyh0ci50bykpKSB7XG4gICAgICAgIHRoaXMuX25ld19zdGF0ZShjdXJzb3JfdG8pO1xuICAgICAgfVxuXG4gICAgICAvLyBndWFyZCBhZ2FpbnN0IGV4aXN0aW5nIGNvbm5lY3Rpb25zIGJlaW5nIHJlLWFkZGVkXG4gICAgICBpZiAoY3Vyc29yX2Zyb20udG8uaW5jbHVkZXModHIudG8pKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgYWxyZWFkeSBoYXMgJHtKU09OLnN0cmluZ2lmeSh0ci5mcm9tKX0gdG8gJHtKU09OLnN0cmluZ2lmeSh0ci50byl9YCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjdXJzb3JfZnJvbS50by5wdXNoKHRyLnRvKTtcbiAgICAgICAgY3Vyc29yX3RvLmZyb20ucHVzaCh0ci5mcm9tKTtcbiAgICAgIH1cblxuICAgICAgLy8gYWRkIHRoZSBlZGdlOyBub3RlIGl0cyBpZFxuICAgICAgdGhpcy5fZWRnZXMucHVzaCh0cik7XG4gICAgICBjb25zdCB0aGlzRWRnZUlkIDogbnVtYmVyID0gdGhpcy5fZWRnZXMubGVuZ3RoIC0gMTtcblxuICAgICAgLy8gZ3VhcmQgYWdhaW5zdCByZXBlYXRpbmcgYSB0cmFuc2l0aW9uIG5hbWVcbiAgICAgIGlmICh0ci5uYW1lKSB7XG4gICAgICAgIGlmICh0aGlzLl9uYW1lZF90cmFuc2l0aW9ucy5oYXModHIubmFtZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG5hbWVkIHRyYW5zaXRpb24gXCIke0pTT04uc3RyaW5naWZ5KHRyLm5hbWUpfVwiIGFscmVhZHkgY3JlYXRlZGApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX25hbWVkX3RyYW5zaXRpb25zLnNldCh0ci5uYW1lLCB0aGlzRWRnZUlkKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBzZXQgdXAgdGhlIG1hcHBpbmcsIHNvIHRoYXQgZWRnZXMgY2FuIGJlIGxvb2tlZCB1cCBieSBlbmRwb2ludCBwYWlyc1xuICAgICAgY29uc3QgZnJvbV9tYXBwaW5nIDogTWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2VkZ2VfbWFwLmdldCh0ci5mcm9tKSB8fCBuZXcgTWFwKCk7XG4gICAgICBpZiAoISh0aGlzLl9lZGdlX21hcC5oYXModHIuZnJvbSkpKSB7XG4gICAgICAgIHRoaXMuX2VkZ2VfbWFwLnNldCh0ci5mcm9tLCBmcm9tX21hcHBpbmcpO1xuICAgICAgfVxuXG4vLyAgICBjb25zdCB0b19tYXBwaW5nID0gZnJvbV9tYXBwaW5nLmdldCh0ci50byk7XG4gICAgICBmcm9tX21hcHBpbmcuc2V0KHRyLnRvLCB0aGlzRWRnZUlkKTsgLy8gYWxyZWFkeSBjaGVja2VkIHRoYXQgdGhpcyBtYXBwaW5nIGRvZXNuJ3QgZXhpc3QsIGFib3ZlXG5cbiAgICAgIC8vIHNldCB1cCB0aGUgYWN0aW9uIG1hcHBpbmcsIHNvIHRoYXQgYWN0aW9ucyBjYW4gYmUgbG9va2VkIHVwIGJ5IG9yaWdpblxuICAgICAgaWYgKHRyLmFjdGlvbikge1xuXG5cbiAgICAgICAgLy8gZm9yd2FyZCBtYXBwaW5nIGZpcnN0IGJ5IGFjdGlvbiBuYW1lXG4gICAgICAgIGxldCBhY3Rpb25NYXAgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KHRyLmFjdGlvbik7XG4gICAgICAgIGlmICghKGFjdGlvbk1hcCkpIHtcbiAgICAgICAgICBhY3Rpb25NYXAgPSBuZXcgTWFwKCk7XG4gICAgICAgICAgdGhpcy5fYWN0aW9ucy5zZXQodHIuYWN0aW9uLCBhY3Rpb25NYXApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFjdGlvbk1hcC5oYXModHIuZnJvbSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGFjdGlvbiAke0pTT04uc3RyaW5naWZ5KHRyLmFjdGlvbil9IGFscmVhZHkgYXR0YWNoZWQgdG8gb3JpZ2luICR7SlNPTi5zdHJpbmdpZnkodHIuZnJvbSl9YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYWN0aW9uTWFwLnNldCh0ci5mcm9tLCB0aGlzRWRnZUlkKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgLy8gcmV2ZXJzZSBtYXBwaW5nIGZpcnN0IGJ5IHN0YXRlIG9yaWdpbiBuYW1lXG4gICAgICAgIGxldCByQWN0aW9uTWFwIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHRyLmZyb20pO1xuICAgICAgICBpZiAoIShyQWN0aW9uTWFwKSkge1xuICAgICAgICAgIHJBY3Rpb25NYXAgPSBuZXcgTWFwKCk7XG4gICAgICAgICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLnNldCh0ci5mcm9tLCByQWN0aW9uTWFwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG5vIG5lZWQgdG8gdGVzdCBmb3IgcmV2ZXJzZSBtYXBwaW5nIHByZS1wcmVzZW5jZTtcbiAgICAgICAgLy8gZm9yd2FyZCBtYXBwaW5nIGFscmVhZHkgY292ZXJzIGNvbGxpc2lvbnNcbiAgICAgICAgckFjdGlvbk1hcC5zZXQodHIuYWN0aW9uLCB0aGlzRWRnZUlkKTtcblxuXG4gICAgICAgIC8vIHJldmVyc2UgbWFwcGluZyBmaXJzdCBieSBzdGF0ZSB0YXJnZXQgbmFtZVxuICAgICAgICBpZiAoISh0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLmhhcyh0ci50bykpKSB7XG4gICAgICAgICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5zZXQodHIudG8sIG5ldyBNYXAoKSk7XG4gICAgICAgIH1cblxuLyogdG9kbyBjb21lYmFja1xuICAgZnVuZGFtZW50YWwgcHJvYmxlbSBpcyByb0FjdGlvbk1hcCBuZWVkcyB0byBiZSBhIG11bHRpbWFwXG4gICAgICAgIGNvbnN0IHJvQWN0aW9uTWFwID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5nZXQodHIudG8pOyAgLy8gd2FzdGVmdWwgLSBhbHJlYWR5IGRpZCBoYXMgLSByZWZhY3RvclxuICAgICAgICBpZiAocm9BY3Rpb25NYXApIHtcbiAgICAgICAgICBpZiAocm9BY3Rpb25NYXAuaGFzKHRyLmFjdGlvbikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcm8tYWN0aW9uICR7dHIudG99IGFscmVhZHkgYXR0YWNoZWQgdG8gYWN0aW9uICR7dHIuYWN0aW9ufWApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByb0FjdGlvbk1hcC5zZXQodHIuYWN0aW9uLCB0aGlzRWRnZUlkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzaG91bGQgYmUgaW1wb3NzaWJsZSAtIGZsb3cgZG9lc25cXCd0IGtub3cgLnNldCBwcmVjZWRlcyAuZ2V0IHlldCBhZ2Fpbi4gIHNldmVyZSBlcnJvcj8nKTtcbiAgICAgICAgfVxuKi9cbiAgICAgIH1cblxuICAgIH0pO1xuXG4gIH1cblxuICBfbmV3X3N0YXRlKHN0YXRlX2NvbmZpZyA6IEpzc21HZW5lcmljU3RhdGU8bU5UPikgOiBtTlQgeyAvLyB3aGFyZ2FyYmwgZ2V0IHRoYXQgc3RhdGVfY29uZmlnIGFueSB1bmRlciBjb250cm9sXG5cbiAgICBpZiAodGhpcy5fc3RhdGVzLmhhcyhzdGF0ZV9jb25maWcubmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgc3RhdGUgJHtKU09OLnN0cmluZ2lmeShzdGF0ZV9jb25maWcubmFtZSl9IGFscmVhZHkgZXhpc3RzYCk7XG4gICAgfVxuXG4gICAgdGhpcy5fc3RhdGVzLnNldChzdGF0ZV9jb25maWcubmFtZSwgc3RhdGVfY29uZmlnKTtcbiAgICByZXR1cm4gc3RhdGVfY29uZmlnLm5hbWU7XG5cbiAgfVxuXG5cblxuICBzdGF0ZSgpIDogbU5UIHtcbiAgICByZXR1cm4gdGhpcy5fc3RhdGU7XG4gIH1cblxuLyogd2hhcmdhcmJsIHRvZG8gbWFqb3JcbiAgIHdoZW4gd2UgcmVpbXBsZW1lbnQgdGhpcywgcmVpbnRyb2R1Y2UgdGhpcyBjaGFuZ2UgdG8gdGhlIGlzX2ZpbmFsIGNhbGxcblxuICBpc19jaGFuZ2luZygpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRvZG8gd2hhcmdhcmJsXG4gIH1cbiovXG5cblxuICBzdGF0ZV9pc19maW5hbCh3aGljaFN0YXRlIDogbU5UKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiAoICh0aGlzLnN0YXRlX2lzX3Rlcm1pbmFsKHdoaWNoU3RhdGUpKSAmJiAodGhpcy5zdGF0ZV9pc19jb21wbGV0ZSh3aGljaFN0YXRlKSkgKTtcbiAgfVxuXG4gIGlzX2ZpbmFsKCkgOiBib29sZWFuIHtcbi8vICByZXR1cm4gKCghdGhpcy5pc19jaGFuZ2luZygpKSAmJiB0aGlzLnN0YXRlX2lzX2ZpbmFsKHRoaXMuc3RhdGUoKSkpO1xuICAgIHJldHVybiB0aGlzLnN0YXRlX2lzX2ZpbmFsKHRoaXMuc3RhdGUoKSk7XG4gIH1cblxuICBncmFwaF9sYXlvdXQoKSA6IHN0cmluZyB7XG4gICAgcmV0dXJuIFN0cmluZyh0aGlzLl9ncmFwaF9sYXlvdXQpO1xuICB9XG5cblxuXG4gIG1hY2hpbmVfc3RhdGUoKSA6IEpzc21NYWNoaW5lSW50ZXJuYWxTdGF0ZTxtTlQsIG1EVD4ge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGludGVybmFsX3N0YXRlX2ltcGxfdmVyc2lvbiA6IDEsXG5cbiAgICAgIGFjdGlvbnMgICAgICAgICAgICAgICAgOiB0aGlzLl9hY3Rpb25zLFxuICAgICAgZWRnZV9tYXAgICAgICAgICAgICAgICA6IHRoaXMuX2VkZ2VfbWFwLFxuICAgICAgZWRnZXMgICAgICAgICAgICAgICAgICA6IHRoaXMuX2VkZ2VzLFxuICAgICAgbmFtZWRfdHJhbnNpdGlvbnMgICAgICA6IHRoaXMuX25hbWVkX3RyYW5zaXRpb25zLFxuICAgICAgcmV2ZXJzZV9hY3Rpb25zICAgICAgICA6IHRoaXMuX3JldmVyc2VfYWN0aW9ucyxcbi8vICAgIHJldmVyc2VfYWN0aW9uX3RhcmdldHMgOiB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLFxuICAgICAgc3RhdGUgICAgICAgICAgICAgICAgICA6IHRoaXMuX3N0YXRlLFxuICAgICAgc3RhdGVzICAgICAgICAgICAgICAgICA6IHRoaXMuX3N0YXRlc1xuICAgIH07XG5cbiAgfVxuXG4vKlxuICBsb2FkX21hY2hpbmVfc3RhdGUoKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmYWxzZTsgLy8gdG9kbyB3aGFyZ2FyYmxcbiAgfVxuKi9cblxuXG4gIHN0YXRlcygpIDogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuIFsuLi4gdGhpcy5fc3RhdGVzLmtleXMoKV07XG4gIH1cblxuICBzdGF0ZV9mb3Iod2hpY2hTdGF0ZSA6IG1OVCkgOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD4ge1xuICAgIGNvbnN0IHN0YXRlIDogP0pzc21HZW5lcmljU3RhdGU8bU5UPiA9IHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHN0YXRlKSB7IHJldHVybiBzdGF0ZTsgfVxuICAgIGVsc2UgICAgICAgeyB0aHJvdyBuZXcgRXJyb3IoYG5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeShzdGF0ZSl9YCk7IH1cbiAgfVxuXG5cblxuICBsaXN0X2VkZ2VzKCkgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4ge1xuICAgIHJldHVybiB0aGlzLl9lZGdlcztcbiAgfVxuXG4gIGxpc3RfbmFtZWRfdHJhbnNpdGlvbnMoKSA6IE1hcDxtTlQsIG51bWJlcj4ge1xuICAgIHJldHVybiB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucztcbiAgfVxuXG4gIGxpc3RfYWN0aW9ucygpIDogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuIFsuLi4gdGhpcy5fYWN0aW9ucy5rZXlzKCldO1xuICB9XG5cblxuXG4gIGdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzKGZyb206IG1OVCwgdG86IG1OVCkgOiA/bnVtYmVyIHtcblxuICAgIGNvbnN0IGVtZyA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fZWRnZV9tYXAuZ2V0KGZyb20pO1xuXG4gICAgaWYgKGVtZykge1xuICAgICAgcmV0dXJuIGVtZy5nZXQodG8pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICB9XG5cblxuXG4gIGxvb2t1cF90cmFuc2l0aW9uX2Zvcihmcm9tOiBtTlQsIHRvOiBtTlQpIDogP0pzc21UcmFuc2l0aW9uPG1OVCwgbURUPiB7XG4gICAgY29uc3QgaWQgOiA/bnVtYmVyID0gdGhpcy5nZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyhmcm9tLCB0byk7XG4gICAgcmV0dXJuICgoaWQgPT09IHVuZGVmaW5lZCkgfHwgKGlkID09PSBudWxsKSk/IHVuZGVmaW5lZCA6IHRoaXMuX2VkZ2VzW2lkXTtcbiAgfVxuXG5cblxuICBsaXN0X3RyYW5zaXRpb25zKHdoaWNoU3RhdGUgOiBtTlQgPSB0aGlzLnN0YXRlKCkpIDogSnNzbVRyYW5zaXRpb25MaXN0PG1OVD4ge1xuICAgIHJldHVybiB7ZW50cmFuY2VzOiB0aGlzLmxpc3RfZW50cmFuY2VzKHdoaWNoU3RhdGUpLCBleGl0czogdGhpcy5saXN0X2V4aXRzKHdoaWNoU3RhdGUpfTtcbiAgfVxuXG4gIGxpc3RfZW50cmFuY2VzKHdoaWNoU3RhdGUgOiBtTlQgPSB0aGlzLnN0YXRlKCkpIDogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuICh0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpIHx8IHt9KS5mcm9tIHx8IFtdO1xuICB9XG5cbiAgbGlzdF9leGl0cyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiAodGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKSB8fCB7fSkudG8gICB8fCBbXTtcbiAgfVxuXG5cblxuICBwcm9iYWJsZV9leGl0c19mb3Iod2hpY2hTdGF0ZSA6IG1OVCkgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4ge1xuXG4gICAgY29uc3Qgd3N0YXRlIDogP0pzc21HZW5lcmljU3RhdGU8bU5UPiA9IHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKCEod3N0YXRlKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX0gaW4gcHJvYmFibGVfZXhpdHNfZm9yYCk7IH1cblxuICAgIGNvbnN0IHdzdGF0ZV90byA6IEFycmF5PCBtTlQgPiA9IHdzdGF0ZS50byxcblxuICAgICAgICAgIHd0ZiAgICAgICA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPlxuICAgICAgICAgICAgICAgICAgICA9IHdzdGF0ZV90b1xuICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCggKHdzKSA6ID9Kc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPT4gdGhpcy5sb29rdXBfdHJhbnNpdGlvbl9mb3IodGhpcy5zdGF0ZSgpLCB3cykpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pO1xuXG4gICAgcmV0dXJuIHd0ZjtcblxuICB9XG5cbiAgcHJvYmFiaWxpc3RpY190cmFuc2l0aW9uKCkgOiBib29sZWFuIHtcbiAgICBjb25zdCBzZWxlY3RlZCA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHdlaWdodGVkX3JhbmRfc2VsZWN0KHRoaXMucHJvYmFibGVfZXhpdHNfZm9yKHRoaXMuc3RhdGUoKSkpO1xuICAgIHJldHVybiB0aGlzLnRyYW5zaXRpb24oIHNlbGVjdGVkLnRvICk7XG4gIH1cblxuICBwcm9iYWJpbGlzdGljX3dhbGsobiA6IG51bWJlcikgOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gc2VxKG4pXG4gICAgICAgICAgLm1hcCgoKSA6IG1OVCA9PiB7XG4gICAgICAgICAgICAgY29uc3Qgc3RhdGVfd2FzIDogbU5UID0gdGhpcy5zdGF0ZSgpO1xuICAgICAgICAgICAgIHRoaXMucHJvYmFiaWxpc3RpY190cmFuc2l0aW9uKCk7XG4gICAgICAgICAgICAgcmV0dXJuIHN0YXRlX3dhcztcbiAgICAgICAgICAgfSlcbiAgICAgICAgICAuY29uY2F0KFt0aGlzLnN0YXRlKCldKTtcbiAgfVxuXG4gIHByb2JhYmlsaXN0aWNfaGlzdG9fd2FsayhuIDogbnVtYmVyKSA6IE1hcDxtTlQsIG51bWJlcj4ge1xuICAgIHJldHVybiBoaXN0b2dyYXBoKHRoaXMucHJvYmFiaWxpc3RpY193YWxrKG4pKTtcbiAgfVxuXG5cblxuICBhY3Rpb25zKHdoaWNoU3RhdGUgOiBtTlQgPSB0aGlzLnN0YXRlKCkgKSA6IEFycmF5PG1OVD4ge1xuICAgIGNvbnN0IHdzdGF0ZSA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAod3N0YXRlKSB7IHJldHVybiBbLi4uIHdzdGF0ZS5rZXlzKCldOyB9XG4gICAgZWxzZSAgICAgICAgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuICB9XG5cbiAgbGlzdF9zdGF0ZXNfaGF2aW5nX2FjdGlvbih3aGljaFN0YXRlIDogbU5UKSA6IEFycmF5PG1OVD4ge1xuICAgIGNvbnN0IHdzdGF0ZSA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHdzdGF0ZSkgeyByZXR1cm4gWy4uLiB3c3RhdGUua2V5cygpXTsgfVxuICAgIGVsc2UgICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cbiAgfVxuXG4vLyBjb21lYmFja1xuLypcbiAgbGlzdF9lbnRyYW5jZV9hY3Rpb25zKHdoaWNoU3RhdGUgOiBtTlQgPSB0aGlzLnN0YXRlKCkgKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uICh0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLmdldCh3aGljaFN0YXRlKSB8fCBuZXcgTWFwKCkpLnZhbHVlcygpXSAvLyB3YXN0ZWZ1bFxuICAgICAgICAgICAubWFwKCAoZWRnZUlkOmFueSkgPT4gKHRoaXMuX2VkZ2VzW2VkZ2VJZF0gOiBhbnkpKSAvLyB3aGFyZ2FyYmwgYnVybiBvdXQgYW55XG4gICAgICAgICAgIC5maWx0ZXIoIChvOmFueSkgPT4gby50byA9PT0gd2hpY2hTdGF0ZSlcbiAgICAgICAgICAgLm1hcCggZmlsdGVyZWQgPT4gZmlsdGVyZWQuZnJvbSApO1xuICB9XG4qL1xuICBsaXN0X2V4aXRfYWN0aW9ucyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpICkgOiBBcnJheTw/bU5UPiB7IC8vIHRoZXNlIGFyZSBtTlQsIG5vdCA/bU5UXG4gICAgY29uc3QgcmFfYmFzZSA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAoIShyYV9iYXNlKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuXG4gICAgcmV0dXJuIFsuLi4gcmFfYmFzZS52YWx1ZXMoKV1cbiAgICAgICAgICAgLm1hcCAgICAoIChlZGdlSWQ6bnVtYmVyKSAgICAgICAgICAgICAgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPT4gdGhpcy5fZWRnZXNbZWRnZUlkXSAgIClcbiAgICAgICAgICAgLmZpbHRlciAoIChvOkpzc21UcmFuc2l0aW9uPG1OVCwgbURUPikgOiBib29sZWFuICAgICAgICAgICAgICAgICAgPT4gby5mcm9tID09PSB3aGljaFN0YXRlIClcbiAgICAgICAgICAgLm1hcCAgICAoIChmaWx0ZXJlZCA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPikgOiA/bU5UICAgICAgICAgICAgPT4gZmlsdGVyZWQuYWN0aW9uICAgICAgICk7XG4gIH1cblxuICBwcm9iYWJsZV9hY3Rpb25fZXhpdHMod2hpY2hTdGF0ZSA6IG1OVCA9IHRoaXMuc3RhdGUoKSApIDogQXJyYXk8bWl4ZWQ+IHsgLy8gdGhlc2UgYXJlIG1OVFxuICAgIGNvbnN0IHJhX2Jhc2UgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKCEocmFfYmFzZSkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cblxuICAgIHJldHVybiBbLi4uIHJhX2Jhc2UudmFsdWVzKCldXG4gICAgICAgICAgIC5tYXAgICAgKCAoZWRnZUlkOm51bWJlcikgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPT4gdGhpcy5fZWRnZXNbZWRnZUlkXSAgIClcbiAgICAgICAgICAgLmZpbHRlciAoIChvOkpzc21UcmFuc2l0aW9uPG1OVCwgbURUPikgOiBib29sZWFuICAgICA9PiBvLmZyb20gPT09IHdoaWNoU3RhdGUgKVxuICAgICAgICAgICAubWFwICAgICggKGZpbHRlcmVkKSA6IG1peGVkICAgICAgICAgICAgICAgICAgICAgICAgID0+ICggeyBhY3Rpb24gICAgICA6IGZpbHRlcmVkLmFjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvYmFiaWxpdHkgOiBmaWx0ZXJlZC5wcm9iYWJpbGl0eSB9IClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICB9XG5cblxuXG4gIGlzX3VuZW50ZXJhYmxlKHdoaWNoU3RhdGUgOiBtTlQpIDogYm9vbGVhbiB7XG4gICAgLy8gd2hhcmdhcmJsIHNob3VsZCB0aHJvdyBvbiB1bmtub3duIHN0YXRlXG4gICAgcmV0dXJuIHRoaXMubGlzdF9lbnRyYW5jZXMod2hpY2hTdGF0ZSkubGVuZ3RoID09PSAwO1xuICB9XG5cbiAgaGFzX3VuZW50ZXJhYmxlcygpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpIDogYm9vbGVhbiA9PiB0aGlzLmlzX3VuZW50ZXJhYmxlKHgpKTtcbiAgfVxuXG5cblxuICBpc190ZXJtaW5hbCgpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVfaXNfdGVybWluYWwodGhpcy5zdGF0ZSgpKTtcbiAgfVxuXG4gIHN0YXRlX2lzX3Rlcm1pbmFsKHdoaWNoU3RhdGUgOiBtTlQpIDogYm9vbGVhbiB7XG4gICAgLy8gd2hhcmdhcmJsIHNob3VsZCB0aHJvdyBvbiB1bmtub3duIHN0YXRlXG4gICAgcmV0dXJuIHRoaXMubGlzdF9leGl0cyh3aGljaFN0YXRlKS5sZW5ndGggPT09IDA7XG4gIH1cblxuICBoYXNfdGVybWluYWxzKCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZXMoKS5zb21lKCAoeCkgOiBib29sZWFuID0+IHRoaXMuc3RhdGVfaXNfdGVybWluYWwoeCkpO1xuICB9XG5cblxuXG4gIGlzX2NvbXBsZXRlKCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZV9pc19jb21wbGV0ZSh0aGlzLnN0YXRlKCkpO1xuICB9XG5cbiAgc3RhdGVfaXNfY29tcGxldGUod2hpY2hTdGF0ZSA6IG1OVCkgOiBib29sZWFuIHtcbiAgICBjb25zdCB3c3RhdGUgOiA/SnNzbUdlbmVyaWNTdGF0ZTxtTlQ+ID0gdGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAod3N0YXRlKSB7IHJldHVybiB3c3RhdGUuY29tcGxldGU7IH1cbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG4gIH1cblxuICBoYXNfY29tcGxldGVzKCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZXMoKS5zb21lKCAoeCkgOiBib29sZWFuID0+IHRoaXMuc3RhdGVfaXNfY29tcGxldGUoeCkgKTtcbiAgfVxuXG5cblxuICBhY3Rpb24obmFtZSA6IG1OVCwgbmV3RGF0YT8gOiBtRFQpIDogYm9vbGVhbiB7XG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgaWYgKHRoaXMudmFsaWRfYWN0aW9uKG5hbWUsIG5ld0RhdGEpKSB7XG4gICAgICBjb25zdCBlZGdlIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gdGhpcy5jdXJyZW50X2FjdGlvbl9lZGdlX2ZvcihuYW1lKTtcbiAgICAgIHRoaXMuX3N0YXRlID0gZWRnZS50bztcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgdHJhbnNpdGlvbihuZXdTdGF0ZSA6IG1OVCwgbmV3RGF0YT8gOiBtRFQpIDogYm9vbGVhbiB7XG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgaWYgKHRoaXMudmFsaWRfdHJhbnNpdGlvbihuZXdTdGF0ZSwgbmV3RGF0YSkpIHtcbiAgICAgIHRoaXMuX3N0YXRlID0gbmV3U3RhdGU7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8vIGNhbiBsZWF2ZSBtYWNoaW5lIGluIGluY29uc2lzdGVudCBzdGF0ZS4gIGdlbmVyYWxseSBkbyBub3QgdXNlXG4gIGZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGUgOiBtTlQsIG5ld0RhdGE/IDogbURUKSA6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX2ZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGUsIG5ld0RhdGEpKSB7XG4gICAgICB0aGlzLl9zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuXG5cbiAgY3VycmVudF9hY3Rpb25fZm9yKGFjdGlvbiA6IG1OVCkgOiBudW1iZXIgfCB2b2lkIHtcbiAgICBjb25zdCBhY3Rpb25fYmFzZSA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fYWN0aW9ucy5nZXQoYWN0aW9uKTtcbiAgICByZXR1cm4gYWN0aW9uX2Jhc2U/IGFjdGlvbl9iYXNlLmdldCh0aGlzLnN0YXRlKCkpIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgY3VycmVudF9hY3Rpb25fZWRnZV9mb3IoYWN0aW9uIDogbU5UKSA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiB7XG4gICAgY29uc3QgaWR4IDogP251bWJlciA9IHRoaXMuY3VycmVudF9hY3Rpb25fZm9yKGFjdGlvbik7XG4gICAgaWYgKChpZHggPT09IHVuZGVmaW5lZCkgfHwgKGlkeCA9PT0gbnVsbCkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIGFjdGlvbiAke0pTT04uc3RyaW5naWZ5KGFjdGlvbil9YCk7IH1cbiAgICByZXR1cm4gdGhpcy5fZWRnZXNbaWR4XTtcbiAgfVxuXG4gIHZhbGlkX2FjdGlvbihhY3Rpb24gOiBtTlQsIF9uZXdEYXRhPyA6IG1EVCkgOiBib29sZWFuIHsgIC8vIHRvZG8gY29tZWJhY2sgdW5pZ25vcmUgbmV3RGF0YVxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRfYWN0aW9uX2ZvcihhY3Rpb24pICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICB2YWxpZF90cmFuc2l0aW9uKG5ld1N0YXRlIDogbU5ULCBfbmV3RGF0YT8gOiBtRFQpIDogYm9vbGVhbiB7ICAvLyB0b2RvIGNvbWViYWNrIHVuaWdub3JlIG5ld0RhdGFcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBjb25zdCB0cmFuc2l0aW9uX2ZvciA6ID9Kc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB0aGlzLmxvb2t1cF90cmFuc2l0aW9uX2Zvcih0aGlzLnN0YXRlKCksIG5ld1N0YXRlKTtcblxuICAgIGlmICghKHRyYW5zaXRpb25fZm9yKSkgICAgICAgICAgeyByZXR1cm4gZmFsc2U7IH1cbiAgICBpZiAodHJhbnNpdGlvbl9mb3IuZm9yY2VkX29ubHkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcblxuICB9XG5cbiAgdmFsaWRfZm9yY2VfdHJhbnNpdGlvbihuZXdTdGF0ZSA6IG1OVCwgX25ld0RhdGE/IDogbURUKSA6IGJvb2xlYW4geyAgLy8gdG9kbyBjb21lYmFjayB1bmlnbm9yZSBuZXdEYXRhXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgcmV0dXJuICh0aGlzLmxvb2t1cF90cmFuc2l0aW9uX2Zvcih0aGlzLnN0YXRlKCksIG5ld1N0YXRlKSAhPT0gdW5kZWZpbmVkKTtcbiAgfVxuXG5cbn1cblxuXG5cblxuXG5mdW5jdGlvbiBzbTxtTlQsIG1EVD4odGVtcGxhdGVfc3RyaW5ncyA6IEFycmF5PHN0cmluZz4gLyogLCBhcmd1bWVudHMgKi8pIDogTWFjaGluZTxtTlQsIG1EVD4ge1xuXG4gICAgLy8gZm9vYGEkezF9YiR7Mn1jYCB3aWxsIGNvbWUgaW4gYXMgKFsnYScsJ2InLCdjJ10sMSwyKVxuICAgIC8vIHRoaXMgaW5jbHVkZXMgd2hlbiBhIGFuZCBjIGFyZSBlbXB0eSBzdHJpbmdzXG4gICAgLy8gdGhlcmVmb3JlIHRlbXBsYXRlX3N0cmluZ3Mgd2lsbCBhbHdheXMgaGF2ZSBvbmUgbW9yZSBlbCB0aGFuIHRlbXBsYXRlX2FyZ3NcbiAgICAvLyB0aGVyZWZvcmUgbWFwIHRoZSBzbWFsbGVyIGNvbnRhaW5lciBhbmQgdG9zcyB0aGUgbGFzdCBvbmUgb24gb24gdGhlIHdheSBvdXRcblxuICAgIHJldHVybiBuZXcgTWFjaGluZShtYWtlKHRlbXBsYXRlX3N0cmluZ3MucmVkdWNlKFxuXG4gICAgICAvLyBpbiBnZW5lcmFsIGF2b2lkaW5nIGBhcmd1bWVudHNgIGlzIHNtYXJ0LiAgaG93ZXZlciB3aXRoIHRoZSB0ZW1wbGF0ZVxuICAgICAgLy8gc3RyaW5nIG5vdGF0aW9uLCBhcyBkZXNpZ25lZCwgaXQncyBub3QgcmVhbGx5IHdvcnRoIHRoZSBoYXNzbGVcblxuICAgICAgLyogZXNsaW50LWRpc2FibGUgZnAvbm8tYXJndW1lbnRzICovXG4gICAgICAvKiBlc2xpbnQtZGlzYWJsZSBwcmVmZXItcmVzdC1wYXJhbXMgKi9cbiAgICAgIChhY2MsIHZhbCwgaWR4KSA6IHN0cmluZyA9PiBgJHthY2N9JHthcmd1bWVudHNbaWR4XX0ke3ZhbH1gICAvLyBhcmd1bWVudHNbMF0gaXMgbmV2ZXIgbG9hZGVkLCBzbyBhcmdzIGRvZXNuJ3QgbmVlZCB0byBiZSBnYXRlZFxuICAgICAgLyogZXNsaW50LWVuYWJsZSAgcHJlZmVyLXJlc3QtcGFyYW1zICovXG4gICAgICAvKiBlc2xpbnQtZW5hYmxlICBmcC9uby1hcmd1bWVudHMgKi9cblxuICAgICkpKTtcblxufVxuXG5cblxuXG5cbmV4cG9ydCB7XG5cbiAgdmVyc2lvbixcblxuICBNYWNoaW5lLFxuXG4gIG1ha2UsXG4gICAgcGFyc2UsXG4gICAgY29tcGlsZSxcblxuICBzbSxcblxuICBhcnJvd19kaXJlY3Rpb24sXG4gIGFycm93X2xlZnRfa2luZCxcbiAgYXJyb3dfcmlnaHRfa2luZCxcblxuICAvLyB0b2RvIHdoYXJnYXJibCB0aGVzZSBzaG91bGQgYmUgZXhwb3J0ZWQgdG8gYSB1dGlsaXR5IGxpYnJhcnlcbiAgc2VxLCB3ZWlnaHRlZF9yYW5kX3NlbGVjdCwgaGlzdG9ncmFwaCwgd2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCwgd2VpZ2h0ZWRfaGlzdG9fa2V5XG5cbn07XG4iXX0=