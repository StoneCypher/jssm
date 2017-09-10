'use strict';

var _avaSpec = require('ava-spec');

var jssm = require('../../../build/jssm.es5.js');
/* eslint-disable max-len */

(0, _avaSpec.describe)('compile/1', async function (_parse_it) {

  (0, _avaSpec.describe)('a->b;', async function (it) {
    var a_to_b_str = 'a->b;';
    it('doesn\'t throw', function (t) {
      return t.notThrows(function () {
        jssm.compile(jssm.parse(a_to_b_str));
      });
    });
  });

  (0, _avaSpec.describe)('a->b->c;', async function (it) {
    var a_to_b_to_c_str = 'a->b->c;';
    it('doesn\'t throw', function (t) {
      return t.notThrows(function () {
        jssm.compile(jssm.parse(a_to_b_to_c_str));
      });
    });
  });

  (0, _avaSpec.describe)('template tokens', async function (it) {
    var a_through_e_token_str = 'a->' + 'b' + '->c->' + 'd' + '->e;';
    it('doesn\'t throw', function (t) {
      return t.notThrows(function () {
        jssm.compile(jssm.parse(a_through_e_token_str));
      });
    });
  });

  (0, _avaSpec.describe)('all arrows', async function (it) {
    var all_arrows = 'a -> b => c ~> d <-> e <=> f <~> g <-=> h <=-> i <~-> j <-~> k <=~> l <~=> m <- n <= o <~ p;';
    it('doesn\'t throw', function (t) {
      return t.notThrows(function () {
        jssm.compile(jssm.parse(all_arrows));
      });
    });
  });

  (0, _avaSpec.describe)('all unicode arrows', async function (it) {
    var all_arrows = 'a \u2190 b \u21D0 c \u219A d \u2192 e \u21D2 f \u219B g \u2194 h \u21D4 i \u21AE j \u2190\u21D2 k \u21D0\u2192 l \u2190\u219B m \u219A\u2192 n \u21D0\u219B o \u219A\u21D2 p;';
    it('doesn\'t throw', function (t) {
      return t.notThrows(function () {
        jssm.compile(jssm.parse(all_arrows));
      });
    });
  });
});

(0, _avaSpec.describe)('error catchery', async function (_parse_it) {

  (0, _avaSpec.describe)('unknown rule', async function (it) {
    it('throws', function (t) {
      return t.throws(function () {
        jssm.compile([{ "key": "FAKE_RULE", "from": "a", "se": { "kind": "->", "to": "b" } }]);
      });
    });
  });
});

