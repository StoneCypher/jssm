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

  (0, _avaSpec.describe)('of w/ nothing', async function (_it2) {
    var decls = mach0.state_declarations();
    (0, _avaSpec.describe)('through .state_declarations/0', async function (it) {
      it('yielding map', function (t) {
        return t.is(true, decls instanceof Map);
      });
      it('having size 0', function (t) {
        return t.is(0, decls.size);
      });
    });
  });

  (0, _avaSpec.describe)('of just w/ node_color', async function (it) {
    var decls = mach0.state_declarations();
    (0, _avaSpec.describe)('through .state_declarations/0', async function (it2) {
      it2('yielding map', function (t) {
        return t.is(true, decls instanceof Map);
      });
      it2('having size 1', function (t) {
        return t.is(1, decls.size);
      });
      // todo whargarbl check the actual members comeback
    });

    it('through .state_declaration/1', function (t) {
      return t.is('left', mach1.state_declaration('c'));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9zdGF0ZV9kZWNsYXJhdGlvbi5qcyJdLCJuYW1lcyI6WyJqc3NtIiwicmVxdWlyZSIsInNtIiwiaXQiLCJ0Iiwibm90VGhyb3dzIiwiX2ZvbyIsIl9pdCIsIm1hY2gwIiwibWFjaDEiLCJtYWNoMiIsIm1hY2hUIiwibWFjaFAiLCJfaXQyIiwiZGVjbHMiLCJzdGF0ZV9kZWNsYXJhdGlvbnMiLCJpcyIsIk1hcCIsInNpemUiLCJpdDIiLCJzdGF0ZV9kZWNsYXJhdGlvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFHQTs7O0FBRkE7O0FBSUEsSUFBTUEsT0FBT0MsUUFBUSw0QkFBUixDQUFiO0FBQUEsSUFDTUMsS0FBT0YsS0FBS0UsRUFEbEI7O0FBT0EsdUJBQVMsZUFBVCxFQUEwQixnQkFBTUMsRUFBTixFQUFZOztBQUVwQ0EsS0FBRyxvQkFBSCxFQUEyQjtBQUFBLFdBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsVUFBTUMsT0FBT0osRUFBUCxpQkFBTjtBQUFrQyxLQUF0RCxDQUFMO0FBQUEsR0FBM0I7QUFDQUMsS0FBRyxzQkFBSCxFQUEyQjtBQUFBLFdBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsVUFBTUMsT0FBT0osRUFBUCxrQkFBTjtBQUFtQyxLQUF2RCxDQUFMO0FBQUEsR0FBM0I7QUFDQUMsS0FBRyxzQkFBSCxFQUEyQjtBQUFBLFdBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsVUFBTUMsT0FBT0osRUFBUCxrQkFBTjtBQUFvRCxLQUF4RSxDQUFMO0FBQUEsR0FBM0I7QUFFRCxDQU5EOztBQVlBLHVCQUFTLHNCQUFULEVBQWlDLGdCQUFNSyxHQUFOLEVBQWE7O0FBRTVDLE1BQU1DLFFBQVFOLEVBQVIsa0JBQU47QUFDQSxNQUFNTyxRQUFRUCxFQUFSLGtCQUFOO0FBQ0EsTUFBTVEsUUFBUVIsRUFBUixrQkFBTjtBQUNBLE1BQU1TLFFBQVFULEVBQVIsa0JBQU47O0FBRUEsTUFB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IGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cblxuaW1wb3J0IHtkZXNjcmliZX0gZnJvbSAnYXZhLXNwZWMnO1xuXG5jb25zdCBqc3NtID0gcmVxdWlyZSgnLi4vLi4vLi4vYnVpbGQvanNzbS5lczUuanMnKSxcbiAgICAgIHNtICAgPSBqc3NtLnNtO1xuXG5cblxuXG5cbmRlc2NyaWJlKFwiZG9lc24ndCB0aHJvd1wiLCBhc3luYyBpdCA9PiB7XG5cbiAgaXQoJ3dpdGggbm8gYXR0cmlidXRlcycsICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBjOiB7fTsgYSAtPiBiO2A7IH0pICk7XG4gIGl0KCd3aXRoIGp1c3Qgd2hpdGVzcGFjZScsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZm9vID0gc21gYzogeyB9OyBhIC0+IGI7YDsgfSkgKTtcbiAgaXQoJ3dpdGgganVzdCBub2RlIGNvbG9yJywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBjOiB7IG5vZGVfY29sb3I6IHJlZDsgfTsgYSAtPiBiO2A7IH0pICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdjYW4gcmVhZCBkZWNsYXJhdGlvbicsIGFzeW5jIF9pdCA9PiB7XG5cbiAgY29uc3QgbWFjaDAgPSBzbWBjOiB7IH07ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGEgLT4gYjtgO1xuICBjb25zdCBtYWNoMSA9IHNtYGM6IHsgbm9kZV9jb2xvcjogcmVkOyB9OyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYSAtPiBiO2A7XG4gIGNvbnN0IG1hY2gyID0gc21gYzogeyBub2RlX2NvbG9yOiByZWQ7IG5vZGVfc2hhcGU6IGNpcmNsZTsgfTsgICAgICAgICBhIC0+IGI7YDtcbiAgY29uc3QgbWFjaFQgPSBzbWBjOiB7IG5vZGVfY29sb3I6IHJlZDsgfTsgZDogeyBub2RlX3NoYXBlOiBjaXJjbGU7IH07IGEgLT4gYjtgO1xuXG4gIGNvbnN0IG1hY2hQID0gc21gXG4gICAgYzogeyBub2RlX3NoYXBlOiBjaXJjbGU7IG5vZGVfY29sb3I6IHJlZDsgfTtcbiAgICBkOiB7IG5vZGVfc2hhcGU6IGNpcmNsZTsgbm9kZV9jb2xvcjogcmVkOyB9O1xuICAgIGEgLT4gYjtcbiAgYDtcblxuICBkZXNjcmliZSgnb2Ygdy8gbm90aGluZycsIGFzeW5jIF9pdDIgPT4ge1xuICAgIGNvbnN0IGRlY2xzID0gbWFjaDAuc3RhdGVfZGVjbGFyYXRpb25zKCk7XG4gICAgZGVzY3JpYmUoJ3Rocm91Z2ggLnN0YXRlX2RlY2xhcmF0aW9ucy8wJywgYXN5bmMgaXQgPT4ge1xuICAgICAgaXQoJ3lpZWxkaW5nIG1hcCcsICB0ID0+IHQuaXModHJ1ZSwgZGVjbHMgaW5zdGFuY2VvZiBNYXApKTtcbiAgICAgIGl0KCdoYXZpbmcgc2l6ZSAwJywgdCA9PiB0LmlzKDAsICAgIGRlY2xzLnNpemUpKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ29mIGp1c3Qgdy8gbm9kZV9jb2xvcicsIGFzeW5jIGl0ID0+IHtcbiAgICBjb25zdCBkZWNscyA9IG1hY2gwLnN0YXRlX2RlY2xhcmF0aW9ucygpO1xuICAgIGRlc2NyaWJlKCd0aHJvdWdoIC5zdGF0ZV9kZWNsYXJhdGlvbnMvMCcsIGFzeW5jIGl0MiA9PiB7XG4gICAgICBpdDIoJ3lpZWxkaW5nIG1hcCcsICB0ID0+IHQuaXModHJ1ZSwgZGVjbHMgaW5zdGFuY2VvZiBNYXApKTtcbiAgICAgIGl0MignaGF2aW5nIHNpemUgMScsIHQgPT4gdC5pcygxLCAgICBkZWNscy5zaXplKSk7XG4gICAgICAvLyB0b2RvIHdoYXJnYXJibCBjaGVjayB0aGUgYWN0dWFsIG1lbWJlcnMgY29tZWJhY2tcbiAgICB9KTtcblxuICAgIGl0KCd0aHJvdWdoIC5zdGF0ZV9kZWNsYXJhdGlvbi8xJywgIHQgPT4gdC5pcygnbGVmdCcsIG1hY2gxLnN0YXRlX2RlY2xhcmF0aW9uKCdjJykgKSApO1xuICB9KTtcblxuICBkZXNjcmliZSgnb2Ygdy8gbm9kZV9jb2xvciwgbm9kZV9zaGFwZScsIGFzeW5jIGl0ID0+IHtcbiAgICBpdCgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb24vMScsICB0ID0+IHQuaXMoJ2xlZnQnLCBtYWNoMi5zdGF0ZV9kZWNsYXJhdGlvbignYycpICkgKTtcbiAgICBpdCgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb25zLzAnLCB0ID0+IHQuaXMoJ2xlZnQnLCBtYWNoMi5zdGF0ZV9kZWNsYXJhdGlvbnMoKSApICk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdvZiB3LyBub2RlX2NvbG9yIG9uIGMsIG5vZGVfc2hhcGUgb24gZCcsIGFzeW5jIGl0ID0+IHtcbiAgICBpdCgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb24vMScsICB0ID0+IHQuaXMoJ2xlZnQnLCBtYWNoVC5zdGF0ZV9kZWNsYXJhdGlvbignYycpICkgKTtcbiAgICBpdCgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb24vMScsICB0ID0+IHQuaXMoJ2xlZnQnLCBtYWNoVC5zdGF0ZV9kZWNsYXJhdGlvbignZCcpICkgKTtcbiAgICBpdCgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb25zLzAnLCB0ID0+IHQuaXMoJ2xlZnQnLCBtYWNoVC5zdGF0ZV9kZWNsYXJhdGlvbnMoKSApICk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdvZiB3LyBub2RlX2NvbG9yLCBub2RlX3NoYXBlIG9uIGVhY2ggYyBhbmQgZCcsIGFzeW5jIGl0ID0+IHtcbiAgICBpdCgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb24vMScsICB0ID0+IHQuaXMoJ2xlZnQnLCBtYWNoUC5zdGF0ZV9kZWNsYXJhdGlvbignYycpICkgKTtcbiAgICBpdCgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb24vMScsICB0ID0+IHQuaXMoJ2xlZnQnLCBtYWNoUC5zdGF0ZV9kZWNsYXJhdGlvbignZCcpICkgKTtcbiAgICBpdCgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb25zLzAnLCB0ID0+IHQuaXMoJ2xlZnQnLCBtYWNoUC5zdGF0ZV9kZWNsYXJhdGlvbnMoKSApICk7XG4gIH0pO1xuXG59KTtcbiJdfQ==