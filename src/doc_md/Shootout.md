# Lines of Code shootout

FSL's biggest benefit is ease of use, from short machines.  However, it's not
much value to just say that; instead, we should see what the actual difference
is, by comparisons.

When possible, all of these comparisons are taken from the comparison product's
documentation, and are generally unchanged; when not, by following something
that was; and sometimes to add `include` or `require` to make runnable code.
Sometimes details like labels or constancy will be altered to match for
comparison; if so, this will be pointed out.

The JSSM examples are not golfed.  For example, on the states of matter machine,
one could hook all actions, and print from an object whose property names were
the state names, to get that down to two lines; this is the expected "natural"
way to write it, instead.

Code samples are formatted to `prettier`'s defaults for fairness, except the
fluent-chain libraries (finity, state-machine), which `prettier` flattens
unreadably; those keep their documentation's indentation.  Each library is
shown in the most compact form its own documentation uses, not an expanded
one.

Numbers in bold represent official code; numbers not in bold are examples I
wrote, and despite good faith, may not represent ideal notation.  If the text
is <fail>red and italic</fail>, that state machine library could not implement
that comparative test correctly due to a missing feature.

Libraries are sorted shortest-average first, with failing libraries sorted to
the end.

<!-- COMPARABLES:GENERATED-START — do not edit by hand; regenerated from src/comparables/ -->

<span id="quicktab">

