'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };
/* eslint-disable max-len */

var _avaSpec = require('ava-spec');

var jssm = require('../../../build/jssm.es5.js');

(0, _avaSpec.test)('build-set version number is present', function (t) {
  return t.is(_typeof(jssm.version), 'string');
});

(0, _avaSpec.describe)('Stochastic weather', async function (_it) {

  new jssm.Machine({

    initial_state: 'breezy',

    transitions: [{ from: 'breezy', to: 'breezy', probability: 0.4 }, { from: 'breezy', to: 'sunny', probability: 0.3 }, { from: 'breezy', to: 'cloudy', probability: 0.15 }, { from: 'breezy', to: 'windy', probability: 0.1 }, { from: 'breezy', to: 'rain', probability: 0.05 }, { from: 'sunny', to: 'sunny', probability: 0.5 }, { from: 'sunny', to: 'hot', probability: 0.15 }, { from: 'sunny', to: 'breezy', probability: 0.15 }, { from: 'sunny', to: 'cloudy', probability: 0.15 }, { from: 'sunny', to: 'rain', probability: 0.05 }, { from: 'hot', to: 'hot', probability: 0.75 }, { from: 'hot', to: 'breezy', probability: 0.05 }, { from: 'hot', to: 'sunny', probability: 0.2 }, { from: 'cloudy', to: 'cloudy', probability: 0.6 }, { from: 'cloudy', to: 'sunny', probability: 0.2 }, { from: 'cloudy', to: 'rain', probability: 0.15 }, { from: 'cloudy', to: 'breezy', probability: 0.05 }, { from: 'windy', to: 'windy', probability: 0.3 }, { from: 'windy', to: 'gale', probability: 0.1 }, { from: 'windy', to: 'breezy', probability: 0.4 }, { from: 'windy', to: 'rain', probability: 0.15 }, { from: 'windy', to: 'sunny', probability: 0.05 }, { from: 'gale', to: 'gale', probability: 0.65 }, { from: 'gale', to: 'windy', probability: 0.25 }, { from: 'gale', to: 'torrent', probability: 0.05 }, { from: 'gale', to: 'hot', probability: 0.05 }, { from: 'rain', to: 'rain', probability: 0.3 }, { from: 'rain', to: 'torrent', probability: 0.05 }, { from: 'rain', to: 'windy', probability: 0.1 }, { from: 'rain', to: 'breezy', probability: 0.15 }, { from: 'rain', to: 'sunny', probability: 0.1 }, { from: 'rain', to: 'cloudy', probability: 0.3 }, { from: 'torrent', to: 'torrent', probability: 0.65 }, { from: 'torrent', to: 'rain', probability: 0.25 }, { from: 'torrent', to: 'cloudy', probability: 0.05 }, { from: 'torrent', to: 'gale', probability: 0.05 }]

  });
});

(0, _avaSpec.describe)('list exit actions', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ from: 'off', to: 'red', action: 'on' }, { from: 'red', to: 'off', action: 'off' }]
  });

  it('shows "on" from off as default', function (t) {
    return t.is('on', machine.list_exit_actions()[0]);
  });
  it('shows "on" from off', function (t) {
    return t.is('on', machine.list_exit_actions('off')[0]);
  });
  it('shows "off" from red', function (t) {
    return t.is('off', machine.list_exit_actions('red')[0]);
  });
});

(0, _avaSpec.describe)('probable exits for', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ from: 'off', to: 'red' }]
  });

  it('probable exits are an array', function (t) {
    return t.is(true, Array.isArray(machine.probable_exits_for('off')));
  });
  it('one probable exit in example', function (t) {
    return t.is(1, machine.probable_exits_for('off').length);
  });
  it('exit is an object', function (t) {
    return t.is('object', _typeof(machine.probable_exits_for('off')[0]));
  });
  it('exit 0 has a string from property', function (t) {
    return t.is('string', _typeof(machine.probable_exits_for('off')[0].from));
  });
});

(0, _avaSpec.describe)('probable action exits', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ from: 'off', to: 'red', action: 'on' }, { from: 'red', to: 'off', action: 'off' }]
  });

  it('probable action exits are an array', function (t) {
    return t.is(true, Array.isArray(machine.probable_action_exits()));
  });
  it('probable action exit 1 is on', function (t) {
    return t.is('on', machine.probable_action_exits()[0].action);
  });

  it('probable action exits are an array', function (t) {
    return t.is(true, Array.isArray(machine.probable_action_exits('off')));
  });
  it('probable action exit 1 is on', function (t) {
    return t.is('on', machine.probable_action_exits('off')[0].action);
  });

  it('probable action exits are an array', function (t) {
    return t.is(true, Array.isArray(machine.probable_action_exits('red')));
  });
  it('probable action exit 1 is on', function (t) {
    return t.is('off', machine.probable_action_exits('red')[0].action);
  });
});

(0, _avaSpec.describe)('probabilistic_transition', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ from: 'off', to: 'red' }]
  });

  machine.probabilistic_transition();

  it('solo after probabilistic is red', function (t) {
    return t.is('red', machine.state());
  });
});

(0, _avaSpec.describe)('probabilistic_walk', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ from: 'off', to: 'red' }, { from: 'red', to: 'off' }]
  });

  machine.probabilistic_walk(3);

  it('solo after probabilistic walk 3 is red', function (t) {
    return t.is('red', machine.state());
  });
});

(0, _avaSpec.describe)('probabilistic_histo_walk', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ from: 'off', to: 'red' }, { from: 'red', to: 'off' }]
  });

  var histo = machine.probabilistic_histo_walk(3);

  it('histo is a Map', function (t) {
    return t.is(true, histo instanceof Map);
  });
  it('histo red is 2', function (t) {
    return t.is(2, histo.get('red'));
  });
  it('histo off is 2', function (t) {
    return t.is(2, histo.get('off'));
  });
});

(0, _avaSpec.describe)('reports state_is_final', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ from: 'off', to: 'red' }, { from: 'off', to: 'mid' }, { from: 'mid', to: 'fin' }],
    complete: ['red', 'mid']
  });

  it('final false for neither', function (t) {
    return t.is(false, machine.state_is_final('off'));
  });
  it('final false for just terminal', function (t) {
    return t.is(false, machine.state_is_final('mid'));
  });
  it('final false for just complete', function (t) {
    return t.is(false, machine.state_is_final('fin'));
  });
  it('final true', function (t) {
    return t.is(true, machine.state_is_final('red'));
  });
});

(0, _avaSpec.describe)('reports is_final', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ from: 'off', to: 'red' }],
    complete: ['red']
  });

  var init_final = machine.is_final();
  machine.transition('red');
  var fin_final = machine.is_final();

  it('final false', function (t) {
    return t.is(false, init_final);
  });
  it('final true', function (t) {
    return t.is(true, fin_final);
  });

  /* todo whargarbl needs another two tests for is_changing once reintroduced */
});

(0, _avaSpec.describe)('reports state_is_terminal', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ name: 'turn_on', action: 'power_on', from: 'off', to: 'red' }]
  });

  it('terminal false', function (t) {
    return t.is(false, machine.state_is_terminal('off'));
  });
  it('terminal true', function (t) {
    return t.is(true, machine.state_is_terminal('red'));
  });
});

(0, _avaSpec.describe)('reports is_terminal', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ name: 'turn_on', action: 'power_on', from: 'off', to: 'red' }]
  });

  var first = machine.is_terminal();
  machine.transition('red');
  var second = machine.is_terminal();

  var terms = machine.has_terminals();

  it('terminal false', function (t) {
    return t.is(false, first);
  });
  it('terminal true', function (t) {
    return t.is(true, second);
  });
  it('has_terminals', function (t) {
    return t.is(true, terms);
  });
});

(0, _avaSpec.describe)('reports state_is_complete', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ name: 'turn_on', action: 'power_on', from: 'off', to: 'red' }],
    complete: ['off'] // huhu
  });

  it('state_is_complete false', function (t) {
    return t.is(true, machine.state_is_complete('off'));
  });
  it('state_is_complete true', function (t) {
    return t.is(false, machine.state_is_complete('red'));
  });
});

(0, _avaSpec.describe)('reports is_complete', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ name: 'turn_on', action: 'power_on', from: 'off', to: 'red' }],
    complete: ['off'] // huhu
  });

  var first = machine.is_complete();
  machine.transition('red');
  var second = machine.is_complete();

  var terms = machine.has_completes();

  it('is_complete false', function (t) {
    return t.is(true, first);
  });
  it('is_complete true', function (t) {
    return t.is(false, second);
  });
  it('has_completes', function (t) {
    return t.is(true, terms);
  });
});

(0, _avaSpec.describe)('reports on actions', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ name: 'turn_on', action: 'power_on', from: 'off', to: 'red' }]
  });

  var a = machine.list_actions(); // todo comeback

  it('that it has', function (t) {
    return t.is('number', _typeof(machine.current_action_for('power_on')));
  });
  it('that it doesn\'t have', function (t) {
    return t.is('undefined', _typeof(machine.current_action_for('power_left')));
  });
  it('correct list type', function (t) {
    return t.is(true, Array.isArray(a));
  });
  it('correct list size', function (t) {
    return t.is(1, a.length);
  });
});

