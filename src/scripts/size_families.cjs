/* File-family classifier for the package-size chart.

   Shared verbatim between Node (which needs families to detect decomposition
   before it can run the conservation gate) and the browser (which needs them to
   subdivide every band). The generator inlines everything above the node-only
   marker at the bottom, so there is exactly ONE copy of these rules.

   A "family" is the role a shipped file plays -- core bundle, typedefs, CLI,
   docs -- not its directory. Ordering matters: the first rule that matches
   wins, so the specific paths are tested before the broad ones. */

'use strict';

/** Classify one published file path into its shipping family.
 *
 *  Rules are ordered most-specific first: a file under `cli/` is CLI work even
 *  though it also ends in `.js`, and a `.d.ts` is typedefs only if no earlier
 *  rule claimed it. Anything unrecognised lands in `misc`, which is a signal
 *  worth watching -- a growing `misc` means the ruleset has fallen behind what
 *  the package actually ships.
 *
 *  @param p  Published path, relative to the package root, POSIX separators.
 *  @returns  The family name.
 *
 *  @example
 *  family('cli/fsl.cjs')        // => 'cli'
 *  family('dist/jssm.es6.mjs')  // => 'core'
 *  family('jssm.es6.d.ts')      // => 'typedefs'
 */
function family(p) {
  if (/(^|\/)fence\//.test(p) || /\.fence\.d\./.test(p)) { return 'fence'; }
  if (/(^|\/)cli\//.test(p))    { return 'cli'; }
  if (/(^|\/)cdn\//.test(p))    { return 'cdn'; }
  if (/(^|\/)deno\//.test(p))   { return 'deno'; }
  if (/(^|\/)wc\//.test(p) || /jssm_viz/.test(p)) { return 'viz'; }
  if (/(^|\/)themes\//.test(p)) { return 'themes'; }
  if (/^docs\//.test(p))        { return 'docs'; }
  if (/^src\//.test(p))         { return 'source'; }
  if (/\.d\.c?ts$/.test(p))     { return 'typedefs'; }
  if (/jssm[._]/.test(p) || /(^|\/)(es[56]|cm6)\//.test(p) || /grammar/.test(p)) { return 'core'; }
  return 'misc';
}

/* ---- node-only below this marker; the browser copy is truncated here ---- */
module.exports = { family };
