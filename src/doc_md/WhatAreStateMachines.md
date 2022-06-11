# What are Finite State Machines?

`Finite State Machine`s are a classic tool from the 1950s, meant to allow a
system to be better defined.  In formal and high safety systems they are a
critical tool.  FSL, the `Finite State Language`, exists to make them easier to
write, debug, and maintain.

Most likely, you're already pretty familiar with a lot of state machines.  On
those grounds, we teach state machines by example.



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



&nbsp;

&nbsp;

## The traffic light

The traffic light is maybe the smallest useful state machine.  It's three states
(or four if you count `Off`,) and there's a good reason for it to be there: it's
important that a traffic light doesn't "go backwards."

Traffic lights are directional in several ways.  The important one is color: a
traffic light that's `Yellow` must next go to `Red`.  If the wrong thing
happens, and the light goes from `Yellow` to `Green` instead, an accident might
happen.  People could die.

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
```

And that is a rudimentary state machine.

Of course, we're in a state machine programming language and library whose
design is meant to make them simple, so, we'd write this, instead:

```typescript
const TrafficLight = sm`
  Off -> Red -> Green -> Yellow -> Red;
  [Red Yellow Green] -> Off;
`;

TrafficLight.transition('Red');
```

And for purposes of the tutorial, we'll just focus on the language part:

```typescript
Off -> Red -> Green -> Yellow -> Red;
[Red Yellow Green] -> Off;
```

What's important here is that we've taught the machine light color order.  If
it's in `Yellow`, it knows that it isn't allowed to go to `Green`, and if you
tell it to do that, it'll refuse.

This is, roughly, the value of type systems, check constraints, proof systems,
some kinds of constraint programming, and arguably of testing and even linting:
teaching the machine what wrong is, so that it can support you.

State machines are an extremely powerful tool for machine auditing and machine
self-diagnosis.  They can also, however, be supportive and convenient.  By
example, the previous state machine requires a user to know what color it's
currently in to proceed.  This seems undesirable.  Let's teach it to accept an
instruction `next` to proeed to whatever the next correct color is:


```typescript
Off -> Red;
Red 'next' -> Green 'next' -> Yellow 'next' -> Red;
[Red Yellow Green] -> Off;
```

We didn't have to break off the opening `Off -> Red` that way; the author just
thinks it's cleaner looking (indeed, this machine can be a one-liner if you
don't much care about readability.)

Now, we can interact with the machine as such:

```typescript
TrafficLight.action('next');
```