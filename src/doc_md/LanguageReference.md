# Language Reference

This document is still underway.



&nbsp;

&nbsp;

## Quick start

A machine often looks like this:

```fsl
Red -> Green -> Yellow -> Red;
```

With actions:

```fsl
Red 'next' -> Green 'next' -> Yellow 'next' -> Red;
```

It's honestly actually that easy.  Let's get into the details.

&nbsp;

&nbsp;



## Terminology

Finite state machines are a concept from the 1950s, and though they come from
English, many important devices originated in foreign languages, in math, or in
programming languages, often overlapping, so many terms have competing phrasings
in use.  Let's start by nailing words down.

`FSL` generally has `state`s, `transition`s, `action`s, `data`, and `hook`s.
There are also a million small concepts, but, that's the meat of the matter, and
some subset of that is true of most state machines.

The idea with a finite state machine is simple - {if you're new to FSMs, maybe
read this tutorial first} - but in short, a finite state machine is in exactly
one `state` at any time, from amongst a concrete and permanent list of `state`s,
and there is a list of which `state`s are allowed `transition` to which others.
They may do so because you explicitly said to, or in response to an `action`.
In the process, some `data` being tracked might change (though usually not, it
turns out,) and as a result, some `hook`s might get called, which even might
prevent the change from happening.

Using a traffic light as an example, the four colors the light might be in are
the `state`s (red, yellow, green, and off;) the `action`s are `next color`,
`turn on`, and `turn off`; to `transition` is to switch to another color.  If
your light does things when it switches, like yelling "red light" on switching
to red, it'll do those in `hooks`.  (A traffic light doesn't need `data`.)

In the fashion of a type system or a constraint system, a finite state machine
is a way of giving the computer more context about what's going on, so that it
can refuse changes that aren't correct.  This leads to improved debugging,
easier to understand software, safer execution, and a long list of subtle
benefits.

However, these machines tend to be quite verbose to express, especially if
they're written in language-standard datastructures, to the point that reading
and writing them becomes cumbersome.  `FSL` and `jssm` exist to solve this.

`FSL` is a string-based domain-specific language for finite state machines.

`jssm` is a parser and executing machine for `FSL` language machines.

This document expresses the FSL language in its current state.

<aside>

### New users, old pros

If you're used to finite state machines but coming from another machine,

* `state`s are sometimes called `node`s or `mode`s;
* `transition`s are sometimes called `edge`s or `connection`s;
* `action`s are sometimes called `command`s or `event`s;
* `hook`s are sometimes called `output`s.

<aside>
