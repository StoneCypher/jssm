'use strict';

/**
 *  robot3 adapter.  Machines are `createMachine({ state: state(transition(...)) })`;
 *  stepping requires an interpreted service (`interpret(machine, onChange)`).
 *  No arbitrary jump, so every state carries a `__reset` transition for the
 *  per-iteration reset.
 */

const { createMachine, state, transition, interpret, guard, reduce } = require('robot3');
const version = require('./_version.cjs')('robot3');

function statesFor(shape, extra = []) {
  const outs = new Map();
  for (const e of shape.edges) {
    if (!outs.has(e.from)) outs.set(e.from, []);
    outs.get(e.from).push(transition(`to_${e.to}`, e.to));
  }
  const states = {};
  const names  = new Set([...shape.edges.map(e => e.from), ...shape.edges.map(e => e.to)]);
  for (const name of names) {
    const ts = outs.get(name) || [];
    states[name] = state(...ts, transition('__reset', shape.start), ...extra);
  }
  return states;
}

module.exports = {

  name    : 'robot3',
  version,

  caps : { transition: true, action: true, guard: true, hook: true, data: true },

  buildDefinition : (shape) => statesFor(shape),
  construct       : (def)   => createMachine(def),

  open(shape) {
    const machine = createMachine(statesFor(shape));
    const service = interpret(machine, () => {});
    return { service, now: () => service.machine.current };
  },
  reset : (ctx)         => ctx.service.send('__reset'),
  step  : (ctx, target) => ctx.service.send(`to_${target}`),

  openAction() {
    const machine = createMachine({
      a: state(transition('go1', 'b')),
      b: state(transition('go2', 'c')),
      c: state(transition('go3', 'a')),
    });
    const service = interpret(machine, () => {});
    return { service, now: () => service.machine.current };
  },
  stepAction : (ctx, ev) => ctx.service.send(ev),

  openGuard() {
    let count = 0;
    const pass = guard(() => { count += 1; return true; });
    const machine = createMachine({
      a: state(transition('to_b', 'b', pass)),
      b: state(transition('to_a', 'a', pass)),
    });
    const service = interpret(machine, () => {});
    return { service, now: () => service.machine.current, guardCount: () => count };
  },
  stepGuard : (ctx, target) => ctx.service.send(`to_${target}`),

  openHook() {
    let count = 0;
    const machine = createMachine({
      a: state(transition('to_b', 'b')),
      b: state(transition('to_a', 'a')),
    });
    const service = interpret(machine, () => { count += 1; });
    return { service, now: () => service.machine.current, hookCount: () => count };
  },
  stepHook : (ctx, target) => ctx.service.send(`to_${target}`),

  openData() {
    const take = reduce((c, ev) => ({ ...c, v: ev.value }));
    const machine = createMachine({
      a: state(transition('to_b', 'b', take)),
      b: state(transition('to_a', 'a', take)),
    }, () => ({ v: undefined }));
    const service = interpret(machine, () => {});
    return { service, now: () => service.machine.current, data: () => service.context.v };
  },
  stepData : (ctx, target, value) => ctx.service.send({ type: `to_${target}`, value }),

};
