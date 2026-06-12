'use strict';

/**
 *  finity adapter.  Fluent configuration DSL; event dispatch via
 *  `machine.handle(event[, payload])`; guards via `.withCondition`; global
 *  observers via `.global().onStateEnter`; payload travels as
 *  `context.eventPayload` into transition actions.  No direct jump, so every
 *  state carries a `__reset` event.
 */

const Finity  = require('finity');
const version = require('./_version.cjs')('finity');

function configure(shape, decorate) {
  const byFrom = new Map();
  for (const e of shape.edges) {
    if (!byFrom.has(e.from)) byFrom.set(e.from, []);
    byFrom.get(e.from).push(e.to);
  }
  const names = new Set([...shape.edges.map(e => e.from), ...shape.edges.map(e => e.to)]);

  let cfg = Finity.configure().initialState(shape.start);
  for (const tos of [byFrom.get(shape.start) || []]) {
    for (const to of tos) cfg = cfg.on(`to_${to}`).transitionTo(to);
  }
  cfg = cfg.on('__reset').selfTransition();
  for (const name of names) {
    if (name === shape.start) continue;
    cfg = cfg.state(name);
    for (const to of (byFrom.get(name) || [])) cfg = cfg.on(`to_${to}`).transitionTo(to);
    cfg = cfg.on('__reset').transitionTo(shape.start);
  }
  if (decorate) cfg = decorate(cfg);
  return cfg;
}

module.exports = {

  name    : 'finity',
  version,

  caps : { transition: true, action: true, guard: true, hook: true, data: true },

  buildDefinition : (shape) => configure(shape),
  construct       : (cfg)   => cfg.start(),

  open(shape) {
    const m = configure(shape).start();
    return { m, now: () => m.getCurrentState() };
  },
  reset : (ctx)         => ctx.m.handle('__reset'),
  step  : (ctx, target) => ctx.m.handle(`to_${target}`),

  openAction() {
    const m = Finity.configure()
      .initialState('a').on('go1').transitionTo('b')
      .state('b').on('go2').transitionTo('c')
      .state('c').on('go3').transitionTo('a')
      .start();
    return { m, now: () => m.getCurrentState() };
  },
  stepAction : (ctx, ev) => ctx.m.handle(ev),

  openGuard() {
    let count = 0;
    const pass = () => { count += 1; return true; };
    const m = Finity.configure()
      .initialState('a').on('to_b').transitionTo('b').withCondition(pass)
      .state('b').on('to_a').transitionTo('a').withCondition(pass)
      .start();
    return { m, now: () => m.getCurrentState(), guardCount: () => count };
  },
  stepGuard : (ctx, target) => ctx.m.handle(`to_${target}`),

  openHook() {
    let count = 0;
    const m = Finity.configure()
      .initialState('a').on('to_b').transitionTo('b')
      .state('b').on('to_a').transitionTo('a')
      .global().onStateEnter(() => { count += 1; })
      .start();
    count = 0;                               // discard the initial entry
    return { m, now: () => m.getCurrentState(), hookCount: () => count };
  },
  stepHook : (ctx, target) => ctx.m.handle(`to_${target}`),

  openData() {
    let v;
    const grab = (_from, _to, context) => { v = context.eventPayload; };
    const m = Finity.configure()
      .initialState('a').on('to_b').transitionTo('b').withAction(grab)
      .state('b').on('to_a').transitionTo('a').withAction(grab)
      .start();
    return { m, now: () => m.getCurrentState(), data: () => v };
  },
  stepData : (ctx, target, value) => ctx.m.handle(`to_${target}`, value),

};
