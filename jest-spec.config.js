
module.exports = {

  testEnvironment            : 'node',

  moduleFileExtensions       : ['js', 'ts'],
  coveragePathIgnorePatterns : ["/node_modules/", "/src/ts/tests/"],
  testMatch                  : ['**/*.spec.ts'],

  transform                  : { '^.+\\.ts$': 'ts-jest' },

  verbose                    : false,
  collectCoverage            : true,
  coverageDirectory          : "coverage/spec/",

  coverageThreshold : {
    global : {
      branches   : 90,
      functions  : 90,
      lines      : 90,
      statements : 90,
    },
  },

  collectCoverageFrom: ["src/ts/**/{!(jssm-dot),}.{js,ts}"]

};
