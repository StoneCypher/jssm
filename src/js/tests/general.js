
/* eslint-disable max-len */

import {test, describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





test('build-set version number is present', t => t.is(typeof jssm.version, 'string'));





describe('Simple stop light', async it => {

  const trs = [
          { name: 'SwitchToWarn', action: 'Proceed', from:'Green',  to:'Yellow' },
          { name: 'SwitchToHalt', action: 'Proceed', from:'Yellow', to:'Red'    },
          { name: 'SwitchToGo',   action: 'Proceed', from:'Red',    to:'Green'  }
        ],
        light = new jssm.machine({
          initial_state : 'Red',
          transitions   : trs
        });

  const r_states = light.states();
  it('has the right state count', t => t.is(r_states.length, 3));
  trs.map(t => t.to).map(c =>
    it(`has state "${c}"`, t => t.is(r_states.includes(c), true))
  );

  const r_names = light.list_named_transitions();
  it('has the right named transition count', t => t.is(r_names.size, 3));
  trs.map(t => t.name)
     .map(a =>
       it(`has named transition "${a}"`, t => t.is(r_names.has(a), true))
     );

  it.describe('- `proceed` walkthrough', async it2 => {

    it2('machine starts red',  t => t.is("Red",    light.state()));
    it2('proceed is true',     t => t.is(true,     light.action('Proceed')));
    it2('light is now green',  t => t.is("Green",  light.state()));
    it2('proceed is true',     t => t.is(true,     light.action('Proceed')));
    it2('light is now yellow', t => t.is("Yellow", light.state()));
    it2('proceed is true',     t => t.is(true,     light.action('Proceed')));
    it2('light is red again',  t => t.is("Red",    light.state()));

  });

  it.describe('- mixed - `proceed` and `transition`', async it3 => {

    it3('machine starts red',              t => t.is("Red",    light.state()));
    it3('proceed is true',                 t => t.is(true,     light.action('Proceed')));
    it3('light is now green',              t => t.is("Green",  light.state()));

    it3('green refuses transition red',    t => t.is(false,    light.transition('Red')));
    it3('green still green',               t => t.is("Green",  light.state()));
    it3('green refuses transition green',  t => t.is(false,    light.transition('Green')));
    it3('green still green',               t => t.is("Green",  light.state()));
    it3('green accepts transition yellow', t => t.is(true,     light.transition('Yellow')));
    it3('green now yellow',                t => t.is("Yellow", light.state()));

    it3('proceed is true',                 t => t.is(true,     light.action('Proceed')));
    it3('light is red again',              t => t.is("Red",    light.state()));

    it3('red refuses transition yellow',   t => t.is(false,    light.transition('Yellow')));
    it3('red still red',                   t => t.is("Red",    light.state()));
    it3('red refuses transition red',      t => t.is(false,    light.transition('Red')));
    it3('red still red',                   t => t.is("Red",    light.state()));
    it3('red accepts transition green',    t => t.is(true,     light.transition('Green')));
    it3('red now green',                   t => t.is("Green",  light.state()));

    it3('proceed is true',                 t => t.is(true,     light.action('Proceed')));
    it3('light is yellow again',           t => t.is("Yellow", light.state()));
    it3('proceed is true',                 t => t.is(true,     light.action('Proceed')));
    it3('light is finally red again',      t => t.is("Red",    light.state()));

  });

});





describe('Stochastic weather', async _it => {

  new jssm.machine({

    initial_state: 'breezy',

    transitions: [

      { from: 'breezy',  to: 'breezy',  probability: 0.4  },
      { from: 'breezy',  to: 'sunny',   probability: 0.3  },
      { from: 'breezy',  to: 'cloudy',  probability: 0.15 },
      { from: 'breezy',  to: 'windy',   probability: 0.1  },
      { from: 'breezy',  to: 'rain',    probability: 0.05 },

      { from: 'sunny',   to: 'sunny',   probability: 0.5  },
      { from: 'sunny',   to: 'hot',     probability: 0.15 },
      { from: 'sunny',   to: 'breezy',  probability: 0.15 },
      { from: 'sunny',   to: 'cloudy',  probability: 0.15 },
      { from: 'sunny',   to: 'rain',    probability: 0.05 },

      { from: 'hot',     to: 'hot',     probability: 0.75 },
      { from: 'hot',     to: 'breezy',  probability: 0.05 },
      { from: 'hot',     to: 'sunny',   probability: 0.2  },

      { from: 'cloudy',  to: 'cloudy',  probability: 0.6  },
      { from: 'cloudy',  to: 'sunny',   probability: 0.2  },
      { from: 'cloudy',  to: 'rain',    probability: 0.15 },
      { from: 'cloudy',  to: 'breezy',  probability: 0.05 },

      { from: 'windy',   to: 'windy',   probability: 0.3  },
      { from: 'windy',   to: 'gale',    probability: 0.1  },
      { from: 'windy',   to: 'breezy',  probability: 0.4  },
      { from: 'windy',   to: 'rain',    probability: 0.15 },
      { from: 'windy',   to: 'sunny',   probability: 0.05 },

      { from: 'gale',    to: 'gale',    probability: 0.65 },
      { from: 'gale',    to: 'windy',   probability: 0.25 },
      { from: 'gale',    to: 'torrent', probability: 0.05 },
      { from: 'gale',    to: 'hot',     probability: 0.05 },

      { from: 'rain',    to: 'rain',    probability: 0.3  },
      { from: 'rain',    to: 'torrent', probability: 0.05 },
      { from: 'rain',    to: 'windy',   probability: 0.1  },
      { from: 'rain',    to: 'breezy',  probability: 0.15 },
      { from: 'rain',    to: 'sunny',   probability: 0.1  },
      { from: 'rain',    to: 'cloudy',  probability: 0.3  },

      { from: 'torrent', to: 'torrent', probability: 0.65 },
      { from: 'torrent', to: 'rain',    probability: 0.25 },
      { from: 'torrent', to: 'cloudy',  probability: 0.05 },
      { from: 'torrent', to: 'gale',    probability: 0.05 }

    ]

  });

});





describe('Complex stop light', async it => {

  const light2 = new jssm.machine({

    initial_state: 'off',

    transitions:[

      { name:'turn_on',     action:'power_on',  from:'off',    to:'red'},

      {                     action:'power_off', from:'red',    to:'off' },
      {                     action:'power_off', from:'yellow', to:'off' },
      {                     action:'power_off', from:'green',  to:'off' },

      { name:'switch_warn', action:'proceed',   from:'green',  to:'yellow' },
      { name:'switch_halt', action:'proceed',   from:'yellow', to:'red'    },
      { name:'switch_go',   action:'proceed',   from:'red',    to:'green'  }

    ]

  });

  const r_states = light2.states();
  it('has the right state count', t => t.is(r_states.length, 4));
  ['red', 'yellow', 'green', 'off'].map(c =>
    it(`has state "${c}"`, t => t.is(r_states.includes(c), true))
  );

  const r_names = light2.list_named_transitions();
  it('has the right named transition count', t => t.is(r_names.size, 4));
  ['turn_on', 'switch_warn', 'switch_halt', 'switch_go'].map(a =>
    it(`has named transition "${a}"`, t => t.is(r_names.has(a), true))
  );

  it('has the right exit actions for red', t => t.deepEqual(['power_off', 'proceed'], light2.list_exit_actions('red')));


  it.describe('- `transition` walkthrough', async it2 => {

    it2('machine starts off',    t => t.is("off",    light2.state()));
    it2('off refuses green',     t => t.is(false,    light2.transition('green')));
    it2('off refuses yellow',    t => t.is(false,    light2.transition('yellow')));

    it2('off refuses proceed',   t => t.is(false,    light2.action('proceed')));

    it2('off accepts red',       t => t.is(true,     light2.transition('red')));
    it2('off is now red',        t => t.is("red",    light2.state()));
    it2('red refuses yellow',    t => t.is(false,    light2.transition('yellow')));
    it2('red still red',         t => t.is("red",    light2.state()));
    it2('red refuses red',       t => t.is(false,    light2.transition('red')));
    it2('red still red',         t => t.is("red",    light2.state()));

    it2('red accepts green',     t => t.is(true,     light2.transition('green')));
    it2('red now green',         t => t.is("green",  light2.state()));
    it2('green refuses red',     t => t.is(false,    light2.transition('red')));
    it2('green still green',     t => t.is("green",  light2.state()));
    it2('green refuses green',   t => t.is(false,    light2.transition('green')));
    it2('green still green',     t => t.is("green",  light2.state()));

    it2('green accepts yellow',  t => t.is(true,     light2.transition('yellow')));
    it2('green now yellow',      t => t.is("yellow", light2.state()));
    it2('yellow refuses green',  t => t.is(false,    light2.transition('green')));
    it2('yellow still yellow',   t => t.is("yellow", light2.state()));
    it2('yellow refuses yellow', t => t.is(false,    light2.transition('yellow')));
    it2('yellow still yellow',   t => t.is("yellow", light2.state()));

    it2('yellow accepts red',    t => t.is(true,     light2.transition('red')));
    it2('back to red',           t => t.is("red",    light2.state()));

    it2('proceed is true',       t => t.is(true,     light2.action('proceed')));
    it2('light is now green',    t => t.is("green",  light2.state()));

  });

});





describe('list exit actions', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { from:'off', to:'red', action:'on' }, { from:'red', to:'off',action:'off' } ]
  });

  it('shows "on" from off as default', t => t.is('on',  machine.list_exit_actions()[0]      ) );
  it('shows "on" from off',            t => t.is('on',  machine.list_exit_actions('off')[0] ) );
  it('shows "off" from red',           t => t.is('off', machine.list_exit_actions('red')[0] ) );

});





