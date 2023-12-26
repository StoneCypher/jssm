
import {
  readFileSync,
  writeFileSync
} from 'fs';





const pkg = JSON.parse(
  readFileSync('package.json')
);





writeFileSync('./src/ts/version.ts', `
const version    : string = "${pkg.version}",
      build_time : number = ${new Date().getTime()};

export { version, build_time };
`);
