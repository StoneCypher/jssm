'use strict';

/**
 *  statebot adapter.  Machines are defined by a flowchart-like chart string;
 *  direct switching is `machine.enter(state)` (validated against the chart),
 *  events wire through performTransitions/Emit, and onSwitched observes.
 */

const { Statebot } = require('statebot');
const version      = require('./_version.cjs')('statebot');

function chartFor(shape) {
  // statebot charts cannot express A -> A self loops in one line set, but our
  // shapes have none; one "from -> to" line per edge.
  return shape.edges.map(e => `${e.from} -> ${e.to}`).join('\n');
}

module.exports = {

  name    : 'statebot',
  version,

  caps : { transition: true, action: true, hook: true, dsl: true },

  buildDefinition : (shape) => ({ chart: chartFor(shape), logLevel: 0 }),
  construct       : (def)   => Statebot('bench', def),

  open(shape) {
    const m = Statebot('bench', { chart: chartFor(shape), startIn: shape.start, logLevel: 0 });
    return { m, start: shape.start, now: () => m.currentState() };
  },
  reset : (ctx)         => ctx.m.enter(ctx.start) || ctx.m.reset(),
  step  : (ctx, target) => ctx.m.enter(target),

  openAction() {
    const m = Statebot('bench-act', { chart: `a -> b -> c -> a`, startIn: 'a', logLevel: 0 });
    m.performTransitions({
      'a -> b': { on: 'go1' },
      'b -> c': { on: 'go2' },
      'c -> a': { on: 'go3' },
    });
    return { m, now: () => m.currentState() };
  },
  stepAction : (ctx, ev) => ctx.m.emit(ev),

  openHook() {
    const m = Statebot('bench-hook', { chart: `a -> b\nb -> a`, startIn: 'a', logLevel: 0 });
    let count = 0;
    m.onSwitched(() => { count += 1; });
    return { m, now: () => m.currentState(), hookCount: () => count };
  },
  stepHook : (ctx, target) => ctx.m.enter(target),

};