describe('probable exits for', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { from:'off', to:'red' } ]
  });

  it('probable exits are an array',       t => t.is(true,     Array.isArray(machine.probable_exits_for('off')) ) );
  it('one probable exit in example',      t => t.is(1,        machine.probable_exits_for('off').length         ) );
  it('exit is an object',                 t => t.is('object', typeof machine.probable_exits_for('off')[0]      ) );
  it('exit 0 has a string from property', t => t.is('string', typeof machine.probable_exits_for('off')[0].from ) );

});





describe('probable action exits', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { from:'off', to:'red', action:'on' }, { from:'red', to:'off',action:'off' } ]
  });

  it('probable action exits are an array', t => t.is(true,  Array.isArray(machine.probable_action_exits())      ) );
  it('probable action exit 1 is on',       t => t.is('on',  machine.probable_action_exits()[0].action           ) );

  it('probable action exits are an array', t => t.is(true,  Array.isArray(machine.probable_action_exits('off')) ) );
  it('probable action exit 1 is on',       t => t.is('on',  machine.probable_action_exits('off')[0].action      ) );

  it('probable action exits are an array', t => t.is(true,  Array.isArray(machine.probable_action_exits('red')) ) );
  it('probable action exit 1 is on',       t => t.is('off', machine.probable_action_exits('red')[0].action      ) );

});





