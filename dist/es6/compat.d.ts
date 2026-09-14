/*******
 *
 *  The 5.x class API, unchanged: `import { Machine, sm } from 'jssm/compat'`
 *  is a drop-in for the 5.x `import { Machine, sm } from 'jssm'`.  Everything
 *  the default entry exports is re-exported here too, so a file can mix the
 *  two styles during a migration.
 *
 */
export * from './jssm.js';
export { Machine } from './machine/machine.js';
