# Lines of Code shootout

FSL's biggest benefit is ease of use, from short machines.  However, it's not
much value to just say that; instead, we should see what the actual difference
is, by comparisons.

When possible, all of these comparisons are taken from the comparison product's
documentation, and are generally unchanged; when not, by following something
that was; all are formatted with `prettier` for fairness (hence all the hanging
commas,) and sometimes to add `include` or `require` to make runnable code.
Sometimes details like labels or constancy will be altered to match for
comparison; if so, this will be pointed out.

Numbers in bold represent official code; numbers not in bold are examples I
wrote, and despite good faith, may not represent ideal notation.  If the text
is <fail>red and italic</fail>, that state machine library could not implement
that comparative test correctly due to a missing feature.

<span id="quicktab">

| Library | Tog | Traf | Matt |
| ---- | ---- | ---- | ---- |
| jssm | **1** | **2** | **5** |
| xstate | **16** | | |
| javascript-state-machine | | | **23** |
| finity | 7 | | 28 |
| stately | 8 | | 24 |
| nanostate | | **12** | <fail>15</fail> |
| robot | 17 | 24 | 31 |

</span>

&nbsp;

&nbsp;

&nbsp;

## Toggle machine

In essence, a simple light switch.  Just shows the basics of making states, and
linking them with actions.

| lib | length |
| ---- | ---- |
| jssm | 1 |
| xstate | 16 |
| finity | 7 |
| stately | 8 |
| robot | 17 |

&nbsp;

### `jssm` toggle machine, 1 line

```javascript
export const toggleMachine = sm`active 'TOGGLE' <=> 'TOGGLE' inactive;`;
````

&nbsp;

### `xstate` toggle machine, 16 lines

From [their documentation](https://xstate.js.org/docs/recipes/svelte.html#machine-js)

```javascript
export const toggleMachine = createMachine({
  id: "toggle",
  initial: "inactive",
  states: {
    inactive: {
      on: {
        TOGGLE: "active",
      },
    },
    active: {
      on: {
        TOGGLE: "inactive",
      },
    },
  },
});
````

&nbsp;

### (created) `finity` toggle machine, 7 lines

