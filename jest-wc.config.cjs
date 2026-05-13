module.exports = {

  testEnvironment            : 'jsdom',

  setupFiles                 : ['<rootDir>/src/ts/wc/tests/jest.setup.cjs'],

  coverageProvider           : 'v8',

  moduleFileExtensions       : ['js', 'ts'],
  coveragePathIgnorePatterns : ["/node_modules/", "/src/ts/wc/tests/"],
  testPathIgnorePatterns     : ["/node_modules/"],
  testMatch                  : ['**/src/ts/wc/**/*.spec.ts'],

  moduleNameMapper           : { '^(\\.{1,2}/.*)\\.js$': '$1' },

  transform                  : {
    '^.+\\.ts$': ['@swc/jest', { jsc: { parser: { syntax: 'typescript', decorators: true }, target: 'es2020', transform: { legacyDecorator: true, useDefineForClassFields: false } } }],
    '^.+\\.js$': ['@swc/jest', { jsc: { parser: { syntax: 'ecmascript' }, target: 'es2020' } }],
  },
  transformIgnorePatterns    : ['/node_modules/(?!(lit|lit-html|lit-element|@lit)/)'],

  verbose                    : false,
  collectCoverage            : true,
  coverageDirectory          : "coverage/wc/",

  coverageThreshold : {
    global : {
      branches   : 100,
      functions  : 100,
      lines      : 100,
      statements : 100,
    },
  },

  collectCoverageFrom        : ["src/ts/wc/**/{!(tests),}.{js,ts}"],

  reporters : [
    ['default', {}],
  ],

};
