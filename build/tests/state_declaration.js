'use strict';

var _templateObject = _taggedTemplateLiteral(['c: {}; a -> b;'], ['c: {}; a -> b;']),
    _templateObject2 = _taggedTemplateLiteral(['c: { }; a -> b;'], ['c: { }; a -> b;']),
    _templateObject3 = _taggedTemplateLiteral(['c: { node_color: red; }; a -> b;'], ['c: { node_color: red; }; a -> b;']),
    _templateObject4 = _taggedTemplateLiteral(['c: { };                                              a -> b;'], ['c: { };                                              a -> b;']),
    _templateObject5 = _taggedTemplateLiteral(['c: { node_color: red; };                             a -> b;'], ['c: { node_color: red; };                             a -> b;']),
    _templateObject6 = _taggedTemplateLiteral(['c: { node_color: red; node_shape: circle; };         a -> b;'], ['c: { node_color: red; node_shape: circle; };         a -> b;']),
    _templateObject7 = _taggedTemplateLiteral(['c: { node_color: red; }; d: { node_shape: circle; }; a -> b;'], ['c: { node_color: red; }; d: { node_shape: circle; }; a -> b;']),
    _templateObject8 = _taggedTemplateLiteral(['\n    c: { node_shape: circle; node_color: red; };\n    d: { node_shape: circle; node_color: red; };\n    a -> b;\n  '], ['\n    c: { node_shape: circle; node_color: red; };\n    d: { node_shape: circle; node_color: red; };\n    a -> b;\n  ']);

var _avaSpec = require('ava-spec');

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }
/* eslint-disable max-len */

var jssm = require('../../../build/jssm.es5.js'),
    sm = jssm.sm;

(0, _avaSpec.describe)("doesn't throw", async function (it) {

  it('with no attributes', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject);
    });
  });
  it('with just whitespace', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject2);
    });
  });
  it('with just node color', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject3);
    });
  });
});

