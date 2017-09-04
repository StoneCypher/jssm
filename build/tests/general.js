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

    start_states: ['breezy'],

    transitions: [{ from: 'breezy', to: 'breezy', probability: 0.4 }, { from: 'breezy', to: 'sunny', probability: 0.3 }, { from: 'breezy', to: 'cloudy', probability: 0.15 }, { from: 'breezy', to: 'windy', probability: 0.1 }, { from: 'breezy', to: 'rain', probability: 0.05 }, { from: 'sunny', to: 'sunny', probability: 0.5 }, { from: 'sunny', to: 'hot', probability: 0.15 }, { from: 'sunny', to: 'breezy', probability: 0.15 }, { from: 'sunny', to: 'cloudy', probability: 0.15 }, { from: 'sunny', to: 'rain', probability: 0.05 }, { from: 'hot', to: 'hot', probability: 0.75 }, { from: 'hot', to: 'breezy', probability: 0.05 }, { from: 'hot', to: 'sunny', probability: 0.2 }, { from: 'cloudy', to: 'cloudy', probability: 0.6 }, { from: 'cloudy', to: 'sunny', probability: 0.2 }, { from: 'cloudy', to: 'rain', probability: 0.15 }, { from: 'cloudy', to: 'breezy', probability: 0.05 }, { from: 'windy', to: 'windy', probability: 0.3 }, { from: 'windy', to: 'gale', probability: 0.1 }, { from: 'windy', to: 'breezy', probability: 0.4 }, { from: 'windy', to: 'rain', probability: 0.15 }, { from: 'windy', to: 'sunny', probability: 0.05 }, { from: 'gale', to: 'gale', probability: 0.65 }, { from: 'gale', to: 'windy', probability: 0.25 }, { from: 'gale', to: 'torrent', probability: 0.05 }, { from: 'gale', to: 'hot', probability: 0.05 }, { from: 'rain', to: 'rain', probability: 0.3 }, { from: 'rain', to: 'torrent', probability: 0.05 }, { from: 'rain', to: 'windy', probability: 0.1 }, { from: 'rain', to: 'breezy', probability: 0.15 }, { from: 'rain', to: 'sunny', probability: 0.1 }, { from: 'rain', to: 'cloudy', probability: 0.3 }, { from: 'torrent', to: 'torrent', probability: 0.65 }, { from: 'torrent', to: 'rain', probability: 0.25 }, { from: 'torrent', to: 'cloudy', probability: 0.05 }, { from: 'torrent', to: 'gale', probability: 0.05 }]

  });
});

(0, _avaSpec.describe)('list exit actions', async function (it) {

  var machine = new jssm.Machine({
    start_states: ['off'],
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
    start_states: ['off'],
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
    start_states: ['off'],
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
    start_states: ['off'],
    transitions: [{ from: 'off', to: 'red' }]
  });

  machine.probabilistic_transition();

  it('solo after probabilistic is red', function (t) {
    return t.is('red', machine.state());
  });
});

(0, _avaSpec.describe)('probabilistic_walk', async function (it) {

  var machine = new jssm.Machine({
    start_states: ['off'],
    transitions: [{ from: 'off', to: 'red' }, { from: 'red', to: 'off' }]
  });

  machine.probabilistic_walk(3);

  it('solo after probabilistic walk 3 is red', function (t) {
    return t.is('red', machine.state());
  });
});

(0, _avaSpec.describe)('probabilistic_histo_walk', async function (it) {

  var machine = new jssm.Machine({
    start_states: ['off'],
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
    start_states: ['off'],
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
    start_states: ['off'],
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
    start_states: ['off'],
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
    start_states: ['off'],
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
    start_states: ['off'],
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
    start_states: ['off'],
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
    start_states: ['off'],
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
    start_states: ['off'],
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
    start_states: ['off'],
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
    start_states: ['off'],
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
    start_states: ['off'],
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
    start_states: ['off'],
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
    start_states: ['off'],
    transitions: [{ name: 'turn_on', action: 'power_on', from: 'off', to: 'red' }]
  });

  it('that it has', function (t) {
    return t.is('object', _typeof(machine.machine_state()));
  });
});

