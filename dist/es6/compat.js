/*******
 *
 *  The 5.x class API, unchanged: `import { Machine, sm } from 'jssm/compat'`
 *  is a drop-in for the 5.x `import { Machine, sm } from 'jssm'`.  Everything
 *  the default entry exports is re-exported here too, so a file can mix the
 *  two styles during a migration.
 *
 */
// The barrel exports `Machine` as a TYPE only; the explicit value export below
// deliberately shadows that name (an explicit export always wins over a star
// re-export in ESM), which is the whole point of this entry.  import-x/export
// cannot see that the star's `Machine` is type-only and reports a duplicate.
/* eslint-disable import-x/export */
export * from './jssm.js';
export { Machine } from './machine/machine.js';
/* eslint-enable import-x/export */
