'use strict';

/**
 *  machina (6.x) adapter.  The 6.x rewrite diverges from the historical docs:
 *  current state is `compositeState()` (`.state` is gone), handlers receive
 *  `(api, ...args)` where api = { ctx, inputName, defer, emit }, returning a
 *  state-name string performs the transition, payload lands via `api.ctx`
 *  mutation (readable at `m.context`), and observers subscribe to the
 *  'transitioned' event.  `m.transition(state)` is a direct jump (resets).
 *  Handler functions stand in for guards — machina's documented idiom.
 */

const machina = require('machina');
const version = require('./_version.cjs')('machina');

function defFor(shape) {
  const states = {};
  for (const e of shape.edges) {
    if (!states[e.from]) states[e.from] = {};
    states[e.from][`to_${e.to}`] = e.to;
  }
  for (const e of shape.edges) {
    if (!states[e.to]) states[e.to] = {};
  }
  return { initialState: shape.start, states };
}

module.exports = {

  name    : 'machina',
  version,

  caps : { transition: true, action: true, guard: true, hook: true, data: true },

  buildDefinition : defFor,
  construct       : (def) => new machina.Fsm(def),

  open(shape) {
    const m = new machina.Fsm(defFor(shape));
    return { m, start: shape.start, now: () => m.compositeState() };
  },
  reset : (ctx)         => ctx.m.transition(ctx.start),
  step  : (ctx, target) => ctx.m.handle(`to_${target}`),

  openAction() {
    const m = new machina.Fsm({
      initialState: 'a',
      states: { a: { go1: 'b' }, b: { go2: 'c' }, c: { go3: 'a' } },
    });
    return { m, now: () => m.compositeState() };
  },
  stepAction : (ctx, ev) => ctx.m.handle(ev),

  openGuard() {
    let count = 0;
    const m = new machina.Fsm({
      initialState: 'a',
      states: {
        a: { to_b: () => { count += 1; return 'b'; } },
        b: { to_a: () => { count += 1; return 'a'; } },
      },
    });
    return { m, now: () => m.compositeState(), guardCount: () => count };
  },
  stepGuard : (ctx, target) => ctx.m.handle(`to_${target}`),

  openHook() {
    let count = 0;
    const m = new machina.Fsm({
      initialState: 'a',
      states: { a: { to_b: 'b' }, b: { to_a: 'a' } },
    });
    m.on('transitioned', () => { count += 1; });
    return { m, now: () => m.compositeState(), hookCount: () => count };
  },
  stepHook : (ctx, target) => ctx.m.handle(`to_${target}`),

  openData() {
    const m = new machina.Fsm({
      initialState: 'a',
      states: {
        a: { to_b: (api, value) => { api.ctx.v = value; return 'b'; } },
        b: { to_a: (api, value) => { api.ctx.v = value; return 'a'; } },
      },
    });
    return { m, now: () => m.compositeState(), data: () => m.context.v };
  },
  stepData : (ctx, target, value) => ctx.m.handle(`to_${target}`, value),

};
