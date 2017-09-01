
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('Simple stop light', async it => {

  const trs = [
          { name: 'SwitchToWarn', action: 'Proceed', from:'Green',  to:'Yellow' },
          { name: 'SwitchToHalt', action: 'Proceed', from:'Yellow', to:'Red'    },
          { name: 'SwitchToGo',   action: 'Proceed', from:'Red',    to:'Green'  }
        ],
        light = new jssm.Machine({
          start_states : ['Red'],
          transitions  : trs
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





describe('Complex stop light', async it => {

  const light2 = new jssm.Machine({

    start_states: ['off'],

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
