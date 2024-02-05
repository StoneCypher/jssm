
/* eslint-disable max-len */

import * as jssm from '../jssm';





test('build-set version number is present', () =>
  expect(typeof jssm.version)
    .toBe('string'));





test('build_time is present', () =>
  expect(typeof jssm.build_time)
    .toBe('number'));





describe('Stochastic weather', () => {

  new jssm.Machine({

    start_states: ['breezy'],

    transitions: [

      { from: 'breezy',  to: 'breezy',  probability: 0.4,  kind: 'legal', forced_only: false, main_path: false },
      { from: 'breezy',  to: 'sunny',   probability: 0.3,  kind: 'legal', forced_only: false, main_path: false },
      { from: 'breezy',  to: 'cloudy',  probability: 0.15, kind: 'legal', forced_only: false, main_path: false },
      { from: 'breezy',  to: 'windy',   probability: 0.1,  kind: 'legal', forced_only: false, main_path: false },
      { from: 'breezy',  to: 'rain',    probability: 0.05, kind: 'legal', forced_only: false, main_path: false },

      { from: 'sunny',   to: 'sunny',   probability: 0.5,  kind: 'legal', forced_only: false, main_path: false },
      { from: 'sunny',   to: 'hot',     probability: 0.15, kind: 'legal', forced_only: false, main_path: false },
      { from: 'sunny',   to: 'breezy',  probability: 0.15, kind: 'legal', forced_only: false, main_path: false },
      { from: 'sunny',   to: 'cloudy',  probability: 0.15, kind: 'legal', forced_only: false, main_path: false },
      { from: 'sunny',   to: 'rain',    probability: 0.05, kind: 'legal', forced_only: false, main_path: false },

      { from: 'hot',     to: 'hot',     probability: 0.75, kind: 'legal', forced_only: false, main_path: false },
      { from: 'hot',     to: 'breezy',  probability: 0.05, kind: 'legal', forced_only: false, main_path: false },
      { from: 'hot',     to: 'sunny',   probability: 0.2,  kind: 'legal', forced_only: false, main_path: false },

      { from: 'cloudy',  to: 'cloudy',  probability: 0.6,  kind: 'legal', forced_only: false, main_path: false },
      { from: 'cloudy',  to: 'sunny',   probability: 0.2,  kind: 'legal', forced_only: false, main_path: false },
      { from: 'cloudy',  to: 'rain',    probability: 0.15, kind: 'legal', forced_only: false, main_path: false },
      { from: 'cloudy',  to: 'breezy',  probability: 0.05, kind: 'legal', forced_only: false, main_path: false },

      { from: 'windy',   to: 'windy',   probability: 0.3,  kind: 'legal', forced_only: false, main_path: false },
      { from: 'windy',   to: 'gale',    probability: 0.1,  kind: 'legal', forced_only: false, main_path: false },
      { from: 'windy',   to: 'breezy',  probability: 0.4,  kind: 'legal', forced_only: false, main_path: false },
      { from: 'windy',   to: 'rain',    probability: 0.15, kind: 'legal', forced_only: false, main_path: false },
      { from: 'windy',   to: 'sunny',   probability: 0.05, kind: 'legal', forced_only: false, main_path: false },

      { from: 'gale',    to: 'gale',    probability: 0.65, kind: 'legal', forced_only: false, main_path: false },
      { from: 'gale',    to: 'windy',   probability: 0.25, kind: 'legal', forced_only: false, main_path: false },
      { from: 'gale',    to: 'torrent', probability: 0.05, kind: 'legal', forced_only: false, main_path: false },
      { from: 'gale',    to: 'hot',     probability: 0.05, kind: 'legal', forced_only: false, main_path: false },

      { from: 'rain',    to: 'rain',    probability: 0.3,  kind: 'legal', forced_only: false, main_path: false },
      { from: 'rain',    to: 'torrent', probability: 0.05, kind: 'legal', forced_only: false, main_path: false },
      { from: 'rain',    to: 'windy',   probability: 0.1,  kind: 'legal', forced_only: false, main_path: false },
      { from: 'rain',    to: 'breezy',  probability: 0.15, kind: 'legal', forced_only: false, main_path: false },
      { from: 'rain',    to: 'sunny',   probability: 0.1,  kind: 'legal', forced_only: false, main_path: false },
      { from: 'rain',    to: 'cloudy',  probability: 0.3,  kind: 'legal', forced_only: false, main_path: false },

      { from: 'torrent', to: 'torrent', probability: 0.65, kind: 'legal', forced_only: false, main_path: false },
      { from: 'torrent', to: 'rain',    probability: 0.25, kind: 'legal', forced_only: false, main_path: false },
      { from: 'torrent', to: 'cloudy',  probability: 0.05, kind: 'legal', forced_only: false, main_path: false },
      { from: 'torrent', to: 'gale',    probability: 0.05, kind: 'legal', forced_only: false, main_path: false }

    ]

  });

  test.todo('Unfinished test case in general spec');

});





