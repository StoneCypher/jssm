# jssm
A Javascript state machine with a terse DSL and a simple API; the main implementation of FSL.  Well tested, and typed with Flowtype.  MIT license.

<big>[Try it live!](https://stonecypher.github.io/jssm-viz-demo/graph_explorer.html)</big>

Language test cases for Belorussian, English, German, Hebrew, Russian, Spanish, Ukrainian, and Emoji.  Please help make sure your language is well handled!.

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
Specify finite state machines with a brief syntax.  Run them; they're fast.  Make mistakes; they're strict.  Derive
charts.  Save and load states, and histories.  Make machine factories to churn out dozens or thousands of instances.
Impress friends and loved ones.  Cure corns and callouses.

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

```fsl
Red 'Proceed' -> Green 'Proceed' -> Yellow 'Proceed' -> Red;
```

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/ryg%20proceed.png)

Let's review its pieces.

* `finite state machine`s
  * A `finite state machine` (or `FSM`) is a collection of `state`s, and rules about how you can `transition` between
    the `state`s.
  * We tend to refer to a design for a machine as "an `FSM`."
  * In this example, the traffic light's structure is "a traffic light `FSM`."

* `state`s
  * `FSM`s always have at least one `state`, and nearly always many `state`s
  * In this example,
    * the `state`s are **Red**, **Yellow**, and **Green**
    * Something made from this `FSM` will only ever be one of those colors - not, say, **Blue**

* `machine`s
  * Single instances of an `FSM` are referred to as a `machine`
  * We might have a thousand instances of the traffic light designed above
  * We would say "My intersection has four `machines` of the standard three color light `FSM`."

* `current state`
  * A `machine` has a `current state`, though an `FSM` does not
    * "This specific traffic light is currently **Red**"
  * Traffic lights in general do not have a current color, only specific lights
  * `FSM`s do not have a current state, only specific `machine`s
  * A given `machine` will always have exactly one `state` - never multiple, never none

* `transitions`
  * `FSM`s nearly always have `transition`s
  * Transitions govern whether a `state` may be reached from another `state`
    * This restriction is much of the value of `FSM`s
  * In this example,
    * the `transition`s are
      * **Green** &rarr; **Yellow**
      * **Yellow** &rarr; **Red**
      * **Red** &rarr; **Green**
    * a `machine` whose `current state` is **Green** may switch to **Yellow**, because there is an appropriate transition
    * a `machine` whose `current state` is **Green** may not switch to **Red**, or to **Green** anew, because there is no
      such transition
      * A `machine` in **Yellow** which is told to `transition` to **Green** (which isn't legal) will know to refuse
      * This makes `FSM`s an effective tool for error prevention

* `actions`
  * Many `FSM`s have `action`s, which represent events from the outside world.
  * In this example, there is only one action - **Proceed**
    * The `action` **Proceed** is available from all three colors
  * At any time we may indicate to this light to go to its next color, without
    taking the time to know what it is.
    * This allows `FSM`s like the light to self-manage.
    * A `machine` in **Yellow** which is told to take the `action` **Proceed** will
      know on its own to switch its `current state` to **Red**.
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

So let's put together a trivial four-state traffic light: the three colors, plus **Off**.  This will give us an
opportunity to go over the basic facilities in the language.

At any time, you can take the code and put it into the
[graph explorer](https://stonecypher.github.io/jssm-viz-demo/graph_explorer.html) for an opportunity to mess with the
code as you see fit.

#### 0: Lights always have an off state

Our light will start in the **Off** `state`, with the ability to switch to the **Red** `state`.

Since that's a normal, not-notable thing, we'll just make it a regular `-> legal transition`.

```fsl
Off -> Red;
```

We will give that `transition` an `action`, and call it **TurnOn**.

```fsl
Off 'TurnOn' -> Red;
```

So far, our machine is simple:

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/traffic%20light%20quick%20start%20tutorial/Off%20To%20Red.png)



<br/><br/>

#### 1: Traffic lights have a three-color cycle

The main path of a traffic light is cycling from **Green** to **Yellow**, then to **Red**, then back again.  Because
this is the main path, we'll mark these steps `=> main transition`s.

```fsl
Off 'TurnOn' -> Red => Green => Yellow => Red;
```

We will give those all the same action name, **Proceed**, indicating "next color" without needing to know what we're
currently on.

```fsl
Off 'TurnOn' -> Red 'Proceed' => Green 'Proceed' => Yellow 'Proceed' => Red;
```

Machine's still pretty simple:

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/traffic%20light%20quick%20start%20tutorial/Off%20To%20RGY.png)



