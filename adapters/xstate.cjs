'use strict';

/**
 *  XState (v5) adapter for the shootout suite.
 *
 *  Idiomatic definition: a `createMachine` config object built from the edge
 *  list — object configs are XState's real-world entry path, so its
 *  `construct()` price is `createMachine(config)`, not string parsing.
 *
 *  Transition path: the pure `transition(machine, snapshot, event)` /
 *  `initialTransition(machine)` functions — XState v5's allocation-light
 *  functional core — rather than spinning actors, which would bill actor
 *  lifecycle against the library unfairly.  Each edge `from -> to` is modeled
 *  as event `to_<to>` on `from`, the direct equivalent of jssm's
 *  target-state-named transition call.
 *
 *  @see ../shapes.cjs for the shared shape contract.
 */

const { createMachine, transition, initialTransition } = require('xstate');
const { version } = require('xstate/package.json');

/** Build the createMachine config for an edge list (not measured). */
function configFor(shape) {
  const states = {};
  for (const e of shape.edges) {
    if (!states[e.from]) states[e.from] = { on: {} };
    if (!states[e.to])   states[e.to]   = { on: {} };
    states[e.from].on[`to_${e.to}`] = e.to;
  }
  return { id: shape.name, initial: shape.start, states };
}

module.exports = {

  name    : 'xstate',
  version,

  buildDefinition(shape) {
    return configFor(shape);
  },

  /** Measured: build a machine from the idiomatic definition. */
  construct(def) {
    return createMachine(def);
  },

  /** Unmeasured: machine plus a cursor snapshot for the transition() bench. */
  open(shape) {
    const machine = createMachine(configFor(shape));
    const [snap]  = initialTransition(machine);
    return { machine, snap0: snap, snap };
  },

  reset(ctx) {
    ctx.snap = ctx.snap0;
  },

  /** Measured: one legal transition step via the pure transition function. */
  step(ctx, target) {
    const [next] = transition(ctx.machine, ctx.snap, { type: `to_${target}` });
    ctx.snap = next;
  },

};
