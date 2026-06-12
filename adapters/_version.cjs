'use strict';

/** Exact pinned version of a dependency, from the shootout manifest — used
 *  where a library's exports map blocks `require('<lib>/package.json')`. */
module.exports = (name) => require('../package.json').dependencies[name];