(0, _avaSpec.describe)('actions', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ from: 'off', to: 'red', action: 'on' }, { from: 'red', to: 'off', action: 'off' }]
  });

  it('red has actions().length 1', function (t) {
    return t.is(1, machine.actions().length);
  });
  it('red has actions()[0] "on"', function (t) {
    return t.is('on', machine.actions()[0]);
  });

  it('red has actions().length 1', function (t) {
    return t.is(1, machine.actions('off').length);
  });
  it('red has actions()[0] "on"', function (t) {
    return t.is('on', machine.actions('off')[0]);
  });

  it('red has actions().length 1', function (t) {
    return t.is(1, machine.actions('red').length);
  });
  it('red has actions()[0] "off"', function (t) {
    return t.is('off', machine.actions('red')[0]);
  });
});

(0, _avaSpec.describe)('states having action', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ from: 'off', to: 'red', action: 'on' }, { from: 'red', to: 'off', action: 'off' }]
  });

  it('one action has on', function (t) {
    return t.is(1, machine.list_states_having_action('on').length);
  });
  it('on is had by off', function (t) {
    return t.is('off', machine.list_states_having_action('on')[0]);
  });
});

(0, _avaSpec.describe)('unenterables', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ name: 'turn_on', action: 'power_on', from: 'off', to: 'red' }]
  });

  it('off isn\'t enterable', function (t) {
    return t.is(true, machine.is_unenterable('off'));
  });
  it('red is enterable', function (t) {
    return t.is(false, machine.is_unenterable('red'));
  });
  it('machine has unenterables', function (t) {
    return t.is(true, machine.has_unenterables());
  });
});

(0, _avaSpec.describe)('reports on action edges', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ name: 'turn_on', action: 'power_on', from: 'off', to: 'red' }]
  });

  it('that it has', function (t) {
    return t.is('object', _typeof(machine.current_action_edge_for('power_on')));
  });
  it('that it doesn\'t have', function (t) {
    return t.throws(function () {
      machine.current_action_edge_for('power_west');
    });
  });
});

(0, _avaSpec.describe)('reports on states', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ name: 'turn_on', action: 'power_on', from: 'off', to: 'red' }]
  });

  it('that it has', function (t) {
    return t.is('object', _typeof(machine.state_for('off')));
  });

  it('that it doesn\'t have', function (t) {
    return t.throws(function () {
      machine.state_for('no such state');
    });
  });
});

(0, _avaSpec.describe)('returns states', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ name: 'turn_on', action: 'power_on', from: 'off', to: 'red' }]
  });

  it('that it has', function (t) {
    return t.is('object', _typeof(machine.machine_state()));
  });
});

(0, _avaSpec.describe)('reports on transitions', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ name: 'turn_on', action: 'power_on', from: 'off', to: 'red' }]
  });

  it('unspecified transition return type', function (t) {
    return t.is('object', _typeof(machine.list_transitions()));
  });
  it('unspecified transition correct entrance count', function (t) {
    return t.is(0, machine.list_transitions().entrances.length);
  });
  it('unspecified transition correct exit count', function (t) {
    return t.is(1, machine.list_transitions().exits.length);
  });

  it('specified transition return type', function (t) {
    return t.is('object', _typeof(machine.list_transitions('off')));
  });
  it('specified transition correct entrance count', function (t) {
    return t.is(0, machine.list_transitions('off').entrances.length);
  });
  it('specified transition correct exit count', function (t) {
    return t.is(1, machine.list_transitions('off').exits.length);
  });

  it('no such spec trans return type', function (t) {
    return t.is('object', _typeof(machine.list_transitions('moot')));
  });
  it('no such spec trans correct entrance count', function (t) {
    return t.is(0, machine.list_transitions('moot').entrances.length);
  });
  it('no such spec trans correct exit count', function (t) {
    return t.is(0, machine.list_transitions('moot').exits.length);
  });

  it('unspecified entrance return type', function (t) {
    return t.is(true, Array.isArray(machine.list_entrances()));
  });
  it('unspecified entrance correct count', function (t) {
    return t.is(0, machine.list_entrances().length);
  });

  it('specified entrance return type', function (t) {
    return t.is(true, Array.isArray(machine.list_entrances('off')));
  });
  it('specified entrance correct count', function (t) {
    return t.is(0, machine.list_entrances('off').length);
  });

  it('no such specified entrance return type', function (t) {
    return t.is(true, Array.isArray(machine.list_entrances('moot')));
  }); // todo whargarbl should these throw?
  it('no such specified entrance correct count', function (t) {
    return t.is(0, machine.list_entrances('moot').length);
  });

  it('unspecified exit return type', function (t) {
    return t.is(true, Array.isArray(machine.list_exits()));
  });
  it('unspecified exit correct count', function (t) {
    return t.is(1, machine.list_exits().length);
  });

  it('specified exit return type', function (t) {
    return t.is(true, Array.isArray(machine.list_exits('off')));
  });
  it('specified exit correct count', function (t) {
    return t.is(1, machine.list_exits('off').length);
  });

  it('no such specified exit return type', function (t) {
    return t.is(true, Array.isArray(machine.list_exits('moot')));
  });
  it('no such specified exit correct count', function (t) {
    return t.is(0, machine.list_exits('moot').length);
  });

  it('edge list return type', function (t) {
    return t.is(true, Array.isArray(machine.list_edges()));
  });
  it('edge list correct count', function (t) {
    return t.is(1, machine.list_edges().length);
  });
});

(0, _avaSpec.describe)('transition by state names', async function (it) {

  var machine = new jssm.Machine({
    initial_state: 'off',
    transitions: [{ name: 'turn_on', action: 'power_on', from: 'off', to: 'red' }]
  });

  it('finds off -> red', function (t) {
    return t.is(0, machine.get_transition_by_state_names('off', 'red'));
  });
  it('does not find off -> blue', function (t) {
    return t.is(undefined, machine.get_transition_by_state_names('off', 'blue'));
  });
  it('does not find blue -> red', function (t) {
    return t.is(undefined, machine.get_transition_by_state_names('blue', 'red'));
  });
});

