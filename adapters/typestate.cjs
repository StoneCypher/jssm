'use strict';

/**
 *  TypeState adapter.  Fluent `fsm.from(a).to(b)` edge declaration; stepping
 *  is target-state `fsm.go(target)`; `fsm.on(state, cb)` observes entries;
 *  `fsm.onExit(state, cb)` is a vetoing exit guard (return true to allow).
 *  No event names, no context, no timers.  `currentState` is a public
 *  property, which serves as the reset jump.
 */

const { TypeState } = require('typestate');
const { FiniteStateMachine } = TypeState;
const version = require('./_version.cjs')('typestate');

function build(shape) {
  const fsm = new FiniteStateMachine(shape.start);
  for (const e of shape.edges) fsm.from(e.from).to(e.to);
  return fsm;
}

module.exports = {

  name    : 'typestate',
  version,

  caps : { transition: true, guard: true, hook: true },

  buildDefinition : (shape) => shape,
  construct       : (shape) => build(shape),

  open(shape) {
    const fsm = build(shape);
    return { fsm, start: shape.start, now: () => fsm.currentState };
  },
  reset : (ctx)         => { ctx.fsm.currentState = ctx.start; },
  step  : (ctx, target) => ctx.fsm.go(target),

  openGuard() {
    let count = 0;
    const fsm = new FiniteStateMachine('a');
    fsm.from('a').to('b');
    fsm.from('b').to('a');
    fsm.onExit('a', () => { count += 1; return true; });
    fsm.onExit('b', () => { count += 1; return true; });
    return { fsm, now: () => fsm.currentState, guardCount: () => count };
  },
  stepGuard : (ctx, target) => ctx.fsm.go(target),

  openHook() {
    let count = 0;
    const fsm = new FiniteStateMachine('a');
    fsm.from('a').to('b');
    fsm.from('b').to('a');
    fsm.on('a', () => { count += 1; });
    fsm.on('b', () => { count += 1; });
    return { fsm, now: () => fsm.currentState, hookCount: () => count };
  },
  stepHook : (ctx, target) => ctx.fsm.go(target),

};
