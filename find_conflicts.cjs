const fs = require('fs');
const lines = fs.readFileSync('package.json', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('<<<<<<<')) {
    const end = lines.findIndex((l, idx) => idx > i && l.startsWith('>>>>>>>'));
    console.log(`Conflict at line ${i+1}:`);
    console.log(lines.slice(Math.max(0, i-2), end+3).join('\n'));
    console.log('---');
    i = end;
  }
}