(0, _avaSpec.describe)('Illegal machines', async function (it) {

  it('catch repeated names', function (t) {
    return t.throws(function () {

      new jssm.Machine({
        initial_state: 'moot',
        transitions: [{ name: 'identical', from: '1', to: '2' }, { name: 'identical', from: '2', to: '3' }]
      });
    }, Error);
  });

  it('must define from', function (t) {
    return t.throws(function () {

      new jssm.Machine({
        initial_state: 'moot',
        transitions: [{ name: 'identical', to: '2' }]
      });
    }, Error);
  });

  it('must define to', function (t) {
    return t.throws(function () {

      new jssm.Machine({
        initial_state: 'moot',
        transitions: [{ name: 'identical', from: '1' }]
      });
    }, Error);
  });

  it('must not have two identical edges', function (t) {
    return t.throws(function () {

      new jssm.Machine({
        initial_state: 'moot',
        transitions: [{ name: 'id1', from: '1', to: '2' }, { name: 'id2', from: '1', to: '2' }]
      });
    }, Error);
  });

  it('must not have two of the same action from the same source', function (t) {
    return t.throws(function () {

      new jssm.Machine({
        initial_state: 'moot',
        transitions: [{ name: 'id1', from: '1', to: '2', action: 'identical' }, { name: 'id2', from: '1', to: '3', action: 'identical' }]
      });
    }, Error);
  });

  it('must not have completion of non-state', function (t) {
    return t.throws(function () {

      var machine = new jssm.Machine({
        initial_state: 'moot',
        transitions: [{ name: 'id1', from: '1', to: '2', action: 'identical' }]
      });

      machine.is_complete('no such state');
    }, Error);
  });

  it('internal state helper must not accept double states', function (t) {
    return t.throws(function () {

      var machine = new jssm.Machine({
        initial_state: 'moot',
        transitions: [{ name: 'id1', from: '1', to: '2', action: 'identical' }]
      });

      machine._new_state({ from: '1', name: 'id1', to: '2', complete: false });
      machine._new_state({ from: '1', name: 'id1', to: '2', complete: false });
    }, Error);
  });

  it('can\'t get actions of non-state', function (t) {
    return t.throws(function () {

      var machine = new jssm.Machine({
        initial_state: '1',
        transitions: [{ name: 'id1', from: '1', to: '2', action: 'identical' }]
      });

      machine.actions('three');
    }, Error);
  });

  it('can\'t get states having non-action', function (t) {
    return t.throws(function () {

      var machine = new jssm.Machine({
        initial_state: '1',
        transitions: [{ name: 'id1', from: '1', to: '2', action: 'identical' }]
      });

      machine.list_states_having_action('no such action');
    }, Error);
  });

  it('can\'t list exit states of non-action', function (t) {
    return t.throws(function () {

      var machine = new jssm.Machine({
        initial_state: '1',
        transitions: [{ name: 'id1', from: '1', to: '2', action: 'identical' }]
      });

      machine.list_exit_actions('no such action');
    }, Error);
  });

  it('probable exits for throws on non-state', function (t) {
    return t.throws(function () {

      var machine = new jssm.Machine({
        initial_state: '1',
        transitions: [{ name: 'id1', from: '1', to: '2', action: 'identical' }]
      });

      machine.probable_exits_for('3');
    }, Error);
  });

  (0, _avaSpec.test)(function (t) {
    t.pass();
  });

  it('no probable action exits of non-action', function (t) {
    return t.throws(function () {

      var machine = new jssm.Machine({
        initial_state: '1',
        transitions: [{ name: 'id1', from: '1', to: '2', action: 'identical' }]
      });

      machine.probable_action_exits('no such action');
    }, Error);
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9nZW5lcmFsLmpzIl0sIm5hbWVzIjpbImpzc20iLCJyZXF1aXJlIiwidCIsImlzIiwidmVyc2lvbiIsIl9pdCIsIk1hY2hpbmUiLCJpbml0aWFsX3N0YXRlIiwidHJhbnNpdGlvbnMiLCJmcm9tIiwidG8iLCJwcm9iYWJpbGl0eSIsIml0IiwibWFjaGluZSIsImFjdGlvbiIsImxpc3RfZXhpdF9hY3Rpb25zIiwiQXJyYXkiLCJpc0FycmF5IiwicHJvYmFibGVfZXhpdHNfZm9yIiwibGVuZ3RoIiwicHJvYmFibGVfYWN0aW9uX2V4aXRzIiwicHJvYmFiaWxpc3RpY190cmFuc2l0aW9uIiwic3RhdGUiLCJwcm9iYWJpbGlzdGljX3dhbGsiLCJoaXN0byIsInByb2JhYmlsaXN0aWNfaGlzdG9fd2FsayIsIk1hcCIsImdldCIsImNvbXBsZXRlIiwic3RhdGVfaXNfZmluYWwiLCJpbml0X2ZpbmFsIiwiaXNfZmluYWwiLCJ0cmFuc2l0aW9uIiwiZmluX2ZpbmFsIiwibmFtZSIsInN0YXRlX2lzX3Rlcm1pbmFsIiwiZmlyc3QiLCJpc190ZXJtaW5hbCIsInNlY29uZCIsInRlcm1zIiwiaGFzX3Rlcm1pbmFscyIsInN0YXRlX2lzX2NvbXBsZXRlIiwiaXNfY29tcGxldGUiLCJoYXNfY29tcGxldGVzIiwiYSIsImxpc3RfYWN0aW9ucyIsImN1cnJlbnRfYWN0aW9uX2ZvciIsImFjdGlvbnMiLCJsaXN0X3N0YXRlc19oYXZpbmdfYWN0aW9uIiwiaXNfdW5lbnRlcmFibGUiLCJoYXNfdW5lbnRlcmFibGVzIiwiY3VycmVudF9hY3Rpb25fZWRnZV9mb3IiLCJ0aHJvd3MiLCJzdGF0ZV9mb3IiLCJtYWNoaW5lX3N0YXRlIiwibGlzdF90cmFuc2l0aW9ucyIsImVudHJhbmNlcyIsImV4aXRzIiwibGlzdF9lbnRyYW5jZXMiLCJsaXN0X2V4aXRzIiwibGlzdF9lZGdlcyIsImdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzIiwidW5kZWZp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QVIsQ0FBOEIsZ0JBQTlCO0FBRUQsS0FYaUQsRUFXL0MyQyxLQVgrQyxDQUFMO0FBQUEsR0FBN0M7QUFhRCxDQXZLRCIsImZpbGUiOiJnZW5lcmFsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5cbmltcG9ydCB7dGVzdCwgZGVzY3JpYmV9IGZyb20gJ2F2YS1zcGVjJztcblxuY29uc3QganNzbSA9IHJlcXVpcmUoJy4uLy4uLy4uL2J1aWxkL2pzc20uZXM1LmpzJyk7XG5cblxuXG5cblxudGVzdCgnYnVpbGQtc2V0IHZlcnNpb24gbnVtYmVyIGlzIHByZXNlbnQnLCB0ID0+IHQuaXModHlwZW9mIGpzc20udmVyc2lvbiwgJ3N0cmluZycpKTtcblxuXG5cblxuXG5kZXNjcmliZSgnU3RvY2hhc3RpYyB3ZWF0aGVyJywgYXN5bmMgX2l0ID0+IHtcblxuICBuZXcganNzbS5NYWNoaW5lKHtcblxuICAgIGluaXRpYWxfc3RhdGU6ICdicmVlenknLFxuXG4gICAgdHJhbnNpdGlvbnM6IFtcblxuICAgICAgeyBmcm9tOiAnYnJlZXp5JywgIHRvOiAnYnJlZXp5JywgIHByb2JhYmlsaXR5OiAwLjQgIH0sXG4gICAgICB7IGZyb206ICdicmVlenknLCAgdG86ICdzdW5ueScsICAgcHJvYmFiaWxpdHk6IDAuMyAgfSxcbiAgICAgIHsgZnJvbTogJ2JyZWV6eScsICB0bzogJ2Nsb3VkeScsICBwcm9iYWJpbGl0eTogMC4xNSB9LFxuICAgICAgeyBmcm9tOiAnYnJlZXp5JywgIHRvOiAnd2luZHknLCAgIHByb2JhYmlsaXR5OiAwLjEgIH0sXG4gICAgICB7IGZyb206ICdicmVlenknLCAgdG86ICdyYWluJywgICAgcHJvYmFiaWxpdHk6IDAuMDUgfSxcblxuICAgICAgeyBmcm9tOiAnc3VubnknLCAgIHRvOiAnc3VubnknLCAgIHByb2JhYmlsaXR5OiAwLjUgIH0sXG4gICAgICB7IGZyb206ICdzdW5ueScsICAgdG86ICdob3QnLCAgICAgcHJvYmFiaWxpdHk6IDAuMTUgfSxcbiAgICAgIHsgZnJvbTogJ3N1bm55JywgICB0bzogJ2JyZWV6eScsICBwcm9iYWJpbGl0eTogMC4xNSB9LFxuICAgICAgeyBmcm9tOiAnc3VubnknLCAgIHRvOiAnY2xvdWR5JywgIHByb2JhYmlsaXR5OiAwLjE1IH0sXG4gICAgICB7IGZyb206ICdzdW5ueScsICAgdG86ICdyYWluJywgICAgcHJvYmFiaWxpdHk6IDAuMDUgfSxcblxuICAgICAgeyBmcm9tOiAnaG90JywgICAgIHRvOiAnaG90JywgICAgIHByb2JhYmlsaXR5OiAwLjc1IH0sXG4gICAgICB7IGZyb206ICdob3QnLCAgICAgdG86ICdicmVlenknLCAgcHJvYmFiaWxpdHk6IDAuMDUgfSxcbiAgICAgIHsgZnJvbTogJ2hvdCcsICAgICB0bzogJ3N1bm55JywgICBwcm9iYWJpbGl0eTogMC4yICB9LFxuXG4gICAgICB7IGZyb206ICdjbG91ZHknLCAgdG86ICdjbG91ZHknLCAgcHJvYmFiaWxpdHk6IDAuNiAgfSxcbiAgICAgIHsgZnJvbTogJ2Nsb3VkeScsICB0bzogJ3N1bm55JywgICBwcm9iYWJpbGl0eTogMC4yICB9LFxuICAgICAgeyBmcm9tOiAnY2xvdWR5JywgIHRvOiAncmFpbicsICAgIHByb2JhYmlsaXR5OiAwLjE1IH0sXG4gICAgICB7IGZyb206ICdjbG91ZHknLCAgdG86ICdicmVlenknLCAgcHJvYmFiaWxpdHk6IDAuMDUgfSxcblxuICAgICAgeyBmcm9tOiAnd2luZHknLCAgIHRvOiAnd2luZHknLCAgIHByb2JhYmlsaXR5OiAwLjMgIH0sXG4gICAgICB7IGZyb206ICd3aW5keScsICAgdG86ICdnYWxlJywgICAgcHJvYmFiaWxpdHk6IDAuMSAgfSxcbiAgICAgIHsgZnJvbTogJ3dpbmR5JywgICB0bzogJ2JyZWV6eScsICBwcm9iYWJpbGl0eTogMC40ICB9LFxuICAgICAgeyBmcm9tOiAnd2luZHknLCAgIHRvOiAncmFpbicsICAgIHByb2JhYmlsaXR5OiAwLjE1IH0sXG4gICAgICB7IGZyb206ICd3aW5keScsICAgdG86ICdzdW5ueScsICAgcHJvYmFiaWxpdHk6IDAuMDUgfSxcblxuICAgICAgeyBmcm9tOiAnZ2FsZScsICAgIHRvOiAnZ2FsZScsICAgIHByb2JhYmlsaXR5OiAwLjY1IH0sXG4gICAgICB7IGZyb206ICdnYWxlJywgICAgdG86ICd3aW5keScsICAgcHJvYmFiaWxpdHk6IDAuMjUgfSxcbiAgICAgIHsgZnJvbTogJ2dhbGUnLCAgICB0bzogJ3RvcnJlbnQnLCBwcm9iYWJpbGl0eTogMC4wNSB9LFxuICAgICAgeyBmcm9tOiAnZ2FsZScsICAgIHRvOiAnaG90JywgICAgIHByb2JhYmlsaXR5OiAwLjA1IH0sXG5cbiAgICAgIHsgZnJvbTogJ3JhaW4nLCAgICB0bzogJ3JhaW4nLCAgICBwcm9iYWJpbGl0eTogMC4zICB9LFxuICAgICAgeyBmcm9tOiAncmFpbicsICAgIHRvOiAndG9ycmVudCcsIHByb2JhYmlsaXR5OiAwLjA1IH0sXG4gICAgICB7IGZyb206ICdyYWluJywgICAgdG86ICd3aW5keScsICAgcHJvYmFiaWxpdHk6IDAuMSAgfSxcbiAgICAgIHsgZnJvbTogJ3JhaW4nLCAgICB0bzogJ2JyZWV6eScsICBwcm9iYWJpbGl0eTogMC4xNSB9LFxuICAgICAgeyBmcm9tOiAncmFpbicsICAgIHRvOiAnc3VubnknLCAgIHByb2JhYmlsaXR5OiAwLjEgIH0sXG4gICAgICB7IGZyb206ICdyYWluJywgICAgdG86ICdjbG91ZHknLCAgcHJvYmFiaWxpdHk6IDAuMyAgfSxcblxuICAgICAgeyBmcm9tOiAndG9ycmVudCcsIHRvOiAndG9ycmVudCcsIHByb2JhYmlsaXR5OiAwLjY1IH0sXG4gICAgICB7IGZyb206ICd0b3JyZW50JywgdG86ICdyYWluJywgICAgcHJvYmFiaWxpdHk6IDAuMjUgfSxcbiAgICAgIHsgZnJvbTogJ3RvcnJlbnQnLCB0bzogJ2Nsb3VkeScsICBwcm9iYWJpbGl0eTogMC4wNSB9LFxuICAgICAgeyBmcm9tOiAndG9ycmVudCcsIHRvOiAnZ2FsZScsICAgIHByb2JhYmlsaXR5OiAwLjA1IH1cblxuICAgIF1cblxuICB9KTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ2xpc3QgZXhpdCBhY3Rpb25zJywgYXN5bmMgaXQgPT4ge1xuXG4gIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICBpbml0aWFsX3N0YXRlOiAnb2ZmJyxcbiAgICB0cmFuc2l0aW9uczpbIHsgZnJvbTonb2ZmJywgdG86J3JlZCcsIGFjdGlvbjonb24nIH0sIHsgZnJvbToncmVkJywgdG86J29mZicsYWN0aW9uOidvZmYnIH0gXVxuICB9KTtcblxuICBpdCgnc2hvd3MgXCJvblwiIGZyb20gb2ZmIGFzIGRlZmF1bHQnLCB0ID0+IHQuaXMoJ29uJywgIG1hY2hpbmUubGlzdF9leGl0X2FjdGlvbnMoKVswXSAgICAgICkgKTtcbiAgaXQoJ3Nob3dzIFwib25cIiBmcm9tIG9mZicsICAgICAgICAgICAgdCA9PiB0LmlzKCdvbicsICBtYWNoaW5lLmxpc3RfZXhpdF9hY3Rpb25zKCdvZmYnKVswXSApICk7XG4gIGl0KCdzaG93cyBcIm9mZlwiIGZyb20gcmVkJywgICAgICAgICAgIHQgPT4gdC5pcygnb2ZmJywgbWFjaGluZS5saXN0X2V4aXRfYWN0aW9ucygncmVkJylbMF0gKSApO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgncHJvYmFibGUgZXhpdHMgZm9yJywgYXN5bmMgaXQgPT4ge1xuXG4gIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICBpbml0aWFsX3N0YXRlOiAnb2ZmJyxcbiAgICB0cmFuc2l0aW9uczpbIHsgZnJvbTonb2ZmJywgdG86J3JlZCcgfSBdXG4gIH0pO1xuXG4gIGl0KCdwcm9iYWJsZSBleGl0cyBhcmUgYW4gYXJyYXknLCAgICAgICB0ID0+IHQuaXModHJ1ZSwgICAgIEFycmF5LmlzQXJyYXkobWFjaGluZS5wcm9iYWJsZV9leGl0c19mb3IoJ29mZicpKSApICk7XG4gIGl0KCdvbmUgcHJvYmFibGUgZXhpdCBpbiBleGFtcGxlJywgICAgICB0ID0+IHQuaXMoMSwgICAgICAgIG1hY2hpbmUucHJvYmFibGVfZXhpdHNfZm9yKCdvZmYnKS5sZW5ndGggICAgICAgICApICk7XG4gIGl0KCdleGl0IGlzIGFuIG9iamVjdCcsICAgICAgICAgICAgICAgICB0ID0+IHQuaXMoJ29iamVjdCcsIHR5cGVvZiBtYWNoaW5lLnByb2JhYmxlX2V4aXRzX2Zvcignb2ZmJylbMF0gICAgICApICk7XG4gIGl0KCdleGl0IDAgaGFzIGEgc3RyaW5nIGZyb20gcHJvcGVydHknLCB0ID0+IHQuaXMoJ3N0cmluZycsIHR5cGVvZiBtYWNoaW5lLnByb2JhYmxlX2V4aXRzX2Zvcignb2ZmJylbMF0uZnJvbSApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdwcm9iYWJsZSBhY3Rpb24gZXhpdHMnLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIGluaXRpYWxfc3RhdGU6ICdvZmYnLFxuICAgIHRyYW5zaXRpb25zOlsgeyBmcm9tOidvZmYnLCB0bzoncmVkJywgYWN0aW9uOidvbicgfSwgeyBmcm9tOidyZWQnLCB0bzonb2ZmJyxhY3Rpb246J29mZicgfSBdXG4gIH0pO1xuXG4gIGl0KCdwcm9iYWJsZSBhY3Rpb24gZXhpdHMgYXJlIGFuIGFycmF5JywgdCA9PiB0LmlzKHRydWUsICBBcnJheS5pc0FycmF5KG1hY2hpbmUucHJvYmFibGVfYWN0aW9uX2V4aXRzKCkpICAgICAgKSApO1xuICBpdCgncHJvYmFibGUgYWN0aW9uIGV4aXQgMSBpcyBvbicsICAgICAgIHQgPT4gdC5pcygnb24nLCAgbWFjaGluZS5wcm9iYWJsZV9hY3Rpb25fZXhpdHMoKVswXS5hY3Rpb24gICAgICAgICAgICkgKTtcblxuICBpdCgncHJvYmFibGUgYWN0aW9uIGV4aXRzIGFyZSBhbiBhcnJheScsIHQgPT4gdC5pcyh0cnVlLCAgQXJyYXkuaXNBcnJheShtYWNoaW5lLnByb2JhYmxlX2FjdGlvbl9leGl0cygnb2ZmJykpICkgKTtcbiAgaXQoJ3Byb2JhYmxlIGFjdGlvbiBleGl0IDEgaXMgb24nLCAgICAgICB0ID0+IHQuaXMoJ29uJywgIG1hY2hpbmUucHJvYmFibGVfYWN0aW9uX2V4aXRzKCdvZmYnKVswXS5hY3Rpb24gICAgICApICk7XG5cbiAgaXQoJ3Byb2JhYmxlIGFjdGlvbiBleGl0cyBhcmUgYW4gYXJyYXknLCB0ID0+IHQuaXModHJ1ZSwgIEFycmF5LmlzQXJyYXkobWFjaGluZS5wcm9iYWJsZV9hY3Rpb25fZXhpdHMoJ3JlZCcpKSApICk7XG4gIGl0KCdwcm9iYWJsZSBhY3Rpb24gZXhpdCAxIGlzIG9uJywgICAgICAgdCA9PiB0LmlzKCdvZmYnLCBtYWNoaW5lLnByb2JhYmxlX2FjdGlvbl9leGl0cygncmVkJylbMF0uYWN0aW9uICAgICAgKSApO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgncHJvYmFiaWxpc3RpY190cmFuc2l0aW9uJywgYXN5bmMgaXQgPT4ge1xuXG4gIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICBpbml0aWFsX3N0YXRlOiAnb2ZmJyxcbiAgICB0cmFuc2l0aW9uczpbIHsgZnJvbTonb2ZmJywgdG86J3JlZCcgfSBdXG4gIH0pO1xuXG4gIG1hY2hpbmUucHJvYmFiaWxpc3RpY190cmFuc2l0aW9uKCk7XG5cbiAgaXQoJ3NvbG8gYWZ0ZXIgcHJvYmFiaWxpc3RpYyBpcyByZWQnLCB0ID0+IHQuaXMoJ3JlZCcsIG1hY2hpbmUuc3RhdGUoKSApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdwcm9iYWJpbGlzdGljX3dhbGsnLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIGluaXRpYWxfc3RhdGU6ICdvZmYnLFxuICAgIHRyYW5zaXRpb25zOlsgeyBmcm9tOidvZmYnLCB0bzoncmVkJyB9LCB7IGZyb206J3JlZCcsIHRvOidvZmYnIH0gXVxuICB9KTtcblxuICBtYWNoaW5lLnByb2JhYmlsaXN0aWNfd2FsaygzKTtcblxuICBpdCgnc29sbyBhZnRlciBwcm9iYWJpbGlzdGljIHdhbGsgMyBpcyByZWQnLCB0ID0+IHQuaXMoJ3JlZCcsIG1hY2hpbmUuc3RhdGUoKSApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdwcm9iYWJpbGlzdGljX2hpc3RvX3dhbGsnLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIGluaXRpYWxfc3RhdGU6ICdvZmYnLFxuICAgIHRyYW5zaXRpb25zOlsgeyBmcm9tOidvZmYnLCB0bzoncmVkJyB9LCB7IGZyb206J3JlZCcsIHRvOidvZmYnIH0gXVxuICB9KTtcblxuICBjb25zdCBoaXN0byA9IG1hY2hpbmUucHJvYmFiaWxpc3RpY19oaXN0b193YWxrKDMpO1xuXG4gIGl0KCdoaXN0byBpcyBhIE1hcCcsIHQgPT4gdC5pcyh0cnVlLCBoaXN0byBpbnN0YW5jZW9mIE1hcCkgKTtcbiAgaXQoJ2hpc3RvIHJlZCBpcyAyJywgdCA9PiB0LmlzKDIsICAgIGhpc3RvLmdldCgncmVkJykpICAgICApO1xuICBpdCgnaGlzdG8gb2ZmIGlzIDInLCB0ID0+IHQuaXMoMiwgICAgaGlzdG8uZ2V0KCdvZmYnKSkgICAgICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdyZXBvcnRzIHN0YXRlX2lzX2ZpbmFsJywgYXN5bmMgaXQgPT4ge1xuXG4gIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICBpbml0aWFsX3N0YXRlOiAnb2ZmJyxcbiAgICB0cmFuc2l0aW9uczpbXG4gICAgICB7IGZyb206J29mZicsIHRvOidyZWQnIH0sXG4gICAgICB7IGZyb206J29mZicsIHRvOidtaWQnIH0sXG4gICAgICB7IGZyb206J21pZCcsIHRvOidmaW4nIH1cbiAgICBdLFxuICAgIGNvbXBsZXRlOlsncmVkJywgJ21pZCddXG4gIH0pO1xuXG4gIGl0KCdmaW5hbCBmYWxzZSBmb3IgbmVpdGhlcicsICAgICAgIHQgPT4gdC5pcyhmYWxzZSwgbWFjaGluZS5zdGF0ZV9pc19maW5hbCgnb2ZmJykgKSApO1xuICBpdCgnZmluYWwgZmFsc2UgZm9yIGp1c3QgdGVybWluYWwnLCB0ID0+IHQuaXMoZmFsc2UsIG1hY2hpbmUuc3RhdGVfaXNfZmluYWwoJ21pZCcpICkgKTtcbiAgaXQoJ2ZpbmFsIGZhbHNlIGZvciBqdXN0IGNvbXBsZXRlJywgdCA9PiB0LmlzKGZhbHNlLCBtYWNoaW5lLnN0YXRlX2lzX2ZpbmFsKCdmaW4nKSApICk7XG4gIGl0KCdmaW5hbCB0cnVlJywgICAgICAgICAgICAgICAgICAgIHQgPT4gdC5pcyh0cnVlLCAgbWFjaGluZS5zdGF0ZV9pc19maW5hbCgncmVkJykgKSApO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgncmVwb3J0cyBpc19maW5hbCcsIGFzeW5jIGl0ID0+IHtcblxuICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgaW5pdGlhbF9zdGF0ZTogJ29mZicsXG4gICAgdHJhbnNpdGlvbnM6W1xuICAgICAgeyBmcm9tOidvZmYnLCB0bzoncmVkJyB9XG4gICAgXSxcbiAgICBjb21wbGV0ZTpbJ3JlZCddXG4gIH0pO1xuXG4gIGNvbnN0IGluaXRfZmluYWwgPSBtYWNoaW5lLmlzX2ZpbmFsKCk7XG4gIG1hY2hpbmUudHJhbnNpdGlvbigncmVkJyk7XG4gIGNvbnN0IGZpbl9maW5hbCAgPSBtYWNoaW5lLmlzX2ZpbmFsKCk7XG5cbiAgaXQoJ2ZpbmFsIGZhbHNlJywgdCA9PiB0LmlzKGZhbHNlLCBpbml0X2ZpbmFsICkgKTtcbiAgaXQoJ2ZpbmFsIHRydWUnLCAgdCA9PiB0LmlzKHRydWUsICBmaW5fZmluYWwgICkgKTtcblxuICAvKiB0b2RvIHdoYXJnYXJibCBuZWVkcyBhbm90aGVyIHR3byB0ZXN0cyBmb3IgaXNfY2hhbmdpbmcgb25jZSByZWludHJvZHVjZWQgKi9cblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ3JlcG9ydHMgc3RhdGVfaXNfdGVybWluYWwnLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIGluaXRpYWxfc3RhdGU6ICdvZmYnLFxuICAgIHRyYW5zaXRpb25zOlsgeyBuYW1lOid0dXJuX29uJywgYWN0aW9uOidwb3dlcl9vbicsIGZyb206J29mZicsIHRvOidyZWQnfSBdXG4gIH0pO1xuXG4gIGl0KCd0ZXJtaW5hbCBmYWxzZScsIHQgPT4gdC5pcyhmYWxzZSwgbWFjaGluZS5zdGF0ZV9pc190ZXJtaW5hbCgnb2ZmJykgKSApO1xuICBpdCgndGVybWluYWwgdHJ1ZScsICB0ID0+IHQuaXModHJ1ZSwgIG1hY2hpbmUuc3RhdGVfaXNfdGVybWluYWwoJ3JlZCcpICkgKTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ3JlcG9ydHMgaXNfdGVybWluYWwnLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIGluaXRpYWxfc3RhdGU6ICdvZmYnLFxuICAgIHRyYW5zaXRpb25zOlsgeyBuYW1lOid0dXJuX29uJywgYWN0aW9uOidwb3dlcl9vbicsIGZyb206J29mZicsIHRvOidyZWQnfSBdXG4gIH0pO1xuXG4gIGNvbnN0IGZpcnN0ICA9IG1hY2hpbmUuaXNfdGVybWluYWwoKTtcbiAgbWFjaGluZS50cmFuc2l0aW9uKCdyZWQnKTtcbiAgY29uc3Qgc2Vjb25kID0gbWFjaGluZS5pc190ZXJtaW5hbCgpO1xuXG4gIGNvbnN0IHRlcm1zICA9IG1hY2hpbmUuaGFzX3Rlcm1pbmFscygpO1xuXG4gIGl0KCd0ZXJtaW5hbCBmYWxzZScsIHQgPT4gdC5pcyggZmFsc2UsIGZpcnN0ICApICk7XG4gIGl0KCd0ZXJtaW5hbCB0cnVlJywgIHQgPT4gdC5pcyggdHJ1ZSwgIHNlY29uZCApICk7XG4gIGl0KCdoYXNfdGVybWluYWxzJywgIHQgPT4gdC5pcyggdHJ1ZSwgIHRlcm1zICApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdyZXBvcnRzIHN0YXRlX2lzX2NvbXBsZXRlJywgYXN5bmMgaXQgPT4ge1xuXG4gIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICBpbml0aWFsX3N0YXRlOiAnb2ZmJyxcbiAgICB0cmFuc2l0aW9uczpbIHsgbmFtZTondHVybl9vbicsIGFjdGlvbjoncG93ZXJfb24nLCBmcm9tOidvZmYnLCB0bzoncmVkJ30gXSxcbiAgICBjb21wbGV0ZTpbJ29mZiddIC8vIGh1aHVcbiAgfSk7XG5cbiAgaXQoJ3N0YXRlX2lzX2NvbXBsZXRlIGZhbHNlJywgdCA9PiB0LmlzKCB0cnVlLCAgbWFjaGluZS5zdGF0ZV9pc19jb21wbGV0ZSgnb2ZmJykgKSApO1xuICBpdCgnc3RhdGVfaXNfY29tcGxldGUgdHJ1ZScsICB0ID0+IHQuaXMoIGZhbHNlLCBtYWNoaW5lLnN0YXRlX2lzX2NvbXBsZXRlKCdyZWQnKSApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdyZXBvcnRzIGlzX2NvbXBsZXRlJywgYXN5bmMgaXQgPT4ge1xuXG4gIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICBpbml0aWFsX3N0YXRlOiAnb2ZmJyxcbiAgICB0cmFuc2l0aW9uczpbIHsgbmFtZTondHVybl9vbicsIGFjdGlvbjoncG93ZXJfb24nLCBmcm9tOidvZmYnLCB0bzoncmVkJ30gXSxcbiAgICBjb21wbGV0ZTpbJ29mZiddIC8vIGh1aHVcbiAgfSk7XG5cbiAgY29uc3QgZmlyc3QgID0gbWFjaGluZS5pc19jb21wbGV0ZSgpO1xuICBtYWNoaW5lLnRyYW5zaXRpb24oJ3JlZCcpO1xuICBjb25zdCBzZWNvbmQgPSBtYWNoaW5lLmlzX2NvbXBsZXRlKCk7XG5cbiAgY29uc3QgdGVybXMgID0gbWFjaGluZS5oYXNfY29tcGxldGVzKCk7XG5cbiAgaXQoJ2lzX2NvbXBsZXRlIGZhbHNlJywgdCA9PiB0LmlzKCB0cnVlLCAgZmlyc3QgICkgKTtcbiAgaXQoJ2lzX2NvbXBsZXRlIHRydWUnLCAgdCA9PiB0LmlzKCBmYWxzZSwgc2Vjb25kICkgKTtcbiAgaXQoJ2hhc19jb21wbGV0ZXMnLCAgICAgdCA9PiB0LmlzKCB0cnVlLCAgdGVybXMgICkgKTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ3JlcG9ydHMgb24gYWN0aW9ucycsIGFzeW5jIGl0ID0+IHtcblxuICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgaW5pdGlhbF9zdGF0ZTogJ29mZicsXG4gICAgdHJhbnNpdGlvbnM6WyB7IG5hbWU6J3R1cm5fb24nLCBhY3Rpb246J3Bvd2VyX29uJywgZnJvbTonb2ZmJywgdG86J3JlZCd9IF1cbiAgfSk7XG5cbiAgY29uc3QgYSA9IG1hY2hpbmUubGlzdF9hY3Rpb25zKCk7ICAvLyB0b2RvIGNvbWViYWNrXG5cbiAgaXQoJ3RoYXQgaXQgaGFzJywgICAgICAgICAgIHQgPT4gdC5pcygnbnVtYmVyJywgICAgdHlwZW9mIG1hY2hpbmUuY3VycmVudF9hY3Rpb25fZm9yKCdwb3dlcl9vbicpICAgKSApO1xuICBpdCgndGhhdCBpdCBkb2VzblxcJ3QgaGF2ZScsIHQgPT4gdC5pcygndW5kZWZpbmVkJywgdHlwZW9mIG1hY2hpbmUuY3VycmVudF9hY3Rpb25fZm9yKCdwb3dlcl9sZWZ0JykgKSApO1xuICBpdCgnY29ycmVjdCBsaXN0IHR5cGUnLCAgICAgdCA9PiB0LmlzKHRydWUsICAgICAgICBBcnJheS5pc0FycmF5KGEpICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApICk7XG4gIGl0KCdjb3JyZWN0IGxpc3Qgc2l6ZScsICAgICB0ID0+IHQuaXMoMSwgICAgICAgICAgIGEubGVuZ3RoICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkgKTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ2FjdGlvbnMnLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIGluaXRpYWxfc3RhdGU6ICdvZmYnLFxuICAgIHRyYW5zaXRpb25zOlsgeyBmcm9tOidvZmYnLCB0bzoncmVkJywgYWN0aW9uOidvbicgfSwgeyBmcm9tOidyZWQnLCB0bzonb2ZmJyxhY3Rpb246J29mZicgfSBdXG4gIH0pO1xuXG4gIGl0KCdyZWQgaGFzIGFjdGlvbnMoKS5sZW5ndGggMScsIHQgPT4gdC5pcygxLCAgICAgbWFjaGluZS5hY3Rpb25zKCkubGVuZ3RoICAgICAgKSApO1xuICBpdCgncmVkIGhhcyBhY3Rpb25zKClbMF0gXCJvblwiJywgIHQgPT4gdC5pcygnb24nLCAgbWFjaGluZS5hY3Rpb25zKClbMF0gICAgICAgICAgKSApO1xuXG4gIGl0KCdyZWQgaGFzIGFjdGlvbnMoKS5sZW5ndGggMScsIHQgPT4gdC5pcygxLCAgICAgbWFjaGluZS5hY3Rpb25zKCdvZmYnKS5sZW5ndGggKSApO1xuICBpdCgncmVkIGhhcyBhY3Rpb25zKClbMF0gXCJvblwiJywgIHQgPT4gdC5pcygnb24nLCAgbWFjaGluZS5hY3Rpb25zKCdvZmYnKVswXSAgICAgKSApO1xuXG4gIGl0KCdyZWQgaGFzIGFjdGlvbnMoKS5sZW5ndGggMScsIHQgPT4gdC5pcygxLCAgICAgbWFjaGluZS5hY3Rpb25zKCdyZWQnKS5sZW5ndGggKSApO1xuICBpdCgncmVkIGhhcyBhY3Rpb25zKClbMF0gXCJvZmZcIicsIHQgPT4gdC5pcygnb2ZmJywgbWFjaGluZS5hY3Rpb25zKCdyZWQnKVswXSAgICAgKSApO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgnc3RhdGVzIGhhdmluZyBhY3Rpb24nLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIGluaXRpYWxfc3RhdGU6ICdvZmYnLFxuICAgIHRyYW5zaXRpb25zOlsgeyBmcm9tOidvZmYnLCB0bzoncmVkJywgYWN0aW9uOidvbicgfSwgeyBmcm9tOidyZWQnLCB0bzonb2ZmJyxhY3Rpb246J29mZicgfSBdXG4gIH0pO1xuXG4gIGl0KCdvbmUgYWN0aW9uIGhhcyBvbicsIHQgPT4gdC5pcygxLCAgICAgbWFjaGluZS5saXN0X3N0YXRlc19oYXZpbmdfYWN0aW9uKCdvbicpLmxlbmd0aCApICk7XG4gIGl0KCdvbiBpcyBoYWQgYnkgb2ZmJywgIHQgPT4gdC5pcygnb2ZmJywgbWFjaGluZS5saXN0X3N0YXRlc19oYXZpbmdfYWN0aW9uKCdvbicpWzBdICAgICApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCd1bmVudGVyYWJsZXMnLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIGluaXRpYWxfc3RhdGU6ICdvZmYnLFxuICAgIHRyYW5zaXRpb25zOlsgeyBuYW1lOid0dXJuX29uJywgYWN0aW9uOidwb3dlcl9vbicsIGZyb206J29mZicsIHRvOidyZWQnfSBdXG4gIH0pO1xuXG4gIGl0KCdvZmYgaXNuXFwndCBlbnRlcmFibGUnLCAgICAgdCA9PiB0LmlzKHRydWUsICBtYWNoaW5lLmlzX3VuZW50ZXJhYmxlKCdvZmYnKSApICk7XG4gIGl0KCdyZWQgaXMgZW50ZXJhYmxlJywgICAgICAgICB0ID0+IHQuaXMoZmFsc2UsIG1hY2hpbmUuaXNfdW5lbnRlcmFibGUoJ3JlZCcpICkgKTtcbiAgaXQoJ21hY2hpbmUgaGFzIHVuZW50ZXJhYmxlcycsIHQgPT4gdC5pcyh0cnVlLCAgbWFjaGluZS5oYXNfdW5lbnRlcmFibGVzKCkgICAgKSApO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgncmVwb3J0cyBvbiBhY3Rpb24gZWRnZXMnLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIGluaXRpYWxfc3RhdGU6ICdvZmYnLFxuICAgIHRyYW5zaXRpb25zOlsgeyBuYW1lOid0dXJuX29uJywgYWN0aW9uOidwb3dlcl9vbicsIGZyb206J29mZicsIHRvOidyZWQnfSBdXG4gIH0pO1xuXG4gIGl0KCd0aGF0IGl0IGhhcycsICAgICAgICAgICB0ID0+IHQuaXMoJ29iamVjdCcsIHR5cGVvZiBtYWNoaW5lLmN1cnJlbnRfYWN0aW9uX2VkZ2VfZm9yKCdwb3dlcl9vbicpKSApO1xuICBpdCgndGhhdCBpdCBkb2VzblxcJ3QgaGF2ZScsIHQgPT4gdC50aHJvd3MoKCkgPT4geyBtYWNoaW5lLmN1cnJlbnRfYWN0aW9uX2VkZ2VfZm9yKCdwb3dlcl93ZXN0Jyk7IH0pICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdyZXBvcnRzIG9uIHN0YXRlcycsIGFzeW5jIGl0ID0+IHtcblxuICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgaW5pdGlhbF9zdGF0ZTogJ29mZicsXG4gICAgdHJhbnNpdGlvbnM6WyB7IG5hbWU6J3R1cm5fb24nLCBhY3Rpb246J3Bvd2VyX29uJywgZnJvbTonb2ZmJywgdG86J3JlZCd9IF1cbiAgfSk7XG5cbiAgaXQoJ3RoYXQgaXQgaGFzJywgdCA9PiB0LmlzKCdvYmplY3QnLCB0eXBlb2YgbWFjaGluZS5zdGF0ZV9mb3IoJ29mZicpICkgKTtcblxuICBpdCgndGhhdCBpdCBkb2VzblxcJ3QgaGF2ZScsIHQgPT4gdC50aHJvd3MoKCkgPT4geyBtYWNoaW5lLnN0YXRlX2Zvcignbm8gc3VjaCBzdGF0ZScpOyB9KSApO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgncmV0dXJucyBzdGF0ZXMnLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIGluaXRpYWxfc3RhdGU6ICdvZmYnLFxuICAgIHRyYW5zaXRpb25zOlsgeyBuYW1lOid0dXJuX29uJywgYWN0aW9uOidwb3dlcl9vbicsIGZyb206J29mZicsIHRvOidyZWQnfSBdXG4gIH0pO1xuXG4gIGl0KCd0aGF0IGl0IGhhcycsIHQgPT4gdC5pcygnb2JqZWN0JywgdHlwZW9mIG1hY2hpbmUubWFjaGluZV9zdGF0ZSgpICkgKTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ3JlcG9ydHMgb24gdHJhbnNpdGlvbnMnLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIGluaXRpYWxfc3RhdGU6ICdvZmYnLFxuICAgIHRyYW5zaXRpb25zOlsgeyBuYW1lOid0dXJuX29uJywgYWN0aW9uOidwb3dlcl9vbicsIGZyb206J29mZicsIHRvOidyZWQnfSBdXG4gIH0pO1xuXG5cbiAgaXQoJ3Vuc3BlY2lmaWVkIHRyYW5zaXRpb24gcmV0dXJuIHR5cGUnLCAgICAgICAgICAgIHQgPT4gdC5pcygnb2JqZWN0JywgdHlwZW9mIG1hY2hpbmUubGlzdF90cmFuc2l0aW9ucygpICAgICAgICAgICAgICAgICApICk7XG4gIGl0KCd1bnNwZWNpZmllZCB0cmFuc2l0aW9uIGNvcnJlY3QgZW50cmFuY2UgY291bnQnLCB0ID0+IHQuaXMoMCwgICAgICAgIG1hY2hpbmUubGlzdF90cmFuc2l0aW9ucygpLmVudHJhbmNlcy5sZW5ndGggICAgICAgKSApO1xuICBpdCgndW5zcGVjaWZpZWQgdHJhbnNpdGlvbiBjb3JyZWN0IGV4aXQgY291bnQnLCAgICAgdCA9PiB0LmlzKDEsICAgICAgICBtYWNoaW5lLmxpc3RfdHJhbnNpdGlvbnMoKS5leGl0cy5sZW5ndGggICAgICAgICAgICkgKTtcblxuICBpdCgnc3BlY2lmaWVkIHRyYW5zaXRpb24gcmV0dXJuIHR5cGUnLCAgICAgICAgICAgICAgdCA9PiB0LmlzKCdvYmplY3QnLCB0eXBlb2YgbWFjaGluZS5saXN0X3RyYW5zaXRpb25zKCdvZmYnKSAgICAgICAgICAgICkgKTtcbiAgaXQoJ3NwZWNpZmllZCB0cmFuc2l0aW9uIGNvcnJlY3QgZW50cmFuY2UgY291bnQnLCAgIHQgPT4gdC5pcygwLCAgICAgICAgbWFjaGluZS5saXN0X3RyYW5zaXRpb25zKCdvZmYnKS5lbnRyYW5jZXMubGVuZ3RoICApICk7XG4gIGl0KCdzcGVjaWZpZWQgdHJhbnNpdGlvbiBjb3JyZWN0IGV4aXQgY291bnQnLCAgICAgICB0ID0+IHQuaXMoMSwgICAgICAgIG1hY2hpbmUubGlzdF90cmFuc2l0aW9ucygnb2ZmJykuZXhpdHMubGVuZ3RoICAgICAgKSApO1xuXG4gIGl0KCdubyBzdWNoIHNwZWMgdHJhbnMgcmV0dXJuIHR5cGUnLCAgICAgICAgICAgICAgICB0ID0+IHQuaXMoJ29iamVjdCcsIHR5cGVvZiBtYWNoaW5lLmxpc3RfdHJhbnNpdGlvbnMoJ21vb3QnKSAgICAgICAgICAgKSApO1xuICBpdCgnbm8gc3VjaCBzcGVjIHRyYW5zIGNvcnJlY3QgZW50cmFuY2UgY291bnQnLCAgICAgdCA9PiB0LmlzKDAsICAgICAgICBtYWNoaW5lLmxpc3RfdHJhbnNpdGlvbnMoJ21vb3QnKS5lbnRyYW5jZXMubGVuZ3RoICkgKTtcbiAgaXQoJ25vIHN1Y2ggc3BlYyB0cmFucyBjb3JyZWN0IGV4aXQgY291bnQnLCAgICAgICAgIHQgPT4gdC5pcygwLCAgICAgICAgbWFjaGluZS5saXN0X3RyYW5zaXRpb25zKCdtb290JykuZXhpdHMubGVuZ3RoICAgICApICk7XG5cblxuICBpdCgndW5zcGVjaWZpZWQgZW50cmFuY2UgcmV0dXJuIHR5cGUnLCAgICAgICAgICAgICAgdCA9PiB0LmlzKHRydWUsICAgICBBcnJheS5pc0FycmF5KCBtYWNoaW5lLmxpc3RfZW50cmFuY2VzKCkgKSAgICAgICAgKSApO1xuICBpdCgndW5zcGVjaWZpZWQgZW50cmFuY2UgY29ycmVjdCBjb3VudCcsICAgICAgICAgICAgdCA9PiB0LmlzKDAsICAgICAgICBtYWNoaW5lLmxpc3RfZW50cmFuY2VzKCkubGVuZ3RoICAgICAgICAgICAgICAgICAgKSApO1xuXG4gIGl0KCdzcGVjaWZpZWQgZW50cmFuY2UgcmV0dXJuIHR5cGUnLCAgICAgICAgICAgICAgICB0ID0+IHQuaXModHJ1ZSwgICAgIEFycmF5LmlzQXJyYXkoIG1hY2hpbmUubGlzdF9lbnRyYW5jZXMoJ29mZicpICkgICApICk7XG4gIGl0KCdzcGVjaWZpZWQgZW50cmFuY2UgY29ycmVjdCBjb3VudCcsICAgICAgICAgICAgICB0ID0+IHQuaXMoMCwgICAgICAgIG1hY2hpbmUubGlzdF9lbnRyYW5jZXMoJ29mZicpLmxlbmd0aCAgICAgICAgICAgICApICk7XG5cbiAgaXQoJ25vIHN1Y2ggc3BlY2lmaWVkIGVudHJhbmNlIHJldHVybiB0eXBlJywgICAgICAgIHQgPT4gdC5pcyh0cnVlLCAgICAgQXJyYXkuaXNBcnJheSggbWFjaGluZS5saXN0X2VudHJhbmNlcygnbW9vdCcpICkgICkgKTsgLy8gdG9kbyB3aGFyZ2FyYmwgc2hvdWxkIHRoZXNlIHRocm93P1xuICBpdCgnbm8gc3VjaCBzcGVjaWZpZWQgZW50cmFuY2UgY29ycmVjdCBjb3VudCcsICAgICAgdCA9PiB0LmlzKDAsICAgICAgICBtYWNoaW5lLmxpc3RfZW50cmFuY2VzKCdtb290JykubGVuZ3RoICAgICAgICAgICAgKSApO1xuXG5cbiAgaXQoJ3Vuc3BlY2lmaWVkIGV4aXQgcmV0dXJuIHR5cGUnLCAgICAgICAgICAgICAgICAgIHQgPT4gdC5pcyh0cnVlLCAgICAgQXJyYXkuaXNBcnJheSggbWFjaGluZS5saXN0X2V4aXRzKCkgKSAgICAgICAgICAgICkgKTtcbiAgaXQoJ3Vuc3BlY2lmaWVkIGV4aXQgY29ycmVjdCBjb3VudCcsICAgICAgICAgICAgICAgIHQgPT4gdC5pcygxLCAgICAgICAgbWFjaGluZS5saXN0X2V4aXRzKCkubGVuZ3RoICAgICAgICAgICAgICAgICAgICAgICkgKTtcblxuICBpdCgnc3BlY2lmaWVkIGV4aXQgcmV0dXJuIHR5cGUnLCAgICAgICAgICAgICAgICAgICAgdCA9PiB0LmlzKHRydWUsICAgICBBcnJheS5pc0FycmF5KCBtYWNoaW5lLmxpc3RfZXhpdHMoJ29mZicpICkgICAgICAgKSApO1xuICBpdCgnc3BlY2lmaWVkIGV4aXQgY29ycmVjdCBjb3VudCcsICAgICAgICAgICAgICAgICAgdCA9PiB0LmlzKDEsICAgICAgICBtYWNoaW5lLmxpc3RfZXhpdHMoJ29mZicpLmxlbmd0aCAgICAgICAgICAgICAgICAgKSApO1xuXG4gIGl0KCdubyBzdWNoIHNwZWNpZmllZCBleGl0IHJldHVybiB0eXBlJywgICAgICAgICAgICB0ID0+IHQuaXModHJ1ZSwgICAgIEFycmF5LmlzQXJyYXkoIG1hY2hpbmUubGlzdF9leGl0cygnbW9vdCcpICkgICAgICApICk7XG4gIGl0KCdubyBzdWNoIHNwZWNpZmllZCBleGl0IGNvcnJlY3QgY291bnQnLCAgICAgICAgICB0ID0+IHQuaXMoMCwgICAgICAgIG1hY2hpbmUubGlzdF9leGl0cygnbW9vdCcpLmxlbmd0aCAgICAgICAgICAgICAgICApICk7XG5cblxuICBpdCgnZWRnZSBsaXN0IHJldHVybiB0eXBlJywgICAgICAgICAgICAgICAgICAgICAgICAgdCA9PiB0LmlzKHRydWUsICAgICBBcnJheS5pc0FycmF5KCBtYWNoaW5lLmxpc3RfZWRnZXMoKSApICAgICAgICAgICAgKSApO1xuICBpdCgnZWRnZSBsaXN0IGNvcnJlY3QgY291bnQnLCAgICAgICAgICAgICAgICAgICAgICAgdCA9PiB0LmlzKDEsICAgICAgICBtYWNoaW5lLmxpc3RfZWRnZXMoKS5sZW5ndGggICAgICAgICAgICAgICAgICAgICAgKSApO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgndHJhbnNpdGlvbiBieSBzdGF0ZSBuYW1lcycsIGFzeW5jIGl0ID0+IHtcblxuICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgaW5pdGlhbF9zdGF0ZTogJ29mZicsXG4gICAgdHJhbnNpdGlvbnM6WyB7IG5hbWU6J3R1cm5fb24nLCBhY3Rpb246J3Bvd2VyX29uJywgZnJvbTonb2ZmJywgdG86J3JlZCd9IF1cbiAgfSk7XG5cbiAgaXQoJ2ZpbmRzIG9mZiAtPiByZWQnLCAgICAgICAgICB0ID0+IHQuaXMoMCwgICAgICAgICBtYWNoaW5lLmdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzKCdvZmYnLCAncmVkJykgICkgKTtcbiAgaXQoJ2RvZXMgbm90IGZpbmQgb2ZmIC0+IGJsdWUnLCB0ID0+IHQuaXModW5kZWZpbmVkLCBtYWNoaW5lLmdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzKCdvZmYnLCAnYmx1ZScpICkgKTtcbiAgaXQoJ2RvZXMgbm90IGZpbmQgYmx1ZSAtPiByZWQnLCB0ID0+IHQuaXModW5kZWZpbmVkLCBtYWNoaW5lLmdldF90cmFuc2l0aW9uX2J5X3N0YXRlX25hbWVzKCdibHVlJywgJ3JlZCcpICkgKTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ0lsbGVnYWwgbWFjaGluZXMnLCBhc3luYyBpdCA9PiB7XG5cblxuICBpdCgnY2F0Y2ggcmVwZWF0ZWQgbmFtZXMnLCB0ID0+IHQudGhyb3dzKCgpID0+IHtcblxuICAgIG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgICAgaW5pdGlhbF9zdGF0ZTogJ21vb3QnLFxuICAgICAgdHJhbnNpdGlvbnM6W1xuICAgICAgICB7IG5hbWU6J2lkZW50aWNhbCcsIGZyb206JzEnLCB0bzonMicgfSxcbiAgICAgICAgeyBuYW1lOidpZGVudGljYWwnLCBmcm9tOicyJywgdG86JzMnIH1cbiAgICAgIF1cbiAgICB9KTtcblxuICB9LCBFcnJvcikpO1xuXG5cbiAgaXQoJ211c3QgZGVmaW5lIGZyb20nLCB0ID0+IHQudGhyb3dzKCgpID0+IHtcblxuICAgIG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgICAgaW5pdGlhbF9zdGF0ZTogJ21vb3QnLFxuICAgICAgdHJhbnNpdGlvbnM6W1xuICAgICAgICB7IG5hbWU6J2lkZW50aWNhbCcsIHRvOicyJyB9XG4gICAgICBdXG4gICAgfSk7XG5cbiAgfSwgRXJyb3IpKTtcblxuXG4gIGl0KCdtdXN0IGRlZmluZSB0bycsIHQgPT4gdC50aHJvd3MoKCkgPT4ge1xuXG4gICAgbmV3IGpzc20uTWFjaGluZSh7XG4gICAgICBpbml0aWFsX3N0YXRlOiAnbW9vdCcsXG4gICAgICB0cmFuc2l0aW9uczpbXG4gICAgICAgIHsgbmFtZTonaWRlbnRpY2FsJywgZnJvbTonMScgfVxuICAgICAgXVxuICAgIH0pO1xuXG4gIH0sIEVycm9yKSk7XG5cblxuICBpdCgnbXVzdCBub3QgaGF2ZSB0d28gaWRlbnRpY2FsIGVkZ2VzJywgdCA9PiB0LnRocm93cygoKSA9PiB7XG5cbiAgICBuZXcganNzbS5NYWNoaW5lKHtcbiAgICAgIGluaXRpYWxfc3RhdGU6ICdtb290JyxcbiAgICAgIHRyYW5zaXRpb25zOltcbiAgICAgICAgeyBuYW1lOidpZDEnLCBmcm9tOicxJywgdG86JzInIH0sXG4gICAgICAgIHsgbmFtZTonaWQyJywgZnJvbTonMScsIHRvOicyJyB9XG4gICAgICBdXG4gICAgfSk7XG5cbiAgfSwgRXJyb3IpKTtcblxuXG4gIGl0KCdtdXN0IG5vdCBoYXZlIHR3byBvZiB0aGUgc2FtZSBhY3Rpb24gZnJvbSB0aGUgc2FtZSBzb3VyY2UnLCB0ID0+IHQudGhyb3dzKCgpID0+IHtcblxuICAgIG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgICAgaW5pdGlhbF9zdGF0ZTogJ21vb3QnLFxuICAgICAgdHJhbnNpdGlvbnM6W1xuICAgICAgICB7IG5hbWU6J2lkMScsIGZyb206JzEnLCB0bzonMicsIGFjdGlvbjonaWRlbnRpY2FsJyB9LFxuICAgICAgICB7IG5hbWU6J2lkMicsIGZyb206JzEnLCB0bzonMycsIGFjdGlvbjonaWRlbnRpY2FsJyB9XG4gICAgICBdXG4gICAgfSk7XG5cbiAgfSwgRXJyb3IpKTtcblxuXG4gIGl0KCdtdXN0IG5vdCBoYXZlIGNvbXBsZXRpb24gb2Ygbm9uLXN0YXRlJywgdCA9PiB0LnRocm93cygoKSA9PiB7XG5cbiAgICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgICBpbml0aWFsX3N0YXRlOiAnbW9vdCcsXG4gICAgICB0cmFuc2l0aW9uczpbXG4gICAgICAgIHsgbmFtZTonaWQxJywgZnJvbTonMScsIHRvOicyJywgYWN0aW9uOidpZGVudGljYWwnIH1cbiAgICAgIF1cbiAgICB9KTtcblxuICAgIG1hY2hpbmUuaXNfY29tcGxldGUoJ25vIHN1Y2ggc3RhdGUnKTtcblxuICB9LCBFcnJvcikpO1xuXG5cbiAgaXQoJ2ludGVybmFsIHN0YXRlIGhlbHBlciBtdXN0IG5vdCBhY2NlcHQgZG91YmxlIHN0YXRlcycsIHQgPT4gdC50aHJvd3MoKCkgPT4ge1xuXG4gICAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgICAgaW5pdGlhbF9zdGF0ZTogJ21vb3QnLFxuICAgICAgdHJhbnNpdGlvbnM6W1xuICAgICAgICB7IG5hbWU6J2lkMScsIGZyb206JzEnLCB0bzonMicsIGFjdGlvbjonaWRlbnRpY2FsJyB9XG4gICAgICBdXG4gICAgfSk7XG5cbiAgICBtYWNoaW5lLl9uZXdfc3RhdGUoe2Zyb206ICcxJywgbmFtZTonaWQxJywgdG86JzInLCBjb21wbGV0ZTpmYWxzZX0pO1xuICAgIG1hY2hpbmUuX25ld19zdGF0ZSh7ZnJvbTogJzEnLCBuYW1lOidpZDEnLCB0bzonMicsIGNvbXBsZXRlOmZhbHNlfSk7XG5cbiAgfSwgRXJyb3IpKTtcblxuXG4gIGl0KCdjYW5cXCd0IGdldCBhY3Rpb25zIG9mIG5vbi1zdGF0ZScsIHQgPT4gdC50aHJvd3MoKCkgPT4ge1xuXG4gICAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgICAgaW5pdGlhbF9zdGF0ZTogJzEnLFxuICAgICAgdHJhbnNpdGlvbnM6W1xuICAgICAgICB7IG5hbWU6J2lkMScsIGZyb206JzEnLCB0bzonMicsIGFjdGlvbjonaWRlbnRpY2FsJyB9XG4gICAgICBdXG4gICAgfSk7XG5cbiAgICBtYWNoaW5lLmFjdGlvbnMoJ3RocmVlJyk7XG5cbiAgfSwgRXJyb3IpKTtcblxuXG4gIGl0KCdjYW5cXCd0IGdldCBzdGF0ZXMgaGF2aW5nIG5vbi1hY3Rpb24nLCB0ID0+IHQudGhyb3dzKCgpID0+IHtcblxuICAgIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICAgIGluaXRpYWxfc3RhdGU6ICcxJyxcbiAgICAgIHRyYW5zaXRpb25zOltcbiAgICAgICAgeyBuYW1lOidpZDEnLCBmcm9tOicxJywgdG86JzInLCBhY3Rpb246J2lkZW50aWNhbCcgfVxuICAgICAgXVxuICAgIH0pO1xuXG4gICAgbWFjaGluZS5saXN0X3N0YXRlc19oYXZpbmdfYWN0aW9uKCdubyBzdWNoIGFjdGlvbicpO1xuXG4gIH0sIEVycm9yKSk7XG5cblxuICBpdCgnY2FuXFwndCBsaXN0IGV4aXQgc3RhdGVzIG9mIG5vbi1hY3Rpb24nLCB0ID0+IHQudGhyb3dzKCgpID0+IHtcblxuICAgIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICAgIGluaXRpYWxfc3RhdGU6ICcxJyxcbiAgICAgIHRyYW5zaXRpb25zOltcbiAgICAgICAgeyBuYW1lOidpZDEnLCBmcm9tOicxJywgdG86JzInLCBhY3Rpb246J2lkZW50aWNhbCcgfVxuICAgICAgXVxuICAgIH0pO1xuXG4gICAgbWFjaGluZS5saXN0X2V4aXRfYWN0aW9ucygnbm8gc3VjaCBhY3Rpb24nKTtcblxuICB9LCBFcnJvcikpO1xuXG5cbiAgaXQoJ3Byb2JhYmxlIGV4aXRzIGZvciB0aHJvd3Mgb24gbm9uLXN0YXRlJywgdCA9PiB0LnRocm93cygoKSA9PiB7XG5cbiAgICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgICBpbml0aWFsX3N0YXRlOiAnMScsXG4gICAgICB0cmFuc2l0aW9uczpbXG4gICAgICAgIHsgbmFtZTonaWQxJywgZnJvbTonMScsIHRvOicyJywgYWN0aW9uOidpZGVudGljYWwnIH1cbiAgICAgIF1cbiAgICB9KTtcblxuICAgIG1hY2hpbmUucHJvYmFibGVfZXhpdHNfZm9yKCczJyk7XG5cbiAgfSwgRXJyb3IpKTtcblxudGVzdCh0ID0+IHtcbiAgdC5wYXNzKCk7XG59KTtcblxuICBpdCgnbm8gcHJvYmFibGUgYWN0aW9uIGV4aXRzIG9mIG5vbi1hY3Rpb24nLCB0ID0+IHQudGhyb3dzKCgpID0+IHtcblxuICAgIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICAgIGluaXRpYWxfc3RhdGU6ICcxJyxcbiAgICAgIHRyYW5zaXRpb25zOltcbiAgICAgICAgeyBuYW1lOidpZDEnLCBmcm9tOicxJywgdG86JzInLCBhY3Rpb246J2lkZW50aWNhbCcgfVxuICAgICAgXVxuICAgIH0pO1xuXG4gICAgbWFjaGluZS5wcm9iYWJsZV9hY3Rpb25fZXhpdHMoJ25vIHN1Y2ggYWN0aW9uJyk7XG5cbiAgfSwgRXJyb3IpKTtcblxufSk7XG4iXX0=