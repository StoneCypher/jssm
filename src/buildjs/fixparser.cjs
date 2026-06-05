
// the head -n -5 solution doesn't work on macs; neither do the common
// sense seds.  screw it

// remove five lines from the end to remove the module.exports that peg places
// then add the es6 module one we have
// then save under the other filename

const fs         = require('fs'),
      orig_fname = './src/ts/fsl_parser.js';

const orig       = fs.readFileSync(orig_fname),
      lines      = `${orig}`.split('\n'),
      tail       = fs.readFileSync('src/buildjs/peg_ts_export_footer.ts');

lines.pop();  // shut up, it's funny
lines.pop();
lines.pop();
lines.pop();
lines.pop();

// pegjs's runtime declares `error(message, location)` and
// `expected(description, location)` with both parameters required, but
// each function's body treats `location` as optional (`!== void 0` check
// with a fallback to `peg$computeLocation`).  Mark the parameter optional
// in the generated TypeScript so action blocks can use the one-argument
// form without tripping `error TS2554: Expected 2 arguments, but got 1`.
const body = lines.join('\n')
  .replace(/function (error|expected)\((\w+), location\)/g, 'function $1($2, location?)');

// Prepend `// @ts-nocheck` to the generated parser. With `pegjs --cache` the
// peg$parse body exceeds tsc's control-flow-analysis size limit (TS2563); the
// file is generated, so skipping type-checking on it is correct and unblocks
// `tsc --build`. Harmless when --cache is off (the file is just smaller).
fs.writeFileSync('./src/ts/fsl_parser.ts', '// @ts-nocheck\n' + body + tail);
fs.unlinkSync(orig_fname);
