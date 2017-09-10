'use strict';

var _avaSpec = require('ava-spec');

var glob = require('glob');
/* eslint-disable max-len */

var jssm = require('../../../build/jssm.es5.js'),
    sm = jssm.sm,
    language_files = glob.sync('./src/js/tests/language_data/*.json', {}) // for some reason glob is project-relative
.map(function (rel) {
  return rel.replace('/src/js/tests', '');
}); // instead of execution relative like i'd expect


(0, _avaSpec.describe)('base data walk/1', async function (_it) {

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9sYW5ndWFnZS5qcyJdLCJuYW1lcyI6WyJnbG9iIiwicmVxdWlyZSIsImpzc20iLCJzbSIsImxhbmd1YWdlX2ZpbGVzIiwic3luYyIsIm1hcCIsInJlbCIsInJlcGxhY2UiLCJfaXQiLCJ0ZXN0RGF0YSIsImxhbmd1YWdlX2ZpbGUiLCJ0ZXN0VG9rZW5zIiwiY2FzZXMiLCJmb3JlaWduVGFyZ2V0IiwibmF0aXZlX25hbWUiLCJlbmdsaXNoX25hbWUiLCJqb2luIiwiaXQiLCJ0b2siLCJ0IiwiaXMiLCJzdGF0ZXMiLCJpbmNsdWRlcyJdLCJtYXBwaW5ncyI6Ijs7QUFHQTs7QUFFQSxJQUFNQSxPQUFPQyxRQUFRLE1BQVIsQ0FBYjtBQUpBOztBQVVBLElBQU1DLE9BQWlCRCxRQUFRLDRCQUFSLENBQXZCO0FBQUEsSUFDTUUsS0FBaUJELEtBQUtDLEVBRDVCO0FBQUEsSUFHTUMsaUJBQWlCSixLQUFLSyxJQUFMLENBQVUscUNBQVYsRUFBaUQsRUFBakQsRUFBc0Q7QUFBdEQsQ0FDS0MsR0FETCxDQUNTO0FBQUEsU0FBT0MsSUFBSUMsT0FBSixDQUFZLGVBQVosRUFBNkIsRUFBN0IsQ0FBUDtBQUFBLENBRFQsQ0FIdkIsQyxDQUk2RTs7O0FBTTdFLHVCQUFTLGtCQUFULEVBQTZCLGdCQUFNQyxHQUFOLEVBQWE7O0FBRXhDTCxpQkFBZUUsR0FBZixDQUFtQix5QkFBaUI7O0FBRWxDLFFBQU1JLFdBQWFULFFBQVFVLGFBQVIsQ0FBbkI7QUFDQSxRQUFNQyxhQUFhRixTQUFTRyxLQUE1Qjs7QUFFQSxRQUFNQyxnQkFBZ0JYLEdBQUcsQ0FBSU8sU0FBU0ssV0FBYixZQUErQkwsU0FBU00sWUFBeEMsWUFBMkRKLFdBQVdLLElBQVgsQ0FBZ0IsTUFBaEIsQ0FBM0QsT0FBSCxDQUF0Qjs7QUFFQSwwQ0FBc0JQLFNBQVNNLFlBQS9CLDRCQUFvRSxnQkFBTUUsRUFBTixFQUFZOztBQUU5RU4saUJBQVdOLEdBQVgsQ0FBZTtBQUFBLGVBQ2JZLEdBQUdDLEdBQUgsRUFBUTtBQUFBLGlCQUFLQyxFQUFFQyxFQUFGLENBQUssSUFBTCxFQUFXUCxjQUFjUSxNQUFkLEdBQXVCQyxRQUF2QixDQUFnQ0osR0FBaEMsQ0FBWCxDQUFMO0FBQUEsU0FBUixDQURhO0FBQUEsT0FBZjtBQUlELEtBTkQ7QUFRRCxHQWZEO0FBa0JELENBcEJEIiwiZmlsZSI6Imxhbmd1YWdlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5cbmltcG9ydCB7ZGVzY3JpYmV9IGZyb20gJ2F2YS1zcGVjJztcblxuY29uc3QgZ2xvYiA9IHJlcXVpcmUoJ2dsb2InKTtcblxuXG5cblxuXG5jb25zdCBqc3NtICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uLy4uL2J1aWxkL2pzc20uZXM1LmpzJyksXG4gICAgICBzbSAgICAgICAgICAgICA9IGpzc20uc20sXG5cbiAgICAgIGxhbmd1YWdlX2ZpbGVzID0gZ2xvYi5zeW5jKCcuL3NyYy9qcy90ZXN0cy9sYW5ndWFnZV9kYXRhLyouanNvbicsIHt9KSAgLy8gZm9yIHNvbWUgcmVhc29uIGdsb2IgaXMgcHJvamVjdC1yZWxhdGl2ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChyZWwgPT4gcmVsLnJlcGxhY2UoJy9zcmMvanMvdGVzdHMnLCAnJykpOyAgICAvLyBpbnN0ZWFkIG9mIGV4ZWN1dGlvbiByZWxhdGl2ZSBsaWtlIGknZCBleHBlY3RcblxuXG5cblxuXG5kZXNjcmliZSgnYmFzZSBkYXRhIHdhbGsvMScsIGFzeW5jIF9pdCA9PiB7XG5cbiAgbGFuZ3VhZ2VfZmlsZXMubWFwKGxhbmd1YWdlX2ZpbGUgPT4ge1xuXG4gICAgY29uc3QgdGVzdERhdGEgICA9IHJlcXVpcmUobGFuZ3VhZ2VfZmlsZSk7XG4gICAgY29uc3QgdGVzdFRva2VucyA9IHRlc3REYXRhLmNhc2VzO1xuXG4gICAgY29uc3QgZm9yZWlnblRhcmdldCA9IHNtKFtgJHt0ZXN0RGF0YS5uYXRpdmVfbmFtZX0gLT4gJHt0ZXN0RGF0YS5lbmdsaXNoX25hbWV9IC0+ICR7dGVzdFRva2Vucy5qb2luKCcgLT4gJyl9O2BdKTtcblxuICAgIGRlc2NyaWJlKGBsYW5ndWFnZSBcIiR7dGVzdERhdGEuZW5nbGlzaF9uYW1lfVwiIGNvbnRhaW5zIGFsbCBzdGF0ZXNgLCBhc3luYyBpdCA9PiB7XG5cbiAgICAgIHRlc3RUb2tlbnMubWFwKHRvayA9PlxuICAgICAgICBpdCh0b2ssIHQgPT4gdC5pcyh0cnVlLCBmb3JlaWduVGFyZ2V0LnN0YXRlcygpLmluY2x1ZGVzKHRvaykpKVxuICAgICAgKTtcblxuICAgIH0pO1xuXG4gIH0pO1xuXG5cbn0pO1xuIl19