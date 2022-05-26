# Welcome to JSSM

This is the manual for [JSSM](https://github.com/StoneCypher/jssm/), an advanced
finite state machine for Javascript.

JSSM's goals, in order, are:

1. Extreme correctness
2. Ease of use
3. Very short machines
4. Convenient features
5. High speed

&nbsp;

&nbsp;

## Extreme correctness?

JSSM has more than three thousand tests, and at time of writing has 100%
coverage and more than eleven coverages per line on average.  JSSM also
extensively uses randomized (stochastic / property / fuzz) testing.

&nbsp;

&nbsp;

## Ease of use?

Doesn't even really need an explanation.

```typescript
import { sm } from 'jssm';

const TrafficLight = sm`
  Off 'start' -> Red 'next' => Green 'next' => Yellow 'next' => Red;
  [Red Yellow Green] 'shut down' ~> Off;
`;
```

And now we have a traffic light.  Let's see how easy it is to use.

```
const LogState = () => console.log( TrafficLight.state() );

LogState();                         // logs "Off"

TrafficLight.action('start');       // returns true
LogState();                         // logs "Red"

TrafficLight.action('next');        // returns true
LogState();                         // logs "Green"

TrafficLight.transition('yellow');  // returns true
LogState();                         // logs "Yellow"

TrafficLight.transition('blue');    // returns false, as there's no such state
LogState();                         // logs "Yellow"

TrafficLight.transition('green');   // returns false, as yellow can only go to red
LogState();                         // logs "Yellow"
```

&nbsp;

&nbsp;

## Very short machines?

To make the point, please consider the light switch from our language, as
compared to the example given by a popular alternative library.

&nbsp;

### JSSM

```
const toggler = sm`inactive 'TOGGLE' <=> 'TOGGLE' active;`;
toggler.hook_any_transition( () => console.log( toggler.state() ) );
```

&nbsp;

### The other library

Note that this example is drawn from their documentation, not something we
wrote.

```typescript
const toggleMachine = createMachine({
  id      : 'toggle',
  initial : 'inactive',
  states  : {
    inactive : { on: { TOGGLE: 'active'   } },
    active   : { on: { TOGGLE: 'inactive' } }
  }
});

const toggleService = interpret(toggleMachine)
  .onTransition( (state) => console.log(state.value) )
  .start();
```

&nbsp;

### Is that a fair comparison?

They're both used roughly the same way.

```typescript
toggler.action('TOGGLE');  // logs "active"
```

```typescript
toggleService.send('TOGGLE');  // logs "active"
```

&nbsp;

Given that that's a comparison for just two states, how do you think this might
impact complex machines?

&nbsp;

&nbsp;

## Convenient features

There are lots of state machine libraries out there, but they're not all made
equally.

* Machine data (it's a `Mealy machine`, not just a `Moore machine` like most)
* Typescript support for machine data
* Hooks on states, edges, and many other events
* JS event broadcaster
* Dynamic compiler
* Domain-specific language
* State properties
* Probabilistic edges and random walks
* Live visualizations with styling in a system ready for tens of thousands of states
* Fully transactional, the way you'd expect from real tools like SQL
* Named instances
* State stack traces
* Deep error objects with tons of context information
* High quality debugging tools

But most important?  It's easy to use.

State machines ***don't have to be hard***.

&nbsp;

&nbsp;

## High speed

All these tools don't leave you bleeding out.  The author's i7 from 2018 runs
about 25 million transitions a second.  You probably have an i9 by now.

![](speed%20claim.png)

Compilation is similarly fast: 100,000 compilations of the light switch machine
on the same computer takes only 2.5 seconds.  As such, JSSM is suitable for
dynamic compilation of completely runtime machines, such as those coming from
databases, networks, other tools, or user input.

![](compile%20time%20claim.png)

&nbsp;

Correct.  Easy.  Brief.  Powerful.  Fast.

Meet your new state machine.

{@page GettingStarted.md Let's get started}.
