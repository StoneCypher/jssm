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

var version = '5.5.0'; // replaced from package.js in build


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
    machine_name: [],
    machine_version: []
  };

  tree.map(function (tr) {

    var rule = compile_rule_handler(tr),
        agg_as = rule.agg_as,
        val = rule.val; // todo better types

    results[agg_as] = results[agg_as].concat(val);
  });

  ['graph_layout', 'machine_name', 'machine_version'].map(function (oneOnlyKey) {
    if (results[oneOnlyKey].length > 1) {
      throw new Error('May only have one ' + oneOnlyKey + ' statement maximum: ' + JSON.stringify(results[oneOnlyKey]));
    }
  });

  var assembled_transitions = (_ref = []).concat.apply(_ref, _toConsumableArray(results['transition']));

  var result_cfg = {
    // whargarbl should be    initial_state : results.initial_state[0],
    start_states: results.start_states.length ? results.start_states : [assembled_transitions[0].from],
    transitions: assembled_transitions
  };

  if (results.graph_layout.length) {
    result_cfg.layout = results.graph_layout[0];
  }

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
        _ref2$layout = _ref2.layout,
        layout = _ref2$layout === undefined ? 'dot' : _ref2$layout;

    _classCallCheck(this, Machine);

    this._state = start_states[0];
    this._states = new Map();
    this._edges = [];
    this._edge_map = new Map();
    this._named_transitions = new Map();
    this._actions = new Map();
    this._reverse_actions = new Map();
    this._reverse_action_targets = new Map(); // todo

    this._layout = layout;

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
    key: 'layout',
    value: function layout() {
      return String(this._layout);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLmpzIl0sIm5hbWVzIjpbInBhcnNlIiwicmVxdWlyZSIsInZlcnNpb24iLCJhcnJvd19kaXJlY3Rpb24iLCJhcnJvdyIsIlN0cmluZyIsIkVycm9yIiwiYXJyb3dfbGVmdF9raW5kIiwiYXJyb3dfcmlnaHRfa2luZCIsImNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXAiLCJhY2MiLCJmcm9tIiwidG8iLCJ0aGlzX3NlIiwibmV4dF9zZSIsImVkZ2VzIiwidUZyb20iLCJBcnJheSIsImlzQXJyYXkiLCJ1VG8iLCJtYXAiLCJmIiwidCIsInJrIiwia2luZCIsImxrIiwicmlnaHQiLCJmb3JjZWRfb25seSIsIm1haW5fcGF0aCIsInJfYWN0aW9uIiwiYWN0aW9uIiwicl9wcm9iYWJpbGl0eSIsInByb2JhYmlsaXR5IiwicHVzaCIsImxlZnQiLCJsX2FjdGlvbiIsImxfcHJvYmFiaWxpdHkiLCJuZXdfYWNjIiwiY29uY2F0Iiwic2UiLCJjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb24iLCJydWxlIiwiY29tcGlsZV9ydWxlX2hhbmRsZXIiLCJrZXkiLCJhZ2dfYXMiLCJ2YWwiLCJ0YXV0b2xvZ2llcyIsImluY2x1ZGVzIiwidmFsdWUiLCJKU09OIiwic3RyaW5naWZ5IiwiY29tcGlsZSIsInRyZWUiLCJyZXN1bHRzIiwiZ3JhcGhfbGF5b3V0IiwidHJhbnNpdGlvbiIsInN0YXJ0X3N0YXRlcyIsImVuZF9zdGF0ZXMiLCJtYWNoaW5lX25hbWUiLCJtYWNoaW5lX3ZlcnNpb24iLCJ0ciIsIm9uZU9ubHlLZXkiLCJsZW5ndGgiLCJhc3NlbWJsZWRfdHJhbnNpdGlvbnMiLCJyZXN1bHRfY2ZnIiwidHJhbnNpdGlvbnMiLCJsYXlvdXQiLCJtYWtlIiwicGxhbiIsIk1hY2hpbmUiLCJjb21wbGV0ZSIsIl9zdGF0ZSIsIl9zdGF0ZXMiLCJNYXAiLCJfZWRnZXMiLCJfZWRnZV9tYXAiLCJfbmFtZWRfdHJhbnNpdGlvbnMiLCJfYWN0aW9ucyIsIl9yZXZlcnNlX2FjdGlvbnMiLCJfcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyIsIl9sYXlvdXQiLCJ1bmRlZmluZWQiLCJjdXJzb3JfZnJvbSIsImdldCIsIm5hbWUiLCJoYXMiLCJfbmV3X3N0YXRlIiwiY3Vyc29yX3RvIiwidGhpc0VkZ2VJZCIsInNldCIsImZyb21fbWFwcGluZyIsImFjdGlvbk1hcCIsInJBY3Rpb25NYXAiLCJzdGF0ZV9jb25maWciLCJ3aGljaFN0YXRlIiwic3RhdGVfaXNfdGVybWluYWwiLCJzdGF0ZV9pc19jb21wbGV0ZSIsInN0YXRlX2lzX2ZpbmFsIiwic3RhdGUiLCJpbnRlcm5hbF9zdGF0ZV9pbXBsX3ZlcnNpb24iLCJhY3Rpb25zIiwiZWRnZV9tYXAiLCJuYW1lZF90cmFuc2l0aW9ucyIsInJldmVyc2VfYWN0aW9ucyIsInN0YXRlcyIsImtleXMiLCJlbWciLCJpZCIsImdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzIiwiZW50cmFuY2VzIiwibGlzdF9lbnRyYW5jZXMiLCJleGl0cyIsImxpc3RfZXhpdHMiLCJ3c3RhdGUiLCJ3c3RhdGVfdG8iLCJ3dGYiLCJ3cyIsImxvb2t1cF90cmFuc2l0aW9uX2ZvciIsImZpbHRlciIsIkJvb2xlYW4iLCJzZWxlY3RlZCIsInByb2JhYmxlX2V4aXRzX2ZvciIsIm4iLCJzdGF0ZV93YXMiLCJwcm9iYWJpbGlzdGljX3RyYW5zaXRpb24iLCJwcm9iYWJpbGlzdGljX3dhbGsiLCJyYV9iYXNlIiwidmFsdWVzIiwiZWRnZUlkIiwibyIsImZpbHRlcmVkIiwic29tZSIsIngiLCJpc191bmVudGVyYWJsZSIsIm5ld0RhdGEiLCJ2YWxpZF9hY3Rpb24iLCJlZGdlIiwiY3VycmVudF9hY3Rpb25fZWRnZV9mb3IiLCJuZXdTdGF0ZSIsInZhbGlkX3RyYW5zaXRpb24iLCJ2YWxpZF9mb3JjZV90cmFuc2l0aW9uIiwiYWN0aW9uX2Jhc2UiLCJpZHgiLCJjdXJyZW50X2FjdGlvbl9mb3IiLCJfbmV3RGF0YSIsInRyYW5zaXRpb25fZm9yIiwic20iLCJ0ZW1wbGF0ZV9zdHJpbmdzIiwicmVkdWNlIiwic2VxIiwid2VpZ2h0ZWRfcmFuZF9zZWxlY3QiLCJoaXN0b2dyYXBoIiwid2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCIsIndlaWdodGVkX2hpc3RvX2tleSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBcUJBOzs7Ozs7QUFwQkE7O0FBc0JBLElBQU1BLFFBQWdEQyxRQUFRLGVBQVIsRUFBeUJELEtBQS9FLEMsQ0FBdUY7O0FBRXZGLElBQU1FLFVBQWlCLElBQXZCLEMsQ0FBNkI7OztBQU03QixTQUFTQyxlQUFULENBQXlCQyxLQUF6QixFQUFpRTs7QUFFL0QsVUFBU0MsT0FBT0QsS0FBUCxDQUFUOztBQUVFLFNBQUssSUFBTCxDQUFhLEtBQUssSUFBTCxDQUFjLEtBQUssSUFBTDtBQUN6QixhQUFPLE9BQVA7O0FBRUYsU0FBSyxJQUFMLENBQWEsS0FBSyxJQUFMLENBQWMsS0FBSyxJQUFMO0FBQ3pCLGFBQU8sTUFBUDs7QUFFRixTQUFLLEtBQUwsQ0FBYSxLQUFLLE1BQUwsQ0FBYyxLQUFLLE1BQUw7QUFDM0IsU0FBSyxLQUFMLENBQWEsS0FBSyxNQUFMLENBQWMsS0FBSyxNQUFMO0FBQzNCLFNBQUssS0FBTCxDQUFhLEtBQUssTUFBTCxDQUFjLEtBQUssTUFBTDtBQUN6QixhQUFPLE1BQVA7O0FBRUY7QUFDRSxZQUFNLElBQUlFLEtBQUosMENBQWlERixLQUFqRCxDQUFOOztBQWRKO0FBa0JEOztBQU1ELFNBQVNHLGVBQVQsQ0FBeUJILEtBQXpCLEVBQTREOztBQUUxRCxVQUFTQyxPQUFPRCxLQUFQLENBQVQ7O0FBRUUsU0FBSyxJQUFMLENBQVksS0FBSyxJQUFMLENBQWEsS0FBSyxJQUFMO0FBQ3ZCLGFBQU8sTUFBUDs7QUFFRixTQUFLLElBQUwsQ0FBWSxLQUFLLEtBQUwsQ0FBYSxLQUFLLE1BQUwsQ0FBYyxLQUFLLE1BQUw7QUFDckMsYUFBTyxPQUFQOztBQUVGLFNBQUssSUFBTCxDQUFZLEtBQUssS0FBTCxDQUFhLEtBQUssTUFBTCxD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TUMsaUJBQTZDLEtBQUs1QixxQkFBTCxDQUEyQixLQUFLbkIsS0FBTCxFQUEzQixFQUF5Q3dDLFFBQXpDLENBQW5EOztBQUVBLFVBQUksQ0FBRU8sY0FBTixFQUFnQztBQUFFLGVBQU8sS0FBUDtBQUFlO0FBQ2pELFVBQUlBLGVBQWV0SCxXQUFuQixFQUFnQztBQUFFLGVBQU8sS0FBUDtBQUFlOztBQUVqRCxhQUFPLElBQVA7QUFFRDs7OzJDQUVzQitHLFEsRUFBZ0JNLFEsRUFBMkI7QUFBRztBQUNuRTtBQUNBO0FBQ0E7QUFDQSxhQUFRLEtBQUszQixxQkFBTCxDQUEyQixLQUFLbkIsS0FBTCxFQUEzQixFQUF5Q3dDLFFBQXpDLE1BQXVEekQsU0FBL0Q7QUFDRDs7Ozs7O0FBU0gsU0FBU2lFLEVBQVQsQ0FBc0JDLGdCQUF0QixDQUF1RCxpQkFBdkQsRUFBOEY7QUFBQTs7O0FBRTFGO0FBQ0E7QUFDQTtBQUNBOztBQUVBLFNBQU8sSUFBSTlFLE9BQUosQ0FBWUYsS0FBS2dGLGlCQUFpQkMsTUFBakI7O0FBRXRCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFlBQUMxSSxHQUFELEVBQU1tQyxHQUFOLEVBQVdpRyxHQUFYO0FBQUEsZ0JBQStCcEksR0FBL0IsR0FBcUMsV0FBVW9JLEdBQVYsQ0FBckMsR0FBc0RqRyxHQUF0RDtBQUFBLEdBUHNCLENBT3VDO0FBQzdEO0FBQ0E7O0FBVHNCLEdBQUwsQ0FBWixDQUFQO0FBYUg7O1FBUUMzQyxPLEdBQUFBLE87UUFFQW1FLE8sR0FBQUEsTztRQUVBRixJLEdBQUFBLEk7UUFDRW5FLEssR0FBQUEsSztRQUNBbUQsTyxHQUFBQSxPO1FBRUYrRixFLEdBQUFBLEU7UUFFQS9JLGUsR0FBQUEsZTtRQUNBSSxlLEdBQUFBLGU7UUFDQUMsZ0IsR0FBQUEsZ0I7UUFHQTZJLEc7UUFBS0Msb0I7UUFBc0JDLFU7UUFBWUMsc0I7UUFBd0JDLGtCIiwiZmlsZSI6Impzc20uanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8vIHdoYXJnYXJibCBsb3RzIG9mIHRoZXNlIHJldHVybiBhcnJheXMgY291bGQvc2hvdWxkIGJlIHNldHNcblxuLy8gQGZsb3dcblxuaW1wb3J0IHR5cGUge1xuXG4gIEpzc21HZW5lcmljU3RhdGUsIEpzc21HZW5lcmljQ29uZmlnLFxuICBKc3NtVHJhbnNpdGlvbiwgSnNzbVRyYW5zaXRpb25MaXN0LFxuICBKc3NtTWFjaGluZUludGVybmFsU3RhdGUsXG4gIEpzc21QYXJzZVRyZWUsXG4gIEpzc21Db21waWxlU2UsIEpzc21Db21waWxlU2VTdGFydCwgSnNzbUNvbXBpbGVSdWxlLFxuICBKc3NtQXJyb3csIEpzc21BcnJvd0RpcmVjdGlvbiwgSnNzbUFycm93S2luZCxcbiAgSnNzbUxheW91dFxuXG59IGZyb20gJy4vanNzbS10eXBlcyc7XG5cblxuXG5cblxuaW1wb3J0IHsgc2VxLCB3ZWlnaHRlZF9yYW5kX3NlbGVjdCwgd2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCwgaGlzdG9ncmFwaCwgd2VpZ2h0ZWRfaGlzdG9fa2V5IH0gZnJvbSAnLi9qc3NtLXV0aWwuanMnO1xuXG5jb25zdCBwYXJzZSA6IDxOVCwgRFQ+KHN0cmluZykgPT4gSnNzbVBhcnNlVHJlZTxOVD4gPSByZXF1aXJlKCcuL2pzc20tZG90LmpzJykucGFyc2U7ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXMgLy8gdG9kbyB3aGFyZ2FyYmwgcmVtb3ZlIGFueVxuXG5jb25zdCB2ZXJzaW9uIDogbnVsbCA9IG51bGw7IC8vIHJlcGxhY2VkIGZyb20gcGFja2FnZS5qcyBpbiBidWlsZFxuXG5cblxuXG5cbmZ1bmN0aW9uIGFycm93X2RpcmVjdGlvbihhcnJvdyA6IEpzc21BcnJvdykgOiBKc3NtQXJyb3dEaXJlY3Rpb24ge1xuXG4gIHN3aXRjaCAoIFN0cmluZyhhcnJvdykgKSB7XG5cbiAgICBjYXNlICctPicgOiAgY2FzZSAnPT4nICA6ICBjYXNlICd+PicgIDpcbiAgICAgIHJldHVybiAncmlnaHQnO1xuXG4gICAgY2FzZSAnPC0nIDogIGNhc2UgJzw9JyAgOiAgY2FzZSAnPH4nICA6XG4gICAgICByZXR1cm4gJ2xlZnQnO1xuXG4gICAgY2FzZSAnPC0+JzogIGNhc2UgJzwtPT4nOiAgY2FzZSAnPC1+Pic6XG4gICAgY2FzZSAnPD0+JzogIGNhc2UgJzw9LT4nOiAgY2FzZSAnPD1+Pic6XG4gICAgY2FzZSAnPH4+JzogIGNhc2UgJzx+LT4nOiAgY2FzZSAnPH49Pic6XG4gICAgICByZXR1cm4gJ2JvdGgnO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXJyb3dfZGlyZWN0aW9uOiB1bmtub3duIGFycm93IHR5cGUgJHthcnJvd31gKTtcblxuICB9XG5cbn1cblxuXG5cblxuXG5mdW5jdGlvbiBhcnJvd19sZWZ0X2tpbmQoYXJyb3cgOiBKc3NtQXJyb3cpIDogSnNzbUFycm93S2luZCB7XG5cbiAgc3dpdGNoICggU3RyaW5nKGFycm93KSApIHtcblxuICAgIGNhc2UgJy0+JzogIGNhc2UgJz0+JyA6ICBjYXNlICd+Pic6XG4gICAgICByZXR1cm4gJ25vbmUnO1xuXG4gICAgY2FzZSAnPC0nOiAgY2FzZSAnPC0+JzogIGNhc2UgJzwtPT4nOiAgY2FzZSAnPC1+Pic6XG4gICAgICByZXR1cm4gJ2xlZ2FsJztcblxuICAgIGNhc2UgJzw9JzogIGNhc2UgJzw9Pic6ICBjYXNlICc8PS0+JzogIGNhc2UgJzw9fj4nOlxuICAgICAgcmV0dXJuICdtYWluJztcblxuICAgIGNhc2UgJzx+JzogIGNhc2UgJzx+Pic6ICBjYXNlICc8fi0+JzogIGNhc2UgJzx+PT4nOlxuICAgICAgcmV0dXJuICdmb3JjZWQnO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXJyb3dfZGlyZWN0aW9uOiB1bmtub3duIGFycm93IHR5cGUgJHthcnJvd31gKTtcblxuICB9XG5cbn1cblxuXG5cblxuXG5mdW5jdGlvbiBhcnJvd19yaWdodF9raW5kKGFycm93IDogSnNzbUFycm93KSA6IEpzc21BcnJvd0tpbmQge1xuXG4gIHN3aXRjaCAoIFN0cmluZyhhcnJvdykgKSB7XG5cbiAgICBjYXNlICc8LSc6ICBjYXNlICc8PScgOiAgY2FzZSAnPH4nOlxuICAgICAgcmV0dXJuICdub25lJztcblxuICAgIGNhc2UgJy0+JzogIGNhc2UgJzwtPic6ICBjYXNlICc8PS0+JzogIGNhc2UgJzx+LT4nOlxuICAgICAgcmV0dXJuICdsZWdhbCc7XG5cbiAgICBjYXNlICc9Pic6ICBjYXNlICc8PT4nOiAgY2FzZSAnPC09Pic6ICBjYXNlICc8fj0+JzpcbiAgICAgIHJldHVybiAnbWFpbic7XG5cbiAgICBjYXNlICd+Pic6ICBjYXNlICc8fj4nOiAgY2FzZSAnPC1+Pic6ICBjYXNlICc8PX4+JzpcbiAgICAgIHJldHVybiAnZm9yY2VkJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGFycm93X2RpcmVjdGlvbjogdW5rbm93biBhcnJvdyB0eXBlICR7YXJyb3d9YCk7XG5cbiAgfVxuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcDxtTlQsIG1EVD4oXG4gICAgICAgICAgICAgYWNjICAgICA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPixcbiAgICAgICAgICAgICBmcm9tICAgIDogbU5ULFxuICAgICAgICAgICAgIHRvICAgICAgOiBtTlQsXG4gICAgICAgICAgICAgdGhpc19zZSA6IEpzc21Db21waWxlU2U8bU5UPixcbiAgICAgICAgICAgICBuZXh0X3NlIDogSnNzbUNvbXBpbGVTZTxtTlQ+XG4gICAgICAgICApIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHsgLy8gdG9kbyBmbG93IGRlc2NyaWJlIHRoZSBwYXJzZXIgcmVwcmVzZW50YXRpb24gb2YgYSB0cmFuc2l0aW9uIHN0ZXAgZXh0ZW5zaW9uXG5cbiAgY29uc3QgZWRnZXMgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBbXTtcblxuICBjb25zdCB1RnJvbSA6IEFycmF5PCBtTlQgPiA9IChBcnJheS5pc0FycmF5KGZyb20pPyBmcm9tIDogW2Zyb21dKSxcbiAgICAgICAgdVRvICAgOiBBcnJheTwgbU5UID4gPSAoQXJyYXkuaXNBcnJheSh0byk/ICAgdG8gICA6IFt0b10gICk7XG5cbiAgdUZyb20ubWFwKCAoZjptTlQpID0+IHtcbiAgICB1VG8ubWFwKCAodDptTlQpID0+IHtcblxuICAgICAgY29uc3QgcmsgOiBKc3NtQXJyb3dLaW5kID0gYXJyb3dfcmlnaHRfa2luZCh0aGlzX3NlLmtpbmQpLFxuICAgICAgICAgICAgbGsgOiBKc3NtQXJyb3dLaW5kID0gYXJyb3dfbGVmdF9raW5kKHRoaXNfc2Uua2luZCk7XG5cblxuICAgICAgY29uc3QgcmlnaHQgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB7XG4gICAgICAgIGZyb20gICAgICAgIDogZixcbiAgICAgICAgdG8gICAgICAgICAgOiB0LFxuICAgICAgICBraW5kICAgICAgICA6IHJrLFxuICAgICAgICBmb3JjZWRfb25seSA6IHJrID09PSAnZm9yY2VkJyxcbiAgICAgICAgbWFpbl9wYXRoICAgOiByayA9PT0gJ21haW4nXG4gICAgICB9O1xuXG4gICAgICBpZiAodGhpc19zZS5yX2FjdGlvbikgICAgICB7IHJpZ2h0LmFjdGlvbiAgICAgID0gdGhpc19zZS5yX2FjdGlvbjsgICAgICB9XG4gICAgICBpZiAodGhpc19zZS5yX3Byb2JhYmlsaXR5KSB7IHJpZ2h0LnByb2JhYmlsaXR5ID0gdGhpc19zZS5yX3Byb2JhYmlsaXR5OyB9XG4gICAgICBpZiAocmlnaHQua2luZCAhPT0gJ25vbmUnKSB7IGVkZ2VzLnB1c2gocmlnaHQpOyB9XG5cblxuICAgICAgY29uc3QgbGVmdCA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHtcbiAgICAgICAgZnJvbSAgICAgICAgOiB0LFxuICAgICAgICB0byAgICAgICAgICA6IGYsXG4gICAgICAgIGtpbmQgICAgICAgIDogbGssXG4gICAgICAgIGZvcmNlZF9vbmx5IDogbGsgPT09ICdmb3JjZWQnLFxuICAgICAgICBtYWluX3BhdGggICA6IGxrID09PSAnbWFpbidcbiAgICAgIH07XG5cbiAgICAgIGlmICh0aGlzX3NlLmxfYWN0aW9uKSAgICAgIHsgbGVmdC5hY3Rpb24gICAgICA9IHRoaXNfc2UubF9hY3Rpb247ICAgICAgfVxuICAgICAgaWYgKHRoaXNfc2UubF9wcm9iYWJpbGl0eSkgeyBsZWZ0LnByb2JhYmlsaXR5ID0gdGhpc19zZS5sX3Byb2JhYmlsaXR5OyB9XG4gICAgICBpZiAobGVmdC5raW5kICE9PSAnbm9uZScpICB7IGVkZ2VzLnB1c2gobGVmdCk7IH1cblxuICAgIH0pO1xuICB9KTtcblxuICBjb25zdCBuZXdfYWNjIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+ID0gYWNjLmNvbmNhdChlZGdlcyk7XG5cbiAgaWYgKG5leHRfc2UpIHtcbiAgICByZXR1cm4gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcChuZXdfYWNjLCB0bywgbmV4dF9zZS50bywgbmV4dF9zZSwgbmV4dF9zZS5zZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ld19hY2M7XG4gIH1cblxufVxuXG5cblxuZnVuY3Rpb24gY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uPG1OVD4ocnVsZSA6IEpzc21Db21waWxlU2VTdGFydDxtTlQ+KSA6IG1peGVkIHsgLy8gdG9kbyBmbG93IGRlc2NyaWJlIHRoZSBwYXJzZXIgcmVwcmVzZW50YXRpb24gb2YgYSB0cmFuc2l0aW9uXG4gIHJldHVybiBjb21waWxlX3J1bGVfdHJhbnNpdGlvbl9zdGVwKFtdLCBydWxlLmZyb20sIHJ1bGUuc2UudG8sIHJ1bGUuc2UsIHJ1bGUuc2Uuc2UpO1xufVxuXG5cblxuZnVuY3Rpb24gY29tcGlsZV9ydWxlX2hhbmRsZXI8bU5UPihydWxlIDogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pIDogSnNzbUNvbXBpbGVSdWxlIHsgLy8gdG9kbyBmbG93IGRlc2NyaWJlIHRoZSBvdXRwdXQgb2YgdGhlIHBhcnNlclxuXG4gIGlmIChydWxlLmtleSA9PT0gJ3RyYW5zaXRpb24nKSB7IHJldHVybiB7IGFnZ19hczogJ3RyYW5zaXRpb24nLCB2YWw6IGNvbXBpbGVfcnVsZV9oYW5kbGVfdHJhbnNpdGlvbihydWxlKSB9OyB9XG5cbiAgY29uc3QgdGF1dG9sb2dpZXMgOiBBcnJheTxzdHJpbmc+ID0gW1xuICAgICdncmFwaF9sYXlvdXQnLCAnc3RhcnRfc3RhdGVzJywgJ2VuZF9zdGF0ZXMnLCAnbWFjaGluZV9uYW1lJywgJ21hY2hpbmVfdmVyc2lvbicsXG4gICAgJ21hY2hpbmVfY29tbWVudCcsICdtYWNoaW5lX2F1dGhvcicsICdtYWNoaW5lX2NvbnRyaWJ1dG9yJywgJ21hY2hpbmVfZGVmaW5pdGlvbicsXG4gICAgJ21hY2hpbmVfcmVmZXJlbmNlJywgJ21hY2hpbmVfbGljZW5zZScsICdmc2xfdmVyc2lvbidcbiAgXTtcblxuICBpZiAodGF1dG9sb2dpZXMuaW5jbHVkZXMocnVsZS5rZXkpKSB7XG4gICAgcmV0dXJuIHsgYWdnX2FzOiBydWxlLmtleSwgdmFsOiBydWxlLnZhbHVlIH07XG4gIH1cblxuICB0aHJvdyBuZXcgRXJyb3IoYGNvbXBpbGVfcnVsZV9oYW5kbGVyOiBVbmtub3duIHJ1bGU6ICR7SlNPTi5zdHJpbmdpZnkocnVsZSl9YCk7XG5cbn1cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGU8bU5ULCBtRFQ+KHRyZWUgOiBKc3NtUGFyc2VUcmVlPG1OVD4pIDogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+IHsgIC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgb3V0cHV0IG9mIHRoZSBwYXJzZXJcblxuICBjb25zdCByZXN1bHRzIDoge1xuICAgIGdyYXBoX2xheW91dCAgICA6IEFycmF5PCBKc3NtTGF5b3V0ID4sXG4gICAgdHJhbnNpdGlvbiAgICAgIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+LFxuICAgIHN0YXJ0X3N0YXRlcyAgICA6IEFycmF5PCBtTlQgPixcbiAgICBlbmRfc3RhdGVzICAgICAgOiBBcnJheTwgbU5UID4sXG4gICAgbWFjaGluZV9uYW1lICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfdmVyc2lvbiA6IEFycmF5PCBzdHJpbmcgPiAvLyBzZW12ZXJcbiAgfSA9IHtcbiAgICBncmFwaF9sYXlvdXQgICAgOiBbXSxcbiAgICB0cmFuc2l0aW9uICAgICAgOiBbXSxcbiAgICBzdGFydF9zdGF0ZXMgICAgOiBbXSxcbiAgICBlbmRfc3RhdGVzICAgICAgOiBbXSxcbiAgICBtYWNoaW5lX25hbWUgICAgOiBbXSxcbiAgICBtYWNoaW5lX3ZlcnNpb24gOiBbXVxuICB9O1xuXG4gIHRyZWUubWFwKCAodHIgOiBKc3NtQ29tcGlsZVNlU3RhcnQ8bU5UPikgPT4ge1xuXG4gICAgY29uc3QgcnVsZSAgIDogSnNzbUNvbXBpbGVSdWxlID0gY29tcGlsZV9ydWxlX2hhbmRsZXIodHIpLFxuICAgICAgICAgIGFnZ19hcyA6IHN0cmluZyAgICAgICAgICA9IHJ1bGUuYWdnX2FzLFxuICAgICAgICAgIHZhbCAgICA6IG1peGVkICAgICAgICAgICA9IHJ1bGUudmFsOyAgICAgICAgICAgICAgICAgIC8vIHRvZG8gYmV0dGVyIHR5cGVzXG5cbiAgICByZXN1bHRzW2FnZ19hc10gPSByZXN1bHRzW2FnZ19hc10uY29uY2F0KHZhbCk7XG5cbiAgfSk7XG5cbiAgWydncmFwaF9sYXlvdXQnLCAnbWFjaGluZV9uYW1lJywgJ21hY2hpbmVfdmVyc2lvbiddLm1hcCggKG9uZU9ubHlLZXkgOiBzdHJpbmcpID0+IHtcbiAgICBpZiAocmVzdWx0c1tvbmVPbmx5S2V5XS5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1heSBvbmx5IGhhdmUgb25lICR7b25lT25seUtleX0gc3RhdGVtZW50IG1heGltdW06ICR7SlNPTi5zdHJpbmdpZnkocmVzdWx0c1tvbmVPbmx5S2V5XSl9YCk7XG4gICAgfVxuICB9KTtcblxuICBjb25zdCBhc3NlbWJsZWRfdHJhbnNpdGlvbnMgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBbXS5jb25jYXQoLi4uIHJlc3VsdHNbJ3RyYW5zaXRpb24nXSk7XG5cbiAgY29uc3QgcmVzdWx0X2NmZyA6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPiA9IHtcbi8vIHdoYXJnYXJibCBzaG91bGQgYmUgICAgaW5pdGlhbF9zdGF0ZSA6IHJlc3VsdHMuaW5pdGlhbF9zdGF0ZVswXSxcbiAgICBzdGFydF9zdGF0ZXMgOiByZXN1bHRzLnN0YXJ0X3N0YXRlcy5sZW5ndGg/IHJlc3VsdHMuc3RhcnRfc3RhdGVzIDogW2Fzc2VtYmxlZF90cmFuc2l0aW9uc1swXS5mcm9tXSxcbiAgICB0cmFuc2l0aW9ucyAgOiBhc3NlbWJsZWRfdHJhbnNpdGlvbnNcbiAgfTtcblxuICBpZiAocmVzdWx0cy5ncmFwaF9sYXlvdXQubGVuZ3RoKSB7IHJlc3VsdF9jZmcubGF5b3V0ID0gcmVzdWx0cy5ncmFwaF9sYXlvdXRbMF07IH1cblxuICByZXR1cm4gcmVzdWx0X2NmZztcblxufVxuXG5cblxuZnVuY3Rpb24gbWFrZTxtTlQsIG1EVD4ocGxhbiA6IHN0cmluZykgOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4ge1xuICByZXR1cm4gY29tcGlsZShwYXJzZShwbGFuKSk7XG59XG5cblxuXG5cblxuY2xhc3MgTWFjaGluZTxtTlQsIG1EVD4ge1xuXG5cbiAgX3N0YXRlICAgICAgICAgICAgICAgICAgOiBtTlQ7XG4gIF9zdGF0ZXMgICAgICAgICAgICAgICAgIDogTWFwPG1OVCwgSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+PjtcbiAgX2VkZ2VzICAgICAgICAgICAgICAgICAgOiBBcnJheTxKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4+O1xuICBfZWRnZV9tYXAgICAgICAgICAgICAgICA6IE1hcDxtTlQsIE1hcDxtTlQsIG51bWJlcj4+O1xuICBfbmFtZWRfdHJhbnNpdGlvbnMgICAgICA6IE1hcDxtTlQsIG51bWJlcj47XG4gIF9hY3Rpb25zICAgICAgICAgICAgICAgIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG4gIF9yZXZlcnNlX2FjdGlvbnMgICAgICAgIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG4gIF9yZXZlcnNlX2FjdGlvbl90YXJnZXRzIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG5cbiAgX2xheW91dCAgICAgICAgICAgICAgICAgOiBKc3NtTGF5b3V0O1xuXG4gIC8vIHdoYXJnYXJibCB0aGlzIGJhZGx5IG5lZWRzIHRvIGJlIGJyb2tlbiB1cCwgbW9ub2xpdGggbWFzdGVyXG4gIGNvbnN0cnVjdG9yKHsgc3RhcnRfc3RhdGVzLCBjb21wbGV0ZT1bXSwgdHJhbnNpdGlvbnMsIGxheW91dCA9ICdkb3QnIH0gOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4pIHtcblxuICAgIHRoaXMuX3N0YXRlICAgICAgICAgICAgICAgICAgPSBzdGFydF9zdGF0ZXNbMF07XG4gICAgdGhpcy5fc3RhdGVzICAgICAgICAgICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9lZGdlcyAgICAgICAgICAgICAgICAgID0gW107XG4gICAgdGhpcy5fZWRnZV9tYXAgICAgICAgICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucyAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX2FjdGlvbnMgICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25zICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzID0gbmV3IE1hcCgpOyAgLy8gdG9kb1xuXG4gICAgdGhpcy5fbGF5b3V0ICAgICAgICAgICAgICAgICA9IGxheW91dDtcblxuICAgIHRyYW5zaXRpb25zLm1hcCggKHRyOkpzc21UcmFuc2l0aW9uPG1OVCwgbURUPikgPT4ge1xuXG4gICAgICBpZiAodHIuZnJvbSA9PT0gdW5kZWZpbmVkKSB7IHRocm93IG5ldyBFcnJvcihgdHJhbnNpdGlvbiBtdXN0IGRlZmluZSAnZnJvbSc6ICR7SlNPTi5zdHJpbmdpZnkodHIpfWApOyB9XG4gICAgICBpZiAodHIudG8gICA9PT0gdW5kZWZpbmVkKSB7IHRocm93IG5ldyBFcnJvcihgdHJhbnNpdGlvbiBtdXN0IGRlZmluZSAndG8nOiAkeyAgSlNPTi5zdHJpbmdpZnkodHIpfWApOyB9XG5cbiAgICAgIC8vIGdldCB0aGUgY3Vyc29ycy4gIHdoYXQgYSBtZXNzXG4gICAgICBjb25zdCBjdXJzb3JfZnJvbSA6IEpzc21HZW5lcmljU3RhdGU8bU5UPlxuICAgICAgICAgID0gdGhpcy5fc3RhdGVzLmdldCh0ci5mcm9tKVxuICAgICAgICAgfHwgeyBuYW1lOiB0ci5mcm9tLCBmcm9tOiBbXSwgdG86IFtdLCBjb21wbGV0ZTogY29tcGxldGUuaW5jbHVkZXModHIuZnJvbSkgfTtcblxuICAgICAgaWYgKCEodGhpcy5fc3RhdGVzLmhhcyh0ci5mcm9tKSkpIHtcbiAgICAgICAgdGhpcy5fbmV3X3N0YXRlKGN1cnNvcl9mcm9tKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY3Vyc29yX3RvIDogSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+XG4gICAgICAgICAgPSB0aGlzLl9zdGF0ZXMuZ2V0KHRyLnRvKVxuICAgICAgICAgfHwge25hbWU6IHRyLnRvLCBmcm9tOiBbXSwgdG86IFtdLCBjb21wbGV0ZTogY29tcGxldGUuaW5jbHVkZXModHIudG8pIH07XG5cbiAgICAgIGlmICghKHRoaXMuX3N0YXRlcy5oYXModHIudG8pKSkge1xuICAgICAgICB0aGlzLl9uZXdfc3RhdGUoY3Vyc29yX3RvKTtcbiAgICAgIH1cblxuICAgICAgLy8gZ3VhcmQgYWdhaW5zdCBleGlzdGluZyBjb25uZWN0aW9ucyBiZWluZyByZS1hZGRlZFxuICAgICAgaWYgKGN1cnNvcl9mcm9tLnRvLmluY2x1ZGVzKHRyLnRvKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGFscmVhZHkgaGFzICR7SlNPTi5zdHJpbmdpZnkodHIuZnJvbSl9IHRvICR7SlNPTi5zdHJpbmdpZnkodHIudG8pfWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3Vyc29yX2Zyb20udG8ucHVzaCh0ci50byk7XG4gICAgICAgIGN1cnNvcl90by5mcm9tLnB1c2godHIuZnJvbSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGFkZCB0aGUgZWRnZTsgbm90ZSBpdHMgaWRcbiAgICAgIHRoaXMuX2VkZ2VzLnB1c2godHIpO1xuICAgICAgY29uc3QgdGhpc0VkZ2VJZCA6IG51bWJlciA9IHRoaXMuX2VkZ2VzLmxlbmd0aCAtIDE7XG5cbiAgICAgIC8vIGd1YXJkIGFnYWluc3QgcmVwZWF0aW5nIGEgdHJhbnNpdGlvbiBuYW1lXG4gICAgICBpZiAodHIubmFtZSkge1xuICAgICAgICBpZiAodGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMuaGFzKHRyLm5hbWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBuYW1lZCB0cmFuc2l0aW9uIFwiJHtKU09OLnN0cmluZ2lmeSh0ci5uYW1lKX1cIiBhbHJlYWR5IGNyZWF0ZWRgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucy5zZXQodHIubmFtZSwgdGhpc0VkZ2VJZCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gc2V0IHVwIHRoZSBtYXBwaW5nLCBzbyB0aGF0IGVkZ2VzIGNhbiBiZSBsb29rZWQgdXAgYnkgZW5kcG9pbnQgcGFpcnNcbiAgICAgIGNvbnN0IGZyb21fbWFwcGluZyA6IE1hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9lZGdlX21hcC5nZXQodHIuZnJvbSkgfHwgbmV3IE1hcCgpO1xuICAgICAgaWYgKCEodGhpcy5fZWRnZV9tYXAuaGFzKHRyLmZyb20pKSkge1xuICAgICAgICB0aGlzLl9lZGdlX21hcC5zZXQodHIuZnJvbSwgZnJvbV9tYXBwaW5nKTtcbiAgICAgIH1cblxuLy8gICAgY29uc3QgdG9fbWFwcGluZyA9IGZyb21fbWFwcGluZy5nZXQodHIudG8pO1xuICAgICAgZnJvbV9tYXBwaW5nLnNldCh0ci50bywgdGhpc0VkZ2VJZCk7IC8vIGFscmVhZHkgY2hlY2tlZCB0aGF0IHRoaXMgbWFwcGluZyBkb2Vzbid0IGV4aXN0LCBhYm92ZVxuXG4gICAgICAvLyBzZXQgdXAgdGhlIGFjdGlvbiBtYXBwaW5nLCBzbyB0aGF0IGFjdGlvbnMgY2FuIGJlIGxvb2tlZCB1cCBieSBvcmlnaW5cbiAgICAgIGlmICh0ci5hY3Rpb24pIHtcblxuXG4gICAgICAgIC8vIGZvcndhcmQgbWFwcGluZyBmaXJzdCBieSBhY3Rpb24gbmFtZVxuICAgICAgICBsZXQgYWN0aW9uTWFwIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9hY3Rpb25zLmdldCh0ci5hY3Rpb24pO1xuICAgICAgICBpZiAoIShhY3Rpb25NYXApKSB7XG4gICAgICAgICAgYWN0aW9uTWFwID0gbmV3IE1hcCgpO1xuICAgICAgICAgIHRoaXMuX2FjdGlvbnMuc2V0KHRyLmFjdGlvbiwgYWN0aW9uTWFwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhY3Rpb25NYXAuaGFzKHRyLmZyb20pKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBhY3Rpb24gJHtKU09OLnN0cmluZ2lmeSh0ci5hY3Rpb24pfSBhbHJlYWR5IGF0dGFjaGVkIHRvIG9yaWdpbiAke0pTT04uc3RyaW5naWZ5KHRyLmZyb20pfWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFjdGlvbk1hcC5zZXQodHIuZnJvbSwgdGhpc0VkZ2VJZCk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8vIHJldmVyc2UgbWFwcGluZyBmaXJzdCBieSBzdGF0ZSBvcmlnaW4gbmFtZVxuICAgICAgICBsZXQgckFjdGlvbk1hcCA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh0ci5mcm9tKTtcbiAgICAgICAgaWYgKCEockFjdGlvbk1hcCkpIHtcbiAgICAgICAgICByQWN0aW9uTWFwID0gbmV3IE1hcCgpO1xuICAgICAgICAgIHRoaXMuX3JldmVyc2VfYWN0aW9ucy5zZXQodHIuZnJvbSwgckFjdGlvbk1hcCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBubyBuZWVkIHRvIHRlc3QgZm9yIHJldmVyc2UgbWFwcGluZyBwcmUtcHJlc2VuY2U7XG4gICAgICAgIC8vIGZvcndhcmQgbWFwcGluZyBhbHJlYWR5IGNvdmVycyBjb2xsaXNpb25zXG4gICAgICAgIHJBY3Rpb25NYXAuc2V0KHRyLmFjdGlvbiwgdGhpc0VkZ2VJZCk7XG5cblxuICAgICAgICAvLyByZXZlcnNlIG1hcHBpbmcgZmlyc3QgYnkgc3RhdGUgdGFyZ2V0IG5hbWVcbiAgICAgICAgaWYgKCEodGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5oYXModHIudG8pKSkge1xuICAgICAgICAgIHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuc2V0KHRyLnRvLCBuZXcgTWFwKCkpO1xuICAgICAgICB9XG5cbi8qIHRvZG8gY29tZWJhY2tcbiAgIGZ1bmRhbWVudGFsIHByb2JsZW0gaXMgcm9BY3Rpb25NYXAgbmVlZHMgdG8gYmUgYSBtdWx0aW1hcFxuICAgICAgICBjb25zdCByb0FjdGlvbk1hcCA9IHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuZ2V0KHRyLnRvKTsgIC8vIHdhc3RlZnVsIC0gYWxyZWFkeSBkaWQgaGFzIC0gcmVmYWN0b3JcbiAgICAgICAgaWYgKHJvQWN0aW9uTWFwKSB7XG4gICAgICAgICAgaWYgKHJvQWN0aW9uTWFwLmhhcyh0ci5hY3Rpb24pKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHJvLWFjdGlvbiAke3RyLnRvfSBhbHJlYWR5IGF0dGFjaGVkIHRvIGFjdGlvbiAke3RyLmFjdGlvbn1gKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcm9BY3Rpb25NYXAuc2V0KHRyLmFjdGlvbiwgdGhpc0VkZ2VJZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc2hvdWxkIGJlIGltcG9zc2libGUgLSBmbG93IGRvZXNuXFwndCBrbm93IC5zZXQgcHJlY2VkZXMgLmdldCB5ZXQgYWdhaW4uICBzZXZlcmUgZXJyb3I/Jyk7XG4gICAgICAgIH1cbiovXG4gICAgICB9XG5cbiAgICB9KTtcblxuICB9XG5cbiAgX25ld19zdGF0ZShzdGF0ZV9jb25maWcgOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD4pIDogbU5UIHsgLy8gd2hhcmdhcmJsIGdldCB0aGF0IHN0YXRlX2NvbmZpZyBhbnkgdW5kZXIgY29udHJvbFxuXG4gICAgaWYgKHRoaXMuX3N0YXRlcy5oYXMoc3RhdGVfY29uZmlnLm5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHN0YXRlICR7SlNPTi5zdHJpbmdpZnkoc3RhdGVfY29uZmlnLm5hbWUpfSBhbHJlYWR5IGV4aXN0c2ApO1xuICAgIH1cblxuICAgIHRoaXMuX3N0YXRlcy5zZXQoc3RhdGVfY29uZmlnLm5hbWUsIHN0YXRlX2NvbmZpZyk7XG4gICAgcmV0dXJuIHN0YXRlX2NvbmZpZy5uYW1lO1xuXG4gIH1cblxuXG5cbiAgc3RhdGUoKSA6IG1OVCB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlO1xuICB9XG5cbi8qIHdoYXJnYXJibCB0b2RvIG1ham9yXG4gICB3aGVuIHdlIHJlaW1wbGVtZW50IHRoaXMsIHJlaW50cm9kdWNlIHRoaXMgY2hhbmdlIHRvIHRoZSBpc19maW5hbCBjYWxsXG5cbiAgaXNfY2hhbmdpbmcoKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlOyAvLyB0b2RvIHdoYXJnYXJibFxuICB9XG4qL1xuXG5cbiAgc3RhdGVfaXNfZmluYWwod2hpY2hTdGF0ZSA6IG1OVCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gKCAodGhpcy5zdGF0ZV9pc190ZXJtaW5hbCh3aGljaFN0YXRlKSkgJiYgKHRoaXMuc3RhdGVfaXNfY29tcGxldGUod2hpY2hTdGF0ZSkpICk7XG4gIH1cblxuICBpc19maW5hbCgpIDogYm9vbGVhbiB7XG4vLyAgcmV0dXJuICgoIXRoaXMuaXNfY2hhbmdpbmcoKSkgJiYgdGhpcy5zdGF0ZV9pc19maW5hbCh0aGlzLnN0YXRlKCkpKTtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZV9pc19maW5hbCh0aGlzLnN0YXRlKCkpO1xuICB9XG5cbiAgbGF5b3V0KCkgOiBzdHJpbmcge1xuICAgIHJldHVybiBTdHJpbmcodGhpcy5fbGF5b3V0KTtcbiAgfVxuXG5cblxuICBtYWNoaW5lX3N0YXRlKCkgOiBKc3NtTWFjaGluZUludGVybmFsU3RhdGU8bU5ULCBtRFQ+IHtcblxuICAgIHJldHVybiB7XG4gICAgICBpbnRlcm5hbF9zdGF0ZV9pbXBsX3ZlcnNpb24gOiAxLFxuXG4gICAgICBhY3Rpb25zICAgICAgICAgICAgICAgIDogdGhpcy5fYWN0aW9ucyxcbiAgICAgIGVkZ2VfbWFwICAgICAgICAgICAgICAgOiB0aGlzLl9lZGdlX21hcCxcbiAgICAgIGVkZ2VzICAgICAgICAgICAgICAgICAgOiB0aGlzLl9lZGdlcyxcbiAgICAgIG5hbWVkX3RyYW5zaXRpb25zICAgICAgOiB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucyxcbiAgICAgIHJldmVyc2VfYWN0aW9ucyAgICAgICAgOiB0aGlzLl9yZXZlcnNlX2FjdGlvbnMsXG4vLyAgICByZXZlcnNlX2FjdGlvbl90YXJnZXRzIDogdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyxcbiAgICAgIHN0YXRlICAgICAgICAgICAgICAgICAgOiB0aGlzLl9zdGF0ZSxcbiAgICAgIHN0YXRlcyAgICAgICAgICAgICAgICAgOiB0aGlzLl9zdGF0ZXNcbiAgICB9O1xuXG4gIH1cblxuLypcbiAgbG9hZF9tYWNoaW5lX3N0YXRlKCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7IC8vIHRvZG8gd2hhcmdhcmJsXG4gIH1cbiovXG5cblxuICBzdGF0ZXMoKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uIHRoaXMuX3N0YXRlcy5rZXlzKCldO1xuICB9XG5cbiAgc3RhdGVfZm9yKHdoaWNoU3RhdGUgOiBtTlQpIDogSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+IHtcbiAgICBjb25zdCBzdGF0ZSA6ID9Kc3NtR2VuZXJpY1N0YXRlPG1OVD4gPSB0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmIChzdGF0ZSkgeyByZXR1cm4gc3RhdGU7IH1cbiAgICBlbHNlICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBubyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkoc3RhdGUpfWApOyB9XG4gIH1cblxuXG5cbiAgbGlzdF9lZGdlcygpIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHtcbiAgICByZXR1cm4gdGhpcy5fZWRnZXM7XG4gIH1cblxuICBsaXN0X25hbWVkX3RyYW5zaXRpb25zKCkgOiBNYXA8bU5ULCBudW1iZXI+IHtcbiAgICByZXR1cm4gdGhpcy5fbmFtZWRfdHJhbnNpdGlvbnM7XG4gIH1cblxuICBsaXN0X2FjdGlvbnMoKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uIHRoaXMuX2FjdGlvbnMua2V5cygpXTtcbiAgfVxuXG5cblxuICBnZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyhmcm9tOiBtTlQsIHRvOiBtTlQpIDogP251bWJlciB7XG5cbiAgICBjb25zdCBlbWcgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2VkZ2VfbWFwLmdldChmcm9tKTtcblxuICAgIGlmIChlbWcpIHtcbiAgICAgIHJldHVybiBlbWcuZ2V0KHRvKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgfVxuXG5cblxuICBsb29rdXBfdHJhbnNpdGlvbl9mb3IoZnJvbTogbU5ULCB0bzogbU5UKSA6ID9Kc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4ge1xuICAgIGNvbnN0IGlkIDogP251bWJlciA9IHRoaXMuZ2V0X3RyYW5zaXRpb25fYnlfc3RhdGVfbmFtZXMoZnJvbSwgdG8pO1xuICAgIHJldHVybiAoKGlkID09PSB1bmRlZmluZWQpIHx8IChpZCA9PT0gbnVsbCkpPyB1bmRlZmluZWQgOiB0aGlzLl9lZGdlc1tpZF07XG4gIH1cblxuXG5cbiAgbGlzdF90cmFuc2l0aW9ucyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpKSA6IEpzc21UcmFuc2l0aW9uTGlzdDxtTlQ+IHtcbiAgICByZXR1cm4ge2VudHJhbmNlczogdGhpcy5saXN0X2VudHJhbmNlcyh3aGljaFN0YXRlKSwgZXhpdHM6IHRoaXMubGlzdF9leGl0cyh3aGljaFN0YXRlKX07XG4gIH1cblxuICBsaXN0X2VudHJhbmNlcyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiAodGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKSB8fCB7fSkuZnJvbSB8fCBbXTtcbiAgfVxuXG4gIGxpc3RfZXhpdHMod2hpY2hTdGF0ZSA6IG1OVCA9IHRoaXMuc3RhdGUoKSkgOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gKHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSkgfHwge30pLnRvICAgfHwgW107XG4gIH1cblxuXG5cbiAgcHJvYmFibGVfZXhpdHNfZm9yKHdoaWNoU3RhdGUgOiBtTlQpIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHtcblxuICAgIGNvbnN0IHdzdGF0ZSA6ID9Kc3NtR2VuZXJpY1N0YXRlPG1OVD4gPSB0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICghKHdzdGF0ZSkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9IGluIHByb2JhYmxlX2V4aXRzX2ZvcmApOyB9XG5cbiAgICBjb25zdCB3c3RhdGVfdG8gOiBBcnJheTwgbU5UID4gPSB3c3RhdGUudG8sXG5cbiAgICAgICAgICB3dGYgICAgICAgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID5cbiAgICAgICAgICAgICAgICAgICAgPSB3c3RhdGVfdG9cbiAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoICh3cykgOiA/SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMubG9va3VwX3RyYW5zaXRpb25fZm9yKHRoaXMuc3RhdGUoKSwgd3MpKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKTtcblxuICAgIHJldHVybiB3dGY7XG5cbiAgfVxuXG4gIHByb2JhYmlsaXN0aWNfdHJhbnNpdGlvbigpIDogYm9vbGVhbiB7XG4gICAgY29uc3Qgc2VsZWN0ZWQgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB3ZWlnaHRlZF9yYW5kX3NlbGVjdCh0aGlzLnByb2JhYmxlX2V4aXRzX2Zvcih0aGlzLnN0YXRlKCkpKTtcbiAgICByZXR1cm4gdGhpcy50cmFuc2l0aW9uKCBzZWxlY3RlZC50byApO1xuICB9XG5cbiAgcHJvYmFiaWxpc3RpY193YWxrKG4gOiBudW1iZXIpIDogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuIHNlcShuKVxuICAgICAgICAgIC5tYXAoKCkgOiBtTlQgPT4ge1xuICAgICAgICAgICAgIGNvbnN0IHN0YXRlX3dhcyA6IG1OVCA9IHRoaXMuc3RhdGUoKTtcbiAgICAgICAgICAgICB0aGlzLnByb2JhYmlsaXN0aWNfdHJhbnNpdGlvbigpO1xuICAgICAgICAgICAgIHJldHVybiBzdGF0ZV93YXM7XG4gICAgICAgICAgIH0pXG4gICAgICAgICAgLmNvbmNhdChbdGhpcy5zdGF0ZSgpXSk7XG4gIH1cblxuICBwcm9iYWJpbGlzdGljX2hpc3RvX3dhbGsobiA6IG51bWJlcikgOiBNYXA8bU5ULCBudW1iZXI+IHtcbiAgICByZXR1cm4gaGlzdG9ncmFwaCh0aGlzLnByb2JhYmlsaXN0aWNfd2FsayhuKSk7XG4gIH1cblxuXG5cbiAgYWN0aW9ucyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpICkgOiBBcnJheTxtTlQ+IHtcbiAgICBjb25zdCB3c3RhdGUgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHdzdGF0ZSkgeyByZXR1cm4gWy4uLiB3c3RhdGUua2V5cygpXTsgfVxuICAgIGVsc2UgICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cbiAgfVxuXG4gIGxpc3Rfc3RhdGVzX2hhdmluZ19hY3Rpb24od2hpY2hTdGF0ZSA6IG1OVCkgOiBBcnJheTxtTlQ+IHtcbiAgICBjb25zdCB3c3RhdGUgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICh3c3RhdGUpIHsgcmV0dXJuIFsuLi4gd3N0YXRlLmtleXMoKV07IH1cbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG4gIH1cblxuLy8gY29tZWJhY2tcbi8qXG4gIGxpc3RfZW50cmFuY2VfYWN0aW9ucyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpICkgOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gWy4uLiAodGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5nZXQod2hpY2hTdGF0ZSkgfHwgbmV3IE1hcCgpKS52YWx1ZXMoKV0gLy8gd2FzdGVmdWxcbiAgICAgICAgICAgLm1hcCggKGVkZ2VJZDphbnkpID0+ICh0aGlzLl9lZGdlc1tlZGdlSWRdIDogYW55KSkgLy8gd2hhcmdhcmJsIGJ1cm4gb3V0IGFueVxuICAgICAgICAgICAuZmlsdGVyKCAobzphbnkpID0+IG8udG8gPT09IHdoaWNoU3RhdGUpXG4gICAgICAgICAgIC5tYXAoIGZpbHRlcmVkID0+IGZpbHRlcmVkLmZyb20gKTtcbiAgfVxuKi9cbiAgbGlzdF9leGl0X2FjdGlvbnMod2hpY2hTdGF0ZSA6IG1OVCA9IHRoaXMuc3RhdGUoKSApIDogQXJyYXk8P21OVD4geyAvLyB0aGVzZSBhcmUgbU5ULCBub3QgP21OVFxuICAgIGNvbnN0IHJhX2Jhc2UgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKCEocmFfYmFzZSkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cblxuICAgIHJldHVybiBbLi4uIHJhX2Jhc2UudmFsdWVzKCldXG4gICAgICAgICAgIC5tYXAgICAgKCAoZWRnZUlkOm51bWJlcikgICAgICAgICAgICAgIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMuX2VkZ2VzW2VkZ2VJZF0gICApXG4gICAgICAgICAgIC5maWx0ZXIgKCAobzpKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pIDogYm9vbGVhbiAgICAgICAgICAgICAgICAgID0+IG8uZnJvbSA9PT0gd2hpY2hTdGF0ZSApXG4gICAgICAgICAgIC5tYXAgICAgKCAoZmlsdGVyZWQgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pIDogP21OVCAgICAgICAgICAgID0+IGZpbHRlcmVkLmFjdGlvbiAgICAgICApO1xuICB9XG5cbiAgcHJvYmFibGVfYWN0aW9uX2V4aXRzKHdoaWNoU3RhdGUgOiBtTlQgPSB0aGlzLnN0YXRlKCkgKSA6IEFycmF5PG1peGVkPiB7IC8vIHRoZXNlIGFyZSBtTlRcbiAgICBjb25zdCByYV9iYXNlIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICghKHJhX2Jhc2UpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG5cbiAgICByZXR1cm4gWy4uLiByYV9iYXNlLnZhbHVlcygpXVxuICAgICAgICAgICAubWFwICAgICggKGVkZ2VJZDpudW1iZXIpIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMuX2VkZ2VzW2VkZ2VJZF0gICApXG4gICAgICAgICAgIC5maWx0ZXIgKCAobzpKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pIDogYm9vbGVhbiAgICAgPT4gby5mcm9tID09PSB3aGljaFN0YXRlIClcbiAgICAgICAgICAgLm1hcCAgICAoIChmaWx0ZXJlZCkgOiBtaXhlZCAgICAgICAgICAgICAgICAgICAgICAgICA9PiAoIHsgYWN0aW9uICAgICAgOiBmaWx0ZXJlZC5hY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2JhYmlsaXR5IDogZmlsdGVyZWQucHJvYmFiaWxpdHkgfSApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgfVxuXG5cblxuICBpc191bmVudGVyYWJsZSh3aGljaFN0YXRlIDogbU5UKSA6IGJvb2xlYW4ge1xuICAgIC8vIHdoYXJnYXJibCBzaG91bGQgdGhyb3cgb24gdW5rbm93biBzdGF0ZVxuICAgIHJldHVybiB0aGlzLmxpc3RfZW50cmFuY2VzKHdoaWNoU3RhdGUpLmxlbmd0aCA9PT0gMDtcbiAgfVxuXG4gIGhhc191bmVudGVyYWJsZXMoKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlcygpLnNvbWUoICh4KSA6IGJvb2xlYW4gPT4gdGhpcy5pc191bmVudGVyYWJsZSh4KSk7XG4gIH1cblxuXG5cbiAgaXNfdGVybWluYWwoKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlX2lzX3Rlcm1pbmFsKHRoaXMuc3RhdGUoKSk7XG4gIH1cblxuICBzdGF0ZV9pc190ZXJtaW5hbCh3aGljaFN0YXRlIDogbU5UKSA6IGJvb2xlYW4ge1xuICAgIC8vIHdoYXJnYXJibCBzaG91bGQgdGhyb3cgb24gdW5rbm93biBzdGF0ZVxuICAgIHJldHVybiB0aGlzLmxpc3RfZXhpdHMod2hpY2hTdGF0ZSkubGVuZ3RoID09PSAwO1xuICB9XG5cbiAgaGFzX3Rlcm1pbmFscygpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpIDogYm9vbGVhbiA9PiB0aGlzLnN0YXRlX2lzX3Rlcm1pbmFsKHgpKTtcbiAgfVxuXG5cblxuICBpc19jb21wbGV0ZSgpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVfaXNfY29tcGxldGUodGhpcy5zdGF0ZSgpKTtcbiAgfVxuXG4gIHN0YXRlX2lzX2NvbXBsZXRlKHdoaWNoU3RhdGUgOiBtTlQpIDogYm9vbGVhbiB7XG4gICAgY29uc3Qgd3N0YXRlIDogP0pzc21HZW5lcmljU3RhdGU8bU5UPiA9IHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHdzdGF0ZSkgeyByZXR1cm4gd3N0YXRlLmNvbXBsZXRlOyB9XG4gICAgZWxzZSAgICAgICAgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuICB9XG5cbiAgaGFzX2NvbXBsZXRlcygpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpIDogYm9vbGVhbiA9PiB0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHgpICk7XG4gIH1cblxuXG5cbiAgYWN0aW9uKG5hbWUgOiBtTlQsIG5ld0RhdGE/IDogbURUKSA6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX2FjdGlvbihuYW1lLCBuZXdEYXRhKSkge1xuICAgICAgY29uc3QgZWRnZSA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHRoaXMuY3VycmVudF9hY3Rpb25fZWRnZV9mb3IobmFtZSk7XG4gICAgICB0aGlzLl9zdGF0ZSA9IGVkZ2UudG87XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHRyYW5zaXRpb24obmV3U3RhdGUgOiBtTlQsIG5ld0RhdGE/IDogbURUKSA6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX3RyYW5zaXRpb24obmV3U3RhdGUsIG5ld0RhdGEpKSB7XG4gICAgICB0aGlzLl9zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvLyBjYW4gbGVhdmUgbWFjaGluZSBpbiBpbmNvbnNpc3RlbnQgc3RhdGUuICBnZW5lcmFsbHkgZG8gbm90IHVzZVxuICBmb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlIDogbU5ULCBuZXdEYXRhPyA6IG1EVCkgOiBib29sZWFuIHtcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBpZiAodGhpcy52YWxpZF9mb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlLCBuZXdEYXRhKSkge1xuICAgICAgdGhpcy5fc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cblxuXG4gIGN1cnJlbnRfYWN0aW9uX2ZvcihhY3Rpb24gOiBtTlQpIDogbnVtYmVyIHwgdm9pZCB7XG4gICAgY29uc3QgYWN0aW9uX2Jhc2UgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KGFjdGlvbik7XG4gICAgcmV0dXJuIGFjdGlvbl9iYXNlPyBhY3Rpb25fYmFzZS5nZXQodGhpcy5zdGF0ZSgpKSA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGN1cnJlbnRfYWN0aW9uX2VkZ2VfZm9yKGFjdGlvbiA6IG1OVCkgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4ge1xuICAgIGNvbnN0IGlkeCA6ID9udW1iZXIgPSB0aGlzLmN1cnJlbnRfYWN0aW9uX2ZvcihhY3Rpb24pO1xuICAgIGlmICgoaWR4ID09PSB1bmRlZmluZWQpIHx8IChpZHggPT09IG51bGwpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBhY3Rpb24gJHtKU09OLnN0cmluZ2lmeShhY3Rpb24pfWApOyB9XG4gICAgcmV0dXJuIHRoaXMuX2VkZ2VzW2lkeF07XG4gIH1cblxuICB2YWxpZF9hY3Rpb24oYWN0aW9uIDogbU5ULCBfbmV3RGF0YT8gOiBtRFQpIDogYm9vbGVhbiB7ICAvLyB0b2RvIGNvbWViYWNrIHVuaWdub3JlIG5ld0RhdGFcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50X2FjdGlvbl9mb3IoYWN0aW9uKSAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgdmFsaWRfdHJhbnNpdGlvbihuZXdTdGF0ZSA6IG1OVCwgX25ld0RhdGE/IDogbURUKSA6IGJvb2xlYW4geyAgLy8gdG9kbyBjb21lYmFjayB1bmlnbm9yZSBuZXdEYXRhXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgY29uc3QgdHJhbnNpdGlvbl9mb3IgOiA/SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gdGhpcy5sb29rdXBfdHJhbnNpdGlvbl9mb3IodGhpcy5zdGF0ZSgpLCBuZXdTdGF0ZSk7XG5cbiAgICBpZiAoISh0cmFuc2l0aW9uX2ZvcikpICAgICAgICAgIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgaWYgKHRyYW5zaXRpb25fZm9yLmZvcmNlZF9vbmx5KSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfVxuXG4gIHZhbGlkX2ZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGUgOiBtTlQsIF9uZXdEYXRhPyA6IG1EVCkgOiBib29sZWFuIHsgIC8vIHRvZG8gY29tZWJhY2sgdW5pZ25vcmUgbmV3RGF0YVxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIHJldHVybiAodGhpcy5sb29rdXBfdHJhbnNpdGlvbl9mb3IodGhpcy5zdGF0ZSgpLCBuZXdTdGF0ZSkgIT09IHVuZGVmaW5lZCk7XG4gIH1cblxuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gc208bU5ULCBtRFQ+KHRlbXBsYXRlX3N0cmluZ3MgOiBBcnJheTxzdHJpbmc+IC8qICwgYXJndW1lbnRzICovKSA6IE1hY2hpbmU8bU5ULCBtRFQ+IHtcblxuICAgIC8vIGZvb2BhJHsxfWIkezJ9Y2Agd2lsbCBjb21lIGluIGFzIChbJ2EnLCdiJywnYyddLDEsMilcbiAgICAvLyB0aGlzIGluY2x1ZGVzIHdoZW4gYSBhbmQgYyBhcmUgZW1wdHkgc3RyaW5nc1xuICAgIC8vIHRoZXJlZm9yZSB0ZW1wbGF0ZV9zdHJpbmdzIHdpbGwgYWx3YXlzIGhhdmUgb25lIG1vcmUgZWwgdGhhbiB0ZW1wbGF0ZV9hcmdzXG4gICAgLy8gdGhlcmVmb3JlIG1hcCB0aGUgc21hbGxlciBjb250YWluZXIgYW5kIHRvc3MgdGhlIGxhc3Qgb25lIG9uIG9uIHRoZSB3YXkgb3V0XG5cbiAgICByZXR1cm4gbmV3IE1hY2hpbmUobWFrZSh0ZW1wbGF0ZV9zdHJpbmdzLnJlZHVjZShcblxuICAgICAgLy8gaW4gZ2VuZXJhbCBhdm9pZGluZyBgYXJndW1lbnRzYCBpcyBzbWFydC4gIGhvd2V2ZXIgd2l0aCB0aGUgdGVtcGxhdGVcbiAgICAgIC8vIHN0cmluZyBub3RhdGlvbiwgYXMgZGVzaWduZWQsIGl0J3Mgbm90IHJlYWxseSB3b3J0aCB0aGUgaGFzc2xlXG5cbiAgICAgIC8qIGVzbGludC1kaXNhYmxlIGZwL25vLWFyZ3VtZW50cyAqL1xuICAgICAgLyogZXNsaW50LWRpc2FibGUgcHJlZmVyLXJlc3QtcGFyYW1zICovXG4gICAgICAoYWNjLCB2YWwsIGlkeCkgOiBzdHJpbmcgPT4gYCR7YWNjfSR7YXJndW1lbnRzW2lkeF19JHt2YWx9YCAgLy8gYXJndW1lbnRzWzBdIGlzIG5ldmVyIGxvYWRlZCwgc28gYXJncyBkb2Vzbid0IG5lZWQgdG8gYmUgZ2F0ZWRcbiAgICAgIC8qIGVzbGludC1lbmFibGUgIHByZWZlci1yZXN0LXBhcmFtcyAqL1xuICAgICAgLyogZXNsaW50LWVuYWJsZSAgZnAvbm8tYXJndW1lbnRzICovXG5cbiAgICApKSk7XG5cbn1cblxuXG5cblxuXG5leHBvcnQge1xuXG4gIHZlcnNpb24sXG5cbiAgTWFjaGluZSxcblxuICBtYWtlLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG5cbiAgc20sXG5cbiAgYXJyb3dfZGlyZWN0aW9uLFxuICBhcnJvd19sZWZ0X2tpbmQsXG4gIGFycm93X3JpZ2h0X2tpbmQsXG5cbiAgLy8gdG9kbyB3aGFyZ2FyYmwgdGhlc2Ugc2hvdWxkIGJlIGV4cG9ydGVkIHRvIGEgdXRpbGl0eSBsaWJyYXJ5XG4gIHNlcSwgd2VpZ2h0ZWRfcmFuZF9zZWxlY3QsIGhpc3RvZ3JhcGgsIHdlaWdodGVkX3NhbXBsZV9zZWxlY3QsIHdlaWdodGVkX2hpc3RvX2tleVxuXG59O1xuIl19