describe('Arrow direction', () => {

  test('arrow_direction reads left correctly', () =>
    expect(jssm.arrow_direction('<-'))
      .toBe('left') );

  test('arrow_direction reads right correctly', () =>
    expect(jssm.arrow_direction('->'))
      .toBe('right') );

  test('arrow_direction reads both correctly', () =>
    expect(jssm.arrow_direction('<->'))
      .toBe('both') );

});





describe('list exit actions', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { from:'off', to:'red', action:'on',  kind: 'legal', forced_only: false, main_path: false },
      { from:'red', to:'off', action:'off', kind: 'legal', forced_only: false, main_path: false }
    ]
  });

  test('shows "on" from off as default', () =>
    expect(machine.list_exit_actions()[0])
      .toBe('on') );

  test('shows "on" from off', () =>
    expect(machine.list_exit_actions('off')[0])
      .toBe('on') );

  test('shows "off" from red', () =>
    expect(machine.list_exit_actions('red')[0])
      .toBe('off') );

});





describe('probable exits for', () => {

  const machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[ { from:'off', to:'red', kind: 'legal', forced_only: false, main_path: false } ]
  });

  test('probable exits are an array', () =>
    expect(Array.isArray(machine.probable_exits_for('off')) )
      .toBe(true) );

  test('one probable exit in example', () =>
    expect(machine.probable_exits_for('off').length)
      .toBe(1) );

  test('exit is an object', () =>
    expect(typeof machine.probable_exits_for('off')[0])
      .toBe('object') );

  test('exit 0 has a string from property', () =>
    expect(typeof machine.probable_exits_for('off')[0].from)
      .toBe('string') );

});





describe('probable action exits', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { from:'off', to:'red', action:'on',  kind: 'legal', forced_only: false, main_path: false },
      { from:'red', to:'off', action:'off', kind: 'legal', forced_only: false, main_path: false }
    ]
  });


  test('probable action exits are an array', () =>
    expect(Array.isArray(machine.probable_action_exits()) )
      .toBe(true) );

  test('probable action exit 1 is on', () =>
    expect(machine.probable_action_exits()[0].action)
      .toBe('on') );


  test('probable action exits are an array 2', () =>
    expect(Array.isArray(machine.probable_action_exits('off')) )
      .toBe(true) );

  test('probable action exit 1 is on 2', () =>
    expect(machine.probable_action_exits('off')[0].action)
      .toBe('on') );


  test('probable action exits are an array 3', () =>
    expect(Array.isArray(machine.probable_action_exits('red')) )
      .toBe(true) );

  test('probable action exit 1 is on 3', () =>
    expect(machine.probable_action_exits('red')[0].action)
      .toBe('off') );

});





describe('probabilistic_transition', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [ { from: 'off', to: 'red',  kind: 'legal', forced_only: false, main_path: false } ]
  });

  machine.probabilistic_transition();

  test('solo after probabilistic is red', () =>
    expect(machine.state())
      .toBe('red') );

});





