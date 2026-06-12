'use strict';

/**
 *  @xstate/fsm adapter — the minimal 1kb predecessor of XState.  Pure
 *  `machine.transition(state, event)` stepping; `assign` is applied during
 *  the pure transition; observers require `interpret()`.
 */

const { createMachine, interpret, assign } = require('@xstate/fsm');
const { version } = require('@xstate/fsm/package.json');

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

  name    : '@xstate/fsm',
  version,

  caps : { transition: true, action: true, guard: true, hook: true, data: true },

  buildDefinition : configFor,
  construct       : (def) => createMachine(def),

  open(shape) {
    const machine = createMachine(configFor(shape));
    const ctx = { machine, snap0: machine.initialState, snap: machine.initialState, now: () => ctx.snap.value };
    return ctx;
  },
  reset : (ctx) => { ctx.snap = ctx.snap0; },
  step  : (ctx, target) => { ctx.snap = ctx.machine.transition(ctx.snap, `to_${target}`); },

  openAction() {
    const machine = createMachine({
      id: 'act', initial: 'a',
      states: { a: { on: { go1: 'b' } }, b: { on: { go2: 'c' } }, c: { on: { go3: 'a' } } },
    });
    const ctx = { machine, snap: machine.initialState, now: () => ctx.snap.value };
    return ctx;
  },
  stepAction : (ctx, ev) => { ctx.snap = ctx.machine.transition(ctx.snap, ev); },

  openGuard() {
    let count = 0;
    const machine = createMachine({
      id: 'grd', initial: 'a',
      states: {
        a: { on: { to_b: { target: 'b', cond: () => { count += 1; return true; } } } },
        b: { on: { to_a: { target: 'a', cond: () => { count += 1; return true; } } } },
      },
    });
    const ctx = { machine, snap: machine.initialState, now: () => ctx.snap.value, guardCount: () => count };
    return ctx;
  },
  stepGuard : (ctx, target) => { ctx.snap = ctx.machine.transition(ctx.snap, `to_${target}`); },

  openHook() {
    let count = 0;
    const machine = createMachine({
      id: 'hk', initial: 'a',
      states: { a: { on: { to_b: 'b' } }, b: { on: { to_a: 'a' } } },
    });
    const service = interpret(machine).start();
    service.subscribe(() => { count += 1; });
    count = 0;                                   // discard the immediate replay
    return { service, now: () => service.state.value, hookCount: () => count };
  },
  stepHook : (ctx, target) => { ctx.service.send(`to_${target}`); },

  openData() {
    const machine = createMachine({
      id: 'dat', initial: 'a', context: { v: undefined },
      states: {
        a: { on: { to_b: { target: 'b', actions: assign({ v: (_c, ev) => ev.value }) } } },
        b: { on: { to_a: { target: 'a', actions: assign({ v: (_c, ev) => ev.value }) } } },
      },
    });
    const ctx = { machine, snap: machine.initialState, now: () => ctx.snap.value, data: () => ctx.snap.context.v };
    return ctx;
  },
  stepData : (ctx, target, value) => { ctx.snap = ctx.machine.transition(ctx.snap, { type: `to_${target}`, value }); },

};
