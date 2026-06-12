'use strict';

/**
 *  Adapter registry.  Order is presentation order in results.  Every adapter
 *  here must pass conformance.cjs before the suite will benchmark it.
 */

const ADAPTERS = [
  require('./jssm.cjs'),
  require('./xstate.cjs'),
  require('./xstate-fsm.cjs'),
  require('./javascript-state-machine.cjs'),
  require('./robot3.cjs'),
  require('./machina.cjs'),
  require('./nanostate.cjs'),
  require('./statebot.cjs'),
  require('./finity.cjs'),
  require('./typestate.cjs'),
  require('./stately-js.cjs'),
  require('./fn-machine.cjs'),
  require('./fseh.cjs'),
  require('./easy-fsm.cjs'),
];

module.exports = { ADAPTERS };
