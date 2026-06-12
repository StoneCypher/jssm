'use strict';

/**
 *  Stately.js adapter.  Machines are `Stately.machine(statesObject, initial)`
 *  with event names becoming methods on the machine object verbatim; action
 *  functions return the next state's name (which doubles as the guard idiom);
 *  `machine.bind(cb)` observes transitions.  No context, no timers.
 */

const Stately = require('stately.js');
const version = require('./_version.cjs')('stately.js');

function statesFor(shape) {
  const states = {};
  for (const e of shape.edges) {
    if (!states[e.from]) states[e.from] = {};
    states[e.from][`to_${e.to}`] = e.to;
  }
  for (const e of shape.edges) {
    if (!states[e.to]) states[e.to] = states[e.to] || {};
  }
  for (const s of Object.keys(states)) {
    states[s]['__reset'] = shape.start;
  }
  return states;
}

module.exports = {

  name    : 'stately.js',
  version,

  caps : { transition: true, action: true, guard: true, hook: true },

  buildDefinition : (shape) => statesFor(shape),
  construct       : (def)   => Stately.machine(def),

  open(shape) {
    const m = Stately.machine(statesFor(shape), shape.start);
    return { m, now: () => m.getMachineState() };
  },
  reset : (ctx)         => ctx.m.__reset(),
  step  : (ctx, target) => ctx.m[`to_${target}`](),

  openAction() {
    const m = Stately.machine({
      a: { go1: 'b' },
      b: { go2: 'c' },
      c: { go3: 'a' },
    }, 'a');
    return { m, now: () => m.getMachineState() };
  },
  stepAction : (ctx, ev) => ctx.m[ev](),

  openGuard() {
    let count = 0;
    const m = Stately.machine({
      a: { to_b: function () { count += 1; return 'b'; } },
      b: { to_a: function () { count += 1; return 'a'; } },
    }, 'a');
    return { m, now: () => m.getMachineState(), guardCount: () => count };
  },
  stepGuard : (ctx, target) => ctx.m[`to_${target}`](),

  openHook() {
    let count = 0;
    const bump = () => { count += 1; };
    const m = Stately.machine({
      a: { to_b: 'b', onEnter: bump },
      b: { to_a: 'a', onEnter: bump },
    }, 'a');
    count = 0;                       // discard any initial-entry notification
    return { m, now: () => m.getMachineState(), hookCount: () => count };
  },
  stepHook : (ctx, target) => ctx.m[`to_${target}`](),

};
