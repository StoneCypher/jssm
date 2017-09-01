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

var version = '5.4.0'; // replaced from package.js in build


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

  var tautologies = ['graph_layout', 'start_nodes', 'end_nodes', 'machine_name', 'machine_version'];
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
    start_nodes: [],
    end_nodes: [],
    initial_state: [],
    machine_name: [],
    machine_version: []
  };

  tree.map(function (tr) {

    var rule = compile_rule_handler(tr),
        agg_as = rule.agg_as,
        val = rule.val; // todo better types

    results[agg_as] = results[agg_as].concat(val);
  });

  ['graph_layout', 'initial_state', 'machine_name', 'machine_version'].map(function (oneOnlyKey) {
    if (results[oneOnlyKey].length > 1) {
      throw new Error('May only have one ' + oneOnlyKey + ' statement maximum: ' + JSON.stringify(results[oneOnlyKey]));
    }
  });

  var assembled_transitions = (_ref = []).concat.apply(_ref, _toConsumableArray(results['transition']));

  var result_cfg = {
    // whargarbl should be    initial_state : results.initial_state[0],
    initial_state: results.start_nodes.length ? results.start_nodes[0] : assembled_transitions[0].from,
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

    var initial_state = _ref2.initial_state,
        _ref2$complete = _ref2.complete,
        complete = _ref2$complete === undefined ? [] : _ref2$complete,
        transitions = _ref2.transitions,
        _ref2$layout = _ref2.layout,
        layout = _ref2$layout === undefined ? 'dot' : _ref2$layout;

    _classCallCheck(this, Machine);

    this._state = initial_state;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLmpzIl0sIm5hbWVzIjpbInBhcnNlIiwicmVxdWlyZSIsInZlcnNpb24iLCJhcnJvd19kaXJlY3Rpb24iLCJhcnJvdyIsIlN0cmluZyIsIkVycm9yIiwiYXJyb3dfbGVmdF9raW5kIiwiYXJyb3dfcmlnaHRfa2luZCIsImNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXAiLCJhY2MiLCJmcm9tIiwidG8iLCJ0aGlzX3NlIiwibmV4dF9zZSIsImVkZ2VzIiwidUZyb20iLCJBcnJheSIsImlzQXJyYXkiLCJ1VG8iLCJtYXAiLCJmIiwidCIsInJrIiwia2luZCIsImxrIiwicmlnaHQiLCJmb3JjZWRfb25seSIsIm1haW5fcGF0aCIsInJfYWN0aW9uIiwiYWN0aW9uIiwicl9wcm9iYWJpbGl0eSIsInByb2JhYmlsaXR5IiwicHVzaCIsImxlZnQiLCJsX2FjdGlvbiIsImxfcHJvYmFiaWxpdHkiLCJuZXdfYWNjIiwiY29uY2F0Iiwic2UiLCJjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb24iLCJydWxlIiwiY29tcGlsZV9ydWxlX2hhbmRsZXIiLCJrZXkiLCJhZ2dfYXMiLCJ2YWwiLCJ0YXV0b2xvZ2llcyIsImluY2x1ZGVzIiwidmFsdWUiLCJKU09OIiwic3RyaW5naWZ5IiwiY29tcGlsZSIsInRyZWUiLCJyZXN1bHRzIiwiZ3JhcGhfbGF5b3V0IiwidHJhbnNpdGlvbiIsInN0YXJ0X25vZGVzIiwiZW5kX25vZGVzIiwiaW5pdGlhbF9zdGF0ZSIsIm1hY2hpbmVfbmFtZSIsIm1hY2hpbmVfdmVyc2lvbiIsInRyIiwib25lT25seUtleSIsImxlbmd0aCIsImFzc2VtYmxlZF90cmFuc2l0aW9ucyIsInJlc3VsdF9jZmciLCJ0cmFuc2l0aW9ucyIsImxheW91dCIsIm1ha2UiLCJwbGFuIiwiTWFjaGluZSIsImNvbXBsZXRlIiwiX3N0YXRlIiwiX3N0YXRlcyIsIk1hcCIsIl9lZGdlcyIsIl9lZGdlX21hcCIsIl9uYW1lZF90cmFuc2l0aW9ucyIsIl9hY3Rpb25zIiwiX3JldmVyc2VfYWN0aW9ucyIsIl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzIiwiX2xheW91dCIsInVuZGVmaW5lZCIsImN1cnNvcl9mcm9tIiwiZ2V0IiwibmFtZSIsImhhcyIsIl9uZXdfc3RhdGUiLCJjdXJzb3JfdG8iLCJ0aGlzRWRnZUlkIiwic2V0IiwiZnJvbV9tYXBwaW5nIiwiYWN0aW9uTWFwIiwickFjdGlvbk1hcCIsInN0YXRlX2NvbmZpZyIsIndoaWNoU3RhdGUiLCJzdGF0ZV9pc190ZXJtaW5hbCIsInN0YXRlX2lzX2NvbXBsZXRlIiwic3RhdGVfaXNfZmluYWwiLCJzdGF0ZSIsImludGVybmFsX3N0YXRlX2ltcGxfdmVyc2lvbiIsImFjdGlvbnMiLCJlZGdlX21hcCIsIm5hbWVkX3RyYW5zaXRpb25zIiwicmV2ZXJzZV9hY3Rpb25zIiwic3RhdGVzIiwia2V5cyIsImVtZyIsImlkIiwiZ2V0X3RyYW5zaXRpb25fYnlfc3RhdGVfbmFtZXMiLCJlbnRyYW5jZXMiLCJsaXN0X2VudHJhbmNlcyIsImV4aXRzIiwibGlzdF9leGl0cyIsIndzdGF0ZSIsIndzdGF0ZV90byIsInd0ZiIsIndzIiwibG9va3VwX3RyYW5zaXRpb25fZm9yIiwiZmlsdGVyIiwiQm9vbGVhbiIsInNlbGVjdGVkIiwicHJvYmFibGVfZXhpdHNfZm9yIiwibiIsInN0YXRlX3dhcyIsInByb2JhYmlsaXN0aWNfdHJhbnNpdGlvbiIsInByb2JhYmlsaXN0aWNfd2FsayIsInJhX2Jhc2UiLCJ2YWx1ZXMiLCJlZGdlSWQiLCJvIiwiZmlsdGVyZWQiLCJzb21lIiwieCIsImlzX3VuZW50ZXJhYmxlIiwibmV3RGF0YSIsInZhbGlkX2FjdGlvbiIsImVkZ2UiLCJjdXJyZW50X2FjdGlvbl9lZGdlX2ZvciIsIm5ld1N0YXRlIiwidmFsaWRfdHJhbnNpdGlvbiIsInZhbGlkX2ZvcmNlX3RyYW5zaXRpb24iLCJhY3Rpb25fYmFzZSIsImlkeCIsImN1cnJlbnRfYWN0aW9uX2ZvciIsIl9uZXdEYXRhIiwidHJhbnNpdGlvbl9mb3IiLCJzbSIsInRlbXBsYXRlX3N0cmluZ3MiLCJyZWR1Y2UiLCJzZXEiLCJ3ZWlnaHRlZF9yYW5kX3NlbGVjdCIsImhpc3RvZ3JhcGgiLCJ3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0Iiwid2VpZ2h0ZWRfaGlzdG9fa2V5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFxQkE7Ozs7OztBQXBCQTs7QUFzQkEsSUFBTUEsUUFBZ0RDLFFBQVEsZUFBUixFQUF5QkQsS0FBL0UsQyxDQUF1Rjs7QUFFdkYsSUFBTUUsVUFBaUIsSUFBdkIsQyxDQUE2Qjs7O0FBTTdCLFNBQVNDLGVBQVQsQ0FBeUJDLEtBQXpCLEVBQWlFOztBQUUvRCxVQUFTQyxPQUFPRCxLQUFQLENBQVQ7O0FBRUUsU0FBSyxJQUFMLENBQWEsS0FBSyxJQUFMLENBQWMsS0FBSyxJQUFMO0FBQ3pCLGFBQU8sT0FBUDs7QUFFRixTQUFLLElBQUwsQ0FBYSxLQUFLLElBQUwsQ0FBYyxLQUFLLElBQUw7QUFDekIsYUFBTyxNQUFQOztBQUVGLFNBQUssS0FBTCxDQUFhLEtBQUssTUFBTCxDQUFjLEtBQUssTUFBTDtBQUMzQixTQUFLLEtBQUwsQ0FBYSxLQUFLLE1BQUwsQ0FBYyxLQUFLLE1BQUw7QUFDM0IsU0FBSyxLQUFMLENBQWEsS0FBSyxNQUFMLENBQWMsS0FBSyxNQUFMO0FBQ3pCLGFBQU8sTUFBUDs7QUFFRjtBQUNFLFlBQU0sSUFBSUUsS0FBSiwwQ0FBaURGLEtBQWpELENBQU47O0FBZEo7QUFrQkQ7O0FBTUQsU0FBU0csZUFBVCxDQUF5QkgsS0FBekIsRUFBNEQ7O0FBRTFELFVBQVNDLE9BQU9ELEtBQVAsQ0FBVDs7QUFFRSxTQUFLLElBQUwsQ0FBWSxLQUFLLElBQUwsQ0FBYSxLQUFLLElBQUw7QUFDdkIsYUFBTyxNQUFQOztBQUVGLFNBQUssSUFBTCxDQUFZLEtBQUssS0FBTCxDQUFhLEtBQUssTUFBTCxDQUFjLEtBQUssTUFBTDtBQUNyQyxhQUFPLE9BQVA7O0FBRUYsU0FBSyxJQUFMLENBQVksS0FBSyxLQUFMLENB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LEVBQTNCLEVBQXlDd0MsUUFBekMsQ0FBbkQ7O0FBRUEsVUFBSSxDQUFFTyxjQUFOLEVBQWdDO0FBQUUsZUFBTyxLQUFQO0FBQWU7QUFDakQsVUFBSUEsZUFBZXZILFdBQW5CLEVBQWdDO0FBQUUsZUFBTyxLQUFQO0FBQWU7O0FBRWpELGFBQU8sSUFBUDtBQUVEOzs7MkNBRXNCZ0gsUSxFQUFnQk0sUSxFQUEyQjtBQUFHO0FBQ25FO0FBQ0E7QUFDQTtBQUNBLGFBQVEsS0FBSzNCLHFCQUFMLENBQTJCLEtBQUtuQixLQUFMLEVBQTNCLEVBQXlDd0MsUUFBekMsTUFBdUR6RCxTQUEvRDtBQUNEOzs7Ozs7QUFTSCxTQUFTaUUsRUFBVCxDQUFzQkMsZ0JBQXRCLENBQXVELGlCQUF2RCxFQUE4RjtBQUFBOzs7QUFFMUY7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsU0FBTyxJQUFJOUUsT0FBSixDQUFZRixLQUFLZ0YsaUJBQWlCQyxNQUFqQjs7QUFFdEI7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsWUFBQzNJLEdBQUQsRUFBTW1DLEdBQU4sRUFBV2tHLEdBQVg7QUFBQSxnQkFBK0JySSxHQUEvQixHQUFxQyxXQUFVcUksR0FBVixDQUFyQyxHQUFzRGxHLEdBQXREO0FBQUEsR0FQc0IsQ0FPdUM7QUFDN0Q7QUFDQTs7QUFUc0IsR0FBTCxDQUFaLENBQVA7QUFhSDs7UUFRQzNDLE8sR0FBQUEsTztRQUVBb0UsTyxHQUFBQSxPO1FBRUFGLEksR0FBQUEsSTtRQUNFcEUsSyxHQUFBQSxLO1FBQ0FtRCxPLEdBQUFBLE87UUFFRmdHLEUsR0FBQUEsRTtRQUVBaEosZSxHQUFBQSxlO1FBQ0FJLGUsR0FBQUEsZTtRQUNBQyxnQixHQUFBQSxnQjtRQUdBOEksRztRQUFLQyxvQjtRQUFzQkMsVTtRQUFZQyxzQjtRQUF3QkMsa0IiLCJmaWxlIjoianNzbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLy8gd2hhcmdhcmJsIGxvdHMgb2YgdGhlc2UgcmV0dXJuIGFycmF5cyBjb3VsZC9zaG91bGQgYmUgc2V0c1xuXG4vLyBAZmxvd1xuXG5pbXBvcnQgdHlwZSB7XG5cbiAgSnNzbUdlbmVyaWNTdGF0ZSwgSnNzbUdlbmVyaWNDb25maWcsXG4gIEpzc21UcmFuc2l0aW9uLCBKc3NtVHJhbnNpdGlvbkxpc3QsXG4gIEpzc21NYWNoaW5lSW50ZXJuYWxTdGF0ZSxcbiAgSnNzbVBhcnNlVHJlZSxcbiAgSnNzbUNvbXBpbGVTZSwgSnNzbUNvbXBpbGVTZVN0YXJ0LCBKc3NtQ29tcGlsZVJ1bGUsXG4gIEpzc21BcnJvdywgSnNzbUFycm93RGlyZWN0aW9uLCBKc3NtQXJyb3dLaW5kLFxuICBKc3NtTGF5b3V0XG5cbn0gZnJvbSAnLi9qc3NtLXR5cGVzJztcblxuXG5cblxuXG5pbXBvcnQgeyBzZXEsIHdlaWdodGVkX3JhbmRfc2VsZWN0LCB3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0LCBoaXN0b2dyYXBoLCB3ZWlnaHRlZF9oaXN0b19rZXkgfSBmcm9tICcuL2pzc20tdXRpbC5qcyc7XG5cbmNvbnN0IHBhcnNlIDogPE5ULCBEVD4oc3RyaW5nKSA9PiBKc3NtUGFyc2VUcmVlPE5UPiA9IHJlcXVpcmUoJy4vanNzbS1kb3QuanMnKS5wYXJzZTsgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZmxvd3R5cGUvbm8td2Vhay10eXBlcyAvLyB0b2RvIHdoYXJnYXJibCByZW1vdmUgYW55XG5cbmNvbnN0IHZlcnNpb24gOiBudWxsID0gbnVsbDsgLy8gcmVwbGFjZWQgZnJvbSBwYWNrYWdlLmpzIGluIGJ1aWxkXG5cblxuXG5cblxuZnVuY3Rpb24gYXJyb3dfZGlyZWN0aW9uKGFycm93IDogSnNzbUFycm93KSA6IEpzc21BcnJvd0RpcmVjdGlvbiB7XG5cbiAgc3dpdGNoICggU3RyaW5nKGFycm93KSApIHtcblxuICAgIGNhc2UgJy0+JyA6ICBjYXNlICc9PicgIDogIGNhc2UgJ34+JyAgOlxuICAgICAgcmV0dXJuICdyaWdodCc7XG5cbiAgICBjYXNlICc8LScgOiAgY2FzZSAnPD0nICA6ICBjYXNlICc8ficgIDpcbiAgICAgIHJldHVybiAnbGVmdCc7XG5cbiAgICBjYXNlICc8LT4nOiAgY2FzZSAnPC09Pic6ICBjYXNlICc8LX4+JzpcbiAgICBjYXNlICc8PT4nOiAgY2FzZSAnPD0tPic6ICBjYXNlICc8PX4+JzpcbiAgICBjYXNlICc8fj4nOiAgY2FzZSAnPH4tPic6ICBjYXNlICc8fj0+JzpcbiAgICAgIHJldHVybiAnYm90aCc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcnJvd19kaXJlY3Rpb246IHVua25vd24gYXJyb3cgdHlwZSAke2Fycm93fWApO1xuXG4gIH1cblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIGFycm93X2xlZnRfa2luZChhcnJvdyA6IEpzc21BcnJvdykgOiBKc3NtQXJyb3dLaW5kIHtcblxuICBzd2l0Y2ggKCBTdHJpbmcoYXJyb3cpICkge1xuXG4gICAgY2FzZSAnLT4nOiAgY2FzZSAnPT4nIDogIGNhc2UgJ34+JzpcbiAgICAgIHJldHVybiAnbm9uZSc7XG5cbiAgICBjYXNlICc8LSc6ICBjYXNlICc8LT4nOiAgY2FzZSAnPC09Pic6ICBjYXNlICc8LX4+JzpcbiAgICAgIHJldHVybiAnbGVnYWwnO1xuXG4gICAgY2FzZSAnPD0nOiAgY2FzZSAnPD0+JzogIGNhc2UgJzw9LT4nOiAgY2FzZSAnPD1+Pic6XG4gICAgICByZXR1cm4gJ21haW4nO1xuXG4gICAgY2FzZSAnPH4nOiAgY2FzZSAnPH4+JzogIGNhc2UgJzx+LT4nOiAgY2FzZSAnPH49Pic6XG4gICAgICByZXR1cm4gJ2ZvcmNlZCc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcnJvd19kaXJlY3Rpb246IHVua25vd24gYXJyb3cgdHlwZSAke2Fycm93fWApO1xuXG4gIH1cblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIGFycm93X3JpZ2h0X2tpbmQoYXJyb3cgOiBKc3NtQXJyb3cpIDogSnNzbUFycm93S2luZCB7XG5cbiAgc3dpdGNoICggU3RyaW5nKGFycm93KSApIHtcblxuICAgIGNhc2UgJzwtJzogIGNhc2UgJzw9JyA6ICBjYXNlICc8fic6XG4gICAgICByZXR1cm4gJ25vbmUnO1xuXG4gICAgY2FzZSAnLT4nOiAgY2FzZSAnPC0+JzogIGNhc2UgJzw9LT4nOiAgY2FzZSAnPH4tPic6XG4gICAgICByZXR1cm4gJ2xlZ2FsJztcblxuICAgIGNhc2UgJz0+JzogIGNhc2UgJzw9Pic6ICBjYXNlICc8LT0+JzogIGNhc2UgJzx+PT4nOlxuICAgICAgcmV0dXJuICdtYWluJztcblxuICAgIGNhc2UgJ34+JzogIGNhc2UgJzx+Pic6ICBjYXNlICc8LX4+JzogIGNhc2UgJzw9fj4nOlxuICAgICAgcmV0dXJuICdmb3JjZWQnO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXJyb3dfZGlyZWN0aW9uOiB1bmtub3duIGFycm93IHR5cGUgJHthcnJvd31gKTtcblxuICB9XG5cbn1cblxuXG5cblxuXG5mdW5jdGlvbiBjb21waWxlX3J1bGVfdHJhbnNpdGlvbl9zdGVwPG1OVCwgbURUPihcbiAgICAgICAgICAgICBhY2MgICAgIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+LFxuICAgICAgICAgICAgIGZyb20gICAgOiBtTlQsXG4gICAgICAgICAgICAgdG8gICAgICA6IG1OVCxcbiAgICAgICAgICAgICB0aGlzX3NlIDogSnNzbUNvbXBpbGVTZTxtTlQ+LFxuICAgICAgICAgICAgIG5leHRfc2UgOiBKc3NtQ29tcGlsZVNlPG1OVD5cbiAgICAgICAgICkgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4geyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIHBhcnNlciByZXByZXNlbnRhdGlvbiBvZiBhIHRyYW5zaXRpb24gc3RlcCBleHRlbnNpb25cblxuICBjb25zdCBlZGdlcyA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiA9IFtdO1xuXG4gIGNvbnN0IHVGcm9tIDogQXJyYXk8IG1OVCA+ID0gKEFycmF5LmlzQXJyYXkoZnJvbSk/IGZyb20gOiBbZnJvbV0pLFxuICAgICAgICB1VG8gICA6IEFycmF5PCBtTlQgPiA9IChBcnJheS5pc0FycmF5KHRvKT8gICB0byAgIDogW3RvXSAgKTtcblxuICB1RnJvbS5tYXAoIChmOm1OVCkgPT4ge1xuICAgIHVUby5tYXAoICh0Om1OVCkgPT4ge1xuXG4gICAgICBjb25zdCByayA6IEpzc21BcnJvd0tpbmQgPSBhcnJvd19yaWdodF9raW5kKHRoaXNfc2Uua2luZCksXG4gICAgICAgICAgICBsayA6IEpzc21BcnJvd0tpbmQgPSBhcnJvd19sZWZ0X2tpbmQodGhpc19zZS5raW5kKTtcblxuXG4gICAgICBjb25zdCByaWdodCA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHtcbiAgICAgICAgZnJvbSAgICAgICAgOiBmLFxuICAgICAgICB0byAgICAgICAgICA6IHQsXG4gICAgICAgIGtpbmQgICAgICAgIDogcmssXG4gICAgICAgIGZvcmNlZF9vbmx5IDogcmsgPT09ICdmb3JjZWQnLFxuICAgICAgICBtYWluX3BhdGggICA6IHJrID09PSAnbWFpbidcbiAgICAgIH07XG5cbiAgICAgIGlmICh0aGlzX3NlLnJfYWN0aW9uKSAgICAgIHsgcmlnaHQuYWN0aW9uICAgICAgPSB0aGlzX3NlLnJfYWN0aW9uOyAgICAgIH1cbiAgICAgIGlmICh0aGlzX3NlLnJfcHJvYmFiaWxpdHkpIHsgcmlnaHQucHJvYmFiaWxpdHkgPSB0aGlzX3NlLnJfcHJvYmFiaWxpdHk7IH1cbiAgICAgIGlmIChyaWdodC5raW5kICE9PSAnbm9uZScpIHsgZWRnZXMucHVzaChyaWdodCk7IH1cblxuXG4gICAgICBjb25zdCBsZWZ0IDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0ge1xuICAgICAgICBmcm9tICAgICAgICA6IHQsXG4gICAgICAgIHRvICAgICAgICAgIDogZixcbiAgICAgICAga2luZCAgICAgICAgOiBsayxcbiAgICAgICAgZm9yY2VkX29ubHkgOiBsayA9PT0gJ2ZvcmNlZCcsXG4gICAgICAgIG1haW5fcGF0aCAgIDogbGsgPT09ICdtYWluJ1xuICAgICAgfTtcblxuICAgICAgaWYgKHRoaXNfc2UubF9hY3Rpb24pICAgICAgeyBsZWZ0LmFjdGlvbiAgICAgID0gdGhpc19zZS5sX2FjdGlvbjsgICAgICB9XG4gICAgICBpZiAodGhpc19zZS5sX3Byb2JhYmlsaXR5KSB7IGxlZnQucHJvYmFiaWxpdHkgPSB0aGlzX3NlLmxfcHJvYmFiaWxpdHk7IH1cbiAgICAgIGlmIChsZWZ0LmtpbmQgIT09ICdub25lJykgIHsgZWRnZXMucHVzaChsZWZ0KTsgfVxuXG4gICAgfSk7XG4gIH0pO1xuXG4gIGNvbnN0IG5ld19hY2MgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBhY2MuY29uY2F0KGVkZ2VzKTtcblxuICBpZiAobmV4dF9zZSkge1xuICAgIHJldHVybiBjb21waWxlX3J1bGVfdHJhbnNpdGlvbl9zdGVwKG5ld19hY2MsIHRvLCBuZXh0X3NlLnRvLCBuZXh0X3NlLCBuZXh0X3NlLnNlKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3X2FjYztcbiAgfVxuXG59XG5cblxuXG5mdW5jdGlvbiBjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb248bU5UPihydWxlIDogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pIDogbWl4ZWQgeyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIHBhcnNlciByZXByZXNlbnRhdGlvbiBvZiBhIHRyYW5zaXRpb25cbiAgcmV0dXJuIGNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXAoW10sIHJ1bGUuZnJvbSwgcnVsZS5zZS50bywgcnVsZS5zZSwgcnVsZS5zZS5zZSk7XG59XG5cblxuXG5mdW5jdGlvbiBjb21waWxlX3J1bGVfaGFuZGxlcjxtTlQ+KHJ1bGUgOiBKc3NtQ29tcGlsZVNlU3RhcnQ8bU5UPikgOiBKc3NtQ29tcGlsZVJ1bGUgeyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIG91dHB1dCBvZiB0aGUgcGFyc2VyXG5cbiAgaWYgKHJ1bGUua2V5ID09PSAndHJhbnNpdGlvbicpIHsgcmV0dXJuIHsgYWdnX2FzOiAndHJhbnNpdGlvbicsIHZhbDogY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uKHJ1bGUpIH07IH1cblxuICBjb25zdCB0YXV0b2xvZ2llcyA6IEFycmF5PHN0cmluZz4gPSBbJ2dyYXBoX2xheW91dCcsICdzdGFydF9ub2RlcycsICdlbmRfbm9kZXMnLCAnbWFjaGluZV9uYW1lJywgJ21hY2hpbmVfdmVyc2lvbiddO1xuICBpZiAodGF1dG9sb2dpZXMuaW5jbHVkZXMocnVsZS5rZXkpKSB7XG4gICAgcmV0dXJuIHsgYWdnX2FzOiBydWxlLmtleSwgdmFsOiBydWxlLnZhbHVlIH07XG4gIH1cblxuICB0aHJvdyBuZXcgRXJyb3IoYGNvbXBpbGVfcnVsZV9oYW5kbGVyOiBVbmtub3duIHJ1bGU6ICR7SlNPTi5zdHJpbmdpZnkocnVsZSl9YCk7XG5cbn1cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGU8bU5ULCBtRFQ+KHRyZWUgOiBKc3NtUGFyc2VUcmVlPG1OVD4pIDogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+IHsgIC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgb3V0cHV0IG9mIHRoZSBwYXJzZXJcblxuICBjb25zdCByZXN1bHRzIDoge1xuICAgIGdyYXBoX2xheW91dCAgICA6IEFycmF5PCBKc3NtTGF5b3V0ID4sXG4gICAgdHJhbnNpdGlvbiAgICAgIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+LFxuICAgIHN0YXJ0X25vZGVzICAgICA6IEFycmF5PCBtTlQgPixcbiAgICBlbmRfbm9kZXMgICAgICAgOiBBcnJheTwgbU5UID4sXG4gICAgaW5pdGlhbF9zdGF0ZSAgIDogQXJyYXk8IG1OVCA+LFxuICAgIG1hY2hpbmVfbmFtZSAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX3ZlcnNpb24gOiBBcnJheTwgc3RyaW5nID4gLy8gc2VtdmVyXG4gIH0gPSB7XG4gICAgZ3JhcGhfbGF5b3V0ICAgIDogW10sXG4gICAgdHJhbnNpdGlvbiAgICAgIDogW10sXG4gICAgc3RhcnRfbm9kZXMgICAgIDogW10sXG4gICAgZW5kX25vZGVzICAgICAgIDogW10sXG4gICAgaW5pdGlhbF9zdGF0ZSAgIDogW10sXG4gICAgbWFjaGluZV9uYW1lICAgIDogW10sXG4gICAgbWFjaGluZV92ZXJzaW9uIDogW11cbiAgfTtcblxuICB0cmVlLm1hcCggKHRyIDogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pID0+IHtcblxuICAgIGNvbnN0IHJ1bGUgICA6IEpzc21Db21waWxlUnVsZSA9IGNvbXBpbGVfcnVsZV9oYW5kbGVyKHRyKSxcbiAgICAgICAgICBhZ2dfYXMgOiBzdHJpbmcgICAgICAgICAgPSBydWxlLmFnZ19hcyxcbiAgICAgICAgICB2YWwgICAgOiBtaXhlZCAgICAgICAgICAgPSBydWxlLnZhbDsgICAgICAgICAgICAgICAgICAvLyB0b2RvIGJldHRlciB0eXBlc1xuXG4gICAgcmVzdWx0c1thZ2dfYXNdID0gcmVzdWx0c1thZ2dfYXNdLmNvbmNhdCh2YWwpO1xuXG4gIH0pO1xuXG4gIFsnZ3JhcGhfbGF5b3V0JywgJ2luaXRpYWxfc3RhdGUnLCAnbWFjaGluZV9uYW1lJywgJ21hY2hpbmVfdmVyc2lvbiddLm1hcCggKG9uZU9ubHlLZXkgOiBzdHJpbmcpID0+IHtcbiAgICBpZiAocmVzdWx0c1tvbmVPbmx5S2V5XS5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1heSBvbmx5IGhhdmUgb25lICR7b25lT25seUtleX0gc3RhdGVtZW50IG1heGltdW06ICR7SlNPTi5zdHJpbmdpZnkocmVzdWx0c1tvbmVPbmx5S2V5XSl9YCk7XG4gICAgfVxuICB9KTtcblxuICBjb25zdCBhc3NlbWJsZWRfdHJhbnNpdGlvbnMgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBbXS5jb25jYXQoLi4uIHJlc3VsdHNbJ3RyYW5zaXRpb24nXSk7XG5cbiAgY29uc3QgcmVzdWx0X2NmZyA6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPiA9IHtcbi8vIHdoYXJnYXJibCBzaG91bGQgYmUgICAgaW5pdGlhbF9zdGF0ZSA6IHJlc3VsdHMuaW5pdGlhbF9zdGF0ZVswXSxcbiAgICBpbml0aWFsX3N0YXRlIDogcmVzdWx0cy5zdGFydF9ub2Rlcy5sZW5ndGg/IHJlc3VsdHMuc3RhcnRfbm9kZXNbMF0gOiBhc3NlbWJsZWRfdHJhbnNpdGlvbnNbMF0uZnJvbSxcbiAgICB0cmFuc2l0aW9ucyAgIDogYXNzZW1ibGVkX3RyYW5zaXRpb25zXG4gIH07XG5cbiAgaWYgKHJlc3VsdHMuZ3JhcGhfbGF5b3V0Lmxlbmd0aCkgeyByZXN1bHRfY2ZnLmxheW91dCA9IHJlc3VsdHMuZ3JhcGhfbGF5b3V0WzBdOyB9XG5cbiAgcmV0dXJuIHJlc3VsdF9jZmc7XG5cbn1cblxuXG5cbmZ1bmN0aW9uIG1ha2U8bU5ULCBtRFQ+KHBsYW4gOiBzdHJpbmcpIDogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+IHtcbiAgcmV0dXJuIGNvbXBpbGUocGFyc2UocGxhbikpO1xufVxuXG5cblxuXG5cbmNsYXNzIE1hY2hpbmU8bU5ULCBtRFQ+IHtcblxuXG4gIF9zdGF0ZSAgICAgICAgICAgICAgICAgIDogbU5UO1xuICBfc3RhdGVzICAgICAgICAgICAgICAgICA6IE1hcDxtTlQsIEpzc21HZW5lcmljU3RhdGU8bU5UPj47XG4gIF9lZGdlcyAgICAgICAgICAgICAgICAgIDogQXJyYXk8SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+PjtcbiAgX2VkZ2VfbWFwICAgICAgICAgICAgICAgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcbiAgX25hbWVkX3RyYW5zaXRpb25zICAgICAgOiBNYXA8bU5ULCBudW1iZXI+O1xuICBfYWN0aW9ucyAgICAgICAgICAgICAgICA6IE1hcDxtTlQsIE1hcDxtTlQsIG51bWJlcj4+O1xuICBfcmV2ZXJzZV9hY3Rpb25zICAgICAgICA6IE1hcDxtTlQsIE1hcDxtTlQsIG51bWJlcj4+O1xuICBfcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyA6IE1hcDxtTlQsIE1hcDxtTlQsIG51bWJlcj4+O1xuXG4gIF9sYXlvdXQgICAgICAgICAgICAgICAgIDogSnNzbUxheW91dDtcblxuICAvLyB3aGFyZ2FyYmwgdGhpcyBiYWRseSBuZWVkcyB0byBiZSBicm9rZW4gdXAsIG1vbm9saXRoIG1hc3RlclxuICBjb25zdHJ1Y3Rvcih7IGluaXRpYWxfc3RhdGUsIGNvbXBsZXRlPVtdLCB0cmFuc2l0aW9ucywgbGF5b3V0ID0gJ2RvdCcgfSA6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPikge1xuXG4gICAgdGhpcy5fc3RhdGUgICAgICAgICAgICAgICAgICA9IGluaXRpYWxfc3RhdGU7XG4gICAgdGhpcy5fc3RhdGVzICAgICAgICAgICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9lZGdlcyAgICAgICAgICAgICAgICAgID0gW107XG4gICAgdGhpcy5fZWRnZV9tYXAgICAgICAgICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucyAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX2FjdGlvbnMgICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25zICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzID0gbmV3IE1hcCgpOyAgLy8gdG9kb1xuXG4gICAgdGhpcy5fbGF5b3V0ICAgICAgICAgICAgICAgICA9IGxheW91dDtcblxuICAgIHRyYW5zaXRpb25zLm1hcCggKHRyOkpzc21UcmFuc2l0aW9uPG1OVCwgbURUPikgPT4ge1xuXG4gICAgICBpZiAodHIuZnJvbSA9PT0gdW5kZWZpbmVkKSB7IHRocm93IG5ldyBFcnJvcihgdHJhbnNpdGlvbiBtdXN0IGRlZmluZSAnZnJvbSc6ICR7SlNPTi5zdHJpbmdpZnkodHIpfWApOyB9XG4gICAgICBpZiAodHIudG8gICA9PT0gdW5kZWZpbmVkKSB7IHRocm93IG5ldyBFcnJvcihgdHJhbnNpdGlvbiBtdXN0IGRlZmluZSAndG8nOiAkeyAgSlNPTi5zdHJpbmdpZnkodHIpfWApOyB9XG5cbiAgICAgIC8vIGdldCB0aGUgY3Vyc29ycy4gIHdoYXQgYSBtZXNzXG4gICAgICBjb25zdCBjdXJzb3JfZnJvbSA6IEpzc21HZW5lcmljU3RhdGU8bU5UPlxuICAgICAgICAgID0gdGhpcy5fc3RhdGVzLmdldCh0ci5mcm9tKVxuICAgICAgICAgfHwgeyBuYW1lOiB0ci5mcm9tLCBmcm9tOiBbXSwgdG86IFtdLCBjb21wbGV0ZTogY29tcGxldGUuaW5jbHVkZXModHIuZnJvbSkgfTtcblxuICAgICAgaWYgKCEodGhpcy5fc3RhdGVzLmhhcyh0ci5mcm9tKSkpIHtcbiAgICAgICAgdGhpcy5fbmV3X3N0YXRlKGN1cnNvcl9mcm9tKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY3Vyc29yX3RvIDogSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+XG4gICAgICAgICAgPSB0aGlzLl9zdGF0ZXMuZ2V0KHRyLnRvKVxuICAgICAgICAgfHwge25hbWU6IHRyLnRvLCBmcm9tOiBbXSwgdG86IFtdLCBjb21wbGV0ZTogY29tcGxldGUuaW5jbHVkZXModHIudG8pIH07XG5cbiAgICAgIGlmICghKHRoaXMuX3N0YXRlcy5oYXModHIudG8pKSkge1xuICAgICAgICB0aGlzLl9uZXdfc3RhdGUoY3Vyc29yX3RvKTtcbiAgICAgIH1cblxuICAgICAgLy8gZ3VhcmQgYWdhaW5zdCBleGlzdGluZyBjb25uZWN0aW9ucyBiZWluZyByZS1hZGRlZFxuICAgICAgaWYgKGN1cnNvcl9mcm9tLnRvLmluY2x1ZGVzKHRyLnRvKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGFscmVhZHkgaGFzICR7SlNPTi5zdHJpbmdpZnkodHIuZnJvbSl9IHRvICR7SlNPTi5zdHJpbmdpZnkodHIudG8pfWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3Vyc29yX2Zyb20udG8ucHVzaCh0ci50byk7XG4gICAgICAgIGN1cnNvcl90by5mcm9tLnB1c2godHIuZnJvbSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGFkZCB0aGUgZWRnZTsgbm90ZSBpdHMgaWRcbiAgICAgIHRoaXMuX2VkZ2VzLnB1c2godHIpO1xuICAgICAgY29uc3QgdGhpc0VkZ2VJZCA6IG51bWJlciA9IHRoaXMuX2VkZ2VzLmxlbmd0aCAtIDE7XG5cbiAgICAgIC8vIGd1YXJkIGFnYWluc3QgcmVwZWF0aW5nIGEgdHJhbnNpdGlvbiBuYW1lXG4gICAgICBpZiAodHIubmFtZSkge1xuICAgICAgICBpZiAodGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMuaGFzKHRyLm5hbWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBuYW1lZCB0cmFuc2l0aW9uIFwiJHtKU09OLnN0cmluZ2lmeSh0ci5uYW1lKX1cIiBhbHJlYWR5IGNyZWF0ZWRgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucy5zZXQodHIubmFtZSwgdGhpc0VkZ2VJZCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gc2V0IHVwIHRoZSBtYXBwaW5nLCBzbyB0aGF0IGVkZ2VzIGNhbiBiZSBsb29rZWQgdXAgYnkgZW5kcG9pbnQgcGFpcnNcbiAgICAgIGNvbnN0IGZyb21fbWFwcGluZyA6IE1hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9lZGdlX21hcC5nZXQodHIuZnJvbSkgfHwgbmV3IE1hcCgpO1xuICAgICAgaWYgKCEodGhpcy5fZWRnZV9tYXAuaGFzKHRyLmZyb20pKSkge1xuICAgICAgICB0aGlzLl9lZGdlX21hcC5zZXQodHIuZnJvbSwgZnJvbV9tYXBwaW5nKTtcbiAgICAgIH1cblxuLy8gICAgY29uc3QgdG9fbWFwcGluZyA9IGZyb21fbWFwcGluZy5nZXQodHIudG8pO1xuICAgICAgZnJvbV9tYXBwaW5nLnNldCh0ci50bywgdGhpc0VkZ2VJZCk7IC8vIGFscmVhZHkgY2hlY2tlZCB0aGF0IHRoaXMgbWFwcGluZyBkb2Vzbid0IGV4aXN0LCBhYm92ZVxuXG4gICAgICAvLyBzZXQgdXAgdGhlIGFjdGlvbiBtYXBwaW5nLCBzbyB0aGF0IGFjdGlvbnMgY2FuIGJlIGxvb2tlZCB1cCBieSBvcmlnaW5cbiAgICAgIGlmICh0ci5hY3Rpb24pIHtcblxuXG4gICAgICAgIC8vIGZvcndhcmQgbWFwcGluZyBmaXJzdCBieSBhY3Rpb24gbmFtZVxuICAgICAgICBsZXQgYWN0aW9uTWFwIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9hY3Rpb25zLmdldCh0ci5hY3Rpb24pO1xuICAgICAgICBpZiAoIShhY3Rpb25NYXApKSB7XG4gICAgICAgICAgYWN0aW9uTWFwID0gbmV3IE1hcCgpO1xuICAgICAgICAgIHRoaXMuX2FjdGlvbnMuc2V0KHRyLmFjdGlvbiwgYWN0aW9uTWFwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhY3Rpb25NYXAuaGFzKHRyLmZyb20pKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBhY3Rpb24gJHtKU09OLnN0cmluZ2lmeSh0ci5hY3Rpb24pfSBhbHJlYWR5IGF0dGFjaGVkIHRvIG9yaWdpbiAke0pTT04uc3RyaW5naWZ5KHRyLmZyb20pfWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFjdGlvbk1hcC5zZXQodHIuZnJvbSwgdGhpc0VkZ2VJZCk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8vIHJldmVyc2UgbWFwcGluZyBmaXJzdCBieSBzdGF0ZSBvcmlnaW4gbmFtZVxuICAgICAgICBsZXQgckFjdGlvbk1hcCA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh0ci5mcm9tKTtcbiAgICAgICAgaWYgKCEockFjdGlvbk1hcCkpIHtcbiAgICAgICAgICByQWN0aW9uTWFwID0gbmV3IE1hcCgpO1xuICAgICAgICAgIHRoaXMuX3JldmVyc2VfYWN0aW9ucy5zZXQodHIuZnJvbSwgckFjdGlvbk1hcCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBubyBuZWVkIHRvIHRlc3QgZm9yIHJldmVyc2UgbWFwcGluZyBwcmUtcHJlc2VuY2U7XG4gICAgICAgIC8vIGZvcndhcmQgbWFwcGluZyBhbHJlYWR5IGNvdmVycyBjb2xsaXNpb25zXG4gICAgICAgIHJBY3Rpb25NYXAuc2V0KHRyLmFjdGlvbiwgdGhpc0VkZ2VJZCk7XG5cblxuICAgICAgICAvLyByZXZlcnNlIG1hcHBpbmcgZmlyc3QgYnkgc3RhdGUgdGFyZ2V0IG5hbWVcbiAgICAgICAgaWYgKCEodGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5oYXModHIudG8pKSkge1xuICAgICAgICAgIHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuc2V0KHRyLnRvLCBuZXcgTWFwKCkpO1xuICAgICAgICB9XG5cbi8qIHRvZG8gY29tZWJhY2tcbiAgIGZ1bmRhbWVudGFsIHByb2JsZW0gaXMgcm9BY3Rpb25NYXAgbmVlZHMgdG8gYmUgYSBtdWx0aW1hcFxuICAgICAgICBjb25zdCByb0FjdGlvbk1hcCA9IHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuZ2V0KHRyLnRvKTsgIC8vIHdhc3RlZnVsIC0gYWxyZWFkeSBkaWQgaGFzIC0gcmVmYWN0b3JcbiAgICAgICAgaWYgKHJvQWN0aW9uTWFwKSB7XG4gICAgICAgICAgaWYgKHJvQWN0aW9uTWFwLmhhcyh0ci5hY3Rpb24pKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHJvLWFjdGlvbiAke3RyLnRvfSBhbHJlYWR5IGF0dGFjaGVkIHRvIGFjdGlvbiAke3RyLmFjdGlvbn1gKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcm9BY3Rpb25NYXAuc2V0KHRyLmFjdGlvbiwgdGhpc0VkZ2VJZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc2hvdWxkIGJlIGltcG9zc2libGUgLSBmbG93IGRvZXNuXFwndCBrbm93IC5zZXQgcHJlY2VkZXMgLmdldCB5ZXQgYWdhaW4uICBzZXZlcmUgZXJyb3I/Jyk7XG4gICAgICAgIH1cbiovXG4gICAgICB9XG5cbiAgICB9KTtcblxuICB9XG5cbiAgX25ld19zdGF0ZShzdGF0ZV9jb25maWcgOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD4pIDogbU5UIHsgLy8gd2hhcmdhcmJsIGdldCB0aGF0IHN0YXRlX2NvbmZpZyBhbnkgdW5kZXIgY29udHJvbFxuXG4gICAgaWYgKHRoaXMuX3N0YXRlcy5oYXMoc3RhdGVfY29uZmlnLm5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHN0YXRlICR7SlNPTi5zdHJpbmdpZnkoc3RhdGVfY29uZmlnLm5hbWUpfSBhbHJlYWR5IGV4aXN0c2ApO1xuICAgIH1cblxuICAgIHRoaXMuX3N0YXRlcy5zZXQoc3RhdGVfY29uZmlnLm5hbWUsIHN0YXRlX2NvbmZpZyk7XG4gICAgcmV0dXJuIHN0YXRlX2NvbmZpZy5uYW1lO1xuXG4gIH1cblxuXG5cbiAgc3RhdGUoKSA6IG1OVCB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlO1xuICB9XG5cbi8qIHdoYXJnYXJibCB0b2RvIG1ham9yXG4gICB3aGVuIHdlIHJlaW1wbGVtZW50IHRoaXMsIHJlaW50cm9kdWNlIHRoaXMgY2hhbmdlIHRvIHRoZSBpc19maW5hbCBjYWxsXG5cbiAgaXNfY2hhbmdpbmcoKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlOyAvLyB0b2RvIHdoYXJnYXJibFxuICB9XG4qL1xuXG5cbiAgc3RhdGVfaXNfZmluYWwod2hpY2hTdGF0ZSA6IG1OVCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gKCAodGhpcy5zdGF0ZV9pc190ZXJtaW5hbCh3aGljaFN0YXRlKSkgJiYgKHRoaXMuc3RhdGVfaXNfY29tcGxldGUod2hpY2hTdGF0ZSkpICk7XG4gIH1cblxuICBpc19maW5hbCgpIDogYm9vbGVhbiB7XG4vLyAgcmV0dXJuICgoIXRoaXMuaXNfY2hhbmdpbmcoKSkgJiYgdGhpcy5zdGF0ZV9pc19maW5hbCh0aGlzLnN0YXRlKCkpKTtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZV9pc19maW5hbCh0aGlzLnN0YXRlKCkpO1xuICB9XG5cbiAgbGF5b3V0KCkgOiBzdHJpbmcge1xuICAgIHJldHVybiBTdHJpbmcodGhpcy5fbGF5b3V0KTtcbiAgfVxuXG5cblxuICBtYWNoaW5lX3N0YXRlKCkgOiBKc3NtTWFjaGluZUludGVybmFsU3RhdGU8bU5ULCBtRFQ+IHtcblxuICAgIHJldHVybiB7XG4gICAgICBpbnRlcm5hbF9zdGF0ZV9pbXBsX3ZlcnNpb24gOiAxLFxuXG4gICAgICBhY3Rpb25zICAgICAgICAgICAgICAgIDogdGhpcy5fYWN0aW9ucyxcbiAgICAgIGVkZ2VfbWFwICAgICAgICAgICAgICAgOiB0aGlzLl9lZGdlX21hcCxcbiAgICAgIGVkZ2VzICAgICAgICAgICAgICAgICAgOiB0aGlzLl9lZGdlcyxcbiAgICAgIG5hbWVkX3RyYW5zaXRpb25zICAgICAgOiB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucyxcbiAgICAgIHJldmVyc2VfYWN0aW9ucyAgICAgICAgOiB0aGlzLl9yZXZlcnNlX2FjdGlvbnMsXG4vLyAgICByZXZlcnNlX2FjdGlvbl90YXJnZXRzIDogdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyxcbiAgICAgIHN0YXRlICAgICAgICAgICAgICAgICAgOiB0aGlzLl9zdGF0ZSxcbiAgICAgIHN0YXRlcyAgICAgICAgICAgICAgICAgOiB0aGlzLl9zdGF0ZXNcbiAgICB9O1xuXG4gIH1cblxuLypcbiAgbG9hZF9tYWNoaW5lX3N0YXRlKCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7IC8vIHRvZG8gd2hhcmdhcmJsXG4gIH1cbiovXG5cblxuICBzdGF0ZXMoKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uIHRoaXMuX3N0YXRlcy5rZXlzKCldO1xuICB9XG5cbiAgc3RhdGVfZm9yKHdoaWNoU3RhdGUgOiBtTlQpIDogSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+IHtcbiAgICBjb25zdCBzdGF0ZSA6ID9Kc3NtR2VuZXJpY1N0YXRlPG1OVD4gPSB0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmIChzdGF0ZSkgeyByZXR1cm4gc3RhdGU7IH1cbiAgICBlbHNlICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBubyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkoc3RhdGUpfWApOyB9XG4gIH1cblxuXG5cbiAgbGlzdF9lZGdlcygpIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHtcbiAgICByZXR1cm4gdGhpcy5fZWRnZXM7XG4gIH1cblxuICBsaXN0X25hbWVkX3RyYW5zaXRpb25zKCkgOiBNYXA8bU5ULCBudW1iZXI+IHtcbiAgICByZXR1cm4gdGhpcy5fbmFtZWRfdHJhbnNpdGlvbnM7XG4gIH1cblxuICBsaXN0X2FjdGlvbnMoKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uIHRoaXMuX2FjdGlvbnMua2V5cygpXTtcbiAgfVxuXG5cblxuICBnZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyhmcm9tOiBtTlQsIHRvOiBtTlQpIDogP251bWJlciB7XG5cbiAgICBjb25zdCBlbWcgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2VkZ2VfbWFwLmdldChmcm9tKTtcblxuICAgIGlmIChlbWcpIHtcbiAgICAgIHJldHVybiBlbWcuZ2V0KHRvKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgfVxuXG5cblxuICBsb29rdXBfdHJhbnNpdGlvbl9mb3IoZnJvbTogbU5ULCB0bzogbU5UKSA6ID9Kc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4ge1xuICAgIGNvbnN0IGlkIDogP251bWJlciA9IHRoaXMuZ2V0X3RyYW5zaXRpb25fYnlfc3RhdGVfbmFtZXMoZnJvbSwgdG8pO1xuICAgIHJldHVybiAoKGlkID09PSB1bmRlZmluZWQpIHx8IChpZCA9PT0gbnVsbCkpPyB1bmRlZmluZWQgOiB0aGlzLl9lZGdlc1tpZF07XG4gIH1cblxuXG5cbiAgbGlzdF90cmFuc2l0aW9ucyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpKSA6IEpzc21UcmFuc2l0aW9uTGlzdDxtTlQ+IHtcbiAgICByZXR1cm4ge2VudHJhbmNlczogdGhpcy5saXN0X2VudHJhbmNlcyh3aGljaFN0YXRlKSwgZXhpdHM6IHRoaXMubGlzdF9leGl0cyh3aGljaFN0YXRlKX07XG4gIH1cblxuICBsaXN0X2VudHJhbmNlcyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiAodGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKSB8fCB7fSkuZnJvbSB8fCBbXTtcbiAgfVxuXG4gIGxpc3RfZXhpdHMod2hpY2hTdGF0ZSA6IG1OVCA9IHRoaXMuc3RhdGUoKSkgOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gKHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSkgfHwge30pLnRvICAgfHwgW107XG4gIH1cblxuXG5cbiAgcHJvYmFibGVfZXhpdHNfZm9yKHdoaWNoU3RhdGUgOiBtTlQpIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHtcblxuICAgIGNvbnN0IHdzdGF0ZSA6ID9Kc3NtR2VuZXJpY1N0YXRlPG1OVD4gPSB0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICghKHdzdGF0ZSkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9IGluIHByb2JhYmxlX2V4aXRzX2ZvcmApOyB9XG5cbiAgICBjb25zdCB3c3RhdGVfdG8gOiBBcnJheTwgbU5UID4gPSB3c3RhdGUudG8sXG5cbiAgICAgICAgICB3dGYgICAgICAgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID5cbiAgICAgICAgICAgICAgICAgICAgPSB3c3RhdGVfdG9cbiAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoICh3cykgOiA/SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMubG9va3VwX3RyYW5zaXRpb25fZm9yKHRoaXMuc3RhdGUoKSwgd3MpKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKTtcblxuICAgIHJldHVybiB3dGY7XG5cbiAgfVxuXG4gIHByb2JhYmlsaXN0aWNfdHJhbnNpdGlvbigpIDogYm9vbGVhbiB7XG4gICAgY29uc3Qgc2VsZWN0ZWQgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB3ZWlnaHRlZF9yYW5kX3NlbGVjdCh0aGlzLnByb2JhYmxlX2V4aXRzX2Zvcih0aGlzLnN0YXRlKCkpKTtcbiAgICByZXR1cm4gdGhpcy50cmFuc2l0aW9uKCBzZWxlY3RlZC50byApO1xuICB9XG5cbiAgcHJvYmFiaWxpc3RpY193YWxrKG4gOiBudW1iZXIpIDogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuIHNlcShuKVxuICAgICAgICAgIC5tYXAoKCkgOiBtTlQgPT4ge1xuICAgICAgICAgICAgIGNvbnN0IHN0YXRlX3dhcyA6IG1OVCA9IHRoaXMuc3RhdGUoKTtcbiAgICAgICAgICAgICB0aGlzLnByb2JhYmlsaXN0aWNfdHJhbnNpdGlvbigpO1xuICAgICAgICAgICAgIHJldHVybiBzdGF0ZV93YXM7XG4gICAgICAgICAgIH0pXG4gICAgICAgICAgLmNvbmNhdChbdGhpcy5zdGF0ZSgpXSk7XG4gIH1cblxuICBwcm9iYWJpbGlzdGljX2hpc3RvX3dhbGsobiA6IG51bWJlcikgOiBNYXA8bU5ULCBudW1iZXI+IHtcbiAgICByZXR1cm4gaGlzdG9ncmFwaCh0aGlzLnByb2JhYmlsaXN0aWNfd2FsayhuKSk7XG4gIH1cblxuXG5cbiAgYWN0aW9ucyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpICkgOiBBcnJheTxtTlQ+IHtcbiAgICBjb25zdCB3c3RhdGUgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHdzdGF0ZSkgeyByZXR1cm4gWy4uLiB3c3RhdGUua2V5cygpXTsgfVxuICAgIGVsc2UgICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cbiAgfVxuXG4gIGxpc3Rfc3RhdGVzX2hhdmluZ19hY3Rpb24od2hpY2hTdGF0ZSA6IG1OVCkgOiBBcnJheTxtTlQ+IHtcbiAgICBjb25zdCB3c3RhdGUgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICh3c3RhdGUpIHsgcmV0dXJuIFsuLi4gd3N0YXRlLmtleXMoKV07IH1cbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG4gIH1cblxuLy8gY29tZWJhY2tcbi8qXG4gIGxpc3RfZW50cmFuY2VfYWN0aW9ucyh3aGljaFN0YXRlIDogbU5UID0gdGhpcy5zdGF0ZSgpICkgOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gWy4uLiAodGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5nZXQod2hpY2hTdGF0ZSkgfHwgbmV3IE1hcCgpKS52YWx1ZXMoKV0gLy8gd2FzdGVmdWxcbiAgICAgICAgICAgLm1hcCggKGVkZ2VJZDphbnkpID0+ICh0aGlzLl9lZGdlc1tlZGdlSWRdIDogYW55KSkgLy8gd2hhcmdhcmJsIGJ1cm4gb3V0IGFueVxuICAgICAgICAgICAuZmlsdGVyKCAobzphbnkpID0+IG8udG8gPT09IHdoaWNoU3RhdGUpXG4gICAgICAgICAgIC5tYXAoIGZpbHRlcmVkID0+IGZpbHRlcmVkLmZyb20gKTtcbiAgfVxuKi9cbiAgbGlzdF9leGl0X2FjdGlvbnMod2hpY2hTdGF0ZSA6IG1OVCA9IHRoaXMuc3RhdGUoKSApIDogQXJyYXk8P21OVD4geyAvLyB0aGVzZSBhcmUgbU5ULCBub3QgP21OVFxuICAgIGNvbnN0IHJhX2Jhc2UgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKCEocmFfYmFzZSkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cblxuICAgIHJldHVybiBbLi4uIHJhX2Jhc2UudmFsdWVzKCldXG4gICAgICAgICAgIC5tYXAgICAgKCAoZWRnZUlkOm51bWJlcikgICAgICAgICAgICAgIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMuX2VkZ2VzW2VkZ2VJZF0gICApXG4gICAgICAgICAgIC5maWx0ZXIgKCAobzpKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pIDogYm9vbGVhbiAgICAgICAgICAgICAgICAgID0+IG8uZnJvbSA9PT0gd2hpY2hTdGF0ZSApXG4gICAgICAgICAgIC5tYXAgICAgKCAoZmlsdGVyZWQgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pIDogP21OVCAgICAgICAgICAgID0+IGZpbHRlcmVkLmFjdGlvbiAgICAgICApO1xuICB9XG5cbiAgcHJvYmFibGVfYWN0aW9uX2V4aXRzKHdoaWNoU3RhdGUgOiBtTlQgPSB0aGlzLnN0YXRlKCkgKSA6IEFycmF5PG1peGVkPiB7IC8vIHRoZXNlIGFyZSBtTlRcbiAgICBjb25zdCByYV9iYXNlIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICghKHJhX2Jhc2UpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG5cbiAgICByZXR1cm4gWy4uLiByYV9iYXNlLnZhbHVlcygpXVxuICAgICAgICAgICAubWFwICAgICggKGVkZ2VJZDpudW1iZXIpIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMuX2VkZ2VzW2VkZ2VJZF0gICApXG4gICAgICAgICAgIC5maWx0ZXIgKCAobzpKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pIDogYm9vbGVhbiAgICAgPT4gby5mcm9tID09PSB3aGljaFN0YXRlIClcbiAgICAgICAgICAgLm1hcCAgICAoIChmaWx0ZXJlZCkgOiBtaXhlZCAgICAgICAgICAgICAgICAgICAgICAgICA9PiAoIHsgYWN0aW9uICAgICAgOiBmaWx0ZXJlZC5hY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2JhYmlsaXR5IDogZmlsdGVyZWQucHJvYmFiaWxpdHkgfSApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgfVxuXG5cblxuICBpc191bmVudGVyYWJsZSh3aGljaFN0YXRlIDogbU5UKSA6IGJvb2xlYW4ge1xuICAgIC8vIHdoYXJnYXJibCBzaG91bGQgdGhyb3cgb24gdW5rbm93biBzdGF0ZVxuICAgIHJldHVybiB0aGlzLmxpc3RfZW50cmFuY2VzKHdoaWNoU3RhdGUpLmxlbmd0aCA9PT0gMDtcbiAgfVxuXG4gIGhhc191bmVudGVyYWJsZXMoKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlcygpLnNvbWUoICh4KSA6IGJvb2xlYW4gPT4gdGhpcy5pc191bmVudGVyYWJsZSh4KSk7XG4gIH1cblxuXG5cbiAgaXNfdGVybWluYWwoKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlX2lzX3Rlcm1pbmFsKHRoaXMuc3RhdGUoKSk7XG4gIH1cblxuICBzdGF0ZV9pc190ZXJtaW5hbCh3aGljaFN0YXRlIDogbU5UKSA6IGJvb2xlYW4ge1xuICAgIC8vIHdoYXJnYXJibCBzaG91bGQgdGhyb3cgb24gdW5rbm93biBzdGF0ZVxuICAgIHJldHVybiB0aGlzLmxpc3RfZXhpdHMod2hpY2hTdGF0ZSkubGVuZ3RoID09PSAwO1xuICB9XG5cbiAgaGFzX3Rlcm1pbmFscygpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpIDogYm9vbGVhbiA9PiB0aGlzLnN0YXRlX2lzX3Rlcm1pbmFsKHgpKTtcbiAgfVxuXG5cblxuICBpc19jb21wbGV0ZSgpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVfaXNfY29tcGxldGUodGhpcy5zdGF0ZSgpKTtcbiAgfVxuXG4gIHN0YXRlX2lzX2NvbXBsZXRlKHdoaWNoU3RhdGUgOiBtTlQpIDogYm9vbGVhbiB7XG4gICAgY29uc3Qgd3N0YXRlIDogP0pzc21HZW5lcmljU3RhdGU8bU5UPiA9IHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHdzdGF0ZSkgeyByZXR1cm4gd3N0YXRlLmNvbXBsZXRlOyB9XG4gICAgZWxzZSAgICAgICAgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuICB9XG5cbiAgaGFzX2NvbXBsZXRlcygpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpIDogYm9vbGVhbiA9PiB0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHgpICk7XG4gIH1cblxuXG5cbiAgYWN0aW9uKG5hbWUgOiBtTlQsIG5ld0RhdGE/IDogbURUKSA6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX2FjdGlvbihuYW1lLCBuZXdEYXRhKSkge1xuICAgICAgY29uc3QgZWRnZSA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHRoaXMuY3VycmVudF9hY3Rpb25fZWRnZV9mb3IobmFtZSk7XG4gICAgICB0aGlzLl9zdGF0ZSA9IGVkZ2UudG87XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHRyYW5zaXRpb24obmV3U3RhdGUgOiBtTlQsIG5ld0RhdGE/IDogbURUKSA6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX3RyYW5zaXRpb24obmV3U3RhdGUsIG5ld0RhdGEpKSB7XG4gICAgICB0aGlzLl9zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvLyBjYW4gbGVhdmUgbWFjaGluZSBpbiBpbmNvbnNpc3RlbnQgc3RhdGUuICBnZW5lcmFsbHkgZG8gbm90IHVzZVxuICBmb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlIDogbU5ULCBuZXdEYXRhPyA6IG1EVCkgOiBib29sZWFuIHtcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBpZiAodGhpcy52YWxpZF9mb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlLCBuZXdEYXRhKSkge1xuICAgICAgdGhpcy5fc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cblxuXG4gIGN1cnJlbnRfYWN0aW9uX2ZvcihhY3Rpb24gOiBtTlQpIDogbnVtYmVyIHwgdm9pZCB7XG4gICAgY29uc3QgYWN0aW9uX2Jhc2UgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KGFjdGlvbik7XG4gICAgcmV0dXJuIGFjdGlvbl9iYXNlPyBhY3Rpb25fYmFzZS5nZXQodGhpcy5zdGF0ZSgpKSA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGN1cnJlbnRfYWN0aW9uX2VkZ2VfZm9yKGFjdGlvbiA6IG1OVCkgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4ge1xuICAgIGNvbnN0IGlkeCA6ID9udW1iZXIgPSB0aGlzLmN1cnJlbnRfYWN0aW9uX2ZvcihhY3Rpb24pO1xuICAgIGlmICgoaWR4ID09PSB1bmRlZmluZWQpIHx8IChpZHggPT09IG51bGwpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBhY3Rpb24gJHtKU09OLnN0cmluZ2lmeShhY3Rpb24pfWApOyB9XG4gICAgcmV0dXJuIHRoaXMuX2VkZ2VzW2lkeF07XG4gIH1cblxuICB2YWxpZF9hY3Rpb24oYWN0aW9uIDogbU5ULCBfbmV3RGF0YT8gOiBtRFQpIDogYm9vbGVhbiB7ICAvLyB0b2RvIGNvbWViYWNrIHVuaWdub3JlIG5ld0RhdGFcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50X2FjdGlvbl9mb3IoYWN0aW9uKSAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgdmFsaWRfdHJhbnNpdGlvbihuZXdTdGF0ZSA6IG1OVCwgX25ld0RhdGE/IDogbURUKSA6IGJvb2xlYW4geyAgLy8gdG9kbyBjb21lYmFjayB1bmlnbm9yZSBuZXdEYXRhXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgY29uc3QgdHJhbnNpdGlvbl9mb3IgOiA/SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gdGhpcy5sb29rdXBfdHJhbnNpdGlvbl9mb3IodGhpcy5zdGF0ZSgpLCBuZXdTdGF0ZSk7XG5cbiAgICBpZiAoISh0cmFuc2l0aW9uX2ZvcikpICAgICAgICAgIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgaWYgKHRyYW5zaXRpb25fZm9yLmZvcmNlZF9vbmx5KSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfVxuXG4gIHZhbGlkX2ZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGUgOiBtTlQsIF9uZXdEYXRhPyA6IG1EVCkgOiBib29sZWFuIHsgIC8vIHRvZG8gY29tZWJhY2sgdW5pZ25vcmUgbmV3RGF0YVxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIHJldHVybiAodGhpcy5sb29rdXBfdHJhbnNpdGlvbl9mb3IodGhpcy5zdGF0ZSgpLCBuZXdTdGF0ZSkgIT09IHVuZGVmaW5lZCk7XG4gIH1cblxuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gc208bU5ULCBtRFQ+KHRlbXBsYXRlX3N0cmluZ3MgOiBBcnJheTxzdHJpbmc+IC8qICwgYXJndW1lbnRzICovKSA6IE1hY2hpbmU8bU5ULCBtRFQ+IHtcblxuICAgIC8vIGZvb2BhJHsxfWIkezJ9Y2Agd2lsbCBjb21lIGluIGFzIChbJ2EnLCdiJywnYyddLDEsMilcbiAgICAvLyB0aGlzIGluY2x1ZGVzIHdoZW4gYSBhbmQgYyBhcmUgZW1wdHkgc3RyaW5nc1xuICAgIC8vIHRoZXJlZm9yZSB0ZW1wbGF0ZV9zdHJpbmdzIHdpbGwgYWx3YXlzIGhhdmUgb25lIG1vcmUgZWwgdGhhbiB0ZW1wbGF0ZV9hcmdzXG4gICAgLy8gdGhlcmVmb3JlIG1hcCB0aGUgc21hbGxlciBjb250YWluZXIgYW5kIHRvc3MgdGhlIGxhc3Qgb25lIG9uIG9uIHRoZSB3YXkgb3V0XG5cbiAgICByZXR1cm4gbmV3IE1hY2hpbmUobWFrZSh0ZW1wbGF0ZV9zdHJpbmdzLnJlZHVjZShcblxuICAgICAgLy8gaW4gZ2VuZXJhbCBhdm9pZGluZyBgYXJndW1lbnRzYCBpcyBzbWFydC4gIGhvd2V2ZXIgd2l0aCB0aGUgdGVtcGxhdGVcbiAgICAgIC8vIHN0cmluZyBub3RhdGlvbiwgYXMgZGVzaWduZWQsIGl0J3Mgbm90IHJlYWxseSB3b3J0aCB0aGUgaGFzc2xlXG5cbiAgICAgIC8qIGVzbGludC1kaXNhYmxlIGZwL25vLWFyZ3VtZW50cyAqL1xuICAgICAgLyogZXNsaW50LWRpc2FibGUgcHJlZmVyLXJlc3QtcGFyYW1zICovXG4gICAgICAoYWNjLCB2YWwsIGlkeCkgOiBzdHJpbmcgPT4gYCR7YWNjfSR7YXJndW1lbnRzW2lkeF19JHt2YWx9YCAgLy8gYXJndW1lbnRzWzBdIGlzIG5ldmVyIGxvYWRlZCwgc28gYXJncyBkb2Vzbid0IG5lZWQgdG8gYmUgZ2F0ZWRcbiAgICAgIC8qIGVzbGludC1lbmFibGUgIHByZWZlci1yZXN0LXBhcmFtcyAqL1xuICAgICAgLyogZXNsaW50LWVuYWJsZSAgZnAvbm8tYXJndW1lbnRzICovXG5cbiAgICApKSk7XG5cbn1cblxuXG5cblxuXG5leHBvcnQge1xuXG4gIHZlcnNpb24sXG5cbiAgTWFjaGluZSxcblxuICBtYWtlLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG5cbiAgc20sXG5cbiAgYXJyb3dfZGlyZWN0aW9uLFxuICBhcnJvd19sZWZ0X2tpbmQsXG4gIGFycm93X3JpZ2h0X2tpbmQsXG5cbiAgLy8gdG9kbyB3aGFyZ2FyYmwgdGhlc2Ugc2hvdWxkIGJlIGV4cG9ydGVkIHRvIGEgdXRpbGl0eSBsaWJyYXJ5XG4gIHNlcSwgd2VpZ2h0ZWRfcmFuZF9zZWxlY3QsIGhpc3RvZ3JhcGgsIHdlaWdodGVkX3NhbXBsZV9zZWxlY3QsIHdlaWdodGVkX2hpc3RvX2tleVxuXG59O1xuIl19