
module.exports = {

  testEnvironment            : 'node',

  moduleFileExtensions       : ['js', 'ts'],
  coveragePathIgnorePatterns : ["/node_modules/", "/src/ts/tests/"],
  testMatch                  : ['**/*.stoch.ts'],

  transform                  : { '^.+\\.ts$': ['@swc/jest', { jsc: { parser: { syntax: 'typescript' }, target: 'es2020' } }] },

  verbose                    : false,
  collectCoverage            : true,
  coverageDirectory          : "coverage/stoch/",

  coverageThreshold : {
    global : {
      branches   : 0,
      functions  : 0,
      lines      : 0,
      statements : 0,
    },
  },

  collectCoverageFrom: ["src/ts/**/{!(fsl_parser),}.{js,ts}"],

  reporters: [
    ['default',             {}],
    ['jest-json-reporter2', { outputDir: './coverage/stoch', outputFile: 'metrics.json',          fullOutput: false }],
//  ['jest-json-reporter2', { outputDir: './coverage/stoch', outputFile: 'extended-metrics.json', fullOutput: true  }],
  ]

};
