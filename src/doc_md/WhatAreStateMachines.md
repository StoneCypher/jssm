# What are Finite State Machines?

Support tools are important to keeping software running correctly.  As
programmers move from small software to medium software, they often find that
teaching the computer more about what's going on, so that the computer can
meaningfully argue, is a productive strategy.

`Type system`s are an obvious example - if you have a variable meant to store a
number, and accidentally attempt to assign some text to it, it is useful for
your programming lanugage or environment to be able to discover and announce the
mistake.  `Check constraint`s, `foreign key`s, `spec`s, and `unit test`s are
other examples of teaching the computer to say "no."

`Finite State Machine`s are a very powerful mechanism for teaching the computer
what's actually happening.  They represent something as a collection of `states`
(finite because you predefine which ones exist,) then define which states may
turn into which other states.  Most of the value of a `state machine` comes from
this modelling, and from refusing inappropriate transitions.

`Finite State Machine`s are a classic tool from the 1950s, meant to allow a
system to be better defined.  In formal and high safety systems they are a
critical tool.  FSL, the `Finite State Language`, exists to make them easier to
write, debug, and maintain.

Most likely, you're already pretty familiar with a lot of state machines -
light switches, traffic lights, microwaves, and so forth.  On those grounds, we
teach state machines by example.




&nbsp;

&nbsp;

## The light switch

An easy starting example is the idealized light switch: it's either turned `On`,
or turned `Off`.  When the switch is `On`, it can be turned `Off`, but when it's
`On`, it can't be turned `On` *again*; the rules are similar for `Off`.

In FSL, we write states as just their names, and then connections as arrows
`->`; as such, we would write a light switch this way:

```fsl
On -> Off -> On;
```

Or, to save time, we can use a double-sided arrow `<->`:

```fsl
On <-> Off;
```

It might also be reasonable to say that to `toggle` is to switch from either
state to the other, without needing to know ahead of time.  We call that an
`action`, and write it in single quotes `'`, inbetween the state and the
relevant arrow.

```fsl
On 'toggle' -> Off 'toggle' -> On;
```

The placement of the action on double-sided arrows matches the arrow itself:

```fsl
On 'toggle' <-> 'toggle' Off;
```

And were we to graph this, it might look like so:

![](./SimpleLightSwitch.png)

But, a light switch is hardly convincing, or much worth paying attention to.
There isn't a whole lot of value here, except for showing notation.





&nbsp;

&nbsp;

## The traffic light

The traffic light is maybe the smallest useful state machine.  It's three states
(or four if you count `Off`,) and there's a good reason for it to be there: it's
important that a traffic light doesn't "go backwards."

Traffic lights are directional in several ways.  The important one is color: a
traffic light that's `Yellow` must next go to `Red`.  ***If the wrong thing
happens, and the light goes from `Yellow` to `Green` instead, an accident might
happen***.  People could die.

In code, you'd need to do something like this:

```typescript
const allowed = {
  'green'  : ['yellow', 'off'],
  'yellow' : ['red', 'off'],
  'red'    : ['green', 'off'],
  'off'    : ['red']
};

let state = 'off';

function switch_to(next) {

  if (allowed[state].includes(next)) {
    state = next;
    return true;
  } else {
    return false;
  }

}

switch_to('red');
switch_to('green');
switch_to('yellow');
switch_to('red');
```

And that is a rudimentary state machine.





&nbsp;

&nbsp;

## Doing it in FSL

Of course, we're in a state machine programming language and library whose
design is meant to make them simple, so, we'd write this, instead:

```typescript
const TrafficLight = sm`
  Off -> Red -> Green -> Yellow -> Red;
  [Red Yellow Green] -> Off;
`;

TrafficLight.go('Red');
TrafficLight.go('Green');
TrafficLight.go('Yellow');
TrafficLight.go('Red');
```

It's implied that, unless you say otherwise, the first mentioned state is the
state the machine starts in, so, this traffic light starts in `Off`.

For purposes of the tutorial, we'll just focus on the language part:

```fsl
Off -> Red -> Green -> Yellow -> Red;
[Red Yellow Green] -> Off;
```

What's important here is that we've taught the machine light color order.  If
it's in `Yellow`, it knows that it isn't allowed to go to `Green`, and if you
tell it to do that, it'll refuse.

This is, roughly, the value of type systems, check constraints, proof systems,
some kinds of constraint programming, and arguably of testing and even linting:
teaching the machine what wrong is, so that it can support you.





&nbsp;

&nbsp;

## Making life easier.

State machines are an extremely powerful tool for machine auditing and machine
self-diagnosis.

They can also, however, be supportive and convenient.  By example, the previous
version of our traffic light state machine requires a user to know what color
it's currently in, in order to proceed.

This seems undesirable.  Less thinking is better.

Let's teach our machine to accept an instruction `next` to proeed to whatever
the correct successor color is:


```fsl
Off 'enable' -> Red;
Red 'next' -> Green 'next' -> Yellow 'next' -> Red;
[Red Yellow Green] 'disable' -> Off;
```

We didn't have to break off the opening `Off -> Red` that way; the author just
thinks it's cleaner looking (indeed, this machine can be a one-liner if you
don't much care about readability.)

Now, we can interact with the machine in this easier way:

```typescript
TrafficLight.do('enable');  // to red
TrafficLight.do('next');    // to green
TrafficLight.do('next');    // to yellow
TrafficLight.do('next');    // to red
```



&nbsp;

&nbsp;

## More simple machines

And, already, a bunch of other simple machines are accessable.  Some examples:

&nbsp;

### Three brightness lamp

Three brightness lamp is pretty similar to a traffic light, except that `Off` is
part of the main loop instead of an extra state:

```fsl
Off 'touch' -> Bright 'touch' -> Medium 'touch' -> Dim 'touch' -> Off;
```

![](lamp_machine.png)

&nbsp;

### Locking door

A locking door, by contrast, might have a state for `Unlocked` which responds to
`open` by switching to `Opened`, but a state `Locked` which responds to `open`
by going to itself (or perhaps just not expressing the action at all.)

```fsl
Opened 'close' <-> 'open' Closed 'lock' <-> 'unlock' Locked;
Locked 'open' -> Locked;
```

![](locked_door_machine.png)

&nbsp;

### States of matter

The basic four states of matter on Earth:

```fsl
 Solid      'melt' <-> 'freeze'    Liquid;
Liquid  'vaporize' <-> 'condense'  Gas;
   Gas    'ionize' <-> 'recombine' Plasma;
 Solid 'sublimate' <-> 'deposit'   Gas;
```

![](basic_matter_machine.png)