describe('probabilistic_walk', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { from: 'off', to: 'red', kind: 'legal', forced_only: false, main_path: false },
      { from: 'red', to: 'off', kind: 'legal', forced_only: false, main_path: false }
    ]
  });

  machine.probabilistic_walk(3);

  test('solo after probabilistic walk 3 is red', () =>
    expect(machine.state())
      .toBe('red') );

});





describe('probabilistic_histo_walk', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { from: 'off', to: 'red', kind: 'legal', forced_only: false, main_path: false },
      { from: 'red', to: 'off', kind: 'legal', forced_only: false, main_path: false }
    ]
  });

  const histo = machine.probabilistic_histo_walk(3);

  test('histo is a Map', () =>
    expect(histo instanceof Map)
      .toBe(true) );

  test('histo red is 2', () =>
    expect(histo.get('red'))
      .toBe(2) );

  test('histo off is 2', () =>
    expect(histo.get('off'))
      .toBe(2) );

});





describe('reports state_is_final', () => {

  const machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[
      { from: 'off', to: 'red', kind: 'legal', forced_only: false, main_path: false },
      { from: 'off', to: 'mid', kind: 'legal', forced_only: false, main_path: false },
      { from: 'mid', to: 'fin', kind: 'legal', forced_only: false, main_path: false }
    ],
    complete:['red', 'mid']
  });

  test('final false for neither', () =>
    expect(machine.state_is_final('off') )
      .toBe(false) );

  test('final true for just terminal', () =>
    expect(machine.state_is_final('mid') )
      .toBe(true) );

  test('final true for just complete', () =>
    expect(machine.state_is_final('fin') )
      .toBe(true) );

  test('final true', () =>
    expect(machine.state_is_final('red') )
      .toBe(true) );

});





describe('reports is_final', () => {

  const machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[
      { from:'off', to:'red', kind: 'legal', forced_only: false, main_path: false }
    ],
    complete:['red']
  });

  const init_final = machine.is_final();
  machine.transition('red');
  const fin_final  = machine.is_final();

  test('final false', () =>
    expect(init_final)
      .toBe(false) );

  test('final true', () =>
    expect(fin_final)
      .toBe(true) );

  // why is this written this way?

  /* todo whargarbl needs another two tests for is_changing once reintroduced */

});





describe('reports state_is_terminal', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [ { name: 'turn_on', action: 'power_on', from: 'off', to: 'red', kind: 'legal', forced_only: false, main_path: false } ]
  });

  test('terminal false', () =>
    expect(machine.state_is_terminal('off') )
      .toBe(false) );

  test('terminal true', () =>
    expect(machine.state_is_terminal('red') )
      .toBe(true) );

  test('terminal on missing state throws', () =>
    expect( () => machine.state_is_terminal('notARealState') )
      .toThrow() );

});





describe('reports is_terminal', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [ { name:'turn_on', action:'power_on', from:'off', to:'red', kind: 'legal', forced_only: false, main_path: false} ]
  });

  const first  = machine.is_terminal();
  machine.transition('red');
  const second = machine.is_terminal();

  const terms  = machine.has_terminals();
  // why is this written this way?

  test('terminal false', () =>
    expect(first)
      .toBe(false) );

  test('terminal true', () =>
    expect(second)
      .toBe(true) );

  test('has_terminals', () =>
    expect(terms)
      .toBe(true) );

});





describe('reports state_is_complete', () => {

  const machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red', kind: 'legal', forced_only: false, main_path: false} ],
    complete:['off'] // huhu
  });

  test('state_is_complete false', () =>
    expect(machine.state_is_complete('off') )
      .toBe(true) );

  test('state_is_complete true', () =>
    expect(machine.state_is_complete('red') )
      .toBe(false) );

  test('throws on nonexisting state', () =>
    expect( () => machine.state_is_complete('thisStateDoesNotExist') )
      .toThrow() );

});





