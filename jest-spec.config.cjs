
module.exports = {

  testEnvironment            : 'node',

  coverageProvider           : 'v8',

  moduleFileExtensions       : ['js', 'ts'],
  coveragePathIgnorePatterns : ["/node_modules/", "/src/ts/tests/", "/src/ts/jssm_viz.ts", "/src/ts/jssm_viz_colors.ts"],
  testMatch                  : ['**/*.spec.ts'],

  transform                  : { '^.+\\.ts$': ['@swc/jest', { jsc: { parser: { syntax: 'typescript' }, target: 'es2020' } }] },

  verbose                    : false,
  collectCoverage            : true,
  coverageDirectory          : "coverage/spec/",

  coverageThreshold : {
    global : {
      branches   : 100,
      functions  : 100,
      lines      : 100,
      statements : 100,
    },
  },

  collectCoverageFrom: ["src/ts/**/{!(fsl_parser),}.{js,ts}"],

  reporters: [
    ['default',             {}],
    ['jest-json-reporter2', { outputDir: './coverage/spec', outputFile: 'metrics.json',          fullOutput: false }],
//  ['jest-json-reporter2', { outputDir: './coverage/spec', outputFile: 'extended-metrics.json', fullOutput: true  }],
  ]

};
