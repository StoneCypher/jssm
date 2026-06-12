'use strict';

/**
 *  javascript-state-machine (jakesgordon, 3.x) adapter.
 *  Definitions are `{ init, transitions: [{ name, from, to }] }`; dispatch is
 *  a generated method per transition name.  No arbitrary jump exists, so a
 *  wildcard `__reset` transition provides the per-iteration reset.
 */

const StateMachine = require('javascript-state-machine');
const { version }  = require('javascript-state-machine/package.json');

// NB: the library camelizes transition names when generating methods
// (`tob` would become method `toB`), so names avoid underscores entirely:
// `to<state>` stays verbatim.
function defFor(shape) {
  const byName = new Map();
  for (const e of shape.edges) {
    const name = `to${e.to}`;
    if (!byName.has(name)) byName.set(name, { name, from: [], to: e.to });
    byName.get(name).from.push(e.from);
  }
  const transitions = [...byName.values()];
  transitions.push({ name: 'doreset', from: '*', to: shape.start });
  return { init: shape.start, transitions };
}

module.exports = {

  name    : 'javascript-state-machine',
  version,

  caps : { transition: true, action: true, guard: true, hook: true, data: true },

  buildDefinition : defFor,
  construct       : (def) => new StateMachine(def),

  open(shape) {
    const m = new StateMachine(defFor(shape));
    return { m, now: () => m.state };
  },
  reset : (ctx)         => ctx.m.doreset(),
  step  : (ctx, target) => ctx.m[`to${target}`](),

  openAction() {
    const m = new StateMachine({
      init: 'a',
      transitions: [
        { name: 'go1', from: 'a', to: 'b' },
        { name: 'go2', from: 'b', to: 'c' },
        { name: 'go3', from: 'c', to: 'a' },
      ],
    });
    return { m, now: () => m.state };
  },
  stepAction : (ctx, ev) => ctx.m[ev](),

  openGuard() {
    let count = 0;
    const m = new StateMachine({
      init: 'a',
      transitions: [
        { name: 'tob', from: 'a', to: 'b' },
        { name: 'toa', from: 'b', to: 'a' },
      ],
      methods: {
        onBeforeTransition() { count += 1; return true; },
      },
    });
    count = 0;                       // discard the construction-time init transition
    return { m, now: () => m.state, guardCount: () => count };
  },
  stepGuard : (ctx, target) => ctx.m[`to${target}`](),

  openHook() {
    let count = 0;
    const m = new StateMachine({
      init: 'a',
      transitions: [
        { name: 'tob', from: 'a', to: 'b' },
        { name: 'toa', from: 'b', to: 'a' },
      ],
      methods: {
        onAfterTransition() { count += 1; },
      },
    });
    count = 0;                       // discard the init transition if it fired
    return { m, now: () => m.state, hookCount: () => count };
  },
  stepHook : (ctx, target) => ctx.m[`to${target}`](),

  openData() {
    const m = new StateMachine({
      init: 'a',
      data: { v: undefined },
      transitions: [
        { name: 'tob', from: 'a', to: 'b' },
        { name: 'toa', from: 'b', to: 'a' },
      ],
      methods: {
        onAfterTransition(lifecycle, value) { if (value !== undefined) this.v = value; },
      },
    });
    return { m, now: () => m.state, data: () => m.v };
  },
  stepData : (ctx, target, value) => ctx.m[`to${target}`](value),

};