describe('reports is_complete', () => {

  const machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red', kind: 'legal', forced_only: false, main_path: false} ],
    complete:['off'] // huhu
  });

  const first  = machine.is_complete();
  machine.transition('red');
  const second = machine.is_complete();

  const terms  = machine.has_completes();
  // why is this written this way?

  test('is_complete false', () =>
    expect(first)
      .toBe(true) );

  test('is_complete true', () =>
    expect(second)
      .toBe(false) );

  test('has_completes', () =>
    expect(terms)
      .toBe(true) );

});





describe('reports on actions', () => {

  const machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red', kind: 'legal', forced_only: false, main_path: false} ]
  });

  const a = machine.list_actions();  // todo comeback

  test('that it has', () =>
    expect(typeof machine.current_action_for('power_on') )
      .toBe('number') );

  test('that it doesn\'t have', () =>
    expect(typeof machine.current_action_for('power_left') )
      .toBe('undefined') );

  test('correct list type', () =>
    expect(Array.isArray(a))
      .toBe(true) );

  test('correct list size', () =>
    expect(a.length)
      .toBe(1) );

});





describe('actions', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { from:'off', to:'red', action:'on',  kind: 'legal', forced_only: false, main_path: false },
      { from:'red', to:'off', action:'off', kind: 'legal', forced_only: false, main_path: false }
    ]
  });

  test('red has actions().length 1', () =>
    expect(machine.actions().length)
      .toBe(1) );

  test('red has actions()[0] "on"', () =>
    expect(machine.actions()[0])
      .toBe('on') );

  test('red has actions().length 1 again', () =>
    expect(machine.actions('off').length)
      .toBe(1) );

  test('red has actions()[0] "on" again', () =>
    expect(machine.actions('off')[0])
      .toBe('on') );

  test('red has actions().length 1 re-again', () =>
    expect(machine.actions('red').length)
      .toBe(1) );

  test('red has actions()[0] "off" re-again',
    () => expect(machine.actions('red')[0])
      .toBe('off') );

});





describe('states having action', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { from:'off', to: 'red', action: 'on',  kind: 'legal', forced_only: false, main_path: false },
      { from:'red', to: 'off', action: 'off', kind: 'legal', forced_only: false, main_path: false }
    ]
  });

  test('one action has on', () =>
    expect(machine.list_states_having_action('on').length)
      .toBe(1) );

  test('on is had by off', () =>
    expect(machine.list_states_having_action('on')[0])
      .toBe('off') );

});





describe('unenterables', () => {

  const machine = new jssm.Machine({
    start_states: ['off'],
    transitions:[ { name:'turn_on', action: 'power_on', from: 'off', to: 'red', kind: 'legal', forced_only: false, main_path: false } ]
  });

  test('off isn\'t enterable', () =>
    expect(machine.is_unenterable('off') )
      .toBe(true) );

  test('red is enterable', () =>
    expect(machine.is_unenterable('red') )
      .toBe(false) );

  test('machine has unenterables', () =>
    expect(machine.has_unenterables() )
      .toBe(true) );

  test('unenterable test on missing state throws', () =>
    expect( () => machine.is_unenterable('notARealState') )
      .toThrow() );

});





describe('reports on action edges', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { name:'turn_on', action:'power_on', from:'off', to:'red', kind: 'legal', forced_only: false, main_path: false }
    ]
  });

  test('that it has', () =>
    expect(typeof machine.current_action_edge_for('power_on'))
      .toBe('object') );

  test('that it doesn\'t have', () =>
    expect(() => { machine.current_action_edge_for('power_west'); })
      .toThrow() );

});





describe('reports on states', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { name:'turn_on', action:'power_on', from:'off', to:'red', kind: 'legal', forced_only: false, main_path: false }
    ]
  });

  test('that it has', () =>
    expect(typeof machine.state_for('off') )
      .toBe('object') );

  test('that it doesn\'t have', () =>
    expect(() => { machine.state_for('no such state'); })
      .toThrow() );

});





describe('returns states', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { name:'turn_on', action:'power_on', from:'off', to:'red', kind: 'legal', forced_only: false, main_path: false }
    ]
  });

  test('that it has', () =>
    expect(typeof machine.machine_state() )
      .toBe('object') );

});





