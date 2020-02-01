
const fs = require('fs');

const package = JSON.parse(fs.readFileSync('package.json'));

fs.writeFileSync('./src/js/version.ts', `
const version: string = "${package.version}";
export { version };
`);
