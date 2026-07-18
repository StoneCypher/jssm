const fs = require('fs');

const data = JSON.parse(fs.readFileSync('labels.json', 'utf8'));

const regex = /bug|error|fail|issue|problem|broken|risk|secur|vuln|critic|urgent|prior|block|need|difficult|suppress|temp/i;

const filtered = data.filter(l => regex.test(l.name));
const top20 = filtered.slice(0, 20);

for (const l of top20) {
  console.log(`- [ ] ${l.name} (${l.count})`);
}