| Library | Toggle | Traffic | States | Avg |
| ---- | ---- | ---- | ---- | ---- |
| jssm | **[1](#jssm-toggle-machine-1-line)** | **[2](#jssm-traffic-light-2-lines)** | **[5](#jssm-states-of-matter-5-lines)** | 2.67 |
| robot | [4](#created-robot-toggle-machine-4-lines) | [7](#created-robot-traffic-light-7-lines) | [12](#created-robot-states-of-matter-12-lines) | 7.67 |
| finity | [7](#created-finity-toggle-machine-7-lines) | [10](#created-finity-traffic-light-10-lines) | [10](#created-finity-states-of-matter-10-lines) | 9 |
| state-machine | [5](#created-state-machine-toggle-machine-5-lines) | [8](#created-state-machine-traffic-light-8-lines) | [14](#created-state-machine-states-of-matter-14-lines) | 9 |
| faste | **[3](#faste-toggle-machine-3-lines)** | **[12](#faste-traffic-light-12-lines)** | [17](#created-faste-states-of-matter-17-lines) | 10.67 |
| javascript-state-machine | **[7](#javascript-state-machine-toggle-machine-7-lines)** | [13](#created-javascript-state-machine-traffic-light-13-lines) | **[23](#javascript-state-machine-states-of-matter-23-lines)** | 14.33 |
| stately | [8](#created-stately-toggle-machine-8-lines) | [12](#created-stately-traffic-light-12-lines) | [24](#created-stately-states-of-matter-24-lines) | 14.67 |
| machina | [12](#created-machina-toggle-machine-12-lines) | [16](#created-machina-traffic-light-16-lines) | [28](#created-machina-states-of-matter-28-lines) | 18.67 |
| xstate | **[16](#xstate-toggle-machine-16-lines)** | [21](#created-xstate-traffic-light-21-lines) | [33](#created-xstate-states-of-matter-33-lines) | 23.33 |
| <fail>nanostate</fail> | [8](#created-nanostate-toggle-machine-8-lines) | **[13](#nanostate-traffic-light-13-lines)** | <fail>[19](#created-nanostate-states-of-matter-19-lines)</fail> | <fail>13.33</fail> |

</span>

&nbsp;

## Toggle machine

In essence, a simple light switch.  Just shows the basics of making states, and linking them with actions.

| lib | length |
| ---- | ---- |
| jssm | **[1](#jssm-toggle-machine-1-line)** |
| faste | **[3](#faste-toggle-machine-3-lines)** |
| robot | [4](#created-robot-toggle-machine-4-lines) |
| state-machine | [5](#created-state-machine-toggle-machine-5-lines) |
| finity | [7](#created-finity-toggle-machine-7-lines) |
| javascript-state-machine | **[7](#javascript-state-machine-toggle-machine-7-lines)** |
| nanostate | [8](#created-nanostate-toggle-machine-8-lines) |
| stately | [8](#created-stately-toggle-machine-8-lines) |
| machina | [12](#created-machina-toggle-machine-12-lines) |
| xstate | **[16](#xstate-toggle-machine-16-lines)** |

&nbsp;

### `jssm` Toggle machine, 1 line

```javascript
export const toggleMachine = sm`inactive 'toggle' <=> 'toggle' active;`;
```

&nbsp;

### `faste` Toggle machine, 3 lines

Taken from the readme. Renamed, bound, and exported the machine result; changed the event and phase names to toggle / inactive / active.
Source: <https://www.npmjs.com/package/faste#using-different-handlers-in-different-states>

```javascript
export const toggleMachine = faste()
  .on("toggle", "inactive", ({ transitTo }) => transitTo("active"))
  .on("toggle", "active", ({ transitTo }) => transitTo("inactive"));
```

&nbsp;

### (created) `robot` Toggle machine, 4 lines

Robot did not have a toggle example. I made this, following this unrelated machine as a style guide.
Source: <https://thisrobot.life/api/action.html>

```javascript
export const toggleMachine = createMachine({
  inactive: state(transition("toggle", "active")),
  active: state(transition("toggle", "inactive")),
});
```

&nbsp;

### (created) `state-machine` Toggle machine, 5 lines

No toggle machine was available; wrote from scratch and used the docs for usage guidelines.
Source: <https://github.com/davestewart/javascript-state-machine/blob/d390627b384b30605b5ee90a70bae713e8b09002/docs/main/usage.md>

```javascript
var toggleMachine = new StateMachine({
  transitions: [
    'toggle : inactive > active > inactive'
  ]
});
```

&nbsp;

### (created) `finity` Toggle machine, 7 lines

Finity did not have a light switch example. I made this, following this unrelated machine as a style guide.
Source: <https://github.com/nickuraltsev/finity/blob/master/examples/hierarchical/index.js>

```javascript
export const toggleMachine = Finity
  .configure()
    .initialState('inactive')
      .on('toggle').transitionTo('active')
    .state('active')
      .on('toggle').transitionTo('inactive')
  .start();
```

&nbsp;

### `javascript-state-machine` Toggle machine, 7 lines

Exported and consted.

```javascript
export const toggleMachine = new StateMachine({
  init: "inactive",
  transitions: [
    { name: "toggle", from: "inactive", to: "active" },
    { name: "toggle", from: "active", to: "inactive" },
  ]
});
```

&nbsp;

### (created) `nanostate` Toggle machine, 8 lines

nanostate did not have a toggle example. I made this, following this unrelated machine as a style guide.
Source: <https://github.com/choojs/nanostate/blob/master/README.md>

```javascript
export const toggleMachine = nanostate("inactive", {
  inactive: {
    toggle: "active",
  },
  active: {
    toggle: "inactive",
  },
});
```

&nbsp;

### (created) `stately` Toggle machine, 8 lines

Stately did not have a light switch example. I made this from the readme, whose actions return the next state by name.
Source: <https://github.com/fschaefer/Stately.js#examples>

```javascript
export const toggleMachine = Stately.machine({
  inactive: {
    toggle: () => "active",
  },
  active: {
    toggle: () => "inactive",
  },
});
```

&nbsp;

### (created) `machina` Toggle machine, 12 lines

No toggle machine example was available; wrote from scratch following the readme, using its string-shorthand handlers.
Source: <https://github.com/ifandelse/machina.js#readme>

```javascript
export const toggleMachine = createFsm({
  id: "toggle",
  initialState: "inactive",
  states: {
    inactive: {
      toggle: "active",
    },
    active: {
      toggle: "inactive",
    },
  },
});
```

&nbsp;

### `xstate` Toggle machine, 16 lines

From their documentation
Source: <https://xstate.js.org/docs/recipes/svelte.html#machine-js>

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
```

&nbsp;

## Traffic light

Three state, no `off`, no `flashing red`.  Emit a console log of `'Red light!'` whenever the red state is entered.

Shows the basics, as well as putting a hook on a state (or a node in some systems' lingo.)

| lib | length |
| ---- | ---- |
| jssm | **[2](#jssm-traffic-light-2-lines)** |
| robot | [7](#created-robot-traffic-light-7-lines) |
| state-machine | [8](#created-state-machine-traffic-light-8-lines) |
| finity | [10](#created-finity-traffic-light-10-lines) |
| faste | **[12](#faste-traffic-light-12-lines)** |
| stately | [12](#created-stately-traffic-light-12-lines) |
| javascript-state-machine | [13](#created-javascript-state-machine-traffic-light-13-lines) |
| nanostate | **[13](#nanostate-traffic-light-13-lines)** |
| machina | [16](#created-machina-traffic-light-16-lines) |
| xstate | [21](#created-xstate-traffic-light-21-lines) |

&nbsp;

### `jssm` Traffic light, 2 lines

```javascript
export const trafficLight = sm`red 'next' => green 'next' => yellow 'next' => red;`;
trafficLight.hook_entry("red", () => console.log("Red light!"));
```

&nbsp;

### (created) `robot` Traffic light, 7 lines

Robot did not have a traffic light example. I made this, following this unrelated machine as a style guide. Robot does not appear to support hooks on nodes, so we've faked it with hooks on transitions.
Source: <https://thisrobot.life/api/action.html>

```javascript
export const trafficLight = createMachine({
  red: state(transition("next", "green")),
  green: state(transition("next", "yellow")),
  yellow: state(
    transition("next", "red", action(() => console.log("Red light!"))),
  ),
});
```

&nbsp;

### (created) `state-machine` Traffic light, 8 lines

No traffic light was available; wrote from scratch and used the docs for usage guidelines.
Source: <https://github.com/davestewart/javascript-state-machine/blob/d390627b384b30605b5ee90a70bae713e8b09002/docs/main/usage.md>

```javascript
export const trafficLight = new StateMachine({
  transitions: [
    'next : red > green > yellow > red'
  ],
  handlers: {
    'red' : () => console.log('Red light!')
  }
});
```

&nbsp;

### (created) `finity` Traffic light, 10 lines

finity did not have a traffic light example. I made this, following this unrelated machine as a style guide.
Source: <https://github.com/nickuraltsev/finity/blob/master/examples/hierarchical/index.js>

```javascript
export const trafficLight = Finity
  .configure()
    .initialState('red')
      .onEnter(() => console.log('Red light!'))
      .on('next').transitionTo('green')
    .state('green')
      .on('next').transitionTo('yellow')
    .state('yellow')
      .on('next').transitionTo('red')
  .start();
```

&nbsp;

### `faste` Traffic light, 12 lines

Taken from the readme. Renamed and exported the variable; added the red light hook with the `@enter` phase event.
Source: <https://www.npmjs.com/package/faste#example>

```javascript
export const trafficLight = faste()
  .withPhases(["red", "yellow", "green"])
  .withTransitions({
    green: ["yellow"],
    yellow: ["red"],
    red: ["green"],
  })
  .withMessages(["switch"])
  .on("switch", ["green"], ({ transitTo }) => transitTo("yellow"))
  .on("switch", ["yellow"], ({ transitTo }) => transitTo("red"))
  .on("switch", ["red"], ({ transitTo }) => transitTo("green"))
  .on("@enter", ["red"], () => console.log("Red light!"));
```

&nbsp;

### (created) `stately` Traffic light, 12 lines

stately did not have a traffic light example. I made this from the readme, using its per-state onEnter hook.
Source: <https://github.com/fschaefer/Stately.js#examples>

```javascript
export const trafficLight = Stately.machine({
  red: {
    onEnter: () => console.log("Red light!"),
    next: () => "green",
  },
  green: {
    next: () => "yellow",
  },
  yellow: {
    next: () => "red",
  },
});
```

&nbsp;

### (created) `javascript-state-machine` Traffic light, 13 lines

javascript-state-machine did not have a traffic light example. Made from scratch.

```javascript
export const trafficLight = new StateMachine({
  init: "red",
  transitions: [
    { name: "next", from: "red", to: "green" },
    { name: "next", from: "green", to: "yellow" },
    { name: "next", from: "yellow", to: "red" },
  ],
  methods: {
    onRed: function () {
      console.log("Red light!");
    },
  },
});
```

&nbsp;

### `nanostate` Traffic light, 13 lines

Taken from the readme. Changed the name of the event from `timer` to `next`; exported and consted. Reordered to start in red, instead of to start in green. Added a red light hook with `.on`.
Source: <https://github.com/choojs/nanostate/blob/master/README.md>

```javascript
export const trafficLight = nanostate("red", {
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

### (created) `machina` Traffic light, 16 lines

No traffic light example was available; wrote from scratch following the readme, using its _onEnter lifecycle hook.
Source: <https://github.com/ifandelse/machina.js#readme>

```javascript
export const trafficLight = createFsm({
  id: "traffic-light",
  initialState: "red",
  states: {
    red: {
      _onEnter: () => console.log("Red light!"),
      next: "green",
    },
    green: {
      next: "yellow",
    },
    yellow: {
      next: "red",
    },
  },
});
```

&nbsp;

### (created) `xstate` Traffic light, 21 lines

xstate did not have a traffic light example. Written in XState v5, laid out like their official toggle example, with an inline entry action on red.
Source: <https://stately.ai/docs/actions#entry-and-exit-actions>

```javascript
export const trafficLight = createMachine({
  initial: "red",
  states: {
    red: {
      entry: () => console.log("Red light!"),
      on: {
        next: "green",
      },
    },
    green: {
      on: {
        next: "yellow",
      },
    },
    yellow: {
      on: {
        next: "red",
      },
    },
  },
});
```

&nbsp;

## States of Matter

Three basic states of matter.  Hook each of the four transitions with chatter on follow.

In addition to the basics, shows how to put a hook on a transition (or an action or an edge, in other machines' terminology.)

| lib | length |
| ---- | ---- |
| jssm | **[5](#jssm-states-of-matter-5-lines)** |
| finity | [10](#created-finity-states-of-matter-10-lines) |
| robot | [12](#created-robot-states-of-matter-12-lines) |
| state-machine | [14](#created-state-machine-states-of-matter-14-lines) |
| faste | [17](#created-faste-states-of-matter-17-lines) |
| javascript-state-machine | **[23](#javascript-state-machine-states-of-matter-23-lines)** |
| stately | [24](#created-stately-states-of-matter-24-lines) |
| machina | [28](#created-machina-states-of-matter-28-lines) |
| xstate | [33](#created-xstate-states-of-matter-33-lines) |
| <fail>nanostate</fail> | <fail>[19](#created-nanostate-states-of-matter-19-lines)</fail> |

&nbsp;

### `jssm` States of Matter, 5 lines

```javascript
export const matter = sm`solid 'melt' <=> 'freeze' liquid 'vaporize' <=> 'condense' gas;`;
matter.hook_global_action("melt", () => console.log("I melted"));
matter.hook_global_action("freeze", () => console.log("I froze"));
matter.hook_global_action("vaporize", () => console.log("I vaporized"));
matter.hook_global_action("condense", () => console.log("I condensed"));
```

&nbsp;

### (created) `finity` States of Matter, 10 lines

finity did not have a states of matter example. I made this from the readme, using its per-transition withAction hook.
Source: <https://github.com/nickuraltsev/finity/blob/master/examples/hierarchical/index.js>

```javascript
export const matter = Finity
  .configure()
    .initialState('solid')
      .on('melt').transitionTo('liquid').withAction(() => console.log('I melted'))
    .state('liquid')
      .on('freeze').transitionTo('solid').withAction(() => console.log('I froze'))
      .on('vaporize').transitionTo('gas').withAction(() => console.log('I vaporized'))
    .state('gas')
      .on('condense').transitionTo('liquid').withAction(() => console.log('I condensed'))
  .start();
```

&nbsp;

### (created) `robot` States of Matter, 12 lines

robot did not have a states of matter example. I made this, following this unrelated machine as a style guide.
Source: <https://thisrobot.life/api/action.html>

```javascript
export const matter = createMachine({
  solid: state(
    transition("melt", "liquid", action(() => console.log("I melted"))),
  ),
  liquid: state(
    transition("freeze", "solid", action(() => console.log("I froze"))),
    transition("vaporize", "gas", action(() => console.log("I vaporized"))),
  ),
  gas: state(
    transition("condense", "liquid", action(() => console.log("I condensed"))),
  ),
});
```

&nbsp;

### (created) `state-machine` States of Matter, 14 lines

No states of matter example was available; wrote from scratch and used the docs for usage guidelines.
Source: <https://github.com/davestewart/javascript-state-machine/blob/d390627b384b30605b5ee90a70bae713e8b09002/docs/main/usage.md>

```javascript
export const matter = new StateMachine({
  transitions: [
    "melt     : solid > liquid",
    "freeze   : solid < liquid",
    "vaporize : liquid > gas",
    "condense : liquid < gas",
  ],
  handlers: {
    "@melt": () => console.log("I melted"),
    "@freeze": () => console.log("I froze"),
    "@vaporize": () => console.log("I vaporized"),
    "@condense": () => console.log("I condensed"),
  },
});
```

&nbsp;

### (created) `faste` States of Matter, 17 lines

faste did not have a states of matter example. I made this, following the readme. withPhases / withTransitions / withMessages are omitted, as in the readme's own toggle example.
Source: <https://www.npmjs.com/package/faste#example>

```javascript
export const matter = faste()
  .on("melt", ["solid"], ({ transitTo }) => {
    console.log("I melted");
    transitTo("liquid");
  })
  .on("freeze", ["liquid"], ({ transitTo }) => {
    console.log("I froze");
    transitTo("solid");
  })
  .on("vaporize", ["liquid"], ({ transitTo }) => {
    console.log("I vaporized");
    transitTo("gas");
  })
  .on("condense", ["gas"], ({ transitTo }) => {
    console.log("I condensed");
    transitTo("liquid");
  });
```

&nbsp;

### `javascript-state-machine` States of Matter, 23 lines

Changed the variable name, exported, and consted.
Source: <https://github.com/jakesgordon/javascript-state-machine#usage>

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

### (created) `stately` States of Matter, 24 lines

stately did not have a states of matter example. I made this from the readme, whose actions return the next state by name.
Source: <https://github.com/fschaefer/Stately.js#examples>

```javascript
export const matter = Stately.machine({
  solid: {
    melt: () => {
      console.log("I melted");
      return "liquid";
    },
  },
  liquid: {
    freeze: () => {
      console.log("I froze");
      return "solid";
    },
    vaporize: () => {
      console.log("I vaporized");
      return "gas";
    },
  },
  gas: {
    condense: () => {
      console.log("I condensed");
      return "liquid";
    },
  },
});
```

&nbsp;

### (created) `machina` States of Matter, 28 lines

No states of matter example was available; wrote from scratch following the readme, using function handlers that log and return the next state.
Source: <https://github.com/ifandelse/machina.js#readme>

```javascript
export const matter = createFsm({
  id: "matter",
  initialState: "solid",
  states: {
    solid: {
      melt() {
        console.log("I melted");
        return "liquid";
      },
    },
    liquid: {
      freeze() {
        console.log("I froze");
        return "solid";
      },
      vaporize() {
        console.log("I vaporized");
        return "gas";
      },
    },
    gas: {
      condense() {
        console.log("I condensed");
        return "liquid";
      },
    },
  },
});
```

&nbsp;

### (created) `xstate` States of Matter, 33 lines

xstate did not have a states of matter example. Written in XState v5, laid out like their official toggle example, with inline transition actions.

```javascript
export const matter = createMachine({
  initial: "solid",
  states: {
    solid: {
      on: {
        melt: {
          target: "liquid",
          actions: () => console.log("I melted"),
        },
      },
    },
    liquid: {
      on: {
        freeze: {
          target: "solid",
          actions: () => console.log("I froze"),
        },
        vaporize: {
          target: "gas",
          actions: () => console.log("I vaporized"),
        },
      },
    },
    gas: {
      on: {
        condense: {
          target: "liquid",
          actions: () => console.log("I condensed"),
        },
      },
    },
  },
});
```

&nbsp;

### (created) `nanostate` States of Matter, 19 lines

nanostate did not have a states of matter example.  I made this, following this unrelated machine as a style guide.  nanostate does not appear to support on-action hooks, and does not appear to pass the previous state when calling its global enter hook.  Therefore there is no way to correctly implement the hooks leading to liquid - condense and melt - because you can't tell whether they're coming from solid or gas.  On these grounds, nanostate cannot implement this machine correctly.
Source: <https://github.com/choojs/nanostate/blob/master/README.md>

```javascript
export const matter = nanostate("solid", {
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

matter.on("solid", () => console.log("I froze"));
matter.on("gas", () => console.log("I vaporized"));

matter.on("liquid", () =>
  console.log("❌ FAIL: cannot tell if melt or condense")
);
```

&nbsp;


<!-- COMPARABLES:GENERATED-END -->