describe('reports on transitions', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [
      { name:'turn_on', action:'power_on', from:'off', to:'red', kind: 'legal', forced_only: false, main_path: false }
    ]
  });


  test('unspecified transition return type', () =>
    expect(typeof machine.list_transitions() )
      .toBe('object') );

  test('unspecified transition correct entrance count', () =>
    expect(machine.list_transitions().entrances.length)
      .toBe(0) );

  test('unspecified transition correct exit count', () =>
    expect(machine.list_transitions().exits.length)
      .toBe(1) );


  test('specified transition return type', () =>
    expect(typeof machine.list_transitions('off') )
      .toBe('object') );

  test('specified transition correct entrance count', () =>
    expect(machine.list_transitions('off').entrances.length)
      .toBe(0) );

  test('specified transition correct exit count', () =>
    expect(machine.list_transitions('off').exits.length)
      .toBe(1) );


  test('no such spec trans return type', () =>
    expect(typeof machine.list_transitions('moot') )
      .toBe('object') );

  test('no such spec trans correct entrance count', () =>
    expect(machine.list_transitions('moot').entrances.length)
      .toBe(0) );

  test('no such spec trans correct exit count', () =>
    expect(machine.list_transitions('moot').exits.length)
      .toBe(0) );


  test('unspecified entrance return type', () =>
    expect(Array.isArray( machine.list_entrances() ))
      .toBe(true) );

  test('unspecified entrance correct count', () =>
    expect(machine.list_entrances().length)
      .toBe(0) );


  test('specified entrance return type', () =>
    expect(Array.isArray( machine.list_entrances('off') ))
      .toBe(true) );

  test('specified entrance correct count', () =>
    expect(machine.list_entrances('off').length)
      .toBe(0) );


  test('no such specified entrance return type', () =>
    expect(Array.isArray( machine.list_entrances('moot') ))
      .toBe(true) ); // todo whargarbl should these throw?

  test('no such specified entrance correct count', () =>
    expect(machine.list_entrances('moot').length)
      .toBe(0) );


  test('unspecified exit return type', () =>
    expect(Array.isArray( machine.list_exits() ))
      .toBe(true) );

  test('unspecified exit correct count', () =>
    expect(machine.list_exits().length)
      .toBe(1) );


  test('specified exit return type', () =>
    expect(Array.isArray( machine.list_exits('off') ))
      .toBe(true) );

  test('specified exit correct count', () =>
    expect(machine.list_exits('off').length)
      .toBe(1) );


  test('no such specified exit return type', () =>
    expect(Array.isArray( machine.list_exits('moot') ))
      .toBe(true) );

  test('no such specified exit correct count', () =>
    expect(machine.list_exits('moot').length)
      .toBe(0) );


  test('edge list return type', () =>
    expect(Array.isArray( machine.list_edges() ))
      .toBe(true) );

  test('edge list correct count', () =>
    expect(machine.list_edges().length)
      .toBe(1) );

});





describe('transition by state names', () => {

  const machine = new jssm.Machine({
    start_states : ['off'],
    transitions  : [ { name:'turn_on', action:'power_on', from:'off', to:'red', kind: 'legal', forced_only: false, main_path: false } ]
  });

  test('finds off -> red', () =>
    expect(machine.get_transition_by_state_names('off', 'red') )
      .toBe(0) );

  test('does not find off -> blue', () =>
    expect(machine.get_transition_by_state_names('off', 'blue') )
      .toBe(undefined) );

  test('does not find blue -> red', () =>
    expect(machine.get_transition_by_state_names('blue', 'red') )
      .toBe(undefined) );

});





