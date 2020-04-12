
// the head -n -5 solution doesn't work on macs; neither do the common
// sense seds.  screw it

// remove five lines from the end to remove the module.exports that peg places
// then add the es6 module one we have
// then save under the other filename

const fs = require('fs');

const orig  = fs.readFileSync('./src/js/jssm-dot.js'),
      lines = `${orig}`.split('\n'),
      tail  = fs.readFileSync('src/buildjs/peg_ts_export_footer.ts');

lines.pop();  // shut up, it's funny
lines.pop();
lines.pop();
lines.pop();
lines.pop();

fs.writeFileSync('./src/js/jssm-dot.ts', lines.join('\n') + tail);
