'use strict';

/**
 *  fn-machine adapter.  `machine([state(...)], initial, context, onChange)`
 *  returns a `send(transitionName, detail)` function; each state's transition
 *  methods return `{ state, context }`.  Observers arrive via the
 *  stateChangeCallback.  No arbitrary jump, so every state gets a `doReset`
 *  transition; payload rides `detail` into context.
 */

const { machine, state } = require('fn-machine');
const version = require('./_version.cjs')('fn-machine');

function statesFor(shape) {
  const outs = new Map();
  for (const e of shape.edges) {
    if (!outs.has(e.from)) outs.set(e.from, {});
    outs.get(e.from)[`to_${e.to}`] = () => ({ state: e.to });
  }
  const names = new Set([...shape.edges.map(e => e.from), ...shape.edges.map(e => e.to)]);
  const states = [];
  for (const name of names) {
    const tr = outs.get(name) || {};
    tr.doReset = () => ({ state: shape.start });
    states.push(state(name, tr));
  }
  return states;
}

module.exports = {

  name    : 'fn-machine',
  version,

  caps : { transition: true, action: true, hook: true, data: true },

  buildDefinition : (shape) => statesFor(shape),
  construct       : (states) => machine(states, 's0', {}, () => {}),

  open(shape) {
    let current = shape.start;
    const send = machine(statesFor(shape), shape.start, {}, (s) => { current = s.state; });
    return { send, now: () => current };
  },
  reset : (ctx)         => ctx.send('doReset'),
  step  : (ctx, target) => ctx.send(`to_${target}`),

  openAction() {
    let current = 'a';
    const send = machine([
      state('a', { go1: () => ({ state: 'b' }) }),
      state('b', { go2: () => ({ state: 'c' }) }),
      state('c', { go3: () => ({ state: 'a' }) }),
    ], 'a', {}, (s) => { current = s.state; });
    return { send, now: () => current };
  },
  stepAction : (ctx, ev) => ctx.send(ev),

  openHook() {
    let current = 'a', count = 0;
    const send = machine([
      state('a', { to_b: () => ({ state: 'b' }) }),
      state('b', { to_a: () => ({ state: 'a' }) }),
    ], 'a', {}, (s) => { current = s.state; count += 1; });
    return { send, now: () => current, hookCount: () => count };
  },
  stepHook : (ctx, target) => ctx.send(`to_${target}`),

  openData() {
    let current = 'a', ctxObj = {};
    const send = machine([
      state('a', { to_b: (detail) => ({ state: 'b', context: { v: detail } }) }),
      state('b', { to_a: (detail) => ({ state: 'a', context: { v: detail } }) }),
    ], 'a', { v: undefined }, (s) => { current = s.state; ctxObj = s.context; });
    return { send, now: () => current, data: () => ctxObj.v };
  },
  stepData : (ctx, target, value) => ctx.send(`to_${target}`, value),

};
