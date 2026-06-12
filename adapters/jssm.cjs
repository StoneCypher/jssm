'use strict';

/**
 *  jssm adapter (v2 contract — see ../contract.md).
 *
 *  Idiomatic paths: FSL text construct (parse included — that's the real
 *  entry price); target-state transition(); action() event dispatch; edge
 *  hooks as guards; any-transition hook as observer; transition data payload;
 *  FSL `after` clauses for native timers.
 */

const jssm = require('jssm');

const TIMER_MS = 1000;

module.exports = {

  name    : 'jssm',
  version : jssm.version,

  caps : { transition: true, action: true, guard: true, hook: true, data: true, timer: true },

  // ---- core ----
  buildDefinition : (shape) => shape.fsl,
  construct       : (def)   => jssm.sm([def]),

  open(shape) {
    const machine = jssm.sm([shape.fsl]);
    return { machine, start: shape.start, now: () => machine.state() };
  },
  reset : (ctx)         => ctx.machine.override(ctx.start),
  step  : (ctx, target) => ctx.machine.transition(target),

  // ---- action ----
  openAction() {
    const machine = jssm.sm([`a 'go1' -> b 'go2' -> c 'go3' -> a;`]);
    return { machine, now: () => machine.state() };
  },
  stepAction : (ctx, ev) => ctx.machine.action(ev),

  // ---- guard (edge hooks that pass) ----
  openGuard() {
    const machine = jssm.sm([`a -> b; b -> a;`]);
    let count = 0;
    const handler = () => { count += 1; return true; };
    machine.set_hook({ from: 'a', to: 'b', kind: 'hook', handler });
    machine.set_hook({ from: 'b', to: 'a', kind: 'hook', handler });
    return { machine, now: () => machine.state(), guardCount: () => count };
  },
  stepGuard : (ctx, target) => ctx.machine.transition(target),

  // ---- hook (any-transition observer) ----
  openHook() {
    const machine = jssm.sm([`a -> b; b -> a;`]);
    let count = 0;
    machine.set_hook({ kind: 'any transition', handler: () => { count += 1; return true; } });
    return { machine, now: () => machine.state(), hookCount: () => count };
  },
  stepHook : (ctx, target) => ctx.machine.transition(target),

  // ---- data (transition payload) ----
  openData() {
    const machine = jssm.sm([`a -> b; b -> a;`]);
    return { machine, now: () => machine.state(), data: () => machine.data() };
  },
  stepData : (ctx, target, value) => ctx.machine.transition(target, value),

  // ---- timer (FSL `after` clause; entering b arms b -> a) ----
  // NB the explicit clear_state_timeout() in stepTimer: on released jssm,
  // hookless machines do not clear `after` timeouts when leaving the state
  // early (StoneCypher/jssm#723 — stale fire + re-arm throw).  Drop the
  // explicit clear when that fix ships.  Bare `after N` is SECONDS in FSL;
  // the `ms` suffix matters.
  timerDelayMs : () => TIMER_MS,
  openTimer() {
    const machine = jssm.sm([`a -> b; b after ${TIMER_MS}ms -> a;`]);
    return { machine, now: () => machine.state() };
  },
  stepTimer(ctx) {                       // arm, disarm-by-leaving, clear (see #723)
    ctx.machine.transition('b');
    ctx.machine.transition('a');
    ctx.machine.clear_state_timeout();
  },
  armTimer   : (ctx) => ctx.machine.transition('b'),
  closeTimer : (ctx) => { try { ctx.machine.clear_state_timeout(); } catch { /* none armed */ } },

};
