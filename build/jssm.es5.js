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
    case '<-=>':case '←⇒':case '←=>':case '<-⇒':
    case '<-~>':case '←↛':case '←~>':case '<-↛':

    case '<=>':case '⇔':
    case '<=->':case '⇐→':case '⇐->':case '<=→':
    case '<=~>':case '⇐↛':case '⇐~>':case '<=↛':

    case '<~>':case '↮':
    case '<~->':case '↚→':case '↚->':case '<~→':
    case '<~=>':case '↚⇒':case '↚=>':case '<~⇒':
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLmpzIl0sIm5hbWVzIjpbInJlZHVjZV90b182MzkiLCJyZXF1aXJlIiwicmVkdWNlIiwicGFyc2UiLCJ2ZXJzaW9uIiwiYXJyb3dfZGlyZWN0aW9uIiwiYXJyb3ciLCJTdHJpbmciLCJFcnJvciIsImFycm93X2xlZnRfa2luZCIsImFycm93X3JpZ2h0X2tpbmQiLCJtYWtlVHJhbnNpdGlvbiIsInRoaXNfc2UiLCJmcm9tIiwidG8iLCJpc1JpZ2h0Iiwid2FzTGlzdCIsIndhc0luZGV4Iiwia2luZCIsImVkZ2UiLCJmb3JjZWRfb25seSIsIm1haW5fcGF0aCIsInVuZGVmaW5lZCIsImFjdGlvbiIsInByb2JhYmlsaXR5IiwiY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcCIsImFjYyIsIm5leHRfc2UiLCJlZGdlcyIsInVGcm9tIiwiQXJyYXkiLCJpc0FycmF5IiwidVRvIiwibWFwIiwiZiIsInQiLCJyaWdodCIsInB1c2giLCJsZWZ0IiwibmV3X2FjYyIsImNvbmNhdCIsInNlIiwiY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uIiwicnVsZSIsImNvbXBpbGVfcnVsZV9oYW5kbGVyIiwia2V5IiwiYWdnX2FzIiwidmFsIiwidmFsdWUiLCJuYW1lIiwic3RhdGUiLCJkZWNsYXJhdGlvbnMiLCJ0YXV0b2xvZ2llcyIsImluY2x1ZGVzIiwiSlNPTiIsInN0cmluZ2lmeSIsImNvbXBpbGUiLCJ0cmVlIiwicmVzdWx0cyIsImdyYXBoX2xheW91dCIsInRyYW5zaXRpb24iLCJzdGFydF9zdGF0ZXMiLCJlbmRfc3RhdGVzIiwic3RhdGVfZGVjbGFyYXRpb24iLCJmc2xfdmVyc2lvbiIsIm1hY2hpbmVfYXV0aG9yIiwibWFjaGluZV9jb21tZW50IiwibWFjaGluZV9jb250cmlidXRvciIsIm1hY2hpbmVfZGVmaW5pdGlvbiIsIm1hY2hpbmVfbGFuZ3VhZ2UiLCJtYWNoaW5lX2xpY2Vuc2UiLCJtYWNoaW5lX25hbWUiLCJtYWNoaW5lX3JlZmVyZW5jZSIsIm1hY2hpbmVfdmVyc2lvbiIsInRyIiwiYXNzZW1ibGVkX3RyYW5zaXRpb25zIiwicmVzdWx0X2NmZyIsImxlbmd0aCIsInRyYW5zaXRpb25zIiwib25lT25seUtleXMiLCJvbmVPbmx5S2V5IiwibXVsdGlLZXkiLCJtYWtlIiwicGxhbiIsInRyYW5zZmVyX3N0YXRlX3Byb3BlcnRpZXMiLCJzdGF0ZV9kZWNsIiwiZCIsIm5vZGVfc2hhcGUiLCJub2RlX2NvbG9yIiwiTWFjaGluZSIsImNvbXBsZXRlIiwiX3N0YXRlIiwiX3N0YXRlcyIsIk1hcCIsIl9zdGF0ZV9kZWNsYXJhdGlvbnMiLCJfZWRnZXMiLCJfZWRnZV9tYXAiLCJfbmFtZWRfdHJhbnNpdGlvbnMiLCJfYWN0aW9ucyIsIl9yZXZlcnNlX2FjdGlvbnMiLCJfcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyIsIl9tYWNoaW5lX2F1dGhvciIsIl9tYWNoaW5lX2NvbW1lbnQiLCJfbWFjaGluZV9jb250cmlidXRvciIsIl9tYWNoaW5lX2RlZmluaXRpb24iLCJfbWFjaGluZV9sYW5ndWFnZSIsIl9tYWNoaW5lX2xpY2Vuc2UiLCJfbWFjaGluZV9uYW1lIiwiX21hY2hpbmVfdmVyc2lvbiIsIl9yYXdfc3RhdGVfZGVjbGFyYXRpb24iLCJfZnNsX3ZlcnNpb24iLCJfZ3JhcGhfbGF5b3V0IiwiaGFzIiwic2V0IiwiY3Vyc29yX2Zyb20iLCJnZXQiLCJfbmV3X3N0YXRlIiwiY3Vyc29yX3RvIiwidGhpc0VkZ2VJZCIsImZyb21fbWFwcGluZyIsImFjdGlvbk1hcCIsInJBY3Rpb25NYXAiLCJzdGF0ZV9jb25maWciLCJ3aGljaFN0YXRlIiwic3RhdGVfaXNfdGVybWluYWwiLCJzdGF0ZV9pc19jb21wbGV0ZSIsInN0YXRlX2lzX2ZpbmFsIiwid2hpY2giLCJpbnRlcm5hbF9zdGF0ZV9pbXBsX3ZlcnNpb24iLCJhY3Rpb25zIiwiZWRnZV9tYXAiLCJuYW1lZF90cmFuc2l0aW9ucyIsInJldmVyc2VfYWN0aW9ucyIsInN0YXRlcyIsImtleXMiLCJlbWciLCJpZCIsImdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzIiwiZW50cmFuY2VzIiwibGlzdF9lbnRyYW5jZXMiLCJleGl0cyIsImxpc3RfZXhpdHMiLCJ3c3RhdGUiLCJ3c3RhdGVfdG8iLCJ3dGYiLCJ3cyIsImxvb2t1cF90cmFuc2l0aW9uX2ZvciIsImZpbHRlciIsIkJvb2xlYW4iLCJzZWxlY3RlZCIsInByb2JhYmxlX2V4aXRzX2ZvciIsIm4iLCJzdGF0ZV93YXMiLCJwcm9iYWJpbGlzdGljX3RyYW5zaXRpb24iLCJwcm9iYWJpbGlzdGljX3dhbGsiLCJyYV9iYXNlIiwidmFsdWVzIiwiZWRnZUlkIiwibyIsImZpbHRlcmVkIiwic29tZSIsIngiLCJpc191bmVudGVyYWJsZSIsIm5ld0RhdGEiLCJ2YWxpZF9hY3Rpb24iLCJjdXJyZW50X2FjdGlvbl9lZGdlX2ZvciIsIm5ld1N0YXRlIiwidmFsaWRfdHJhbnNpdGlvbiIsInZhbGlkX2ZvcmNlX3RyYW5zaXRpb24iLCJhY3Rpb25fYmFzZSIsImlkeCIsImN1cnJlbnRfYWN0aW9uX2ZvciIsIl9uZXdEYXRhIiwidHJhbnNpdGlvbl9mb3IiLCJzbSIsInRlbXBsYXRlX3N0cmluZ3MiLCJzZXEiLCJ3ZWlnaHRlZF9yYW5kX3NlbGVjdCIsImhpc3RvZ3JhcGgiLCJ3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0Iiwid2VpZ2h0ZWRfaGlzdG9fa2V5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUE0QkE7Ozs7OztBQTNCQTs7QUFJQSxJQUFNQSxnQkFBMkJDLFFBQVEsaUJBQVIsRUFBMkJDLE1BQTVEOztBQXlCQSxJQUFNQyxRQUFrQkYsUUFBUSxlQUFSLEVBQXlCRSxLQUFqRCxDLENBQXlEOztBQUV6RCxJQUFNQyxVQUFnQixJQUF0QixDLENBQTRCOzs7QUFNNUI7O0FBRUEsU0FBU0MsZUFBVCxDQUF5QkMsS0FBekIsRUFBK0Q7O0FBRTdELFVBQVNDLE9BQU9ELEtBQVAsQ0FBVDs7QUFFRSxTQUFLLElBQUwsQ0FBbUIsS0FBSyxHQUFMO0FB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QWdDO0FBQUUsZUFBTyxLQUFQO0FBQWU7QUFDakQsVUFBSUEsZUFBZXpKLFdBQW5CLEVBQWdDO0FBQUUsZUFBTyxLQUFQO0FBQWU7O0FBRWpELGFBQU8sSUFBUDtBQUVEOzs7MkNBRXNCa0osUSxFQUFlTSxRLEVBQXlCO0FBQUc7QUFDaEU7QUFDQTtBQUNBO0FBQ0EsYUFBUSxLQUFLMUIscUJBQUwsQ0FBMkIsS0FBS2hHLEtBQUwsRUFBM0IsRUFBeUNvSCxRQUF6QyxNQUF1RGhKLFNBQS9EO0FBQ0Q7Ozs7OztBQVNILFNBQVN3SixFQUFULENBQXNCQyxnQkFBdEIsQ0FBc0QsaUJBQXRELEVBQTRGO0FBQUE7OztBQUV4RjtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxTQUFPLElBQUl0RixPQUFKLENBQVlQLEtBQUs2RixpQkFBaUI3SyxNQUFqQjs7QUFFdEI7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsWUFBQ3dCLEdBQUQsRUFBTXFCLEdBQU4sRUFBVzJILEdBQVg7QUFBQSxnQkFBOEJoSixHQUE5QixHQUFvQyxXQUFVZ0osR0FBVixDQUFwQyxHQUFxRDNILEdBQXJEO0FBQUEsR0FQc0IsQ0FPc0M7QUFDNUQ7QUFDQTs7QUFUc0IsR0FBTCxDQUFaLENBQVA7QUFhSDs7UUFRQzNDLE8sR0FBQUEsTztRQUVBZ0YseUIsR0FBQUEseUI7UUFFQUssTyxHQUFBQSxPO1FBRUFQLEksR0FBQUEsSTtRQUNFL0UsSyxHQUFBQSxLO1FBQ0FxRCxPLEdBQUFBLE87UUFFRnNILEUsR0FBQUEsRTtRQUVBekssZSxHQUFBQSxlO1FBQ0FJLGUsR0FBQUEsZTtRQUNBQyxnQixHQUFBQSxnQjtRQUdBc0ssRztRQUFLQyxvQjtRQUFzQkMsVTtRQUFZQyxzQjtRQUF3QkMsa0IiLCJmaWxlIjoianNzbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLy8gd2hhcmdhcmJsIGxvdHMgb2YgdGhlc2UgcmV0dXJuIGFycmF5cyBjb3VsZC9zaG91bGQgYmUgc2V0c1xuXG4vLyBAZmxvd1xuXG5jb25zdCByZWR1Y2VfdG9fNjM5IDogRnVuY3Rpb24gPSByZXF1aXJlKCdyZWR1Y2UtdG8tNjM5LTEnKS5yZWR1Y2U7XG5cblxuXG5cblxuaW1wb3J0IHR5cGUge1xuXG4gIEpzc21HZW5lcmljU3RhdGUsIEpzc21HZW5lcmljQ29uZmlnLFxuICBKc3NtVHJhbnNpdGlvbiwgSnNzbVRyYW5zaXRpb25MaXN0LCBKc3NtVHJhbnNpdGlvblJ1bGUsXG4gIEpzc21NYWNoaW5lSW50ZXJuYWxTdGF0ZSxcbiAgSnNzbVBhcnNlVHJlZSxcbiAgSnNzbVN0YXRlRGVjbGFyYXRpb24sIEpzc21TdGF0ZURlY2xhcmF0aW9uUnVsZSxcbiAgSnNzbUNvbXBpbGVTZSwgSnNzbUNvbXBpbGVTZVN0YXJ0LCBKc3NtQ29tcGlsZVJ1bGUsXG4gIEpzc21BcnJvdywgSnNzbUFycm93RGlyZWN0aW9uLCBKc3NtQXJyb3dLaW5kLFxuICBKc3NtTGF5b3V0XG5cbn0gZnJvbSAnLi9qc3NtLXR5cGVzJztcblxuXG5cblxuXG5pbXBvcnQgeyBzZXEsIHdlaWdodGVkX3JhbmRfc2VsZWN0LCB3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0LCBoaXN0b2dyYXBoLCB3ZWlnaHRlZF9oaXN0b19rZXkgfSBmcm9tICcuL2pzc20tdXRpbC5qcyc7XG5cbmNvbnN0IHBhcnNlOiBGdW5jdGlvbiA9IHJlcXVpcmUoJy4vanNzbS1kb3QuanMnKS5wYXJzZTsgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZmxvd3R5cGUvbm8td2Vhay10eXBlcyAvLyB0b2RvIHdoYXJnYXJibCByZW1vdmUgYW55XG5cbmNvbnN0IHZlcnNpb246IG51bGwgPSBudWxsOyAvLyByZXBsYWNlZCBmcm9tIHBhY2thZ2UuanMgaW4gYnVpbGRcblxuXG5cblxuXG4vKiBlc2xpbnQtZGlzYWJsZSBjb21wbGV4aXR5ICovXG5cbmZ1bmN0aW9uIGFycm93X2RpcmVjdGlvbihhcnJvdzogSnNzbUFycm93KTogSnNzbUFycm93RGlyZWN0aW9uIHtcblxuICBzd2l0Y2ggKCBTdHJpbmcoYXJyb3cpICkge1xuXG4gICAgY2FzZSAnLT4nICAgOiAgICAgIGNhc2UgJ+KGkicgIDpcbiAgICBjYXNlICc9PicgICA6ICAgICAgY2FzZSAn4oeSJyAgOlxuICAgIGNhc2UgJ34+JyAgIDogICAgICBjYXNlICfihpsnICA6XG4gICAgICByZXR1cm4gJ3JpZ2h0JztcblxuICAgIGNhc2UgJzwtJyAgIDogICAgICBjYXNlICfihpAnICA6XG4gICAgY2FzZSAnPD0nICAgOiAgICAgIGNhc2UgJ+KHkCcgIDpcbiAgICBjYXNlICc8ficgICA6ICAgICAgY2FzZSAn4oaaJyAgOlxuICAgICAgcmV0dXJuICdsZWZ0JztcblxuICAgIGNhc2UgJzwtPicgIDogICAgICBjYXNlICfihpQnICA6XG4gICAgY2FzZSAnPC09PicgOiAgICAgIGNhc2UgJ+KGkOKHkicgOiAgICAgIGNhc2UgJ+KGkD0+JyA6ICAgICAgY2FzZSAnPC3ih5InIDpcbiAgICBjYXNlICc8LX4+JyA6ICAgICAgY2FzZSAn4oaQ4oabJyA6ICAgICAgY2FzZSAn4oaQfj4nIDogICAgICBjYXNlICc8LeKGmycgOlxuXG4gICAgY2FzZSAnPD0+JyAgOiAgICAgIGNhc2UgJ+KHlCcgIDpcbiAgICBjYXNlICc8PS0+JyA6ICAgICAgY2FzZSAn4oeQ4oaSJyA6ICAgICAgY2FzZSAn4oeQLT4nIDogICAgICBjYXNlICc8PeKGkicgOlxuICAgIGNhc2UgJzw9fj4nIDogICAgICBjYXNlICfih5DihpsnIDogICAgICBjYXNlICfih5B+PicgOiAgICAgIGNhc2UgJzw94oabJyA6XG5cbiAgICBjYXNlICc8fj4nICA6ICAgICAgY2FzZSAn4oauJyAgOlxuICAgIGNhc2UgJzx+LT4nIDogICAgICBjYXNlICfihprihpInIDogICAgICBjYXNlICfihpotPicgOiAgICAgIGNhc2UgJzx+4oaSJyA6XG4gICAgY2FzZSAnPH49PicgOiAgICAgIGNhc2UgJ+KGmuKHkicgOiAgICAgIGNhc2UgJ+KGmj0+JyA6ICAgICAgY2FzZSAnPH7ih5InIDpcbiAgICAgIHJldHVybiAnYm90aCc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcnJvd19kaXJlY3Rpb246IHVua25vd24gYXJyb3cgdHlwZSAke2Fycm93fWApO1xuXG4gIH1cblxufVxuXG4vKiBlc2xpbnQtZW5hYmxlIGNvbXBsZXhpdHkgKi9cblxuXG5cblxuXG4vKiBlc2xpbnQtZGlzYWJsZSBjb21wbGV4aXR5ICovXG5cbmZ1bmN0aW9uIGFycm93X2xlZnRfa2luZChhcnJvdzogSnNzbUFycm93KTogSnNzbUFycm93S2luZCB7XG5cbiAgc3dpdGNoICggU3RyaW5nKGFycm93KSApIHtcblxuICAgIGNhc2UgJy0+JyA6ICAgIGNhc2UgJ+KGkicgOlxuICAgIGNhc2UgJz0+JyA6ICAgIGNhc2UgJ+KHkicgOlxuICAgIGNhc2UgJ34+JyA6ICAgIGNhc2UgJ+KGmycgOlxuICAgICAgcmV0dXJuICdub25lJztcblxuICAgIGNhc2UgJzwtJzogICAgIGNhc2UgJ+KGkCcgOlxuICAgIGNhc2UgJzwtPic6ICAgIGNhc2UgJ+KGlCcgOlxuICAgIGNhc2UgJzwtPT4nOiAgIGNhc2UgJ+KGkOKHkicgOlxuICAgIGNhc2UgJzwtfj4nOiAgIGNhc2UgJ+KGkOKGmycgOlxuICAgICAgcmV0dXJuICdsZWdhbCc7XG5cbiAgICBjYXNlICc8PSc6ICAgICBjYXNlICfih5AnIDpcbiAgICBjYXNlICc8PT4nOiAgICBjYXNlICfih5QnIDpcbiAgICBjYXNlICc8PS0+JzogICBjYXNlICfih5DihpInIDpcbiAgICBjYXNlICc8PX4+JzogICBjYXNlICfih5DihpsnIDpcbiAgICAgIHJldHVybiAnbWFpbic7XG5cbiAgICBjYXNlICc8fic6ICAgICBjYXNlICfihponIDpcbiAgICBjYXNlICc8fj4nOiAgICBjYXNlICfihq4nIDpcbiAgICBjYXNlICc8fi0+JzogICBjYXNlICfihprihpInIDpcbiAgICBjYXNlICc8fj0+JzogICBjYXNlICfihprih5InIDpcbiAgICAgIHJldHVybiAnZm9yY2VkJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGFycm93X2RpcmVjdGlvbjogdW5rbm93biBhcnJvdyB0eXBlICR7YXJyb3d9YCk7XG5cbiAgfVxuXG59XG5cbi8qIGVzbGludC1lbmFibGUgY29tcGxleGl0eSAqL1xuXG5cblxuXG5cbi8qIGVzbGludC1kaXNhYmxlIGNvbXBsZXhpdHkgKi9cblxuZnVuY3Rpb24gYXJyb3dfcmlnaHRfa2luZChhcnJvdzogSnNzbUFycm93KTogSnNzbUFycm93S2luZCB7XG5cbiAgc3dpdGNoICggU3RyaW5nKGFycm93KSApIHtcblxuICAgIGNhc2UgJzwtJyA6ICAgIGNhc2UgJ+KGkCcgOlxuICAgIGNhc2UgJzw9JyA6ICAgIGNhc2UgJ+KHkCcgOlxuICAgIGNhc2UgJzx+JyA6ICAgIGNhc2UgJ+KGmicgOlxuICAgICAgcmV0dXJuICdub25lJztcblxuICAgIGNhc2UgJy0+JyA6ICAgIGNhc2UgJ+KGkicgOlxuICAgIGNhc2UgJzwtPic6ICAgIGNhc2UgJ+KGlCcgOlxuICAgIGNhc2UgJzw9LT4nOiAgIGNhc2UgJ+KHkOKGkicgOlxuICAgIGNhc2UgJzx+LT4nOiAgIGNhc2UgJ+KGmuKGkicgOlxuICAgICAgcmV0dXJuICdsZWdhbCc7XG5cbiAgICBjYXNlICc9PicgOiAgICBjYXNlICfih5InIDpcbiAgICBjYXNlICc8PT4nOiAgICBjYXNlICfih5QnIDpcbiAgICBjYXNlICc8LT0+JzogICBjYXNlICfihpDih5InIDpcbiAgICBjYXNlICc8fj0+JzogICBjYXNlICfihprih5InIDpcbiAgICAgIHJldHVybiAnbWFpbic7XG5cbiAgICBjYXNlICd+PicgOiAgICBjYXNlICfihpsnIDpcbiAgICBjYXNlICc8fj4nOiAgICBjYXNlICfihq4nIDpcbiAgICBjYXNlICc8LX4+JzogICBjYXNlICfihpDihpsnIDpcbiAgICBjYXNlICc8PX4+JzogICBjYXNlICfih5DihpsnIDpcbiAgICAgIHJldHVybiAnZm9yY2VkJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGFycm93X2RpcmVjdGlvbjogdW5rbm93biBhcnJvdyB0eXBlICR7YXJyb3d9YCk7XG5cbiAgfVxuXG59XG5cbi8qIGVzbGludC1lbmFibGUgY29tcGxleGl0eSAqL1xuXG5cblxuXG5cbmZ1bmN0aW9uIG1ha2VUcmFuc2l0aW9uPG1OVCwgbURUPihcbiAgdGhpc19zZSAgIDogSnNzbUNvbXBpbGVTZTxtTlQ+LFxuICBmcm9tICAgICAgOiBtTlQsXG4gIHRvICAgICAgICA6IG1OVCxcbiAgaXNSaWdodCAgIDogYm9vbGVhbixcbiAgd2FzTGlzdD8gIDogQXJyYXk8bU5UPixcbiAgd2FzSW5kZXg/IDogbnVtYmVyXG4pIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+IHtcblxuICBjb25zdCBraW5kIDogSnNzbUFycm93S2luZCAgICAgICAgICAgID0gaXNSaWdodD8gYXJyb3dfcmlnaHRfa2luZCh0aGlzX3NlLmtpbmQpIDogYXJyb3dfbGVmdF9raW5kKHRoaXNfc2Uua2luZCksXG4gICAgICAgIGVkZ2UgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB7XG4gICAgICAgICAgZnJvbSxcbiAgICAgICAgICB0byxcbiAgICAgICAgICBraW5kLFxuICAgICAgICAgIGZvcmNlZF9vbmx5IDoga2luZCA9PT0gJ2ZvcmNlZCcsXG4gICAgICAgICAgbWFpbl9wYXRoICAgOiBraW5kID09PSAnbWFpbidcbiAgICAgICAgfTtcblxuICBpZiAoKHdhc0xpc3QgIT09IHVuZGVmaW5lZCkgICYmICh3YXNJbmRleCA9PT0gdW5kZWZpbmVkKSkgeyB0aHJvdyBcIk11c3QgaGF2ZSBhbiBpbmRleCBpZiB0cmFuc2l0aW9uIHdhcyBpbiBhIGxpc3RcIjsgfVxuICBpZiAoKHdhc0luZGV4ICE9PSB1bmRlZmluZWQpICYmICh3YXNMaXN0ID09PSB1bmRlZmluZWQpKSAgeyB0aHJvdyBcIk11c3QgYmUgaW4gYSBsaXN0IGlmIHRyYW5zaXRpb24gaGFzIGFuIGluZGV4XCI7ICAgfVxuLypcbiAgaWYgKHR5cGVvZiBlZGdlLnRvID09PSAnb2JqZWN0Jykge1xuXG4gICAgaWYgKGVkZ2UudG8ua2V5ID09PSAnY3ljbGUnKSB7XG4gICAgICBpZiAod2FzTGlzdCA9PT0gdW5kZWZpbmVkKSB7IHRocm93IFwiTXVzdCBoYXZlIGEgd2FzbGlzdCBpZiBhIHRvIGlzIHR5cGUgY3ljbGVcIjsgfVxuICAgICAgY29uc3QgbmV4dEluZGV4ID0gd3JhcEJ5KHdhc0luZGV4LCBlZGdlLnRvLnZhbHVlLCB3YXNMaXN0Lmxlbmd0aCk7XG4gICAgICBlZGdlLnRvID0gd2FzTGlzdFtuZXh0SW5kZXhdO1xuICAgIH1cblxuICB9XG4qL1xuICBjb25zdCBhY3Rpb24gICAgICA6IHN0cmluZyA9IGlzUmlnaHQ/ICdyX2FjdGlvbicgICAgICA6ICdsX2FjdGlvbicsXG4gICAgICAgIHByb2JhYmlsaXR5IDogc3RyaW5nID0gaXNSaWdodD8gJ3JfcHJvYmFiaWxpdHknIDogJ2xfcHJvYmFiaWxpdHknO1xuXG4gIGlmICh0aGlzX3NlW2FjdGlvbl0pICAgICAgeyBlZGdlLmFjdGlvbiAgICAgID0gdGhpc19zZVthY3Rpb25dOyAgICAgIH1cbiAgaWYgKHRoaXNfc2VbcHJvYmFiaWxpdHldKSB7IGVkZ2UucHJvYmFiaWxpdHkgPSB0aGlzX3NlW3Byb2JhYmlsaXR5XTsgfVxuXG4gIHJldHVybiBlZGdlO1xuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcDxtTlQsIG1EVD4oXG4gICAgICAgICAgICAgYWNjICAgICA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPixcbiAgICAgICAgICAgICBmcm9tICAgIDogbU5ULFxuICAgICAgICAgICAgIHRvICAgICAgOiBtTlQsXG4gICAgICAgICAgICAgdGhpc19zZSA6IEpzc21Db21waWxlU2U8bU5UPixcbiAgICAgICAgICAgICBuZXh0X3NlIDogSnNzbUNvbXBpbGVTZTxtTlQ+XG4gICAgICAgICApIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IHsgLy8gdG9kbyBmbG93IGRlc2NyaWJlIHRoZSBwYXJzZXIgcmVwcmVzZW50YXRpb24gb2YgYSB0cmFuc2l0aW9uIHN0ZXAgZXh0ZW5zaW9uXG5cbiAgY29uc3QgZWRnZXMgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBbXTtcblxuICBjb25zdCB1RnJvbSA6IEFycmF5PCBtTlQgPiA9IChBcnJheS5pc0FycmF5KGZyb20pPyBmcm9tIDogW2Zyb21dKSxcbiAgICAgICAgdVRvICAgOiBBcnJheTwgbU5UID4gPSAoQXJyYXkuaXNBcnJheSh0byk/ICAgdG8gICA6IFt0b10gICk7XG5cbiAgdUZyb20ubWFwKCAoZjogbU5UKSA9PiB7XG4gICAgdVRvLm1hcCggKHQ6IG1OVCkgPT4ge1xuXG4gICAgICBjb25zdCByaWdodDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gbWFrZVRyYW5zaXRpb24odGhpc19zZSwgZiwgdCwgdHJ1ZSk7XG4gICAgICBpZiAocmlnaHQua2luZCAhPT0gJ25vbmUnKSB7IGVkZ2VzLnB1c2gocmlnaHQpOyB9XG5cbiAgICAgIGNvbnN0IGxlZnQ6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IG1ha2VUcmFuc2l0aW9uKHRoaXNfc2UsIHQsIGYsIGZhbHNlKTtcbiAgICAgIGlmIChsZWZ0LmtpbmQgIT09ICdub25lJykgeyBlZGdlcy5wdXNoKGxlZnQpOyB9XG5cbiAgICB9KTtcbiAgfSk7XG5cbiAgY29uc3QgbmV3X2FjYzogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+ID0gYWNjLmNvbmNhdChlZGdlcyk7XG5cbiAgaWYgKG5leHRfc2UpIHtcbiAgICByZXR1cm4gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcChuZXdfYWNjLCB0bywgbmV4dF9zZS50bywgbmV4dF9zZSwgbmV4dF9zZS5zZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ld19hY2M7XG4gIH1cblxufVxuXG5cblxuZnVuY3Rpb24gY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uPG1OVD4ocnVsZTogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pOiBtaXhlZCB7IC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgcGFyc2VyIHJlcHJlc2VudGF0aW9uIG9mIGEgdHJhbnNpdGlvblxuICByZXR1cm4gY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcChbXSwgcnVsZS5mcm9tLCBydWxlLnNlLnRvLCBydWxlLnNlLCBydWxlLnNlLnNlKTtcbn1cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVfcnVsZV9oYW5kbGVyPG1OVD4ocnVsZTogSnNzbUNvbXBpbGVTZVN0YXJ0PG1OVD4pOiBKc3NtQ29tcGlsZVJ1bGUgeyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIG91dHB1dCBvZiB0aGUgcGFyc2VyXG5cbiAgaWYgKHJ1bGUua2V5ID09PSAndHJhbnNpdGlvbicpIHtcbiAgICByZXR1cm4geyBhZ2dfYXM6ICd0cmFuc2l0aW9uJywgdmFsOiBjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb24ocnVsZSkgfTtcbiAgfVxuXG4gIGlmIChydWxlLmtleSA9PT0gJ21hY2hpbmVfbGFuZ3VhZ2UnKSB7XG4gICAgcmV0dXJuIHsgYWdnX2FzOiAnbWFjaGluZV9sYW5ndWFnZScsIHZhbDogcmVkdWNlX3RvXzYzOShydWxlLnZhbHVlKSB9O1xuICB9XG5cbiAgaWYgKHJ1bGUua2V5ID09PSAnc3RhdGVfZGVjbGFyYXRpb24nKSB7XG4gICAgaWYgKCFydWxlLm5hbWUpIHsgdGhyb3cgbmV3IEVycm9yKCdTdGF0ZSBkZWNsYXJhdGlvbnMgbXVzdCBoYXZlIGEgbmFtZScpOyB9XG4gICAgcmV0dXJuIHsgYWdnX2FzOiAnc3RhdGVfZGVjbGFyYXRpb24nLCB2YWw6IHsgc3RhdGU6IHJ1bGUubmFtZSwgZGVjbGFyYXRpb25zOiBydWxlLnZhbHVlIH0gfTtcbiAgfVxuXG4gIGNvbnN0IHRhdXRvbG9naWVzIDogQXJyYXk8c3RyaW5nPiA9IFtcbiAgICAnZ3JhcGhfbGF5b3V0JywgJ3N0YXJ0X3N0YXRlcycsICdlbmRfc3RhdGVzJywgJ21hY2hpbmVfbmFtZScsICdtYWNoaW5lX3ZlcnNpb24nLFxuICAgICdtYWNoaW5lX2NvbW1lbnQnLCAnbWFjaGluZV9hdXRob3InLCAnbWFjaGluZV9jb250cmlidXRvcicsICdtYWNoaW5lX2RlZmluaXRpb24nLFxuICAgICdtYWNoaW5lX3JlZmVyZW5jZScsICdtYWNoaW5lX2xpY2Vuc2UnLCAnZnNsX3ZlcnNpb24nXG4gIF07XG5cbiAgaWYgKHRhdXRvbG9naWVzLmluY2x1ZGVzKHJ1bGUua2V5KSkge1xuICAgIHJldHVybiB7IGFnZ19hczogcnVsZS5rZXksIHZhbDogcnVsZS52YWx1ZSB9O1xuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKGBjb21waWxlX3J1bGVfaGFuZGxlcjogVW5rbm93biBydWxlOiAke0pTT04uc3RyaW5naWZ5KHJ1bGUpfWApO1xuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gY29tcGlsZTxtTlQsIG1EVD4odHJlZTogSnNzbVBhcnNlVHJlZTxtTlQ+KTogSnNzbUdlbmVyaWNDb25maWc8bU5ULCBtRFQ+IHsgIC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgb3V0cHV0IG9mIHRoZSBwYXJzZXJcblxuICBjb25zdCByZXN1bHRzIDoge1xuICAgIGdyYXBoX2xheW91dCAgICAgICAgOiBBcnJheTwgSnNzbUxheW91dCA+LFxuICAgIHRyYW5zaXRpb24gICAgICAgICAgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4sXG4gICAgc3RhcnRfc3RhdGVzICAgICAgICA6IEFycmF5PCBtTlQgPixcbiAgICBlbmRfc3RhdGVzICAgICAgICAgIDogQXJyYXk8IG1OVCA+LFxuICAgIHN0YXRlX2RlY2xhcmF0aW9uICAgOiBBcnJheTwgbU5UID4sXG4gICAgZnNsX3ZlcnNpb24gICAgICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2F1dGhvciAgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfY29tbWVudCAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9jb250cmlidXRvciA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2RlZmluaXRpb24gIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfbGFuZ3VhZ2UgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9saWNlbnNlICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX25hbWUgICAgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfcmVmZXJlbmNlICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV92ZXJzaW9uICAgICA6IEFycmF5PCBzdHJpbmcgPiAvLyBzZW12ZXJcbiAgfSA9IHtcbiAgICBncmFwaF9sYXlvdXQgICAgICAgIDogW10sXG4gICAgdHJhbnNpdGlvbiAgICAgICAgICA6IFtdLFxuICAgIHN0YXJ0X3N0YXRlcyAgICAgICAgOiBbXSxcbiAgICBlbmRfc3RhdGVzICAgICAgICAgIDogW10sXG4gICAgc3RhdGVfZGVjbGFyYXRpb24gICA6IFtdLFxuICAgIGZzbF92ZXJzaW9uICAgICAgICAgOiBbXSxcbiAgICBtYWNoaW5lX2F1dGhvciAgICAgIDogW10sXG4gICAgbWFjaGluZV9jb21tZW50ICAgICA6IFtdLFxuICAgIG1hY2hpbmVfY29udHJpYnV0b3IgOiBbXSxcbiAgICBtYWNoaW5lX2RlZmluaXRpb24gIDogW10sXG4gICAgbWFjaGluZV9sYW5ndWFnZSAgICA6IFtdLFxuICAgIG1hY2hpbmVfbGljZW5zZSAgICAgOiBbXSxcbiAgICBtYWNoaW5lX25hbWUgICAgICAgIDogW10sXG4gICAgbWFjaGluZV9yZWZlcmVuY2UgICA6IFtdLFxuICAgIG1hY2hpbmVfdmVyc2lvbiAgICAgOiBbXVxuICB9O1xuXG4gIHRyZWUubWFwKCAodHIgOiBKc3NtQ29tcGlsZVNlU3RhcnQ8bU5UPikgPT4ge1xuXG4gICAgY29uc3QgcnVsZSAgIDogSnNzbUNvbXBpbGVSdWxlID0gY29tcGlsZV9ydWxlX2hhbmRsZXIodHIpLFxuICAgICAgICAgIGFnZ19hcyA6IHN0cmluZyAgICAgICAgICA9IHJ1bGUuYWdnX2FzLFxuICAgICAgICAgIHZhbCAgICA6IG1peGVkICAgICAgICAgICA9IHJ1bGUudmFsOyAgICAgICAgICAgICAgICAgIC8vIHRvZG8gYmV0dGVyIHR5cGVzXG5cbiAgICByZXN1bHRzW2FnZ19hc10gPSByZXN1bHRzW2FnZ19hc10uY29uY2F0KHZhbCk7XG5cbiAgfSk7XG5cbiAgY29uc3QgYXNzZW1ibGVkX3RyYW5zaXRpb25zIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+ID0gW10uY29uY2F0KC4uLiByZXN1bHRzWyd0cmFuc2l0aW9uJ10pO1xuXG4gIGNvbnN0IHJlc3VsdF9jZmcgOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4gPSB7XG4gICAgc3RhcnRfc3RhdGVzIDogcmVzdWx0cy5zdGFydF9zdGF0ZXMubGVuZ3RoPyByZXN1bHRzLnN0YXJ0X3N0YXRlcyA6IFthc3NlbWJsZWRfdHJhbnNpdGlvbnNbMF0uZnJvbV0sXG4gICAgdHJhbnNpdGlvbnMgIDogYXNzZW1ibGVkX3RyYW5zaXRpb25zXG4gIH07XG5cbiAgY29uc3Qgb25lT25seUtleXMgOiBBcnJheTxzdHJpbmc+ID0gW1xuICAgICdncmFwaF9sYXlvdXQnLCAnbWFjaGluZV9uYW1lJywgJ21hY2hpbmVfdmVyc2lvbicsICdtYWNoaW5lX2NvbW1lbnQnLCAnZnNsX3ZlcnNpb24nLCAnbWFjaGluZV9saWNlbnNlJyxcbiAgICAnbWFjaGluZV9kZWZpbml0aW9uJywgJ21hY2hpbmVfbGFuZ3VhZ2UnXG4gIF07XG5cbiAgb25lT25seUtleXMubWFwKCAob25lT25seUtleSA6IHN0cmluZykgPT4ge1xuICAgIGlmIChyZXN1bHRzW29uZU9ubHlLZXldLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWF5IG9ubHkgaGF2ZSBvbmUgJHtvbmVPbmx5S2V5fSBzdGF0ZW1lbnQgbWF4aW11bTogJHtKU09OLnN0cmluZ2lmeShyZXN1bHRzW29uZU9ubHlLZXldKX1gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHJlc3VsdHNbb25lT25seUtleV0ubGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdF9jZmdbb25lT25seUtleV0gPSByZXN1bHRzW29uZU9ubHlLZXldWzBdO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgWydtYWNoaW5lX2F1dGhvcicsICdtYWNoaW5lX2NvbnRyaWJ1dG9yJywgJ21hY2hpbmVfcmVmZXJlbmNlJywgJ3N0YXRlX2RlY2xhcmF0aW9uJ10ubWFwKCAobXVsdGlLZXkgOiBzdHJpbmcpID0+IHtcbiAgICBpZiAocmVzdWx0c1ttdWx0aUtleV0ubGVuZ3RoKSB7XG4gICAgICByZXN1bHRfY2ZnW211bHRpS2V5XSA9IHJlc3VsdHNbbXVsdGlLZXldO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHJlc3VsdF9jZmc7XG5cbn1cblxuXG5cblxuXG5mdW5jdGlvbiBtYWtlPG1OVCwgbURUPihwbGFuOiBzdHJpbmcpOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4ge1xuICByZXR1cm4gY29tcGlsZShwYXJzZShwbGFuKSk7XG59XG5cblxuXG5cblxuZnVuY3Rpb24gdHJhbnNmZXJfc3RhdGVfcHJvcGVydGllczxtTlQ+KHN0YXRlX2RlY2w6IEpzc21TdGF0ZURlY2xhcmF0aW9uPG1OVD4pOiBKc3NtU3RhdGVEZWNsYXJhdGlvbjxtTlQ+IHtcblxuICAgIHN0YXRlX2RlY2wuZGVjbGFyYXRpb25zLm1hcCggKGQ6IEpzc21TdGF0ZURlY2xhcmF0aW9uUnVsZSkgPT4ge1xuICAgICAgc3dpdGNoIChkLmtleSkge1xuXG4gICAgICAgIGNhc2UgJ25vZGVfc2hhcGUnIDogc3RhdGVfZGVjbC5ub2RlX3NoYXBlID0gZC52YWx1ZTsgYnJlYWs7XG4gICAgICAgIGNhc2UgJ25vZGVfY29sb3InIDogc3RhdGVfZGVjbC5ub2RlX2NvbG9yID0gZC52YWx1ZTsgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHN0YXRlIHByb3BlcnR5OiAnJHtKU09OLnN0cmluZ2lmeShkKX0nYCk7XG5cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBzdGF0ZV9kZWNsO1xuXG59XG5cblxuXG5cblxuY2xhc3MgTWFjaGluZTxtTlQsIG1EVD4ge1xuXG5cbiAgX3N0YXRlICAgICAgICAgICAgICAgICAgOiBtTlQ7XG4gIF9zdGF0ZXMgICAgICAgICAgICAgICAgIDogTWFwPG1OVCwgSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+PjtcbiAgX2VkZ2VzICAgICAgICAgICAgICAgICAgOiBBcnJheTxKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4+O1xuICBfZWRnZV9tYXAgICAgICAgICAgICAgICA6IE1hcDxtTlQsIE1hcDxtTlQsIG51bWJlcj4+O1xuICBfbmFtZWRfdHJhbnNpdGlvbnMgICAgICA6IE1hcDxtTlQsIG51bWJlcj47XG4gIF9hY3Rpb25zICAgICAgICAgICAgICAgIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG4gIF9yZXZlcnNlX2FjdGlvbnMgICAgICAgIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG4gIF9yZXZlcnNlX2FjdGlvbl90YXJnZXRzIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG5cbiAgX21hY2hpbmVfYXV0aG9yICAgICAgICAgOiA/QXJyYXk8c3RyaW5nPjtcbiAgX21hY2hpbmVfY29tbWVudCAgICAgICAgOiA/c3RyaW5nO1xuICBfbWFjaGluZV9jb250cmlidXRvciAgICA6ID9BcnJheTxzdHJpbmc+O1xuICBfbWFjaGluZV9kZWZpbml0aW9uICAgICA6ID9zdHJpbmc7XG4gIF9tYWNoaW5lX2xhbmd1YWdlICAgICAgIDogP3N0cmluZztcbiAgX21hY2hpbmVfbGljZW5zZSAgICAgICAgOiA/c3RyaW5nO1xuICBfbWFjaGluZV9uYW1lICAgICAgICAgICA6ID9zdHJpbmc7XG4gIF9tYWNoaW5lX3ZlcnNpb24gICAgICAgIDogP3N0cmluZztcbiAgX2ZzbF92ZXJzaW9uICAgICAgICAgICAgOiA/c3RyaW5nO1xuICBfcmF3X3N0YXRlX2RlY2xhcmF0aW9uICA6ID9BcnJheTxPYmplY3Q+OyAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXNcbiAgX3N0YXRlX2RlY2xhcmF0aW9ucyAgICAgOiBNYXA8bU5ULCBKc3NtU3RhdGVEZWNsYXJhdGlvbjxtTlQ+PjtcblxuICBfZ3JhcGhfbGF5b3V0ICAgICAgICAgICA6IEpzc21MYXlvdXQ7XG5cblxuICAvLyB3aGFyZ2FyYmwgdGhpcyBiYWRseSBuZWVkcyB0byBiZSBicm9rZW4gdXAsIG1vbm9saXRoIG1hc3RlclxuICBjb25zdHJ1Y3Rvcih7XG4gICAgc3RhcnRfc3RhdGVzLFxuICAgIGNvbXBsZXRlICAgICAgICA9IFtdLFxuICAgIHRyYW5zaXRpb25zLFxuICAgIG1hY2hpbmVfYXV0aG9yLFxuICAgIG1hY2hpbmVfY29tbWVudCxcbiAgICBtYWNoaW5lX2NvbnRyaWJ1dG9yLFxuICAgIG1hY2hpbmVfZGVmaW5pdGlvbixcbiAgICBtYWNoaW5lX2xhbmd1YWdlLFxuICAgIG1hY2hpbmVfbGljZW5zZSxcbiAgICBtYWNoaW5lX25hbWUsXG4gICAgbWFjaGluZV92ZXJzaW9uLFxuICAgIHN0YXRlX2RlY2xhcmF0aW9uLFxuICAgIGZzbF92ZXJzaW9uLFxuICAgIGdyYXBoX2xheW91dCA9ICdkb3QnXG4gIH0gOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4pIHtcblxuICAgIHRoaXMuX3N0YXRlICAgICAgICAgICAgICAgICAgPSBzdGFydF9zdGF0ZXNbMF07XG4gICAgdGhpcy5fc3RhdGVzICAgICAgICAgICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9zdGF0ZV9kZWNsYXJhdGlvbnMgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX2VkZ2VzICAgICAgICAgICAgICAgICAgPSBbXTtcbiAgICB0aGlzLl9lZGdlX21hcCAgICAgICAgICAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX25hbWVkX3RyYW5zaXRpb25zICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fYWN0aW9ucyAgICAgICAgICAgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9yZXZlcnNlX2FjdGlvbnMgICAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMgPSBuZXcgTWFwKCk7ICAgLy8gdG9kb1xuXG4gICAgdGhpcy5fbWFjaGluZV9hdXRob3IgICAgICAgICA9IG1hY2hpbmVfYXV0aG9yO1xuICAgIHRoaXMuX21hY2hpbmVfY29tbWVudCAgICAgICAgPSBtYWNoaW5lX2NvbW1lbnQ7XG4gICAgdGhpcy5fbWFjaGluZV9jb250cmlidXRvciAgICA9IG1hY2hpbmVfY29udHJpYnV0b3I7XG4gICAgdGhpcy5fbWFjaGluZV9kZWZpbml0aW9uICAgICA9IG1hY2hpbmVfZGVmaW5pdGlvbjtcbiAgICB0aGlzLl9tYWNoaW5lX2xhbmd1YWdlICAgICAgID0gbWFjaGluZV9sYW5ndWFnZTtcbiAgICB0aGlzLl9tYWNoaW5lX2xpY2Vuc2UgICAgICAgID0gbWFjaGluZV9saWNlbnNlO1xuICAgIHRoaXMuX21hY2hpbmVfbmFtZSAgICAgICAgICAgPSBtYWNoaW5lX25hbWU7XG4gICAgdGhpcy5fbWFjaGluZV92ZXJzaW9uICAgICAgICA9IG1hY2hpbmVfdmVyc2lvbjtcbiAgICB0aGlzLl9yYXdfc3RhdGVfZGVjbGFyYXRpb24gID0gc3RhdGVfZGVjbGFyYXRpb24gfHwgW107XG4gICAgdGhpcy5fZnNsX3ZlcnNpb24gICAgICAgICAgICA9IGZzbF92ZXJzaW9uO1xuXG4gICAgdGhpcy5fZ3JhcGhfbGF5b3V0ICAgICAgICAgICA9IGdyYXBoX2xheW91dDtcblxuXG4gICAgaWYgKHN0YXRlX2RlY2xhcmF0aW9uKSB7XG4gICAgICBzdGF0ZV9kZWNsYXJhdGlvbi5tYXAoIChzdGF0ZV9kZWNsOiBKc3NtU3RhdGVEZWNsYXJhdGlvbjxtTlQ+KSA9PiB7XG5cbiAgICAgICAgaWYgKHRoaXMuX3N0YXRlX2RlY2xhcmF0aW9ucy5oYXMoc3RhdGVfZGVjbC5zdGF0ZSkpIHsgLy8gbm8gcmVwZWF0c1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQWRkZWQgdGhlIHNhbWUgc3RhdGUgZGVjbGFyYXRpb24gdHdpY2U6ICR7SlNPTi5zdHJpbmdpZnkoc3RhdGVfZGVjbC5zdGF0ZSl9YCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9zdGF0ZV9kZWNsYXJhdGlvbnMuc2V0KCBzdGF0ZV9kZWNsLnN0YXRlLCB0cmFuc2Zlcl9zdGF0ZV9wcm9wZXJ0aWVzKHN0YXRlX2RlY2wpICk7XG5cbiAgICAgIH0gKTtcbiAgICB9XG5cblxuICAgIHRyYW5zaXRpb25zLm1hcCggKHRyOkpzc21UcmFuc2l0aW9uPG1OVCwgbURUPikgPT4ge1xuXG4gICAgICBpZiAodHIuZnJvbSA9PT0gdW5kZWZpbmVkKSB7IHRocm93IG5ldyBFcnJvcihgdHJhbnNpdGlvbiBtdXN0IGRlZmluZSAnZnJvbSc6ICR7SlNPTi5zdHJpbmdpZnkodHIpfWApOyB9XG4gICAgICBpZiAodHIudG8gICA9PT0gdW5kZWZpbmVkKSB7IHRocm93IG5ldyBFcnJvcihgdHJhbnNpdGlvbiBtdXN0IGRlZmluZSAndG8nOiAkeyAgSlNPTi5zdHJpbmdpZnkodHIpfWApOyB9XG5cbiAgICAgIC8vIGdldCB0aGUgY3Vyc29ycy4gIHdoYXQgYSBtZXNzXG4gICAgICBjb25zdCBjdXJzb3JfZnJvbTogSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+XG4gICAgICAgICAgPSB0aGlzLl9zdGF0ZXMuZ2V0KHRyLmZyb20pXG4gICAgICAgICB8fCB7IG5hbWU6IHRyLmZyb20sIGZyb206IFtdLCB0bzogW10sIGNvbXBsZXRlOiBjb21wbGV0ZS5pbmNsdWRlcyh0ci5mcm9tKSB9O1xuXG4gICAgICBpZiAoISh0aGlzLl9zdGF0ZXMuaGFzKHRyLmZyb20pKSkge1xuICAgICAgICB0aGlzLl9uZXdfc3RhdGUoY3Vyc29yX2Zyb20pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjdXJzb3JfdG86IEpzc21HZW5lcmljU3RhdGU8bU5UPlxuICAgICAgICAgID0gdGhpcy5fc3RhdGVzLmdldCh0ci50bylcbiAgICAgICAgIHx8IHtuYW1lOiB0ci50bywgZnJvbTogW10sIHRvOiBbXSwgY29tcGxldGU6IGNvbXBsZXRlLmluY2x1ZGVzKHRyLnRvKSB9O1xuXG4gICAgICBpZiAoISh0aGlzLl9zdGF0ZXMuaGFzKHRyLnRvKSkpIHtcbiAgICAgICAgdGhpcy5fbmV3X3N0YXRlKGN1cnNvcl90byk7XG4gICAgICB9XG5cbiAgICAgIC8vIGd1YXJkIGFnYWluc3QgZXhpc3RpbmcgY29ubmVjdGlvbnMgYmVpbmcgcmUtYWRkZWRcbiAgICAgIGlmIChjdXJzb3JfZnJvbS50by5pbmNsdWRlcyh0ci50bykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBhbHJlYWR5IGhhcyAke0pTT04uc3RyaW5naWZ5KHRyLmZyb20pfSB0byAke0pTT04uc3RyaW5naWZ5KHRyLnRvKX1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGN1cnNvcl9mcm9tLnRvLnB1c2godHIudG8pO1xuICAgICAgICBjdXJzb3JfdG8uZnJvbS5wdXNoKHRyLmZyb20pO1xuICAgICAgfVxuXG4gICAgICAvLyBhZGQgdGhlIGVkZ2U7IG5vdGUgaXRzIGlkXG4gICAgICB0aGlzLl9lZGdlcy5wdXNoKHRyKTtcbiAgICAgIGNvbnN0IHRoaXNFZGdlSWQ6IG51bWJlciA9IHRoaXMuX2VkZ2VzLmxlbmd0aCAtIDE7XG5cbiAgICAgIC8vIGd1YXJkIGFnYWluc3QgcmVwZWF0aW5nIGEgdHJhbnNpdGlvbiBuYW1lXG4gICAgICBpZiAodHIubmFtZSkge1xuICAgICAgICBpZiAodGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMuaGFzKHRyLm5hbWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBuYW1lZCB0cmFuc2l0aW9uIFwiJHtKU09OLnN0cmluZ2lmeSh0ci5uYW1lKX1cIiBhbHJlYWR5IGNyZWF0ZWRgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9uYW1lZF90cmFuc2l0aW9ucy5zZXQodHIubmFtZSwgdGhpc0VkZ2VJZCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gc2V0IHVwIHRoZSBtYXBwaW5nLCBzbyB0aGF0IGVkZ2VzIGNhbiBiZSBsb29rZWQgdXAgYnkgZW5kcG9pbnQgcGFpcnNcbiAgICAgIGNvbnN0IGZyb21fbWFwcGluZzogTWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX2VkZ2VfbWFwLmdldCh0ci5mcm9tKSB8fCBuZXcgTWFwKCk7XG4gICAgICBpZiAoISh0aGlzLl9lZGdlX21hcC5oYXModHIuZnJvbSkpKSB7XG4gICAgICAgIHRoaXMuX2VkZ2VfbWFwLnNldCh0ci5mcm9tLCBmcm9tX21hcHBpbmcpO1xuICAgICAgfVxuXG4vLyAgICBjb25zdCB0b19tYXBwaW5nID0gZnJvbV9tYXBwaW5nLmdldCh0ci50byk7XG4gICAgICBmcm9tX21hcHBpbmcuc2V0KHRyLnRvLCB0aGlzRWRnZUlkKTsgLy8gYWxyZWFkeSBjaGVja2VkIHRoYXQgdGhpcyBtYXBwaW5nIGRvZXNuJ3QgZXhpc3QsIGFib3ZlXG5cbiAgICAgIC8vIHNldCB1cCB0aGUgYWN0aW9uIG1hcHBpbmcsIHNvIHRoYXQgYWN0aW9ucyBjYW4gYmUgbG9va2VkIHVwIGJ5IG9yaWdpblxuICAgICAgaWYgKHRyLmFjdGlvbikge1xuXG5cbiAgICAgICAgLy8gZm9yd2FyZCBtYXBwaW5nIGZpcnN0IGJ5IGFjdGlvbiBuYW1lXG4gICAgICAgIGxldCBhY3Rpb25NYXA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fYWN0aW9ucy5nZXQodHIuYWN0aW9uKTtcbiAgICAgICAgaWYgKCEoYWN0aW9uTWFwKSkge1xuICAgICAgICAgIGFjdGlvbk1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgICB0aGlzLl9hY3Rpb25zLnNldCh0ci5hY3Rpb24sIGFjdGlvbk1hcCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYWN0aW9uTWFwLmhhcyh0ci5mcm9tKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgYWN0aW9uICR7SlNPTi5zdHJpbmdpZnkodHIuYWN0aW9uKX0gYWxyZWFkeSBhdHRhY2hlZCB0byBvcmlnaW4gJHtKU09OLnN0cmluZ2lmeSh0ci5mcm9tKX1gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhY3Rpb25NYXAuc2V0KHRyLmZyb20sIHRoaXNFZGdlSWQpO1xuICAgICAgICB9XG5cblxuICAgICAgICAvLyByZXZlcnNlIG1hcHBpbmcgZmlyc3QgYnkgc3RhdGUgb3JpZ2luIG5hbWVcbiAgICAgICAgbGV0IHJBY3Rpb25NYXA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh0ci5mcm9tKTtcbiAgICAgICAgaWYgKCEockFjdGlvbk1hcCkpIHtcbiAgICAgICAgICByQWN0aW9uTWFwID0gbmV3IE1hcCgpO1xuICAgICAgICAgIHRoaXMuX3JldmVyc2VfYWN0aW9ucy5zZXQodHIuZnJvbSwgckFjdGlvbk1hcCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBubyBuZWVkIHRvIHRlc3QgZm9yIHJldmVyc2UgbWFwcGluZyBwcmUtcHJlc2VuY2U7XG4gICAgICAgIC8vIGZvcndhcmQgbWFwcGluZyBhbHJlYWR5IGNvdmVycyBjb2xsaXNpb25zXG4gICAgICAgIHJBY3Rpb25NYXAuc2V0KHRyLmFjdGlvbiwgdGhpc0VkZ2VJZCk7XG5cblxuICAgICAgICAvLyByZXZlcnNlIG1hcHBpbmcgZmlyc3QgYnkgc3RhdGUgdGFyZ2V0IG5hbWVcbiAgICAgICAgaWYgKCEodGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5oYXModHIudG8pKSkge1xuICAgICAgICAgIHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuc2V0KHRyLnRvLCBuZXcgTWFwKCkpO1xuICAgICAgICB9XG5cbi8qIHRvZG8gY29tZWJhY2tcbiAgIGZ1bmRhbWVudGFsIHByb2JsZW0gaXMgcm9BY3Rpb25NYXAgbmVlZHMgdG8gYmUgYSBtdWx0aW1hcFxuICAgICAgICBjb25zdCByb0FjdGlvbk1hcCA9IHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuZ2V0KHRyLnRvKTsgIC8vIHdhc3RlZnVsIC0gYWxyZWFkeSBkaWQgaGFzIC0gcmVmYWN0b3JcbiAgICAgICAgaWYgKHJvQWN0aW9uTWFwKSB7XG4gICAgICAgICAgaWYgKHJvQWN0aW9uTWFwLmhhcyh0ci5hY3Rpb24pKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHJvLWFjdGlvbiAke3RyLnRvfSBhbHJlYWR5IGF0dGFjaGVkIHRvIGFjdGlvbiAke3RyLmFjdGlvbn1gKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcm9BY3Rpb25NYXAuc2V0KHRyLmFjdGlvbiwgdGhpc0VkZ2VJZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc2hvdWxkIGJlIGltcG9zc2libGUgLSBmbG93IGRvZXNuXFwndCBrbm93IC5zZXQgcHJlY2VkZXMgLmdldCB5ZXQgYWdhaW4uICBzZXZlcmUgZXJyb3I/Jyk7XG4gICAgICAgIH1cbiovXG4gICAgICB9XG5cbiAgICB9KTtcblxuICB9XG5cbiAgX25ld19zdGF0ZShzdGF0ZV9jb25maWc6IEpzc21HZW5lcmljU3RhdGU8bU5UPik6IG1OVCB7IC8vIHdoYXJnYXJibCBnZXQgdGhhdCBzdGF0ZV9jb25maWcgYW55IHVuZGVyIGNvbnRyb2xcblxuICAgIGlmICh0aGlzLl9zdGF0ZXMuaGFzKHN0YXRlX2NvbmZpZy5uYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHN0YXRlX2NvbmZpZy5uYW1lKX0gYWxyZWFkeSBleGlzdHNgKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zdGF0ZXMuc2V0KHN0YXRlX2NvbmZpZy5uYW1lLCBzdGF0ZV9jb25maWcpO1xuICAgIHJldHVybiBzdGF0ZV9jb25maWcubmFtZTtcblxuICB9XG5cblxuXG4gIHN0YXRlKCk6IG1OVCB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlO1xuICB9XG5cbi8qIHdoYXJnYXJibCB0b2RvIG1ham9yXG4gICB3aGVuIHdlIHJlaW1wbGVtZW50IHRoaXMsIHJlaW50cm9kdWNlIHRoaXMgY2hhbmdlIHRvIHRoZSBpc19maW5hbCBjYWxsXG5cbiAgaXNfY2hhbmdpbmcoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRvZG8gd2hhcmdhcmJsXG4gIH1cbiovXG5cblxuICBzdGF0ZV9pc19maW5hbCh3aGljaFN0YXRlOiBtTlQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKCAodGhpcy5zdGF0ZV9pc190ZXJtaW5hbCh3aGljaFN0YXRlKSkgJiYgKHRoaXMuc3RhdGVfaXNfY29tcGxldGUod2hpY2hTdGF0ZSkpICk7XG4gIH1cblxuICBpc19maW5hbCgpOiBib29sZWFuIHtcbi8vICByZXR1cm4gKCghdGhpcy5pc19jaGFuZ2luZygpKSAmJiB0aGlzLnN0YXRlX2lzX2ZpbmFsKHRoaXMuc3RhdGUoKSkpO1xuICAgIHJldHVybiB0aGlzLnN0YXRlX2lzX2ZpbmFsKHRoaXMuc3RhdGUoKSk7XG4gIH1cblxuICBncmFwaF9sYXlvdXQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fZ3JhcGhfbGF5b3V0O1xuICB9XG5cblxuXG4gIG1hY2hpbmVfYXV0aG9yKCk6ID9BcnJheTxzdHJpbmc+IHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9hdXRob3I7XG4gIH1cblxuICBtYWNoaW5lX2NvbW1lbnQoKTogP3N0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfY29tbWVudDtcbiAgfVxuXG4gIG1hY2hpbmVfY29udHJpYnV0b3IoKTogP0FycmF5PHN0cmluZz4ge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2NvbnRyaWJ1dG9yO1xuICB9XG5cbiAgbWFjaGluZV9kZWZpbml0aW9uKCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2RlZmluaXRpb247XG4gIH1cblxuICBtYWNoaW5lX2xhbmd1YWdlKCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2xhbmd1YWdlO1xuICB9XG5cbiAgbWFjaGluZV9saWNlbnNlKCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2xpY2Vuc2U7XG4gIH1cblxuICBtYWNoaW5lX25hbWUoKTogP3N0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfbmFtZTtcbiAgfVxuXG4gIG1hY2hpbmVfdmVyc2lvbigpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV92ZXJzaW9uO1xuICB9XG5cbiAgcmF3X3N0YXRlX2RlY2xhcmF0aW9ucygpOiA/QXJyYXk8T2JqZWN0PiB7ICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZmxvd3R5cGUvbm8td2Vhay10eXBlc1xuICAgIHJldHVybiB0aGlzLl9yYXdfc3RhdGVfZGVjbGFyYXRpb247XG4gIH1cblxuICBzdGF0ZV9kZWNsYXJhdGlvbih3aGljaDogbU5UKTogP0pzc21TdGF0ZURlY2xhcmF0aW9uPG1OVD4ge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZV9kZWNsYXJhdGlvbnMuZ2V0KHdoaWNoKTtcbiAgfVxuXG4gIHN0YXRlX2RlY2xhcmF0aW9ucygpOiBNYXA8bU5ULCBPYmplY3Q+IHsgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBmbG93dHlwZS9uby13ZWFrLXR5cGVzXG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlX2RlY2xhcmF0aW9ucztcbiAgfVxuXG4gIGZzbF92ZXJzaW9uKCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9mc2xfdmVyc2lvbjtcbiAgfVxuXG5cblxuICBtYWNoaW5lX3N0YXRlKCk6IEpzc21NYWNoaW5lSW50ZXJuYWxTdGF0ZTxtTlQsIG1EVD4ge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGludGVybmFsX3N0YXRlX2ltcGxfdmVyc2lvbiA6IDEsXG5cbiAgICAgIGFjdGlvbnMgICAgICAgICAgICAgICAgOiB0aGlzLl9hY3Rpb25zLFxuICAgICAgZWRnZV9tYXAgICAgICAgICAgICAgICA6IHRoaXMuX2VkZ2VfbWFwLFxuICAgICAgZWRnZXMgICAgICAgICAgICAgICAgICA6IHRoaXMuX2VkZ2VzLFxuICAgICAgbmFtZWRfdHJhbnNpdGlvbnMgICAgICA6IHRoaXMuX25hbWVkX3RyYW5zaXRpb25zLFxuICAgICAgcmV2ZXJzZV9hY3Rpb25zICAgICAgICA6IHRoaXMuX3JldmVyc2VfYWN0aW9ucyxcbi8vICAgIHJldmVyc2VfYWN0aW9uX3RhcmdldHMgOiB0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLFxuICAgICAgc3RhdGUgICAgICAgICAgICAgICAgICA6IHRoaXMuX3N0YXRlLFxuICAgICAgc3RhdGVzICAgICAgICAgICAgICAgICA6IHRoaXMuX3N0YXRlc1xuICAgIH07XG5cbiAgfVxuXG4vKlxuICBsb2FkX21hY2hpbmVfc3RhdGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlOyAvLyB0b2RvIHdoYXJnYXJibFxuICB9XG4qL1xuXG5cbiAgc3RhdGVzKCk6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uIHRoaXMuX3N0YXRlcy5rZXlzKCldO1xuICB9XG5cbiAgc3RhdGVfZm9yKHdoaWNoU3RhdGU6IG1OVCk6IEpzc21HZW5lcmljU3RhdGU8bU5UPiB7XG4gICAgY29uc3Qgc3RhdGU6ID9Kc3NtR2VuZXJpY1N0YXRlPG1OVD4gPSB0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmIChzdGF0ZSkgeyByZXR1cm4gc3RhdGU7IH1cbiAgICBlbHNlICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBubyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkoc3RhdGUpfWApOyB9XG4gIH1cblxuXG5cbiAgbGlzdF9lZGdlcygpOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4ge1xuICAgIHJldHVybiB0aGlzLl9lZGdlcztcbiAgfVxuXG4gIGxpc3RfbmFtZWRfdHJhbnNpdGlvbnMoKTogTWFwPG1OVCwgbnVtYmVyPiB7XG4gICAgcmV0dXJuIHRoaXMuX25hbWVkX3RyYW5zaXRpb25zO1xuICB9XG5cbiAgbGlzdF9hY3Rpb25zKCk6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiBbLi4uIHRoaXMuX2FjdGlvbnMua2V5cygpXTtcbiAgfVxuXG5cblxuICBnZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcyhmcm9tOiBtTlQsIHRvOiBtTlQpOiA/bnVtYmVyIHtcblxuICAgIGNvbnN0IGVtZyA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fZWRnZV9tYXAuZ2V0KGZyb20pO1xuXG4gICAgaWYgKGVtZykge1xuICAgICAgcmV0dXJuIGVtZy5nZXQodG8pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICB9XG5cblxuXG4gIGxvb2t1cF90cmFuc2l0aW9uX2Zvcihmcm9tOiBtTlQsIHRvOiBtTlQpOiA/SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+IHtcbiAgICBjb25zdCBpZCA6ID9udW1iZXIgPSB0aGlzLmdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzKGZyb20sIHRvKTtcbiAgICByZXR1cm4gKChpZCA9PT0gdW5kZWZpbmVkKSB8fCAoaWQgPT09IG51bGwpKT8gdW5kZWZpbmVkIDogdGhpcy5fZWRnZXNbaWRdO1xuICB9XG5cblxuXG4gIGxpc3RfdHJhbnNpdGlvbnMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpKTogSnNzbVRyYW5zaXRpb25MaXN0PG1OVD4ge1xuICAgIHJldHVybiB7ZW50cmFuY2VzOiB0aGlzLmxpc3RfZW50cmFuY2VzKHdoaWNoU3RhdGUpLCBleGl0czogdGhpcy5saXN0X2V4aXRzKHdoaWNoU3RhdGUpfTtcbiAgfVxuXG4gIGxpc3RfZW50cmFuY2VzKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSk6IEFycmF5PG1OVD4ge1xuICAgIHJldHVybiAodGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKSB8fCB7fSkuZnJvbSB8fCBbXTtcbiAgfVxuXG4gIGxpc3RfZXhpdHMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpKTogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuICh0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpIHx8IHt9KS50byAgIHx8IFtdO1xuICB9XG5cblxuXG4gIHByb2JhYmxlX2V4aXRzX2Zvcih3aGljaFN0YXRlOiBtTlQpOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4ge1xuXG4gICAgY29uc3Qgd3N0YXRlOiA/SnNzbUdlbmVyaWNTdGF0ZTxtTlQ+ID0gdGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAoISh3c3RhdGUpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfSBpbiBwcm9iYWJsZV9leGl0c19mb3JgKTsgfVxuXG4gICAgY29uc3Qgd3N0YXRlX3RvIDogQXJyYXk8IG1OVCA+ID0gd3N0YXRlLnRvLFxuXG4gICAgICAgICAgd3RmICAgICAgIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+IC8vIHdzdGF0ZV90b19maWx0ZXJlZCAtPiB3dGZcbiAgICAgICAgICAgICAgICAgICAgPSB3c3RhdGVfdG9cbiAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoICh3cykgOiA/SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0+IHRoaXMubG9va3VwX3RyYW5zaXRpb25fZm9yKHRoaXMuc3RhdGUoKSwgd3MpKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKTtcblxuICAgIHJldHVybiB3dGY7XG5cbiAgfVxuXG4gIHByb2JhYmlsaXN0aWNfdHJhbnNpdGlvbigpOiBib29sZWFuIHtcbiAgICBjb25zdCBzZWxlY3RlZCA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9IHdlaWdodGVkX3JhbmRfc2VsZWN0KHRoaXMucHJvYmFibGVfZXhpdHNfZm9yKHRoaXMuc3RhdGUoKSkpO1xuICAgIHJldHVybiB0aGlzLnRyYW5zaXRpb24oIHNlbGVjdGVkLnRvICk7XG4gIH1cblxuICBwcm9iYWJpbGlzdGljX3dhbGsobjogbnVtYmVyKTogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuIHNlcShuKVxuICAgICAgICAgIC5tYXAoKCkgOiBtTlQgPT4ge1xuICAgICAgICAgICAgIGNvbnN0IHN0YXRlX3dhczogbU5UID0gdGhpcy5zdGF0ZSgpO1xuICAgICAgICAgICAgIHRoaXMucHJvYmFiaWxpc3RpY190cmFuc2l0aW9uKCk7XG4gICAgICAgICAgICAgcmV0dXJuIHN0YXRlX3dhcztcbiAgICAgICAgICAgfSlcbiAgICAgICAgICAuY29uY2F0KFt0aGlzLnN0YXRlKCldKTtcbiAgfVxuXG4gIHByb2JhYmlsaXN0aWNfaGlzdG9fd2FsayhuOiBudW1iZXIpOiBNYXA8bU5ULCBudW1iZXI+IHtcbiAgICByZXR1cm4gaGlzdG9ncmFwaCh0aGlzLnByb2JhYmlsaXN0aWNfd2FsayhuKSk7XG4gIH1cblxuXG5cbiAgYWN0aW9ucyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkgKTogQXJyYXk8bU5UPiB7XG4gICAgY29uc3Qgd3N0YXRlIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICh3c3RhdGUpIHsgcmV0dXJuIFsuLi4gd3N0YXRlLmtleXMoKV07IH1cbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG4gIH1cblxuICBsaXN0X3N0YXRlc19oYXZpbmdfYWN0aW9uKHdoaWNoU3RhdGU6IG1OVCk6IEFycmF5PG1OVD4ge1xuICAgIGNvbnN0IHdzdGF0ZSA6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHdzdGF0ZSkgeyByZXR1cm4gWy4uLiB3c3RhdGUua2V5cygpXTsgfVxuICAgIGVsc2UgICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cbiAgfVxuXG4vLyBjb21lYmFja1xuLypcbiAgbGlzdF9lbnRyYW5jZV9hY3Rpb25zKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSApIDogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuIFsuLi4gKHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMuZ2V0KHdoaWNoU3RhdGUpIHx8IG5ldyBNYXAoKSkudmFsdWVzKCldIC8vIHdhc3RlZnVsXG4gICAgICAgICAgIC5tYXAoIChlZGdlSWQ6YW55KSA9PiAodGhpcy5fZWRnZXNbZWRnZUlkXSA6IGFueSkpIC8vIHdoYXJnYXJibCBidXJuIG91dCBhbnlcbiAgICAgICAgICAgLmZpbHRlciggKG86YW55KSA9PiBvLnRvID09PSB3aGljaFN0YXRlKVxuICAgICAgICAgICAubWFwKCBmaWx0ZXJlZCA9PiBmaWx0ZXJlZC5mcm9tICk7XG4gIH1cbiovXG4gIGxpc3RfZXhpdF9hY3Rpb25zKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSApOiBBcnJheTw/bU5UPiB7IC8vIHRoZXNlIGFyZSBtTlQsIG5vdCA/bU5UXG4gICAgY29uc3QgcmFfYmFzZTogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICghKHJhX2Jhc2UpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG5cbiAgICByZXR1cm4gWy4uLiByYV9iYXNlLnZhbHVlcygpXVxuICAgICAgICAgICAubWFwICAgICggKGVkZ2VJZDogbnVtYmVyKSAgICAgICAgICAgICAgOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPT4gdGhpcy5fZWRnZXNbZWRnZUlkXSAgIClcbiAgICAgICAgICAgLmZpbHRlciAoIChvOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pIDogYm9vbGVhbiAgICAgICAgICAgICAgICAgID0+IG8uZnJvbSA9PT0gd2hpY2hTdGF0ZSApXG4gICAgICAgICAgIC5tYXAgICAgKCAoZmlsdGVyZWQ6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPikgOiA/bU5UICAgICAgICAgICAgICA9PiBmaWx0ZXJlZC5hY3Rpb24gICAgICAgKTtcbiAgfVxuXG4gIHByb2JhYmxlX2FjdGlvbl9leGl0cyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkgKSA6IEFycmF5PG1peGVkPiB7IC8vIHRoZXNlIGFyZSBtTlRcbiAgICBjb25zdCByYV9iYXNlOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKCEocmFfYmFzZSkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cblxuICAgIHJldHVybiBbLi4uIHJhX2Jhc2UudmFsdWVzKCldXG4gICAgICAgICAgIC5tYXAgICAgKCAoZWRnZUlkOiBudW1iZXIpOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPT4gdGhpcy5fZWRnZXNbZWRnZUlkXSAgIClcbiAgICAgICAgICAgLmZpbHRlciAoIChvOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4pOiBib29sZWFuICAgICA9PiBvLmZyb20gPT09IHdoaWNoU3RhdGUgKVxuICAgICAgICAgICAubWFwICAgICggKGZpbHRlcmVkKTogbWl4ZWQgICAgICAgICAgICAgICAgICAgICAgICAgID0+ICggeyBhY3Rpb24gICAgICA6IGZpbHRlcmVkLmFjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvYmFiaWxpdHkgOiBmaWx0ZXJlZC5wcm9iYWJpbGl0eSB9IClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICB9XG5cblxuXG4gIGlzX3VuZW50ZXJhYmxlKHdoaWNoU3RhdGU6IG1OVCk6IGJvb2xlYW4ge1xuICAgIC8vIHdoYXJnYXJibCBzaG91bGQgdGhyb3cgb24gdW5rbm93biBzdGF0ZVxuICAgIHJldHVybiB0aGlzLmxpc3RfZW50cmFuY2VzKHdoaWNoU3RhdGUpLmxlbmd0aCA9PT0gMDtcbiAgfVxuXG4gIGhhc191bmVudGVyYWJsZXMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpOiBib29sZWFuID0+IHRoaXMuaXNfdW5lbnRlcmFibGUoeCkpO1xuICB9XG5cblxuXG4gIGlzX3Rlcm1pbmFsKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlX2lzX3Rlcm1pbmFsKHRoaXMuc3RhdGUoKSk7XG4gIH1cblxuICBzdGF0ZV9pc190ZXJtaW5hbCh3aGljaFN0YXRlOiBtTlQpOiBib29sZWFuIHtcbiAgICAvLyB3aGFyZ2FyYmwgc2hvdWxkIHRocm93IG9uIHVua25vd24gc3RhdGVcbiAgICByZXR1cm4gdGhpcy5saXN0X2V4aXRzKHdoaWNoU3RhdGUpLmxlbmd0aCA9PT0gMDtcbiAgfVxuXG4gIGhhc190ZXJtaW5hbHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpOiBib29sZWFuID0+IHRoaXMuc3RhdGVfaXNfdGVybWluYWwoeCkpO1xuICB9XG5cblxuXG4gIGlzX2NvbXBsZXRlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHRoaXMuc3RhdGUoKSk7XG4gIH1cblxuICBzdGF0ZV9pc19jb21wbGV0ZSh3aGljaFN0YXRlOiBtTlQpIDogYm9vbGVhbiB7XG4gICAgY29uc3Qgd3N0YXRlOiA/SnNzbUdlbmVyaWNTdGF0ZTxtTlQ+ID0gdGhpcy5fc3RhdGVzLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAod3N0YXRlKSB7IHJldHVybiB3c3RhdGUuY29tcGxldGU7IH1cbiAgICBlbHNlICAgICAgICB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzdGF0ZSAke0pTT04uc3RyaW5naWZ5KHdoaWNoU3RhdGUpfWApOyB9XG4gIH1cblxuICBoYXNfY29tcGxldGVzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlcygpLnNvbWUoICh4KTogYm9vbGVhbiA9PiB0aGlzLnN0YXRlX2lzX2NvbXBsZXRlKHgpICk7XG4gIH1cblxuXG5cbiAgYWN0aW9uKG5hbWU6IG1OVCwgbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX2FjdGlvbihuYW1lLCBuZXdEYXRhKSkge1xuICAgICAgY29uc3QgZWRnZTogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gdGhpcy5jdXJyZW50X2FjdGlvbl9lZGdlX2ZvcihuYW1lKTtcbiAgICAgIHRoaXMuX3N0YXRlID0gZWRnZS50bztcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgdHJhbnNpdGlvbihuZXdTdGF0ZTogbU5ULCBuZXdEYXRhPzogbURUKTogYm9vbGVhbiB7XG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgaWYgKHRoaXMudmFsaWRfdHJhbnNpdGlvbihuZXdTdGF0ZSwgbmV3RGF0YSkpIHtcbiAgICAgIHRoaXMuX3N0YXRlID0gbmV3U3RhdGU7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8vIGNhbiBsZWF2ZSBtYWNoaW5lIGluIGluY29uc2lzdGVudCBzdGF0ZS4gIGdlbmVyYWxseSBkbyBub3QgdXNlXG4gIGZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGU6IG1OVCwgbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4ge1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGlmICh0aGlzLnZhbGlkX2ZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGUsIG5ld0RhdGEpKSB7XG4gICAgICB0aGlzLl9zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuXG5cbiAgY3VycmVudF9hY3Rpb25fZm9yKGFjdGlvbjogbU5UKTogbnVtYmVyIHwgdm9pZCB7XG4gICAgY29uc3QgYWN0aW9uX2Jhc2U6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fYWN0aW9ucy5nZXQoYWN0aW9uKTtcbiAgICByZXR1cm4gYWN0aW9uX2Jhc2U/IGFjdGlvbl9iYXNlLmdldCh0aGlzLnN0YXRlKCkpOiB1bmRlZmluZWQ7XG4gIH1cblxuICBjdXJyZW50X2FjdGlvbl9lZGdlX2ZvcihhY3Rpb246IG1OVCk6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiB7XG4gICAgY29uc3QgaWR4OiA/bnVtYmVyID0gdGhpcy5jdXJyZW50X2FjdGlvbl9mb3IoYWN0aW9uKTtcbiAgICBpZiAoKGlkeCA9PT0gdW5kZWZpbmVkKSB8fCAoaWR4ID09PSBudWxsKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggYWN0aW9uICR7SlNPTi5zdHJpbmdpZnkoYWN0aW9uKX1gKTsgfVxuICAgIHJldHVybiB0aGlzLl9lZGdlc1tpZHhdO1xuICB9XG5cbiAgdmFsaWRfYWN0aW9uKGFjdGlvbjogbU5ULCBfbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4geyAgLy8gdG9kbyBjb21lYmFjayB1bmlnbm9yZSBuZXdEYXRhXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgcmV0dXJuIHRoaXMuY3VycmVudF9hY3Rpb25fZm9yKGFjdGlvbikgIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHZhbGlkX3RyYW5zaXRpb24obmV3U3RhdGU6IG1OVCwgX25ld0RhdGE/OiBtRFQpOiBib29sZWFuIHsgIC8vIHRvZG8gY29tZWJhY2sgdW5pZ25vcmUgbmV3RGF0YVxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIGNvbnN0IHRyYW5zaXRpb25fZm9yOiA/SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gdGhpcy5sb29rdXBfdHJhbnNpdGlvbl9mb3IodGhpcy5zdGF0ZSgpLCBuZXdTdGF0ZSk7XG5cbiAgICBpZiAoISh0cmFuc2l0aW9uX2ZvcikpICAgICAgICAgIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgaWYgKHRyYW5zaXRpb25fZm9yLmZvcmNlZF9vbmx5KSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfVxuXG4gIHZhbGlkX2ZvcmNlX3RyYW5zaXRpb24obmV3U3RhdGU6IG1OVCwgX25ld0RhdGE/OiBtRFQpOiBib29sZWFuIHsgIC8vIHRvZG8gY29tZWJhY2sgdW5pZ25vcmUgbmV3RGF0YVxuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBob29rc1xuICAgIC8vIHRvZG8gd2hhcmdhcmJsIGltcGxlbWVudCBkYXRhIHN0dWZmXG4gICAgLy8gdG9kbyBtYWpvciBpbmNvbXBsZXRlIHdoYXJnYXJibCBjb21lYmFja1xuICAgIHJldHVybiAodGhpcy5sb29rdXBfdHJhbnNpdGlvbl9mb3IodGhpcy5zdGF0ZSgpLCBuZXdTdGF0ZSkgIT09IHVuZGVmaW5lZCk7XG4gIH1cblxuXG59XG5cblxuXG5cblxuZnVuY3Rpb24gc208bU5ULCBtRFQ+KHRlbXBsYXRlX3N0cmluZ3M6IEFycmF5PHN0cmluZz4gLyogLCBhcmd1bWVudHMgKi8pOiBNYWNoaW5lPG1OVCwgbURUPiB7XG5cbiAgICAvLyBmb29gYSR7MX1iJHsyfWNgIHdpbGwgY29tZSBpbiBhcyAoWydhJywnYicsJ2MnXSwxLDIpXG4gICAgLy8gdGhpcyBpbmNsdWRlcyB3aGVuIGEgYW5kIGMgYXJlIGVtcHR5IHN0cmluZ3NcbiAgICAvLyB0aGVyZWZvcmUgdGVtcGxhdGVfc3RyaW5ncyB3aWxsIGFsd2F5cyBoYXZlIG9uZSBtb3JlIGVsIHRoYW4gdGVtcGxhdGVfYXJnc1xuICAgIC8vIHRoZXJlZm9yZSBtYXAgdGhlIHNtYWxsZXIgY29udGFpbmVyIGFuZCB0b3NzIHRoZSBsYXN0IG9uZSBvbiBvbiB0aGUgd2F5IG91dFxuXG4gICAgcmV0dXJuIG5ldyBNYWNoaW5lKG1ha2UodGVtcGxhdGVfc3RyaW5ncy5yZWR1Y2UoXG5cbiAgICAgIC8vIGluIGdlbmVyYWwgYXZvaWRpbmcgYGFyZ3VtZW50c2AgaXMgc21hcnQuICBob3dldmVyIHdpdGggdGhlIHRlbXBsYXRlXG4gICAgICAvLyBzdHJpbmcgbm90YXRpb24sIGFzIGRlc2lnbmVkLCBpdCdzIG5vdCByZWFsbHkgd29ydGggdGhlIGhhc3NsZVxuXG4gICAgICAvKiBlc2xpbnQtZGlzYWJsZSBmcC9uby1hcmd1bWVudHMgKi9cbiAgICAgIC8qIGVzbGludC1kaXNhYmxlIHByZWZlci1yZXN0LXBhcmFtcyAqL1xuICAgICAgKGFjYywgdmFsLCBpZHgpOiBzdHJpbmcgPT4gYCR7YWNjfSR7YXJndW1lbnRzW2lkeF19JHt2YWx9YCAgLy8gYXJndW1lbnRzWzBdIGlzIG5ldmVyIGxvYWRlZCwgc28gYXJncyBkb2Vzbid0IG5lZWQgdG8gYmUgZ2F0ZWRcbiAgICAgIC8qIGVzbGludC1lbmFibGUgIHByZWZlci1yZXN0LXBhcmFtcyAqL1xuICAgICAgLyogZXNsaW50LWVuYWJsZSAgZnAvbm8tYXJndW1lbnRzICovXG5cbiAgICApKSk7XG5cbn1cblxuXG5cblxuXG5leHBvcnQge1xuXG4gIHZlcnNpb24sXG5cbiAgdHJhbnNmZXJfc3RhdGVfcHJvcGVydGllcyxcblxuICBNYWNoaW5lLFxuXG4gIG1ha2UsXG4gICAgcGFyc2UsXG4gICAgY29tcGlsZSxcblxuICBzbSxcblxuICBhcnJvd19kaXJlY3Rpb24sXG4gIGFycm93X2xlZnRfa2luZCxcbiAgYXJyb3dfcmlnaHRfa2luZCxcblxuICAvLyB0b2RvIHdoYXJnYXJibCB0aGVzZSBzaG91bGQgYmUgZXhwb3J0ZWQgdG8gYSB1dGlsaXR5IGxpYnJhcnlcbiAgc2VxLCB3ZWlnaHRlZF9yYW5kX3NlbGVjdCwgaGlzdG9ncmFwaCwgd2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCwgd2VpZ2h0ZWRfaGlzdG9fa2V5XG5cbn07XG4iXX0=