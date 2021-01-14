
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
      branches   : 5,
      functions  : 5,
      lines      : 5,
      statements : 5,
    },
  },

  collectCoverageFrom: ["src/ts/**/{!(jssm-dot),}.{js,ts}"]

};