describe('probabilistic_transition', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { from:'off', to:'red' } ]
  });

  machine.probabilistic_transition();

  it('solo after probabilistic is red', t => t.is('red', machine.state() ) );

});





describe('probabilistic_walk', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { from:'off', to:'red' }, { from:'red', to:'off' } ]
  });

  machine.probabilistic_walk(3);

  it('solo after probabilistic walk 3 is red', t => t.is('red', machine.state() ) );

});





describe('probabilistic_histo_walk', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { from:'off', to:'red' }, { from:'red', to:'off' } ]
  });

  const histo = machine.probabilistic_histo_walk(3);

  it('histo is a Map', t => t.is(true, histo instanceof Map) );
  it('histo red is 2', t => t.is(2,    histo.get('red'))     );
  it('histo off is 2', t => t.is(2,    histo.get('off'))     );

});





describe('reports state_is_final', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[
      { from:'off', to:'red' },
      { from:'off', to:'mid' },
      { from:'mid', to:'fin' }
    ],
    complete:['red', 'mid']
  });

  it('final false for neither',       t => t.is(false, machine.state_is_final('off') ) );
  it('final false for just terminal', t => t.is(false, machine.state_is_final('mid') ) );
  it('final false for just complete', t => t.is(false, machine.state_is_final('fin') ) );
  it('final true',                    t => t.is(true,  machine.state_is_final('red') ) );

});





describe('reports is_final', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[
      { from:'off', to:'red' }
    ],
    complete:['red']
  });

  const init_final = machine.is_final();
  machine.transition('red');
  const fin_final  = machine.is_final();

  it('final false', t => t.is(false, init_final ) );
  it('final true',  t => t.is(true,  fin_final  ) );

  /* todo whargarbl needs another two tests for is_changing once reintroduced */

});





describe('reports state_is_terminal', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });

  it('terminal false', t => t.is(false, machine.state_is_terminal('off') ) );
  it('terminal true',  t => t.is(true,  machine.state_is_terminal('red') ) );

});





describe('reports is_terminal', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });

  const first  = machine.is_terminal();
  machine.transition('red');
  const second = machine.is_terminal();

  const terms  = machine.has_terminals();

  it('terminal false', t => t.is( false, first  ) );
  it('terminal true',  t => t.is( true,  second ) );
  it('has_terminals',  t => t.is( true,  terms  ) );

});





