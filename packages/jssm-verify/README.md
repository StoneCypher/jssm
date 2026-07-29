# jssm-verify

Temporal **safety-property verification** for [jssm](https://www.npmjs.com/package/jssm) state machines — invariants, reachability, and counterexample traces you can replay.

```js
import { sm }                                from 'jssm';
import { check_safety, absence, reachable }  from 'jssm-verify';

const door = sm`shut 'open' -> ajar 'open' -> wide;`;

check_safety(door, reachable('wide')).holds;   // true

const r = check_safety(door, absence('wide'));
r.holds;    // false
r.trace;    // [ 'shut', 'ajar', 'wide' ]  — the shortest witness
```

A failing property does not just say *no*. It hands back the shortest path that violates it, which is the skeleton of a replayable trace.

## What it checks

**Safety**, which for a finite-state machine is reachability over the state graph — cheap to decide, and always with a finite counterexample.

- **Invariants** — `always(p)`, `never(p)`
- **Reachability** — `reachable(s)`, `unreachable(s)`
- **Dwyer patterns** — `absence(s)`, `existence(s)`
- **A predicate algebra** — `in_state`, `is_terminal`, `is_final`, `is_error`, closed under `p_not` / `p_and` / `p_or`

Everything is pure and read-only: it consults the machine's public surface and never mutates it.

## It works without jssm too

`jssm` is an **optional peer dependency**, not a hard one. It is imported for types only, so the shipped bundle contains none of it.

That means the graph-facing half of the API works on any adjacency structure, with no machine and no jssm install:

```js
import { check_graph_safety } from 'jssm-verify';

const graph = {
  nodes:        [ { id: 'start', labels: [] }, { id: 'danger', labels: ['bad'] } ],
  edges:        [ { from: 'start', to: 'danger' } ],
  start_states: [ 'start' ],
};

check_graph_safety(graph, { kind: 'invariant', label: 'bad' }).holds;   // false
```

Useful if you are verifying a machine that came from somewhere else, or checking a graph you built yourself.

## Types

TypeScript declarations ship in this package. There is no `@types/jssm-verify` and there never will be.

## License

MIT
