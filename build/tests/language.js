'use strict';

var _avaSpec = require('ava-spec');

var jssm = require('../../../build/jssm.es5.js'),
    sm = jssm.sm,
    testData = require('./language_data/english.json'),
    testTokens = testData.cases;
/* eslint-disable max-len */

(0, _avaSpec.describe)('english/1', async function (_it) {

  var foreignTarget = sm([testTokens.join(' -> ') + ';']);

  (0, _avaSpec.describe)('contains all states', async function (it) {
    testTokens.map(function (tok) {
      return it(tok, function (t) {
        return t.is(true, foreignTarget.states().includes(tok));
      });
    });
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9sYW5ndWFnZS5qcyJdLCJuYW1lcyI6WyJqc3NtIiwicmVxdWlyZSIsInNtIiwidGVzdERhdGEiLCJ0ZXN0VG9rZW5zIiwiY2FzZXMiLCJfaXQiLCJmb3JlaWduVGFyZ2V0Iiwiam9pbiIsIml0IiwibWFwIiwidG9rIiwidCIsImlzIiwic3RhdGVzIiwiaW5jbHVkZXMiXSwibWFwcGluZ3MiOiI7O0FBR0E7O0FBRUEsSUFBTUEsT0FBT0MsUUFBUSw0QkFBUixDQUFiO0FBQUEsSUFDTUMsS0FBT0YsS0FBS0UsRUFEbEI7QUFBQSxJQUdNQyxXQUFhRixRQUFRLDhCQUFSLENBSG5CO0FBQUEsSUFJTUcsYUFBYUQsU0FBU0UsS0FKNUI7QUFKQTs7QUFhQSx1QkFBUyxXQUFULEVBQXNCLGdCQUFNQyxHQUFOLEVBQWE7O0FBRWpDLE1BQU1DLGdCQUFnQkwsR0FBRyxDQUFJRSxXQUFXSSxJQUFYLENBQWdCLE1BQWhCLENBQUosT0FBSCxDQUF0Qjs7QUFFQSx5QkFBUyxxQkFBVCxFQUFnQyxnQkFBTUMsRUFBTixFQUFZO0FBQzFDTCxlQUFXTSxHQUFYLENBQWU7QUFBQSxhQUNiRCxHQUFHRSxHQUFILEVBQVE7QUFBQSxlQUFLQyxFQUFFQyxFQUFGLENBQUssSUFBTCxFQUFXTixjQUFjTyxNQUFkLEdBQXVCQyxRQUF2QixDQUFnQ0osR0FBaEMsQ0FBWCxDQUFMO0FBQUEsT0FBUixDQURhO0FBQUEsS0FBZjtBQUdELEdBSkQ7QUFNRCxDQVZEIiwiZmlsZSI6Imxhbmd1YWdlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5cbmltcG9ydCB7ZGVzY3JpYmV9IGZyb20gJ2F2YS1zcGVjJztcblxuY29uc3QganNzbSA9IHJlcXVpcmUoJy4uLy4uLy4uL2J1aWxkL2pzc20uZXM1LmpzJyksXG4gICAgICBzbSAgID0ganNzbS5zbSxcblxuICAgICAgdGVzdERhdGEgICA9IHJlcXVpcmUoJy4vbGFuZ3VhZ2VfZGF0YS9lbmdsaXNoLmpzb24nKSxcbiAgICAgIHRlc3RUb2tlbnMgPSB0ZXN0RGF0YS5jYXNlcztcblxuXG5cblxuZGVzY3JpYmUoJ2VuZ2xpc2gvMScsIGFzeW5jIF9pdCA9PiB7XG5cbiAgY29uc3QgZm9yZWlnblRhcmdldCA9IHNtKFtgJHt0ZXN0VG9rZW5zLmpvaW4oJyAtPiAnKX07YF0pO1xuXG4gIGRlc2NyaWJlKCdjb250YWlucyBhbGwgc3RhdGVzJywgYXN5bmMgaXQgPT4ge1xuICAgIHRlc3RUb2tlbnMubWFwKHRvayA9PlxuICAgICAgaXQodG9rLCB0ID0+IHQuaXModHJ1ZSwgZm9yZWlnblRhcmdldC5zdGF0ZXMoKS5pbmNsdWRlcyh0b2spKSlcbiAgICApO1xuICB9KTtcblxufSk7XG4iXX0=