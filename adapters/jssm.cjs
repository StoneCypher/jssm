'use strict';

/**
 *  jssm adapter for the shootout suite.
 *
 *  Idiomatic definition: FSL source text — jssm's real-world construct path is
 *  the template-literal / string parse, so `construct()` includes the FSL
 *  parse deliberately.  Transition path: `machine.transition(target)` with a
 *  `machine.override(start)` reset per iteration (the shapes' FSL carries
 *  `allows_override: true` for exactly this).
 *
 *  @see ../shapes.cjs for the shared shape contract.
 */

const jssm = require('jssm');

module.exports = {

  name    : 'jssm',
  version : jssm.version,

  /** The library's idiomatic machine definition for a shape (not measured). */
  buildDefinition(shape) {
    return shape.fsl;
  },

  /** Measured: build a machine from the idiomatic definition. */
  construct(def) {
    return jssm.sm([def]);
  },

  /** Unmeasured: a reusable context for the transition() benchmark. */
  open(shape) {
    return { machine: jssm.sm([shape.fsl]), start: shape.start };
  },

  /** Reset to the start state at the top of each benny iteration. */
  reset(ctx) {
    ctx.machine.override(ctx.start);
  },

  /** Measured: one legal transition step. */
  step(ctx, target) {
    ctx.machine.transition(target);
  },

};