(0, _avaSpec.describe)('can read declaration', async function (_it) {

  var mach0 = sm(_templateObject4);
  var mach1 = sm(_templateObject5);
  var mach2 = sm(_templateObject6);
  var machT = sm(_templateObject7);

  var machP = sm(_templateObject8);

  (0, _avaSpec.describe)('of w/ nothing', async function (it) {
    it('through .state_declarations/0', function (t) {
      return t.is('left', mach0.state_declarations());
    });
  });

  (0, _avaSpec.describe)('of just w/ node_color', async function (it) {
    it('through .state_declaration/1', function (t) {
      return t.is('left', mach1.state_declaration('c'));
    });
    it('through .state_declarations/0', function (t) {
      return t.is('left', mach1.state_declarations());
    });
  });

  (0, _avaSpec.describe)('of w/ node_color, node_shape', async function (it) {
    it('through .state_declaration/1', function (t) {
      return t.is('left', mach2.state_declaration('c'));
    });
    it('through .state_declarations/0', function (t) {
      return t.is('left', mach2.state_declarations());
    });
  });

  (0, _avaSpec.describe)('of w/ node_color on c, node_shape on d', async function (it) {
    it('through .state_declaration/1', function (t) {
      return t.is('left', machT.state_declaration('c'));
    });
    it('through .state_declaration/1', function (t) {
      return t.is('left', machT.state_declaration('d'));
    });
    it('through .state_declarations/0', function (t) {
      return t.is('left', machT.state_declarations());
    });
  });

  (0, _avaSpec.describe)('of w/ node_color, node_shape on each c and d', async function (it) {
    it('through .state_declaration/1', function (t) {
      return t.is('left', machP.state_declaration('c'));
    });
    it('through .state_declaration/1', function (t) {
      return t.is('left', machP.state_declaration('d'));
    });
    it('through .state_declarations/0', function (t) {
      return t.is('left', machP.state_declarations());
    });
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9zdGF0ZV9kZWNsYXJhdGlvbi5qcyJdLCJuYW1lcyI6WyJqc3NtIiwicmVxdWlyZSIsInNtIiwiaXQiLCJ0Iiwibm90VGhyb3dzIiwiX2ZvbyIsIl9pdCIsIm1hY2gwIiwibWFjaDEiLCJtYWNoMiIsIm1hY2hUIiwibWFjaFAiLCJpcyIsInN0YXRlX2RlY2xhcmF0aW9ucyIsInN0YXRlX2RlY2xhcmF0aW9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUdBOzs7QUFGQTs7QUFJQSxJQUFNQSxPQUFPQyxRQUFRLDRCQUFSLENBQWI7QUFBQSxJQUNNQyxLQUFPRixLQUFLRSxFQURsQjs7QUFPQSx1QkFBUyxlQUFULEVBQTBCLGdCQUFNQyxFQUFOLEVBQVk7O0FBRXBDQSxLQUFHLG9CQUFILEVBQTJCO0FBQUEsV0FBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNQyxPQUFPSixFQUFQLGlCQUFOO0FBQWtDLEtBQXRELENBQUw7QUFBQSxHQUEzQjtBQUNBQyxLQUFHLHNCQUFILEVBQTJCO0FBQUEsV0FBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNQyxPQUFPSixFQUFQLGtCQUFOO0FBQW1DLEtBQXZELENBQUw7QUFBQSxHQUEzQjtBQUNBQyxLQUFHLHNCQUFILEVBQTJCO0FBQUEsV0FBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNQyxPQUFPSixFQUFQLGtCQUFOO0FBQW9ELEtBQXhFLENBQUw7QUFBQSxHQUEzQjtBQUVELENBTkQ7O0FBWUEsdUJBQVMsc0JBQVQsRUFBaUMsZ0JBQU1LLEdBQU4sRUFBYTs7QUFFNUMsTUFBTUMsUUFBUU4sRUFBUixrQkFBTjtBQUNBLE1BQU1PLFFBQVFQLEVBQVIsa0JBQU47QUFDQSxNQUFNUSxRQUFRUixFQUFSLGtCQUFOO0FBQ0EsTUFBTVMsUUFBUVQsRUFBUixrQkFBTjs7QUFFQSxNQUFNVSxRQUFRVixFQUFSLGtCQUFOOztBQU1BLHlCQUFTLGVBQVQsRUFBMEIsZ0JBQU1DLEVBQU4sRUFBWTtBQUNwQ0EsT0FBRywrQkFBSCxFQUFvQztBQUFBLGFBQUtDLEVBQUVTLEVBQUYsQ0FBSyxNQUFMLEVBQWFMLE1BQU1NLGtCQUFOLEVBQWIsQ0FBTDtBQUFBLEtBQXBDO0FBQ0QsR0FGRDs7QUFJQSx5QkFBUyx1QkFBVCxFQUFrQyxnQkFBTVgsRUFBTixFQUFZO0FBQzVDQSxPQUFHLDhCQUFILEVBQW9DO0FBQUEsYUFBS0MsRUFBRVMsRUFBRixDQUFLLE1BQUwsRUFBYUosTUFBTU0saUJBQU4sQ0FBd0IsR0FBeEIsQ0FBYixDQUFMO0FBQUEsS0FBcEM7QUFDQVosT0FBRywrQkFBSCxFQUFvQztBQUFBLGFBQUtDLEVBQUVTLEVBQUYsQ0FBSyxNQUFMLEVBQWFKLE1BQU1LLGtCQUFOLEVBQWIsQ0FBTDtBQUFBLEtBQXBDO0FBQ0QsR0FIRDs7QUFLQSx5QkFBUyw4QkFBVCxFQUF5QyxnQkFBTVgsRUFBTixFQUFZO0FBQ25EQSxPQUFHLDhCQUFILEVBQW9DO0FBQUEsYUFBS0MsRUFBRVMsRUFBRixDQUFLLE1BQUwsRUFBYUgsTUFBTUssaUJBQU4sQ0FBd0IsR0FBeEIsQ0FBYixDQUFMO0FBQUEsS0FBcEM7QUFDQVosT0FBRywrQkFBSCxFQUFvQztBQUFBLGFBQUtDLEVBQUVTLEVBQUYsQ0FBSyxNQUFMLEVBQWFILE1BQU1JLGtCQUFOLEVBQWIsQ0FBTDtBQUFBLEtBQXBDO0FBQ0QsR0FIRDs7QUFLQSx5QkFBUyx3Q0FBVCxFQUFtRCxnQkFBTVgsRUFBTixFQUFZO0FBQzdEQSxPQUFHLDhCQUFILEVBQW9DO0FBQUEsYUFBS0MsRUFBRVMsRUFBRixDQUFLLE1BQUwsRUFBYUYsTUFBTUksaUJBQU4sQ0FBd0IsR0FBeEIsQ0FBYixDQUFMO0FBQUEsS0FBcEM7QUFDQVosT0FBRyw4QkFBSCxFQUFvQztBQUFBLGFBQUtDLEVBQUVTLEVBQUYsQ0FBSyxNQUFMLEVBQWFGLE1BQU1JLGlCQUFOLENBQXdCLEdBQXhCLENBQWIsQ0FBTDtBQUFBLEtBQXBDO0FBQ0FaLE9BQUcsK0JBQUgsRUFBb0M7QUFBQSxhQUFLQyxFQUFFUyxFQUFGLENBQUssTUFBTCxFQUFhRixNQUFNRyxrQkFBTixFQUFiLENBQUw7QUFBQSxLQUFwQztBQUNELEdBSkQ7O0FBTUEseUJBQVMsOENBQVQsRUFBeUQsZ0JBQU1YLEVBQU4sRUFBWTtBQUNuRUEsT0FBRyw4QkFBSCxFQUFvQztBQUFBLGFBQUtDLEVBQUVTLEVBQUYsQ0FBSyxNQUFMLEVBQWFELE1BQU1HLGlCQUFOLENBQXdCLEdBQXhCLENBQWIsQ0FBTDtBQUFBLEtBQXBDO0FBQ0FaLE9BQUcsOEJBQUgsRUFBb0M7QUFBQSxhQUFLQyxFQUFFUyxFQUFGLENBQUssTUFBTCxFQUFhRCxNQUFNRyxpQkFBTixDQUF3QixHQUF4QixDQUFiLENBQUw7QUFBQSxLQUFwQztBQUNBWixPQUFHLCtCQUFILEVBQW9DO0FBQUEsYUFBS0MsRUFBRVMsRUFBRixDQUFLLE1BQUwsRUFBYUQsTUFBTUUsa0JBQU4sRUFBYixDQUFMO0FBQUEsS0FBcEM7QUFDRCxHQUpEO0FBTUQsQ0F2Q0QiLCJmaWxlIjoic3RhdGVfZGVjbGFyYXRpb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cblxuaW1wb3J0IHtkZXNjcmliZX0gZnJvbSAnYXZhLXNwZWMnO1xuXG5jb25zdCBqc3NtID0gcmVxdWlyZSgnLi4vLi4vLi4vYnVpbGQvanNzbS5lczUuanMnKSxcbiAgICAgIHNtICAgPSBqc3NtLnNtO1xuXG5cblxuXG5cbmRlc2NyaWJlKFwiZG9lc24ndCB0aHJvd1wiLCBhc3luYyBpdCA9PiB7XG5cbiAgaXQoJ3dpdGggbm8gYXR0cmlidXRlcycsICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBjOiB7fTsgYSAtPiBiO2A7IH0pICk7XG4gIGl0KCd3aXRoIGp1c3Qgd2hpdGVzcGFjZScsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZm9vID0gc21gYzogeyB9OyBhIC0+IGI7YDsgfSkgKTtcbiAgaXQoJ3dpdGgganVzdCBub2RlIGNvbG9yJywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBjOiB7IG5vZGVfY29sb3I6IHJlZDsgfTsgYSAtPiBiO2A7IH0pICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdjYW4gcmVhZCBkZWNsYXJhdGlvbicsIGFzeW5jIF9pdCA9PiB7XG5cbiAgY29uc3QgbWFjaDAgPSBzbWBjOiB7IH07ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGEgLT4gYjtgO1xuICBjb25zdCBtYWNoMSA9IHNtYGM6IHsgbm9kZV9jb2xvcjogcmVkOyB9OyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYSAtPiBiO2A7XG4gIGNvbnN0IG1hY2gyID0gc21gYzogeyBub2RlX2NvbG9yOiByZWQ7IG5vZGVfc2hhcGU6IGNpcmNsZTsgfTsgICAgICAgICBhIC0+IGI7YDtcbiAgY29uc3QgbWFjaFQgPSBzbWBjOiB7IG5vZGVfY29sb3I6IHJlZDsgfTsgZDogeyBub2RlX3NoYXBlOiBjaXJjbGU7IH07IGEgLT4gYjtgO1xuXG4gIGNvbnN0IG1hY2hQID0gc21gXG4gICAgYzogeyBub2RlX3NoYXBlOiBjaXJjbGU7IG5vZGVfY29sb3I6IHJlZDsgfTtcbiAgICBkOiB7IG5vZGVfc2hhcGU6IGNpcmNsZTsgbm9kZV9jb2xvcjogcmVkOyB9O1xuICAgIGEgLT4gYjtcbiAgYDtcblxuICBkZXNjcmliZSgnb2Ygdy8gbm90aGluZycsIGFzeW5jIGl0ID0+IHtcbiAgICBpdCgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb25zLzAnLCB0ID0+IHQuaXMoJ2xlZnQnLCBtYWNoMC5zdGF0ZV9kZWNsYXJhdGlvbnMoKSApICk7XG4gIH0pXG5cbiAgZGVzY3JpYmUoJ29mIGp1c3Qgdy8gbm9kZV9jb2xvcicsIGFzeW5jIGl0ID0+IHtcbiAgICBpdCgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb24vMScsICB0ID0+IHQuaXMoJ2xlZnQnLCBtYWNoMS5zdGF0ZV9kZWNsYXJhdGlvbignYycpICkgKTtcbiAgICBpdCgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb25zLzAnLCB0ID0+IHQuaXMoJ2xlZnQnLCBtYWNoMS5zdGF0ZV9kZWNsYXJhdGlvbnMoKSApICk7XG4gIH0pXG5cbiAgZGVzY3JpYmUoJ29mIHcvIG5vZGVfY29sb3IsIG5vZGVfc2hhcGUnLCBhc3luYyBpdCA9PiB7XG4gICAgaXQoJ3Rocm91Z2ggLnN0YXRlX2RlY2xhcmF0aW9uLzEnLCAgdCA9PiB0LmlzKCdsZWZ0JywgbWFjaDIuc3RhdGVfZGVjbGFyYXRpb24oJ2MnKSApICk7XG4gICAgaXQoJ3Rocm91Z2ggLnN0YXRlX2RlY2xhcmF0aW9ucy8wJywgdCA9PiB0LmlzKCdsZWZ0JywgbWFjaDIuc3RhdGVfZGVjbGFyYXRpb25zKCkgKSApO1xuICB9KVxuXG4gIGRlc2NyaWJlKCdvZiB3LyBub2RlX2NvbG9yIG9uIGMsIG5vZGVfc2hhcGUgb24gZCcsIGFzeW5jIGl0ID0+IHtcbiAgICBpdCgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb24vMScsICB0ID0+IHQuaXMoJ2xlZnQnLCBtYWNoVC5zdGF0ZV9kZWNsYXJhdGlvbignYycpICkgKTtcbiAgICBpdCgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb24vMScsICB0ID0+IHQuaXMoJ2xlZnQnLCBtYWNoVC5zdGF0ZV9kZWNsYXJhdGlvbignZCcpICkgKTtcbiAgICBpdCgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb25zLzAnLCB0ID0+IHQuaXMoJ2xlZnQnLCBtYWNoVC5zdGF0ZV9kZWNsYXJhdGlvbnMoKSApICk7XG4gIH0pXG5cbiAgZGVzY3JpYmUoJ29mIHcvIG5vZGVfY29sb3IsIG5vZGVfc2hhcGUgb24gZWFjaCBjIGFuZCBkJywgYXN5bmMgaXQgPT4ge1xuICAgIGl0KCd0aHJvdWdoIC5zdGF0ZV9kZWNsYXJhdGlvbi8xJywgIHQgPT4gdC5pcygnbGVmdCcsIG1hY2hQLnN0YXRlX2RlY2xhcmF0aW9uKCdjJykgKSApO1xuICAgIGl0KCd0aHJvdWdoIC5zdGF0ZV9kZWNsYXJhdGlvbi8xJywgIHQgPT4gdC5pcygnbGVmdCcsIG1hY2hQLnN0YXRlX2RlY2xhcmF0aW9uKCdkJykgKSApO1xuICAgIGl0KCd0aHJvdWdoIC5zdGF0ZV9kZWNsYXJhdGlvbnMvMCcsIHQgPT4gdC5pcygnbGVmdCcsIG1hY2hQLnN0YXRlX2RlY2xhcmF0aW9ucygpICkgKTtcbiAgfSlcblxufSk7XG4iXX0=