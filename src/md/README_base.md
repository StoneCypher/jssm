# jssm {{jssm_version}}

[**Try the live editor**](https://stonecypher.github.io/jssm-viz-demo/graph_explorer.html) ·
[Documentation](https://stonecypher.github.io/jssm/docs/) ·
[Discord](https://discord.gg/9P95USqnMK) ·
[Issues](https://github.com/StoneCypher/fsl/issues)

**Easy.**  Tiny.  Fast.  Finite state machines as one-liner strings, for
TypeScript and JavaScript.  Renders to PNG, SVG, and JPEG.  Runs in Node,
browsers, and Deno.  MIT licensed.

```javascript
import { sm } from 'jssm';

const TrafficLight = sm`Red -> Green -> Yellow -> Red;`;
```

That's it.  Using it is equally easy:

```javascript
TrafficLight.state();      // 'Red'
TrafficLight.go('Green');  // true
TrafficLight.state();      // 'Green'
```

The point of a state machine is to refuse to do things that aren't correct:

```javascript
TrafficLight.go('Red');    // false  - Green doesn't go to Red, only Yellow
TrafficLight.go('Blue');   // throws - Blue doesn't exist at all
```

A more involved machine, with main paths, forced paths, and per-state
styling, renders to:

<img src="https://raw.githubusercontent.com/StoneCypher/jssm/main/src/assets/doc%20light%20styled.png" alt="A styled four-state traffic light"/>

```javascript
const TrafficLightWithOff = sm`
  Red 'next' => Green 'next' => Yellow 'next' => Red;
  [Red Yellow Green] ~> Off -> Red;

  flow: left;

  state Red    : { background-color: pink;        corners: rounded; };
  state Yellow : { background-color: lightyellow; corners: rounded; };
  state Green  : { background-color: lightgreen;  corners: rounded; };

  state Off    : {
    background-color : steelblue;
    text-color       : white;
    shape            : octagon;
    linestyle        : dashed;
  };
`;
```

The same string is the runtime and the diagram.  They cannot drift apart.

[**Try it in the live editor**](https://stonecypher.github.io/jssm-viz-demo/graph_explorer.html) ·
[Documentation](https://stonecypher.github.io/jssm/docs/) ·
[Discord](https://discord.gg/9P95USqnMK) ·
[Issues](https://github.com/StoneCypher/fsl/issues)



<br/>

## Install

```
npm install jssm
```

The package ships pure ES6, a CommonJS ES5 bundle, an IIFE for browsers,
and TypeScript typings.  A Deno build is included.  Node 10 or newer.



<br/>

## Visualization

`jssm` ships with a visualization subpath that renders state machines to
SVG using Graphviz (via [`@viz-js/viz`](https://www.npmjs.com/package/@viz-js/viz)).

```typescript
import { sm }                  from 'jssm';
import { fsl_to_svg_string }   from 'jssm/viz';

const svg = await fsl_to_svg_string('a -> b;');
```

The viz subpath is opt-in - importing only from `jssm` does not pull in
`@viz-js/viz`. See the Visualization doc page for browser, ESM, and IIFE
usage patterns.



<br/>

## Command-line interface

`jssm` ships a CLI for rendering FSL machines to images and other formats.

### Installation

```sh
npm install -g jssm
```

This installs three binaries: `fsl` (the dispatcher), `jssm` (alias for `fsl`), and `fsl-render` (the render plugin).

### Render

Render a single machine to SVG (default):

```sh
fsl render machine.fsl
# → machine.svg next to input
```

Specify a format:

```sh
fsl render machine.fsl --target=png --width=800
fsl render machine.fsl --target=dot --stdout > machine.dot
```

Render multiple machines:

```sh
fsl render *.fsl --target=svg --out-dir=./diagrams
```

Pipe FSL via stdin:

```sh
cat machine.fsl | fsl render --target=dot | dot -Tpng > out.png
```

### Plugin architecture

Every `fsl-<name>` executable on PATH is dispatched when you run `fsl <name>`. Third-party plugins follow the same contract as first-party `fsl-render`. See `notes/superpowers/specs/2026-05-12-fsl-cli-design.md` for the contract.

### Library API

The same render functions are available programmatically:

```js
import { render, renderSet } from 'jssm/cli';

const result = await render(fslText, { target: 'svg' });
if (result.kind === 'text') console.log(result.content);
```



<br/>

## Web Components

`jssm` ships Lit-based web components for use in plain HTML or as a base for framework wrappers.

CDN one-liner (with an import map for `@viz-js/viz`):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/jssm/dist/cdn/viz.js"></script>
<fsl-viz fsl="Off -> On -> Off;"></fsl-viz>
```

npm one-liner:

```ts
import 'jssm/wc/viz/define';
// then use <fsl-viz fsl="..."> anywhere; <jssm-viz> is an accepted alias
```

Full documentation: [src/doc_md/WebComponents.md](src/doc_md/WebComponents.md).



<br/>

## 60-second tour

**Actions** let a machine advance without the caller knowing the next state:

```javascript
const Light = sm`Red 'next' -> Green 'next' -> Yellow 'next' -> Red;`;

Light.action('next');  // true
Light.state();         // 'Green'
Light.action('next');  // true
Light.state();         // 'Yellow'
```

**Three arrow types** distinguish kinds of transition:

```javascript
const Light = sm`
  Red => Green => Yellow => Red;     // => main path
  [Red Yellow Green] ~> Off -> Red;  // ~> forced, -> legal
`;
```

`->` is a legal transition.  `=>` is a legal transition that is also part of
the main path.  `~>` is a transition that requires `force_transition` -
useful for emergency stops, resets, and other rarities.

**Hooks** observe and gate transitions:

```javascript
const m = sm`Red 'next' -> Green 'next' -> Yellow 'next' -> Red;`
  .hook('Red', 'Green', () => console.log('GO'))            // specific edge
  .hook_entry('Red', () => console.log('STOP'))             // entering a state
  .hook_action('Yellow', 'Red', 'next', () => allowed());   // gate a specific action; return false to block
```

Pre-hooks fire before the state changes and may return `false` to refuse the
transition.  Post-hooks fire after.  Four `*_everything` hooks
(`hook_pre_everything`, `hook_everything`, `hook_pre_post_everything`,
`hook_post_everything`) bracket the entire pipeline if you want a single
observation point.

**Refusals and errors are deliberately different.**  An illegal transition
returns `false`.  An unknown state throws.  Branching code can rely on the
distinction.

**Overlapping state groups** let a state belong to several groups at once -
something a strict hierarchy can't express.  A group is declared with `&`,
and the same `&name` then drives transitions, shared metadata, boundary
hooks, and runtime queries:

```javascript
const req = sm`
  &InProgress : [connecting sending receiving];
  &Receiving  : [receiving draining];

  idle 'send'    -> connecting 'open' -> sending 'reply' -> receiving;
  receiving 'eof' -> draining 'done'  -> idle;

  &InProgress 'abort' -> idle;        // a transition from every group member
  on enter &Receiving do 'log_rx';    // boundary hook fires crossing in
`;

req.action('send');
req.isIn('InProgress');     // true  - connecting is in &InProgress
req.groupsOf('receiving');  // Set { 'InProgress', 'Receiving' }  - overlap
```

`receiving` is in **both** groups simultaneously - it is in-progress *and*
receiving.  When two groups disagree about the same action, a CSS-like
cascade decides: state-specific edges win, then the innermost (nearest)
group, then the later-declared one.  Groups render as nested Graphviz
clusters, or as bracketed chips on the node label where memberships
genuinely overlap.

See the cookbook's overlapping-groups recipes for fuller worked examples.



<br/>

## Why jssm

**The big win: most state-machine libraries make you write a gargantuan
JSON document, or call a builder API a few dozen times, to define a single
machine.  jssm machines are short, readable, arrow-driven strings - so they
are easy to write, easy to read, easy to debug, and easy to share.**

That decision shows up everywhere downstream:

- **A DSL with features other state-machine libraries don't have.**  Three
  arrow types distinguish legal, main-path, and forced transitions.  Array
  notation collapses repeated edges - `[Red Yellow Green] ~> Off` replaces
  three lines.  Named actions, per-state styling, named edges, validators,
  and live visualization all live in the same string the runtime parses.

- **Definition strings stay tiny, which makes machines easy to debug.**
  The traffic light is one line; the [full eight-step ATM walkthrough](https://github.com/StoneCypher/jssm/blob/main/src/doc_md/Tutorial_ATM.md)
  is thirty.  Small enough to read top-to-bottom, diff in code review,
  paste into a bug report, or drop into the
  [live editor](https://stonecypher.github.io/jssm-viz-demo/graph_explorer.html)
  for a rendered diagram you can step through.

- **Fast.**  Tens of millions of transitions per second on commodity
  hardware.  See [`src/buildjs/benchmark.cjs`](https://github.com/StoneCypher/jssm/blob/main/src/buildjs/benchmark.cjs)
  or run `npm run benny` against your own machine.

- **More thoroughly tested than any other JavaScript state-machine
  library.**  {{test_count}} tests at {{spec_coverage}}% line coverage
  ([report](https://coveralls.io/github/StoneCypher/jssm)), plus
  fuzz testing via `fast-check`, with parser test data across ten natural
  languages and Emoji.



<br/>

## Documentation

- [What are state machines?](https://github.com/StoneCypher/jssm/blob/main/src/doc_md/WhatAreStateMachines.md) - conceptual intro for newcomers
- [Getting started](https://github.com/StoneCypher/jssm/blob/main/src/doc_md/GettingStarted.md) - install and use the library across Node, browser, Deno, ES5/ES6, CDN, and TypeScript
- [Tutorial: a four-state traffic light](https://github.com/StoneCypher/jssm/blob/main/src/doc_md/Tutorial_TrafficLight.md) - short walkthrough that introduces the three arrow types
- [Tutorial: building an ATM state machine](https://github.com/StoneCypher/jssm/blob/main/src/doc_md/Tutorial_ATM.md) - longer walkthrough that builds a real-world machine in nine incremental steps
- [Language reference](https://github.com/StoneCypher/jssm/blob/main/src/doc_md/LanguageReference.md) - DSL reference for people already comfortable with state machines
- [Catalog of example machines](https://github.com/StoneCypher/jssm/blob/main/src/doc_md/ExampleMachines.md) - comparison table of worked examples (light switch, traffic light, intersection, vending machine, more)
- [Generated API reference](https://stonecypher.github.io/jssm/docs/) - full surface, generated from the TypeScript source



<br/>

## API at a glance

| Method | Purpose |
|---|---|
| `` sm`...` `` | Build a machine from DSL |
| `.state()` | The current state |
| `.transition(state)` | Move to a state. Returns `false` if illegal, throws if unknown. |
| `.force_transition(state)` | Move to a state across a `~>` forced edge |
| `.action(name)` | Trigger a named action. The next state is derived from the current state. |
| `.valid_transition(state)` · `.valid_action(name)` | Test whether a transition or action is legal from the current state, without taking it |
| `.hook(from, to, fn)` | Run on a specific edge. Pre-hook; return `false` to block. |
| `.hook_entry(state, fn)` · `.hook_exit(state, fn)` | Run when entering or leaving a state |
| `.hook_action(from, to, action, fn)` | Run when a named action causes a specific edge |
| `.hook_pre_everything(fn)` · `.hook_everything(fn)` | Bracket the pre-hook pipeline |
| `.hook_pre_post_everything(fn)` · `.hook_post_everything(fn)` | Bracket the post-hook pipeline |

The full surface - including history, validators, factories, data, and the
graph-introspection methods - is in the [generated API
docs](https://stonecypher.github.io/jssm/docs/).



<br/>

## Status

In production use since May 2017.  Current series is 5.x and the DSL is
stable; the runtime API has been additive for several years.  MIT licensed
end to end.  Test data and parser cases are included for English, German,
French, Spanish, Hebrew, Russian, Ukrainian, Belarusian, Bengali,
Portuguese, and Emoji.



<br/>

## Community

<a href="https://discord.gg/9P95USqnMK">![Discord community](https://discordapp.com/api/guilds/899910109642235924/widget.png?style=banner1)</a>

Questions, design discussions, bug reports, and "what would you do for X?"
are all welcome on Discord.  Issues that need a paper trail go in the
[issue tracker](https://github.com/StoneCypher/fsl/issues).



<br/>

## Comparisons

A direct, head-to-head comparison with the other actively-maintained JS state
machine libraries - XState, Stately.js, Finity, machina.js, and others - is
in progress and will live in
[FeatureComparison.md](https://github.com/StoneCypher/jssm/blob/main/src/doc_md/FeatureComparison.md).

A list of related projects, without commentary, is at the bottom of that
file.



<br/>

## Contributing

Issues and PRs are welcome.  The cheapest useful contribution is a language
test case: open a PR with
[`english.json`](https://github.com/StoneCypher/jssm/blob/main/src/ts/tests/language_data/english.json)
translated into your language.  Translating
[`traffic_light.fsl`](https://github.com/StoneCypher/fsl_traffic_light/blob/master/traffic_light.fsl)
into a separate repo and publishing it goes a step further.



<br/>

## Acknowledgements

[Michael Morgan](https://github.com/msmorgan/) has debated significant
sections of the notation, invented several concepts and operators, helped
with the parser and system nomenclature, and published the first non-author
`FSL` machine.  [Vat Raghavan](https://github.com/MachinShin) participated
extensively in language design and implemented several features.  [Forest
Belton](https://github.com/forestbelton) provided guidance, bugfixes, and
parser commentary.  [Jordan
Harbrand](https://github.com/ljharb) suggested two interesting features and
gave strong feedback on the initial tutorial draft.

Translation contributors:

- [Mykhaylo Les](https://github.com/miles91) - [Ukrainian](https://github.com/StoneCypher/jssm/blob/main/src/ts/tests/language_data/ukrainian.json), [Belarusian](https://github.com/StoneCypher/jssm/blob/main/src/ts/tests/language_data/belarussian.json), [Russian](https://github.com/StoneCypher/jssm/blob/main/src/ts/tests/language_data/russian.json)
- [Tanvir Islam](https://github.com/tanvirrb) - [Bengali](https://github.com/StoneCypher/jssm/blob/main/src/ts/tests/language_data/bengali.json) (also published the first non-English `FSL` machine)
- [Francisco Junior](https://github.com/fcojr) - [Portuguese](https://github.com/StoneCypher/jssm/blob/main/src/ts/tests/language_data/portuguese.json)
- [Jeff Katz](https://github.com/kraln) - [German](https://github.com/StoneCypher/jssm/blob/main/src/ts/tests/language_data/german.json)
- [Alex Cresswell](https://github.com/technophile77) - [Spanish](https://github.com/StoneCypher/jssm/blob/main/src/ts/tests/language_data/spanish.json)
- [Dvir Cohen](https://github.com/cohendvir) - [Hebrew](https://github.com/StoneCypher/jssm/blob/main/src/ts/tests/language_data/hebrew.json)
- [David de la Peña](https://github.com/daviddelapena) - [French](https://github.com/StoneCypher/jssm/blob/main/src/ts/tests/language_data/french.json)

If your contribution is missing here, please open an issue.



<br/>

---

<details>
<summary>Stats, coverage, and badges</summary>

<br/>

***{{test_count}} tests***, run {{run_count}} times.

- {{spec_count}} specs with {{spec_coverage}}% coverage
- {{stoch_count}} fuzz tests with {{stoch_coverage}}% coverage
- {{line_count}} TypeScript lines - {{line_test_ratio}} tests per line, {{line_run_ratio}} generated tests per line

[![Actions Status](https://github.com/StoneCypher/jssm/workflows/Node%20CI/badge.svg)](https://github.com/StoneCypher/jssm/actions)
[![NPM version](https://img.shields.io/npm/v/jssm.svg)](https://www.npmjs.com/package/jssm)
[![NPM downloads](https://img.shields.io/npm/dt/jssm.svg)](https://www.npmjs.com/package/jssm)
[![License](https://img.shields.io/npm/l/jssm.svg)](https://github.com/StoneCypher/jssm/blob/main/LICENSE.md)
[![Coveralls status](https://img.shields.io/coveralls/StoneCypher/jssm.svg)](https://coveralls.io/github/StoneCypher/jssm)
[![Open issues](https://img.shields.io/github/issues/StoneCypher/fsl.svg)](https://github.com/StoneCypher/fsl/issues)

</details>
