
const fs = require('fs');

const package = JSON.parse(fs.readFileSync('package.json'));

fs.writeFileSync('./src/js/version.js', `
const version = "${package.version}";
export { version };
`);
