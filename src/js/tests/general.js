
import {test, describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





test('build-set version number is present', t => t.is(typeof jssm.version, 'string'));

const seq = upTo => new Array(upTo).fill(false).map( (_,i) => i );





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
  trs.map(t => t.name).map(a =>
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





describe('Stochastic weather', async it => {

  const weather = new jssm.machine({

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





describe('reports on actions', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });

  it('that it has',           t => t.is('number',    typeof machine.current_action_for('power_on')   ) );
  it('that it doesn\'t have', t => t.is('undefined', typeof machine.current_action_for('power_left') ) );

});





describe('reports on action edges', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });

  it('that it has',           t => t.is('object',    typeof machine.current_action_edge_for('power_on')   ) );
  it('that it doesn\'t have', t => t.is('undefined', typeof machine.current_action_edge_for('power_left') ) );

});





describe('reports on states', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });

  it('that it has', t => t.is('object', typeof machine.state_for('off') ) );

  it('that it doesn\'t have', t => t.throws(() => { machine.state_for('no such state'); }) );

});





describe('reports on transitions', async it => {

  const machine = new jssm.machine({
    initial_state: 'off',
    transitions:[ { name:'turn_on', action:'power_on', from:'off', to:'red'} ]
  });

  it('return type',            t => t.is('object', typeof machine.list_transitions()           ) );
  it('correct entrance count', t => t.is(0,        machine.list_transitions().entrances.length ) );
  it('correct exit count',     t => t.is(1,        machine.list_transitions().exits.length     ) );

});





describe('Illegal machines', async it => {


  it('catch repeated names', t => t.throws(() => {

    const same_name = new jssm.machine({
      initial_state: 'moot',
      transitions:[
        { name:'identical', from:'1', to:'2' },
        { name:'identical', from:'2', to:'3' }
      ]
    });

  }, Error));


  it('must define from', t => t.throws(() => {

    const same_name = new jssm.machine({
      initial_state: 'moot',
      transitions:[
        { name:'identical', to:'2' }
      ]
    });

  }, Error));


  it('must define to', t => t.throws(() => {

    const same_name = new jssm.machine({
      initial_state: 'moot',
      transitions:[
        { name:'identical', from:'1' }
      ]
    });

  }, Error));


  it('must not have two identical edges', t => t.throws(() => {

    const same_name = new jssm.machine({
      initial_state: 'moot',
      transitions:[
        { name:'id1', from:'1', to:'2' },
        { name:'id2', from:'1', to:'2' }
      ]
    });

  }, Error));


  it('must not have two of the same action from the same source', t => t.throws(() => {

    const same_name = new jssm.machine({
      initial_state: 'moot',
      transitions:[
        { name:'id1', from:'1', to:'2', action:'identical' },
        { name:'id2', from:'1', to:'3', action:'identical' }
      ]
    });

  }, Error));


});
