
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

fs.writeFileSync('./src/ts/fsl_parser.ts', lines.join('\n') + tail);
fs.unlinkSync(orig_fname);