<br/><br/>

#### 2: Traffic lights can be shut down

We'd also like to be able to turn this light back off.  Because that's expected to be a rarity, we'll require that it
be a `~> forced transition`.

We could write

```fsl
Off 'TurnOn' -> Red 'Proceed' => Green 'Proceed' => Yellow 'Proceed' => Red;
Red ~> Off;
Yellow ~> Off;
Green ~> Off;
```

But that takes a lot of space even with this short list, so, instead we'll use the array notation

```fsl
Off 'TurnOn' -> Red 'Proceed' => Green 'Proceed' => Yellow 'Proceed' => Red;
[Red Yellow Green] ~> Off;
```

And we'd like those all to have the action **TurnOff**, so

```fsl
Off 'TurnOn' -> Red 'Proceed' => Green 'Proceed' => Yellow 'Proceed' => Red;
[Red Yellow Green] 'TurnOff' ~> Off;
```

Machine's still not too bad:

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/traffic%20light%20quick%20start%20tutorial/Off%20To%20From%20RGY.png)

### Let's actually use the traffic light

That's actually the bulk of the language.  There are other little add-ons here and there, but, primarily you now know
how to write a state machine.

Let's load it and use it!  😀

#### loading into node
#### loading into html
#### jssm-viz
#### redistribution on npm



<br/><br/>

### An introduction to machine design

Let's make a `state machine` for ATMs.  In the process, we will use a lot of core concepts of `finite state machine`s
and of `jssm-dot`, this library's `DSL`.

We're going to improve on this [NCSU ATM diagram](https://people.engr.ncsu.edu/efg/210/s99/Notes/fsm/atm.gif) that I
found:

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/atm%20quick%20start%20tutorial/ncsu%20atm%20diagram.gif)

Remember, at any time, you can take the code and put it into the
[graph explorer](https://stonecypher.github.io/jssm-viz-demo/graph_explorer.html) for an opportunity to mess with the
code as you see fit.


<br/><br/>

#### 0: Empty machine

We'll start with an [empty machine](https://github.com/StoneCypher/jssm/blob/master/src/machines/atm%20quick%20start%20tutorial/1_EmptyWaiting.jssm).

```fsl
EmptyWaiting 'Wait' -> EmptyWaiting;
```

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/atm%20quick%20start%20tutorial/0_EmptyWaiting.png)



<br/><br/>

#### 1: Should be able to eject cards

We'll add the ability to physically eject the user's card and reset to the empty and waiting state.  Right now it'll
dangle around un-used at the top, but later it'll become useful.

This is expressed as the path `EjectCardAndReset -> EmptyWaiting;`

```fsl
EmptyWaiting 'Wait' -> EmptyWaiting;
EjectCardAndReset -> EmptyWaiting;
```

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/atm%20quick%20start%20tutorial/1_EjectCard.png)



<br/><br/>

#### 2: Should be able to insert cards

We'll add the ability to physically insert a card, next.  You know, the, uh, thing ATMs are pretty much for.

To get this, add the path leg `EmptyWaiting 'InsertCard' -> HasCardNoAuth;`

```fsl
EmptyWaiting 'Wait' -> EmptyWaiting 'InsertCard' -> HasCardNoAuth;
EjectCardAndReset -> EmptyWaiting;
```

Notice that the new `state`, **HasCardNoAuth**, has been rendered red.  This is because it is `terminal` - there is
no exit from this node currently.  (**EmptyAndWaiting** did not render that way because it had a transition to itself.)
That will change as we go back to adding more nodes.  `terminal node`s are usually either mistakes or the last single
`state` of a given `FSM`.

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/atm%20quick%20start%20tutorial/2_InsertCard.png)



