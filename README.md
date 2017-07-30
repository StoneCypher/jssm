# jssm
A Javascript state machine with a simple API.  Well tested, and typed with Flowtype.  MIT license.

<div id="badge_style_hook">

[![License](https://img.shields.io/npm/l/jssm.svg)](https://img.shields.io/npm/l/jssm.svg)
[![Open issues](https://img.shields.io/github/issues/StoneCypher/jssm.svg)](https://img.shields.io/github/issues/StoneCypher/jssm.svg)
[![Closed issues](https://img.shields.io/github/issues-closed/StoneCypher/jssm.svg)](https://img.shields.io/github/issues-closed/StoneCypher/jssm.svg)

[![Dependency status](https://david-dm.org/StoneCypher/jssm/status.svg)](https://david-dm.org/StoneCypher/jssm)
[![NSP status](https://nodesecurity.io/orgs/johns-oss/projects/f479470f-fc0a-4e7e-a250-d69cb3778601/badge)](https://nodesecurity.io/orgs/johns-oss/projects/f479470f-fc0a-4e7e-a250-d69cb3778601)
[![Travis status](https://img.shields.io/travis/StoneCypher/jssm.svg)](https://img.shields.io/travis/StoneCypher/jssm.svg)
[![Coveralls status](https://img.shields.io/coveralls/StoneCypher/jssm.svg)](https://img.shields.io/coveralls/StoneCypher/jssm.svg)
[![CodeClimate status](https://img.shields.io/codeclimate/github/StoneCypher/jssm.svg)](https://img.shields.io/codeclimate/github/StoneCypher/jssm.svg)

[![NPM version](https://img.shields.io/npm/v/jssm.svg)](https://img.shields.io/npm/v/jssm.svg)
[![CDNjs version](https://img.shields.io/cdnjs/v/jquery.svg)](https://img.shields.io/cdnjs/v/jquery.svg)
[![NPM downloads](https://img.shields.io/npm/dt/jssm.svg)](https://img.shields.io/npm/dt/jssm.svg)

[![Commits since](https://img.shields.io/github/commits-since/StoneCypher/jssm/0.0.0.svg)](https://img.shields.io/github/commits-since/StoneCypher/jssm/0.0.0.svg)

</div>

## TL;DR
Specify finite state machines with a brief syntax.  Run them.  Derive charts from them.  Save and load states.  Make factories.  Impress friends and loved ones.  Cure corns and callouses.

```javascript
const traffic_light = new jssm.machine({

  initial_state : 'Red',

  transitions   : [
    { action: 'Proceed', from:'Green',  to:'Yellow' },
    { action: 'Proceed', from:'Yellow', to:'Red'    },
    { action: 'Proceed', from:'Red',    to:'Green'  }
  ]

});

// use with actions
traffic_light.state();              // 'Red'
traffic_light.action('Proceed');    // true
traffic_light.state();              // 'Green'
traffic_light.action('Proceed');    // true
traffic_light.state();              // 'Yellow'
traffic_light.action('Proceed');    // true
traffic_light.state();              // 'Red'

// use with transitions
traffic_light.transition('Yellow'); // false (lights can't go from red to yellow, only to green)
traffic_light.state();              // 'Red'
traffic_light.transition('Red');    // false (lights can't go from red to red, either)
traffic_light.state();              // 'Red'
traffic_light.transition('Green');  // true
traffic_light.state();              // 'Green'
```

Which you can see being hand-executed in the console here:

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/ryg%20traffic%20light%20console%20screenshot.png)



<br/><br/>

## Quick Start
## Why
## How To
## Notation Comparison
### Their notations, one by one
### Apples to Apples - Traffic Light

## Other state machines
There are a lot of state machine impls for JS, many quite a bit more mature than this one.  Here are some options:

1. [Finity](https://github.com/nickuraltsev/finity) 😮
1. [Stately.js](https://github.com/fschaefer/Stately.js)
1. [machina.js](https://github.com/ifandelse/machina.js)
1. [Pastafarian](https://github.com/orbitbot/pastafarian)
1. [Henderson](https://github.com/orbitbot/henderson)
1. [fsm-as-promised](https://github.com/vstirbu/fsm-as-promised)
1. [state-machine](https://github.com/DEADB17/state-machine)
1. [mood](https://github.com/bredele/mood)
1. [FSM Workbench](https://github.com/MatthewHepburn/FSM-Workbench)
1. [SimpleStateMachine](https://github.com/ccnokes/SimpleStateMachine)
1. shime/[micro-machine](https://github.com/shime/micro-machine)
    1. soveran/[micromachine](https://github.com/soveran/micromachine) (ruby)
1. fabiospampinato/[FSM](https://github.com/fabiospampinato/FSM)
1. HQarroum/[FSM](https://github.com/HQarroum/Fsm)
1. [Finite-State-Automata](https://github.com/RolandR/Finite-State-Automata)
1. [finite-state-machine](https://github.com/MarkH817/finite-state-machine)
1. [nfm](https://github.com/ajauhri/nfm)


And some similar stuff:
1. [redux-machine](https://github.com/mheiber/redux-machine)
1. [ember-fsm](https://github.com/heycarsten/ember-fsm)
1. [State machine cat](https://github.com/sverweij/state-machine-cat)
1. [Workty](https://github.com/AlexLevshin/workty) 😮
1. [sam-simpler](https://github.com/sladiri/sam-simpler)
1. [event_chain](https://github.com/quilin/event_chain)
1. [DRAKON](https://en.wikipedia.org/wiki/DRAKON)
1. [Yakindu Statechart Tools](https://github.com/Yakindu/statecharts)
1. [GraphViz](http://www.graphviz.org/)
    1. [Viz.js](https://github.com/mdaines/viz.js/), which we use
