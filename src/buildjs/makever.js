
const fs = require('fs');

const package = JSON.parse(fs.readFileSync('package.json'));

fs.writeFileSync('./src/ts/version.ts', `
const version    : string = "${package.version}",
      build_time : number = ${new Date().getTime()};

export { version, build_time };
`);