<br/><br/>

#### 3: Should be able to cancel and recover the card

Next, we should have a cancel, because the ATM's <key>7</key> key is broken, and we need our card back.  Cancel will
exit to the main menu, and return our card credential.

To that end, we add the path `HasCardNoAuth 'CancelAuthReturnCard' -> EjectCardAndReset;`

```fsl
EmptyWaiting 'Wait' -> EmptyWaiting 'InsertCard' -> HasCardNoAuth;

HasCardNoAuth 'CancelAuthReturnCard' -> EjectCardAndReset;

EjectCardAndReset -> EmptyWaiting;
```

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/atm%20quick%20start%20tutorial/3_ReturnCard.png)



<br/><br/>

#### 4: Can give the wrong PIN

Next, let's give the ability to get the password ... wrong.  😂  Because we all know that one ATM that only has the
wrong-PIN path, so, apparently that's a product to someone.

When they get the PIN wrong, they're prompted to try again (or to cancel.)

We'll add the path `HasCardNoAuth 'WrongPIN' -> HasCardNoAuth;`

```fsl
EmptyWaiting 'Wait' -> EmptyWaiting 'InsertCard' -> HasCardNoAuth;

HasCardNoAuth 'CancelAuthReturnCard' -> EjectCardAndReset;
HasCardNoAuth 'WrongPIN' -> HasCardNoAuth;

EjectCardAndReset -> EmptyWaiting;
```

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/atm%20quick%20start%20tutorial/4_WrongPin.png)





<br/><br/>

#### 5: Can give the correct PIN

Next, let's give the ability to get the password right.

We'll add two paths.  The first gets the password right: `HasCardNoAuth 'RightPIN' -> MainMenu;`

The second, from our new `state` **MainMenu**, gives people the ability to leave: `MainMenu 'ExitReturnCard' -> EjectCardAndReset;`


```fsl
EmptyWaiting 'Wait' -> EmptyWaiting 'InsertCard' -> HasCardNoAuth;

HasCardNoAuth 'CancelAuthReturnCard' -> EjectCardAndReset;
HasCardNoAuth 'WrongPIN' -> HasCardNoAuth;
HasCardNoAuth 'RightPIN' -> MainMenu;

MainMenu 'ExitReturnCard' -> EjectCardAndReset;

EjectCardAndReset -> EmptyWaiting;
```

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/atm%20quick%20start%20tutorial/5_RightPin.png)



<br/><br/>

#### 6: Can check balance from main menu

Hooray, now we're getting somewhere.

Let's add the ability to check your balance.  First pick that from the main menu, then pick which account to see the
balance of, then you're shown a screen with the information you requested; then go back to the main menu.

That's `MainMenu 'CheckBalance' -> PickAccount -> DisplayBalance -> MainMenu;`.

```fsl
EmptyWaiting 'Wait' -> EmptyWaiting 'InsertCard' -> HasCardNoAuth;

HasCardNoAuth 'CancelAuthReturnCard' -> EjectCardAndReset;
HasCardNoAuth 'WrongPIN' -> HasCardNoAuth;
HasCardNoAuth 'RightPIN' -> MainMenu;

MainMenu 'ExitReturnCard' -> EjectCardAndReset;
MainMenu 'CheckBalance' -> PickAccount -> DisplayBalance -> MainMenu;

EjectCardAndReset -> EmptyWaiting;
```

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/atm%20quick%20start%20tutorial/6_CanCheckBalance.png)



<br/><br/>

#### 7: Can deposit money from main menu

Let's add something difficult.  Their state machine just proceeds assuming everything is okay.

To desposit money:

1. Accept physical money
2. If accept failed (eg door jammed,) reject physical object, go to main menu
3. If accept succeeded, ask human expected value
4. Pick an account this should go into
5. Contact bank.  Request to credit for theoretical physical money.
6. Three results: yes, no, offer-after-audit.
7. If no, reject physical object, go to main menu.
8. If yes, consume physical object, tell user consumed, go to main menu
9. If offer-after-audit, ask human what to do
10. if human-yes, consume physical object, tell user consumed, go to main menu
11. if human-no, reject physical object, go to main menu

