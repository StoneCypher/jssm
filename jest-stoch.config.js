
module.exports = {

  testEnvironment            : 'node',

  moduleFileExtensions       : ['js', 'ts'],
  coveragePathIgnorePatterns : ["/node_modules/", "/src/ts/tests/"],
  testMatch                  : ['**/*.stoch.ts'],

  transform                  : { '^.+\\.ts$': 'ts-jest' },

  verbose                    : false,
  collectCoverage            : true,
  coverageDirectory          : "coverage/stoch/",

  coverageThreshold : {
    global : {
      branches   : 1,
      functions  : 1,
      lines      : 1,
      statements : 1,
    },
  },

  collectCoverageFrom: ["src/ts/**/{!(jssm-dot),}.{js,ts}"]

};
