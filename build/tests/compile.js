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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9jb21waWxlLmpzIl0sIm5hbWVzIjpbImpzc20iLCJyZXF1aXJlIiwiX3BhcnNlX2l0IiwiaXQiLCJhX3RvX2Jfc3RyIiwidCIsIm5vdFRocm93cyIsImNvbXBpbGUiLCJwYXJzZSIsImFfdG9fYl90b19jX3N0ciIsImFfdGhyb3VnaF9lX3Rva2VuX3N0ciIsImFsbF9hcnJvd3MiLCJ0aHJvd3MiXSwibWFwcGluZ3MiOiI7O0FBR0E7O0FBRUEsSUFBTUEsT0FBT0MsUUFBUSw0QkFBUixDQUFiO0FBSkE7O0FBVUEsdUJBQVMsV0FBVCxFQUFzQixnQkFBTUMsU0FBTixFQUFtQjs7QUFFdkMseUJBQVMsT0FBVCxFQUFrQixnQkFBTUMsRUFBTixFQUFZO0FBQzVCLFFBQU1DLG9CQUFOO0FBQ0FELE9BQUcsZ0JBQUgsRUFBcUI7QUFBQSxhQUFLRSxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUMxQ04sYUFBS08sT0FBTCxDQUFhUCxLQUFLUSxLQUFMLENBQVdKLFVBQVgsQ0FBYjtBQUNELE9BRnlCLENBQUw7QUFBQSxLQUFyQjtBQUdELEdBTEQ7O0FBT0EseUJBQVMsVUFBVCxFQUFxQixnQkFBTUQsRUFBTixFQUFZO0FBQy9CLFFBQU1NLDRCQUFOO0FBQ0FOLE9BQUcsZ0JBQUgsRUFBcUI7QUFBQSxhQUFLRSxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUMxQ04sYUFBS08sT0FBTCxDQUFhUCxLQUFLUSxLQUFMLENBQVdDLGVBQVgsQ0FBYjtBQUNELE9BRnlCLENBQUw7QUFBQSxLQUFyQjtBQUdELEdBTEQ7O0FBT0EseUJBQVMsaUJBQVQsRUFBNEIsZ0JBQU1OLEVBQU4sRUFBWTtBQUN0QyxRQUFNTyxnQ0FBOEIsR0FBOUIsYUFBeUMsR0FBekMsU0FBTjtBQUNBUCxPQUFHLGdCQUFILEVBQXFCO0FBQUEsYUFBS0UsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFDMUNOLGFBQUtPLE9BQUwsQ0FBYVAsS0FBS1EsS0FBTCxDQUFXRSxxQkFBWCxDQUFiO0FBQ0QsT0FGeUIsQ0FBTDtBQUFBLEtBQXJCO0FBR0QsR0FMRDs7QUFPQSx5QkFBUyxZQUFULEVBQXVCLGdCQUFNUCxFQUFOLEVBQVk7QUFDakMsUUFBTVEsMkdBQU47QUFDQVIsT0FBRyxnQkFBSCxFQUFxQjtBQUFBLGFBQUtFLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQzFDTixhQUFLTyxPQUFMLENBQWFQLEtBQUtRLEtBQUwsQ0FBV0csVUFBWCxDQUFiO0FBQ0QsT0FGeUIsQ0FBTDtBQUFBLEtBQXJCO0FBR0QsR0FMRDtBQU9ELENBOUJEOztBQW9DQSx1QkFBUyxnQkFBVCxFQUEyQixnQkFBTVQsU0FBTixFQUFtQjs7QUFFNUMseUJBQVMsY0FBVCxFQUF5QixnQkFBTUMsRUFBTixFQUFZO0FBQ25DQSxPQUFHLFFBQUgsRUFBYTtBQUFBLGFBQUtFLEVBQUVPLE1BQUYsQ0FBVSxZQUFNO0FBQ2hDWixhQUFLTyxPQUFMLENBQWMsQ0FBQyxFQUFDLE9BQU0sV0FBUCxFQUFtQixRQUFPLEdBQTFCLEVBQThCLE1BQUssRUFBQyxRQUFPLElBQVIsRUFBYSxNQUFLLEdBQWxCLEVBQW5DLEVBQUQsQ0FBZDtBQUNELE9BRmlCLENBQUw7QUFBQSxLQUFiO0FBR0QsR0FKRDtBQU1ELENBUkQ7O0FBVUEiLCJmaWxlIjoiY29tcGlsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuXG5pbXBvcnQge2Rlc2NyaWJlfSBmcm9tICdhdmEtc3BlYyc7XG5cbmNvbnN0IGpzc20gPSByZXF1aXJlKCcuLi8uLi8uLi9idWlsZC9qc3NtLmVzNS5qcycpO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdjb21waWxlLzEnLCBhc3luYyBfcGFyc2VfaXQgPT4ge1xuXG4gIGRlc2NyaWJlKCdhLT5iOycsIGFzeW5jIGl0ID0+IHtcbiAgICBjb25zdCBhX3RvX2Jfc3RyID0gYGEtPmI7YDtcbiAgICBpdCgnZG9lc25cXCd0IHRocm93JywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7XG4gICAgICBqc3NtLmNvbXBpbGUoanNzbS5wYXJzZShhX3RvX2Jfc3RyKSk7XG4gICAgfSkgKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2EtPmItPmM7JywgYXN5bmMgaXQgPT4ge1xuICAgIGNvbnN0IGFfdG9fYl90b19jX3N0ciA9IGBhLT5iLT5jO2A7XG4gICAgaXQoJ2RvZXNuXFwndCB0aHJvdycsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4ge1xuICAgICAganNzbS5jb21waWxlKGpzc20ucGFyc2UoYV90b19iX3RvX2Nfc3RyKSk7XG4gICAgfSkgKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ3RlbXBsYXRlIHRva2VucycsIGFzeW5jIGl0ID0+IHtcbiAgICBjb25zdCBhX3Rocm91Z2hfZV90b2tlbl9zdHIgPSBgYS0+JHsnYid9LT5jLT4keydkJ30tPmU7YDtcbiAgICBpdCgnZG9lc25cXCd0IHRocm93JywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7XG4gICAgICBqc3NtLmNvbXBpbGUoanNzbS5wYXJzZShhX3Rocm91Z2hfZV90b2tlbl9zdHIpKTtcbiAgICB9KSApO1xuICB9KTtcblxuICBkZXNjcmliZSgnYWxsIGFycm93cycsIGFzeW5jIGl0ID0+IHtcbiAgICBjb25zdCBhbGxfYXJyb3dzID0gYGEgLT4gYiA9PiBjIH4+IGQgPC0+IGUgPD0+IGYgPH4+IGcgPC09PiBoIDw9LT4gaSA8fi0+IGogPC1+PiBrIDw9fj4gbCA8fj0+IG0gPC0gbiA8PSBvIDx+IHA7YDtcbiAgICBpdCgnZG9lc25cXCd0IHRocm93JywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7XG4gICAgICBqc3NtLmNvbXBpbGUoanNzbS5wYXJzZShhbGxfYXJyb3dzKSk7XG4gICAgfSkgKTtcbiAgfSk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdlcnJvciBjYXRjaGVyeScsIGFzeW5jIF9wYXJzZV9pdCA9PiB7XG5cbiAgZGVzY3JpYmUoJ3Vua25vd24gcnVsZScsIGFzeW5jIGl0ID0+IHtcbiAgICBpdCgndGhyb3dzJywgdCA9PiB0LnRocm93cyggKCkgPT4ge1xuICAgICAganNzbS5jb21waWxlKCBbe1wia2V5XCI6XCJGQUtFX1JVTEVcIixcImZyb21cIjpcImFcIixcInNlXCI6e1wia2luZFwiOlwiLT5cIixcInRvXCI6XCJiXCJ9fV0gKTtcbiAgICB9ICkpO1xuICB9KTtcblxufSk7XG5cbi8vIHN0b2NoYWJsZVxuIl19