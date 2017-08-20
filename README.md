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

</div>

## TL;DR
Specify finite state machines with a brief syntax.  Run them.  Derive charts from them.  Save and load states.  Make factories.  Impress friends and loved ones.  Cure corns and callouses.

```javascript
const traffic_light = sm`
  Red 'Proceed' -> Green 'Proceed' -> Yellow 'Proceed' -> Red;
`;
```

This will produce the following FSM (graphed with [jssm-viz](https://github.com/StoneCypher/jssm-viz)):

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/ryg%20proceed.png)

You could also write that as a piece of data, for when you're generating.  That's ... a bit more verbose.

```javascript
const traffic_light = new jssm.machine({

  initial_state : 'Red',

  transitions   : [
    { action: 'Proceed', from:'Green',  to:'Yellow' },
    { action: 'Proceed', from:'Yellow', to:'Red'    },
    { action: 'Proceed', from:'Red',    to:'Green'  }
  ]

});
```

In either case, you'll build an executable state machine.

```javascript
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

Which you can see being hand-executed in the Chrome console here:

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/ryg%20traffic%20light%20console%20screenshot.png)



<br/><br/>

## Why

As usual, a valid question.

### Why state machines

State machines are a method of making your software better able to prevent illegal states.  Similar to type systems, SQL
constraints, and linters, state machines are a way to teach the software to catch mistakes in ways you define, to help
lead to better software.

The major mechanism of a state machine is to define `states`, the `transitions` between them, and sometimes associated
`data` and other niceties.  The minor mechanism of state machines is to attach `actions` to the transitions, such that
the state machine can partially run itself.

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/ryg%20proceed.png)

So, to look at the same traffic light as above, you'll notice some things.

1. A sufficiently smart implementation will know that it's okay for `Green` to switch to `Yellow`, but not to `Red`
1. A sufficiently smart implementation knows there's no such thing as `Blue`
1. A sufficiently smart implementation knows that when in `Green`, to be told to `Proceed` means to go to `Yellow`, but
   when in `Yellow`, it means to go to `Red` instead

Along with other common sense things, a good state machine implementation can help eliminate large classes of error in
software.  State machines are often applied when the stakes on having things correct are high.

### Why this implementation

Brevity.

High quality testing.  JSSM has 100% coverage, and has partial stochastic test coverage.

Feature parity, especially around the DSL and data control.

Data integrity.  JSSM allows a much stricter form of state machine than is common, with a relatively low performance
and storage overhead.  It also offers an extremely terse domain specific language (though it does not require said DSL)
to produce state machines in otherwise comparatively tiny and easily read code.



## Quick Start

A state machine in `JSSM` is defined in one of two ways: through the DSL, or through a datastructure.

In the quick start, we'll use the DSL.  It looks like this:

```javascript
const example = sm` FirstState -> SecondState -> ThirdState; `;
```

There are two pieces of code there, really.  There's the outside javascript, which invokes the library and sets up the
state machine's instance variable:

```javascript
const example = sm` ... `;
```

And there's the domain-specific language, which creates the actual state machine.

```jssm
FirstState -> SecondState -> ThirdState;
```

### Terminology

## Features
### DSL
### States
### Transitions
#### Legal, main, and forced
### Validators
### State history
### Automatic visualization

## How to think in state machines

## Example Machines
### Door lock
### Traffic lights
#### Basic three-state
#### RYG, Off, Flash-red, Flash-yellow
#### RYG, Off, Flash-red, Flash-yellow, Green-left, Yellow-left
#### Heirarchal intersection
### [ATM](https://people.engr.ncsu.edu/efg/210/s99/Notes/fsm/atm.gif)
### [HTTP](https://www.w3.org/Library/User/Architecture/HTTP.gif)
#### Better HTTP
### [TCP](http://www.texample.net/media/tikz/examples/PNG/tcp-state-machine.png)
### Coin-op vending machine (data)
### Video games
#### Pac-man Ghost (sensors)
#### Weather (probabilistics)
#### Roguelike monster (interface satisfaction)
### Candy crush clone game flow (practical large use)
### React SPA website (practical large use)
### [BGP](https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/BGP_FSM.svg/549px-BGP_FSM.svg.png)
### [LibGCrypt FIPS mode FSM](https://www.gnupg.org/documentation/manuals/gcrypt/fips-fsm.png)

## How to debug

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
