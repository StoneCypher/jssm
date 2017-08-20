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
Specify finite state machines with a brief syntax.  Run them; they're fast.  Derive charts.  Save and load states, and
histories.  Make machine factories to churn out dozens or thousands of instances.  Impress friends and loved ones.  Cure corns and callouses.

```javascript
const traffic_light = sm`
  Red 'Proceed' -> Green 'Proceed' -> Yellow 'Proceed' -> Red;
`;
```

This will produce the following FSM (graphed with [jssm-viz](https://github.com/StoneCypher/jssm-viz)):

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/ryg%20proceed.png)

You'll build an executable state machine.

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

> A state machine in `JSSM` is defined in one of two ways: through the DSL, or through a datastructure.

So yeah, let's start by getting some terminology out of the way, and then we can go right back to that impenetrable
sentence, so that it'll make sense.

### Quick Terminology

Finite state machines have been around forever, are used by everyone, and are hugely important.  As a result, the
terminology is a mess, is in conflict, and is very poorly chosen, in accordince with everything-is-horrible law.

This section describes the terminology *as used by this library*.  The author has done his best to choose a terminology
that matches common use and will be familiar to most.  Conflicts are explained in the following section, to keep this
simple.

For this quick overview, we'll define six basic concepts:

1. `Finite state machine`s
1. `Machine`s
1. `State`s
1. `Current state`
1. `Transition`s
1. `Action`s

There's other stuff, of course, but these five are enough to wrap your head around `finite state machine`s.

#### Basic concepts

This is a trivial traffic light `FSM`, with three states, three transitions, and one action:

```jssm
Red 'Proceed' -> Green 'Proceed' -> Yellow 'Proceed' -> Red;
```

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/ryg proceed.png)

Let's review its pieces.

* `finite state machine`s
  * A `finite state machine` (or `FSM`) is a collection of `state`s, and rules about how you can `transition` between
    the `state`s.
  * We tend to refer to a design for a machine as "an `FSM`."
  * In this example, the traffic light's structure is "a traffic light `FSM`."

* `state`s
  * `FSM`s always have at least one `state`, and nearly always many `state`s
  * In this example,
    * the `state`s are *Red*, *Yellow*, and *Green*
    * Something made from this `FSM` will only ever be one of those colors - not, say, *Blue*

* `machine`s
  * Single instances of an `FSM` are referred to as a `machine`
  * We might have a thousand instances of the traffic light designed above
  * We would say "My intersection has four `machines` of the standard three color light `FSM`."

* `current state`
  * A `machine` has a `current state`, though an `FSM` does not
    * "This specific traffic light is currently *Red*"
  * Traffic lights in general do not have a current color, only specific lights
  * `FSM`s do not have a current state, only specific `machine`s
  * A given `machine` will always have exactly one `state` - never multiple, never none

* `transitions`
  * `FSM`s nearly always have `transition`s
  * Transitions govern whether a `state` may be reached from another `state`
    * This restriction is much of the value of `FSM`s
  * In this example,
    * the `transition`s are
      * *Green* &rarr; *Yellow*
      * *Yellow* &rarr; *Red*
      * *Red* &rarr; *Green*
    * a `machine` whose `current state` is *Green* may switch to *Yellow*, because there is an appropriate transition
    * a `machine` whose `current state` is *Green* may not switch to *Red*, or to *Green* anew, because there is no
      such transition
      * A `machine` in *Yellow* which is told to `transition` to *Green* (which isn't legal) will know to refuse
      * This makes `FSM`s an effective tool for error prevention

* `actions`
  * Many `FSM`s have `action`s, which represent events from the outside world.
  * In this example, there is only one action - *Proceed*
    * The `action` *Proceed* is available from all three colors
  * At any time we may indicate to this light to go to its next color, without
    taking the time to know what it is.
    * This allows `FSM`s like the light to self-manage.
    * A `machine` in *Yellow* which is told to take the `action` *Proceed* will
      know on its own to switch its `current state` to *Red*.
    * This makes `FSM`s an effective tool for complexity reduction

Those six ideas in hand - `FSM`s, `state`s, `machine`s, `current state`, `transition`s, and `action`s - and you're ready
to move forwards.

One other quick definition - a `DSL`, or `domain specific language`, is when someone makes a language and embeds it into
a different language, for the purpose of attacking a specific job.  When `React` uses a precompiler to embed stuff that
looks like HTML in Javascript, that's a DSL.

This library implements a simple language for `defining finite state machine`s inside of strings.  For example, this
`DSL` defines that `'a -> b;'` actually means "create two states, create a transition between them, assign the first as
the initial state", et cetera.  That micro-language is the `DSL` that we'll be referring to a lot, coming up.  This
`DSL`'s formal name is `jssm-dot`, because it's a descendant-in-spirit of an older flowcharting language
[DOT](http://www.graphviz.org/content/dot-language), from [graphviz](graphviz.org), which is also used to make the
visualizations in [jssm-viz](https://github.com/StoneCypher/jssm-viz) by way of [viz-js](viz-js.com).

Enough history lesson.  On with the tooling.

### And now, that Quick Start we were talking about

Let's make a `state machine` for ATMs.  In the process, we will use a lot of core concepts of `finite state machine`s
and of `jssm-dot`, this library's `DSL`.

#### Empty machine

We'll start with an empty machine.

```jssm
EmptyWaiting 'Wait' -> EmptyWaiting;
```

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/atm%20quick%20start%20tutorial/1_EmptyWaiting.png)



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