// stochable
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9jb21waWxlLmpzIl0sIm5hbWVzIjpbImpzc20iLCJyZXF1aXJlIiwiX3BhcnNlX2l0IiwiaXQiLCJhX3RvX2Jfc3RyIiwidCIsIm5vdFRocm93cyIsImNvbXBpbGUiLCJwYXJzZSIsImFfdG9fYl90b19jX3N0ciIsImFfdGhyb3VnaF9lX3Rva2VuX3N0ciIsImFsbF9hcnJvd3MiLCJ0aHJvd3MiXSwibWFwcGluZ3MiOiI7O0FBR0E7O0FBRUEsSUFBTUEsT0FBT0MsUUFBUSw0QkFBUixDQUFiO0FBSkE7O0FBVUEsdUJBQVMsV0FBVCxFQUFzQixnQkFBTUMsU0FBTixFQUFtQjs7QUFFdkMseUJBQVMsT0FBVCxFQUFrQixnQkFBTUMsRUFBTixFQUFZO0FBQzVCLFFBQU1DLG9CQUFOO0FBQ0FELE9BQUcsZ0JBQUgsRUFBcUI7QUFBQSxhQUFLRSxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUMxQ04sYUFBS08sT0FBTCxDQUFhUCxLQUFLUSxLQUFMLENBQVdKLFVBQVgsQ0FBYjtBQUNELE9BRnlCLENBQUw7QUFBQSxLQUFyQjtBQUdELEdBTEQ7O0FBT0EseUJBQVMsVUFBVCxFQUFxQixnQkFBTUQsRUFBTixFQUFZO0FBQy9CLFFBQU1NLDRCQUFOO0FBQ0FOLE9BQUcsZ0JBQUgsRUFBcUI7QUFBQSxhQUFLRSxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUMxQ04sYUFBS08sT0FBTCxDQUFhUCxLQUFLUSxLQUFMLENBQVdDLGVBQVgsQ0FBYjtBQUNELE9BRnlCLENBQUw7QUFBQSxLQUFyQjtBQUdELEdBTEQ7O0FBT0EseUJBQVMsaUJBQVQsRUFBNEIsZ0JBQU1OLEVBQU4sRUFBWTtBQUN0QyxRQUFNTyxnQ0FBOEIsR0FBOUIsYUFBeUMsR0FBekMsU0FBTjtBQUNBUCxPQUFHLGdCQUFILEVBQXFCO0FBQUEsYUFBS0UsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFDMUNOLGFBQUtPLE9BQUwsQ0FBYVAsS0FBS1EsS0FBTCxDQUFXRSxxQkFBWCxDQUFiO0FBQ0QsT0FGeUIsQ0FBTDtBQUFBLEtBQXJCO0FBR0QsR0FMRDs7QUFPQSx5QkFBUyxZQUFULEVBQXVCLGdCQUFNUCxFQUFOLEVBQVk7QUFDakMsUUFBTVEsMkdBQU47QUFDQVIsT0FBRyxnQkFBSCxFQUFxQjtBQUFBLGFBQUtFLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQzFDTixhQUFLTyxPQUFMLENBQWFQLEtBQUtRLEtBQUwsQ0FBV0csVUFBWCxDQUFiO0FBQ0QsT0FGeUIsQ0FBTDtBQUFBLEtBQXJCO0FBR0QsR0FMRDs7QUFPQSx5QkFBUyxvQkFBVCxFQUErQixnQkFBTVIsRUFBTixFQUFZO0FBQ3pDLFFBQU1RLDRMQUFOO0FBQ0FSLE9BQUcsZ0JBQUgsRUFBcUI7QUFBQSxhQUFLRSxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUMxQ04sYUFBS08sT0FBTCxDQUFhUCxLQUFLUSxLQUFMLENBQVdHLFVBQVgsQ0FBYjtBQUNELE9BRnlCLENBQUw7QUFBQSxLQUFyQjtBQUdELEdBTEQ7QUFPRCxDQXJDRDs7QUEyQ0EsdUJBQVMsZ0JBQVQsRUFBMkIsZ0JBQU1ULFNBQU4sRUFBbUI7O0FBRTVDLHlCQUFTLGNBQVQsRUFBeUIsZ0JBQU1DLEVBQU4sRUFBWTtBQUNuQ0EsT0FBRyxRQUFILEVBQWE7QUFBQSxhQUFLRSxFQUFFTyxNQUFGLENBQVUsWUFBTTtBQUNoQ1osYUFBS08sT0FBTCxDQUFjLENBQUMsRUFBQyxPQUFNLFdBQVAsRUFBbUIsUUFBTyxHQUExQixFQUE4QixNQUFLLEVBQUMsUUFBTyxJQUFSLEVBQWEsTUFBSyxHQUFsQixFQUFuQyxFQUFELENBQWQ7QUFDRCxPQUZpQixDQUFMO0FBQUEsS0FBYjtBQUdELEdBSkQ7QUFNRCxDQVJEOztBQVVBIiwiZmlsZSI6ImNvbXBpbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cblxuaW1wb3J0IHtkZXNjcmliZX0gZnJvbSAnYXZhLXNwZWMnO1xuXG5jb25zdCBqc3NtID0gcmVxdWlyZSgnLi4vLi4vLi4vYnVpbGQvanNzbS5lczUuanMnKTtcblxuXG5cblxuXG5kZXNjcmliZSgnY29tcGlsZS8xJywgYXN5bmMgX3BhcnNlX2l0ID0+IHtcblxuICBkZXNjcmliZSgnYS0+YjsnLCBhc3luYyBpdCA9PiB7XG4gICAgY29uc3QgYV90b19iX3N0ciA9IGBhLT5iO2A7XG4gICAgaXQoJ2RvZXNuXFwndCB0aHJvdycsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4ge1xuICAgICAganNzbS5jb21waWxlKGpzc20ucGFyc2UoYV90b19iX3N0cikpO1xuICAgIH0pICk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdhLT5iLT5jOycsIGFzeW5jIGl0ID0+IHtcbiAgICBjb25zdCBhX3RvX2JfdG9fY19zdHIgPSBgYS0+Yi0+YztgO1xuICAgIGl0KCdkb2VzblxcJ3QgdGhyb3cnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHtcbiAgICAgIGpzc20uY29tcGlsZShqc3NtLnBhcnNlKGFfdG9fYl90b19jX3N0cikpO1xuICAgIH0pICk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCd0ZW1wbGF0ZSB0b2tlbnMnLCBhc3luYyBpdCA9PiB7XG4gICAgY29uc3QgYV90aHJvdWdoX2VfdG9rZW5fc3RyID0gYGEtPiR7J2InfS0+Yy0+JHsnZCd9LT5lO2A7XG4gICAgaXQoJ2RvZXNuXFwndCB0aHJvdycsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4ge1xuICAgICAganNzbS5jb21waWxlKGpzc20ucGFyc2UoYV90aHJvdWdoX2VfdG9rZW5fc3RyKSk7XG4gICAgfSkgKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2FsbCBhcnJvd3MnLCBhc3luYyBpdCA9PiB7XG4gICAgY29uc3QgYWxsX2Fycm93cyA9IGBhIC0+IGIgPT4gYyB+PiBkIDwtPiBlIDw9PiBmIDx+PiBnIDwtPT4gaCA8PS0+IGkgPH4tPiBqIDwtfj4gayA8PX4+IGwgPH49PiBtIDwtIG4gPD0gbyA8fiBwO2A7XG4gICAgaXQoJ2RvZXNuXFwndCB0aHJvdycsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4ge1xuICAgICAganNzbS5jb21waWxlKGpzc20ucGFyc2UoYWxsX2Fycm93cykpO1xuICAgIH0pICk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdhbGwgdW5pY29kZSBhcnJvd3MnLCBhc3luYyBpdCA9PiB7XG4gICAgY29uc3QgYWxsX2Fycm93cyA9IGBhIOKGkCBiIOKHkCBjIOKGmiBkIOKGkiBlIOKHkiBmIOKGmyBnIOKGlCBoIOKHlCBpIOKGriBqIOKGkOKHkiBrIOKHkOKGkiBsIOKGkOKGmyBtIOKGmuKGkiBuIOKHkOKGmyBvIOKGmuKHkiBwO2A7XG4gICAgaXQoJ2RvZXNuXFwndCB0aHJvdycsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4ge1xuICAgICAganNzbS5jb21waWxlKGpzc20ucGFyc2UoYWxsX2Fycm93cykpO1xuICAgIH0pICk7XG4gIH0pO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgnZXJyb3IgY2F0Y2hlcnknLCBhc3luYyBfcGFyc2VfaXQgPT4ge1xuXG4gIGRlc2NyaWJlKCd1bmtub3duIHJ1bGUnLCBhc3luYyBpdCA9PiB7XG4gICAgaXQoJ3Rocm93cycsIHQgPT4gdC50aHJvd3MoICgpID0+IHtcbiAgICAgIGpzc20uY29tcGlsZSggW3tcImtleVwiOlwiRkFLRV9SVUxFXCIsXCJmcm9tXCI6XCJhXCIsXCJzZVwiOntcImtpbmRcIjpcIi0+XCIsXCJ0b1wiOlwiYlwifX1dICk7XG4gICAgfSApKTtcbiAgfSk7XG5cbn0pO1xuXG4vLyBzdG9jaGFibGVcbiJdfQ==