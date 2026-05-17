
module.exports = {

  testEnvironment            : 'node',

  coverageProvider           : 'v8',

  moduleFileExtensions       : ['js', 'ts', 'cjs', 'mjs'],
  coveragePathIgnorePatterns : ["/node_modules/", "/src/ts/tests/"],
  testMatch                  : ['**/tests/cli/**/*.spec.ts'],

  transform                  : { '^.+\\.ts$': ['@swc/jest', { jsc: { parser: { syntax: 'typescript' }, target: 'es2020' } }] },

  verbose                    : false,
  collectCoverage            : true,
  coverageDirectory          : "coverage/cli/",

  coverageThreshold : {
    global : {
      branches   : 70,
      functions  : 80,
      lines      : 80,
      statements : 80,
    },
  },

  collectCoverageFrom        : [
    "src/ts/cli/**/*.ts",
    // type-declaration files — no runtime code
    "!src/ts/cli/**/*.d.ts",
    // pre-compiled JS duplicates exist; exclude the TS source to avoid double-counting at 0%
    "!src/ts/cli/types.ts",
    "!src/ts/cli/subcommands/render/targets/dot.ts",
    // binary entry points — not exercised by unit tests
    "!src/ts/cli/fsl.ts",
    "!src/ts/cli/fsl-render.ts",
    // re-export barrel — no testable logic
    "!src/ts/cli/lib.ts",
  ],

  reporters: [
    ['default',             {}],
    ['jest-json-reporter2', { outputDir: './coverage/cli', outputFile: 'metrics.json', fullOutput: false }],
  ]

};