Finity did not have a light switch example.  I made this, following [this
unrelated machine](https://github.com/nickuraltsev/finity/blob/master/examples/hierarchical/index.js)
as a style guide.

```javascript
export const stateMachine = Finity
  .configure()
    .initialState('inactive')
      .on('toggle').transitionTo('active')
    .state('active')
      .on('toggle').transitionTo('inactive')
  .start();
```

&nbsp;

### (created) `stately` toggle machine, 8 lines

Stately did not have a light switch example.  I made this, following [this
unrelated machine](https://github.com/fschaefer/Stately.js#examples) as a style
guide.

```javascript
export const door = Stately.machine({
  inactive: {
    toggle: "active",
  },
  active: {
    toggle: "inactive",
  },
});
```

&nbsp;

### (created) `robot` states of matter, 17 lines

Robot did not have a toggle example.  I made this, following [this unrelated
machine](https://thisrobot.life/api/action.html) as a style guide.

```javascript
const matter = createMachine(
  {
    inactive: state(
      transition(
        "toggle",
        "active"
      )
    ),
    active: state(
      transition(
        "toggle",
        "inactive"
      )
    ),
  },
  () => true
);
```

&nbsp;

&nbsp;

&nbsp;

## Traffic light

Three state, no `off`, no `flashing red`.  Emit a console log of `'Red light!'`
whenever the red state is entered.

Shows the basics, as well as putting a hook on a state (or a node in some
systems' lingo.)

| lib | length |
| ---- | ---- |
| jssm | 2 |
| nanostate | 12 |
| robot | 24 |

&nbsp;

### `jssm` traffic light, 2 lines

```javascript
export const trafficLight = sm`red 'next' => green 'next' => yellow 'next' => red;`;
trafficLight.hook_global_action("next", () => console.log("Red light!"));
```

&nbsp;

### `nanostate` traffic light, 12 lines

Taken from [the readme](https://github.com/choojs/nanostate/blob/master/README.md):

Changed the name of the event from `timer` to `next`; exported and consted.
Reordered to start in red, instead of to start in green.

Added a red light hook with `.on`.

```javascript
export const trafficLight = nanostate("green", {
  red: {
    next: "green",
  },
  green: {
    next: "yellow",
  },
  yellow: {
    next: "red",
  },
});

trafficLight.on('red', () => console.log('Red light!'));
```

&nbsp;

### (created) `robot` traffic light, 24 lines

Robot did not have a traffic light example.  I made this, following [this
unrelated machine](https://thisrobot.life/api/action.html) as a style
guide.

Robot does not appear to support hooks on nodes, so we've faked it with hooks
on transitions.

```javascript
const matter = createMachine(
  {
    red: state(
      transition(
        "next",
        "green"
      )
    ),
    green: state(
      transition(
        "next",
        "yellow"
      )
    ),
    yellow: state(
      transition(
        "next",
        "red",
        action(() => console.log("Red light!"))
      )
    ),
  },
  () => true
);
```

&nbsp;

&nbsp;

&nbsp;

## States of Matter

Three basic states of matter.  Hook each of the four transitions with chatter on
follow.

In addition to the basics, shows how to put a hook on a transition (or an action
or an edge, in other machines' terminology.)

| lib | length |
| ---- | ---- |
| jssm | 5 |
| javascript-state-machine | 23 |
| finity | 28 |
| stately | 24 |
| nanostate | <fail>15</fail> ❌ |
| robot | 31 |

&nbsp;

### `jssm` states of matter, 5 lines

```javascript
export const matter = sm`solid 'melt' <=> 'freeze' liquid 'vaporize' <=> 'condense' gas`;
trafficLight.hook_global_action('melt', () => console.log('I melted'));
trafficLight.hook_global_action('freeze', () => console.log('I froze'));
trafficLight.hook_global_action('vaporize', () => console.log('I vaporized'));
trafficLight.hook_global_action('condense', () => console.log('I condensed'));
```

&nbsp;

### `javascript-state-machine` states of matter, 23 lines

Exported and consted.

```javascript
export const matter = new StateMachine({
  init: "solid",
  transitions: [
    { name: "melt", from: "solid", to: "liquid" },
    { name: "freeze", from: "liquid", to: "solid" },
    { name: "vaporize", from: "liquid", to: "gas" },
    { name: "condense", from: "gas", to: "liquid" },
  ],
  methods: {
    onMelt: function () {
      console.log("I melted");
    },
    onFreeze: function () {
      console.log("I froze");
    },
    onVaporize: function () {
      console.log("I vaporized");
    },
    onCondense: function () {
      console.log("I condensed");
    },
  },
});
```

&nbsp;

### (created) `finity` states of matter, 28 lines

Finity did not have a states of matter example.  I made this, following [this
unrelated machine](https://github.com/nickuraltsev/finity/blob/master/examples/hierarchical/index.js)
as a style guide.

Finity does not appear to support hooking specific transitions, but instead
offers a single global transition hook.

I didn't format this with `prettier`, because `prettier` does a really bad job
with the chain `.state().on().transitionTo()`; the length doubles and this
becomes unreadable, and that isn't `finity`'s fault.

```javascript
const matter = Finity
  .configure()
    .initialState('solid')
      .on('melt').transitionTo('liquid')
    .state('liquid')
      .on('vaporize').transitionTo('gas')
      .on('freeze').transitionTo('solid')
    .state('gas')
      .on('condense').transitionTo('liquid')
    .global()
      .onTransition( (fromState, toState) => {
        switch (fromState) {
          case 'solid':
            console.log('I melted');
            break;
          case 'liquid':
            if (toState === solid) {
              console.log('I froze');
            } else if (toState === gas) {
              console.log('I vaporized');
            }
            break;
          case 'gas':
            console.log('I condensed');
            break;
        }
      })
  .start();
```

&nbsp;

### (created) `stately` states of matter, 24 lines

Stately did not have a states of matter example.  I made this, following [this
unrelated machine](https://github.com/fschaefer/Stately.js#examples) as a style
guide.

```javascript
export const matter = Stately.machine({
  solid: {
    melt: () => {
      console.log("I melted");
      return this.liquid;
    },
  },
  liquid: {
    freeze: () => {
      console.log("I froze");
      return this.solid;
    },
    vaporize: () => {
      console.log("I vaporized");
      return this.gas;
    },
  },
  gas: {
    condense: () => {
      console.log("I condensed");
      return this.liquid;
    },
  },
});
```

&nbsp;

### `nanostate` states of matter, 15 lines, ❌ cannot implement

`nanostate` did not have a states of matter example.  I made this, following
[this unrelated machine](https://github.com/choojs/nanostate/blob/master/README.md)
as a style guide.

`nanostate` does not appear to support on-action hooks, and does not appear to
pass the previous state when calling its global enter hook.  Therefore there is
no way to correctly implement the hooks leading to liquid - condense and melt -
because you can't tell whether they're coming from solid or gas.  On these
grounds, `nanostate` cannot implement this machine correctly.

```javascript
export const trafficLight = nanostate("green", {
  solid: {
    melt: "liquid",
  },
  liquid: {
    freeze: "solid",
    vaporize: "gas",
  },
  gas: {
    condense: "liquid",
  },
});

trafficLight.on("solid", () => console.log("I froze"));
trafficLight.on("gas", () => console.log("I vaporized"));

trafficLight.on("liquid", () =>
  console.log("❌ FAIL: cannot tell if melt or condense")
);
```

&nbsp;

### (created) `robot` states of matter, 31 lines

Robot did not have a states of matter example.  I made this, following [this
unrelated machine](https://thisrobot.life/api/action.html) as a style
guide.

```javascript
const matter = createMachine(
  {
    solid: state(
      transition(
        "melt",
        "liquid",
        action(() => console.log("I melted"))
      )
    ),
    liquid: state(
      transition(
        "freeze",
        "solid",
        action(() => console.log("I froze"))
      ),
      transition(
        "vaporize",
        "gas",
        action(() => console.log("I vaporized"))
      )
    ),
    gas: state(
      transition(
        "condense",
        "liquid",
        action(() => console.log("I condensed"))
      )
    ),
  },
  () => true
);
```