Writing this out in code is not only generally longer than the text form, but also error prone and hard to maintain.

... or there's the `FSM` `DSL`, which is usually as-brief-as the text, and frequently both briefer and more explicit.

* Rules 1-2: `MainMenu 'AcceptDeposit' -> TentativeAcceptMoney 'AcceptFail' -> RejectPhysicalMoney -> MainMenu;`
* Rules 3-6: `TentativeAcceptMoney 'AcceptSucceed' -> PickDepositAccount -> RequestValue 'TellBank' -> BankResponse;`
* Rule 7: `BankResponse 'BankNo' -> RejectPhysicalMoney;`
* Rule 8: `BankResponse 'BankYes' -> ConsumeMoney -> NotifyConsumed -> MainMenu;`
* Rules 9-10: `BankResponse 'BankAudit' -> BankAuditOffer 'HumanAcceptAudit' -> ConsumeMoney;`
* Rule 11: `BankAuditOffer 'HumanRejectAudit' -> RejectPhysicalMoney;`

Or, as a block,

```fsl
MainMenu 'AcceptDeposit' -> TentativeAcceptMoney;

TentativeAcceptMoney 'AcceptFail' -> RejectPhysicalMoney -> MainMenu;
TentativeAcceptMoney 'AcceptSucceed' -> PickDepositAccount -> RequestValue 'TellBank' -> BankResponse;

BankResponse 'BankNo'    -> RejectPhysicalMoney;
BankResponse 'BankYes'   -> ConsumeMoney -> NotifyConsumed -> MainMenu;
BankResponse 'BankAudit' -> BankAuditOffer 'HumanAcceptAudit' -> ConsumeMoney;

BankAuditOffer 'HumanRejectAudit' -> RejectPhysicalMoney;
```

Which leaves us with the total code


```fsl
EmptyWaiting 'Wait' -> EmptyWaiting 'InsertCard' -> HasCardNoAuth;

HasCardNoAuth 'CancelAuthReturnCard' -> EjectCardAndReset;
HasCardNoAuth 'WrongPIN' -> HasCardNoAuth;
HasCardNoAuth 'RightPIN' -> MainMenu;

MainMenu 'AcceptDeposit'  -> TentativeAcceptMoney;
MainMenu 'ExitReturnCard' -> EjectCardAndReset;
MainMenu 'CheckBalance'   -> PickCheckBalanceAccount -> DisplayBalance -> MainMenu;

TentativeAcceptMoney 'AcceptFail'    -> RejectPhysicalMoney -> MainMenu;
TentativeAcceptMoney 'AcceptSucceed' -> PickDepositAccount -> RequestValue 'TellBank' -> BankResponse;

BankResponse 'BankNo'    -> RejectPhysicalMoney;
BankResponse 'BankYes'   -> ConsumeMoney -> NotifyConsumed -> MainMenu;
BankResponse 'BankAudit' -> BankAuditOffer 'HumanAcceptAudit' -> ConsumeMoney;

BankAuditOffer 'HumanRejectAudit' -> RejectPhysicalMoney;

EjectCardAndReset -> EmptyWaiting;
```

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/atm%20quick%20start%20tutorial/7_CanDepositMoney.png)



<br/><br/>

#### 8: Can withdraw money from main menu

Let's also be able to take money from the machine.  After this, we'll move on, since our example is pretty squarely made
by now.

1. Pick a withdrawl account, or cancel to the main menu
2. Shown a balance, pick a withdrawl amount, or cancel to acct picker
3. Is the withdrawl account too high?  If so go to 2
4. Does the machine actually have the money?  If not go to 2
5. Otherwise confirm intent w/ human
6. Attempt to post the transaction.
7. If fail, display reason and go to 1
8. If succeed, dispense money and go to main menu

