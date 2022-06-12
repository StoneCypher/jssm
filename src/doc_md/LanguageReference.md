# Language Reference

This document is still underway.

If you're new to state machines, please read {@page WhatAreStateMachines.md What
Are State Machines} instead.  This document is a tutorial for the language, at
high speed, for people who are already familiar with state machines; a full
tutorial on state machines is over there, instead.



&nbsp;

&nbsp;

## Quick start

`FSL` generally has `state`s, `transition`s, `action`s, `data`, and `hook`s,
plus the various minor concepts.

Write states by their names, separated by arrows.  Chains are valid.  Finish
with a semicolon.

The basic traffic light example looks like this:

```fsl
Red -> Green -> Yellow -> Red;
```

With actions:

```fsl
Red 'next' -> Green 'next' -> Yellow 'next' -> Red;
```

Writing three links to an off state using a list:

```fsl
Red 'next' -> Green 'next' -> Yellow 'next' -> Red;
[Red Yellow Green] 'shut down' -> Off 'start' -> Red;
```

Hooking an edge, a state, and an action:

```typescript
const TL = sm`
  Red 'next' -> Green 'next' -> Yellow 'next' -> Red;
  [Red Yellow Green] 'shut down' -> Off 'start' -> Red;
`;

TL.hook('Red', 'Green', () =>
  console.log('Go go go!'));

TL.hook_entry('Off', () =>
  console.log('Where did the power go?'));

TL.hook_global_action('next', () =>
  console.log('next color now'));
```


It's honestly actually ***that easy***.  Let's get into the details.



&nbsp;

&nbsp;

## Terminology

`FSL` is a string-based domain-specific language for finite state machines.
It's oriented towards brevity, readability, and expressive power.

`jssm` is a parser and executing machine for `FSL` language machines.  It's
oriented towards heavy testing, speed, and ease of installation.

This document expresses the FSL language in its current state.

<aside>

### New users, old pros

If you're used to finite state machines but coming from another machine,

* `state`s are sometimes called `node`s or `mode`s;
* `transition`s are sometimes called `edge`s or `connection`s;
* `action`s are sometimes called `command`s or `event`s;
* `hook`s are sometimes called `output`s;
* `data` is occasionally called `input` or `mealy input`.

<aside>





&nbsp;

&nbsp;

# The basics

Expressing states is implicit.  An FSL user expresses transitions only.

Transitions in the simple form are expressed as the name of two or more states,
with arrows between them, ending in a semicolon.  A traffic light:

```fsl
Red -> Green -> Yellow -> Red;
```
