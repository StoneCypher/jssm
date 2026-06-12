'use strict';

/**
 *  pastafarian adapter.  A ~550-byte event-emitter FSM: `new StateMachine({
 *  initial, states: { s: [allowed targets] } })`; `go(target, param)` is a
 *  synchronous target-state transition validated against the adjacency list;
 *  `on('*', (prev, next) => ...)` observes every transition; the per-state
 *  `on(state, (prev, param) => ...)` handler receives the `go` payload.
 *  Current state is `m.current`.  No event names, no guards.
 */

const StateMachine = require('pastafarian');
const version      = require('./_version.cjs')('pastafarian');

function optsFor(shape) {
  const states = {};
  for (const e of shape.edges) {
    if (!states[e.from]) states[e.from] = [];
    states[e.from].push(e.to);
  }
  for (const e of shape.edges) {
    if (!states[e.to]) states[e.to] = [];
  }
  for (const s of Object.keys(states)) {
    if (!states[s].includes(shape.start)) states[s].push(shape.start);   // allow reset edge
  }
  return { initial: shape.start, states };
}

module.exports = {

  name    : 'pastafarian',
  version,

  caps : { transition: true, hook: true, data: true },

  buildDefinition : optsFor,
  construct       : (opts) => new StateMachine(opts),

  open(shape) {
    const m = new StateMachine(optsFor(shape));
    return { m, start: shape.start, now: () => m.current };
  },
  reset : (ctx)         => ctx.m.go(ctx.start),
  step  : (ctx, target) => ctx.m.go(target),

  openHook() {
    let count = 0;
    const m = new StateMachine({ initial: 'a', states: { a: ['b'], b: ['a'] } });
    m.on('*', () => { count += 1; });
    return { m, now: () => m.current, hookCount: () => count };
  },
  stepHook : (ctx, target) => ctx.m.go(target),

  openData() {
    let v;
    const m = new StateMachine({ initial: 'a', states: { a: ['b'], b: ['a'] } });
    m.on('a', (_prev, param) => { if (param !== undefined) v = param; });
    m.on('b', (_prev, param) => { if (param !== undefined) v = param; });
    return { m, now: () => m.current, data: () => v };
  },
  stepData : (ctx, target, value) => ctx.m.go(target, value),

};
