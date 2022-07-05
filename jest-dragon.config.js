
module.exports = {

  testEnvironment            : 'node',

  moduleFileExtensions       : ['js', 'ts'],
  coveragePathIgnorePatterns : ["/node_modules/", "/src/ts/tests/"],
  testMatch                  : ['**/*.maximal.ts'],

  transform                  : { '^.+\\.ts$': 'ts-jest' },

  verbose                    : false,
  collectCoverage            : true,
  coverageDirectory          : "coverage/ksd/",

  coverageThreshold : {
    global : {
      branches   : 0,
      functions  : 0,
      lines      : 0,
      statements : 0,
    },
  },

  collectCoverageFrom: ["src/ts/**/{!(jssm-dot),}.{js,ts}"],

  reporters: [
    ['default',             {}],
    ['jest-json-reporter2', { outputDir: './coverage/ksd', outputFile: 'metrics.json',          fullOutput: false }],
//  ['jest-json-reporter2', { outputDir: './coverage/ksd', outputFile: 'extended-metrics.json', fullOutput: true  }],
  ]

};
