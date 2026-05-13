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

All code samples are formatted with `prettier` for fairness.

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
| state-machine | [5](#created-state-machine-toggle-machine-5-lines) | [8](#created-state-machine-traffic-light-8-lines) | [14](#created-state-machine-states-of-matter-14-lines) | 9 |
| faste | **[3](#faste-toggle-machine-3-lines)** | [14](#created-faste-traffic-light-14-lines) | [24](#created-faste-states-of-matter-24-lines) | 13.67 |
| javascript-state-machine | **[7](#javascript-state-machine-toggle-machine-7-lines)** | [13](#created-javascript-state-machine-traffic-light-13-lines) | **[23](#javascript-state-machine-states-of-matter-23-lines)** | 14.33 |
| finity | [7](#created-finity-toggle-machine-7-lines) | [10](#created-finity-traffic-light-10-lines) | [28](#created-finity-states-of-matter-28-lines) | 15 |
| stately | [8](#created-stately-toggle-machine-8-lines) | [18](#created-stately-traffic-light-18-lines) | [24](#created-stately-states-of-matter-24-lines) | 16.67 |
| robot | [17](#created-robot-toggle-machine-17-lines) | [24](#created-robot-traffic-light-24-lines) | [31](#created-robot-states-of-matter-31-lines) | 24 |
| xstate | **[16](#xstate-toggle-machine-16-lines)** | [36](#created-xstate-traffic-light-36-lines) | [33](#created-xstate-states-of-matter-33-lines) | 28.33 |
| <fail>nanostate</fail> | [8](#created-nanostate-toggle-machine-8-lines) | **[13](#nanostate-traffic-light-13-lines)** | <fail>[19](#created-nanostate-states-of-matter-19-lines)</fail> | <fail>13.33</fail> |
| <fail>machina</fail> | [20](#created-machina-toggle-machine-20-lines) | [26](#created-machina-traffic-light-26-lines) | <fail>[36](#created-machina-states-of-matter-36-lines)</fail> | <fail>27.33</fail> |

</span>

&nbsp;

## Toggle machine

In essence, a simple light switch.  Just shows the basics of making states, and linking them with actions.

| lib | length |
| ---- | ---- |
| jssm | **[1](#jssm-toggle-machine-1-line)** |
| faste | **[3](#faste-toggle-machine-3-lines)** |
| state-machine | [5](#created-state-machine-toggle-machine-5-lines) |
| finity | [7](#created-finity-toggle-machine-7-lines) |
| javascript-state-machine | **[7](#javascript-state-machine-toggle-machine-7-lines)** |
| nanostate | [8](#created-nanostate-toggle-machine-8-lines) |
| stately | [8](#created-stately-toggle-machine-8-lines) |
| xstate | **[16](#xstate-toggle-machine-16-lines)** |
| robot | [17](#created-robot-toggle-machine-17-lines) |
| machina | [20](#created-machina-toggle-machine-20-lines) |

&nbsp;

### `jssm` Toggle machine, 1 line

```javascript
export const toggleMachine = sm`active 'TOGGLE' <=> 'TOGGLE' inactive;`;
```

&nbsp;

### `faste` Toggle machine, 3 lines

Taken from the readme. Renamed, bound, and exported the machine result; changed the labels.
Source: <https://www.npmjs.com/package/faste#using-different-handlers-in-different-states>

```javascript
export const toggleMachine = faste()
 .on('toggle', 'inactive', ({transitTo}) => transitTo('enabled'))
 .on('toggle', 'active', ({transitTo}) => transitTo('disabled'))
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

Robot did not have a toggle example.  I made this, following this unrelated machine as a style guide.
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

Stately did not have a light switch example. I made this, following this unrelated machine as a style guide.
Source: <https://github.com/fschaefer/Stately.js#examples>

```javascript
export const toggleMachine = Stately.machine({
  inactive: {
    toggle: "active",
  },
  active: {
    toggle: "inactive",
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

### (created) `robot` Toggle machine, 17 lines

Robot did not have a toggle example. I made this, following this unrelated machine as a style guide.
Source: <https://thisrobot.life/api/action.html>

```javascript
const toggleMachine = createMachine(
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

### (created) `machina` Toggle machine, 20 lines

No toggle machine example was available; wrote from scratch and used the pedestrianSignal example on their landing page for usage guidelines.
Source: <http://machina-js.org/>

```javascript
export const matter = new machina.Fsm({
  initialState: "inactive",
  states: {
    uninitialized: {
      "*": function () {
        this.deferUntilTransition();
        this.transition("inactive");
      },
    },
    inactive: {
      _toggle: "active",
    },
    active: {
      _toggle: "inactive",
    },
  },
  toggle: function () {
    this.handle("_toggle");
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
| state-machine | [8](#created-state-machine-traffic-light-8-lines) |
| finity | [10](#created-finity-traffic-light-10-lines) |
| javascript-state-machine | [13](#created-javascript-state-machine-traffic-light-13-lines) |
| nanostate | **[13](#nanostate-traffic-light-13-lines)** |
| faste | [14](#created-faste-traffic-light-14-lines) |
| stately | [18](#created-stately-traffic-light-18-lines) |
| robot | [24](#created-robot-traffic-light-24-lines) |
| machina | [26](#created-machina-traffic-light-26-lines) |
| xstate | [36](#created-xstate-traffic-light-36-lines) |

&nbsp;

### `jssm` Traffic light, 2 lines

```javascript
export const trafficLight = sm`red 'next' => green 'next' => yellow 'next' => red;`;
trafficLight.hook_global_action("next", () => console.log("Red light!"));
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
const matter = Finity
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

### (created) `javascript-state-machine` Traffic light, 13 lines

javascript-state-machine did not have a traffic light example. Made from scratch.

```javascript
export const matter = new StateMachine({
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

### (created) `faste` Traffic light, 14 lines

Taken from the readme. Only change was to rename and export the variable.
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
  .on("switch", ["red"], ({ transitTo }) => transitTo("green"))
  .on("switch", ["green"], ({ transitTo }) => transitTo("yellow"))
  .on("switch", ["yellow"], ({ transitTo }) => {
    console.log("Red light!");
    transitTo("red");
  });
```

&nbsp;

### (created) `stately` Traffic light, 18 lines

stately did not have a traffic light example. I made this, following this unrelated machine as a style guide.
Source: <https://github.com/fschaefer/Stately.js#examples>

```javascript
export const matter = Stately.machine({
  red: {
    onEnter: () => console.log("Red light!"),
    next: () => {
      return this.green;
    },
  },
  green: {
    next: () => {
      return this.yellow;
    },
  },
  gas: {
    next: () => {
      return this.red;
    },
  },
});
```

&nbsp;

### (created) `robot` Traffic light, 24 lines

Robot did not have a traffic light example. I made this, following this unrelated machine as a style guide. Robot does not appear to support hooks on nodes, so we've faked it with hooks on transitions.
Source: <https://thisrobot.life/api/action.html>

```javascript
export const trafficLight = createMachine(
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

### (created) `machina` Traffic light, 26 lines

Adapted from the pedestrianSignal example on their landing page.
Source: <http://machina-js.org/>

```javascript
export const trafficLight = new machina.Fsm({
  initialState: "red",
  states: {
    uninitialized: {
      "*": function () {
        this.deferUntilTransition();
        this.transition("red");
      },
    },
    green: {
      _next: "yellow",
    },
    yellow: {
      _next: "red",
    },
    red: {
      _next: "green",
      _onEnter: function () {
        console.log("Red light!");
      },
    },
  },
  next: function () {
    this.handle("_next");
  },
});
```

&nbsp;

### (created) `xstate` Traffic light, 36 lines

There's most of a traffic light between their documentation here and also here (https://xstate.js.org/docs/guides/states.html#state-methods-and-properties), and it seems to piece together into this
Source: <https://xstate.js.org/docs/guides/machines.html#options>

```javascript
export const trafficLight = createMachine(
  {
    initial: "green",
    states: {
      green: {
        on: {
          next: {
            target: "yellow",
          },
        },
      },
      yellow: {
        on: {
          next: {
            target: "red",
          },
        },
      },
      red: {
        entry: "alertRed",
        on: {
          next: {
            target: "green",
          },
        },
      },
    },
  },
  {
    actions: {
      alertGreen: (context, event) => {
        alert("Green!");
      },
    },
  }
);
```

&nbsp;

## States of Matter

Three basic states of matter.  Hook each of the four transitions with chatter on follow.

In addition to the basics, shows how to put a hook on a transition (or an action or an edge, in other machines' terminology.)

| lib | length |
| ---- | ---- |
| jssm | **[5](#jssm-states-of-matter-5-lines)** |
| state-machine | [14](#created-state-machine-states-of-matter-14-lines) |
| javascript-state-machine | **[23](#javascript-state-machine-states-of-matter-23-lines)** |
| faste | [24](#created-faste-states-of-matter-24-lines) |
| stately | [24](#created-stately-states-of-matter-24-lines) |
| finity | [28](#created-finity-states-of-matter-28-lines) |
| robot | [31](#created-robot-states-of-matter-31-lines) |
| xstate | [33](#created-xstate-states-of-matter-33-lines) |
| <fail>nanostate</fail> | <fail>[19](#created-nanostate-states-of-matter-19-lines)</fail> |
| <fail>machina</fail> | <fail>[36](#created-machina-states-of-matter-36-lines)</fail> |

&nbsp;

### `jssm` States of Matter, 5 lines

```javascript
export const matter = sm`solid 'melt' <=> 'freeze' liquid 'vaporize' <=> 'condense' gas`;
trafficLight.hook_global_action('melt', () => console.log('I melted'));
trafficLight.hook_global_action('freeze', () => console.log('I froze'));
trafficLight.hook_global_action('vaporize', () => console.log('I vaporized'));
trafficLight.hook_global_action('condense', () => console.log('I condensed'));
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

### (created) `faste` States of Matter, 24 lines

faste did not have a states of matter example. I made this, following this unrelated machine as a style guide.
Source: <https://www.npmjs.com/package/faste#example>

```javascript
export const matter = faste()
  .withPhases(["solid", "liquid", "gas"])
  .withTransitions({
    solid: ["liquid"],
    liquid: ["solid", "gas"],
    gas: ["liquid"],
  })
  .withMessages(["melt", "freeze", "vaporize", "condense"])
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

### (created) `stately` States of Matter, 24 lines

stately did not have a states of matter example. I made this, following this unrelated machine as a style guide.
Source: <https://github.com/fschaefer/Stately.js#examples>

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

### (created) `finity` States of Matter, 28 lines

finity did not have a states of matter example. I made this, following this unrelated machine as a style guide.
Source: <https://github.com/nickuraltsev/finity/blob/master/examples/hierarchical/index.js>

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

### (created) `robot` States of Matter, 31 lines

robot did not have a states of matter example. I made this, following this unrelated machine as a style guide.
Source: <https://thisrobot.life/api/action.html>

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

&nbsp;

### (created) `xstate` States of Matter, 33 lines

xstate did not have a states of matter example. I made this, following this unrelated machine (https://github.com/nickuraltsev/finity/blob/master/examples/hierarchical/index.js) and this one (https://xstate.js.org/docs/guides/states.html#state-methods-and-properties), and also this one (https://xstate.js.org/docs/guides/events.html#sending-events) as style guides.

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
export const trafficLight = nanostate("solid", {
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

### (created) `machina` States of Matter, 36 lines

No states of matter example was available; wrote from scratch and used the pedestrianSignal example on their landing page for usage guidelines. machina does not support on-action hooks and does not pass the previous state in its global enter hook, making it impossible to distinguish condense-from-gas and melt-from-solid transitions for liquid.
Source: <http://machina-js.org/>

```javascript
export const matter = new machina.Fsm({
  initialState: "solid",
  states: {
    uninitialized: {
      "*": function () {
        this.deferUntilTransition();
        this.transition("solid");
      },
    },
    solid: {
      _melt: "liquid",
    },
    liquid: {
      _freeze: "solid",
      _vaporize: "gas",
    },
    gas: {
      _condense: "liquid",
      _onEnter: function () {
        console.log("Red light!");
      },
    },
  },
  melt: function () {
    this.handle("_melt");
  },
  freeze: function () {
    this.handle("_freeze");
  },
  vaporize: function () {
    this.handle("_vaporize");
  },
  condense: function () {
    this.handle("_condense");
  },
});
```

&nbsp;


<!-- COMPARABLES:GENERATED-END -->
