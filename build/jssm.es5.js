'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.weighted_histo_key = exports.weighted_sample_select = exports.histograph = exports.weighted_rand_select = exports.seq = exports.arrow_right_kind = exports.arrow_left_kind = exports.arrow_direction = exports.sm = exports.compile = exports.parse = exports.make = exports.Machine = exports.transfer_state_properties = exports.version = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _jssmUtil = require('./jssm-util.js');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// whargarbl lots of these return arrays could/should be sets

var reduce_to_639 = require('reduce-to-639-1').reduce;

var parse = require('./jssm-dot.js').parse; // eslint-disable-line flowtype/no-weak-types // todo whargarbl remove any

var version = '5.14.0'; // replaced from package.js in build


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

function makeTransition(this_se, from, to, isRight, wasList, wasIndex) {

  var kind = isRight ? arrow_right_kind(this_se.kind) : arrow_left_kind(this_se.kind),
      edge = {
    from: from,
    to: to,
    kind: kind,
    forced_only: kind === 'forced',
    main_path: kind === 'main'
  };

  if (wasList !== undefined && wasIndex === undefined) {
    throw "Must have an index if transition was in a list";
  }
  if (wasIndex !== undefined && wasList === undefined) {
    throw "Must be in a list if transition has an index";
  }
  /*
    if (typeof edge.to === 'object') {
  
      if (edge.to.key === 'cycle') {
        if (wasList === undefined) { throw "Must have a waslist if a to is type cycle"; }
        const nextIndex = wrapBy(wasIndex, edge.to.value, wasList.length);
        edge.to = wasList[nextIndex];
      }
  
    }
  */
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

function transfer_state_properties(state_decl) {

  state_decl.declarations.map(function (d) {
    switch (d.key) {

      case 'node_shape':
        state_decl.node_shape = d.value;break;
      case 'node_color':
        state_decl.node_color = d.value;break;

      default:
        throw new Error('Unknown state property: \'' + JSON.stringify(d) + '\'');

    }
  });

  return state_decl;
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

    if (state_declaration) {
      state_declaration.map(function (state_decl) {

        if (_this._state_declarations.has(state_decl.state)) {
          // no repeats
          throw new Error('Added the same state declaration twice: ' + JSON.stringify(state_decl.state));
        }

        _this._state_declarations.set(state_decl.state, transfer_state_properties(state_decl));
      });
    }

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
    key: 'raw_state_declarations',
    value: function raw_state_declarations() {
      // eslint-disable-line flowtype/no-weak-types
      return this._raw_state_declaration;
    }
  }, {
    key: 'state_declaration',
    value: function state_declaration(which) {
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
exports.transfer_state_properties = transfer_state_properties;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLmpzIl0sIm5hbWVzIjpbInJlZHVjZV90b182MzkiLCJyZXF1aXJlIiwicmVkdWNlIiwicGFyc2UiLCJ2ZXJzaW9uIiwiYXJyb3dfZGlyZWN0aW9uIiwiYXJyb3ciLCJTdHJpbmciLCJFcnJvciIsImFycm93X2xlZnRfa2luZCIsImFycm93X3JpZ2h0X2tpbmQiLCJtYWtlVHJhbnNpdGlvbiIsInRoaXNfc2UiLCJmcm9tIiwidG8iLCJpc1JpZ2h0Iiwid2FzTGlzdCIsIndhc0luZGV4Iiwia2luZCIsImVkZ2UiLCJmb3JjZWRfb25seSIsIm1haW5fcGF0aCIsInVuZGVmaW5lZCIsImFjdGlvbiIsInByb2JhYmlsaXR5IiwiY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcCIsImFjYyIsIm5leHRfc2UiLCJlZGdlcyIsInVGcm9tIiwiQXJyYXkiLCJpc0FycmF5IiwidVRvIiwibWFwIiwiZiIsInQiLCJyaWdodCIsInB1c2giLCJsZWZ0IiwibmV3X2FjYyIsImNvbmNhdCIsInNlIiwiY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uIiwicnVsZSIsImNvbXBpbGVfcnVsZV9oYW5kbGVyIiwia2V5IiwiYWdnX2FzIiwidmFsIiwidmFsdWUiLCJuYW1lIiwic3RhdGUiLCJkZWNsYXJhdGlvbnMiLCJ0YXV0b2xvZ2llcyIsImluY2x1ZGVzIiwiSlNPTiIsInN0cmluZ2lmeSIsImNvbXBpbGUiLCJ0cmVlIiwicmVzdWx0cyIsImdyYXBoX2xheW91dCIsInRyYW5zaXRpb24iLCJzdGFydF9zdGF0ZXMiLCJlbmRfc3RhdGVzIiwic3RhdGVfZGVjbGFyYXRpb24iLCJmc2xfdmVyc2lvbiIsIm1hY2hpbmVfYXV0aG9yIiwibWFjaGluZV9jb21tZW50IiwibWFjaGluZV9jb250cmlidXRvciIsIm1hY2hpbmVfZGVmaW5pdGlvbiIsIm1hY2hpbmVfbGFuZ3VhZ2UiLCJtYWNoaW5lX2xpY2Vuc2UiLCJtYWNoaW5lX25hbWUiLCJtYWNoaW5lX3JlZmVyZW5jZSIsIm1hY2hpbmVfdmVyc2lvbiIsInRyIiwiYXNzZW1ibGVkX3RyYW5zaXRpb25zIiwicmVzdWx0X2NmZyIsImxlbmd0aCIsInRyYW5zaXRpb25zIiwib25lT25seUtleXMiLCJvbmVPbmx5S2V5IiwibXVsdGlLZXkiLCJtYWtlIiwicGxhbiIsInRyYW5zZmVyX3N0YXRlX3Byb3BlcnRpZXMiLCJzdGF0ZV9kZWNsIiwiZCIsIm5vZGVfc2hhcGUiLCJub2RlX2NvbG9yIiwiTWFjaGluZSIsImNvbXBsZXRlIiwiX3N0YXRlIiwiX3N0YXRlcyIsIk1hcCIsIl9zdGF0ZV9kZWNsYXJhdGlvbnMiLCJfZWRnZXMiLCJfZWRnZV9tYXAiLCJfbmFtZWRfdHJhbnNpdGlvbnMiLCJfYWN0aW9ucyIsIl9yZXZlcnNlX2FjdGlvbnMiLCJfcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyIsIl9tYWNoaW5lX2F1dGhvciIsIl9tYWNoaW5lX2NvbW1lbnQiLCJfbWFjaGluZV9jb250cmlidXRvciIsIl9tYWNoaW5lX2RlZmluaXRpb24iLCJfbWFjaGluZV9sYW5ndWFnZSIsIl9tYWNoaW5lX2xpY2Vuc2UiLCJfbWFjaGluZV9uYW1lIiwiX21hY2hpbmVfdmVyc2lvbiIsIl9yYXdfc3RhdGVfZGVjbGFyYXRpb24iLCJfZnNsX3ZlcnNpb24iLCJfZ3JhcGhfbGF5b3V0IiwiaGFzIiwic2V0IiwiY3Vyc29yX2Zyb20iLCJnZXQiLCJfbmV3X3N0YXRlIiwiY3Vyc29yX3RvIiwidGhpc0VkZ2VJZCIsImZyb21fbWFwcGluZyIsImFjdGlvbk1hcCIsInJBY3Rpb25NYXAiLCJzdGF0ZV9jb25maWciLCJ3aGljaFN0YXRlIiwic3RhdGVfaXNfdGVybWluYWwiLCJzdGF0ZV9pc19jb21wbGV0ZSIsInN0YXRlX2lzX2ZpbmFsIiwid2hpY2giLCJpbnRlcm5hbF9zdGF0ZV9pbXBsX3ZlcnNpb24iLCJhY3Rpb25zIiwiZWRnZV9tYXAiLCJuYW1lZF90cmFuc2l0aW9ucyIsInJldmVyc2VfYWN0aW9ucyIsInN0YXRlcyIsImtleXMiLCJlbWciLCJpZCIsImdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzIiwiZW50cmFuY2VzIiwibGlzdF9lbnRyYW5jZXMiLCJleGl0cyIsImxpc3RfZXhpdHMiLCJ3c3RhdGUiLCJ3c3RhdGVfdG8iLCJ3dGYiLCJ3cyIsImxvb2t1cF90cmFuc2l0aW9uX2ZvciIsImZpbHRlciIsIkJvb2xlYW4iLCJzZWxlY3RlZCIsInByb2JhYmxlX2V4aXRzX2ZvciIsIm4iLCJzdGF0ZV93YXMiLCJwcm9iYWJpbGlzdGljX3RyYW5zaXRpb24iLCJwcm9iYWJpbGlzdGljX3dhbGsiLCJyYV9iYXNlIiwidmFsdWVzIiwiZWRnZUlkIiwibyIsImZpbHRlcmVkIiwic29tZSIsIngiLCJpc191bmVudGVyYWJsZSIsIm5ld0RhdGEiLCJ2YWxpZF9hY3Rpb24iLCJjdXJyZW50X2FjdGlvbl9lZGdlX2ZvciIsIm5ld1N0YXRlIiwidmFsaWRfdHJhbnNpdGlvbiIsInZhbGlkX2ZvcmNlX3RyYW5zaXRpb24iLCJhY3Rpb25fYmFzZSIsImlkeCIsImN1cnJlbnRfYWN0aW9uX2ZvciIsIl9uZXdEYXRhIiwidHJhbnNpdGlvbl9mb3IiLCJzbSIsInRlbXBsYXRlX3N0cmluZ3MiLCJzZXEiLCJ3ZWlnaHRlZF9yYW5kX3NlbGVjdCIsImhpc3RvZ3JhcGgiLCJ3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0Iiwid2VpZ2h0ZWRfaGlzdG9fa2V5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUE0QkE7Ozs7OztBQTNCQTs7QUFJQSxJQUFNQSxnQkFBMkJDLFFBQVEsaUJBQVIsRUFBMkJDLE1BQTVEOztBQXlCQSxJQUFNQyxRQUFrQkYsUUFBUSxlQUFSLEVBQXlCRSxLQUFqRCxDLENBQXlEOztBQUV6RCxJQUFNQyxVQUFnQixJQUF0QixDLENBQTRCOzs7QUFNNUI7O0FBRUEsU0FBU0MsZUFBVCxDQUF5QkMsS0FBekIsRUFBK0Q7O0FBRTdELFVBQVNDLE9BQU9ELEtBQVAsQ0FBVDs7QUFFRSxTQUFLLElBQUwsQ0FBZSxLQUFLLEdBQUw7QUFD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Q0Q7Ozs7OztBQVNILFNBQVN3SixFQUFULENBQXNCQyxnQkFBdEIsQ0FBc0QsaUJBQXRELEVBQTRGO0FBQUE7OztBQUV4RjtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxTQUFPLElBQUl0RixPQUFKLENBQVlQLEtBQUs2RixpQkFBaUI3SyxNQUFqQjs7QUFFdEI7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsWUFBQ3dCLEdBQUQsRUFBTXFCLEdBQU4sRUFBVzJILEdBQVg7QUFBQSxnQkFBOEJoSixHQUE5QixHQUFvQyxXQUFVZ0osR0FBVixDQUFwQyxHQUFxRDNILEdBQXJEO0FBQUEsR0FQc0IsQ0FPc0M7QUFDNUQ7QUFDQTs7QUFUc0IsR0FBTCxDQUFaLENBQVA7QUFhSDs7UUFRQzNDLE8sR0FBQUEsTztRQUVBZ0YseUIsR0FBQUEseUI7UUFFQUssTyxHQUFBQSxPO1FBRUFQLEksR0FBQUEsSTtRQUNFL0UsSyxHQUFBQSxLO1FBQ0FxRCxPLEdBQUFBLE87UUFFRnNILEUsR0FBQUEsRTtRQUVBekssZSxHQUFBQSxlO1FBQ0FJLGUsR0FBQUEsZTtRQUNBQyxnQixHQUFBQSxnQjtRQUdBc0ssRztRQUFLQyxvQjtRQUFzQkMsVTtRQUFZQyxzQjtRQUF3QkMsa0IiLCJmaWxlIjoianNzbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLy8gd2hhcmdhcmJsIGxvdHMgb2YgdGhlc2UgcmV0dXJuIGFycmF5cyBjb3VsZC9zaG91bGQgYmUgc2V0c1xuXG4vLyBAZmxvd1xuXG5jb25zdCByZWR1Y2VfdG9fNjM5IDogRnVuY3Rpb24gPSByZXF1aXJlKCdyZWR1Y2UtdG8tNjM5LTEnKS5yZWR1Y2U7XG5cblxuXG5cblxuaW1wb3J0IHR5cGUge1xuXG4gIEpzc21HZW5lcmljU3RhdGUsIEpzc21HZW5lcmljQ29uZmlnLFxuICBKc3NtVHJhbnNpdGlvbiwgSnNzbVRyYW5zaXRpb25MaXN0LFxuICBKc3NtTWFjaGluZUludGVybmFsU3RhdGUsXG4gIEpzc21QYXJzZVRyZWUsXG4gIEpzc21TdGF0ZURlY2xhcmF0aW9uLCBKc3NtU3RhdGVEZWNsYXJhdGlvblJ1bGUsXG4gIEpzc21Db21waWxlU2UsIEpzc21Db21waWxlU2VTdGFydCwgSnNzbUNvbXBpbGVSdWxlLFxuICBKc3NtQXJyb3csIEpzc21BcnJvd0RpcmVjdGlvbiwgSnNzbUFycm93S2luZCxcbiAgSnNzbUxheW91dFxuXG59IGZyb20gJy4vanNzbS10eXBlcyc7XG5cblxuXG5cblxuaW1wb3J0IHsgc2VxLCB3ZWlnaHRlZF9yYW5kX3NlbGVjdCwgd2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCwgaGlzdG9ncmFwaCwgd2VpZ2h0ZWRfaGlzdG9fa2V5IH0gZnJvbSAnLi9qc3NtLXV0aWwuanMnO1xuXG5jb25zdCBwYXJzZTogRnVuY3Rpb24gPSByZXF1aXJlKCcuL2pzc20tZG90LmpzJykucGFyc2U7ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXMgLy8gdG9kbyB3aGFyZ2FyYmwgcmVtb3ZlIGFueVxuXG5jb25zdCB2ZXJzaW9uOiBudWxsID0gbnVsbDsgLy8gcmVwbGFjZWQgZnJvbSBwYWNrYWdlLmpzIGluIGJ1aWxkXG5cblxuXG5cblxuLyogZXNsaW50LWRpc2FibGUgY29tcGxleGl0eSAqL1xuXG5mdW5jdGlvbiBhcnJvd19kaXJlY3Rpb24oYXJyb3c6IEpzc21BcnJvdyk6IEpzc21BcnJvd0RpcmVjdGlvbiB7XG5cbiAgc3dpdGNoICggU3RyaW5nKGFycm93KSApIHtcblxuICAgIGNhc2UgJy0+JyA6ICAgIGNhc2UgJ+KGkicgOlxuICAgIGNhc2UgJz0+JyA6ICAgIGNhc2UgJ+KHkicgOlxuICAgIGNhc2UgJ34+JyA6ICAgIGNhc2UgJ+KGmycgOlxuICAgICAgcmV0dXJuICdyaWdodCc7XG5cbiAgICBjYXNlICc8LScgOiAgICBjYXNlICfihpAnIDpcbiAgICBjYXNlICc8PScgOiAgICBjYXNlICfih5AnIDpcbiAgICBjYXNlICc8ficgOiAgICBjYXNlICfihponIDpcbiAgICAgIHJldHVybiAnbGVmdCc7XG5cbiAgICBjYXNlICc8LT4nOiAgICBjYXNlICfihpQnIDpcbiAgICBjYXNlICc8LT0+JzogICBjYXNlICfihpDih5InIDpcbiAgICBjYXNlICc8LX4+JzogICBjYXNlICfihpDihpsnIDpcblxuICAgIGNhc2UgJzw9Pic6ICAgIGNhc2UgJ+KHlCcgOlxuICAgIGNhc2UgJzw9LT4nOiAgIGNhc2UgJ+KHkOKGkicgOlxuICAgIGNhc2UgJzw9fj4nOiAgIGNhc2UgJ+KHkOKGmycgOlxuXG4gICAgY2FzZSAnPH4+JzogICAgY2FzZSAn4oauJyA6XG4gICAgY2FzZSAnPH4tPic6ICAgY2FzZSAn4oaa4oaSJyA6XG4gICAgY2FzZSAnPH49Pic6ICAgY2FzZSAn4oaa4oeSJyA6XG4gICAgICByZXR1cm4gJ2JvdGgnO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXJyb3dfZGlyZWN0aW9uOiB1bmtub3duIGFycm93IHR5cGUgJHthcnJvd31gKTtcblxuICB9XG5cbn1cblxuLyogZXNsaW50LWVuYWJsZSBjb21wbGV4aXR5ICovXG5cblxuXG5cblxuLyogZXNsaW50LWRpc2FibGUgY29tcGxleGl0eSAqL1xuXG5mdW5jdGlvbiBhcnJvd19sZWZ0X2tpbmQoYXJyb3c6IEpzc21BcnJvdyk6IEpzc21BcnJvd0tpbmQge1xuXG4gIHN3aXRjaCAoIFN0cmluZyhhcnJvdykgKSB7XG5cbiAgICBjYXNlICctPicgOiAgICBjYXNlICfihpInIDpcbiAgICBjYXNlICc9PicgOiAgICBjYXNlICfih5InIDpcbiAgICBjYXNlICd+PicgOiAgICBjYXNlICfihpsnIDpcbiAgICAgIHJldHVybiAnbm9uZSc7XG5cbiAgICBjYXNlICc8LSc6ICAgICBjYXNlICfihpAnIDpcbiAgICBjYXNlICc8LT4nOiAgICBjYXNlICfihpQnIDpcbiAgICBjYXNlICc8LT0+JzogICBjYXNlICfihpDih5InIDpcbiAgICBjYXNlICc8LX4+JzogICBjYXNlICfihpDihpsnIDpcbiAgICAgIHJldHVybiAnbGVnYWwnO1xuXG4gICAgY2FzZSAnPD0nOiAgICAgY2FzZSAn4oeQJyA6XG4gICAgY2FzZSAnPD0+JzogICAgY2FzZSAn4oeUJyA6XG4gICAgY2FzZSAnPD0tPic6ICAgY2FzZSAn4oeQ4oaSJyA6XG4gICAgY2FzZSAnPD1+Pic6ICAgY2FzZSAn4oeQ4oabJyA6XG4gICAgICByZXR1cm4gJ21haW4nO1xuXG4gICAgY2FzZSAnPH4nOiAgICAgY2FzZSAn4oaaJyA6XG4gICAgY2FzZSAnPH4+JzogICAgY2FzZSAn4oauJyA6XG4gICAgY2FzZSAnPH4tPic6ICAgY2FzZSAn4oaa4oaSJyA6XG4gICAgY2FzZSAnPH49Pic6ICAgY2FzZSAn4oaa4oeSJyA6XG4gICAgICByZXR1cm4gJ2ZvcmNlZCc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcnJvd19kaXJlY3Rpb246IHVua25vd24gYXJyb3cgdHlwZSAke2Fycm93fWApO1xuXG4gIH1cblxufVxuXG4vKiBlc2xpbnQtZW5hYmxlIGNvbXBsZXhpdHkgKi9cblxuXG5cblxuXG4vKiBlc2xpbnQtZGlzYWJsZSBjb21wbGV4aXR5ICovXG5cbmZ1bmN0aW9uIGFycm93X3JpZ2h0X2tpbmQoYXJyb3c6IEpzc21BcnJvdyk6IEpzc21BcnJvd0tpbmQge1xuXG4gIHN3aXRjaCAoIFN0cmluZyhhcnJvdykgKSB7XG5cbiAgICBjYXNlICc8LScgOiAgICBjYXNlICfihpAnIDpcbiAgICBjYXNlICc8PScgOiAgICBjYXNlICfih5AnIDpcbiAgICBjYXNlICc8ficgOiAgICBjYXNlICfihponIDpcbiAgICAgIHJldHVybiAnbm9uZSc7XG5cbiAgICBjYXNlICctPicgOiAgICBjYXNlICfihpInIDpcbiAgICBjYXNlICc8LT4nOiAgICBjYXNlICfihpQnIDpcbiAgICBjYXNlICc8PS0+JzogICBjYXNlICfih5DihpInIDpcbiAgICBjYXNlICc8fi0+JzogICBjYXNlICfihprihpInIDpcbiAgICAgIHJldHVybiAnbGVnYWwnO1xuXG4gICAgY2FzZSAnPT4nIDogICAgY2FzZSAn4oeSJyA6XG4gICAgY2FzZSAnPD0+JzogICAgY2FzZSAn4oeUJyA6XG4gICAgY2FzZSAnPC09Pic6ICAgY2FzZSAn4oaQ4oeSJyA6XG4gICAgY2FzZSAnPH49Pic6ICAgY2FzZSAn4oaa4oeSJyA6XG4gICAgICByZXR1cm4gJ21haW4nO1xuXG4gICAgY2FzZSAnfj4nIDogICAgY2FzZSAn4oabJyA6XG4gICAgY2FzZSAnPH4+JzogICAgY2FzZSAn4oauJyA6XG4gICAgY2FzZSAnPC1+Pic6ICAgY2FzZSAn4oaQ4oabJyA6XG4gICAgY2FzZSAnPD1+Pic6ICAgY2FzZSAn4oeQ4oabJyA6XG4gICAgICByZXR1cm4gJ2ZvcmNlZCc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcnJvd19kaXJlY3Rpb246IHVua25vd24gYXJyb3cgdHlwZSAke2Fycm93fWApO1xuXG4gIH1cblxufVxuXG4vKiBlc2xpbnQtZW5hYmxlIGNvbXBsZXhpdHkgKi9cblxuXG5cblxuXG5mdW5jdGlvbiBtYWtlVHJhbnNpdGlvbjxtTlQsIG1EVD4oXG4gIHRoaXNfc2UgICA6IEpzc21Db21waWxlU2U8bU5UPixcbiAgZnJvbSAgICAgIDogbU5ULFxuICB0byAgICAgICAgOiBtTlQsXG4gIGlzUmlnaHQgICA6IGJvb2xlYW4sXG4gIHdhc0xpc3Q/ICA6IEFycmF5PG1OVD4sXG4gIHdhc0luZGV4PyA6IG51bWJlclxuKSA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiB7XG5cbiAgY29uc3Qga2luZCA6IEpzc21BcnJvd0tpbmQgICAgICAgICAgICA9IGlzUmlnaHQ/IGFycm93X3JpZ2h0X2tpbmQodGhpc19zZS5raW5kKSA6IGFycm93X2xlZnRfa2luZCh0aGlzX3NlLmtpbmQpLFxuICAgICAgICBlZGdlIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0ge1xuICAgICAgICAgIGZyb20sXG4gICAgICAgICAgdG8sXG4gICAgICAgICAga2luZCxcbiAgICAgICAgICBmb3JjZWRfb25seSA6IGtpbmQgPT09ICdmb3JjZWQnLFxuICAgICAgICAgIG1haW5fcGF0aCAgIDoga2luZCA9PT0gJ21haW4nXG4gICAgICAgIH07XG5cbiAgaWYgKCh3YXNMaXN0ICE9PSB1bmRlZmluZWQpICAmJiAod2FzSW5kZXggPT09IHVuZGVmaW5lZCkpIHsgdGhyb3cgXCJNdXN0IGhhdmUgYW4gaW5kZXggaWYgdHJhbnNpdGlvbiB3YXMgaW4gYSBsaXN0XCI7IH1cbiAgaWYgKCh3YXNJbmRleCAhPT0gdW5kZWZpbmVkKSAmJiAod2FzTGlzdCA9PT0gdW5kZWZpbmVkKSkgIHsgdGhyb3cgXCJNdXN0IGJlIGluIGEgbGlzdCBpZiB0cmFuc2l0aW9uIGhhcyBhbiBpbmRleFwiOyAgIH1cbi8qXG4gIGlmICh0eXBlb2YgZWRnZS50byA9PT0gJ29iamVjdCcpIHtcblxuICAgIGlmIChlZGdlLnRvLmtleSA9PT0gJ2N5Y2xlJykge1xuICAgICAgaWYgKHdhc0xpc3QgPT09IHVuZGVmaW5lZCkgeyB0aHJvdyBcIk11c3QgaGF2ZSBhIHdhc2xpc3QgaWYgYSB0byBpcyB0eXBlIGN5Y2xlXCI7IH1cbiAgICAgIGNvbnN0IG5leHRJbmRleCA9IHdyYXBCeSh3YXNJbmRleCwgZWRnZS50by52YWx1ZSwgd2FzTGlzdC5sZW5ndGgpO1xuICAgICAgZWRnZS50byA9IHdhc0xpc3RbbmV4dEluZGV4XTtcbiAgICB9XG5cbiAgfVxuKi9cbiAgY29uc3QgYWN0aW9uICAgICAgOiBzdHJpbmcgPSBpc1JpZ2h0PyAncl9hY3Rpb24nICAgICAgOiAnbF9hY3Rpb24nLFxuICAgICAgICBwcm9iYWJpbGl0eSA6IHN0cmluZyA9IGlzUmlnaHQ/ICdyX3Byb2JhYmlsaXR5JyA6ICdsX3Byb2JhYmlsaXR5JztcblxuICBpZiAodGhpc19zZVthY3Rpb25dKSAgICAgIHsgZWRnZS5hY3Rpb24gICAgICA9IHRoaXNfc2VbYWN0aW9uXTsgICAgICB9XG4gIGlmICh0aGlzX3NlW3Byb2JhYmlsaXR5XSkgeyBlZGdlLnByb2JhYmlsaXR5ID0gdGhpc19zZVtwcm9iYWJpbGl0eV07IH1cblxuICByZXR1cm4gZWRnZTtcblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXA8bU5ULCBtRFQ+KFxuICAgICAgICAgICAgIGFjYyAgICAgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4sXG4gICAgICAgICAgICAgZnJvbSAgICA6IG1OVCxcbiAgICAgICAgICAgICB0byAgICAgIDogbU5ULFxuICAgICAgICAgICAgIHRoaXNfc2UgOiBKc3NtQ29tcGlsZVNlPG1OVD4sXG4gICAgICAgICAgICAgbmV4dF9zZSA6IEpzc21Db21waWxlU2U8bU5UPlxuICAgICAgICAgKSA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiB7IC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgcGFyc2VyIHJlcHJlc2VudGF0aW9uIG9mIGEgdHJhbnNpdGlvbiBzdGVwIGV4dGVuc2lvblxuXG4gIGNvbnN0IGVkZ2VzIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+ID0gW107XG5cbiAgY29uc3QgdUZyb20gOiBBcnJheTwgbU5UID4gPSAoQXJyYXkuaXNBcnJheShmcm9tKT8gZnJvbSA6IFtmcm9tXSksXG4gICAgICAgIHVUbyAgIDogQXJyYXk8IG1OVCA+ID0gKEFycmF5LmlzQXJyYXkodG8pPyAgIHRvICAgOiBbdG9dICApO1xuXG4gIHVGcm9tLm1hcCggKGY6IG1OVCkgPT4ge1xuICAgIHVUby5tYXAoICh0OiBtTlQpID0+IHtcblxuICAgICAgY29uc3QgcmlnaHQ6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IG1ha2VUcmFuc2l0aW9uKHRoaXNfc2UsIGYsIHQsIHRydWUpO1xuICAgICAgaWYgKHJpZ2h0LmtpbmQgIT09ICdub25lJykgeyBlZGdlcy5wdXNoKHJpZ2h0KTsgfVxuXG4gICAgICBjb25zdCBsZWZ0OiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSBtYWtlVHJhbnNpdGlvbih0aGlzX3NlLCB0LCBmLCBmYWxzZSk7XG4gICAgICBpZiAobGVmdC5raW5kICE9PSAnbm9uZScpIHsgZWRnZXMucHVzaChsZWZ0KTsgfVxuXG4gICAgfSk7XG4gIH0pO1xuXG4gIGNvbnN0IG5ld19hY2M6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiA9IGFjYy5jb25jYXQoZWRnZXMpO1xuXG4gIGlmIChuZXh0X3NlKSB7XG4gICAgcmV0dXJuIGNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXAobmV3X2FjYywgdG8sIG5leHRfc2UudG8sIG5leHRfc2UsIG5leHRfc2Uuc2UpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXdfYWNjO1xuICB9XG5cbn1cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVfcnVsZV9oYW5kbGVfdHJhbnNpdGlvbjxtTlQ+KHJ1bGU6IEpzc21Db21waWxlU2VTdGFydDxtTlQ+KTogbWl4ZWQgeyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIHBhcnNlciByZXByZXNlbnRhdGlvbiBvZiBhIHRyYW5zaXRpb25cbiAgcmV0dXJuIGNvbXBpbGVfcnVsZV90cmFuc2l0aW9uX3N0ZXAoW10sIHJ1bGUuZnJvbSwgcnVsZS5zZS50bywgcnVsZS5zZSwgcnVsZS5zZS5zZSk7XG59XG5cblxuXG5mdW5jdGlvbiBjb21waWxlX3J1bGVfaGFuZGxlcjxtTlQ+KHJ1bGU6IEpzc21Db21waWxlU2VTdGFydDxtTlQ+KTogSnNzbUNvbXBpbGVSdWxlIHsgLy8gdG9kbyBmbG93IGRlc2NyaWJlIHRoZSBvdXRwdXQgb2YgdGhlIHBhcnNlclxuXG4gIGlmIChydWxlLmtleSA9PT0gJ3RyYW5zaXRpb24nKSB7XG4gICAgcmV0dXJuIHsgYWdnX2FzOiAndHJhbnNpdGlvbicsIHZhbDogY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uKHJ1bGUpIH07XG4gIH1cblxuICBpZiAocnVsZS5rZXkgPT09ICdtYWNoaW5lX2xhbmd1YWdlJykge1xuICAgIHJldHVybiB7IGFnZ19hczogJ21hY2hpbmVfbGFuZ3VhZ2UnLCB2YWw6IHJlZHVjZV90b182MzkocnVsZS52YWx1ZSkgfTtcbiAgfVxuXG4gIGlmIChydWxlLmtleSA9PT0gJ3N0YXRlX2RlY2xhcmF0aW9uJykge1xuICAgIGlmICghcnVsZS5uYW1lKSB7IHRocm93IG5ldyBFcnJvcignU3RhdGUgZGVjbGFyYXRpb25zIG11c3QgaGF2ZSBhIG5hbWUnKTsgfVxuICAgIHJldHVybiB7IGFnZ19hczogJ3N0YXRlX2RlY2xhcmF0aW9uJywgdmFsOiB7IHN0YXRlOiBydWxlLm5hbWUsIGRlY2xhcmF0aW9uczogcnVsZS52YWx1ZSB9IH07XG4gIH1cblxuICBjb25zdCB0YXV0b2xvZ2llcyA6IEFycmF5PHN0cmluZz4gPSBbXG4gICAgJ2dyYXBoX2xheW91dCcsICdzdGFydF9zdGF0ZXMnLCAnZW5kX3N0YXRlcycsICdtYWNoaW5lX25hbWUnLCAnbWFjaGluZV92ZXJzaW9uJyxcbiAgICAnbWFjaGluZV9jb21tZW50JywgJ21hY2hpbmVfYXV0aG9yJywgJ21hY2hpbmVfY29udHJpYnV0b3InLCAnbWFjaGluZV9kZWZpbml0aW9uJyxcbiAgICAnbWFjaGluZV9yZWZlcmVuY2UnLCAnbWFjaGluZV9saWNlbnNlJywgJ2ZzbF92ZXJzaW9uJ1xuICBdO1xuXG4gIGlmICh0YXV0b2xvZ2llcy5pbmNsdWRlcyhydWxlLmtleSkpIHtcbiAgICByZXR1cm4geyBhZ2dfYXM6IHJ1bGUua2V5LCB2YWw6IHJ1bGUudmFsdWUgfTtcbiAgfVxuXG4gIHRocm93IG5ldyBFcnJvcihgY29tcGlsZV9ydWxlX2hhbmRsZXI6IFVua25vd24gcnVsZTogJHtKU09OLnN0cmluZ2lmeShydWxlKX1gKTtcblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGU8bU5ULCBtRFQ+KHRyZWU6IEpzc21QYXJzZVRyZWU8bU5UPik6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPiB7ICAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIG91dHB1dCBvZiB0aGUgcGFyc2VyXG5cbiAgY29uc3QgcmVzdWx0cyA6IHtcbiAgICBncmFwaF9sYXlvdXQgICAgICAgIDogQXJyYXk8IEpzc21MYXlvdXQgPixcbiAgICB0cmFuc2l0aW9uICAgICAgICAgIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+LFxuICAgIHN0YXJ0X3N0YXRlcyAgICAgICAgOiBBcnJheTwgbU5UID4sXG4gICAgZW5kX3N0YXRlcyAgICAgICAgICA6IEFycmF5PCBtTlQgPixcbiAgICBzdGF0ZV9kZWNsYXJhdGlvbiAgIDogQXJyYXk8IG1OVCA+LFxuICAgIGZzbF92ZXJzaW9uICAgICAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9hdXRob3IgICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2NvbW1lbnQgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfY29udHJpYnV0b3IgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9kZWZpbml0aW9uICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2xhbmd1YWdlICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfbGljZW5zZSAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9uYW1lICAgICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX3JlZmVyZW5jZSAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfdmVyc2lvbiAgICAgOiBBcnJheTwgc3RyaW5nID4gLy8gc2VtdmVyXG4gIH0gPSB7XG4gICAgZ3JhcGhfbGF5b3V0ICAgICAgICA6IFtdLFxuICAgIHRyYW5zaXRpb24gICAgICAgICAgOiBbXSxcbiAgICBzdGFydF9zdGF0ZXMgICAgICAgIDogW10sXG4gICAgZW5kX3N0YXRlcyAgICAgICAgICA6IFtdLFxuICAgIHN0YXRlX2RlY2xhcmF0aW9uICAgOiBbXSxcbiAgICBmc2xfdmVyc2lvbiAgICAgICAgIDogW10sXG4gICAgbWFjaGluZV9hdXRob3IgICAgICA6IFtdLFxuICAgIG1hY2hpbmVfY29tbWVudCAgICAgOiBbXSxcbiAgICBtYWNoaW5lX2NvbnRyaWJ1dG9yIDogW10sXG4gICAgbWFjaGluZV9kZWZpbml0aW9uICA6IFtdLFxuICAgIG1hY2hpbmVfbGFuZ3VhZ2UgICAgOiBbXSxcbiAgICBtYWNoaW5lX2xpY2Vuc2UgICAgIDogW10sXG4gICAgbWFjaGluZV9uYW1lICAgICAgICA6IFtdLFxuICAgIG1hY2hpbmVfcmVmZXJlbmNlICAgOiBbXSxcbiAgICBtYWNoaW5lX3ZlcnNpb24gICAgIDogW11cbiAgfTtcblxuICB0cmVlLm1hcCggKHRyIDogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pID0+IHtcblxuICAgIGNvbnN0IHJ1bGUgICA6IEpzc21Db21waWxlUnVsZSA9IGNvbXBpbGVfcnVsZV9oYW5kbGVyKHRyKSxcbiAgICAgICAgICBhZ2dfYXMgOiBzdHJpbmcgICAgICAgICAgPSBydWxlLmFnZ19hcyxcbiAgICAgICAgICB2YWwgICAgOiBtaXhlZCAgICAgICAgICAgPSBydWxlLnZhbDsgICAgICAgICAgICAgICAgICAvLyB0b2RvIGJldHRlciB0eXBlc1xuXG4gICAgcmVzdWx0c1thZ2dfYXNdID0gcmVzdWx0c1thZ2dfYXNdLmNvbmNhdCh2YWwpO1xuXG4gIH0pO1xuXG4gIGNvbnN0IGFzc2VtYmxlZF90cmFuc2l0aW9ucyA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiA9IFtdLmNvbmNhdCguLi4gcmVzdWx0c1sndHJhbnNpdGlvbiddKTtcblxuICBjb25zdCByZXN1bHRfY2ZnIDogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+ID0ge1xuICAgIHN0YXJ0X3N0YXRlcyA6IHJlc3VsdHMuc3RhcnRfc3RhdGVzLmxlbmd0aD8gcmVzdWx0cy5zdGFydF9zdGF0ZXMgOiBbYXNzZW1ibGVkX3RyYW5zaXRpb25zWzBdLmZyb21dLFxuICAgIHRyYW5zaXRpb25zICA6IGFzc2VtYmxlZF90cmFuc2l0aW9uc1xuICB9O1xuXG4gIGNvbnN0IG9uZU9ubHlLZXlzIDogQXJyYXk8c3RyaW5nPiA9IFtcbiAgICAnZ3JhcGhfbGF5b3V0JywgJ21hY2hpbmVfbmFtZScsICdtYWNoaW5lX3ZlcnNpb24nLCAnbWFjaGluZV9jb21tZW50JywgJ2ZzbF92ZXJzaW9uJywgJ21hY2hpbmVfbGljZW5zZScsXG4gICAgJ21hY2hpbmVfZGVmaW5pdGlvbicsICdtYWNoaW5lX2xhbmd1YWdlJ1xuICBdO1xuXG4gIG9uZU9ubHlLZXlzLm1hcCggKG9uZU9ubHlLZXkgOiBzdHJpbmcpID0+IHtcbiAgICBpZiAocmVzdWx0c1tvbmVPbmx5S2V5XS5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1heSBvbmx5IGhhdmUgb25lICR7b25lT25seUtleX0gc3RhdGVtZW50IG1heGltdW06ICR7SlNPTi5zdHJpbmdpZnkocmVzdWx0c1tvbmVPbmx5S2V5XSl9YCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChyZXN1bHRzW29uZU9ubHlLZXldLmxlbmd0aCkge1xuICAgICAgICByZXN1bHRfY2ZnW29uZU9ubHlLZXldID0gcmVzdWx0c1tvbmVPbmx5S2V5XVswXTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIFsnbWFjaGluZV9hdXRob3InLCAnbWFjaGluZV9jb250cmlidXRvcicsICdtYWNoaW5lX3JlZmVyZW5jZScsICdzdGF0ZV9kZWNsYXJhdGlvbiddLm1hcCggKG11bHRpS2V5IDogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHJlc3VsdHNbbXVsdGlLZXldLmxlbmd0aCkge1xuICAgICAgcmVzdWx0X2NmZ1ttdWx0aUtleV0gPSByZXN1bHRzW211bHRpS2V5XTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiByZXN1bHRfY2ZnO1xuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gbWFrZTxtTlQsIG1EVD4ocGxhbjogc3RyaW5nKTogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+IHtcbiAgcmV0dXJuIGNvbXBpbGUocGFyc2UocGxhbikpO1xufVxuXG5cblxuXG5cbmZ1bmN0aW9uIHRyYW5zZmVyX3N0YXRlX3Byb3BlcnRpZXM8bU5UPihzdGF0ZV9kZWNsOiBKc3NtU3RhdGVEZWNsYXJhdGlvbjxtTlQ+KTogSnNzbVN0YXRlRGVjbGFyYXRpb248bU5UPiB7XG5cbiAgICBzdGF0ZV9kZWNsLmRlY2xhcmF0aW9ucy5tYXAoIChkOiBKc3NtU3RhdGVEZWNsYXJhdGlvblJ1bGUpID0+IHtcbiAgICAgIHN3aXRjaCAoZC5rZXkpIHtcblxuICAgICAgICBjYXNlICdub2RlX3NoYXBlJyA6IHN0YXRlX2RlY2wubm9kZV9zaGFwZSA9IGQudmFsdWU7IGJyZWFrO1xuICAgICAgICBjYXNlICdub2RlX2NvbG9yJyA6IHN0YXRlX2RlY2wubm9kZV9jb2xvciA9IGQudmFsdWU7IGJyZWFrO1xuXG4gICAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcihgVW5rbm93biBzdGF0ZSBwcm9wZXJ0eTogJyR7SlNPTi5zdHJpbmdpZnkoZCl9J2ApO1xuXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gc3RhdGVfZGVjbDtcblxufVxuXG5cblxuXG5cbmNsYXNzIE1hY2hpbmU8bU5ULCBtRFQ+IHtcblxuXG4gIF9zdGF0ZSAgICAgICAgICAgICAgICAgIDogbU5UO1xuICBfc3RhdGVzICAgICAgICAgICAgICAgICA6IE1hcDxtTlQsIEpzc21HZW5lcmljU3RhdGU8bU5UPj47XG4gIF9lZGdlcyAgICAgICAgICAgICAgICAgIDogQXJyYXk8SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+PjtcbiAgX2VkZ2VfbWFwICAgICAgICAgICAgICAgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcbiAgX25hbWVkX3RyYW5zaXRpb25zICAgICAgOiBNYXA8bU5ULCBudW1iZXI+O1xuICBfYWN0aW9ucyAgICAgICAgICAgICAgICA6IE1hcDxtTlQsIE1hcDxtTlQsIG51bWJlcj4+O1xuICBfcmV2ZXJzZV9hY3Rpb25zICAgICAgICA6IE1hcDxtTlQsIE1hcDxtTlQsIG51bWJlcj4+O1xuICBfcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyA6IE1hcDxtTlQsIE1hcDxtTlQsIG51bWJlcj4+O1xuXG4gIF9tYWNoaW5lX2F1dGhvciAgICAgICAgIDogP0FycmF5PHN0cmluZz47XG4gIF9tYWNoaW5lX2NvbW1lbnQgICAgICAgIDogP3N0cmluZztcbiAgX21hY2hpbmVfY29udHJpYnV0b3IgICAgOiA/QXJyYXk8c3RyaW5nPjtcbiAgX21hY2hpbmVfZGVmaW5pdGlvbiAgICAgOiA/c3RyaW5nO1xuICBfbWFjaGluZV9sYW5ndWFnZSAgICAgICA6ID9zdHJpbmc7XG4gIF9tYWNoaW5lX2xpY2Vuc2UgICAgICAgIDogP3N0cmluZztcbiAgX21hY2hpbmVfbmFtZSAgICAgICAgICAgOiA/c3RyaW5nO1xuICBfbWFjaGluZV92ZXJzaW9uICAgICAgICA6ID9zdHJpbmc7XG4gIF9mc2xfdmVyc2lvbiAgICAgICAgICAgIDogP3N0cmluZztcbiAgX3Jhd19zdGF0ZV9kZWNsYXJhdGlvbiAgOiA/QXJyYXk8T2JqZWN0PjsgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBmbG93dHlwZS9uby13ZWFrLXR5cGVzXG4gIF9zdGF0ZV9kZWNsYXJhdGlvbnMgICAgIDogTWFwPG1OVCwgSnNzbVN0YXRlRGVjbGFyYXRpb248bU5UPj47XG5cbiAgX2dyYXBoX2xheW91dCAgICAgICAgICAgOiBKc3NtTGF5b3V0O1xuXG5cbiAgLy8gd2hhcmdhcmJsIHRoaXMgYmFkbHkgbmVlZHMgdG8gYmUgYnJva2VuIHVwLCBtb25vbGl0aCBtYXN0ZXJcbiAgY29uc3RydWN0b3Ioe1xuICAgIHN0YXJ0X3N0YXRlcyxcbiAgICBjb21wbGV0ZSAgICAgICAgPSBbXSxcbiAgICB0cmFuc2l0aW9ucyxcbiAgICBtYWNoaW5lX2F1dGhvcixcbiAgICBtYWNoaW5lX2NvbW1lbnQsXG4gICAgbWFjaGluZV9jb250cmlidXRvcixcbiAgICBtYWNoaW5lX2RlZmluaXRpb24sXG4gICAgbWFjaGluZV9sYW5ndWFnZSxcbiAgICBtYWNoaW5lX2xpY2Vuc2UsXG4gICAgbWFjaGluZV9uYW1lLFxuICAgIG1hY2hpbmVfdmVyc2lvbixcbiAgICBzdGF0ZV9kZWNsYXJhdGlvbixcbiAgICBmc2xfdmVyc2lvbixcbiAgICBncmFwaF9sYXlvdXQgPSAnZG90J1xuICB9IDogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+KSB7XG5cbiAgICB0aGlzLl9zdGF0ZSAgICAgICAgICAgICAgICAgID0gc3RhcnRfc3RhdGVzWzBdO1xuICAgIHRoaXMuX3N0YXRlcyAgICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fc3RhdGVfZGVjbGFyYXRpb25zICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9lZGdlcyAgICAgICAgICAgICAgICAgID0gW107XG4gICAgdGhpcy5fZWRnZV9tYXAgICAgICAgICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucyAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX2FjdGlvbnMgICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25zICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzID0gbmV3IE1hcCgpOyAgIC8vIHRvZG9cblxuICAgIHRoaXMuX21hY2hpbmVfYXV0aG9yICAgICAgICAgPSBtYWNoaW5lX2F1dGhvcjtcbiAgICB0aGlzLl9tYWNoaW5lX2NvbW1lbnQgICAgICAgID0gbWFjaGluZV9jb21tZW50O1xuICAgIHRoaXMuX21hY2hpbmVfY29udHJpYnV0b3IgICAgPSBtYWNoaW5lX2NvbnRyaWJ1dG9yO1xuICAgIHRoaXMuX21hY2hpbmVfZGVmaW5pdGlvbiAgICAgPSBtYWNoaW5lX2RlZmluaXRpb247XG4gICAgdGhpcy5fbWFjaGluZV9sYW5ndWFnZSAgICAgICA9IG1hY2hpbmVfbGFuZ3VhZ2U7XG4gICAgdGhpcy5fbWFjaGluZV9saWNlbnNlICAgICAgICA9IG1hY2hpbmVfbGljZW5zZTtcbiAgICB0aGlzLl9tYWNoaW5lX25hbWUgICAgICAgICAgID0gbWFjaGluZV9uYW1lO1xuICAgIHRoaXMuX21hY2hpbmVfdmVyc2lvbiAgICAgICAgPSBtYWNoaW5lX3ZlcnNpb247XG4gICAgdGhpcy5fcmF3X3N0YXRlX2RlY2xhcmF0aW9uICA9IHN0YXRlX2RlY2xhcmF0aW9uIHx8IFtdO1xuICAgIHRoaXMuX2ZzbF92ZXJzaW9uICAgICAgICAgICAgPSBmc2xfdmVyc2lvbjtcblxuICAgIHRoaXMuX2dyYXBoX2xheW91dCAgICAgICAgICAgPSBncmFwaF9sYXlvdXQ7XG5cblxuICAgIGlmIChzdGF0ZV9kZWNsYXJhdGlvbikge1xuICAgICAgc3RhdGVfZGVjbGFyYXRpb24ubWFwKCAoc3RhdGVfZGVjbDogSnNzbVN0YXRlRGVjbGFyYXRpb248bU5UPikgPT4ge1xuXG4gICAgICAgIGlmICh0aGlzLl9zdGF0ZV9kZWNsYXJhdGlvbnMuaGFzKHN0YXRlX2RlY2wuc3RhdGUpKSB7IC8vIG5vIHJlcGVhdHNcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEFkZGVkIHRoZSBzYW1lIHN0YXRlIGRlY2xhcmF0aW9uIHR3aWNlOiAke0pTT04uc3RyaW5naWZ5KHN0YXRlX2RlY2wuc3RhdGUpfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fc3RhdGVfZGVjbGFyYXRpb25zLnNldCggc3RhdGVfZGVjbC5zdGF0ZSwgdHJhbnNmZXJfc3RhdGVfcHJvcGVydGllcyhzdGF0ZV9kZWNsKSApO1xuXG4gICAgICB9ICk7XG4gICAgfVxuXG5cbiAgICB0cmFuc2l0aW9ucy5tYXAoICh0cjpKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pID0+IHtcblxuICAgICAgaWYgKHRyLmZyb20gPT09IHVuZGVmaW5lZCkgeyB0aHJvdyBuZXcgRXJyb3IoYHRyYW5zaXRpb24gbXVzdCBkZWZpbmUgJ2Zyb20nOiAke0pTT04uc3RyaW5naWZ5KHRyKX1gKTsgfVxuICAgICAgaWYgKHRyLnRvICAgPT09IHVuZGVmaW5lZCkgeyB0aHJvdyBuZXcgRXJyb3IoYHRyYW5zaXRpb24gbXVzdCBkZWZpbmUgJ3RvJzogJHsgIEpTT04uc3RyaW5naWZ5KHRyKX1gKTsgfVxuXG4gICAgICAvLyBnZXQgdGhlIGN1cnNvcnMuICB3aGF0IGEgbWVzc1xuICAgICAgY29uc3QgY3Vyc29yX2Zyb206IEpzc21HZW5lcmljU3RhdGU8bU5UPlxuICAgICAgICAgID0gdGhpcy5fc3RhdGVzLmdldCh0ci5mcm9tKVxuICAgICAgICAgfHwgeyBuYW1lOiB0ci5mcm9tLCBmcm9tOiBbXSwgdG86IFtdLCBjb21wbGV0ZTogY29tcGxldGUuaW5jbHVkZXModHIuZnJvbSkgfTtcblxuICAgICAgaWYgKCEodGhpcy5fc3RhdGVzLmhhcyh0ci5mcm9tKSkpIHtcbiAgICAgICAgdGhpcy5fbmV3X3N0YXRlKGN1cnNvcl9mcm9tKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY3Vyc29yX3RvOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD5cbiAgICAgICAgICA9IHRoaXMuX3N0YXRlcy5nZXQodHIudG8pXG4gICAgICAgICB8fCB7bmFtZTogdHIudG8sIGZyb206IFtdLCB0bzogW10sIGNvbXBsZXRlOiBjb21wbGV0ZS5pbmNsdWRlcyh0ci50bykgfTtcblxuICAgICAgaWYgKCEodGhpcy5fc3RhdGVzLmhhcyh0ci50bykpKSB7XG4gICAgICAgIHRoaXMuX25ld19zdGF0ZShjdXJzb3JfdG8pO1xuICAgICAgfVxuXG4gICAgICAvLyBndWFyZCBhZ2FpbnN0IGV4aXN0aW5nIGNvbm5lY3Rpb25zIGJlaW5nIHJlLWFkZGVkXG4gICAgICBpZiAoY3Vyc29yX2Zyb20udG8uaW5jbHVkZXModHIudG8pKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgYWxyZWFkeSBoYXMgJHtKU09OLnN0cmluZ2lmeSh0ci5mcm9tKX0gdG8gJHtKU09OLnN0cmluZ2lmeSh0ci50byl9YCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjdXJzb3JfZnJvbS50by5wdXNoKHRyLnRvKTtcbiAgICAgICAgY3Vyc29yX3RvLmZyb20ucHVzaCh0ci5mcm9tKTtcbiAgICAgIH1cblxuICAgICAgLy8gYWRkIHRoZSBlZGdlOyBub3RlIGl0cyBpZFxuICAgICAgdGhpcy5fZWRnZXMucHVzaCh0cik7XG4gICAgICBjb25zdCB0aGlzRWRnZUlkOiBudW1iZXIgPSB0aGlzLl9lZGdlcy5sZW5ndGggLSAxO1xuXG4gICAgICAvLyBndWFyZCBhZ2FpbnN0IHJlcGVhdGluZyBhIHRyYW5zaXRpb24gbmFtZVxuICAgICAgaWYgKHRyLm5hbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuX25hbWVkX3RyYW5zaXRpb25zLmhhcyh0ci5uYW1lKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgbmFtZWQgdHJhbnNpdGlvbiBcIiR7SlNPTi5zdHJpbmdpZnkodHIubmFtZSl9XCIgYWxyZWFkeSBjcmVhdGVkYCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMuc2V0KHRyLm5hbWUsIHRoaXNFZGdlSWQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHNldCB1cCB0aGUgbWFwcGluZywgc28gdGhhdCBlZGdlcyBjYW4gYmUgbG9va2VkIHVwIGJ5IGVuZHBvaW50IHBhaXJzXG4gICAgICBjb25zdCBmcm9tX21hcHBpbmc6IE1hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9lZGdlX21hcC5nZXQodHIuZnJvbSkgfHwgbmV3IE1hcCgpO1xuICAgICAgaWYgKCEodGhpcy5fZWRnZV9tYXAuaGFzKHRyLmZyb20pKSkge1xuICAgICAgICB0aGlzLl9lZGdlX21hcC5zZXQodHIuZnJvbSwgZnJvbV9tYXBwaW5nKTtcbiAgICAgIH1cblxuLy8gICAgY29uc3QgdG9fbWFwcGluZyA9IGZyb21fbWFwcGluZy5nZXQodHIudG8pO1xuICAgICAgZnJvbV9tYXBwaW5nLnNldCh0ci50bywgdGhpc0VkZ2VJZCk7IC8vIGFscmVhZHkgY2hlY2tlZCB0aGF0IHRoaXMgbWFwcGluZyBkb2Vzbid0IGV4aXN0LCBhYm92ZVxuXG4gICAgICAvLyBzZXQgdXAgdGhlIGFjdGlvbiBtYXBwaW5nLCBzbyB0aGF0IGFjdGlvbnMgY2FuIGJlIGxvb2tlZCB1cCBieSBvcmlnaW5cbiAgICAgIGlmICh0ci5hY3Rpb24pIHtcblxuXG4gICAgICAgIC8vIGZvcndhcmQgbWFwcGluZyBmaXJzdCBieSBhY3Rpb24gbmFtZVxuICAgICAgICBsZXQgYWN0aW9uTWFwOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KHRyLmFjdGlvbik7XG4gICAgICAgIGlmICghKGFjdGlvbk1hcCkpIHtcbiAgICAgICAgICBhY3Rpb25NYXAgPSBuZXcgTWFwKCk7XG4gICAgICAgICAgdGhpcy5fYWN0aW9ucy5zZXQodHIuYWN0aW9uLCBhY3Rpb25NYXApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFjdGlvbk1hcC5oYXModHIuZnJvbSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGFjdGlvbiAke0pTT04uc3RyaW5naWZ5KHRyLmFjdGlvbil9IGFscmVhZHkgYXR0YWNoZWQgdG8gb3JpZ2luICR7SlNPTi5zdHJpbmdpZnkodHIuZnJvbSl9YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYWN0aW9uTWFwLnNldCh0ci5mcm9tLCB0aGlzRWRnZUlkKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgLy8gcmV2ZXJzZSBtYXBwaW5nIGZpcnN0IGJ5IHN0YXRlIG9yaWdpbiBuYW1lXG4gICAgICAgIGxldCByQWN0aW9uTWFwOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQodHIuZnJvbSk7XG4gICAgICAgIGlmICghKHJBY3Rpb25NYXApKSB7XG4gICAgICAgICAgckFjdGlvbk1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuc2V0KHRyLmZyb20sIHJBY3Rpb25NYXApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbm8gbmVlZCB0byB0ZXN0IGZvciByZXZlcnNlIG1hcHBpbmcgcHJlLXByZXNlbmNlO1xuICAgICAgICAvLyBmb3J3YXJkIG1hcHBpbmcgYWxyZWFkeSBjb3ZlcnMgY29sbGlzaW9uc1xuICAgICAgICByQWN0aW9uTWFwLnNldCh0ci5hY3Rpb24sIHRoaXNFZGdlSWQpO1xuXG5cbiAgICAgICAgLy8gcmV2ZXJzZSBtYXBwaW5nIGZpcnN0IGJ5IHN0YXRlIHRhcmdldCBuYW1lXG4gICAgICAgIGlmICghKHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuaGFzKHRyLnRvKSkpIHtcbiAgICAgICAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLnNldCh0ci50bywgbmV3IE1hcCgpKTtcbiAgICAgICAgfVxuXG4vKiB0b2RvIGNvbWViYWNrXG4gICBmdW5kYW1lbnRhbCBwcm9ibGVtIGlzIHJvQWN0aW9uTWFwIG5lZWRzIHRvIGJlIGEgbXVsdGltYXBcbiAgICAgICAgY29uc3Qgcm9BY3Rpb25NYXAgPSB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLmdldCh0ci50byk7ICAvLyB3YXN0ZWZ1bCAtIGFscmVhZHkgZGlkIGhhcyAtIHJlZmFjdG9yXG4gICAgICAgIGlmIChyb0FjdGlvbk1hcCkge1xuICAgICAgICAgIGlmIChyb0FjdGlvbk1hcC5oYXModHIuYWN0aW9uKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGByby1hY3Rpb24gJHt0ci50b30gYWxyZWFkeSBhdHRhY2hlZCB0byBhY3Rpb24gJHt0ci5hY3Rpb259YCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJvQWN0aW9uTWFwLnNldCh0ci5hY3Rpb24sIHRoaXNFZGdlSWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Nob3VsZCBiZSBpbXBvc3NpYmxlIC0gZmxvdyBkb2VzblxcJ3Qga25vdyAuc2V0IHByZWNlZGVzIC5nZXQgeWV0IGFnYWluLiAgc2V2ZXJlIGVycm9yPycpO1xuICAgICAgICB9XG4qL1xuICAgICAgfVxuXG4gICAgfSk7XG5cbiAgfVxuXG4gIF9uZXdfc3RhdGUoc3RhdGVfY29uZmlnOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD4pOiBtTlQgeyAvLyB3aGFyZ2FyYmwgZ2V0IHRoYXQgc3RhdGVfY29uZmlnIGFueSB1bmRlciBjb250cm9sXG5cbiAgICBpZiAodGhpcy5fc3RhdGVzLmhhcyhzdGF0ZV9jb25maWcubmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgc3RhdGUgJHtKU09OLnN0cmluZ2lmeShzdGF0ZV9jb25maWcubmFtZSl9IGFscmVhZHkgZXhpc3RzYCk7XG4gICAgfVxuXG4gICAgdGhpcy5fc3RhdGVzLnNldChzdGF0ZV9jb25maWcubmFtZSwgc3RhdGVfY29uZmlnKTtcbiAgICByZXR1cm4gc3RhdGVfY29uZmlnLm5hbWU7XG5cbiAgfVxuXG5cblxuICBzdGF0ZSgpOiBtTlQge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZTtcbiAgfVxuXG4vKiB3aGFyZ2FyYmwgdG9kbyBtYWpvclxuICAgd2hlbiB3ZSByZWltcGxlbWVudCB0aGlzLCByZWludHJvZHVjZSB0aGlzIGNoYW5nZSB0byB0aGUgaXNfZmluYWwgY2FsbFxuXG4gIGlzX2NoYW5naW5nKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlOyAvLyB0b2RvIHdoYXJnYXJibFxuICB9XG4qL1xuXG5cbiAgc3RhdGVfaXNfZmluYWwod2hpY2hTdGF0ZTogbU5UKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICggKHRoaXMuc3RhdGVfaXNfdGVybWluYWwod2hpY2hTdGF0ZSkpICYmICh0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHdoaWNoU3RhdGUpKSApO1xuICB9XG5cbiAgaXNfZmluYWwoKTogYm9vbGVhbiB7XG4vLyAgcmV0dXJuICgoIXRoaXMuaXNfY2hhbmdpbmcoKSkgJiYgdGhpcy5zdGF0ZV9pc19maW5hbCh0aGlzLnN0YXRlKCkpKTtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZV9pc19maW5hbCh0aGlzLnN0YXRlKCkpO1xuICB9XG5cbiAgZ3JhcGhfbGF5b3V0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX2dyYXBoX2xheW91dDtcbiAgfVxuXG5cblxuICBtYWNoaW5lX2F1dGhvcigpOiA/QXJyYXk8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfYXV0aG9yO1xuICB9XG5cbiAgbWFjaGluZV9jb21tZW50KCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2NvbW1lbnQ7XG4gIH1cblxuICBtYWNoaW5lX2NvbnRyaWJ1dG9yKCk6ID9BcnJheTxzdHJpbmc+IHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9jb250cmlidXRvcjtcbiAgfVxuXG4gIG1hY2hpbmVfZGVmaW5pdGlvbigpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9kZWZpbml0aW9uO1xuICB9XG5cbiAgbWFjaGluZV9sYW5ndWFnZSgpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9sYW5ndWFnZTtcbiAgfVxuXG4gIG1hY2hpbmVfbGljZW5zZSgpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9saWNlbnNlO1xuICB9XG5cbiAgbWFjaGluZV9uYW1lKCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX25hbWU7XG4gIH1cblxuICBtYWNoaW5lX3ZlcnNpb24oKTogP3N0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfdmVyc2lvbjtcbiAgfVxuXG4gIHJhd19zdGF0ZV9kZWNsYXJhdGlvbnMoKTogP0FycmF5PE9iamVjdD4geyAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXNcbiAgICByZXR1cm4gdGhpcy5fcmF3X3N0YXRlX2RlY2xhcmF0aW9uO1xuICB9XG5cbiAgc3RhdGVfZGVjbGFyYXRpb24od2hpY2g6IG1OVCk6ID9Kc3NtU3RhdGVEZWNsYXJhdGlvbjxtTlQ+IHtcbiAgICByZXR1cm4gdGhpcy5fc3RhdGVfZGVjbGFyYXRpb25zLmdldCh3aGljaCk7XG4gIH1cblxuICBzdGF0ZV9kZWNsYXJhdGlvbnMoKTogTWFwPG1OVCwgT2JqZWN0PiB7ICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZmxvd3R5cGUvbm8td2Vhay10eXBlc1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZV9kZWNsYXJhdGlvbnM7XG4gIH1cblxuICBmc2xfdmVyc2lvbigpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fZnNsX3ZlcnNpb247XG4gIH1cblxuXG5cbiAgbWFjaGluZV9zdGF0ZSgpOiBKc3NtTWFjaGluZUludGVybmFsU3RhdGU8bU5ULCBtRFQ+IHtcblxuICAgIHJldHVybiB7XG4gICAgICBpbnRlcm5hbF9zdGF0ZV9pbXBsX3ZlcnNpb24gOiAxLFxuXG4gICAgICBhY3Rpb25zICAgICAgICAgICAgICAgIDogdGhpcy5fYWN0aW9ucyxcbiAgICAgIGVkZ2VfbWFwICAgICAgICAgICAgICAgOiB0aGlzLl9lZGdlX21hcCxcbiAgICAgIGVkZ2VzICAgICAgICAgICAgICAgICAgOiB0aGlzLl9lZGdlcyxcbiAgICAgIG5hbWVkX3RyYW5zaXRpb25zICAgICAgOiB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucyxcbiAgICAgIHJldmVyc2VfYWN0aW9ucyAgICAgICAgOiB0aGlzLl9yZXZlcnNlX2FjdGlvbnMsXG4vLyAgICByZXZlcnNlX2FjdGlvbl90YXJnZXRzIDogdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyxcbiAgICAgIHN0YXRlICAgICAgICAgICAgICAgICAgOiB0aGlzLl9zdGF0ZSxcbiAgICAgIHN0YXRlcyAgICAgICAgICAgICAgICAgOiB0aGlzLl9zdGF0ZXNcbiAgICB9O1xuXG4gIH1cblxuLypcbiAgbG9hZF9tYWNoaW5lX3N0YXRlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmYWxzZTsgLy8gdG9kbyB3aGFyZ2FyYmxcbiAgfVxuKi9cblxuXG4gIHN0YXRlcygpOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gWy4uLiB0aGlzLl9zdGF0ZXMua2V5cygpXTtcbiAgfVxuXG4gIHN0YXRlX2Zvcih3aGljaFN0YXRlOiBtTlQpOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD4ge1xuICAgIGNvbnN0IHN0YXRlOiA/SnNzbUdlbmVyaWNTdGF0ZTxtTlQ+ID0gdGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAoc3RhdGUpIHsgcmV0dXJuIHN0YXRlOyB9XG4gICAgZWxzZSAgICAgICB7IHRocm93IG5ldyBFcnJvcihgbm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHN0YXRlKX1gKTsgfVxuICB9XG5cblxuXG4gIGxpc3RfZWRnZXMoKTogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHtcbiAgICByZXR1cm4gdGhpcy5fZWRnZXM7XG4gIH1cblxuICBsaXN0X25hbWVkX3RyYW5zaXRpb25zKCk6IE1hcDxtTlQsIG51bWJlcj4ge1xuICAgIHJldHVybiB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucztcbiAgfVxuXG4gIGxpc3RfYWN0aW9ucygpOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gWy4uLiB0aGlzLl9hY3Rpb25zLmtleXMoKV07XG4gIH1cblxuXG5cbiAgZ2V0X3RyYW5zaXRpb25fYnlfc3RhdGVfbmFtZXMoZnJvbTogbU5ULCB0bzogbU5UKTogP251bWJlciB7XG5cbiAgICBjb25zdCBlbWcgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2VkZ2VfbWFwLmdldChmcm9tKTtcblxuICAgIGlmIChlbWcpIHtcbiAgICAgIHJldHVybiBlbWcuZ2V0KHRvKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgfVxuXG5cblxuICBsb29rdXBfdHJhbnNpdGlvbl9mb3IoZnJvbTogbU5ULCB0bzogbU5UKTogP0pzc21UcmFuc2l0aW9uPG1OVCwgbURUPiB7XG4gICAgY29uc3QgaWQgOiA/bnVtYmVyID0gdGhpcy5nZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyhmcm9tLCB0byk7XG4gICAgcmV0dXJuICgoaWQgPT09IHVuZGVmaW5lZCkgfHwgKGlkID09PSBudWxsKSk/IHVuZGVmaW5lZCA6IHRoaXMuX2VkZ2VzW2lkXTtcbiAgfVxuXG5cblxuICBsaXN0X3RyYW5zaXRpb25zKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSk6IEpzc21UcmFuc2l0aW9uTGlzdDxtTlQ+IHtcbiAgICByZXR1cm4ge2VudHJhbmNlczogdGhpcy5saXN0X2VudHJhbmNlcyh3aGljaFN0YXRlKSwgZXhpdHM6IHRoaXMubGlzdF9leGl0cyh3aGljaFN0YXRlKX07XG4gIH1cblxuICBsaXN0X2VudHJhbmNlcyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkpOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gKHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSkgfHwge30pLmZyb20gfHwgW107XG4gIH1cblxuICBsaXN0X2V4aXRzKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSk6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiAodGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKSB8fCB7fSkudG8gICB8fCBbXTtcbiAgfVxuXG5cblxuICBwcm9iYWJsZV9leGl0c19mb3Iod2hpY2hTdGF0ZTogbU5UKTogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHtcblxuICAgIGNvbnN0IHdzdGF0ZTogP0pzc21HZW5lcmljU3RhdGU8bU5UPiA9IHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKCEod3N0YXRlKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX0gaW4gcHJvYmFibGVfZXhpdHNfZm9yYCk7IH1cblxuICAgIGNvbnN0IHdzdGF0ZV90byA6IEFycmF5PCBtTlQgPiA9IHdzdGF0ZS50byxcblxuICAgICAgICAgIHd0ZiAgICAgICA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiAvLyB3c3RhdGVfdG9fZmlsdGVyZWQgLT4gd3RmXG4gICAgICAgICAgICAgICAgICAgID0gd3N0YXRlX3RvXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKCAod3MpIDogP0pzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9PiB0aGlzLmxvb2t1cF90cmFuc2l0aW9uX2Zvcih0aGlzLnN0YXRlKCksIHdzKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbik7XG5cbiAgICByZXR1cm4gd3RmO1xuXG4gIH1cblxuICBwcm9iYWJpbGlzdGljX3RyYW5zaXRpb24oKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc2VsZWN0ZWQgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB3ZWlnaHRlZF9yYW5kX3NlbGVjdCh0aGlzLnByb2JhYmxlX2V4aXRzX2Zvcih0aGlzLnN0YXRlKCkpKTtcbiAgICByZXR1cm4gdGhpcy50cmFuc2l0aW9uKCBzZWxlY3RlZC50byApO1xuICB9XG5cbiAgcHJvYmFiaWxpc3RpY193YWxrKG46IG51bWJlcik6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBzZXEobilcbiAgICAgICAgICAubWFwKCgpIDogbU5UID0+IHtcbiAgICAgICAgICAgICBjb25zdCBzdGF0ZV93YXM6IG1OVCA9IHRoaXMuc3RhdGUoKTtcbiAgICAgICAgICAgICB0aGlzLnByb2JhYmlsaXN0aWNfdHJhbnNpdGlvbigpO1xuICAgICAgICAgICAgIHJldHVybiBzdGF0ZV93YXM7XG4gICAgICAgICAgIH0pXG4gICAgICAgICAgLmNvbmNhdChbdGhpcy5zdGF0ZSgpXSk7XG4gIH1cblxuICBwcm9iYWJpbGlzdGljX2hpc3RvX3dhbGsobjogbnVtYmVyKTogTWFwPG1OVCwgbnVtYmVyPiB7XG4gICAgcmV0dXJuIGhpc3RvZ3JhcGgodGhpcy5wcm9iYWJpbGlzdGljX3dhbGsobikpO1xuICB9XG5cblxuXG4gIGFjdGlvbnMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpICk6IEFycmF5PG1OVD4ge1xuICAgIGNvbnN0IHdzdGF0ZSA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAod3N0YXRlKSB7IHJldHVybiBbLi4uIHdzdGF0ZS5rZXlzKCldOyB9XG4gICAgZWxzZSAgICAgICAgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuICB9XG5cbiAgbGlzdF9zdGF0ZXNfaGF2aW5nX2FjdGlvbih3aGljaFN0YXRlOiBtTlQpOiBBcnJheTxtTlQ+IHtcbiAgICBjb25zdCB3c3RhdGUgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICh3c3RhdGUpIHsgcmV0dXJuIFsuLi4gd3N0YXRlLmtleXMoKV07IH1cbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG4gIH1cblxuLy8gY29tZWJhY2tcbi8qXG4gIGxpc3RfZW50cmFuY2VfYWN0aW9ucyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkgKSA6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uICh0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLmdldCh3aGljaFN0YXRlKSB8fCBuZXcgTWFwKCkpLnZhbHVlcygpXSAvLyB3YXN0ZWZ1bFxuICAgICAgICAgICAubWFwKCAoZWRnZUlkOmFueSkgPT4gKHRoaXMuX2VkZ2VzW2VkZ2VJZF0gOiBhbnkpKSAvLyB3aGFyZ2FyYmwgYnVybiBvdXQgYW55XG4gICAgICAgICAgIC5maWx0ZXIoIChvOmFueSkgPT4gby50byA9PT0gd2hpY2hTdGF0ZSlcbiAgICAgICAgICAgLm1hcCggZmlsdGVyZWQgPT4gZmlsdGVyZWQuZnJvbSApO1xuICB9XG4qL1xuICBsaXN0X2V4aXRfYWN0aW9ucyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkgKTogQXJyYXk8P21OVD4geyAvLyB0aGVzZSBhcmUgbU5ULCBub3QgP21OVFxuICAgIGNvbnN0IHJhX2Jhc2U6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAoIShyYV9iYXNlKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuXG4gICAgcmV0dXJuIFsuLi4gcmFfYmFzZS52YWx1ZXMoKV1cbiAgICAgICAgICAgLm1hcCAgICAoIChlZGdlSWQ6IG51bWJlcikgICAgICAgICAgICAgIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMuX2VkZ2VzW2VkZ2VJZF0gICApXG4gICAgICAgICAgIC5maWx0ZXIgKCAobzogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+KSA6IGJvb2xlYW4gICAgICAgICAgICAgICAgICA9PiBvLmZyb20gPT09IHdoaWNoU3RhdGUgKVxuICAgICAgICAgICAubWFwICAgICggKGZpbHRlcmVkOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pIDogP21OVCAgICAgICAgICAgICAgPT4gZmlsdGVyZWQuYWN0aW9uICAgICAgICk7XG4gIH1cblxuICBwcm9iYWJsZV9hY3Rpb25fZXhpdHMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpICkgOiBBcnJheTxtaXhlZD4geyAvLyB0aGVzZSBhcmUgbU5UXG4gICAgY29uc3QgcmFfYmFzZTogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICghKHJhX2Jhc2UpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG5cbiAgICByZXR1cm4gWy4uLiByYV9iYXNlLnZhbHVlcygpXVxuICAgICAgICAgICAubWFwICAgICggKGVkZ2VJZDogbnVtYmVyKTogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMuX2VkZ2VzW2VkZ2VJZF0gICApXG4gICAgICAgICAgIC5maWx0ZXIgKCAobzogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+KTogYm9vbGVhbiAgICAgPT4gby5mcm9tID09PSB3aGljaFN0YXRlIClcbiAgICAgICAgICAgLm1hcCAgICAoIChmaWx0ZXJlZCk6IG1peGVkICAgICAgICAgICAgICAgICAgICAgICAgICA9PiAoIHsgYWN0aW9uICAgICAgOiBmaWx0ZXJlZC5hY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2JhYmlsaXR5IDogZmlsdGVyZWQucHJvYmFiaWxpdHkgfSApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgfVxuXG5cblxuICBpc191bmVudGVyYWJsZSh3aGljaFN0YXRlOiBtTlQpOiBib29sZWFuIHtcbiAgICAvLyB3aGFyZ2FyYmwgc2hvdWxkIHRocm93IG9uIHVua25vd24gc3RhdGVcbiAgICByZXR1cm4gdGhpcy5saXN0X2VudHJhbmNlcyh3aGljaFN0YXRlKS5sZW5ndGggPT09IDA7XG4gIH1cblxuICBoYXNfdW5lbnRlcmFibGVzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlcygpLnNvbWUoICh4KTogYm9vbGVhbiA9PiB0aGlzLmlzX3VuZW50ZXJhYmxlKHgpKTtcbiAgfVxuXG5cblxuICBpc190ZXJtaW5hbCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZV9pc190ZXJtaW5hbCh0aGlzLnN0YXRlKCkpO1xuICB9XG5cbiAgc3RhdGVfaXNfdGVybWluYWwod2hpY2hTdGF0ZTogbU5UKTogYm9vbGVhbiB7XG4gICAgLy8gd2hhcmdhcmJsIHNob3VsZCB0aHJvdyBvbiB1bmtub3duIHN0YXRlXG4gICAgcmV0dXJuIHRoaXMubGlzdF9leGl0cyh3aGljaFN0YXRlKS5sZW5ndGggPT09IDA7XG4gIH1cblxuICBoYXNfdGVybWluYWxzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlcygpLnNvbWUoICh4KTogYm9vbGVhbiA9PiB0aGlzLnN0YXRlX2lzX3Rlcm1pbmFsKHgpKTtcbiAgfVxuXG5cblxuICBpc19jb21wbGV0ZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZV9pc19jb21wbGV0ZSh0aGlzLnN0YXRlKCkpO1xuICB9XG5cbiAgc3RhdGVfaXNfY29tcGxldGUod2hpY2hTdGF0ZTogbU5UKSA6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHdzdGF0ZTogP0pzc21HZW5lcmljU3RhdGU8bU5UPiA9IHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHdzdGF0ZSkgeyByZXR1cm4gd3N0YXRlLmNvbXBsZXRlOyB9XG4gICAgZWxzZSAgICAgICAgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuICB9XG5cbiAgaGFzX2NvbXBsZXRlcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZXMoKS5zb21lKCAoeCk6IGJvb2xlYW4gPT4gdGhpcy5zdGF0ZV9pc19jb21wbGV0ZSh4KSApO1xuICB9XG5cblxuXG4gIGFjdGlvbihuYW1lOiBtTlQsIG5ld0RhdGE/OiBtRFQpOiBib29sZWFuIHtcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBpZiAodGhpcy52YWxpZF9hY3Rpb24obmFtZSwgbmV3RGF0YSkpIHtcbiAgICAgIGNvbnN0IGVkZ2U6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHRoaXMuY3VycmVudF9hY3Rpb25fZWRnZV9mb3IobmFtZSk7XG4gICAgICB0aGlzLl9zdGF0ZSA9IGVkZ2UudG87XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHRyYW5zaXRpb24obmV3U3RhdGU6IG1OVCwgbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX3RyYW5zaXRpb24obmV3U3RhdGUsIG5ld0RhdGEpKSB7XG4gICAgICB0aGlzLl9zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvLyBjYW4gbGVhdmUgbWFjaGluZSBpbiBpbmNvbnNpc3RlbnQgc3RhdGUuICBnZW5lcmFsbHkgZG8gbm90IHVzZVxuICBmb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlOiBtTlQsIG5ld0RhdGE/OiBtRFQpOiBib29sZWFuIHtcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBpZiAodGhpcy52YWxpZF9mb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlLCBuZXdEYXRhKSkge1xuICAgICAgdGhpcy5fc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cblxuXG4gIGN1cnJlbnRfYWN0aW9uX2ZvcihhY3Rpb246IG1OVCk6IG51bWJlciB8IHZvaWQge1xuICAgIGNvbnN0IGFjdGlvbl9iYXNlOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2FjdGlvbnMuZ2V0KGFjdGlvbik7XG4gICAgcmV0dXJuIGFjdGlvbl9iYXNlPyBhY3Rpb25fYmFzZS5nZXQodGhpcy5zdGF0ZSgpKTogdW5kZWZpbmVkO1xuICB9XG5cbiAgY3VycmVudF9hY3Rpb25fZWRnZV9mb3IoYWN0aW9uOiBtTlQpOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4ge1xuICAgIGNvbnN0IGlkeDogP251bWJlciA9IHRoaXMuY3VycmVudF9hY3Rpb25fZm9yKGFjdGlvbik7XG4gICAgaWYgKChpZHggPT09IHVuZGVmaW5lZCkgfHwgKGlkeCA9PT0gbnVsbCkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIGFjdGlvbiAke0pTT04uc3RyaW5naWZ5KGFjdGlvbil9YCk7IH1cbiAgICByZXR1cm4gdGhpcy5fZWRnZXNbaWR4XTtcbiAgfVxuXG4gIHZhbGlkX2FjdGlvbihhY3Rpb246IG1OVCwgX25ld0RhdGE/OiBtRFQpOiBib29sZWFuIHsgIC8vIHRvZG8gY29tZWJhY2sgdW5pZ25vcmUgbmV3RGF0YVxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRfYWN0aW9uX2ZvcihhY3Rpb24pICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICB2YWxpZF90cmFuc2l0aW9uKG5ld1N0YXRlOiBtTlQsIF9uZXdEYXRhPzogbURUKTogYm9vbGVhbiB7ICAvLyB0b2RvIGNvbWViYWNrIHVuaWdub3JlIG5ld0RhdGFcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBjb25zdCB0cmFuc2l0aW9uX2ZvcjogP0pzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHRoaXMubG9va3VwX3RyYW5zaXRpb25fZm9yKHRoaXMuc3RhdGUoKSwgbmV3U3RhdGUpO1xuXG4gICAgaWYgKCEodHJhbnNpdGlvbl9mb3IpKSAgICAgICAgICB7IHJldHVybiBmYWxzZTsgfVxuICAgIGlmICh0cmFuc2l0aW9uX2Zvci5mb3JjZWRfb25seSkgeyByZXR1cm4gZmFsc2U7IH1cblxuICAgIHJldHVybiB0cnVlO1xuXG4gIH1cblxuICB2YWxpZF9mb3JjZV90cmFuc2l0aW9uKG5ld1N0YXRlOiBtTlQsIF9uZXdEYXRhPzogbURUKTogYm9vbGVhbiB7ICAvLyB0b2RvIGNvbWViYWNrIHVuaWdub3JlIG5ld0RhdGFcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICByZXR1cm4gKHRoaXMubG9va3VwX3RyYW5zaXRpb25fZm9yKHRoaXMuc3RhdGUoKSwgbmV3U3RhdGUpICE9PSB1bmRlZmluZWQpO1xuICB9XG5cblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIHNtPG1OVCwgbURUPih0ZW1wbGF0ZV9zdHJpbmdzOiBBcnJheTxzdHJpbmc+IC8qICwgYXJndW1lbnRzICovKTogTWFjaGluZTxtTlQsIG1EVD4ge1xuXG4gICAgLy8gZm9vYGEkezF9YiR7Mn1jYCB3aWxsIGNvbWUgaW4gYXMgKFsnYScsJ2InLCdjJ10sMSwyKVxuICAgIC8vIHRoaXMgaW5jbHVkZXMgd2hlbiBhIGFuZCBjIGFyZSBlbXB0eSBzdHJpbmdzXG4gICAgLy8gdGhlcmVmb3JlIHRlbXBsYXRlX3N0cmluZ3Mgd2lsbCBhbHdheXMgaGF2ZSBvbmUgbW9yZSBlbCB0aGFuIHRlbXBsYXRlX2FyZ3NcbiAgICAvLyB0aGVyZWZvcmUgbWFwIHRoZSBzbWFsbGVyIGNvbnRhaW5lciBhbmQgdG9zcyB0aGUgbGFzdCBvbmUgb24gb24gdGhlIHdheSBvdXRcblxuICAgIHJldHVybiBuZXcgTWFjaGluZShtYWtlKHRlbXBsYXRlX3N0cmluZ3MucmVkdWNlKFxuXG4gICAgICAvLyBpbiBnZW5lcmFsIGF2b2lkaW5nIGBhcmd1bWVudHNgIGlzIHNtYXJ0LiAgaG93ZXZlciB3aXRoIHRoZSB0ZW1wbGF0ZVxuICAgICAgLy8gc3RyaW5nIG5vdGF0aW9uLCBhcyBkZXNpZ25lZCwgaXQncyBub3QgcmVhbGx5IHdvcnRoIHRoZSBoYXNzbGVcblxuICAgICAgLyogZXNsaW50LWRpc2FibGUgZnAvbm8tYXJndW1lbnRzICovXG4gICAgICAvKiBlc2xpbnQtZGlzYWJsZSBwcmVmZXItcmVzdC1wYXJhbXMgKi9cbiAgICAgIChhY2MsIHZhbCwgaWR4KTogc3RyaW5nID0+IGAke2FjY30ke2FyZ3VtZW50c1tpZHhdfSR7dmFsfWAgIC8vIGFyZ3VtZW50c1swXSBpcyBuZXZlciBsb2FkZWQsIHNvIGFyZ3MgZG9lc24ndCBuZWVkIHRvIGJlIGdhdGVkXG4gICAgICAvKiBlc2xpbnQtZW5hYmxlICBwcmVmZXItcmVzdC1wYXJhbXMgKi9cbiAgICAgIC8qIGVzbGludC1lbmFibGUgIGZwL25vLWFyZ3VtZW50cyAqL1xuXG4gICAgKSkpO1xuXG59XG5cblxuXG5cblxuZXhwb3J0IHtcblxuICB2ZXJzaW9uLFxuXG4gIHRyYW5zZmVyX3N0YXRlX3Byb3BlcnRpZXMsXG5cbiAgTWFjaGluZSxcblxuICBtYWtlLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG5cbiAgc20sXG5cbiAgYXJyb3dfZGlyZWN0aW9uLFxuICBhcnJvd19sZWZ0X2tpbmQsXG4gIGFycm93X3JpZ2h0X2tpbmQsXG5cbiAgLy8gdG9kbyB3aGFyZ2FyYmwgdGhlc2Ugc2hvdWxkIGJlIGV4cG9ydGVkIHRvIGEgdXRpbGl0eSBsaWJyYXJ5XG4gIHNlcSwgd2VpZ2h0ZWRfcmFuZF9zZWxlY3QsIGhpc3RvZ3JhcGgsIHdlaWdodGVkX3NhbXBsZV9zZWxlY3QsIHdlaWdodGVkX2hpc3RvX2tleVxuXG59O1xuIl19