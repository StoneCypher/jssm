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