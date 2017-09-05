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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLmpzIl0sIm5hbWVzIjpbInBhcnNlIiwicmVxdWlyZSIsInZlcnNpb24iLCJhcnJvd19kaXJlY3Rpb24iLCJhcnJvdyIsIlN0cmluZyIsIkVycm9yIiwiYXJyb3dfbGVmdF9raW5kIiwiYXJyb3dfcmlnaHRfa2luZCIsImNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXAiLCJhY2MiLCJmcm9tIiwidG8iLCJ0aGlzX3NlIiwibmV4dF9zZSIsImVkZ2VzIiwidUZyb20iLCJBcnJheSIsImlzQXJyYXkiLCJ1VG8iLCJtYXAiLCJmIiwidCIsInJrIiwia2luZCIsImxrIiwicmlnaHQiLCJmb3JjZWRfb25seSIsIm1haW5fcGF0aCIsInJfYWN0aW9uIiwiYWN0aW9uIiwicl9wcm9iYWJpbGl0eSIsInByb2JhYmlsaXR5IiwicHVzaCIsImxlZnQiLCJsX2FjdGlvbiIsImxfcHJvYmFiaWxpdHkiLCJuZXdfYWNjIiwiY29uY2F0Iiwic2UiLCJjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb24iLCJydWxlIiwiY29tcGlsZV9ydWxlX2hhbmRsZXIiLCJrZXkiLCJhZ2dfYXMiLCJ2YWwiLCJ0YXV0b2xvZ2llcyIsImluY2x1ZGVzIiwidmFsdWUiLCJKU09OIiwic3RyaW5naWZ5IiwiY29tcGlsZSIsInRyZWUiLCJyZXN1bHRzIiwiZ3JhcGhfbGF5b3V0IiwidHJhbnNpdGlvbiIsInN0YXJ0X3N0YXRlcyIsImVuZF9zdGF0ZXMiLCJmc2xfdmVyc2lvbiIsIm1hY2hpbmVfYXV0aG9yIiwibWFjaGluZV9jb21tZW50IiwibWFjaGluZV9jb250cmlidXRvciIsIm1hY2hpbmVfZGVmaW5pdGlvbiIsIm1hY2hpbmVfbGljZW5zZSIsIm1hY2hpbmVfbmFtZSIsIm1hY2hpbmVfdmVyc2lvbiIsInRyIiwiYXNzZW1ibGVkX3RyYW5zaXRpb25zIiwicmVzdWx0X2NmZyIsImxlbmd0aCIsInRyYW5zaXRpb25zIiwib25lT25seUtleXMiLCJvbmVPbmx5S2V5IiwibXVsdGlLZXkiLCJtYWtlIiwicGxhbiIsIk1hY2hpbmUiLCJjb21wbGV0ZSIsIl9zdGF0ZSIsIl9zdGF0ZXMiLCJNYXAiLCJfZWRnZXMiLCJfZWRnZV9tYXAiLCJfbmFtZWRfdHJhbnNpdGlvbnMiLCJfYWN0aW9ucyIsIl9yZXZlcnNlX2FjdGlvbnMiLCJfcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyIsIl9ncmFwaF9sYXlvdXQiLCJ1bmRlZmluZWQiLCJjdXJzb3JfZnJvbSIsImdldCIsIm5hbWUiLCJoYXMiLCJfbmV3X3N0YXRlIiwiY3Vyc29yX3RvIiwidGhpc0VkZ2VJZCIsInNldCIsImZyb21fbWFwcGluZyIsImFjdGlvbk1hcCIsInJBY3Rpb25NYXAiLCJzdGF0ZV9jb25maWciLCJ3aGljaFN0YXRlIiwic3RhdGVfaXNfdGVybWluYWwiLCJzdGF0ZV9pc19jb21wbGV0ZSIsInN0YXRlX2lzX2ZpbmFsIiwic3RhdGUiLCJpbnRlcm5hbF9zdGF0ZV9pbXBsX3ZlcnNpb24iLCJhY3Rpb25zIiwiZWRnZV9tYXAiLCJuYW1lZF90cmFuc2l0aW9ucyIsInJldmVyc2VfYWN0aW9ucyIsInN0YXRlcyIsImtleXMiLCJlbWciLCJpZCIsImdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzIiwiZW50cmFuY2VzIiwibGlzdF9lbnRyYW5jZXMiLCJleGl0cyIsImxpc3RfZXhpdHMiLCJ3c3RhdGUiLCJ3c3RhdGVfdG8iLCJ3dGYiLCJ3cyIsImxvb2t1cF90cmFuc2l0aW9uX2ZvciIsImZpbHRlciIsIkJvb2xlYW4iLCJzZWxlY3RlZCIsInByb2JhYmxlX2V4aXRzX2ZvciIsIm4iLCJzdGF0ZV93YXMiLCJwcm9iYWJpbGlzdGljX3RyYW5zaXRpb24iLCJwcm9iYWJpbGlzdGljX3dhbGsiLCJyYV9iYXNlIiwidmFsdWVzIiwiZWRnZUlkIiwibyIsImZpbHRlcmVkIiwic29tZSIsIngiLCJpc191bmVudGVyYWJsZSIsIm5ld0RhdGEiLCJ2YWxpZF9hY3Rpb24iLCJlZGdlIiwiY3VycmVudF9hY3Rpb25fZWRnZV9mb3IiLCJuZXdTdGF0ZSIsInZhbGlkX3RyYW5zaXRpb24iLCJ2YWxpZF9mb3JjZV90cmFuc2l0aW9uIiwiYWN0aW9uX2Jhc2UiLCJpZHgiLCJjdXJyZW50X2FjdGlvbl9mb3IiLCJfbmV3RGF0YSIsInRyYW5zaXRpb25fZm9yIiwic20iLCJ0ZW1wbGF0ZV9zdHJpbmdzIiwicmVkdWNlIiwic2VxIiwid2VpZ2h0ZWRfcmFuZF9zZWxlY3QiLCJoaXN0b2dyYXBoIiwid2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCIsIndlaWdodGVkX2hpc3RvX2tleSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBcUJBOzs7Ozs7QUFwQkE7O0FBc0JBLElBQU1BLFFBQWdEQyxRQUFRLGVBQVIsRUFBeUJELEtBQS9FLEMsQ0FBdUY7O0FBRXZGLElBQU1FLFVBQWlCLElBQXZCLEMsQ0FBNkI7OztBQU03QixTQUFTQyxlQUFULENBQXlCQyxLQUF6QixFQUFpRTs7QUFFL0QsVUFBU0MsT0FBT0QsS0FBUCxDQUFUOztBQUVFLFNBQUssSUFBTCxDQUFhLEtBQUssSUFBTCxDQUFjLEtBQUssSUFBTDtBQUN6QixhQUFPLE9BQVA7O0FBRUYsU0FBSyxJQUFMLENBQWEsS0FBSyxJQUFMLENBQWMsS0FBSyxJQUFMO0FBQ3pCLGFBQU8sTUFBUDs7QUFFRixTQUFLLEtBQUwsQ0FBYSxLQUFLLE1BQUwsQ0FBYyxLQUFLLE1BQUw7QUFDM0IsU0FBSyxLQUFMLENBQWEsS0FBSyxNQUFMLENBQWMsS0FBSyxNQUFMO0FBQzNCLFNBQUssS0FBTCxDQUFhLEtBQUssTUFBTCxDQUFjLEtBQUssTUFBTDtBQUN6QixhQUFPLE1BQVA7O0FBRUY7QUFDRSxZQUFNLElBQUlFLEtBQUosMENBQWlERixLQUFqRCxDQUFOOztBQWRKO0FBa0JEOztBQU1ELFNBQVNHLGVBQVQsQ0FBeUJILEtBQXpCLEVBQTREOztBQUUxRCxVQUFTQyxPQUFPRCxLQUFQLENBQVQ7O0FBRUUsU0FBSyxJQUFMLENBQVksS0FBSyxJQUFMLENBQWEsS0FBSyxJQUFMO0FBQ3ZCLGFB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QUFDQTtBQUNBO0FBQ0E7O0FBRUEsU0FBTyxJQUFJOUUsT0FBSixDQUFZRixLQUFLZ0YsaUJBQWlCQyxNQUFqQjs7QUFFdEI7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsWUFBQ2pKLEdBQUQsRUFBTW1DLEdBQU4sRUFBV3dHLEdBQVg7QUFBQSxnQkFBK0IzSSxHQUEvQixHQUFxQyxXQUFVMkksR0FBVixDQUFyQyxHQUFzRHhHLEdBQXREO0FBQUEsR0FQc0IsQ0FPdUM7QUFDN0Q7QUFDQTs7QUFUc0IsR0FBTCxDQUFaLENBQVA7QUFhSDs7UUFRQzNDLE8sR0FBQUEsTztRQUVBMEUsTyxHQUFBQSxPO1FBRUFGLEksR0FBQUEsSTtRQUNFMUUsSyxHQUFBQSxLO1FBQ0FtRCxPLEdBQUFBLE87UUFFRnNHLEUsR0FBQUEsRTtRQUVBdEosZSxHQUFBQSxlO1FBQ0FJLGUsR0FBQUEsZTtRQUNBQyxnQixHQUFBQSxnQjtRQUdBb0osRztRQUFLQyxvQjtRQUFzQkMsVTtRQUFZQyxzQjtRQUF3QkMsa0IiLCJmaWxlIjoianNzbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLy8gd2hhcmdhcmJsIGxvdHMgb2YgdGhlc2UgcmV0dXJuIGFycmF5cyBjb3VsZC9zaG91bGQgYmUgc2V0c1xuXG4vLyBAZmxvd1xuXG5pbXBvcnQgdHlwZSB7XG5cbiAgSnNzbUdlbmVyaWNTdGF0ZSwgSnNzbUdlbmVyaWNDb25maWcsXG4gIEpzc21UcmFuc2l0aW9uLCBKc3NtVHJhbnNpdGlvbkxpc3QsXG4gIEpzc21NYWNoaW5lSW50ZXJuYWxTdGF0ZSxcbiAgSnNzbVBhcnNlVHJlZSxcbiAgSnNzbUNvbXBpbGVTZSwgSnNzbUNvbXBpbGVTZVN0YXJ0LCBKc3NtQ29tcGlsZVJ1bGUsXG4gIEpzc21BcnJvdywgSnNzbUFycm93RGlyZWN0aW9uLCBKc3NtQXJyb3dLaW5kLFxuICBKc3NtTGF5b3V0XG5cbn0gZnJvbSAnLi9qc3NtLXR5cGVzJztcblxuXG5cblxuXG5pbXBvcnQgeyBzZXEsIHdlaWdodGVkX3JhbmRfc2VsZWN0LCB3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0LCBoaXN0b2dyYXBoLCB3ZWlnaHRlZF9oaXN0b19rZXkgfSBmcm9tICcuL2pzc20tdXRpbC5qcyc7XG5cbmNvbnN0IHBhcnNlIDogPE5ULCBEVD4oc3RyaW5nKSA9PiBKc3NtUGFyc2VUcmVlPE5UPiA9IHJlcXVpcmUoJy4vanNzbS1kb3QuanMnKS5wYXJzZTsgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZmxvd3R5cGUvbm8td2Vhay10eXBlcyAvLyB0b2RvIHdoYXJnYXJibCByZW1vdmUgYW55XG5cbmNvbnN0IHZlcnNpb24gOiBudWxsID0gbnVsbDsgLy8gcmVwbGFjZWQgZnJvbSBwYWNrYWdlLmpzIGluIGJ1aWxkXG5cblxuXG5cblxuZnVuY3Rpb24gYXJyb3dfZGlyZWN0aW9uKGFycm93IDogSnNzbUFycm93KSA6IEpzc21BcnJvd0RpcmVjdGlvbiB7XG5cbiAgc3dpdGNoICggU3RyaW5nKGFycm93KSApIHtcblxuICAgIGNhc2UgJy0+JyA6ICBjYXNlICc9PicgIDogIGNhc2UgJ34+JyAgOlxuICAgICAgcmV0dXJuICdyaWdodCc7XG5cbiAgICBjYXNlICc8LScgOiAgY2FzZSAnPD0nICA6ICBjYXNlICc8ficgIDpcbiAgICAgIHJldHVybiAnbGVmdCc7XG5cbiAgICBjYXNlICc8LT4nOiAgY2FzZSAnPC09Pic6ICBjYXNlICc8LX4+JzpcbiAgICBjYXNlICc8PT4nOiAgY2FzZSAnPD0tPic6ICBjYXNlICc8PX4+JzpcbiAgICBjYXNlICc8fj4nOiAgY2FzZSAnPH4tPic6ICBjYXNlICc8fj0+JzpcbiAgICAgIHJldHVybiAnYm90aCc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcnJvd19kaXJlY3Rpb246IHVua25vd24gYXJyb3cgdHlwZSAke2Fycm93fWApO1xuXG4gIH1cblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIGFycm93X2xlZnRfa2luZChhcnJvdyA6IEpzc21BcnJvdykgOiBKc3NtQXJyb3dLaW5kIHtcblxuICBzd2l0Y2ggKCBTdHJpbmcoYXJyb3cpICkge1xuXG4gICAgY2FzZSAnLT4nOiAgY2FzZSAnPT4nIDogIGNhc2UgJ34+JzpcbiAgICAgIHJldHVybiAnbm9uZSc7XG5cbiAgICBjYXNlICc8LSc6ICBjYXNlICc8LT4nOiAgY2FzZSAnPC09Pic6ICBjYXNlICc8LX4+JzpcbiAgICAgIHJldHVybiAnbGVnYWwnO1xuXG4gICAgY2FzZSAnPD0nOiAgY2FzZSAnPD0+JzogIGNhc2UgJzw9LT4nOiAgY2FzZSAnPD1+Pic6XG4gICAgICByZXR1cm4gJ21haW4nO1xuXG4gICAgY2FzZSAnPH4nOiAgY2FzZSAnPH4+JzogIGNhc2UgJzx+LT4nOiAgY2FzZSAnPH49Pic6XG4gICAgICByZXR1cm4gJ2ZvcmNlZCc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcnJvd19kaXJlY3Rpb246IHVua25vd24gYXJyb3cgdHlwZSAke2Fycm93fWApO1xuXG4gIH1cblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIGFycm93X3JpZ2h0X2tpbmQoYXJyb3cgOiBKc3NtQXJyb3cpIDogSnNzbUFycm93S2luZCB7XG5cbiAgc3dpdGNoICggU3RyaW5nKGFycm93KSApIHtcblxuICAgIGNhc2UgJzwtJzogIGNhc2UgJzw9JyA6ICBjYXNlICc8fic6XG4gICAgICByZXR1cm4gJ25vbmUnO1xuXG4gICAgY2FzZSAnLT4nOiAgY2FzZSAnPC0+JzogIGNhc2UgJzw9LT4nOiAgY2FzZSAnPH4tPic6XG4gICAgICByZXR1cm4gJ2xlZ2FsJztcblxuICAgIGNhc2UgJz0+JzogIGNhc2UgJzw9Pic6ICBjYXNlICc8LT0+JzogIGNhc2UgJzx+PT4nOlxuICAgICAgcmV0dXJuICdtYWluJztcblxuICAgIGNhc2UgJ34+JzogIGNhc2UgJzx+Pic6ICBjYXNlICc8LX4+JzogIGNhc2UgJzw9fj4nOlxuICAgICAgcmV0dXJuICdmb3JjZWQnO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXJyb3dfZGlyZWN0aW9uOiB1bmtub3duIGFycm93IHR5cGUgJHthcnJvd31gKTtcblxuICB9XG5cbn1cblxuXG5cblxuXG5mdW5jdGlvbiBjb21waWxlX3J1bGVfdHJhbnNpdGlvbl9zdGVwPG1OVCwgbURUPihcbiAgICAgICAgICAgICBhY2MgICAgIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+LFxuICAgICAgICAgICAgIGZyb20gICAgOiBtTlQsXG4gICAgICAgICAgICAgdG8gICAgICA6IG1OVCxcbiAgICAgICAgICAgICB0aGlzX3NlIDogSnNzbUNvbXBpbGVTZTxtTlQ+LFxuICAgICAgICAgICAgIG5leHRfc2UgOiBKc3NtQ29tcGlsZVNlPG1OVD5cbiAgICAgICAgICkgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4geyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIHBhcnNlciByZXByZXNlbnRhdGlvbiBvZiBhIHRyYW5zaXRpb24gc3RlcCBleHRlbnNpb25cblxuICBjb25zdCBlZGdlcyA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiA9IFtdO1xuXG4gIGNvbnN0IHVGcm9tIDogQXJyYXk8IG1OVCA+ID0gKEFycmF5LmlzQXJyYXkoZnJvbSk/IGZyb20gOiBbZnJvbV0pLFxuICAgICAgICB1VG8gICA6IEFycmF5PCBtTlQgPiA9IChBcnJheS5pc0FycmF5KHRvKT8gICB0byAgIDogW3RvXSAgKTtcblxuICB1RnJvbS5tYXAoIChmOm1OVCkgPT4ge1xuICAgIHVUby5tYXAoICh0Om1OVCkgPT4ge1xuXG4gICAgICBjb25zdCByayA6IEpzc21BcnJvd0tpbmQgPSBhcnJvd19yaWdodF9raW5kKHRoaXNfc2Uua2luZCksXG4gICAgICAgICAgICBsayA6IEpzc21BcnJvd0tpbmQgPSBhcnJvd19sZWZ0X2tpbmQodGhpc19zZS5raW5kKTtcblxuXG4gICAgICBjb25zdCByaWdodCA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHtcbiAgICAgICAgZnJvbSAgICAgICAgOiBmLFxuICAgICAgICB0byAgICAgICAgICA6IHQsXG4gICAgICAgIGtpbmQgICAgICAgIDogcmssXG4gICAgICAgIGZvcmNlZF9vbmx5IDogcmsgPT09ICdmb3JjZWQnLFxuICAgICAgICBtYWluX3BhdGggICA6IHJrID09PSAnbWFpbidcbiAgICAgIH07XG5cbiAgICAgIGlmICh0aGlzX3NlLnJfYWN0aW9uKSAgICAgIHsgcmlnaHQuYWN0aW9uICAgICAgPSB0aGlzX3NlLnJfYWN0aW9uOyAgICAgIH1cbiAgICAgIGlmICh0aGlzX3NlLnJfcHJvYmFiaWxpdHkpIHsgcmlnaHQucHJvYmFiaWxpdHkgPSB0aGlzX3NlLnJfcHJvYmFiaWxpdHk7IH1cbiAgICAgIGlmIChyaWdodC5raW5kICE9PSAnbm9uZScpIHsgZWRnZXMucHVzaChyaWdodCk7IH1cblxuXG4gICAgICBjb25zdCBsZWZ0IDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0ge1xuICAgICAgICBmcm9tICAgICAgICA6IHQsXG4gICAgICAgIHRvICAgICAgICAgIDogZixcbiAgICAgICAga2luZCAgICAgICAgOiBsayxcbiAgICAgICAgZm9yY2VkX29ubHkgOiBsayA9PT0gJ2ZvcmNlZCcsXG4gICAgICAgIG1haW5fcGF0aCAgIDogbGsgPT09ICdtYWluJ1xuICAgICAgfTtcblxuICAgICAgaWYgKHRoaXNfc2UubF9hY3Rpb24pICAgICAgeyBsZWZ0LmFjdGlvbiAgICAgID0gdGhpc19zZS5sX2FjdGlvbjsgICAgICB9XG4gICAgICBpZiAodGhpc19zZS5sX3Byb2JhYmlsaXR5KSB7IGxlZnQucHJvYmFiaWxpdHkgPSB0aGlzX3NlLmxfcHJvYmFiaWxpdHk7IH1cbiAgICAgIGlmIChsZWZ0LmtpbmQgIT09ICdub25lJykgIHsgZWRnZXMucHVzaChsZWZ0KTsgfVxuXG4gICAgfSk7XG4gIH0pO1xuXG4gIGNvbnN0IG5ld19hY2MgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBhY2MuY29uY2F0KGVkZ2VzKTtcblxuICBpZiAobmV4dF9zZSkge1xuICAgIHJldHVybiBjb21waWxlX3J1bGVfdHJhbnNpdGlvbl9zdGVwKG5ld19hY2MsIHRvLCBuZXh0X3NlLnRvLCBuZXh0X3NlLCBuZXh0X3NlLnNlKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3X2FjYztcbiAgfVxuXG59XG5cblxuXG5mdW5jdGlvbiBjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb248bU5UPihydWxlIDogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pIDogbWl4ZWQgeyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIHBhcnNlciByZXByZXNlbnRhdGlvbiBvZiBhIHRyYW5zaXRpb25cbiAgcmV0dXJuIGNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXAoW10sIHJ1bGUuZnJvbSwgcnVsZS5zZS50bywgcnVsZS5zZSwgcnVsZS5zZS5zZSk7XG59XG5cblxuXG5mdW5jdGlvbiBjb21waWxlX3J1bGVfaGFuZGxlcjxtTlQ+KHJ1bGUgOiBKc3NtQ29tcGlsZVNlU3RhcnQ8bU5UPikgOiBKc3NtQ29tcGlsZVJ1bGUgeyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIG91dHB1dCBvZiB0aGUgcGFyc2VyXG5cbiAgaWYgKHJ1bGUua2V5ID09PSAndHJhbnNpdGlvbicpIHsgcmV0dXJuIHsgYWdnX2FzOiAndHJhbnNpdGlvbicsIHZhbDogY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uKHJ1bGUpIH07IH1cblxuICBjb25zdCB0YXV0b2xvZ2llcyA6IEFycmF5PHN0cmluZz4gPSBbXG4gICAgJ2dyYXBoX2xheW91dCcsICdzdGFydF9zdGF0ZXMnLCAnZW5kX3N0YXRlcycsICdtYWNoaW5lX25hbWUnLCAnbWFjaGluZV92ZXJzaW9uJyxcbiAgICAnbWFjaGluZV9jb21tZW50JywgJ21hY2hpbmVfYXV0aG9yJywgJ21hY2hpbmVfY29udHJpYnV0b3InLCAnbWFjaGluZV9kZWZpbml0aW9uJyxcbiAgICAnbWFjaGluZV9yZWZlcmVuY2UnLCAnbWFjaGluZV9saWNlbnNlJywgJ2ZzbF92ZXJzaW9uJ1xuICBdO1xuXG4gIGlmICh0YXV0b2xvZ2llcy5pbmNsdWRlcyhydWxlLmtleSkpIHtcbiAgICByZXR1cm4geyBhZ2dfYXM6IHJ1bGUua2V5LCB2YWw6IHJ1bGUudmFsdWUgfTtcbiAgfVxuXG4gIHRocm93IG5ldyBFcnJvcihgY29tcGlsZV9ydWxlX2hhbmRsZXI6IFVua25vd24gcnVsZTogJHtKU09OLnN0cmluZ2lmeShydWxlKX1gKTtcblxufVxuXG5cblxuZnVuY3Rpb24gY29tcGlsZTxtTlQsIG1EVD4odHJlZSA6IEpzc21QYXJzZVRyZWU8bU5UPikgOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4geyAgLy8gdG9kbyBmbG93IGRlc2NyaWJlIHRoZSBvdXRwdXQgb2YgdGhlIHBhcnNlclxuXG4gIGNvbnN0IHJlc3VsdHMgOiB7XG4gICAgZ3JhcGhfbGF5b3V0ICAgICAgICA6IEFycmF5PCBKc3NtTGF5b3V0ID4sXG4gICAgdHJhbnNpdGlvbiAgICAgICAgICA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPixcbiAgICBzdGFydF9zdGF0ZXMgICAgICAgIDogQXJyYXk8IG1OVCA+LFxuICAgIGVuZF9zdGF0ZXMgICAgICAgICAgOiBBcnJheTwgbU5UID4sXG4gICAgZnNsX3ZlcnNpb24gICAgICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2F1dGhvciAgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfY29tbWVudCAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9jb250cmlidXRvciA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2RlZmluaXRpb24gIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfbGljZW5zZSAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9uYW1lICAgICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX3ZlcnNpb24gICAgIDogQXJyYXk8IHN0cmluZyA+IC8vIHNlbXZlclxuICB9ID0ge1xuICAgIGdyYXBoX2xheW91dCAgICAgICAgOiBbXSxcbiAgICB0cmFuc2l0aW9uICAgICAgICAgIDogW10sXG4gICAgc3RhcnRfc3RhdGVzICAgICAgICA6IFtdLFxuICAgIGVuZF9zdGF0ZXMgICAgICAgICAgOiBbXSxcbiAgICBmc2xfdmVyc2lvbiAgICAgICAgIDogW10sXG4gICAgbWFjaGluZV9hdXRob3IgICAgICA6IFtdLFxuICAgIG1hY2hpbmVfY29tbWVudCAgICAgOiBbXSxcbiAgICBtYWNoaW5lX2NvbnRyaWJ1dG9yIDogW10sXG4gICAgbWFjaGluZV9kZWZpbml0aW9uICA6IFtdLFxuICAgIG1hY2hpbmVfbGljZW5zZSAgICAgOiBbXSxcbiAgICBtYWNoaW5lX25hbWUgICAgICAgIDogW10sXG4gICAgbWFjaGluZV92ZXJzaW9uICAgICA6IFtdXG4gIH07XG5cbiAgdHJlZS5tYXAoICh0ciA6IEpzc21Db21waWxlU2VTdGFydDxtTlQ+KSA9PiB7XG5cbiAgICBjb25zdCBydWxlICAgOiBKc3NtQ29tcGlsZVJ1bGUgPSBjb21waWxlX3J1bGVfaGFuZGxlcih0ciksXG4gICAgICAgICAgYWdnX2FzIDogc3RyaW5nICAgICAgICAgID0gcnVsZS5hZ2dfYXMsXG4gICAgICAgICAgdmFsICAgIDogbWl4ZWQgICAgICAgICAgID0gcnVsZS52YWw7ICAgICAgICAgICAgICAgICAgLy8gdG9kbyBiZXR0ZXIgdHlwZXNcblxuICAgIHJlc3VsdHNbYWdnX2FzXSA9IHJlc3VsdHNbYWdnX2FzXS5jb25jYXQodmFsKTtcblxuICB9KTtcblxuICBjb25zdCBhc3NlbWJsZWRfdHJhbnNpdGlvbnMgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBbXS5jb25jYXQoLi4uIHJlc3VsdHNbJ3RyYW5zaXRpb24nXSk7XG5cbiAgY29uc3QgcmVzdWx0X2NmZyA6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPiA9IHtcbiAgICBzdGFydF9zdGF0ZXMgOiByZXN1bHRzLnN0YXJ0X3N0YXRlcy5sZW5ndGg/IHJlc3VsdHMuc3RhcnRfc3RhdGVzIDogW2Fzc2VtYmxlZF90cmFuc2l0aW9uc1swXS5mcm9tXSxcbiAgICB0cmFuc2l0aW9ucyAgOiBhc3NlbWJsZWRfdHJhbnNpdGlvbnNcbiAgfTtcblxuICBjb25zdCBvbmVPbmx5S2V5cyA6IEFycmF5PHN0cmluZz4gPSBbXG4gICAgJ2dyYXBoX2xheW91dCcsICdtYWNoaW5lX25hbWUnLCAnbWFjaGluZV92ZXJzaW9uJywgJ21hY2hpbmVfY29tbWVudCcsICdmc2xfdmVyc2lvbicsICdtYWNoaW5lX2xpY2Vuc2UnXG4gIF07XG5cbiAgb25lT25seUtleXMubWFwKCAob25lT25seUtleSA6IHN0cmluZykgPT4ge1xuICAgIGlmIChyZXN1bHRzW29uZU9ubHlLZXldLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWF5IG9ubHkgaGF2ZSBvbmUgJHtvbmVPbmx5S2V5fSBzdGF0ZW1lbnQgbWF4aW11bTogJHtKU09OLnN0cmluZ2lmeShyZXN1bHRzW29uZU9ubHlLZXldKX1gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHJlc3VsdHNbb25lT25seUtleV0ubGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdF9jZmdbb25lT25seUtleV0gPSByZXN1bHRzW29uZU9ubHlLZXldWzBdO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgWydtYWNoaW5lX2F1dGhvciddLm1hcCggKG11bHRpS2V5IDogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHJlc3VsdHNbbXVsdGlLZXldLmxlbmd0aCkge1xuICAgICAgcmVzdWx0X2NmZ1ttdWx0aUtleV0gPSByZXN1bHRzW211bHRpS2V5XTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiByZXN1bHRfY2ZnO1xuXG59XG5cblxuXG5mdW5jdGlvbiBtYWtlPG1OVCwgbURUPihwbGFuIDogc3RyaW5nKSA6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPiB7XG4gIHJldHVybiBjb21waWxlKHBhcnNlKHBsYW4pKTtcbn1cblxuXG5cblxuXG5jbGFzcyBNYWNoaW5lPG1OVCwgbURUPiB7XG5cblxuICBfc3RhdGUgICAgICAgICAgICAgICAgICA6IG1OVDtcbiAgX3N0YXRlcyAgICAgICAgICAgICAgICAgOiBNYXA8bU5ULCBKc3NtR2VuZXJpY1N0YXRlPG1OVD4+O1xuICBfZWRnZXMgICAgICAgICAgICAgICAgICA6IEFycmF5PEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPj47XG4gIF9lZGdlX21hcCAgICAgICAgICAgICAgIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG4gIF9uYW1lZF90cmFuc2l0aW9ucyAgICAgIDogTWFwPG1OVCwgbnVtYmVyPjtcbiAgX2FjdGlvbnMgICAgICAgICAgICAgICAgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcbiAgX3JldmVyc2VfYWN0aW9ucyAgICAgICAgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcbiAgX3JldmVyc2VfYWN0aW9uX3RhcmdldHMgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcbiAgX2F1dGhvciAgICAgICAgICAgICAgICAgOiBBcnJheTxzdHJpbmc+O1xuICBfY29udHJpYnV0b3IgICAgICAgICAgICA6IEFycmF5PHN0cmluZz47XG5cbiAgX2dyYXBoX2xheW91dCAgICAgICAgICAgOiBKc3NtTGF5b3V0O1xuXG4gIC8vIHdoYXJnYXJibCB0aGlzIGJhZGx5IG5lZWRzIHRvIGJlIGJyb2tlbiB1cCwgbW9ub2xpdGggbWFzdGVyXG4gIGNvbnN0cnVjdG9yKHsgc3RhcnRfc3RhdGVzLCBjb21wbGV0ZT1bXSwgdHJhbnNpdGlvbnMsIGdyYXBoX2xheW91dCA9ICdkb3QnIH0gOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4pIHtcblxuICAgIHRoaXMuX3N0YXRlICAgICAgICAgICAgICAgICAgPSBzdGFydF9zdGF0ZXNbMF07XG4gICAgdGhpcy5fc3RhdGVzICAgICAgICAgICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9lZGdlcyAgICAgICAgICAgICAgICAgID0gW107XG4gICAgdGhpcy5fZWRnZV9tYXAgICAgICAgICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucyAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX2FjdGlvbnMgICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25zICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzID0gbmV3IE1hcCgpOyAgIC8vIHRvZG9cblxuICAgIHRoaXMuX2dyYXBoX2xheW91dCAgICAgICAgICAgPSBncmFwaF9sYXlvdXQ7XG5cbiAgICB0cmFuc2l0aW9ucy5tYXAoICh0cjpKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pID0+IHtcblxuICAgICAgaWYgKHRyLmZyb20gPT09IHVuZGVmaW5lZCkgeyB0aHJvdyBuZXcgRXJyb3IoYHRyYW5zaXRpb24gbXVzdCBkZWZpbmUgJ2Zyb20nOiAke0pTT04uc3RyaW5naWZ5KHRyKX1gKTsgfVxuICAgICAgaWYgKHRyLnRvICAgPT09IHVuZGVmaW5lZCkgeyB0aHJvdyBuZXcgRXJyb3IoYHRyYW5zaXRpb24gbXVzdCBkZWZpbmUgJ3RvJzogJHsgIEpTT04uc3RyaW5naWZ5KHRyKX1gKTsgfVxuXG4gICAgICAvLyBnZXQgdGhlIGN1cnNvcnMuICB3aGF0IGEgbWVzc1xuICAgICAgY29uc3QgY3Vyc29yX2Zyb20gOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD5cbiAgICAgICAgICA9IHRoaXMuX3N0YXRlcy5nZXQodHIuZnJvbSlcbiAgICAgICAgIHx8IHsgbmFtZTogdHIuZnJvbSwgZnJvbTogW10sIHRvOiBbXSwgY29tcGxldGU6IGNvbXBsZXRlLmluY2x1ZGVzKHRyLmZyb20pIH07XG5cbiAgICAgIGlmICghKHRoaXMuX3N0YXRlcy5oYXModHIuZnJvbSkpKSB7XG4gICAgICAgIHRoaXMuX25ld19zdGF0ZShjdXJzb3JfZnJvbSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGN1cnNvcl90byA6IEpzc21HZW5lcmljU3RhdGU8bU5UPlxuICAgICAgICAgID0gdGhpcy5fc3RhdGVzLmdldCh0ci50bylcbiAgICAgICAgIHx8IHtuYW1lOiB0ci50bywgZnJvbTogW10sIHRvOiBbXSwgY29tcGxldGU6IGNvbXBsZXRlLmluY2x1ZGVzKHRyLnRvKSB9O1xuXG4gICAgICBpZiAoISh0aGlzLl9zdGF0ZXMuaGFzKHRyLnRvKSkpIHtcbiAgICAgICAgdGhpcy5fbmV3X3N0YXRlKGN1cnNvcl90byk7XG4gICAgICB9XG5cbiAgICAgIC8vIGd1YXJkIGFnYWluc3QgZXhpc3RpbmcgY29ubmVjdGlvbnMgYmVpbmcgcmUtYWRkZWRcbiAgICAgIGlmIChjdXJzb3JfZnJvbS50by5pbmNsdWRlcyh0ci50bykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBhbHJlYWR5IGhhcyAke0pTT04uc3RyaW5naWZ5KHRyLmZyb20pfSB0byAke0pTT04uc3RyaW5naWZ5KHRyLnRvKX1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGN1cnNvcl9mcm9tLnRvLnB1c2godHIudG8pO1xuICAgICAgICBjdXJzb3JfdG8uZnJvbS5wdXNoKHRyLmZyb20pO1xuICAgICAgfVxuXG4gICAgICAvLyBhZGQgdGhlIGVkZ2U7IG5vdGUgaXRzIGlkXG4gICAgICB0aGlzLl9lZGdlcy5wdXNoKHRyKTtcbiAgICAgIGNvbnN0IHRoaXNFZGdlSWQgOiBudW1iZXIgPSB0aGlzLl9lZGdlcy5sZW5ndGggLSAxO1xuXG4gICAgICAvLyBndWFyZCBhZ2FpbnN0IHJlcGVhdGluZyBhIHRyYW5zaXRpb24gbmFtZVxuICAgICAgaWYgKHRyLm5hbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuX25hbWVkX3RyYW5zaXRpb25zLmhhcyh0ci5uYW1lKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgbmFtZWQgdHJhbnNpdGlvbiBcIiR7SlNPTi5zdHJpbmdpZnkodHIubmFtZSl9XCIgYWxyZWFkeSBjcmVhdGVkYCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMuc2V0KHRyLm5hbWUsIHRoaXNFZGdlSWQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHNldCB1cCB0aGUgbWFwcGluZywgc28gdGhhdCBlZGdlcyBjYW4gYmUgbG9va2VkIHVwIGJ5IGVuZHBvaW50IHBhaXJzXG4gICAgICBjb25zdCBmcm9tX21hcHBpbmcgOiBNYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fZWRnZV9tYXAuZ2V0KHRyLmZyb20pIHx8IG5ldyBNYXAoKTtcbiAgICAgIGlmICghKHRoaXMuX2VkZ2VfbWFwLmhhcyh0ci5mcm9tKSkpIHtcbiAgICAgICAgdGhpcy5fZWRnZV9tYXAuc2V0KHRyLmZyb20sIGZyb21fbWFwcGluZyk7XG4gICAgICB9XG5cbi8vICAgIGNvbnN0IHRvX21hcHBpbmcgPSBmcm9tX21hcHBpbmcuZ2V0KHRyLnRvKTtcbiAgICAgIGZyb21fbWFwcGluZy5zZXQodHIudG8sIHRoaXNFZGdlSWQpOyAvLyBhbHJlYWR5IGNoZWNrZWQgdGhhdCB0aGlzIG1hcHBpbmcgZG9lc24ndCBleGlzdCwgYWJvdmVcblxuICAgICAgLy8gc2V0IHVwIHRoZSBhY3Rpb24gbWFwcGluZywgc28gdGhhdCBhY3Rpb25zIGNhbiBiZSBsb29rZWQgdXAgYnkgb3JpZ2luXG4gICAgICBpZiAodHIuYWN0aW9uKSB7XG5cblxuICAgICAgICAvLyBmb3J3YXJkIG1hcHBpbmcgZmlyc3QgYnkgYWN0aW9uIG5hbWVcbiAgICAgICAgbGV0IGFjdGlvbk1hcCA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fYWN0aW9ucy5nZXQodHIuYWN0aW9uKTtcbiAgICAgICAgaWYgKCEoYWN0aW9uTWFwKSkge1xuICAgICAgICAgIGFjdGlvbk1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgICB0aGlzLl9hY3Rpb25zLnNldCh0ci5hY3Rpb24sIGFjdGlvbk1hcCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYWN0aW9uTWFwLmhhcyh0ci5mcm9tKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgYWN0aW9uICR7SlNPTi5zdHJpbmdpZnkodHIuYWN0aW9uKX0gYWxyZWFkeSBhdHRhY2hlZCB0byBvcmlnaW4gJHtKU09OLnN0cmluZ2lmeSh0ci5mcm9tKX1gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhY3Rpb25NYXAuc2V0KHRyLmZyb20sIHRoaXNFZGdlSWQpO1xuICAgICAgICB9XG5cblxuICAgICAgICAvLyByZXZlcnNlIG1hcHBpbmcgZmlyc3QgYnkgc3RhdGUgb3JpZ2luIG5hbWVcbiAgICAgICAgbGV0IHJBY3Rpb25NYXAgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQodHIuZnJvbSk7XG4gICAgICAgIGlmICghKHJBY3Rpb25NYXApKSB7XG4gICAgICAgICAgckFjdGlvbk1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuc2V0KHRyLmZyb20sIHJBY3Rpb25NYXApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbm8gbmVlZCB0byB0ZXN0IGZvciByZXZlcnNlIG1hcHBpbmcgcHJlLXByZXNlbmNlO1xuICAgICAgICAvLyBmb3J3YXJkIG1hcHBpbmcgYWxyZWFkeSBjb3ZlcnMgY29sbGlzaW9uc1xuICAgICAgICByQWN0aW9uTWFwLnNldCh0ci5hY3Rpb24sIHRoaXNFZGdlSWQpO1xuXG5cbiAgICAgICAgLy8gcmV2ZXJzZSBtYXBwaW5nIGZpcnN0IGJ5IHN0YXRlIHRhcmdldCBuYW1lXG4gICAgICAgIGlmICghKHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuaGFzKHRyLnRvKSkpIHtcbiAgICAgICAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLnNldCh0ci50bywgbmV3IE1hcCgpKTtcbiAgICAgICAgfVxuXG4vKiB0b2RvIGNvbWViYWNrXG4gICBmdW5kYW1lbnRhbCBwcm9ibGVtIGlzIHJvQWN0aW9uTWFwIG5lZWRzIHRvIGJlIGEgbXVsdGltYXBcbiAgICAgICAgY29uc3Qgcm9BY3Rpb25NYXAgPSB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLmdldCh0ci50byk7ICAvLyB3YXN0ZWZ1bCAtIGFscmVhZHkgZGlkIGhhcyAtIHJlZmFjdG9yXG4gICAgICAgIGlmIChyb0FjdGlvbk1hcCkge1xuICAgICAgICAgIGlmIChyb0FjdGlvbk1hcC5oYXModHIuYWN0aW9uKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGByby1hY3Rpb24gJHt0ci50b30gYWxyZWFkeSBhdHRhY2hlZCB0byBhY3Rpb24gJHt0ci5hY3Rpb259YCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJvQWN0aW9uTWFwLnNldCh0ci5hY3Rpb24sIHRoaXNFZGdlSWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Nob3VsZCBiZSBpbXBvc3NpYmxlIC0gZmxvdyBkb2VzblxcJ3Qga25vdyAuc2V0IHByZWNlZGVzIC5nZXQgeWV0IGFnYWluLiAgc2V2ZXJlIGVycm9yPycpO1xuICAgICAgICB9XG4qL1xuICAgICAgfVxuXG4gICAgfSk7XG5cbiAgfVxuXG4gIF9uZXdfc3RhdGUoc3RhdGVfY29uZmlnIDogSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+KSA6IG1OVCB7IC8vIHdoYXJnYXJibCBnZXQgdGhhdCBzdGF0ZV9jb25maWcgYW55IHVuZGVyIGNvbnRyb2xcblxuICAgIGlmICh0aGlzLl9zdGF0ZXMuaGFzKHN0YXRlX2NvbmZpZy5uYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHN0YXRlX2NvbmZpZy5uYW1lKX0gYWxyZWFkeSBleGlzdHNgKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zdGF0ZXMuc2V0KHN0YXRlX2NvbmZpZy5uYW1lLCBzdGF0ZV9jb25maWcpO1xuICAgIHJldHVybiBzdGF0ZV9jb25maWcubmFtZTtcblxuICB9XG5cblxuXG4gIHN0YXRlKCkgOiBtTlQge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZTtcbiAgfVxuXG4vKiB3aGFyZ2FyYmwgdG9kbyBtYWpvclxuICAgd2hlbiB3ZSByZWltcGxlbWVudCB0aGlzLCByZWludHJvZHVjZSB0aGlzIGNoYW5nZSB0byB0aGUgaXNfZmluYWwgY2FsbFxuXG4gIGlzX2NoYW5naW5nKCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTsgLy8gdG9kbyB3aGFyZ2FyYmxcbiAgfVxuKi9cblxuXG4gIHN0YXRlX2lzX2ZpbmFsKHdoaWNoU3RhdGUgOiBtTlQpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuICggKHRoaXMuc3RhdGVfaXNfdGVybWluYWwod2hpY2hTdGF0ZSkpICYmICh0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHdoaWNoU3RhdGUpKSApO1xuICB9XG5cbiAgaXNfZmluYWwoKSA6IGJvb2xlYW4ge1xuLy8gIHJldHVybiAoKCF0aGlzLmlzX2NoYW5naW5nKCkpICYmIHRoaXMuc3RhdGVfaXNfZmluYWwodGhpcy5zdGF0ZSgpKSk7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVfaXNfZmluYWwodGhpcy5zdGF0ZSgpKTtcbiAgfVxuXG4gIGdyYXBoX2xheW91dCgpIDogc3RyaW5nIHtcbiAgICByZXR1cm4gU3RyaW5nKHRoaXMuX2dyYXBoX2xheW91dCk7XG4gIH1cblxuXG5cbiAgbWFjaGluZV9zdGF0ZSgpIDogSnNzbU1hY2hpbmVJbnRlcm5hbFN0YXRlPG1OVCwgbURUPiB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgaW50ZXJuYWxfc3RhdGVfaW1wbF92ZXJzaW9uIDogMSxcblxuICAgICAgYWN0aW9ucyAgICAgICAgICAgICAgICA6IHRoaXMuX2FjdGlvbnMsXG4gICAgICBlZGdlX21hcCAgICAgICAgICAgICAgIDogdGhpcy5fZWRnZV9tYXAsXG4gICAgICBlZGdlcyAgICAgICAgICAgICAgICAgIDogdGhpcy5fZWRnZXMsXG4gICAgICBuYW1lZF90cmFuc2l0aW9ucyAgICAgIDogdGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMsXG4gICAgICByZXZlcnNlX2FjdGlvbnMgICAgICAgIDogdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLFxuLy8gICAgcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyA6IHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMsXG4gICAgICBzdGF0ZSAgICAgICAgICAgICAgICAgIDogdGhpcy5fc3RhdGUsXG4gICAgICBzdGF0ZXMgICAgICAgICAgICAgICAgIDogdGhpcy5fc3RhdGVzXG4gICAgfTtcblxuICB9XG5cbi8qXG4gIGxvYWRfbWFjaGluZV9zdGF0ZSgpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlOyAvLyB0b2RvIHdoYXJnYXJibFxuICB9XG4qL1xuXG5cbiAgc3RhdGVzKCkgOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gWy4uLiB0aGlzLl9zdGF0ZXMua2V5cygpXTtcbiAgfVxuXG4gIHN0YXRlX2Zvcih3aGljaFN0YXRlIDogbU5UKSA6IEpzc21HZW5lcmljU3RhdGU8bU5UPiB7XG4gICAgY29uc3Qgc3RhdGUgOiA/SnNzbUdlbmVyaWNTdGF0ZTxtTlQ+ID0gdGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAoc3RhdGUpIHsgcmV0dXJuIHN0YXRlOyB9XG4gICAgZWxzZSAgICAgICB7IHRocm93IG5ldyBFcnJvcihgbm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHN0YXRlKX1gKTsgfVxuICB9XG5cblxuXG4gIGxpc3RfZWRnZXMoKSA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiB7XG4gICAgcmV0dXJuIHRoaXMuX2VkZ2VzO1xuICB9XG5cbiAgbGlzdF9uYW1lZF90cmFuc2l0aW9ucygpIDogTWFwPG1OVCwgbnVtYmVyPiB7XG4gICAgcmV0dXJuIHRoaXMuX25hbWVkX3RyYW5zaXRpb25zO1xuICB9XG5cbiAgbGlzdF9hY3Rpb25zKCkgOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gWy4uLiB0aGlzLl9hY3Rpb25zLmtleXMoKV07XG4gIH1cblxuXG5cbiAgZ2V0X3RyYW5zaXRpb25fYnlfc3RhdGVfbmFtZXMoZnJvbTogbU5ULCB0bzogbU5UKSA6ID9udW1iZXIge1xuXG4gICAgY29uc3QgZW1nIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9lZGdlX21hcC5nZXQoZnJvbSk7XG5cbiAgICBpZiAoZW1nKSB7XG4gICAgICByZXR1cm4gZW1nLmdldCh0byk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gIH1cblxuXG5cbiAgbG9va3VwX3RyYW5zaXRpb25fZm9yKGZyb206IG1OVCwgdG86IG1OVCkgOiA/SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+IHtcbiAgICBjb25zdCBpZCA6ID9udW1iZXIgPSB0aGlzLmdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzKGZyb20sIHRvKTtcbiAgICByZXR1cm4gKChpZCA9PT0gdW5kZWZpbmVkKSB8fCAoaWQgPT09IG51bGwpKT8gdW5kZWZpbmVkIDogdGhpcy5fZWRnZXNbaWRdO1xuICB9XG5cblxuXG4gIGxpc3RfdHJhbnNpdGlvbnMod2hpY2hTdGF0ZSA6IG1OVCA9IHRoaXMuc3RhdGUoKSkgOiBKc3NtVHJhbnNpdGlvbkxpc3Q8bU5UPiB7XG4gICAgcmV0dXJuIHtlbnRyYW5jZXM6IHRoaXMubGlzdF9lbnRyYW5jZXMod2hpY2hTdGF0ZSksIGV4aXRzOiB0aGlzLmxpc3RfZXhpdHMod2hpY2hTdGF0ZSl9O1xuICB9XG5cbiAgbGlzdF9lbnRyYW5jZXMod2hpY2hTdGF0ZSA6IG1OVCA9IHRoaXMuc3RhdGUoKSkgOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gKHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSkgfHwge30pLmZyb20gfHwgW107XG4gIH1cblxuICBsaXN0X2V4aXRzKHdoaWNoU3RhdGUgOiBtTlQgPSB0aGlzLnN0YXRlKCkpIDogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuICh0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpIHx8IHt9KS50byAgIHx8IFtdO1xuICB9XG5cblxuXG4gIHByb2JhYmxlX2V4aXRzX2Zvcih3aGljaFN0YXRlIDogbU5UKSA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiB7XG5cbiAgICBjb25zdCB3c3RhdGUgOiA/SnNzbUdlbmVyaWNTdGF0ZTxtTlQ+ID0gdGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAoISh3c3RhdGUpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfSBpbiBwcm9iYWJsZV9leGl0c19mb3JgKTsgfVxuXG4gICAgY29uc3Qgd3N0YXRlX3RvIDogQXJyYXk8IG1OVCA+ID0gd3N0YXRlLnRvLFxuXG4gICAgICAgICAgd3RmICAgICAgIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IC8vIHdzdGF0ZV90b19maWx0ZXJlZCAtPiB3dGZcbiAgICAgICAgICAgICAgICAgICAgPSB3c3RhdGVfdG9cbiAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoICh3cykgOiA/SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMubG9va3VwX3RyYW5zaXRpb25fZm9yKHRoaXMuc3RhdGUoKSwgd3MpKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKTtcblxuICAgIHJldHVybiB3dGY7XG5cbiAgfVxuXG4gIHByb2JhYmlsaXN0aWNfdHJhbnNpdGlvbigpIDogYm9vbGVhbiB7XG4gICAgY29uc3Qgc2VsZWN0ZWQgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB3ZWlnaHRlZF9yYW5kX3NlbGVjdCh0aGlzLnByb2JhYmxlX2V4aXRzX2Zvcih0aGlzLnN0YXRlKCkpKTtcbiAgICByZXR1cm4gdGhpcy50cmFuc2l0aW9uKCBzZWxlY3RlZC50byApO1xuICB9XG5cbiAgcHJvYmFiaWxpc3RpY193YWxrKG4gOiBudW1iZXIpIDogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuIHNlcShuKVxuICAgICAgICAgIC5tYXAoKCkgOiBtTlQgPT4ge1xuICAgICAgICAgICAgIGNvbnN0IHN0YXRlX3dhcyA6IG1OVCA9IHRoaXMuc3RhdGUoKTtcbiAgICAgICAgICAgICB0aGlzLnByb2JhYmlsaXN0aWNfdHJhbnNpdGlvbigpO1xuICAgICAgICAgICAgIHJldHVybiBzdGF0ZV93YXM7XG4gICAgICAgICAgIH0pXG4gICAgICAgICAgLmNvbmNhdChbdGhpcy5zdGF0ZSgpXSk7XG4gIH1cblxuICBwcm9iYWJpbGlzdGljX2hpc3RvX3dhbGsobiA6IG51bWJlcikgOiBNYXA8bU5ULCBudW1iZXI+IHtcbiAgICByZXR1cm4gaGlzdG9ncmFwaCh0aGlzLnByb2JhYmlsaXN0aWNfd2FsayhuKSk7XG4gIH1cblxuXG5cbiAgYWN0aW9ucyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpICkgOiBBcnJheTxtTlQ+IHtcbiAgICBjb25zdCB3c3RhdGUgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHdzdGF0ZSkgeyByZXR1cm4gWy4uLiB3c3RhdGUua2V5cygpXTsgfVxuICAgIGVsc2UgICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cbiAgfVxuXG4gIGxpc3Rfc3RhdGVzX2hhdmluZ19hY3Rpb24od2hpY2hTdGF0ZSA6IG1OVCkgOiBBcnJheTxtTlQ+IHtcbiAgICBjb25zdCB3c3RhdGUgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICh3c3RhdGUpIHsgcmV0dXJuIFsuLi4gd3N0YXRlLmtleXMoKV07IH1cbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG4gIH1cblxuLy8gY29tZWJhY2tcbi8qXG4gIGxpc3RfZW50cmFuY2VfYWN0aW9ucyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpICkgOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gWy4uLiAodGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5nZXQod2hpY2hTdGF0ZSkgfHwgbmV3IE1hcCgpKS52YWx1ZXMoKV0gLy8gd2FzdGVmdWxcbiAgICAgICAgICAgLm1hcCggKGVkZ2VJZDphbnkpID0+ICh0aGlzLl9lZGdlc1tlZGdlSWRdIDogYW55KSkgLy8gd2hhcmdhcmJsIGJ1cm4gb3V0IGFueVxuICAgICAgICAgICAuZmlsdGVyKCAobzphbnkpID0+IG8udG8gPT09IHdoaWNoU3RhdGUpXG4gICAgICAgICAgIC5tYXAoIGZpbHRlcmVkID0+IGZpbHRlcmVkLmZyb20gKTtcbiAgfVxuKi9cbiAgbGlzdF9leGl0X2FjdGlvbnMod2hpY2hTdGF0ZSA6IG1OVCA9IHRoaXMuc3RhdGUoKSApIDogQXJyYXk8P21OVD4geyAvLyB0aGVzZSBhcmUgbU5ULCBub3QgP21OVFxuICAgIGNvbnN0IHJhX2Jhc2UgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKCEocmFfYmFzZSkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cblxuICAgIHJldHVybiBbLi4uIHJhX2Jhc2UudmFsdWVzKCldXG4gICAgICAgICAgIC5tYXAgICAgKCAoZWRnZUlkOm51bWJlcikgICAgICAgICAgICAgIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMuX2VkZ2VzW2VkZ2VJZF0gICApXG4gICAgICAgICAgIC5maWx0ZXIgKCAobzpKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pIDogYm9vbGVhbiAgICAgICAgICAgICAgICAgID0+IG8uZnJvbSA9PT0gd2hpY2hTdGF0ZSApXG4gICAgICAgICAgIC5tYXAgICAgKCAoZmlsdGVyZWQgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pIDogP21OVCAgICAgICAgICAgID0+IGZpbHRlcmVkLmFjdGlvbiAgICAgICApO1xuICB9XG5cbiAgcHJvYmFibGVfYWN0aW9uX2V4aXRzKHdoaWNoU3RhdGUgOiBtTlQgPSB0aGlzLnN0YXRlKCkgKSA6IEFycmF5PG1peGVkPiB7IC8vIHRoZXNlIGFyZSBtTlRcbiAgICBjb25zdCByYV9iYXNlIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICghKHJhX2Jhc2UpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG5cbiAgICByZXR1cm4gWy4uLiByYV9iYXNlLnZhbHVlcygpXVxuICAgICAgICAgICAubWFwICAgICggKGVkZ2VJZDpudW1iZXIpIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMuX2VkZ2VzW2VkZ2VJZF0gICApXG4gICAgICAgICAgIC5maWx0ZXIgKCAobzpKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pIDogYm9vbGVhbiAgICAgPT4gby5mcm9tID09PSB3aGljaFN0YXRlIClcbiAgICAgICAgICAgLm1hcCAgICAoIChmaWx0ZXJlZCkgOiBtaXhlZCAgICAgICAgICAgICAgICAgICAgICAgICA9PiAoIHsgYWN0aW9uICAgICAgOiBmaWx0ZXJlZC5hY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2JhYmlsaXR5IDogZmlsdGVyZWQucHJvYmFiaWxpdHkgfSApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgfVxuXG5cblxuICBpc191bmVudGVyYWJsZSh3aGljaFN0YXRlIDogbU5UKSA6IGJvb2xlYW4ge1xuICAgIC8vIHdoYXJnYXJibCBzaG91bGQgdGhyb3cgb24gdW5rbm93biBzdGF0ZVxuICAgIHJldHVybiB0aGlzLmxpc3RfZW50cmFuY2VzKHdoaWNoU3RhdGUpLmxlbmd0aCA9PT0gMDtcbiAgfVxuXG4gIGhhc191bmVudGVyYWJsZXMoKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlcygpLnNvbWUoICh4KSA6IGJvb2xlYW4gPT4gdGhpcy5pc191bmVudGVyYWJsZSh4KSk7XG4gIH1cblxuXG5cbiAgaXNfdGVybWluYWwoKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlX2lzX3Rlcm1pbmFsKHRoaXMuc3RhdGUoKSk7XG4gIH1cblxuICBzdGF0ZV9pc190ZXJtaW5hbCh3aGljaFN0YXRlIDogbU5UKSA6IGJvb2xlYW4ge1xuICAgIC8vIHdoYXJnYXJibCBzaG91bGQgdGhyb3cgb24gdW5rbm93biBzdGF0ZVxuICAgIHJldHVybiB0aGlzLmxpc3RfZXhpdHMod2hpY2hTdGF0ZSkubGVuZ3RoID09PSAwO1xuICB9XG5cbiAgaGFzX3Rlcm1pbmFscygpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpIDogYm9vbGVhbiA9PiB0aGlzLnN0YXRlX2lzX3Rlcm1pbmFsKHgpKTtcbiAgfVxuXG5cblxuICBpc19jb21wbGV0ZSgpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVfaXNfY29tcGxldGUodGhpcy5zdGF0ZSgpKTtcbiAgfVxuXG4gIHN0YXRlX2lzX2NvbXBsZXRlKHdoaWNoU3RhdGUgOiBtTlQpIDogYm9vbGVhbiB7XG4gICAgY29uc3Qgd3N0YXRlIDogP0pzc21HZW5lcmljU3RhdGU8bU5UPiA9IHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHdzdGF0ZSkgeyByZXR1cm4gd3N0YXRlLmNvbXBsZXRlOyB9XG4gICAgZWxzZSAgICAgICAgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuICB9XG5cbiAgaGFzX2NvbXBsZXRlcygpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpIDogYm9vbGVhbiA9PiB0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHgpICk7XG4gIH1cblxuXG5cbiAgYWN0aW9uKG5hbWUgOiBtTlQsIG5ld0RhdGE/IDogbURUKSA6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX2FjdGlvbihuYW1lLCBuZXdEYXRhKSkge1xuICAgICAgY29uc3QgZWRnZSA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHRoaXMuY3VycmVudF9hY3Rpb25fZWRnZV9mb3IobmFtZSk7XG4gICAgICB0aGlzLl9zdGF0ZSA9IGVkZ2UudG87XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHRyYW5zaXRpb24obmV3U3RhdGUgOiBtTlQsIG5ld0RhdGE/IDogbURUKSA6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX3RyYW5zaXRpb24obmV3U3RhdGUsIG5ld0RhdGEpKSB7XG4gICAgICB0aGlzLl9zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvLyBjYW4gbGVhdmUgbWFjaGluZSBpbiBpbmNvbnNpc3RlbnQgc3RhdGUuICBnZW5lcmFsbHkgZG8gbm90IHVzZVxuICBmb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlIDogbU5ULCBuZXdEYXRhPyA6IG1EVCkgOiBib29sZWFuIHtcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBpZiAodGhpcy52YWxpZF9mb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlLCBuZXdEYXRhKSkge1xuICAgICAgdGhpcy5fc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cblxuXG4gIGN1cnJlbnRfYWN0aW9uX2ZvcihhY3Rpb24gOiBtTlQpIDogbnVtYmVyIHwgdm9pZCB7XG4gICAgY29uc3QgYWN0aW9uX2Jhc2UgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KGFjdGlvbik7XG4gICAgcmV0dXJuIGFjdGlvbl9iYXNlPyBhY3Rpb25fYmFzZS5nZXQodGhpcy5zdGF0ZSgpKSA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGN1cnJlbnRfYWN0aW9uX2VkZ2VfZm9yKGFjdGlvbiA6IG1OVCkgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4ge1xuICAgIGNvbnN0IGlkeCA6ID9udW1iZXIgPSB0aGlzLmN1cnJlbnRfYWN0aW9uX2ZvcihhY3Rpb24pO1xuICAgIGlmICgoaWR4ID09PSB1bmRlZmluZWQpIHx8IChpZHggPT09IG51bGwpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBhY3Rpb24gJHtKU09OLnN0cmluZ2lmeShhY3Rpb24pfWApOyB9XG4gICAgcmV0dXJuIHRoaXMuX2VkZ2VzW2lkeF07XG4gIH1cblxuICB2YWxpZF9hY3Rpb24oYWN0aW9uIDogbU5ULCBfbmV3RGF0YT8gOiBtRFQpIDogYm9vbGVhbiB7ICAvLyB0b2RvIGNvbWViYWNrIHVuaWdub3JlIG5ld0RhdGFcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50X2FjdGlvbl9mb3IoYWN0aW9uKSAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgdmFsaWRfdHJhbnNpdGlvbihuZXdTdGF0ZSA6IG1OVCwgX25ld0RhdGE/IDogbURUKSA6IGJvb2xlYW4geyAgLy8gdG9kbyBjb21lYmFjayB1bmlnbm9yZSBuZXdEYXRhXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgY29uc3QgdHJhbnNpdGlvbl9mb3IgOiA/SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gdGhpcy5sb29rdXBfdHJhbnNpdGlvbl9mb3IodGhpcy5zdGF0ZSgpLCBuZXdTdGF0ZSk7XG5cbiAgICBpZiAoISh0cmFuc2l0aW9uX2ZvcikpICAgICAgICAgIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgaWYgKHRyYW5zaXRpb25fZm9yLmZvcmNlZF9vbmx5KSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfVxuXG4gIHZhbGlkX2ZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGUgOiBtTlQsIF9uZXdEYXRhPyA6IG1EVCkgOiBib29sZWFuIHsgIC8vIHRvZG8gY29tZWJhY2sgdW5pZ25vcmUgbmV3RGF0YVxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIHJldHVybiAodGhpcy5sb29rdXBfdHJhbnNpdGlvbl9mb3IodGhpcy5zdGF0ZSgpLCBuZXdTdGF0ZSkgIT09IHVuZGVmaW5lZCk7XG4gIH1cblxuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gc208bU5ULCBtRFQ+KHRlbXBsYXRlX3N0cmluZ3MgOiBBcnJheTxzdHJpbmc+IC8qICwgYXJndW1lbnRzICovKSA6IE1hY2hpbmU8bU5ULCBtRFQ+IHtcblxuICAgIC8vIGZvb2BhJHsxfWIkezJ9Y2Agd2lsbCBjb21lIGluIGFzIChbJ2EnLCdiJywnYyddLDEsMilcbiAgICAvLyB0aGlzIGluY2x1ZGVzIHdoZW4gYSBhbmQgYyBhcmUgZW1wdHkgc3RyaW5nc1xuICAgIC8vIHRoZXJlZm9yZSB0ZW1wbGF0ZV9zdHJpbmdzIHdpbGwgYWx3YXlzIGhhdmUgb25lIG1vcmUgZWwgdGhhbiB0ZW1wbGF0ZV9hcmdzXG4gICAgLy8gdGhlcmVmb3JlIG1hcCB0aGUgc21hbGxlciBjb250YWluZXIgYW5kIHRvc3MgdGhlIGxhc3Qgb25lIG9uIG9uIHRoZSB3YXkgb3V0XG5cbiAgICByZXR1cm4gbmV3IE1hY2hpbmUobWFrZSh0ZW1wbGF0ZV9zdHJpbmdzLnJlZHVjZShcblxuICAgICAgLy8gaW4gZ2VuZXJhbCBhdm9pZGluZyBgYXJndW1lbnRzYCBpcyBzbWFydC4gIGhvd2V2ZXIgd2l0aCB0aGUgdGVtcGxhdGVcbiAgICAgIC8vIHN0cmluZyBub3RhdGlvbiwgYXMgZGVzaWduZWQsIGl0J3Mgbm90IHJlYWxseSB3b3J0aCB0aGUgaGFzc2xlXG5cbiAgICAgIC8qIGVzbGludC1kaXNhYmxlIGZwL25vLWFyZ3VtZW50cyAqL1xuICAgICAgLyogZXNsaW50LWRpc2FibGUgcHJlZmVyLXJlc3QtcGFyYW1zICovXG4gICAgICAoYWNjLCB2YWwsIGlkeCkgOiBzdHJpbmcgPT4gYCR7YWNjfSR7YXJndW1lbnRzW2lkeF19JHt2YWx9YCAgLy8gYXJndW1lbnRzWzBdIGlzIG5ldmVyIGxvYWRlZCwgc28gYXJncyBkb2Vzbid0IG5lZWQgdG8gYmUgZ2F0ZWRcbiAgICAgIC8qIGVzbGludC1lbmFibGUgIHByZWZlci1yZXN0LXBhcmFtcyAqL1xuICAgICAgLyogZXNsaW50LWVuYWJsZSAgZnAvbm8tYXJndW1lbnRzICovXG5cbiAgICApKSk7XG5cbn1cblxuXG5cblxuXG5leHBvcnQge1xuXG4gIHZlcnNpb24sXG5cbiAgTWFjaGluZSxcblxuICBtYWtlLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG5cbiAgc20sXG5cbiAgYXJyb3dfZGlyZWN0aW9uLFxuICBhcnJvd19sZWZ0X2tpbmQsXG4gIGFycm93X3JpZ2h0X2tpbmQsXG5cbiAgLy8gdG9kbyB3aGFyZ2FyYmwgdGhlc2Ugc2hvdWxkIGJlIGV4cG9ydGVkIHRvIGEgdXRpbGl0eSBsaWJyYXJ5XG4gIHNlcSwgd2VpZ2h0ZWRfcmFuZF9zZWxlY3QsIGhpc3RvZ3JhcGgsIHdlaWdodGVkX3NhbXBsZV9zZWxlY3QsIHdlaWdodGVkX2hpc3RvX2tleVxuXG59O1xuIl19