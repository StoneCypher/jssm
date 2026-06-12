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
  require('./pastafarian.cjs'),
];

// Probed but excluded, with reasons (these become grid rows, not silent drops):
//   @edium/fsm 3.0.2 — broken CommonJS build: createState() throws
//     "import_kebabCase3.default is not a function" (busted bundled-lodash
//     import in dist/index.cjs). Cannot construct a machine when require()d.
//   xsm 1.6.0 — reactive key-value store (get/set/setMany/bindState), not an
//     edge-transition FSM; out of category.
const EXCLUDED = [
  { name: '@edium/fsm',  version: '3.0.2',  reason: 'broken CJS build (createState throws)' },
  { name: 'xsm',         version: '1.6.0',  reason: 'reactive store, not a transition FSM' },
];

module.exports = { ADAPTERS, EXCLUDED };
