
const fs = require('fs');

const package = JSON.parse(fs.readFileSync('package.json'));

fs.writeFileSync('./src/ts/version.ts', `
const version: string = "${package.version}";
export { version };
`);