* Rules 1-3: `MainMenu -> PickWithdrawlAccount -> PickAmount -> AcctHasMoney? 'TooHighForAcct' -> PickWithdrawlAccount;`
* Rule 4: `AcctHasMoney? -> MachineHasMoney? 'MachineLowOnCash' -> PickAmount;`
* Rule 5: `MachineHasMoney? -> ConfirmWithdrawWithHuman 'MakeChanges' -> PickWithdrawlAmount;`
* Rule 6: `ConfirmWithdrawWithHuman 'PostWithdrawl' -> BankWithdrawlResponse;`
* Rule 7: `BankWithdrawlResponse 'WithdrawlFailure' -> WithdrawlFailureExplanation -> PickWithdrawlAccount;`
* Rule 8: `BankWithdrawlResponse 'WithdrawlSuccess' -> DispenseMoney -> MainMenu;`

Rule 1 canceller: `PickWithdrawlAccount 'CancelWithdrawl' -> MainMenu;`
Rule 2 canceller: `PickWithdrawlAmount 'SwitchAccounts' -> PickWithdrawlAccount;`

Or as a whole, we're adding

```fsl
MainMenu -> PickWithdrawlAccount -> PickAmount -> AcctHasMoney? 'TooHighForAcct' -> PickWithdrawlAccount;
AcctHasMoney? -> MachineHasMoney? 'MachineLowOnCash' -> PickAmount;
MachineHasMoney? -> ConfirmWithdrawWithHuman 'MakeChanges' -> PickWithdrawlAmount;
ConfirmWithdrawWithHuman 'PostWithdrawl' -> BankWithdrawlResponse;
BankWithdrawlResponse 'WithdrawlFailure' -> WithdrawlFailureExplanation -> PickWithdrawlAccount;
BankWithdrawlResponse 'WithdrawlSuccess' -> DispenseMoney -> MainMenu;

PickWithdrawlAccount 'CancelWithdrawl' -> MainMenu;
PickWithdrawlAmount 'SwitchAccounts' -> PickWithdrawlAccount;
```

Which leaves us with

```fsl
EmptyWaiting 'Wait' -> EmptyWaiting 'InsertCard' -> HasCardNoAuth;

HasCardNoAuth 'CancelAuthReturnCard' -> EjectCardAndReset;
HasCardNoAuth 'WrongPIN' -> HasCardNoAuth;
HasCardNoAuth 'RightPIN' -> MainMenu;

MainMenu 'AcceptDeposit'  -> TentativeAcceptMoney;
MainMenu 'ExitReturnCard' -> EjectCardAndReset;
MainMenu 'CheckBalance'   -> PickCheckBalanceAccount -> DisplayBalance -> MainMenu;

TentativeAcceptMoney 'AcceptFail'    -> RejectPhysicalMoney -> MainMenu;
TentativeAcceptMoney 'AcceptSucceed' -> PickDepositAccount -> RequestValue 'TellBank' -> BankResponse;

BankResponse 'BankNo'    -> RejectPhysicalMoney;
BankResponse 'BankYes'   -> ConsumeMoney -> NotifyConsumed -> MainMenu;
BankResponse 'BankAudit' -> BankAuditOffer 'HumanAcceptAudit' -> ConsumeMoney;

BankAuditOffer 'HumanRejectAudit' -> RejectPhysicalMoney;

MainMenu -> PickWithdrawlAccount -> PickAmount -> AcctHasMoney? 'TooHighForAcct' -> PickWithdrawlAccount;
AcctHasMoney? -> MachineHasMoney? 'MachineLowOnCash' -> PickAmount;
MachineHasMoney? -> ConfirmWithdrawWithHuman 'MakeChanges' -> PickWithdrawlAmount;
ConfirmWithdrawWithHuman 'PostWithdrawl' -> BankWithdrawlResponse;
BankWithdrawlResponse 'WithdrawlFailure' -> WithdrawlFailureExplanation -> PickWithdrawlAccount;
BankWithdrawlResponse 'WithdrawlSuccess' -> DispenseMoney -> MainMenu;

PickWithdrawlAccount 'CancelWithdrawl' -> MainMenu;
PickWithdrawlAmount 'SwitchAccounts' -> PickWithdrawlAccount;

EjectCardAndReset -> EmptyWaiting;
```

