'use strict';

/**
 *  XState v5 adapter (v2 contract — see ../contract.md).
 *
 *  Idiomatic paths: createMachine(config) construct; the pure
 *  transition()/initialTransition() core for stepping, events, guards, and
 *  context updates (assign is a builtin executed by the pure path); actors
 *  for the hook and timer families, which genuinely require a runtime
 *  (entry actions and `after` clocks don't exist outside one).
 */

const { createMachine, createActor, transition, initialTransition, assign } = require('xstate');
const { version } = require('xstate/package.json');

const TIMER_MS = 1000;

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

  name    : 'xstate',
  version,

  caps : { transition: true, action: true, guard: true, hook: true, data: true, timer: true },

  // ---- core (pure transition) ----
  buildDefinition : configFor,
  construct       : (def) => createMachine(def),

  open(shape) {
    const machine = createMachine(configFor(shape));
    const [snap0] = initialTransition(machine);
    const ctx     = { machine, snap0, snap: snap0, now: () => ctx.snap.value };
    return ctx;
  },
  reset : (ctx) => { ctx.snap = ctx.snap0; },
  step  : (ctx, target) => { [ctx.snap] = transition(ctx.machine, ctx.snap, { type: `to_${target}` }); },

  // ---- action (event-named, pure) ----
  openAction() {
    const machine = createMachine({
      id: 'act', initial: 'a',
      states: { a: { on: { go1: 'b' } }, b: { on: { go2: 'c' } }, c: { on: { go3: 'a' } } },
    });
    const [snap0] = initialTransition(machine);
    const ctx     = { machine, snap: snap0, now: () => ctx.snap.value };
    return ctx;
  },
  stepAction : (ctx, ev) => { [ctx.snap] = transition(ctx.machine, ctx.snap, { type: ev }); },

  // ---- guard (pure; guards run during transition evaluation) ----
  openGuard() {
    let count = 0;
    const machine = createMachine({
      id: 'grd', initial: 'a',
      states: {
        a: { on: { to_b: { target: 'b', guard: () => { count += 1; return true; } } } },
        b: { on: { to_a: { target: 'a', guard: () => { count += 1; return true; } } } },
      },
    });
    const [snap0] = initialTransition(machine);
    const ctx     = { machine, snap: snap0, now: () => ctx.snap.value, guardCount: () => count };
    return ctx;
  },
  stepGuard : (ctx, target) => { [ctx.snap] = transition(ctx.machine, ctx.snap, { type: `to_${target}` }); },

  // ---- hook (actor entry actions; observers need a runtime) ----
  openHook() {
    let count = 0;
    const bump    = () => { count += 1; };
    const machine = createMachine({
      id: 'hk', initial: 'a',
      states: {
        a: { entry: bump, on: { to_b: 'b' } },
        b: { entry: bump, on: { to_a: 'a' } },
      },
    });
    const actor = createActor(machine).start();
    count = 0;                                       // discard the initial entry
    const ctx = { actor, now: () => actor.getSnapshot().value, hookCount: () => count };
    return ctx;
  },
  stepHook : (ctx, target) => { ctx.actor.send({ type: `to_${target}` }); },

  // ---- data (assign; builtin executed by the pure path) ----
  openData() {
    const machine = createMachine({
      id: 'dat', initial: 'a', context: { v: undefined },
      states: {
        a: { on: { to_b: { target: 'b', actions: assign({ v: ({ event }) => event.value }) } } },
        b: { on: { to_a: { target: 'a', actions: assign({ v: ({ event }) => event.value }) } } },
      },
    });
    const [snap0] = initialTransition(machine);
    const ctx     = { machine, snap: snap0, now: () => ctx.snap.value, data: () => ctx.snap.context.v };
    return ctx;
  },
  stepData : (ctx, target, value) => { [ctx.snap] = transition(ctx.machine, ctx.snap, { type: `to_${target}`, value }); },

  // ---- serialization round-trip (actor persistence) ----
  // XState persists runtime state through actors: getPersistedSnapshot() ->
  // createActor(machine, { snapshot }). The pure transition path can't persist
  // on its own, so this exercises the actor API (the library's real mechanism).
  trySerialize() {
    const machine = createMachine({ id: 'ser', initial: 'a',
      states: { a: { on: { go: 'b' } }, b: { on: { go: 'a' } } } });
    const a1 = createActor(machine).start();
    a1.send({ type: 'go' });                 // a -> b
    const snap = a1.getPersistedSnapshot();
    a1.stop();
    const a2 = createActor(machine, { snapshot: snap }).start();
    const v = a2.getSnapshot().value;
    a2.stop();
    return v === 'b';
  },

  // ---- terminal/final states ----
  tryTermination() {
    const machine = createMachine({ id: 'fin', initial: 'a',
      states: { a: { on: { go: 'b' } }, b: { type: 'final' } } });
    const actor = createActor(machine).start();
    actor.send({ type: 'go' });
    const done = actor.getSnapshot().status === 'done';
    actor.stop();
    return done;
  },

  // ---- timer (actor `after`; clocks need a runtime) ----
  timerDelayMs : () => TIMER_MS,
  openTimer() {
    const machine = createMachine({
      id: 'tmr', initial: 'a',
      states: {
        a: { on: { to_b: 'b' } },
        b: { on: { to_a: 'a' }, after: { [TIMER_MS]: 'a' } },
      },
    });
    const actor = createActor(machine).start();
    return { actor, now: () => actor.getSnapshot().value };
  },
  stepTimer(ctx) {
    ctx.actor.send({ type: 'to_b' });   // arm
    ctx.actor.send({ type: 'to_a' });   // disarm by leaving
  },
  armTimer   : (ctx) => { ctx.actor.send({ type: 'to_b' }); },
  closeTimer : (ctx) => { ctx.actor.stop(); },

};
