
module.exports = {

  testEnvironment            : 'node',

  coverageProvider           : 'v8',

  moduleFileExtensions       : ['js', 'ts'],
  coveragePathIgnorePatterns : ["/node_modules/", "/src/ts/tests/"],
  testMatch                  : ['**/*.uspec.ts'],

  transform                  : { '^.+\\.ts$': ['@swc/jest', { jsc: { parser: { syntax: 'typescript' }, target: 'es2020' } }] },

  verbose                    : false,
  collectCoverage            : true,
  coverageDirectory          : "coverage/unicode/",

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
    ['jest-json-reporter2', { outputDir: './coverage/unicode', outputFile: 'metrics.json',          fullOutput: false }],
//  ['jest-json-reporter2', { outputDir: './coverage/unicode', outputFile: 'extended-metrics.json', fullOutput: true  }],
  ]

};