describe('Illegal machines', () => {


  test('catch repeated names', () => expect( () => {

    new jssm.Machine({
      start_states: ['moot'],
      transitions:[
        { name: 'identical', from: '1', to: '2', kind: 'legal', forced_only: false, main_path: false },
        { name: 'identical', from: '2', to: '3', kind: 'legal', forced_only: false, main_path: false }
      ]
    });

  }).toThrow() );


  test('must define from', () => expect( () => {

    new jssm.Machine({
      start_states: ['moot'],
      transitions:[
        { name:'identical', to:'2', kind: 'legal', forced_only: false, main_path: false }
      ]
    } as any);

  }).toThrow() );


  test('must define to', () => expect( () => {

    new jssm.Machine({
      start_states: ['moot'],
      transitions:[
        { name:'identical', from:'1', kind: 'legal', forced_only: false, main_path: false }
      ]
    } as any);

  }).toThrow() );


  test('must not have two identical edges', () => expect( () => {

    new jssm.Machine({
      start_states: ['moot'],
      transitions:[
        { name:'id1', from:'1', to:'2', kind: 'legal', forced_only: false, main_path: false },
        { name:'id2', from:'1', to:'2', kind: 'legal', forced_only: false, main_path: false }
      ]
    });

  }).toThrow() );


  test('must not have two of the same action from the same source', () => expect( () => {

    new jssm.Machine({
      start_states: ['moot'],
      transitions:[
        { name:'id1', from:'1', to:'2', action:'identical', kind: 'legal', forced_only: false, main_path: false },
        { name:'id2', from:'1', to:'3', action:'identical', kind: 'legal', forced_only: false, main_path: false }
      ]
    });

  }).toThrow() );


  test.todo('Does is_complete need an argument?');

  // test('must not have completion of non-state', () => expect( () => {

  //   const machine = new jssm.Machine({
  //     start_states: ['moot'],
  //     transitions:[
  //       { name:'id1', from:'1', to:'2', action:'identical', kind: 'legal', forced_only: false, main_path: false }
  //     ]
  //   });

  //   machine.is_complete('no such state');

  // }).toThrow() );


  test.todo('is the _new_state api misunderstood in these tests?')

  // test('internal state helper must not accept double states', () => expect( () => {

  //   const machine = new jssm.Machine({
  //     start_states: ['moot'],
  //     transitions:[
  //       { name:'id1', from:'1', to:'2', action:'identical', kind: 'legal', forced_only: false, main_path: false }
  //     ]
  //   });

  //   machine._new_state({from: '1', name:'id1', to:'2', complete:false});
  //   machine._new_state({from: '1', name:'id1', to:'2', complete:false});

  // }).toThrow() );


  test('can\'t get actions of non-state', () => expect( () => {

    const machine = new jssm.Machine({
      start_states: ['1'],
      transitions:[
        { name:'id1', from:'1', to:'2', action:'identical', kind: 'legal', forced_only: false, main_path: false }
      ]
    });

    machine.actions('three');

  }).toThrow() );


  test('can\'t get states having non-action', () => expect( () => {

    const machine = new jssm.Machine({
      start_states: ['1'],
      transitions:[
        { name:'id1', from:'1', to:'2', action:'identical', kind: 'legal', forced_only: false, main_path: false }
      ]
    });

    machine.list_states_having_action('no such action');

  }).toThrow() );


  test('can\'t list exit states of non-action', () => expect( () => {

    const machine = new jssm.Machine({
      start_states: ['1'],
      transitions:[
        { name:'id1', from:'1', to:'2', action:'identical', kind: 'legal', forced_only: false, main_path: false }
      ]
    });

    machine.list_exit_actions('no such action');

  }).toThrow() );


  test('probable exits for throws on non-state', () => expect( () => {

    const machine = new jssm.Machine({
      start_states: ['1'],
      transitions:[
        { name:'id1', from:'1', to:'2', action:'identical', kind: 'legal', forced_only: false, main_path: false }
      ]
    });

    machine.probable_exits_for('3');

  }).toThrow() );

  test('no probable action exits of non-action', () => expect( () => {

    const machine = new jssm.Machine({
      start_states: ['1'],
      transitions:[
        { name:'id1', from:'1', to:'2', action:'identical', kind: 'legal', forced_only: false, main_path: false }
      ]
    });

    machine.probable_action_exits('no such action');

  }).toThrow() );

});
