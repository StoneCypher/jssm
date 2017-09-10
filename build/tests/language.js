'use strict';

var _avaSpec = require('ava-spec');

var glob = require('glob');
/* eslint-disable max-len */

var jssm = require('../../../build/jssm.es5.js'),
    sm = jssm.sm;

(0, _avaSpec.describe)('base data walk/1', async function (_it) {

  var language_files = glob.sync('./language_data/*.json', {});

  language_files.map(function (language_file) {

    var testData = require(language_file);
    var testTokens = testData.cases;

    var foreignTarget = sm([testData.native_name + ' -> ' + testData.english_name + ' -> ' + testTokens.join(' -> ') + ';']);

    (0, _avaSpec.describe)('language "' + testData.english_name + '" contains all states', async function (it) {

      testTokens.map(function (tok) {
        return it(tok, function (t) {
          return t.is(true, foreignTarget.states().includes(tok));
        });
      });
    });
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9sYW5ndWFnZS5qcyJdLCJuYW1lcyI6WyJnbG9iIiwicmVxdWlyZSIsImpzc20iLCJzbSIsIl9pdCIsImxhbmd1YWdlX2ZpbGVzIiwic3luYyIsIm1hcCIsInRlc3REYXRhIiwibGFuZ3VhZ2VfZmlsZSIsInRlc3RUb2tlbnMiLCJjYXNlcyIsImZvcmVpZ25UYXJnZXQiLCJuYXRpdmVfbmFtZSIsImVuZ2xpc2hfbmFtZSIsImpvaW4iLCJpdCIsInRvayIsInQiLCJpcyIsInN0YXRlcyIsImluY2x1ZGVzIl0sIm1hcHBpbmdzIjoiOztBQUdBOztBQUVBLElBQU1BLE9BQU9DLFFBQVEsTUFBUixDQUFiO0FBSkE7O0FBVUEsSUFBTUMsT0FBT0QsUUFBUSw0QkFBUixDQUFiO0FBQUEsSUFDTUUsS0FBT0QsS0FBS0MsRUFEbEI7O0FBTUEsdUJBQVMsa0JBQVQsRUFBNkIsZ0JBQU1DLEdBQU4sRUFBYTs7QUFFeEMsTUFBTUMsaUJBQWlCTCxLQUFLTSxJQUFMLENBQVUsd0JBQVYsRUFBb0MsRUFBcEMsQ0FBdkI7O0FBRUFELGlCQUFlRSxHQUFmLENBQW1CLHlCQUFpQjs7QUFFbEMsUUFBTUMsV0FBYVAsUUFBUVEsYUFBUixDQUFuQjtBQUNBLFFBQU1DLGFBQWFGLFNBQVNHLEtBQTVCOztBQUVBLFFBQU1DLGdCQUFnQlQsR0FBRyxDQUFJSyxTQUFTSyxXQUFiLFlBQStCTCxTQUFTTSxZQUF4QyxZQUEyREosV0FBV0ssSUFBWCxDQUFnQixNQUFoQixDQUEzRCxPQUFILENBQXRCOztBQUVBLDBDQUFzQlAsU0FBU00sWUFBL0IsNEJBQW9FLGdCQUFNRSxFQUFOLEVBQVk7O0FBRTlFTixpQkFBV0gsR0FBWCxDQUFlO0FBQUEsZUFDYlMsR0FBR0MsR0FBSCxFQUFRO0FBQUEsaUJBQUtDLEVBQUVDLEVBQUYsQ0FBSyxJQUFMLEVBQVdQLGNBQWNRLE1BQWQsR0FBdUJDLFFBQXZCLENBQWdDSixHQUFoQyxDQUFYLENBQUw7QUFBQSxTQUFSLENBRGE7QUFBQSxPQUFmO0FBSUQsS0FORDtBQVFELEdBZkQ7QUFrQkQsQ0F0QkQiLCJmaWxlIjoibGFuZ3VhZ2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cblxuaW1wb3J0IHtkZXNjcmliZX0gZnJvbSAnYXZhLXNwZWMnO1xuXG5jb25zdCBnbG9iID0gcmVxdWlyZSgnZ2xvYicpO1xuXG5cblxuXG5cbmNvbnN0IGpzc20gPSByZXF1aXJlKCcuLi8uLi8uLi9idWlsZC9qc3NtLmVzNS5qcycpLFxuICAgICAgc20gICA9IGpzc20uc207XG5cblxuXG5cbmRlc2NyaWJlKCdiYXNlIGRhdGEgd2Fsay8xJywgYXN5bmMgX2l0ID0+IHtcblxuICBjb25zdCBsYW5ndWFnZV9maWxlcyA9IGdsb2Iuc3luYygnLi9sYW5ndWFnZV9kYXRhLyouanNvbicsIHt9KTtcblxuICBsYW5ndWFnZV9maWxlcy5tYXAobGFuZ3VhZ2VfZmlsZSA9PiB7XG5cbiAgICBjb25zdCB0ZXN0RGF0YSAgID0gcmVxdWlyZShsYW5ndWFnZV9maWxlKTtcbiAgICBjb25zdCB0ZXN0VG9rZW5zID0gdGVzdERhdGEuY2FzZXM7XG5cbiAgICBjb25zdCBmb3JlaWduVGFyZ2V0ID0gc20oW2Ake3Rlc3REYXRhLm5hdGl2ZV9uYW1lfSAtPiAke3Rlc3REYXRhLmVuZ2xpc2hfbmFtZX0gLT4gJHt0ZXN0VG9rZW5zLmpvaW4oJyAtPiAnKX07YF0pO1xuXG4gICAgZGVzY3JpYmUoYGxhbmd1YWdlIFwiJHt0ZXN0RGF0YS5lbmdsaXNoX25hbWV9XCIgY29udGFpbnMgYWxsIHN0YXRlc2AsIGFzeW5jIGl0ID0+IHtcblxuICAgICAgdGVzdFRva2Vucy5tYXAodG9rID0+XG4gICAgICAgIGl0KHRvaywgdCA9PiB0LmlzKHRydWUsIGZvcmVpZ25UYXJnZXQuc3RhdGVzKCkuaW5jbHVkZXModG9rKSkpXG4gICAgICApO1xuXG4gICAgfSk7XG5cbiAgfSk7XG5cblxufSk7XG4iXX0=