'use strict';

/**
 *  nanostate adapter.  Tiny evented FSM: `nanostate(initial, { state: {
 *  event: 'target' } })`, dispatch via `.emit(event)`, observers via
 *  `.on(stateName, cb)`.  No jump, guards, context, or timers; `__reset`
 *  events provide the per-iteration reset.
 */

const nanostate   = require('nanostate');
const { version } = require('nanostate/package.json');

function defFor(shape) {
  const table = {};
  for (const e of shape.edges) {
    if (!table[e.from]) table[e.from] = {};
    if (!table[e.to])   table[e.to]   = table[e.to] || {};
    table[e.from][`to_${e.to}`] = e.to;
  }
  for (const e of shape.edges) {
    if (!table[e.to]) table[e.to] = {};
  }
  for (const s of Object.keys(table)) {
    table[s]['__reset'] = shape.start;
  }
  return { start: shape.start, table };
}

module.exports = {

  name    : 'nanostate',
  version,

  caps : { transition: true, action: true, hook: true },

  buildDefinition : defFor,
  construct       : (def) => nanostate(def.start, def.table),

  open(shape) {
    const def = defFor(shape);
    const m   = nanostate(def.start, def.table);
    return { m, now: () => m.state };
  },
  reset : (ctx)         => ctx.m.emit('__reset'),
  step  : (ctx, target) => ctx.m.emit(`to_${target}`),

  openAction() {
    const m = nanostate('a', { a: { go1: 'b' }, b: { go2: 'c' }, c: { go3: 'a' } });
    return { m, now: () => m.state };
  },
  stepAction : (ctx, ev) => ctx.m.emit(ev),

  openHook() {
    const m = nanostate('a', { a: { to_b: 'b' }, b: { to_a: 'a' } });
    let count = 0;
    m.on('b', () => { count += 1; });
    m.on('a', () => { count += 1; });
    return { m, now: () => m.state, hookCount: () => count };
  },
  stepHook : (ctx, target) => ctx.m.emit(`to_${target}`),

};