(0, _avaSpec.describe)('reports on transitions', async function (it) {

  var machine = new jssm.Machine({
    start_states: ['off'],
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
    start_states: ['off'],
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
        start_states: ['moot'],
        transitions: [{ name: 'identical', from: '1', to: '2' }, { name: 'identical', from: '2', to: '3' }]
      });
    }, Error);
  });

  it('must define from', function (t) {
    return t.throws(function () {

      new jssm.Machine({
        start_states: ['moot'],
        transitions: [{ name: 'identical', to: '2' }]
      });
    }, Error);
  });

  it('must define to', function (t) {
    return t.throws(function () {

      new jssm.Machine({
        start_states: ['moot'],
        transitions: [{ name: 'identical', from: '1' }]
      });
    }, Error);
  });

  it('must not have two identical edges', function (t) {
    return t.throws(function () {

      new jssm.Machine({
        start_states: ['moot'],
        transitions: [{ name: 'id1', from: '1', to: '2' }, { name: 'id2', from: '1', to: '2' }]
      });
    }, Error);
  });

  it('must not have two of the same action from the same source', function (t) {
    return t.throws(function () {

      new jssm.Machine({
        start_states: ['moot'],
        transitions: [{ name: 'id1', from: '1', to: '2', action: 'identical' }, { name: 'id2', from: '1', to: '3', action: 'identical' }]
      });
    }, Error);
  });

  it('must not have completion of non-state', function (t) {
    return t.throws(function () {

      var machine = new jssm.Machine({
        start_states: ['moot'],
        transitions: [{ name: 'id1', from: '1', to: '2', action: 'identical' }]
      });

      machine.is_complete('no such state');
    }, Error);
  });

  it('internal state helper must not accept double states', function (t) {
    return t.throws(function () {

      var machine = new jssm.Machine({
        start_states: ['moot'],
        transitions: [{ name: 'id1', from: '1', to: '2', action: 'identical' }]
      });

      machine._new_state({ from: '1', name: 'id1', to: '2', complete: false });
      machine._new_state({ from: '1', name: 'id1', to: '2', complete: false });
    }, Error);
  });

  it('can\'t get actions of non-state', function (t) {
    return t.throws(function () {

      var machine = new jssm.Machine({
        start_states: ['1'],
        transitions: [{ name: 'id1', from: '1', to: '2', action: 'identical' }]
      });

      machine.actions('three');
    }, Error);
  });

  it('can\'t get states having non-action', function (t) {
    return t.throws(function () {

      var machine = new jssm.Machine({
        start_states: ['1'],
        transitions: [{ name: 'id1', from: '1', to: '2', action: 'identical' }]
      });

      machine.list_states_having_action('no such action');
    }, Error);
  });

  it('can\'t list exit states of non-action', function (t) {
    return t.throws(function () {

      var machine = new jssm.Machine({
        start_states: ['1'],
        transitions: [{ name: 'id1', from: '1', to: '2', action: 'identical' }]
      });

      machine.list_exit_actions('no such action');
    }, Error);
  });

  it('probable exits for throws on non-state', function (t) {
    return t.throws(function () {

      var machine = new jssm.Machine({
        start_states: ['1'],
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
        start_states: ['1'],
        transitions: [{ name: 'id1', from: '1', to: '2', action: 'identical' }]
      });

      machine.probable_action_exits('no such action');
    }, Error);
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9nZW5lcmFsLmpzIl0sIm5hbWVzIjpbImpzc20iLCJyZXF1aXJlIiwidCIsImlzIiwidmVyc2lvbiIsIl9pdCIsIk1hY2hpbmUiLCJzdGFydF9zdGF0ZXMiLCJ0cmFuc2l0aW9ucyIsImZyb20iLCJ0byIsInByb2JhYmlsaXR5IiwiaXQiLCJtYWNoaW5lIiwiYWN0aW9uIiwibGlzdF9leGl0X2FjdGlvbnMiLCJBcnJheSIsImlzQXJyYXkiLCJwcm9iYWJsZV9leGl0c19mb3IiLCJsZW5ndGgiLCJwcm9iYWJsZV9hY3Rpb25fZXhpdHMiLCJwcm9iYWJpbGlzdGljX3RyYW5zaXRpb24iLCJzdGF0ZSIsInByb2JhYmlsaXN0aWNfd2FsayIsImhpc3RvIiwicHJvYmFiaWxpc3RpY19oaXN0b193YWxrIiwiTWFwIiwiZ2V0IiwiY29tcGxldGUiLCJzdGF0ZV9pc19maW5hbCIsImluaXRfZmluYWwiLCJpc19maW5hbCIsInRyYW5zaXRpb24iLCJmaW5fZmluYWwiLCJuYW1lIiwic3RhdGVfaXNfdGVybWluYWwiLCJmaXJzdCIsImlzX3Rlcm1pbmFsIiwic2Vjb25kIiwidGVybXMiLCJoYXNfdGVybWluYWxzIiwic3RhdGVfaXNfY29tcGxldGUiLCJpc19jb21wbGV0ZSIsImhhc19jb21wbGV0ZXMiLCJhIiwibGlzdF9hY3Rpb25zIiwiY3VycmVudF9hY3Rpb25fZm9yIiwiYWN0aW9ucyIsImxpc3Rfc3RhdGVzX2hhdmluZ19hY3Rpb24iLCJpc191bmVudGVyYWJsZSIsImhhc191bmVudGVyYWJsZXMiLCJjdXJyZW50X2FjdGlvbl9lZGdlX2ZvciIsInRocm93cyIsInN0YXRlX2ZvciIsIm1hY2hpbmVfc3RhdGUiLCJsaXN0X3RyYW5zaXRpb25zIiwiZW50cmFuY2VzIiwiZXhpdHMiLCJsaXN0X2VudHJhbmNlcyIsImxpc3RfZXhpdHMiLCJsaXN0X2VkZ2VzIiwiZ2V0X3RyYW5zaXRpb25fYnlfc3RhdGVfbmFtZXMiLCJ1bmRlZmlu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S0FYaUQsRUFXL0M2QyxLQVgrQyxDQUFMO0FBQUEsR0FBN0M7O0FBYUYscUJBQUssYUFBSztBQUNSN0QsTUFBRStELElBQUY7QUFDRCxHQUZEOztBQUlFckQsS0FBRyx3Q0FBSCxFQUE2QztBQUFBLFdBQUtWLEVBQUVrRCxNQUFGLENBQVMsWUFBTTs7QUFFL0QsVUFBTXZDLFVBQVUsSUFBSWIsS0FBS00sT0FBVCxDQUFpQjtBQUMvQkMsc0JBQWMsQ0FBQyxHQUFELENBRGlCO0FBRS9CQyxxQkFBWSxDQUNWLEVBQUUwQixNQUFLLEtBQVAsRUFBY3pCLE1BQUssR0FBbkIsRUFBd0JDLElBQUcsR0FBM0IsRUFBZ0NJLFFBQU8sV0FBdkMsRUFEVTtBQUZtQixPQUFqQixDQUFoQjs7QUFPQUQsY0FBUU8scUJBQVIsQ0FBOEIsZ0JBQTlCO0FBRUQsS0FYaUQsRUFXL0MyQyxLQVgrQyxDQUFMO0FBQUEsR0FBN0M7QUFhRCxDQXZLRCIsImZpbGUiOiJnZW5lcmFsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5cbmltcG9ydCB7dGVzdCwgZGVzY3JpYmV9IGZyb20gJ2F2YS1zcGVjJztcblxuY29uc3QganNzbSA9IHJlcXVpcmUoJy4uLy4uLy4uL2J1aWxkL2pzc20uZXM1LmpzJyk7XG5cblxuXG5cblxudGVzdCgnYnVpbGQtc2V0IHZlcnNpb24gbnVtYmVyIGlzIHByZXNlbnQnLCB0ID0+IHQuaXModHlwZW9mIGpzc20udmVyc2lvbiwgJ3N0cmluZycpKTtcblxuXG5cblxuXG5kZXNjcmliZSgnU3RvY2hhc3RpYyB3ZWF0aGVyJywgYXN5bmMgX2l0ID0+IHtcblxuICBuZXcganNzbS5NYWNoaW5lKHtcblxuICAgIHN0YXJ0X3N0YXRlczogWydicmVlenknXSxcblxuICAgIHRyYW5zaXRpb25zOiBbXG5cbiAgICAgIHsgZnJvbTogJ2JyZWV6eScsICB0bzogJ2JyZWV6eScsICBwcm9iYWJpbGl0eTogMC40ICB9LFxuICAgICAgeyBmcm9tOiAnYnJlZXp5JywgIHRvOiAnc3VubnknLCAgIHByb2JhYmlsaXR5OiAwLjMgIH0sXG4gICAgICB7IGZyb206ICdicmVlenknLCAgdG86ICdjbG91ZHknLCAgcHJvYmFiaWxpdHk6IDAuMTUgfSxcbiAgICAgIHsgZnJvbTogJ2JyZWV6eScsICB0bzogJ3dpbmR5JywgICBwcm9iYWJpbGl0eTogMC4xICB9LFxuICAgICAgeyBmcm9tOiAnYnJlZXp5JywgIHRvOiAncmFpbicsICAgIHByb2JhYmlsaXR5OiAwLjA1IH0sXG5cbiAgICAgIHsgZnJvbTogJ3N1bm55JywgICB0bzogJ3N1bm55JywgICBwcm9iYWJpbGl0eTogMC41ICB9LFxuICAgICAgeyBmcm9tOiAnc3VubnknLCAgIHRvOiAnaG90JywgICAgIHByb2JhYmlsaXR5OiAwLjE1IH0sXG4gICAgICB7IGZyb206ICdzdW5ueScsICAgdG86ICdicmVlenknLCAgcHJvYmFiaWxpdHk6IDAuMTUgfSxcbiAgICAgIHsgZnJvbTogJ3N1bm55JywgICB0bzogJ2Nsb3VkeScsICBwcm9iYWJpbGl0eTogMC4xNSB9LFxuICAgICAgeyBmcm9tOiAnc3VubnknLCAgIHRvOiAncmFpbicsICAgIHByb2JhYmlsaXR5OiAwLjA1IH0sXG5cbiAgICAgIHsgZnJvbTogJ2hvdCcsICAgICB0bzogJ2hvdCcsICAgICBwcm9iYWJpbGl0eTogMC43NSB9LFxuICAgICAgeyBmcm9tOiAnaG90JywgICAgIHRvOiAnYnJlZXp5JywgIHByb2JhYmlsaXR5OiAwLjA1IH0sXG4gICAgICB7IGZyb206ICdob3QnLCAgICAgdG86ICdzdW5ueScsICAgcHJvYmFiaWxpdHk6IDAuMiAgfSxcblxuICAgICAgeyBmcm9tOiAnY2xvdWR5JywgIHRvOiAnY2xvdWR5JywgIHByb2JhYmlsaXR5OiAwLjYgIH0sXG4gICAgICB7IGZyb206ICdjbG91ZHknLCAgdG86ICdzdW5ueScsICAgcHJvYmFiaWxpdHk6IDAuMiAgfSxcbiAgICAgIHsgZnJvbTogJ2Nsb3VkeScsICB0bzogJ3JhaW4nLCAgICBwcm9iYWJpbGl0eTogMC4xNSB9LFxuICAgICAgeyBmcm9tOiAnY2xvdWR5JywgIHRvOiAnYnJlZXp5JywgIHByb2JhYmlsaXR5OiAwLjA1IH0sXG5cbiAgICAgIHsgZnJvbTogJ3dpbmR5JywgICB0bzogJ3dpbmR5JywgICBwcm9iYWJpbGl0eTogMC4zICB9LFxuICAgICAgeyBmcm9tOiAnd2luZHknLCAgIHRvOiAnZ2FsZScsICAgIHByb2JhYmlsaXR5OiAwLjEgIH0sXG4gICAgICB7IGZyb206ICd3aW5keScsICAgdG86ICdicmVlenknLCAgcHJvYmFiaWxpdHk6IDAuNCAgfSxcbiAgICAgIHsgZnJvbTogJ3dpbmR5JywgICB0bzogJ3JhaW4nLCAgICBwcm9iYWJpbGl0eTogMC4xNSB9LFxuICAgICAgeyBmcm9tOiAnd2luZHknLCAgIHRvOiAnc3VubnknLCAgIHByb2JhYmlsaXR5OiAwLjA1IH0sXG5cbiAgICAgIHsgZnJvbTogJ2dhbGUnLCAgICB0bzogJ2dhbGUnLCAgICBwcm9iYWJpbGl0eTogMC42NSB9LFxuICAgICAgeyBmcm9tOiAnZ2FsZScsICAgIHRvOiAnd2luZHknLCAgIHByb2JhYmlsaXR5OiAwLjI1IH0sXG4gICAgICB7IGZyb206ICdnYWxlJywgICAgdG86ICd0b3JyZW50JywgcHJvYmFiaWxpdHk6IDAuMDUgfSxcbiAgICAgIHsgZnJvbTogJ2dhbGUnLCAgICB0bzogJ2hvdCcsICAgICBwcm9iYWJpbGl0eTogMC4wNSB9LFxuXG4gICAgICB7IGZyb206ICdyYWluJywgICAgdG86ICdyYWluJywgICAgcHJvYmFiaWxpdHk6IDAuMyAgfSxcbiAgICAgIHsgZnJvbTogJ3JhaW4nLCAgICB0bzogJ3RvcnJlbnQnLCBwcm9iYWJpbGl0eTogMC4wNSB9LFxuICAgICAgeyBmcm9tOiAncmFpbicsICAgIHRvOiAnd2luZHknLCAgIHByb2JhYmlsaXR5OiAwLjEgIH0sXG4gICAgICB7IGZyb206ICdyYWluJywgICAgdG86ICdicmVlenknLCAgcHJvYmFiaWxpdHk6IDAuMTUgfSxcbiAgICAgIHsgZnJvbTogJ3JhaW4nLCAgICB0bzogJ3N1bm55JywgICBwcm9iYWJpbGl0eTogMC4xICB9LFxuICAgICAgeyBmcm9tOiAncmFpbicsICAgIHRvOiAnY2xvdWR5JywgIHByb2JhYmlsaXR5OiAwLjMgIH0sXG5cbiAgICAgIHsgZnJvbTogJ3RvcnJlbnQnLCB0bzogJ3RvcnJlbnQnLCBwcm9iYWJpbGl0eTogMC42NSB9LFxuICAgICAgeyBmcm9tOiAndG9ycmVudCcsIHRvOiAncmFpbicsICAgIHByb2JhYmlsaXR5OiAwLjI1IH0sXG4gICAgICB7IGZyb206ICd0b3JyZW50JywgdG86ICdjbG91ZHknLCAgcHJvYmFiaWxpdHk6IDAuMDUgfSxcbiAgICAgIHsgZnJvbTogJ3RvcnJlbnQnLCB0bzogJ2dhbGUnLCAgICBwcm9iYWJpbGl0eTogMC4wNSB9XG5cbiAgICBdXG5cbiAgfSk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdsaXN0IGV4aXQgYWN0aW9ucycsIGFzeW5jIGl0ID0+IHtcblxuICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgc3RhcnRfc3RhdGVzOiBbJ29mZiddLFxuICAgIHRyYW5zaXRpb25zOlsgeyBmcm9tOidvZmYnLCB0bzoncmVkJywgYWN0aW9uOidvbicgfSwgeyBmcm9tOidyZWQnLCB0bzonb2ZmJyxhY3Rpb246J29mZicgfSBdXG4gIH0pO1xuXG4gIGl0KCdzaG93cyBcIm9uXCIgZnJvbSBvZmYgYXMgZGVmYXVsdCcsIHQgPT4gdC5pcygnb24nLCAgbWFjaGluZS5saXN0X2V4aXRfYWN0aW9ucygpWzBdICAgICAgKSApO1xuICBpdCgnc2hvd3MgXCJvblwiIGZyb20gb2ZmJywgICAgICAgICAgICB0ID0+IHQuaXMoJ29uJywgIG1hY2hpbmUubGlzdF9leGl0X2FjdGlvbnMoJ29mZicpWzBdICkgKTtcbiAgaXQoJ3Nob3dzIFwib2ZmXCIgZnJvbSByZWQnLCAgICAgICAgICAgdCA9PiB0LmlzKCdvZmYnLCBtYWNoaW5lLmxpc3RfZXhpdF9hY3Rpb25zKCdyZWQnKVswXSApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdwcm9iYWJsZSBleGl0cyBmb3InLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIHN0YXJ0X3N0YXRlczogWydvZmYnXSxcbiAgICB0cmFuc2l0aW9uczpbIHsgZnJvbTonb2ZmJywgdG86J3JlZCcgfSBdXG4gIH0pO1xuXG4gIGl0KCdwcm9iYWJsZSBleGl0cyBhcmUgYW4gYXJyYXknLCAgICAgICB0ID0+IHQuaXModHJ1ZSwgICAgIEFycmF5LmlzQXJyYXkobWFjaGluZS5wcm9iYWJsZV9leGl0c19mb3IoJ29mZicpKSApICk7XG4gIGl0KCdvbmUgcHJvYmFibGUgZXhpdCBpbiBleGFtcGxlJywgICAgICB0ID0+IHQuaXMoMSwgICAgICAgIG1hY2hpbmUucHJvYmFibGVfZXhpdHNfZm9yKCdvZmYnKS5sZW5ndGggICAgICAgICApICk7XG4gIGl0KCdleGl0IGlzIGFuIG9iamVjdCcsICAgICAgICAgICAgICAgICB0ID0+IHQuaXMoJ29iamVjdCcsIHR5cGVvZiBtYWNoaW5lLnByb2JhYmxlX2V4aXRzX2Zvcignb2ZmJylbMF0gICAgICApICk7XG4gIGl0KCdleGl0IDAgaGFzIGEgc3RyaW5nIGZyb20gcHJvcGVydHknLCB0ID0+IHQuaXMoJ3N0cmluZycsIHR5cGVvZiBtYWNoaW5lLnByb2JhYmxlX2V4aXRzX2Zvcignb2ZmJylbMF0uZnJvbSApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdwcm9iYWJsZSBhY3Rpb24gZXhpdHMnLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIHN0YXJ0X3N0YXRlczogWydvZmYnXSxcbiAgICB0cmFuc2l0aW9uczpbIHsgZnJvbTonb2ZmJywgdG86J3JlZCcsIGFjdGlvbjonb24nIH0sIHsgZnJvbToncmVkJywgdG86J29mZicsYWN0aW9uOidvZmYnIH0gXVxuICB9KTtcblxuICBpdCgncHJvYmFibGUgYWN0aW9uIGV4aXRzIGFyZSBhbiBhcnJheScsIHQgPT4gdC5pcyh0cnVlLCAgQXJyYXkuaXNBcnJheShtYWNoaW5lLnByb2JhYmxlX2FjdGlvbl9leGl0cygpKSAgICAgICkgKTtcbiAgaXQoJ3Byb2JhYmxlIGFjdGlvbiBleGl0IDEgaXMgb24nLCAgICAgICB0ID0+IHQuaXMoJ29uJywgIG1hY2hpbmUucHJvYmFibGVfYWN0aW9uX2V4aXRzKClbMF0uYWN0aW9uICAgICAgICAgICApICk7XG5cbiAgaXQoJ3Byb2JhYmxlIGFjdGlvbiBleGl0cyBhcmUgYW4gYXJyYXknLCB0ID0+IHQuaXModHJ1ZSwgIEFycmF5LmlzQXJyYXkobWFjaGluZS5wcm9iYWJsZV9hY3Rpb25fZXhpdHMoJ29mZicpKSApICk7XG4gIGl0KCdwcm9iYWJsZSBhY3Rpb24gZXhpdCAxIGlzIG9uJywgICAgICAgdCA9PiB0LmlzKCdvbicsICBtYWNoaW5lLnByb2JhYmxlX2FjdGlvbl9leGl0cygnb2ZmJylbMF0uYWN0aW9uICAgICAgKSApO1xuXG4gIGl0KCdwcm9iYWJsZSBhY3Rpb24gZXhpdHMgYXJlIGFuIGFycmF5JywgdCA9PiB0LmlzKHRydWUsICBBcnJheS5pc0FycmF5KG1hY2hpbmUucHJvYmFibGVfYWN0aW9uX2V4aXRzKCdyZWQnKSkgKSApO1xuICBpdCgncHJvYmFibGUgYWN0aW9uIGV4aXQgMSBpcyBvbicsICAgICAgIHQgPT4gdC5pcygnb2ZmJywgbWFjaGluZS5wcm9iYWJsZV9hY3Rpb25fZXhpdHMoJ3JlZCcpWzBdLmFjdGlvbiAgICAgICkgKTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ3Byb2JhYmlsaXN0aWNfdHJhbnNpdGlvbicsIGFzeW5jIGl0ID0+IHtcblxuICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgc3RhcnRfc3RhdGVzOiBbJ29mZiddLFxuICAgIHRyYW5zaXRpb25zOlsgeyBmcm9tOidvZmYnLCB0bzoncmVkJyB9IF1cbiAgfSk7XG5cbiAgbWFjaGluZS5wcm9iYWJpbGlzdGljX3RyYW5zaXRpb24oKTtcblxuICBpdCgnc29sbyBhZnRlciBwcm9iYWJpbGlzdGljIGlzIHJlZCcsIHQgPT4gdC5pcygncmVkJywgbWFjaGluZS5zdGF0ZSgpICkgKTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ3Byb2JhYmlsaXN0aWNfd2FsaycsIGFzeW5jIGl0ID0+IHtcblxuICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgc3RhcnRfc3RhdGVzOiBbJ29mZiddLFxuICAgIHRyYW5zaXRpb25zOlsgeyBmcm9tOidvZmYnLCB0bzoncmVkJyB9LCB7IGZyb206J3JlZCcsIHRvOidvZmYnIH0gXVxuICB9KTtcblxuICBtYWNoaW5lLnByb2JhYmlsaXN0aWNfd2FsaygzKTtcblxuICBpdCgnc29sbyBhZnRlciBwcm9iYWJpbGlzdGljIHdhbGsgMyBpcyByZWQnLCB0ID0+IHQuaXMoJ3JlZCcsIG1hY2hpbmUuc3RhdGUoKSApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdwcm9iYWJpbGlzdGljX2hpc3RvX3dhbGsnLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIHN0YXJ0X3N0YXRlczogWydvZmYnXSxcbiAgICB0cmFuc2l0aW9uczpbIHsgZnJvbTonb2ZmJywgdG86J3JlZCcgfSwgeyBmcm9tOidyZWQnLCB0bzonb2ZmJyB9IF1cbiAgfSk7XG5cbiAgY29uc3QgaGlzdG8gPSBtYWNoaW5lLnByb2JhYmlsaXN0aWNfaGlzdG9fd2FsaygzKTtcblxuICBpdCgnaGlzdG8gaXMgYSBNYXAnLCB0ID0+IHQuaXModHJ1ZSwgaGlzdG8gaW5zdGFuY2VvZiBNYXApICk7XG4gIGl0KCdoaXN0byByZWQgaXMgMicsIHQgPT4gdC5pcygyLCAgICBoaXN0by5nZXQoJ3JlZCcpKSAgICAgKTtcbiAgaXQoJ2hpc3RvIG9mZiBpcyAyJywgdCA9PiB0LmlzKDIsICAgIGhpc3RvLmdldCgnb2ZmJykpICAgICApO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgncmVwb3J0cyBzdGF0ZV9pc19maW5hbCcsIGFzeW5jIGl0ID0+IHtcblxuICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgc3RhcnRfc3RhdGVzOiBbJ29mZiddLFxuICAgIHRyYW5zaXRpb25zOltcbiAgICAgIHsgZnJvbTonb2ZmJywgdG86J3JlZCcgfSxcbiAgICAgIHsgZnJvbTonb2ZmJywgdG86J21pZCcgfSxcbiAgICAgIHsgZnJvbTonbWlkJywgdG86J2ZpbicgfVxuICAgIF0sXG4gICAgY29tcGxldGU6WydyZWQnLCAnbWlkJ11cbiAgfSk7XG5cbiAgaXQoJ2ZpbmFsIGZhbHNlIGZvciBuZWl0aGVyJywgICAgICAgdCA9PiB0LmlzKGZhbHNlLCBtYWNoaW5lLnN0YXRlX2lzX2ZpbmFsKCdvZmYnKSApICk7XG4gIGl0KCdmaW5hbCBmYWxzZSBmb3IganVzdCB0ZXJtaW5hbCcsIHQgPT4gdC5pcyhmYWxzZSwgbWFjaGluZS5zdGF0ZV9pc19maW5hbCgnbWlkJykgKSApO1xuICBpdCgnZmluYWwgZmFsc2UgZm9yIGp1c3QgY29tcGxldGUnLCB0ID0+IHQuaXMoZmFsc2UsIG1hY2hpbmUuc3RhdGVfaXNfZmluYWwoJ2ZpbicpICkgKTtcbiAgaXQoJ2ZpbmFsIHRydWUnLCAgICAgICAgICAgICAgICAgICAgdCA9PiB0LmlzKHRydWUsICBtYWNoaW5lLnN0YXRlX2lzX2ZpbmFsKCdyZWQnKSApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdyZXBvcnRzIGlzX2ZpbmFsJywgYXN5bmMgaXQgPT4ge1xuXG4gIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICBzdGFydF9zdGF0ZXM6IFsnb2ZmJ10sXG4gICAgdHJhbnNpdGlvbnM6W1xuICAgICAgeyBmcm9tOidvZmYnLCB0bzoncmVkJyB9XG4gICAgXSxcbiAgICBjb21wbGV0ZTpbJ3JlZCddXG4gIH0pO1xuXG4gIGNvbnN0IGluaXRfZmluYWwgPSBtYWNoaW5lLmlzX2ZpbmFsKCk7XG4gIG1hY2hpbmUudHJhbnNpdGlvbigncmVkJyk7XG4gIGNvbnN0IGZpbl9maW5hbCAgPSBtYWNoaW5lLmlzX2ZpbmFsKCk7XG5cbiAgaXQoJ2ZpbmFsIGZhbHNlJywgdCA9PiB0LmlzKGZhbHNlLCBpbml0X2ZpbmFsICkgKTtcbiAgaXQoJ2ZpbmFsIHRydWUnLCAgdCA9PiB0LmlzKHRydWUsICBmaW5fZmluYWwgICkgKTtcblxuICAvKiB0b2RvIHdoYXJnYXJibCBuZWVkcyBhbm90aGVyIHR3byB0ZXN0cyBmb3IgaXNfY2hhbmdpbmcgb25jZSByZWludHJvZHVjZWQgKi9cblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ3JlcG9ydHMgc3RhdGVfaXNfdGVybWluYWwnLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIHN0YXJ0X3N0YXRlczogWydvZmYnXSxcbiAgICB0cmFuc2l0aW9uczpbIHsgbmFtZTondHVybl9vbicsIGFjdGlvbjoncG93ZXJfb24nLCBmcm9tOidvZmYnLCB0bzoncmVkJ30gXVxuICB9KTtcblxuICBpdCgndGVybWluYWwgZmFsc2UnLCB0ID0+IHQuaXMoZmFsc2UsIG1hY2hpbmUuc3RhdGVfaXNfdGVybWluYWwoJ29mZicpICkgKTtcbiAgaXQoJ3Rlcm1pbmFsIHRydWUnLCAgdCA9PiB0LmlzKHRydWUsICBtYWNoaW5lLnN0YXRlX2lzX3Rlcm1pbmFsKCdyZWQnKSApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdyZXBvcnRzIGlzX3Rlcm1pbmFsJywgYXN5bmMgaXQgPT4ge1xuXG4gIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICBzdGFydF9zdGF0ZXM6IFsnb2ZmJ10sXG4gICAgdHJhbnNpdGlvbnM6WyB7IG5hbWU6J3R1cm5fb24nLCBhY3Rpb246J3Bvd2VyX29uJywgZnJvbTonb2ZmJywgdG86J3JlZCd9IF1cbiAgfSk7XG5cbiAgY29uc3QgZmlyc3QgID0gbWFjaGluZS5pc190ZXJtaW5hbCgpO1xuICBtYWNoaW5lLnRyYW5zaXRpb24oJ3JlZCcpO1xuICBjb25zdCBzZWNvbmQgPSBtYWNoaW5lLmlzX3Rlcm1pbmFsKCk7XG5cbiAgY29uc3QgdGVybXMgID0gbWFjaGluZS5oYXNfdGVybWluYWxzKCk7XG5cbiAgaXQoJ3Rlcm1pbmFsIGZhbHNlJywgdCA9PiB0LmlzKCBmYWxzZSwgZmlyc3QgICkgKTtcbiAgaXQoJ3Rlcm1pbmFsIHRydWUnLCAgdCA9PiB0LmlzKCB0cnVlLCAgc2Vjb25kICkgKTtcbiAgaXQoJ2hhc190ZXJtaW5hbHMnLCAgdCA9PiB0LmlzKCB0cnVlLCAgdGVybXMgICkgKTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ3JlcG9ydHMgc3RhdGVfaXNfY29tcGxldGUnLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIHN0YXJ0X3N0YXRlczogWydvZmYnXSxcbiAgICB0cmFuc2l0aW9uczpbIHsgbmFtZTondHVybl9vbicsIGFjdGlvbjoncG93ZXJfb24nLCBmcm9tOidvZmYnLCB0bzoncmVkJ30gXSxcbiAgICBjb21wbGV0ZTpbJ29mZiddIC8vIGh1aHVcbiAgfSk7XG5cbiAgaXQoJ3N0YXRlX2lzX2NvbXBsZXRlIGZhbHNlJywgdCA9PiB0LmlzKCB0cnVlLCAgbWFjaGluZS5zdGF0ZV9pc19jb21wbGV0ZSgnb2ZmJykgKSApO1xuICBpdCgnc3RhdGVfaXNfY29tcGxldGUgdHJ1ZScsICB0ID0+IHQuaXMoIGZhbHNlLCBtYWNoaW5lLnN0YXRlX2lzX2NvbXBsZXRlKCdyZWQnKSApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdyZXBvcnRzIGlzX2NvbXBsZXRlJywgYXN5bmMgaXQgPT4ge1xuXG4gIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICBzdGFydF9zdGF0ZXM6IFsnb2ZmJ10sXG4gICAgdHJhbnNpdGlvbnM6WyB7IG5hbWU6J3R1cm5fb24nLCBhY3Rpb246J3Bvd2VyX29uJywgZnJvbTonb2ZmJywgdG86J3JlZCd9IF0sXG4gICAgY29tcGxldGU6WydvZmYnXSAvLyBodWh1XG4gIH0pO1xuXG4gIGNvbnN0IGZpcnN0ICA9IG1hY2hpbmUuaXNfY29tcGxldGUoKTtcbiAgbWFjaGluZS50cmFuc2l0aW9uKCdyZWQnKTtcbiAgY29uc3Qgc2Vjb25kID0gbWFjaGluZS5pc19jb21wbGV0ZSgpO1xuXG4gIGNvbnN0IHRlcm1zICA9IG1hY2hpbmUuaGFzX2NvbXBsZXRlcygpO1xuXG4gIGl0KCdpc19jb21wbGV0ZSBmYWxzZScsIHQgPT4gdC5pcyggdHJ1ZSwgIGZpcnN0ICApICk7XG4gIGl0KCdpc19jb21wbGV0ZSB0cnVlJywgIHQgPT4gdC5pcyggZmFsc2UsIHNlY29uZCApICk7XG4gIGl0KCdoYXNfY29tcGxldGVzJywgICAgIHQgPT4gdC5pcyggdHJ1ZSwgIHRlcm1zICApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdyZXBvcnRzIG9uIGFjdGlvbnMnLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIHN0YXJ0X3N0YXRlczogWydvZmYnXSxcbiAgICB0cmFuc2l0aW9uczpbIHsgbmFtZTondHVybl9vbicsIGFjdGlvbjoncG93ZXJfb24nLCBmcm9tOidvZmYnLCB0bzoncmVkJ30gXVxuICB9KTtcblxuICBjb25zdCBhID0gbWFjaGluZS5saXN0X2FjdGlvbnMoKTsgIC8vIHRvZG8gY29tZWJhY2tcblxuICBpdCgndGhhdCBpdCBoYXMnLCAgICAgICAgICAgdCA9PiB0LmlzKCdudW1iZXInLCAgICB0eXBlb2YgbWFjaGluZS5jdXJyZW50X2FjdGlvbl9mb3IoJ3Bvd2VyX29uJykgICApICk7XG4gIGl0KCd0aGF0IGl0IGRvZXNuXFwndCBoYXZlJywgdCA9PiB0LmlzKCd1bmRlZmluZWQnLCB0eXBlb2YgbWFjaGluZS5jdXJyZW50X2FjdGlvbl9mb3IoJ3Bvd2VyX2xlZnQnKSApICk7XG4gIGl0KCdjb3JyZWN0IGxpc3QgdHlwZScsICAgICB0ID0+IHQuaXModHJ1ZSwgICAgICAgIEFycmF5LmlzQXJyYXkoYSkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkgKTtcbiAgaXQoJ2NvcnJlY3QgbGlzdCBzaXplJywgICAgIHQgPT4gdC5pcygxLCAgICAgICAgICAgYS5sZW5ndGggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSApO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgnYWN0aW9ucycsIGFzeW5jIGl0ID0+IHtcblxuICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgc3RhcnRfc3RhdGVzOiBbJ29mZiddLFxuICAgIHRyYW5zaXRpb25zOlsgeyBmcm9tOidvZmYnLCB0bzoncmVkJywgYWN0aW9uOidvbicgfSwgeyBmcm9tOidyZWQnLCB0bzonb2ZmJyxhY3Rpb246J29mZicgfSBdXG4gIH0pO1xuXG4gIGl0KCdyZWQgaGFzIGFjdGlvbnMoKS5sZW5ndGggMScsIHQgPT4gdC5pcygxLCAgICAgbWFjaGluZS5hY3Rpb25zKCkubGVuZ3RoICAgICAgKSApO1xuICBpdCgncmVkIGhhcyBhY3Rpb25zKClbMF0gXCJvblwiJywgIHQgPT4gdC5pcygnb24nLCAgbWFjaGluZS5hY3Rpb25zKClbMF0gICAgICAgICAgKSApO1xuXG4gIGl0KCdyZWQgaGFzIGFjdGlvbnMoKS5sZW5ndGggMScsIHQgPT4gdC5pcygxLCAgICAgbWFjaGluZS5hY3Rpb25zKCdvZmYnKS5sZW5ndGggKSApO1xuICBpdCgncmVkIGhhcyBhY3Rpb25zKClbMF0gXCJvblwiJywgIHQgPT4gdC5pcygnb24nLCAgbWFjaGluZS5hY3Rpb25zKCdvZmYnKVswXSAgICAgKSApO1xuXG4gIGl0KCdyZWQgaGFzIGFjdGlvbnMoKS5sZW5ndGggMScsIHQgPT4gdC5pcygxLCAgICAgbWFjaGluZS5hY3Rpb25zKCdyZWQnKS5sZW5ndGggKSApO1xuICBpdCgncmVkIGhhcyBhY3Rpb25zKClbMF0gXCJvZmZcIicsIHQgPT4gdC5pcygnb2ZmJywgbWFjaGluZS5hY3Rpb25zKCdyZWQnKVswXSAgICAgKSApO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgnc3RhdGVzIGhhdmluZyBhY3Rpb24nLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgbWFjaGluZSA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuICAgIHN0YXJ0X3N0YXRlczogWydvZmYnXSxcbiAgICB0cmFuc2l0aW9uczpbIHsgZnJvbTonb2ZmJywgdG86J3JlZCcsIGFjdGlvbjonb24nIH0sIHsgZnJvbToncmVkJywgdG86J29mZicsYWN0aW9uOidvZmYnIH0gXVxuICB9KTtcblxuICBpdCgnb25lIGFjdGlvbiBoYXMgb24nLCB0ID0+IHQuaXMoMSwgICAgIG1hY2hpbmUubGlzdF9zdGF0ZXNfaGF2aW5nX2FjdGlvbignb24nKS5sZW5ndGggKSApO1xuICBpdCgnb24gaXMgaGFkIGJ5IG9mZicsICB0ID0+IHQuaXMoJ29mZicsIG1hY2hpbmUubGlzdF9zdGF0ZXNfaGF2aW5nX2FjdGlvbignb24nKVswXSAgICAgKSApO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgndW5lbnRlcmFibGVzJywgYXN5bmMgaXQgPT4ge1xuXG4gIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICBzdGFydF9zdGF0ZXM6IFsnb2ZmJ10sXG4gICAgdHJhbnNpdGlvbnM6WyB7IG5hbWU6J3R1cm5fb24nLCBhY3Rpb246J3Bvd2VyX29uJywgZnJvbTonb2ZmJywgdG86J3JlZCd9IF1cbiAgfSk7XG5cbiAgaXQoJ29mZiBpc25cXCd0IGVudGVyYWJsZScsICAgICB0ID0+IHQuaXModHJ1ZSwgIG1hY2hpbmUuaXNfdW5lbnRlcmFibGUoJ29mZicpICkgKTtcbiAgaXQoJ3JlZCBpcyBlbnRlcmFibGUnLCAgICAgICAgIHQgPT4gdC5pcyhmYWxzZSwgbWFjaGluZS5pc191bmVudGVyYWJsZSgncmVkJykgKSApO1xuICBpdCgnbWFjaGluZSBoYXMgdW5lbnRlcmFibGVzJywgdCA9PiB0LmlzKHRydWUsICBtYWNoaW5lLmhhc191bmVudGVyYWJsZXMoKSAgICApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdyZXBvcnRzIG9uIGFjdGlvbiBlZGdlcycsIGFzeW5jIGl0ID0+IHtcblxuICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgc3RhcnRfc3RhdGVzOiBbJ29mZiddLFxuICAgIHRyYW5zaXRpb25zOlsgeyBuYW1lOid0dXJuX29uJywgYWN0aW9uOidwb3dlcl9vbicsIGZyb206J29mZicsIHRvOidyZWQnfSBdXG4gIH0pO1xuXG4gIGl0KCd0aGF0IGl0IGhhcycsICAgICAgICAgICB0ID0+IHQuaXMoJ29iamVjdCcsIHR5cGVvZiBtYWNoaW5lLmN1cnJlbnRfYWN0aW9uX2VkZ2VfZm9yKCdwb3dlcl9vbicpKSApO1xuICBpdCgndGhhdCBpdCBkb2VzblxcJ3QgaGF2ZScsIHQgPT4gdC50aHJvd3MoKCkgPT4geyBtYWNoaW5lLmN1cnJlbnRfYWN0aW9uX2VkZ2VfZm9yKCdwb3dlcl93ZXN0Jyk7IH0pICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdyZXBvcnRzIG9uIHN0YXRlcycsIGFzeW5jIGl0ID0+IHtcblxuICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgc3RhcnRfc3RhdGVzOiBbJ29mZiddLFxuICAgIHRyYW5zaXRpb25zOlsgeyBuYW1lOid0dXJuX29uJywgYWN0aW9uOidwb3dlcl9vbicsIGZyb206J29mZicsIHRvOidyZWQnfSBdXG4gIH0pO1xuXG4gIGl0KCd0aGF0IGl0IGhhcycsIHQgPT4gdC5pcygnb2JqZWN0JywgdHlwZW9mIG1hY2hpbmUuc3RhdGVfZm9yKCdvZmYnKSApICk7XG5cbiAgaXQoJ3RoYXQgaXQgZG9lc25cXCd0IGhhdmUnLCB0ID0+IHQudGhyb3dzKCgpID0+IHsgbWFjaGluZS5zdGF0ZV9mb3IoJ25vIHN1Y2ggc3RhdGUnKTsgfSkgKTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ3JldHVybnMgc3RhdGVzJywgYXN5bmMgaXQgPT4ge1xuXG4gIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICBzdGFydF9zdGF0ZXM6IFsnb2ZmJ10sXG4gICAgdHJhbnNpdGlvbnM6WyB7IG5hbWU6J3R1cm5fb24nLCBhY3Rpb246J3Bvd2VyX29uJywgZnJvbTonb2ZmJywgdG86J3JlZCd9IF1cbiAgfSk7XG5cbiAgaXQoJ3RoYXQgaXQgaGFzJywgdCA9PiB0LmlzKCdvYmplY3QnLCB0eXBlb2YgbWFjaGluZS5tYWNoaW5lX3N0YXRlKCkgKSApO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgncmVwb3J0cyBvbiB0cmFuc2l0aW9ucycsIGFzeW5jIGl0ID0+IHtcblxuICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgc3RhcnRfc3RhdGVzOiBbJ29mZiddLFxuICAgIHRyYW5zaXRpb25zOlsgeyBuYW1lOid0dXJuX29uJywgYWN0aW9uOidwb3dlcl9vbicsIGZyb206J29mZicsIHRvOidyZWQnfSBdXG4gIH0pO1xuXG5cbiAgaXQoJ3Vuc3BlY2lmaWVkIHRyYW5zaXRpb24gcmV0dXJuIHR5cGUnLCAgICAgICAgICAgIHQgPT4gdC5pcygnb2JqZWN0JywgdHlwZW9mIG1hY2hpbmUubGlzdF90cmFuc2l0aW9ucygpICAgICAgICAgICAgICAgICApICk7XG4gIGl0KCd1bnNwZWNpZmllZCB0cmFuc2l0aW9uIGNvcnJlY3QgZW50cmFuY2UgY291bnQnLCB0ID0+IHQuaXMoMCwgICAgICAgIG1hY2hpbmUubGlzdF90cmFuc2l0aW9ucygpLmVudHJhbmNlcy5sZW5ndGggICAgICAgKSApO1xuICBpdCgndW5zcGVjaWZpZWQgdHJhbnNpdGlvbiBjb3JyZWN0IGV4aXQgY291bnQnLCAgICAgdCA9PiB0LmlzKDEsICAgICAgICBtYWNoaW5lLmxpc3RfdHJhbnNpdGlvbnMoKS5leGl0cy5sZW5ndGggICAgICAgICAgICkgKTtcblxuICBpdCgnc3BlY2lmaWVkIHRyYW5zaXRpb24gcmV0dXJuIHR5cGUnLCAgICAgICAgICAgICAgdCA9PiB0LmlzKCdvYmplY3QnLCB0eXBlb2YgbWFjaGluZS5saXN0X3RyYW5zaXRpb25zKCdvZmYnKSAgICAgICAgICAgICkgKTtcbiAgaXQoJ3NwZWNpZmllZCB0cmFuc2l0aW9uIGNvcnJlY3QgZW50cmFuY2UgY291bnQnLCAgIHQgPT4gdC5pcygwLCAgICAgICAgbWFjaGluZS5saXN0X3RyYW5zaXRpb25zKCdvZmYnKS5lbnRyYW5jZXMubGVuZ3RoICApICk7XG4gIGl0KCdzcGVjaWZpZWQgdHJhbnNpdGlvbiBjb3JyZWN0IGV4aXQgY291bnQnLCAgICAgICB0ID0+IHQuaXMoMSwgICAgICAgIG1hY2hpbmUubGlzdF90cmFuc2l0aW9ucygnb2ZmJykuZXhpdHMubGVuZ3RoICAgICAgKSApO1xuXG4gIGl0KCdubyBzdWNoIHNwZWMgdHJhbnMgcmV0dXJuIHR5cGUnLCAgICAgICAgICAgICAgICB0ID0+IHQuaXMoJ29iamVjdCcsIHR5cGVvZiBtYWNoaW5lLmxpc3RfdHJhbnNpdGlvbnMoJ21vb3QnKSAgICAgICAgICAgKSApO1xuICBpdCgnbm8gc3VjaCBzcGVjIHRyYW5zIGNvcnJlY3QgZW50cmFuY2UgY291bnQnLCAgICAgdCA9PiB0LmlzKDAsICAgICAgICBtYWNoaW5lLmxpc3RfdHJhbnNpdGlvbnMoJ21vb3QnKS5lbnRyYW5jZXMubGVuZ3RoICkgKTtcbiAgaXQoJ25vIHN1Y2ggc3BlYyB0cmFucyBjb3JyZWN0IGV4aXQgY291bnQnLCAgICAgICAgIHQgPT4gdC5pcygwLCAgICAgICAgbWFjaGluZS5saXN0X3RyYW5zaXRpb25zKCdtb290JykuZXhpdHMubGVuZ3RoICAgICApICk7XG5cblxuICBpdCgndW5zcGVjaWZpZWQgZW50cmFuY2UgcmV0dXJuIHR5cGUnLCAgICAgICAgICAgICAgdCA9PiB0LmlzKHRydWUsICAgICBBcnJheS5pc0FycmF5KCBtYWNoaW5lLmxpc3RfZW50cmFuY2VzKCkgKSAgICAgICAgKSApO1xuICBpdCgndW5zcGVjaWZpZWQgZW50cmFuY2UgY29ycmVjdCBjb3VudCcsICAgICAgICAgICAgdCA9PiB0LmlzKDAsICAgICAgICBtYWNoaW5lLmxpc3RfZW50cmFuY2VzKCkubGVuZ3RoICAgICAgICAgICAgICAgICAgKSApO1xuXG4gIGl0KCdzcGVjaWZpZWQgZW50cmFuY2UgcmV0dXJuIHR5cGUnLCAgICAgICAgICAgICAgICB0ID0+IHQuaXModHJ1ZSwgICAgIEFycmF5LmlzQXJyYXkoIG1hY2hpbmUubGlzdF9lbnRyYW5jZXMoJ29mZicpICkgICApICk7XG4gIGl0KCdzcGVjaWZpZWQgZW50cmFuY2UgY29ycmVjdCBjb3VudCcsICAgICAgICAgICAgICB0ID0+IHQuaXMoMCwgICAgICAgIG1hY2hpbmUubGlzdF9lbnRyYW5jZXMoJ29mZicpLmxlbmd0aCAgICAgICAgICAgICApICk7XG5cbiAgaXQoJ25vIHN1Y2ggc3BlY2lmaWVkIGVudHJhbmNlIHJldHVybiB0eXBlJywgICAgICAgIHQgPT4gdC5pcyh0cnVlLCAgICAgQXJyYXkuaXNBcnJheSggbWFjaGluZS5saXN0X2VudHJhbmNlcygnbW9vdCcpICkgICkgKTsgLy8gdG9kbyB3aGFyZ2FyYmwgc2hvdWxkIHRoZXNlIHRocm93P1xuICBpdCgnbm8gc3VjaCBzcGVjaWZpZWQgZW50cmFuY2UgY29ycmVjdCBjb3VudCcsICAgICAgdCA9PiB0LmlzKDAsICAgICAgICBtYWNoaW5lLmxpc3RfZW50cmFuY2VzKCdtb290JykubGVuZ3RoICAgICAgICAgICAgKSApO1xuXG5cbiAgaXQoJ3Vuc3BlY2lmaWVkIGV4aXQgcmV0dXJuIHR5cGUnLCAgICAgICAgICAgICAgICAgIHQgPT4gdC5pcyh0cnVlLCAgICAgQXJyYXkuaXNBcnJheSggbWFjaGluZS5saXN0X2V4aXRzKCkgKSAgICAgICAgICAgICkgKTtcbiAgaXQoJ3Vuc3BlY2lmaWVkIGV4aXQgY29ycmVjdCBjb3VudCcsICAgICAgICAgICAgICAgIHQgPT4gdC5pcygxLCAgICAgICAgbWFjaGluZS5saXN0X2V4aXRzKCkubGVuZ3RoICAgICAgICAgICAgICAgICAgICAgICkgKTtcblxuICBpdCgnc3BlY2lmaWVkIGV4aXQgcmV0dXJuIHR5cGUnLCAgICAgICAgICAgICAgICAgICAgdCA9PiB0LmlzKHRydWUsICAgICBBcnJheS5pc0FycmF5KCBtYWNoaW5lLmxpc3RfZXhpdHMoJ29mZicpICkgICAgICAgKSApO1xuICBpdCgnc3BlY2lmaWVkIGV4aXQgY29ycmVjdCBjb3VudCcsICAgICAgICAgICAgICAgICAgdCA9PiB0LmlzKDEsICAgICAgICBtYWNoaW5lLmxpc3RfZXhpdHMoJ29mZicpLmxlbmd0aCAgICAgICAgICAgICAgICAgKSApO1xuXG4gIGl0KCdubyBzdWNoIHNwZWNpZmllZCBleGl0IHJldHVybiB0eXBlJywgICAgICAgICAgICB0ID0+IHQuaXModHJ1ZSwgICAgIEFycmF5LmlzQXJyYXkoIG1hY2hpbmUubGlzdF9leGl0cygnbW9vdCcpICkgICAgICApICk7XG4gIGl0KCdubyBzdWNoIHNwZWNpZmllZCBleGl0IGNvcnJlY3QgY291bnQnLCAgICAgICAgICB0ID0+IHQuaXMoMCwgICAgICAgIG1hY2hpbmUubGlzdF9leGl0cygnbW9vdCcpLmxlbmd0aCAgICAgICAgICAgICAgICApICk7XG5cblxuICBpdCgnZWRnZSBsaXN0IHJldHVybiB0eXBlJywgICAgICAgICAgICAgICAgICAgICAgICAgdCA9PiB0LmlzKHRydWUsICAgICBBcnJheS5pc0FycmF5KCBtYWNoaW5lLmxpc3RfZWRnZXMoKSApICAgICAgICAgICAgKSApO1xuICBpdCgnZWRnZSBsaXN0IGNvcnJlY3QgY291bnQnLCAgICAgICAgICAgICAgICAgICAgICAgdCA9PiB0LmlzKDEsICAgICAgICBtYWNoaW5lLmxpc3RfZWRnZXMoKS5sZW5ndGggICAgICAgICAgICAgICAgICAgICAgKSApO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgndHJhbnNpdGlvbiBieSBzdGF0ZSBuYW1lcycsIGFzeW5jIGl0ID0+IHtcblxuICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgc3RhcnRfc3RhdGVzOiBbJ29mZiddLFxuICAgIHRyYW5zaXRpb25zOlsgeyBuYW1lOid0dXJuX29uJywgYWN0aW9uOidwb3dlcl9vbicsIGZyb206J29mZicsIHRvOidyZWQnfSBdXG4gIH0pO1xuXG4gIGl0KCdmaW5kcyBvZmYgLT4gcmVkJywgICAgICAgICAgdCA9PiB0LmlzKDAsICAgICAgICAgbWFjaGluZS5nZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcygnb2ZmJywgJ3JlZCcpICApICk7XG4gIGl0KCdkb2VzIG5vdCBmaW5kIG9mZiAtPiBibHVlJywgdCA9PiB0LmlzKHVuZGVmaW5lZCwgbWFjaGluZS5nZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcygnb2ZmJywgJ2JsdWUnKSApICk7XG4gIGl0KCdkb2VzIG5vdCBmaW5kIGJsdWUgLT4gcmVkJywgdCA9PiB0LmlzKHVuZGVmaW5lZCwgbWFjaGluZS5nZXRfdHJhbnNpdGlvbl9ieV9zdGF0ZV9uYW1lcygnYmx1ZScsICdyZWQnKSApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdJbGxlZ2FsIG1hY2hpbmVzJywgYXN5bmMgaXQgPT4ge1xuXG5cbiAgaXQoJ2NhdGNoIHJlcGVhdGVkIG5hbWVzJywgdCA9PiB0LnRocm93cygoKSA9PiB7XG5cbiAgICBuZXcganNzbS5NYWNoaW5lKHtcbiAgICAgIHN0YXJ0X3N0YXRlczogWydtb290J10sXG4gICAgICB0cmFuc2l0aW9uczpbXG4gICAgICAgIHsgbmFtZTonaWRlbnRpY2FsJywgZnJvbTonMScsIHRvOicyJyB9LFxuICAgICAgICB7IG5hbWU6J2lkZW50aWNhbCcsIGZyb206JzInLCB0bzonMycgfVxuICAgICAgXVxuICAgIH0pO1xuXG4gIH0sIEVycm9yKSk7XG5cblxuICBpdCgnbXVzdCBkZWZpbmUgZnJvbScsIHQgPT4gdC50aHJvd3MoKCkgPT4ge1xuXG4gICAgbmV3IGpzc20uTWFjaGluZSh7XG4gICAgICBzdGFydF9zdGF0ZXM6IFsnbW9vdCddLFxuICAgICAgdHJhbnNpdGlvbnM6W1xuICAgICAgICB7IG5hbWU6J2lkZW50aWNhbCcsIHRvOicyJyB9XG4gICAgICBdXG4gICAgfSk7XG5cbiAgfSwgRXJyb3IpKTtcblxuXG4gIGl0KCdtdXN0IGRlZmluZSB0bycsIHQgPT4gdC50aHJvd3MoKCkgPT4ge1xuXG4gICAgbmV3IGpzc20uTWFjaGluZSh7XG4gICAgICBzdGFydF9zdGF0ZXM6IFsnbW9vdCddLFxuICAgICAgdHJhbnNpdGlvbnM6W1xuICAgICAgICB7IG5hbWU6J2lkZW50aWNhbCcsIGZyb206JzEnIH1cbiAgICAgIF1cbiAgICB9KTtcblxuICB9LCBFcnJvcikpO1xuXG5cbiAgaXQoJ211c3Qgbm90IGhhdmUgdHdvIGlkZW50aWNhbCBlZGdlcycsIHQgPT4gdC50aHJvd3MoKCkgPT4ge1xuXG4gICAgbmV3IGpzc20uTWFjaGluZSh7XG4gICAgICBzdGFydF9zdGF0ZXM6IFsnbW9vdCddLFxuICAgICAgdHJhbnNpdGlvbnM6W1xuICAgICAgICB7IG5hbWU6J2lkMScsIGZyb206JzEnLCB0bzonMicgfSxcbiAgICAgICAgeyBuYW1lOidpZDInLCBmcm9tOicxJywgdG86JzInIH1cbiAgICAgIF1cbiAgICB9KTtcblxuICB9LCBFcnJvcikpO1xuXG5cbiAgaXQoJ211c3Qgbm90IGhhdmUgdHdvIG9mIHRoZSBzYW1lIGFjdGlvbiBmcm9tIHRoZSBzYW1lIHNvdXJjZScsIHQgPT4gdC50aHJvd3MoKCkgPT4ge1xuXG4gICAgbmV3IGpzc20uTWFjaGluZSh7XG4gICAgICBzdGFydF9zdGF0ZXM6IFsnbW9vdCddLFxuICAgICAgdHJhbnNpdGlvbnM6W1xuICAgICAgICB7IG5hbWU6J2lkMScsIGZyb206JzEnLCB0bzonMicsIGFjdGlvbjonaWRlbnRpY2FsJyB9LFxuICAgICAgICB7IG5hbWU6J2lkMicsIGZyb206JzEnLCB0bzonMycsIGFjdGlvbjonaWRlbnRpY2FsJyB9XG4gICAgICBdXG4gICAgfSk7XG5cbiAgfSwgRXJyb3IpKTtcblxuXG4gIGl0KCdtdXN0IG5vdCBoYXZlIGNvbXBsZXRpb24gb2Ygbm9uLXN0YXRlJywgdCA9PiB0LnRocm93cygoKSA9PiB7XG5cbiAgICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgICBzdGFydF9zdGF0ZXM6IFsnbW9vdCddLFxuICAgICAgdHJhbnNpdGlvbnM6W1xuICAgICAgICB7IG5hbWU6J2lkMScsIGZyb206JzEnLCB0bzonMicsIGFjdGlvbjonaWRlbnRpY2FsJyB9XG4gICAgICBdXG4gICAgfSk7XG5cbiAgICBtYWNoaW5lLmlzX2NvbXBsZXRlKCdubyBzdWNoIHN0YXRlJyk7XG5cbiAgfSwgRXJyb3IpKTtcblxuXG4gIGl0KCdpbnRlcm5hbCBzdGF0ZSBoZWxwZXIgbXVzdCBub3QgYWNjZXB0IGRvdWJsZSBzdGF0ZXMnLCB0ID0+IHQudGhyb3dzKCgpID0+IHtcblxuICAgIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICAgIHN0YXJ0X3N0YXRlczogWydtb290J10sXG4gICAgICB0cmFuc2l0aW9uczpbXG4gICAgICAgIHsgbmFtZTonaWQxJywgZnJvbTonMScsIHRvOicyJywgYWN0aW9uOidpZGVudGljYWwnIH1cbiAgICAgIF1cbiAgICB9KTtcblxuICAgIG1hY2hpbmUuX25ld19zdGF0ZSh7ZnJvbTogJzEnLCBuYW1lOidpZDEnLCB0bzonMicsIGNvbXBsZXRlOmZhbHNlfSk7XG4gICAgbWFjaGluZS5fbmV3X3N0YXRlKHtmcm9tOiAnMScsIG5hbWU6J2lkMScsIHRvOicyJywgY29tcGxldGU6ZmFsc2V9KTtcblxuICB9LCBFcnJvcikpO1xuXG5cbiAgaXQoJ2NhblxcJ3QgZ2V0IGFjdGlvbnMgb2Ygbm9uLXN0YXRlJywgdCA9PiB0LnRocm93cygoKSA9PiB7XG5cbiAgICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgICBzdGFydF9zdGF0ZXM6IFsnMSddLFxuICAgICAgdHJhbnNpdGlvbnM6W1xuICAgICAgICB7IG5hbWU6J2lkMScsIGZyb206JzEnLCB0bzonMicsIGFjdGlvbjonaWRlbnRpY2FsJyB9XG4gICAgICBdXG4gICAgfSk7XG5cbiAgICBtYWNoaW5lLmFjdGlvbnMoJ3RocmVlJyk7XG5cbiAgfSwgRXJyb3IpKTtcblxuXG4gIGl0KCdjYW5cXCd0IGdldCBzdGF0ZXMgaGF2aW5nIG5vbi1hY3Rpb24nLCB0ID0+IHQudGhyb3dzKCgpID0+IHtcblxuICAgIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICAgIHN0YXJ0X3N0YXRlczogWycxJ10sXG4gICAgICB0cmFuc2l0aW9uczpbXG4gICAgICAgIHsgbmFtZTonaWQxJywgZnJvbTonMScsIHRvOicyJywgYWN0aW9uOidpZGVudGljYWwnIH1cbiAgICAgIF1cbiAgICB9KTtcblxuICAgIG1hY2hpbmUubGlzdF9zdGF0ZXNfaGF2aW5nX2FjdGlvbignbm8gc3VjaCBhY3Rpb24nKTtcblxuICB9LCBFcnJvcikpO1xuXG5cbiAgaXQoJ2NhblxcJ3QgbGlzdCBleGl0IHN0YXRlcyBvZiBub24tYWN0aW9uJywgdCA9PiB0LnRocm93cygoKSA9PiB7XG5cbiAgICBjb25zdCBtYWNoaW5lID0gbmV3IGpzc20uTWFjaGluZSh7XG4gICAgICBzdGFydF9zdGF0ZXM6IFsnMSddLFxuICAgICAgdHJhbnNpdGlvbnM6W1xuICAgICAgICB7IG5hbWU6J2lkMScsIGZyb206JzEnLCB0bzonMicsIGFjdGlvbjonaWRlbnRpY2FsJyB9XG4gICAgICBdXG4gICAgfSk7XG5cbiAgICBtYWNoaW5lLmxpc3RfZXhpdF9hY3Rpb25zKCdubyBzdWNoIGFjdGlvbicpO1xuXG4gIH0sIEVycm9yKSk7XG5cblxuICBpdCgncHJvYmFibGUgZXhpdHMgZm9yIHRocm93cyBvbiBub24tc3RhdGUnLCB0ID0+IHQudGhyb3dzKCgpID0+IHtcblxuICAgIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICAgIHN0YXJ0X3N0YXRlczogWycxJ10sXG4gICAgICB0cmFuc2l0aW9uczpbXG4gICAgICAgIHsgbmFtZTonaWQxJywgZnJvbTonMScsIHRvOicyJywgYWN0aW9uOidpZGVudGljYWwnIH1cbiAgICAgIF1cbiAgICB9KTtcblxuICAgIG1hY2hpbmUucHJvYmFibGVfZXhpdHNfZm9yKCczJyk7XG5cbiAgfSwgRXJyb3IpKTtcblxudGVzdCh0ID0+IHtcbiAgdC5wYXNzKCk7XG59KTtcblxuICBpdCgnbm8gcHJvYmFibGUgYWN0aW9uIGV4aXRzIG9mIG5vbi1hY3Rpb24nLCB0ID0+IHQudGhyb3dzKCgpID0+IHtcblxuICAgIGNvbnN0IG1hY2hpbmUgPSBuZXcganNzbS5NYWNoaW5lKHtcbiAgICAgIHN0YXJ0X3N0YXRlczogWycxJ10sXG4gICAgICB0cmFuc2l0aW9uczpbXG4gICAgICAgIHsgbmFtZTonaWQxJywgZnJvbTonMScsIHRvOicyJywgYWN0aW9uOidpZGVudGljYWwnIH1cbiAgICAgIF1cbiAgICB9KTtcblxuICAgIG1hY2hpbmUucHJvYmFibGVfYWN0aW9uX2V4aXRzKCdubyBzdWNoIGFjdGlvbicpO1xuXG4gIH0sIEVycm9yKSk7XG5cbn0pO1xuIl19