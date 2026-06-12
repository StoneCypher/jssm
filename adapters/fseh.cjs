'use strict';

/**
 *  fseh adapter.  A behavioral state machine: states map event names to
 *  handler functions, the current state is `m.state`, and `m.enter(state)` is
 *  the transition primitive (any state to any state — fseh has no edge-graph,
 *  so there is no notion of an illegal transition; the behavior battery
 *  records that).  `m.process(event)` dispatches an event but is async
 *  (Promise) and Express-middleware-shaped, so only the synchronous `enter`
 *  transition path is benchmarked here.
 */

const { Machine } = require('fseh');
const version = require('./_version.cjs')('fseh');

function statesFor(shape) {
  const states = {};
  const names  = new Set([...shape.edges.map(e => e.from), ...shape.edges.map(e => e.to)]);
  for (const name of names) states[name] = {};
  return states;
}

module.exports = {

  name    : 'fseh',
  version,

  caps : { transition: true },

  buildDefinition : (shape) => ({ states: statesFor(shape), start: shape.start }),
  construct       : (def)   => new Machine(def.states, def.start),

  open(shape) {
    const m = new Machine(statesFor(shape), shape.start);
    return { m, start: shape.start, now: () => m.state };
  },
  reset : (ctx)         => ctx.m.enter(ctx.start),
  step  : (ctx, target) => ctx.m.enter(target),

};
