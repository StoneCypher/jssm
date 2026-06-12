'use strict';

/**
 *  easy-fsm adapter.  `new EasyFSM({ initial, states: { s: { on: { event:
 *  target } } } })`; dispatch via `send(event)`; current state via the
 *  `state` getter; observers via `onEnter(state, cb)`.  No arbitrary jump, so
 *  every state carries a `doreset` event.  No guard or context primitives.
 */

const EasyFSM = require('easy-fsm');
const version = require('./_version.cjs')('easy-fsm');

function optionsFor(shape) {
  const states = {};
  for (const e of shape.edges) {
    if (!states[e.from]) states[e.from] = { on: {} };
    if (!states[e.to])   states[e.to]   = states[e.to] || { on: {} };
    states[e.from].on[`to_${e.to}`] = e.to;
  }
  for (const s of Object.keys(states)) {
    states[s].on = states[s].on || {};
    states[s].on.doreset = shape.start;
  }
  return { initial: shape.start, states };
}

module.exports = {

  name    : 'easy-fsm',
  version,

  caps : { transition: true, action: true, hook: true },

  buildDefinition : optionsFor,
  construct       : (opts) => new EasyFSM(opts),

  open(shape) {
    const m = new EasyFSM(optionsFor(shape));
    return { m, now: () => m.state };
  },
  reset : (ctx)         => ctx.m.send('doreset'),
  step  : (ctx, target) => ctx.m.send(`to_${target}`),

  openAction() {
    const m = new EasyFSM({
      initial: 'a',
      states: {
        a: { on: { go1: 'b' } },
        b: { on: { go2: 'c' } },
        c: { on: { go3: 'a' } },
      },
    });
    return { m, now: () => m.state };
  },
  stepAction : (ctx, ev) => ctx.m.send(ev),

  openHook() {
    let count = 0;
    const m = new EasyFSM({
      initial: 'a',
      states: { a: { on: { to_b: 'b' } }, b: { on: { to_a: 'a' } } },
    });
    m.onEnter('a', () => { count += 1; });
    m.onEnter('b', () => { count += 1; });
    return { m, now: () => m.state, hookCount: () => count };
  },
  stepHook : (ctx, target) => ctx.m.send(`to_${target}`),

};
