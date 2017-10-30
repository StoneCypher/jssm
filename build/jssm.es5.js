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

  //  if ((wasList  !== undefined) && (wasIndex === undefined)) { throw new TypeError("Must have an index if transition was in a list"); }
  //  if ((wasIndex !== undefined) && (wasList  === undefined)) { throw new TypeError("Must be in a list if transition has an index");   }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLmpzIl0sIm5hbWVzIjpbInJlZHVjZV90b182MzkiLCJyZXF1aXJlIiwicmVkdWNlIiwicGFyc2UiLCJ2ZXJzaW9uIiwiYXJyb3dfZGlyZWN0aW9uIiwiYXJyb3ciLCJTdHJpbmciLCJFcnJvciIsImFycm93X2xlZnRfa2luZCIsImFycm93X3JpZ2h0X2tpbmQiLCJtYWtlVHJhbnNpdGlvbiIsInRoaXNfc2UiLCJmcm9tIiwidG8iLCJpc1JpZ2h0Iiwid2FzTGlzdCIsIndhc0luZGV4Iiwia2luZCIsImVkZ2UiLCJmb3JjZWRfb25seSIsIm1haW5fcGF0aCIsImFjdGlvbiIsInByb2JhYmlsaXR5IiwiY29tcGlsZV9ydWxlX3RyYW5zaXRpb25fc3RlcCIsImFjYyIsIm5leHRfc2UiLCJlZGdlcyIsInVGcm9tIiwiQXJyYXkiLCJpc0FycmF5IiwidVRvIiwibWFwIiwiZiIsInQiLCJyaWdodCIsInB1c2giLCJsZWZ0IiwibmV3X2FjYyIsImNvbmNhdCIsInNlIiwiY29tcGlsZV9ydWxlX2hhbmRsZV90cmFuc2l0aW9uIiwicnVsZSIsImNvbXBpbGVfcnVsZV9oYW5kbGVyIiwia2V5IiwiYWdnX2FzIiwidmFsIiwidmFsdWUiLCJuYW1lIiwic3RhdGUiLCJkZWNsYXJhdGlvbnMiLCJ0YXV0b2xvZ2llcyIsImluY2x1ZGVzIiwiSlNPTiIsInN0cmluZ2lmeSIsImNvbXBpbGUiLCJ0cmVlIiwicmVzdWx0cyIsImdyYXBoX2xheW91dCIsInRyYW5zaXRpb24iLCJzdGFydF9zdGF0ZXMiLCJlbmRfc3RhdGVzIiwic3RhdGVfZGVjbGFyYXRpb24iLCJmc2xfdmVyc2lvbiIsIm1hY2hpbmVfYXV0aG9yIiwibWFjaGluZV9jb21tZW50IiwibWFjaGluZV9jb250cmlidXRvciIsIm1hY2hpbmVfZGVmaW5pdGlvbiIsIm1hY2hpbmVfbGFuZ3VhZ2UiLCJtYWNoaW5lX2xpY2Vuc2UiLCJtYWNoaW5lX25hbWUiLCJtYWNoaW5lX3JlZmVyZW5jZSIsIm1hY2hpbmVfdmVyc2lvbiIsInRyIiwiYXNzZW1ibGVkX3RyYW5zaXRpb25zIiwicmVzdWx0X2NmZyIsImxlbmd0aCIsInRyYW5zaXRpb25zIiwib25lT25seUtleXMiLCJvbmVPbmx5S2V5IiwibXVsdGlLZXkiLCJtYWtlIiwicGxhbiIsInRyYW5zZmVyX3N0YXRlX3Byb3BlcnRpZXMiLCJzdGF0ZV9kZWNsIiwiZCIsIm5vZGVfc2hhcGUiLCJub2RlX2NvbG9yIiwiTWFjaGluZSIsImNvbXBsZXRlIiwiX3N0YXRlIiwiX3N0YXRlcyIsIk1hcCIsIl9zdGF0ZV9kZWNsYXJhdGlvbnMiLCJfZWRnZXMiLCJfZWRnZV9tYXAiLCJfbmFtZWRfdHJhbnNpdGlvbnMiLCJfYWN0aW9ucyIsIl9yZXZlcnNlX2FjdGlvbnMiLCJfcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyIsIl9tYWNoaW5lX2F1dGhvciIsIl9tYWNoaW5lX2NvbW1lbnQiLCJfbWFjaGluZV9jb250cmlidXRvciIsIl9tYWNoaW5lX2RlZmluaXRpb24iLCJfbWFjaGluZV9sYW5ndWFnZSIsIl9tYWNoaW5lX2xpY2Vuc2UiLCJfbWFjaGluZV9uYW1lIiwiX21hY2hpbmVfdmVyc2lvbiIsIl9yYXdfc3RhdGVfZGVjbGFyYXRpb24iLCJfZnNsX3ZlcnNpb24iLCJfZ3JhcGhfbGF5b3V0IiwiaGFzIiwic2V0IiwidW5kZWZpbmVkIiwiY3Vyc29yX2Zyb20iLCJnZXQiLCJfbmV3X3N0YXRlIiwiY3Vyc29yX3RvIiwidGhpc0VkZ2VJZCIsImZyb21fbWFwcGluZyIsImFjdGlvbk1hcCIsInJBY3Rpb25NYXAiLCJzdGF0ZV9jb25maWciLCJ3aGljaFN0YXRlIiwic3RhdGVfaXNfdGVybWluYWwiLCJzdGF0ZV9pc19jb21wbGV0ZSIsInN0YXRlX2lzX2ZpbmFsIiwid2hpY2giLCJpbnRlcm5hbF9zdGF0ZV9pbXBsX3ZlcnNpb24iLCJhY3Rpb25zIiwiZWRnZV9tYXAiLCJuYW1lZF90cmFuc2l0aW9ucyIsInJldmVyc2VfYWN0aW9ucyIsInN0YXRlcyIsImtleXMiLCJlbWciLCJpZCIsImdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzIiwiZW50cmFuY2VzIiwibGlzdF9lbnRyYW5jZXMiLCJleGl0cyIsImxpc3RfZXhpdHMiLCJ3c3RhdGUiLCJ3c3RhdGVfdG8iLCJ3dGYiLCJ3cyIsImxvb2t1cF90cmFuc2l0aW9uX2ZvciIsImZpbHRlciIsIkJvb2xlYW4iLCJzZWxlY3RlZCIsInByb2JhYmxlX2V4aXRzX2ZvciIsIm4iLCJzdGF0ZV93YXMiLCJwcm9iYWJpbGlzdGljX3RyYW5zaXRpb24iLCJwcm9iYWJpbGlzdGljX3dhbGsiLCJyYV9iYXNlIiwidmFsdWVzIiwiZWRnZUlkIiwibyIsImZpbHRlcmVkIiwic29tZSIsIngiLCJpc191bmVudGVyYWJsZSIsIm5ld0RhdGEiLCJ2YWxpZF9hY3Rpb24iLCJjdXJyZW50X2FjdGlvbl9lZGdlX2ZvciIsIm5ld1N0YXRlIiwidmFsaWRfdHJhbnNpdGlvbiIsInZhbGlkX2ZvcmNlX3RyYW5zaXRpb24iLCJhY3Rpb25fYmFzZSIsImlkeCIsImN1cnJlbnRfYWN0aW9uX2ZvciIsIl9uZXdEYXRhIiwidHJhbnNpdGlvbl9mb3IiLCJzbSIsInRlbXBsYXRlX3N0cmluZ3MiLCJzZXEiLCJ3ZWlnaHRlZF9yYW5kX3NlbGVjdCIsImhpc3RvZ3JhcGgiLCJ3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0Iiwid2VpZ2h0ZWRfaGlzdG9fa2V5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUE0QkE7Ozs7OztBQTNCQTs7QUFJQSxJQUFNQSxnQkFBMkJDLFFBQVEsaUJBQVIsRUFBMkJDLE1BQTVEOztBQXlCQSxJQUFNQyxRQUFrQkYsUUFBUSxlQUFSLEVBQXlCRSxLQUFqRCxDLENBQXlEOztBQUV6RCxJQUFNQyxVQUFnQixJQUF0QixDLENBQTRCOzs7QUFNNUI7O0FBRUEsU0FBU0MsZUFBVCxDQUF5QkMsS0FBekIsRUFBK0Q7O0FBRTdELFVBQVNDLE9BQU9ELEtBQVAsQ0FBVDs7QUFFRSxTQUFLLElBQUwsQ0FBbUIsS0FBSyxHQUFMO0FB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QjtBQUFHO0FBQ2hFO0FBQ0E7QUFDQTtBQUNBLGFBQVEsS0FBSzFCLHFCQUFMLENBQTJCLEtBQUtqRyxLQUFMLEVBQTNCLEVBQXlDcUgsUUFBekMsTUFBdURyRCxTQUEvRDtBQUNEOzs7Ozs7QUFTSCxTQUFTNkQsRUFBVCxDQUFzQkMsZ0JBQXRCLENBQXNELGlCQUF0RCxFQUE0RjtBQUFBOzs7QUFFeEY7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsU0FBTyxJQUFJdkYsT0FBSixDQUFZUCxLQUFLOEYsaUJBQWlCN0ssTUFBakI7O0FBRXRCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFlBQUN1QixHQUFELEVBQU1xQixHQUFOLEVBQVc0SCxHQUFYO0FBQUEsZ0JBQThCakosR0FBOUIsR0FBb0MsV0FBVWlKLEdBQVYsQ0FBcEMsR0FBcUQ1SCxHQUFyRDtBQUFBLEdBUHNCLENBT3NDO0FBQzVEO0FBQ0E7O0FBVHNCLEdBQUwsQ0FBWixDQUFQO0FBYUg7O1FBUUMxQyxPLEdBQUFBLE87UUFFQStFLHlCLEdBQUFBLHlCO1FBRUFLLE8sR0FBQUEsTztRQUVBUCxJLEdBQUFBLEk7UUFDRTlFLEssR0FBQUEsSztRQUNBb0QsTyxHQUFBQSxPO1FBRUZ1SCxFLEdBQUFBLEU7UUFFQXpLLGUsR0FBQUEsZTtRQUNBSSxlLEdBQUFBLGU7UUFDQUMsZ0IsR0FBQUEsZ0I7UUFHQXNLLEc7UUFBS0Msb0I7UUFBc0JDLFU7UUFBWUMsc0I7UUFBd0JDLGtCIiwiZmlsZSI6Impzc20uanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8vIHdoYXJnYXJibCBsb3RzIG9mIHRoZXNlIHJldHVybiBhcnJheXMgY291bGQvc2hvdWxkIGJlIHNldHNcblxuLy8gQGZsb3dcblxuY29uc3QgcmVkdWNlX3RvXzYzOSA6IEZ1bmN0aW9uID0gcmVxdWlyZSgncmVkdWNlLXRvLTYzOS0xJykucmVkdWNlO1xuXG5cblxuXG5cbmltcG9ydCB0eXBlIHtcblxuICBKc3NtR2VuZXJpY1N0YXRlLCBKc3NtR2VuZXJpY0NvbmZpZyxcbiAgSnNzbVRyYW5zaXRpb24sIEpzc21UcmFuc2l0aW9uTGlzdCwgSnNzbVRyYW5zaXRpb25SdWxlLFxuICBKc3NtTWFjaGluZUludGVybmFsU3RhdGUsXG4gIEpzc21QYXJzZVRyZWUsXG4gIEpzc21TdGF0ZURlY2xhcmF0aW9uLCBKc3NtU3RhdGVEZWNsYXJhdGlvblJ1bGUsXG4gIEpzc21Db21waWxlU2UsIEpzc21Db21waWxlU2VTdGFydCwgSnNzbUNvbXBpbGVSdWxlLFxuICBKc3NtQXJyb3csIEpzc21BcnJvd0RpcmVjdGlvbiwgSnNzbUFycm93S2luZCxcbiAgSnNzbUxheW91dFxuXG59IGZyb20gJy4vanNzbS10eXBlcyc7XG5cblxuXG5cblxuaW1wb3J0IHsgc2VxLCB3ZWlnaHRlZF9yYW5kX3NlbGVjdCwgd2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCwgaGlzdG9ncmFwaCwgd2VpZ2h0ZWRfaGlzdG9fa2V5IH0gZnJvbSAnLi9qc3NtLXV0aWwuanMnO1xuXG5jb25zdCBwYXJzZTogRnVuY3Rpb24gPSByZXF1aXJlKCcuL2pzc20tZG90LmpzJykucGFyc2U7ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXMgLy8gdG9kbyB3aGFyZ2FyYmwgcmVtb3ZlIGFueVxuXG5jb25zdCB2ZXJzaW9uOiBudWxsID0gbnVsbDsgLy8gcmVwbGFjZWQgZnJvbSBwYWNrYWdlLmpzIGluIGJ1aWxkXG5cblxuXG5cblxuLyogZXNsaW50LWRpc2FibGUgY29tcGxleGl0eSAqL1xuXG5mdW5jdGlvbiBhcnJvd19kaXJlY3Rpb24oYXJyb3c6IEpzc21BcnJvdyk6IEpzc21BcnJvd0RpcmVjdGlvbiB7XG5cbiAgc3dpdGNoICggU3RyaW5nKGFycm93KSApIHtcblxuICAgIGNhc2UgJy0+JyAgIDogICAgICBjYXNlICfihpInICA6XG4gICAgY2FzZSAnPT4nICAgOiAgICAgIGNhc2UgJ+KHkicgIDpcbiAgICBjYXNlICd+PicgICA6ICAgICAgY2FzZSAn4oabJyAgOlxuICAgICAgcmV0dXJuICdyaWdodCc7XG5cbiAgICBjYXNlICc8LScgICA6ICAgICAgY2FzZSAn4oaQJyAgOlxuICAgIGNhc2UgJzw9JyAgIDogICAgICBjYXNlICfih5AnICA6XG4gICAgY2FzZSAnPH4nICAgOiAgICAgIGNhc2UgJ+KGmicgIDpcbiAgICAgIHJldHVybiAnbGVmdCc7XG5cbiAgICBjYXNlICc8LT4nICA6ICAgICAgY2FzZSAn4oaUJyAgOlxuICAgIGNhc2UgJzwtPT4nIDogICAgICBjYXNlICfihpDih5InIDogICAgICBjYXNlICfihpA9PicgOiAgICAgIGNhc2UgJzwt4oeSJyA6XG4gICAgY2FzZSAnPC1+PicgOiAgICAgIGNhc2UgJ+KGkOKGmycgOiAgICAgIGNhc2UgJ+KGkH4+JyA6ICAgICAgY2FzZSAnPC3ihpsnIDpcblxuICAgIGNhc2UgJzw9PicgIDogICAgICBjYXNlICfih5QnICA6XG4gICAgY2FzZSAnPD0tPicgOiAgICAgIGNhc2UgJ+KHkOKGkicgOiAgICAgIGNhc2UgJ+KHkC0+JyA6ICAgICAgY2FzZSAnPD3ihpInIDpcbiAgICBjYXNlICc8PX4+JyA6ICAgICAgY2FzZSAn4oeQ4oabJyA6ICAgICAgY2FzZSAn4oeQfj4nIDogICAgICBjYXNlICc8PeKGmycgOlxuXG4gICAgY2FzZSAnPH4+JyAgOiAgICAgIGNhc2UgJ+KGricgIDpcbiAgICBjYXNlICc8fi0+JyA6ICAgICAgY2FzZSAn4oaa4oaSJyA6ICAgICAgY2FzZSAn4oaaLT4nIDogICAgICBjYXNlICc8fuKGkicgOlxuICAgIGNhc2UgJzx+PT4nIDogICAgICBjYXNlICfihprih5InIDogICAgICBjYXNlICfihpo9PicgOiAgICAgIGNhc2UgJzx+4oeSJyA6XG4gICAgICByZXR1cm4gJ2JvdGgnO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXJyb3dfZGlyZWN0aW9uOiB1bmtub3duIGFycm93IHR5cGUgJHthcnJvd31gKTtcblxuICB9XG5cbn1cblxuLyogZXNsaW50LWVuYWJsZSBjb21wbGV4aXR5ICovXG5cblxuXG5cblxuLyogZXNsaW50LWRpc2FibGUgY29tcGxleGl0eSAqL1xuXG5mdW5jdGlvbiBhcnJvd19sZWZ0X2tpbmQoYXJyb3c6IEpzc21BcnJvdyk6IEpzc21BcnJvd0tpbmQge1xuXG4gIHN3aXRjaCAoIFN0cmluZyhhcnJvdykgKSB7XG5cbiAgICBjYXNlICctPicgOiAgICBjYXNlICfihpInIDpcbiAgICBjYXNlICc9PicgOiAgICBjYXNlICfih5InIDpcbiAgICBjYXNlICd+PicgOiAgICBjYXNlICfihpsnIDpcbiAgICAgIHJldHVybiAnbm9uZSc7XG5cbiAgICBjYXNlICc8LSc6ICAgICBjYXNlICfihpAnIDpcbiAgICBjYXNlICc8LT4nOiAgICBjYXNlICfihpQnIDpcbiAgICBjYXNlICc8LT0+JzogICBjYXNlICfihpDih5InIDpcbiAgICBjYXNlICc8LX4+JzogICBjYXNlICfihpDihpsnIDpcbiAgICAgIHJldHVybiAnbGVnYWwnO1xuXG4gICAgY2FzZSAnPD0nOiAgICAgY2FzZSAn4oeQJyA6XG4gICAgY2FzZSAnPD0+JzogICAgY2FzZSAn4oeUJyA6XG4gICAgY2FzZSAnPD0tPic6ICAgY2FzZSAn4oeQ4oaSJyA6XG4gICAgY2FzZSAnPD1+Pic6ICAgY2FzZSAn4oeQ4oabJyA6XG4gICAgICByZXR1cm4gJ21haW4nO1xuXG4gICAgY2FzZSAnPH4nOiAgICAgY2FzZSAn4oaaJyA6XG4gICAgY2FzZSAnPH4+JzogICAgY2FzZSAn4oauJyA6XG4gICAgY2FzZSAnPH4tPic6ICAgY2FzZSAn4oaa4oaSJyA6XG4gICAgY2FzZSAnPH49Pic6ICAgY2FzZSAn4oaa4oeSJyA6XG4gICAgICByZXR1cm4gJ2ZvcmNlZCc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcnJvd19kaXJlY3Rpb246IHVua25vd24gYXJyb3cgdHlwZSAke2Fycm93fWApO1xuXG4gIH1cblxufVxuXG4vKiBlc2xpbnQtZW5hYmxlIGNvbXBsZXhpdHkgKi9cblxuXG5cblxuXG4vKiBlc2xpbnQtZGlzYWJsZSBjb21wbGV4aXR5ICovXG5cbmZ1bmN0aW9uIGFycm93X3JpZ2h0X2tpbmQoYXJyb3c6IEpzc21BcnJvdyk6IEpzc21BcnJvd0tpbmQge1xuXG4gIHN3aXRjaCAoIFN0cmluZyhhcnJvdykgKSB7XG5cbiAgICBjYXNlICc8LScgOiAgICBjYXNlICfihpAnIDpcbiAgICBjYXNlICc8PScgOiAgICBjYXNlICfih5AnIDpcbiAgICBjYXNlICc8ficgOiAgICBjYXNlICfihponIDpcbiAgICAgIHJldHVybiAnbm9uZSc7XG5cbiAgICBjYXNlICctPicgOiAgICBjYXNlICfihpInIDpcbiAgICBjYXNlICc8LT4nOiAgICBjYXNlICfihpQnIDpcbiAgICBjYXNlICc8PS0+JzogICBjYXNlICfih5DihpInIDpcbiAgICBjYXNlICc8fi0+JzogICBjYXNlICfihprihpInIDpcbiAgICAgIHJldHVybiAnbGVnYWwnO1xuXG4gICAgY2FzZSAnPT4nIDogICAgY2FzZSAn4oeSJyA6XG4gICAgY2FzZSAnPD0+JzogICAgY2FzZSAn4oeUJyA6XG4gICAgY2FzZSAnPC09Pic6ICAgY2FzZSAn4oaQ4oeSJyA6XG4gICAgY2FzZSAnPH49Pic6ICAgY2FzZSAn4oaa4oeSJyA6XG4gICAgICByZXR1cm4gJ21haW4nO1xuXG4gICAgY2FzZSAnfj4nIDogICAgY2FzZSAn4oabJyA6XG4gICAgY2FzZSAnPH4+JzogICAgY2FzZSAn4oauJyA6XG4gICAgY2FzZSAnPC1+Pic6ICAgY2FzZSAn4oaQ4oabJyA6XG4gICAgY2FzZSAnPD1+Pic6ICAgY2FzZSAn4oeQ4oabJyA6XG4gICAgICByZXR1cm4gJ2ZvcmNlZCc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcnJvd19kaXJlY3Rpb246IHVua25vd24gYXJyb3cgdHlwZSAke2Fycm93fWApO1xuXG4gIH1cblxufVxuXG4vKiBlc2xpbnQtZW5hYmxlIGNvbXBsZXhpdHkgKi9cblxuXG5cblxuXG5mdW5jdGlvbiBtYWtlVHJhbnNpdGlvbjxtTlQsIG1EVD4oXG4gIHRoaXNfc2UgICA6IEpzc21Db21waWxlU2U8bU5UPixcbiAgZnJvbSAgICAgIDogbU5ULFxuICB0byAgICAgICAgOiBtTlQsXG4gIGlzUmlnaHQgICA6IGJvb2xlYW4sXG4gIHdhc0xpc3Q/ICA6IEFycmF5PG1OVD4sXG4gIHdhc0luZGV4PyA6IG51bWJlclxuKSA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiB7XG5cbiAgY29uc3Qga2luZCA6IEpzc21BcnJvd0tpbmQgICAgICAgICAgICA9IGlzUmlnaHQ/IGFycm93X3JpZ2h0X2tpbmQodGhpc19zZS5raW5kKSA6IGFycm93X2xlZnRfa2luZCh0aGlzX3NlLmtpbmQpLFxuICAgICAgICBlZGdlIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0ge1xuICAgICAgICAgIGZyb20sXG4gICAgICAgICAgdG8sXG4gICAgICAgICAga2luZCxcbiAgICAgICAgICBmb3JjZWRfb25seSA6IGtpbmQgPT09ICdmb3JjZWQnLFxuICAgICAgICAgIG1haW5fcGF0aCAgIDoga2luZCA9PT0gJ21haW4nXG4gICAgICAgIH07XG5cbi8vICBpZiAoKHdhc0xpc3QgICE9PSB1bmRlZmluZWQpICYmICh3YXNJbmRleCA9PT0gdW5kZWZpbmVkKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiTXVzdCBoYXZlIGFuIGluZGV4IGlmIHRyYW5zaXRpb24gd2FzIGluIGEgbGlzdFwiKTsgfVxuLy8gIGlmICgod2FzSW5kZXggIT09IHVuZGVmaW5lZCkgJiYgKHdhc0xpc3QgID09PSB1bmRlZmluZWQpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJNdXN0IGJlIGluIGEgbGlzdCBpZiB0cmFuc2l0aW9uIGhhcyBhbiBpbmRleFwiKTsgICB9XG4vKlxuICBpZiAodHlwZW9mIGVkZ2UudG8gPT09ICdvYmplY3QnKSB7XG5cbiAgICBpZiAoZWRnZS50by5rZXkgPT09ICdjeWNsZScpIHtcbiAgICAgIGlmICh3YXNMaXN0ID09PSB1bmRlZmluZWQpIHsgdGhyb3cgXCJNdXN0IGhhdmUgYSB3YXNsaXN0IGlmIGEgdG8gaXMgdHlwZSBjeWNsZVwiOyB9XG4gICAgICBjb25zdCBuZXh0SW5kZXggPSB3cmFwQnkod2FzSW5kZXgsIGVkZ2UudG8udmFsdWUsIHdhc0xpc3QubGVuZ3RoKTtcbiAgICAgIGVkZ2UudG8gPSB3YXNMaXN0W25leHRJbmRleF07XG4gICAgfVxuXG4gIH1cbiovXG4gIGNvbnN0IGFjdGlvbiAgICAgIDogc3RyaW5nID0gaXNSaWdodD8gJ3JfYWN0aW9uJyAgICAgIDogJ2xfYWN0aW9uJyxcbiAgICAgICAgcHJvYmFiaWxpdHkgOiBzdHJpbmcgPSBpc1JpZ2h0PyAncl9wcm9iYWJpbGl0eScgOiAnbF9wcm9iYWJpbGl0eSc7XG5cbiAgaWYgKHRoaXNfc2VbYWN0aW9uXSkgICAgICB7IGVkZ2UuYWN0aW9uICAgICAgPSB0aGlzX3NlW2FjdGlvbl07ICAgICAgfVxuICBpZiAodGhpc19zZVtwcm9iYWJpbGl0eV0pIHsgZWRnZS5wcm9iYWJpbGl0eSA9IHRoaXNfc2VbcHJvYmFiaWxpdHldOyB9XG5cbiAgcmV0dXJuIGVkZ2U7XG5cbn1cblxuXG5cblxuXG5mdW5jdGlvbiBjb21waWxlX3J1bGVfdHJhbnNpdGlvbl9zdGVwPG1OVCwgbURUPihcbiAgICAgICAgICAgICBhY2MgICAgIDogQXJyYXk8IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA+LFxuICAgICAgICAgICAgIGZyb20gICAgOiBtTlQsXG4gICAgICAgICAgICAgdG8gICAgICA6IG1OVCxcbiAgICAgICAgICAgICB0aGlzX3NlIDogSnNzbUNvbXBpbGVTZTxtTlQ+LFxuICAgICAgICAgICAgIG5leHRfc2UgOiBKc3NtQ29tcGlsZVNlPG1OVD5cbiAgICAgICAgICkgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4geyAvLyB0b2RvIGZsb3cgZGVzY3JpYmUgdGhlIHBhcnNlciByZXByZXNlbnRhdGlvbiBvZiBhIHRyYW5zaXRpb24gc3RlcCBleHRlbnNpb25cblxuICBjb25zdCBlZGdlcyA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiA9IFtdO1xuXG4gIGNvbnN0IHVGcm9tIDogQXJyYXk8IG1OVCA+ID0gKEFycmF5LmlzQXJyYXkoZnJvbSk/IGZyb20gOiBbZnJvbV0pLFxuICAgICAgICB1VG8gICA6IEFycmF5PCBtTlQgPiA9IChBcnJheS5pc0FycmF5KHRvKT8gICB0byAgIDogW3RvXSAgKTtcblxuICB1RnJvbS5tYXAoIChmOiBtTlQpID0+IHtcbiAgICB1VG8ubWFwKCAodDogbU5UKSA9PiB7XG5cbiAgICAgIGNvbnN0IHJpZ2h0OiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSBtYWtlVHJhbnNpdGlvbih0aGlzX3NlLCBmLCB0LCB0cnVlKTtcbiAgICAgIGlmIChyaWdodC5raW5kICE9PSAnbm9uZScpIHsgZWRnZXMucHVzaChyaWdodCk7IH1cblxuICAgICAgY29uc3QgbGVmdDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gbWFrZVRyYW5zaXRpb24odGhpc19zZSwgdCwgZiwgZmFsc2UpO1xuICAgICAgaWYgKGxlZnQua2luZCAhPT0gJ25vbmUnKSB7IGVkZ2VzLnB1c2gobGVmdCk7IH1cblxuICAgIH0pO1xuICB9KTtcblxuICBjb25zdCBuZXdfYWNjOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBhY2MuY29uY2F0KGVkZ2VzKTtcblxuICBpZiAobmV4dF9zZSkge1xuICAgIHJldHVybiBjb21waWxlX3J1bGVfdHJhbnNpdGlvbl9zdGVwKG5ld19hY2MsIHRvLCBuZXh0X3NlLnRvLCBuZXh0X3NlLCBuZXh0X3NlLnNlKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3X2FjYztcbiAgfVxuXG59XG5cblxuXG5mdW5jdGlvbiBjb21waWxlX3J1bGVfaGFuZGxlX3RyYW5zaXRpb248bU5UPihydWxlOiBKc3NtQ29tcGlsZVNlU3RhcnQ8bU5UPik6IG1peGVkIHsgLy8gdG9kbyBmbG93IGRlc2NyaWJlIHRoZSBwYXJzZXIgcmVwcmVzZW50YXRpb24gb2YgYSB0cmFuc2l0aW9uXG4gIHJldHVybiBjb21waWxlX3J1bGVfdHJhbnNpdGlvbl9zdGVwKFtdLCBydWxlLmZyb20sIHJ1bGUuc2UudG8sIHJ1bGUuc2UsIHJ1bGUuc2Uuc2UpO1xufVxuXG5cblxuZnVuY3Rpb24gY29tcGlsZV9ydWxlX2hhbmRsZXI8bU5UPihydWxlOiBKc3NtQ29tcGlsZVNlU3RhcnQ8bU5UPik6IEpzc21Db21waWxlUnVsZSB7IC8vIHRvZG8gZmxvdyBkZXNjcmliZSB0aGUgb3V0cHV0IG9mIHRoZSBwYXJzZXJcblxuICBpZiAocnVsZS5rZXkgPT09ICd0cmFuc2l0aW9uJykge1xuICAgIHJldHVybiB7IGFnZ19hczogJ3RyYW5zaXRpb24nLCB2YWw6IGNvbXBpbGVfcnVsZV9oYW5kbGVfdHJhbnNpdGlvbihydWxlKSB9O1xuICB9XG5cbiAgaWYgKHJ1bGUua2V5ID09PSAnbWFjaGluZV9sYW5ndWFnZScpIHtcbiAgICByZXR1cm4geyBhZ2dfYXM6ICdtYWNoaW5lX2xhbmd1YWdlJywgdmFsOiByZWR1Y2VfdG9fNjM5KHJ1bGUudmFsdWUpIH07XG4gIH1cblxuICBpZiAocnVsZS5rZXkgPT09ICdzdGF0ZV9kZWNsYXJhdGlvbicpIHtcbiAgICBpZiAoIXJ1bGUubmFtZSkgeyB0aHJvdyBuZXcgRXJyb3IoJ1N0YXRlIGRlY2xhcmF0aW9ucyBtdXN0IGhhdmUgYSBuYW1lJyk7IH1cbiAgICByZXR1cm4geyBhZ2dfYXM6ICdzdGF0ZV9kZWNsYXJhdGlvbicsIHZhbDogeyBzdGF0ZTogcnVsZS5uYW1lLCBkZWNsYXJhdGlvbnM6IHJ1bGUudmFsdWUgfSB9O1xuICB9XG5cbiAgY29uc3QgdGF1dG9sb2dpZXMgOiBBcnJheTxzdHJpbmc+ID0gW1xuICAgICdncmFwaF9sYXlvdXQnLCAnc3RhcnRfc3RhdGVzJywgJ2VuZF9zdGF0ZXMnLCAnbWFjaGluZV9uYW1lJywgJ21hY2hpbmVfdmVyc2lvbicsXG4gICAgJ21hY2hpbmVfY29tbWVudCcsICdtYWNoaW5lX2F1dGhvcicsICdtYWNoaW5lX2NvbnRyaWJ1dG9yJywgJ21hY2hpbmVfZGVmaW5pdGlvbicsXG4gICAgJ21hY2hpbmVfcmVmZXJlbmNlJywgJ21hY2hpbmVfbGljZW5zZScsICdmc2xfdmVyc2lvbidcbiAgXTtcblxuICBpZiAodGF1dG9sb2dpZXMuaW5jbHVkZXMocnVsZS5rZXkpKSB7XG4gICAgcmV0dXJuIHsgYWdnX2FzOiBydWxlLmtleSwgdmFsOiBydWxlLnZhbHVlIH07XG4gIH1cblxuICB0aHJvdyBuZXcgRXJyb3IoYGNvbXBpbGVfcnVsZV9oYW5kbGVyOiBVbmtub3duIHJ1bGU6ICR7SlNPTi5zdHJpbmdpZnkocnVsZSl9YCk7XG5cbn1cblxuXG5cblxuXG5mdW5jdGlvbiBjb21waWxlPG1OVCwgbURUPih0cmVlOiBKc3NtUGFyc2VUcmVlPG1OVD4pOiBKc3NtR2VuZXJpY0NvbmZpZzxtTlQsIG1EVD4geyAgLy8gdG9kbyBmbG93IGRlc2NyaWJlIHRoZSBvdXRwdXQgb2YgdGhlIHBhcnNlclxuXG4gIGNvbnN0IHJlc3VsdHMgOiB7XG4gICAgZ3JhcGhfbGF5b3V0ICAgICAgICA6IEFycmF5PCBKc3NtTGF5b3V0ID4sXG4gICAgdHJhbnNpdGlvbiAgICAgICAgICA6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPixcbiAgICBzdGFydF9zdGF0ZXMgICAgICAgIDogQXJyYXk8IG1OVCA+LFxuICAgIGVuZF9zdGF0ZXMgICAgICAgICAgOiBBcnJheTwgbU5UID4sXG4gICAgc3RhdGVfZGVjbGFyYXRpb24gICA6IEFycmF5PCBtTlQgPixcbiAgICBmc2xfdmVyc2lvbiAgICAgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfYXV0aG9yICAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9jb21tZW50ICAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2NvbnRyaWJ1dG9yIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfZGVmaW5pdGlvbiAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9sYW5ndWFnZSAgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX2xpY2Vuc2UgICAgIDogQXJyYXk8IHN0cmluZyA+LFxuICAgIG1hY2hpbmVfbmFtZSAgICAgICAgOiBBcnJheTwgc3RyaW5nID4sXG4gICAgbWFjaGluZV9yZWZlcmVuY2UgICA6IEFycmF5PCBzdHJpbmcgPixcbiAgICBtYWNoaW5lX3ZlcnNpb24gICAgIDogQXJyYXk8IHN0cmluZyA+IC8vIHNlbXZlclxuICB9ID0ge1xuICAgIGdyYXBoX2xheW91dCAgICAgICAgOiBbXSxcbiAgICB0cmFuc2l0aW9uICAgICAgICAgIDogW10sXG4gICAgc3RhcnRfc3RhdGVzICAgICAgICA6IFtdLFxuICAgIGVuZF9zdGF0ZXMgICAgICAgICAgOiBbXSxcbiAgICBzdGF0ZV9kZWNsYXJhdGlvbiAgIDogW10sXG4gICAgZnNsX3ZlcnNpb24gICAgICAgICA6IFtdLFxuICAgIG1hY2hpbmVfYXV0aG9yICAgICAgOiBbXSxcbiAgICBtYWNoaW5lX2NvbW1lbnQgICAgIDogW10sXG4gICAgbWFjaGluZV9jb250cmlidXRvciA6IFtdLFxuICAgIG1hY2hpbmVfZGVmaW5pdGlvbiAgOiBbXSxcbiAgICBtYWNoaW5lX2xhbmd1YWdlICAgIDogW10sXG4gICAgbWFjaGluZV9saWNlbnNlICAgICA6IFtdLFxuICAgIG1hY2hpbmVfbmFtZSAgICAgICAgOiBbXSxcbiAgICBtYWNoaW5lX3JlZmVyZW5jZSAgIDogW10sXG4gICAgbWFjaGluZV92ZXJzaW9uICAgICA6IFtdXG4gIH07XG5cbiAgdHJlZS5tYXAoICh0ciA6IEpzc21Db21waWxlU2VTdGFydDxtTlQ+KSA9PiB7XG5cbiAgICBjb25zdCBydWxlICAgOiBKc3NtQ29tcGlsZVJ1bGUgPSBjb21waWxlX3J1bGVfaGFuZGxlcih0ciksXG4gICAgICAgICAgYWdnX2FzIDogc3RyaW5nICAgICAgICAgID0gcnVsZS5hZ2dfYXMsXG4gICAgICAgICAgdmFsICAgIDogbWl4ZWQgICAgICAgICAgID0gcnVsZS52YWw7ICAgICAgICAgICAgICAgICAgLy8gdG9kbyBiZXR0ZXIgdHlwZXNcblxuICAgIHJlc3VsdHNbYWdnX2FzXSA9IHJlc3VsdHNbYWdnX2FzXS5jb25jYXQodmFsKTtcblxuICB9KTtcblxuICBjb25zdCBhc3NlbWJsZWRfdHJhbnNpdGlvbnMgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gPSBbXS5jb25jYXQoLi4uIHJlc3VsdHNbJ3RyYW5zaXRpb24nXSk7XG5cbiAgY29uc3QgcmVzdWx0X2NmZyA6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPiA9IHtcbiAgICBzdGFydF9zdGF0ZXMgOiByZXN1bHRzLnN0YXJ0X3N0YXRlcy5sZW5ndGg/IHJlc3VsdHMuc3RhcnRfc3RhdGVzIDogW2Fzc2VtYmxlZF90cmFuc2l0aW9uc1swXS5mcm9tXSxcbiAgICB0cmFuc2l0aW9ucyAgOiBhc3NlbWJsZWRfdHJhbnNpdGlvbnNcbiAgfTtcblxuICBjb25zdCBvbmVPbmx5S2V5cyA6IEFycmF5PHN0cmluZz4gPSBbXG4gICAgJ2dyYXBoX2xheW91dCcsICdtYWNoaW5lX25hbWUnLCAnbWFjaGluZV92ZXJzaW9uJywgJ21hY2hpbmVfY29tbWVudCcsICdmc2xfdmVyc2lvbicsICdtYWNoaW5lX2xpY2Vuc2UnLFxuICAgICdtYWNoaW5lX2RlZmluaXRpb24nLCAnbWFjaGluZV9sYW5ndWFnZSdcbiAgXTtcblxuICBvbmVPbmx5S2V5cy5tYXAoIChvbmVPbmx5S2V5IDogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHJlc3VsdHNbb25lT25seUtleV0ubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNYXkgb25seSBoYXZlIG9uZSAke29uZU9ubHlLZXl9IHN0YXRlbWVudCBtYXhpbXVtOiAke0pTT04uc3RyaW5naWZ5KHJlc3VsdHNbb25lT25seUtleV0pfWApO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAocmVzdWx0c1tvbmVPbmx5S2V5XS5sZW5ndGgpIHtcbiAgICAgICAgcmVzdWx0X2NmZ1tvbmVPbmx5S2V5XSA9IHJlc3VsdHNbb25lT25seUtleV1bMF07XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBbJ21hY2hpbmVfYXV0aG9yJywgJ21hY2hpbmVfY29udHJpYnV0b3InLCAnbWFjaGluZV9yZWZlcmVuY2UnLCAnc3RhdGVfZGVjbGFyYXRpb24nXS5tYXAoIChtdWx0aUtleSA6IHN0cmluZykgPT4ge1xuICAgIGlmIChyZXN1bHRzW211bHRpS2V5XS5sZW5ndGgpIHtcbiAgICAgIHJlc3VsdF9jZmdbbXVsdGlLZXldID0gcmVzdWx0c1ttdWx0aUtleV07XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcmVzdWx0X2NmZztcblxufVxuXG5cblxuXG5cbmZ1bmN0aW9uIG1ha2U8bU5ULCBtRFQ+KHBsYW46IHN0cmluZyk6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPiB7XG4gIHJldHVybiBjb21waWxlKHBhcnNlKHBsYW4pKTtcbn1cblxuXG5cblxuXG5mdW5jdGlvbiB0cmFuc2Zlcl9zdGF0ZV9wcm9wZXJ0aWVzPG1OVD4oc3RhdGVfZGVjbDogSnNzbVN0YXRlRGVjbGFyYXRpb248bU5UPik6IEpzc21TdGF0ZURlY2xhcmF0aW9uPG1OVD4ge1xuXG4gICAgc3RhdGVfZGVjbC5kZWNsYXJhdGlvbnMubWFwKCAoZDogSnNzbVN0YXRlRGVjbGFyYXRpb25SdWxlKSA9PiB7XG4gICAgICBzd2l0Y2ggKGQua2V5KSB7XG5cbiAgICAgICAgY2FzZSAnbm9kZV9zaGFwZScgOiBzdGF0ZV9kZWNsLm5vZGVfc2hhcGUgPSBkLnZhbHVlOyBicmVhaztcbiAgICAgICAgY2FzZSAnbm9kZV9jb2xvcicgOiBzdGF0ZV9kZWNsLm5vZGVfY29sb3IgPSBkLnZhbHVlOyBicmVhaztcblxuICAgICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gc3RhdGUgcHJvcGVydHk6ICcke0pTT04uc3RyaW5naWZ5KGQpfSdgKTtcblxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN0YXRlX2RlY2w7XG5cbn1cblxuXG5cblxuXG5jbGFzcyBNYWNoaW5lPG1OVCwgbURUPiB7XG5cblxuICBfc3RhdGUgICAgICAgICAgICAgICAgICA6IG1OVDtcbiAgX3N0YXRlcyAgICAgICAgICAgICAgICAgOiBNYXA8bU5ULCBKc3NtR2VuZXJpY1N0YXRlPG1OVD4+O1xuICBfZWRnZXMgICAgICAgICAgICAgICAgICA6IEFycmF5PEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPj47XG4gIF9lZGdlX21hcCAgICAgICAgICAgICAgIDogTWFwPG1OVCwgTWFwPG1OVCwgbnVtYmVyPj47XG4gIF9uYW1lZF90cmFuc2l0aW9ucyAgICAgIDogTWFwPG1OVCwgbnVtYmVyPjtcbiAgX2FjdGlvbnMgICAgICAgICAgICAgICAgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcbiAgX3JldmVyc2VfYWN0aW9ucyAgICAgICAgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcbiAgX3JldmVyc2VfYWN0aW9uX3RhcmdldHMgOiBNYXA8bU5ULCBNYXA8bU5ULCBudW1iZXI+PjtcblxuICBfbWFjaGluZV9hdXRob3IgICAgICAgICA6ID9BcnJheTxzdHJpbmc+O1xuICBfbWFjaGluZV9jb21tZW50ICAgICAgICA6ID9zdHJpbmc7XG4gIF9tYWNoaW5lX2NvbnRyaWJ1dG9yICAgIDogP0FycmF5PHN0cmluZz47XG4gIF9tYWNoaW5lX2RlZmluaXRpb24gICAgIDogP3N0cmluZztcbiAgX21hY2hpbmVfbGFuZ3VhZ2UgICAgICAgOiA/c3RyaW5nO1xuICBfbWFjaGluZV9saWNlbnNlICAgICAgICA6ID9zdHJpbmc7XG4gIF9tYWNoaW5lX25hbWUgICAgICAgICAgIDogP3N0cmluZztcbiAgX21hY2hpbmVfdmVyc2lvbiAgICAgICAgOiA/c3RyaW5nO1xuICBfZnNsX3ZlcnNpb24gICAgICAgICAgICA6ID9zdHJpbmc7XG4gIF9yYXdfc3RhdGVfZGVjbGFyYXRpb24gIDogP0FycmF5PE9iamVjdD47ICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZmxvd3R5cGUvbm8td2Vhay10eXBlc1xuICBfc3RhdGVfZGVjbGFyYXRpb25zICAgICA6IE1hcDxtTlQsIEpzc21TdGF0ZURlY2xhcmF0aW9uPG1OVD4+O1xuXG4gIF9ncmFwaF9sYXlvdXQgICAgICAgICAgIDogSnNzbUxheW91dDtcblxuXG4gIC8vIHdoYXJnYXJibCB0aGlzIGJhZGx5IG5lZWRzIHRvIGJlIGJyb2tlbiB1cCwgbW9ub2xpdGggbWFzdGVyXG4gIGNvbnN0cnVjdG9yKHtcbiAgICBzdGFydF9zdGF0ZXMsXG4gICAgY29tcGxldGUgICAgICAgID0gW10sXG4gICAgdHJhbnNpdGlvbnMsXG4gICAgbWFjaGluZV9hdXRob3IsXG4gICAgbWFjaGluZV9jb21tZW50LFxuICAgIG1hY2hpbmVfY29udHJpYnV0b3IsXG4gICAgbWFjaGluZV9kZWZpbml0aW9uLFxuICAgIG1hY2hpbmVfbGFuZ3VhZ2UsXG4gICAgbWFjaGluZV9saWNlbnNlLFxuICAgIG1hY2hpbmVfbmFtZSxcbiAgICBtYWNoaW5lX3ZlcnNpb24sXG4gICAgc3RhdGVfZGVjbGFyYXRpb24sXG4gICAgZnNsX3ZlcnNpb24sXG4gICAgZ3JhcGhfbGF5b3V0ID0gJ2RvdCdcbiAgfSA6IEpzc21HZW5lcmljQ29uZmlnPG1OVCwgbURUPikge1xuXG4gICAgdGhpcy5fc3RhdGUgICAgICAgICAgICAgICAgICA9IHN0YXJ0X3N0YXRlc1swXTtcbiAgICB0aGlzLl9zdGF0ZXMgICAgICAgICAgICAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX3N0YXRlX2RlY2xhcmF0aW9ucyAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fZWRnZXMgICAgICAgICAgICAgICAgICA9IFtdO1xuICAgIHRoaXMuX2VkZ2VfbWFwICAgICAgICAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMgICAgICA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9hY3Rpb25zICAgICAgICAgICAgICAgID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX3JldmVyc2VfYWN0aW9ucyAgICAgICAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyA9IG5ldyBNYXAoKTsgICAvLyB0b2RvXG5cbiAgICB0aGlzLl9tYWNoaW5lX2F1dGhvciAgICAgICAgID0gbWFjaGluZV9hdXRob3I7XG4gICAgdGhpcy5fbWFjaGluZV9jb21tZW50ICAgICAgICA9IG1hY2hpbmVfY29tbWVudDtcbiAgICB0aGlzLl9tYWNoaW5lX2NvbnRyaWJ1dG9yICAgID0gbWFjaGluZV9jb250cmlidXRvcjtcbiAgICB0aGlzLl9tYWNoaW5lX2RlZmluaXRpb24gICAgID0gbWFjaGluZV9kZWZpbml0aW9uO1xuICAgIHRoaXMuX21hY2hpbmVfbGFuZ3VhZ2UgICAgICAgPSBtYWNoaW5lX2xhbmd1YWdlO1xuICAgIHRoaXMuX21hY2hpbmVfbGljZW5zZSAgICAgICAgPSBtYWNoaW5lX2xpY2Vuc2U7XG4gICAgdGhpcy5fbWFjaGluZV9uYW1lICAgICAgICAgICA9IG1hY2hpbmVfbmFtZTtcbiAgICB0aGlzLl9tYWNoaW5lX3ZlcnNpb24gICAgICAgID0gbWFjaGluZV92ZXJzaW9uO1xuICAgIHRoaXMuX3Jhd19zdGF0ZV9kZWNsYXJhdGlvbiAgPSBzdGF0ZV9kZWNsYXJhdGlvbiB8fCBbXTtcbiAgICB0aGlzLl9mc2xfdmVyc2lvbiAgICAgICAgICAgID0gZnNsX3ZlcnNpb247XG5cbiAgICB0aGlzLl9ncmFwaF9sYXlvdXQgICAgICAgICAgID0gZ3JhcGhfbGF5b3V0O1xuXG5cbiAgICBpZiAoc3RhdGVfZGVjbGFyYXRpb24pIHtcbiAgICAgIHN0YXRlX2RlY2xhcmF0aW9uLm1hcCggKHN0YXRlX2RlY2w6IEpzc21TdGF0ZURlY2xhcmF0aW9uPG1OVD4pID0+IHtcblxuICAgICAgICBpZiAodGhpcy5fc3RhdGVfZGVjbGFyYXRpb25zLmhhcyhzdGF0ZV9kZWNsLnN0YXRlKSkgeyAvLyBubyByZXBlYXRzXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBZGRlZCB0aGUgc2FtZSBzdGF0ZSBkZWNsYXJhdGlvbiB0d2ljZTogJHtKU09OLnN0cmluZ2lmeShzdGF0ZV9kZWNsLnN0YXRlKX1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3N0YXRlX2RlY2xhcmF0aW9ucy5zZXQoIHN0YXRlX2RlY2wuc3RhdGUsIHRyYW5zZmVyX3N0YXRlX3Byb3BlcnRpZXMoc3RhdGVfZGVjbCkgKTtcblxuICAgICAgfSApO1xuICAgIH1cblxuXG4gICAgdHJhbnNpdGlvbnMubWFwKCAodHI6SnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+KSA9PiB7XG5cbiAgICAgIGlmICh0ci5mcm9tID09PSB1bmRlZmluZWQpIHsgdGhyb3cgbmV3IEVycm9yKGB0cmFuc2l0aW9uIG11c3QgZGVmaW5lICdmcm9tJzogJHtKU09OLnN0cmluZ2lmeSh0cil9YCk7IH1cbiAgICAgIGlmICh0ci50byAgID09PSB1bmRlZmluZWQpIHsgdGhyb3cgbmV3IEVycm9yKGB0cmFuc2l0aW9uIG11c3QgZGVmaW5lICd0byc6ICR7ICBKU09OLnN0cmluZ2lmeSh0cil9YCk7IH1cblxuICAgICAgLy8gZ2V0IHRoZSBjdXJzb3JzLiAgd2hhdCBhIG1lc3NcbiAgICAgIGNvbnN0IGN1cnNvcl9mcm9tOiBKc3NtR2VuZXJpY1N0YXRlPG1OVD5cbiAgICAgICAgICA9IHRoaXMuX3N0YXRlcy5nZXQodHIuZnJvbSlcbiAgICAgICAgIHx8IHsgbmFtZTogdHIuZnJvbSwgZnJvbTogW10sIHRvOiBbXSwgY29tcGxldGU6IGNvbXBsZXRlLmluY2x1ZGVzKHRyLmZyb20pIH07XG5cbiAgICAgIGlmICghKHRoaXMuX3N0YXRlcy5oYXModHIuZnJvbSkpKSB7XG4gICAgICAgIHRoaXMuX25ld19zdGF0ZShjdXJzb3JfZnJvbSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGN1cnNvcl90bzogSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+XG4gICAgICAgICAgPSB0aGlzLl9zdGF0ZXMuZ2V0KHRyLnRvKVxuICAgICAgICAgfHwge25hbWU6IHRyLnRvLCBmcm9tOiBbXSwgdG86IFtdLCBjb21wbGV0ZTogY29tcGxldGUuaW5jbHVkZXModHIudG8pIH07XG5cbiAgICAgIGlmICghKHRoaXMuX3N0YXRlcy5oYXModHIudG8pKSkge1xuICAgICAgICB0aGlzLl9uZXdfc3RhdGUoY3Vyc29yX3RvKTtcbiAgICAgIH1cblxuICAgICAgLy8gZ3VhcmQgYWdhaW5zdCBleGlzdGluZyBjb25uZWN0aW9ucyBiZWluZyByZS1hZGRlZFxuICAgICAgaWYgKGN1cnNvcl9mcm9tLnRvLmluY2x1ZGVzKHRyLnRvKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGFscmVhZHkgaGFzICR7SlNPTi5zdHJpbmdpZnkodHIuZnJvbSl9IHRvICR7SlNPTi5zdHJpbmdpZnkodHIudG8pfWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3Vyc29yX2Zyb20udG8ucHVzaCh0ci50byk7XG4gICAgICAgIGN1cnNvcl90by5mcm9tLnB1c2godHIuZnJvbSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGFkZCB0aGUgZWRnZTsgbm90ZSBpdHMgaWRcbiAgICAgIHRoaXMuX2VkZ2VzLnB1c2godHIpO1xuICAgICAgY29uc3QgdGhpc0VkZ2VJZDogbnVtYmVyID0gdGhpcy5fZWRnZXMubGVuZ3RoIC0gMTtcblxuICAgICAgLy8gZ3VhcmQgYWdhaW5zdCByZXBlYXRpbmcgYSB0cmFuc2l0aW9uIG5hbWVcbiAgICAgIGlmICh0ci5uYW1lKSB7XG4gICAgICAgIGlmICh0aGlzLl9uYW1lZF90cmFuc2l0aW9ucy5oYXModHIubmFtZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG5hbWVkIHRyYW5zaXRpb24gXCIke0pTT04uc3RyaW5naWZ5KHRyLm5hbWUpfVwiIGFscmVhZHkgY3JlYXRlZGApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX25hbWVkX3RyYW5zaXRpb25zLnNldCh0ci5uYW1lLCB0aGlzRWRnZUlkKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBzZXQgdXAgdGhlIG1hcHBpbmcsIHNvIHRoYXQgZWRnZXMgY2FuIGJlIGxvb2tlZCB1cCBieSBlbmRwb2ludCBwYWlyc1xuICAgICAgY29uc3QgZnJvbV9tYXBwaW5nOiBNYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fZWRnZV9tYXAuZ2V0KHRyLmZyb20pIHx8IG5ldyBNYXAoKTtcbiAgICAgIGlmICghKHRoaXMuX2VkZ2VfbWFwLmhhcyh0ci5mcm9tKSkpIHtcbiAgICAgICAgdGhpcy5fZWRnZV9tYXAuc2V0KHRyLmZyb20sIGZyb21fbWFwcGluZyk7XG4gICAgICB9XG5cbi8vICAgIGNvbnN0IHRvX21hcHBpbmcgPSBmcm9tX21hcHBpbmcuZ2V0KHRyLnRvKTtcbiAgICAgIGZyb21fbWFwcGluZy5zZXQodHIudG8sIHRoaXNFZGdlSWQpOyAvLyBhbHJlYWR5IGNoZWNrZWQgdGhhdCB0aGlzIG1hcHBpbmcgZG9lc24ndCBleGlzdCwgYWJvdmVcblxuICAgICAgLy8gc2V0IHVwIHRoZSBhY3Rpb24gbWFwcGluZywgc28gdGhhdCBhY3Rpb25zIGNhbiBiZSBsb29rZWQgdXAgYnkgb3JpZ2luXG4gICAgICBpZiAodHIuYWN0aW9uKSB7XG5cblxuICAgICAgICAvLyBmb3J3YXJkIG1hcHBpbmcgZmlyc3QgYnkgYWN0aW9uIG5hbWVcbiAgICAgICAgbGV0IGFjdGlvbk1hcDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9hY3Rpb25zLmdldCh0ci5hY3Rpb24pO1xuICAgICAgICBpZiAoIShhY3Rpb25NYXApKSB7XG4gICAgICAgICAgYWN0aW9uTWFwID0gbmV3IE1hcCgpO1xuICAgICAgICAgIHRoaXMuX2FjdGlvbnMuc2V0KHRyLmFjdGlvbiwgYWN0aW9uTWFwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhY3Rpb25NYXAuaGFzKHRyLmZyb20pKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBhY3Rpb24gJHtKU09OLnN0cmluZ2lmeSh0ci5hY3Rpb24pfSBhbHJlYWR5IGF0dGFjaGVkIHRvIG9yaWdpbiAke0pTT04uc3RyaW5naWZ5KHRyLmZyb20pfWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFjdGlvbk1hcC5zZXQodHIuZnJvbSwgdGhpc0VkZ2VJZCk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8vIHJldmVyc2UgbWFwcGluZyBmaXJzdCBieSBzdGF0ZSBvcmlnaW4gbmFtZVxuICAgICAgICBsZXQgckFjdGlvbk1hcDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9yZXZlcnNlX2FjdGlvbnMuZ2V0KHRyLmZyb20pO1xuICAgICAgICBpZiAoIShyQWN0aW9uTWFwKSkge1xuICAgICAgICAgIHJBY3Rpb25NYXAgPSBuZXcgTWFwKCk7XG4gICAgICAgICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLnNldCh0ci5mcm9tLCByQWN0aW9uTWFwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG5vIG5lZWQgdG8gdGVzdCBmb3IgcmV2ZXJzZSBtYXBwaW5nIHByZS1wcmVzZW5jZTtcbiAgICAgICAgLy8gZm9yd2FyZCBtYXBwaW5nIGFscmVhZHkgY292ZXJzIGNvbGxpc2lvbnNcbiAgICAgICAgckFjdGlvbk1hcC5zZXQodHIuYWN0aW9uLCB0aGlzRWRnZUlkKTtcblxuXG4gICAgICAgIC8vIHJldmVyc2UgbWFwcGluZyBmaXJzdCBieSBzdGF0ZSB0YXJnZXQgbmFtZVxuICAgICAgICBpZiAoISh0aGlzLl9yZXZlcnNlX2FjdGlvbl90YXJnZXRzLmhhcyh0ci50bykpKSB7XG4gICAgICAgICAgdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5zZXQodHIudG8sIG5ldyBNYXAoKSk7XG4gICAgICAgIH1cblxuLyogdG9kbyBjb21lYmFja1xuICAgZnVuZGFtZW50YWwgcHJvYmxlbSBpcyByb0FjdGlvbk1hcCBuZWVkcyB0byBiZSBhIG11bHRpbWFwXG4gICAgICAgIGNvbnN0IHJvQWN0aW9uTWFwID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5nZXQodHIudG8pOyAgLy8gd2FzdGVmdWwgLSBhbHJlYWR5IGRpZCBoYXMgLSByZWZhY3RvclxuICAgICAgICBpZiAocm9BY3Rpb25NYXApIHtcbiAgICAgICAgICBpZiAocm9BY3Rpb25NYXAuaGFzKHRyLmFjdGlvbikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcm8tYWN0aW9uICR7dHIudG99IGFscmVhZHkgYXR0YWNoZWQgdG8gYWN0aW9uICR7dHIuYWN0aW9ufWApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByb0FjdGlvbk1hcC5zZXQodHIuYWN0aW9uLCB0aGlzRWRnZUlkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzaG91bGQgYmUgaW1wb3NzaWJsZSAtIGZsb3cgZG9lc25cXCd0IGtub3cgLnNldCBwcmVjZWRlcyAuZ2V0IHlldCBhZ2Fpbi4gIHNldmVyZSBlcnJvcj8nKTtcbiAgICAgICAgfVxuKi9cbiAgICAgIH1cblxuICAgIH0pO1xuXG4gIH1cblxuICBfbmV3X3N0YXRlKHN0YXRlX2NvbmZpZzogSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+KTogbU5UIHsgLy8gd2hhcmdhcmJsIGdldCB0aGF0IHN0YXRlX2NvbmZpZyBhbnkgdW5kZXIgY29udHJvbFxuXG4gICAgaWYgKHRoaXMuX3N0YXRlcy5oYXMoc3RhdGVfY29uZmlnLm5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHN0YXRlICR7SlNPTi5zdHJpbmdpZnkoc3RhdGVfY29uZmlnLm5hbWUpfSBhbHJlYWR5IGV4aXN0c2ApO1xuICAgIH1cblxuICAgIHRoaXMuX3N0YXRlcy5zZXQoc3RhdGVfY29uZmlnLm5hbWUsIHN0YXRlX2NvbmZpZyk7XG4gICAgcmV0dXJuIHN0YXRlX2NvbmZpZy5uYW1lO1xuXG4gIH1cblxuXG5cbiAgc3RhdGUoKTogbU5UIHtcbiAgICByZXR1cm4gdGhpcy5fc3RhdGU7XG4gIH1cblxuLyogd2hhcmdhcmJsIHRvZG8gbWFqb3JcbiAgIHdoZW4gd2UgcmVpbXBsZW1lbnQgdGhpcywgcmVpbnRyb2R1Y2UgdGhpcyBjaGFuZ2UgdG8gdGhlIGlzX2ZpbmFsIGNhbGxcblxuICBpc19jaGFuZ2luZygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTsgLy8gdG9kbyB3aGFyZ2FyYmxcbiAgfVxuKi9cblxuXG4gIHN0YXRlX2lzX2ZpbmFsKHdoaWNoU3RhdGU6IG1OVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAoICh0aGlzLnN0YXRlX2lzX3Rlcm1pbmFsKHdoaWNoU3RhdGUpKSAmJiAodGhpcy5zdGF0ZV9pc19jb21wbGV0ZSh3aGljaFN0YXRlKSkgKTtcbiAgfVxuXG4gIGlzX2ZpbmFsKCk6IGJvb2xlYW4ge1xuLy8gIHJldHVybiAoKCF0aGlzLmlzX2NoYW5naW5nKCkpICYmIHRoaXMuc3RhdGVfaXNfZmluYWwodGhpcy5zdGF0ZSgpKSk7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVfaXNfZmluYWwodGhpcy5zdGF0ZSgpKTtcbiAgfVxuXG4gIGdyYXBoX2xheW91dCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9ncmFwaF9sYXlvdXQ7XG4gIH1cblxuXG5cbiAgbWFjaGluZV9hdXRob3IoKTogP0FycmF5PHN0cmluZz4ge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX2F1dGhvcjtcbiAgfVxuXG4gIG1hY2hpbmVfY29tbWVudCgpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9jb21tZW50O1xuICB9XG5cbiAgbWFjaGluZV9jb250cmlidXRvcigpOiA/QXJyYXk8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfY29udHJpYnV0b3I7XG4gIH1cblxuICBtYWNoaW5lX2RlZmluaXRpb24oKTogP3N0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfZGVmaW5pdGlvbjtcbiAgfVxuXG4gIG1hY2hpbmVfbGFuZ3VhZ2UoKTogP3N0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfbGFuZ3VhZ2U7XG4gIH1cblxuICBtYWNoaW5lX2xpY2Vuc2UoKTogP3N0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX21hY2hpbmVfbGljZW5zZTtcbiAgfVxuXG4gIG1hY2hpbmVfbmFtZSgpOiA/c3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fbWFjaGluZV9uYW1lO1xuICB9XG5cbiAgbWFjaGluZV92ZXJzaW9uKCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9tYWNoaW5lX3ZlcnNpb247XG4gIH1cblxuICByYXdfc3RhdGVfZGVjbGFyYXRpb25zKCk6ID9BcnJheTxPYmplY3Q+IHsgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBmbG93dHlwZS9uby13ZWFrLXR5cGVzXG4gICAgcmV0dXJuIHRoaXMuX3Jhd19zdGF0ZV9kZWNsYXJhdGlvbjtcbiAgfVxuXG4gIHN0YXRlX2RlY2xhcmF0aW9uKHdoaWNoOiBtTlQpOiA/SnNzbVN0YXRlRGVjbGFyYXRpb248bU5UPiB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlX2RlY2xhcmF0aW9ucy5nZXQod2hpY2gpO1xuICB9XG5cbiAgc3RhdGVfZGVjbGFyYXRpb25zKCk6IE1hcDxtTlQsIE9iamVjdD4geyAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXNcbiAgICByZXR1cm4gdGhpcy5fc3RhdGVfZGVjbGFyYXRpb25zO1xuICB9XG5cbiAgZnNsX3ZlcnNpb24oKTogP3N0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX2ZzbF92ZXJzaW9uO1xuICB9XG5cblxuXG4gIG1hY2hpbmVfc3RhdGUoKTogSnNzbU1hY2hpbmVJbnRlcm5hbFN0YXRlPG1OVCwgbURUPiB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgaW50ZXJuYWxfc3RhdGVfaW1wbF92ZXJzaW9uIDogMSxcblxuICAgICAgYWN0aW9ucyAgICAgICAgICAgICAgICA6IHRoaXMuX2FjdGlvbnMsXG4gICAgICBlZGdlX21hcCAgICAgICAgICAgICAgIDogdGhpcy5fZWRnZV9tYXAsXG4gICAgICBlZGdlcyAgICAgICAgICAgICAgICAgIDogdGhpcy5fZWRnZXMsXG4gICAgICBuYW1lZF90cmFuc2l0aW9ucyAgICAgIDogdGhpcy5fbmFtZWRfdHJhbnNpdGlvbnMsXG4gICAgICByZXZlcnNlX2FjdGlvbnMgICAgICAgIDogdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLFxuLy8gICAgcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cyA6IHRoaXMuX3JldmVyc2VfYWN0aW9uX3RhcmdldHMsXG4gICAgICBzdGF0ZSAgICAgICAgICAgICAgICAgIDogdGhpcy5fc3RhdGUsXG4gICAgICBzdGF0ZXMgICAgICAgICAgICAgICAgIDogdGhpcy5fc3RhdGVzXG4gICAgfTtcblxuICB9XG5cbi8qXG4gIGxvYWRfbWFjaGluZV9zdGF0ZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7IC8vIHRvZG8gd2hhcmdhcmJsXG4gIH1cbiovXG5cblxuICBzdGF0ZXMoKTogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuIFsuLi4gdGhpcy5fc3RhdGVzLmtleXMoKV07XG4gIH1cblxuICBzdGF0ZV9mb3Iod2hpY2hTdGF0ZTogbU5UKTogSnNzbUdlbmVyaWNTdGF0ZTxtTlQ+IHtcbiAgICBjb25zdCBzdGF0ZTogP0pzc21HZW5lcmljU3RhdGU8bU5UPiA9IHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHN0YXRlKSB7IHJldHVybiBzdGF0ZTsgfVxuICAgIGVsc2UgICAgICAgeyB0aHJvdyBuZXcgRXJyb3IoYG5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeShzdGF0ZSl9YCk7IH1cbiAgfVxuXG5cblxuICBsaXN0X2VkZ2VzKCk6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiB7XG4gICAgcmV0dXJuIHRoaXMuX2VkZ2VzO1xuICB9XG5cbiAgbGlzdF9uYW1lZF90cmFuc2l0aW9ucygpOiBNYXA8bU5ULCBudW1iZXI+IHtcbiAgICByZXR1cm4gdGhpcy5fbmFtZWRfdHJhbnNpdGlvbnM7XG4gIH1cblxuICBsaXN0X2FjdGlvbnMoKTogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuIFsuLi4gdGhpcy5fYWN0aW9ucy5rZXlzKCldO1xuICB9XG5cblxuXG4gIGdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzKGZyb206IG1OVCwgdG86IG1OVCk6ID9udW1iZXIge1xuXG4gICAgY29uc3QgZW1nIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9lZGdlX21hcC5nZXQoZnJvbSk7XG5cbiAgICBpZiAoZW1nKSB7XG4gICAgICByZXR1cm4gZW1nLmdldCh0byk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gIH1cblxuXG5cbiAgbG9va3VwX3RyYW5zaXRpb25fZm9yKGZyb206IG1OVCwgdG86IG1OVCk6ID9Kc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4ge1xuICAgIGNvbnN0IGlkIDogP251bWJlciA9IHRoaXMuZ2V0X3RyYW5zaXRpb25fYnlfc3RhdGVfbmFtZXMoZnJvbSwgdG8pO1xuICAgIHJldHVybiAoKGlkID09PSB1bmRlZmluZWQpIHx8IChpZCA9PT0gbnVsbCkpPyB1bmRlZmluZWQgOiB0aGlzLl9lZGdlc1tpZF07XG4gIH1cblxuXG5cbiAgbGlzdF90cmFuc2l0aW9ucyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkpOiBKc3NtVHJhbnNpdGlvbkxpc3Q8bU5UPiB7XG4gICAgcmV0dXJuIHtlbnRyYW5jZXM6IHRoaXMubGlzdF9lbnRyYW5jZXMod2hpY2hTdGF0ZSksIGV4aXRzOiB0aGlzLmxpc3RfZXhpdHMod2hpY2hTdGF0ZSl9O1xuICB9XG5cbiAgbGlzdF9lbnRyYW5jZXMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpKTogQXJyYXk8bU5UPiB7XG4gICAgcmV0dXJuICh0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpIHx8IHt9KS5mcm9tIHx8IFtdO1xuICB9XG5cbiAgbGlzdF9leGl0cyh3aGljaFN0YXRlOiBtTlQgPSB0aGlzLnN0YXRlKCkpOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gKHRoaXMuX3N0YXRlcy5nZXQod2hpY2hTdGF0ZSkgfHwge30pLnRvICAgfHwgW107XG4gIH1cblxuXG5cbiAgcHJvYmFibGVfZXhpdHNfZm9yKHdoaWNoU3RhdGU6IG1OVCk6IEFycmF5PCBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPiB7XG5cbiAgICBjb25zdCB3c3RhdGU6ID9Kc3NtR2VuZXJpY1N0YXRlPG1OVD4gPSB0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICghKHdzdGF0ZSkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9IGluIHByb2JhYmxlX2V4aXRzX2ZvcmApOyB9XG5cbiAgICBjb25zdCB3c3RhdGVfdG8gOiBBcnJheTwgbU5UID4gPSB3c3RhdGUudG8sXG5cbiAgICAgICAgICB3dGYgICAgICAgOiBBcnJheTwgSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID4gLy8gd3N0YXRlX3RvX2ZpbHRlcmVkIC0+IHd0ZlxuICAgICAgICAgICAgICAgICAgICA9IHdzdGF0ZV90b1xuICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCggKHdzKSA6ID9Kc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPT4gdGhpcy5sb29rdXBfdHJhbnNpdGlvbl9mb3IodGhpcy5zdGF0ZSgpLCB3cykpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pO1xuXG4gICAgcmV0dXJuIHd0ZjtcblxuICB9XG5cbiAgcHJvYmFiaWxpc3RpY190cmFuc2l0aW9uKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHNlbGVjdGVkIDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+ID0gd2VpZ2h0ZWRfcmFuZF9zZWxlY3QodGhpcy5wcm9iYWJsZV9leGl0c19mb3IodGhpcy5zdGF0ZSgpKSk7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNpdGlvbiggc2VsZWN0ZWQudG8gKTtcbiAgfVxuXG4gIHByb2JhYmlsaXN0aWNfd2FsayhuOiBudW1iZXIpOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gc2VxKG4pXG4gICAgICAgICAgLm1hcCgoKSA6IG1OVCA9PiB7XG4gICAgICAgICAgICAgY29uc3Qgc3RhdGVfd2FzOiBtTlQgPSB0aGlzLnN0YXRlKCk7XG4gICAgICAgICAgICAgdGhpcy5wcm9iYWJpbGlzdGljX3RyYW5zaXRpb24oKTtcbiAgICAgICAgICAgICByZXR1cm4gc3RhdGVfd2FzO1xuICAgICAgICAgICB9KVxuICAgICAgICAgIC5jb25jYXQoW3RoaXMuc3RhdGUoKV0pO1xuICB9XG5cbiAgcHJvYmFiaWxpc3RpY19oaXN0b193YWxrKG46IG51bWJlcik6IE1hcDxtTlQsIG51bWJlcj4ge1xuICAgIHJldHVybiBoaXN0b2dyYXBoKHRoaXMucHJvYmFiaWxpc3RpY193YWxrKG4pKTtcbiAgfVxuXG5cblxuICBhY3Rpb25zKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSApOiBBcnJheTxtTlQ+IHtcbiAgICBjb25zdCB3c3RhdGUgOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKHdzdGF0ZSkgeyByZXR1cm4gWy4uLiB3c3RhdGUua2V5cygpXTsgfVxuICAgIGVsc2UgICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cbiAgfVxuXG4gIGxpc3Rfc3RhdGVzX2hhdmluZ19hY3Rpb24od2hpY2hTdGF0ZTogbU5UKTogQXJyYXk8bU5UPiB7XG4gICAgY29uc3Qgd3N0YXRlIDogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9hY3Rpb25zLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAod3N0YXRlKSB7IHJldHVybiBbLi4uIHdzdGF0ZS5rZXlzKCldOyB9XG4gICAgZWxzZSAgICAgICAgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuICB9XG5cbi8vIGNvbWViYWNrXG4vKlxuICBsaXN0X2VudHJhbmNlX2FjdGlvbnMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpICkgOiBBcnJheTxtTlQ+IHtcbiAgICByZXR1cm4gWy4uLiAodGhpcy5fcmV2ZXJzZV9hY3Rpb25fdGFyZ2V0cy5nZXQod2hpY2hTdGF0ZSkgfHwgbmV3IE1hcCgpKS52YWx1ZXMoKV0gLy8gd2FzdGVmdWxcbiAgICAgICAgICAgLm1hcCggKGVkZ2VJZDphbnkpID0+ICh0aGlzLl9lZGdlc1tlZGdlSWRdIDogYW55KSkgLy8gd2hhcmdhcmJsIGJ1cm4gb3V0IGFueVxuICAgICAgICAgICAuZmlsdGVyKCAobzphbnkpID0+IG8udG8gPT09IHdoaWNoU3RhdGUpXG4gICAgICAgICAgIC5tYXAoIGZpbHRlcmVkID0+IGZpbHRlcmVkLmZyb20gKTtcbiAgfVxuKi9cbiAgbGlzdF9leGl0X2FjdGlvbnMod2hpY2hTdGF0ZTogbU5UID0gdGhpcy5zdGF0ZSgpICk6IEFycmF5PD9tTlQ+IHsgLy8gdGhlc2UgYXJlIG1OVCwgbm90ID9tTlRcbiAgICBjb25zdCByYV9iYXNlOiA/TWFwPG1OVCwgbnVtYmVyPiA9IHRoaXMuX3JldmVyc2VfYWN0aW9ucy5nZXQod2hpY2hTdGF0ZSk7XG4gICAgaWYgKCEocmFfYmFzZSkpIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cblxuICAgIHJldHVybiBbLi4uIHJhX2Jhc2UudmFsdWVzKCldXG4gICAgICAgICAgIC5tYXAgICAgKCAoZWRnZUlkOiBudW1iZXIpICAgICAgICAgICAgICA6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9PiB0aGlzLl9lZGdlc1tlZGdlSWRdICAgKVxuICAgICAgICAgICAuZmlsdGVyICggKG86IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPikgOiBib29sZWFuICAgICAgICAgICAgICAgICAgPT4gby5mcm9tID09PSB3aGljaFN0YXRlIClcbiAgICAgICAgICAgLm1hcCAgICAoIChmaWx0ZXJlZDogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+KSA6ID9tTlQgICAgICAgICAgICAgID0+IGZpbHRlcmVkLmFjdGlvbiAgICAgICApO1xuICB9XG5cbiAgcHJvYmFibGVfYWN0aW9uX2V4aXRzKHdoaWNoU3RhdGU6IG1OVCA9IHRoaXMuc3RhdGUoKSApIDogQXJyYXk8bWl4ZWQ+IHsgLy8gdGhlc2UgYXJlIG1OVFxuICAgIGNvbnN0IHJhX2Jhc2U6ID9NYXA8bU5ULCBudW1iZXI+ID0gdGhpcy5fcmV2ZXJzZV9hY3Rpb25zLmdldCh3aGljaFN0YXRlKTtcbiAgICBpZiAoIShyYV9iYXNlKSkgeyB0aHJvdyBuZXcgRXJyb3IoYE5vIHN1Y2ggc3RhdGUgJHtKU09OLnN0cmluZ2lmeSh3aGljaFN0YXRlKX1gKTsgfVxuXG4gICAgcmV0dXJuIFsuLi4gcmFfYmFzZS52YWx1ZXMoKV1cbiAgICAgICAgICAgLm1hcCAgICAoIChlZGdlSWQ6IG51bWJlcik6IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPiA9PiB0aGlzLl9lZGdlc1tlZGdlSWRdICAgKVxuICAgICAgICAgICAuZmlsdGVyICggKG86IEpzc21UcmFuc2l0aW9uPG1OVCwgbURUPik6IGJvb2xlYW4gICAgID0+IG8uZnJvbSA9PT0gd2hpY2hTdGF0ZSApXG4gICAgICAgICAgIC5tYXAgICAgKCAoZmlsdGVyZWQpOiBtaXhlZCAgICAgICAgICAgICAgICAgICAgICAgICAgPT4gKCB7IGFjdGlvbiAgICAgIDogZmlsdGVyZWQuYWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9iYWJpbGl0eSA6IGZpbHRlcmVkLnByb2JhYmlsaXR5IH0gKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gIH1cblxuXG5cbiAgaXNfdW5lbnRlcmFibGUod2hpY2hTdGF0ZTogbU5UKTogYm9vbGVhbiB7XG4gICAgLy8gd2hhcmdhcmJsIHNob3VsZCB0aHJvdyBvbiB1bmtub3duIHN0YXRlXG4gICAgcmV0dXJuIHRoaXMubGlzdF9lbnRyYW5jZXMod2hpY2hTdGF0ZSkubGVuZ3RoID09PSAwO1xuICB9XG5cbiAgaGFzX3VuZW50ZXJhYmxlcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZXMoKS5zb21lKCAoeCk6IGJvb2xlYW4gPT4gdGhpcy5pc191bmVudGVyYWJsZSh4KSk7XG4gIH1cblxuXG5cbiAgaXNfdGVybWluYWwoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVfaXNfdGVybWluYWwodGhpcy5zdGF0ZSgpKTtcbiAgfVxuXG4gIHN0YXRlX2lzX3Rlcm1pbmFsKHdoaWNoU3RhdGU6IG1OVCk6IGJvb2xlYW4ge1xuICAgIC8vIHdoYXJnYXJibCBzaG91bGQgdGhyb3cgb24gdW5rbm93biBzdGF0ZVxuICAgIHJldHVybiB0aGlzLmxpc3RfZXhpdHMod2hpY2hTdGF0ZSkubGVuZ3RoID09PSAwO1xuICB9XG5cbiAgaGFzX3Rlcm1pbmFscygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZXMoKS5zb21lKCAoeCk6IGJvb2xlYW4gPT4gdGhpcy5zdGF0ZV9pc190ZXJtaW5hbCh4KSk7XG4gIH1cblxuXG5cbiAgaXNfY29tcGxldGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVfaXNfY29tcGxldGUodGhpcy5zdGF0ZSgpKTtcbiAgfVxuXG4gIHN0YXRlX2lzX2NvbXBsZXRlKHdoaWNoU3RhdGU6IG1OVCkgOiBib29sZWFuIHtcbiAgICBjb25zdCB3c3RhdGU6ID9Kc3NtR2VuZXJpY1N0YXRlPG1OVD4gPSB0aGlzLl9zdGF0ZXMuZ2V0KHdoaWNoU3RhdGUpO1xuICAgIGlmICh3c3RhdGUpIHsgcmV0dXJuIHdzdGF0ZS5jb21wbGV0ZTsgfVxuICAgIGVsc2UgICAgICAgIHsgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHN0YXRlICR7SlNPTi5zdHJpbmdpZnkod2hpY2hTdGF0ZSl9YCk7IH1cbiAgfVxuXG4gIGhhc19jb21wbGV0ZXMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVzKCkuc29tZSggKHgpOiBib29sZWFuID0+IHRoaXMuc3RhdGVfaXNfY29tcGxldGUoeCkgKTtcbiAgfVxuXG5cblxuICBhY3Rpb24obmFtZTogbU5ULCBuZXdEYXRhPzogbURUKTogYm9vbGVhbiB7XG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgaWYgKHRoaXMudmFsaWRfYWN0aW9uKG5hbWUsIG5ld0RhdGEpKSB7XG4gICAgICBjb25zdCBlZGdlOiBKc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB0aGlzLmN1cnJlbnRfYWN0aW9uX2VkZ2VfZm9yKG5hbWUpO1xuICAgICAgdGhpcy5fc3RhdGUgPSBlZGdlLnRvO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICB0cmFuc2l0aW9uKG5ld1N0YXRlOiBtTlQsIG5ld0RhdGE/OiBtRFQpOiBib29sZWFuIHtcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICBpZiAodGhpcy52YWxpZF90cmFuc2l0aW9uKG5ld1N0YXRlLCBuZXdEYXRhKSkge1xuICAgICAgdGhpcy5fc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgLy8gY2FuIGxlYXZlIG1hY2hpbmUgaW4gaW5jb25zaXN0ZW50IHN0YXRlLiAgZ2VuZXJhbGx5IGRvIG5vdCB1c2VcbiAgZm9yY2VfdHJhbnNpdGlvbihuZXdTdGF0ZTogbU5ULCBuZXdEYXRhPzogbURUKTogYm9vbGVhbiB7XG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgaWYgKHRoaXMudmFsaWRfZm9yY2VfdHJhbnNpdGlvbihuZXdTdGF0ZSwgbmV3RGF0YSkpIHtcbiAgICAgIHRoaXMuX3N0YXRlID0gbmV3U3RhdGU7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG5cblxuICBjdXJyZW50X2FjdGlvbl9mb3IoYWN0aW9uOiBtTlQpOiBudW1iZXIgfCB2b2lkIHtcbiAgICBjb25zdCBhY3Rpb25fYmFzZTogP01hcDxtTlQsIG51bWJlcj4gPSB0aGlzLl9hY3Rpb25zLmdldChhY3Rpb24pO1xuICAgIHJldHVybiBhY3Rpb25fYmFzZT8gYWN0aW9uX2Jhc2UuZ2V0KHRoaXMuc3RhdGUoKSk6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGN1cnJlbnRfYWN0aW9uX2VkZ2VfZm9yKGFjdGlvbjogbU5UKTogSnNzbVRyYW5zaXRpb248bU5ULCBtRFQ+IHtcbiAgICBjb25zdCBpZHg6ID9udW1iZXIgPSB0aGlzLmN1cnJlbnRfYWN0aW9uX2ZvcihhY3Rpb24pO1xuICAgIGlmICgoaWR4ID09PSB1bmRlZmluZWQpIHx8IChpZHggPT09IG51bGwpKSB7IHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBhY3Rpb24gJHtKU09OLnN0cmluZ2lmeShhY3Rpb24pfWApOyB9XG4gICAgcmV0dXJuIHRoaXMuX2VkZ2VzW2lkeF07XG4gIH1cblxuICB2YWxpZF9hY3Rpb24oYWN0aW9uOiBtTlQsIF9uZXdEYXRhPzogbURUKTogYm9vbGVhbiB7ICAvLyB0b2RvIGNvbWViYWNrIHVuaWdub3JlIG5ld0RhdGFcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgaG9va3NcbiAgICAvLyB0b2RvIHdoYXJnYXJibCBpbXBsZW1lbnQgZGF0YSBzdHVmZlxuICAgIC8vIHRvZG8gbWFqb3IgaW5jb21wbGV0ZSB3aGFyZ2FyYmwgY29tZWJhY2tcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50X2FjdGlvbl9mb3IoYWN0aW9uKSAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgdmFsaWRfdHJhbnNpdGlvbihuZXdTdGF0ZTogbU5ULCBfbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4geyAgLy8gdG9kbyBjb21lYmFjayB1bmlnbm9yZSBuZXdEYXRhXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgY29uc3QgdHJhbnNpdGlvbl9mb3I6ID9Kc3NtVHJhbnNpdGlvbjxtTlQsIG1EVD4gPSB0aGlzLmxvb2t1cF90cmFuc2l0aW9uX2Zvcih0aGlzLnN0YXRlKCksIG5ld1N0YXRlKTtcblxuICAgIGlmICghKHRyYW5zaXRpb25fZm9yKSkgICAgICAgICAgeyByZXR1cm4gZmFsc2U7IH1cbiAgICBpZiAodHJhbnNpdGlvbl9mb3IuZm9yY2VkX29ubHkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcblxuICB9XG5cbiAgdmFsaWRfZm9yY2VfdHJhbnNpdGlvbihuZXdTdGF0ZTogbU5ULCBfbmV3RGF0YT86IG1EVCk6IGJvb2xlYW4geyAgLy8gdG9kbyBjb21lYmFjayB1bmlnbm9yZSBuZXdEYXRhXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGhvb2tzXG4gICAgLy8gdG9kbyB3aGFyZ2FyYmwgaW1wbGVtZW50IGRhdGEgc3R1ZmZcbiAgICAvLyB0b2RvIG1ham9yIGluY29tcGxldGUgd2hhcmdhcmJsIGNvbWViYWNrXG4gICAgcmV0dXJuICh0aGlzLmxvb2t1cF90cmFuc2l0aW9uX2Zvcih0aGlzLnN0YXRlKCksIG5ld1N0YXRlKSAhPT0gdW5kZWZpbmVkKTtcbiAgfVxuXG5cbn1cblxuXG5cblxuXG5mdW5jdGlvbiBzbTxtTlQsIG1EVD4odGVtcGxhdGVfc3RyaW5nczogQXJyYXk8c3RyaW5nPiAvKiAsIGFyZ3VtZW50cyAqLyk6IE1hY2hpbmU8bU5ULCBtRFQ+IHtcblxuICAgIC8vIGZvb2BhJHsxfWIkezJ9Y2Agd2lsbCBjb21lIGluIGFzIChbJ2EnLCdiJywnYyddLDEsMilcbiAgICAvLyB0aGlzIGluY2x1ZGVzIHdoZW4gYSBhbmQgYyBhcmUgZW1wdHkgc3RyaW5nc1xuICAgIC8vIHRoZXJlZm9yZSB0ZW1wbGF0ZV9zdHJpbmdzIHdpbGwgYWx3YXlzIGhhdmUgb25lIG1vcmUgZWwgdGhhbiB0ZW1wbGF0ZV9hcmdzXG4gICAgLy8gdGhlcmVmb3JlIG1hcCB0aGUgc21hbGxlciBjb250YWluZXIgYW5kIHRvc3MgdGhlIGxhc3Qgb25lIG9uIG9uIHRoZSB3YXkgb3V0XG5cbiAgICByZXR1cm4gbmV3IE1hY2hpbmUobWFrZSh0ZW1wbGF0ZV9zdHJpbmdzLnJlZHVjZShcblxuICAgICAgLy8gaW4gZ2VuZXJhbCBhdm9pZGluZyBgYXJndW1lbnRzYCBpcyBzbWFydC4gIGhvd2V2ZXIgd2l0aCB0aGUgdGVtcGxhdGVcbiAgICAgIC8vIHN0cmluZyBub3RhdGlvbiwgYXMgZGVzaWduZWQsIGl0J3Mgbm90IHJlYWxseSB3b3J0aCB0aGUgaGFzc2xlXG5cbiAgICAgIC8qIGVzbGludC1kaXNhYmxlIGZwL25vLWFyZ3VtZW50cyAqL1xuICAgICAgLyogZXNsaW50LWRpc2FibGUgcHJlZmVyLXJlc3QtcGFyYW1zICovXG4gICAgICAoYWNjLCB2YWwsIGlkeCk6IHN0cmluZyA9PiBgJHthY2N9JHthcmd1bWVudHNbaWR4XX0ke3ZhbH1gICAvLyBhcmd1bWVudHNbMF0gaXMgbmV2ZXIgbG9hZGVkLCBzbyBhcmdzIGRvZXNuJ3QgbmVlZCB0byBiZSBnYXRlZFxuICAgICAgLyogZXNsaW50LWVuYWJsZSAgcHJlZmVyLXJlc3QtcGFyYW1zICovXG4gICAgICAvKiBlc2xpbnQtZW5hYmxlICBmcC9uby1hcmd1bWVudHMgKi9cblxuICAgICkpKTtcblxufVxuXG5cblxuXG5cbmV4cG9ydCB7XG5cbiAgdmVyc2lvbixcblxuICB0cmFuc2Zlcl9zdGF0ZV9wcm9wZXJ0aWVzLFxuXG4gIE1hY2hpbmUsXG5cbiAgbWFrZSxcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuXG4gIHNtLFxuXG4gIGFycm93X2RpcmVjdGlvbixcbiAgYXJyb3dfbGVmdF9raW5kLFxuICBhcnJvd19yaWdodF9raW5kLFxuXG4gIC8vIHRvZG8gd2hhcmdhcmJsIHRoZXNlIHNob3VsZCBiZSBleHBvcnRlZCB0byBhIHV0aWxpdHkgbGlicmFyeVxuICBzZXEsIHdlaWdodGVkX3JhbmRfc2VsZWN0LCBoaXN0b2dyYXBoLCB3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0LCB3ZWlnaHRlZF9oaXN0b19rZXlcblxufTtcbiJdfQ==