![](https://raw.githubusercontent.com/StoneCypher/jssm/master/src/assets/atm%20quick%20start%20tutorial/8_CanWithdrawMoney.png)

As you can see, building up even very complex state machines is actually relatively straightforward, in a short
amount of time.


## Features
### DSL
### States
### Transitions
### Cycles
### Stripes
### Named Ordered Lists
### Atoms
### Strings
### Arrow types
### Unicode representations
### Node declarations
### All the styling bullshit
### Named edges
### URL callouts
### The 9 or whatever directives
### How to publish a machine
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
### Vegas locked 21 dealer behavior
### React SPA website (practical large use)
### [BGP](https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/BGP_FSM.svg/549px-BGP_FSM.svg.png)
### [LibGCrypt FIPS mode FSM](https://www.gnupg.org/documentation/manuals/gcrypt/fips-fsm.png)

## How to debug

## How to publish

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

# Thanks

JSSM and FSL have had a lot of help.

## Internationalization

* [Mykhaylo Les](https://github.com/miles91) provided three translation test cases ([Ukrainian](https://github.com/StoneCypher/jssm/blob/master/src/js/tests/language_data/ukrainian.json), [Belarussian](https://github.com/StoneCypher/jssm/blob/master/src/js/tests/language_data/belarussian.json), and [Russian](https://github.com/StoneCypher/jssm/blob/master/src/js/tests/language_data/russian.json),) and the corresponding Traffic Light translations (also [Ukrainian](https://github.com/StoneCypher/fsl_traffic_light_ukrainian/blob/master/traffic%20light.fsl), [Belarussian](https://github.com/StoneCypher/fsl_traffic_light_belarussian/blob/master/traffic_light.fsl), and [Russian](https://github.com/StoneCypher/fsl_traffic_light_russian/blob/master/traffic%20light.fsl).)
* [Tanvir Islam](https://github.com/tanvirrb) provided the [Bengali test case](https://github.com/StoneCypher/jssm/blob/master/src/js/tests/language_data/bengali.json), translated the [Traffic Light](https://github.com/tanvirrb/fsl-traffic-light-bengali/blob/master/traffic_light.fsl) to Bengali, and published the first non-English `FSL` machine, in Bengali.
* [Francisco Junior](https://github.com/fcojr) provided the [Portuguese test case](https://github.com/StoneCypher/jssm/blob/master/src/js/tests/language_data/portuguese.json) and translated the [Traffic Light](https://github.com/StoneCypher/fsl_traffic_light_portuguese/blob/master/traffic_light.fsl) to Portuguese
* [Jeff Katz](https://github.com/cohendvir) provided the [German test case](https://github.com/StoneCypher/jssm/blob/master/src/js/tests/language_data/german.json).
* [Alex Cresswell](https://github.com/technophile77) provdied the [Spanish test case](https://github.com/StoneCypher/jssm/blob/master/src/js/tests/language_data/spanish.json)
* [Dvir Cohen](https://github.com/cohendvir) provided the [Hebrew test case](https://github.com/StoneCypher/jssm/blob/master/src/js/tests/language_data/hebrew.json).
* [David de la Peña](https://github.com/daviddelapena) provided the [French test case](https://github.com/StoneCypher/jssm/blob/master/src/js/tests/language_data/french.json)

If I've overlooked you, please let me know.

If you'd like to help, it's straightforward.

1. Easy mode: open a PR with [this file](https://github.com/StoneCypher/jssm/blob/master/src/js/tests/language_data/english.json) translated into your language
1. Extra mile: create a new repo containing [this file](https://github.com/StoneCypher/fsl_traffic_light/blob/master/traffic_light.fsl) translated

## Code and Language

[Forest Belton](https://github.com/forestbelton) has provided guidance, bugfixes, parser and language commentary.

[Jordan Harbrand](https://github.com/ljharb) suggested two interesting features and provided strong feedback on the initial tutorial draft.

The biggest thanks must go to [Michael Morgan](https://github.com/msmorgan/), who has debated significant sections of
the notation, invented several concepts and operators, helped with the parser, with system nomenclature, for having published
the first not-by-me `FSL` machine, for encouragement, and generally just for having been as interested as he has been.
