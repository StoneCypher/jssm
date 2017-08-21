'use strict';

var _templateObject = _taggedTemplateLiteral(['a -> b;'], ['a -> b;']),
    _templateObject2 = _taggedTemplateLiteral(['a->b;c->d;e->f->g;h->i;'], ['a->b;c->d;e->f->g;h->i;']),
    _templateObject3 = _taggedTemplateLiteral(['a->b;', ';e->f->g;', ';'], ['a->b;', ';e->f->g;', ';']);

var _avaSpec = require('ava-spec');

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }
/* eslint-disable max-len */

var jssm = require('../../../build/jssm.es5.js'),
    sm = jssm.sm;

(0, _avaSpec.describe)('sm``', async function (_parse_it) {

  (0, _avaSpec.describe)('simple sm`a->b;`', async function (it) {
    it('doesn\'t throw', function (t) {
      return t.notThrows(function () {
        var _foo = sm(_templateObject);
      });
    });
  });

  (0, _avaSpec.describe)('long and chain sm`a->b;c->d;e->f->g;h->i;`', async function (it) {
    it('doesn\'t throw', function (t) {
      return t.notThrows(function () {
        var _foo = sm(_templateObject2);
      });
    });
  });

  (0, _avaSpec.describe)('template tags`', async function (it) {
    it('doesn\'t throw', function (t) {
      return t.notThrows(function () {
        var bar = 'c->d',
            baz = 'b->h->i;f->h',
            _foo = sm(_templateObject3, bar, baz);
      });
    });
  });
});

// stochable
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9zbV90YWcuanMiXSwibmFtZXMiOlsianNzbSIsInJlcXVpcmUiLCJzbSIsIl9wYXJzZV9pdCIsIml0IiwidCIsIm5vdFRocm93cyIsIl9mb28iLCJiYXIiLCJiYXoiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUdBOzs7QUFGQTs7QUFJQSxJQUFNQSxPQUFPQyxRQUFRLDRCQUFSLENBQWI7QUFBQSxJQUNNQyxLQUFPRixLQUFLRSxFQURsQjs7QUFPQSx1QkFBUyxNQUFULEVBQWlCLGdCQUFNQyxTQUFOLEVBQW1COztBQUVoQyx5QkFBUyxrQkFBVCxFQUE2QixnQkFBTUMsRUFBTixFQUFZO0FBQ3ZDQSxPQUFHLGdCQUFILEVBQXFCO0FBQUEsYUFBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxZQUFNQyxPQUFPTCxFQUFQLGlCQUFOO0FBQTJCLE9BQS9DLENBQUw7QUFBQSxLQUFyQjtBQUNELEdBRkQ7O0FBSUEseUJBQVMsNENBQVQsRUFBdUQsZ0JBQU1FLEVBQU4sRUFBWTtBQUNqRUEsT0FBRyxnQkFBSCxFQUFxQjtBQUFBLGFBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsWUFBTUMsT0FBT0wsRUFBUCxrQkFBTjtBQUEyQyxPQUEvRCxDQUFMO0FBQUEsS0FBckI7QUFDRCxHQUZEOztBQUlBLHlCQUFTLGdCQUFULEVBQTJCLGdCQUFNRSxFQUFOLEVBQVk7QUFDckNBLE9BQUcsZ0JBQUgsRUFBcUI7QUFBQSxhQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFlBQU1FLE1BQU0sTUFBWjtBQUFBLFlBQW9CQyxNQUFNLGNBQTFCO0FBQUEsWUFBMENGLE9BQU9MLEVBQVAsbUJBQWlCTSxHQUFqQixFQUFnQ0MsR0FBaEMsQ0FBMUM7QUFBbUYsT0FBdkcsQ0FBTDtBQUFBLEtBQXJCO0FBQ0QsR0FGRDtBQUlILENBZEQ7O0FBZ0JBIiwiZmlsZSI6InNtX3RhZy5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuXG5pbXBvcnQge2Rlc2NyaWJlfSBmcm9tICdhdmEtc3BlYyc7XG5cbmNvbnN0IGpzc20gPSByZXF1aXJlKCcuLi8uLi8uLi9idWlsZC9qc3NtLmVzNS5qcycpLFxuICAgICAgc20gICA9IGpzc20uc207XG5cblxuXG5cblxuZGVzY3JpYmUoJ3NtYGAnLCBhc3luYyBfcGFyc2VfaXQgPT4ge1xuXG4gICAgZGVzY3JpYmUoJ3NpbXBsZSBzbWBhLT5iO2AnLCBhc3luYyBpdCA9PiB7XG4gICAgICBpdCgnZG9lc25cXCd0IHRocm93JywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBhIC0+IGI7YDsgfSkgKTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdsb25nIGFuZCBjaGFpbiBzbWBhLT5iO2MtPmQ7ZS0+Zi0+ZztoLT5pO2AnLCBhc3luYyBpdCA9PiB7XG4gICAgICBpdCgnZG9lc25cXCd0IHRocm93JywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBhLT5iO2MtPmQ7ZS0+Zi0+ZztoLT5pO2A7IH0pICk7XG4gICAgfSk7XG5cbiAgICBkZXNjcmliZSgndGVtcGxhdGUgdGFnc2AnLCBhc3luYyBpdCA9PiB7XG4gICAgICBpdCgnZG9lc25cXCd0IHRocm93JywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IGJhciA9ICdjLT5kJywgYmF6ID0gJ2ItPmgtPmk7Zi0+aCcsIF9mb28gPSBzbWBhLT5iOyR7YmFyfTtlLT5mLT5nOyR7YmF6fTtgOyB9KSApO1xuICAgIH0pO1xuXG59KTtcblxuLy8gc3RvY2hhYmxlXG4iXX0=