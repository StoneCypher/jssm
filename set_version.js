
const fs  = require('fs'),
      pkg = require('./package.json');

fs.writeFileSync(
  './build/jssm.es5.js',
  (fs.readFileSync('./build/jssm.es5.js') +'').replace(
    'var version = null,',
    'var version = \'' + pkg.version + '\',')
);