describe('reports state_is_complete', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ],
    complete:['off'] // huhu
  });

  it('state_is_complete false', t => t.is( true,  machine.state_is_complete('off') ) );
  it('state_is_complete true',  t => t.is( false, machine.state_is_complete('red') ) );

});





describe('reports is_complete', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ],
    complete:['off'] // huhu
  });

  const first  = machine.is_complete();
  machine.transition('red');
  const second = machine.is_complete();

  const terms  = machine.has_completes();

  it('is_complete false', t => t.is( true,  first  ) );
  it('is_complete true',  t => t.is( false, second ) );
  it('has_completes',     t => t.is( true,  terms  ) );

});





describe('reports on actions', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });

  const a = machine.list_actions();  // todo comeback

  it('that it has',           t => t.is('number',    typeof machine.current_action_for('power_on')   ) );
  it('that it doesn\'t have', t => t.is('undefined', typeof machine.current_action_for('power_left') ) );
  it('correct list type',     t => t.is(true,        Array.isArray(a)                                ) );
  it('correct list size',     t => t.is(1,           a.length                                        ) );

});





describe('actions', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { from:'off', to:'red', action:'on' }, { from:'red', to:'off',action:'off' } ]
  });

  it('red has actions().length 1', t => t.is(1,     machine.actions().length      ) );
  it('red has actions()[0] "on"',  t => t.is('on',  machine.actions()[0]          ) );

  it('red has actions().length 1', t => t.is(1,     machine.actions('off').length ) );
  it('red has actions()[0] "on"',  t => t.is('on',  machine.actions('off')[0]     ) );

  it('red has actions().length 1', t => t.is(1,     machine.actions('red').length ) );
  it('red has actions()[0] "off"', t => t.is('off', machine.actions('red')[0]     ) );

});





describe('states having action', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { from:'off', to:'red', action:'on' }, { from:'red', to:'off',action:'off' } ]
  });

  it('one action has on', t => t.is(1,     machine.list_states_having_action('on').length ) );
  it('on is had by off',  t => t.is('off', machine.list_states_having_action('on')[0]     ) );

});





describe('unenterables', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });

  it('off isn\'t enterable',     t => t.is(true,  machine.is_unenterable('off') ) );
  it('red is enterable',         t => t.is(false, machine.is_unenterable('red') ) );
  it('machine has unenterables', t => t.is(true,  machine.has_unenterables()    ) );

});





describe('reports on action edges', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });

  it('that it has',           t => t.is('object', typeof machine.current_action_edge_for('power_on')) );
  it('that it doesn\'t have', t => t.throws(() => { machine.current_action_edge_for('power_west'); }) );

});





describe('reports on states', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });

  it('that it has', t => t.is('object', typeof machine.state_for('off') ) );

  it('that it doesn\'t have', t => t.throws(() => { machine.state_for('no such state'); }) );

});





describe('returns states', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });

  it('that it has', t => t.is('object', typeof machine.machine_state() ) );

});





describe('reports on transitions', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });


  it('unspecified transition return type',            t => t.is('object', typeof machine.list_transitions()                 ) );
  it('unspecified transition correct entrance count', t => t.is(0,        machine.list_transitions().entrances.length       ) );
  it('unspecified transition correct exit count',     t => t.is(1,        machine.list_transitions().exits.length           ) );

  it('specified transition return type',              t => t.is('object', typeof machine.list_transitions('off')            ) );
  it('specified transition correct entrance count',   t => t.is(0,        machine.list_transitions('off').entrances.length  ) );
  it('specified transition correct exit count',       t => t.is(1,        machine.list_transitions('off').exits.length      ) );

  it('no such spec trans return type',                t => t.is('object', typeof machine.list_transitions('moot')           ) );
  it('no such spec trans correct entrance count',     t => t.is(0,        machine.list_transitions('moot').entrances.length ) );
  it('no such spec trans correct exit count',         t => t.is(0,        machine.list_transitions('moot').exits.length     ) );


  it('unspecified entrance return type',              t => t.is(true,     Array.isArray( machine.list_entrances() )        ) );
  it('unspecified entrance correct count',            t => t.is(0,        machine.list_entrances().length                  ) );

  it('specified entrance return type',                t => t.is(true,     Array.isArray( machine.list_entrances('off') )   ) );
  it('specified entrance correct count',              t => t.is(0,        machine.list_entrances('off').length             ) );

  it('no such specified entrance return type',        t => t.is(true,     Array.isArray( machine.list_entrances('moot') )  ) ); // todo whargarbl should these throw?
  it('no such specified entrance correct count',      t => t.is(0,        machine.list_entrances('moot').length            ) );


  it('unspecified exit return type',                  t => t.is(true,     Array.isArray( machine.list_exits() )            ) );
  it('unspecified exit correct count',                t => t.is(1,        machine.list_exits().length                      ) );

  it('specified exit return type',                    t => t.is(true,     Array.isArray( machine.list_exits('off') )       ) );
  it('specified exit correct count',                  t => t.is(1,        machine.list_exits('off').length                 ) );

  it('no such specified exit return type',            t => t.is(true,     Array.isArray( machine.list_exits('moot') )      ) );
  it('no such specified exit correct count',          t => t.is(0,        machine.list_exits('moot').length                ) );


  it('edge list return type',                         t => t.is(true,     Array.isArray( machine.list_edges() )            ) );
  it('edge list correct count',                       t => t.is(1,        machine.list_edges().length                      ) );

});





describe('transition by state names', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });

  it('finds off -> red',          t => t.is(0,         machine.get_transition_by_state_names('off', 'red')  ) );
  it('does not find off -> blue', t => t.is(undefined, machine.get_transition_by_state_names('off', 'blue') ) );
  it('does not find blue -> red', t => t.is(undefined, machine.get_transition_by_state_names('blue', 'red') ) );

});





describe('Illegal machines', async it => {


  it('catch repeated names', t => t.throws(() => {

    new jssm.machine({
      initial_state: 'moot',
      transitions:[
        { name:'identical', from:'1', to:'2' },
        { name:'identical', from:'2', to:'3' }
      ]
    });

  }, Error));


  it('must define from', t => t.throws(() => {

    new jssm.machine({
      initial_state: 'moot',
      transitions:[
        { name:'identical', to:'2' }
      ]
    });

  }, Error));


  it('must define to', t => t.throws(() => {

    new jssm.machine({
      initial_state: 'moot',
      transitions:[
        { name:'identical', from:'1' }
      ]
    });

  }, Error));


  it('must not have two identical edges', t => t.throws(() => {

    new jssm.machine({
      initial_state: 'moot',
      transitions:[
        { name:'id1', from:'1', to:'2' },
        { name:'id2', from:'1', to:'2' }
      ]
    });

  }, Error));


  it('must not have two of the same action from the same source', t => t.throws(() => {

    new jssm.machine({
      initial_state: 'moot',
      transitions:[
        { name:'id1', from:'1', to:'2', action:'identical' },
        { name:'id2', from:'1', to:'3', action:'identical' }
      ]
    });

  }, Error));


  it('must not have completion of non-state', t => t.throws(() => {

    const machine = new jssm.machine({
      initial_state: 'moot',
      transitions:[
        { name:'id1', from:'1', to:'2', action:'identical' }
      ]
    });

    machine.is_complete('no such state');

  }, Error));


  it('internal state helper must not accept double states', t => t.throws(() => {

    const machine = new jssm.machine({
      initial_state: 'moot',
      transitions:[
        { name:'id1', from:'1', to:'2', action:'identical' }
      ]
    });

    machine._new_state({from: '1', name:'id1', to:'2', complete:false});
    machine._new_state({from: '1', name:'id1', to:'2', complete:false});

  }, Error));


  it('can\'t get actions of non-state', t => t.throws(() => {

    const machine = new jssm.machine({
      initial_state: '1',
      transitions:[
        { name:'id1', from:'1', to:'2', action:'identical' }
      ]
    });

    machine.actions('three');

  }, Error));


  it('can\'t get states having non-action', t => t.throws(() => {

    const machine = new jssm.machine({
      initial_state: '1',
      transitions:[
        { name:'id1', from:'1', to:'2', action:'identical' }
      ]
    });

    machine.list_states_having_action('no such action');

  }, Error));


  it('can\'t list exit states of non-action', t => t.throws(() => {

    const machine = new jssm.machine({
      initial_state: '1',
      transitions:[
        { name:'id1', from:'1', to:'2', action:'identical' }
      ]
    });

    machine.list_exit_actions('no such action');

  }, Error));


  it('probable exits for throws on non-state', t => t.throws(() => {

    const machine = new jssm.machine({
      initial_state: '1',
      transitions:[
        { name:'id1', from:'1', to:'2', action:'identical' }
      ]
    });

    machine.probable_exits_for('3');

  }, Error));

test(t => {
  t.pass();
});

  it('no probable action exits of non-action', t => t.throws(() => {

    const machine = new jssm.machine({
      initial_state: '1',
      transitions:[
        { name:'id1', from:'1', to:'2', action:'identical' }
      ]
    });

    machine.probable_action_exits('no such action');

  }, Error));

});
